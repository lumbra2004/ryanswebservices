-- Verify Files Table RLS Policies
-- Run this to check if policies are set up correctly

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'files';

-- List all policies on files table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'files'
ORDER BY policyname;

-- Test query as if you were a user (replace YOUR_USER_ID with actual user ID)
-- This will show what a user can see
SELECT COUNT(*) as files_visible
FROM files
WHERE user_id = '42d297de-55f1-48f4-9943-ff947618ff7e';
