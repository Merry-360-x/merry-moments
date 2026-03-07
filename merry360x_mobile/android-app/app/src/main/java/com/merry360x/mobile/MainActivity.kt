package com.merry360x.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.FeatureApi
import com.merry360x.mobile.ui.screens.LoginScreenNew
import com.merry360x.mobile.theme.Coral
import com.merry360x.mobile.theme.Merry360xTheme
import com.merry360x.mobile.ui.screens.HomeScreen
import com.merry360x.mobile.ui.screens.MerryAIScreen
import com.merry360x.mobile.ui.screens.ProfileScreen
import com.merry360x.mobile.ui.screens.TripCartScreen
import com.merry360x.mobile.ui.screens.WishlistsScreen
import com.merry360x.mobile.ui.screens.AuthBottomSheet
import com.merry360x.mobile.ui.screens.AppCenterDestination
import com.merry360x.mobile.ui.screens.AppCentersScreen
import com.merry360x.mobile.viewmodel.AuthViewModel
import com.merry360x.mobile.viewmodel.BookingViewModel
import com.merry360x.mobile.viewmodel.FeatureViewModel
import com.merry360x.mobile.viewmodel.HomeViewModel
import com.merry360x.mobile.viewmodel.TripsViewModel

private data class NavItem(
    val label: String,
    val iconRes: Int? = null,
    val vectorIcon: ImageVector? = null,
    val badgeCount: Int = 0
)

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContent {
            Merry360xTheme {
                var tab by rememberSaveable { mutableStateOf(0) }
                val api = remember { SupabaseApi(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY) }
                val featureApi = remember { FeatureApi(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY) }
                val authViewModel = remember { AuthViewModel(api) }
                val homeViewModel = remember { HomeViewModel(api) }
                val bookingViewModel = remember { BookingViewModel(api) }
                val tripsViewModel = remember { TripsViewModel(api) }
                val featureViewModel = remember { FeatureViewModel(featureApi) }
                val authState by authViewModel.state.collectAsState()
                val homeState by homeViewModel.state.collectAsState()
                val bookingState by bookingViewModel.state.collectAsState()
                val tripsState by tripsViewModel.state.collectAsState()
                val featureState by featureViewModel.state.collectAsState()
                
                val navItems = listOf(
                    NavItem("Explore", iconRes = R.drawable.ic_nav_explore),
                    NavItem("Wishlists", vectorIcon = Icons.Default.FavoriteBorder),
                    NavItem("AI", iconRes = R.drawable.ic_nav_ai),
                    NavItem("Trip cart", iconRes = R.drawable.ic_nav_tripcart, badgeCount = 1),
                    NavItem("Profile", iconRes = R.drawable.ic_nav_profile)
                )
                
                // Auth sheet state
                var showAuthSheet by remember { mutableStateOf(false) }
                var activeCenter by rememberSaveable { mutableStateOf<AppCenterDestination?>(null) }
                val authSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
                
                // Auth Bottom Sheet
                AuthBottomSheet(
                    showSheet = showAuthSheet,
                    sheetState = authSheetState,
                    uiState = authState,
                    onEmail = authViewModel::updateEmail,
                    onPassword = authViewModel::updatePassword,
                    onSignIn = authViewModel::signIn,
                    onSignUp = authViewModel::signUp,
                    onDismiss = { showAuthSheet = false }
                )

                LaunchedEffect(authState.authenticated, authState.roles) {
                    val hasDashboardRole = authState.roles.any {
                        it == "host" ||
                            it == "admin" ||
                            it == "financial_staff" ||
                            it == "operations_staff" ||
                            it == "customer_support"
                    }
                    if (authState.authenticated && hasDashboardRole) {
                        tab = 4
                    }
                }

                LaunchedEffect(authState.userId) {
                    tripsViewModel.load(authState.userId)
                }

                Scaffold(
                        bottomBar = {
                            NavigationBar(
                                containerColor = Color.Transparent,
                                tonalElevation = 0.dp
                            ) {
                                navItems.forEachIndexed { index, item ->
                                    NavigationBarItem(
                                        selected = tab == index,
                                        onClick = { tab = index },
                                        label = { 
                                            Text(
                                                item.label, 
                                                fontSize = 11.sp,
                                                color = if (tab == index) Coral else Color.Gray
                                            ) 
                                        },
                                        icon = {
                                            if (item.badgeCount > 0) {
                                                BadgedBox(
                                                    badge = {
                                                        Badge(
                                                            containerColor = Coral,
                                                            contentColor = Color.White
                                                        ) {
                                                            Text(item.badgeCount.toString())
                                                        }
                                                    }
                                                ) {
                                                    if (item.iconRes != null) {
                                                        Icon(
                                                            painter = painterResource(id = item.iconRes),
                                                            contentDescription = item.label,
                                                            modifier = Modifier.size(24.dp)
                                                        )
                                                    } else if (item.vectorIcon != null) {
                                                        Icon(
                                                            imageVector = item.vectorIcon,
                                                            contentDescription = item.label,
                                                            modifier = Modifier.size(24.dp)
                                                        )
                                                    }
                                                }
                                            } else {
                                                if (item.iconRes != null) {
                                                    Icon(
                                                        painter = painterResource(id = item.iconRes),
                                                        contentDescription = item.label,
                                                        modifier = Modifier.size(24.dp)
                                                    )
                                                } else if (item.vectorIcon != null) {
                                                    Icon(
                                                        imageVector = item.vectorIcon,
                                                        contentDescription = item.label,
                                                        modifier = Modifier.size(24.dp)
                                                    )
                                                }
                                            }
                                        },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Coral,
                                            unselectedIconColor = Color.Gray,
                                            indicatorColor = Color.Transparent
                                        )
                                    )
                                }
                            }
                        }
                    ) { innerPadding ->
                        val modifier = Modifier.padding(innerPadding)
                        if (authState.authenticated) {
                            featureViewModel.load("replace-with-real-user-id")
                        }
                        Box(modifier) {
                            when (tab) {
                                0 -> HomeScreen(
                                    uiState = homeState,
                                    onRefresh = { homeViewModel.load() },
                                    onSelectListing = { id, title ->
                                        bookingViewModel.selectedListingId = id
                                        bookingViewModel.selectedListingTitle = title
                                        tab = 3
                                    }
                                )
                                1 -> WishlistsScreen(
                                    onGoToExplore = { tab = 0 }
                                )
                                2 -> MerryAIScreen()
                                3 -> TripCartScreen(
                                    bookings = tripsState.bookings,
                                    isLoading = tripsState.loading || bookingState.submitting,
                                    errorMessage = tripsState.error
                                )
                                4 -> if (activeCenter == null) {
                                    ProfileScreen(
                                        isLoggedIn = authState.authenticated,
                                        userName = "Guest",
                                        roles = authState.roles,
                                        onLogin = { showAuthSheet = true },
                                        onSignOut = { authViewModel.signOut() },
                                        onBecomeHost = { authViewModel.becomeHost() },
                                        onOpenDashboard = { path ->
                                            activeCenter = when {
                                                path.contains("admin") || path.contains("financial") || path.contains("operations") || path.contains("support") -> AppCenterDestination.BACKOFFICE
                                                path.contains("host") -> AppCenterDestination.HOST_STUDIO
                                                path.contains("affiliate") -> AppCenterDestination.AFFILIATE
                                                else -> AppCenterDestination.BACKOFFICE
                                            }
                                        },
                                        onNavigate = { target ->
                                            activeCenter = when (target) {
                                                "terms", "privacy", "refund", "safety", "help_center", "chat" -> AppCenterDestination.SUPPORT_LEGAL
                                                "travel_stories" -> AppCenterDestination.HOST_STUDIO
                                                "bookings", "checkout", "my_bookings" -> AppCenterDestination.BOOKINGS_CHECKOUT
                                                "affiliate" -> AppCenterDestination.AFFILIATE
                                                else -> null
                                            }
                                        }
                                    )
                                } else {
                                    AppCentersScreen(
                                        destination = activeCenter ?: AppCenterDestination.BACKOFFICE,
                                        onBackToProfile = { activeCenter = null },
                                        api = api,
                                        userId = authState.userId,
                                        accessToken = authState.accessToken,
                                    )
                                }
                            }
                        }
                    }
            }
        }
    }
}
