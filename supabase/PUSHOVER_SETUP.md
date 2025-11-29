# Pushover Notifications Setup Guide

This guide will help you set up push notifications to your phone whenever there's new activity on your admin dashboard (new requests, contacts, or user signups).

## Step 1: Set Up Pushover Account

1. **Download Pushover App**
   - iOS: [App Store](https://apps.apple.com/us/app/pushover-notifications/id506088175)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=net.superblock.pushover)

2. **Create Account**
   - Go to [pushover.net](https://pushover.net)
   - Sign up for a free account
   - Note your **User Key** (shown on the dashboard after login)

3. **Create an Application**
   - Go to [pushover.net/apps/build](https://pushover.net/apps/build)
   - Name: "Ryan's Web Services Admin"
   - Type: Script/Server
   - Description: Admin notifications for ryanswebservices.com
   - Click "Create Application"
   - Note your **API Token/Key**

## Step 2: Install Supabase CLI (if not installed)

```bash
# macOS
brew install supabase/tap/supabase

# npm (any OS)
npm install -g supabase

# Or download from: https://github.com/supabase/cli/releases
```

## Step 3: Link Your Supabase Project

```bash
cd /home/ryan/Desktop/ryanswebservices

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ujludleswiuqlvosbpyg
```

## Step 4: Set Pushover Secrets

```bash
# Set your Pushover credentials as secrets
supabase secrets set PUSHOVER_USER_KEY=your_user_key_here
supabase secrets set PUSHOVER_APP_TOKEN=your_app_token_here
```

## Step 5: Deploy the Edge Function

```bash
supabase functions deploy pushover-notify
```

## Step 6: Set Up Database Triggers

### Option A: Using SQL (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com/project/ujludleswiuqlvosbpyg)
2. Navigate to **SQL Editor**
3. First, enable the pg_net extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```
4. Copy and paste the contents of `setup-pushover-notifications.sql`
5. Click "Run"

### Option B: Using Webhooks (Alternative)

If you prefer a no-code approach:

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Webhooks**
3. Create three webhooks:

   **Webhook 1: New Requests**
   - Name: `notify-new-request`
   - Table: `requests`
   - Events: `INSERT`
   - HTTP Request Method: `POST`
   - URL: `https://ujludleswiuqlvosbpyg.supabase.co/functions/v1/pushover-notify`
   - HTTP Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
   - HTTP Params: `{"type": "request"}`

   **Webhook 2: New Contacts**
   - Name: `notify-new-contact`
   - Table: `contacts`
   - Events: `INSERT`
   - URL: Same as above

   **Webhook 3: New Users**
   - Name: `notify-new-user`
   - Table: `profiles`
   - Events: `INSERT`
   - URL: Same as above

## Step 7: Test the Notification

You can test by running this in the Supabase SQL Editor:

```sql
-- Test by calling the Edge Function directly
SELECT net.http_post(
  url := 'https://ujludleswiuqlvosbpyg.supabase.co/functions/v1/pushover-notify',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{"type": "request", "record": {"name": "Test User", "email": "test@test.com", "service_type": "Test Service"}}'::jsonb
);
```

Or test via curl:

```bash
curl -X POST 'https://ujludleswiuqlvosbpyg.supabase.co/functions/v1/pushover-notify' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"type": "request", "record": {"name": "Test", "email": "test@test.com", "service_type": "Website"}}'
```

## Notification Types

| Activity | Icon | Priority | Sound |
|----------|------|----------|-------|
| New Service Request | 📋 | High (1) | pushover |
| New Contact Message | 📬 | Normal (0) | magic |
| New User Signup | 👤 | Normal (0) | magic |

## Troubleshooting

### Notifications not arriving?

1. **Check Edge Function logs:**
   ```bash
   supabase functions logs pushover-notify
   ```

2. **Verify secrets are set:**
   ```bash
   supabase secrets list
   ```

3. **Check Pushover app settings:**
   - Make sure notifications are enabled for the app
   - Check "Quiet Hours" aren't blocking notifications

4. **Test Edge Function directly:**
   Go to Supabase Dashboard → Edge Functions → pushover-notify → Logs

### pg_net extension errors?

Make sure to enable it first:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Cost

- **Pushover**: One-time $5 purchase per platform (iOS/Android)
- **Supabase Edge Functions**: Free tier includes 500,000 invocations/month
- **Database Triggers**: Free (included in your Supabase plan)

## Files Created

- `supabase/functions/pushover-notify/index.ts` - The Edge Function
- `supabase/setup-pushover-notifications.sql` - Database triggers
- `supabase/PUSHOVER_SETUP.md` - This guide
