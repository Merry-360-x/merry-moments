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

type MessageRow = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: "customer" | "staff";
  sender_name: string | null;
  message: string;
  created_at: string;
};

type TicketRow = {
  id: string;
  user_id: string;
  subject: string;
};

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

function hasFcmV1Config(): boolean {
  return Boolean(
    FCM_PROJECT_ID &&
      FCM_SERVICE_ACCOUNT_EMAIL &&
      FCM_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
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
      console.error("[send-support-push] FCM v1 send failed", {
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

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampBodyText(input: string): string {
  const safe = String(input || "").trim();
  if (safe.length <= 140) return safe;
  return `${safe.slice(0, 137)}...`;
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

  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();
    const messageId = String(payload?.messageId || "").trim();
    if (!messageId) {
      return json(400, { error: "messageId is required" });
    }

    const { data: authData, error: authError } = await authedClient.auth.getUser();
    if (authError || !authData?.user?.id) {
      return json(401, { error: "Unauthorized" });
    }
    const requesterId = authData.user.id;

    const { data: message, error: messageError } = await adminClient
      .from("support_ticket_messages")
      .select("id, ticket_id, sender_id, sender_type, sender_name, message, created_at")
      .eq("id", messageId)
      .maybeSingle();

    const typedMessage = (message || null) as MessageRow | null;

    if (messageError || !typedMessage) {
      return json(404, { error: "Support message not found" });
    }

    if (!typedMessage.sender_id || typedMessage.sender_id !== requesterId) {
      return json(403, { error: "Cannot send push for this message" });
    }

    const { data: ticket, error: ticketError } = await adminClient
      .from("support_tickets")
      .select("id, user_id, subject")
      .eq("id", typedMessage.ticket_id)
      .maybeSingle();

    const typedTicket = (ticket || null) as TicketRow | null;

    if (ticketError || !typedTicket) {
      return json(404, { error: "Support ticket not found" });
    }

    const recipientIds = new Set<string>();

    if (typedMessage.sender_type === "customer") {
      const { data: staffRoles, error: staffError } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["customer_support", "admin", "staff"]);

      if (staffError) {
        console.error("[send-support-push] staff role lookup failed", staffError);
      } else {
        for (const row of staffRoles || []) {
          const userId = String((row as { user_id?: string }).user_id || "").trim();
          if (userId && userId !== requesterId) {
            recipientIds.add(userId);
          }
        }
      }
    } else {
      const customerId = String(typedTicket.user_id || "").trim();
      if (customerId && customerId !== requesterId) {
        recipientIds.add(customerId);
      }
    }

    if (recipientIds.size === 0) {
      return json(200, { ok: true, skipped: true, reason: "no_recipients" });
    }

    const { data: tokenRows, error: tokenError } = await adminClient
      .from("mobile_push_tokens")
      .select("token, user_id, platform")
      .in("user_id", Array.from(recipientIds))
      .eq("is_active", true);

    if (tokenError) {
      console.error("[send-support-push] token lookup failed", tokenError);
      return json(500, { error: "Failed to lookup push tokens" });
    }

    const tokenList = Array.from(
      new Set(
        (tokenRows as PushTokenRow[] | null | undefined)
          ?.map((row) => String(row.token || "").trim())
          .filter((token) => token.length > 0),
      ),
    );

    if (tokenList.length === 0) {
      return json(200, { ok: true, skipped: true, reason: "no_tokens" });
    }

    const senderFallback = typedMessage.sender_type === "staff" ? "Support" : "Customer";
    const senderName = String(typedMessage.sender_name || senderFallback).trim();
    const title = typedMessage.sender_type === "staff"
      ? `${senderName || "Support"} replied`
      : `${senderName || "Customer"} sent a support message`;
    const body = clampBodyText(typedMessage.message || "New support message");

    const dataPayload = {
      type: "support_message",
      ticketId: String(typedTicket.id),
      ticketSubject: String(typedTicket.subject || "Support"),
      messageId: String(typedMessage.id),
      senderType: String(typedMessage.sender_type),
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    };

    let sendSummary: FcmSendSummary;
    if (hasFcmV1Config()) {
      sendSummary = await sendViaFcmV1(tokenList, title, body, dataPayload);
    } else if (FCM_SERVER_KEY) {
      sendSummary = await sendViaFcmLegacy(tokenList, title, body, dataPayload);
    } else {
      console.warn("[send-support-push] No FCM config found; set v1 or legacy env vars");
      return json(200, { ok: true, skipped: true, reason: "fcm_config_missing" });
    }

    if (sendSummary.invalidTokens.length > 0) {
      const nowIso = new Date().toISOString();
      await adminClient
        .from("mobile_push_tokens")
        .update({
          is_active: false,
          last_seen_at: nowIso,
        })
        .in("token", sendSummary.invalidTokens);
    }

    return json(200, {
      ok: true,
      transport: sendSummary.transport,
      sent: sendSummary.sent,
      failed: sendSummary.failed,
      invalidated: sendSummary.invalidTokens.length,
    });
  } catch (error) {
    console.error("[send-support-push] unexpected error", error);
    return json(500, { error: String(error) });
  }
});
