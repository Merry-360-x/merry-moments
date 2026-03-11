package com.merry360x.mobile.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.data.AdminOverviewMetrics
import com.merry360x.mobile.data.BookingDraft
import com.merry360x.mobile.data.AffiliateAccountRecord
import com.merry360x.mobile.data.AffiliateCommissionRecord
import com.merry360x.mobile.data.AffiliateReferralRecord
import com.merry360x.mobile.data.FinancialSummaryMetrics
import com.merry360x.mobile.data.HostReviewRecord
import com.merry360x.mobile.data.OperationsSummaryMetrics
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.SupportSummaryMetrics
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit
import java.util.Locale
import org.json.JSONObject
import org.json.JSONArray

enum class AppCenterDestination {
    BACKOFFICE,
    HOST_STUDIO,
    AFFILIATE,
    SUPPORT_LEGAL,
    BOOKINGS_CHECKOUT,
}

@Composable
fun AppCentersScreen(
    destination: AppCenterDestination,
    onBackToProfile: () -> Unit,
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var activeModule by remember(destination) { mutableStateOf<String?>(null) }

    val title = when (destination) {
        AppCenterDestination.BACKOFFICE -> "Backoffice Center"
        AppCenterDestination.HOST_STUDIO -> "Host Studio"
        AppCenterDestination.AFFILIATE -> "Affiliate Center"
        AppCenterDestination.SUPPORT_LEGAL -> "Legal"
        AppCenterDestination.BOOKINGS_CHECKOUT -> "Bookings & Checkout"
    }

    val modules = when (destination) {
        AppCenterDestination.BACKOFFICE -> listOf(
            "Admin Overview",
            "Financial Summary",
            "Operations Summary",
            "Support Summary",
            "Admin Roles",
            "Admin Integrations",
        )
        AppCenterDestination.HOST_STUDIO -> listOf(
            "Host Dashboard",
            "Bookings",
            "Host Reviews",
            "Financial Reports",
            "Payout Requests",
            "Payout History",
            "Create Story",
            "Create Property",
            "Create Room",
            "Create Tour",
            "Create Tour Package",
            "Create Transport",
            "Create Car Rental",
            "Create Airport Transfer",
        )
        AppCenterDestination.AFFILIATE -> listOf(
            "Affiliate Signup",
            "Affiliate Dashboard",
            "Affiliate Portal",
        )
        AppCenterDestination.SUPPORT_LEGAL -> listOf(
            "Privacy Policy",
            "Terms & Conditions",
            "Refund Policy",
        )
        AppCenterDestination.BOOKINGS_CHECKOUT -> listOf(
            "Trip Cart",
            "My Bookings",
            "Checkout",
            "Payment Pending",
            "Payment Failed",
            "Booking Success",
        )
    }

    AnimatedContent(
        targetState = activeModule,
        label = "app-center-module-transition",
        transitionSpec = {
            if (targetState != null) {
                slideInHorizontally(initialOffsetX = { it / 3 }) + fadeIn() togetherWith
                    slideOutHorizontally(targetOffsetX = { -it / 4 }) + fadeOut()
            } else {
                slideInHorizontally(initialOffsetX = { -it / 4 }) + fadeIn() togetherWith
                    slideOutHorizontally(targetOffsetX = { it / 3 }) + fadeOut()
            }
        }
    ) { module ->
        if (module != null) {
            NativeModuleScreen(
                destination = destination,
                moduleTitle = module,
                onBack = { activeModule = null },
                api = api,
                userId = userId,
                accessToken = accessToken,
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = CardGray)
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                "Native production modules backed by the same database as web.",
                                color = Color.Gray,
                                fontSize = 13.sp
                            )
                        }
                    }
                }

                item {
                    Text(
                        "Back to Profile",
                        color = Coral,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Coral.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                            .clickable { onBackToProfile() }
                            .padding(12.dp)
                    )
                }

                items(modules) { moduleItem ->
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { activeModule = moduleItem }
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            Text(moduleItem, fontSize = 14.sp, modifier = Modifier.weight(1f))
                            Text("Open", color = Color.Gray, fontSize = 12.sp)
                        }
                        HorizontalDivider(color = Color.LightGray.copy(alpha = 0.4f))
                    }
                }
            }
        }
    }
}

@Composable
private fun NativeModuleScreen(
    destination: AppCenterDestination,
    moduleTitle: String,
    onBack: () -> Unit,
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            "Back",
            color = Coral,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier
                .fillMaxWidth()
                .background(Coral.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                .clickable { onBack() }
                .padding(10.dp)
        )

        when {
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Create Story" -> {
                NativeCreateStoryModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Create Property" -> {
                NativeCreatePropertyModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Create Room" -> {
                NativeCreateRoomModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Create Tour" -> {
                NativeCreateTourModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Create Tour Package" -> {
                NativeCreateTourPackageModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Create Transport" -> {
                NativeCreateVehicleModule(api = api, userId = userId, accessToken = accessToken, serviceType = "transport")
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Create Car Rental" -> {
                NativeCreateVehicleModule(api = api, userId = userId, accessToken = accessToken, serviceType = "car_rental")
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Create Airport Transfer" -> {
                NativeCreateAirportTransferModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.SUPPORT_LEGAL && moduleTitle == "Help Center" -> {
                NativeHelpCenterModule()
            }
            destination == AppCenterDestination.BOOKINGS_CHECKOUT && (moduleTitle == "Trip Cart" || moduleTitle == "My Bookings") -> {
                NativeBookingsModule(api = api, userId = userId)
            }
            destination == AppCenterDestination.BOOKINGS_CHECKOUT && moduleTitle == "Checkout" -> {
                NativeCheckoutModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.BOOKINGS_CHECKOUT && moduleTitle == "Payment Pending" -> {
                NativePaymentStateModule("Payment Pending", "Your payment is processing.", Color(0xFFFFA726))
            }
            destination == AppCenterDestination.BOOKINGS_CHECKOUT && moduleTitle == "Payment Failed" -> {
                NativePaymentStateModule("Payment Failed", "Retry payment or use another method.", Color(0xFFE53935))
            }
            destination == AppCenterDestination.BOOKINGS_CHECKOUT && moduleTitle == "Booking Success" -> {
                NativePaymentStateModule("Booking Success", "Booking confirmed and visible in your trips.", Color(0xFF43A047))
            }
            destination == AppCenterDestination.BACKOFFICE && moduleTitle == "Admin Overview" -> {
                NativeAdminOverviewModule(api = api, accessToken = accessToken)
            }
            destination == AppCenterDestination.BACKOFFICE && moduleTitle == "Financial Summary" -> {
                NativeFinancialSummaryModule(api = api, accessToken = accessToken)
            }
            destination == AppCenterDestination.BACKOFFICE && moduleTitle == "Operations Summary" -> {
                NativeOperationsSummaryModule(api = api, accessToken = accessToken)
            }
            destination == AppCenterDestination.BACKOFFICE && moduleTitle == "Support Summary" -> {
                NativeSupportSummaryModule(api = api, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Host Dashboard" -> {
                NativeHostDashboardModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Financial Reports" -> {
                NativeHostFinancialReportsModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Payout Requests" -> {
                NativeHostPayoutRequestModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Payout History" -> {
                NativeHostPayoutHistoryModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.HOST_STUDIO && moduleTitle == "Host Reviews" -> {
                NativeHostReviewsModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.AFFILIATE && moduleTitle == "Affiliate Signup" -> {
                NativeAffiliateSignupModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.AFFILIATE && moduleTitle == "Affiliate Dashboard" -> {
                NativeAffiliateDashboardModule(api = api, userId = userId, accessToken = accessToken)
            }
            destination == AppCenterDestination.AFFILIATE && moduleTitle == "Affiliate Portal" -> {
                NativeAffiliatePortalModule(api = api, userId = userId, accessToken = accessToken)
            }
            else -> {
                NativeInfoModule(moduleTitle)
            }
        }
    }
}

@Composable
private fun NativeInfoModule(title: String) {
    Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            Text("This module is native and uses the same backend and role controls as website.", color = Color.Gray, fontSize = 13.sp)
            Text("- No webview redirect", color = Color.DarkGray, fontSize = 13.sp)
            Text("- Shared Supabase data", color = Color.DarkGray, fontSize = 13.sp)
            Text("- Same account roles", color = Color.DarkGray, fontSize = 13.sp)
        }
    }
}

@Composable
private fun NativeAdminOverviewModule(
    api: SupabaseApi,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var metrics by remember {
        mutableStateOf(
            AdminOverviewMetrics(
                usersTotal = 0,
                hostsTotal = 0,
                storiesTotal = 0,
                propertiesTotal = 0,
                bookingsTotal = 0,
                bookingsPaid = 0,
                revenueGross = 0.0,
                platformCharges = 0.0,
                hostNet = 0.0,
                discountAmount = 0.0,
                revenueCurrency = "RWF",
            )
        )
    }

    LaunchedEffect(Unit) {
        loading = true
        val result = api.fetchAdminOverviewMetrics(accessToken)
        if (result.isSuccess) {
            metrics = result.getOrNull() ?: metrics
            error = null
        } else {
            error = result.exceptionOrNull()?.message
        }
        loading = false
    }

    if (loading) {
        CircularProgressIndicator(color = Coral)
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        error?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
        MetricRow("Users", metrics.usersTotal.toString())
        MetricRow("Hosts", metrics.hostsTotal.toString())
        MetricRow("Stories", metrics.storiesTotal.toString())
        MetricRow("Properties", metrics.propertiesTotal.toString())
        MetricRow("Bookings", metrics.bookingsTotal.toString())
        MetricRow("Paid Bookings", metrics.bookingsPaid.toString())
        MetricRow("Revenue", "${metrics.revenueCurrency} ${"%,.0f".format(metrics.revenueGross)}")
        MetricRow("Platform Charges", "${metrics.revenueCurrency} ${"%,.0f".format(metrics.platformCharges)}")
        MetricRow("Host Net", "${metrics.revenueCurrency} ${"%,.0f".format(metrics.hostNet)}")
        MetricRow("Discount Amount", "${metrics.revenueCurrency} ${"%,.0f".format(metrics.discountAmount)}")
    }
}

@Composable
private fun NativeFinancialSummaryModule(
    api: SupabaseApi,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var summary by remember {
        mutableStateOf(
            FinancialSummaryMetrics(
                bookingsTotal = 0,
                pending = 0,
                confirmed = 0,
                paid = 0,
                cancelled = 0,
                unpaidCheckoutRequests = 0,
                refundedCheckoutRequests = 0,
            )
        )
    }

    LaunchedEffect(Unit) {
        val result = api.fetchFinancialSummary(accessToken)
        if (result.isSuccess) {
            summary = result.getOrNull() ?: summary
            error = null
        } else {
            error = result.exceptionOrNull()?.message
        }
        loading = false
    }

    if (loading) {
        CircularProgressIndicator(color = Coral)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        error?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
        MetricRow("Bookings Total", summary.bookingsTotal.toString())
        MetricRow("Pending", summary.pending.toString())
        MetricRow("Confirmed", summary.confirmed.toString())
        MetricRow("Paid", summary.paid.toString())
        MetricRow("Cancelled", summary.cancelled.toString())
        MetricRow("Unpaid Checkout", summary.unpaidCheckoutRequests.toString())
        MetricRow("Refunded Checkout", summary.refundedCheckoutRequests.toString())
    }
}

@Composable
private fun NativeOperationsSummaryModule(
    api: SupabaseApi,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var summary by remember {
        mutableStateOf(
            OperationsSummaryMetrics(
                hostApplicationsTotal = 0,
                hostApplicationsPending = 0,
                propertiesTotal = 0,
                propertiesPublished = 0,
                toursTotal = 0,
                toursPublished = 0,
                transportVehiclesTotal = 0,
                bookingsTotal = 0,
            )
        )
    }

    LaunchedEffect(Unit) {
        val result = api.fetchOperationsSummary(accessToken)
        if (result.isSuccess) {
            summary = result.getOrNull() ?: summary
            error = null
        } else {
            error = result.exceptionOrNull()?.message
        }
        loading = false
    }

    if (loading) {
        CircularProgressIndicator(color = Coral)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        error?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
        MetricRow("Host Applications", summary.hostApplicationsTotal.toString())
        MetricRow("Pending Applications", summary.hostApplicationsPending.toString())
        MetricRow("Properties", summary.propertiesTotal.toString())
        MetricRow("Published Properties", summary.propertiesPublished.toString())
        MetricRow("Tours", summary.toursTotal.toString())
        MetricRow("Published Tours", summary.toursPublished.toString())
        MetricRow("Transport Vehicles", summary.transportVehiclesTotal.toString())
        MetricRow("Bookings", summary.bookingsTotal.toString())
    }
}

@Composable
private fun NativeSupportSummaryModule(
    api: SupabaseApi,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var summary by remember {
        mutableStateOf(
            SupportSummaryMetrics(
                ticketsTotal = 0,
                ticketsOpen = 0,
                ticketsInProgress = 0,
                ticketsResolved = 0,
                ticketsClosed = 0,
                reviewsTotal = 0,
            )
        )
    }

    LaunchedEffect(Unit) {
        val result = api.fetchSupportSummary(accessToken)
        if (result.isSuccess) {
            summary = result.getOrNull() ?: summary
            error = null
        } else {
            error = result.exceptionOrNull()?.message
        }
        loading = false
    }

    if (loading) {
        CircularProgressIndicator(color = Coral)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        error?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
        MetricRow("Tickets Total", summary.ticketsTotal.toString())
        MetricRow("Open", summary.ticketsOpen.toString())
        MetricRow("In Progress", summary.ticketsInProgress.toString())
        MetricRow("Resolved", summary.ticketsResolved.toString())
        MetricRow("Closed", summary.ticketsClosed.toString())
        MetricRow("Reviews", summary.reviewsTotal.toString())
    }
}

@Composable
private fun MetricRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(CardGray, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Text(label, color = Color.DarkGray, modifier = Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun NativeCreateStoryModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var title by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    var body by rememberSaveable { mutableStateOf("") }
    var mediaUrl by rememberSaveable { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Add Story", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text("Uses the same stories payload fields as website.", color = Color.Gray, fontSize = 13.sp)

        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Title") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
        )
        OutlinedTextField(
            value = location,
            onValueChange = { location = it },
            label = { Text("Location (optional)") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
        )
        OutlinedTextField(
            value = body,
            onValueChange = { body = it },
            label = { Text("Story") },
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
        )
        OutlinedTextField(
            value = mediaUrl,
            onValueChange = { mediaUrl = it },
            label = { Text("Media URL (optional)") },
            modifier = Modifier.fillMaxWidth(),
        )

        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }

        Button(
            onClick = {
                if (userId.isNullOrBlank()) {
                    status = "Login required to publish a story."
                    return@Button
                }
                saving = true
                status = null
            },
            enabled = !saving,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (saving) "Publishing..." else "Publish Story")
        }
    }

    if (saving) {
        LaunchedEffect(title, location, body, mediaUrl, userId) {
            val result = api.createStory(
                userId = userId.orEmpty(),
                title = title,
                body = body,
                location = location,
                mediaUrl = mediaUrl,
                accessToken = accessToken,
            )
            status = if (result.isSuccess) {
                title = ""
                location = ""
                body = ""
                mediaUrl = ""
                "Story published successfully."
            } else {
                "Could not publish story: ${result.exceptionOrNull()?.message ?: "Unknown error"}"
            }
            saving = false
        }
    }
}

@Composable
private fun NativeCreateTourModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("Adventure") }
    var durationDays by rememberSaveable { mutableStateOf("1") }
    var maxGroup by rememberSaveable { mutableStateOf("2") }
    var price by rememberSaveable { mutableStateOf("") }
    var currency by rememberSaveable { mutableStateOf("RWF") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Create Tour", fontWeight = FontWeight.Bold)
        LabeledInput("Title", title) { title = it }
        LabeledInput("Description", description) { description = it }
        LabeledInput("Location", location) { location = it }
        LabeledInput("Category", category) { category = it }
        LabeledInput("Duration Days", durationDays) { durationDays = it }
        LabeledInput("Max Group Size", maxGroup) { maxGroup = it }
        LabeledInput("Price Per Person", price) { price = it }
        LabeledInput("Currency", currency) { currency = it }
        HostSubmitButton("Publish Tour", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            saving = true
            val payload = JSONObject().apply {
                put("title", title)
                put("description", description)
                put("location", location)
                put("category", category)
                put("categories", org.json.JSONArray().put(category))
                put("duration_days", durationDays.toIntOrNull() ?: 1)
                put("max_group_size", maxGroup.toIntOrNull() ?: 2)
                put("price_per_person", price.toDoubleOrNull() ?: 0.0)
                put("currency", currency)
            }
            val result = api.createTour(userId, payload, accessToken)
            status = if (result.isSuccess) "Tour created successfully." else "Could not create tour: ${result.exceptionOrNull()?.message}"
            saving = false
        }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

@Composable
private fun NativeCreatePropertyModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    var propertyType by rememberSaveable { mutableStateOf("Apartment") }
    var pricePerNight by rememberSaveable { mutableStateOf("") }
    var currency by rememberSaveable { mutableStateOf("RWF") }
    var maxGuests by rememberSaveable { mutableStateOf("2") }
    var bedrooms by rememberSaveable { mutableStateOf("1") }
    var bathrooms by rememberSaveable { mutableStateOf("1") }
    var beds by rememberSaveable { mutableStateOf("1") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Create Property", fontWeight = FontWeight.Bold)
        LabeledInput("Title", title) { title = it }
        LabeledInput("Description", description) { description = it }
        LabeledInput("Location", location) { location = it }
        LabeledInput("Property Type", propertyType) { propertyType = it }
        LabeledInput("Price Per Night", pricePerNight) { pricePerNight = it }
        LabeledInput("Currency", currency) { currency = it }
        LabeledInput("Max Guests", maxGuests) { maxGuests = it }
        LabeledInput("Bedrooms", bedrooms) { bedrooms = it }
        LabeledInput("Bathrooms", bathrooms) { bathrooms = it }
        LabeledInput("Beds", beds) { beds = it }

        HostSubmitButton("Publish Property", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            saving = true
            val payload = JSONObject().apply {
                put("title", title)
                put("name", title)
                put("description", description)
                put("location", location)
                put("property_type", propertyType)
                put("price_per_night", pricePerNight.toDoubleOrNull() ?: 0.0)
                put("currency", currency)
                put("max_guests", maxGuests.toIntOrNull() ?: 2)
                put("bedrooms", bedrooms.toIntOrNull() ?: 1)
                put("bathrooms", bathrooms.toIntOrNull() ?: 1)
                put("beds", beds.toIntOrNull() ?: 1)
                put("images", JSONArray())
            }
            val result = api.createProperty(userId, payload, accessToken)
            status = if (result.isSuccess) {
                title = ""
                description = ""
                location = ""
                pricePerNight = ""
                "Property created successfully."
            } else {
                "Could not create property: ${result.exceptionOrNull()?.message}"
            }
            saving = false
        }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

@Composable
private fun NativeCreateRoomModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    var pricePerNight by rememberSaveable { mutableStateOf("") }
    var currency by rememberSaveable { mutableStateOf("RWF") }
    var maxGuests by rememberSaveable { mutableStateOf("2") }
    var bedrooms by rememberSaveable { mutableStateOf("1") }
    var bathrooms by rememberSaveable { mutableStateOf("1") }
    var beds by rememberSaveable { mutableStateOf("1") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Create Room", fontWeight = FontWeight.Bold)
        LabeledInput("Room Title", title) { title = it }
        LabeledInput("Description", description) { description = it }
        LabeledInput("Location", location) { location = it }
        LabeledInput("Price Per Night", pricePerNight) { pricePerNight = it }
        LabeledInput("Currency", currency) { currency = it }
        LabeledInput("Max Guests", maxGuests) { maxGuests = it }
        LabeledInput("Bedrooms", bedrooms) { bedrooms = it }
        LabeledInput("Bathrooms", bathrooms) { bathrooms = it }
        LabeledInput("Beds", beds) { beds = it }

        HostSubmitButton("Publish Room", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            saving = true
            val payload = JSONObject().apply {
                put("title", title)
                put("name", title)
                put("description", description)
                put("location", location)
                put("property_type", "Room")
                put("price_per_night", pricePerNight.toDoubleOrNull() ?: 0.0)
                put("currency", currency)
                put("max_guests", maxGuests.toIntOrNull() ?: 2)
                put("bedrooms", bedrooms.toIntOrNull() ?: 1)
                put("bathrooms", bathrooms.toIntOrNull() ?: 1)
                put("beds", beds.toIntOrNull() ?: 1)
                put("images", JSONArray())
            }
            val result = api.createRoom(userId, payload, accessToken)
            status = if (result.isSuccess) {
                title = ""
                description = ""
                location = ""
                pricePerNight = ""
                "Room created successfully."
            } else {
                "Could not create room: ${result.exceptionOrNull()?.message}"
            }
            saving = false
        }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

@Composable
private fun NativeCreateTourPackageModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var title by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("Culture") }
    var city by rememberSaveable { mutableStateOf("Kigali") }
    var duration by rememberSaveable { mutableStateOf("1 day") }
    var description by rememberSaveable { mutableStateOf("") }
    var pricePerAdult by rememberSaveable { mutableStateOf("") }
    var minGuests by rememberSaveable { mutableStateOf("1") }
    var maxGuests by rememberSaveable { mutableStateOf("8") }
    var currency by rememberSaveable { mutableStateOf("RWF") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Create Tour Package", fontWeight = FontWeight.Bold)
        LabeledInput("Title", title) { title = it }
        LabeledInput("Category", category) { category = it }
        LabeledInput("City", city) { city = it }
        LabeledInput("Duration", duration) { duration = it }
        LabeledInput("Description", description) { description = it }
        LabeledInput("Price Per Adult", pricePerAdult) { pricePerAdult = it }
        LabeledInput("Min Guests", minGuests) { minGuests = it }
        LabeledInput("Max Guests", maxGuests) { maxGuests = it }
        LabeledInput("Currency", currency) { currency = it }
        HostSubmitButton("Publish Package", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            saving = true
            val payload = JSONObject().apply {
                put("title", title)
                put("category", category)
                put("tour_type", category)
                put("city", city)
                put("duration", duration)
                put("description", description)
                put("price_per_adult", pricePerAdult.toDoubleOrNull() ?: 0.0)
                put("currency", currency)
                put("min_guests", minGuests.toIntOrNull() ?: 1)
                put("max_guests", maxGuests.toIntOrNull() ?: 8)
                put("categories", org.json.JSONArray().put(category))
            }
            val result = api.createTourPackage(userId, payload, accessToken)
            status = if (result.isSuccess) "Tour package created successfully." else "Could not create package: ${result.exceptionOrNull()?.message}"
            saving = false
        }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

@Composable
private fun NativeCreateVehicleModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
    serviceType: String,
) {
    var title by rememberSaveable { mutableStateOf("") }
    var provider by rememberSaveable { mutableStateOf("") }
    var vehicleType by rememberSaveable { mutableStateOf("Sedan") }
    var brand by rememberSaveable { mutableStateOf("") }
    var model by rememberSaveable { mutableStateOf("") }
    var year by rememberSaveable { mutableStateOf("2024") }
    var seats by rememberSaveable { mutableStateOf("4") }
    var daily by rememberSaveable { mutableStateOf("") }
    var weekly by rememberSaveable { mutableStateOf("") }
    var monthly by rememberSaveable { mutableStateOf("") }
    var currency by rememberSaveable { mutableStateOf("RWF") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(if (serviceType == "car_rental") "Create Car Rental" else "Create Transport", fontWeight = FontWeight.Bold)
        LabeledInput("Title", title) { title = it }
        LabeledInput("Provider Name", provider) { provider = it }
        LabeledInput("Vehicle Type", vehicleType) { vehicleType = it }
        LabeledInput("Car Brand", brand) { brand = it }
        LabeledInput("Car Model", model) { model = it }
        LabeledInput("Car Year", year) { year = it }
        LabeledInput("Seats", seats) { seats = it }
        LabeledInput("Daily Price", daily) { daily = it }
        LabeledInput("Weekly Price", weekly) { weekly = it }
        LabeledInput("Monthly Price", monthly) { monthly = it }
        LabeledInput("Currency", currency) { currency = it }
        HostSubmitButton("Publish Vehicle", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            saving = true
            val payload = JSONObject().apply {
                put("title", title)
                put("provider_name", provider)
                put("vehicle_type", vehicleType)
                put("car_type", vehicleType)
                put("car_brand", brand)
                put("car_model", model)
                put("car_year", year.toIntOrNull() ?: 2024)
                put("seats", seats.toIntOrNull() ?: 4)
                put("daily_price", daily.toDoubleOrNull() ?: 0.0)
                put("weekly_price", weekly.toDoubleOrNull() ?: 0.0)
                put("monthly_price", monthly.toDoubleOrNull() ?: 0.0)
                put("currency", currency)
                put("media", org.json.JSONArray())
                put("exterior_images", org.json.JSONArray())
                put("interior_images", org.json.JSONArray())
            }
            val result = api.createTransportVehicle(userId, payload, serviceType, accessToken)
            status = if (result.isSuccess) "Vehicle created successfully." else "Could not create vehicle: ${result.exceptionOrNull()?.message}"
            saving = false
        }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

@Composable
private fun NativeCreateAirportTransferModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var title by rememberSaveable { mutableStateOf("Airport Transfer") }
    var provider by rememberSaveable { mutableStateOf("") }
    var brand by rememberSaveable { mutableStateOf("") }
    var model by rememberSaveable { mutableStateOf("") }
    var year by rememberSaveable { mutableStateOf("2024") }
    var seats by rememberSaveable { mutableStateOf("4") }
    var routeId by rememberSaveable { mutableStateOf("") }
    var routePrice by rememberSaveable { mutableStateOf("") }
    var currency by rememberSaveable { mutableStateOf("RWF") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Create Airport Transfer", fontWeight = FontWeight.Bold)
        LabeledInput("Title", title) { title = it }
        LabeledInput("Provider Name", provider) { provider = it }
        LabeledInput("Car Brand", brand) { brand = it }
        LabeledInput("Car Model", model) { model = it }
        LabeledInput("Car Year", year) { year = it }
        LabeledInput("Seats", seats) { seats = it }
        LabeledInput("Route ID", routeId) { routeId = it }
        LabeledInput("Route Price", routePrice) { routePrice = it }
        LabeledInput("Currency", currency) { currency = it }
        HostSubmitButton("Publish Airport Transfer", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            saving = true
            val payload = JSONObject().apply {
                put("title", title)
                put("provider_name", provider)
                put("vehicle_type", "Airport Transfer")
                put("car_type", "Airport Transfer")
                put("car_brand", brand)
                put("car_model", model)
                put("car_year", year.toIntOrNull() ?: 2024)
                put("seats", seats.toIntOrNull() ?: 4)
                put("price_per_day", 0.0)
                put("currency", currency)
                put("media", org.json.JSONArray())
                put("exterior_images", org.json.JSONArray())
                put("interior_images", org.json.JSONArray())
            }
            val vehicleResult = api.createTransportVehicle(userId, payload, "airport_transfer", accessToken)
            val vehicleId = vehicleResult.getOrNull()
            val pricingResult = if (!vehicleId.isNullOrBlank() && routeId.isNotBlank() && routePrice.toDoubleOrNull() != null) {
                api.createAirportTransferPricing(vehicleId, routeId, routePrice.toDouble(), currency, accessToken)
            } else {
                Result.success(Unit)
            }
            status = if (vehicleResult.isSuccess && pricingResult.isSuccess) "Airport transfer created successfully." else "Could not create airport transfer: ${(vehicleResult.exceptionOrNull() ?: pricingResult.exceptionOrNull())?.message}"
            saving = false
        }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

@Composable
private fun LabeledInput(label: String, value: String, onValue: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValue,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
    )
}

@Composable
private fun HostSubmitButton(label: String, saving: Boolean, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = !saving, modifier = Modifier.fillMaxWidth()) {
        Text(if (saving) "Saving..." else label)
    }
}

@Composable
private fun NativeHelpCenterModule() {
    val faqs = listOf(
        "How do I create an account?" to "Use Sign Up and register with your email.",
        "Do I need an account to book?" to "Yes, account is required for bookings and support.",
        "How do I make a booking?" to "Search, select, review pricing, pay, and receive confirmation.",
        "Can I modify or cancel booking?" to "Yes, based on provider cancellation policy.",
        "What payment methods are accepted?" to "Methods shown at checkout vary by service and location.",
        "Is payment secure?" to "Yes, payments are processed via secure encrypted systems.",
    )

    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Text("Help Center", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("Native support guidance mirrored from website categories.", color = Color.Gray, fontSize = 13.sp)
        }
        items(faqs) { (q, a) ->
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(q, fontWeight = FontWeight.SemiBold)
                    Text(a, color = Color.DarkGray, fontSize = 13.sp)
                }
            }
        }
        item {
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Contact", fontWeight = FontWeight.SemiBold)
                    Text("Phone: +250 796 214 719", fontSize = 13.sp)
                    Text("Email: support@merry360x.com", fontSize = 13.sp)
                    Text("Response: within 0-24 business hours", color = Color.Gray, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun NativeBookingsModule(
    api: SupabaseApi,
    userId: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var rows by remember { mutableStateOf(listOf<String>()) }

    LaunchedEffect(userId) {
        if (userId.isNullOrBlank()) {
            rows = emptyList()
            error = "Login required to view bookings."
            loading = false
            return@LaunchedEffect
        }

        loading = true
        val result = api.fetchUserBookings(userId)
        if (result.isSuccess) {
            rows = result.getOrNull().orEmpty().map {
                "${it.id.take(8)} • ${it.status} • ${it.currency} ${"%,.0f".format(it.totalPrice)}"
            }
            error = null
        } else {
            rows = emptyList()
            error = result.exceptionOrNull()?.message
        }
        loading = false
    }

    when {
        loading -> CircularProgressIndicator(color = Coral)
        error != null -> Text(error.orEmpty(), color = Color.Red)
        rows.isEmpty() -> Text("No bookings found.", color = Color.Gray)
        else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(rows) { row ->
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text(row, modifier = Modifier.padding(12.dp), fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun NativePaymentStateModule(
    title: String,
    subtitle: String,
    tone: Color,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            modifier = Modifier
                .background(tone.copy(alpha = 0.2f), RoundedCornerShape(100.dp))
                .padding(18.dp)
        )
        Text(title, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Color.Gray, fontSize = 13.sp)
    }
}

@Composable
private fun NativeHostDashboardModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var listings by remember { mutableStateOf(0) }
    var bookings by remember { mutableStateOf(0) }

    LaunchedEffect(userId, accessToken) {
        if (userId.isNullOrBlank()) {
            loading = false
            error = "Login required"
            return@LaunchedEffect
        }
        loading = true
        val listingsResult = api.fetchHostProperties(userId)
        val bookingsResult = api.fetchHostBookings(userId)
        listings = listingsResult.getOrNull()?.size ?: 0
        bookings = bookingsResult.getOrNull()?.size ?: 0
        error = listingsResult.exceptionOrNull()?.message ?: bookingsResult.exceptionOrNull()?.message
        loading = false
    }

    if (loading) {
        CircularProgressIndicator(color = Coral)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        error?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
        MetricRow("Listings", listings.toString())
        MetricRow("Bookings", bookings.toString())
    }
}

@Composable
private fun NativeHostFinancialReportsModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var paidCount by remember { mutableStateOf(0) }
    var revenue by remember { mutableStateOf(0.0) }
    var hostNet by remember { mutableStateOf(0.0) }
    var currency by remember { mutableStateOf("RWF") }

    LaunchedEffect(userId, accessToken) {
        if (userId.isNullOrBlank()) {
            loading = false
            error = "Login required"
            return@LaunchedEffect
        }
        loading = true
        val bookingsResult = api.fetchHostBookings(userId)
        val rows = bookingsResult.getOrNull().orEmpty().filter { it.paymentStatus.equals("paid", true) }
        paidCount = rows.size
        revenue = rows.sumOf { it.totalPrice }
        hostNet = rows.sumOf { it.totalPrice }
        currency = rows.firstOrNull()?.currency ?: "RWF"
        error = bookingsResult.exceptionOrNull()?.message
        loading = false
    }

    if (loading) {
        CircularProgressIndicator(color = Coral)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        error?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
        MetricRow("Paid Bookings", paidCount.toString())
        MetricRow("Revenue", "$currency ${"%,.0f".format(revenue)}")
        MetricRow("Host Net", "$currency ${"%,.0f".format(hostNet)}")
    }
}

@Composable
private fun NativeHostPayoutRequestModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var amount by rememberSaveable { mutableStateOf("") }
    var currency by rememberSaveable { mutableStateOf("RWF") }
    var payoutMethod by rememberSaveable { mutableStateOf("mobile_money") }
    var payoutAccount by rememberSaveable { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Payout Request", fontWeight = FontWeight.Bold)
        LabeledInput("Amount", amount) { amount = it }
        LabeledInput("Currency", currency) { currency = it }
        LabeledInput("Payout Method", payoutMethod) { payoutMethod = it }
        LabeledInput("Payout Account", payoutAccount) { payoutAccount = it }
        HostSubmitButton("Submit Payout Request", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            val amountValue = amount.toDoubleOrNull()
            if (amountValue == null || amountValue <= 0) {
                status = "Amount must be greater than 0"
                return@HostSubmitButton
            }
            saving = true
            val result = api.createHostPayoutRequest(
                hostId = userId,
                amount = amountValue,
                currency = currency,
                payoutMethod = payoutMethod,
                payoutDetails = JSONObject().apply { put("account", payoutAccount) },
                accessToken = accessToken,
            )
            status = if (result.isSuccess) "Payout request submitted." else "Could not submit payout request: ${result.exceptionOrNull()?.message}"
            saving = false
        }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

@Composable
private fun NativeHostPayoutHistoryModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var rows by remember { mutableStateOf(listOf<String>()) }

    LaunchedEffect(userId, accessToken) {
        if (userId.isNullOrBlank()) {
            loading = false
            error = "Login required"
            return@LaunchedEffect
        }
        loading = true
        val result = api.fetchHostPayouts(userId)
        if (result.isSuccess) {
            rows = result.getOrNull().orEmpty().map {
                val amount = if (it.has("amount") && !it.isNull("amount")) it.optDouble("amount", 0.0) else 0.0
                val currency = it.optString("currency", "RWF")
                val status = it.optString("status", "pending")
                "$currency ${"%,.0f".format(amount)} • $status"
            }
            error = null
        } else {
            rows = emptyList()
            error = result.exceptionOrNull()?.message
        }
        loading = false
    }

    when {
        loading -> CircularProgressIndicator(color = Coral)
        error != null -> Text(error.orEmpty(), color = Color.Red)
        rows.isEmpty() -> Text("No payout records found.", color = Color.Gray)
        else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(rows) { row ->
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text(row, modifier = Modifier.padding(12.dp), fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun NativeHostReviewsModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reviews by remember { mutableStateOf<List<HostReviewRecord>>(emptyList()) }

    LaunchedEffect(userId, accessToken) {
        if (userId.isNullOrBlank()) {
            loading = false
            error = "Login required"
            return@LaunchedEffect
        }
        loading = true
        val result = api.fetchHostReviews(userId, accessToken)
        reviews = result.getOrNull().orEmpty()
        error = result.exceptionOrNull()?.message
        loading = false
    }

    when {
        loading -> CircularProgressIndicator(color = Coral)
        error != null -> Text(error.orEmpty(), color = Color.Red)
        reviews.isEmpty() -> Text("No reviews found.", color = Color.Gray)
        else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(reviews) { review ->
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Rating: ${review.rating.toInt()}/5", fontWeight = FontWeight.SemiBold)
                        Text(review.reviewText ?: "No text", fontSize = 13.sp)
                        Text("Status: ${review.status}", color = Color.Gray, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun NativeAffiliateSignupModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var companyName by rememberSaveable { mutableStateOf("") }
    var websiteUrl by rememberSaveable { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Affiliate Signup", fontWeight = FontWeight.Bold)
        LabeledInput("Company Name (optional)", companyName) { companyName = it }
        LabeledInput("Website URL (optional)", websiteUrl) { websiteUrl = it }
        HostSubmitButton("Submit Affiliate Application", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            saving = true
            val result = api.createAffiliateAccount(userId, companyName, websiteUrl, accessToken)
            status = if (result.isSuccess) "Affiliate application submitted." else "Could not submit application: ${result.exceptionOrNull()?.message}"
            saving = false
        }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

@Composable
private fun NativeAffiliateDashboardModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var account by remember { mutableStateOf<AffiliateAccountRecord?>(null) }

    LaunchedEffect(userId, accessToken) {
        if (userId.isNullOrBlank()) {
            loading = false
            error = "Login required"
            return@LaunchedEffect
        }
        loading = true
        val result = api.fetchAffiliateAccount(userId, accessToken)
        account = result.getOrNull()
        error = result.exceptionOrNull()?.message
        loading = false
    }

    if (loading) {
        CircularProgressIndicator(color = Coral)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        error?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
        if (account == null) {
            Text("No affiliate account found yet.", color = Color.Gray)
            return@Column
        }
        MetricRow("Status", account!!.status)
        MetricRow("Referral Code", account!!.referralCode)
        MetricRow("Total Earnings", "RWF ${"%,.0f".format(account!!.totalEarnings)}")
        MetricRow("Pending Earnings", "RWF ${"%,.0f".format(account!!.pendingEarnings)}")
        MetricRow("Paid Earnings", "RWF ${"%,.0f".format(account!!.paidEarnings)}")
        MetricRow("Total Referrals", account!!.totalReferrals.toString())
    }
}

@Composable
private fun NativeAffiliatePortalModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var account by remember { mutableStateOf<AffiliateAccountRecord?>(null) }
    var referrals by remember { mutableStateOf<List<AffiliateReferralRecord>>(emptyList()) }
    var commissions by remember { mutableStateOf<List<AffiliateCommissionRecord>>(emptyList()) }

    LaunchedEffect(userId, accessToken) {
        if (userId.isNullOrBlank()) {
            loading = false
            error = "Login required"
            return@LaunchedEffect
        }
        loading = true
        val accountResult = api.fetchAffiliateAccount(userId, accessToken)
        account = accountResult.getOrNull()
        if (account != null) {
            referrals = api.fetchAffiliateReferrals(account!!.id, accessToken).getOrNull().orEmpty()
            commissions = api.fetchAffiliateCommissions(account!!.id, accessToken).getOrNull().orEmpty()
        }
        error = accountResult.exceptionOrNull()?.message
        loading = false
    }

    if (loading) {
        CircularProgressIndicator(color = Coral)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        error?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
        val code = account?.referralCode.orEmpty()
        if (code.isNotBlank()) {
            MetricRow("Referral Link", "merry360x.com/?ref=$code")
        }
        MetricRow("Referrals", referrals.size.toString())
        MetricRow("Commissions", commissions.size.toString())
    }
}

@Composable
private fun NativeCheckoutModule(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
) {
    var checkIn by rememberSaveable { mutableStateOf("2026-03-15") }
    var checkOut by rememberSaveable { mutableStateOf("2026-03-17") }
    var guests by rememberSaveable { mutableStateOf("2") }
    var nightlyRate by rememberSaveable { mutableStateOf("95000") }
    var guestServiceFeePercent by rememberSaveable { mutableStateOf("10") }
    var discountAmount by rememberSaveable { mutableStateOf("0") }
    var currency by rememberSaveable { mutableStateOf("RWF") }
    var phone by rememberSaveable { mutableStateOf("") }
    var message by rememberSaveable { mutableStateOf("") }
    var checkoutId by remember { mutableStateOf<String?>(null) }
    var bookingId by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    var polling by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    val priceBreakdown = remember(
        checkIn,
        checkOut,
        nightlyRate,
        guestServiceFeePercent,
        discountAmount,
    ) {
        calculateBookingPriceBreakdown(
            checkIn = checkIn,
            checkOut = checkOut,
            nightlyRate = nightlyRate.toDoubleOrNull() ?: 0.0,
            guestServiceFeePercent = guestServiceFeePercent.toDoubleOrNull() ?: 0.0,
            discountAmount = discountAmount.toDoubleOrNull() ?: 0.0,
        )
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Checkout", fontWeight = FontWeight.Bold)
        LabeledInput("Check In", checkIn) { checkIn = it }
        LabeledInput("Check Out", checkOut) { checkOut = it }
        LabeledInput("Guests", guests) { guests = it }
        LabeledInput("Nightly Rate", nightlyRate) { nightlyRate = it }
        LabeledInput("Guest Service Fee %", guestServiceFeePercent) { guestServiceFeePercent = it }
        LabeledInput("Discount", discountAmount) { discountAmount = it }
        LabeledInput("Currency", currency) { currency = it }
        LabeledInput("Phone", phone) { phone = it }
        LabeledInput("Message", message) { message = it }

        Text("Price breakdown", fontWeight = FontWeight.SemiBold)
        MetricRow(
            "${formatMoney(currency, priceBreakdown.nightlyRate)} x ${priceBreakdown.nights} ${if (priceBreakdown.nights == 1L) "night" else "nights"}",
            formatMoney(currency, priceBreakdown.baseSubtotal)
        )
        MetricRow(
            "Service fee (${formatPercent(priceBreakdown.guestServiceFeePercent)})",
            formatMoney(currency, priceBreakdown.serviceFee)
        )
        if (priceBreakdown.discountAmount > 0.0) {
            MetricRow("Discount", "-${formatMoney(currency, priceBreakdown.discountAmount)}")
        }
        MetricRow("Total", formatMoney(currency, priceBreakdown.total))

        HostSubmitButton("Start Checkout", saving) {
            if (userId.isNullOrBlank()) {
                status = "Login required"
                return@HostSubmitButton
            }
            if (priceBreakdown.total <= 0.0) {
                status = "Computed total must be greater than 0"
                return@HostSubmitButton
            }
            val total = priceBreakdown.total

            saving = true

            val profile = api.fetchProfileBasics(userId, accessToken).getOrNull()
            val fullName = profile?.fullName ?: "Merry Mobile User"
            val email = profile?.email ?: "noreply@merry360x.com"
            val phoneValue = phone.ifBlank { profile?.phone ?: "" }

            val bookingResult = api.submitBookingReturningId(
                BookingDraft(
                    guestId = userId,
                    guestName = fullName,
                    guestEmail = email,
                    propertyId = "replace-with-real-property-id",
                    checkIn = checkIn,
                    checkOut = checkOut,
                    guests = guests.toIntOrNull() ?: 1,
                    totalPrice = total,
                    currency = currency,
                    paymentMethod = "mobile_money",
                    specialRequests = message,
                ),
                accessToken = accessToken,
            )

            if (bookingResult.isFailure) {
                status = "Could not create booking: ${bookingResult.exceptionOrNull()?.message}"
                saving = false
                return@HostSubmitButton
            }
            bookingId = bookingResult.getOrNull()

            val checkoutResult = api.createCheckoutRequest(
                userId = userId,
                name = fullName,
                email = email,
                phone = phoneValue,
                message = message,
                totalAmount = total,
                currency = currency,
                paymentMethod = "mobile_money",
                items = JSONArray().put(JSONObject().apply {
                    put("type", "property")
                    put("reference_id", "replace-with-real-property-id")
                    put("quantity", 1)
                    put("amount", total)
                }),
                accessToken = accessToken,
            )

            if (checkoutResult.isFailure) {
                status = "Could not create checkout request: ${checkoutResult.exceptionOrNull()?.message}"
                saving = false
                return@HostSubmitButton
            }

            val checkout = checkoutResult.getOrNull()!!
            checkoutId = checkout.id
            val paymentResult = api.createFlutterwavePayment(
                payload = JSONObject().apply {
                    put("email", email)
                    put("amount", total)
                    put("currency", currency)
                    put("checkoutId", checkout.id)
                },
            )
            status = if (paymentResult.isSuccess) {
                val link = paymentResult.getOrNull()?.optString("paymentLink", "")
                if (!link.isNullOrBlank()) "Checkout started. Payment link: $link" else "Checkout started. Waiting for payment confirmation."
            } else {
                "Checkout started, but payment init failed: ${paymentResult.exceptionOrNull()?.message}"
            }
            saving = false
        }

        HostSubmitButton("Refresh Payment Status", polling) {
            val id = checkoutId
            if (id.isNullOrBlank()) {
                status = "Start checkout first"
                return@HostSubmitButton
            }
            polling = true
            val checkoutResult = api.fetchCheckoutRequest(id, accessToken)
            if (checkoutResult.isFailure) {
                status = "Could not refresh status: ${checkoutResult.exceptionOrNull()?.message}"
                polling = false
                return@HostSubmitButton
            }
            val checkout = checkoutResult.getOrNull()
            val state = checkout?.paymentStatus?.lowercase().orEmpty()
            if (state == "paid" || state == "completed") {
                bookingId?.let { api.updateBookingPaymentStatus(it, "paid", "confirmed", accessToken) }
                status = "Payment confirmed. Booking is now confirmed."
            } else if (state == "failed" || state == "rejected" || state == "cancelled") {
                bookingId?.let { api.updateBookingPaymentStatus(it, "failed", "pending", accessToken) }
                status = "Payment failed. You can retry checkout."
            } else {
                status = "Payment is still pending: ${checkout?.paymentStatus ?: "unpaid"}."
            }
            polling = false
        }

        checkoutId?.let { Text("Checkout id: $it", color = Color.Gray, fontSize = 12.sp) }
        status?.let { Text(it, color = if (it.startsWith("Could")) Color.Red else Color.DarkGray, fontSize = 12.sp) }
    }
}

private data class BookingPriceBreakdown(
    val nights: Long,
    val nightlyRate: Double,
    val baseSubtotal: Double,
    val guestServiceFeePercent: Double,
    val serviceFee: Double,
    val discountAmount: Double,
    val total: Double,
)

private fun calculateBookingPriceBreakdown(
    checkIn: String,
    checkOut: String,
    nightlyRate: Double,
    guestServiceFeePercent: Double,
    discountAmount: Double,
): BookingPriceBreakdown {
    val nights = resolveNights(checkIn, checkOut)
    val safeNightlyRate = nightlyRate.coerceAtLeast(0.0)
    val safeGuestFeePercent = guestServiceFeePercent.coerceAtLeast(0.0)
    val safeDiscount = discountAmount.coerceAtLeast(0.0)

    val baseSubtotal = safeNightlyRate * nights
    val serviceFee = baseSubtotal * (safeGuestFeePercent / 100.0)
    val total = (baseSubtotal + serviceFee - safeDiscount).coerceAtLeast(0.0)

    return BookingPriceBreakdown(
        nights = nights,
        nightlyRate = safeNightlyRate,
        baseSubtotal = baseSubtotal,
        guestServiceFeePercent = safeGuestFeePercent,
        serviceFee = serviceFee,
        discountAmount = safeDiscount,
        total = total,
    )
}

private fun resolveNights(checkIn: String, checkOut: String): Long {
    return try {
        val start = LocalDate.parse(checkIn.trim())
        val end = LocalDate.parse(checkOut.trim())
        ChronoUnit.DAYS.between(start, end).coerceAtLeast(1)
    } catch (_: DateTimeParseException) {
        1
    }
}

private fun formatMoney(currency: String, amount: Double): String {
    return "$currency ${String.format(Locale.US, "%,.0f", amount.coerceAtLeast(0.0))}"
}

private fun formatPercent(value: Double): String {
    return String.format(Locale.US, "%.1f", value.coerceAtLeast(0.0)).trimEnd('0').trimEnd('.') + "%"
}
