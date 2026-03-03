package com.merry360x.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.merry360x.mobile.data.BookingDraft
import com.merry360x.mobile.data.SupabaseApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class BookingUiState(
    val submitting: Boolean = false,
    val statusMessage: String? = null,
)

class BookingViewModel(
    private val api: SupabaseApi,
) : ViewModel() {
    private val _state = MutableStateFlow(BookingUiState())
    val state: StateFlow<BookingUiState> = _state.asStateFlow()

    var selectedListingId: String? = null
    var selectedListingTitle: String? = null

    fun submitSampleBooking() {
        viewModelScope.launch {
            _state.value = _state.value.copy(submitting = true, statusMessage = null)

            val result = api.submitBooking(
                BookingDraft(
                    guestId = "replace-with-real-user-id",
                    guestName = "Merry Mobile User",
                    guestEmail = "mobile@example.com",
                    propertyId = selectedListingId ?: "replace-with-real-property-id",
                    checkIn = "2026-03-15",
                    checkOut = "2026-03-17",
                    guests = 2,
                    totalPrice = 199500.0,
                    currency = "RWF",
                )
            )

            _state.value = if (result.isSuccess) {
                BookingUiState(submitting = false, statusMessage = "Booking request submitted.")
            } else {
                BookingUiState(submitting = false, statusMessage = result.exceptionOrNull()?.message ?: "Booking failed")
            }
        }
    }
}
