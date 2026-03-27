/**
 * Centralized currency configuration for Merry360x
 * 
 * Display currencies: Used for listing prices throughout the website
 * Payment currencies: All currencies that can be used at checkout (with conversion)
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

// Main display currencies - used for listing prices
export const DISPLAY_CURRENCIES: Currency[] = [
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
];

// Currency select options for forms
export const CURRENCY_OPTIONS = DISPLAY_CURRENCIES.map(c => ({
  value: c.code,
  label: `(${c.symbol}) ${c.code}`,
  symbol: c.symbol,
}));

// Payment currencies - all currencies accepted at checkout (with conversion)
// This includes regional currencies for easier payment
export const PAYMENT_CURRENCIES: Currency[] = [
  // Primary currencies
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  // East African currencies (for regional travelers)
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
  { code: "BIF", name: "Burundian Franc", symbol: "FBu" },
  // Other popular currencies for international travelers
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
];

// Get currency by code
export function getCurrency(code: string): Currency | undefined {
  return [...DISPLAY_CURRENCIES, ...PAYMENT_CURRENCIES].find(
    c => c.code.toUpperCase() === code.toUpperCase()
  );
}

// Get currency symbol
export function getCurrencySymbol(code: string): string {
  const currency = getCurrency(code);
  return currency?.symbol || code;
}

// Check if currency is a display currency
export function isDisplayCurrency(code: string): boolean {
  return DISPLAY_CURRENCIES.some(c => c.code.toUpperCase() === code.toUpperCase());
}

// Default currency
export const DEFAULT_CURRENCY = "RWF";
