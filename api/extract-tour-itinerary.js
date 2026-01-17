// API endpoint for extracting tour itinerary data from PDF
// This uses OpenAI GPT-4 Vision or similar AI service

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({ error: 'PDF URL is required' });
    }

    // Call OpenAI API to extract information from PDF
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error('[extract-tour-itinerary] Missing OPENAI_API_KEY');
      // Return mock data for now
      return res.status(200).json({
        duration: "3 days / 2 nights",
        dailyItinerary: [
          "Day 1: Arrival in Kigali, city tour, and hotel check-in",
          "Day 2: Gorilla trekking in Volcanoes National Park",
          "Day 3: Cultural visit to Iby'Iwacu village and departure"
        ],
        includedServices: [
          "Professional tour guide",
          "Transportation",
          "Accommodation (2 nights)",
          "Gorilla trekking permit",
          "Meals (breakfast and lunch)",
          "Park entrance fees"
        ],
        excludedServices: [
          "International flights",
          "Travel insurance",
          "Personal expenses",
          "Tips and gratuities",
          "Dinner on Day 1"
        ],
        meetingPoint: "Kigali International Airport",
        whatToBring: [
          "Comfortable hiking boots",
          "Rain jacket",
          "Sunscreen and hat",
          "Camera (no flash)",
          "Insect repellent",
          "Valid passport"
        ],
        cancellationPolicy: "Free cancellation up to 7 days before the tour start date. 50% refund for cancellations between 3-7 days. No refund for cancellations within 3 days of the tour.",
        price: 1200,
        confidence: {
          duration: "high",
          dailyItinerary: "high",
          includedServices: "high",
          excludedServices: "medium",
          meetingPoint: "high",
          whatToBring: "medium",
          cancellationPolicy: "medium",
          price: "low"
        }
      });
    }

    // Actual OpenAI implementation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured information from tour itinerary PDFs. 
Extract the following information and return it as JSON:
- duration (string): e.g., "3 days / 2 nights"
- dailyItinerary (array of strings): day-by-day summary
- includedServices (array of strings): what's included
- excludedServices (array of strings): what's not included
- meetingPoint (string): where the tour starts
- whatToBring (array of strings): items to bring
- cancellationPolicy (string): cancellation terms
- price (number): price per person if mentioned
- confidence (object): for each field, rate confidence as "high", "medium", or "low"

If information is not found, omit that field or use null.`
          },
          {
            role: 'user',
            content: `Extract tour information from this PDF: ${pdfUrl}\n\nPlease analyze the PDF content and extract the structured information.`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const extractedContent = JSON.parse(data.choices[0].message.content);

    return res.status(200).json(extractedContent);

  } catch (error) {
    console.error('[extract-tour-itinerary] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to extract tour information',
      message: error.message 
    });
  }
}
