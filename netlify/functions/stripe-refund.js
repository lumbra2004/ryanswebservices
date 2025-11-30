const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { paymentIntentId, chargeId, amount, reason } = JSON.parse(event.body);

        if (!paymentIntentId && !chargeId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Payment Intent ID or Charge ID is required' })
            };
        }

        let refund;


        if (chargeId) {
            const refundParams = {
                charge: chargeId,
                reason: reason || 'requested_by_customer'
            };


            if (amount) {
                refundParams.amount = Math.round(amount * 100);
            }

            refund = await stripe.refunds.create(refundParams);
        }

        else {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (!paymentIntent.latest_charge) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'No charge found for this payment' })
                };
            }

            const refundParams = {
                charge: paymentIntent.latest_charge,
                reason: reason || 'requested_by_customer'
            };

            if (amount) {
                refundParams.amount = Math.round(amount * 100);
            }

            refund = await stripe.refunds.create(refundParams);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                refund: {
                    id: refund.id,
                    amount: refund.amount / 100,
                    status: refund.status,
                    reason: refund.reason,
                    created: refund.created
                }
            })
        };

    } catch (error) {
        console.error('Refund error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                type: error.type
            })
        };
    }
};
