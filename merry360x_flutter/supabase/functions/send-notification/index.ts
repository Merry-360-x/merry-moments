import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getFcmAccessToken, sendPush } from '../_shared/fcm-utils.ts'

interface NotificationRequest {
  userId: string
  type: string
  title: string
  body: string
  screenRoute: string
  data?: Record<string, string>
  /** If true, skips push and only saves in-app */
  silent?: boolean
}

serve(async (req) => {
  try {
    const payload: NotificationRequest = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 })
    }

    const sb = createClient(supabaseUrl, supabaseKey)

    // 1. Save to notifications table
    const { data: notification, error: insertError } = await sb
      .from('notifications')
      .insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        screen_route: payload.screenRoute,
        data: payload.data ?? {},
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[send-notification] DB insert failed:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
    }

    const notificationId = notification?.id as string

    // 2. Skip push if silent
    if (payload.silent) {
      return new Response(JSON.stringify({ sent: 0, notification_id: notificationId }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Check user's notification preferences
    const { data: prefs } = await sb
      .from('notification_preferences')
      .select('push_enabled')
      .eq('user_id', payload.userId)
      .single()

    if (prefs && !(prefs as any).push_enabled) {
      return new Response(JSON.stringify({ sent: 0, notification_id: notificationId, reason: 'push_disabled' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 4. Fetch user's active FCM tokens
    const { data: tokens } = await sb
      .from('mobile_push_tokens')
      .select('token')
      .eq('user_id', payload.userId)
      .eq('is_active', true)

    const deviceTokens = (tokens as { token: string }[] | null) ?? []
    if (deviceTokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, notification_id: notificationId, reason: 'no_tokens' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 5. Get FCM access token
    let fcmToken: string
    try {
      fcmToken = await getFcmAccessToken()
    } catch (err) {
      console.error('[send-notification] FCM auth failed:', err)
      return new Response(JSON.stringify({ error: 'FCM auth failed', notification_id: notificationId }), { status: 500 })
    }

    const projectId = Deno.env.get('FCM_PROJECT_ID')!

    // 6. Send push to all tokens
    const data = {
      type: payload.type,
      screen_route: payload.screenRoute,
      notification_id: notificationId,
      ...(payload.data ?? {}),
    }

    let sent = 0
    for (const { token } of deviceTokens) {
      if (!token) continue
      try {
        const ok = await sendPush(token, payload.title, payload.body, data, projectId, fcmToken)
        if (ok) sent++
      } catch (err) {
        console.error(`[send-notification] FCM send failed for token ${token.substring(0, 16)}...:`, err)
      }
    }

    return new Response(JSON.stringify({ sent, notification_id: notificationId }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-notification] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
