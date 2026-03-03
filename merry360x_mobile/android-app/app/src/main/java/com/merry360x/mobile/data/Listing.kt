package com.merry360x.mobile.data

data class Listing(
    val id: String,
    val hostId: String? = null,
    val title: String,
    val location: String,
    val pricePerNight: Double,
    val pricePerMonth: Double? = null,
    val currency: String,
    val isPublished: Boolean? = null,
    val monthlyOnlyListing: Boolean? = null,
    val images: List<String>? = null,
    val mainImage: String? = null,
    val rating: Double? = null,
)
