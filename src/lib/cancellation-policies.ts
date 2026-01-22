/**
 * Cancellation Policy Utilities
 * Standardized cancellation policies for tours and packages
 */

export type CancellationPolicyType = 'flexible' | 'moderate' | 'standard' | 'strict' | 'custom';

export interface CancellationPolicy {
  type: CancellationPolicyType;
  label: string;
  description: string;
  refundSchedule: {
    days: number;
    refundPercentage: number;
    description: string;
  }[];
  icon: string;
}

export const CANCELLATION_POLICIES: Record<CancellationPolicyType, CancellationPolicy> = {
  flexible: {
    type: 'flexible',
    label: 'Flexible',
    description: 'Full refund if cancelled at least 24 hours before the experience starts',
    icon: '✅',
    refundSchedule: [
      { days: 1, refundPercentage: 100, description: 'Full refund if cancelled 24+ hours before' },
      { days: 0, refundPercentage: 0, description: 'No refund if cancelled within 24 hours' }
    ]
  },
  moderate: {
    type: 'moderate',
    label: 'Moderate',
    description: 'Full refund if cancelled at least 7 days before, 50% refund if 3-7 days before',
    icon: '⚖️',
    refundSchedule: [
      { days: 7, refundPercentage: 100, description: 'Full refund if cancelled 7+ days before' },
      { days: 3, refundPercentage: 50, description: '50% refund if cancelled 3-6 days before' },
      { days: 0, refundPercentage: 0, description: 'No refund if cancelled within 3 days' }
    ]
  },
  standard: {
    type: 'standard',
    label: 'Standard',
    description: 'Full refund if cancelled at least 14 days before, 50% refund if 7-14 days before',
    icon: '📋',
    refundSchedule: [
      { days: 14, refundPercentage: 100, description: 'Full refund if cancelled 14+ days before' },
      { days: 7, refundPercentage: 50, description: '50% refund if cancelled 7-13 days before' },
      { days: 0, refundPercentage: 0, description: 'No refund if cancelled within 7 days' }
    ]
  },
  strict: {
    type: 'strict',
    label: 'Strict',
    description: 'Full refund if cancelled at least 30 days before, 50% refund if 14-30 days before',
    icon: '🔒',
    refundSchedule: [
      { days: 30, refundPercentage: 100, description: 'Full refund if cancelled 30+ days before' },
      { days: 14, refundPercentage: 50, description: '50% refund if cancelled 14-29 days before' },
      { days: 0, refundPercentage: 0, description: 'No refund if cancelled within 14 days' }
    ]
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    description: 'Custom cancellation terms set by the provider',
    icon: '⚙️',
    refundSchedule: []
  }
};

export function getCancellationPolicyDetails(policyType: CancellationPolicyType | string): CancellationPolicy {
  const policy = CANCELLATION_POLICIES[policyType as CancellationPolicyType];
  return policy || CANCELLATION_POLICIES.standard;
}

export function formatRefundSchedule(policy: CancellationPolicy): string {
  if (policy.type === 'custom') {
    return 'See custom policy details';
  }
  
  return policy.refundSchedule
    .map(schedule => `${schedule.description}`)
    .join('. ');
}

export function calculateRefundAmount(
  totalAmount: number,
  daysBeforeStart: number,
  policyType: CancellationPolicyType
): { refundAmount: number; refundPercentage: number } {
  const policy = getCancellationPolicyDetails(policyType);
  
  if (policy.type === 'custom') {
    return { refundAmount: 0, refundPercentage: 0 };
  }

  // Find the applicable refund tier
  const applicableTier = [...policy.refundSchedule]
    .reverse()
    .find(tier => daysBeforeStart >= tier.days);

  const refundPercentage = applicableTier?.refundPercentage ?? 0;
  const refundAmount = (totalAmount * refundPercentage) / 100;

  return { refundAmount, refundPercentage };
}
