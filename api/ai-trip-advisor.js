import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is", "it",
  "me", "my", "of", "on", "or", "our", "that", "the", "this", "to", "we", "what", "when", "where",
  "which", "who", "why", "with", "you", "your", "can", "could", "would", "should", "please", "do",
  "does", "did", "want", "need", "looking", "like", "just", "also", "really", "very", "some", "any",
]);

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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return [];
  const terms = extractQueryTerms(userText);
  if (terms.length === 0) return [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
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

async function generateReply(messages) {
  if (!OPENAI_API_KEY) {
    return "OPENAI_API_KEY is missing. Please set it to use AI Trip Advisor.";
  }

  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && typeof m === "object")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 400),
        }))
        .slice(-6)
    : [];

  const payload = {
    model: OPENAI_MODEL,
    temperature: 0.4,
    max_tokens: 260,
    messages: [
      {
        role: "system",
        content:
          "You are Merry360X Trip Advisor for East Africa travel. Be concise, practical, and friendly. Keep replies under 4 short lines. Ask one clarifying question only when needed.",
      },
      ...safeMessages,
    ],
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "OpenAI request failed");
    throw new Error(errText || "OpenAI request failed");
  }

  const out = await response.json();
  const text = out?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : "I can help with East Africa travel plans. What destination are you considering?";
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const lastUserMessage = [...messages].reverse().find((m) => m && m.role === "user");
    const userText = String(lastUserMessage?.content || "");

    const [reply, recommendations] = await Promise.all([
      generateReply(messages),
      fetchRecommendations(userText),
    ]);

    return sendJson(res, 200, { reply, recommendations });
  } catch (error) {
    return sendJson(res, 500, {
      error: "AI request failed",
      reply: "I am having trouble right now. Please try again in a moment.",
      recommendations: [],
      details: process.env.NODE_ENV === "development" ? String(error?.message || error) : undefined,
    });
  }
}
