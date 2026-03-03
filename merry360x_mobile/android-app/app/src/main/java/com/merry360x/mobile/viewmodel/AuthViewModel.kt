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
                _state.value.copy(
                    loading = false,
                    authenticated = true,
                    userId = session.userId,
                    accessToken = session.accessToken,
                    roles = roles
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
                _state.value.copy(
                    loading = false,
                    authenticated = true,
                    userId = session.userId,
                    accessToken = session.accessToken,
                    roles = roles
                )
            } else {
                _state.value.copy(loading = false, error = result.exceptionOrNull()?.message ?: "Sign-up failed")
            }
        }
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
