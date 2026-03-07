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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.data.BookingRecord
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral

private enum class TripTab(val title: String) {
    CART("Cart"),
    UPCOMING("Upcoming"),
    COMPLETED("Completed"),
    CANCELLED("Cancelled")
}

@Composable
fun TripCartScreen(
    bookings: List<BookingRecord> = emptyList(),
    isLoading: Boolean = false,
    errorMessage: String? = null,
) {
    var selectedTab by remember { mutableStateOf(TripTab.CART) }
    val filteredBookings = remember(selectedTab, bookings) {
        when (selectedTab) {
            TripTab.CART -> bookings.filter { it.status.equals("pending", true) }
            TripTab.UPCOMING -> bookings.filter {
                it.status.equals("confirmed", true) || it.status.equals("completed", true)
            }
            TripTab.COMPLETED -> bookings.filter { it.status.equals("completed", true) }
            TripTab.CANCELLED -> bookings.filter { it.status.equals("cancelled", true) }
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(horizontal = 20.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))
        
        // Tab Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            TripTab.entries.forEach { tab ->
                TripTabItem(
                    title = tab.title,
                    isSelected = selectedTab == tab,
                    onClick = { selectedTab = tab }
                )
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Content based on selected tab
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentAlignment = Alignment.Center
        ) {
            when {
                isLoading -> {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        CircularProgressIndicator(color = Coral)
                        Text(
                            text = "Loading trips...",
                            color = Color.Gray,
                            fontSize = 15.sp
                        )
                    }
                }
                errorMessage != null -> {
                    Text(text = errorMessage, color = Color.Red)
                }
                filteredBookings.isNotEmpty() -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredBookings) { booking ->
                            BookingTripRow(booking)
                        }
                    }
                }
                else -> {
                    TripEmptyState(tab = selectedTab)
                }
            }
        }
    }
}

@Composable
private fun BookingTripRow(booking: BookingRecord) {
    Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Booking ${booking.id.take(8)}", fontWeight = FontWeight.SemiBold)
            Text("Status: ${booking.status}", color = Color.Gray, fontSize = 13.sp)
            Row {
                Text("${booking.currency} ${String.format(\"%,.0f\", booking.totalPrice)}", fontWeight = FontWeight.Medium)
                Spacer(modifier = Modifier.weight(1f))
                Text(booking.paymentStatus, color = Color.Gray, fontSize = 12.sp)
            }
        }
    }
}
@Composable
private fun TripTabItem(
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier.clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = title,
            fontSize = 15.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (isSelected) Coral else Color.Gray
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Box(
            modifier = Modifier
                .height(2.dp)
                .fillMaxWidth()
                .background(if (isSelected) Coral else Color.Transparent)
        )
    }
}

@Composable
private fun TripEmptyState(tab: TripTab) {
    val (title, subtitle) = when (tab) {
        TripTab.CART -> "Your cart is empty" to "Add stays, tours, or transport to see them here"
        TripTab.UPCOMING -> "No upcoming trips" to "When you book a trip, it will appear here"
        TripTab.COMPLETED -> "No completed trips" to "Your past trips will appear here"
        TripTab.CANCELLED -> "No cancelled trips" to "Cancelled bookings will appear here"
    }
    
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.Black
        )
        Text(
            text = subtitle,
            fontSize = 14.sp,
            color = Color.Gray
        )
    }
}
