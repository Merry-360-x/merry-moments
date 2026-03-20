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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.data.DetailedBooking
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.UserProfileDetails
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.launch

@Composable
fun UserDashboardScreen(
    api: SupabaseApi,
    userId: String?,
    accessToken: String?,
    profileDetails: UserProfileDetails?,
    onBack: () -> Unit,
    onNavigate: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var bookings by remember { mutableStateOf<List<DetailedBooking>>(emptyList()) }
    var favorites by remember { mutableStateOf<List<Listing>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    // Editable profile fields
    var fullName by remember { mutableStateOf(profileDetails?.fullName ?: "") }
    var nickname by remember { mutableStateOf(profileDetails?.nickname ?: "") }
    var phone by remember { mutableStateOf(profileDetails?.phone ?: "") }
    var bio by remember { mutableStateOf(profileDetails?.bio ?: "") }
    var saving by remember { mutableStateOf(false) }
    var saveMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(userId) {
        if (userId.isNullOrBlank()) { loading = false; return@LaunchedEffect }
        loading = true
        bookings = api.fetchUserBookingsDetailed(userId, accessToken)
        favorites = api.fetchFavoriteListings(userId, accessToken)
        loading = false
    }

    LaunchedEffect(profileDetails) {
        fullName = profileDetails?.fullName ?: ""
        nickname = profileDetails?.nickname ?: ""
        phone = profileDetails?.phone ?: ""
        bio = profileDetails?.bio ?: ""
    }

    val upcomingCount = bookings.count { it.status == "confirmed" || it.status == "pending" }
    val pastCount = bookings.count { it.status == "completed" }

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
                Text("Dashboard", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
        }

        if (loading) {
            item { CircularProgressIndicator(color = Coral, modifier = Modifier.padding(24.dp)) }
        } else {
            // Stats tiles
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    StatTile("Upcoming", upcomingCount.toString(), Icons.Default.CalendarMonth, modifier = Modifier.weight(1f))
                    StatTile("Past", pastCount.toString(), Icons.Default.History, modifier = Modifier.weight(1f))
                    StatTile("Favorites", favorites.size.toString(), Icons.Default.Favorite, modifier = Modifier.weight(1f))
                    StatTile("Points", profileDetails?.loyaltyPoints?.toString() ?: "0", Icons.Default.Star, modifier = Modifier.weight(1f))
                }
            }

            // Quick links
            item {
                Text("Quick Links", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                    Text("My Bookings", color = Coral, fontWeight = FontWeight.Medium, modifier = Modifier.clickable { onNavigate("my_bookings") })
                    Text("  |  ", color = Color.LightGray)
                    Text("Favorites", color = Coral, fontWeight = FontWeight.Medium, modifier = Modifier.clickable { onNavigate("favorites") })
                }
            }

            // Profile editing
            item {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                Text("Edit Profile", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            }

            item {
                OutlinedTextField(value = fullName, onValueChange = { fullName = it; saveMessage = null }, label = { Text("Full name") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
            item {
                OutlinedTextField(value = nickname, onValueChange = { nickname = it; saveMessage = null }, label = { Text("Nickname") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
            item {
                OutlinedTextField(value = phone, onValueChange = { phone = it; saveMessage = null }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
            item {
                OutlinedTextField(value = bio, onValueChange = { bio = it; saveMessage = null }, label = { Text("Bio") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
            }

            saveMessage?.let { msg ->
                item {
                    Text(msg, color = Color(0xFF2E7D32), fontWeight = FontWeight.Medium)
                }
            }

            item {
                Button(
                    onClick = {
                        if (userId.isNullOrBlank()) return@Button
                        scope.launch {
                            saving = true
                            saveMessage = null
                            api.updateProfileBasics(
                                userId = userId,
                                fullName = fullName.ifBlank { null },
                                phone = phone.ifBlank { null },
                                accessToken = accessToken
                            )
                            saving = false
                            saveMessage = "Profile saved!"
                        }
                    },
                    enabled = !saving,
                    colors = ButtonDefaults.buttonColors(containerColor = Coral),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (saving) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    else Text("Save Changes", color = Color.White)
                }
            }

            item { Spacer(Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun StatTile(label: String, value: String, icon: ImageVector, modifier: Modifier = Modifier) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = CardGray),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(icon, contentDescription = null, tint = Coral, modifier = Modifier.size(20.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(label, fontSize = 11.sp, color = Color.Gray)
        }
    }
}
