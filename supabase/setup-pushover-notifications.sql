-- =====================================================
-- Pushover Notification Setup for Ryan's Web Services
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- Make sure to deploy the Edge Function first!

-- 1. Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION notify_admin_pushover()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  notification_type text;
BEGIN
  -- Determine the type based on TG_TABLE_NAME
  notification_type := CASE TG_TABLE_NAME
    WHEN 'requests' THEN 'request'
    WHEN 'contacts' THEN 'contact'
    WHEN 'profiles' THEN 'user'
    ELSE 'unknown'
  END;

  -- Build the payload
  payload := jsonb_build_object(
    'type', notification_type,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Call the Edge Function (async via pg_net extension)
  PERFORM net.http_post(
    url := 'https://ujludleswiuqlvosbpyg.supabase.co/functions/v1/pushover-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create triggers on relevant tables

-- Trigger for new service requests
DROP TRIGGER IF EXISTS on_new_request_notify ON requests;
CREATE TRIGGER on_new_request_notify
  AFTER INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_pushover();

-- Trigger for new contact messages
DROP TRIGGER IF EXISTS on_new_contact_notify ON contacts;
CREATE TRIGGER on_new_contact_notify
  AFTER INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_pushover();

-- Trigger for new user signups (profiles table)
DROP TRIGGER IF EXISTS on_new_user_notify ON profiles;
CREATE TRIGGER on_new_user_notify
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_pushover();

-- =====================================================
-- IMPORTANT: Enable the pg_net extension if not already
-- =====================================================
-- Run this separately if you get an error about net.http_post:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- Alternative: Using Supabase Webhooks (Simpler Setup)
-- =====================================================
-- If you prefer not to use database triggers, you can set up
-- webhooks in the Supabase Dashboard:
-- 1. Go to Database > Webhooks
-- 2. Create webhooks for INSERT on requests, contacts, profiles
-- 3. Point them to your Edge Function URL
