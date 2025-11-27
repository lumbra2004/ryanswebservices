-- Custom Quote Codes System Setup
-- Run this SQL in Supabase SQL Editor

-- 1. Create custom_quotes table for personalized deal codes
CREATE TABLE IF NOT EXISTS custom_quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Quote Code (what the client enters)
    code TEXT UNIQUE NOT NULL,
    
    -- Client Info (optional - can be pre-filled or left blank)
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    
    -- Pricing
    upfront_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Service Details
    service_type TEXT, -- 'website', 'maintenance', 'google_workspace', 'custom'
    service_description TEXT,
    
    -- Notes (internal and for client)
    internal_notes TEXT, -- Only visible to admin
    client_notes TEXT, -- Visible to client when they redeem
    
    -- Project Details
    estimated_timeline TEXT, -- e.g., "2-3 weeks"
    deliverables TEXT, -- What's included
    
    -- Contract
    contract_url TEXT, -- URL to contract PDF
    contract_template TEXT, -- Which template to use
    requires_contract BOOLEAN DEFAULT true,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'redeemed', 'expired', 'cancelled')),
    
    -- Expiration
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    created_by UUID REFERENCES auth.users(id),
    redeemed_by UUID REFERENCES auth.users(id),
    redeemed_at TIMESTAMP WITH TIME ZONE,
    service_request_id UUID REFERENCES service_requests(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional data
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable RLS
ALTER TABLE custom_quotes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view quote by code" ON custom_quotes;
DROP POLICY IF EXISTS "Admins can manage quotes" ON custom_quotes;
DROP POLICY IF EXISTS "Users can view their redeemed quotes" ON custom_quotes;
DROP POLICY IF EXISTS "Users can redeem quotes" ON custom_quotes;

-- 3. RLS Policies
-- Anyone can look up a quote by code (for redemption)
CREATE POLICY "Anyone can view quote by code"
ON custom_quotes FOR SELECT
USING (true);

-- Admins can do everything
CREATE POLICY "Admins can manage quotes"
ON custom_quotes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- Users can update quotes they're redeeming
CREATE POLICY "Users can redeem quotes"
ON custom_quotes FOR UPDATE
USING (
    status = 'pending' OR status = 'viewed'
)
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_quotes_code ON custom_quotes(code);
CREATE INDEX IF NOT EXISTS idx_custom_quotes_status ON custom_quotes(status);
CREATE INDEX IF NOT EXISTS idx_custom_quotes_client_email ON custom_quotes(client_email);
CREATE INDEX IF NOT EXISTS idx_custom_quotes_created_by ON custom_quotes(created_by);

-- 5. Function to generate a unique quote code
CREATE OR REPLACE FUNCTION generate_quote_code(p_prefix TEXT DEFAULT 'RWS')
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate code: PREFIX-XXXXX-XXXXX (e.g., RWS-A7K2M-9B3XP)
        v_code := p_prefix || '-' || 
                  upper(substr(md5(random()::text), 1, 5)) || '-' || 
                  upper(substr(md5(random()::text), 1, 5));
        
        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM custom_quotes WHERE code = v_code) INTO v_exists;
        
        -- If code doesn't exist, return it
        IF NOT v_exists THEN
            RETURN v_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to validate and get quote details
CREATE OR REPLACE FUNCTION get_quote_by_code(p_code TEXT)
RETURNS TABLE (
    id UUID,
    code TEXT,
    client_name TEXT,
    client_email TEXT,
    upfront_cost DECIMAL,
    monthly_fee DECIMAL,
    service_type TEXT,
    service_description TEXT,
    client_notes TEXT,
    estimated_timeline TEXT,
    deliverables TEXT,
    requires_contract BOOLEAN,
    contract_url TEXT,
    status TEXT,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_valid BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_quote custom_quotes%ROWTYPE;
BEGIN
    -- Find the quote
    SELECT * INTO v_quote 
    FROM custom_quotes cq
    WHERE UPPER(cq.code) = UPPER(p_code);
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
            NULL::DECIMAL, NULL::DECIMAL, NULL::TEXT, NULL::TEXT, 
            NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN, 
            NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE,
            false, 'Invalid quote code'::TEXT;
        RETURN;
    END IF;
    
    -- Check if expired
    IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < NOW() THEN
        RETURN QUERY SELECT 
            v_quote.id, v_quote.code, v_quote.client_name, v_quote.client_email,
            v_quote.upfront_cost, v_quote.monthly_fee, v_quote.service_type, 
            v_quote.service_description, v_quote.client_notes, v_quote.estimated_timeline,
            v_quote.deliverables, v_quote.requires_contract, v_quote.contract_url,
            v_quote.status, v_quote.valid_until,
            false, 'This quote has expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check if already redeemed
    IF v_quote.status = 'redeemed' THEN
        RETURN QUERY SELECT 
            v_quote.id, v_quote.code, v_quote.client_name, v_quote.client_email,
            v_quote.upfront_cost, v_quote.monthly_fee, v_quote.service_type, 
            v_quote.service_description, v_quote.client_notes, v_quote.estimated_timeline,
            v_quote.deliverables, v_quote.requires_contract, v_quote.contract_url,
            v_quote.status, v_quote.valid_until,
            false, 'This quote has already been redeemed'::TEXT;
        RETURN;
    END IF;
    
    -- Check if cancelled
    IF v_quote.status = 'cancelled' THEN
        RETURN QUERY SELECT 
            v_quote.id, v_quote.code, v_quote.client_name, v_quote.client_email,
            v_quote.upfront_cost, v_quote.monthly_fee, v_quote.service_type, 
            v_quote.service_description, v_quote.client_notes, v_quote.estimated_timeline,
            v_quote.deliverables, v_quote.requires_contract, v_quote.contract_url,
            v_quote.status, v_quote.valid_until,
            false, 'This quote is no longer available'::TEXT;
        RETURN;
    END IF;
    
    -- Update viewed status if pending
    IF v_quote.status = 'pending' THEN
        UPDATE custom_quotes SET 
            status = 'viewed',
            viewed_at = NOW(),
            updated_at = NOW()
        WHERE custom_quotes.id = v_quote.id;
    END IF;
    
    -- Return valid quote
    RETURN QUERY SELECT 
        v_quote.id, v_quote.code, v_quote.client_name, v_quote.client_email,
        v_quote.upfront_cost, v_quote.monthly_fee, v_quote.service_type, 
        v_quote.service_description, v_quote.client_notes, v_quote.estimated_timeline,
        v_quote.deliverables, v_quote.requires_contract, v_quote.contract_url,
        v_quote.status, v_quote.valid_until,
        true, 'Quote is valid'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_quote_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_quote_by_code TO anon;
GRANT EXECUTE ON FUNCTION get_quote_by_code TO authenticated;

-- 7. Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_custom_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_quotes_updated_at ON custom_quotes;
CREATE TRIGGER custom_quotes_updated_at
    BEFORE UPDATE ON custom_quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_quotes_updated_at();
