export type FxRates = Record<string, number>;

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

