export type FxRates = Record<string, number>;

const FX_CACHE_KEY = "merry360_fx_usd_rates_v1";
const FX_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

type Cached = { at: number; rates: FxRates };

function readCache(): Cached | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.at || !parsed?.rates) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: FxRates) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ at: Date.now(), rates } satisfies Cached));
  } catch {
    // ignore
  }
}

export async function getUsdRates(): Promise<FxRates | null> {
  const cached = readCache();
  if (cached && Date.now() - cached.at < FX_CACHE_TTL_MS) return cached.rates;

  // Use exchangerate-api.com - free tier with generous limits
  // Fallback to static rates if API fails
  const STATIC_RATES: FxRates = {
    USD: 1,
    RWF: 1350,
    EUR: 0.92,
    GBP: 0.79,
    KES: 129,
    UGX: 3700,
    TZS: 2500,
    ZAR: 18.5,
    NGN: 1550,
    GHS: 15.5,
  };
  
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    // Use open.er-api.com - no API key needed, 10k requests/month free
    const res = await fetch(`https://open.er-api.com/v6/latest/USD`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return cached?.rates ?? STATIC_RATES;
    const json: unknown = await res.json();
    const rates =
      json && typeof json === "object" && "rates" in json
        ? (((json as Record<string, unknown>).rates ?? null) as FxRates | null)
        : null;
    if (!rates || typeof rates !== "object") return cached?.rates ?? STATIC_RATES;
    // Ensure USD base exists
    rates.USD = 1;
    writeCache(rates);
    return rates;
  } catch {
    return cached?.rates ?? STATIC_RATES;
  }
}

export function convertAmount(amount: number, from: string, to: string, usdRates: FxRates | null): number | null {
  const a = Number.isFinite(amount) ? Number(amount) : 0;
  const f = String(from || "RWF").toUpperCase();
  const t = String(to || "RWF").toUpperCase();
  if (f === t) return a;
  if (!usdRates) return null;
  const rf = usdRates[f];
  const rt = usdRates[t];
  if (!rf || !rt) return null;
  // rates are: 1 USD = rate[currency]
  const usd = a / rf;
  const out = usd * rt;
  return Number.isFinite(out) ? out : null;
}

