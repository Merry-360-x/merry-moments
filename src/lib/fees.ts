/**
 * Platform Fee Configuration
 * 
 * Accommodation:
 * - Guest/Booker: +10% added on top of the host's price
 * - Host: -3% deducted from what they receive (they get 97% of their listed price)
 * 
 * Tours (including tour packages):
 * - Guest/Booker: 0% (no extra fee)
 * - Tour Provider: -10% deducted from what they receive (they get 90% of their listed price)
 * 
 * Transport:
 * - Currently no platform fees (can be added later)
 */

export const PLATFORM_FEES = {
  // Accommodation fees
  accommodation: {
    guestFeePercent: 10,  // Added to guest's total
    hostFeePercent: 3,   // Deducted from host's earnings
  },
  
  // Tour fees
  tour: {
    guestFeePercent: 0,    // No extra charge for guest
    providerFeePercent: 10, // Deducted from provider's earnings
  },
  
  // Transport fees (can be configured)
  transport: {
    guestFeePercent: 0,
    providerFeePercent: 0,
  },
} as const;

const ACCOMMODATION_GUEST_FEE_STORAGE_KEY = "merry360x.accommodationGuestFeePercent";
const MIN_GUEST_FEE_PERCENT = 0;
const MAX_GUEST_FEE_PERCENT = 100;

const clampGuestFeePercent = (value: number): number => {
  if (!Number.isFinite(value)) return PLATFORM_FEES.accommodation.guestFeePercent;
  return Math.min(MAX_GUEST_FEE_PERCENT, Math.max(MIN_GUEST_FEE_PERCENT, value));
};

const readAccommodationGuestFeeOverride = (): number | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACCOMMODATION_GUEST_FEE_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return clampGuestFeePercent(parsed);
  } catch {
    return null;
  }
};

export function setAccommodationGuestFeePercent(percent: number): number {
  const normalized = clampGuestFeePercent(percent);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ACCOMMODATION_GUEST_FEE_STORAGE_KEY, String(normalized));
    } catch {
    }
  }

  return normalized;
}

// Helper to get provider fee percent for any service type
export function getHostOrProviderFeePercent(serviceType: 'accommodation' | 'tour' | 'transport'): number {
  if (serviceType === 'accommodation') {
    return PLATFORM_FEES.accommodation.hostFeePercent;
  }
  return PLATFORM_FEES[serviceType].providerFeePercent;
}

/**
 * Calculate the guest total with platform fee added
 * @param basePrice - The original price set by the host/provider
 * @param serviceType - 'accommodation' | 'tour' | 'transport'
 * @returns Object with breakdown of fees and totals
 */
export function calculateGuestTotal(
  basePrice: number,
  serviceType: 'accommodation' | 'tour' | 'transport'
): {
  basePrice: number;
  platformFee: number;
  guestTotal: number;
  feePercent: number;
} {
  const feePercent = getGuestFeePercent(serviceType);
  const platformFee = (basePrice * feePercent) / 100;
  const guestTotal = basePrice + platformFee;
  
  return {
    basePrice,
    platformFee,
    guestTotal,
    feePercent,
  };
}

/**
 * Calculate what the host/provider receives after platform fee deduction
 * @param basePrice - The original price set by the host/provider
 * @param serviceType - 'accommodation' | 'tour' | 'transport'
 * @returns Object with breakdown of fees and net earnings
 */
export function calculateHostEarnings(
  basePrice: number,
  serviceType: 'accommodation' | 'tour' | 'transport'
): {
  grossAmount: number;
  platformFee: number;
  netEarnings: number;
  feePercent: number;
} {
  const feePercent = getHostOrProviderFeePercent(serviceType);
  const platformFee = (basePrice * feePercent) / 100;
  const netEarnings = basePrice - platformFee;
  
  return {
    grossAmount: basePrice,
    platformFee,
    netEarnings,
    feePercent,
  };
}

/**
 * Get the fee percentage for display
 */
export function getGuestFeePercent(serviceType: 'accommodation' | 'tour' | 'transport'): number {
  if (serviceType === 'accommodation') {
    return readAccommodationGuestFeeOverride() ?? PLATFORM_FEES.accommodation.guestFeePercent;
  }
  return PLATFORM_FEES[serviceType].guestFeePercent;
}

export function getProviderFeePercent(serviceType: 'accommodation' | 'tour' | 'transport'): number {
  return getHostOrProviderFeePercent(serviceType);
}

/**
 * Extract base price from the guest-paid total
 * Reverses the guest fee calculation to get the original price
 * 
 * @param guestPaidTotal - The amount the guest paid (including any guest fee)
 * @param serviceType - 'accommodation' | 'tour' | 'transport'
 * @returns The original base price before guest fees were added
 */
export function extractBasePrice(
  guestPaidTotal: number,
  serviceType: 'accommodation' | 'tour' | 'transport'
): number {
  const guestFeePercent = getGuestFeePercent(serviceType);
  // If guest paid 110% of base, then base = guestPaid / 1.10
  return guestPaidTotal / (1 + guestFeePercent / 100);
}

/**
 * Calculate what the host/provider receives from a guest-paid amount
 * This is the proper way to calculate host earnings when you only have
 * the total amount paid by the guest.
 * 
 * Example for Accommodation (base price 100):
 * - Guest paid: 110 (100 + 10% fee)
 * - Base price: 110 / 1.10 = 100
 * - Host fee: 3% of 100 = 3
 * - Host receives: 100 - 3 = 97
 * - Platform earns: 10 (from guest) + 3 (from host) = 13
 * 
 * Example for Tour (base price 100):
 * - Guest paid: 100 (no guest fee)
 * - Base price: 100
 * - Provider fee: 10% of 100 = 10
 * - Provider receives: 100 - 10 = 90
 * - Platform earns: 10
 * 
 * @param guestPaidTotal - The total amount the guest paid
 * @param serviceType - 'accommodation' | 'tour' | 'transport'
 */
export function calculateHostEarningsFromGuestTotal(
  guestPaidTotal: number,
  serviceType: 'accommodation' | 'tour' | 'transport'
): {
  guestPaidTotal: number;
  basePrice: number;
  guestFee: number;
  hostFee: number;
  hostNetEarnings: number;
  platformTotalEarnings: number;
} {
  const guestFeePercent = getGuestFeePercent(serviceType);
  const hostFeePercent = getHostOrProviderFeePercent(serviceType);
  
  // Extract base price from guest paid amount
  const basePrice = guestPaidTotal / (1 + guestFeePercent / 100);
  
  // Calculate fees
  const guestFee = guestPaidTotal - basePrice; // What guest paid extra
  const hostFee = (basePrice * hostFeePercent) / 100; // What host pays to platform
  const hostNetEarnings = basePrice - hostFee; // What host actually receives
  const platformTotalEarnings = guestFee + hostFee; // Platform's total take
  
  return {
    guestPaidTotal,
    basePrice,
    guestFee,
    hostFee,
    hostNetEarnings,
    platformTotalEarnings,
  };
}
