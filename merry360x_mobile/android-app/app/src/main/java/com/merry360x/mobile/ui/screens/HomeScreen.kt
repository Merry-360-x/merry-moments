package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.theme.Coral
import com.merry360x.mobile.viewmodel.CitySection
import com.merry360x.mobile.viewmodel.HomeUiState

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onRefresh: () -> Unit,
    onSelectListing: (String, String) -> Unit,
) {
    var showSearchSheet by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        onRefresh()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Search Bar (Airbnb style)
            SearchBarComponent(onClick = { showSearchSheet = true })
            
            // Loading indicator
            if (uiState.loading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Coral)
                }
            }
            
            // Error message
            uiState.error?.let {
                Text(it, color = Color.Red, fontSize = 12.sp)
            }

            uiState.citySections.forEach { section ->
                CitySectionComponent(
                    section = section,
                    onSelectListing = onSelectListing
                )
            }

            if (uiState.citySections.isEmpty() && !uiState.loading && uiState.listings.isNotEmpty()) {
                FeaturedSection(
                    listings = uiState.listings,
                    onSelectListing = onSelectListing
                )
            }

            CategorySection(
                title = "Tour Packages",
                listings = uiState.events,
                emptyText = "No tour packages available yet",
                onSelectListing = onSelectListing
            )

            CategorySection(
                title = "Tours",
                listings = uiState.tours,
                emptyText = "No tours available yet",
                onSelectListing = onSelectListing
            )

            CategorySection(
                title = "Transport",
                listings = uiState.cars,
                emptyText = "No transport available yet",
                onSelectListing = onSelectListing
            )
            
            Spacer(modifier = Modifier.height(80.dp))
        }
        
        // Search Sheet Overlay
        SearchSheet(
            isVisible = showSearchSheet,
            onDismiss = { showSearchSheet = false },
            onSearch = { _, _, _, _ ->
                showSearchSheet = false
            }
        )
    }
}

@Composable
private fun CategorySection(
    title: String,
    listings: List<Listing>,
    emptyText: String,
    onSelectListing: (String, String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                title,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            if (listings.isNotEmpty()) {
                Text(
                    "See all",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Coral
                )
            }
        }

        if (listings.isEmpty()) {
            Text(
                emptyText,
                color = Color.Gray,
                fontSize = 13.sp
            )
        } else {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(listings) { listing ->
                    ListingCard(
                        listing = listing,
                        onClick = { onSelectListing(listing.id, listing.title) }
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchBarComponent(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(32.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(32.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                tint = Color.Gray,
                modifier = Modifier.size(20.dp)
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Where to?",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.Black
                )
                Text(
                    "Anywhere · Any week · Add guests",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }
            
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color.Gray.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Tune,
                    contentDescription = "Filters",
                    tint = Color.Black,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

@Composable
private fun CitySectionComponent(
    section: CitySection,
    onSelectListing: (String, String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Stays in ${section.city}",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                "${section.count}",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Gray
            )
        }
        
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(section.listings) { listing ->
                ListingCard(
                    listing = listing,
                    onClick = { onSelectListing(listing.id, listing.title) }
                )
            }
        }
    }
}

@Composable
private fun FeaturedSection(
    listings: List<Listing>,
    onSelectListing: (String, String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Featured stays",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                "See all",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = Coral
            )
        }
        
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(listings) { listing ->
                ListingCard(
                    listing = listing,
                    onClick = { onSelectListing(listing.id, listing.title) }
                )
            }
        }
    }
}

@Composable
private fun ListingCard(
    listing: Listing,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(200.dp)
            .clickable(onClick = onClick)
    ) {
        // Image
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp)
                .clip(RoundedCornerShape(12.dp))
        ) {
            val imageUrl = firstListingImageUrl(listing)
            if (imageUrl != null) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = listing.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Gray.copy(alpha = 0.3f))
                )
            }
            
            // Favorite button
            IconButton(
                onClick = { /* Toggle favorite */ },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
            ) {
                Icon(
                    Icons.Default.FavoriteBorder,
                    contentDescription = "Favorite",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        // Title
        Text(
            listing.title,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        
        // Location
        Text(
            listing.location,
            fontSize = 12.sp,
            color = Color.Gray,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        
        // Price
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${listing.currency} ${listing.pricePerNight.toInt()}",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                " / night",
                fontSize = 12.sp,
                color = Color.Gray
            )
        }
    }
}

private val cloudinaryCloudNames = listOf("dghg9uebh", "dxdblhmbm")

private fun firstListingImageUrl(listing: Listing): String? {
    val mediaRefs = buildList {
        listing.images?.let { addAll(it) }
        listing.mainImage?.let { add(it) }
    }.map { it.trim() }.filter { it.isNotBlank() }

    val imageRef = mediaRefs.firstOrNull { isProbablyImageMedia(it) } ?: return null
    return resolveCloudinaryMediaReference(imageRef)
}

private fun isProbablyImageMedia(value: String): Boolean {
    val lower = value.lowercase()
    if (lower.contains("/video/upload/") || lower.contains(".mp4") || lower.contains(".mov") || lower.contains(".webm")) {
        return false
    }
    if (lower.contains("/image/upload/")) return true
    if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("//")) {
        return lower.contains(".jpg") ||
            lower.contains(".jpeg") ||
            lower.contains(".png") ||
            lower.contains(".webp") ||
            lower.contains(".gif") ||
            lower.contains(".avif") ||
            lower.contains(".heic")
    }
    return true
}

private fun resolveCloudinaryMediaReference(value: String): String {
    val trimmed = value.trim()
    if (trimmed.isBlank()) return trimmed

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed
    }
    if (trimmed.startsWith("//")) {
        return "https:$trimmed"
    }
    if (trimmed.startsWith("res.cloudinary.com/")) {
        return "https://$trimmed"
    }

    val normalized = trimmed.removePrefix("/")
    if (normalized.startsWith("image/upload/") || normalized.startsWith("video/upload/") || normalized.startsWith("raw/upload/")) {
        return "https://res.cloudinary.com/${cloudinaryCloudNames.first()}/$normalized"
    }

    val encodedPublicId = java.net.URLEncoder.encode(normalized, "UTF-8").replace("+", "%20")
    return "https://res.cloudinary.com/${cloudinaryCloudNames.first()}/image/upload/f_auto,q_auto/$encodedPublicId"
}
