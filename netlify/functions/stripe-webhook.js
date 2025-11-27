// Netlify Function: Stripe Webhooks
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
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
                // Update your database here
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
