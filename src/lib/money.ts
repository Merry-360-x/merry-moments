export function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  const code = (currency || "RWF").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Fallback (for unexpected/unsupported currency codes)
    return `${code} ${Math.round(value).toLocaleString()}`;
  }
}

