package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MerryAIScreen(
    onSendMessage: (String) -> Unit = {}
) {
    var inputText by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // AI Icon
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Coral.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Text("✨", fontSize = 16.sp)
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Merry AI",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Travel assistant for stays, tours and transport",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }
            
            IconButton(onClick = { /* Reset conversation */ }) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Reset",
                    tint = Color.Gray
                )
            }
        }
        
        // Scrollable content
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
        ) {
            // Suggestion chips
            Text(
                text = "Try asking:",
                fontSize = 13.sp,
                color = Color.Gray,
                fontWeight = FontWeight.Medium
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SuggestionChip("Cheapest stay in Kigali")
                SuggestionChip("Cheapest villa in Rwanda")
                SuggestionChip("Cheapest transport from Kigali Airport")
                SuggestionChip("Cheapest 2-day tour package")
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // AI Welcome Message
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardGray),
                modifier = Modifier.fillMaxWidth(0.85f)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "👋 Hi! I'm Merry AI, your personal travel assistant.",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium
                    )
                    
                    Text(
                        text = "I can help you:",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        BulletPoint("Find stays, tours & transport")
                        BulletPoint("Plan your itinerary")
                        BulletPoint("Compare prices")
                    }
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    Text(
                        text = "What would you like to explore?",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
        }
        
        // Input field
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = { inputText = it },
                placeholder = {
                    Text(
                        "Ask about places, tours, packages...",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(24.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Color.LightGray,
                    focusedBorderColor = Coral
                ),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(if (inputText.isNotEmpty()) Coral else Color.LightGray)
                    .clickable(enabled = inputText.isNotEmpty()) {
                        onSendMessage(inputText)
                        inputText = ""
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Send",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun SuggestionChip(text: String) {
    Box(
        modifier = Modifier
            .border(1.dp, Color.LightGray, RoundedCornerShape(8.dp))
            .clickable { /* Handle suggestion tap */ }
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text = text,
            fontSize = 13.sp,
            color = Color.DarkGray
        )
    }
}

@Composable
private fun BulletPoint(text: String) {
    Row {
        Text("• ", fontSize = 14.sp)
        Text(text, fontSize = 14.sp)
    }
}
