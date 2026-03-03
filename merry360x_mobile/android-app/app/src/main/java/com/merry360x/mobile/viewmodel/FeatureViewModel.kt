package com.merry360x.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.merry360x.mobile.data.FeatureApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class FeatureUiState(
    val notifications: List<Pair<String, String>> = emptyList(),
    val hostProperties: List<String> = emptyList(),
    val wishlist: List<String> = emptyList(),
    val paymentMessage: String? = null,
    val loading: Boolean = false,
)

class FeatureViewModel(
    private val api: FeatureApi,
) : ViewModel() {
    private val _state = MutableStateFlow(FeatureUiState())
    val state: StateFlow<FeatureUiState> = _state.asStateFlow()

    fun load(userId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            val notifications = api.fetchNotifications(userId)
            val hostProperties = api.fetchHostProperties(userId)
            val wishlist = api.fetchWishlist(userId)
            _state.value = _state.value.copy(
                loading = false,
                notifications = notifications,
                hostProperties = hostProperties,
                wishlist = wishlist
            )
        }
    }

    fun initFlutterwavePayment(email: String, amount: Double) {
        viewModelScope.launch {
            val result = api.createFlutterwavePayment(email, amount)
            _state.value = _state.value.copy(
                paymentMessage = if (result.isSuccess) {
                    val link = result.getOrNull().orEmpty()
                    if (link.isBlank()) "Payment initialized." else "Payment link: $link"
                } else {
                    result.exceptionOrNull()?.message ?: "Payment init failed"
                }
            )
        }
    }
}
