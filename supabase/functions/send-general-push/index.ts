declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

// @ts-expect-error Deno URL import is resolved at edge runtime.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error Deno URL import is resolved at edge runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID") ?? "";
const FCM_SERVICE_ACCOUNT_EMAIL = Deno.env.get("FCM_SERVICE_ACCOUNT_EMAIL") ?? "";
const FCM_SERVICE_ACCOUNT_PRIVATE_KEY =
  (Deno.env.get("FCM_SERVICE_ACCOUNT_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");

let fcmAccessTokenCache: { token: string; expiresAtEpochSec: number } | null = null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Audience = "all" | "customers" | "hosts" | "staff" | "custom";

type PushTokenRow = {
  token: string;
  user_id: string;
  platform: string;
};

type FcmSendSummary = {
  transport: "fcm_v1" | "fcm_legacy";
  sent: number;
  failed: number;
  invalidTokens: string[];
};

const ALLOWED_SENDER_ROLES = new Set([
  "admin",
  "staff",
  "financial_staff",
  "operations_staff",
  "customer_support",
]);

const STAFF_ROLES = new Set([
  "admin",
  "staff",
  "financial_staff",
  "operations_staff",
  "customer_support",
]);

const INVALID_FCM_LEGACY_ERRORS = new Set([
  "NotRegistered",
  "InvalidRegistration",
  "MismatchSenderId",
  "InvalidPackageName",
]);

const INVALID_FCM_V1_ERROR_CODES = new Set([
  "UNREGISTERED",
  "INVALID_ARGUMENT",
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hasFcmV1Config(): boolean {
  return Boolean(
    FCM_PROJECT_ID &&
      FCM_SERVICE_ACCOUNT_EMAIL &&
      FCM_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
}

function normalizeAudience(input: unknown): Audience {
  const value = String(input || "all").trim().toLowerCase();
  if (value === "customers") return "customers";
  if (value === "hosts") return "hosts";
  if (value === "staff") return "staff";
  if (value === "custom") return "custom";
  return "all";
}

function sanitizeTitle(input: unknown): string {
  return String(input || "").trim().slice(0, 120);
}

function sanitizeBody(input: unknown): string {
  return String(input || "").trim().slice(0, 500);
}

function sanitizeType(input: unknown): string {
  const value = String(input || "special").trim().toLowerCase();
  const cleaned = value.replace(/[^a-z0-9_:-]/g, "_");
  return cleaned.slice(0, 64) || "special";
}

function normalizeUserIds(input: unknown): string[] {
  const rawList = Array.isArray(input)
    ? input
    : String(input || "")
      .split(/[\s,]+/)
      .filter(Boolean);

  const dedupe = new Set<string>();
  for (const value of rawList) {
    const id = String(value || "").trim();
    if (!UUID_REGEX.test(id)) continue;
    dedupe.add(id);
  }
  return Array.from(dedupe);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toBase64UrlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function toBase64UrlFromJson(value: Record<string, unknown>): string {
  const text = JSON.stringify(value);
  const bytes = new TextEncoder().encode(text);
  return toBase64UrlFromBytes(bytes);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getFcmV1AccessToken(): Promise<string> {
  if (!hasFcmV1Config()) {
    throw new Error("Missing FCM v1 credentials");
  }

  const nowEpochSec = Math.floor(Date.now() / 1000);
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAtEpochSec - 60 > nowEpochSec) {
    return fcmAccessTokenCache.token;
  }

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claims = {
    iss: FCM_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowEpochSec,
    exp: nowEpochSec + 3600,
  };

  const unsignedToken = `${toBase64UrlFromJson(header)}.${toBase64UrlFromJson(claims)}`;
  const signingKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(FCM_SERVICE_ACCOUNT_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    new TextEncoder().encode(unsignedToken),
  );

  const assertion = `${unsignedToken}.${toBase64UrlFromBytes(new Uint8Array(signature))}`;
  const form = new URLSearchParams();
  form.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  form.set("assertion", assertion);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) {
    throw new Error(`FCM v1 auth failed: ${JSON.stringify(tokenPayload)}`);
  }

  const accessToken = String((tokenPayload as { access_token?: unknown }).access_token || "").trim();
  if (!accessToken) {
    throw new Error("FCM v1 auth response did not include access_token");
  }

  const expiresInSec = Number((tokenPayload as { expires_in?: unknown }).expires_in || 3600);
  fcmAccessTokenCache = {
    token: accessToken,
    expiresAtEpochSec: nowEpochSec + Math.max(300, expiresInSec),
  };

  return accessToken;
}

function looksLikeInvalidFcmV1Token(errorPayload: Record<string, unknown>): boolean {
  const wrapper = (errorPayload.error && typeof errorPayload.error === "object")
    ? (errorPayload.error as Record<string, unknown>)
    : null;
  if (!wrapper) return false;

  const details = Array.isArray(wrapper.details)
    ? (wrapper.details as Array<Record<string, unknown>>)
    : [];

  for (const detail of details) {
    const errorCode = String(detail.errorCode || "").trim();
    if (INVALID_FCM_V1_ERROR_CODES.has(errorCode)) {
      return true;
    }
  }

  const status = String(wrapper.status || "").trim();
  if (status === "NOT_FOUND") {
    return true;
  }

  const message = String(wrapper.message || "").toLowerCase();
  return (
    message.includes("requested entity was not found") ||
    message.includes("not a valid fcm registration token")
  );
}

async function sendViaFcmV1(
  tokenList: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<FcmSendSummary> {
  const accessToken = await getFcmV1AccessToken();

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (const token of tokenList) {
    const payload = {
      message: {
        token,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
          payload: {
            aps: {
              sound: "default",
              "content-available": 1,
            },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (response.ok) {
      sent += 1;
      continue;
    }

    failed += 1;
    const errorPayload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (looksLikeInvalidFcmV1Token(errorPayload)) {
      invalidTokens.push(token);
    } else {
      console.error("[send-general-push] FCM v1 send failed", {
        token,
        status: response.status,
        details: errorPayload,
      });
    }
  }

  return {
    transport: "fcm_v1",
    sent,
    failed,
    invalidTokens,
  };
}

async function sendViaFcmLegacy(
  tokenList: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<FcmSendSummary> {
  const fcmPayload = {
    registration_ids: tokenList,
    priority: "high",
    content_available: true,
    mutable_content: true,
    notification: {
      title,
      body,
      sound: "default",
    },
    data,
  };

  const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(fcmPayload),
  });

  const fcmResult = await fcmResponse.json().catch(() => ({}));
  if (!fcmResponse.ok) {
    throw new Error(`FCM legacy send failed: ${JSON.stringify(fcmResult)}`);
  }

  const invalidTokens: string[] = [];
  const results = Array.isArray((fcmResult as { results?: unknown[] }).results)
    ? ((fcmResult as { results: unknown[] }).results as Array<Record<string, unknown>>)
    : [];

  results.forEach((item, index) => {
    const token = tokenList[index];
    const error = String(item?.error || "").trim();
    if (token && INVALID_FCM_LEGACY_ERRORS.has(error)) {
      invalidTokens.push(token);
    }
  });

  return {
    transport: "fcm_legacy",
    sent: Number((fcmResult as { success?: number }).success || 0),
    failed: Number((fcmResult as { failure?: number }).failure || 0),
    invalidTokens,
  };
}

async function resolveAudienceRecipientIds(
  adminClient: ReturnType<typeof createClient>,
  audience: Audience,
  customUserIds: string[],
): Promise<string[]> {
  if (audience === "custom") {
    return customUserIds;
  }

  const allUserIds = new Set<string>();
  const rolesByUser = new Map<string, Set<string>>();

  const { data: roleRows, error: rolesError } = await adminClient
    .from("user_roles")
    .select("user_id, role");

  if (rolesError) {
    throw new Error(`Failed to load roles: ${rolesError.message}`);
  }

  for (const row of roleRows || []) {
    const userId = String((row as { user_id?: string }).user_id || "").trim();
    const role = String((row as { role?: string }).role || "").trim().toLowerCase();
    if (!UUID_REGEX.test(userId) || !role) continue;

    allUserIds.add(userId);
    const roleSet = rolesByUser.get(userId) ?? new Set<string>();
    roleSet.add(role);
    rolesByUser.set(userId, roleSet);
  }

  let profileRows: Array<Record<string, unknown>> = [];
  const profileWithUserId = await adminClient.from("profiles").select("id, user_id");
  if (profileWithUserId.error) {
    const profileIdOnly = await adminClient.from("profiles").select("id");
    if (profileIdOnly.error) {
      throw new Error(`Failed to load profiles: ${profileIdOnly.error.message}`);
    }
    profileRows = (profileIdOnly.data as Array<Record<string, unknown>> | null) ?? [];
  } else {
    profileRows = (profileWithUserId.data as Array<Record<string, unknown>> | null) ?? [];
  }

  for (const row of profileRows) {
    const userId = String(row.user_id || row.id || "").trim();
    if (UUID_REGEX.test(userId)) {
      allUserIds.add(userId);
    }
  }

  const { data: tokenUserRows } = await adminClient
    .from("mobile_push_tokens")
    .select("user_id")
    .eq("is_active", true);

  for (const row of tokenUserRows || []) {
    const userId = String((row as { user_id?: string }).user_id || "").trim();
    if (UUID_REGEX.test(userId)) {
      allUserIds.add(userId);
    }
  }

  if (audience === "all") {
    return Array.from(allUserIds);
  }

  const recipients = new Set<string>();
  for (const userId of allUserIds) {
    const roleSet = rolesByUser.get(userId) ?? new Set<string>();
    const isStaff = Array.from(roleSet).some((role) => STAFF_ROLES.has(role));
    const isHost = roleSet.has("host");

    if (audience === "staff") {
      if (isStaff) recipients.add(userId);
      continue;
    }

    if (audience === "hosts") {
      if (isHost) recipients.add(userId);
      continue;
    }

    if (audience === "customers") {
      if (!isHost && !isStaff) recipients.add(userId);
    }
  }

  return Array.from(recipients);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, {
      error: "Missing Supabase function environment",
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing bearer token" });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json().catch(() => ({}));
    const title = sanitizeTitle((payload as { title?: unknown }).title);
    const body = sanitizeBody((payload as { body?: unknown }).body);
    const audience = normalizeAudience((payload as { audience?: unknown }).audience);
    const notificationType = sanitizeType((payload as { notificationType?: unknown }).notificationType);
    const deepLink = String((payload as { deepLink?: unknown }).deepLink || "").trim().slice(0, 250);
    const includeSelf = (payload as { includeSelf?: unknown }).includeSelf === true;
    const sendPush = (payload as { sendPush?: unknown }).sendPush !== false;
    const sendInApp = (payload as { sendInApp?: unknown }).sendInApp !== false;
    const customUserIds = normalizeUserIds((payload as { userIds?: unknown }).userIds);

    // When the project issues ES256 JWTs the gateway rejects them with
    // UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM before the function runs.
    // The Flutter client works around this by sending the anon key as the
    // Bearer token (HS256, always accepted) and forwarding the user JWT in
    // the body as `userToken`. Use that when present.
    const bodyUserToken = String((payload as { userToken?: unknown }).userToken || "").trim();
    const effectiveAuthHeader = bodyUserToken
      ? `Bearer ${bodyUserToken}`
      : authHeader;

    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: effectiveAuthHeader,
        },
      },
    });

    if (title.length < 3) {
      return json(400, { error: "title must be at least 3 characters" });
    }

    if (body.length < 3) {
      return json(400, { error: "body must be at least 3 characters" });
    }

    if (!sendPush && !sendInApp) {
      return json(400, { error: "Enable at least one delivery channel" });
    }

    if (audience === "custom" && customUserIds.length === 0) {
      return json(400, { error: "userIds are required for custom audience" });
    }

    const { data: authData, error: authError } = await authedClient.auth.getUser();
    if (authError || !authData?.user?.id) {
      return json(401, { error: "Unauthorized" });
    }

    const requesterId = authData.user.id;

    const { data: requesterRoles, error: requesterRoleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId);

    if (requesterRoleError) {
      return json(500, { error: "Failed to verify sender role" });
    }

    const roleRows = (requesterRoles as Array<{ role?: string }> | null) ?? [];
    const senderRoles = roleRows
      .map((row: { role?: string }) => String(row.role || "").toLowerCase())
      .filter(Boolean);

    const canSend = senderRoles.some((role: string) => ALLOWED_SENDER_ROLES.has(role));
    if (!canSend) {
      return json(403, { error: "Only admin/staff can send special notifications" });
    }

    const recipientIds = await resolveAudienceRecipientIds(adminClient, audience, customUserIds);
    const recipientSet = new Set(recipientIds);
    if (!includeSelf) {
      recipientSet.delete(requesterId);
    }

    const finalRecipients = Array.from(recipientSet);
    if (finalRecipients.length === 0) {
      return json(200, {
        ok: true,
        skipped: true,
        reason: "no_recipients",
      });
    }

    const customData = isRecord((payload as { data?: unknown }).data)
      ? ((payload as { data?: Record<string, unknown> }).data as Record<string, unknown>)
      : {};

    const notificationData: Record<string, unknown> = {
      ...customData,
      source: "admin_notification_generator",
      sent_by: requesterId,
      audience,
      deep_link: deepLink || null,
    };

    let inAppInserted = 0;
    if (sendInApp) {
      const recipientChunks = chunk(finalRecipients, 300);
      for (const recipientChunk of recipientChunks) {
        const rows = recipientChunk.map((recipientId) => ({
          user_id: recipientId,
          title,
          body,
          notification_type: notificationType,
          channel: "in_app",
          data: notificationData,
        }));

        const { error: insertError } = await adminClient.from("notifications").insert(rows);
        if (insertError) {
          throw new Error(`Failed to insert notifications: ${insertError.message}`);
        }

        inAppInserted += rows.length;
      }
    }

    let attemptedTokens = 0;
    let sent = 0;
    let failed = 0;
    let invalidated = 0;
    let transport: "fcm_v1" | "fcm_legacy" | null = null;
    let pushSkippedReason: string | null = null;

    if (sendPush) {
      const { data: tokenRows, error: tokenError } = await adminClient
        .from("mobile_push_tokens")
        .select("token, user_id, platform")
        .in("user_id", finalRecipients)
        .eq("is_active", true);

      if (tokenError) {
        throw new Error(`Failed to lookup push tokens: ${tokenError.message}`);
      }

      const tokenList = Array.from(
        new Set(
          (tokenRows as PushTokenRow[] | null | undefined)
            ?.map((row) => String(row.token || "").trim())
            .filter((token) => token.length > 0),
        ),
      );

      attemptedTokens = tokenList.length;

      if (tokenList.length === 0) {
        pushSkippedReason = "no_tokens";
      } else {
        const pushData: Record<string, string> = {
          type: notificationType,
          source: "admin_notification_generator",
          audience,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        };

        if (deepLink) {
          pushData.deepLink = deepLink;
        }

        for (const [key, value] of Object.entries(customData)) {
          if (value === null || value === undefined) continue;
          if (typeof value === "object") continue;
          pushData[key] = String(value);
        }

        let sendSummary: FcmSendSummary | null = null;
        if (hasFcmV1Config()) {
          sendSummary = await sendViaFcmV1(tokenList, title, body, pushData);
        } else if (FCM_SERVER_KEY) {
          sendSummary = await sendViaFcmLegacy(tokenList, title, body, pushData);
        } else {
          pushSkippedReason = "fcm_config_missing";
        }

        if (sendSummary) {
          transport = sendSummary.transport;
          sent = sendSummary.sent;
          failed = sendSummary.failed;
          invalidated = sendSummary.invalidTokens.length;

          if (sendSummary.invalidTokens.length > 0) {
            await adminClient
              .from("mobile_push_tokens")
              .update({
                is_active: false,
                last_seen_at: new Date().toISOString(),
              })
              .in("token", sendSummary.invalidTokens);
          }
        }
      }
    }

    return json(200, {
      ok: true,
      audience,
      recipientCount: finalRecipients.length,
      inAppInserted,
      push: {
        attemptedTokens,
        sent,
        failed,
        invalidated,
        transport,
        skippedReason: pushSkippedReason,
      },
    });
  } catch (error) {
    console.error("[send-general-push] unexpected error", error);
    return json(500, { error: String(error) });
  }
});
