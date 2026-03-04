# Trip Advisor AI Guide

## Overview

The Merry360X AI Trip Advisor is an **intelligent travel assistant** specializing in East African destinations. It provides contextual, knowledgeable responses about Rwanda, Uganda, Kenya, Tanzania, and Zambia - covering destinations, activities, planning, and platform booking questions.

## What was added

- `api/ai-trip-advisor.js`
  - Serverless endpoint for the AI chat.
  - Returns intelligent responses with intent, confidence, entities, and conversation context.
- `lib/trip-advisor-brain.js`
  - **Comprehensive knowledge base** covering 20+ East African destinations
  - **Detailed activity guides** for gorilla trekking, safaris, adventures, etc.
  - **Seasonal intelligence** including Great Migration calendar
  - **Itinerary templates** for multi-day trip planning
  - **Smart entity extraction** (destinations, dates, budget, group size, trip style)
  - **Conversation context tracking** for multi-turn conversations
  - **Intelligent response generation** combining knowledge base lookups

## Key Features

### 1. Comprehensive Destination Knowledge
The AI knows detailed information about:
- **Rwanda**: Kigali, Volcanoes NP (gorillas), Lake Kivu, Nyungwe Forest, Akagera NP
- **Uganda**: Kampala, Bwindi (gorillas), Queen Elizabeth NP, Murchison Falls, Jinja, Kibale
- **Kenya**: Nairobi, Masai Mara, Diani Beach, Amboseli
- **Tanzania**: Serengeti, Ngorongoro Crater, Zanzibar, Kilimanjaro
- **Zambia**: Victoria Falls, South Luangwa, Lower Zambezi

Each destination includes: highlights, best-for tags, budget ranges, best months, pro tips, nearby attractions.

### 2. Activity Intelligence
Detailed guides for:
- Gorilla trekking (permits, fitness, packing)
- Safari game drives
- Walking safaris
- Hot air balloon safaris  
- White water rafting
- Chimpanzee tracking
- Snorkeling & diving

### 3. Smart Entity Extraction
The AI automatically detects from user messages:
- **Destinations** mentioned (countries and specific locations)
- **Activities** of interest
- **Budget** amounts and types (per person, per day, total)
- **Group size** (number of travelers)
- **Travel dates/months**
- **Trip style** (honeymoon, family, luxury, budget, adventure, etc.)

### 4. Contextual Responses
The AI:
- Understands conversation context across multiple messages
- Provides destination-specific tips and highlights
- Offers seasonal recommendations (dry season, migration timing)
- Asks intelligent follow-up questions to refine recommendations
- Formats responses with markdown for readability

## API Usage

### Request

`POST /api/ai-trip-advisor`

```json
{
  "messages": [
    { "role": "user", "content": "I want to see gorillas in Rwanda in July for 5 days" }
  ]
}
```

### Response

```json
{
  "ok": true,
  "reply": "**Volcanoes National Park** (Rwanda)\n\n✨ **Highlights:** Mountain gorilla trekking, Golden monkey tracking, Dian Fossey tomb hike, Bisoke volcano hike\n\n💡 **Key tips:**\n• Gorilla permits cost $1,500 and should be booked months in advance\n• Physical fitness required - treks can last 1-8 hours\n• Bring waterproof layers, hiking boots, and gardening gloves\n\n📅 **Best time to visit:** Jan, Feb, Jun, Jul, Aug, Sep, Dec\n\n🦍 **Permit cost:** $1500 per person\n\n📅 **July travel:** dry season - Prime safari season...",
  "intent": "gorilla_trekking",
  "confidence": 0.87,
  "topIntents": [
    { "id": "gorilla_trekking", "score": 0.70 },
    { "id": "destination_info", "score": 0.35 }
  ],
  "references": [...],
  "extractedEntities": {
    "destinations": ["volcanoes_np"],
    "countries": ["Rwanda"],
    "activities": ["gorilla_trekking"],
    "month": "july",
    "duration": 5,
    "durationUnit": "days"
  },
  "conversationContext": {...},
  "capabilities": {
    "estimatedQuestionCapacity": 1544400000,
    "strategy": "intelligent-intent-classification + contextual-knowledge-retrieval + entity-aware-recommendations",
    "knowledgeBase": "East Africa destinations, activities, seasonal info, and travel planning"
  }
}
```

## Example Conversations

### Simple Greeting
**User:** Hi!
**AI:** Hello! 👋 I'm your Merry360X travel assistant, specializing in East African adventures. I can help with gorilla trekking, safaris, beach escapes, itinerary planning, and booking questions. What kind of trip are you dreaming of?

### Destination Query
**User:** Tell me about Masai Mara
**AI:** **Masai Mara National Reserve** (Kenya)

✨ **Highlights:** Great Migration, Big Five, Balloon safaris, Maasai village visits

💡 **Key tips:**
• Great Migration river crossings happen July-October
• Stay in conservancies for fewer crowds and night drives
• Hot air balloon safaris at sunrise are magical

📅 **Best time to visit:** Jul, Aug, Sep, Oct
💰 **Budget guide (per day):** Budget $250+ | Mid-range $500+ | Luxury $1500+

### Activity Query
**User:** How much is gorilla trekking?
**AI:** Gorilla permits: Rwanda $1,500/person, Uganda $800/person. Both offer magical encounters with mountain gorillas in their natural habitat. Rwanda is easier access (2.5h from Kigali); Uganda requires longer drive but costs less. Book 3-6 months ahead for dry season (June-Sept, Dec-Feb).

### Trip Planning
**User:** I'm planning a honeymoon in August, interested in wildlife and beach
**AI:** August is perfect for a honeymoon! Here's what I'd suggest:

**Safari:** Masai Mara (Kenya) or Serengeti (Tanzania) - August is peak migration season with dramatic river crossings.

**Beach:** Zanzibar offers romantic private villas on pristine beaches, perfect after safari.

**Romantic touches:** Many lodges offer private dinners, champagne sundowners, and couple's spa treatments.

A 10-12 day Kenya/Tanzania safari + Zanzibar combo would be ideal. How many days do you have, and what's your budget range?

## Intents Supported

| Intent | Description |
|--------|-------------|
| `book_stays` | Booking accommodations |
| `book_tours` | Booking tours/activities |
| `airport_transfer` | Airport transfers |
| `car_rental` | Vehicle rentals |
| `payment_methods` | Payment options |
| `refund_cancellation` | Refund/cancel policies |
| `fees_pricing` | Pricing questions |
| `become_host` | Hosting on platform |
| `support_contact` | Support requests |
| `safety` | Safety questions |
| `destination_info` | Destination information |
| `gorilla_trekking` | Gorilla-specific questions |
| `safari_planning` | Safari planning |
| `migration_info` | Great Migration |
| `wildlife_info` | Wildlife questions |
| `beach_coast` | Beach destinations |
| `adventure_activities` | Adventure sports |
| `travel_practical` | Visas, health, money |
| `trip_planning` | General planning |
| `trip_style` | Travel style (honeymoon, family, etc.) |
| `best_time` | When to visit |
| `comparison` | Comparing options |
| `greeting` | Hello/Hi |
| `thanks` | Thank you |

## Next Recommended Upgrades

1. **Vector search (pgvector)** - Store destination/activity embeddings for semantic matching
2. **Real-time availability** - Connect to live inventory for immediate booking
3. **Multi-language support** - French, Swahili, Kinyarwanda for local users
4. **User preference learning** - Remember past trips and preferences
5. **Price alerts** - Notify users when deals match their interests
6. **LLM integration** - Use OpenAI/Claude for generative responses on edge cases
