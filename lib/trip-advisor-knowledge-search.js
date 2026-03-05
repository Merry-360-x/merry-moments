import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const STOP = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "this",
  "to",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your",
  "can",
  "could",
  "would",
  "should",
  "please",
  "do",
  "does",
  "did",
]);

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter(Boolean)
    .filter((t) => t.length > 2)
    .filter((t) => !STOP.has(t));
}

function chunkText(text, maxLen) {
  const blocks = String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const block of blocks) {
    if (!current) {
      current = block;
      continue;
    }

    if ((current + "\n\n" + block).length <= maxLen) {
      current += "\n\n" + block;
      continue;
    }

    chunks.push(current);
    current = block;
  }

  if (current) chunks.push(current);
  return chunks;
}

let cachedIndexPromise = null;

function repoRootFromHere() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // lib/ -> repo root
  return path.resolve(here, "..");
}

const DEFAULT_DOCS = [
  { id: "readme", title: "README", file: "README.md" },
  { id: "trip-advisor", title: "Trip Advisor AI Guide", file: "TRIP_ADVISOR_AI_GUIDE.md" },
  { id: "quick-start", title: "Quick Start (New Features)", file: "QUICK_START_NEW_FEATURES.md" },
  { id: "roles-quick", title: "Quick Start (Roles)", file: "QUICK_START_ROLES.md" },
  { id: "staff-quick", title: "Staff Quick Start", file: "STAFF_QUICK_START.md" },
  { id: "staff-dash", title: "Staff Dashboards Guide", file: "STAFF_DASHBOARDS_GUIDE.md" },
  { id: "staff-roles", title: "Staff Roles Documentation", file: "STAFF_ROLES_DOCUMENTATION.md" },
  { id: "booking-auto", title: "Booking Automation Guide", file: "BOOKING_AUTOMATION_GUIDE.md" },
  { id: "pawapay-setup", title: "PawaPay Setup", file: "PAWAPAY_SETUP.md" },
  { id: "pawapay-int", title: "PawaPay Integration Guide", file: "PAWAPAY_INTEGRATION_GUIDE.md" },
  { id: "flutterwave", title: "Flutterwave Testing", file: "FLUTTERWAVE_TESTING.md" },
  { id: "domain", title: "Domain Setup Guide", file: "DOMAIN_SETUP_GUIDE.md" },
  { id: "affiliate", title: "Affiliate System Guide", file: "AFFILIATE_SYSTEM_GUIDE.md" },
];

async function buildIndex() {
  const root = repoRootFromHere();

  const entries = [];
  for (const doc of DEFAULT_DOCS) {
    try {
      const abs = path.join(root, doc.file);
      const content = await readFile(abs, "utf-8");
      const chunks = chunkText(content, 900);
      chunks.forEach((chunk, idx) => {
        const tokens = tokenize(chunk);
        if (tokens.length < 8) return;
        entries.push({
          type: "doc",
          docId: doc.id,
          title: doc.title,
          file: doc.file,
          chunkIndex: idx,
          snippet: chunk.slice(0, 520).trim(),
          tokens: new Set(tokens),
        });
      });
    } catch {
      // Missing docs are fine; keep index best-effort.
    }
  }

  return entries;
}

async function getIndex() {
  if (!cachedIndexPromise) cachedIndexPromise = buildIndex();
  return cachedIndexPromise;
}

function scoreOverlap(queryTokens, docTokenSet) {
  if (!queryTokens.length) return 0;
  let hits = 0;
  for (const t of queryTokens) {
    if (docTokenSet.has(t)) hits += 1;
  }
  // Normalize mostly by query length (cap to reduce over-penalizing long queries)
  return hits / Math.max(4, Math.min(queryTokens.length, 14));
}

export async function searchTripAdvisorKnowledge(query, { limit = 3, minScore = 0.28 } = {}) {
  const qTokens = Array.from(new Set(tokenize(query)));
  if (qTokens.length === 0) return [];

  const index = await getIndex();

  const scored = index
    .map((entry) => ({
      ...entry,
      score: Number(scoreOverlap(qTokens, entry.tokens).toFixed(3)),
    }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((x) => ({
    type: x.type,
    title: x.title,
    file: x.file,
    score: x.score,
    snippet: x.snippet,
  }));
}
