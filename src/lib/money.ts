import type { FxRates } from "./fx";
import { convertAmount } from "./fx";

export function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  const code = (currency || "USD").toUpperCase();
  
  try {
    const num = new Intl.NumberFormat(undefined, { 
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value);
    
    // Always show amount with currency code for clarity
    // Format: "40 USD" or "1,000 RWF"
    return `${num} ${code}`;
  } catch {
    // Fallback (for unexpected/unsupported currency codes)
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${code}`;
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


