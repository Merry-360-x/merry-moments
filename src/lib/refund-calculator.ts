import { supabase } from '@/integrations/supabase/client';

/**
 * Cancellation policy refund percentages based on days until check-in
 */
const REFUND_POLICIES = {
  flexible: [
    { minDays: 1, refundPct: 100, description: 'Full refund (1+ days notice)' },
    { minDays: 0, refundPct: 0, description: 'No refund (less than 1 day notice)' }
  ],
  moderate: [
    { minDays: 5, refundPct: 100, description: 'Full refund (5+ days notice)' },
    { minDays: 3, refundPct: 50, description: '50% refund (3-4 days notice)' },
    { minDays: 0, refundPct: 0, description: 'No refund (less than 3 days notice)' }
  ],
  standard: [
    { minDays: 5, refundPct: 100, description: 'Full refund (5+ days notice)' },
    { minDays: 3, refundPct: 50, description: '50% refund (3-4 days notice)' },
    { minDays: 0, refundPct: 0, description: 'No refund (less than 3 days notice)' }
  ],
  strict: [
    { minDays: 14, refundPct: 100, description: 'Full refund (14+ days notice)' },
    { minDays: 7, refundPct: 50, description: '50% refund (7-13 days notice)' },
    { minDays: 0, refundPct: 0, description: 'No refund (less than 7 days notice)' }
  ],
  fair: [
    { minDays: 7, refundPct: 100, description: 'Full refund (7+ days notice)' },
    { minDays: 2, refundPct: 50, description: '50% refund (2-6 days notice)' },
    { minDays: 0, refundPct: 0, description: 'No refund (less than 2 days notice)' }
  ],
  non_refundable: [
    { minDays: 0, refundPct: 0, description: 'Non-refundable' }
  ],
  multiday_private: [
    { minDays: 14, refundPct: 100, description: 'Full refund (14+ days notice)' },
    { minDays: 7, refundPct: 50, description: '50% refund (7-13 days notice)' },
    { minDays: 0, refundPct: 0, description: 'No refund (less than 7 days notice)' }
  ]
};

export interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  policyType: string;
  description: string;
  currency: string;
}

/**
 * Calculate refund amount for a single booking based on cancellation policy
 */
export async function calculateBookingRefund(
  bookingId: string
): Promise<RefundCalculation | null> {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single() as any;

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return null;
    }

    console.log('Calculating refund for booking:', {
      id: booking.id,
      status: booking.status,
      payment_status: booking.payment_status,
      total_price: booking.total_price,
      check_in: booking.check_in,
      booking_type: booking.booking_type
    });

    // Only calculate refund for cancelled paid bookings
    if (booking.status !== 'cancelled' || booking.payment_status !== 'paid') {
      console.log('Booking not eligible for refund:', booking.status, booking.payment_status);
      return null;
    }

    if (!booking.check_in || !booking.total_price) {
      console.error('Missing required booking data:', { check_in: booking.check_in, total_price: booking.total_price });
      return null;
    }

    const checkInDate = new Date(booking.check_in);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);
    
    const daysUntilCheckIn = Math.floor(
      (checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log('Days until check-in:', daysUntilCheckIn);

    let policyType = 'fair'; // Default to fair policy

    // Get cancellation policy based on booking type
    if (booking.booking_type === 'property' && booking.property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('cancellation_policy')
        .eq('id', booking.property_id)
        .single() as any;
      
      policyType = property?.cancellation_policy || 'fair';
      console.log('Property policy:', policyType);
    } else if (booking.booking_type === 'tour' && booking.tour_id) {
      const { data: tour } = await supabase
        .from('tour_packages')
        .select('cancellation_policy_type')
        .eq('id', booking.tour_id)
        .single() as any;
      
      policyType = tour?.cancellation_policy_type || 'fair';
      console.log('Tour policy:', policyType);
    } else {
      console.log('Using default policy: fair');
    }

    // Get refund percentage
    const policy = REFUND_POLICIES[policyType as keyof typeof REFUND_POLICIES] || REFUND_POLICIES.fair;
    const refundRule = policy.find(rule => daysUntilCheckIn >= rule.minDays) || policy[policy.length - 1];

    const refundAmount = (Number(booking.total_price) * refundRule.refundPct) / 100;

    console.log('Refund calculation:', {
      policy: policyType,
      rule: refundRule,
      totalPrice: booking.total_price,
      refundPct: refundRule.refundPct,
      refundAmount
    });

    return {
      refundAmount,
      refundPercentage: refundRule.refundPct,
      policyType,
      description: refundRule.description,
      currency: booking.currency || 'USD'
    };
  } catch (error) {
    console.error('Error calculating refund:', error);
    return null;
  }
}

/**
 * Calculate total refund for bulk order (multiple bookings with same order_id)
 */
export async function calculateBulkOrderRefund(
  orderId: string
): Promise<RefundCalculation | null> {
  try {
    // Get all bookings in the bulk order
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('order_id', orderId) as any;

    if (bookingsError || !bookings || bookings.length === 0) {
      console.error('Error fetching bookings:', bookingsError);
      return null;
    }

    // Calculate refund for each booking
    const refundPromises = bookings.map((booking: any) => 
      calculateBookingRefund(booking.id)
    );

    const refunds = await Promise.all(refundPromises);
    const validRefunds = refunds.filter(r => r !== null) as RefundCalculation[];

    if (validRefunds.length === 0) {
      return null;
    }

    // Sum up all refunds
    const totalRefund = validRefunds.reduce((sum, r) => sum + r.refundAmount, 0);
    const avgPercentage = Math.round(
      validRefunds.reduce((sum, r) => sum + r.refundPercentage, 0) / validRefunds.length
    );

    // Use currency from first booking
    const currency = validRefunds[0].currency;

    return {
      refundAmount: totalRefund,
      refundPercentage: avgPercentage,
      policyType: 'bulk',
      description: `${validRefunds.length} booking(s) - various policies`,
      currency
    };
  } catch (error) {
    console.error('Error calculating bulk refund:', error);
    return null;
  }
}

/**
 * Get refund info for display (handles both single and bulk bookings)
 */
export async function getRefundInfo(
  bookingId: string,
  orderId?: string | null
): Promise<RefundCalculation | null> {
  // If it's a bulk order, calculate total refund for all items
  if (orderId) {
    return calculateBulkOrderRefund(orderId);
  }
  
  // Otherwise, calculate refund for single booking
  return calculateBookingRefund(bookingId);
}
