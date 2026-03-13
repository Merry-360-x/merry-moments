"""
Merry360X AI Trip Advisor — Local Python Brain
POST /api/ai-trip-advisor

Runs fully in-house with intent classification + entity extraction + curated
knowledge responses (no external AI provider required).
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import re
import random
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

try:
    from openai import OpenAI  # type: ignore
except Exception:
    OpenAI = None  # type: ignore


_PRICE_TERMS = [
    "cheap", "cheapest", "lowest", "low cost", "affordable", "budget", "best price", "least expensive",
]

_MAX_REPLY_CHARS = 250
_MAX_REPLY_LINES = 4

_SESSION_MEMORY: dict[str, dict] = {}
_SESSION_TTL_SECONDS = 60 * 60 * 8
_MAX_MEMORY_TURNS = 24

_CITY_TO_COUNTRY = {
    "kigali": "Rwanda",
    "gisenyi": "Rwanda",
    "kibuye": "Rwanda",
    "kampala": "Uganda",
    "entebbe": "Uganda",
    "jinja": "Uganda",
    "nairobi": "Kenya",
    "masai mara": "Kenya",
    "mara": "Kenya",
    "arusha": "Tanzania",
    "serengeti": "Tanzania",
    "zanzibar": "Tanzania",
    "dar es salaam": "Tanzania",
    "livingstone": "Zambia",
    "lusaka": "Zambia",
}

_PROPERTY_TYPE_ALIASES: dict[str, list[str]] = {
    "apartment": ["apartment", "apartments", "flat", "studio"],
    "hotel": ["hotel", "hotels", "resort", "resorts"],
    "villa": ["villa", "villas"],
    "guesthouse": ["guesthouse", "guest house", "guesthouses"],
    "lodge": ["lodge", "lodges", "camp", "camps"],
}

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


def _contains_any(text: str, terms: list[str]) -> bool:
    return any(term in text for term in terms)


def _detect_property_type(text: str) -> str | None:
    for canonical, aliases in _PROPERTY_TYPE_ALIASES.items():
        if _contains_any(text, aliases):
            return canonical
    return None


def _is_price_focused(text: str) -> bool:
    compact = text.replace(" ", "")
    return _contains_any(text, _PRICE_TERMS) or "thecheapest" in compact


def _extract_entities(text: str) -> dict:
    t = text.lower()
    ents: dict = {}

    if _is_price_focused(t):
        ents["price_intent"] = "lowest_price"

    property_type = _detect_property_type(t)
    if property_type:
        ents["property_type"] = property_type

    countries = [c for c in ["rwanda", "uganda", "kenya", "tanzania", "zambia"] if c in t]
    if countries:
        ents["countries"] = [c.title() for c in countries]

    m = re.search(r"\$\s*(\d[\d,]*)", t)
    if m:
        ents["budget_usd"] = int(m.group(1).replace(",", ""))

    if "budget_usd" not in ents:
        m_trailing = re.search(r"(\d[\d,]*)\s*\$", t)
        if m_trailing:
            ents["budget_usd"] = int(m_trailing.group(1).replace(",", ""))

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

    guests_match = re.search(r"(\d+)\s*(guest|guests|people|persons|traveler|travelers|adults?)", t)
    if guests_match:
        ents["guests"] = max(1, int(guests_match.group(1)))
    else:
        implicit_guests = re.search(r"(?:we\s*are|for|party\s*of)\s*(\d{1,2})\b", t)
        if implicit_guests:
            ents["guests"] = max(1, int(implicit_guests.group(1)))

    budget_match_plain = re.search(r"\b(\d{2,6})\s*(usd|\$|rwf|frw|eur)?\b", t)
    if budget_match_plain and "budget_usd" not in ents:
        val = int(budget_match_plain.group(1))
        unit = (budget_match_plain.group(2) or "").lower()
        if 20 <= val <= 100000:
            if unit in {"rwf", "frw"}:
                ents["budget_rwf"] = val
            else:
                ents["budget_usd"] = val

    for city, country in _CITY_TO_COUNTRY.items():
        if city in t:
            ents["location_hint"] = city.title()
            ents.setdefault("countries", [country])
            break

    if "any date" in t or "anytime" in t or "flexible" in t:
        ents["date_flexibility"] = "flexible"

    return ents


def _merge_entities(base: dict, overlay: dict) -> dict:
    merged = dict(base)
    for k, v in overlay.items():
        if v is None:
            continue
        if isinstance(v, list):
            prev = merged.get(k, []) if isinstance(merged.get(k), list) else []
            merged[k] = list(dict.fromkeys(prev + v))
        else:
            merged[k] = v
    return merged


def _memory_key(user_id: str | None, session_id: str | None) -> str:
    if user_id:
        return f"user:{user_id}"
    if session_id:
        return f"session:{session_id}"
    return "anon:default"


def _load_memory(user_id: str | None, session_id: str | None) -> dict:
    now = time.time()
    # Opportunistic cleanup
    stale = [k for k, v in _SESSION_MEMORY.items() if now - float(v.get("updated_at", 0)) > _SESSION_TTL_SECONDS]
    for k in stale:
        _SESSION_MEMORY.pop(k, None)

    key = _memory_key(user_id, session_id)
    data = _SESSION_MEMORY.get(key) or {"turns": [], "entities": {}, "updated_at": now}
    _SESSION_MEMORY[key] = data
    return data


def _save_memory(user_id: str | None, session_id: str | None, turn: dict, entities: dict):
    key = _memory_key(user_id, session_id)
    data = _SESSION_MEMORY.get(key) or {"turns": [], "entities": {}, "updated_at": time.time()}
    data["turns"] = (data.get("turns", []) + [turn])[-_MAX_MEMORY_TURNS:]
    data["entities"] = _merge_entities(data.get("entities", {}), entities)
    data["updated_at"] = time.time()
    _SESSION_MEMORY[key] = data


def _supabase_config() -> tuple[str | None, str | None]:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("VITE_SUPABASE_ANON_KEY")
    )
    if not url or not key:
        return None, None
    return url.rstrip("/"), key


def _fetch_supabase_listings(limit: int = 120) -> list[dict]:
    base, key = _supabase_config()
    if not base or not key:
        return []

    params = {
        "select": "id,title,location,price_per_night,price_per_month,monthly_only_listing,currency,property_type,rating,review_count,max_guests,is_published",
        "is_published": "eq.true",
        "limit": str(limit),
    }
    url = f"{base}/rest/v1/properties?{urlencode(params)}"
    req = Request(
        url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urlopen(req, timeout=5) as resp:
            raw = resp.read()
        data = json.loads(raw.decode("utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _normalized_price(item: dict) -> float:
    monthly_only = bool(item.get("monthly_only_listing"))
    price = item.get("price_per_month") if monthly_only else item.get("price_per_night")
    try:
        return float(price or 0)
    except Exception:
        return 0.0


def _budget_cap(entities: dict) -> float | None:
    if "budget_rwf" in entities:
        try:
            return float(entities["budget_rwf"])
        except Exception:
            return None
    if "budget_usd" in entities:
        # Approximate USD->RWF conversion for ranking fallback if listing is RWF-heavy
        try:
            return float(entities["budget_usd"]) * 1300
        except Exception:
            return None
    return None


def _rank_listings(items: list[dict], entities: dict, text: str, top_n: int = 5) -> list[dict]:
    if not items:
        return []

    t = text.lower()
    requested_type = entities.get("property_type")
    requested_guests = int(entities.get("guests", 0) or 0)
    countries = [str(c).lower() for c in entities.get("countries", [])]
    location_hint = str(entities.get("location_hint", "")).lower()
    cap = _budget_cap(entities)

    filtered = []
    for it in items:
        p = _normalized_price(it)
        if p <= 0:
            continue
        if requested_type and str(it.get("property_type", "")).lower() != str(requested_type).lower():
            continue
        if requested_guests and int(it.get("max_guests") or 0) and int(it.get("max_guests") or 0) < requested_guests:
            continue
        if cap and p > cap * 1.4:
            continue
        filtered.append(it)

    pool = filtered if filtered else items
    prices = [_normalized_price(it) for it in pool if _normalized_price(it) > 0]
    p_min = min(prices) if prices else 1.0
    p_max = max(prices) if prices else 1.0

    scored = []
    for it in pool:
        price = _normalized_price(it)
        rating = float(it.get("rating") or 0)
        reviews = int(it.get("review_count") or 0)
        location = str(it.get("location") or "")
        ptype = str(it.get("property_type") or "")

        if p_max == p_min:
            price_score = 1.0
        else:
            price_score = 1.0 - ((price - p_min) / (p_max - p_min))

        rating_score = min(rating / 5.0, 1.0)
        review_score = min(reviews / 50.0, 1.0)

        type_boost = 0.2 if requested_type and ptype.lower() == str(requested_type).lower() else 0.0
        location_boost = 0.0
        ll = location.lower()
        if location_hint and location_hint in ll:
            location_boost += 0.25
        if countries and any(c in ll for c in countries):
            location_boost += 0.15

        price_weight = 0.55 if _is_price_focused(t) else 0.35
        score = (price_weight * price_score) + (0.30 * rating_score) + (0.15 * review_score) + type_boost + location_boost

        scored.append({
            "id": str(it.get("id")),
            "title": str(it.get("title") or "Untitled"),
            "location": location,
            "currency": str(it.get("currency") or "RWF"),
            "price": price,
            "rating": rating,
            "review_count": reviews,
            "property_type": ptype,
            "score": round(score, 4),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]


def _format_recommendations(recs: list[dict]) -> str:
    if not recs:
        return ""
    lines = ["🏷️ **Top matches:**"]
    for r in recs[:2]:
        price_text = f"{int(r['price']):,} {r['currency']}"
        lines.append(
            f"- **{r['title']}** · {r['location']} · {price_text} · ⭐ {r['rating']:.1f} ({r['review_count']})"
        )
    lines.append("\nShare destination + dates for exact picks.")
    return "\n".join(lines)


def _compact_reply_text(text: str) -> str:
    lines = [ln.rstrip() for ln in str(text or "").splitlines()]
    compact = []
    non_empty_count = 0
    for ln in lines:
        if ln.strip() == "":
            if compact and compact[-1] != "":
                compact.append("")
            continue
        compact.append(ln)
        non_empty_count += 1
        if non_empty_count >= _MAX_REPLY_LINES:
            break

    out = "\n".join(compact).strip()
    if len(out) > _MAX_REPLY_CHARS:
        out = out[: _MAX_REPLY_CHARS - 1].rstrip() + "…"
    return out


def _openai_config() -> tuple[str | None, str]:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    model = os.environ.get("OPENAI_MODEL", "gpt-5-nano").strip() or "gpt-5-nano"
    return (api_key if api_key else None), model


def _generate_openai_reply(
    messages: list,
    intent: str,
    entities: dict,
    recommendations: list[dict],
    confidence: float,
) -> tuple[str | None, str | None]:
    api_key, model = _openai_config()
    if not api_key or OpenAI is None:
        return None, None

    try:
        client = OpenAI(api_key=api_key)

        # Keep prompt compact but grounded in local retrieval/context.
        conversation = []
        for m in messages[-3:]:
            role = str(m.get("role") or "user")
            content = str(m.get("content") or "").strip()[:160]
            if role in {"user", "assistant"} and content:
                conversation.append(f"{role.upper()}: {content}")

        grounding = {
            "intent": intent,
            "confidence": confidence,
            "entities": entities,
            "recommendations": recommendations[:2],
        }

        prompt = (
            "You are Merry360X AI Trip Advisor for East Africa travel.\n"
            "Be concise, helpful, and non-repetitive.\n"
            "Reply in <= 45 words and at most 3 short lines.\n"
            "Use the grounding data exactly and do not invent listings.\n"
            "If key details are missing, ask only 1 focused question.\n"
            "When recommendations exist, summarize very briefly and give one next step.\n\n"
            f"GROUNDING_JSON: {json.dumps(grounding, ensure_ascii=False)}\n\n"
            "CONVERSATION:\n"
            f"{'\n'.join(conversation)}\n"
        )

        response = client.responses.create(
            model=model,
            input=prompt,
            store=False,
            max_output_tokens=80,
        )

        text = getattr(response, "output_text", None)
        if isinstance(text, str) and text.strip():
            return _compact_reply_text(text.strip()), model
        return None, None
    except Exception as exc:
        print(f"[ai-trip-advisor] OpenAI fallback to local: {exc}")
        return None, None


def _intent_confidence(intent: str, base_score: float, entities: dict, has_recs: bool) -> float:
    conf = base_score
    if entities.get("countries"):
        conf += 0.08
    if entities.get("property_type"):
        conf += 0.08
    if entities.get("budget_usd") or entities.get("budget_rwf"):
        conf += 0.10
    if entities.get("guests"):
        conf += 0.06
    if has_recs:
        conf += 0.12

    # Need stronger signals for shopping intents.
    if intent in {"accommodation", "budget"}:
        if not entities.get("countries") and not entities.get("location_hint"):
            conf -= 0.10
        if not entities.get("budget_usd") and not entities.get("budget_rwf"):
            conf -= 0.08

    return round(max(0.05, min(conf, 0.99)), 2)


def _clarification_questions(intent: str, entities: dict) -> str:
    missing: list[str] = []
    if intent in {"accommodation", "budget"}:
        if not entities.get("countries") and not entities.get("location_hint"):
            missing.append("Which city or country do you want?")
        if not entities.get("budget_usd") and not entities.get("budget_rwf"):
            missing.append("What is your max budget per night?")
        if not entities.get("guests"):
            missing.append("How many guests?")
        if not entities.get("month") and entities.get("date_flexibility") != "flexible":
            missing.append("What travel month or dates are you targeting?")

    if not missing:
        return ""

    lines = ["To give a precise recommendation, I need:"]
    for q in missing[:3]:
        lines.append(f"- {q}")
    return "\n".join(lines)


def _shopping_missing_fields(entities: dict) -> list[str]:
    missing: list[str] = []
    if not entities.get("countries") and not entities.get("location_hint"):
        missing.append("destination")
    if not entities.get("budget_usd") and not entities.get("budget_rwf"):
        missing.append("budget")
    if not entities.get("guests"):
        missing.append("guests")
    if not entities.get("month") and entities.get("date_flexibility") != "flexible":
        missing.append("dates")
    return missing


def _format_context_summary(entities: dict) -> str:
    parts: list[str] = []
    if entities.get("budget_usd"):
        parts.append(f"budget: ${int(entities['budget_usd'])}/night")
    elif entities.get("budget_rwf"):
        parts.append(f"budget: {int(entities['budget_rwf']):,} RWF/night")

    if entities.get("guests"):
        parts.append(f"guests: {int(entities['guests'])}")

    if entities.get("location_hint"):
        parts.append(f"location: {entities['location_hint']}")
    elif entities.get("countries"):
        parts.append(f"country: {entities['countries'][0]}")

    if entities.get("month"):
        parts.append(f"dates: {str(entities['month']).title()}")
    elif entities.get("date_flexibility") == "flexible":
        parts.append("dates: flexible")

    return " | ".join(parts)


def _infer_contextual_intent(intent: str, messages: list, current_entities: dict, memory: dict) -> tuple[str, float]:
    if intent != "general":
        return intent, 0.0

    has_detail_payload = any(
        k in current_entities for k in [
            "budget_usd", "budget_rwf", "guests", "month", "duration", "location_hint", "property_type"
        ]
    )
    if not has_detail_payload:
        return intent, 0.0

    # Prefer continuing the most recent meaningful user intent from memory.
    turns = memory.get("turns", []) if isinstance(memory, dict) else []
    for turn in reversed(turns):
        prior_intent = str(turn.get("intent") or "")
        if prior_intent and prior_intent != "general":
            if prior_intent in {"accommodation", "budget", "booking_process", "destination_rwanda", "destination_uganda", "destination_kenya", "destination_tanzania", "destination_zambia"}:
                return prior_intent, 0.42
            break

    prior_text = " ".join(
        str(m.get("content") or "").lower()
        for m in messages[:-1]
        if isinstance(m, dict)
    )
    if any(tok in prior_text for tok in ["stay", "hotel", "apartment", "guesthouse", "cheapest", "price", "budget"]):
        return "accommodation", 0.38

    return "budget", 0.30


def _fallback_reply(intent: str, text: str, entities: dict, recommendations: list[dict]) -> str:
    raw = text.strip()
    t = raw.lower()

    if intent in {"accommodation", "budget"}:
        missing = _shopping_missing_fields(entities)
        summary = _format_context_summary(entities)
        lead = "🏨 **Got it — I can help you find the best stay options.**"
        if summary:
            lead = f"{lead}\n\nCaptured details: {summary}."

        if recommendations:
            out = f"{lead}\n\n{_format_recommendations(recommendations)}"
            if missing:
                prompts = {
                    "destination": "Which city or country should I focus on?",
                    "budget": "What is your max budget per night?",
                    "guests": "How many guests should I match for?",
                    "dates": "What month or exact dates are you targeting?",
                }
                asks = [prompts[m] for m in missing[:2] if m in prompts]
                if asks:
                    out = f"{out}\n\nTo tighten results further:\n- " + "\n- ".join(asks)
            return out

        if summary and missing:
            prompts = {
                "destination": "Which city or country should I focus on?",
                "budget": "What is your max budget per night?",
                "guests": "How many guests should I match for?",
                "dates": "What month or exact dates are you targeting?",
            }
            asks = [prompts[m] for m in missing[:3] if m in prompts]
            if asks:
                return f"{lead}\n\nI need a bit more to return exact listings:\n- " + "\n- ".join(asks)

    # Compose intent for queries like "what the cheapest apartment" instead of
    # returning generic accommodation text.
    if _is_price_focused(t) and entities.get("property_type"):
        property_type = str(entities["property_type"])
        label = property_type.capitalize()
        base = (
            f"💸 **Cheapest {label} options on Merry360X**\n\n"
            f"Great choice. To find the current **lowest-price {property_type}s**, use:\n"
            f"- Property type: **{label}**\n"
            f"- Sort: **Price (low to high)**\n"
            f"- Add flexible dates if possible (weekday stays are often cheaper)\n"
            f"- Keep guest count accurate to avoid hidden capacity upgrades\n\n"
            "**Typical budget ranges (East Africa):**\n"
            "- Kigali / Kampala: ~$25–$70 per night\n"
            "- Nairobi / Arusha: ~$30–$90 per night\n"
            "- Zanzibar / safari-adjacent areas: ~$45–$120 per night\n\n"
            "Send me your destination + dates + number of guests and I’ll narrow it down fast."
        )
        if recommendations:
            base = f"{base}\n\n{_format_recommendations(recommendations)}"
        return base

    if intent in _REPLIES:
        base = random.choice(_REPLIES[intent])
        if intent in {"accommodation", "budget"} and recommendations:
            return f"{base}\n\n{_format_recommendations(recommendations)}"
        return base
    ents = entities
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

def _process(messages: list, user_id: str | None = None, session_id: str | None = None) -> dict:
    last = next((m for m in reversed(messages) if m.get("role") == "user"), {})
    text = str(last.get("content") or "")
    intent, base_conf = _classify_intent(text)

    memory = _load_memory(user_id, session_id)
    prior_entities = memory.get("entities", {}) if isinstance(memory, dict) else {}
    current_entities = _extract_entities(text)
    entities = _merge_entities(prior_entities, current_entities)

    inferred_intent, inferred_boost = _infer_contextual_intent(intent, messages, current_entities, memory)
    if inferred_intent != intent:
        intent = inferred_intent
        base_conf = max(base_conf, inferred_boost)

    listings = _fetch_supabase_listings(limit=150)
    recommendations = _rank_listings(listings, entities, text, top_n=5)
    confidence = _intent_confidence(intent, base_conf, entities, bool(recommendations))

    reply = _fallback_reply(intent, text, entities, recommendations)
    model_name = "merry360x-local-ai-v1"

    llm_reply, llm_model = _generate_openai_reply(messages, intent, entities, recommendations, confidence)
    if llm_reply:
        reply = llm_reply
        model_name = llm_model or model_name

    if confidence < 0.52:
        clarify = _clarification_questions(intent, entities)
        if clarify:
            reply = f"{reply}\n\n{clarify}"

    reply = _compact_reply_text(reply)

    _save_memory(
        user_id,
        session_id,
        {"role": "user", "content": text, "intent": intent, "confidence": confidence},
        current_entities,
    )

    return {
        "ok": True,
        "reply": reply,
        "intent": intent,
        "confidence": confidence,
        "model": model_name,
        "extractedEntities": entities,
        "recommendations": recommendations,
        "memory": {
            "memoryKey": _memory_key(user_id, session_id),
            "turnsStored": len(_SESSION_MEMORY.get(_memory_key(user_id, session_id), {}).get("turns", [])),
        },
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
        _, configured_model = _openai_config()
        api_key, _ = _openai_config()
        self._send_json(200, {
            "ok": True,
            "service": "Merry360X AI Trip Advisor",
            "runtime": "Python",
            "model": configured_model if (api_key and OpenAI is not None) else "merry360x-local-ai-v1",
            "fallbackModel": "merry360x-local-ai-v1",
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

        user_id = body.get("userId")
        session_id = body.get("sessionId")

        try:
            self._send_json(200, _process(messages, str(user_id) if user_id else None, str(session_id) if session_id else None))
        except Exception as exc:
            print(f"[ai-trip-advisor-py] Unhandled error: {exc}")
            self._send_json(500, {"ok": False, "error": "Internal server error"})
