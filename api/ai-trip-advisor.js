import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function safeString(x) {
  return typeof x === "string" ? x : "";
}

function pickQuery(messages) {
  const lastUser = [...messages].reverse().find((m) => m && m.role === "user" && typeof m.content === "string");
  const q = safeString(lastUser?.content).trim();
  return q.length > 200 ? q.slice(0, 200) : q;
}

async function fetchPublishedData(supabase, q) {
  const hasQ = typeof q === "string" && q.trim().length >= 3;
  const like = hasQ ? q.trim().replace(/%/g, "") : null;

  const propertiesQ = supabase
    .from("properties")
    .select("id,title,location,price_per_night,currency,property_type,bedrooms,bathrooms,beds,max_guests,rating,review_count")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const toursQ = supabase
    .from("tours")
    .select("id,title,location,price_per_person,currency,category,difficulty,duration_days")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const vehiclesQ = supabase
    .from("transport_vehicles")
    .select("id,title,provider_name,vehicle_type,seats,price_per_day,currency,driver_included")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const routesQ = supabase
    .from("transport_routes")
    .select("id,from_location,to_location,base_price,currency")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (like) {
    propertiesQ.or(`title.ilike.%${like}%,location.ilike.%${like}%`);
    toursQ.or(`title.ilike.%${like}%,location.ilike.%${like}%`);
    vehiclesQ.or(`title.ilike.%${like}%,provider_name.ilike.%${like}%`);
    routesQ.or(`from_location.ilike.%${like}%,to_location.ilike.%${like}%`);
  }

  const [properties, tours, vehicles, routes] = await Promise.all([
    propertiesQ,
    toursQ,
    vehiclesQ,
    routesQ,
  ]);

  return {
    properties: properties.data ?? [],
    tours: tours.data ?? [],
    vehicles: vehicles.data ?? [],
    routes: routes.data ?? [],
  };
}

function buildContext(data) {
  const lines = [];
  lines.push("DATA (Merry360X published content):");

  lines.push("");
  lines.push("ACCOMMODATIONS:");
  for (const p of data.properties) {
    lines.push(
      `- ${p.title ?? "Untitled"} (${p.location ?? "Unknown location"}) · ${p.currency ?? "RWF"} ${Number(
        p.price_per_night ?? 0
      )}/night · type=${p.property_type ?? "N/A"} · guests=${p.max_guests ?? "N/A"} · beds=${p.beds ?? "N/A"} · rating=${p.rating ?? 0} (${p.review_count ?? 0}) · url=/properties/${p.id}`
    );
  }

  lines.push("");
  lines.push("TOURS:");
  for (const t of data.tours) {
    lines.push(
      `- ${t.title ?? "Untitled"} (${t.location ?? "Unknown location"}) · ${t.currency ?? "RWF"} ${Number(
        t.price_per_person ?? 0
      )}/person · category=${t.category ?? "N/A"} · difficulty=${t.difficulty ?? "N/A"} · duration_days=${t.duration_days ?? "N/A"} · url=/tours`
    );
  }

  lines.push("");
  lines.push("TRANSPORT VEHICLES:");
  for (const v of data.vehicles) {
    lines.push(
      `- ${v.title ?? "Untitled"} · provider=${v.provider_name ?? "N/A"} · type=${v.vehicle_type ?? "N/A"} · seats=${
        v.seats ?? "N/A"
      } · ${v.currency ?? "RWF"} ${Number(v.price_per_day ?? 0)}/day · driver_included=${
        v.driver_included ? "yes" : "no"
      } · url=/transport`
    );
  }

  lines.push("");
  lines.push("TRANSPORT ROUTES:");
  for (const r of data.routes) {
    lines.push(
      `- ${r.from_location ?? "Unknown"} → ${r.to_location ?? "Unknown"} · ${r.currency ?? "RWF"} ${Number(
        r.base_price ?? 0
      )} · url=/transport`
    );
  }

  return lines.join("\n").slice(0, 14000);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    if (!OPENAI_API_KEY) return json(res, 500, { error: "Missing OPENAI_API_KEY" });
    if (!SUPABASE_URL) return json(res, 500, { error: "Missing SUPABASE_URL" });
    if (!SUPABASE_SERVICE_ROLE_KEY) return json(res, 500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const userQuery = pickQuery(messages);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const published = await fetchPublishedData(supabase, userQuery);
    const context = buildContext(published);

    const system = [
      "You are Merry360X AI Trip Advisor (AI concierge).",
      "IMPORTANT RULES:",
      "- Use ONLY the DATA provided below. Do not use outside knowledge. Do not guess.",
      "- If the answer is not in DATA, say you don't have that information from Merry360X listings yet and suggest Customer Support.",
      "- Keep responses concise and practical (itinerary ideas, recommendations, links).",
      "",
      context,
    ].join("\n");

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        ...messages
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-12),
      ],
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const txt = await r.text();
      return json(res, 500, { error: "AI request failed" });
    }

    const out = await r.json();
    const reply = out?.choices?.[0]?.message?.content;
    return json(res, 200, { reply: typeof reply === "string" ? reply : "I couldn't generate a reply. Please try again." });
  } catch (e) {
    return json(res, 500, { error: "Server error" });
  }
}

