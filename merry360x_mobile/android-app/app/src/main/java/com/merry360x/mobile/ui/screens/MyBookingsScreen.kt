package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.merry360x.mobile.data.DetailedBooking
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.formatDisplayMoney
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.launch

@Composable
fun MyBookingsScreen(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var bookings by remember { mutableStateOf<List<DetailedBooking>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var tabIndex by remember { mutableIntStateOf(0) }
    var actionMessage by remember { mutableStateOf<String?>(null) }

    val tabs = listOf("All", "Upcoming", "Completed", "Cancelled")

    fun reload() {
        if (userId.isNullOrBlank()) { loading = false; return }
        scope.launch {
            loading = true
            bookings = api.fetchUserBookingsDetailed(userId, accessToken)
            loading = false
        }
    }

    LaunchedEffect(userId) { reload() }

    val filtered = bookings.filter { b ->
        when (tabIndex) {
            1 -> b.status == "confirmed" || b.status == "pending"
            2 -> b.status == "completed"
            3 -> b.status == "cancelled"
            else -> true
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Text("My Bookings", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
        }

        item {
            TabRow(selectedTabIndex = tabIndex, containerColor = Color.Transparent, contentColor = Coral) {
                tabs.forEachIndexed { i, title ->
                    Tab(selected = tabIndex == i, onClick = { tabIndex = i }) {
                        Text(title, modifier = Modifier.padding(vertical = 12.dp), fontSize = 13.sp)
                    }
                }
            }
        }

        actionMessage?.let { msg ->
            item {
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Text(msg, modifier = Modifier.padding(12.dp), color = Color(0xFF2E7D32), fontWeight = FontWeight.Medium)
                }
            }
        }

        if (loading) {
            item { CircularProgressIndicator(color = Coral, modifier = Modifier.padding(24.dp)) }
        } else if (filtered.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text("No bookings found.", modifier = Modifier.padding(16.dp), color = Color.Gray)
                }
            }
        } else {
            items(filtered, key = { it.id }) { booking ->
                BookingCard(
                    booking = booking,
                    api = api,
                    userId = userId,
                    accessToken = accessToken,
                    selectedCurrency = selectedCurrency,
                    usdRates = usdRates,
                    onAction = { msg -> actionMessage = msg; reload() }
                )
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun BookingCard(
    booking: DetailedBooking,
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onAction: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var showReview by remember { mutableStateOf(false) }
    var showDateChange by remember { mutableStateOf(false) }
    var showRefund by remember { mutableStateOf(false) }
    var actionLoading by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardGray),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            booking.propertyImage?.let { url ->
                AsyncImage(
                    model = url,
                    contentDescription = booking.propertyTitle,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(140.dp)
                        .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)),
                    contentScale = ContentScale.Crop
                )
            }
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(booking.propertyTitle ?: "Property", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    StatusBadge(booking.status)
                }
                booking.propertyLocation?.let { Text(it, color = Color.Gray, fontSize = 13.sp) }
                Text("${booking.checkIn} → ${booking.checkOut}", fontSize = 13.sp)
                Text(formatDisplayMoney(booking.totalPrice, booking.currency, selectedCurrency, usdRates), fontWeight = FontWeight.Bold)
                Text("Payment: ${booking.paymentStatus}", fontSize = 12.sp, color = Color.Gray)
                booking.cancellationPolicy?.let { Text("Policy: $it", fontSize = 12.sp, color = Color.Gray) }

                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                if (actionLoading) {
                    CircularProgressIndicator(color = Coral, modifier = Modifier.size(20.dp))
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (booking.status != "cancelled" && booking.status != "completed") {
                            Text("Cancel", color = Color(0xFFC62828), fontWeight = FontWeight.Medium, fontSize = 13.sp, modifier = Modifier.clickable {
                                scope.launch {
                                    actionLoading = true
                                    api.cancelBooking(booking.id, accessToken)
                                    actionLoading = false
                                    onAction("Booking cancelled")
                                }
                            })
                            Text("Change Dates", color = Coral, fontWeight = FontWeight.Medium, fontSize = 13.sp, modifier = Modifier.clickable { showDateChange = true })
                        }
                        if (booking.status == "completed") {
                            Text("Review", color = Coral, fontWeight = FontWeight.Medium, fontSize = 13.sp, modifier = Modifier.clickable { showReview = true })
                            Text("Refund", color = Color(0xFF1565C0), fontWeight = FontWeight.Medium, fontSize = 13.sp, modifier = Modifier.clickable { showRefund = true })
                        }
                    }
                }
            }
        }
    }

    if (showReview) {
        ReviewDialog(
            onDismiss = { showReview = false },
            onSubmit = { rating, comment ->
                scope.launch {
                    api.submitGuestReview(
                        bookingId = booking.id,
                        propertyId = booking.propertyId,
                        userId = userId ?: "",
                        rating = rating,
                        comment = comment,
                        serviceRating = null,
                        accessToken = accessToken
                    )
                    showReview = false
                    onAction("Review submitted!")
                }
            }
        )
    }

    if (showDateChange) {
        DateChangeDialog(
            onDismiss = { showDateChange = false },
            onSubmit = { newIn, newOut, reason ->
                scope.launch {
                    api.requestDateChange(booking.id, newIn, newOut, reason, accessToken)
                    showDateChange = false
                    onAction("Date change requested")
                }
            }
        )
    }

    if (showRefund) {
        RefundDialog(
            onDismiss = { showRefund = false },
            onSubmit = { reason ->
                scope.launch {
                    api.requestRefund(booking.id, reason, accessToken)
                    showRefund = false
                    onAction("Refund requested")
                }
            }
        )
    }
}

@Composable
private fun StatusBadge(status: String) {
    val (bg, fg) = when (status) {
        "confirmed" -> Color(0xFFE8F5E9) to Color(0xFF2E7D32)
        "completed" -> Color(0xFFE3F2FD) to Color(0xFF1565C0)
        "cancelled" -> Color(0xFFFFEBEE) to Color(0xFFC62828)
        else -> Color(0xFFFFF3E0) to Color(0xFFE65100)
    }
    Text(
        status.replaceFirstChar { it.uppercase() },
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = fg,
        modifier = Modifier
            .background(bg, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 2.dp)
    )
}

@Composable
private fun ReviewDialog(onDismiss: () -> Unit, onSubmit: (Int, String) -> Unit) {
    var rating by remember { mutableIntStateOf(5) }
    var comment by remember { mutableStateOf("") }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Leave a Review") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Rating", fontWeight = FontWeight.Medium)
                Row {
                    (1..5).forEach { star ->
                        IconButton(onClick = { rating = star }, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = if (star <= rating) Color(0xFFFFC107) else Color.LightGray)
                        }
                    }
                }
                OutlinedTextField(
                    value = comment,
                    onValueChange = { comment = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Comment") },
                    minLines = 3
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSubmit(rating, comment) }, colors = ButtonDefaults.buttonColors(containerColor = Coral)) {
                Text("Submit")
            }
        },
        dismissButton = {
            Text("Cancel", modifier = Modifier.clickable { onDismiss() }.padding(8.dp))
        }
    )
}

@Composable
private fun DateChangeDialog(onDismiss: () -> Unit, onSubmit: (String, String, String) -> Unit) {
    var newCheckIn by remember { mutableStateOf("") }
    var newCheckOut by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Request Date Change") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = newCheckIn, onValueChange = { newCheckIn = it }, label = { Text("New check-in (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = newCheckOut, onValueChange = { newCheckOut = it }, label = { Text("New check-out (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = reason, onValueChange = { reason = it }, label = { Text("Reason") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
            }
        },
        confirmButton = {
            Button(
                onClick = { if (newCheckIn.isNotBlank() && newCheckOut.isNotBlank()) onSubmit(newCheckIn, newCheckOut, reason) },
                colors = ButtonDefaults.buttonColors(containerColor = Coral)
            ) { Text("Submit") }
        },
        dismissButton = {
            Text("Cancel", modifier = Modifier.clickable { onDismiss() }.padding(8.dp))
        }
    )
}

@Composable
private fun RefundDialog(onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
    var reason by remember { mutableStateOf("") }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Request Refund") },
        text = {
            OutlinedTextField(value = reason, onValueChange = { reason = it }, label = { Text("Reason for refund") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
        },
        confirmButton = {
            Button(
                onClick = { if (reason.isNotBlank()) onSubmit(reason) },
                colors = ButtonDefaults.buttonColors(containerColor = Coral)
            ) { Text("Submit") }
        },
        dismissButton = {
            Text("Cancel", modifier = Modifier.clickable { onDismiss() }.padding(8.dp))
        }
    )
}
