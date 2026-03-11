package com.merry360x.mobile.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import org.json.JSONArray
import org.json.JSONObject

class SupabaseApi(
    private val supabaseUrl: String,
    private val anonKey: String,
) {
    private val client = OkHttpClient()
    private val apiBaseUrl = "https://merry360x.com"

    suspend fun signIn(email: String, password: String): Result<AuthSession> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val json = JSONObject().apply {
            put("email", email)
            put("password", password)
        }

        val request = Request.Builder()
            .url("$supabaseUrl/auth/v1/token?grant_type=password")
            .addHeader("apikey", anonKey)
            .addHeader("Content-Type", "application/json")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Invalid credentials"))
            }

            val body = response.body?.string().orEmpty()
            val user = JSONObject(body).optJSONObject("user")
            val userId = user?.optString("id").orEmpty()
            val accessToken = JSONObject(body).optString("access_token")
            if (userId.isBlank() || accessToken.isBlank()) {
                Result.failure(IllegalStateException("Could not parse user"))
            } else {
                Result.success(AuthSession(userId = userId, accessToken = accessToken))
            }
        }
    }

    suspend fun signUp(email: String, password: String): Result<AuthSession> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val json = JSONObject().apply {
            put("email", email)
            put("password", password)
        }

        val request = Request.Builder()
            .url("$supabaseUrl/auth/v1/signup")
            .addHeader("apikey", anonKey)
            .addHeader("Content-Type", "application/json")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Sign-up failed"))
            }

            val body = response.body?.string().orEmpty()
            val payload = JSONObject(body)
            val userId = payload.optJSONObject("user")?.optString("id").orEmpty()
            val accessToken = payload.optJSONObject("session")?.optString("access_token").orEmpty()
            if (userId.isBlank() || accessToken.isBlank()) {
                Result.failure(IllegalStateException("Please verify your email before signing in"))
            } else {
                Result.success(AuthSession(userId = userId, accessToken = accessToken))
            }
        }
    }

    suspend fun fetchUserRoles(userId: String, accessToken: String): Result<List<String>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val url = "$supabaseUrl/rest/v1/user_roles?select=role&user_id=eq.$userId"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $accessToken")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch user roles"))
            }

            val body = response.body?.string().orEmpty()
            val array = JSONArray(body)
            val roles = mutableListOf<String>()
            for (i in 0 until array.length()) {
                val role = array.optJSONObject(i)?.optString("role").orEmpty().trim().lowercase()
                if (role.isNotEmpty()) roles += role
            }
            Result.success(roles.distinct())
        }
    }

    suspend fun fetchCurrentUserId(accessToken: String): Result<String> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val request = Request.Builder()
            .url("$supabaseUrl/auth/v1/user")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $accessToken")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch current user"))
            }

            val body = response.body?.string().orEmpty()
            val userId = JSONObject(body).optString("id").orEmpty()
            if (userId.isBlank()) {
                Result.failure(IllegalStateException("Could not parse current user"))
            } else {
                Result.success(userId)
            }
        }
    }

    // Returns (displayName, email) — never throws, falls back to empty strings
    suspend fun fetchCurrentUserProfile(accessToken: String): Pair<String, String> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext Pair("", "")
        try {
            val request = Request.Builder()
                .url("$supabaseUrl/auth/v1/user")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $accessToken")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext Pair("", "")
                val body = response.body?.string().orEmpty()
                val json = JSONObject(body)
                val email = json.optString("email", "").trim()
                val meta = json.optJSONObject("user_metadata")
                val name = (meta?.optString("full_name") ?: meta?.optString("name") ?: "").trim()
                Pair(name, email)
            }
        } catch (_: Exception) {
            Pair("", "")
        }
    }

    suspend fun becomeHost(accessToken: String): Result<Unit> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/rpc/become_host")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $accessToken")
            .addHeader("Content-Type", "application/json")
            .post("{}".toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(IllegalStateException("Could not activate host role"))
        }
    }

    suspend fun fetchFeaturedListings(limit: Int = 20): List<Listing> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val url = "$supabaseUrl/rest/v1/properties?select=id,host_id,title,name,location,price_per_night,price_per_month,currency,is_published,monthly_only_listing,images,main_image,rating&order=created_at.desc&limit=$limit"
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
            val items = mutableListOf<Listing>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                items += Listing(
                    id = obj.optString("id"),
                    hostId = obj.optString("host_id").ifBlank { null },
                    title = obj.optString("title").ifBlank { obj.optString("name", "Untitled") },
                    location = obj.optString("location", "Unknown"),
                    pricePerNight = obj.optDouble("price_per_night", 0.0),
                    pricePerMonth = obj.optDouble("price_per_month", Double.NaN).takeIf { !it.isNaN() },
                    currency = obj.optString("currency", "RWF"),
                    isPublished = if (obj.has("is_published") && !obj.isNull("is_published")) obj.optBoolean("is_published") else null,
                    monthlyOnlyListing = if (obj.has("monthly_only_listing") && !obj.isNull("monthly_only_listing")) obj.optBoolean("monthly_only_listing") else null,
                    images = obj.optJSONArray("images")?.let { arr ->
                        (0 until arr.length()).mapNotNull { arr.optString(it).takeIf { s -> s.isNotBlank() } }
                    },
                    mainImage = obj.optString("main_image").takeIf { it.isNotBlank() },
                    rating = obj.optDouble("rating", 0.0).takeIf { !it.isNaN() }
                )
            }
            items
        }
    }

    suspend fun submitBooking(draft: BookingDraft): Result<Unit> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val json = JSONObject().apply {
            put("guest_id", draft.guestId)
            put("guest_name", draft.guestName)
            put("guest_email", draft.guestEmail)
            put("property_id", draft.propertyId)
            put("check_in", draft.checkIn)
            put("check_out", draft.checkOut)
            put("guests", draft.guests)
            put("total_price", draft.totalPrice)
            put("currency", draft.currency)
            put("status", "pending")
            put("confirmation_status", "pending")
            put("booking_type", draft.bookingType ?: "property")
            put("payment_status", "pending")
            put("payment_method", draft.paymentMethod ?: "card")

            draft.hostId?.takeIf { it.isNotBlank() }?.let { put("host_id", it) }
            draft.specialRequests?.takeIf { it.isNotBlank() }?.let { put("special_requests", it) }
        }

        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/bookings")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", "return=minimal")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(IllegalStateException("Booking failed (${response.code})"))
        }
    }

    suspend fun submitBookingReturningId(draft: BookingDraft, accessToken: String?): Result<String> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val json = JSONObject().apply {
            put("guest_id", draft.guestId)
            put("guest_name", draft.guestName)
            put("guest_email", draft.guestEmail)
            put("property_id", draft.propertyId)
            put("check_in", draft.checkIn)
            put("check_out", draft.checkOut)
            put("guests", draft.guests)
            put("total_price", draft.totalPrice)
            put("currency", draft.currency)
            put("status", "pending")
            put("confirmation_status", "pending")
            put("booking_type", draft.bookingType ?: "property")
            put("payment_status", "pending")
            put("payment_method", draft.paymentMethod ?: "card")
            draft.hostId?.takeIf { it.isNotBlank() }?.let { put("host_id", it) }
            draft.specialRequests?.takeIf { it.isNotBlank() }?.let { put("special_requests", it) }
        }

        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/bookings")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", "return=representation")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Booking failed (${response.code})"))
            }
            val rows = JSONArray(response.body?.string().orEmpty())
            val bookingId = if (rows.length() > 0) rows.getJSONObject(0).optString("id", "") else ""
            if (bookingId.isBlank()) {
                Result.failure(IllegalStateException("Booking id not returned"))
            } else {
                Result.success(bookingId)
            }
        }
    }

    suspend fun fetchUserBookings(userId: String): Result<List<BookingRecord>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val url = "$supabaseUrl/rest/v1/bookings?select=id,status,payment_status,total_price,currency,check_in,check_out,created_at&guest_id=eq.$userId&order=created_at.desc"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch bookings (${response.code})"))
            }

            val body = response.body?.string().orEmpty()
            val rows = JSONArray(body)
            val result = mutableListOf<BookingRecord>()
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                result += BookingRecord(
                    id = row.optString("id"),
                    status = row.optString("status", "pending"),
                    paymentStatus = row.optString("payment_status", "pending"),
                    totalPrice = row.optDouble("total_price", 0.0),
                    currency = row.optString("currency", "RWF"),
                    checkIn = row.optString("check_in", "").ifBlank { null },
                    checkOut = row.optString("check_out", "").ifBlank { null }
                )
            }
            Result.success(result)
        }
    }

    suspend fun fetchHostProperties(hostId: String): Result<List<JSONObject>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val url = "$supabaseUrl/rest/v1/properties?select=id,title,location,created_at&host_id=eq.$hostId&order=created_at.desc"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch host properties (${response.code})"))
            }
            val rows = JSONArray(response.body?.string().orEmpty())
            val result = mutableListOf<JSONObject>()
            for (i in 0 until rows.length()) {
                result += rows.getJSONObject(i)
            }
            Result.success(result)
        }
    }

    suspend fun fetchHostBookings(hostId: String): Result<List<BookingRecord>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val url = "$supabaseUrl/rest/v1/bookings?select=id,status,payment_status,total_price,currency,check_in,check_out,created_at&host_id=eq.$hostId&order=created_at.desc"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch host bookings (${response.code})"))
            }

            val body = response.body?.string().orEmpty()
            val rows = JSONArray(body)
            val result = mutableListOf<BookingRecord>()
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                result += BookingRecord(
                    id = row.optString("id"),
                    status = row.optString("status", "pending"),
                    paymentStatus = row.optString("payment_status", "pending"),
                    totalPrice = row.optDouble("total_price", 0.0),
                    currency = row.optString("currency", "RWF"),
                    checkIn = row.optString("check_in", "").ifBlank { null },
                    checkOut = row.optString("check_out", "").ifBlank { null },
                )
            }
            Result.success(result)
        }
    }

    suspend fun fetchHostPayouts(hostId: String): Result<List<JSONObject>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val url = "$supabaseUrl/rest/v1/host_payouts?select=id,status,amount,currency,created_at&host_id=eq.$hostId&order=created_at.desc"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch host payouts (${response.code})"))
            }

            val body = response.body?.string().orEmpty()
            val rows = JSONArray(body)
            val result = mutableListOf<JSONObject>()
            for (i in 0 until rows.length()) {
                result += rows.getJSONObject(i)
            }
            Result.success(result)
        }
    }

    suspend fun createFlutterwavePayment(payload: JSONObject): Result<JSONObject> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$apiBaseUrl/api/flutterwave-create-payment")
            .addHeader("Content-Type", "application/json")
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Flutterwave init failed (${response.code})"))
            }
            Result.success(JSONObject(response.body?.string().orEmpty().ifBlank { "{}" }))
        }
    }

    suspend fun createStory(
        userId: String,
        title: String,
        body: String,
        location: String?,
        mediaUrl: String?,
        accessToken: String?,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val safeTitle = title.trim()
        val safeBody = body.trim()
        if (safeTitle.isBlank() || safeBody.isBlank()) {
            return@withContext Result.failure(IllegalArgumentException("Title and body are required"))
        }

        val safeMedia = mediaUrl?.trim().orEmpty().ifBlank { null }
        val mediaType = when {
            safeMedia == null -> null
            safeMedia.contains("/video/upload/", ignoreCase = true) -> "video"
            safeMedia.endsWith(".mp4", true) || safeMedia.endsWith(".webm", true) || safeMedia.endsWith(".mov", true) || safeMedia.endsWith(".m4v", true) || safeMedia.endsWith(".avi", true) -> "video"
            else -> "image"
        }

        val json = JSONObject().apply {
            put("user_id", userId)
            put("title", safeTitle)
            put("body", safeBody)
            put("location", location?.trim().takeUnless { it.isNullOrBlank() })
            put("media_url", safeMedia)
            put("image_url", if (mediaType == "image") safeMedia else JSONObject.NULL)
            put("media_type", mediaType ?: JSONObject.NULL)
        }

        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/stories")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer ${accessToken?.takeIf { it.isNotBlank() } ?: anonKey}")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", "return=minimal")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(IllegalStateException("Could not publish story (${response.code})"))
        }
    }

    suspend fun fetchAdminOverviewMetrics(accessToken: String?): Result<AdminOverviewMetrics> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey

        fun countFor(path: String): Int {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/$path")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $bearer")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return 0
                val body = response.body?.string().orEmpty()
                return JSONArray(body).length()
            }
        }

        val users = countFor("profiles?select=id")
        val hosts = countFor("user_roles?select=id&role=eq.host")
        val stories = countFor("stories?select=id")
        val properties = countFor("properties?select=id")
        val bookings = countFor("bookings?select=id")

        val paidRequest = Request.Builder()
            .url("$supabaseUrl/rest/v1/bookings?select=total_price,currency,host_payout_amount,platform_fee,payment_method_fee,discount_amount&payment_status=eq.paid&status=in.(confirmed,completed)")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()

        var paidCount = 0
        var revenueGross = 0.0
        var platformCharges = 0.0
        var hostNet = 0.0
        var discountAmount = 0.0
        var currency = "RWF"

        client.newCall(paidRequest).execute().use { response ->
            if (response.isSuccessful) {
                val rows = JSONArray(response.body?.string().orEmpty())
                paidCount = rows.length()
                for (i in 0 until rows.length()) {
                    val row = rows.getJSONObject(i)
                    val total = row.optDouble("total_price", 0.0)
                    val platformFee = if (row.has("platform_fee") && !row.isNull("platform_fee")) row.optDouble("platform_fee", 0.0) else 0.0
                    val paymentFee = if (row.has("payment_method_fee") && !row.isNull("payment_method_fee")) row.optDouble("payment_method_fee", 0.0) else 0.0
                    val payout = if (row.has("host_payout_amount") && !row.isNull("host_payout_amount")) row.optDouble("host_payout_amount", 0.0) else Double.NaN
                    val discount = if (row.has("discount_amount") && !row.isNull("discount_amount")) row.optDouble("discount_amount", 0.0) else 0.0
                    val inferredPlatform = platformFee + paymentFee

                    revenueGross += total
                    discountAmount += discount
                    platformCharges += inferredPlatform
                    hostNet += if (!payout.isNaN()) payout else kotlin.math.max(total - inferredPlatform, 0.0)

                    val rowCurrency = row.optString("currency", "").trim()
                    if (rowCurrency.isNotEmpty()) {
                        currency = rowCurrency
                    }
                }
            }
        }

        if (platformCharges == 0.0) {
            platformCharges = kotlin.math.max(revenueGross - hostNet, 0.0)
        }

        Result.success(
            AdminOverviewMetrics(
                usersTotal = users,
                hostsTotal = hosts,
                storiesTotal = stories,
                propertiesTotal = properties,
                bookingsTotal = bookings,
                bookingsPaid = paidCount,
                revenueGross = revenueGross,
                platformCharges = platformCharges,
                hostNet = hostNet,
                discountAmount = discountAmount,
                revenueCurrency = currency,
            )
        )
    }

    suspend fun fetchFinancialSummary(accessToken: String?): Result<FinancialSummaryMetrics> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val bookingsRequest = Request.Builder()
            .url("$supabaseUrl/rest/v1/bookings?select=id,status,payment_status")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()
        val checkoutRequest = Request.Builder()
            .url("$supabaseUrl/rest/v1/checkout_requests?select=id,payment_status")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()

        val bookings = client.newCall(bookingsRequest).execute().use { response ->
            if (!response.isSuccessful) return@use JSONArray()
            JSONArray(response.body?.string().orEmpty())
        }

        val checkoutRows = client.newCall(checkoutRequest).execute().use { response ->
            if (!response.isSuccessful) return@use JSONArray()
            JSONArray(response.body?.string().orEmpty())
        }

        var pending = 0
        var confirmed = 0
        var paid = 0
        var cancelled = 0
        for (i in 0 until bookings.length()) {
            val row = bookings.getJSONObject(i)
            val status = row.optString("status", "").lowercase()
            val paymentStatus = row.optString("payment_status", "").lowercase()
            if (status == "pending" || status == "pending_confirmation") pending++
            if (status == "confirmed") confirmed++
            if (status == "cancelled") cancelled++
            if (paymentStatus == "paid") paid++
        }

        var unpaidCheckout = 0
        var refundedCheckout = 0
        for (i in 0 until checkoutRows.length()) {
            val paymentStatus = checkoutRows.getJSONObject(i).optString("payment_status", "").lowercase()
            if (paymentStatus == "unpaid") unpaidCheckout++
            if (paymentStatus == "refunded") refundedCheckout++
        }

        Result.success(
            FinancialSummaryMetrics(
                bookingsTotal = bookings.length(),
                pending = pending,
                confirmed = confirmed,
                paid = paid,
                cancelled = cancelled,
                unpaidCheckoutRequests = unpaidCheckout,
                refundedCheckoutRequests = refundedCheckout,
            )
        )
    }

    suspend fun fetchOperationsSummary(accessToken: String?): Result<OperationsSummaryMetrics> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        fun rows(path: String): JSONArray {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/$path")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $bearer")
                .get()
                .build()
            return client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) JSONArray() else JSONArray(response.body?.string().orEmpty())
            }
        }

        val hostApplications = rows("host_applications?select=id,status")
        val properties = rows("properties?select=id,is_published")
        val tours = rows("tours?select=id,is_published")
        val transport = rows("transport_vehicles?select=id")
        val bookings = rows("bookings?select=id")

        var pendingApplications = 0
        for (i in 0 until hostApplications.length()) {
            if (hostApplications.getJSONObject(i).optString("status", "").lowercase() == "pending") pendingApplications++
        }
        var publishedProperties = 0
        for (i in 0 until properties.length()) {
            if (properties.getJSONObject(i).optBoolean("is_published", false)) publishedProperties++
        }
        var publishedTours = 0
        for (i in 0 until tours.length()) {
            if (tours.getJSONObject(i).optBoolean("is_published", false)) publishedTours++
        }

        Result.success(
            OperationsSummaryMetrics(
                hostApplicationsTotal = hostApplications.length(),
                hostApplicationsPending = pendingApplications,
                propertiesTotal = properties.length(),
                propertiesPublished = publishedProperties,
                toursTotal = tours.length(),
                toursPublished = publishedTours,
                transportVehiclesTotal = transport.length(),
                bookingsTotal = bookings.length(),
            )
        )
    }

    suspend fun fetchSupportSummary(accessToken: String?): Result<SupportSummaryMetrics> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        fun rows(path: String): JSONArray {
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/$path")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $bearer")
                .get()
                .build()
            return client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) JSONArray() else JSONArray(response.body?.string().orEmpty())
            }
        }

        val tickets = rows("support_tickets?select=id,status")
        val reviews = rows("property_reviews?select=id")
        var open = 0
        var inProgress = 0
        var resolved = 0
        var closed = 0
        for (i in 0 until tickets.length()) {
            when (tickets.getJSONObject(i).optString("status", "").lowercase()) {
                "open" -> open++
                "in_progress" -> inProgress++
                "resolved" -> resolved++
                "closed" -> closed++
            }
        }

        Result.success(
            SupportSummaryMetrics(
                ticketsTotal = tickets.length(),
                ticketsOpen = open,
                ticketsInProgress = inProgress,
                ticketsResolved = resolved,
                ticketsClosed = closed,
                reviewsTotal = reviews.length(),
            )
        )
    }

    suspend fun createTour(hostId: String, payload: JSONObject, accessToken: String?): Result<Unit> = withContext(Dispatchers.IO) {
        payload.put("created_by", hostId)
        payload.put("is_published", true)
        val result = postJson("tours", payload, accessToken, false)
        if (result.isSuccess) Result.success(Unit) else Result.failure(result.exceptionOrNull() ?: IllegalStateException("Tour create failed"))
    }

    suspend fun createTourPackage(hostId: String, payload: JSONObject, accessToken: String?): Result<Unit> = withContext(Dispatchers.IO) {
        payload.put("host_id", hostId)
        if (!payload.has("country")) payload.put("country", "Rwanda")
        if (!payload.has("status")) payload.put("status", "approved")
        val result = postJson("tour_packages", payload, accessToken, false)
        if (result.isSuccess) Result.success(Unit) else Result.failure(result.exceptionOrNull() ?: IllegalStateException("Package create failed"))
    }

    suspend fun createProperty(hostId: String, payload: JSONObject, accessToken: String?): Result<Unit> = withContext(Dispatchers.IO) {
        payload.put("host_id", hostId)
        payload.put("is_published", true)
        if (!payload.has("name")) payload.put("name", payload.optString("title", "Untitled Property"))
        if (!payload.has("title")) payload.put("title", payload.optString("name", "Untitled Property"))
        if (!payload.has("property_type")) payload.put("property_type", "Apartment")
        if (!payload.has("currency")) payload.put("currency", "RWF")
        if (!payload.has("max_guests")) payload.put("max_guests", 2)
        if (!payload.has("bedrooms")) payload.put("bedrooms", 1)
        if (!payload.has("bathrooms")) payload.put("bathrooms", 1)
        if (!payload.has("images")) payload.put("images", JSONArray())
        val result = postJson("properties", payload, accessToken, false)
        if (result.isSuccess) Result.success(Unit) else Result.failure(result.exceptionOrNull() ?: IllegalStateException("Property create failed"))
    }

    suspend fun createRoom(hostId: String, payload: JSONObject, accessToken: String?): Result<Unit> = withContext(Dispatchers.IO) {
        payload.put("host_id", hostId)
        payload.put("is_published", true)
        payload.put("property_type", "Room")
        payload.put("name", payload.optString("title", "Untitled Room"))
        if (!payload.has("currency")) payload.put("currency", "RWF")
        if (!payload.has("max_guests")) payload.put("max_guests", 2)
        if (!payload.has("bedrooms")) payload.put("bedrooms", 1)
        if (!payload.has("bathrooms")) payload.put("bathrooms", 1)
        if (!payload.has("beds")) payload.put("beds", 1)
        if (!payload.has("images")) payload.put("images", JSONArray())
        val result = postJson("properties", payload, accessToken, false)
        if (result.isSuccess) Result.success(Unit) else Result.failure(result.exceptionOrNull() ?: IllegalStateException("Room create failed"))
    }

    suspend fun createTransportVehicle(hostId: String, payload: JSONObject, serviceType: String, accessToken: String?): Result<String?> = withContext(Dispatchers.IO) {
        payload.put("created_by", hostId)
        payload.put("service_type", serviceType)
        payload.put("is_published", true)
        val result = postJson("transport_vehicles", payload, accessToken, true)
        if (result.isFailure) {
            return@withContext Result.failure(result.exceptionOrNull() ?: IllegalStateException("Transport create failed"))
        }
        val rows = result.getOrNull() ?: JSONArray()
        val id = if (rows.length() > 0) rows.getJSONObject(0).optString("id", "").ifBlank { null } else null
        Result.success(id)
    }

    suspend fun createAirportTransferPricing(vehicleId: String, routeId: String, price: Double, currency: String, accessToken: String?): Result<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("vehicle_id", vehicleId)
            put("route_id", routeId)
            put("price", price)
            put("currency", currency)
        }
        val result = postJson("airport_transfer_pricing", payload, accessToken, false)
        if (result.isSuccess) Result.success(Unit) else Result.failure(result.exceptionOrNull() ?: IllegalStateException("Pricing create failed"))
    }

    suspend fun fetchHostReviews(hostId: String, accessToken: String?): Result<List<HostReviewRecord>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val url = "$supabaseUrl/rest/v1/property_reviews?select=id,rating,review_text,status,property_id,created_at&host_id=eq.$hostId&order=created_at.desc"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch host reviews (${response.code})"))
            }
            val rows = JSONArray(response.body?.string().orEmpty())
            val items = mutableListOf<HostReviewRecord>()
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                items += HostReviewRecord(
                    id = row.optString("id"),
                    rating = if (row.has("rating") && !row.isNull("rating")) row.optDouble("rating", 0.0) else 0.0,
                    reviewText = row.optString("review_text", "").ifBlank { null },
                    status = row.optString("status", "open"),
                    propertyId = row.optString("property_id", "").ifBlank { null },
                    createdAt = row.optString("created_at", "").ifBlank { null },
                )
            }
            Result.success(items)
        }
    }

    suspend fun createHostPayoutRequest(
        hostId: String,
        amount: Double,
        currency: String,
        payoutMethod: String,
        payoutDetails: JSONObject,
        accessToken: String?,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("host_id", hostId)
            put("amount", amount)
            put("currency", currency)
            put("status", "pending")
            put("payout_method", payoutMethod)
            put("payout_details", payoutDetails)
        }
        val result = postJson("host_payouts", payload, accessToken, false)
        if (result.isSuccess) Result.success(Unit) else Result.failure(result.exceptionOrNull() ?: IllegalStateException("Could not create payout request"))
    }

    suspend fun fetchAffiliateAccount(userId: String, accessToken: String?): Result<AffiliateAccountRecord?> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val url = "$supabaseUrl/rest/v1/affiliates?select=id,status,referral_code,company_name,website_url,commission_rate,total_earnings,pending_earnings,paid_earnings,total_referrals&user_id=eq.$userId&limit=1"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch affiliate account (${response.code})"))
            }
            val rows = JSONArray(response.body?.string().orEmpty())
            if (rows.length() == 0) return@withContext Result.success(null)
            val row = rows.getJSONObject(0)
            Result.success(
                AffiliateAccountRecord(
                    id = row.optString("id"),
                    status = row.optString("status", "pending"),
                    referralCode = row.optString("referral_code", ""),
                    companyName = row.optString("company_name", "").ifBlank { null },
                    websiteUrl = row.optString("website_url", "").ifBlank { null },
                    commissionRate = if (row.has("commission_rate") && !row.isNull("commission_rate")) row.optDouble("commission_rate", 10.0) else 10.0,
                    totalEarnings = if (row.has("total_earnings") && !row.isNull("total_earnings")) row.optDouble("total_earnings", 0.0) else 0.0,
                    pendingEarnings = if (row.has("pending_earnings") && !row.isNull("pending_earnings")) row.optDouble("pending_earnings", 0.0) else 0.0,
                    paidEarnings = if (row.has("paid_earnings") && !row.isNull("paid_earnings")) row.optDouble("paid_earnings", 0.0) else 0.0,
                    totalReferrals = if (row.has("total_referrals") && !row.isNull("total_referrals")) row.optInt("total_referrals", 0) else 0,
                )
            )
        }
    }

    suspend fun createAffiliateAccount(
        userId: String,
        companyName: String?,
        websiteUrl: String?,
        accessToken: String?,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val code = callCodeRpc("generate_referral_code", accessToken)
            ?: callCodeRpc("generate_affiliate_code", accessToken)
            ?: return@withContext Result.failure(IllegalStateException("Could not generate referral code"))

        val payload = JSONObject().apply {
            put("user_id", userId)
            put("referral_code", code)
            put("status", "pending")
            put("commission_rate", 10.0)
            if (!companyName.isNullOrBlank()) put("company_name", companyName.trim())
            if (!websiteUrl.isNullOrBlank()) put("website_url", websiteUrl.trim())
        }

        val result = postJson("affiliates", payload, accessToken, false)
        if (result.isSuccess) Result.success(Unit) else Result.failure(result.exceptionOrNull() ?: IllegalStateException("Could not create affiliate account"))
    }

    suspend fun fetchAffiliateReferrals(affiliateId: String, accessToken: String?): Result<List<AffiliateReferralRecord>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }
        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val url = "$supabaseUrl/rest/v1/affiliate_referrals?select=id,referred_user_email,converted,status,created_at&affiliate_id=eq.$affiliateId&order=created_at.desc&limit=50"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch affiliate referrals (${response.code})"))
            }
            val rows = JSONArray(response.body?.string().orEmpty())
            val items = mutableListOf<AffiliateReferralRecord>()
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                items += AffiliateReferralRecord(
                    id = row.optString("id"),
                    referredUserEmail = row.optString("referred_user_email", "").ifBlank { null },
                    converted = row.optBoolean("converted", false),
                    status = row.optString("status", "pending"),
                    createdAt = row.optString("created_at", "").ifBlank { null },
                )
            }
            Result.success(items)
        }
    }

    suspend fun fetchAffiliateCommissions(affiliateId: String, accessToken: String?): Result<List<AffiliateCommissionRecord>> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }
        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val url = "$supabaseUrl/rest/v1/affiliate_commissions?select=id,amount,status,booking_id,created_at&affiliate_id=eq.$affiliateId&order=created_at.desc&limit=50"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch affiliate commissions (${response.code})"))
            }
            val rows = JSONArray(response.body?.string().orEmpty())
            val items = mutableListOf<AffiliateCommissionRecord>()
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                items += AffiliateCommissionRecord(
                    id = row.optString("id"),
                    amount = if (row.has("amount") && !row.isNull("amount")) row.optDouble("amount", 0.0) else 0.0,
                    status = row.optString("status", "pending"),
                    bookingId = row.optString("booking_id", "").ifBlank { null },
                    createdAt = row.optString("created_at", "").ifBlank { null },
                )
            }
            Result.success(items)
        }
    }

    suspend fun createCheckoutRequest(
        userId: String,
        name: String,
        email: String,
        phone: String,
        message: String?,
        totalAmount: Double,
        currency: String,
        paymentMethod: String,
        items: JSONArray,
        accessToken: String?,
    ): Result<CheckoutRequestRecord> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("user_id", userId)
            put("name", name)
            put("email", email)
            put("phone", phone)
            put("message", message ?: "")
            put("status", "pending_confirmation")
            put("payment_status", "unpaid")
            put("payment_method", paymentMethod)
            put("total_amount", totalAmount)
            put("currency", currency)
            put("items", items)
        }

        val result = postJson("checkout_requests", payload, accessToken, true)
        if (result.isFailure) {
            return@withContext Result.failure(result.exceptionOrNull() ?: IllegalStateException("Could not create checkout request"))
        }
        val rows = result.getOrNull() ?: JSONArray()
        if (rows.length() == 0) {
            return@withContext Result.failure(IllegalStateException("Checkout request was not created"))
        }
        val row = rows.getJSONObject(0)
        Result.success(
            CheckoutRequestRecord(
                id = row.optString("id"),
                paymentStatus = row.optString("payment_status", "unpaid"),
                totalAmount = if (row.has("total_amount") && !row.isNull("total_amount")) row.optDouble("total_amount", totalAmount) else totalAmount,
                currency = row.optString("currency", currency),
            )
        )
    }

    suspend fun fetchCheckoutRequest(id: String, accessToken: String?): Result<CheckoutRequestRecord?> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }
        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val url = "$supabaseUrl/rest/v1/checkout_requests?select=id,payment_status,total_amount,currency&id=eq.$id&limit=1"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch checkout request (${response.code})"))
            }
            val rows = JSONArray(response.body?.string().orEmpty())
            if (rows.length() == 0) return@withContext Result.success(null)
            val row = rows.getJSONObject(0)
            Result.success(
                CheckoutRequestRecord(
                    id = row.optString("id", id),
                    paymentStatus = row.optString("payment_status", "unpaid"),
                    totalAmount = if (row.has("total_amount") && !row.isNull("total_amount")) row.optDouble("total_amount", 0.0) else 0.0,
                    currency = row.optString("currency", "RWF"),
                )
            )
        }
    }

    suspend fun updateCheckoutRequestPaymentStatus(
        checkoutId: String,
        paymentStatus: String,
        errorMessage: String?,
        accessToken: String?,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val urlBuilder = "$supabaseUrl/rest/v1/checkout_requests".toHttpUrlOrNull()?.newBuilder()
            ?: return@withContext Result.failure(IllegalStateException("Invalid checkout URL"))
        urlBuilder.addQueryParameter("id", "eq.$checkoutId")

        val payload = JSONObject().apply {
            put("payment_status", paymentStatus)
            if (!errorMessage.isNullOrBlank()) put("payment_error", errorMessage)
        }

        val request = Request.Builder()
            .url(urlBuilder.build())
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", "return=minimal")
            .method("PATCH", payload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(IllegalStateException("Could not update checkout status (${response.code})"))
        }
    }

    suspend fun updateBookingPaymentStatus(
        bookingId: String,
        paymentStatus: String,
        bookingStatus: String?,
        accessToken: String?,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val urlBuilder = "$supabaseUrl/rest/v1/bookings".toHttpUrlOrNull()?.newBuilder()
            ?: return@withContext Result.failure(IllegalStateException("Invalid bookings URL"))
        urlBuilder.addQueryParameter("id", "eq.$bookingId")

        val payload = JSONObject().apply {
            put("payment_status", paymentStatus)
            if (!bookingStatus.isNullOrBlank()) put("status", bookingStatus)
        }

        val request = Request.Builder()
            .url(urlBuilder.build())
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", "return=minimal")
            .method("PATCH", payload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(IllegalStateException("Could not update booking status (${response.code})"))
        }
    }

    suspend fun fetchProfileBasics(userId: String, accessToken: String?): Result<UserProfileBasics?> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException("Missing Supabase config"))
        }

        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val url = "$supabaseUrl/rest/v1/profiles?select=full_name,email,phone&user_id=eq.$userId&limit=1"
        val request = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return@withContext Result.failure(IllegalStateException("Could not fetch profile basics (${response.code})"))
            }
            val rows = JSONArray(response.body?.string().orEmpty())
            if (rows.length() == 0) return@withContext Result.success(null)
            val row = rows.getJSONObject(0)
            Result.success(
                UserProfileBasics(
                    fullName = row.optString("full_name", "").ifBlank { null },
                    email = row.optString("email", "").ifBlank { null },
                    phone = row.optString("phone", "").ifBlank { null },
                )
            )
        }
    }

    private fun postJson(
        table: String,
        payload: JSONObject,
        accessToken: String?,
        returnRepresentation: Boolean,
    ): Result<JSONArray> {
        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/$table")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", if (returnRepresentation) "return=representation" else "return=minimal")
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        return client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                Result.failure(IllegalStateException("Insert failed for $table (${response.code})"))
            } else if (returnRepresentation) {
                Result.success(JSONArray(response.body?.string().orEmpty()))
            } else {
                Result.success(JSONArray())
            }
        }
    }

    private fun callCodeRpc(name: String, accessToken: String?): String? {
        val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/rpc/$name")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $bearer")
            .addHeader("Content-Type", "application/json")
            .post("{}".toRequestBody("application/json".toMediaType()))
            .build()

        return client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@use null
            response.body?.string()?.trim()?.trim('"')?.takeIf { it.isNotBlank() }
        }
    }

    suspend fun fetchCitiesWithStays(): List<CityWithCount> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val url = "$supabaseUrl/rest/v1/properties?select=location&is_published=eq.true&location=not.is.null"
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
            
            // Extract unique cities and count stays per city
            val cityCounts = mutableMapOf<String, Int>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val location = obj.optString("location", "").takeIf { it.isNotBlank() } ?: continue
                val city = location.split(",").firstOrNull()?.trim() ?: location
                cityCounts[city] = (cityCounts[city] ?: 0) + 1
            }
            
            // Sort by count descending
            cityCounts.entries
                .map { CityWithCount(it.key, it.value) }
                .sortedByDescending { it.count }
        }
    }

    suspend fun fetchListingsByCity(city: String, limit: Int = 10): List<Listing> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val encodedCity = java.net.URLEncoder.encode(city, "UTF-8")
        val url = "$supabaseUrl/rest/v1/properties?select=id,host_id,title,name,location,price_per_night,price_per_month,currency,is_published,monthly_only_listing,images,main_image,rating&is_published=eq.true&location=ilike.$encodedCity*&order=rating.desc.nullslast&limit=$limit"
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
            val items = mutableListOf<Listing>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                items += Listing(
                    id = obj.optString("id"),
                    hostId = obj.optString("host_id").ifBlank { null },
                    title = obj.optString("title").ifBlank { obj.optString("name", "Untitled") },
                    location = obj.optString("location", "Unknown"),
                    pricePerNight = obj.optDouble("price_per_night", 0.0),
                    pricePerMonth = obj.optDouble("price_per_month", Double.NaN).takeIf { !it.isNaN() },
                    currency = obj.optString("currency", "RWF"),
                    isPublished = if (obj.has("is_published") && !obj.isNull("is_published")) obj.optBoolean("is_published") else null,
                    monthlyOnlyListing = if (obj.has("monthly_only_listing") && !obj.isNull("monthly_only_listing")) obj.optBoolean("monthly_only_listing") else null,
                    images = obj.optJSONArray("images")?.let { arr ->
                        (0 until arr.length()).mapNotNull { arr.optString(it).takeIf { s -> s.isNotBlank() } }
                    },
                    mainImage = obj.optString("main_image").takeIf { it.isNotBlank() },
                    rating = obj.optDouble("rating", 0.0).takeIf { !it.isNaN() }
                )
            }
            items
        }
    }

    suspend fun fetchTours(limit: Int = 30): List<Listing> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val url = "$supabaseUrl/rest/v1/tours?select=id,title,location,price_per_person,price_for_citizens,currency,is_published,images,rating&or=(is_published.eq.true,is_published.is.null)&order=created_at.desc&limit=$limit"
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
            val items = mutableListOf<Listing>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val images = obj.optJSONArray("images")?.let { arr ->
                    (0 until arr.length()).mapNotNull { arr.optString(it).takeIf { s -> s.isNotBlank() } }
                }
                items += Listing(
                    id = obj.optString("id"),
                    title = obj.optString("title", "Tour"),
                    location = obj.optString("location", "Rwanda"),
                    pricePerNight = obj.optDouble("price_per_person", Double.NaN).takeIf { !it.isNaN() }
                        ?: obj.optDouble("price_for_citizens", 0.0),
                    currency = obj.optString("currency", "USD"),
                    images = images,
                    mainImage = images?.firstOrNull(),
                    rating = obj.optDouble("rating", Double.NaN).takeIf { !it.isNaN() },
                    isPublished = if (obj.has("is_published") && !obj.isNull("is_published")) obj.optBoolean("is_published") else null,
                )
            }
            if (items.isNotEmpty()) {
                return@withContext items
            }

            val routesUrl = "$supabaseUrl/rest/v1/airport_transfer_routes?select=id,from_location,to_location,base_price,currency,is_active&is_active=eq.true&order=created_at.desc&limit=$limit"
            val routesRequest = Request.Builder()
                .url(routesUrl)
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .get()
                .build()

            client.newCall(routesRequest).execute().use { routesResponse ->
                if (!routesResponse.isSuccessful) return@withContext emptyList()
                val routesBody = routesResponse.body?.string().orEmpty()
                val routesArray = JSONArray(routesBody)
                val routeItems = mutableListOf<Listing>()
                for (i in 0 until routesArray.length()) {
                    val obj = routesArray.getJSONObject(i)
                    val from = obj.optString("from_location", "Airport")
                    val to = obj.optString("to_location", "City")
                    routeItems += Listing(
                        id = obj.optString("id"),
                        title = "Airport transfer",
                        location = "$from → $to",
                        pricePerNight = obj.optDouble("base_price", 0.0),
                        currency = obj.optString("currency", "USD"),
                        images = null,
                        mainImage = null,
                        isPublished = true,
                    )
                }
                routeItems
            }
        }
    }

    suspend fun fetchCars(limit: Int = 30): List<Listing> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val url = "$supabaseUrl/rest/v1/transport_vehicles?select=id,title,provider_name,vehicle_type,price_per_day,daily_price,currency,image_url,media,exterior_images,interior_images,is_published&or=(is_published.eq.true,is_published.is.null)&order=created_at.desc&limit=$limit"
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
            val items = mutableListOf<Listing>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val media = mutableListOf<String>()
                obj.optString("image_url").takeIf { it.isNotBlank() }?.let { media.add(it) }
                obj.optJSONArray("exterior_images")?.let { arr ->
                    for (j in 0 until arr.length()) arr.optString(j).takeIf { it.isNotBlank() }?.let { media.add(it) }
                }
                obj.optJSONArray("interior_images")?.let { arr ->
                    for (j in 0 until arr.length()) arr.optString(j).takeIf { it.isNotBlank() }?.let { media.add(it) }
                }
                obj.optJSONArray("media")?.let { arr ->
                    for (j in 0 until arr.length()) arr.optString(j).takeIf { it.isNotBlank() }?.let { media.add(it) }
                }

                items += Listing(
                    id = obj.optString("id"),
                    title = obj.optString("title", "Car rental"),
                    location = obj.optString("provider_name").ifBlank { obj.optString("vehicle_type", "Transport") },
                    pricePerNight = obj.optDouble("price_per_day", Double.NaN).takeIf { !it.isNaN() }
                        ?: obj.optDouble("daily_price", 0.0),
                    currency = obj.optString("currency", "USD"),
                    images = media,
                    mainImage = media.firstOrNull(),
                    isPublished = if (obj.has("is_published") && !obj.isNull("is_published")) obj.optBoolean("is_published") else null,
                )
            }
            items
        }
    }

    suspend fun fetchEvents(limit: Int = 30): List<Listing> = withContext(Dispatchers.IO) {
        if (supabaseUrl.isBlank() || anonKey.isBlank()) return@withContext emptyList()

        val url = "$supabaseUrl/rest/v1/tour_packages?select=id,title,city,country,price_per_person,price_per_adult,currency,cover_image,gallery_images,status,is_approved&or=(status.eq.approved,status.eq.published,is_approved.eq.true)&order=created_at.desc&limit=$limit"
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
            val items = mutableListOf<Listing>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val images = mutableListOf<String>()
                obj.optString("cover_image").takeIf { it.isNotBlank() }?.let { images.add(it) }
                obj.optJSONArray("gallery_images")?.let { arr ->
                    for (j in 0 until arr.length()) arr.optString(j).takeIf { it.isNotBlank() }?.let { images.add(it) }
                }
                val city = obj.optString("city", "Rwanda")
                val country = obj.optString("country", "")
                val location = if (country.isBlank()) city else "$city, $country"

                items += Listing(
                    id = obj.optString("id"),
                    title = obj.optString("title", "Event"),
                    location = location,
                    pricePerNight = obj.optDouble("price_per_person", Double.NaN).takeIf { !it.isNaN() }
                        ?: obj.optDouble("price_per_adult", 0.0),
                    currency = obj.optString("currency", "USD"),
                    images = images,
                    mainImage = images.firstOrNull(),
                    isPublished = true,
                )
            }
            items
        }
    }

    // ── Support Chat ──────────────────────────────────────────────────────────

    suspend fun fetchActiveTicket(userId: String, accessToken: String?): Result<SupportTicketData?> = withContext(Dispatchers.IO) {
        runCatching {
            val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
            val url = "$supabaseUrl/rest/v1/support_tickets?select=id,subject,status,created_at&user_id=eq.$userId&status=in.(open,in_progress)&order=created_at.desc&limit=1"
            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $bearer")
                .get()
                .build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                val arr = if (response.isSuccessful) JSONArray(body) else JSONArray()
                if (arr.length() == 0) return@runCatching null
                val obj = arr.getJSONObject(0)
                SupportTicketData(
                    id = obj.optString("id"),
                    subject = obj.optString("subject"),
                    status = obj.optString("status"),
                    createdAt = obj.optString("created_at"),
                )
            }
        }
    }

    suspend fun createTicketWithMessage(userId: String, message: String, senderName: String, accessToken: String?): Result<SupportTicketData> = withContext(Dispatchers.IO) {
        runCatching {
            val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
            val subject = if (message.length > 50) message.take(50) + "..." else message
            val ticketPayload = JSONObject().apply {
                put("user_id", userId)
                put("category", "general")
                put("subject", subject)
                put("message", message)
                put("status", "open")
            }
            val ticketReq = Request.Builder()
                .url("$supabaseUrl/rest/v1/support_tickets")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $bearer")
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "return=representation")
                .post(ticketPayload.toString().toRequestBody("application/json".toMediaType()))
                .build()
            val ticketId: String
            val createdAt: String
            client.newCall(ticketReq).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) throw IllegalStateException("Could not create ticket (${response.code})")
                val arr = JSONArray(body)
                val obj = arr.getJSONObject(0)
                ticketId = obj.optString("id")
                createdAt = obj.optString("created_at")
            }
            val msgPayload = JSONObject().apply {
                put("ticket_id", ticketId)
                put("sender_id", userId)
                put("sender_type", "customer")
                put("sender_name", senderName)
                put("message", message)
            }
            val msgReq = Request.Builder()
                .url("$supabaseUrl/rest/v1/support_ticket_messages")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $bearer")
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "return=minimal")
                .post(msgPayload.toString().toRequestBody("application/json".toMediaType()))
                .build()
            client.newCall(msgReq).execute().close()
            SupportTicketData(id = ticketId, subject = subject, status = "open", createdAt = createdAt)
        }
    }

    suspend fun fetchTicketMessages(ticketId: String, accessToken: String?): Result<List<SupportChatMessage>> = withContext(Dispatchers.IO) {
        runCatching {
            val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
            val url = "$supabaseUrl/rest/v1/support_ticket_messages?ticket_id=eq.$ticketId&order=created_at.asc&select=id,sender_type,sender_name,message,created_at"
            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $bearer")
                .get()
                .build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                val arr = if (response.isSuccessful) JSONArray(body) else JSONArray()
                List(arr.length()) { i ->
                    val obj = arr.getJSONObject(i)
                    SupportChatMessage(
                        id = obj.optString("id"),
                        senderType = obj.optString("sender_type", "customer"),
                        senderName = obj.optString("sender_name").ifBlank { null },
                        message = obj.optString("message"),
                        createdAt = obj.optString("created_at"),
                    )
                }
            }
        }
    }

    suspend fun sendSupportMessage(ticketId: String, userId: String, message: String, senderName: String, accessToken: String?): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val bearer = accessToken?.takeIf { it.isNotBlank() } ?: anonKey
            val payload = JSONObject().apply {
                put("ticket_id", ticketId)
                put("sender_id", userId)
                put("sender_type", "customer")
                put("sender_name", senderName)
                put("message", message)
            }
            val request = Request.Builder()
                .url("$supabaseUrl/rest/v1/support_ticket_messages")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $bearer")
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "return=minimal")
                .post(payload.toString().toRequestBody("application/json".toMediaType()))
                .build()
            client.newCall(request).execute().close()
        }
    }
}

data class SupportTicketData(
    val id: String,
    val subject: String,
    val status: String,
    val createdAt: String,
)

data class SupportChatMessage(
    val id: String,
    val senderType: String,
    val senderName: String?,
    val message: String,
    val createdAt: String,
)

data class CityWithCount(val city: String, val count: Int)

data class AuthSession(
    val userId: String,
    val accessToken: String,
)

data class AdminOverviewMetrics(
    val usersTotal: Int,
    val hostsTotal: Int,
    val storiesTotal: Int,
    val propertiesTotal: Int,
    val bookingsTotal: Int,
    val bookingsPaid: Int,
    val revenueGross: Double,
    val platformCharges: Double,
    val hostNet: Double,
    val discountAmount: Double,
    val revenueCurrency: String,
)

data class FinancialSummaryMetrics(
    val bookingsTotal: Int,
    val pending: Int,
    val confirmed: Int,
    val paid: Int,
    val cancelled: Int,
    val unpaidCheckoutRequests: Int,
    val refundedCheckoutRequests: Int,
)

data class OperationsSummaryMetrics(
    val hostApplicationsTotal: Int,
    val hostApplicationsPending: Int,
    val propertiesTotal: Int,
    val propertiesPublished: Int,
    val toursTotal: Int,
    val toursPublished: Int,
    val transportVehiclesTotal: Int,
    val bookingsTotal: Int,
)

data class SupportSummaryMetrics(
    val ticketsTotal: Int,
    val ticketsOpen: Int,
    val ticketsInProgress: Int,
    val ticketsResolved: Int,
    val ticketsClosed: Int,
    val reviewsTotal: Int,
)

data class HostReviewRecord(
    val id: String,
    val rating: Double,
    val reviewText: String?,
    val status: String,
    val propertyId: String?,
    val createdAt: String?,
)

data class AffiliateAccountRecord(
    val id: String,
    val status: String,
    val referralCode: String,
    val companyName: String?,
    val websiteUrl: String?,
    val commissionRate: Double,
    val totalEarnings: Double,
    val pendingEarnings: Double,
    val paidEarnings: Double,
    val totalReferrals: Int,
)

data class AffiliateReferralRecord(
    val id: String,
    val referredUserEmail: String?,
    val converted: Boolean,
    val status: String,
    val createdAt: String?,
)

data class AffiliateCommissionRecord(
    val id: String,
    val amount: Double,
    val status: String,
    val bookingId: String?,
    val createdAt: String?,
)

data class CheckoutRequestRecord(
    val id: String,
    val paymentStatus: String,
    val totalAmount: Double,
    val currency: String,
)

data class UserProfileBasics(
    val fullName: String?,
    val email: String?,
    val phone: String?,
)
