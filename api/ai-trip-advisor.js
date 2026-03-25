import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-nano";
const OPENAI_MAX_OUTPUT_TOKENS = Math.max(40, Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 140));
const AI_RATE_WINDOW_MS = Math.max(60_000, Number(process.env.AI_RATE_WINDOW_MS || 5 * 60_000));
const AI_RATE_MAX_REQUESTS = Math.max(3, Number(process.env.AI_RATE_MAX_REQUESTS || 10));
const AI_CACHE_TTL_MS = Math.max(60_000, Number(process.env.AI_CACHE_TTL_MS || 10 * 60_000));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;
const rateBuckets = new Map();
const responseCache = new Map();

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is", "it",
  "me", "my", "of", "on", "or", "our", "that", "the", "this", "to", "we", "what", "when", "where",
  "which", "who", "why", "with", "you", "your", "can", "could", "would", "should", "please", "do",
  "does", "did", "want", "need", "looking", "like", "just", "also", "really", "very", "some", "any",
]);

const FAQ_RULES = [
  {
    keywords: ["best time", "visit", "rwanda"],
    reply: "Best time for Rwanda is June to September for dry weather and easier road trips. March to May is greener and cheaper, but wetter. If you want gorilla trekking first, start with Volcanoes National Park.",
  },
  {
    keywords: ["gorilla", "trek"],
    reply: "For gorilla trekking, base yourself near Volcanoes National Park and book permits early. Plan 2 to 3 nights, add Kigali for arrival, and keep the schedule light the day before the trek.",
  },
  {
    keywords: ["kigali", "stay"],
    reply: "For Kigali, choose a central stay near Kimihurura, Kiyovu, or Nyarutarama if you want easier dining and transfers. If your trip is short, 2 nights in Kigali is usually enough before moving to safari or lake destinations.",
  },
  {
    keywords: ["airport", "transfer"],
    reply: "Airport transfer is best booked in advance, especially for late arrivals. If you land at Kigali International Airport, choose a stay within Kigali for the first night unless your driver is already confirmed for a longer transfer.",
  },
  {
    keywords: ["budget", "trip"],
    reply: "For a lower-budget trip, keep the route simple: Kigali plus one main destination, travel in the dry season shoulder months, and avoid changing hotels too often. That usually saves the most money.",
  },
  {
    keywords: ["visa"],
    reply: "Visa rules depend on passport and destination, so check the official government guidance before booking. If you tell me your nationality and destination, I can suggest the most practical trip plan around that.",
  },
];

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQueryTerms(value) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(" ")
        .filter((x) => x && x.length > 2 && !STOP_WORDS.has(x))
    )
  );
}

function getLatestUserText(messages) {
  const lastUserMessage = Array.isArray(messages)
    ? [...messages].reverse().find((m) => m && m.role === "user")
    : null;
  return String(lastUserMessage?.content || "");
}

function compactText(value, max = 180) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function getCacheKey(userText) {
  return normalizeText(userText).slice(0, 220);
}

function cleanupMap(map, isExpired) {
  for (const [key, value] of map.entries()) {
    if (isExpired(value)) {
      map.delete(key);
    }
  }
}

function getCachedReplyInMemory(userText) {
  const key = getCacheKey(userText);
  if (!key) return null;
  cleanupMap(responseCache, (entry) => !entry || entry.expiresAt <= Date.now());
  const cached = responseCache.get(key);
  return cached && cached.expiresAt > Date.now() ? cached.reply : null;
}

function setCachedReplyInMemory(userText, reply) {
  const key = getCacheKey(userText);
  if (!key || !reply) return;
  responseCache.set(key, {
    reply,
    expiresAt: Date.now() + AI_CACHE_TTL_MS,
  });
}

function findFaqReply(userText) {
  const normalized = normalizeText(userText);
  if (!normalized) return null;

  for (const rule of FAQ_RULES) {
    if (rule.keywords.every((keyword) => normalized.includes(keyword))) {
      return rule.reply;
    }
  }

  return null;
}

function getClientIdentity(req, body) {
  const userId = compactText(body?.userId, 80);
  const sessionId = compactText(body?.sessionId, 80);
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
  const ip = forwarded || req.socket?.remoteAddress || "anonymous";
  return userId || sessionId || ip;
}

function checkRateLimitInMemory(identity) {
  cleanupMap(rateBuckets, (entry) => !entry || entry.resetAt <= Date.now());

  const now = Date.now();
  const bucket = rateBuckets.get(identity);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(identity, { count: 1, resetAt: now + AI_RATE_WINDOW_MS });
    return { allowed: true, remaining: AI_RATE_MAX_REQUESTS - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= AI_RATE_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count += 1;
  rateBuckets.set(identity, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, AI_RATE_MAX_REQUESTS - bucket.count),
    retryAfterMs: 0,
  };
}

async function checkRateLimit(identity) {
  if (supabaseAdmin && identity) {
    const { data, error } = await supabaseAdmin.rpc("ai_consume_rate_limit", {
      p_identity_key: identity,
      p_max_requests: AI_RATE_MAX_REQUESTS,
      p_window_seconds: Math.max(60, Math.ceil(AI_RATE_WINDOW_MS / 1000)),
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row) {
      return {
        allowed: row.allowed === true,
        remaining: Number(row.remaining || 0),
        retryAfterMs: Math.max(0, Number(row.retry_after_seconds || 0) * 1000),
      };
    }
  }

  return checkRateLimitInMemory(identity);
}

async function getCachedReply(userText) {
  const key = getCacheKey(userText);
  if (!key) return null;

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.rpc("ai_cache_get", {
      p_cache_key: key,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row?.reply) {
      setCachedReplyInMemory(userText, row.reply);
      return row.reply;
    }
  }

  return getCachedReplyInMemory(userText);
}

async function persistCachedReply(userText, reply) {
  const key = getCacheKey(userText);
  if (!key || !reply) return;

  if (supabaseAdmin) {
    await supabaseAdmin.rpc("ai_cache_set", {
      p_cache_key: key,
      p_reply: reply,
      p_source_model: OPENAI_MODEL,
      p_ttl_seconds: Math.max(60, Math.ceil(AI_CACHE_TTL_MS / 1000)),
    });
  }

  setCachedReplyInMemory(userText, reply);
}

function resolveChannel(body) {
  const value = compactText(body?.channel, 20).toLowerCase();
  return value === "mobile" ? "mobile" : value === "server" ? "server" : "web";
}

function resolveSessionId(body, identity) {
  return compactText(body?.sessionId, 120) || compactText(identity, 120) || `anon_${Date.now()}`;
}

function estimateOpenAiCostUsd(inputTokens = 0, outputTokens = 0) {
  const inputCost = (Number(inputTokens || 0) / 1_000_000) * 0.20;
  const outputCost = (Number(outputTokens || 0) / 1_000_000) * 1.25;
  return Number((inputCost + outputCost).toFixed(6));
}

async function touchConversation({ sessionId, userId, channel, source, model }) {
  if (!supabaseAdmin || !sessionId) return null;

  const nowIso = new Date().toISOString();
  const { data: existing } = await supabaseAdmin
    .from("ai_conversations")
    .select("id, total_requests, total_openai_requests, total_cache_hits, total_faq_hits, total_rate_limited, total_errors")
    .eq("session_id", sessionId)
    .eq("channel", channel)
    .maybeSingle();

  const patch = {
    user_id: userId || null,
    last_source: source,
    last_model: model || null,
    last_interaction_at: nowIso,
    updated_at: nowIso,
  };

  if (existing?.id) {
    await supabaseAdmin.from("ai_conversations").update({
      ...patch,
      total_requests: Number(existing.total_requests || 0) + 1,
      total_openai_requests: Number(existing.total_openai_requests || 0) + (source === "openai" ? 1 : 0),
      total_cache_hits: Number(existing.total_cache_hits || 0) + (source === "cache" ? 1 : 0),
      total_faq_hits: Number(existing.total_faq_hits || 0) + (source === "faq" ? 1 : 0),
      total_rate_limited: Number(existing.total_rate_limited || 0) + (source === "rate_limit" ? 1 : 0),
      total_errors: Number(existing.total_errors || 0) + (source === "error" ? 1 : 0),
    }).eq("id", existing.id);
    return existing.id;
  }

  const { data: inserted } = await supabaseAdmin
    .from("ai_conversations")
    .insert({
      session_id: sessionId,
      channel,
      created_at: nowIso,
      total_requests: 1,
      total_openai_requests: source === "openai" ? 1 : 0,
      total_cache_hits: source === "cache" ? 1 : 0,
      total_faq_hits: source === "faq" ? 1 : 0,
      total_rate_limited: source === "rate_limit" ? 1 : 0,
      total_errors: source === "error" ? 1 : 0,
      ...patch,
    })
    .select("id")
    .single();

  return inserted?.id || null;
}

async function recordAiUsage({
  sessionId,
  userId,
  channel,
  source,
  status = "ok",
  model = null,
  inputTokens = 0,
  outputTokens = 0,
  latencyMs = null,
  userMessage = "",
  normalizedKey = null,
  recommendationsCount = 0,
}) {
  if (!supabaseAdmin || !sessionId) return;

  const conversationId = await touchConversation({ sessionId, userId, channel, source, model });
  const safeInputTokens = Number(inputTokens || 0);
  const safeOutputTokens = Number(outputTokens || 0);

  await supabaseAdmin.from("ai_usage_events").insert({
    conversation_id: conversationId,
    session_id: sessionId,
    user_id: userId || null,
    channel,
    source,
    status,
    model,
    input_tokens: safeInputTokens,
    output_tokens: safeOutputTokens,
    total_tokens: safeInputTokens + safeOutputTokens,
    estimated_cost_usd: estimateOpenAiCostUsd(safeInputTokens, safeOutputTokens),
    latency_ms: latencyMs,
    user_message: compactText(userMessage, 500),
    normalized_key: normalizedKey,
    recommendations_count: Number(recommendationsCount || 0),
  });
}

function normalizeFeedbackType(feedbackType, rating) {
  const rawType = compactText(feedbackType, 10).toLowerCase();
  if (rawType === "up" || rawType === "down") return rawType;

  const safeRating = Number(rating || 0);
  if (Number.isFinite(safeRating) && safeRating > 0) {
    return safeRating >= 4 ? "up" : "down";
  }

  return "";
}

async function submitConversationRating({ sessionId, userId, channel, rating, feedbackType, comment }) {
  if (!supabaseAdmin || !sessionId) {
    throw new Error("Missing AI session");
  }

  const safeFeedbackType = normalizeFeedbackType(feedbackType, rating);
  if (!safeFeedbackType) {
    throw new Error("Feedback must be up or down");
  }

  const nowIso = new Date().toISOString();
  const { data: existing } = await supabaseAdmin
    .from("ai_conversations")
    .select("id")
    .eq("session_id", sessionId)
    .eq("channel", channel)
    .maybeSingle();

  if (existing?.id) {
    await supabaseAdmin.from("ai_conversations").update({
      user_id: userId || null,
      feedback_type: safeFeedbackType,
      rating_comment: compactText(comment, 500) || null,
      rated_at: nowIso,
      last_interaction_at: nowIso,
      updated_at: nowIso,
    }).eq("id", existing.id);
    return;
  }

  await supabaseAdmin.from("ai_conversations").insert({
    session_id: sessionId,
    user_id: userId || null,
    channel,
    feedback_type: safeFeedbackType,
    rating_comment: compactText(comment, 500) || null,
    rated_at: nowIso,
    last_interaction_at: nowIso,
    updated_at: nowIso,
  });
}

function formatRecommendationContext(recommendations) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return "";
  return recommendations
    .slice(0, 2)
    .map((item, index) => {
      const bits = [
        `${index + 1}. ${item.title}`,
        item.location,
        item.price > 0 ? `${item.currency || "RWF"} ${Math.round(item.price)}` : "",
        item.property_type,
      ].filter(Boolean);
      return bits.join(" | ");
    })
    .join("\n");
}

function buildNoOpenAiFallback(recommendations = []) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return "AI trip advisor is temporarily unavailable right now. Try asking about destination, timing, or budget and browse the matching stays, tours, or transport options below.";
  }

  const topMatches = recommendations
    .slice(0, 3)
    .map((item) => item.title)
    .filter(Boolean);

  if (topMatches.length === 0) {
    return "AI trip advisor is temporarily unavailable right now, but I found some matching listings below that may fit your trip.";
  }

  return `AI trip advisor is temporarily unavailable right now, but I found ${topMatches.join(", ")} in the results below.`;
}

function scoreProperty(property, terms) {
  const haystack = normalizeText(`${property.title || ""} ${property.location || ""} ${property.property_type || ""}`);
  let score = 0;
  for (const t of terms) {
    if (haystack.includes(t)) score += 2;
  }
  score += Number(property.rating || 0) * 0.2;
  score += Math.min(Number(property.review_count || 0), 40) * 0.02;
  return score;
}

async function fetchRecommendations(userText) {
  if (!supabaseAdmin) return [];
  const terms = extractQueryTerms(userText);
  if (terms.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("id, title, location, currency, price_per_night, rating, review_count, property_type, is_published")
    .eq("is_published", true)
    .limit(80);

  if (error || !Array.isArray(data)) return [];

  return data
    .map((p) => ({ ...p, _score: scoreProperty(p, terms) }))
    .filter((p) => p._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map((p) => ({
      id: String(p.id),
      title: String(p.title || "Untitled"),
      location: p.location ? String(p.location) : undefined,
      currency: p.currency ? String(p.currency) : "USD",
      price: Number(p.price_per_night || 0),
      rating: Number(p.rating || 0),
      review_count: Number(p.review_count || 0),
      property_type: p.property_type ? String(p.property_type) : undefined,
    }));
}

async function generateReply(messages, recommendations = []) {
  if (!openai) {
    return {
      reply: buildNoOpenAiFallback(recommendations),
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && typeof m === "object")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 180),
        }))
        .slice(-4)
    : [];

  const conversation = safeMessages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n");
  const recommendationContext = formatRecommendationContext(recommendations);

  const out = await openai.responses.create({
    model: OPENAI_MODEL,
    store: false,
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are Merry360X Trip Advisor for East Africa travel. Keep replies under 3 short sentences or 3 short bullets. Lead with the best option first. Focus on concrete destinations, routing, timing, and booking advice. Ask one clarifying question only if the request is missing a critical detail. Avoid filler, apologies, and long explanations. When possible, sound commerce-ready: specific, confident, and brief.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `${conversation || "User: Help me find a trip in East Africa."}${recommendationContext ? `\n\nRelevant listings:\n${recommendationContext}` : ""}`,
          },
        ],
      },
    ],
  });

  const text = typeof out.output_text === "string" ? out.output_text.trim() : "";
  return {
    reply: text || "I can help with East Africa travel plans. What destination are you considering?",
    usage: {
      inputTokens: Number(out?.usage?.input_tokens || 0),
      outputTokens: Number(out?.usage?.output_tokens || 0),
      totalTokens: Number(out?.usage?.total_tokens || 0),
    },
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const identity = getClientIdentity(req, body);
    const sessionId = resolveSessionId(body, identity);
    const userId = compactText(body?.userId, 120) || null;
    const channel = resolveChannel(body);
    const action = compactText(body?.action, 40).toLowerCase();

    if (action === "rate_conversation") {
      await submitConversationRating({
        sessionId,
        userId,
        channel,
        rating: body?.rating,
        feedbackType: body?.feedbackType,
        comment: body?.comment,
      });
      return sendJson(res, 200, { ok: true, sessionId, channel });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userText = getLatestUserText(messages);
    const normalizedKey = getCacheKey(userText) || null;
    const limit = await checkRateLimit(identity);

    if (!limit.allowed) {
      await recordAiUsage({
        sessionId,
        userId,
        channel,
        source: "rate_limit",
        status: "limited",
        userMessage: userText,
        normalizedKey,
      });
      return sendJson(res, 429, {
        error: "Rate limit exceeded",
        reply: "Too many AI requests right now. Please wait a minute and try again.",
        recommendations: [],
        retryAfterMs: limit.retryAfterMs,
        source: "rate_limit",
        sessionId,
      });
    }

    const recommendations = await fetchRecommendations(userText);
    const faqReply = findFaqReply(userText);
    if (faqReply) {
      await recordAiUsage({
        sessionId,
        userId,
        channel,
        source: "faq",
        userMessage: userText,
        normalizedKey,
        recommendationsCount: recommendations.length,
      });
      return sendJson(res, 200, { reply: faqReply, recommendations, cached: true, source: "faq", sessionId });
    }

    const cachedReply = await getCachedReply(userText);
    if (cachedReply) {
      await recordAiUsage({
        sessionId,
        userId,
        channel,
        source: "cache",
        userMessage: userText,
        normalizedKey,
        recommendationsCount: recommendations.length,
      });
      return sendJson(res, 200, { reply: cachedReply, recommendations, cached: true, source: "cache", sessionId });
    }

    const startedAt = Date.now();
    const openAiResult = await generateReply(messages, recommendations);
    const latencyMs = Date.now() - startedAt;
    await persistCachedReply(userText, openAiResult.reply);
    await recordAiUsage({
      sessionId,
      userId,
      channel,
      source: "openai",
      model: OPENAI_MODEL,
      inputTokens: openAiResult.usage.inputTokens,
      outputTokens: openAiResult.usage.outputTokens,
      latencyMs,
      userMessage: userText,
      normalizedKey,
      recommendationsCount: recommendations.length,
    });

    return sendJson(res, 200, {
      reply: openAiResult.reply,
      recommendations,
      source: "openai",
      sessionId,
    });
  } catch (error) {
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const identity = getClientIdentity(req, body);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userText = getLatestUserText(messages);
    await recordAiUsage({
      sessionId: resolveSessionId(body, identity),
      userId: compactText(body?.userId, 120) || null,
      channel: resolveChannel(body),
      source: "error",
      status: "failed",
      userMessage: userText,
      normalizedKey: getCacheKey(userText) || null,
    });
    return sendJson(res, 500, {
      error: "AI request failed",
      reply: "I am having trouble right now. Please try again in a moment.",
      recommendations: [],
      source: "error",
      details: process.env.NODE_ENV === "development" ? String(error?.message || error) : undefined,
    });
  }
}
