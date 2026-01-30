export type FxRates = Record<string, number>;

// Fixed exchange rates based on BNR rates (30-Jan-26)
// Using SELL rates: How much RWF you pay per 1 unit of foreign currency
const FIXED_RATES: FxRates = {
  USD: 1460.05,      // BNR Sell rate
  EUR: 1741.036622,  // BNR Sell rate
  GBP: 2007.787757,  // BNR Sell rate
  CNY: 210.100465,   // BNR Sell rate
  CNH: 210.190988,   // BNR Sell rate
  RWF: 1,            // Base currency
  // Additional common currencies (estimated, using typical sell rates)
  KES: 11.5,
  UGX: 0.40,
  TZS: 0.60,
  ZAR: 80.0,
  NGN: 0.95,
  GHS: 95.0,
};

export async function getUsdRates(): Promise<FxRates | null> {
  // Return fixed rates - no API call needed
  return FIXED_RATES;
}

export function convertAmount(amount: number, from: string, to: string, usdRates: FxRates | null): number | null {
  const a = Number.isFinite(amount) ? Number(amount) : 0;
  const f = String(from || "RWF").toUpperCase();
  const t = String(to || "RWF").toUpperCase();
  if (f === t) return a;
  
  // Use fixed rates if usdRates is null
  const rates = usdRates ?? FIXED_RATES;
  const rf = rates[f];
  const rt = rates[t];
  if (!rf || !rt) return null;
  
  // Convert from source currency to RWF, then to target currency
  // rates are: 1 unit of foreign currency = X RWF
  const rwf = f === "RWF" ? a : a * rf;
  const out = t === "RWF" ? rwf : rwf / rt;
  return Number.isFinite(out) ? out : null;
}

