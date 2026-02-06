export type FxRates = Record<string, number>;

// Fixed exchange rates based on BNR rates (03-Feb-26)
// Using SELL rates: How much RWF you pay per 1 unit of foreign currency
// Source: National Bank of Rwanda - https://www.bnr.rw
const FIXED_RATES: FxRates = {
  // Base currency
  RWF: 1,
  
  // Major currencies
  USD: 1460.15,       // US Dollar
  EUR: 1724.875195,   // Euro
  GBP: 1998.94535,    // British Pound
  CHF: 1876.67969,    // Swiss Franc
  CAD: 1068.806438,   // Canadian Dollar
  AUD: 1024.587255,   // Australian Dollar
  JPY: 9.397525,      // Japanese Yen
  CNY: 210.429517,    // Chinese Yuan
  CNH: 210.528077,    // Chinese Yuan Offshore
  
  // East African currencies (neighbors - key for local payments)
  TZS: 0.565078,      // Tanzanian Shilling
  KES: 11.319083,     // Kenyan Shilling
  UGX: 0.409572,      // Ugandan Shilling
  BIF: 0.492801,      // Burundian Franc
  SSP: 0.321963,      // South Sudanese Pound
  ETB: 9.382924,      // Ethiopian Birr
  
  // Southern African currencies
  ZMW: 74.287321,     // Zambian Kwacha
  ZAR: 91.369616,     // South African Rand
  MZN: 22.958669,     // Mozambican Metical
  MWK: 0.841776,      // Malawian Kwacha
  LSL: 91.435323,     // Lesotho Loti
  SZL: 91.366696,     // Eswatini Lilangeni
  AOA: 1.588643,      // Angolan Kwanza
  
  // West African currencies
  NGN: 1.042547,      // Nigerian Naira
  GHS: 133.16495,     // Ghanaian Cedi
  XOF: 2.640681,      // West African CFA Franc
  XAF: 2.561833,      // Central African CFA Franc
  GNF: 0.166457,      // Guinean Franc
  
  // North African & Middle East
  EGP: 31.007745,     // Egyptian Pound
  MAD: 159.553511,    // Moroccan Dirham
  LYD: 231.196501,    // Libyan Dinar
  SDG: 2.43334,       // Sudanese Pound
  AED: 397.579863,    // UAE Dirham
  SAR: 389.352648,    // Saudi Riyal
  QAR: 400.644718,    // Qatari Riyal
  KWD: 4782.67241,    // Kuwaiti Dinar
  JOD: 2059.453966,   // Jordanian Dinar
  ILS: 471.53354,     // Israeli Shekel
  TRY: 33.58199,      // Turkish Lira
  
  // Asian currencies
  INR: 16.1624,       // Indian Rupee
  PKR: 5.205435,      // Pakistani Rupee
  IDR: 0.087609,      // Indonesian Rupiah
  KRW: 1.007503,      // South Korean Won
  SGD: 1149.634501,   // Singapore Dollar
  HKD: 186.89555,     // Hong Kong Dollar
  
  // European currencies
  SEK: 163.373263,    // Swedish Krona
  NOK: 150.985351,    // Norwegian Krone
  DKK: 230.961416,    // Danish Krone
  PLN: 408.593044,    // Polish Zloty
  CZK: 70.977891,     // Czech Koruna
  HUF: 4.527195,      // Hungarian Forint
  RUB: 19.071749,     // Russian Ruble
  
  // Americas
  BRL: 277.550423,    // Brazilian Real
  
  // Indian Ocean
  MUR: 31.83273,      // Mauritian Rupee
  KMF: 3.50071,       // Comorian Franc
  
  // Special Drawing Rights
  XDR: 2011.669097,   // IMF SDR
  
  // Zimbabwe
  ZIG: 3.848225,      // Zimbabwe Gold (ZiG)
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

