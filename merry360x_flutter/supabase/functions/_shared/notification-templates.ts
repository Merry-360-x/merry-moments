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

export interface ChargeInfo {
  id: string
  booking_id: string
  host_id: string
  guest_id: string
  amount: number
  currency: string
  reason: string
  status: string
}

export interface DisputeInfo {
  id: string
  booking_id: string
  opened_by: string
  guest_id: string
  host_id: string
  reason: string
}

export interface TicketInfo {
  id: string
  user_id: string
  user_name: string
  subject: string
}

export interface PropertyInfo {
  id: string
  host_id: string
  host_name: string
  title: string
  location: string
}

function fmtDate(d: string): string {
  if (!d) return ''
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d }
}

function formatAmount(amount: number, currency: string = 'RWF'): string {
  const sym = currency === 'RWF' ? 'RWF ' : currency === 'USD' ? '$' : currency + ' '
  return sym + amount.toLocaleString('en-RW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Guest notification builders ──

export function bookingRequestSent(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'booking_request_sent',
    title: 'Booking Request Sent',
    body: `Your request to book ${propertyName} has been sent to the host. You will be notified once they respond.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function bookingConfirmed(booking: BookingInfo, propertyName: string, location: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'booking_confirmed',
    title: 'Booking Confirmed 🎉',
    body: `Your booking for ${propertyName} in ${location} from ${fmtDate(booking.check_in!)} to ${fmtDate(booking.check_out!)} has been confirmed. Get ready for your stay.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function bookingDeclinedByHost(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'booking_declined',
    title: 'Booking Not Approved',
    body: `Unfortunately your booking request for ${propertyName} was not approved by the host. Consider exploring similar stays nearby.`,
    screenRoute: '/explore',
    data: { booking_id: booking.id },
  }
}

export function paymentSuccessful(booking: BookingInfo, amount: number, currency: string, reference: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'payment_success',
    title: 'Payment Successful ✅',
    body: `Your payment of ${formatAmount(amount, currency)} for booking ${reference} was processed successfully.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function paymentFailed(booking: BookingInfo, amount: number, currency: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'payment_failed',
    title: 'Payment Failed',
    body: `We could not process your payment of ${formatAmount(amount, currency)} for ${propertyName}. Please update your payment method and try again.`,
    screenRoute: `/checkout?booking_id=${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function newChargeAdded(charge: ChargeInfo, booking: BookingInfo): NotificationPayload {
  return {
    userId: charge.guest_id,
    type: 'new_charge_added',
    title: 'New Charge Added',
    body: `Your host has added an extra charge of ${formatAmount(charge.amount, charge.currency)} to booking ${charge.booking_id}. Tap to review and respond.`,
    screenRoute: `/post-booking/${booking.id}`,
    data: { charge_id: charge.id, booking_id: charge.booking_id },
  }
}

export function disputeResolvedInFavor(booking: BookingInfo, guestId: string): NotificationPayload {
  return {
    userId: guestId,
    type: 'dispute_resolved',
    title: 'Dispute Resolved in Your Favor',
    body: `Your dispute for booking ${booking.id} has been reviewed and resolved. No additional charge will be applied.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function newMessageFromHost(msg: MessageInfo, hostName: string, propertyName: string): NotificationPayload {
  return {
    userId: msg.receiver_id,
    type: 'new_message',
    title: 'New Message from Your Host',
    body: `${hostName} sent you a message about your upcoming stay at ${propertyName}.`,
    screenRoute: `/messages/${msg.booking_id ?? msg.id}`,
    data: { message_id: msg.id, booking_id: msg.booking_id ?? '' },
  }
}

export function checkInReminder(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'check_in_reminder',
    title: 'Check-In Tomorrow 🏠',
    body: `Reminder: Your stay at ${propertyName} begins tomorrow. Check your booking for host instructions and directions.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function checkOutReminder(booking: BookingInfo, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'check_out_reminder',
    title: 'Checkout Today',
    body: `Today is your checkout day from ${propertyName}. Please follow the host's checkout instructions.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function hostLeftReview(booking: BookingInfo, hostName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'host_review_received',
    title: 'Your Host Left You a Review',
    body: `${hostName} has reviewed your stay at ${propertyName}. Tap to see what they said and leave your own review.`,
    screenRoute: `/review?booking_id=${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function priceDropWishlist(propertyName: string, userId: string, newPrice: number, currency: string): NotificationPayload {
  return {
    userId,
    type: 'price_drop',
    title: 'Price Drop on Your Wishlist 🔥',
    body: `${propertyName} in your wishlist just dropped its price to ${formatAmount(newPrice, currency)} per night. Book before it fills up.`,
    screenRoute: '/wishlists',
    data: { property_name: propertyName },
  }
}

export function tourStartsSoon(tourName: string, userId: string, bookingId: string): NotificationPayload {
  return {
    userId,
    type: 'tour_starts_soon',
    title: 'Your Tour Starts Soon',
    body: `${tourName} is coming up in 2 days. Make sure you're prepared and review the meeting point details.`,
    screenRoute: `/my-bookings/${bookingId}`,
    data: { booking_id: bookingId },
  }
}

export function refundIssued(booking: BookingInfo, amountRWF: number): NotificationPayload {
  return {
    userId: booking.guest_id!,
    type: 'refund_issued',
    title: 'Refund Issued',
    body: `A refund of ${formatAmount(amountRWF, 'RWF')} has been issued for booking ${booking.id}.`,
    screenRoute: `/my-bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

// ── Host notification builders ──

export function newBookingRequest(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'new_booking_request',
    title: 'New Booking Request 📥',
    body: `${guestName} has requested to book ${propertyName} from ${fmtDate(booking.check_in!)} to ${fmtDate(booking.check_out!)}. Respond within 24 hours to avoid auto-decline.`,
    screenRoute: `/host/bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function instantBookingConfirmed(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'instant_booking_confirmed',
    title: 'Instant Booking Received 🎉',
    body: `${guestName} just instantly booked ${propertyName} from ${fmtDate(booking.check_in!)} to ${fmtDate(booking.check_out!)}. Your calendar has been updated.`,
    screenRoute: `/host/bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function bookingCancelledByGuest(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'booking_cancelled_by_guest',
    title: 'Booking Cancelled',
    body: `${guestName} has cancelled their booking for ${propertyName} from ${fmtDate(booking.check_in!)} to ${fmtDate(booking.check_out!)}. Your calendar is now available for those dates.`,
    screenRoute: '/host/calendar',
    data: { booking_id: booking.id },
  }
}

export function paymentReceived(booking: BookingInfo, amount: number, currency: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'payment_received',
    title: 'Payment Received 💰',
    body: `You received a payment of ${formatAmount(amount, currency)} for booking ${booking.id} at ${booking.title}.`,
    screenRoute: '/host/earnings',
    data: { booking_id: booking.id },
  }
}

export function guestCheckedIn(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'guest_checked_in',
    title: 'Guest Checked In',
    body: `${guestName} has checked into ${propertyName}. Their stay runs until ${fmtDate(booking.check_out!)}.`,
    screenRoute: `/host/bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function guestCheckedOut(booking: BookingInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: booking.host_id!,
    type: 'guest_checked_out',
    title: 'Guest Checked Out',
    body: `${guestName} has checked out of ${propertyName}. The property is now available. Don't forget to leave a review.`,
    screenRoute: `/host/reviews/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function newReviewReceived(review: ReviewInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: review.host_id,
    type: 'new_review',
    title: 'New Guest Review ⭐',
    body: `${guestName} left a ${review.rating}-star review for ${propertyName}. Tap to read it and respond.`,
    screenRoute: `/host/reviews`,
    data: { review_id: review.id, booking_id: review.booking_id, rating: review.rating.toString() },
  }
}

export function extraChargePaid(charge: ChargeInfo, booking: BookingInfo): NotificationPayload {
  return {
    userId: charge.host_id,
    type: 'extra_charge_paid',
    title: 'Extra Charge Paid',
    body: `${booking.guest_name ?? 'The guest'} has paid the extra charge of ${formatAmount(charge.amount, charge.currency)} for booking ${charge.booking_id}.`,
    screenRoute: `/host/bookings/${booking.id}`,
    data: { charge_id: charge.id, booking_id: charge.booking_id },
  }
}

export function disputeOpenedByGuest(dispute: DisputeInfo, guestName: string, booking: BookingInfo): NotificationPayload {
  return {
    userId: dispute.host_id,
    type: 'dispute_opened',
    title: 'Dispute Opened by Guest',
    body: `${guestName} has opened a dispute on booking ${dispute.booking_id}. Tap to review the claim and respond.`,
    screenRoute: `/host/disputes/${dispute.id}`,
    data: { dispute_id: dispute.id, booking_id: dispute.booking_id },
  }
}

export function listingApproved(hostId: string, listingName: string): NotificationPayload {
  return {
    userId: hostId,
    type: 'listing_approved',
    title: 'Your Listing is Live 🚀',
    body: `${listingName} has been reviewed and approved. It is now visible to guests and available for booking.`,
    screenRoute: '/host/listings',
    data: {},
  }
}

export function listingRejected(hostId: string, listingName: string): NotificationPayload {
  return {
    userId: hostId,
    type: 'listing_rejected',
    title: 'Listing Needs Attention',
    body: `Your listing ${listingName} was not approved. Tap to see the reason and make the required changes before resubmitting.`,
    screenRoute: '/host/listings',
    data: {},
  }
}

export function payoutSent(hostId: string, amount: number, currency: string): NotificationPayload {
  return {
    userId: hostId,
    type: 'payout_sent',
    title: 'Payout Sent 💸',
    body: `A payout of ${formatAmount(amount, currency)} has been sent to your registered account. It may take 1 to 3 business days to arrive.`,
    screenRoute: '/host/earnings',
    data: {},
  }
}

export function payoutFailed(hostId: string, amount: number, currency: string, reason: string): NotificationPayload {
  return {
    userId: hostId,
    type: 'payout_failed',
    title: 'Payout Failed',
    body: `Payout of ${formatAmount(amount, currency)} failed: ${reason}. Update your payout details.`,
    screenRoute: '/host/payouts',
    data: {},
  }
}

export function newMessageFromGuest(msg: MessageInfo, guestName: string, propertyName: string): NotificationPayload {
  return {
    userId: msg.receiver_id,
    type: 'new_message',
    title: 'New Message from Guest',
    body: `${guestName} sent you a message about their upcoming stay at ${propertyName}.`,
    screenRoute: `/host/messages/${msg.booking_id ?? msg.id}`,
    data: { message_id: msg.id, booking_id: msg.booking_id ?? '' },
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

// ── Admin notification builders ──

export function newListingReview(property: PropertyInfo): NotificationPayload {
  return {
    userId: '', // filled by caller with all admin user IDs
    type: 'listing_submitted',
    title: 'New Listing Awaiting Review',
    body: `${property.host_name} has submitted ${property.title} in ${property.location} for approval. Review it in the admin dashboard.`,
    screenRoute: '/admin/listings',
    data: { property_id: property.id },
  }
}

export function newHostRegistered(hostName: string, hostId: string): NotificationPayload {
  return {
    userId: '', // filled by caller with all admin user IDs
    type: 'host_registered',
    title: 'New Host Registered',
    body: `${hostName} has completed their host profile and is ready to list properties. Verify their identity documents if required.`,
    screenRoute: '/admin/users',
    data: { host_id: hostId },
  }
}

export function disputeRequiresAdminReview(dispute: DisputeInfo, guestName: string, hostName: string): NotificationPayload {
  return {
    userId: '', // filled by caller with all admin user IDs
    type: 'dispute_requires_admin',
    title: 'Dispute Requires Admin Review',
    body: `A dispute has been opened on booking ${dispute.booking_id} between ${guestName} and ${hostName}. Assign a resolution agent.`,
    screenRoute: '/admin/disputes',
    data: { dispute_id: dispute.id, booking_id: dispute.booking_id },
  }
}

export function newSupportTicket(ticket: TicketInfo): NotificationPayload {
  return {
    userId: '', // filled by caller with all admin user IDs
    type: 'new_support_ticket',
    title: 'New Support Ticket',
    body: `${ticket.user_name} submitted a support ticket: ${ticket.subject}. Tap to assign and respond.`,
    screenRoute: '/admin/support',
    data: { ticket_id: ticket.id },
  }
}

export function highValueBooking(booking: BookingInfo, amount: number, currency: string): NotificationPayload {
  return {
    userId: '', // filled by caller with all admin user IDs
    type: 'high_value_booking',
    title: 'High-Value Booking Alert',
    body: `A booking worth ${formatAmount(amount, currency)} was just confirmed for ${booking.title}. Review for fraud flags if necessary.`,
    screenRoute: `/admin/bookings/${booking.id}`,
    data: { booking_id: booking.id },
  }
}

export function userFlagged(userName: string, userId: string, reportCount: number): NotificationPayload {
  return {
    userId: '', // filled by caller with all admin user IDs
    type: 'user_flagged',
    title: 'User Flagged for Review',
    body: `${userName} has received ${reportCount} reports from other users. Review their account activity and take action.`,
    screenRoute: '/admin/users',
    data: { user_id: userId },
  }
}

export function platformMilestone(count: number): NotificationPayload {
  return {
    userId: '', // filled by caller with all admin user IDs
    type: 'platform_milestone',
    title: 'Platform Milestone Reached 🏆',
    body: `The platform just hit ${count} total bookings. Keep it up.`,
    screenRoute: '/admin/analytics',
    data: { milestone: count.toString() },
  }
}

export function newTourApproval(tourName: string, operatorName: string, tourId: string): NotificationPayload {
  return {
    userId: '', // filled by caller with all admin user IDs
    type: 'tour_pending_approval',
    title: 'New Tour Pending Approval',
    body: `${operatorName} has submitted ${tourName} for review. Approve or reject it from the admin panel.`,
    screenRoute: '/admin/tours',
    data: { tour_id: tourId },
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

export type NotificationBuilder = (...args: any[]) => NotificationPayload
