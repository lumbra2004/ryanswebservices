# 🔔 Stripe Webhooks Setup Guide

## What Are Webhooks?

Webhooks are automated notifications that Stripe sends to your server when events happen (payments succeed, subscriptions renew, charges fail, etc.). This lets you keep your database in sync automatically.

## ✅ Webhook Handler Already Implemented

Your server now listens for these important events:

- ✅ `payment_intent.succeeded` - One-time payment completed
- ✅ `payment_intent.payment_failed` - Payment failed
- ✅ `customer.subscription.created` - New subscription started
- ✅ `customer.subscription.updated` - Subscription changed
- ✅ `customer.subscription.deleted` - Subscription cancelled
- ✅ `invoice.paid` - Monthly invoice paid
- ✅ `invoice.payment_failed` - Monthly payment failed
- ✅ `charge.succeeded` - Charge successful
- ✅ `charge.refunded` - Refund processed

## 🚀 Setup Steps

### Option 1: Local Testing with Stripe CLI (Recommended for Development)

1. **Install Stripe CLI**:
   ```bash
   # For Ubuntu/Debian
   curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
   echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
   sudo apt update
   sudo apt install stripe
   
   # Or download from: https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```
   This will open your browser to authenticate.

3. **Forward webhooks to your local server**:
   ```bash
   stripe listen --forward-to http://localhost:8080/api/stripe/webhook
   ```

4. **Copy the webhook signing secret**:
   You'll see output like:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```

5. **Add to your .env file**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_from_step_4
   ```

6. **Test it**:
   In another terminal:
   ```bash
   stripe trigger payment_intent.succeeded
   ```
   
   You should see the event logged in your server console! 🎉

### Option 2: Production Webhook Setup (For Live Deployment)

1. **Deploy your server** to a public URL (e.g., `https://yourdomain.com`)

2. **Go to Stripe Dashboard**:
   - Visit: [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"

3. **Configure endpoint**:
   - Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
   - Description: "Production payment webhooks"
   - Events to send: Select events or choose "All events"

4. **Get signing secret**:
   - After creating, click on the webhook
   - Click "Reveal" under "Signing secret"
   - Copy the secret (starts with `whsec_`)

5. **Update production .env**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_production_secret_here
   ```

6. **Test the endpoint**:
   - Click "Send test webhook" in Stripe Dashboard
   - Check your server logs for the event

## 📊 What Happens When Events Arrive

Currently, the webhook handler **logs events to console**. You can extend it to update your database:

```javascript
case 'payment_intent.succeeded':
    const paymentIntent = event.data.object;
    
    // Example: Update your database
    await supabase
        .from('service_requests')
        .update({ 
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_payment_id: paymentIntent.id
        })
        .eq('id', paymentIntent.metadata.requestId);
    break;
```

## 🔍 Monitoring Webhooks

### View in Stripe Dashboard:
- Go to: [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
- Click on your endpoint
- See all webhook attempts, successes, and failures
- Retry failed webhooks manually

### View in Your Server:
- Check your server console logs
- Each webhook event is logged with emoji indicators:
  - ✅ Success events
  - ❌ Failure events
  - 🔄 Update events
  - 💰 Payment events

## 🛡️ Security

Your webhook endpoint is secured with:
- ✅ **Signature verification** - Ensures webhooks are from Stripe
- ✅ **Secret validation** - Uses your webhook signing secret
- ✅ **HTTPS recommended** - For production deployments

## 🧪 Testing Events

### Using Stripe CLI:
```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test subscription created
stripe trigger customer.subscription.created

# Test invoice paid
stripe trigger invoice.paid

# Test charge refunded
stripe trigger charge.refunded
```

### From Stripe Dashboard:
1. Go to Webhooks → Your endpoint
2. Click "Send test webhook"
3. Choose an event type
4. Click "Send test webhook"

## 📝 Event Payloads

Each webhook event contains:
- `type` - Event name (e.g., "payment_intent.succeeded")
- `data.object` - The Stripe object (payment, subscription, etc.)
- `created` - Timestamp
- `id` - Unique event ID

Example payment_intent.succeeded payload:
```json
{
  "id": "evt_xxx",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 49900,
      "currency": "usd",
      "customer": "cus_xxx",
      "status": "succeeded",
      "metadata": {
        "requestId": "123",
        "userId": "user_456"
      }
    }
  }
}
```

## 🚨 Webhook Failures

If webhooks fail, Stripe will:
1. Retry automatically (up to 3 days)
2. Send increasingly delayed attempts
3. Mark as failed after all retries exhausted

**To fix:**
1. Check server logs for errors
2. Verify webhook secret is correct
3. Ensure server is accessible
4. Manually retry from Stripe Dashboard

## 📚 Best Practices

1. ✅ **Return 200 quickly** - Process events asynchronously if needed
2. ✅ **Use idempotency** - Handle duplicate events gracefully
3. ✅ **Log everything** - Keep webhook logs for debugging
4. ✅ **Handle all states** - Account for partial failures
5. ✅ **Monitor failures** - Set up alerts for failed webhooks

## 🎯 Common Use Cases

### Auto-update service status:
```javascript
case 'payment_intent.succeeded':
    // Mark service as paid in database
    break;
```

### Send email notifications:
```javascript
case 'invoice.payment_failed':
    // Email user about failed payment
    break;
```

### Handle subscription cancellations:
```javascript
case 'customer.subscription.deleted':
    // Deactivate service
    // Send cancellation email
    break;
```

### Process refunds:
```javascript
case 'charge.refunded':
    // Update order status
    // Notify customer
    break;
```

## 🔗 Resources

- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Webhook Events Reference](https://stripe.com/docs/api/events/types)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

---

**Your webhook handler is ready! Start testing with Stripe CLI now. 🚀**
