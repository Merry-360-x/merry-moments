import { supabase } from "@/integrations/supabase/client";

export type WebRoleCategory = "visitor" | "guest" | "host";
export type WebEventName = "page_view" | "heartbeat" | "client_error";

const SESSION_ID_KEY = "merry360:web_session_id";
const CONTEXT_KEY = "merry360:web_analytics_context";

type AnalyticsContext = {
  userId?: string | null;
  roleCategory?: WebRoleCategory;
};

const safeParseJson = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const safeLocalStorageGet = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures so analytics never disrupts UX.
  }
};

const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  const existing = safeLocalStorageGet(SESSION_ID_KEY);
  if (existing) return existing;

  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  safeLocalStorageSet(SESSION_ID_KEY, newId);
  return newId;
};

export const setWebAnalyticsContext = (ctx: AnalyticsContext) => {
  if (typeof window === "undefined") return;
  const next: AnalyticsContext = {
    userId: ctx.userId ?? null,
    roleCategory: ctx.roleCategory ?? "visitor",
  };
  safeLocalStorageSet(CONTEXT_KEY, JSON.stringify(next));
};

const getWebAnalyticsContext = (): AnalyticsContext => {
  if (typeof window === "undefined") return {};
  return safeParseJson<AnalyticsContext>(safeLocalStorageGet(CONTEXT_KEY)) ?? {};
};

let lastErrorAt = 0;
let heartbeatTimer: number | null = null;

const shouldIgnoreClientError = (error: Error, source: string) => {
  const message = (error.message || "").toLowerCase();
  const name = (error.name || "").toLowerCase();
  const sourceLower = (source || "").toLowerCase();

  if (
    name === "aborterror" ||
    message.includes("aborterror") ||
    message.includes("aborted") ||
    message.includes("signal is aborted")
  ) {
    return true;
  }

  if (
    sourceLower.includes("chunk_load") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("loading chunk") ||
    message.includes("loading css chunk")
  ) {
    return true;
  }

  if (
    name === "securityerror" ||
    message.includes("the operation is insecure") ||
    message.includes("access is denied") ||
    message.includes("storage")
  ) {
    return true;
  }

  return false;
};

const canSend = () => {
  if (typeof window === "undefined") return false;
  if (!navigator.onLine) return false;
  return true;
};

export const trackWebEvent = async (
  eventName: WebEventName,
  payload: {
    path?: string | null;
    referrer?: string | null;
    error_message?: string | null;
    error_stack?: string | null;
    error_source?: string | null;
  } = {},
) => {
  if (!canSend()) return;

  const sessionId = getSessionId();
  if (!sessionId) return;

  const ctx = getWebAnalyticsContext();

  const row = {
    session_id: sessionId,
    user_id: ctx.userId ?? null,
    role_category: (ctx.roleCategory ?? "visitor") as WebRoleCategory,
    event_name: eventName,
    path: payload.path ?? null,
    referrer: payload.referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    error_message: payload.error_message ?? null,
    error_stack: payload.error_stack ?? null,
    error_source: payload.error_source ?? null,
  };

  try {
    const insertPromise = (supabase as any).from("web_events").insert(row);
    const insertTimeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
    await Promise.race([insertPromise, insertTimeout]);
  } catch {
    // swallow: analytics must never break app UX
  }
};

export const trackPageView = async (path: string) => {
  await trackWebEvent("page_view", { path });
};

export const trackClientError = async (error: unknown, source: string) => {
  const now = Date.now();
  // Throttle to avoid noisy loops (e.g., repeated chunk failures)
  if (now - lastErrorAt < 2000) return;
  lastErrorAt = now;

  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : String(error ?? "Unknown error"));

  if (shouldIgnoreClientError(err, source)) return;

  await trackWebEvent("client_error", {
    error_message: err.message?.slice(0, 500) ?? "Unknown error",
    error_stack: (err.stack ?? "").slice(0, 2000) || null,
    error_source: source?.slice(0, 120) || null,
    path: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
  });
};

export const startWebAnalyticsHeartbeat = (intervalMs: number = 60_000) => {
  if (typeof window === "undefined") return;
  if (heartbeatTimer) return;

  const tick = () => {
    if (document.visibilityState !== "visible") return;
    void trackWebEvent("heartbeat");
  };

  // Send an initial heartbeat soon after startup
  window.setTimeout(tick, 1500);
  heartbeatTimer = window.setInterval(tick, intervalMs);

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void trackWebEvent("heartbeat");
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
};
