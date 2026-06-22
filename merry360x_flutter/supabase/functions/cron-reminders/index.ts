import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getFcmAccessToken, sendPush } from '../_shared/fcm-utils.ts'

interface Booking {
  id: string
  guest_id: string
  host_id: string
  title: string
  guest_name: string
  check_in: string
  check_out: string
  status: string
}

interface NotificationResult {
  booking_id: string
  type: string
  sent: number
}

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    console.error('[cron-reminders] Missing env')
    return new Response('Missing env', { status: 500 })
  }

  const sb = createClient(supabaseUrl, supabaseKey)
  const results: NotificationResult[] = []

  // Get FCM access token once
  let fcmToken: string | undefined
  try { fcmToken = await getFcmAccessToken() } catch (err) {
    console.error('[cron-reminders] FCM auth failed:', err)
  }
  const projectId = Deno.env.get('FCM_PROJECT_ID')!

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const justPast = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

  // Helper: send notification to a user
  async function notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    screenRoute: string,
    bookingId: string,
  ): Promise<number> {
    // Save in-app notification
    await sb.from('notifications').insert({
      user_id: userId, type, title, body, screen_route: screenRoute,
      data: { booking_id: bookingId },
    })

    // Send push
    let sent = 0
    if (fcmToken && projectId) {
      const { data: tokens } = await sb
        .from('mobile_push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('is_active', true)
      for (const row of (tokens as { token: string }[] | null) ?? []) {
        if (!row.token) continue
        try {
          const ok = await sendPush(
            row.token, title, body,
            { type, screen_route, notification_id: '', booking_id: bookingId },
            projectId, fcmToken,
          )
          if (ok) sent++
        } catch { /* skip failed tokens */ }
      }
    }
    return sent
  }

  // ── 1. Check-in reminders (24h before) ──
  const { data: checkinBookings } = await sb
    .from('bookings')
    .select('id, guest_id, host_id, title, guest_name, check_in, check_out, status')
    .eq('status', 'confirmed')
    .eq('check_in', in24h)

  for (const b of (checkinBookings as Booking[] | null) ?? []) {
    const propName = b.title || 'your stay'
    // Guest reminder
    const g = await notify(b.guest_id, 'check_in_reminder', 'Check-in Tomorrow!',
      `You check into ${propName} tomorrow. Have a great stay!`,
      `/my-bookings/${b.id}`, b.id)
    // Host reminder
    const h = await notify(b.host_id, 'guest_check_in_reminder', 'Guest Check-in Tomorrow',
      `${b.guest_name || 'A guest'} checks into ${propName} tomorrow. Ensure everything is ready!`,
      `/host/bookings/${b.id}`, b.id)
    results.push({ booking_id: b.id, type: 'check_in_reminder', sent: g + h })
  }

  // ── 2. Check-out reminders (24h before) ──
  const { data: checkoutBookings } = await sb
    .from('bookings')
    .select('id, guest_id, host_id, title, guest_name, check_in, check_out, status')
    .eq('status', 'confirmed')
    .eq('check_out', in24h)

  for (const b of (checkoutBookings as Booking[] | null) ?? []) {
    const propName = b.title || 'your stay'
    const g = await notify(b.guest_id, 'check_out_reminder', 'Check-out Tomorrow',
      `Check-out from ${propName} is tomorrow. We hope you enjoyed your stay!`,
      `/my-bookings/${b.id}`, b.id)
    results.push({ booking_id: b.id, type: 'check_out_reminder_guest', sent: g })
  }

  // ── 3. Review reminders (2h after check-out) ──
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: completedBookings } = await sb
    .from('bookings')
    .select('id, guest_id, host_id, title, guest_name, check_in, check_out, status')
    .eq('status', 'completed')
    .eq('check_out', twoHoursAgo)

  for (const b of (completedBookings as Booking[] | null) ?? []) {
    // Check they haven't already reviewed
    const { data: existing } = await sb
      .from('reviews')
      .select('id')
      .eq('booking_id', b.id)
      .maybeSingle()

    if (existing) continue // already reviewed

    const sent = await notify(b.guest_id, 'review_reminder', 'How was your stay?',
      `Leave a review for ${b.title || 'your stay'} and help other travelers.`,
      `/review?booking_id=${b.id}`, b.id)
    results.push({ booking_id: b.id, type: 'review_reminder', sent })
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
