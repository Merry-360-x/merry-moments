import { answerTripAdvisorQuestion, estimateQuestionSpace } from "../lib/trip-advisor-brain.js";
import { searchTripAdvisorKnowledge } from "../lib/trip-advisor-knowledge-search.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return json(res, 400, {
        error: "Invalid payload",
        details: "Expected non-empty messages array",
      });
    }

    const result = answerTripAdvisorQuestion(messages);

    const lastUserMessage = [...messages].reverse().find((m) => m && m.role === "user" && typeof m.content === "string");
    const question = lastUserMessage?.content?.trim() || "";
    const docMatches = question ? await searchTripAdvisorKnowledge(question, { limit: 2 }) : [];

    let reply = result.reply;
    if (docMatches.length && result.intent !== "greeting" && result.intent !== "thanks") {
      const shouldAppendDocs = result.confidence < 0.45 || result.intent === "support_contact";
      if (shouldAppendDocs) {
        const lines = docMatches.map((d) => `• ${d.title} (${d.file})`).join("\n");
        reply = `${reply}\n\n---\n\n**Helpful docs (from our knowledge base):**\n${lines}`.trim();
      }
    }

    return json(res, 200, {
      ok: true,
      reply,
      intent: result.intent,
      confidence: result.confidence,
      topIntents: result.topIntents,
      references: result.references,
      extractedEntities: result.extractedEntities,
      conversationContext: result.conversationContext,
      docMatches,
      capabilities: {
        estimatedQuestionCapacity: result.estimatedQuestionCapacity || estimateQuestionSpace(),
        strategy: "intelligent-intent-classification + contextual-knowledge-retrieval + entity-aware-recommendations",
        knowledgeBase: "East Africa travel knowledge + Merry360X platform docs (local repo guides)",
      },
    });
  } catch (error) {
    console.error("ai-trip-advisor error", error);
    return json(res, 500, {
      error: "Trip advisor failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
