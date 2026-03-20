package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
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
import com.merry360x.mobile.data.AirportRoute
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.TransportItem
import com.merry360x.mobile.data.formatDisplayMoney
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.launch

@Composable
fun TransportBrowseScreen(
    api: SupabaseApi,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var vehicles by remember { mutableStateOf<List<TransportItem>>(emptyList()) }
    var airportRoutes by remember { mutableStateOf<List<AirportRoute>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }
    var tabIndex by remember { mutableIntStateOf(0) }

    val tabs = listOf("All Vehicles", "Airport Transfer", "Car Rental", "Intercity")

    fun reload() {
        scope.launch {
            loading = true
            val serviceType = when (tabIndex) {
                1 -> "airport_transfer"
                2 -> "car_rental"
                3 -> "intercity"
                else -> null
            }
            vehicles = api.fetchTransportVehicles(
                serviceType = serviceType,
                search = search.takeIf { it.isNotBlank() }
            )
            if (tabIndex == 1) {
                airportRoutes = api.fetchAirportTransferRoutes()
            } else {
                airportRoutes = emptyList()
            }
            loading = false
        }
    }

    LaunchedEffect(Unit) { reload() }

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
                Text("Transport", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
        }

        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search vehicles...", color = Color(0xFF9E9E9E)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
        }

        item {
            TabRow(selectedTabIndex = tabIndex, containerColor = Color.Transparent, contentColor = Coral) {
                tabs.forEachIndexed { i, title ->
                    Tab(selected = tabIndex == i, onClick = { tabIndex = i; reload() }) {
                        Text(title, modifier = Modifier.padding(vertical = 12.dp), fontSize = 13.sp)
                    }
                }
            }
        }

        if (loading) {
            item { CircularProgressIndicator(color = Coral, modifier = Modifier.padding(24.dp)) }
        } else {
            if (airportRoutes.isNotEmpty()) {
                item { Text("Airport Transfer Routes", fontWeight = FontWeight.SemiBold, fontSize = 16.sp) }
                items(airportRoutes, key = { it.id }) { route ->
                    AirportRouteCard(route = route, selectedCurrency = selectedCurrency, usdRates = usdRates)
                }
            }
            if (vehicles.isEmpty() && airportRoutes.isEmpty()) {
                item {
                    Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                        Text("No vehicles found.", modifier = Modifier.padding(16.dp), color = Color.Gray)
                    }
                }
            }
            items(vehicles, key = { it.id }) { vehicle ->
                TransportVehicleCard(item = vehicle, selectedCurrency = selectedCurrency, usdRates = usdRates)
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun TransportVehicleCard(item: TransportItem, selectedCurrency: String, usdRates: Map<String, Double>) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardGray),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            item.mainImage?.let { url ->
                AsyncImage(
                    model = url,
                    contentDescription = item.vehicleName,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)),
                    contentScale = ContentScale.Crop
                )
            }
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(item.vehicleName, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    if (item.isVerified) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "Verified", tint = Color(0xFF43A047), modifier = Modifier.size(18.dp))
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item.brand?.let { Text(it, fontSize = 12.sp, color = Color.Gray) }
                    item.model?.let { Text(it, fontSize = 12.sp, color = Color.Gray) }
                    item.year?.let { Text(it.toString(), fontSize = 12.sp, color = Color.Gray) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("${item.seats} seats", fontSize = 12.sp, color = Color.Gray)
                    item.transmission?.let { Text(it, fontSize = 12.sp, color = Color.Gray) }
                    item.fuelType?.let { Text(it, fontSize = 12.sp, color = Color.Gray) }
                }
                Text("${formatDisplayMoney(item.pricePerDay, item.currency, selectedCurrency, usdRates)}/day", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun AirportRouteCard(route: AirportRoute, selectedCurrency: String, usdRates: Map<String, Double>) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("${route.from} → ${route.to}", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(formatDisplayMoney(route.price, route.currency, selectedCurrency, usdRates), fontWeight = FontWeight.Bold, color = Coral)
                if (route.durationMinutes > 0) {
                    Text("~${route.durationMinutes} min", fontSize = 13.sp, color = Color.Gray)
                }
                route.vehicleType?.let { Text(it, fontSize = 13.sp, color = Color.Gray) }
            }
        }
    }
}
