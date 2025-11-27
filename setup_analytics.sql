-- Visitor Analytics System Setup
-- Run this SQL in Supabase SQL Editor

-- 1. Create page_visits table to track all visits
CREATE TABLE IF NOT EXISTS page_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Session & User Info
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Page Info
    page_url TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    
    -- Visitor Info
    ip_address TEXT,
    user_agent TEXT,
    
    -- Device Info
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    
    -- Screen Info
    screen_width INTEGER,
    screen_height INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,
    
    -- Location (from IP geolocation)
    country TEXT,
    country_code TEXT,
    region TEXT,
    city TEXT,
    postal_code TEXT,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    timezone TEXT,
    isp TEXT,
    
    -- UTM Parameters
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    
    -- Engagement
    time_on_page INTEGER DEFAULT 0, -- seconds
    scroll_depth INTEGER DEFAULT 0, -- percentage 0-100
    
    -- Timestamps
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional data
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Create unique_visitors table for aggregated visitor data
CREATE TABLE IF NOT EXISTS unique_visitors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint TEXT UNIQUE NOT NULL, -- Browser fingerprint for unique identification
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_visits INTEGER DEFAULT 1,
    total_page_views INTEGER DEFAULT 1,
    
    -- Last known info
    last_ip TEXT,
    last_country TEXT,
    last_city TEXT,
    last_device TEXT,
    last_browser TEXT,
    last_os TEXT,
    
    -- User association (if they logged in)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Conversion tracking
    converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMP WITH TIME ZONE,
    conversion_type TEXT, -- 'signup', 'contact', 'purchase'
    
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Create page_events table for tracking specific actions
CREATE TABLE IF NOT EXISTS page_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    visit_id UUID REFERENCES page_visits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    event_type TEXT NOT NULL, -- 'click', 'scroll', 'form_start', 'form_submit', 'video_play', etc.
    event_category TEXT,
    event_label TEXT,
    event_value TEXT,
    
    -- Element info
    element_id TEXT,
    element_class TEXT,
    element_tag TEXT,
    element_text TEXT,
    
    -- Position
    page_x INTEGER,
    page_y INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Enable RLS
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE unique_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert visits" ON page_visits;
DROP POLICY IF EXISTS "Admins can view all visits" ON page_visits;
DROP POLICY IF EXISTS "Anyone can insert visitors" ON unique_visitors;
DROP POLICY IF EXISTS "Admins can view all visitors" ON unique_visitors;
DROP POLICY IF EXISTS "Anyone can insert events" ON page_events;
DROP POLICY IF EXISTS "Admins can view all events" ON page_events;

-- 5. RLS Policies for page_visits
-- Anyone can insert (for tracking)
CREATE POLICY "Anyone can insert visits"
ON page_visits FOR INSERT
WITH CHECK (true);

-- Anyone can update their own session (for time on page updates)
CREATE POLICY "Anyone can update own session"
ON page_visits FOR UPDATE
USING (true)
WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all visits"
ON page_visits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 6. RLS Policies for unique_visitors
CREATE POLICY "Anyone can insert visitors"
ON unique_visitors FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update visitors"
ON unique_visitors FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view all visitors"
ON unique_visitors FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 7. RLS Policies for page_events
CREATE POLICY "Anyone can insert events"
ON page_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all events"
ON page_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_visits_session ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON page_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_url ON page_visits(page_url);
CREATE INDEX IF NOT EXISTS idx_page_visits_country ON page_visits(country);
CREATE INDEX IF NOT EXISTS idx_page_visits_device ON page_visits(device_type);
CREATE INDEX IF NOT EXISTS idx_unique_visitors_fingerprint ON unique_visitors(fingerprint);
CREATE INDEX IF NOT EXISTS idx_unique_visitors_last_visit ON unique_visitors(last_visit DESC);
CREATE INDEX IF NOT EXISTS idx_page_events_session ON page_events(session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_type ON page_events(event_type);

-- 9. Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_visits BIGINT,
    unique_visitors BIGINT,
    total_page_views BIGINT,
    avg_time_on_site NUMERIC,
    bounce_rate NUMERIC,
    top_country TEXT,
    top_page TEXT,
    top_referrer TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH visit_stats AS (
        SELECT 
            COUNT(*) as visits,
            COUNT(DISTINCT session_id) as sessions,
            COUNT(DISTINCT COALESCE(ip_address, session_id)) as visitors,
            AVG(time_on_page) as avg_time
        FROM page_visits
        WHERE visited_at >= NOW() - (p_days || ' days')::INTERVAL
    ),
    bounce_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE page_count = 1)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100 as bounce
        FROM (
            SELECT session_id, COUNT(*) as page_count
            FROM page_visits
            WHERE visited_at >= NOW() - (p_days || ' days')::INTERVAL
            GROUP BY session_id
        ) sessions
    ),
    top_stats AS (
        SELECT 
            (SELECT country FROM page_visits WHERE visited_at >= NOW() - (p_days || ' days')::INTERVAL AND country IS NOT NULL GROUP BY country ORDER BY COUNT(*) DESC LIMIT 1) as top_country,
            (SELECT page_url FROM page_visits WHERE visited_at >= NOW() - (p_days || ' days')::INTERVAL GROUP BY page_url ORDER BY COUNT(*) DESC LIMIT 1) as top_page,
            (SELECT referrer FROM page_visits WHERE visited_at >= NOW() - (p_days || ' days')::INTERVAL AND referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 1) as top_referrer
    )
    SELECT 
        vs.sessions,
        vs.visitors,
        vs.visits,
        ROUND(vs.avg_time, 0),
        ROUND(COALESCE(bs.bounce, 0), 1),
        ts.top_country,
        ts.top_page,
        ts.top_referrer
    FROM visit_stats vs, bounce_stats bs, top_stats ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_analytics_summary TO authenticated;

-- 10. Function to record a page visit (called from the tracking script)
CREATE OR REPLACE FUNCTION record_page_visit(
    p_session_id TEXT,
    p_page_url TEXT,
    p_page_title TEXT DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL,
    p_browser TEXT DEFAULT NULL,
    p_browser_version TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_os_version TEXT DEFAULT NULL,
    p_screen_width INTEGER DEFAULT NULL,
    p_screen_height INTEGER DEFAULT NULL,
    p_viewport_width INTEGER DEFAULT NULL,
    p_viewport_height INTEGER DEFAULT NULL,
    p_utm_source TEXT DEFAULT NULL,
    p_utm_medium TEXT DEFAULT NULL,
    p_utm_campaign TEXT DEFAULT NULL,
    p_utm_term TEXT DEFAULT NULL,
    p_utm_content TEXT DEFAULT NULL,
    p_fingerprint TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_visit_id UUID;
    v_user_id UUID;
BEGIN
    -- Get current user if authenticated
    v_user_id := auth.uid();
    
    -- Insert page visit
    INSERT INTO page_visits (
        session_id, user_id, page_url, page_title, referrer, user_agent,
        device_type, browser, browser_version, os, os_version,
        screen_width, screen_height, viewport_width, viewport_height,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        metadata
    ) VALUES (
        p_session_id, v_user_id, p_page_url, p_page_title, p_referrer, p_user_agent,
        p_device_type, p_browser, p_browser_version, p_os, p_os_version,
        p_screen_width, p_screen_height, p_viewport_width, p_viewport_height,
        p_utm_source, p_utm_medium, p_utm_campaign, p_utm_term, p_utm_content,
        p_metadata
    )
    RETURNING id INTO v_visit_id;
    
    -- Update or insert unique visitor
    IF p_fingerprint IS NOT NULL THEN
        INSERT INTO unique_visitors (fingerprint, last_ip, last_device, last_browser, last_os, user_id)
        VALUES (p_fingerprint, '', p_device_type, p_browser, p_os, v_user_id)
        ON CONFLICT (fingerprint) DO UPDATE SET
            last_visit = NOW(),
            total_visits = unique_visitors.total_visits + 1,
            total_page_views = unique_visitors.total_page_views + 1,
            last_device = COALESCE(p_device_type, unique_visitors.last_device),
            last_browser = COALESCE(p_browser, unique_visitors.last_browser),
            last_os = COALESCE(p_os, unique_visitors.last_os),
            user_id = COALESCE(v_user_id, unique_visitors.user_id);
    END IF;
    
    RETURN v_visit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_page_visit TO anon;
GRANT EXECUTE ON FUNCTION record_page_visit TO authenticated;

-- 11. Function to update visit with geolocation data
CREATE OR REPLACE FUNCTION update_visit_location(
    p_visit_id UUID,
    p_ip_address TEXT,
    p_country TEXT,
    p_country_code TEXT,
    p_region TEXT,
    p_city TEXT,
    p_postal_code TEXT,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_timezone TEXT,
    p_isp TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE page_visits SET
        ip_address = p_ip_address,
        country = p_country,
        country_code = p_country_code,
        region = p_region,
        city = p_city,
        postal_code = p_postal_code,
        latitude = p_latitude,
        longitude = p_longitude,
        timezone = p_timezone,
        isp = p_isp
    WHERE id = p_visit_id;
    
    -- Also update unique visitor if fingerprint exists
    UPDATE unique_visitors SET
        last_ip = p_ip_address,
        last_country = p_country,
        last_city = p_city
    WHERE fingerprint IN (
        SELECT (metadata->>'fingerprint')::TEXT 
        FROM page_visits 
        WHERE id = p_visit_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_visit_location TO anon;
GRANT EXECUTE ON FUNCTION update_visit_location TO authenticated;
