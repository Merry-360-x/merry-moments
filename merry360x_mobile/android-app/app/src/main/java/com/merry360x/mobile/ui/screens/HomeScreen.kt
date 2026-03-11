package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
import java.time.LocalDate

private val TextSecondary = Color(0xFF888888)
private val SoftGray = Color(0xFFF4F4F4)

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onRefresh: () -> Unit,
    onSelectListing: (Listing) -> Unit,
    onSearchSubmit: (destination: String, checkIn: LocalDate?, checkOut: LocalDate?, guests: Int) -> Unit = { _, _, _, _ -> },
) {
    var showSearchSheet by remember { mutableStateOf(false) }
    var selectedCategory by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) { onRefresh() }

    Box(modifier = Modifier.fillMaxSize().background(Color.White)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // ── Dark editorial hero ───────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(listOf(Color(0xFF0D0D0D), Color(0xFF1C1005)))
                    )
                    .padding(top = 56.dp, bottom = 28.dp)
                    .padding(horizontal = 24.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        "DISCOVER AFRICA",
                        color = Coral,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.5.sp
                    )
                    Text(
                        "Where to next?",
                        color = Color.White,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.5).sp
                    )
                    Spacer(Modifier.height(16.dp))
                    SearchBarHero(onClick = { showSearchSheet = true })
                }
            }

            // ── Category filter pills ─────────────────────────────────────
            CategoryTabs(selected = selectedCategory, onSelect = { selectedCategory = it })

            // ── Content sections ──────────────────────────────────────────
            Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(36.dp)
            ) {
                if (uiState.loading) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 60.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Coral, strokeWidth = 2.dp)
                    }
                }

                uiState.error?.let {
                    Text(
                        it,
                        color = Color.Red.copy(alpha = 0.75f),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 24.dp)
                    )
                }

                if (selectedCategory == 0 || selectedCategory == 1) {
                    uiState.citySections.forEach { section ->
                        CitySectionComponent(section = section, onSelectListing = onSelectListing)
                    }
                    if (uiState.citySections.isEmpty() && !uiState.loading && uiState.listings.isNotEmpty()) {
                        ContentSection(
                            label = "FEATURED",
                            title = "Stays",
                            listings = uiState.listings,
                            emptyText = "",
                            onSelectListing = onSelectListing
                        )
                    }
                }

                if (selectedCategory == 0 || selectedCategory == 2) {
                    ContentSection(
                        label = "EXPLORE",
                        title = "Tours",
                        listings = uiState.tours,
                        emptyText = "No tours available yet",
                        onSelectListing = onSelectListing
                    )
                }

                if (selectedCategory == 0 || selectedCategory == 3) {
                    ContentSection(
                        label = "PACKAGES",
                        title = "Tour Packages",
                        listings = uiState.events,
                        emptyText = "No packages available yet",
                        onSelectListing = onSelectListing
                    )
                }

                if (selectedCategory == 0 || selectedCategory == 4) {
                    ContentSection(
                        label = "TRANSPORT",
                        title = "Get Around",
                        listings = uiState.cars,
                        emptyText = "No transport available yet",
                        onSelectListing = onSelectListing
                    )
                }

                Spacer(Modifier.height(80.dp))
            }
        }

        SearchSheet(
            isVisible = showSearchSheet,
            onDismiss = { showSearchSheet = false },
            onSearch = { destination, checkIn, checkOut, guests ->
                onSearchSubmit(destination, checkIn, checkOut, guests)
                showSearchSheet = false
            }
        )
    }
}

@Composable
private fun CategoryTabs(selected: Int, onSelect: (Int) -> Unit) {
    val tabs = listOf("All", "Stays", "Tours", "Packages", "Transport")
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 16.dp)
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        tabs.forEachIndexed { index, label ->
            val isSelected = index == selected
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(if (isSelected) Coral else SoftGray)
                    .clickable { onSelect(index) }
                    .padding(horizontal = 18.dp, vertical = 9.dp)
            ) {
                Text(
                    label,
                    color = if (isSelected) Color.White else Color(0xFF555555),
                    fontSize = 13.sp,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                )
            }
        }
    }
}

@Composable
private fun ContentSection(
    label: String,
    title: String,
    listings: List<Listing>,
    emptyText: String,
    onSelectListing: (Listing) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    label,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Coral,
                    letterSpacing = 1.5.sp
                )
                Text(
                    title,
                    fontSize = 21.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF111111),
                    letterSpacing = (-0.3).sp
                )
            }
            if (listings.isNotEmpty()) {
                Text("See all", fontSize = 13.sp, color = TextSecondary)
            }
        }
        if (listings.isEmpty() && emptyText.isNotBlank()) {
            Text(
                emptyText,
                color = TextSecondary,
                fontSize = 13.sp,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
        } else {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(horizontal = 24.dp)
            ) {
                items(listings) { listing ->
                    ListingCard(listing = listing, onClick = { onSelectListing(listing) })
                }
            }
        }
    }
}

@Composable
private fun SearchBarHero(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.11f))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.65f),
                modifier = Modifier.size(18.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Where to?",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Text(
                    "Anywhere · Any week · Add guests",
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = 0.45f)
                )
            }
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Tune,
                    contentDescription = "Filters",
                    tint = Color.White,
                    modifier = Modifier.size(15.dp)
                )
            }
        }
    }
}

@Composable
private fun CitySectionComponent(
    section: CitySection,
    onSelectListing: (Listing) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    "STAYS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Coral,
                    letterSpacing = 1.5.sp
                )
                Text(
                    section.city,
                    fontSize = 21.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF111111),
                    letterSpacing = (-0.3).sp
                )
            }
            Text(
                "${section.count} properties",
                fontSize = 12.sp,
                color = TextSecondary
            )
        }
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 24.dp)
        ) {
            items(section.listings) { listing ->
                ListingCard(listing = listing, onClick = { onSelectListing(listing) })
            }
        }
    }
}

@Composable
private fun ListingCard(listing: Listing, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .width(195.dp)
            .height(250.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
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
                    .background(
                        Brush.verticalGradient(listOf(Color(0xFF2A2A2A), Color(0xFF111111)))
                    )
            )
        }

        // Bottom scrim
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(110.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.80f))
                    )
                )
        )

        // Price badge — top left
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(10.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.White)
                .padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(
                "${listing.currency} ${listing.pricePerNight.toInt()}",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF111111)
            )
        }

        // Heart — top right
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp)
                .size(30.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.28f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.FavoriteBorder,
                contentDescription = "Save",
                tint = Color.White,
                modifier = Modifier.size(15.dp)
            )
        }

        // Title + location — bottom
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                listing.title,
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                listing.location,
                color = Color.White.copy(alpha = 0.62f),
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
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
