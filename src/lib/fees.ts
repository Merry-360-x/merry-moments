/**
 * Platform Fee Configuration
 * 
 * Accommodation:
 * - Guest/Booker: +7% added on top of the host's price
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
    guestFeePercent: 7, // Added to guest's total
    hostFeePercent: 3,   // Deducted from host's earnings
  },
  
  // Tour fees
  tour: {
    guestFeePercent: 0,   // No extra charge for guest
    providerFeePercent: 10, // Deducted from provider's earnings
  },
  
  // Transport fees (can be configured)
  transport: {
    guestFeePercent: 0,
    providerFeePercent: 0,
  },
};

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
  const feeConfig = PLATFORM_FEES[serviceType];
  const feePercent = feeConfig.guestFeePercent;
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
  const feeConfig = PLATFORM_FEES[serviceType];
  const feePercent = serviceType === 'accommodation' 
    ? feeConfig.hostFeePercent 
    : (feeConfig as any).providerFeePercent || 0;
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
  return PLATFORM_FEES[serviceType].guestFeePercent;
}

export function getProviderFeePercent(serviceType: 'accommodation' | 'tour' | 'transport'): number {
  const config = PLATFORM_FEES[serviceType];
  return serviceType === 'accommodation' 
    ? config.hostFeePercent 
    : (config as any).providerFeePercent || 0;
}
