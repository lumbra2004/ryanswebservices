// Netlify Function: Stripe Webhooks
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Function to send payment confirmation email
async function sendPaymentEmail(paymentIntent) {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDER_EMAIL = process.env.SENDER_EMAIL;
    const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;

    if (!SENDGRID_API_KEY || !SENDER_EMAIL) {
        console.log('Email not configured, skipping notification');
        return;
    }

    const amount = (paymentIntent.amount / 100).toFixed(2);
    const customerEmail = paymentIntent.receipt_email || RECIPIENT_EMAIL;
    const serviceName = paymentIntent.metadata?.serviceName || 'Service';

    const subject = `Payment Received - $${amount}`;
    const html = `
        <h2>Payment Confirmation</h2>
        <p>Thank you for your payment!</p>
        <p><strong>Amount:</strong> $${amount} USD</p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Payment ID:</strong> ${paymentIntent.id}</p>
        <p><strong>Status:</strong> Successful ✅</p>
        <hr>
        <p style="color: #666;">This is an automated notification from Ryan's Web Services.</p>
    `;

    const payload = {
        personalizations: [{ to: [{ email: customerEmail }] }],
        from: { email: SENDER_EMAIL },
        subject: subject,
        content: [{ type: 'text/html', value: html }]
    };

    try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            console.log('✉️  Payment email sent to:', customerEmail);
        } else {
            console.error('Failed to send email:', await res.text());
        }
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

exports.handler = async (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const sig = event.headers['stripe-signature'];
    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Webhook signature verification failed' })
        };
    }

    console.log('✅ Webhook received:', stripeEvent.type);

    try {
        switch (stripeEvent.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = stripeEvent.data.object;
                console.log('💰 Payment succeeded:', {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount / 100,
                    customer: paymentIntent.customer,
                    metadata: paymentIntent.metadata
                });
                
                // Send email notification
                await sendPaymentEmail(paymentIntent);
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = stripeEvent.data.object;
                console.log('❌ Payment failed:', {
                    id: failedPayment.id,
                    error: failedPayment.last_payment_error?.message
                });
                break;

            case 'customer.subscription.created':
                const newSubscription = stripeEvent.data.object;
                console.log('🔔 Subscription created:', {
                    id: newSubscription.id,
                    customer: newSubscription.customer,
                    status: newSubscription.status
                });
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = stripeEvent.data.object;
                console.log('🔄 Subscription updated:', {
                    id: updatedSubscription.id,
                    status: updatedSubscription.status
                });
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = stripeEvent.data.object;
                console.log('🗑️  Subscription cancelled:', {
                    id: deletedSubscription.id,
                    customer: deletedSubscription.customer
                });
                break;

            case 'invoice.paid':
                const paidInvoice = stripeEvent.data.object;
                console.log('📄 Invoice paid:', {
                    id: paidInvoice.id,
                    amount: paidInvoice.amount_paid / 100,
                    customer: paidInvoice.customer
                });
                break;

            case 'invoice.payment_failed':
                const failedInvoice = stripeEvent.data.object;
                console.log('⚠️  Invoice payment failed:', {
                    id: failedInvoice.id,
                    customer: failedInvoice.customer
                });
                break;

            default:
                console.log('ℹ️  Unhandled event type:', stripeEvent.type);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };
    } catch (error) {
        console.error('Error processing webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook handler failed' })
        };
    }
};
