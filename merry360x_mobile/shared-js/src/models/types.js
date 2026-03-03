export const ItemType = {
  STAY: 'stay',
  TOUR: 'tour',
  TRANSPORT: 'transport',
};

export function normalizeListing(row) {
  return {
    id: row.id,
    hostId: row.host_id ?? null,
    title: row.title ?? row.name ?? 'Untitled',
    location: row.location ?? 'Unknown',
    pricePerNight: row.price_per_night ?? row.daily_rate ?? 0,
    pricePerMonth: row.price_per_month ?? null,
    currency: row.currency ?? 'RWF',
    propertyType: row.property_type ?? null,
    isPublished: row.is_published ?? null,
    monthlyOnlyListing: row.monthly_only_listing ?? false,
    availableForMonthlyRental: row.available_for_monthly_rental ?? false,
    maxGuests: row.max_guests ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    images: row.images ?? null,
    mainImage: row.main_image ?? null,
    rating: row.rating ?? 0,
    reviews: row.reviews_count ?? 0,
    imageUrl: row.image_url ?? null,
  };
}

export function normalizeBooking(row) {
  return {
    id: row.id,
    hostId: row.host_id ?? null,
    propertyId: row.property_id ?? null,
    tourId: row.tour_id ?? null,
    transportId: row.transport_id ?? null,
    bookingType: row.booking_type ?? 'property',
    status: row.status ?? 'pending',
    confirmationStatus: row.confirmation_status ?? 'pending',
    paymentStatus: row.payment_status ?? 'pending',
    paymentMethod: row.payment_method ?? null,
    specialRequests: row.special_requests ?? null,
    totalPrice: row.total_price ?? 0,
    currency: row.currency ?? 'RWF',
    checkIn: row.check_in ?? null,
    checkOut: row.check_out ?? null,
    guests: row.guests ?? 1,
  };
}
