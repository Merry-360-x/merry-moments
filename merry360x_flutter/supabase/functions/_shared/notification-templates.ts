export interface NotificationPayload {
  userId: string
  type: string
  title: string
  body: string
  screenRoute: string
  data?: Record<string, string>
}

export interface BookingInfo {
  id: string
  guest_id?: string
  host_id?: string
  property_id?: string
  tour_id?: string
  transport_id?: string
  title?: string
  guest_name?: string
  check_in?: string
  check_out?: string
  total_amount?: number
  currency?: string
  status?: string
  payment_status?: string
}

export interface ReviewInfo {
  id: string
  booking_id: string
  reviewer_id: string
  host_id: string
  rating: number
  comment?: string
  reviewer_name?: string
}

export interface MessageInfo {
  id: string
  sender_id: string
  receiver_id: string
  booking_id?: string
  content?: string
  sender_name?: string
}

function fmtDate(d: string): string {
  if (!d) return ''
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d }
}

function formatRWF(amount: number): string {
  return `RWF ${amount.toLocaleString('en-RW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ── Guest notification builders ──

export function bookingRequestSent(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'booking_request_sent',
    title: 'Booking Request Sent',
    body: `Your booking request for ${propertyName} has been sent. Awaiting host confirmation.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function bookingConfirmedByHost(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'booking_confirmed',
    title: 'Booking Confirmed!',
    body: `${propertyName} is confirmed! Check-in: ${fmtDate(booking.check_in!)}, Check-out: ${fmtDate(booking.check_out!)}.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function bookingDeclinedByHost(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'booking_declined',
    title: 'Booking Declined',
    body: `Unfortunately, ${propertyName} declined your booking request. Browse other listings.`,
    screenRoute: '/my-bookings',
    data: { booking_id: booking.id },
  }
}

export function bookingCancelledByHost(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'booking_cancelled',
    title: 'Booking Cancelled',
    body: `Your booking at ${propertyName} was cancelled by the host.`,
    screenRoute: '/my-bookings',
    data: { booking_id: booking.id },
  }
}

export function paymentSuccessful(booking: BookingInfo, amountRWF: number): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'payment_success',
    title: 'Payment Successful',
    body: `Payment of ${formatRWF(amountRWF)} received. Your booking is confirmed!`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function paymentFailed(booking: BookingInfo): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'payment_failed',
    title: 'Payment Failed',
    body: `Payment for ${booking.title ?? 'your booking'} failed. Please try again with a different payment method.`,
    screenRoute: `/checkout?booking_id=${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function refundIssued(booking: BookingInfo, amountRWF: number): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'refund_issued',
    title: 'Refund Issued',
    body: `A refund of ${formatRWF(amountRWF)} has been issued for booking at ${booking.title ?? ''}.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function checkInReminder(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'check_in_reminder',
    title: 'Check-in Tomorrow!',
    body: `You check into ${propertyName} tomorrow (${fmtDate(booking.check_in!)}). Have a great stay!`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function checkOutReminder(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'check_out_reminder',
    title: 'Check-out Tomorrow',
    body: `Check-out from ${propertyName} is tomorrow (${fmtDate(booking.check_out!)}). We hope you enjoyed your stay!`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function reviewReminder(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'review_reminder',
    title: 'How was your stay?',
    body: `Leave a review for ${propertyName} and help other travelers.`,
    screenRoute: `/review?booking_id=${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function hostRepliedToReview(review: ReviewInfo, propertyName: string): NotificationPayload {
  return {
    userId: review.reviewer_id,
    type: 'host_review_reply',
    title: 'Host Replied to Your Review',
    body: `The host of ${propertyName} replied to your review.`,
    screenRoute: `/property/${review.booking_id}/reviews`,
    data: { review_id: review.id, booking_id: review.booking_id },
  }
}

export function priceDrop(propertyName: string, userId: string, newPriceRWF: number): NotificationPayload {
  return {
    userId,
    type: 'price_drop',
    title: 'Price Dropped!',
    body: `${propertyName} is now ${formatRWF(newPriceRWF)}/night. Check it out before it's booked!`,
    screenRoute: '/wishlists',
    data: {},
  }
}

export function propertyAvailable(propertyName: string, userId: string): NotificationPayload {
  return {
    userId,
    type: 'property_available',
    title: 'Property Available!',
    body: `Good news! ${propertyName} is now available for your saved dates.`,
    screenRoute: '/wishlists',
    data: {},
  }
}

export function newMessageFromHost(msg: MessageInfo): NotificationPayload {
  return {
    userId: msg.receiver_id,
    type: 'new_message',
    title: `Message from ${msg.sender_name ?? 'Host'}`,
    body: msg.content?.substring(0, 120) ?? 'You have a new message.',
    screenRoute: `/messages/${msg.booking_id ?? msg.id}`,
    data: { message_id: msg.id, booking_id: msg.booking_id ?? '' },
  }
}

// ── Host notification builders ──

export function newBookingRequest(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'new_booking_request',
    title: 'New Booking Request',
    body: `${guestName} wants to book ${propertyName} (${fmtDate(booking.check_in!)} → ${fmtDate(booking.check_out!)}).`,
    screenRoute: `/host/bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function instantBookingConfirmed(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'instant_booking_confirmed',
    title: 'Instant Booking!',
    body: `${guestName} booked ${propertyName} (${fmtDate(booking.check_in!)} → ${fmtDate(booking.check_out!)}).`,
    screenRoute: `/host/bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function bookingCancelledByGuest(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'booking_cancelled_by_guest',
    title: 'Booking Cancelled',
    body: `${guestName} cancelled their booking at ${propertyName}.`,
    screenRoute: '/host/bookings',
    data: { booking_id: booking.id },
  }
}

export function guestCheckInReminderHost(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'guest_check_in_reminder',
    title: 'Guest Check-in Tomorrow',
    body: `${guestName} checks into ${propertyName} tomorrow. Ensure everything is ready!`,
    screenRoute: `/host/bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function guestCheckedOut(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'guest_checked_out',
    title: 'Guest Checked Out',
    body: `${guestName} checked out of ${propertyName}. Time to prepare for the next guest.`,
    screenRoute: `/host/bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function payoutSent(hostId: string, amountRWF: number): NotificationPayload {
  return {
    userId: hostId,
    type: 'payout_sent',
    title: 'Payout Sent',
    body: `${formatRWF(amountRWF)} has been sent to your account.`,
    screenRoute: '/host/payouts',
    data: {},
  }
}

export function payoutFailed(hostId: string, amountRWF: number, reason: string): NotificationPayload {
  return {
    userId: hostId,
    type: 'payout_failed',
    title: 'Payout Failed',
    body: `Payout of ${formatRWF(amountRWF)} failed: ${reason}. Update your payout details.`,
    screenRoute: '/host/payouts',
    data: {},
  }
}

export function newReviewReceived(review: ReviewInfo, propertyName: string): NotificationPayload {
  return {
    userId: review.host_id,
    type: 'new_review',
    title: 'New Review',
    body: `${review.reviewer_name ?? 'A guest'} left a ${review.rating}-star review for ${propertyName}.`,
    screenRoute: `/host/properties/${propertyName}/reviews`,
    data: { review_id: review.id, booking_id: review.booking_id, rating: review.rating.toString() },
  }
}

export function listingApproved(hostId: string, listingName: string): NotificationPayload {
  return {
    userId: hostId,
    type: 'listing_approved',
    title: 'Listing Approved!',
    body: `${listingName} is now live and visible to guests.`,
    screenRoute: '/host/listings',
    data: {},
  }
}

export function listingFlagged(hostId: string, listingName: string, reason: string): NotificationPayload {
  return {
    userId: hostId,
    type: 'listing_flagged',
    title: 'Listing Needs Attention',
    body: `${listingName} was flagged: ${reason}. Please review and take action.`,
    screenRoute: '/host/listings',
    data: {},
  }
}

export function newMessageFromGuest(msg: MessageInfo): NotificationPayload {
  return {
    userId: msg.receiver_id,
    type: 'new_message',
    title: `Message from ${msg.sender_name ?? 'Guest'}`,
    body: msg.content?.substring(0, 120) ?? 'You have a new message.',
    screenRoute: `/host/messages/${msg.booking_id ?? msg.id}`,
    data: { message_id: msg.id, booking_id: msg.booking_id ?? '' },
  }
}

// ── System notification builders ──

export function accountVerified(userId: string): NotificationPayload {
  return {
    userId,
    type: 'account_verified',
    title: 'Account Verified',
    body: 'Your account has been successfully verified. You can now book and host.',
    screenRoute: '/profile',
    data: {},
  }
}

export function passwordChanged(userId: string): NotificationPayload {
  return {
    userId,
    type: 'password_changed',
    title: 'Password Changed',
    body: 'Your password was changed successfully. If this wasn\'t you, contact support immediately.',
    screenRoute: '/profile',
    data: {},
  }
}

export function newFeature(userId: string, featureName: string): NotificationPayload {
  return {
    userId,
    type: 'new_feature',
    title: 'New Feature!',
    body: `Check out ${featureName} — now available on Merry360x.`,
    screenRoute: '/explore',
    data: {},
  }
}

export function promotionalOffer(userId: string, offerTitle: string, discount: string): NotificationPayload {
  return {
    userId,
    type: 'promotional_offer',
    title: 'Special Offer!',
    body: `${offerTitle} — ${discount} off your next booking!`,
    screenRoute: '/explore',
    data: {},
  }
}

export type NotificationBuilder = (...args: any[]) => NotificationPayload
