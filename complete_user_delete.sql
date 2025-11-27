-- IMPORTANT: This requires the function to be run with elevated privileges
-- You may need to enable this in Supabase Dashboard > SQL Editor

-- Drop the old function
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);

-- Create enhanced delete function with auth.users deletion
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id_to_delete UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_role TEXT;
  target_role TEXT;
BEGIN
  -- Check if the calling user is admin or owner
  SELECT role INTO calling_user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF calling_user_role NOT IN ('admin', 'owner') THEN
    RETURN json_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Get target user role
  SELECT role INTO target_role FROM public.profiles WHERE id = user_id_to_delete;
  
  -- Prevent deleting owner accounts (unless you're also an owner)
  IF calling_user_role != 'owner' AND target_role = 'owner' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot delete owner accounts');
  END IF;

  -- Delete from all related tables (order matters for foreign keys)
  DELETE FROM public.files WHERE user_id = user_id_to_delete;
  DELETE FROM public.orders WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_profiles WHERE id = user_id_to_delete;
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  
  -- Delete from auth.users (this removes their ability to login)
  -- This requires SECURITY DEFINER and proper permissions
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'User and all associated data completely deleted'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'detail', 'Error deleting user. They may have dependencies that need to be removed first.'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- Verify the function was created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'admin_delete_user';
