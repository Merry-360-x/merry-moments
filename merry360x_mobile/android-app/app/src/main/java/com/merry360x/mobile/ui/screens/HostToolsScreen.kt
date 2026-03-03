package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.merry360x.mobile.theme.CardGray

@Composable
fun HostToolsScreen(properties: List<String>) {
    LazyColumn(
        modifier = Modifier.background(Color.White).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item { Text("Host Tools", fontWeight = FontWeight.Bold) }
        items(properties) { title ->
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                Text(title, modifier = Modifier.fillMaxWidth().padding(12.dp))
            }
        }
    }
}
