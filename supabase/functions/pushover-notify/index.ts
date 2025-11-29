// Supabase Edge Function to send Pushover notifications
// Deploy with: supabase functions deploy pushover-notify

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json"

// Secret key to verify requests from database triggers
const TRIGGER_SECRET = Deno.env.get('TRIGGER_SECRET') || 'db-trigger-internal'

interface NotificationPayload {
  type: 'request' | 'contact' | 'user'
  record: Record<string, any>
  old_record?: Record<string, any>
}

serve(async (req) => {
  // Allow requests from database triggers (they can't send auth headers easily)
  const url = new URL(req.url)
  const triggerSecret = url.searchParams.get('secret')
  const authHeader = req.headers.get('Authorization')
  
  // Accept if valid auth header OR valid trigger secret
  if (!authHeader && triggerSecret !== TRIGGER_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }
  
  try {
    // Get Pushover credentials from environment
    const PUSHOVER_USER_KEY = Deno.env.get('PUSHOVER_USER_KEY')
    const PUSHOVER_APP_TOKEN = Deno.env.get('PUSHOVER_APP_TOKEN')

    if (!PUSHOVER_USER_KEY || !PUSHOVER_APP_TOKEN) {
      throw new Error('Pushover credentials not configured')
    }

    const payload: NotificationPayload = await req.json()
    const { type, record } = payload

    let title = ''
    let message = ''
    let priority = 0 // Normal priority

    switch (type) {
      case 'request':
        title = '📋 New Service Request'
        message = `Name: ${record.name || 'N/A'}\nService: ${record.service_type || record.service || 'N/A'}\nEmail: ${record.email || 'N/A'}`
        priority = 1 // High priority
        break

      case 'contact':
        title = '📬 New Contact Message'
        message = `From: ${record.name || 'N/A'}\nEmail: ${record.email || 'N/A'}\nMessage: ${(record.message || '').substring(0, 200)}${record.message?.length > 200 ? '...' : ''}`
        priority = 1 // High priority
        break

      case 'user':
        title = '👤 New User Signup'
        message = `Email: ${record.email || 'N/A'}\nName: ${record.full_name || record.name || 'N/A'}`
        priority = 1 // High priority
        break

      default:
        title = '🔔 Admin Activity'
        message = JSON.stringify(record).substring(0, 500)
    }

    // Send to Pushover
    const pushoverResponse = await fetch(PUSHOVER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: PUSHOVER_APP_TOKEN,
        user: PUSHOVER_USER_KEY,
        title: title,
        message: message,
        priority: priority,
        sound: priority > 0 ? 'pushover' : 'magic', // Different sounds based on priority
        url: 'https://ryanswebservices.com/admin.html',
        url_title: 'Open Admin Dashboard'
      })
    })

    const result = await pushoverResponse.json()

    if (!pushoverResponse.ok) {
      throw new Error(`Pushover API error: ${JSON.stringify(result)}`)
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Pushover notification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
