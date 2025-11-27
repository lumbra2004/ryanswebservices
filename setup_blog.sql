-- Blog Posts System Setup
-- Run this SQL in Supabase SQL Editor

-- 1. Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    category TEXT,
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can manage posts" ON blog_posts;

-- 4. RLS Policies
-- Anyone can read published posts
CREATE POLICY "Anyone can read published posts"
ON blog_posts FOR SELECT
USING (published = true);

-- Admins can do everything with posts
CREATE POLICY "Admins can manage posts"
ON blog_posts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

-- 6. Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                TRIM(title),
                '[^a-zA-Z0-9\s-]', '', 'g'
            ),
            '\s+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_blog_post_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_blog_posts_timestamp ON blog_posts;
CREATE TRIGGER update_blog_posts_timestamp
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_post_timestamp();
