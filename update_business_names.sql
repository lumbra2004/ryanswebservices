-- Check current profiles and their business names
SELECT id, email, full_name, business_name, role FROM public.profiles;

-- Update the trigger to properly handle business_name
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, business_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'business_name', ''),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    business_name = COALESCE(EXCLUDED.business_name, profiles.business_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- If you want to manually update existing profiles with their business names from auth metadata:
UPDATE public.profiles p
SET business_name = COALESCE(u.raw_user_meta_data->>'business_name', '')
FROM auth.users u
WHERE p.id = u.id
AND p.business_name IS NULL;

-- Verify the update
SELECT id, email, full_name, business_name, role FROM public.profiles;
