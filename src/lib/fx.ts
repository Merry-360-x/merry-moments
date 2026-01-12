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

  // Real-time free FX endpoint (no API key). If it fails, we fall back to cached or null.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return cached?.rates ?? null;
    const json = (await res.json()) as any;
    const rates = (json?.rates ?? null) as FxRates | null;
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

