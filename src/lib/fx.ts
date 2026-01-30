export type FxRates = Record<string, number>;

// Fixed exchange rates based on BNR rates (30-Jan-26)
// All rates are: 1 unit of foreign currency = X RWF
const FIXED_RATES: FxRates = {
  USD: 1455.05,      // Average of 1450.05 buy / 1460.05 sell
  EUR: 1735.074373,  // Average of 1729.112123 buy / 1741.036622 sell
  GBP: 2000.912008,  // Average of 1994.036258 buy / 2007.787757 sell
  CNY: 209.381420,   // Average of 208.66147 buy / 210.100465 sell
  CNH: 209.471181,   // Average of 208.751373 buy / 210.190988 sell
  RWF: 1,            // Base currency
  // Additional common currencies (estimated)
  KES: 11.3,
  UGX: 0.39,
  TZS: 0.58,
  ZAR: 78.64,
  NGN: 0.94,
  GHS: 93.94,
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

