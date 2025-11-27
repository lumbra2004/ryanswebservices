// Netlify Function: Create Combined Payment
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, name, onetimeAmount, recurringAmount, metadata } = JSON.parse(event.body);

        // Create customer
        const customer = await stripe.customers.create({
            email,
            name,
            metadata,
        });

        // Create one-time payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(onetimeAmount * 100),
            currency: 'usd',
            customer: customer.id,
            metadata: { ...metadata, type: 'one-time' },
            automatic_payment_methods: {
                enabled: true,
            },
            setup_future_usage: 'off_session',
        });

        // Create recurring price (monthly)
        const price = await stripe.prices.create({
            unit_amount: Math.round(recurringAmount * 100),
            currency: 'usd',
            recurring: { interval: 'month' },
            product_data: {
                name: metadata.serviceName || 'Monthly Service',
            },
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                customerId: customer.id,
                clientSecret: paymentIntent.client_secret,
                priceId: price.id,
            })
        };
    } catch (error) {
        console.error('Error creating payment:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
