import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

interface NotificationPayload {
  bookingId: string
  hostId: string
  propertyName: string
  guestName: string
  checkIn: string
  checkOut: string
}

/** Create a signed JWT for the Google OAuth2 token exchange. */
async function createAssertion(
  clientEmail: string,
  privateKey: string,
  scope: string,
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: clientEmail,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const encoder = new TextEncoder()
  const b64 = (obj: unknown) =>
    btoa(encoder.encode(JSON.stringify(obj)).reduce((s, b) => s + String.fromCharCode(b), ''))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signatureInput = `${b64(header)}.${b64(claim)}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    PEMtoBinary(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    encoder.encode(signatureInput),
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${signatureInput}.${sigB64}`
}

function PEMtoBinary(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [\w\s]+-----/g, '')
    .replace(/-----END [\w\s]+-----/g, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** Exchange a JWT assertion for a Google OAuth2 access token. */
async function getAccessToken(
  assertion: string,
): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`OAuth2 token exchange failed: ${resp.status} ${text}`)
  }
  const data = await resp.json()
  return data.access_token as string
}

/** Send an FCM v1 message to a single device token. */
async function sendFcmV1(
  projectId: string,
  accessToken: string,
  deviceToken: string,
  title: string,
  body: string,
  bookingId: string,
): Promise<boolean> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
  const message = {
    message: {
      token: deviceToken,
      notification: { title, body },
      data: { type: 'new_booking', booking_id: bookingId },
    },
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  })
  return resp.ok
}

serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const fcmServiceAccountB64 = Deno.env.get('FCM_SERVICE_ACCOUNT')
    const fcmProjectId = Deno.env.get('FCM_PROJECT_ID')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 })
    }
    if (!fcmServiceAccountB64 || !fcmProjectId) {
      return new Response(JSON.stringify({ error: 'missing FCM_SERVICE_ACCOUNT or FCM_PROJECT_ID' }), { status: 500 })
    }

    // Decode service account
    const saJson = atob(fcmServiceAccountB64)
    const sa = JSON.parse(saJson) as { client_email: string; private_key: string }

    // Fetch host FCM tokens
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/mobile_push_tokens?user_id=eq.${payload.hostId}&is_active=eq.true&select=token`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
    )
    const tokens = await resp.json() as { token: string }[]

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Get OAuth2 access token
    const assertion = await createAssertion(sa.client_email, sa.private_key, 'https://www.googleapis.com/auth/firebase.messaging')
    const accessToken = await getAccessToken(assertion)

    const title = `New Booking: ${payload.propertyName}`
    const body = `${payload.guestName} booked from ${payload.checkIn} to ${payload.checkOut}`

    let sent = 0
    for (const { token } of tokens) {
      if (!token) continue
      const ok = await sendFcmV1(fcmProjectId, accessToken, token, title, body, payload.bookingId)
      if (ok) sent++
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
