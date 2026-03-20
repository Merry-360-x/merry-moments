package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.TourItem
import com.merry360x.mobile.data.formatDisplayMoney
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.launch

@Composable
fun ToursBrowseScreen(
    api: SupabaseApi,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var tours by remember { mutableStateOf<List<TourItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var selectedDuration by remember { mutableStateOf<String?>(null) }

    val categories = listOf("Nature", "Adventure", "Cultural", "Wildlife", "Historical")
    val durations = listOf("Half Day", "Full Day", "Multi-Day")

    fun reload() {
        scope.launch {
            loading = true
            tours = api.fetchToursFiltered(
                search = search.takeIf { it.isNotBlank() },
                category = selectedCategory,
                duration = selectedDuration
            )
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
                Text("Tours & Experiences", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
        }

        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search tours...", color = Color(0xFF9E9E9E)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
        }

        item {
            Text("Category", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.Gray)
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                categories.forEach { cat ->
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = {
                            selectedCategory = if (selectedCategory == cat) null else cat
                            reload()
                        },
                        label = { Text(cat) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Coral, selectedLabelColor = Color.White)
                    )
                }
            }
        }

        item {
            Text("Duration", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.Gray)
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                durations.forEach { dur ->
                    FilterChip(
                        selected = selectedDuration == dur,
                        onClick = {
                            selectedDuration = if (selectedDuration == dur) null else dur
                            reload()
                        },
                        label = { Text(dur) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Coral, selectedLabelColor = Color.White)
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("${tours.size} tours found", fontSize = 13.sp, color = Color.Gray)
                Text("Search", fontSize = 13.sp, color = Coral, fontWeight = FontWeight.Medium, modifier = Modifier.clickable { reload() })
            }
        }

        if (loading) {
            item { CircularProgressIndicator(color = Coral, modifier = Modifier.padding(24.dp)) }
        } else if (tours.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text("No tours found. Try adjusting your filters.", modifier = Modifier.padding(16.dp), color = Color.Gray)
                }
            }
        } else {
            items(tours, key = { it.id }) { tour ->
                TourCard(tour = tour, selectedCurrency = selectedCurrency, usdRates = usdRates)
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun TourCard(tour: TourItem, selectedCurrency: String, usdRates: Map<String, Double>) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardGray),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            tour.mainImage?.let { url ->
                AsyncImage(
                    model = url,
                    contentDescription = tour.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)),
                    contentScale = ContentScale.Crop
                )
            }
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(tour.title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Text(tour.location, color = Color.Gray, fontSize = 13.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    tour.category?.let {
                        Text(it, fontSize = 12.sp, color = Coral, fontWeight = FontWeight.Medium)
                        Spacer(Modifier.width(12.dp))
                    }
                    tour.duration?.let {
                        Text(it, fontSize = 12.sp, color = Color.Gray)
                        Spacer(Modifier.width(12.dp))
                    }
                    tour.rating?.let { r ->
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(14.dp))
                        Text(String.format("%.1f", r), fontSize = 12.sp)
                    }
                }
                Text(formatDisplayMoney(tour.price, tour.currency, selectedCurrency, usdRates), fontWeight = FontWeight.Bold)
            }
        }
    }
}
