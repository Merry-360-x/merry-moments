package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.SupportChatMessage
import com.merry360x.mobile.data.SupportTicketData
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import com.merry360x.mobile.viewmodel.AuthUiState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

@Composable
fun AuthCallbackScreen(
    uiState: AuthUiState,
    onBack: () -> Unit,
    onContinue: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("<- Back", color = Color(0xFF9E9E9E), modifier = Modifier.clickable { onBack() })
        Text("Auth Callback", fontSize = 22.sp, fontWeight = FontWeight.Bold)

        Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                when {
                    uiState.loading -> {
                        CircularProgressIndicator(color = Coral)
                        Text("Completing sign-in securely...", color = Color(0xFF777777))
                    }
                    uiState.authenticated -> {
                        Text("Sign-in completed", fontWeight = FontWeight.SemiBold)
                        Text("You are now authenticated in the native app.", color = Color(0xFF777777))
                    }
                    uiState.error != null -> {
                        Text("Callback failed", fontWeight = FontWeight.SemiBold)
                        Text(uiState.error, color = Color(0xFFC62828))
                    }
                    else -> {
                        Text("Waiting for callback processing...", color = Color(0xFF777777))
                    }
                }
            }
        }

        Button(
            onClick = onContinue,
            enabled = uiState.authenticated,
            colors = ButtonDefaults.buttonColors(containerColor = Coral),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Continue", color = Color.White)
        }
    }
}

@Composable
fun SearchResultsScreen(
    destination: String,
    listings: List<Listing>,
    onBack: () -> Unit,
    onSelectListing: (Listing) -> Unit,
) {
    val query = destination.trim()
    val filtered = if (query.isBlank()) {
        listings
    } else {
        listings.filter {
            it.title.contains(query, ignoreCase = true) ||
                it.location.contains(query, ignoreCase = true)
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                "<- Back",
                color = Color(0xFF9E9E9E),
                fontSize = 13.sp,
                modifier = Modifier.clickable { onBack() }
            )
        }

        item {
            Text("Search Results", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        item {
            val subtitle = if (query.isBlank()) {
                "Showing all available listings"
            } else {
                "Query: $query"
            }
            Text(subtitle, color = Color(0xFF9E9E9E))
        }

        if (filtered.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text(
                        "No listings found. Try a different search.",
                        modifier = Modifier.padding(12.dp),
                        color = Color(0xFF9E9E9E)
                    )
                }
            }
        } else {
            items(filtered) { listing ->
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = CardGray),
                    modifier = Modifier.clickable { onSelectListing(listing) }
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(listing.title, fontWeight = FontWeight.SemiBold)
                        Text(listing.location, color = Color(0xFF9E9E9E), fontSize = 13.sp)
                        val amount = if (listing.monthlyOnlyListing == true) {
                            listing.pricePerMonth ?: listing.pricePerNight
                        } else {
                            listing.pricePerNight
                        }
                        Text("${listing.currency} ${String.format("%,.0f", amount)}", fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}

@Composable
fun ForgotPasswordScreen(
    onBack: () -> Unit,
    onContinueToReset: () -> Unit,
) {
    var email by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("<- Back", color = Color(0xFF9E9E9E), modifier = Modifier.clickable { onBack() })
        Text("Forgot Password", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Enter your email to continue password recovery.", color = Color(0xFF9E9E9E))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Email") },
            singleLine = true
        )

        Button(
            onClick = onContinueToReset,
            enabled = email.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = Coral),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Continue", color = Color.White)
        }
    }
}

@Composable
fun ResetPasswordScreen(
    onBack: () -> Unit,
    onDone: () -> Unit,
) {
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("<- Back", color = Color(0xFF9E9E9E), modifier = Modifier.clickable { onBack() })
        Text("Reset Password", fontSize = 22.sp, fontWeight = FontWeight.Bold)

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("New password") },
            singleLine = true
        )
        OutlinedTextField(
            value = confirmPassword,
            onValueChange = { confirmPassword = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Confirm password") },
            singleLine = true
        )

        val valid = password.isNotBlank() && password == confirmPassword
        Button(
            onClick = onDone,
            enabled = valid,
            colors = ButtonDefaults.buttonColors(containerColor = Coral),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Save password", color = Color.White)
        }
    }
}

@Composable
fun CompleteProfileScreen(
    onBack: () -> Unit,
    api: SupabaseApi,
    userId: String?,
    accessToken: String?
) {
    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(userId) {
        if (userId.isNullOrBlank()) {
            loading = false
            return@LaunchedEffect
        }
        loading = true
        val result = api.fetchProfileBasics(userId, accessToken)
        result.onSuccess { profile ->
            fullName = profile?.fullName ?: ""
            phone = profile?.phone ?: ""
        }
        result.onFailure { error = it.message }
        loading = false
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("<- Back", color = Color(0xFF9E9E9E), modifier = Modifier.clickable { onBack() })
        Text("Complete Profile", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Add your core account details for a complete booking profile.", color = Color(0xFF9E9E9E))

        if (loading) {
            CircularProgressIndicator(color = Coral, modifier = Modifier.padding(16.dp))
        } else {
            error?.let {
                Text(it, color = Color(0xFFC62828), fontSize = 13.sp)
            }

            if (success) {
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF43A047))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Profile updated successfully!", color = Color(0xFF2E7D32), fontWeight = FontWeight.Medium)
                    }
                }
            }

            OutlinedTextField(
                value = fullName,
                onValueChange = { fullName = it; success = false },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Full name") },
                singleLine = true
            )

            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it; success = false },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Phone number") },
                singleLine = true
            )

            Button(
                onClick = {
                    if (userId.isNullOrBlank()) return@Button
                    scope.launch {
                        saving = true
                        error = null
                        val result = api.updateProfileBasics(
                            userId = userId,
                            fullName = fullName.ifBlank { null },
                            phone = phone.ifBlank { null },
                            accessToken = accessToken
                        )
                        result.onSuccess { success = true }
                        result.onFailure { error = it.message }
                        saving = false
                    }
                },
                enabled = !saving && fullName.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Coral),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                if (saving) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                } else {
                    Text("Save profile", color = Color.White)
                }
            }
        }
    }
}

@Composable
fun SafetyGuidelinesScreen(onBack: () -> Unit) {
    val points = listOf(
        "Verify listing details and host identity before payment.",
        "Keep all booking communication and payment in-app.",
        "Use trusted transport and share itinerary with someone.",
        "Report suspicious listings or behavior immediately.",
        "Check cancellation and emergency contact details before travel."
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text("<- Back", color = Color(0xFF9E9E9E), modifier = Modifier.clickable { onBack() })
        }
        item {
            Text("Safety Guidelines", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        items(points) { point ->
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                Text(point, modifier = Modifier.padding(12.dp), color = Color(0xFF777777))
            }
        }

        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Button(
                    onClick = onBack,
                    colors = ButtonDefaults.buttonColors(containerColor = Coral),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Done", color = Color.White)
                }
            }
        }
    }
}

// ── Region picker ─────────────────────────────────────────────────────────────

@Composable
fun RegionPickerScreen(
    currentRegion: String,
    onSelect: (String) -> Unit,
    onBack: () -> Unit,
) {
    val regions = listOf(
        "Rwanda", "Kenya", "Uganda", "Tanzania", "Ethiopia", "Nigeria", "Ghana",
        "South Africa", "Egypt", "Morocco", "Senegal", "Côte d'Ivoire", "Cameroon",
        "Zimbabwe", "Zambia", "Mozambique", "Angola", "Namibia", "Botswana",
        "United States", "United Kingdom", "France", "Germany", "Canada",
        "United Arab Emirates", "China", "India", "Australia"
    )
    var query by remember { mutableStateOf("") }
    val filtered = if (query.isBlank()) regions else regions.filter { it.contains(query, ignoreCase = true) }

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        PickerHeader(title = "Region", onBack = onBack)
        Spacer(modifier = Modifier.height(4.dp))
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text("Search region") },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))
        LazyColumn {
            items(filtered) { region ->
                PickerRow(label = region, isSelected = region == currentRegion) {
                    onSelect(region)
                    onBack()
                }
            }
        }
    }
}

// ── Language picker ───────────────────────────────────────────────────────────

@Composable
fun LanguagePickerScreen(
    currentLanguage: String,
    onSelect: (String) -> Unit,
    onBack: () -> Unit,
) {
    val languages = listOf(
        "English", "French", "Kinyarwanda", "Swahili", "Arabic", "Amharic",
        "Hausa", "Yoruba", "Igbo", "Zulu", "Portuguese", "Spanish",
        "Italian", "German", "Dutch", "Chinese", "Hindi", "Japanese"
    )

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        PickerHeader(title = "Language", onBack = onBack)
        LazyColumn {
            items(languages) { lang ->
                PickerRow(label = lang, isSelected = lang == currentLanguage) {
                    onSelect(lang)
                    onBack()
                }
            }
        }
    }
}

// ── Currency picker ───────────────────────────────────────────────────────────

@Composable
fun CurrencyPickerScreen(
    currentCurrency: String,
    onSelect: (String) -> Unit,
    onBack: () -> Unit,
) {
    val currencies = listOf(
        "RWF" to "Rwandan Franc",
        "USD" to "US Dollar",
        "EUR" to "Euro",
        "GBP" to "British Pound",
        "KES" to "Kenyan Shilling",
        "UGX" to "Ugandan Shilling",
        "TZS" to "Tanzanian Shilling",
        "NGN" to "Nigerian Naira",
        "ZAR" to "South African Rand",
        "GHS" to "Ghanaian Cedi",
        "EGP" to "Egyptian Pound",
        "ETB" to "Ethiopian Birr",
        "XOF" to "West African CFA Franc",
        "MAD" to "Moroccan Dirham",
        "AED" to "UAE Dirham",
        "CAD" to "Canadian Dollar",
        "AUD" to "Australian Dollar",
        "CNY" to "Chinese Yuan",
        "INR" to "Indian Rupee",
    )

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        PickerHeader(title = "Currency", onBack = onBack)
        LazyColumn {
            items(currencies) { (code, name) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(code); onBack() }
                        .padding(horizontal = 20.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(code, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        Text(name, fontSize = 12.sp, color = Color(0xFF9E9E9E))
                    }
                    if (code == currentCurrency) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Coral, modifier = Modifier.size(20.dp))
                    }
                }
                HorizontalDivider(color = Color(0xFFF2F2F2), thickness = 0.5.dp)
            }
        }
    }
}

// ── App mode picker ───────────────────────────────────────────────────────────

@Composable
fun AppModeScreen(
    currentMode: String,
    onSelect: (String) -> Unit,
    onBack: () -> Unit,
) {
    val modes = listOf(
        "Light" to "Bright, clean interface",
        "Dark" to "Easy on the eyes at night",
        "System" to "Follows your device setting",
    )

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        PickerHeader(title = "Display Mode", onBack = onBack)
        Spacer(modifier = Modifier.height(8.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(0.dp)) {
            items(modes) { (mode, description) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(mode); onBack() }
                        .padding(horizontal = 20.dp, vertical = 18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(mode, fontSize = 16.sp, fontWeight = if (mode == currentMode) FontWeight.SemiBold else FontWeight.Normal)
                        Text(description, fontSize = 12.sp, color = Color(0xFF9E9E9E))
                    }
                    if (mode == currentMode) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Coral, modifier = Modifier.size(20.dp))
                    }
                }
                HorizontalDivider(color = Color(0xFFF2F2F2), thickness = 0.5.dp)
            }
        }
    }
}

// ── Notifications settings ────────────────────────────────────────────────────

@Composable
fun NotificationsScreen(onBack: () -> Unit) {
    data class NotifItem(val label: String, val description: String)

    val items = listOf(
        NotifItem("Booking confirmations", "Get notified when a booking is confirmed"),
        NotifItem("Payment updates", "Receipts, refunds and payment status"),
        NotifItem("New messages", "Alerts for new chat messages"),
        NotifItem("Promotions & deals", "Exclusive offers and discounts"),
        NotifItem("Travel reminders", "Reminders before your trips"),
        NotifItem("App updates", "News about new features"),
    )
    val enabled = remember { mutableStateListOf(true, true, true, false, true, false) }

    Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
        PickerHeader(title = "Notifications", onBack = onBack)
        LazyColumn {
            items(items.size) { i ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                        Text(items[i].label, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                        Text(items[i].description, fontSize = 12.sp, color = Color(0xFF9E9E9E))
                    }
                    Switch(
                        checked = enabled[i],
                        onCheckedChange = { enabled[i] = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = Coral)
                    )
                }
                HorizontalDivider(color = Color(0xFFF2F2F2), thickness = 0.5.dp)
            }
        }
    }
}

// ── Support Chat ─────────────────────────────────────────────────────────────

@Composable
fun NativeSupportChatScreen(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
    senderName: String,
    onBack: () -> Unit,
) {
    var ticket by remember { mutableStateOf<SupportTicketData?>(null) }
    var messages by remember { mutableStateOf<List<SupportChatMessage>>(emptyList()) }
    var draft by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var sending by remember { mutableStateOf(false) }
    var sendError by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // Initial load
    LaunchedEffect(userId) {
        if (userId.isNullOrBlank()) { loading = false; return@LaunchedEffect }
        loading = true
        val result = api.fetchActiveTicket(userId, accessToken)
        if (result.isSuccess) {
            val t = result.getOrNull()
            ticket = t
            if (t != null) {
                messages = api.fetchTicketMessages(t.id, accessToken).getOrNull() ?: emptyList()
            }
        }
        loading = false
    }

    // Poll for new messages every 3 s
    LaunchedEffect(ticket?.id) {
        val t = ticket ?: return@LaunchedEffect
        while (true) {
            delay(3_000)
            api.fetchTicketMessages(t.id, accessToken).getOrNull()?.let { messages = it }
        }
    }

    // Auto-scroll to newest message
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    val onSend: () -> Unit = {
        val text = draft.trim()
        if (text.isNotEmpty() && !sending && !userId.isNullOrBlank()) {
            sending = true
            sendError = null
            scope.launch {
                if (ticket == null) {
                    val res = api.createTicketWithMessage(userId, text, senderName, accessToken)
                    if (res.isSuccess) {
                        ticket = res.getOrNull()
                        draft = ""
                        ticket?.id?.let { id ->
                            messages = api.fetchTicketMessages(id, accessToken).getOrNull() ?: emptyList()
                        }
                    } else {
                        sendError = "Could not start conversation. Try again."
                    }
                } else {
                    val res = api.sendSupportMessage(ticket!!.id, userId, text, senderName, accessToken)
                    if (res.isSuccess) {
                        draft = ""
                        messages = api.fetchTicketMessages(ticket!!.id, accessToken).getOrNull() ?: emptyList()
                    } else {
                        sendError = "Failed to send. Try again."
                    }
                }
                sending = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .imePadding()
    ) {
        // Header bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Coral)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onBack),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(Modifier.width(10.dp))
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.22f)),
                contentAlignment = Alignment.Center
            ) {
                Text("S", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
            Spacer(Modifier.width(10.dp))
            Column {
                Text("Support Team", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Text(
                    text = ticket?.let { "Ticket ${it.status.replaceFirstChar(Char::uppercaseChar)}" }
                        ?: "Usually responds within minutes",
                    color = Color.White.copy(alpha = 0.82f),
                    fontSize = 12.sp
                )
            }
        }

        when {
            loading -> Box(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator(color = Coral) }

            userId.isNullOrBlank() -> Box(
                modifier = Modifier.weight(1f).padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF4F4F4)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF9E9E9E), modifier = Modifier.size(28.dp))
                    }
                    Text("Sign in to chat with support", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    Text("Your conversations are private and tied to your account.", color = Color(0xFF9E9E9E), fontSize = 13.sp)
                }
            }

            else -> LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (messages.isEmpty()) {
                    item {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F7F7)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(Coral),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("S", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    }
                                    Column {
                                        Text("Support Team", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                        Text("Usually responds within minutes", color = Color(0xFF9E9E9E), fontSize = 12.sp)
                                    }
                                }
                                Text("Hi $senderName! 👋 How can I help you today?", fontSize = 14.sp)
                                Text("You can ask about:", color = Color(0xFF777777), fontSize = 13.sp)
                                listOf(
                                    "Bookings & reservations",
                                    "Payments & refunds",
                                    "Account issues",
                                    "Tours & accommodations"
                                ).forEach {
                                    Text("• $it", color = Color(0xFF777777), fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
                items(messages) { msg ->
                    SupportChatBubble(msg = msg, isCustomer = msg.senderType == "customer")
                }
            }
        }

        // Error banner
        sendError?.let { err ->
            Text(
                text = err,
                color = Color.White,
                fontSize = 13.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFE53935))
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            )
        }

        // Input bar
        if (!userId.isNullOrBlank()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    placeholder = { Text("Type a message...", color = Color(0xFF9E9E9E), fontSize = 14.sp) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    maxLines = 5,
                )
                val canSend = draft.isNotBlank() && !sending
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(if (canSend) Coral else Color(0xFFDDDDDD))
                        .clickable(enabled = canSend, onClick = onSend),
                    contentAlignment = Alignment.Center
                ) {
                    if (sending) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(22.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Send",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SupportChatBubble(msg: SupportChatMessage, isCustomer: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isCustomer) Arrangement.End else Arrangement.Start
    ) {
        if (!isCustomer) {
            Box(
                modifier = Modifier
                    .size(30.dp)
                    .clip(CircleShape)
                    .background(Coral.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text("S", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Coral)
            }
            Spacer(Modifier.width(6.dp))
        }
        Column(
            horizontalAlignment = if (isCustomer) Alignment.End else Alignment.Start,
            modifier = Modifier.weight(1f, fill = false)
        ) {
            if (!isCustomer) {
                msg.senderName?.let {
                    Text(it, fontSize = 11.sp, color = Color(0xFF9E9E9E), modifier = Modifier.padding(start = 2.dp, bottom = 2.dp))
                }
            }
            Box(
                modifier = Modifier
                    .background(
                        color = if (isCustomer) Coral else Color(0xFFF0F0F0),
                        shape = RoundedCornerShape(
                            topStart = if (isCustomer) 18.dp else 4.dp,
                            topEnd = if (isCustomer) 4.dp else 18.dp,
                            bottomStart = 18.dp,
                            bottomEnd = 18.dp,
                        )
                    )
                    .padding(horizontal = 14.dp, vertical = 9.dp)
            ) {
                Text(
                    text = msg.message,
                    color = if (isCustomer) Color.White else Color.Black,
                    fontSize = 14.sp,
                )
            }
            Text(
                text = formatChatTime(msg.createdAt),
                fontSize = 10.sp,
                color = Color(0xFF9E9E9E),
                modifier = Modifier.padding(horizontal = 2.dp, top = 2.dp)
            )
        }
    }
}

private fun formatChatTime(iso: String): String = try {
    val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
    sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
    val date = sdf.parse(iso.take(19))
    java.text.SimpleDateFormat("HH:mm", Locale.getDefault()).format(date ?: return "")
} catch (_: Exception) { "" }

// ── Shared helpers ────────────────────────────────────────────────────────────

@Composable
private fun PickerHeader(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 20.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(22.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    }
    HorizontalDivider(color = Color(0xFFF0F0F0))
}

@Composable
private fun PickerRow(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 15.sp, fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal)
        if (isSelected) {
            Icon(Icons.Default.Check, contentDescription = null, tint = Coral, modifier = Modifier.size(20.dp))
        }
    }
    HorizontalDivider(color = Color(0xFFF2F2F2), thickness = 0.5.dp)
}
