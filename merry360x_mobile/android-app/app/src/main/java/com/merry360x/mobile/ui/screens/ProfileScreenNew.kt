package com.merry360x.mobile.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.animateContentSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.theme.Coral

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProfileScreen(
    isLoggedIn: Boolean = false,
    userName: String = "Guest",
    roles: List<String> = emptyList(),
    selectedRegion: String = "Rwanda",
    selectedLanguage: String = "English",
    selectedCurrency: String = "RWF",
    selectedMode: String = "Light",
    onLogin: () -> Unit = {},
    onSignOut: () -> Unit = {},
    onBecomeHost: () -> Unit = {},
    onOpenDashboard: (String) -> Unit = {},
    onNavigate: (String) -> Unit = {}
) {
    val normalizedRoles = roles.map { it.trim().lowercase() }.toSet()
    val dashboardItems = buildList {
        if (normalizedRoles.contains("admin")) add(Pair("Admin Dashboard", "/admin"))
        if (normalizedRoles.contains("financial_staff")) add(Pair("Financial Dashboard", "/financial-dashboard"))
        if (normalizedRoles.contains("operations_staff")) add(Pair("Operations Dashboard", "/operations-dashboard"))
        if (normalizedRoles.contains("customer_support")) add(Pair("Support Dashboard", "/customer-support-dashboard"))
        if (normalizedRoles.contains("host")) add(Pair("Host Dashboard", "/host-dashboard"))
        if (normalizedRoles.contains("affiliate")) add(Pair("Affiliate Dashboard", "/affiliate-dashboard"))
        if (normalizedRoles.contains("affiliate")) add(Pair("Affiliate Portal", "/affiliate"))
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .animateContentSize()
    ) {
        // Notification button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.End
        ) {
            IconButton(onClick = { onNavigate("notifications") }) {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = "Notifications",
                    tint = Color.Black
                )
            }
        }
        
        // Scrollable content
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
        ) {
            AnimatedContent(targetState = isLoggedIn, label = "profile-auth-state") { loggedIn ->
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(if (loggedIn) 88.dp else 80.dp)
                            .clip(CircleShape)
                            .background(if (loggedIn) Coral else Color.Black),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = userName.firstOrNull()?.uppercaseChar()?.toString() ?: "?",
                            color = Color.White,
                            fontSize = if (loggedIn) 34.sp else 32.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = userName,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold
                    )

                    Text(
                        text = if (loggedIn) "Account active" else "Sign in to your account",
                        fontSize = 14.sp,
                        color = Color(0xFF9E9E9E)
                    )
                }
            }

            AnimatedVisibility(
                visible = isLoggedIn,
                enter = fadeIn() + slideInVertically(initialOffsetY = { it / 3 }),
                exit = fadeOut() + slideOutVertically(targetOffsetY = { it / 3 })
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (normalizedRoles.isEmpty()) {
                            RoleChip("Traveler")
                        } else {
                            normalizedRoles.forEach { role ->
                                RoleChip(role.replace('_', ' ').replaceFirstChar { it.uppercase() })
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            if (isLoggedIn && !normalizedRoles.contains("host")) {
                Button(
                    onClick = onBecomeHost,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Coral)
                ) {
                    Text(
                        text = "Become a Host",
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        modifier = Modifier.padding(vertical = 6.dp)
                    )
                }
            }

            if (isLoggedIn && dashboardItems.isNotEmpty()) {
                Spacer(modifier = Modifier.height(20.dp))
                ProfileSectionHeader("Dashboards")
                dashboardItems.forEach { item ->
                    ProfileMenuItem(icon = Icons.Default.Home, title = item.first) {
                        onOpenDashboard(item.second)
                    }
                }
            }

            AnimatedVisibility(
                visible = isLoggedIn,
                enter = fadeIn() + slideInVertically(initialOffsetY = { it / 4 }),
                exit = fadeOut()
            ) {
                Column {
                    Spacer(modifier = Modifier.height(20.dp))
                    ProfileSectionHeader("Account Centers")
                    if (normalizedRoles.contains("host")) {
                        ProfileMenuItem(icon = Icons.Default.Home, title = "Host Studio") {
                            onOpenDashboard("/host-dashboard")
                        }
                    }
                    if (normalizedRoles.contains("admin") || normalizedRoles.contains("financial_staff") || normalizedRoles.contains("operations_staff") || normalizedRoles.contains("customer_support")) {
                        ProfileMenuItem(icon = Icons.Default.AdminPanelSettings, title = "Backoffice Center") {
                            onOpenDashboard("/admin")
                        }
                    }
                    if (normalizedRoles.contains("affiliate")) {
                        ProfileMenuItem(icon = Icons.Default.Payments, title = "Affiliate Center") {
                            onOpenDashboard("/affiliate")
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Settings Section
            ProfileSectionHeader("Settings")
            
            ProfileMenuItem(icon = Icons.Default.Place, title = "Region", value = selectedRegion) {
                onNavigate("region")
            }
            ProfileMenuItem(icon = Icons.Default.Language, title = "Language", value = selectedLanguage) {
                onNavigate("language")
            }
            ProfileMenuItem(icon = Icons.Default.Payments, title = "Currency", value = selectedCurrency) {
                onNavigate("currency")
            }
            ProfileMenuItem(icon = Icons.Default.VerifiedUser, title = "Complete Profile") {
                onNavigate("complete_profile")
            }
            ProfileMenuItem(icon = Icons.Default.DarkMode, title = "Mode", value = selectedMode) {
                onNavigate("mode")
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Explore Section
            ProfileSectionHeader("Explore")
            
            ProfileMenuItem(icon = Icons.Default.CameraAlt, title = "Travel Stories") {
                onNavigate("travel_stories")
            }
            ProfileMenuItem(icon = Icons.Default.Payments, title = "Affiliate Program") {
                onNavigate("affiliate")
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Bookings Section
            ProfileSectionHeader("Bookings")

            ProfileMenuItem(icon = Icons.Default.Home, title = "My Bookings") {
                onNavigate("my_bookings")
            }
            ProfileMenuItem(icon = Icons.Default.Payments, title = "Checkout & Payment Status") {
                onNavigate("checkout")
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Legal Section
            ProfileSectionHeader("Legal")
            
            ProfileMenuItem(icon = Icons.Default.Description, title = "Terms & Conditions") {
                onNavigate("terms")
            }
            ProfileMenuItem(icon = Icons.Default.Lock, title = "Privacy Policy") {
                onNavigate("privacy")
            }
            ProfileMenuItem(icon = Icons.Default.Refresh, title = "Refund Policy") {
                onNavigate("refund")
            }
            ProfileMenuItem(icon = Icons.Default.VerifiedUser, title = "Safety Guidelines") {
                onNavigate("safety")
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Help Section
            ProfileSectionHeader("Help")
            
            ProfileMenuItem(icon = Icons.AutoMirrored.Default.Chat, title = "Let's Chat") {
                onNavigate("chat")
            }
            ProfileMenuItem(icon = Icons.AutoMirrored.Default.Help, title = "Help Center") {
                onNavigate("help_center")
            }
            ProfileMenuItem(icon = Icons.Default.Star, title = "App Store") {
                onNavigate("app_store")
            }
            ProfileMenuItem(icon = Icons.Default.PlayArrow, title = "Google Play") {
                onNavigate("google_play")
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Login/Sign Out Button
            Button(
                onClick = if (isLoggedIn) onSignOut else onLogin,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Coral)
            ) {
                Text(
                    text = if (isLoggedIn) "Sign Out" else "Login / Sign In",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(vertical = 6.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun RoleChip(label: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(Coral.copy(alpha = 0.14f))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(label, color = Coral, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun ProfileSectionHeader(title: String) {
    Text(
        text = title,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(bottom = 8.dp)
    )
}

@Composable
private fun ProfileSectionItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    showArrow: Boolean = false,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
            tint = Color(0xFF777777)
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = subtitle,
                fontSize = 13.sp,
                color = Color(0xFF9E9E9E)
            )
        }
        
        if (showArrow) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = Color(0xFF9E9E9E)
            )
        }
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    value: String? = null,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = Color(0xFF777777)
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Text(
            text = title,
            fontSize = 15.sp,
            modifier = Modifier.weight(1f)
        )
        
        if (value != null) {
            Text(
                text = value,
                fontSize = 15.sp,
                color = Color(0xFF9E9E9E)
            )
            
            Spacer(modifier = Modifier.width(4.dp))
        }
        
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = Color(0xFF9E9E9E),
            modifier = Modifier.size(20.dp)
        )
    }
    
    HorizontalDivider(color = Color(0xFFDDDDDD).copy(alpha = 0.5f))
}
