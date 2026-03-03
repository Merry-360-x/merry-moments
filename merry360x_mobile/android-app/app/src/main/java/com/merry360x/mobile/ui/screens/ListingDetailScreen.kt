package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral

@Composable
fun ListingDetailScreen(mediaRefs: List<String> = emptyList()) {
    Column(
        modifier = Modifier
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("← Listing", color = Color.Gray)
        val firstImage = firstListingImageUrl(mediaRefs)
        if (firstImage != null) {
            AsyncImage(
                model = firstImage,
                contentDescription = "Listing image",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
                    .background(Color.LightGray, RoundedCornerShape(20.dp))
            )
        } else {
            Spacer(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
                    .background(Color.LightGray, RoundedCornerShape(20.dp))
            )
        }

        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Kigali Hills Apartment", fontWeight = FontWeight.Bold)
                Text("Kiyovu · 4.8 ★ (128 reviews)", color = Color.Gray)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MetaPill("2 guests")
                    MetaPill("1 bedroom")
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MetaPill("1 bed")
                    MetaPill("Fast Wi‑Fi")
                }
            }
        }

        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("About this place", fontWeight = FontWeight.Bold)
                Text(
                    "Modern apartment with city skyline views, walkable restaurants, and premium comfort for short and long stays.",
                    color = Color.DarkGray
                )
            }
        }

        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
            Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("RWF 95,000", fontWeight = FontWeight.Bold)
                    Text("/ night", color = Color.Gray)
                }
                Card(
                    shape = RoundedCornerShape(999.dp),
                    colors = CardDefaults.cardColors(containerColor = Coral)
                ) {
                    Text("Reserve", modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp), color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

private val cloudinaryCloudNames = listOf("dghg9uebh", "dxdblhmbm")

private fun firstListingImageUrl(refs: List<String>): String? {
    val mediaRefs = refs.map { it.trim() }.filter { it.isNotBlank() }
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

@Composable
private fun MetaPill(text: String) {
    Card(shape = RoundedCornerShape(999.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Text(text, modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp))
    }
}
