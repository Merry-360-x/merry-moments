const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is", "it", "me", "my",
  "of", "on", "or", "our", "that", "the", "this", "to", "we", "what", "when", "where", "which", "who", "why", "with",
  "you", "your", "can", "could", "would", "should", "please", "about", "do", "does", "did", "want", "need", "looking",
]);

const SYNONYMS = {
  accommodation: ["stay", "hotel", "apartment", "villa", "guesthouse", "lodge", "room", "resort"],
  tour: ["trip", "activity", "experience", "excursion", "itinerary", "adventure"],
  transport: ["car", "ride", "driver", "airport transfer", "pickup", "dropoff", "vehicle"],
  payment: ["pay", "card", "mobile money", "momo", "flutterwave", "pawapay"],
  refund: ["cancel", "refund policy", "money back", "reimbursement"],
  cheap: ["budget", "affordable", "low cost", "economy"],
  luxury: ["premium", "high end", "5 star", "exclusive"],
};

const FAQS = [
  {
    id: "book-stays",
    intent: "book_stays",
    keywords: ["book", "accommodation", "stay", "hotel", "apartment", "villa"],
    answer:
      "You can book stays on Merry360X by searching destinations, selecting dates and guest count, then checking out. For best options, share your destination, budget range, and number of guests.",
  },
  {
    id: "book-tours",
    intent: "book_tours",
    keywords: ["tour", "package", "activity", "experience", "guide"],
    answer:
      "Merry360X supports both tours and tour packages. You can filter by location, duration, and pricing model (per person/group/hour/minute). If you share your trip style and budget, I can suggest the best match.",
  },
  {
    id: "airport-transfer",
    intent: "airport_transfer",
    keywords: ["airport", "transfer", "pickup", "dropoff", "kigali", "route"],
    answer:
      "Airport transfer services are available with route-based pricing. Choose direction (from airport or to airport), select route, and confirm pricing before checkout.",
  },
  {
    id: "car-rental",
    intent: "car_rental",
    keywords: ["car", "rental", "vehicle", "driver", "daily", "weekly", "monthly"],
    answer:
      "Car rentals support daily, weekly, and monthly pricing, with optional driver inclusion depending on listing settings. Share dates, passenger count, and transmission preference for better recommendations.",
  },
  {
    id: "payment-methods",
    intent: "payment_methods",
    keywords: ["payment", "mobile", "money", "card", "bank", "mtn", "airtel", "mpesa", "zamtel"],
    answer:
      "Merry360X checkout supports multiple payment methods including mobile money providers, card payments, and bank transfer paths depending on location and flow.",
  },
  {
    id: "refund-cancellation",
    intent: "refund_cancellation",
    keywords: ["refund", "cancel", "cancellation", "policy", "no show"],
    answer:
      "Refund eligibility depends on listing cancellation policy and timing before check-in/start time. If you provide booking type and timeline, I can guide the likely refund outcome.",
  },
  {
    id: "service-fees",
    intent: "fees_pricing",
    keywords: ["fee", "service fee", "charges", "total", "earnings", "host payout"],
    answer:
      "Guest totals include platform fee logic configured by product flow. Host earnings and admin financial views are calculated from booking and checkout records with fee deductions.",
  },
  {
    id: "host-onboarding",
    intent: "become_host",
    keywords: ["host", "become", "list", "onboard", "application", "approval"],
    answer:
      "To become a host, submit the host application with profile details and listing/service information. After review and approval, your host tools and publishing permissions are enabled.",
  },
  {
    id: "support-help",
    intent: "support_contact",
    keywords: ["support", "help", "issue", "problem", "contact", "chat"],
    answer:
      "You can use in-app support chat for account, booking, payment, and refund issues. Include booking/order ID for faster resolution.",
  },
  {
    id: "safety",
    intent: "safety",
    keywords: ["safety", "secure", "trust", "verification", "risk"],
    answer:
      "Follow Merry360X safety guidance: verify listing details, keep communication in-platform, and report urgent concerns to support promptly.",
  },
];

const INTENTS = [
  { id: "book_stays", keywords: ["stay", "hotel", "accommodation", "apartment", "villa", "room", "book"] },
  { id: "book_tours", keywords: ["tour", "package", "activity", "itinerary", "guide", "experience"] },
  { id: "airport_transfer", keywords: ["airport", "pickup", "dropoff", "transfer", "route"] },
  { id: "car_rental", keywords: ["car", "rental", "vehicle", "driver", "daily", "weekly", "monthly"] },
  { id: "payment_methods", keywords: ["pay", "payment", "mobile", "money", "card", "bank", "mtn", "airtel", "mpesa"] },
  { id: "refund_cancellation", keywords: ["refund", "cancel", "cancellation", "policy", "money back"] },
  { id: "fees_pricing", keywords: ["fee", "charges", "price", "pricing", "earnings", "payout"] },
  { id: "become_host", keywords: ["host", "list", "application", "approval", "onboard"] },
  { id: "support_contact", keywords: ["help", "support", "contact", "issue", "problem"] },
  { id: "safety", keywords: ["safety", "secure", "trust", "verification"] },
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const baseTokens = normalize(text).split(" ").filter(Boolean).filter((t) => !STOP_WORDS.has(t));
  const expanded = [...baseTokens];
  for (const token of baseTokens) {
    for (const [key, values] of Object.entries(SYNONYMS)) {
      if (token === key || values.includes(token)) {
        expanded.push(key);
        expanded.push(...values);
      }
    }
  }
  return Array.from(new Set(expanded));
}

function scoreKeywordOverlap(tokens, keywords) {
  if (!keywords.length) return 0;
  let hits = 0;
  for (const kw of keywords) {
    const kwNorm = normalize(kw);
    if (!kwNorm) continue;
    if (kwNorm.includes(" ")) {
      if (tokens.join(" ").includes(kwNorm)) hits += 1.5;
    } else if (tokens.includes(kwNorm)) {
      hits += 1;
    }
  }
  return hits / Math.max(1, keywords.length);
}

function predictIntent(text) {
  const tokens = tokenize(text);
  const scored = INTENTS.map((intent) => ({
    id: intent.id,
    score: scoreKeywordOverlap(tokens, intent.keywords),
  })).sort((a, b) => b.score - a.score);

  const best = scored[0] || { id: "general", score: 0 };
  return {
    intent: best.id,
    confidence: Math.min(0.99, Number((best.score * 1.25).toFixed(2))),
    topIntents: scored.slice(0, 3),
  };
}

function retrieveFaqs(text, predictedIntent) {
  const tokens = tokenize(text);
  const ranked = FAQS.map((faq) => {
    const overlap = scoreKeywordOverlap(tokens, faq.keywords);
    const intentBoost = faq.intent === predictedIntent ? 0.35 : 0;
    return {
      ...faq,
      score: overlap + intentBoost,
    };
  }).sort((a, b) => b.score - a.score);

  return ranked.slice(0, 3);
}

function extractSimpleEntities(text) {
  const t = normalize(text);
  const budget = t.match(/(?:\$|usd|rwf|kes|ugx|zmw)?\s?(\d{2,7})/i)?.[1] || null;
  const group = t.match(/(\d+)\s*(?:people|persons|guests|travellers|travelers)/i)?.[1] || null;
  const days = t.match(/(\d+)\s*(?:day|days|night|nights)/i)?.[1] || null;
  return {
    budget,
    groupSize: group,
    durationDays: days,
  };
}

function buildReply(text, predictedIntent, faqs) {
  const entities = extractSimpleEntities(text);

  const introByIntent = {
    book_stays: "I can help you find the right stay.",
    book_tours: "I can help you shortlist tours and packages.",
    airport_transfer: "I can help you choose the right airport transfer route.",
    car_rental: "I can help you pick a car rental that fits your trip.",
    payment_methods: "I can guide you to the best payment option.",
    refund_cancellation: "I can explain the likely refund/cancellation outcome.",
    fees_pricing: "I can break down fees and totals for you.",
    become_host: "I can guide you through becoming a host.",
    support_contact: "I can help route this to support quickly.",
    safety: "I can share safety guidance for this case.",
    general: "I can help with Merry360X travel and booking questions.",
  };

  const intro = introByIntent[predictedIntent] || introByIntent.general;
  const primary = faqs[0]?.answer || "I can help with stays, tours, transport, payments, refunds, and host onboarding.";

  const hints = [];
  if (!entities.budget) hints.push("budget range");
  if (!entities.groupSize) hints.push("number of travelers");
  if (!entities.durationDays) hints.push("trip duration");

  const followUp = hints.length
    ? `To make this precise, share your ${hints.slice(0, 2).join(" and ")}.`
    : "If you want, I can now give you a specific recommendation based on your details.";

  return `${intro}\n\n${primary}\n\n${followUp}`;
}

export function estimateQuestionSpace() {
  const intentCount = INTENTS.length;
  const templateCountPerIntent = 90;
  const synonymVariants = 22;
  const entityCombos = 78;
  return intentCount * templateCountPerIntent * synonymVariants * entityCombos;
}

export function answerTripAdvisorQuestion(messages) {
  const lastUserMessage = [...(Array.isArray(messages) ? messages : [])]
    .reverse()
    .find((m) => m && m.role === "user" && typeof m.content === "string");

  const question = lastUserMessage?.content?.trim() || "";

  const prediction = predictIntent(question);
  const faqs = retrieveFaqs(question, prediction.intent);
  const reply = buildReply(question, prediction.intent, faqs);

  return {
    reply,
    intent: prediction.intent,
    confidence: prediction.confidence,
    topIntents: prediction.topIntents,
    references: faqs.map((f) => ({ id: f.id, intent: f.intent, score: Number(f.score.toFixed(3)) })),
    estimatedQuestionCapacity: estimateQuestionSpace(),
  };
}
