require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PORT = 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

// Helper function to parse JSON body
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
    });
}

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Set CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Stripe API endpoints
    if (req.url === '/api/stripe/create-combined-payment' && req.method === 'POST') {
        try {
            const { email, name, onetimeAmount, recurringAmount, metadata } = await parseBody(req);

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

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                customerId: customer.id,
                clientSecret: paymentIntent.client_secret,
                priceId: price.id,
            }));
        } catch (error) {
            console.error('Error creating combined payment:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    if (req.url === '/api/stripe/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        }));
        return;
    }

    // Stripe Webhook endpoint
    if (req.url === '/api/stripe/webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            const sig = req.headers['stripe-signature'];
            let event;

            try {
                // Verify webhook signature
                event = stripe.webhooks.constructEvent(
                    body,
                    sig,
                    process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test'
                );
            } catch (err) {
                console.error('⚠️  Webhook signature verification failed:', err.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Webhook signature verification failed' }));
                return;
            }

            // Handle the event
            console.log('✅ Webhook received:', event.type);

            try {
                switch (event.type) {
                    case 'payment_intent.succeeded':
                        const paymentIntent = event.data.object;
                        console.log('💰 Payment succeeded:', {
                            id: paymentIntent.id,
                            amount: paymentIntent.amount / 100,
                            customer: paymentIntent.customer,
                            metadata: paymentIntent.metadata
                        });
                        // Here you would update your database
                        // Example: Update service_request status to 'paid'
                        break;

                    case 'payment_intent.payment_failed':
                        const failedPayment = event.data.object;
                        console.log('❌ Payment failed:', {
                            id: failedPayment.id,
                            error: failedPayment.last_payment_error?.message
                        });
                        // Notify user of failed payment
                        break;

                    case 'customer.subscription.created':
                        const newSubscription = event.data.object;
                        console.log('🔔 Subscription created:', {
                            id: newSubscription.id,
                            customer: newSubscription.customer,
                            status: newSubscription.status
                        });
                        // Save subscription ID to database
                        break;

                    case 'customer.subscription.updated':
                        const updatedSubscription = event.data.object;
                        console.log('🔄 Subscription updated:', {
                            id: updatedSubscription.id,
                            status: updatedSubscription.status
                        });
                        // Update subscription status in database
                        break;

                    case 'customer.subscription.deleted':
                        const deletedSubscription = event.data.object;
                        console.log('🗑️  Subscription cancelled:', {
                            id: deletedSubscription.id,
                            customer: deletedSubscription.customer
                        });
                        // Mark service as inactive in database
                        break;

                    case 'invoice.paid':
                        const paidInvoice = event.data.object;
                        console.log('📄 Invoice paid:', {
                            id: paidInvoice.id,
                            amount: paidInvoice.amount_paid / 100,
                            customer: paidInvoice.customer
                        });
                        // Record successful payment
                        break;

                    case 'invoice.payment_failed':
                        const failedInvoice = event.data.object;
                        console.log('⚠️  Invoice payment failed:', {
                            id: failedInvoice.id,
                            customer: failedInvoice.customer
                        });
                        // Send payment failure notification
                        break;

                    case 'charge.succeeded':
                        const charge = event.data.object;
                        console.log('✅ Charge succeeded:', {
                            id: charge.id,
                            amount: charge.amount / 100
                        });
                        break;

                    case 'charge.refunded':
                        const refund = event.data.object;
                        console.log('💸 Charge refunded:', {
                            id: refund.id,
                            amount: refund.amount_refunded / 100
                        });
                        break;

                    default:
                        console.log('ℹ️  Unhandled event type:', event.type);
                }

                // Return a response to acknowledge receipt of the event
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ received: true }));
            } catch (error) {
                console.error('Error processing webhook:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Webhook handler failed' }));
            }
        });
        return;
    }

    // File proxy endpoint - serves Supabase files through your domain
    if (req.url.startsWith('/files/')) {
        const encodedUrl = req.url.replace('/files/', '');
        const supabaseUrl = decodeURIComponent(encodedUrl);
        
        console.log('Proxying file:', supabaseUrl);
        
        https.get(supabaseUrl, (supabaseRes) => {
            res.writeHead(supabaseRes.statusCode, supabaseRes.headers);
            supabaseRes.pipe(res);
        }).on('error', (err) => {
            console.error('Error proxying file:', err);
            res.writeHead(500);
            res.end('Error loading file');
        });
        return;
    }

    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found, try serving index.html for SPA routing
                fs.readFile('./404.html', (err, content404) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 Not Found</h1>', 'utf-8');
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(content404, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}/`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`💳 Stripe integration enabled`);
    console.log(`\nPress Ctrl+C to stop\n`);
});
