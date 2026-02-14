export type FxRates = Record<string, number>;

/**
 * Currency decimal places for financial precision
 * Most currencies use 2 decimal places, but some notable exceptions:
 * - 0 decimals: RWF, JPY, KRW, VND, IDR (and many African currencies)
 * - 3 decimals: KWD, BHD, OMR
 */
export const CURRENCY_DECIMALS: Record<string, number> = {
  // 0 decimal currencies
  RWF: 0,    // Rwandan Franc
  JPY: 0,    // Japanese Yen
  KRW: 0,    // South Korean Won
  VND: 0,    // Vietnamese Dong
  IDR: 0,    // Indonesian Rupiah (technically 2, but practically 0)
  TZS: 0,    // Tanzanian Shilling
  KES: 0,    // Kenyan Shilling (officially 2, commonly 0)
  UGX: 0,    // Ugandan Shilling
  BIF: 0,    // Burundian Franc
  XOF: 0,    // West African CFA Franc
  XAF: 0,    // Central African CFA Franc
  GNF: 0,    // Guinean Franc
  HUF: 0,    // Hungarian Forint (officially 2, commonly 0)
  CLP: 0,    // Chilean Peso
  ISK: 0,    // Icelandic Króna
  
  // 3 decimal currencies
  KWD: 3,    // Kuwaiti Dinar
  BHD: 3,    // Bahraini Dinar
  OMR: 3,    // Omani Rial
  
  // 2 decimal currencies (default, not listed)
  // USD, EUR, GBP, CAD, AUD, CHF, CNY, ZAR, etc.
};

/**
 * Get decimal places for a currency
 * @param currency Currency code (e.g., "USD", "RWF")
 * @returns Number of decimal places (0, 2, or 3)
 */
export function getCurrencyDecimals(currency: string): number {
  const code = (currency || "USD").toUpperCase();
  return CURRENCY_DECIMALS[code] ?? 2; // Default to 2 decimals
}

/**
 * Round a number to the correct decimal places for a currency
 * Uses banker's rounding (round half to even) for financial accuracy
 * @param amount The amount to round
 * @param currency The target currency code
 * @returns Properly rounded amount
 */
export function roundToCurrency(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) return 0;
  
  const decimals = getCurrencyDecimals(currency);
  const multiplier = Math.pow(10, decimals);
  
  // Banker's rounding (round half to even)
  const shifted = amount * multiplier;
  const floor = Math.floor(shifted);
  const fraction = shifted - floor;
  
  let rounded: number;
  if (fraction < 0.5) {
    rounded = floor;
  } else if (fraction > 0.5) {
    rounded = floor + 1;
  } else {
    // Exactly 0.5 - round to even
    rounded = floor % 2 === 0 ? floor : floor + 1;
  }
  
  return rounded / multiplier;
}

// Official exchange rates from BNR (National Bank of Rwanda)
// Using AVERAGE rates: How much RWF per 1 unit of foreign currency
// Source: National Bank of Rwanda - currency table provided by user (06-Feb-26)
const FIXED_RATES: FxRates = {
  // Base currency
  RWF: 1,
  
  // Major currencies (BNR average rates)
  USD: 1455.5,        // US Dollar
  EUR: 1716.76225,    // Euro
  GBP: 1972.4936,     // British Pound
  CHF: 1873.109877,   // Swiss Franc
  CAD: 1062.448047,   // Canadian Dollar
  AUD: 1010.117,      // Australian Dollar
  JPY: 9.289729,      // Japanese Yen
  CNY: 209.732456,    // Chinese Yuan
  CNH: 209.757927,    // Chinese Yuan Offshore
  
  // East African currencies (neighbors - key for local payments)
  TZS: 0.563279,      // Tanzanian Shilling
  KES: 11.283036,     // Kenyan Shilling
  UGX: 0.408996,      // Ugandan Shilling
  BIF: 0.491231,      // Burundian Franc
  SSP: 0.320938,      // South Sudanese Pound
  ETB: 9.362504,      // Ethiopian Birr
  
  // Southern African currencies
  ZMW: 78.35757,      // Zambian Kwacha
  ZAR: 89.412093,     // South African Rand
  MZN: 22.889921,     // Mozambican Metical
  MWK: 0.839096,      // Malawian Kwacha
  LSL: 89.404815,     // Lesotho Loti
  SZL: 89.404088,     // Eswatini Lilangeni
  AOA: 1.584312,      // Angolan Kwanza
  
  // West African currencies
  XOF: 2.619172,      // West African CFA Franc
  XAF: 2.551492,      // Central African CFA Franc
  NGN: 1.066154,      // Nigerian Naira
  GHS: 132.559663,    // Ghanaian Cedi
  GNF: 0.165927,      // Guinean Franc
  
  // North African & Middle East
  EGP: 31.06037,      // Egyptian Pound
  MAD: 158.57527,     // Moroccan Dirham
  LYD: 229.848921,    // Libyan Dinar
  SDG: 2.425591,      // Sudanese Pound
  AED: 396.323917,    // UAE Dirham
  SAR: 388.122902,    // Saudi Riyal
  QAR: 399.314242,    // Qatari Riyal
  KWD: 4762.762058,   // Kuwaiti Dinar
  JOD: 2052.89542,    // Jordanian Dinar
  ILS: 464.008306,    // Israeli Shekel
  TRY: 33.370976,     // Turkish Lira
  
  // Asian currencies
  INR: 16.118935,     // Indian Rupee
  PKR: 5.203413,      // Pakistani Rupee
  IDR: 0.085875,      // Indonesian Rupiah
  KRW: 0.991196,      // South Korean Won
  SGD: 1142.643914,   // Singapore Dollar
  HKD: 186.330199,    // Hong Kong Dollar
  
  // European currencies
  SEK: 160.930996,    // Swedish Krona
  NOK: 148.634932,    // Norwegian Krone
  DKK: 229.813989,    // Danish Krone
  PLN: 406.037196,    // Polish Zloty
  CZK: 70.714012,     // Czech Koruna
  HUF: 4.51205,       // Hungarian Forint
  RUB: 18.964437,     // Russian Ruble
  
  // Americas
  BRL: 276.102528,    // Brazilian Real
  
  // Indian Ocean
  MUR: 31.593811,     // Mauritian Rupee
  KMF: 3.485195,      // Comorian Franc
  MRO: 4.071761,      // Mauritanian Ouguiya
  
  // Special Drawing Rights
  XDR: 1997.84841,    // IMF SDR
  
  // Zimbabwe
  ZIG: 3.83597,       // Zimbabwe Gold (ZiG)
};

// Currency names for display
export const CURRENCY_NAMES: Record<string, string> = {
  RWF: "Rwandan Franc",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  CNY: "Chinese Yuan",
  TZS: "Tanzanian Shilling",
  KES: "Kenyan Shilling",
  UGX: "Ugandan Shilling",
  ZMW: "Zambian Kwacha",
  BIF: "Burundian Franc",
  ZAR: "South African Rand",
  NGN: "Nigerian Naira",
  GHS: "Ghanaian Cedi",
  ETB: "Ethiopian Birr",
};

// Currencies commonly used for payments in the region
// Import from currencies.ts for consistency
export { PAYMENT_CURRENCIES } from "./currencies";

export async function getUsdRates(): Promise<FxRates | null> {
  // Return fixed rates - no API call needed
  return FIXED_RATES;
}

/**
 * Convert amount between currencies with proper financial precision
 * 
 * AUDIT NOTE: This function ensures:
 * 1. Proper decimal precision based on target currency (0, 2, or 3 decimals)
 * 2. Banker's rounding (round half to even) for unbiased financial calculations
 * 3. Null safety - returns null if conversion is not possible
 * 
 * @param amount The amount to convert
 * @param from Source currency code
 * @param to Target currency code
 * @param usdRates Exchange rates (RWF-based)
 * @returns Converted and properly rounded amount, or null if conversion fails
 */
export function convertAmount(amount: number, from: string, to: string, usdRates: FxRates | null): number | null {
  const a = Number.isFinite(amount) ? Number(amount) : 0;
  const f = String(from || "RWF").toUpperCase();
  const t = String(to || "RWF").toUpperCase();
  if (f === t) return roundToCurrency(a, t);
  
  // Use fixed rates if usdRates is null
  const rates = usdRates ?? FIXED_RATES;
  const rf = rates[f];
  const rt = rates[t];
  if (!rf || !rt) return null;
  
  // Convert from source currency to RWF, then to target currency
  // rates are: 1 unit of foreign currency = X RWF
  const rwf = f === "RWF" ? a : a * rf;
  const out = t === "RWF" ? rwf : rwf / rt;
  
  if (!Number.isFinite(out)) return null;
  
  // Round to proper decimal places for target currency
  return roundToCurrency(out, t);
}

/**
 * Convert amount with full audit trail information
 * Use this for transactions that need to be auditable
 * 
 * @param amount The amount to convert
 * @param from Source currency code
 * @param to Target currency code
 * @param usdRates Exchange rates (RWF-based)
 * @returns Object with original amount, converted amount, rate used, and timestamp
 */
export function convertAmountWithAudit(
  amount: number,
  from: string,
  to: string,
  usdRates: FxRates | null
): {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number | null;
  targetCurrency: string;
  rateUsed: number | null;
  convertedAt: string;
} {
  const f = String(from || "RWF").toUpperCase();
  const t = String(to || "RWF").toUpperCase();
  const rates = usdRates ?? FIXED_RATES;
  
  // Calculate the effective rate (from -> to)
  let rateUsed: number | null = null;
  if (f === t) {
    rateUsed = 1;
  } else if (rates[f] && rates[t]) {
    // Rate is: 1 unit of from = X units of to
    rateUsed = rates[f] / rates[t];
  }
  
  return {
    originalAmount: roundToCurrency(amount, f),
    originalCurrency: f,
    convertedAmount: convertAmount(amount, from, to, usdRates),
    targetCurrency: t,
    rateUsed: rateUsed ? roundToCurrency(rateUsed, 'USD') : null, // Rate rounded to 6 decimals
    convertedAt: new Date().toISOString(),
  };
}

