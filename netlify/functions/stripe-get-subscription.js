const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        const { subscriptionId } = JSON.parse(event.body);

        console.log('Getting subscription:', subscriptionId);

        if (!subscriptionId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing subscriptionId' })
            };
        }


        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        console.log('Retrieved subscription:', {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            current_period_start: subscription.current_period_start,
            billing_cycle_anchor: subscription.billing_cycle_anchor,
            fullSubscription: subscription
        });


        let currentPeriodEnd = subscription.current_period_end;
        let currentPeriodStart = subscription.current_period_start;


        if (!currentPeriodEnd && subscription.billing_cycle_anchor) {
            const billingAnchor = subscription.billing_cycle_anchor;
            currentPeriodStart = billingAnchor;


            const interval = subscription.plan?.interval || 'month';
            const intervalCount = subscription.plan?.interval_count || 1;

            const anchorDate = new Date(billingAnchor * 1000);
            const nextDate = new Date(anchorDate);

            if (interval === 'month') {
                nextDate.setMonth(nextDate.getMonth() + intervalCount);
            } else if (interval === 'year') {
                nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
            } else if (interval === 'week') {
                nextDate.setDate(nextDate.getDate() + (7 * intervalCount));
            } else if (interval === 'day') {
                nextDate.setDate(nextDate.getDate() + intervalCount);
            }

            currentPeriodEnd = Math.floor(nextDate.getTime() / 1000);
        }

        const responseData = {
            id: subscription.id,
            status: subscription.status,
            current_period_end: currentPeriodEnd,
            current_period_start: currentPeriodStart,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: subscription.cancel_at,
            canceled_at: subscription.canceled_at
        };

        console.log('Sending response:', responseData);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(responseData)
        };
    } catch (error) {
        console.error('Error getting subscription:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to get subscription details'
            })
        };
    }
};
