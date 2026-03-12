"""
Merry360X AI Trip Advisor — Local Python Brain
POST /api/ai-trip-advisor

Runs fully in-house with intent classification + entity extraction + curated
knowledge responses (no external AI provider required).
"""

from http.server import BaseHTTPRequestHandler
import json
import re
import random

# ---------------------------------------------------------------------------
# Intent catalogue for local intent classification
# ---------------------------------------------------------------------------
_INTENTS: dict[str, dict] = {
    "greeting": {
        "patterns": [r"^h[ie][!.]*$", r"^hi\s+there", r"^hello[!.]*$", r"^hey[!.]*$",
                     r"^good\s*(morning|afternoon|evening)"],
        "keywords": ["hi", "hello", "hey", "howdy", "morning", "afternoon", "evening", "hiya"],
    },
    "farewell": {
        "patterns": [r"^bye", r"^goodbye", r"^see\s*ya", r"that.s\s*all", r"i.m\s*done"],
        "keywords": ["bye", "goodbye", "ciao", "farewell", "see ya", "later", "take care"],
    },
    "thanks": {
        "patterns": [r"thank(s|\s+you)", r"cheers", r"appreciate"],
        "keywords": ["thanks", "thank you", "cheers", "appreciate", "helpful"],
    },
    "what_is_merry360x": {
        "patterns": [r"what\s*(is|'s|does|\s*do)\s*(merry|this|the\s*platform)",
                     r"tell\s*me\s*about\s*(merry|the\s*platform)", r"who\s*are\s*you"],
        "keywords": ["what is merry360x", "about merry", "who are you", "what do you do"],
    },
    "gorilla_trekking": {
        "patterns": [r"gorilla", r"bwindi", r"volcanoes\s*national\s*park", r"gorilla\s*permit"],
        "keywords": ["gorilla", "gorillas", "trekking", "mountain gorilla", "bwindi", "volcanoes"],
    },
    "safari": {
        "patterns": [r"safari", r"game\s*drive", r"big\s*five", r"masai\s*mara",
                     r"serengeti", r"migration", r"wildebeest"],
        "keywords": ["safari", "game drive", "game reserve", "wildlife", "big five", "migration"],
    },
    "accommodation": {
        "patterns": [r"where\s*(to|can\s*i)\s*stay", r"(hotel|lodge|villa|apartment|guesthouse)",
                     r"place\s*to\s*stay"],
        "keywords": ["hotel", "stay", "accommodation", "lodge", "villa", "apartment", "guesthouse"],
    },
    "payment": {
        "patterns": [r"how\s*(do|can)\s*i\s*pay", r"payment\s*method",
                     r"mobile\s*money", r"(mtn|airtel|mpesa|momo)", r"credit\s*card"],
        "keywords": ["pay", "payment", "mobile money", "momo", "mpesa", "visa", "mastercard", "card"],
    },
    "cancellation": {
        "patterns": [r"cancel(lation)?", r"refund", r"money\s*back",
                     r"can\s*i\s*(get\s*a?\s*)?refund"],
        "keywords": ["cancel", "cancellation", "refund", "money back", "refundable", "policy"],
    },
    "booking_process": {
        "patterns": [r"how\s*(do|can)\s*i\s*book", r"booking\s*process",
                     r"how\s*(does\s*booking|to\s*book)", r"i\s*want\s*to\s*book"],
        "keywords": ["how to book", "booking process", "how do i book", "reserve", "reservation"],
    },
    "destination_rwanda": {
        "patterns": [r"rwanda", r"kigali", r"volcanoes\s*national", r"lake\s*kivu", r"nyungwe"],
        "keywords": ["rwanda", "kigali", "volcanoes", "kivu", "nyungwe", "akagera"],
    },
    "destination_uganda": {
        "patterns": [r"uganda", r"kampala", r"bwindi", r"murchison\s*falls",
                     r"queen\s*elizabeth\s*(park|np)?", r"jinja"],
        "keywords": ["uganda", "kampala", "bwindi", "murchison", "jinja", "kibale", "entebbe"],
    },
    "destination_kenya": {
        "patterns": [r"kenya", r"nairobi", r"masai\s*mara", r"diani\s*beach", r"amboseli"],
        "keywords": ["kenya", "nairobi", "masai mara", "diani", "amboseli", "safari kenya"],
    },
    "destination_tanzania": {
        "patterns": [r"tanzania", r"serengeti", r"zanzibar", r"kilimanjaro", r"ngorongoro"],
        "keywords": ["tanzania", "serengeti", "zanzibar", "kilimanjaro", "ngorongoro", "arusha"],
    },
    "destination_zambia": {
        "patterns": [r"zambia", r"victoria\s*falls", r"luangwa", r"lower\s*zambezi"],
        "keywords": ["zambia", "victoria falls", "luangwa", "zambezi"],
    },
    "weather_season": {
        "patterns": [r"best\s*time\s*(to\s*visit|for|to\s*go)",
                     r"when\s*(to\s*visit|is\s*best|should\s*i\s*go)",
                     r"rainy\s*season", r"dry\s*season"],
        "keywords": ["best time", "when to visit", "weather", "rainy season", "dry season", "climate", "season"],
    },
    "budget": {
        "patterns": [r"how\s*much\s*(does|is|are|will)",
                     r"(budget|cost|price|fee|rate|charge)",
                     r"(cheap|afford|expensive|value)"],
        "keywords": ["budget", "cost", "price", "how much", "expensive", "cheap", "affordable", "fees"],
    },
    "support": {
        "patterns": [r"(contact|reach)\s*support", r"customer\s*(service|support)",
                     r"talk\s*to\s*(a\s*)?(human|person)", r"emergency"],
        "keywords": ["contact support", "customer service", "help desk", "problem", "issue", "emergency", "urgent"],
    },
}

# ---------------------------------------------------------------------------
# Pre-written replies for the Python fallback brain
# ---------------------------------------------------------------------------
_REPLIES: dict[str, list[str]] = {
    "greeting": [
        "Hello! 👋 Welcome to Merry360X! I'm your AI travel assistant for East African adventures. "
        "Ask me anything — gorilla trekking, safaris, beach escapes, booking help, or destination tips!",
        "Hi there! 🌍 Great to have you here. I can help with accommodations, tours, car rentals, "
        "and all things East Africa. What are you planning?",
    ],
    "farewell": [
        "Goodbye! 👋 Safe travels and come back whenever you need help with your East African adventure!",
        "Farewell! ✈️ May your journeys be filled with incredible memories. Merry360X is always here!",
    ],
    "thanks": [
        "You're welcome! 😊 Happy to help. Feel free to ask if you have more questions!",
        "My pleasure! 🙌 Helping travelers plan amazing trips is what I love. Anything else?",
    ],
    "what_is_merry360x": [
        "**Merry360X** is a travel booking platform specialising in authentic East African experiences. 🌍\n\n"
        "We help you discover and book:\n"
        "- 🏨 **Accommodations** — hotels, lodges, villas, apartments, guesthouses\n"
        "- 🦁 **Tours & experiences** — safaris, gorilla trekking, cultural tours, adventures\n"
        "- 🚗 **Car rentals** — self-drive and with driver\n"
        "- ✈️ **Airport transfers** — seamless pickups across East Africa\n\n"
        "We cover **Rwanda, Uganda, Kenya, Tanzania, and Zambia**.\n\nWhat would you like to explore?"
    ],
    "gorilla_trekking": [
        "🦍 **Mountain Gorilla Trekking — East Africa's Ultimate Experience**\n\n"
        "**Where to go:**\n"
        "- 🇷🇼 **Rwanda** — Volcanoes NP | Permit: **$1,500/person**\n"
        "- 🇺🇬 **Uganda** — Bwindi Impenetrable Forest | Permit: **$800/person**\n\n"
        "**What to know:**\n"
        "- Permits are **non-refundable** and should be booked **3–6 months in advance**\n"
        "- Treks range from 1–8 hours depending on gorilla family location\n"
        "- Maximum 8 visitors per family per day\n"
        "- Physical fitness recommended — terrain is steep and dense\n"
        "- One full hour with the gorillas once located\n\n"
        "**Best time:** June–September & December–February\n\n"
        "Would you like help planning a gorilla trekking itinerary?"
    ],
    "safari": [
        "🦁 **East African Safari Guide**\n\n"
        "**Top destinations:**\n"
        "- **Masai Mara (Kenya)** — Big Five, Great Migration river crossings (Jul–Oct)\n"
        "- **Serengeti (Tanzania)** — iconic savanna, wildebeest calving (Jan–Feb)\n"
        "- **Akagera NP (Rwanda)** — Big Five including rhinos, hippo boat safaris\n"
        "- **Queen Elizabeth NP (Uganda)** — tree-climbing lions, Kazinga Channel\n"
        "- **South Luangwa (Zambia)** — walking safaris, dense leopard population\n"
        "- **Amboseli (Kenya)** — elephants with Kilimanjaro backdrop\n\n"
        "**Great Migration calendar:**\n"
        "- Jan–Feb: Calving in southern Serengeti\n"
        "- Jul–Oct: 🌊 Dramatic Mara River crossings\n\n"
        "Which country or park interests you most? I can help for your dates and budget!"
    ],
    "accommodation": [
        "🏨 **Finding Accommodations on Merry360X**\n\n"
        "We offer a wide range of stays:\n"
        "- **Hotels & Resorts** — full amenities, restaurants, pools\n"
        "- **Safari Lodges** — tented camps and bush lodges near parks\n"
        "- **Villas & Apartments** — great for families or longer stays\n"
        "- **Guesthouses** — local, affordable, authentic\n"
        "- **Monthly rentals** — for extended stays\n\n"
        "**Price ranges (approx):**\n"
        "- Budget guesthouses: $30–$80/night\n"
        "- Mid-range hotels: $80–$200/night\n"
        "- Luxury lodges: $300–$800+/night\n\n"
        "What destination are you looking at? I can give specific recommendations!"
    ],
    "payment": [
        "💳 **Payment Methods on Merry360X**\n\n"
        "**Mobile Money:** MTN, Airtel Money, M-Pesa (Kenya), other regional networks\n"
        "**Cards:** Visa, Mastercard\n"
        "**Other:** Bank transfer (for large bookings)\n\n"
        "All payments are processed through our secure gateway. We never store full card details.\n\n"
        "Is there a specific payment method you'd like to know more about?"
    ],
    "cancellation": [
        "📋 **Cancellation & Refund Policies**\n\n"
        "| Policy | Refund window |\n"
        "|--------|---------------|\n"
        "| **Flexible** | Full refund 24+ hours before check-in |\n"
        "| **Moderate** | Full refund 5+ days; 50% refund 2–5 days; none within 48 h |\n"
        "| **Strict** | 50% refund 7+ days; no refund within 7 days |\n"
        "| **Non-refundable** | Gorilla permits, special events, peak season deals |\n\n"
        "**How to cancel:** My Bookings → find booking → Cancel Booking → confirm\n\n"
        "**Refund timelines:** Mobile money 1–3 days · Card 5–10 days\n\n"
        "⚠️ Gorilla permits are non-refundable but may be rescheduled.\n"
        "💡 We strongly recommend purchasing **travel insurance**.\n\n"
        "What's your booking situation? I can give more specific guidance."
    ],
    "booking_process": [
        "📅 **How to Book on Merry360X**\n\n"
        "1. Search destination + dates + guests\n"
        "2. Browse listings (filter by type, price, amenities)\n"
        "3. Select property/tour and review all details\n"
        "4. Checkout → enter guest info → choose payment\n"
        "5. Complete payment → receive email confirmation\n"
        "6. Get host/guide contact details and check-in instructions\n\n"
        "**Tips:**\n"
        "- Book gorilla permits **3–6 months** in advance\n"
        "- Read the cancellation policy before confirming\n"
        "- Peak season (Jun–Sep, Dec–Jan) books up fast\n\n"
        "What type of booking are you after? Accommodation, tour, or transfer?"
    ],
    "destination_rwanda": [
        "🇷🇼 **Rwanda — The Land of a Thousand Hills**\n\n"
        "**Top spots:**\n"
        "- 🦍 **Volcanoes NP** — gorilla trekking, golden monkeys, Bisoke volcano hike\n"
        "- 🏙️ **Kigali** — modern capital, Genocide Memorial, vibrant food scene\n"
        "- 🌊 **Lake Kivu** — beach resorts, kayaking, scenic lakeside towns\n"
        "- 🌿 **Nyungwe Forest** — chimp tracking, canopy walkway\n"
        "- 🦁 **Akagera NP** — Big Five, hippo/bird boat safaris\n\n"
        "**Suggested 7-day itinerary:** 2 days Kigali → 2 days Volcanoes NP → 3 days Lake Kivu\n\n"
        "**Best time:** June–September · December–February\n"
        "**Gorilla permit:** $1,500/person (book far ahead!)\n\n"
        "Would you like help building a Rwanda itinerary?"
    ],
    "destination_uganda": [
        "🇺🇬 **Uganda — The Pearl of Africa**\n\n"
        "**Top spots:**\n"
        "- 🦍 **Bwindi Impenetrable Forest** — gorilla trekking ($800 permit)\n"
        "- 🦁 **Queen Elizabeth NP** — tree-climbing lions, Kazinga Channel boat safari\n"
        "- 💦 **Murchison Falls** — dramatic Nile waterfall, game drives\n"
        "- 🚣 **Jinja** — Grade 5 white water rafting, bungee jumping\n"
        "- 🐒 **Kibale Forest** — best chimpanzee tracking in Africa\n\n"
        "**Suggested 10-day:** Entebbe/Kampala → Kibale → Queen Elizabeth → Bwindi → Jinja\n\n"
        "**Best time:** June–September · December–February\n\n"
        "Want a custom Uganda itinerary?"
    ],
    "destination_kenya": [
        "🇰🇪 **Kenya — Wildlife Meets the Coast**\n\n"
        "**Top spots:**\n"
        "- 🦁 **Masai Mara** — Big Five, Great Migration Jul–Oct\n"
        "- 🐘 **Amboseli** — elephants with Kilimanjaro backdrop\n"
        "- 🏖️ **Diani Beach** — Indian Ocean, diving, water sports\n"
        "- 🏙️ **Nairobi** — Giraffe Centre, Elephant Orphanage\n\n"
        "**Great Migration:** Jul–Oct for wildebeest river crossings at the Mara\n\n"
        "Thinking of combining Kenya + Tanzania for the full migration circuit?"
    ],
    "destination_tanzania": [
        "🇹🇿 **Tanzania — Wild Africa & Paradise Beaches**\n\n"
        "**Top spots:**\n"
        "- 🦁 **Serengeti** — greatest wildlife spectacle on Earth; calving Jan–Feb\n"
        "- 🏔️ **Ngorongoro Crater** — world's largest intact caldera, dense wildlife\n"
        "- 🏖️ **Zanzibar** — turquoise waters, Stone Town, snorkelling, diving\n"
        "- ⛰️ **Kilimanjaro** — Africa's highest peak; 5–9 day treks ($2,000–$4,000)\n\n"
        "**Tanzania + Zanzibar combo** (7 days safari + 4 days beach) is hugely popular.\n\n"
        "Would you like an itinerary suggestion?"
    ],
    "destination_zambia": [
        "🇿🇲 **Zambia — The Real Africa**\n\n"
        "**Top spots:**\n"
        "- 💦 **Victoria Falls** — one of the world's largest waterfalls, sunset cruises, Devil's Pool\n"
        "- 🦁 **South Luangwa NP** — Africa's walking safari capital; incredible leopard sightings\n"
        "- 🚣 **Lower Zambezi** — canoe safaris, hippos, elephants, fishing\n\n"
        "Zambia is less crowded than its neighbours — great for authentic, off-the-beaten-track experiences.\n\n"
        "Want help building a Zambia itinerary?"
    ],
    "weather_season": [
        "📅 **Best Times to Visit East Africa**\n\n"
        "**Peak dry seasons (most popular):**\n"
        "- ☀️ **June–September** — driest, best game viewing, gorilla trekking; Great Migration in Kenya\n"
        "- ☀️ **December–February** — warm and dry; Serengeti calving Jan–Feb\n\n"
        "**Activity-specific timing:**\n"
        "| Activity | Best months |\n"
        "|----------|-------------|\n"
        "| Gorilla trekking | Jun–Sep, Dec–Feb |\n"
        "| Great Migration river crossings | Jul–Oct |\n"
        "| Kilimanjaro | Jan–Feb, Jun–Oct |\n"
        "| Zanzibar beach | Jun–Oct, Dec–Feb |\n\n"
        "Which destination are you considering? I can give specific timing advice!"
    ],
    "budget": [
        "💰 **East Africa Travel Budget Guide**\n\n"
        "**Budget ($50–$100/day):** guesthouses $20–$50/night, local restaurants, shared transport\n"
        "**Mid-range ($150–$300/day):** 3-star hotels/lodges $80–$200/night, private transfers\n"
        "**Luxury ($400–$1,000+/day):** 5-star lodges $400–$800+/night, exclusive services\n\n"
        "**Key activity costs:**\n"
        "- 🦍 Gorilla permit Rwanda: $1,500/person | Uganda: $800/person\n"
        "- 🦁 3-day Masai Mara safari: ~$600–$1,200/person\n"
        "- ⛰️ Kilimanjaro trek: $2,000–$4,000/person\n"
        "- 🎈 Hot air balloon (Mara): ~$450–$600/person\n"
        "- 🚣 Jinja white water rafting: ~$125/person\n\n"
        "What's your approximate total budget and number of days? I can suggest what's feasible!"
    ],
    "support": [
        "📞 **Merry360X Customer Support**\n\n"
        "**Contact options:**\n"
        "- 📧 Email: support@merry360x.com\n"
        "- 💬 In-app chat: switch to **Customer Support** tab in this widget\n"
        "- 🌐 merry360x.com/support\n\n"
        "For **active trips** — priority 24/7 support is available.\n\n"
        "Would you like to switch to Customer Support to speak with our team?"
    ],
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _classify_intent(text: str) -> tuple[str, float]:
    t = text.lower()
    best, score = "general", 0.0
    for name, data in _INTENTS.items():
        s = 0.0
        for pat in data.get("patterns", []):
            if re.search(pat, t):
                s += 0.65
                break
        for kw in data.get("keywords", []):
            if kw in t:
                s += 0.15
        if s > score:
            score, best = s, name
    return best, round(min(score, 1.0), 2)


def _extract_entities(text: str) -> dict:
    t = text.lower()
    ents: dict = {}

    countries = [c for c in ["rwanda", "uganda", "kenya", "tanzania", "zambia"] if c in t]
    if countries:
        ents["countries"] = [c.title() for c in countries]

    m = re.search(r"\$\s*(\d[\d,]*)", text)
    if m:
        ents["budget_usd"] = int(m.group(1).replace(",", ""))

    m = re.search(r"(\d+)\s*(day|days|week|weeks|night|nights)", t)
    if m:
        val, unit = int(m.group(1)), m.group(2).rstrip("s")
        ents["duration"] = val * (7 if unit == "week" else 1)
        ents["duration_unit"] = "days"

    for gt in ["family", "couple", "honeymoon", "solo", "group", "friends", "business"]:
        if gt in t:
            ents["group_type"] = gt
            break

    months = ["january","february","march","april","may","june",
              "july","august","september","october","november","december"]
    for mo in months:
        if mo[:3] in t or mo in t:
            ents["month"] = mo
            break

    return ents


def _fallback_reply(intent: str, text: str) -> str:
    if intent in _REPLIES:
        return random.choice(_REPLIES[intent])
    ents = _extract_entities(text)
    countries = ents.get("countries", [])
    if countries:
        c = countries[0]
        return (
            f"Great question about {c}! 🌍 Could you share more about what you're looking for — "
            f"activities, budget, travel dates, and group size? "
            f"That'll help me give you the best recommendations on Merry360X!"
        )
    return (
        "I'd love to help with your East African adventure! 🌍 "
        "Could you tell me more about what you're looking for?\n"
        "- Which countries or destinations interest you?\n"
        "- What activities do you enjoy (safari, gorilla trekking, beach)?\n"
        "- What's your approximate budget and travel dates?\n\n"
        "I can then give you tailored recommendations!"
    )


# ---------------------------------------------------------------------------
# Processing pipeline
# ---------------------------------------------------------------------------

def _process(messages: list) -> dict:
    last = next((m for m in reversed(messages) if m.get("role") == "user"), {})
    text = str(last.get("content") or "")
    intent, confidence = _classify_intent(text)
    return {
        "ok": True,
        "reply": _fallback_reply(intent, text),
        "intent": intent,
        "confidence": confidence,
        "model": "merry360x-local-ai-v1",
        "extractedEntities": _extract_entities(text),
    }


# ---------------------------------------------------------------------------
# Vercel serverless handler
# ---------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    """Vercel Python serverless function."""

    def log_message(self, fmt, *args):
        pass  # suppress request logs in Vercel output

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self._send_json(200, {
            "ok": True,
            "service": "Merry360X AI Trip Advisor",
            "runtime": "Python",
            "model": "merry360x-local-ai-v1",
        })

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length)
            body = json.loads(raw or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._send_json(400, {"ok": False, "error": "Invalid JSON body"})
            return

        messages = body.get("messages")
        if not isinstance(messages, list) or len(messages) == 0:
            self._send_json(400, {"ok": False, "error": "Expected non-empty messages array"})
            return

        try:
            self._send_json(200, _process(messages))
        except Exception as exc:
            print(f"[ai-trip-advisor-py] Unhandled error: {exc}")
            self._send_json(500, {"ok": False, "error": "Internal server error"})
