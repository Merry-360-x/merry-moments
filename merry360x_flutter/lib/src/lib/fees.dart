class BookingFinancials {
  const BookingFinancials({
    required this.discountedListingSubtotal,
    required this.guestFee,
    required this.guestTotal,
    required this.hostFee,
    required this.hostNetEarnings,
    required this.platformTotalEarnings,
    required this.guestFeePercent,
    required this.hostFeePercent,
  });

  final double discountedListingSubtotal;
  final double guestFee;
  final double guestTotal;
  final double hostFee;
  final double hostNetEarnings;
  final double platformTotalEarnings;
  final double guestFeePercent;
  final double hostFeePercent;
}

/// Mirrors the web app fee rules in `src/lib/fees.ts`.
///
/// NOTE: Keep these percents in sync with the website.
class PlatformFees {
  static double guestFeePercent(String serviceType) {
    switch (serviceType) {
      case 'accommodation':
        return 10;
      case 'tour':
        return 0;
      case 'transport':
        return 0;
      default:
        return 0;
    }
  }

  static double hostOrProviderFeePercent(String serviceType) {
    switch (serviceType) {
      case 'accommodation':
        return 3;
      case 'tour':
        return 10;
      case 'transport':
        return 0;
      default:
        return 0;
    }
  }
}

BookingFinancials calculateBookingFinancialsFromDiscountedListing({
  required double discountedListingSubtotal,
  required String serviceType,
}) {
  final double base;
  if (!discountedListingSubtotal.isFinite) {
    base = 0.0;
  } else {
    base = discountedListingSubtotal.clamp(0.0, double.infinity).toDouble();
  }

  final guestFeePercent = PlatformFees.guestFeePercent(serviceType);
  final hostFeePercent = PlatformFees.hostOrProviderFeePercent(serviceType);

  final guestFee = (base * guestFeePercent) / 100;
  final guestTotal = base + guestFee;
  final hostFee = (base * hostFeePercent) / 100;
  final hostNetEarnings = base - hostFee;
  final platformTotalEarnings = guestFee + hostFee;

  return BookingFinancials(
    discountedListingSubtotal: base,
    guestFee: guestFee,
    guestTotal: guestTotal,
    hostFee: hostFee,
    hostNetEarnings: hostNetEarnings,
    platformTotalEarnings: platformTotalEarnings,
    guestFeePercent: guestFeePercent,
    hostFeePercent: hostFeePercent,
  );
}
