-- Service Request System Setup
-- Run this SQL in Supabase SQL Editor

-- 1. Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    service_name TEXT NOT NULL,
    service_type TEXT NOT NULL, -- 'website', 'maintenance', 'custom'
    package_details JSONB, -- stores selected features/options
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ready_to_purchase', 'paid', 'cancelled')),
    admin_notes TEXT,
    contract_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_service_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_service_requests_updated_at ON service_requests;
CREATE TRIGGER update_service_requests_updated_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_service_requests_updated_at();

-- 3. Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own requests" ON service_requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON service_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON service_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON service_requests;

-- 4. RLS Policies

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON service_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert own requests"
ON service_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON service_requests FOR SELECT
USING (get_user_role(auth.uid()) IN ('admin', 'owner'));

-- Admins can update all requests (status, notes, etc.)
CREATE POLICY "Admins can update all requests"
ON service_requests FOR UPDATE
USING (get_user_role(auth.uid()) IN ('admin', 'owner'));

-- Admins can delete requests
CREATE POLICY "Admins can delete requests"
ON service_requests FOR DELETE
USING (get_user_role(auth.uid()) IN ('admin', 'owner'));

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);

-- 6. Verify setup
SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
    COUNT(*) FILTER (WHERE status = 'ready_to_purchase') as ready_to_purchase,
    COUNT(*) FILTER (WHERE status = 'paid') as paid
FROM service_requests;

-- Setup complete!
-- Next steps:
-- 1. Update pricing.html to allow service requests
-- 2. Add Service Requests section to admin panel
-- 3. Add My Requests section to user profile
