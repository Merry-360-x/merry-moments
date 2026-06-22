export interface FcmNotification {
  title: string
  body: string
}

export interface FcmDataPayload {
  type: string
  screen_route: string
  notification_id: string
  [key: string]: string
}

export interface FcmMessage {
  message: {
    token: string
    notification: FcmNotification
    data: Record<string, string>
    android?: { priority: 'high' | 'normal' }
    apns?: { payload: { aps: { sound: string; badge: number } } }
  }
}

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

function b64url(input: string): string {
  return btoa(input)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
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

async function createAssertion(
  clientEmail: string,
  privateKey: string,
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: clientEmail,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const encoder = new TextEncoder()
  const enc = (obj: unknown) => b64url(
    encoder.encode(JSON.stringify(obj)).reduce(
      (s, b) => s + String.fromCharCode(b), '',
    ),
  )
  const signatureInput = `${enc(header)}.${enc(claim)}`
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
  const sigB64 = b64url(
    String.fromCharCode(...new Uint8Array(sig)),
  )
  return `${signatureInput}.${sigB64}`
}

async function getAccessToken(
  clientEmail: string,
  privateKey: string,
): Promise<string> {
  const assertion = await createAssertion(clientEmail, privateKey)
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
    throw new Error(`OAuth2 failed: ${resp.status} ${text}`)
  }
  const data = await resp.json()
  return data.access_token as string
}

export async function getFcmAccessToken(): Promise<string> {
  const b64 = Deno.env.get('FCM_SERVICE_ACCOUNT')
  const projectId = Deno.env.get('FCM_PROJECT_ID')
  if (!b64 || !projectId) throw new Error('Missing FCM_SERVICE_ACCOUNT or FCM_PROJECT_ID')
  const sa = JSON.parse(atob(b64)) as { client_email: string; private_key: string }
  return await getAccessToken(sa.client_email, sa.private_key)
}

export async function sendPush(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
  projectId?: string,
  accessToken?: string,
): Promise<boolean> {
  const pid = projectId ?? Deno.env.get('FCM_PROJECT_ID')
  const token = accessToken ?? await getFcmAccessToken()
  if (!pid) throw new Error('Missing FCM_PROJECT_ID')

  const message: FcmMessage = {
    message: {
      token: deviceToken,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    },
  }

  const url = `https://fcm.googleapis.com/v1/projects/${pid}/messages:send`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(message),
  })

  if (!resp.ok) {
    const text = await resp.text()
    console.error(`[FCM] send failed for ${pid}: ${resp.status} ${text}`)
  }
  return resp.ok
}
