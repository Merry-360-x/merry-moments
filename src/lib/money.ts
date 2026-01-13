export function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  const code = (currency || "RWF").toUpperCase();
  try {
    // Prefer symbols (e.g. $, €, £, ¥) instead of currency codes (USD, EUR, etc).
    // Rwanda Franc doesn't have a consistent "narrow symbol" across locales, so we override to "FRw".
    if (code === "RWF") {
      // Format number without currency then prefix with FRw.
      const num = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
      return `FRw ${num}`;
    }
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Fallback (for unexpected/unsupported currency codes)
    return `${code} ${Math.round(value).toLocaleString()}`;
  }
}

