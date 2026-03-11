package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import com.merry360x.mobile.viewmodel.AuthUiState

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
        Text("<- Back", color = Color.Gray, modifier = Modifier.clickable { onBack() })
        Text("Auth Callback", fontSize = 22.sp, fontWeight = FontWeight.Bold)

        Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                when {
                    uiState.loading -> {
                        CircularProgressIndicator(color = Coral)
                        Text("Completing sign-in securely...", color = Color.DarkGray)
                    }
                    uiState.authenticated -> {
                        Text("Sign-in completed", fontWeight = FontWeight.SemiBold)
                        Text("You are now authenticated in the native app.", color = Color.DarkGray)
                    }
                    uiState.error != null -> {
                        Text("Callback failed", fontWeight = FontWeight.SemiBold)
                        Text(uiState.error, color = Color(0xFFC62828))
                    }
                    else -> {
                        Text("Waiting for callback processing...", color = Color.DarkGray)
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
                color = Color.Gray,
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
            Text(subtitle, color = Color.Gray)
        }

        if (filtered.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text(
                        "No listings found. Try a different search.",
                        modifier = Modifier.padding(12.dp),
                        color = Color.Gray
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
                        Text(listing.location, color = Color.Gray, fontSize = 13.sp)
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
        Text("<- Back", color = Color.Gray, modifier = Modifier.clickable { onBack() })
        Text("Forgot Password", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Enter your email to continue password recovery.", color = Color.Gray)

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
        Text("<- Back", color = Color.Gray, modifier = Modifier.clickable { onBack() })
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
fun CompleteProfileScreen(onBack: () -> Unit) {
    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("<- Back", color = Color.Gray, modifier = Modifier.clickable { onBack() })
        Text("Complete Profile", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Add your core account details for a complete booking profile.", color = Color.Gray)

        OutlinedTextField(
            value = fullName,
            onValueChange = { fullName = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Full name") },
            singleLine = true
        )

        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Phone number") },
            singleLine = true
        )

        Button(
            onClick = onBack,
            enabled = fullName.isNotBlank() && phone.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = Coral),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Save profile", color = Color.White)
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
            Text("<- Back", color = Color.Gray, modifier = Modifier.clickable { onBack() })
        }
        item {
            Text("Safety Guidelines", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        items(points) { point ->
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                Text(point, modifier = Modifier.padding(12.dp), color = Color.DarkGray)
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
                        Text(name, fontSize = 12.sp, color = Color.Gray)
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
                        Text(description, fontSize = 12.sp, color = Color.Gray)
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
                        Text(items[i].description, fontSize = 12.sp, color = Color.Gray)
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
