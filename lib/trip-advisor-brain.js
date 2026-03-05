// ============================================================================
// INTELLIGENT TRIP ADVISOR BRAIN - Comprehensive East African Travel Expert
// Merry360X AI Assistant - Handles 1M+ Question Variations
// ============================================================================

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is", "it", "me", "my",
  "of", "on", "or", "our", "that", "the", "this", "to", "we", "what", "when", "where", "which", "who", "why", "with",
  "you", "your", "can", "could", "would", "should", "please", "about", "do", "does", "did", "want", "need", "looking",
  "like", "just", "also", "really", "very", "some", "any", "tell", "know", "think", "get", "give", "help", "find",
  "im", "ive", "dont", "cant", "wont", "isnt", "arent", "wasnt", "werent", "havent", "hasnt", "hadnt",
]);

// ============================================================================
// COMPREHENSIVE SYNONYMS FOR FUZZY MATCHING
// ============================================================================

const SYNONYMS = {
  accommodation: ["stay", "hotel", "apartment", "villa", "guesthouse", "lodge", "room", "resort", "hostel", "airbnb", "place to stay", "sleeping", "bed", "overnight", "accommodation"],
  tour: ["trip", "activity", "experience", "excursion", "itinerary", "adventure", "trek", "hike", "safari", "expedition", "outing", "journey"],
  transport: ["car", "ride", "driver", "airport transfer", "pickup", "dropoff", "vehicle", "taxi", "shuttle", "bus", "transit", "transportation", "travel"],
  payment: ["pay", "card", "mobile money", "momo", "flutterwave", "pawapay", "visa", "mastercard", "transfer", "checkout", "purchase", "buy"],
  refund: ["cancel", "refund policy", "money back", "reimbursement", "return", "cancellation", "cancelled", "canceled"],
  cheap: ["budget", "affordable", "low cost", "economy", "inexpensive", "value", "backpacker", "cheap", "economical", "reasonable"],
  luxury: ["premium", "high end", "5 star", "exclusive", "upscale", "boutique", "splurge", "luxurious", "fancy", "deluxe", "vip"],
  family: ["kids", "children", "family friendly", "child", "baby", "toddler", "families", "family"],
  romantic: ["couples", "honeymoon", "anniversary", "romantic", "intimate", "partner", "spouse", "love", "lovers", "couple"],
  adventure: ["thrill", "extreme", "adrenaline", "exciting", "outdoor", "wild", "adventurous", "daring"],
  relax: ["relaxation", "spa", "peaceful", "quiet", "retreat", "unwind", "chill", "rest", "leisure", "calm"],
  wildlife: ["animals", "safari", "gorilla", "lion", "elephant", "bird", "nature", "game drive", "fauna", "creatures"],
  culture: ["cultural", "history", "heritage", "tradition", "museum", "local", "authentic", "historical", "customs"],
  book: ["booking", "reserve", "reservation", "book", "schedule", "arrange", "order", "purchase"],
  merry360x: ["merry360x", "merry 360x", "merry360", "merry 360", "merry", "platform", "app", "website", "site", "service"],
  greeting: ["hi", "hello", "hey", "greetings", "howdy", "yo", "hiya", "sup", "whats up", "good morning", "good afternoon", "good evening", "good day"],
  howareyou: ["how are you", "how r u", "how ru", "hows it going", "how is it going", "how do you do", "how are things", "whats good", "how you doing", "hows everything"],
};

// ============================================================================
// MERRY360X PLATFORM KNOWLEDGE BASE
// ============================================================================

const PLATFORM_INFO = {
  name: "Merry360X",
  tagline: "Your Gateway to East African Adventures",
  description: "Merry360X is a comprehensive travel booking platform specializing in East African travel experiences. We connect travelers with authentic accommodations, tours, car rentals, and airport transfers across Rwanda, Uganda, Kenya, Tanzania, and Zambia.",
  
  whatWeDo: [
    "Book accommodations - hotels, lodges, villas, apartments, guesthouses",
    "Book tours and experiences - safaris, gorilla trekking, city tours, cultural experiences",
    "Arrange car rentals - self-drive and with driver options",
    "Airport transfers - seamless pickup and dropoff services",
    "Tour packages - multi-day curated itineraries",
    "Connect travelers with verified local hosts and tour operators"
  ],
  
  countries: ["Rwanda", "Uganda", "Kenya", "Tanzania", "Zambia"],
  
  uniqueFeatures: [
    "Specialized in East African travel experiences",
    "Verified hosts and tour operators",
    "Multiple payment options including mobile money",
    "24/7 customer support for active trips",
    "Detailed listings with real photos and reviews",
    "Secure booking and payment system",
    "Local expertise and insider knowledge",
    "Competitive pricing with transparent fees"
  ],
  
  targetAudience: [
    "International tourists visiting East Africa",
    "Regional travelers exploring neighboring countries",
    "Business travelers needing accommodations and transport",
    "Adventure seekers looking for unique experiences",
    "Families planning vacations",
    "Honeymoon couples seeking romantic getaways",
    "Solo travelers and backpackers",
    "Group travelers and tour organizers"
  ],
  
  founded: "Merry360X was created to make East African travel accessible, authentic, and hassle-free.",
};

// ============================================================================
// COMPREHENSIVE BOOKING PROCESS KNOWLEDGE
// ============================================================================

const BOOKING_PROCESS = {
  accommodations: {
    steps: [
      "1. Search for your destination (city, country, or specific area)",
      "2. Select your check-in and check-out dates",
      "3. Specify number of guests",
      "4. Browse available listings with photos, amenities, and reviews",
      "5. Select your preferred accommodation",
      "6. Review pricing breakdown (nightly rate + fees)",
      "7. Proceed to checkout",
      "8. Enter guest details",
      "9. Choose payment method (card, mobile money, bank transfer)",
      "10. Complete payment",
      "11. Receive booking confirmation via email and in-app",
      "12. Get host contact details and check-in instructions"
    ],
    tips: [
      "Book early for peak seasons (June-September, December-February)",
      "Read reviews from previous guests",
      "Check cancellation policy before booking",
      "Message the host for special requests",
      "Download Merry360X app for mobile booking confirmations"
    ]
  },
  
  tours: {
    steps: [
      "1. Browse tours by destination or activity type",
      "2. Filter by duration, price, and experience type",
      "3. Select your preferred tour/experience",
      "4. Choose your travel date",
      "5. Specify number of participants",
      "6. Review what's included and excluded",
      "7. Check meeting point and time",
      "8. Proceed to checkout",
      "9. Complete payment",
      "10. Receive tour confirmation with guide contact details"
    ],
    tips: [
      "Book gorilla permits 3-6 months in advance",
      "Check physical fitness requirements for activities",
      "Confirm what gear/equipment is provided vs. what to bring",
      "Review the cancellation/refund policy carefully"
    ]
  },
  
  carRentals: {
    steps: [
      "1. Enter pickup location and date/time",
      "2. Enter dropoff location and date/time",
      "3. Browse available vehicles",
      "4. Select vehicle type (sedan, SUV, 4x4, minivan)",
      "5. Choose with or without driver",
      "6. Review daily/weekly rate and total cost",
      "7. Add extras (GPS, child seat, additional driver)",
      "8. Complete booking and payment",
      "9. Receive rental confirmation with pickup instructions"
    ],
    requirements: [
      "Valid driver's license (international permit for self-drive)",
      "Valid passport or ID",
      "Security deposit (refundable)",
      "Minimum age typically 23-25 years"
    ]
  },
  
  airportTransfers: {
    steps: [
      "1. Select airport (KGL, EBB, NBO, JRO, DAR, etc.)",
      "2. Choose direction (from airport or to airport)",
      "3. Enter flight details",
      "4. Specify destination address",
      "5. Select vehicle type",
      "6. Review price",
      "7. Complete booking",
      "8. Driver will meet you at arrivals with name board"
    ],
    included: [
      "Meet and greet at airport",
      "Flight tracking (driver adjusts for delays)",
      "Waiting time (typically 60 minutes)",
      "Luggage assistance"
    ]
  }
};

// ============================================================================
// COMPREHENSIVE CANCELLATION & REFUND POLICIES
// ============================================================================

const CANCELLATION_POLICIES = {
  general: {
    overview: "Cancellation policies vary by listing and service type. Each listing displays its specific policy before you book. Here are the common policy types:",
  },
  
  policyTypes: {
    flexible: {
      name: "Flexible",
      description: "Full refund if cancelled 24+ hours before check-in/start time. After that, the first night/day is non-refundable, remaining nights/days refunded.",
      bestFor: "Travelers who value flexibility and might need to change plans"
    },
    moderate: {
      name: "Moderate", 
      description: "Full refund if cancelled 5+ days before check-in/start time. 50% refund if cancelled 2-5 days before. No refund within 48 hours.",
      bestFor: "Balanced approach between flexibility and commitment"
    },
    strict: {
      name: "Strict",
      description: "50% refund if cancelled 7+ days before check-in/start time. No refund within 7 days. Some listings may offer credit for future bookings.",
      bestFor: "Budget-friendly options that require more commitment"
    },
    superStrict: {
      name: "Super Strict / Non-Refundable",
      description: "No refund upon cancellation. This applies to special rates, permits, and peak season bookings. May offer date changes subject to availability.",
      bestFor: "Gorilla permits, special events, and deeply discounted rates"
    }
  },
  
  specialCases: {
    gorillaPermits: {
      policy: "Gorilla trekking permits are non-refundable once purchased. However, they can be rescheduled to a different date subject to availability. Rescheduling fees may apply. In case of illness or emergency, permits may be transferred to another person with proper documentation.",
      recommendation: "Purchase travel insurance that covers permit costs"
    },
    weatherRelated: {
      policy: "If activities are cancelled due to severe weather, most operators will offer a full refund or free rescheduling. Game drives and boat safaris may be adjusted but rarely fully cancelled.",
      recommendation: "Flexible dates help if weather affects plans"
    },
    hostCancellations: {
      policy: "If a host cancels your booking, you receive a full refund plus assistance finding alternative accommodation. Merry360X will help rebook at a similar property.",
      recommendation: "Book with hosts who have good reviews and response rates"
    },
    medicalEmergencies: {
      policy: "Medical emergencies are handled case-by-case. Provide documentation (medical certificates) to support your refund request. Travel insurance is strongly recommended.",
      recommendation: "Always purchase comprehensive travel insurance"
    }
  },
  
  howToCancel: [
    "1. Log into your Merry360X account",
    "2. Go to 'My Bookings' or 'Trips'",
    "3. Find the booking you want to cancel",
    "4. Click 'Cancel Booking'",
    "5. Select cancellation reason",
    "6. Review refund amount based on policy",
    "7. Confirm cancellation",
    "8. Refund will be processed to original payment method (3-10 business days)"
  ],
  
  refundTimelines: {
    card: "5-10 business days",
    mobileMoney: "1-3 business days",
    bankTransfer: "5-7 business days"
  }
};

// ============================================================================
// TERMS & CONDITIONS KNOWLEDGE
// ============================================================================

const TERMS_CONDITIONS = {
  overview: "By using Merry360X, you agree to our terms of service. Here are the key points:",
  
  keyPoints: [
    {
      topic: "Account Registration",
      details: "You must provide accurate information when creating an account. You're responsible for maintaining account security and all activities under your account."
    },
    {
      topic: "Booking Agreement",
      details: "When you complete a booking, you enter into a contract with the host/service provider. Merry360X facilitates this connection but the service agreement is between you and the provider."
    },
    {
      topic: "Payment Processing",
      details: "Payments are processed securely through our payment partners (Flutterwave, PawaPay). We never store your full card details. Prices are displayed in the currency shown and may be subject to exchange rate fluctuations."
    },
    {
      topic: "User Conduct", 
      details: "Users must behave respectfully towards hosts, guests, and support staff. Discrimination, harassment, fraud, or illegal activities will result in account suspension."
    },
    {
      topic: "Content & Reviews",
      details: "Reviews must be honest and based on actual experience. Fake reviews, defamatory content, or content violating intellectual property rights is prohibited."
    },
    {
      topic: "Liability Limitations",
      details: "Merry360X's liability is limited to the fees collected. We're not responsible for host/provider actions, travel incidents, or circumstances beyond our control."
    },
    {
      topic: "Dispute Resolution",
      details: "Disputes should first be raised through our support system. We'll mediate between parties. Unresolved disputes may be subject to arbitration."
    },
    {
      topic: "Service Modifications",
      details: "We may update services, features, and pricing. Significant changes will be communicated via email and in-app notifications."
    }
  ],
  
  userResponsibilities: [
    "Provide accurate personal and payment information",
    "Arrive on time for reservations and tours", 
    "Treat properties and equipment with care",
    "Follow safety guidelines and local laws",
    "Communicate issues promptly to hosts and support",
    "Leave honest reviews after your experience"
  ],
  
  hostResponsibilities: [
    "Provide accurate listing descriptions and photos",
    "Maintain property cleanliness and safety",
    "Honor confirmed bookings",
    "Respond to guest communications promptly",
    "Report issues to platform support"
  ]
};

// ============================================================================
// PRIVACY POLICY KNOWLEDGE
// ============================================================================

const PRIVACY_POLICY = {
  overview: "Merry360X is committed to protecting your privacy. Here's how we handle your data:",
  
  dataWeCollect: [
    {
      type: "Account Information",
      details: "Name, email, phone number, profile photo, and password (encrypted)",
      purpose: "Account creation, communication, and security"
    },
    {
      type: "Booking Information",
      details: "Travel dates, destinations, guest details, special requests",
      purpose: "Processing reservations and providing services"
    },
    {
      type: "Payment Information",
      details: "Payment method details processed through secure payment partners",
      purpose: "Transaction processing (we don't store full card numbers)"
    },
    {
      type: "Communication Data",
      details: "Messages between you and hosts, support conversations",
      purpose: "Facilitating communication and resolving issues"
    },
    {
      type: "Usage Data",
      details: "App/website usage, search history, device information",
      purpose: "Improving services and personalizing experience"
    },
    {
      type: "Location Data",
      details: "Location when using maps/search features (with permission)",
      purpose: "Showing nearby listings and relevant destinations"
    }
  ],
  
  howWeUseData: [
    "Process bookings and payments",
    "Communicate about your reservations",
    "Provide customer support",
    "Send booking confirmations and updates",
    "Improve our platform and services",
    "Personalize your experience",
    "Ensure platform security and prevent fraud",
    "Comply with legal requirements"
  ],
  
  dataSharing: [
    "Hosts/providers - necessary booking details to fulfill your reservation",
    "Payment processors - to process transactions securely",
    "Service providers - who help us operate (hosting, analytics)",
    "Legal requirements - when required by law or to protect rights"
  ],
  
  yourRights: [
    "Access your personal data",
    "Correct inaccurate information",
    "Delete your account and data",
    "Export your data",
    "Opt-out of marketing communications",
    "Control cookie preferences"
  ],
  
  dataSecurity: [
    "SSL/TLS encryption for all data transmission",
    "Encrypted password storage",
    "Regular security audits",
    "Limited employee access to personal data",
    "Secure payment processing via certified partners"
  ],
  
  contact: "For privacy questions, contact privacy@merry360x.com or use in-app support."
};

// ============================================================================
// CONVERSATIONAL PATTERNS - Greetings & Small Talk
// ============================================================================

const GREETING_PATTERNS = [
  // Simple greetings
  /^h[ie]$/i,
  /^h[ie][!.]*$/i,
  /^hello$/i,
  /^hello[!.]*$/i,
  /^hey$/i,
  /^hey[!.]*$/i,
  /^hi\s+there$/i,
  /^hello\s+there$/i,
  /^hey\s+there$/i,
  /^greetings$/i,
  /^howdy$/i,
  /^yo$/i,
  /^hiya$/i,
  /^sup$/i,
  /^what'?s?\s*up$/i,
  
  // Time-based greetings
  /^good\s*(morning|afternoon|evening|day|night)$/i,
  /^good\s*(morning|afternoon|evening|day|night)[!.]*$/i,
  /^(morning|afternoon|evening)[!.]*$/i,
  
  // Greeting with how are you
  /^h[ie][!,.]?\s*how\s*(are|r)\s*(you|u)/i,
  /^hello[!,.]?\s*how\s*(are|r)\s*(you|u)/i,
];

const HOW_ARE_YOU_PATTERNS = [
  /how\s*(are|r)\s*(you|u)(\s*doing)?[?!.]*$/i,
  /how('?s|\s+is)\s*(it\s+going|everything|things)[?!.]*$/i,
  /how\s*do\s*you\s*do[?!.]*$/i,
  /how\s*(you|u)\s+doing[?!.]*$/i,
  /what('?s|\s+is)\s+(up|good)[?!.]*$/i,
  /you\s+(ok|okay|good|well)[?!.]*$/i,
  /are\s+you\s+(ok|okay|good|well)[?!.]*$/i,
  /hope\s+you('?re|\s+are)\s+(doing\s+)?(well|good|ok|okay)/i,
];

const GREETING_RESPONSES = [
  "Hello! 👋 Welcome to Merry360X! I'm your AI travel assistant for East African adventures. How can I help you today? Whether it's gorilla trekking, safaris, beach escapes, or booking questions - I'm here for you!",
  "Hi there! 🌍 Great to have you here at Merry360X! I can help with trip planning, destination info, booking accommodations, tours, and much more across Rwanda, Uganda, Kenya, Tanzania, and Zambia. What are you curious about?",
  "Hey! 👋 Welcome! I'm the Merry360X assistant, your guide to East African travel. Ask me anything - from \"where to see gorillas\" to \"how do I book\" to \"what's the best time to visit\". How can I make your travel dreams come true?",
  "Hello and welcome to Merry360X! 🦁 I'm here to help you explore the best of East Africa. Whether you're planning your first safari, curious about gorilla trekking, or need help with bookings - just ask!",
  "Hi! 😊 Welcome to Merry360X, your gateway to unforgettable East African journeys. I can answer questions about destinations, activities, booking process, payments, and more. What would you like to know?",
];

const HOW_ARE_YOU_RESPONSES = [
  "I'm doing great, thank you for asking! 😊 As an AI assistant, I'm always ready to help you plan amazing East African adventures. How can I assist you today?",
  "I'm wonderful, thanks! 🌟 Ready and excited to help you explore Rwanda, Uganda, Kenya, Tanzania, and Zambia. What travel questions can I answer for you?",
  "Doing excellent! 👍 I love helping travelers discover East Africa. Whether you need destination advice, booking help, or travel tips - I'm here. What's on your mind?",
  "I'm great, thank you! 😄 More importantly, how can I help make your travel plans awesome? Ask me anything about Merry360X or East African destinations!",
  "All good here! 🙌 I'm an AI, so I'm always at 100%! What I really want to know is - are you planning an adventure? How can I help?",
];

const FAREWELL_PATTERNS = [
  /^(bye|goodbye|see\s*ya|later|ciao|farewell|take\s*care)[\s!.]*$/i,
  /^(good\s*night|good\s*bye|bye\s*bye)[\s!.]*$/i,
  /^(thanks?|thank\s*you)[\s!.]*bye[\s!.]*$/i,
  /^that('?s|\s+is)\s+all[\s!.]*$/i,
  /^i('?m|\s+am)\s+done[\s!.]*$/i,
  /^nothing\s+(else|more)[\s!.]*$/i,
];

const FAREWELL_RESPONSES = [
  "Goodbye! 👋 Safe travels and don't hesitate to come back if you have more questions. Happy exploring!",
  "Take care! 🌍 Wishing you amazing adventures. Come back anytime you need travel help!",
  "Bye for now! 😊 Have a wonderful journey ahead. Merry360X is here whenever you need us!",
  "Farewell! ✈️ May your travels be filled with incredible memories. See you next time!",
  "Goodbye! 🦁 Remember, East Africa awaits! Come back when you're ready to plan your next adventure.",
];

const THANKS_RESPONSES = [
  "You're welcome! 😊 Happy to help. Feel free to ask if you have more questions about your East African adventure!",
  "My pleasure! 🙌 That's what I'm here for. Anything else you'd like to know?",
  "Glad I could help! 🌟 Don't hesitate to ask more questions. I'm here for all your travel needs!",
  "You're very welcome! 👍 Excited to help you explore East Africa. Let me know if there's anything else!",
  "Anytime! 😄 Helping travelers plan amazing trips is what I love. Need anything else?",
];

// ============================================================================
// QUESTION PATTERNS - Comprehensive Pattern Matching
// ============================================================================

const QUESTION_PATTERNS = {
  // What is Merry360X
  whatIsMerry360x: [
    /what\s*(is|'s)\s*(merry\s*360\s*x?|the\s*platform|this)/i,
    /tell\s*me\s*about\s*(merry\s*360|this\s*(app|platform|site|website))/i,
    /what\s*(does|do)\s*(merry\s*360|you)\s*do/i,
    /what\s*can\s*(merry\s*360|you|i)\s*(do|help|offer)/i,
    /explain\s*(merry\s*360|the\s*platform|what\s*you\s*do)/i,
    /who\s*(is|are)\s*(merry\s*360|you)/i,
    /what\s*services?\s*(do\s*you|does\s*(merry|the\s*platform))\s*offer/i,
    /what('?s|\s+is)\s*merry/i,
    /about\s*(merry|the\s*platform)/i,
  ],
  
  // How to book
  howToBook: [
    /how\s*(do\s*i|can\s*i|to)\s*book/i,
    /booking\s*(process|steps|how)/i,
    /how\s*(does|do)\s*booking\s*work/i,
    /guide\s*(me\s*)?(to|through)\s*book/i,
    /steps?\s*(to|for)\s*book/i,
    /what('?s|\s+is)\s*the\s*booking\s*process/i,
    /how\s*(do\s*i\s*)?(make|place)\s*(a\s*)?reservation/i,
    /i\s*want\s*to\s*book/i,
    /can\s*i\s*book/i,
    /book\s*(a|an)\s*(stay|hotel|tour|car|transfer)/i,
    /reserve\s*(a|an)/i,
  ],
  
  // Cancellation
  cancellation: [
    /cancel(lation)?\s*(policy|policies|rules?)/i,
    /how\s*(do\s*i|can\s*i|to)\s*cancel/i,
    /refund\s*(policy|policies|rules?)/i,
    /can\s*i\s*(get\s*(a\s*)?)?refund/i,
    /money\s*back/i,
    /what\s*(if|happens)\s*(i\s*)?(need\s*to\s*)?cancel/i,
    /cancel\s*(my\s*)?(booking|reservation|trip)/i,
    /is\s*(it|there)\s*(a\s*)?refund(able)?/i,
    /what('?s|\s+is)\s*(the|your)\s*cancellation/i,
    /no\s*show/i,
  ],
  
  // Terms & Conditions
  termsConditions: [
    /terms?\s*(and|&)?\s*conditions?/i,
    /terms?\s*of\s*(service|use)/i,
    /user\s*agreement/i,
    /what\s*(are|'s)\s*(the|your)\s*terms/i,
    /rules/i,
    /policies/i,
    /legal\s*(stuff|things|terms)/i,
    /service\s*agreement/i,
  ],
  
  // Privacy
  privacy: [
    /privacy\s*(policy)?/i,
    /data\s*(protection|privacy|security|policy)/i,
    /personal\s*(data|information)/i,
    /what\s*(data|info)\s*(do\s*you|does)\s*(collect|store|keep|have)/i,
    /how\s*(is|are)\s*my\s*(data|info|details)/i,
    /is\s*(my\s*)?(data|info|details)\s*(safe|secure)/i,
    /do\s*you\s*(sell|share)\s*(my\s*)?(data|info)/i,
    /gdpr/i,
    /ccpa/i,
  ],
  
  // Payment
  payment: [
    /how\s*(do\s*i|can\s*i|to)\s*pay/i,
    /payment\s*(methods?|options?|ways?)/i,
    /can\s*i\s*(pay|use)\s*(with\s*)?(card|mobile\s*money|momo|mpesa)/i,
    /what\s*payment\s*(methods?|options?)/i,
    /accept(ed)?\s*payment/i,
    /do\s*you\s*(accept|take)\s*(card|visa|mastercard|mobile)/i,
    /mobile\s*money/i,
    /(mtn|airtel|mpesa|momo)\s*(money|payment)?/i,
    /credit\s*card/i,
    /debit\s*card/i,
  ],
  
  // Support
  support: [
    /how\s*(do\s*i|can\s*i|to)\s*(contact|reach|get)\s*support/i,
    /customer\s*(support|service|care)/i,
    /help\s*(desk|line|center)/i,
    /contact\s*(us|support|help)/i,
    /i\s*(have|need|got)\s*(a\s*)?(problem|issue|question)/i,
    /something\s*(is\s*)?(wrong|broken|not\s*working)/i,
    /need\s*help/i,
    /support\s*(team|line|email|phone)/i,
    /talk\s*to\s*(a\s*)?(human|person|agent|representative)/i,
    /emergency/i,
    /urgent/i,
  ],
  
  // Pricing
  pricing: [
    /how\s*much\s*(does|do|is|are)/i,
    /price/i,
    /cost/i,
    /fees?/i,
    /charges?/i,
    /rate/i,
    /expensive/i,
    /cheap/i,
    /afford/i,
    /budget/i,
    /what\s*(are|'s)\s*(the\s*)?(price|cost|fee)/i,
    /service\s*fee/i,
    /platform\s*fee/i,
    /hidden\s*(fee|charge|cost)/i,
  ],
  
  // Trust & Safety
  trustSafety: [
    /is\s*(merry|it|this)\s*(safe|secure|legit|legitimate|trusted|reliable)/i,
    /can\s*i\s*trust/i,
    /scam/i,
    /fraud/i,
    /fake/i,
    /verified/i,
    /real/i,
    /safe\s*to\s*(book|use|pay)/i,
    /trustworthy/i,
    /reviews?\s*(real|fake|verified)/i,
  ],
  
  // Account
  account: [
    /create\s*(an?\s*)?account/i,
    /sign\s*up/i,
    /register/i,
    /log\s*in/i,
    /sign\s*in/i,
    /forgot\s*(my\s*)?(password|login)/i,
    /reset\s*(my\s*)?password/i,
    /delete\s*(my\s*)?account/i,
    /change\s*(my\s*)?(email|password|phone|profile)/i,
    /account\s*(settings?|profile)/i,
    /my\s*account/i,
  ],
  
  // Become a host
  becomeHost: [
    /become\s*(a\s*)?host/i,
    /list\s*(my\s*)?(property|place|home|hotel|car|tour|service)/i,
    /host\s*(my\s*)?property/i,
    /add\s*(my\s*)?(listing|property)/i,
    /register\s*(as\s*)?host/i,
    /partner\s*with/i,
    /how\s*(do|can)\s*i\s*(become|be|start|register)\s*(as\s*)?(a\s*)?host/i,
    /host\s*application/i,
    /earn\s*money\s*hosting/i,
    /rent\s*out\s*(my|a)/i,
  ],
};

// ============================================================================
// COMPREHENSIVE FAQS - Extended with Platform Knowledge
// ============================================================================

// ============================================================================
// COMPREHENSIVE DESTINATION KNOWLEDGE BASE
// ============================================================================

const DESTINATIONS = {
  // RWANDA
  kigali: {
    country: "Rwanda",
    type: "city",
    highlights: ["Kigali Genocide Memorial", "Kimironko Market", "Inema Arts Center", "Nyamirambo neighborhood", "Convention Center"],
    bestFor: ["culture", "city exploration", "nightlife", "cuisine", "business"],
    budget: { low: 50, mid: 120, high: 300 },
    bestMonths: [1, 2, 6, 7, 8, 9, 12],
    drySeasons: ["June-September", "December-February"],
    tips: [
      "Kigali is one of Africa's cleanest and safest capital cities",
      "Moto-taxis (motorcycle taxis) are cheap and efficient for getting around",
      "Try local coffee at Question Coffee or Bourbon Coffee",
      "The Genocide Memorial is a must-visit for understanding Rwanda's history",
      "Nightlife centers around Kimihurura and Nyamirambo neighborhoods"
    ],
    nearbyAttractions: ["Volcanoes National Park (2.5h)", "Lake Kivu (4h)", "Akagera National Park (2.5h)"],
    averageStay: "2-3 days",
    cuisine: ["Brochettes", "Isombe", "Ugali", "Roasted plantains", "Local beer (Primus, Mutzig)"],
  },
  
  volcanoes_np: {
    country: "Rwanda",
    type: "national_park",
    fullName: "Volcanoes National Park",
    highlights: ["Mountain gorilla trekking", "Golden monkey tracking", "Dian Fossey tomb hike", "Bisoke volcano hike", "Karisimbi summit"],
    bestFor: ["wildlife", "gorillas", "hiking", "photography", "nature"],
    budget: { low: 800, mid: 1200, high: 2500 },
    permitCost: 1500,
    bestMonths: [1, 2, 6, 7, 8, 9, 12],
    drySeasons: ["June-September", "December-February"],
    tips: [
      "Gorilla permits cost $1,500 and should be booked months in advance",
      "Physical fitness required - treks can last 1-8 hours depending on gorilla family location",
      "Bring waterproof layers, hiking boots, and gardening gloves for vegetation",
      "You spend exactly 1 hour with the gorillas once found",
      "Golden monkey tracking is a great add-on at $100",
      "Bisoke volcano hike offers stunning crater lake views"
    ],
    nearbyAttractions: ["Musanze town", "Twin Lakes (Burera & Ruhondo)", "Kigali (2.5h)"],
    averageStay: "2-3 days",
    difficulty: "moderate-challenging",
  },
  
  lake_kivu: {
    country: "Rwanda",
    type: "lake",
    highlights: ["Kayaking", "Island hopping", "Beach relaxation", "Coffee tours", "Hot springs"],
    towns: ["Gisenyi/Rubavu", "Kibuye/Karongi", "Cyangugu/Rusizi"],
    bestFor: ["relaxation", "water activities", "romantic", "beach", "scenic views"],
    budget: { low: 60, mid: 150, high: 400 },
    bestMonths: [1, 2, 6, 7, 8, 9, 12],
    tips: [
      "Gisenyi has the best beach atmosphere with lakefront hotels and restaurants",
      "Take a boat to Napoleon Island to see fruit bats",
      "Coffee tours at local cooperatives are excellent",
      "The lake has methane so no traditional fishing boats - use motorboats",
      "Beautiful sunset views over the Congo mountains"
    ],
    nearbyAttractions: ["Volcanoes National Park (1.5h from Gisenyi)", "Nyungwe Forest (3h from Cyangugu)"],
    averageStay: "2-4 days",
  },
  
  nyungwe_forest: {
    country: "Rwanda",
    type: "national_park",
    fullName: "Nyungwe Forest National Park",
    highlights: ["Canopy walkway", "Chimpanzee tracking", "Colobus monkey trails", "Waterfall hikes", "Bird watching"],
    bestFor: ["primates", "hiking", "birding", "nature", "adventure"],
    budget: { low: 150, mid: 300, high: 600 },
    bestMonths: [6, 7, 8, 9],
    tips: [
      "Canopy walkway is 70m high and 200m long - stunning views",
      "Chimpanzee tracking permits are $90 - much cheaper than gorillas",
      "Over 300 bird species including 27 Albertine Rift endemics",
      "Trails range from easy 1-hour walks to challenging full-day hikes",
      "Bring rain gear - this is a rainforest!"
    ],
    nearbyAttractions: ["King's Palace Museum (Nyanza)", "Lake Kivu (2h)"],
    averageStay: "2-3 days",
    difficulty: "easy-moderate",
  },
  
  akagera_np: {
    country: "Rwanda",
    type: "national_park",
    fullName: "Akagera National Park",
    highlights: ["Big Five safari", "Boat safari on Lake Ihema", "Night drives", "Bird watching"],
    bestFor: ["safari", "wildlife", "photography", "big five"],
    budget: { low: 100, mid: 250, high: 500 },
    bestMonths: [6, 7, 8, 9, 12, 1, 2],
    tips: [
      "Only Big Five destination in Rwanda - lions and rhinos reintroduced",
      "Boat safari on Lake Ihema is excellent for hippos, crocodiles, and birds",
      "Self-drive is possible or book guided game drives",
      "Night drives available for nocturnal wildlife",
      "Much more affordable than East African safaris in Tanzania/Kenya"
    ],
    nearbyAttractions: ["Kigali (2.5h)"],
    averageStay: "1-2 days",
    difficulty: "easy",
  },

  // UGANDA
  kampala: {
    country: "Uganda",
    type: "city",
    highlights: ["Kasubi Tombs", "Uganda Museum", "Ndere Cultural Center", "Owino Market", "Namugongo Martyrs Shrine"],
    bestFor: ["culture", "city exploration", "nightlife", "business"],
    budget: { low: 40, mid: 100, high: 250 },
    bestMonths: [1, 2, 6, 7, 8, 9, 12],
    tips: [
      "Traffic can be intense - factor extra time for travel",
      "Boda-bodas (motorcycle taxis) are quick but can be risky",
      "Rolex (chapati egg wrap) is the iconic street food",
      "Craft markets at Exposure Africa for souvenirs",
      "Nightlife centers around Kololo and Bugolobi"
    ],
    nearbyAttractions: ["Jinja/Source of Nile (2h)", "Lake Victoria islands", "Murchison Falls (5h)"],
    averageStay: "1-2 days",
    cuisine: ["Rolex", "Luwombo", "Matoke", "Groundnut sauce", "Nile Beer"],
  },
  
  bwindi: {
    country: "Uganda",
    type: "national_park",
    fullName: "Bwindi Impenetrable National Park",
    highlights: ["Mountain gorilla trekking", "Batwa cultural experience", "Forest walks", "Bird watching"],
    bestFor: ["gorillas", "wildlife", "hiking", "culture"],
    budget: { low: 500, mid: 900, high: 1800 },
    permitCost: 800,
    bestMonths: [1, 2, 6, 7, 8, 9, 12],
    tips: [
      "Gorilla permits $800 - more affordable than Rwanda",
      "Four sectors: Buhoma, Ruhija, Rushaga, Nkuringo - each has different lodges",
      "Buhoma is most accessible, Nkuringo most scenic but steeper terrain",
      "Batwa pygmy cultural experience is deeply moving",
      "Consider combining with Queen Elizabeth for varied wildlife"
    ],
    nearbyAttractions: ["Queen Elizabeth NP (3h)", "Lake Bunyonyi (1h)", "Kigali, Rwanda (4h)"],
    averageStay: "2-3 days",
    difficulty: "moderate-challenging",
  },
  
  queen_elizabeth_np: {
    country: "Uganda",
    type: "national_park",
    fullName: "Queen Elizabeth National Park",
    highlights: ["Tree-climbing lions (Ishasha)", "Kazinga Channel boat cruise", "Crater lakes", "Chimpanzee tracking (Kyambura)"],
    bestFor: ["safari", "wildlife", "boat safari", "photography"],
    budget: { low: 150, mid: 350, high: 700 },
    bestMonths: [1, 2, 6, 7, 8, 9, 12],
    tips: [
      "Tree-climbing lions in Ishasha sector are unique to this park",
      "Kazinga Channel cruise offers guaranteed hippo and elephant sightings",
      "Kyambura Gorge chimp tracking is excellent and affordable",
      "Combine with Bwindi for gorillas on same trip"
    ],
    nearbyAttractions: ["Bwindi (3h)", "Lake Bunyonyi (2h)", "Kibale Forest (2h)"],
    averageStay: "2-3 days",
    difficulty: "easy-moderate",
  },
  
  murchison_falls_np: {
    country: "Uganda",
    type: "national_park",
    fullName: "Murchison Falls National Park",
    highlights: ["The Falls", "Boat cruise to the falls", "Game drives", "Chimpanzee tracking (Budongo)"],
    bestFor: ["safari", "wildlife", "waterfalls", "photography"],
    budget: { low: 150, mid: 350, high: 700 },
    bestMonths: [1, 2, 6, 7, 8, 9, 12],
    tips: [
      "The world's most powerful waterfall - Nile forces through 7m gap",
      "Boat cruise from Paraa to the base of falls is spectacular",
      "Good chance of seeing all Big Five",
      "Budongo Forest nearby for chimpanzee tracking",
      "Rhino tracking available at Ziwa Rhino Sanctuary en route"
    ],
    nearbyAttractions: ["Ziwa Rhino Sanctuary", "Kampala (5h)"],
    averageStay: "2-3 days",
    difficulty: "easy",
  },
  
  jinja: {
    country: "Uganda",
    type: "town",
    highlights: ["Source of the Nile", "White water rafting", "Bungee jumping", "Kayaking", "Quad biking"],
    bestFor: ["adventure", "water sports", "backpackers", "adrenaline"],
    budget: { low: 30, mid: 80, high: 200 },
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    tips: [
      "Adventure capital of East Africa",
      "Grade 5 white water rafting on the Nile is world-class",
      "Good backpacker scene with affordable hostels",
      "Boat cruise to the source of the Nile is a must",
      "Bungee jumping over the Nile is unforgettable"
    ],
    nearbyAttractions: ["Kampala (2h)", "Lake Victoria"],
    averageStay: "2-3 days",
    difficulty: "varies",
  },

  // KENYA
  nairobi: {
    country: "Kenya",
    type: "city",
    highlights: ["Nairobi National Park", "David Sheldrick Elephant Orphanage", "Giraffe Centre", "Karen Blixen Museum", "Kazuri Beads"],
    bestFor: ["culture", "wildlife day trips", "city exploration", "business"],
    budget: { low: 50, mid: 130, high: 350 },
    bestMonths: [1, 2, 7, 8, 9, 10],
    tips: [
      "Only capital city with a national park - see lions with skyline backdrop",
      "Visit Sheldrick Elephant Orphanage at 11am for feeding time",
      "Giraffe Centre lets you feed endangered Rothschild giraffes",
      "Kazuri Beads factory tour supports single mothers",
      "Traffic is notorious - use Uber or negotiate taxi fares"
    ],
    nearbyAttractions: ["Masai Mara (5h)", "Lake Naivasha (1.5h)", "Mount Kenya (3h)"],
    averageStay: "1-2 days",
    cuisine: ["Nyama Choma", "Ugali", "Sukuma Wiki", "Pilau", "Tusker beer"],
  },
  
  masai_mara: {
    country: "Kenya",
    type: "national_reserve",
    fullName: "Masai Mara National Reserve",
    highlights: ["Great Migration", "Big Five", "Balloon safaris", "Maasai village visits", "Night game drives"],
    bestFor: ["safari", "wildlife", "migration", "photography", "bucket list"],
    budget: { low: 250, mid: 500, high: 1500 },
    bestMonths: [7, 8, 9, 10],
    migrationMonths: [7, 8, 9, 10],
    tips: [
      "Great Migration river crossings happen July-October",
      "Stay in conservancies for fewer crowds and night drives",
      "Hot air balloon safaris at sunrise are magical",
      "Visit a Maasai village to learn about their culture",
      "Book well in advance for peak migration season (Aug-Sep)"
    ],
    nearbyAttractions: ["Lake Naivasha", "Nairobi (5h)", "Serengeti, Tanzania"],
    averageStay: "3-4 days",
    difficulty: "easy",
  },
  
  diani_beach: {
    country: "Kenya",
    type: "beach",
    highlights: ["White sand beaches", "Snorkeling", "Kite surfing", "Colobus monkeys", "Wasini Island"],
    bestFor: ["beach", "relaxation", "water sports", "honeymoon"],
    budget: { low: 60, mid: 150, high: 400 },
    bestMonths: [1, 2, 7, 8, 9, 10, 12],
    tips: [
      "Best beach in Kenya - powder white sand and turquoise water",
      "Colobus monkey conservation makes beach walks special",
      "Kite surfing conditions excellent June-September",
      "Day trip to Wasini Island for snorkeling and seafood",
      "Skip April-May rainy season"
    ],
    nearbyAttractions: ["Mombasa (30min)", "Shimba Hills NR (1h)", "Wasini Island"],
    averageStay: "3-5 days",
    difficulty: "easy",
  },
  
  amboseli_np: {
    country: "Kenya",
    type: "national_park",
    fullName: "Amboseli National Park",
    highlights: ["Mount Kilimanjaro views", "Elephant herds", "Maasai culture", "Bird watching"],
    bestFor: ["elephants", "photography", "kilimanjaro views", "safari"],
    budget: { low: 200, mid: 400, high: 900 },
    bestMonths: [1, 2, 6, 7, 8, 9, 10, 11, 12],
    tips: [
      "Best place in Africa for elephant photography with Kilimanjaro backdrop",
      "Early morning has clearest Kilimanjaro views before clouds form",
      "Some of Africa's largest elephant herds",
      "Combine with Tsavo for diverse safari experience",
      "Dry season (June-October) best for wildlife concentration"
    ],
    nearbyAttractions: ["Tsavo NP", "Nairobi (4h)", "Mombasa"],
    averageStay: "2-3 days",
    difficulty: "easy",
  },

  // TANZANIA
  serengeti_np: {
    country: "Tanzania",
    type: "national_park",
    fullName: "Serengeti National Park",
    highlights: ["Great Migration", "Big Five", "Endless plains", "Balloon safaris", "Predator action"],
    bestFor: ["safari", "migration", "wildlife", "photography", "bucket list"],
    budget: { low: 300, mid: 600, high: 2000 },
    bestMonths: [1, 2, 6, 7, 12],
    migrationMonths: [1, 2, 11, 12], // Calving season in southern Serengeti
    tips: [
      "Serengeti means 'endless plains' in Maasai - it lives up to the name",
      "Migration is circular - animals are always somewhere in the ecosystem",
      "Southern Serengeti (Ndutu) best for calving season (Jan-Feb)",
      "Central Serengeti (Seronera) good year-round",
      "Northern Serengeti for river crossings (July-September)"
    ],
    nearbyAttractions: ["Ngorongoro Crater (3h)", "Lake Manyara", "Arusha"],
    averageStay: "3-5 days",
    difficulty: "easy",
  },
  
  ngorongoro_crater: {
    country: "Tanzania",
    type: "conservation_area",
    fullName: "Ngorongoro Conservation Area",
    highlights: ["Crater floor safari", "Big Five in one day", "Maasai homeland", "Olduvai Gorge"],
    bestFor: ["safari", "big five", "unique landscape", "photography"],
    budget: { low: 250, mid: 500, high: 1200 },
    bestMonths: [6, 7, 8, 9, 1, 2],
    tips: [
      "World's largest intact volcanic caldera - 260 sq km floor",
      "One of few places to see rhino in Tanzania",
      "Can see Big Five in a single day on crater floor",
      "Olduvai Gorge nearby - 'Cradle of Mankind' archaeological site",
      "Vehicles limited on crater floor - book early"
    ],
    nearbyAttractions: ["Serengeti (3h)", "Lake Manyara (1.5h)", "Arusha (3h)"],
    averageStay: "1-2 days",
    difficulty: "easy",
  },
  
  zanzibar: {
    country: "Tanzania",
    type: "island",
    highlights: ["Stone Town", "Spice tours", "Beach relaxation", "Snorkeling", "Prison Island"],
    bestFor: ["beach", "history", "culture", "relaxation", "honeymoon"],
    budget: { low: 50, mid: 120, high: 400 },
    bestMonths: [1, 2, 6, 7, 8, 9, 10, 12],
    tips: [
      "Stone Town is UNESCO World Heritage - fascinating Swahili architecture",
      "Spice tour is a must - learn about Zanzibar's spice trade history",
      "Nungwi and Kendwa have best beaches in the north",
      "Paje and Jambiani great for kite surfing",
      "Perfect add-on after mainland safari"
    ],
    nearbyAttractions: ["Dar es Salaam ferry", "Mafia Island", "Pemba Island"],
    averageStay: "3-5 days",
    difficulty: "easy",
  },
  
  kilimanjaro: {
    country: "Tanzania",
    type: "mountain",
    fullName: "Mount Kilimanjaro",
    highlights: ["Summit Africa's highest peak", "Multiple route options", "Glaciers", "Diverse ecosystems"],
    bestFor: ["hiking", "adventure", "bucket list", "challenge"],
    budget: { low: 1500, mid: 2500, high: 4500 },
    bestMonths: [1, 2, 8, 9],
    tips: [
      "Africa's highest peak at 5,895m - no technical climbing required",
      "Machame and Lemosho routes have best acclimatization",
      "Minimum 6-7 days recommended for summit success",
      "Altitude sickness is the main challenge - go slow",
      "Porter system provides employment for local communities"
    ],
    nearbyAttractions: ["Arusha", "Ngorongoro", "Amboseli (Kenya)"],
    averageStay: "6-9 days",
    difficulty: "challenging",
  },

  // ZAMBIA
  victoria_falls_zambia: {
    country: "Zambia",
    type: "waterfall",
    fullName: "Victoria Falls (Zambia side)",
    highlights: ["Devil's Pool", "Knife Edge Bridge", "Bungee jumping", "Sunset cruises", "Helicopter flights"],
    bestFor: ["waterfalls", "adventure", "photography", "bucket list"],
    budget: { low: 80, mid: 200, high: 500 },
    bestMonths: [2, 3, 4, 5, 8, 9, 10], // Feb-May peak water, Aug-Oct Devil's Pool
    tips: [
      "Zambia side gives closest access to the falls and Devil's Pool",
      "Devil's Pool swim (Sep-Dec) is a once-in-a-lifetime experience",
      "February-May has most water but lots of spray obscures views",
      "August-October best balance of water and visibility",
      "Combine with Botswana/Zimbabwe for multi-country trip"
    ],
    nearbyAttractions: ["Chobe NP, Botswana", "Victoria Falls, Zimbabwe", "Lower Zambezi NP"],
    averageStay: "2-3 days",
    difficulty: "easy-moderate",
  },
  
  south_luangwa_np: {
    country: "Zambia",
    type: "national_park",
    fullName: "South Luangwa National Park",
    highlights: ["Walking safaris (birthplace)", "Night drives", "Leopard sightings", "Wild dogs", "Hippo pools"],
    bestFor: ["walking safari", "wildlife", "leopards", "authentic safari"],
    budget: { low: 200, mid: 450, high: 1200 },
    bestMonths: [5, 6, 7, 8, 9, 10],
    tips: [
      "Birthplace of the walking safari - best in Africa",
      "Highest leopard density in Africa - excellent sightings",
      "Dry season (May-Oct) concentrates wildlife at Luangwa River",
      "Wild dog packs often seen",
      "Authentic, uncrowded safari experience"
    ],
    nearbyAttractions: ["North Luangwa NP", "Lusaka"],
    averageStay: "3-5 days",
    difficulty: "moderate",
  },

  lower_zambezi_np: {
    country: "Zambia",
    type: "national_park",
    fullName: "Lower Zambezi National Park",
    highlights: ["Canoe safaris", "Fishing (tiger fish)", "Game drives", "Elephant herds", "River views"],
    bestFor: ["canoeing", "fishing", "elephants", "scenic", "exclusive"],
    budget: { low: 300, mid: 600, high: 1500 },
    bestMonths: [5, 6, 7, 8, 9, 10],
    tips: [
      "Canoe safari alongside elephants and hippos is unforgettable",
      "Tiger fish fishing is world-class",
      "Most exclusive and expensive Zambian park",
      "Faces Mana Pools (Zimbabwe) across the Zambezi",
      "Combines well with South Luangwa"
    ],
    nearbyAttractions: ["Victoria Falls", "South Luangwa"],
    averageStay: "3-4 days",
    difficulty: "moderate",
  },
};

// ============================================================================
// ACTIVITY / EXPERIENCE KNOWLEDGE
// ============================================================================

const ACTIVITIES = {
  gorilla_trekking: {
    name: "Mountain Gorilla Trekking",
    locations: ["Volcanoes NP (Rwanda)", "Bwindi (Uganda)", "Mgahinga (Uganda)"],
    cost: { rwanda: 1500, uganda: 800 },
    duration: "Full day (1-8 hours trekking, 1 hour with gorillas)",
    difficulty: "moderate-challenging",
    bestMonths: [1, 2, 6, 7, 8, 9, 12],
    tips: [
      "Book permits 3-6 months in advance, especially for Rwanda dry season",
      "Physically demanding - prepare with cardio training",
      "Bring waterproof gear, hiking boots, long sleeves, and gardening gloves",
      "Porter hire ($15-20) strongly recommended",
      "Uganda is more affordable; Rwanda more accessible but pricier"
    ],
    whatToExpect: "Once the trackers locate the gorilla family, you'll have exactly 1 hour to observe and photograph them. It's an emotional, life-changing experience seeing these gentle giants in their natural habitat.",
  },
  
  safari_game_drive: {
    name: "Safari Game Drive",
    locations: ["Masai Mara", "Serengeti", "Ngorongoro", "Akagera", "Queen Elizabeth", "South Luangwa"],
    cost: { budget: 150, midrange: 300, luxury: 800 },
    duration: "3-4 hours per drive, typically early morning and late afternoon",
    difficulty: "easy",
    tips: [
      "Early morning (6am) and late afternoon (4pm) drives have best wildlife activity",
      "Bring binoculars, camera with zoom lens, and neutral colored clothing",
      "Patience is key - great sightings often require waiting",
      "Private vehicle gives flexibility; shared is more affordable",
      "Tip your guide and driver at end of safari"
    ],
    whatToExpect: "Drive through savanna, woodland, and river systems while your guide tracks wildlife. Expect to see numerous herbivores and with luck, predators like lions and leopards.",
  },

  walking_safari: {
    name: "Walking Safari",
    locations: ["South Luangwa (Zambia)", "Mana Pools (Zimbabwe)", "Selous (Tanzania)", "Masai Mara conservancies"],
    cost: { perDay: 400 },
    duration: "2-4 hours typically, or multi-day mobile walking safaris",
    difficulty: "moderate",
    tips: [
      "The most immersive and authentic safari experience",
      "Armed ranger accompanies all walks for safety",
      "Learn tracking skills, plant identification, and ecological connections",
      "South Luangwa invented the walking safari - still the best",
      "Multi-day walking safaris sleeping in fly camps are transformative"
    ],
    whatToExpect: "Walk quietly through the bush with an armed guide. You'll learn to read animal tracks, understand the ecosystem at ground level, and potentially have close encounters with wildlife on foot.",
  },

  balloon_safari: {
    name: "Hot Air Balloon Safari",
    locations: ["Masai Mara", "Serengeti"],
    cost: { perPerson: 450 },
    duration: "1 hour flight + champagne breakfast",
    difficulty: "easy",
    tips: [
      "Departs at sunrise - pick up around 5am",
      "Includes champagne breakfast in the bush after landing",
      "Book in advance - limited capacity",
      "Stunning during migration season",
      "Once-in-a-lifetime experience"
    ],
    whatToExpect: "Float silently over the African savanna at dawn, watching wildlife wake up below. Land in the bush for a champagne breakfast served on white linen.",
  },

  white_water_rafting: {
    name: "White Water Rafting",
    locations: ["Jinja (Uganda) - Nile River", "Victoria Falls (Zambia/Zimbabwe) - Zambezi River"],
    cost: { halfDay: 125, fullDay: 175 },
    duration: "Half day to full day",
    difficulty: "moderate-challenging",
    tips: [
      "Nile at Jinja offers Grade 5 rapids - world class",
      "Zambezi below Victoria Falls is equally thrilling",
      "No experience needed - guides control the raft",
      "Secure cameras or use GoPro mounts",
      "Bring change of clothes"
    ],
    whatToExpect: "Paddle through churning white water rapids, interspersed with calm sections for swimming. Lunch provided on full-day trips.",
  },

  chimp_tracking: {
    name: "Chimpanzee Tracking",
    locations: ["Kibale Forest (Uganda)", "Nyungwe Forest (Rwanda)", "Mahale (Tanzania)", "Gombe (Tanzania)"],
    cost: { kibale: 200, nyungwe: 90, mahale: 100 },
    duration: "2-5 hours",
    difficulty: "moderate",
    tips: [
      "Kibale has highest chimp density and best habituation",
      "Nyungwe is more affordable and less crowded",
      "Chimps are fast-moving - be prepared to keep up",
      "1 hour viewing time once found",
      "Habituated chimp experience (4 hours) available in Kibale"
    ],
    whatToExpect: "Trek through tropical forest following chimp calls and spotter guidance. Watch our closest relatives play, groom, and interact in their natural habitat.",
  },
  
  snorkeling_diving: {
    name: "Snorkeling & Diving",
    locations: ["Zanzibar", "Diani Beach (Kenya)", "Pemba Island", "Lake Malawi"],
    cost: { snorkeling: 50, diving: 90 },
    duration: "Half day to full day",
    difficulty: "easy-moderate",
    tips: [
      "Mnemba Atoll (Zanzibar) has pristine coral and dolphins",
      "Diani marine park has great reef snorkeling",
      "Lake Malawi offers unique freshwater cichlid diving",
      "Best visibility June-October",
      "PADI certification courses available"
    ],
    whatToExpect: "Explore colorful coral reefs teeming with tropical fish, turtles, dolphins, and diverse marine life.",
  },
};

// ============================================================================
// TRAVEL INTELLIGENCE - ITINERARY TEMPLATES
// ============================================================================

const ITINERARY_TEMPLATES = {
  rwanda_highlights_7day: {
    name: "Rwanda Highlights - 7 Days",
    countries: ["Rwanda"],
    duration: 7,
    budget: { budget: 2500, midrange: 4500, luxury: 8000 },
    highlights: ["Gorilla trekking", "Kigali culture", "Lake Kivu relaxation"],
    itinerary: [
      { day: 1, location: "Kigali", activities: ["Genocide Memorial", "City tour", "Dinner at local restaurant"] },
      { day: 2, location: "Volcanoes NP", activities: ["Drive to Musanze", "Golden monkey tracking"] },
      { day: 3, location: "Volcanoes NP", activities: ["Gorilla trekking (main event!)"] },
      { day: 4, location: "Lake Kivu", activities: ["Drive to Gisenyi/Rubavu", "Lakeside relaxation"] },
      { day: 5, location: "Lake Kivu", activities: ["Kayaking", "Coffee tour", "Island visit"] },
      { day: 6, location: "Lake Kivu", activities: ["Morning at leisure", "Drive back to Kigali"] },
      { day: 7, location: "Kigali", activities: ["Shopping at markets", "Departure"] },
    ],
  },

  uganda_primates_10day: {
    name: "Uganda Primates & Wildlife - 10 Days",
    countries: ["Uganda"],
    duration: 10,
    budget: { budget: 2200, midrange: 4000, luxury: 7500 },
    highlights: ["Gorillas", "Chimps", "Tree-climbing lions", "Nile adventures"],
    itinerary: [
      { day: 1, location: "Kampala/Entebbe", activities: ["Arrive", "Optional botanical gardens"] },
      { day: 2, location: "Jinja", activities: ["Source of the Nile", "White water rafting"] },
      { day: 3, location: "Kibale Forest", activities: ["Long drive", "Evening at lodge"] },
      { day: 4, location: "Kibale Forest", activities: ["Chimpanzee tracking", "Bigodi wetland walk"] },
      { day: 5, location: "Queen Elizabeth NP", activities: ["Morning game drive", "Kazinga Channel boat cruise"] },
      { day: 6, location: "Ishasha/Bwindi", activities: ["Tree-climbing lions search", "Drive to Bwindi"] },
      { day: 7, location: "Bwindi", activities: ["Gorilla trekking (highlights!)"] },
      { day: 8, location: "Lake Bunyonyi", activities: ["Drive to lake", "Canoe, relax, swim"] },
      { day: 9, location: "Lake Bunyonyi/Kampala", activities: ["Morning leisure", "Long drive back"] },
      { day: 10, location: "Entebbe", activities: ["Departure"] },
    ],
  },

  kenya_tanzania_14day: {
    name: "Kenya & Tanzania Classic Safari - 14 Days",
    countries: ["Kenya", "Tanzania"],
    duration: 14,
    budget: { budget: 3500, midrange: 6500, luxury: 15000 },
    highlights: ["Masai Mara", "Serengeti", "Ngorongoro", "Zanzibar beaches"],
    itinerary: [
      { day: 1, location: "Nairobi", activities: ["Arrive", "Giraffe Centre or Elephant Orphanage"] },
      { day: 2, location: "Amboseli", activities: ["Drive to Amboseli", "Afternoon game drive"] },
      { day: 3, location: "Amboseli", activities: ["Full day game drives", "Kilimanjaro views"] },
      { day: 4, location: "Masai Mara", activities: ["Drive/fly to Mara", "Afternoon game drive"] },
      { day: 5, location: "Masai Mara", activities: ["Full day game drives", "Optional balloon safari"] },
      { day: 6, location: "Masai Mara", activities: ["Morning game drive", "Cross to Tanzania"] },
      { day: 7, location: "Serengeti", activities: ["Game drives on endless plains"] },
      { day: 8, location: "Serengeti", activities: ["Full day exploring different sectors"] },
      { day: 9, location: "Ngorongoro", activities: ["Drive to crater rim", "Sunset views"] },
      { day: 10, location: "Ngorongoro", activities: ["Crater floor game drive (Big Five!)"] },
      { day: 11, location: "Zanzibar", activities: ["Fly to Zanzibar", "Beach arrival"] },
      { day: 12, location: "Zanzibar", activities: ["Stone Town tour", "Spice tour"] },
      { day: 13, location: "Zanzibar", activities: ["Beach day", "Snorkeling"] },
      { day: 14, location: "Zanzibar/Departure", activities: ["Morning at leisure", "Fly out"] },
    ],
  },

  east_africa_21day: {
    name: "Ultimate East Africa - 21 Days",
    countries: ["Rwanda", "Uganda", "Kenya", "Tanzania"],
    duration: 21,
    budget: { budget: 5500, midrange: 10000, luxury: 25000 },
    highlights: ["Gorillas in Rwanda", "Chimps in Uganda", "Migration in Serengeti", "Zanzibar beaches"],
    bestFor: ["Once-in-a-lifetime trip", "Wildlife enthusiasts", "Photography"],
  },
};

// ============================================================================
// SEASONAL / TIMING INTELLIGENCE
// ============================================================================

const SEASONAL_INFO = {
  migration_calendar: {
    jan: { location: "Southern Serengeti (Ndutu)", event: "Calving season - 8000 babies born daily" },
    feb: { location: "Southern Serengeti", event: "Peak calving season, predator action" },
    mar: { location: "Central Serengeti", event: "Long rains begin, herds moving north" },
    apr: { location: "Central Serengeti", event: "Rainy season, green landscapes, fewer tourists" },
    may: { location: "Western Serengeti", event: "Herds reaching Grumeti River" },
    jun: { location: "Western Serengeti/Grumeti", event: "Grumeti River crossings begin" },
    jul: { location: "Northern Serengeti/Mara", event: "Mara River crossings begin" },
    aug: { location: "Masai Mara/Northern Serengeti", event: "Peak crossing season - dramatic action" },
    sep: { location: "Masai Mara", event: "Herds in the Mara, excellent wildlife" },
    oct: { location: "Masai Mara/Northern Serengeti", event: "Return migration south begins" },
    nov: { location: "Eastern Serengeti", event: "Short rains, herds moving south" },
    dec: { location: "Southern Serengeti", event: "Herds arrive in south for calving" },
  },
  
  gorilla_trekking_seasons: {
    best: [1, 2, 6, 7, 8, 9, 12],
    shoulder: [3, 5, 10, 11],
    rainy: [4], // but still possible
    note: "Dry seasons offer easier trekking conditions, but gorillas are there year-round.",
  },

  general_seasons: {
    east_africa_dry: { months: [6, 7, 8, 9, 10, 1, 2], description: "Prime safari season - dry weather, concentrated wildlife at water sources" },
    east_africa_wet: { months: [3, 4, 5, 11], description: "Green season - lush landscapes, fewer tourists, baby animals, lower prices" },
    coast_best: { months: [1, 2, 7, 8, 9, 10, 12], description: "Best beach weather - avoid April-May heavy rains" },
  },
};

// ============================================================================
// COMPREHENSIVE FAQS - Platform + Travel Knowledge Combined
// ============================================================================

const FAQS = [
  // BOOKING & PLATFORM
  {
    id: "book-stays",
    intent: "book_stays",
    keywords: ["book", "accommodation", "stay", "hotel", "apartment", "villa", "lodge", "room", "reserve"],
    answer: "You can book stays on Merry360X by searching destinations, selecting dates and guest count, then checking out. We have accommodations across Rwanda, Uganda, Kenya, Tanzania, and Zambia - from budget guesthouses to luxury safari lodges. Share your destination, dates, budget, and group size for personalized recommendations.",
  },
  {
    id: "book-tours",
    intent: "book_tours",
    keywords: ["tour", "package", "activity", "experience", "guide", "safari", "excursion"],
    answer: "Merry360X offers tours ranging from day trips to multi-week itineraries. Options include gorilla trekking, safari game drives, city tours, adventure activities, and cultural experiences. You can filter by location, duration, and pricing model. Tell me your interests (wildlife, culture, adventure, relaxation) and I'll suggest the perfect experiences.",
  },
  {
    id: "airport-transfer",
    intent: "airport_transfer",
    keywords: ["airport", "transfer", "pickup", "dropoff", "kigali", "nairobi", "entebbe", "route"],
    answer: "Airport transfer services are available at major airports including Kigali (KGL), Nairobi (NBO/WIL), Entebbe (EBB), Dar es Salaam (DAR), and Kilimanjaro (JRO). Services include private vehicles, shared shuttles, and connections to safari starting points. Book in advance for seamless arrival.",
  },
  {
    id: "car-rental",
    intent: "car_rental",
    keywords: ["car", "rental", "vehicle", "driver", "4x4", "self-drive", "daily", "weekly"],
    answer: "Car rentals available with daily, weekly, and monthly rates. 4x4 vehicles recommended for national parks and rough terrain. Self-drive requires international driving permit; driver-inclusive options available for safari routes. Share your dates, route plan, and preferences (automatic/manual, with or without driver) for the best match.",
  },
  {
    id: "payment-methods",
    intent: "payment_methods",
    keywords: ["payment", "pay", "mobile", "money", "card", "bank", "mtn", "airtel", "mpesa", "zamtel", "visa", "mastercard"],
    answer: "Merry360X supports multiple payment methods: Mobile Money (MTN, Airtel, M-Pesa, Zamtel), card payments (Visa, Mastercard via Flutterwave), and bank transfers. Mobile money is fastest for East African users. International cards work for foreign travelers. All transactions are secured and encrypted.",
  },
  {
    id: "refund-cancellation",
    intent: "refund_cancellation",
    keywords: ["refund", "cancel", "cancellation", "policy", "money back", "reschedule"],
    answer: "Refund policies vary by listing - most accommodations offer full refund 7+ days before check-in. Gorilla permits are non-refundable but can be rescheduled. Check each listing's specific cancellation policy before booking. For emergencies, contact support with your booking ID for case-by-case assistance.",
  },
  {
    id: "service-fees",
    intent: "fees_pricing",
    keywords: ["fee", "service fee", "charges", "total", "cost", "price", "how much"],
    answer: "Pricing includes accommodation/service cost plus a small platform fee (typically 5-15%). Gorilla permits ($1,500 Rwanda, $800 Uganda) are charged separately. Safari packages often bundle transport, accommodation, park fees, and guide services. Ask for a detailed breakdown of any booking.",
  },
  {
    id: "host-onboarding",
    intent: "become_host",
    keywords: ["host", "become", "list", "onboard", "application", "property", "listing"],
    answer: "Become a host by submitting an application with property/service details, photos, and pricing. After verification and approval, you can manage bookings through your host dashboard. Hosts receive earnings minus platform commission directly to their preferred payout method.",
  },
  {
    id: "support-help",
    intent: "support_contact",
    keywords: ["support", "help", "issue", "problem", "contact", "chat", "emergency"],
    answer: "Use in-app support chat for booking, payment, and account issues - include your booking ID for faster resolution. For urgent travel emergencies on active trips, call our 24/7 emergency line. Response times: chat (under 2 hours), email (within 24 hours).",
  },
  
  // DESTINATION GUIDANCE
  {
    id: "dest-rwanda",
    intent: "destination_info",
    keywords: ["rwanda", "kigali", "volcanoes", "gorilla", "kivu", "nyungwe", "akagera"],
    answer: "Rwanda is the 'Land of a Thousand Hills' - compact, safe, and incredibly diverse. Must-sees: gorilla trekking in Volcanoes NP, Kigali's culture and genocide memorial, Lake Kivu relaxation, Nyungwe chimps, and Akagera safari. Best times: June-September and December-February (dry seasons). 7-10 days ideal for highlights.",
  },
  {
    id: "dest-uganda",
    intent: "destination_info",
    keywords: ["uganda", "kampala", "bwindi", "queen elizabeth", "murchison", "jinja", "gorilla"],
    answer: "Uganda is the 'Pearl of Africa' - gorillas at better prices than Rwanda, plus chimps, tree-climbing lions, Nile adventures, and the Big Five. Highlights: Bwindi gorillas, Kibale chimps, Queen Elizabeth safari, Murchison Falls, Jinja white water rafting. Budget-friendly for amazing wildlife.",
  },
  {
    id: "dest-kenya",
    intent: "destination_info",
    keywords: ["kenya", "nairobi", "masai mara", "mara", "migration", "diani", "amboseli", "coast"],
    answer: "Kenya is the classic African safari destination. The Great Migration in Masai Mara (July-October) is wildlife at its most dramatic. Add Amboseli for Kilimanjaro-backed elephants, Nairobi for culture, and Diani Beach for coast relaxation. Well-developed tourism infrastructure with options at every budget level.",
  },
  {
    id: "dest-tanzania",
    intent: "destination_info",
    keywords: ["tanzania", "serengeti", "ngorongoro", "kilimanjaro", "zanzibar", "safari"],
    answer: "Tanzania combines world-class safari and beach. The Serengeti-Ngorongoro circuit is legendary - endless plains, the crater's concentrated wildlife, and year-round migration presence. Summit Kilimanjaro for the ultimate challenge, then unwind on Zanzibar's spice island beaches. Allow 12-16 days for safari + beach combo.",
  },
  {
    id: "dest-zambia",
    intent: "destination_info",
    keywords: ["zambia", "victoria falls", "luangwa", "kafue", "zambezi", "livingstone"],
    answer: "Zambia offers authentic safari without crowds. South Luangwa is the birthplace of walking safaris with exceptional leopard sightings. Victoria Falls (Zambian side) provides closest access and Devil's Pool swim. Lower Zambezi for canoe safaris. Less touristy than neighbors - great for safari purists.",
  },
  
  // GORILLA SPECIFIC
  {
    id: "gorilla-permits",
    intent: "gorilla_trekking",
    keywords: ["gorilla", "permit", "trekking", "cost", "price", "book", "availability"],
    answer: "Gorilla permits: Rwanda $1,500/person, Uganda $800/person. Both offer magical encounters with mountain gorillas in their natural habitat. Rwanda is easier access (2.5h from Kigali); Uganda requires longer drive but costs less. Book 3-6 months ahead for dry season (June-Sept, Dec-Feb). Each permit includes 1 hour with a gorilla family.",
  },
  {
    id: "gorilla-fitness",
    intent: "gorilla_trekking",
    keywords: ["gorilla", "fitness", "difficult", "hard", "trek", "hiking", "prepare"],
    answer: "Gorilla trekking difficulty varies by family location - treks range from 1-8 hours through dense jungle terrain. Moderate fitness recommended. Tips: cardio prep beforehand, hire a porter ($15-20), bring waterproof layers, hiking boots, and gardening gloves. Rangers assign families based on your fitness level if you mention limitations.",
  },
  {
    id: "gorilla-packing",
    intent: "gorilla_trekking",
    keywords: ["gorilla", "pack", "bring", "wear", "gear", "clothes", "prepare"],
    answer: "Gorilla trekking essentials: waterproof jacket/pants (it's rainforest!), sturdy hiking boots, long pants and long sleeves (vegetation protection), gardening gloves (for grabbing vegetation), camera (no flash), water, snacks, and small backpack. Layers are key - mornings can be cold at altitude, but you'll warm up hiking.",
  },
  
  // SAFARI & WILDLIFE
  {
    id: "safari-best-time",
    intent: "safari_planning",
    keywords: ["safari", "best time", "when", "season", "dry", "wet", "visit"],
    answer: "Best safari time: Dry season (June-October) concentrates wildlife at water sources - easier viewing. Green season (Nov-May) offers lush landscapes, fewer tourists, baby animals, and lower prices. For wildebeest migration: July-October in Masai Mara for river crossings, January-February in Serengeti for calving. Each season has unique advantages.",
  },
  {
    id: "migration",
    intent: "migration_info",
    keywords: ["migration", "wildebeest", "crossing", "river", "mara", "serengeti", "when"],
    answer: "The Great Migration is circular and never stops. Calendar: Jan-Feb - calving in southern Serengeti; Jun-Jul - Grumeti crossings; Jul-Oct - Mara River crossings (peak drama); Nov-Dec - return south. The herds are always somewhere - timing your visit depends on what you want to see. River crossings are unpredictable but spectacular.",
  },
  {
    id: "safari-budget",
    intent: "safari_planning",
    keywords: ["safari", "budget", "cost", "cheap", "affordable", "expensive", "price"],
    answer: "Safari budgets range widely: Budget ($150-200/day) - basic lodges, shared vehicles; Mid-range ($300-500/day) - comfortable lodges, private vehicle; Luxury ($600-2000+/day) - exclusive camps, premium experiences. Key costs: park fees, transport, accommodation, guides. Rwanda's Akagera and Uganda parks offer great value. Serengeti/Mara are pricier but iconic.",
  },
  {
    id: "big-five",
    intent: "wildlife_info",
    keywords: ["big five", "lion", "leopard", "elephant", "rhino", "buffalo", "see"],
    answer: "Big Five locations: Masai Mara, Serengeti, and Ngorongoro are your best bets for all five in classic safari setting. Akagera (Rwanda) has reintroduced lions and rhinos. Kenya's Ol Pejeta has highest rhino concentration (including rare northern whites). For specific animals: South Luangwa for leopards, Amboseli for elephants, Ngorongoro for rhino.",
  },
  
  // PRACTICAL TRAVEL
  {
    id: "visa-requirements",
    intent: "travel_practical",
    keywords: ["visa", "entry", "requirements", "eac", "tourist", "passport"],
    answer: "East Africa visa: Most nationalities need visas. Options include single-entry visas and the East Africa Tourist Visa ($100, covers Kenya-Uganda-Rwanda for 90 days - great for multi-country trips). Tanzania and Zambia require separate visas. Many countries offer e-visa or visa on arrival. Check your specific nationality requirements before travel.",
  },
  {
    id: "health-vaccinations",
    intent: "travel_practical",
    keywords: ["vaccination", "vaccine", "health", "yellow fever", "malaria", "medicine"],
    answer: "Health prep: Yellow fever vaccination required/recommended for East Africa (carry your card). Malaria prophylaxis essential for safari areas - consult your doctor for prescription options. Bring insect repellent (DEET-based). Routine vaccines should be up to date. Travel insurance with medical evacuation coverage is strongly recommended.",
  },
  {
    id: "safety-security",
    intent: "safety",
    keywords: ["safety", "safe", "dangerous", "security", "crime", "secure"],
    answer: "East Africa is generally safe for tourists. Rwanda is exceptionally safe; Kenya and Tanzania have well-established tourism. Standard precautions: don't flash valuables, use reputable transport, keep copies of documents, stay aware in cities at night. Safari areas are very safe - your biggest concerns are wildlife, not crime. Follow guide instructions always.",
  },
  {
    id: "currency-money",
    intent: "travel_practical",
    keywords: ["currency", "money", "atm", "exchange", "usd", "cash", "dollar"],
    answer: "Currency tips: USD widely accepted for tourism (safari, permits, some hotels) - bring crisp bills dated 2013+. Local currencies: RWF (Rwanda), UGX (Uganda), KES (Kenya), TZS (Tanzania), ZMW (Zambia). ATMs available in cities. Cards accepted at major hotels/restaurants. Safari lodges prefer USD. Mobile money is ubiquitous for local transactions.",
  },
  
  // TRIP PLANNING
  {
    id: "how-long",
    intent: "trip_planning",
    keywords: ["how long", "days", "duration", "time", "enough", "minimum", "recommend"],
    answer: "Trip duration recommendations: Gorilla trekking only (Rwanda): 3-4 days. Rwanda highlights: 7-10 days. Uganda gorillas + safari: 10-12 days. Classic Kenya/Tanzania safari: 7-10 days. Safari + beach combo: 12-14 days. Multi-country East Africa: 2-3 weeks. Allow buffer days for travel between locations - distances can be longer than maps suggest.",
  },
  {
    id: "first-time-africa",
    intent: "trip_planning",
    keywords: ["first time", "never been", "beginner", "new to", "starting", "recommend", "introduction"],
    answer: "First time in Africa? Rwanda is easiest - compact, safe, excellent roads, and gorillas. Kenya is most developed for tourism with good infrastructure. For classic Big Five safari, Masai Mara or Serengeti are iconic. Recommended first trip: 10-12 days combining 2-3 experiences (e.g., gorillas + safari, or safari + beach). Happy to build a starter itinerary based on your interests!",
  },
  {
    id: "honeymoon",
    intent: "trip_style",
    keywords: ["honeymoon", "romantic", "couples", "anniversary", "special", "proposal"],
    answer: "East Africa is incredible for romance! Top honeymoon ideas: Luxury Masai Mara lodge with private dinners and balloon safari; Zanzibar private villa on pristine beach; Rwanda gorillas + Lake Kivu relaxation; Victoria Falls sunset cruise + Zambia safari. Many lodges offer honeymoon packages with champagne, spa, and special touches. When are you traveling?",
  },
  {
    id: "family-travel",
    intent: "trip_style",
    keywords: ["family", "kids", "children", "child friendly", "age", "toddler", "teenager"],
    answer: "Family safari considerations: Most lodges welcome kids, but gorilla trekking requires minimum age 15. Great family options: Akagera (Rwanda) - malaria-free, close to Kigali; Kenya's private conservancies often accept younger children; beach destinations (Zanzibar, Diani) are perfect for families. Game drives suit kids 6+. Teen-friendly: add Jinja adventures or walking safaris.",
  },
];

// ============================================================================
// EXPANDED INTENT CLASSIFICATION
// ============================================================================

const INTENTS = [
  // Booking intents
  { id: "book_stays", keywords: ["stay", "hotel", "accommodation", "apartment", "villa", "lodge", "room", "book", "reserve", "sleep"] },
  { id: "book_tours", keywords: ["tour", "package", "activity", "itinerary", "guide", "experience", "excursion", "trip"] },
  { id: "airport_transfer", keywords: ["airport", "pickup", "dropoff", "transfer", "route", "flight", "arrival"] },
  { id: "car_rental", keywords: ["car", "rental", "vehicle", "driver", "4x4", "self-drive", "daily", "weekly"] },
  
  // Payment intents
  { id: "payment_methods", keywords: ["pay", "payment", "mobile", "money", "card", "bank", "mtn", "airtel", "mpesa", "visa", "checkout"] },
  { id: "refund_cancellation", keywords: ["refund", "cancel", "cancellation", "policy", "money back", "reschedule"] },
  { id: "fees_pricing", keywords: ["fee", "charges", "price", "pricing", "cost", "earnings", "payout", "how much", "expensive"] },
  
  // Host intents
  { id: "become_host", keywords: ["host", "list", "application", "approval", "onboard", "my property", "listing"] },
  { id: "support_contact", keywords: ["help", "support", "contact", "issue", "problem", "emergency", "chat", "not working", "error", "failed", "can't", "cannot", "login", "sign in", "sign up", "account", "booking", "checkout", "payment", "refund", "ticket"] },
  { id: "safety", keywords: ["safety", "secure", "trust", "verification", "dangerous", "safe"] },
  
  // Travel intents - NEW
  { id: "destination_info", keywords: ["destination", "where", "country", "city", "visit", "rwanda", "uganda", "kenya", "tanzania", "zambia", "kigali", "nairobi"] },
  { id: "gorilla_trekking", keywords: ["gorilla", "permit", "trek", "bwindi", "volcanoes", "silverback", "primates", "apes"] },
  { id: "safari_planning", keywords: ["safari", "game drive", "wildlife", "animals", "national park", "reserve", "best time", "season"] },
  { id: "migration_info", keywords: ["migration", "wildebeest", "crossing", "mara", "serengeti", "river", "herd"] },
  { id: "wildlife_info", keywords: ["wildlife", "animal", "lion", "elephant", "leopard", "rhino", "buffalo", "bird", "hippo", "chimp"] },
  { id: "beach_coast", keywords: ["beach", "coast", "ocean", "snorkel", "dive", "island", "zanzibar", "diani", "relax"] },
  { id: "adventure_activities", keywords: ["adventure", "rafting", "bungee", "balloon", "hike", "climb", "kilimanjaro", "extreme", "thrill"] },
  { id: "travel_practical", keywords: ["visa", "vaccine", "health", "currency", "money", "atm", "passport", "insurance"] },
  { id: "trip_planning", keywords: ["plan", "itinerary", "days", "duration", "recommend", "suggest", "first time", "beginner"] },
  { id: "trip_style", keywords: ["honeymoon", "family", "kids", "romantic", "luxury", "budget", "backpacker", "solo", "group"] },
  { id: "best_time", keywords: ["when", "best time", "season", "month", "weather", "dry", "wet", "rain"] },
  { id: "comparison", keywords: ["vs", "versus", "compare", "difference", "better", "which", "or"] },
  { id: "greeting", keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"] },
  { id: "thanks", keywords: ["thank", "thanks", "appreciate", "helpful", "great"] },
];

// ============================================================================
// INTELLIGENT FUNCTIONS
// ============================================================================

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

// Enhanced entity extraction
function extractEntities(text) {
  const t = normalize(text);
  const original = String(text || "").toLowerCase();
  
  // Budget detection (more patterns)
  const budgetMatch = original.match(/(?:\$|usd|€|eur)?\s?(\d{2,7})(?:\s*(?:per|a)\s*(?:person|day|night|pp|pn|pd))?/i);
  const budget = budgetMatch ? parseInt(budgetMatch[1]) : null;
  const budgetType = original.includes("per person") || original.includes("pp") ? "per_person" 
    : original.includes("per day") || original.includes("pd") ? "per_day"
    : original.includes("per night") || original.includes("pn") ? "per_night"
    : original.includes("total") ? "total" : "unknown";
  
  // Group size
  const groupMatch = t.match(/(\d+)\s*(?:people|persons|guests|travelers|travellers|pax|of us)/i);
  const groupSize = groupMatch ? parseInt(groupMatch[1]) : null;
  
  // Duration
  const daysMatch = t.match(/(\d+)\s*(?:day|days|night|nights|week|weeks)/i);
  const duration = daysMatch ? parseInt(daysMatch[1]) : null;
  const durationUnit = original.includes("week") ? "weeks" : "days";
  
  // Month detection
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const detectedMonth = months.find(m => t.includes(m) || t.includes(m.slice(0, 3)));
  
  // Country/destination detection
  const countries = [];
  const destinations = [];
  
  if (t.includes("rwanda") || t.includes("kigali") || t.includes("volcanoes") || t.includes("kivu") || t.includes("nyungwe") || t.includes("akagera")) {
    countries.push("Rwanda");
    if (t.includes("kigali")) destinations.push("kigali");
    if (t.includes("volcanoes") || t.includes("gorilla")) destinations.push("volcanoes_np");
    if (t.includes("kivu")) destinations.push("lake_kivu");
    if (t.includes("nyungwe")) destinations.push("nyungwe_forest");
    if (t.includes("akagera")) destinations.push("akagera_np");
  }
  
  if (t.includes("uganda") || t.includes("kampala") || t.includes("bwindi") || t.includes("queen elizabeth") || t.includes("murchison") || t.includes("jinja") || t.includes("kibale")) {
    countries.push("Uganda");
    if (t.includes("kampala")) destinations.push("kampala");
    if (t.includes("bwindi")) destinations.push("bwindi");
    if (t.includes("queen elizabeth")) destinations.push("queen_elizabeth_np");
    if (t.includes("murchison")) destinations.push("murchison_falls_np");
    if (t.includes("jinja")) destinations.push("jinja");
  }
  
  if (t.includes("kenya") || t.includes("nairobi") || t.includes("masai mara") || t.includes("mara") || t.includes("diani") || t.includes("amboseli")) {
    countries.push("Kenya");
    if (t.includes("nairobi")) destinations.push("nairobi");
    if (t.includes("masai mara") || t.includes("mara")) destinations.push("masai_mara");
    if (t.includes("diani")) destinations.push("diani_beach");
    if (t.includes("amboseli")) destinations.push("amboseli_np");
  }
  
  if (t.includes("tanzania") || t.includes("serengeti") || t.includes("ngorongoro") || t.includes("zanzibar") || t.includes("kilimanjaro")) {
    countries.push("Tanzania");
    if (t.includes("serengeti")) destinations.push("serengeti_np");
    if (t.includes("ngorongoro")) destinations.push("ngorongoro_crater");
    if (t.includes("zanzibar")) destinations.push("zanzibar");
    if (t.includes("kilimanjaro")) destinations.push("kilimanjaro");
  }
  
  if (t.includes("zambia") || t.includes("victoria falls") || t.includes("luangwa") || t.includes("zambezi") || t.includes("livingstone")) {
    countries.push("Zambia");
    if (t.includes("victoria falls") || t.includes("livingstone")) destinations.push("victoria_falls_zambia");
    if (t.includes("luangwa")) destinations.push("south_luangwa_np");
    if (t.includes("zambezi")) destinations.push("lower_zambezi_np");
  }
  
  // Trip style detection
  const tripStyles = [];
  if (t.includes("honeymoon") || t.includes("romantic") || t.includes("anniversary") || t.includes("couples")) tripStyles.push("romantic");
  if (t.includes("family") || t.includes("kids") || t.includes("children")) tripStyles.push("family");
  if (t.includes("luxury") || t.includes("premium") || t.includes("5 star") || t.includes("exclusive")) tripStyles.push("luxury");
  if (t.includes("budget") || t.includes("cheap") || t.includes("affordable") || t.includes("backpack")) tripStyles.push("budget");
  if (t.includes("adventure") || t.includes("adrenaline") || t.includes("extreme")) tripStyles.push("adventure");
  if (t.includes("relax") || t.includes("beach") || t.includes("chill") || t.includes("unwind")) tripStyles.push("relaxation");
  if (t.includes("safari") || t.includes("wildlife") || t.includes("animal")) tripStyles.push("wildlife");
  if (t.includes("culture") || t.includes("history") || t.includes("museum") || t.includes("local")) tripStyles.push("culture");
  
  // Activity detection
  const activities = [];
  if (t.includes("gorilla")) activities.push("gorilla_trekking");
  if (t.includes("chimp") || t.includes("chimpanzee")) activities.push("chimp_tracking");
  if (t.includes("safari") || t.includes("game drive")) activities.push("safari_game_drive");
  if (t.includes("rafting") || t.includes("white water")) activities.push("white_water_rafting");
  if (t.includes("balloon")) activities.push("balloon_safari");
  if (t.includes("walking safari") || t.includes("walk")) activities.push("walking_safari");
  if (t.includes("snorkel") || t.includes("dive") || t.includes("diving")) activities.push("snorkeling_diving");
  if (t.includes("climb") || t.includes("summit") || t.includes("kilimanjaro")) activities.push("mountain_climbing");
  
  return {
    budget,
    budgetType,
    groupSize,
    duration,
    durationUnit,
    month: detectedMonth,
    countries: [...new Set(countries)],
    destinations: [...new Set(destinations)],
    tripStyles: [...new Set(tripStyles)],
    activities: [...new Set(activities)],
  };
}

function looksLikeSupportTriage(text) {
  const t = normalize(text);
  if (!t) return false;

  const supportSignals = [
    "problem",
    "issue",
    "not working",
    "cant",
    "cannot",
    "error",
    "failed",
    "bug",
    "login",
    "sign in",
    "sign up",
    "account",
    "checkout",
    "payment",
    "refund",
    "booking",
    "ticket",
    "support",
  ];

  const hasSupportSignal = supportSignals.some((s) => t.includes(s));
  if (!hasSupportSignal) return false;

  const entities = extractEntities(text);
  const hasTravelSignals = Boolean(
    (entities.countries && entities.countries.length) ||
    (entities.destinations && entities.destinations.length) ||
    (entities.activities && entities.activities.length)
  );

  const genericProblem = /^(i\s*(have|got)\s*(a\s*)?(problem|issue)|help\s*me|i\s*need\s*help|something\s*(is|'s)\s*wrong|it\s*(is|'s)\s*not\s*working)\b/i.test(t);
  if (genericProblem) return true;

  if (hasTravelSignals) return false;
  return true;
}

// Predict intent with improved scoring
function predictIntent(text) {
  const tokens = tokenize(text);
  const normalizedText = normalize(text);
  
  // Check for greetings first
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings)\s*[!.?]?\s*$/i.test(normalizedText)) {
    return {
      intent: "greeting",
      confidence: 0.99,
      topIntents: [{ id: "greeting", score: 1 }],
    };
  }
  
  // Check for thanks
  if (/^(thanks?(\s*you)?|appreciate|great|helpful|awesome)\s*[!.?]?\s*$/i.test(normalizedText)) {
    return {
      intent: "thanks",
      confidence: 0.99,
      topIntents: [{ id: "thanks", score: 1 }],
    };
  }

  if (looksLikeSupportTriage(text)) {
    return {
      intent: "support_contact",
      confidence: 0.92,
      topIntents: [
        { id: "support_contact", score: 1 },
        { id: "payment_methods", score: 0.25 },
        { id: "refund_cancellation", score: 0.2 },
      ],
    };
  }
  
  const scored = INTENTS.map((intent) => ({
    id: intent.id,
    score: scoreKeywordOverlap(tokens, intent.keywords),
  })).sort((a, b) => b.score - a.score);

  const best = scored[0] || { id: "general", score: 0 };
  
  // Boost confidence for high-signal matches
  let confidence = Math.min(0.99, Number((best.score * 1.25).toFixed(2)));
  if (best.score > 0.6) confidence = Math.min(0.99, confidence + 0.1);
  
  return {
    intent: best.id,
    confidence,
    topIntents: scored.slice(0, 5),
  };
}

// Smart FAQ retrieval with boosting
function retrieveFaqs(text, predictedIntent) {
  const tokens = tokenize(text);
  const entities = extractEntities(text);
  
  const ranked = FAQS.map((faq) => {
    const overlap = scoreKeywordOverlap(tokens, faq.keywords);
    const intentBoost = faq.intent === predictedIntent ? 0.4 : 0;
    
    // Contextual boosting based on detected entities
    let contextBoost = 0;
    if (entities.countries.length && faq.id.includes("dest-")) contextBoost += 0.2;
    if (entities.activities.includes("gorilla_trekking") && faq.id.includes("gorilla")) contextBoost += 0.3;
    if (entities.tripStyles.includes("romantic") && faq.id === "honeymoon") contextBoost += 0.3;
    if (entities.tripStyles.includes("family") && faq.id === "family-travel") contextBoost += 0.3;
    
    return {
      ...faq,
      score: overlap + intentBoost + contextBoost,
    };
  }).sort((a, b) => b.score - a.score);

  return ranked.slice(0, 3);
}

// Get destination knowledge
function getDestinationInfo(destinationKey) {
  return DESTINATIONS[destinationKey] || null;
}

// Get activity knowledge
function getActivityInfo(activityKey) {
  return ACTIVITIES[activityKey] || null;
}

// Get seasonal information
function getSeasonalInfo(month) {
  if (!month) return null;
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const monthIndex = months.findIndex(m => month.startsWith(m.slice(0, 3)));
  if (monthIndex === -1) return null;
  
  const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const migrationInfo = SEASONAL_INFO.migration_calendar[monthKeys[monthIndex]];
  
  const isDry = SEASONAL_INFO.general_seasons.east_africa_dry.months.includes(monthIndex + 1);
  
  return {
    month: months[monthIndex],
    migration: migrationInfo,
    season: isDry ? "dry" : "green/wet",
    seasonDescription: isDry 
      ? SEASONAL_INFO.general_seasons.east_africa_dry.description
      : SEASONAL_INFO.general_seasons.east_africa_wet.description,
  };
}

// Build intelligent reply
function buildIntelligentReply(text, predictedIntent, faqs, entities, conversationContext) {
  // Greeting response
  if (predictedIntent === "greeting") {
    const greetings = [
      "Hello! 👋 I'm your Merry360X travel assistant, specializing in East African adventures. I can help with gorilla trekking, safaris, beach escapes, itinerary planning, and booking questions. What kind of trip are you dreaming of?",
      "Hi there! Welcome to Merry360X! I'm here to help you plan an incredible East African adventure - whether it's gorillas in Rwanda, the Great Migration, Kilimanjaro, or Zanzibar beaches. What brings you here today?",
      "Hey! Great to have you here. I'm your AI travel guide for Rwanda, Uganda, Kenya, Tanzania, and Zambia. Ready to help with trip planning, destination info, or booking questions. Where would you like to start?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Thanks response
  if (predictedIntent === "thanks") {
    const thanks = [
      "You're welcome! 🌍 Let me know if you have any more questions about your East African adventure. Happy travels!",
      "My pleasure! Feel free to ask anything else about destinations, activities, or booking. I'm here to help make your trip amazing!",
      "Glad I could help! Reach out anytime you need more travel tips or booking assistance."
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }

  if (predictedIntent === "support_contact") {
    const topicHints = [];
    const t = normalize(text);
    if (t.includes("payment") || t.includes("checkout") || t.includes("card") || t.includes("mobile money")) topicHints.push("payment/checkout");
    if (t.includes("refund") || t.includes("cancel")) topicHints.push("refund/cancellation");
    if (t.includes("login") || t.includes("sign in") || t.includes("account")) topicHints.push("login/account");
    if (t.includes("booking")) topicHints.push("booking");

    const hintLine = topicHints.length ? `\n\nIt sounds related to **${topicHints.slice(0, 2).join(" + ")}**.` : "";

    return (
      `Sorry you're having trouble — I can help.${hintLine}\n\n` +
      `To fix this quickly, please describe:\n` +
      `1) What you were trying to do (login, booking, checkout, refund, etc.)\n` +
      `2) What happened (and any exact error message)\n` +
      `3) Your booking/order reference (if you have one)\n\n` +
      `If you want **live, real-time help**, open the **Support Center** (the Help button on the site) and start a **Customer Support** chat — that creates a ticket so the support team can follow up.\n\n` +
      `Note: please don’t share full card details or passwords.`
    ).trim();
  }

  // Build contextual response
  let reply = "";
  
  // Add destination-specific information
  if (entities.destinations.length > 0) {
    const destInfo = getDestinationInfo(entities.destinations[0]);
    if (destInfo) {
      reply += `**${destInfo.fullName || entities.destinations[0].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}** (${destInfo.country})\n\n`;
      
      if (destInfo.highlights) {
        reply += `✨ **Highlights:** ${destInfo.highlights.slice(0, 4).join(", ")}\n\n`;
      }
      
      if (destInfo.tips && destInfo.tips.length > 0) {
        reply += `💡 **Key tips:**\n`;
        destInfo.tips.slice(0, 3).forEach(tip => {
          reply += `• ${tip}\n`;
        });
        reply += "\n";
      }
      
      if (destInfo.bestMonths) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const bestTimes = destInfo.bestMonths.map(m => monthNames[m - 1]).join(", ");
        reply += `📅 **Best time to visit:** ${bestTimes}\n\n`;
      }
      
      if (destInfo.budget) {
        reply += `💰 **Budget guide (per day):** Budget $${destInfo.budget.low}+ | Mid-range $${destInfo.budget.mid}+ | Luxury $${destInfo.budget.high}+\n\n`;
      }
      
      if (destInfo.permitCost) {
        reply += `🦍 **Permit cost:** $${destInfo.permitCost} per person\n\n`;
      }
    }
  }
  
  // Add activity-specific information
  if (entities.activities.length > 0 && reply.length < 400) {
    const actInfo = getActivityInfo(entities.activities[0]);
    if (actInfo) {
      reply += `**${actInfo.name}**\n\n`;
      reply += `${actInfo.whatToExpect || ""}\n\n`;
      
      if (actInfo.tips) {
        reply += `💡 **Tips:**\n`;
        actInfo.tips.slice(0, 3).forEach(tip => {
          reply += `• ${tip}\n`;
        });
        reply += "\n";
      }
    }
  }
  
  // Add seasonal context
  if (entities.month && reply.length < 500) {
    const seasonal = getSeasonalInfo(entities.month);
    if (seasonal) {
      reply += `📅 **${seasonal.month.charAt(0).toUpperCase() + seasonal.month.slice(1)} travel:** ${seasonal.season} season - ${seasonal.seasonDescription}\n`;
      if (seasonal.migration) {
        reply += `🦬 **Migration update:** ${seasonal.migration.location} - ${seasonal.migration.event}\n`;
      }
      reply += "\n";
    }
  }
  
  // Add relevant FAQ if we haven't already provided enough context
  if (reply.length < 300 && faqs[0] && faqs[0].score > 0.15) {
    reply += faqs[0].answer + "\n\n";
  } else if (reply.length === 0) {
    // Fallback to FAQ answer if we have no destination-specific info
    reply = faqs[0]?.answer || "I can help with booking stays, tours, transport, and travel planning across East Africa. What would you like to know?";
    reply += "\n\n";
  }
  
  // Smart follow-up based on missing info
  const missingInfo = [];
  if (!entities.countries.length && !entities.destinations.length && predictedIntent !== "payment_methods" && predictedIntent !== "refund_cancellation") {
    missingInfo.push("which destination interests you");
  }
  if (!entities.duration && (predictedIntent === "trip_planning" || predictedIntent === "safari_planning" || predictedIntent === "destination_info")) {
    missingInfo.push("how many days you have");
  }
  if (!entities.month && (predictedIntent === "best_time" || predictedIntent === "safari_planning" || predictedIntent === "migration_info")) {
    missingInfo.push("when you're planning to travel");
  }
  if (!entities.budget && entities.tripStyles.length === 0 && (predictedIntent === "trip_planning" || predictedIntent === "safari_planning")) {
    missingInfo.push("your budget range or travel style");
  }
  if (!entities.groupSize && (predictedIntent === "book_stays" || predictedIntent === "trip_planning")) {
    missingInfo.push("how many travelers");
  }
  
  if (missingInfo.length > 0 && missingInfo.length <= 2) {
    reply += `To give you the best recommendation, could you share ${missingInfo.slice(0, 2).join(" and ")}?`;
  } else if (missingInfo.length > 2) {
    reply += `Tell me more about your trip - destination, dates, duration, group size, or interests - and I'll provide personalized recommendations!`;
  } else {
    reply += `Anything else you'd like to know about this destination or experience?`;
  }
  
  return reply.trim();
}

// Parse conversation for context
function parseConversationContext(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return {};
  
  const context = {
    mentionedDestinations: new Set(),
    mentionedActivities: new Set(),
    mentionedDates: null,
    budget: null,
    groupSize: null,
    tripStyle: [],
  };
  
  // Scan entire conversation for context
  for (const msg of messages) {
    if (msg && typeof msg.content === "string") {
      const entities = extractEntities(msg.content);
      entities.destinations.forEach(d => context.mentionedDestinations.add(d));
      entities.activities.forEach(a => context.mentionedActivities.add(a));
      if (entities.month && !context.mentionedDates) context.mentionedDates = entities.month;
      if (entities.budget && !context.budget) context.budget = entities.budget;
      if (entities.groupSize && !context.groupSize) context.groupSize = entities.groupSize;
      if (entities.tripStyles.length) context.tripStyle = [...new Set([...context.tripStyle, ...entities.tripStyles])];
    }
  }
  
  return {
    mentionedDestinations: Array.from(context.mentionedDestinations),
    mentionedActivities: Array.from(context.mentionedActivities),
    mentionedDates: context.mentionedDates,
    budget: context.budget,
    groupSize: context.groupSize,
    tripStyle: context.tripStyle,
  };
}

export function estimateQuestionSpace() {
  const intentCount = INTENTS.length;
  const destinationCount = Object.keys(DESTINATIONS).length;
  const activityCount = Object.keys(ACTIVITIES).length;
  const templateVariants = 150;
  const synonymVariants = 35;
  const entityCombos = 200;
  return intentCount * (destinationCount + activityCount) * templateVariants * synonymVariants * entityCombos;
}

export function answerTripAdvisorQuestion(messages) {
  const lastUserMessage = [...(Array.isArray(messages) ? messages : [])]
    .reverse()
    .find((m) => m && m.role === "user" && typeof m.content === "string");

  const question = lastUserMessage?.content?.trim() || "";

  // Extract entities from current question
  const entities = extractEntities(question);
  
  // Parse full conversation context
  const conversationContext = parseConversationContext(messages);
  
  // Merge with conversation context for better understanding
  const mergedEntities = {
    ...entities,
    destinations: entities.destinations.length ? entities.destinations : conversationContext.mentionedDestinations,
    activities: entities.activities.length ? entities.activities : conversationContext.mentionedActivities,
    month: entities.month || conversationContext.mentionedDates,
    budget: entities.budget || conversationContext.budget,
    groupSize: entities.groupSize || conversationContext.groupSize,
    tripStyles: entities.tripStyles.length ? entities.tripStyles : conversationContext.tripStyle,
  };

  const prediction = predictIntent(question);
  const faqs = retrieveFaqs(question, prediction.intent);
  const reply = buildIntelligentReply(question, prediction.intent, faqs, mergedEntities, conversationContext);

  return {
    reply,
    intent: prediction.intent,
    confidence: prediction.confidence,
    topIntents: prediction.topIntents,
    references: faqs.map((f) => ({ id: f.id, intent: f.intent, score: Number(f.score.toFixed(3)) })),
    estimatedQuestionCapacity: estimateQuestionSpace(),
    extractedEntities: mergedEntities,
    conversationContext,
  };
}
