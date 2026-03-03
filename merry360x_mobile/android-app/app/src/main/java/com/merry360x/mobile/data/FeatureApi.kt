package com.merry360x.mobile.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class FeatureApi(
    private val supabaseUrl: String,
    private val anonKey: String,
    private val apiBaseUrl: String = "https://merry360x.com",
) {
    private val client = OkHttpClient()

    suspend fun fetchNotifications(userId: String): List<Pair<String, String>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val url = "$supabaseUrl/rest/v1/notifications?select=title,message&user_id=eq.$userId&order=created_at.desc&limit=30"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext emptyList()
            val body = response.body?.string().orEmpty()
            val array = JSONArray(body)
            buildList {
                for (i in 0 until array.length()) {
                    val row = array.getJSONObject(i)
                    add(row.optString("title", "Notification") to row.optString("message", ""))
                }
            }
        }
    }

    suspend fun fetchHostProperties(hostId: String): List<String> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val url = "$supabaseUrl/rest/v1/properties?select=title&host_id=eq.$hostId&order=created_at.desc&limit=30"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext emptyList()
            val body = response.body?.string().orEmpty()
            val array = JSONArray(body)
            buildList {
                for (i in 0 until array.length()) {
                    add(array.getJSONObject(i).optString("title", "Untitled property"))
                }
            }
        }
    }

    suspend fun fetchWishlist(userId: String): List<String> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val url = "$supabaseUrl/rest/v1/wishlists?select=title&user_id=eq.$userId&order=created_at.desc&limit=30"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext emptyList()
            val body = response.body?.string().orEmpty()
            val array = JSONArray(body)
            buildList {
                for (i in 0 until array.length()) {
                    add(array.getJSONObject(i).optString("title", "Saved item"))
                }
            }
        }
    }

    suspend fun createFlutterwavePayment(email: String, amount: Double, currency: String = "RWF"): Result<String> = withContext(Dispatchers.IO) {
        val requestBody = JSONObject().apply {
            put("email", email)
            put("amount", amount)
            put("currency", currency)
        }

        val request = Request.Builder()
            .url("$apiBaseUrl/api/flutterwave-create-payment")
            .addHeader("Content-Type", "application/json")
            .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Payment init failed (${response.code})"))
            }
            val body = response.body?.string().orEmpty()
            val json = JSONObject(body)
            val link = json.optString("paymentLink", "")
            Result.success(link)
        }
    }
}
