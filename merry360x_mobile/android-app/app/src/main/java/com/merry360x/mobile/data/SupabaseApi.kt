package com.merry360x.mobile.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class SupabaseApi(
    private val supabaseUrl: String,
    private val anonKey: String,
) {
    private val client = OkHttpClient()

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
}

data class CityWithCount(val city: String, val count: Int)

data class AuthSession(
    val userId: String,
    val accessToken: String,
)
