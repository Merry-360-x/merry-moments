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

  // Use exchangerate-api.com with API key for reliable currency conversion
  const API_KEY = "16ba11c2ac6ae36d12e51479";
  
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return cached?.rates ?? null;
    const json: unknown = await res.json();
    const rates =
      json && typeof json === "object" && "conversion_rates" in json
        ? (((json as Record<string, unknown>).conversion_rates ?? null) as FxRates | null)
        : null;
    if (!rates || typeof rates !== "object") return cached?.rates ?? null;
    // Ensure USD base exists
    rates.USD = 1;
    writeCache(rates);
    return rates;
  } catch {
    return cached?.rates ?? null;
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

