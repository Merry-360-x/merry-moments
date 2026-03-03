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
import com.merry360x.mobile.theme.Coral

private enum class TripTab(val title: String) {
    CART("Cart"),
    UPCOMING("Upcoming"),
    COMPLETED("Completed"),
    CANCELLED("Cancelled")
}

@Composable
fun TripCartScreen(
    cartCount: Int = 0,
    isLoading: Boolean = false
) {
    var selectedTab by remember { mutableStateOf(TripTab.CART) }
    
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
                else -> {
                    TripEmptyState(tab = selectedTab)
                }
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
