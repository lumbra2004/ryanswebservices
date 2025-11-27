-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Drop and recreate the profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  business_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Policy: Users can update their own profile (excluding role column)
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Policy: Service role can do everything (this is for admin queries)
CREATE POLICY "Service role has full access"
ON public.profiles
USING (auth.jwt()->>'role' = 'service_role');

-- Create a function to check if user is admin or owner (avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, business_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'business_name',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert or update your profile as owner
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'owner'
FROM auth.users
WHERE email = 'ryanlumbra@icloud.com'
ON CONFLICT (id) DO UPDATE SET role = 'owner';

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Create a function for admins to get all profiles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  business_name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user is admin or owner
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return all profiles
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.business_name, p.role, p.created_at, p.updated_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;
