package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.formatDisplayMoney
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.launch

@Composable
fun FavoritesScreen(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onBack: () -> Unit,
    onSelectListing: (Listing) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var favorites by remember { mutableStateOf<List<Listing>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    fun reload() {
        if (userId.isNullOrBlank()) { loading = false; return }
        scope.launch {
            loading = true
            favorites = api.fetchFavoriteListings(userId, accessToken)
            loading = false
        }
    }

    LaunchedEffect(userId) { reload() }

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
                Text("Favorites", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
        }

        if (loading) {
            item { CircularProgressIndicator(color = Coral, modifier = Modifier.padding(24.dp)) }
        } else if (favorites.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("No favorites yet", fontWeight = FontWeight.SemiBold)
                        Text("Start exploring and save your favorite places!", color = Color.Gray, fontSize = 13.sp)
                    }
                }
            }
        } else {
            items(favorites, key = { it.id }) { listing ->
                FavoriteCard(
                    listing = listing,
                    selectedCurrency = selectedCurrency,
                    usdRates = usdRates,
                    onRemove = {
                        scope.launch {
                            if (userId != null) {
                                api.removeFromWishlist(userId, listing.id, accessToken)
                                reload()
                            }
                        }
                    },
                    onClick = { onSelectListing(listing) }
                )
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun FavoriteCard(
    listing: Listing,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onRemove: () -> Unit,
    onClick: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardGray),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            val imageUrl = listing.mainImage ?: listing.images?.firstOrNull()
            imageUrl?.let { url ->
                AsyncImage(
                    model = url,
                    contentDescription = listing.title,
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(10.dp)),
                    contentScale = ContentScale.Crop
                )
                Spacer(Modifier.width(12.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(listing.title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(listing.location, color = Color.Gray, fontSize = 13.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    listing.rating?.let { r ->
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(14.dp))
                        Text(String.format("%.1f", r), fontSize = 12.sp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text("${formatDisplayMoney(listing.pricePerNight, listing.currency, selectedCurrency, usdRates)}/night", fontWeight = FontWeight.Medium, fontSize = 13.sp)
                }
            }
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Delete, contentDescription = "Remove", tint = Color.Gray)
            }
        }
    }
}
