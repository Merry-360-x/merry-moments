package com.merry360x.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.merry360x.mobile.data.BookingRecord
import com.merry360x.mobile.data.SupabaseApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TripsUiState(
    val loading: Boolean = false,
    val bookings: List<BookingRecord> = emptyList(),
    val error: String? = null,
)

class TripsViewModel(
    private val api: SupabaseApi,
) : ViewModel() {
    private val _state = MutableStateFlow(TripsUiState())
    val state: StateFlow<TripsUiState> = _state.asStateFlow()

    fun load(userId: String?) {
        if (userId.isNullOrBlank()) {
            _state.value = TripsUiState(loading = false, bookings = emptyList(), error = "Login required")
            return
        }

        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            val result = api.fetchUserBookings(userId)
            _state.value = if (result.isSuccess) {
                TripsUiState(loading = false, bookings = result.getOrDefault(emptyList()), error = null)
            } else {
                TripsUiState(loading = false, bookings = emptyList(), error = result.exceptionOrNull()?.message)
            }
        }
    }
}
