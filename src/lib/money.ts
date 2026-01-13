export function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  const code = (currency || "RWF").toUpperCase();
  
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

