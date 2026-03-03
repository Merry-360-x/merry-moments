package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral

@Composable
fun ProfileScreen(
    userId: String,
    wishlist: List<String>,
    paymentMessage: String?,
    onInitPayment: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.background(Color.White).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                Column(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Profile", fontWeight = FontWeight.Bold)
                    Text("User ID: $userId", color = Color.Gray)
                }
            }
        }

        item {
            Button(
                onClick = onInitPayment,
                colors = ButtonDefaults.buttonColors(containerColor = Coral),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(999.dp)
            ) {
                Text("Initialize Flutterwave Payment", color = Color.White)
            }
        }

        paymentMessage?.let {
            item { Text(it, color = Color.Gray) }
        }

        item { Text("Wishlist", fontWeight = FontWeight.Bold) }
        items(wishlist) { item ->
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                Text(item, modifier = Modifier.fillMaxWidth().padding(12.dp))
            }
        }
    }
}
