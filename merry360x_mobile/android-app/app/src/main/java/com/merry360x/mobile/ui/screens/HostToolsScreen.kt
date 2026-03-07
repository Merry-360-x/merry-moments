package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral

@Composable
fun HostToolsScreen(
    properties: List<String>,
    bookingsCount: Int = 0,
    payoutsCount: Int = 0,
) {
    var selectedTab by remember { mutableStateOf(0) }

    val createModules = listOf(
        "Create Tour",
        "Create Tour Package",
        "Create Transport",
        "Create Car Rental",
        "Create Airport Transfer",
        "Create Story"
    )

    LazyColumn(
        modifier = Modifier.background(Color.White).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text("Host Studio", fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }

        item {
            TabRow(selectedTabIndex = selectedTab, containerColor = Color.White, contentColor = Coral) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Overview") })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Financial") })
                Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text("Create") })
            }
        }

        if (selectedTab == 0) {
            item { HostMetricRow("Listings", properties.size.toString()) }
            item { HostMetricRow("Bookings", bookingsCount.toString()) }

            items(properties) { title ->
                Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text(title, modifier = Modifier.fillMaxWidth().padding(12.dp))
                }
            }
        } else if (selectedTab == 1) {
            item { HostMetricRow("Financial Bookings", bookingsCount.toString()) }
            item { HostMetricRow("Payout Records", payoutsCount.toString()) }
            item { ModuleRow("Earnings Breakdown") }
            item { ModuleRow("Payout Requests") }
            item { ModuleRow("Payout History") }
        } else {
            items(createModules) { title ->
                ModuleRow(title)
            }
        }
    }
}

@Composable
private fun HostMetricRow(label: String, value: String) {
    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
        Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(label, color = Color.Gray)
            Text(value, modifier = Modifier.align(androidx.compose.ui.Alignment.CenterEnd), fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun ModuleRow(title: String) {
    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
        Text(title, modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp))
    }
}
