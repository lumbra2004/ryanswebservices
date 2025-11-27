-- Add Stripe payment columns to service_requests table
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_requests_stripe_customer 
ON service_requests(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_stripe_subscription 
ON service_requests(stripe_subscription_id);
