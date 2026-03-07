package com.merry360x.mobile.data

data class BookingDraft(
    val guestId: String,
    val hostId: String? = null,
    val bookingType: String? = null,
    val guestName: String,
    val guestEmail: String,
    val propertyId: String,
    val specialRequests: String? = null,
    val paymentMethod: String? = null,
    val checkIn: String,
    val checkOut: String,
    val guests: Int,
    val totalPrice: Double,
    val currency: String,
)

data class BookingRecord(
    val id: String,
    val status: String,
    val paymentStatus: String,
    val totalPrice: Double,
    val currency: String,
    val checkIn: String?,
    val checkOut: String?,
)
