import { answerTripAdvisorQuestion, estimateQuestionSpace } from "../lib/trip-advisor-brain.js";

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

    return json(res, 200, {
      ok: true,
      reply: result.reply,
      intent: result.intent,
      confidence: result.confidence,
      topIntents: result.topIntents,
      references: result.references,
      capabilities: {
        estimatedQuestionCapacity: result.estimatedQuestionCapacity || estimateQuestionSpace(),
        strategy: "intent-classification + semantic-faq-retrieval + entity-aware-followup",
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
