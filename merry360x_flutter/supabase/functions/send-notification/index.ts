import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getFcmAccessToken, sendPush } from '../_shared/fcm-utils.ts'

interface NotificationRequest {
  userId: string
  userIds?: string[]
  type: string
  title: string
  body: string
  screenRoute: string
  data?: Record<string, string>
  /** If true, skips push and only saves in-app */
  silent?: boolean
}

// Track recently sent notifications for batching (in-memory, per-invocation)
const recentNotifications = new Map<string, { count: number; timer: number }>()

serve(async (req) => {
  try {
    const payload: NotificationRequest = await req.json()
    const userIds: string[] = payload.userIds ?? [payload.userId]

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing env' }), { status: 500 })
    }

    const sb = createClient(supabaseUrl, supabaseKey)

    // ── Batching check: skip if same userId+type sent within 60s ──
    const batchKey = `${userIds.sort().join(',')}:${payload.type}`
    const now = Date.now()
    const recent = recentNotifications.get(batchKey)
    if (recent && (now - recent.timer) < 60_000) {
      recent.count++
      // Update the existing notification body with combined count
      const { data: existing } = await sb
        .from('notifications')
        .select('id, body')
        .eq('type', payload.type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing && recent.count > 1) {
        const updatedBody = `${payload.body} (${recent.count} events)`
        await sb.from('notifications').update({ body: updatedBody }).eq('id', existing.id)
      }

      return new Response(JSON.stringify({ batched: true, notification_id: existing?.id ?? 'unknown' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    recentNotifications.set(batchKey, { count: 1, timer: now })
    // Cleanup old entries
    for (const [key, val] of recentNotifications) {
      if ((now - val.timer) > 120_000) recentNotifications.delete(key)
    }

    const results: { userId: string; notificationId?: string; sent?: number; error?: string }[] = []

    for (const uid of userIds) {
      if (!uid) continue

      // 1. Save to notifications table
      const { data: notification, error: insertError } = await sb
        .from('notifications')
        .insert({
          user_id: uid,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          screen_route: payload.screenRoute,
          data: payload.data ?? {},
        })
        .select('id')
        .single()

      if (insertError) {
        console.error(`[send-notification] DB insert failed for ${uid}:`, insertError)
        results.push({ userId: uid, error: insertError.message })
        continue
      }

      const notificationId = notification?.id as string

      // 2. Skip push if silent
      if (payload.silent) {
        results.push({ userId: uid, notificationId, sent: 0 })
        continue
      }

      // 3. Check notification preferences
      const { data: prefs } = await sb
        .from('notification_preferences')
        .select('push_enabled')
        .eq('user_id', uid)
        .single()

      if (prefs && !(prefs as any).push_enabled) {
        results.push({ userId: uid, notificationId, sent: 0, error: 'push_disabled' })
        continue
      }

      // 4. Fetch active FCM tokens
      const { data: tokens } = await sb
        .from('mobile_push_tokens')
        .select('token')
        .eq('user_id', uid)
        .eq('is_active', true)

      const deviceTokens = (tokens as { token: string }[] | null) ?? []
      if (deviceTokens.length === 0) {
        results.push({ userId: uid, notificationId, sent: 0, error: 'no_tokens' })
        continue
      }

      // 5. Get FCM access token once
      let fcmToken: string
      try {
        fcmToken = await getFcmAccessToken()
      } catch (err) {
        console.error('[send-notification] FCM auth failed:', err)
        results.push({ userId: uid, notificationId, sent: 0, error: 'fcm_auth_failed' })
        continue
      }

      const projectId = Deno.env.get('FCM_PROJECT_ID')!
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
          console.error(`[send-notification] FCM send failed for token:`, err)
        }
      }

      results.push({ userId: uid, notificationId, sent })
    }

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-notification] Error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})
