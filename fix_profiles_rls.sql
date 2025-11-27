-- Fix Profiles RLS Policies for Admin Access
-- This allows admins to view all profiles (needed for the admin panel)

-- Drop existing policies that might be blocking access
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow admins and owners to view all profiles using get_user_role function
-- First, create a function to get user role without causing recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = user_id LIMIT 1;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy using the function
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (get_user_role(auth.uid()) IN ('admin', 'owner'));

-- Verify policies were created
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
