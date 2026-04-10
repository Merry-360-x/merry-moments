const PENDING_PROMO_PREFILL_KEY = "merry360x.pending_promo_code";

export const SAVE10_PROMO_CODE = "SAVE10";

const normalizePromoCode = (value: string): string => value.trim().toUpperCase();

export const queuePromoPrefillCode = (value: string) => {
  const normalized = normalizePromoCode(value);
  if (!normalized || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PENDING_PROMO_PREFILL_KEY, normalized);
  } catch {
    // Ignore storage errors to avoid blocking navigation.
  }
};

export const readQueuedPromoPrefillCode = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(PENDING_PROMO_PREFILL_KEY);
    if (!stored) return null;

    const normalized = normalizePromoCode(stored);
    return normalized || null;
  } catch {
    return null;
  }
};

export const clearQueuedPromoPrefillCode = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(PENDING_PROMO_PREFILL_KEY);
  } catch {
    // Ignore storage errors to keep checkout flow resilient.
  }
};
