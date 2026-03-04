#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const OUTPUT = process.argv[2] || "tmp/trip-advisor-corpus.ndjson";
const LIMIT = Number(process.argv[3] || 1000000);

const intents = [
  {
    intent: "book_stays",
    templates: [
      "find me a {style} stay in {destination} for {guests} people",
      "best {style} hotel in {destination} for {nights} nights",
      "where can I book accommodation in {destination} with budget {budget}",
      "I need a {style} apartment in {destination} from {month}",
    ],
  },
  {
    intent: "book_tours",
    templates: [
      "recommend a {style} tour in {destination}",
      "what tours are available in {destination} for {guests} people",
      "I want a {duration} day trip in {destination} with budget {budget}",
      "best activities near {destination} in {month}",
    ],
  },
  {
    intent: "airport_transfer",
    templates: [
      "need airport transfer from {airport} to {destination}",
      "how much is pickup from {airport} to {destination}",
      "book dropoff to {airport} from {destination}",
      "private airport ride for {guests} people in {destination}",
    ],
  },
  {
    intent: "car_rental",
    templates: [
      "rent a {vehicle} in {destination} for {duration} days",
      "car hire in {destination} with {gearbox} transmission",
      "need a {vehicle} with driver in {destination}",
      "best rental car under {budget} in {destination}",
    ],
  },
  {
    intent: "payment_methods",
    templates: [
      "can I pay with {payment} on merry360x",
      "what payment methods are supported in {destination}",
      "is {payment} available for booking",
      "how do I pay for my trip using {payment}",
    ],
  },
  {
    intent: "refund_cancellation",
    templates: [
      "what is the refund policy if I cancel {timing}",
      "can I get money back for a cancelled booking",
      "how much refund for {duration} day tour cancelled {timing}",
      "cancellation terms for hotel booking in {destination}",
    ],
  },
  {
    intent: "become_host",
    templates: [
      "how can I become a host on merry360x",
      "requirements to list my {listingType} in {destination}",
      "host onboarding process for {listingType}",
      "how long does host approval take",
    ],
  },
];

const slots = {
  destination: ["Kigali", "Musanze", "Rubavu", "Huye", "Nyungwe", "Akagera", "Volcanoes", "Rwanda"],
  style: ["budget", "mid-range", "luxury", "family", "romantic", "business", "eco", "adventure"],
  guests: ["1", "2", "3", "4", "5", "6", "8", "10"],
  nights: ["1", "2", "3", "5", "7", "10", "14"],
  budget: ["$50", "$100", "$150", "$200", "$300", "$500", "$1000", "RWF 100000"],
  month: ["January", "March", "June", "August", "December"],
  duration: ["1", "2", "3", "5", "7", "10"],
  airport: ["Kigali International Airport", "KGL"],
  vehicle: ["SUV", "sedan", "minivan", "4x4", "luxury car"],
  gearbox: ["automatic", "manual"],
  payment: ["mobile money", "MTN", "Airtel", "M-Pesa", "card", "bank transfer"],
  timing: ["24 hours before", "48 hours before", "3 days before", "7 days before", "last minute"],
  listingType: ["hotel", "apartment", "tour", "airport transfer", "car rental"],
};

function expandTemplate(template) {
  const keys = [...template.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]);
  if (!keys.length) return [template];

  let items = [template];
  for (const key of keys) {
    const values = slots[key] || ["unknown"];
    const next = [];
    for (const item of items) {
      for (const value of values) {
        next.push(item.replace(`{${key}}`, value));
      }
    }
    items = next;
  }
  return items;
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(OUTPUT);
  const stream = fs.createWriteStream(OUTPUT, { encoding: "utf8" });

  let written = 0;
  outer: for (const intent of intents) {
    for (const template of intent.templates) {
      const expanded = expandTemplate(template);
      for (const question of expanded) {
        const row = {
          intent: intent.intent,
          question,
          answer_stub: `Intent ${intent.intent} answer goes here`,
        };
        stream.write(JSON.stringify(row) + "\n");
        written += 1;
        if (written >= LIMIT) break outer;
      }
    }
  }

  stream.end();
  stream.on("finish", () => {
    console.log(`Generated ${written.toLocaleString()} rows at ${OUTPUT}`);
  });
}

main();
