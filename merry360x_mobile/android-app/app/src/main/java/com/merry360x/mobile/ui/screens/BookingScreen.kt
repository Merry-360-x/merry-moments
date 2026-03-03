package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import com.merry360x.mobile.viewmodel.BookingUiState

@Composable
fun BookingScreen(
    uiState: BookingUiState,
    selectedListingTitle: String?,
    onSubmit: () -> Unit,
) {
    Column(
        modifier = Modifier
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Confirm your trip", fontWeight = FontWeight.Bold)
        Text("Selected: ${selectedListingTitle ?: "No listing selected yet"}", color = Color.Gray)

        SectionCard("Dates") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                InputCard("Check in", "12 Mar")
                InputCard("Check out", "14 Mar")
            }
        }

        SectionCard("Guests") {
            InputCard("Adults", "2")
        }

        SectionCard("Price details") {
            PriceLine("RWF 95,000 × 2 nights", "RWF 190,000")
            PriceLine("Service fee", "RWF 9,500")
            Divider(modifier = Modifier.padding(vertical = 6.dp))
            PriceLine("Total", "RWF 199,500", true)
        }

        Button(
            onClick = onSubmit,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(999.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Coral)
        ) {
            Text(
                if (uiState.submitting) "Submitting..." else "Continue to payment",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(vertical = 4.dp)
            )
        }

        uiState.statusMessage?.let {
            Text(it, color = Color.Gray)
        }

        Text("You won’t be charged yet.", color = Color.Gray)
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            content()
        }
    }
}

@Composable
private fun InputCard(label: String, value: String) {
    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(label, color = Color.Gray)
            Text(value, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun PriceLine(left: String, right: String, bold: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(left, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal)
        Spacer(modifier = Modifier.weight(1f))
        Text(right, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal)
    }
}
