-- Update service_requests status constraint to include 'active'

-- Drop existing constraint
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- Add new constraint with 'active' status
ALTER TABLE service_requests ADD CONSTRAINT service_requests_status_check 
CHECK (status IN ('pending', 'in_progress', 'active', 'ready_to_purchase', 'paid', 'cancelled'));
