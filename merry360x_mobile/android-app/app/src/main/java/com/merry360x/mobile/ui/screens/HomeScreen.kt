package com.merry360x.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.data.StoryPreview
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.theme.Coral
import com.merry360x.mobile.viewmodel.CitySection
import com.merry360x.mobile.viewmodel.HomeUiState
import java.time.LocalDate
import kotlinx.coroutines.launch

private val TextSecondary = Color(0xFF888888)
private val SoftGray = Color(0xFFF4F4F4)

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onRefresh: () -> Unit,
    onSelectListing: (Listing) -> Unit,
    onSearchSubmit: (destination: String, checkIn: LocalDate?, checkOut: LocalDate?, guests: Int) -> Unit = { _, _, _, _ -> },
    api: SupabaseApi? = null,
    userId: String? = null,
    accessToken: String? = null,
    userDisplayName: String = "",
) {
    var showSearchSheet by remember { mutableStateOf(false) }
    var selectedCategory by remember { mutableIntStateOf(0) }
    var stories by remember { mutableStateOf<List<StoryPreview>>(emptyList()) }
    var viewingStory by remember { mutableStateOf<StoryPreview?>(null) }
    var showCreateStory by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        onRefresh()
        api?.let { stories = it.fetchRecentStories() }
    }

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

            // ── Stories row ───────────────────────────────────────────────
            StoriesRow(
                stories = stories,
                isLoggedIn = !userId.isNullOrBlank(),
                onViewStory = { viewingStory = it },
                onAddStory = { showCreateStory = true },
            )

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

        // ── Story Viewer ──────────────────────────────────────────────────────
        viewingStory?.let { story ->
            Dialog(
                onDismissRequest = { viewingStory = null },
                properties = DialogProperties(usePlatformDefaultWidth = false)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black)
                ) {
                    if (story.imageUrl != null) {
                        AsyncImage(
                            model = story.imageUrl,
                            contentDescription = story.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        listOf(Color.Black.copy(alpha = 0.45f), Color.Transparent, Color.Black.copy(alpha = 0.75f))
                                    )
                                )
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Brush.verticalGradient(listOf(Color(0xFF0D0D0D), Color(0xFF1C1005))))
                        )
                    }

                    // Close button
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(top = 56.dp, end = 20.dp)
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.4f))
                            .clickable { viewingStory = null },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White, modifier = Modifier.size(18.dp))
                    }

                    // Story content
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .fillMaxWidth()
                            .padding(24.dp)
                            .padding(bottom = 40.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        story.location?.let {
                            Text(
                                it.uppercase(),
                                color = Coral,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.5.sp
                            )
                        }
                        Text(story.title, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // ── Create Story Sheet ────────────────────────────────────────────────
        if (showCreateStory) {
            var storyTitle by remember { mutableStateOf("") }
            var storyBody by remember { mutableStateOf("") }
            var storyLocation by remember { mutableStateOf("") }
            var storyImageUrl by remember { mutableStateOf("") }
            var submitting by remember { mutableStateOf(false) }
            var submitError by remember { mutableStateOf<String?>(null) }

            Dialog(
                onDismissRequest = { showCreateStory = false },
                properties = DialogProperties(usePlatformDefaultWidth = false)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.White)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 24.dp)
                            .padding(top = 56.dp, bottom = 40.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Share a Story", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFF4F4F4))
                                    .clickable { showCreateStory = false },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.Black, modifier = Modifier.size(18.dp))
                            }
                        }
                        Text("Tell the community about your travel experience.", color = Color.Gray, fontSize = 13.sp)

                        OutlinedTextField(
                            value = storyTitle,
                            onValueChange = { storyTitle = it },
                            label = { Text("Title *") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = storyBody,
                            onValueChange = { storyBody = it },
                            label = { Text("Your story *") },
                            modifier = Modifier.fillMaxWidth().height(140.dp),
                            shape = RoundedCornerShape(12.dp),
                            maxLines = 8,
                        )
                        OutlinedTextField(
                            value = storyLocation,
                            onValueChange = { storyLocation = it },
                            label = { Text("Location (optional)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = storyImageUrl,
                            onValueChange = { storyImageUrl = it },
                            label = { Text("Image URL (optional)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                        )

                        submitError?.let {
                            Text(it, color = Color.Red, fontSize = 12.sp)
                        }

                        Button(
                            onClick = {
                                if (!userId.isNullOrBlank() && api != null) {
                                    submitting = true
                                    submitError = null
                                    scope.launch {
                                        val res = api.createStory(
                                            userId = userId,
                                            title = storyTitle,
                                            body = storyBody,
                                            location = storyLocation.ifBlank { null },
                                            mediaUrl = storyImageUrl.ifBlank { null },
                                            accessToken = accessToken,
                                        )
                                        if (res.isSuccess) {
                                            showCreateStory = false
                                            stories = api.fetchRecentStories()
                                        } else {
                                            submitError = res.exceptionOrNull()?.message ?: "Could not post story"
                                        }
                                        submitting = false
                                    }
                                }
                            },
                            enabled = storyTitle.isNotBlank() && storyBody.isNotBlank() && !submitting,
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Coral),
                        ) {
                            if (submitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Text("Post Story", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

private val StoryRing = Brush.sweepGradient(listOf(Color(0xFFFF6B6B), Color(0xFFFF8E53), Color(0xFFFF6B6B)))

@Composable
private fun StoriesRow(
    stories: List<StoryPreview>,
    isLoggedIn: Boolean,
    onViewStory: (StoryPreview) -> Unit,
    onAddStory: () -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        // "Your Story" / Add button
        item {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(5.dp),
                modifier = Modifier.width(66.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(if (isLoggedIn) Coral else Color(0xFFF0F0F0))
                        .clickable(onClick = onAddStory),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = "Add Story",
                        tint = if (isLoggedIn) Color.White else Color.Gray,
                        modifier = Modifier.size(28.dp)
                    )
                }
                Text(
                    "Your Story",
                    fontSize = 10.sp,
                    color = Color(0xFF555555),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        items(stories) { story ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(5.dp),
                modifier = Modifier
                    .width(66.dp)
                    .clickable { onViewStory(story) }
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .border(
                            width = 2.5.dp,
                            brush = StoryRing,
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(58.dp)
                            .clip(CircleShape)
                    ) {
                        if (story.imageUrl != null) {
                            AsyncImage(
                                model = story.imageUrl,
                                contentDescription = story.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Brush.verticalGradient(listOf(Color(0xFF2C2C2C), Color(0xFF111111)))),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    story.title.firstOrNull()?.uppercaseChar()?.toString() ?: "S",
                                    color = Color.White,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
                Text(
                    story.title,
                    fontSize = 10.sp,
                    color = Color(0xFF555555),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
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
