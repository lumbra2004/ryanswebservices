-- First, check if your user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'ryanlumbra@icloud.com';

-- If you see your user above, copy the ID and use it below
-- Otherwise, you need to sign up first on your website

-- Create your profile manually (replace the ID if needed)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Ryan'), 
  'owner'
FROM auth.users
WHERE email = 'ryanlumbra@icloud.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'owner',
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Verify it was created
SELECT * FROM public.profiles WHERE email = 'ryanlumbra@icloud.com';
