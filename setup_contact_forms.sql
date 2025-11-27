-- Contact Form System Setup
-- Run this SQL in Supabase SQL Editor

-- 1. Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT, -- where they found you (optional)
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contact_submissions_updated_at ON contact_submissions;
CREATE TRIGGER update_contact_submissions_updated_at
    BEFORE UPDATE ON contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_submissions_updated_at();

-- 3. Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can update all submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON contact_submissions;

-- 4. RLS Policies

-- Anyone can submit a contact form (public access)
CREATE POLICY "Anyone can insert contact submissions"
ON contact_submissions FOR INSERT
WITH CHECK (true);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON contact_submissions FOR SELECT
USING (get_user_role(auth.uid()) IN ('admin', 'owner'));

-- Admins can update submissions (mark as read, add notes, etc.)
CREATE POLICY "Admins can update all submissions"
ON contact_submissions FOR UPDATE
USING (get_user_role(auth.uid()) IN ('admin', 'owner'));

-- Admins can delete submissions
CREATE POLICY "Admins can delete submissions"
ON contact_submissions FOR DELETE
USING (get_user_role(auth.uid()) IN ('admin', 'owner'));

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);

-- 6. Verify setup
SELECT 
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status = 'new') as new_submissions,
    COUNT(*) FILTER (WHERE status = 'read') as read_submissions,
    COUNT(*) FILTER (WHERE status = 'replied') as replied,
    COUNT(*) FILTER (WHERE status = 'archived') as archived
FROM contact_submissions;

-- Setup complete!
-- Next steps:
-- 1. Update index.html form to submit to Supabase
-- 2. Add Contact Submissions section to admin panel
-- 3. Add email notifications (optional)
