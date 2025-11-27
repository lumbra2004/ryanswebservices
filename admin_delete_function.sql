-- Create a function for admins to delete users
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id_to_delete UUID)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
  calling_user_role TEXT;
BEGIN
  -- Check if the calling user is admin or owner
  SELECT role INTO calling_user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF calling_user_role NOT IN ('admin', 'owner') THEN
    RETURN json_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Prevent deleting owner accounts (unless you're also an owner)
  IF calling_user_role != 'owner' THEN
    DECLARE
      target_role TEXT;
    BEGIN
      SELECT role INTO target_role FROM public.profiles WHERE id = user_id_to_delete;
      IF target_role = 'owner' THEN
        RETURN json_build_object('success', false, 'error', 'Cannot delete owner accounts');
      END IF;
    END;
  END IF;

  -- Delete from all user-related tables
  DELETE FROM public.user_profiles WHERE id = user_id_to_delete;
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  DELETE FROM public.orders WHERE user_id = user_id_to_delete;
  DELETE FROM public.files WHERE user_id = user_id_to_delete;
  
  -- Delete from auth.users (this is the key part - removes authentication)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN json_build_object('success', true, 'message', 'User completely deleted from all tables');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
