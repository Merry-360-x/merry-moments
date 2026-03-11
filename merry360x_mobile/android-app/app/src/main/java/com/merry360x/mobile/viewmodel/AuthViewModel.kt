package com.merry360x.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.merry360x.mobile.data.SupabaseApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val authenticated: Boolean = false,
    val userId: String? = null,
    val accessToken: String? = null,
    val roles: List<String> = emptyList(),
    val displayName: String = "",
    val userEmail: String = "",
)

class AuthViewModel(
    private val api: SupabaseApi,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun updateEmail(value: String) {
        _state.value = _state.value.copy(email = value)
    }

    fun updatePassword(value: String) {
        _state.value = _state.value.copy(password = value)
    }

    fun signIn() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            val result = api.signIn(_state.value.email, _state.value.password)
            _state.value = if (result.isSuccess) {
                val session = result.getOrNull()!!
                val roles = api.fetchUserRoles(session.userId, session.accessToken).getOrDefault(emptyList())
                val profile = api.fetchCurrentUserProfile(session.accessToken)
                _state.value.copy(
                    loading = false,
                    authenticated = true,
                    userId = session.userId,
                    accessToken = session.accessToken,
                    roles = roles,
                    displayName = profile.first,
                    userEmail = profile.second,
                )
            } else {
                _state.value.copy(loading = false, error = result.exceptionOrNull()?.message ?: "Sign-in failed")
            }
        }
    }

    fun signUp() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            val result = api.signUp(_state.value.email, _state.value.password)
            _state.value = if (result.isSuccess) {
                val session = result.getOrNull()!!
                val roles = api.fetchUserRoles(session.userId, session.accessToken).getOrDefault(emptyList())
                val profile = api.fetchCurrentUserProfile(session.accessToken)
                _state.value.copy(
                    loading = false,
                    authenticated = true,
                    userId = session.userId,
                    accessToken = session.accessToken,
                    roles = roles,
                    displayName = profile.first,
                    userEmail = profile.second,
                )
            } else {
                _state.value.copy(loading = false, error = result.exceptionOrNull()?.message ?: "Sign-up failed")
            }
        }
    }

    fun completeAuthCallback(callbackUrl: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)

            val accessToken = extractCallbackParam(callbackUrl, "access_token")
            if (accessToken.isNullOrBlank()) {
                val callbackError = extractCallbackParam(callbackUrl, "error_description")
                    ?: extractCallbackParam(callbackUrl, "error")
                    ?: "Missing access token in callback"
                _state.value = _state.value.copy(loading = false, error = callbackError)
                return@launch
            }

            val userIdResult = api.fetchCurrentUserId(accessToken)
            if (userIdResult.isFailure) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = userIdResult.exceptionOrNull()?.message ?: "Failed to complete callback"
                )
                return@launch
            }

            val userId = userIdResult.getOrNull().orEmpty()
            val roles = api.fetchUserRoles(userId, accessToken).getOrDefault(emptyList())
            val profile = api.fetchCurrentUserProfile(accessToken)

            _state.value = _state.value.copy(
                loading = false,
                authenticated = true,
                userId = userId,
                accessToken = accessToken,
                roles = roles,
                displayName = profile.first,
                userEmail = profile.second,
                error = null
            )
        }
    }

    private fun extractCallbackParam(callbackUrl: String, key: String): String? {
        val normalized = callbackUrl.replace('#', '&')
        val marker = "$key="
        val start = normalized.indexOf(marker)
        if (start == -1) return null
        val valueStart = start + marker.length
        val valueEnd = normalized.indexOf('&', valueStart).takeIf { it >= 0 } ?: normalized.length
        return normalized.substring(valueStart, valueEnd)
            .replace("+", "%20")
            .let { encoded ->
                try {
                    java.net.URLDecoder.decode(encoded, "UTF-8")
                } catch (_: Exception) {
                    encoded
                }
            }
            .takeIf { it.isNotBlank() }
    }

    fun becomeHost() {
        val token = _state.value.accessToken ?: return
        val userId = _state.value.userId ?: return

        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            val hostResult = api.becomeHost(token)
            _state.value = if (hostResult.isSuccess) {
                val roles = api.fetchUserRoles(userId, token).getOrDefault(_state.value.roles)
                _state.value.copy(loading = false, roles = roles)
            } else {
                _state.value.copy(loading = false, error = hostResult.exceptionOrNull()?.message ?: "Could not become host")
            }
        }
    }
    
    fun signOut() {
        _state.value = AuthUiState()
    }
}
