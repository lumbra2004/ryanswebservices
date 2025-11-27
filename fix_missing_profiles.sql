-- Fix Missing Profiles
-- This script creates profile records for users who don't have them
-- Run this in Supabase SQL Editor

-- Insert missing profiles for all auth.users who don't have a profile
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
    'user' as role,
    u.created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Verify the fix worked
SELECT 
    COUNT(*) as total_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    COUNT(*) - (SELECT COUNT(*) FROM profiles) as missing_profiles
FROM auth.users;
