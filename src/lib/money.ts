import type { FxRates } from "./fx";
import { convertAmount } from "./fx";

export function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  const code = (currency || "USD").toUpperCase();
  
  // Currency symbol mapping
  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    RWF: "FRw",
    KES: "KSh",
    UGX: "USh",
    TZS: "TSh",
  };
  
  const symbol = currencySymbols[code] || code;
  
  try {
    const num = new Intl.NumberFormat(undefined, { 
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(value);
    
    // For USD, EUR, GBP - symbol goes before with no space
    if (["USD", "EUR", "GBP"].includes(code)) {
      return `${symbol}${num}`;
    }
    
    // For JPY, CNY (Asian currencies) - symbol before with space
    if (["JPY", "CNY"].includes(code)) {
      return `${symbol} ${num}`;
    }
    
    // For RWF and other African currencies - format with space after
    return `${num} ${symbol}`;
  } catch {
    // Fallback (for unexpected/unsupported currency codes)
    return `${symbol} ${Math.round(value).toLocaleString()}`;
  }
}

/**
 * Format money with automatic currency conversion
 * @param amount Original amount
 * @param fromCurrency Original currency
 * @param toCurrency Target currency to display
 * @param rates Exchange rates (USD-based)
 * @returns Formatted money string in target currency
 */
export function formatMoneyWithConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRates | null
): string {
  if (fromCurrency === toCurrency) {
    return formatMoney(amount, toCurrency);
  }
  
  if (!rates) {
    // No rates available, show original
    return formatMoney(amount, fromCurrency);
  }
  
  const converted = convertAmount(amount, fromCurrency, toCurrency, rates);
  
  if (converted === null) {
    // Conversion failed, show original
    return formatMoney(amount, fromCurrency);
  }
  
  return formatMoney(converted, toCurrency);
}


