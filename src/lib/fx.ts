export type FxRates = Record<string, number>;

// Official exchange rates from BNR (National Bank of Rwanda)
// Using AVERAGE rates: How much RWF per 1 unit of foreign currency
// Source: National Bank of Rwanda - https://www.bnr.rw (February 2026)
const FIXED_RATES: FxRates = {
  // Base currency
  RWF: 1,
  
  // Major currencies (from official BNR rates)
  USD: 1455.5,        // US Dollar
  EUR: 1716.76225,    // Euro
  GBP: 1972.4936,     // British Pound
  CHF: 1864.929785,   // Swiss Franc
  CAD: 1063.496145,   // Canadian Dollar
  AUD: 1019.055385,   // Australian Dollar
  JPY: 9.349655,      // Japanese Yen
  CNY: 209.262105,    // Chinese Yuan
  CNH: 209.363255,    // Chinese Yuan Offshore
  
  // East African currencies (neighbors - key for local payments)
  TZS: 0.563279,      // Tanzanian Shilling
  KES: 11.283036,     // Kenyan Shilling
  UGX: 0.408996,      // Ugandan Shilling
  BIF: 0.490914,      // Burundian Franc
  SSP: 0.321098,      // South Sudanese Pound
  ETB: 9.350965,      // Ethiopian Birr
  
  // Southern African currencies
  ZMW: 74.076715,     // Zambian Kwacha
  ZAR: 91.192275,     // South African Rand
  MZN: 22.92695,      // Mozambican Metical
  MWK: 0.838935,      // Malawian Kwacha
  LSL: 91.00316,      // Lesotho Loti
  SZL: 91.100012,     // Eswatini Lilangeni
  AOA: 1.586875,      // Angolan Kwanza
  
  // West African currencies
  XOF: 2.628875,      // West African CFA Franc
  XAF: 2.55203,       // Central African CFA Franc
  NGN: 1.037465,      // Nigerian Naira
  GHS: 132.59715,     // Ghanaian Cedi
  GNF: 0.16589,       // Guinean Franc
  
  // North African & Middle East
  EGP: 30.915785,     // Egyptian Pound
  MAD: 159.01024,     // Moroccan Dirham
  LYD: 231.145,       // Libyan Dinar
  SDG: 2.423565,      // Sudanese Pound
  AED: 396.323917,    // UAE Dirham
  SAR: 388.120933,    // Saudi Riyal
  QAR: 399.609483,    // Qatari Riyal
  KWD: 4775.94195,    // Kuwaiti Dinar
  JOD: 2052.620263,   // Jordanian Dinar
  ILS: 469.42085,     // Israeli Shekel
  TRY: 33.50093,      // Turkish Lira
  
  // Asian currencies
  INR: 16.11375,      // Indian Rupee
  PKR: 5.193575,      // Pakistani Rupee
  IDR: 0.08747,       // Indonesian Rupiah
  KRW: 1.003445,      // South Korean Won
  SGD: 1144.87635,    // Singapore Dollar
  HKD: 186.119795,    // Hong Kong Dollar
  
  // European currencies
  SEK: 163.086285,    // Swedish Krona
  NOK: 150.62022,     // Norwegian Krone
  DKK: 229.92916,     // Danish Krone
  PLN: 406.8785,      // Polish Zloty
  CZK: 70.68985,      // Czech Koruna
  HUF: 4.517335,      // Hungarian Forint
  RUB: 19.02,         // Russian Ruble
  
  // Americas
  BRL: 276.53305,     // Brazilian Real
  
  // Indian Ocean
  MUR: 31.73655,      // Mauritian Rupee
  KMF: 3.485015,      // Comorian Franc
  
  // Special Drawing Rights
  XDR: 2005.0465,     // IMF SDR
  
  // Zimbabwe
  ZIG: 3.837035,      // Zimbabwe Gold (ZiG)
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

