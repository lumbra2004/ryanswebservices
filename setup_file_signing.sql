-- Setup File Signing System
-- Run this SQL in Supabase SQL Editor

-- 1. Create files table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
    uploaded_by UUID REFERENCES auth.users(id),
    signed_at TIMESTAMP,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Create storage bucket for user documents
-- NOTE: This needs to be done in Supabase Dashboard > Storage
-- Create a new bucket called 'user-documents' with public access

-- 5. Set up RLS policies for files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own files" ON files;
DROP POLICY IF EXISTS "Admins can view all files" ON files;
DROP POLICY IF EXISTS "Admins can insert files" ON files;
DROP POLICY IF EXISTS "Admins can update files" ON files;
DROP POLICY IF EXISTS "Users can update their own files" ON files;
DROP POLICY IF EXISTS "Admins can delete files" ON files;

-- Users can view their own files
CREATE POLICY "Users can view their own files"
ON files FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all files
CREATE POLICY "Admins can view all files"
ON files FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
);

-- Admins can insert files
CREATE POLICY "Admins can insert files"
ON files FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
);

-- Admins can update all files
CREATE POLICY "Admins can update files"
ON files FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
);

-- Users can update their own files (for signing)
CREATE POLICY "Users can update their own files"
ON files FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can delete files
CREATE POLICY "Admins can delete files"
ON files FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- 5. Storage bucket policies (add these in Supabase Dashboard > Storage > user-documents > Policies)
-- 
-- Policy Name: "Admins can upload files"
-- Operation: INSERT
-- Policy Definition:
-- (bucket_id = 'user-documents' AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'))
--
-- Policy Name: "Users can view their own files"
-- Operation: SELECT
-- Policy Definition:
-- (bucket_id = 'user-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
--
-- Policy Name: "Admins can view all files"
-- Operation: SELECT
-- Policy Definition:
-- (bucket_id = 'user-documents' AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'))
--
-- Policy Name: "Admins can delete files"
-- Operation: DELETE
-- Policy Definition:
-- (bucket_id = 'user-documents' AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'))

-- Completed! Now you can:
-- 1. Admins upload files to user accounts via admin panel
-- 2. Users view and sign documents from their profile page
-- 3. File status tracks pending/signed state
