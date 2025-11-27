-- Promo Codes System Setup
-- Run this SQL in Supabase SQL Editor

-- 1. Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
    times_used INTEGER DEFAULT 0,
    min_purchase DECIMAL(10,2) DEFAULT 0,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP DEFAULT NULL, -- NULL = no expiry
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create promo_code_uses table to track which users used which codes
CREATE TABLE IF NOT EXISTS promo_code_uses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(promo_code_id, service_request_id) -- Each code can only be used once per request
);

-- 3. Add stripe fields to service_requests if not exist
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partial_refund'));
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- 4. Enable RLS on promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can validate codes" ON promo_codes;
DROP POLICY IF EXISTS "Admins can manage codes" ON promo_codes;
DROP POLICY IF EXISTS "Users can see their code uses" ON promo_code_uses;
DROP POLICY IF EXISTS "System can insert code uses" ON promo_code_uses;

-- 5. RLS Policies for promo_codes
-- Anyone can validate (select) active codes
CREATE POLICY "Anyone can validate codes"
ON promo_codes FOR SELECT
USING (is_active = true);

-- Admins can do everything with promo codes
CREATE POLICY "Admins can manage codes"
ON promo_codes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 6. RLS Policies for promo_code_uses
-- Users can see their own code uses
CREATE POLICY "Users can see their code uses"
ON promo_code_uses FOR SELECT
USING (auth.uid() = user_id);

-- System/admins can insert code uses
CREATE POLICY "Admins can manage code uses"
ON promo_code_uses FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_code ON promo_code_uses(promo_code_id);

-- 8. Function to validate and apply promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
    p_code TEXT,
    p_user_id UUID,
    p_purchase_amount DECIMAL
)
RETURNS TABLE (
    valid BOOLEAN,
    promo_id UUID,
    discount_type TEXT,
    discount_value DECIMAL,
    calculated_discount DECIMAL,
    message TEXT
) AS $$
DECLARE
    v_promo promo_codes%ROWTYPE;
BEGIN
    -- Find the promo code
    SELECT * INTO v_promo 
    FROM promo_codes 
    WHERE code = UPPER(p_code) AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 'Invalid promo code'::TEXT;
        RETURN;
    END IF;
    
    -- Check if code is expired
    IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 'Promo code has expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check if code hasn't started yet
    IF v_promo.valid_from > NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 'Promo code is not yet active'::TEXT;
        RETURN;
    END IF;
    
    -- Check max uses
    IF v_promo.max_uses IS NOT NULL AND v_promo.times_used >= v_promo.max_uses THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 'Promo code has reached maximum uses'::TEXT;
        RETURN;
    END IF;
    
    -- Check minimum purchase
    IF p_purchase_amount < v_promo.min_purchase THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::DECIMAL, 
            ('Minimum purchase of $' || v_promo.min_purchase || ' required')::TEXT;
        RETURN;
    END IF;
    
    -- Calculate discount
    IF v_promo.discount_type = 'percentage' THEN
        RETURN QUERY SELECT true, v_promo.id, v_promo.discount_type, v_promo.discount_value, 
            ROUND(p_purchase_amount * (v_promo.discount_value / 100), 2),
            ('Applied ' || v_promo.discount_value || '% discount')::TEXT;
    ELSE
        RETURN QUERY SELECT true, v_promo.id, v_promo.discount_type, v_promo.discount_value,
            LEAST(v_promo.discount_value, p_purchase_amount),
            ('Applied $' || v_promo.discount_value || ' discount')::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_promo_code TO authenticated;
GRANT EXECUTE ON FUNCTION validate_promo_code TO anon;
