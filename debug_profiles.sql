-- Debug Profiles Issue
-- Run this to see what's happening with the profiles table

-- 1. Check if the user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE id = '42d297de-55f1-48f4-9943-ff947618ff7e';

-- 2. Check if the user has a profile
SELECT id, email, full_name, role, created_at 
FROM profiles 
WHERE id = '42d297de-55f1-48f4-9943-ff947618ff7e';

-- 3. Count total profiles vs total users
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM profiles) as missing_profiles;

-- 4. Check RLS policies on profiles table
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 5. If user doesn't have a profile, insert one manually
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    '42d297de-55f1-48f4-9943-ff947618ff7e',
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    'user',
    u.created_at,
    NOW()
FROM auth.users u
WHERE u.id = '42d297de-55f1-48f4-9943-ff947618ff7e'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- 6. Verify it worked
SELECT id, email, full_name, role 
FROM profiles 
WHERE id = '42d297de-55f1-48f4-9943-ff947618ff7e';
