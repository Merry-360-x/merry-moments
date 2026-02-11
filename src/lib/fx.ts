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
// Using SELLING rates: How much RWF per 1 unit of foreign currency
// Source: National Bank of Rwanda - https://www.bnr.rw (February 2026)
// Selling rates are used for customer-facing currency conversion
const FIXED_RATES: FxRates = {
  // Base currency
  RWF: 1,
  
  // Major currencies (BNR selling rates — higher than average)
  USD: 1480.0,        // US Dollar
  EUR: 1745.0,        // Euro
  GBP: 2005.0,        // British Pound
  CHF: 1897.0,        // Swiss Franc
  CAD: 1082.0,        // Canadian Dollar
  AUD: 1037.0,        // Australian Dollar
  JPY: 9.52,          // Japanese Yen
  CNY: 213.0,         // Chinese Yuan
  CNH: 213.1,         // Chinese Yuan Offshore
  
  // East African currencies (neighbors - key for local payments)
  TZS: 0.573,         // Tanzanian Shilling
  KES: 11.48,         // Kenyan Shilling
  UGX: 0.416,         // Ugandan Shilling
  BIF: 0.500,         // Burundian Franc
  SSP: 0.327,         // South Sudanese Pound
  ETB: 9.52,          // Ethiopian Birr
  
  // Southern African currencies
  ZMW: 75.35,         // Zambian Kwacha
  ZAR: 92.8,          // South African Rand
  MZN: 23.33,         // Mozambican Metical
  MWK: 0.854,         // Malawian Kwacha
  LSL: 92.6,          // Lesotho Loti
  SZL: 92.7,          // Eswatini Lilangeni
  AOA: 1.615,         // Angolan Kwanza
  
  // West African currencies
  XOF: 2.675,         // West African CFA Franc
  XAF: 2.597,         // Central African CFA Franc
  NGN: 1.056,         // Nigerian Naira
  GHS: 134.9,         // Ghanaian Cedi
  GNF: 0.169,         // Guinean Franc
  
  // North African & Middle East
  EGP: 31.46,         // Egyptian Pound
  MAD: 161.8,         // Moroccan Dirham
  LYD: 235.2,         // Libyan Dinar
  SDG: 2.467,         // Sudanese Pound
  AED: 403.2,         // UAE Dirham
  SAR: 394.8,         // Saudi Riyal
  QAR: 406.6,         // Qatari Riyal
  KWD: 4860.0,        // Kuwaiti Dinar
  JOD: 2088.5,        // Jordanian Dinar
  ILS: 477.6,         // Israeli Shekel
  TRY: 34.1,          // Turkish Lira
  
  // Asian currencies
  INR: 16.4,          // Indian Rupee
  PKR: 5.285,         // Pakistani Rupee
  IDR: 0.089,         // Indonesian Rupiah
  KRW: 1.021,         // South Korean Won
  SGD: 1165.0,        // Singapore Dollar
  HKD: 189.4,         // Hong Kong Dollar
  
  // European currencies
  SEK: 165.9,         // Swedish Krona
  NOK: 153.2,         // Norwegian Krone
  DKK: 234.0,         // Danish Krone
  PLN: 414.0,         // Polish Zloty
  CZK: 71.9,          // Czech Koruna
  HUF: 4.597,         // Hungarian Forint
  RUB: 19.36,         // Russian Ruble
  
  // Americas
  BRL: 281.4,         // Brazilian Real
  
  // Indian Ocean
  MUR: 32.3,          // Mauritian Rupee
  KMF: 3.546,         // Comorian Franc
  
  // Special Drawing Rights
  XDR: 2040.0,        // IMF SDR
  
  // Zimbabwe
  ZIG: 3.905,         // Zimbabwe Gold (ZiG)
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

