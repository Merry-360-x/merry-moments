import type { FxRates } from "./fx";
import { convertAmount, getCurrencyDecimals, roundToCurrency } from "./fx";

/**
 * Format money with proper decimal places for the currency
 * Uses the correct number of decimal places based on currency standard:
 * - 0 decimals: RWF, JPY, KRW, etc.
 * - 2 decimals: USD, EUR, GBP, etc. (default)
 * - 3 decimals: KWD, BHD, OMR
 * 
 * @param amount The amount to format
 * @param currency The currency code
 * @returns Formatted money string (e.g., "1,234 RWF" or "99.99 USD")
 */
export function formatMoney(amount: number, currency: string): string {
  const code = (currency || "USD").toUpperCase();
  const decimals = getCurrencyDecimals(code);
  
  // Round to proper precision first
  const rounded = roundToCurrency(amount, code);
  
  try {
    const num = new Intl.NumberFormat(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(rounded);
    
    // Format: "1,000 RWF" or "99.99 USD"
    return `${num} ${code}`;
  } catch {
    // Fallback for unexpected currency codes
    return `${rounded.toLocaleString(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    })} ${code}`;
  }
}

/**
 * Format money with automatic currency conversion
 * Uses proper financial precision for both source and target currencies
 * 
 * @param amount Original amount
 * @param fromCurrency Original currency
 * @param toCurrency Target currency to display
 * @param rates Exchange rates (RWF-based)
 * @returns Formatted money string in target currency
 */
export function formatMoneyWithConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRates | null
): string {
  const from = (fromCurrency || "USD").toUpperCase();
  const to = (toCurrency || "USD").toUpperCase();
  
  if (from === to) {
    return formatMoney(amount, to);
  }
  
  if (!rates) {
    // No rates available, show original
    return formatMoney(amount, from);
  }
  
  // convertAmount already applies proper rounding
  const converted = convertAmount(amount, from, to, rates);
  
  if (converted === null) {
    // Conversion failed, show original
    return formatMoney(amount, from);
  }
  
  return formatMoney(converted, to);
}

/**
 * Parse a money string back to number
 * Handles various formats: "1,234.56", "1.234,56", "1234.56 USD"
 * 
 * @param value The string to parse
 * @returns Numeric value, or 0 if parsing fails
 */
export function parseMoney(value: string): number {
  if (!value || typeof value !== "string") return 0;
  
  // Remove currency codes and whitespace
  let cleaned = value.replace(/[A-Z]{3}/gi, "").trim();
  
  // Handle both comma and period as thousands separators or decimal points
  // If there's both comma and period, the last one is the decimal separator
  const lastComma = cleaned.lastIndexOf(",");
  const lastPeriod = cleaned.lastIndexOf(".");
  
  if (lastComma > lastPeriod) {
    // European format: 1.234,56
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // US format: 1,234.56
    cleaned = cleaned.replace(/,/g, "");
  }
  
  const result = parseFloat(cleaned);
  return Number.isFinite(result) ? result : 0;
}


