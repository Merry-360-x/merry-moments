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
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.formatDisplayMoney
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccommodationsBrowseScreen(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onBack: () -> Unit,
    onSelectListing: (Listing) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var listings by remember { mutableStateOf<List<Listing>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf<String?>(null) }
    var monthlyOnly by remember { mutableStateOf(false) }
    var showFilter by remember { mutableStateOf(false) }
    var priceRange by remember { mutableStateOf(0f..500000f) }
    var offset by remember { mutableStateOf(0) }

    val propertyTypes = listOf("Hotel", "Motel", "Resort", "Lodge", "Villa", "Apartment", "Hostel", "Guest House", "B&B", "Chalet")

    fun reload(resetOffset: Boolean = true) {
        scope.launch {
            if (resetOffset) offset = 0
            loading = true
            listings = api.fetchAccommodations(
                search = search.takeIf { it.isNotBlank() },
                propertyType = selectedType,
                minPrice = priceRange.start.toDouble().takeIf { it > 0 },
                maxPrice = priceRange.endInclusive.toDouble().takeIf { it < 500000 },
                monthlyOnly = monthlyOnly.takeIf { it },
                offset = offset
            )
            loading = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    if (showFilter) {
        ModalBottomSheet(
            onDismissRequest = { showFilter = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Filters", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text("Price range", fontWeight = FontWeight.Medium)
                RangeSlider(
                    value = priceRange,
                    onValueChange = { priceRange = it },
                    valueRange = 0f..500000f,
                    colors = SliderDefaults.colors(thumbColor = Coral, activeTrackColor = Coral)
                )
                Text("${String.format("%,.0f", priceRange.start)} - ${String.format("%,.0f", priceRange.endInclusive)}", fontSize = 13.sp, color = Color.Gray)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Monthly stays only", modifier = Modifier.weight(1f))
                    Switch(
                        checked = monthlyOnly,
                        onCheckedChange = { monthlyOnly = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Coral, checkedTrackColor = Coral.copy(alpha = 0.3f))
                    )
                }
                Text("Apply", fontWeight = FontWeight.Bold, color = Coral, modifier = Modifier
                    .clickable { showFilter = false; reload() }
                    .padding(vertical = 8.dp))
                Spacer(Modifier.height(24.dp))
            }
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
                Text("Accommodations", fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text("Filters", color = Coral, fontWeight = FontWeight.Medium, modifier = Modifier.clickable { showFilter = true })
            }
        }

        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search accommodations...", color = Color(0xFF9E9E9E)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
        }

        item {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                propertyTypes.forEach { type ->
                    FilterChip(
                        selected = selectedType == type,
                        onClick = {
                            selectedType = if (selectedType == type) null else type
                            reload()
                        },
                        label = { Text(type, fontSize = 12.sp) },
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
                Text("${listings.size} results", fontSize = 13.sp, color = Color.Gray)
                Text("Search", fontSize = 13.sp, color = Coral, fontWeight = FontWeight.Medium, modifier = Modifier.clickable { reload() })
            }
        }

        if (loading) {
            item { CircularProgressIndicator(color = Coral, modifier = Modifier.padding(24.dp)) }
        } else if (listings.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text("No accommodations found.", modifier = Modifier.padding(16.dp), color = Color.Gray)
                }
            }
        } else {
            items(listings, key = { it.id }) { listing ->
                AccommodationCard(
                    listing = listing,
                    api = api,
                    userId = userId,
                    accessToken = accessToken,
                    selectedCurrency = selectedCurrency,
                    usdRates = usdRates,
                    onClick = { onSelectListing(listing) }
                )
            }
        }

        if (!loading && listings.size >= 20) {
            item {
                Text(
                    "Load more",
                    color = Coral,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .clickable { offset += 20; reload(resetOffset = false) }
                        .padding(vertical = 12.dp)
                        .fillMaxWidth()
                )
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun AccommodationCard(
    listing: Listing,
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onClick: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var isFav by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardGray),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column {
            val imageUrl = listing.mainImage ?: listing.images?.firstOrNull()
            imageUrl?.let { url ->
                AsyncImage(
                    model = url,
                    contentDescription = listing.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)),
                    contentScale = ContentScale.Crop
                )
            }
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(listing.title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    if (userId != null) {
                        IconButton(onClick = {
                            scope.launch {
                                if (isFav) api.removeFromWishlist(userId, listing.id, accessToken)
                                else api.addToWishlist(userId, listing.id, accessToken)
                                isFav = !isFav
                            }
                        }, modifier = Modifier.size(32.dp)) {
                            Icon(
                                if (isFav) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                contentDescription = "Favorite",
                                tint = if (isFav) Coral else Color.Gray
                            )
                        }
                    }
                }
                Text(listing.location, color = Color.Gray, fontSize = 13.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    listing.rating?.let { r ->
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(14.dp))
                        Text(String.format("%.1f", r), fontSize = 12.sp)
                        Spacer(Modifier.width(8.dp))
                    }
                    if (listing.monthlyOnlyListing == true) {
                        Text("Monthly", fontSize = 12.sp, color = Coral, fontWeight = FontWeight.Medium)
                    }
                }
                val amount = if (listing.monthlyOnlyListing == true) listing.pricePerMonth ?: listing.pricePerNight else listing.pricePerNight
                val suffix = if (listing.monthlyOnlyListing == true) "/month" else "/night"
                Text("${formatDisplayMoney(amount, listing.currency, selectedCurrency, usdRates)}$suffix", fontWeight = FontWeight.Bold)
            }
        }
    }
}
