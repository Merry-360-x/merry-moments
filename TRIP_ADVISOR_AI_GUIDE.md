# Trip Advisor AI Guide

## What was added

- `api/ai-trip-advisor.js`
  - Serverless endpoint used by the existing launcher AI chat.
  - Performs intent prediction + semantic FAQ retrieval + entity-aware follow-up.
- `lib/trip-advisor-brain.js`
  - Core retrieval and intent logic.
  - Returns: `reply`, `intent`, `confidence`, references, and estimated question capacity.
- `scripts/generate-trip-advisor-corpus.mjs`
  - Generates large synthetic Q&A/intents dataset (NDJSON).

## Why this scales to 1M+ questions

The AI does **not** require manually writing one million exact questions.
It scales by combining:

1. Intent classes
2. Template variants
3. Synonym expansion
4. Entity combinations (destination, budget, dates, group size, etc.)

This combinatorial approach covers massive phrasing space while staying maintainable.

## Generate a 1,000,000-question corpus

Run:

```bash
npm run trip-advisor:generate-corpus
```

Output:

- `tmp/trip-advisor-corpus.ndjson`

Each line is a JSON object with intent + synthetic question.

## API usage

### Request

`POST /api/ai-trip-advisor`

```json
{
  "messages": [
    { "role": "assistant", "content": "Hi!" },
    { "role": "user", "content": "Need airport transfer from KGL to Kigali" }
  ]
}
```

### Response

```json
{
  "ok": true,
  "reply": "...",
  "intent": "airport_transfer",
  "confidence": 0.84,
  "topIntents": [
    { "id": "airport_transfer", "score": 0.67 }
  ],
  "references": [
    { "id": "airport-transfer", "intent": "airport_transfer", "score": 1.02 }
  ],
  "capabilities": {
    "estimatedQuestionCapacity": 1544400,
    "strategy": "intent-classification + semantic-faq-retrieval + entity-aware-followup"
  }
}
```

## Next recommended upgrades

1. Store real user questions + resolved intent in a table for continuous retraining.
2. Add vector search (pgvector) on curated knowledge docs for deeper answers.
3. Add language detection and localized intent models for multi-language support.
4. Add human handoff trigger when confidence < threshold.
