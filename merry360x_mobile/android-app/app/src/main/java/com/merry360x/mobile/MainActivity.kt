package com.merry360x.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
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
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.data.UserProfileDetails
import com.merry360x.mobile.data.defaultUsdRates
import com.merry360x.mobile.ui.screens.LoginScreenNew
import com.merry360x.mobile.theme.Coral
import com.merry360x.mobile.theme.Merry360xTheme
import com.merry360x.mobile.ui.screens.BookingScreen
import com.merry360x.mobile.ui.screens.HomeScreen
import com.merry360x.mobile.ui.screens.ListingDetailScreen
import com.merry360x.mobile.ui.screens.MerryAIScreen
import com.merry360x.mobile.ui.screens.ProfileScreen
import com.merry360x.mobile.ui.screens.TripCartScreen
import com.merry360x.mobile.ui.screens.WishlistsScreen
import com.merry360x.mobile.ui.screens.AuthBottomSheet
import com.merry360x.mobile.ui.screens.AppCenterDestination
import android.content.Intent
import android.net.Uri
import com.merry360x.mobile.ui.screens.AppCentersScreen
import com.merry360x.mobile.ui.screens.AuthCallbackScreen
import com.merry360x.mobile.ui.screens.AppModeScreen
import com.merry360x.mobile.ui.screens.CompleteProfileScreen
import com.merry360x.mobile.ui.screens.CurrencyPickerScreen
import com.merry360x.mobile.ui.screens.ForgotPasswordScreen
import com.merry360x.mobile.ui.screens.LanguagePickerScreen
import com.merry360x.mobile.ui.screens.NotificationsScreen
import com.merry360x.mobile.ui.screens.RegionPickerScreen
import com.merry360x.mobile.ui.screens.ResetPasswordScreen
import com.merry360x.mobile.ui.screens.SafetyGuidelinesScreen
import com.merry360x.mobile.ui.screens.SearchResultsScreen
import com.merry360x.mobile.ui.screens.ToursBrowseScreen
import com.merry360x.mobile.ui.screens.TransportBrowseScreen
import com.merry360x.mobile.ui.screens.AccommodationsBrowseScreen
import com.merry360x.mobile.ui.screens.UnifiedSearchResultsScreen
import com.merry360x.mobile.ui.screens.MyBookingsScreen
import com.merry360x.mobile.ui.screens.FavoritesScreen
import com.merry360x.mobile.ui.screens.UserDashboardScreen
import com.merry360x.mobile.ui.screens.TokenReviewScreen
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

private enum class ExploreFlow {
    HOME,
    SEARCH_RESULTS,
    DETAIL,
    BOOKING,
}

private enum class GlobalScreen {
    AUTH_CALLBACK,
    FORGOT_PASSWORD,
    RESET_PASSWORD,
    COMPLETE_PROFILE,
    SAFETY_GUIDELINES,
    REGION,
    LANGUAGE,
    CURRENCY,
    APP_MODE,
    NOTIFICATIONS,
    CHAT,
    TOURS_BROWSE,
    TRANSPORT_BROWSE,
    ACCOMMODATIONS_BROWSE,
    UNIFIED_SEARCH,
    MY_BOOKINGS,
    FAVORITES,
    USER_DASHBOARD,
    TOKEN_REVIEW,
}

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContent {
            Merry360xTheme {
                var showAnimatedSplash by remember { mutableStateOf(true) }
                var tab by rememberSaveable { mutableStateOf(0) }
                var exploreFlow by rememberSaveable { mutableStateOf(ExploreFlow.HOME) }
                var selectedListing by remember { mutableStateOf<Listing?>(null) }
                var globalScreen by rememberSaveable { mutableStateOf<GlobalScreen?>(null) }
                var searchDestination by rememberSaveable { mutableStateOf("") }
                val launchCallbackUrl = remember { intent?.dataString }
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
                var activeCenterModule by rememberSaveable { mutableStateOf<String?>(null) }
                var selectedRegion by rememberSaveable { mutableStateOf("Rwanda") }
                var selectedLanguage by rememberSaveable { mutableStateOf("English") }
                var selectedCurrency by rememberSaveable { mutableStateOf("RWF") }
                var selectedMode by rememberSaveable { mutableStateOf("Light") }
                var usdRates by remember { mutableStateOf(defaultUsdRates()) }
                var profileDetails by remember { mutableStateOf<UserProfileDetails?>(null) }
                var profileDetailsLoading by remember { mutableStateOf(false) }
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
                    onForgotPassword = {
                        showAuthSheet = false
                        globalScreen = GlobalScreen.FORGOT_PASSWORD
                    },
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

                LaunchedEffect(authState.authenticated, authState.userId) {
                    if (authState.authenticated && !authState.userId.isNullOrBlank()) {
                        featureViewModel.load(authState.userId)
                    }
                }

                LaunchedEffect(authState.authenticated, authState.userId, authState.accessToken) {
                    if (!authState.authenticated || authState.userId.isNullOrBlank()) {
                        profileDetails = null
                        profileDetailsLoading = false
                    } else {
                        profileDetailsLoading = true
                        profileDetails = api.fetchProfileDetails(authState.userId, authState.accessToken).getOrNull()
                        profileDetailsLoading = false
                    }
                }

                LaunchedEffect(Unit) {
                    usdRates = api.fetchAdminFxRates()
                }

                LaunchedEffect(launchCallbackUrl) {
                    if (!launchCallbackUrl.isNullOrBlank()) {
                        globalScreen = GlobalScreen.AUTH_CALLBACK
                        authViewModel.completeAuthCallback(launchCallbackUrl)
                    }
                }

                // Show animated splash or main content
                if (showAnimatedSplash) {
                    SplashScreen(
                        onSplashComplete = { showAnimatedSplash = false }
                    )
                } else {
                Scaffold(
                        bottomBar = {
                            NavigationBar(
                                containerColor = Color.Transparent,
                                tonalElevation = 0.dp
                            ) {
                                navItems.forEachIndexed { index, item ->
                                    NavigationBarItem(
                                        selected = tab == index,
                                        onClick = {
                                            tab = index
                                            if (index != 4) {
                                                activeCenter = null
                                                activeCenterModule = null
                                            }
                                            if (index == 0 && exploreFlow != ExploreFlow.HOME) {
                                                exploreFlow = ExploreFlow.HOME
                                            }
                                        },
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
                        Box(modifier) {
                            if (globalScreen != null) {
                                when (globalScreen) {
                                    GlobalScreen.AUTH_CALLBACK -> AuthCallbackScreen(
                                        uiState = authState,
                                        onBack = { globalScreen = null },
                                        onContinue = { globalScreen = null },
                                    )
                                    GlobalScreen.FORGOT_PASSWORD -> ForgotPasswordScreen(
                                        onBack = { globalScreen = null },
                                        onContinueToReset = { globalScreen = GlobalScreen.RESET_PASSWORD },
                                    )
                                    GlobalScreen.RESET_PASSWORD -> ResetPasswordScreen(
                                        onBack = { globalScreen = GlobalScreen.FORGOT_PASSWORD },
                                        onDone = { globalScreen = null },
                                    )
                                    GlobalScreen.COMPLETE_PROFILE -> CompleteProfileScreen(
                                        onBack = { globalScreen = null },
                                        api = api,
                                        userId = authViewModel.userId,
                                        accessToken = authViewModel.accessToken
                                    )
                                    GlobalScreen.SAFETY_GUIDELINES -> SafetyGuidelinesScreen(
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.REGION -> RegionPickerScreen(
                                        currentRegion = selectedRegion,
                                        onSelect = { selectedRegion = it },
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.LANGUAGE -> LanguagePickerScreen(
                                        currentLanguage = selectedLanguage,
                                        onSelect = { selectedLanguage = it },
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.CURRENCY -> CurrencyPickerScreen(
                                        currentCurrency = selectedCurrency,
                                        onSelect = { selectedCurrency = it },
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.APP_MODE -> AppModeScreen(
                                        currentMode = selectedMode,
                                        onSelect = { selectedMode = it },
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.NOTIFICATIONS -> NotificationsScreen(
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.CHAT -> NativeSupportChatScreen(
                                        api = api,
                                        userId = authState.userId,
                                        accessToken = authState.accessToken,
                                        senderName = when {
                                            authState.displayName.isNotBlank() -> authState.displayName
                                            authState.userEmail.isNotBlank() -> authState.userEmail.substringBefore("@")
                                            else -> "Customer"
                                        },
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.TOURS_BROWSE -> ToursBrowseScreen(
                                        api = api,
                                        selectedCurrency = selectedCurrency,
                                        usdRates = usdRates,
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.TRANSPORT_BROWSE -> TransportBrowseScreen(
                                        api = api,
                                        selectedCurrency = selectedCurrency,
                                        usdRates = usdRates,
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.ACCOMMODATIONS_BROWSE -> AccommodationsBrowseScreen(
                                        api = api,
                                        userId = authState.userId,
                                        accessToken = authState.accessToken,
                                        selectedCurrency = selectedCurrency,
                                        usdRates = usdRates,
                                        onBack = { globalScreen = null },
                                        onSelectListing = { listing ->
                                            selectedListing = listing
                                            bookingViewModel.selectedListingId = listing.id
                                            bookingViewModel.selectedListingTitle = listing.title
                                            globalScreen = null
                                            exploreFlow = ExploreFlow.DETAIL
                                            tab = 0
                                        }
                                    )
                                    GlobalScreen.UNIFIED_SEARCH -> UnifiedSearchResultsScreen(
                                        api = api,
                                        initialQuery = searchDestination,
                                        selectedCurrency = selectedCurrency,
                                        usdRates = usdRates,
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.MY_BOOKINGS -> MyBookingsScreen(
                                        api = api,
                                        userId = authState.userId,
                                        accessToken = authState.accessToken,
                                        selectedCurrency = selectedCurrency,
                                        usdRates = usdRates,
                                        onBack = { globalScreen = null }
                                    )
                                    GlobalScreen.FAVORITES -> FavoritesScreen(
                                        api = api,
                                        userId = authState.userId,
                                        accessToken = authState.accessToken,
                                        selectedCurrency = selectedCurrency,
                                        usdRates = usdRates,
                                        onBack = { globalScreen = null },
                                        onSelectListing = { listing ->
                                            selectedListing = listing
                                            bookingViewModel.selectedListingId = listing.id
                                            bookingViewModel.selectedListingTitle = listing.title
                                            globalScreen = null
                                            exploreFlow = ExploreFlow.DETAIL
                                            tab = 0
                                        }
                                    )
                                    GlobalScreen.USER_DASHBOARD -> UserDashboardScreen(
                                        api = api,
                                        userId = authState.userId,
                                        accessToken = authState.accessToken,
                                        profileDetails = profileDetails,
                                        onBack = { globalScreen = null },
                                        onNavigate = { target ->
                                            when (target) {
                                                "my_bookings" -> globalScreen = GlobalScreen.MY_BOOKINGS
                                                "favorites" -> globalScreen = GlobalScreen.FAVORITES
                                            }
                                        }
                                    )
                                    GlobalScreen.TOKEN_REVIEW -> TokenReviewScreen(
                                        api = api,
                                        token = "",
                                        onBack = { globalScreen = null }
                                    )
                                    null -> Unit
                                }
                            } else when (tab) {
                                0 -> when (exploreFlow) {
                                    ExploreFlow.HOME -> HomeScreen(
                                        uiState = homeState,
                                        onRefresh = { homeViewModel.load() },
                                        selectedCurrency = selectedCurrency,
                                        usdRates = usdRates,
                                        api = api,
                                        userId = authState.userId,
                                        accessToken = authState.accessToken,
                                        userDisplayName = when {
                                            authState.displayName.isNotBlank() -> authState.displayName
                                            authState.userEmail.isNotBlank() -> authState.userEmail.substringBefore("@")
                                            else -> ""
                                        },
                                        onSelectListing = { listing ->
                                            selectedListing = listing
                                            bookingViewModel.selectedListingId = listing.id
                                            bookingViewModel.selectedListingTitle = listing.title
                                            exploreFlow = ExploreFlow.DETAIL
                                        },
                                        onSearchSubmit = { destination, _, _, _ ->
                                            searchDestination = destination
                                            exploreFlow = ExploreFlow.SEARCH_RESULTS
                                        },
                                        onNavigate = { target ->
                                            when (target) {
                                                "tours" -> globalScreen = GlobalScreen.TOURS_BROWSE
                                                "transport" -> globalScreen = GlobalScreen.TRANSPORT_BROWSE
                                                "accommodations" -> globalScreen = GlobalScreen.ACCOMMODATIONS_BROWSE
                                            }
                                        },
                                    )
                                    ExploreFlow.SEARCH_RESULTS -> {
                                        val allListings = homeState.listings + homeState.tours + homeState.cars + homeState.events
                                        SearchResultsScreen(
                                            destination = searchDestination,
                                            listings = allListings.distinctBy { it.id },
                                            onBack = { exploreFlow = ExploreFlow.HOME },
                                            onSelectListing = { listing ->
                                                selectedListing = listing
                                                bookingViewModel.selectedListingId = listing.id
                                                bookingViewModel.selectedListingTitle = listing.title
                                                exploreFlow = ExploreFlow.DETAIL
                                            }
                                        )
                                    )
                                    ExploreFlow.DETAIL -> {
                                        val listing = selectedListing
                                        if (listing != null) {
                                            ListingDetailScreen(
                                                listing = listing,
                                                selectedCurrency = selectedCurrency,
                                                usdRates = usdRates,
                                                onBack = { exploreFlow = ExploreFlow.HOME },
                                                onReserve = { exploreFlow = ExploreFlow.BOOKING }
                                            )
                                        } else {
                                            exploreFlow = ExploreFlow.HOME
                                        }
                                    }
                                    ExploreFlow.BOOKING -> BookingScreen(
                                        uiState = bookingState,
                                        selectedListingTitle = bookingViewModel.selectedListingTitle,
                                        onBack = { exploreFlow = ExploreFlow.DETAIL },
                                        onSubmit = { bookingViewModel.submitSampleBooking() }
                                    )
                                }
                                1 -> WishlistsScreen(
                                    onGoToExplore = { tab = 0 }
                                )
                                2 -> MerryAIScreen()
                                3 -> TripCartScreen(
                                    bookings = tripsState.bookings,
                                    isLoading = tripsState.loading || bookingState.submitting,
                                    errorMessage = tripsState.error,
                                    selectedCurrency = selectedCurrency,
                                    usdRates = usdRates,
                                )
                                4 -> AnimatedContent(
                                    targetState = activeCenter,
                                    label = "profile-center-transition",
                                    transitionSpec = {
                                        if (targetState != null) {
                                            slideInHorizontally(initialOffsetX = { it / 3 }) + fadeIn() togetherWith
                                                slideOutHorizontally(targetOffsetX = { -it / 5 }) + fadeOut()
                                        } else {
                                            slideInHorizontally(initialOffsetX = { -it / 4 }) + fadeIn() togetherWith
                                                slideOutHorizontally(targetOffsetX = { it / 3 }) + fadeOut()
                                        }
                                    }
                                ) { center ->
                                    if (center == null) {
                                        ProfileScreen(
                                            isLoggedIn = authState.authenticated,
                                            userName = when {
                                                authState.displayName.isNotBlank() -> authState.displayName
                                                authState.userEmail.isNotBlank() -> authState.userEmail.substringBefore("@").replaceFirstChar { it.uppercase() }
                                                authState.authenticated -> "Account"
                                                else -> "Welcome"
                                            },
                                            profileDetails = profileDetails,
                                            profileDetailsLoading = profileDetailsLoading,
                                            roles = authState.roles,
                                            selectedRegion = selectedRegion,
                                            selectedLanguage = selectedLanguage,
                                            selectedCurrency = selectedCurrency,
                                            selectedMode = selectedMode,
                                            onLogin = { showAuthSheet = true },
                                            onSignOut = { authViewModel.signOut() },
                                            onBecomeHost = { authViewModel.becomeHost() },
                                            onOpenDashboard = { path ->
                                                when (path) {
                                                    "/admin" -> {
                                                        activeCenter = AppCenterDestination.BACKOFFICE
                                                        activeCenterModule = "Admin Overview"
                                                    }
                                                    "/financial-dashboard" -> {
                                                        activeCenter = AppCenterDestination.BACKOFFICE
                                                        activeCenterModule = "Financial Summary"
                                                    }
                                                    "/operations-dashboard" -> {
                                                        activeCenter = AppCenterDestination.BACKOFFICE
                                                        activeCenterModule = "Operations Summary"
                                                    }
                                                    "/customer-support-dashboard" -> {
                                                        activeCenter = AppCenterDestination.BACKOFFICE
                                                        activeCenterModule = "Support Summary"
                                                    }
                                                    "/host-dashboard" -> {
                                                        activeCenter = AppCenterDestination.HOST_STUDIO
                                                        activeCenterModule = "Host Dashboard"
                                                    }
                                                    "/affiliate-dashboard" -> {
                                                        activeCenter = AppCenterDestination.AFFILIATE
                                                        activeCenterModule = "Affiliate Dashboard"
                                                    }
                                                    "/affiliate" -> {
                                                        activeCenter = AppCenterDestination.AFFILIATE
                                                        activeCenterModule = "Affiliate Portal"
                                                    }
                                                    "/center/backoffice" -> {
                                                        activeCenter = AppCenterDestination.BACKOFFICE
                                                        activeCenterModule = null
                                                    }
                                                    "/center/host" -> {
                                                        activeCenter = AppCenterDestination.HOST_STUDIO
                                                        activeCenterModule = null
                                                    }
                                                    "/center/affiliate" -> {
                                                        activeCenter = AppCenterDestination.AFFILIATE
                                                        activeCenterModule = null
                                                    }
                                                    else -> {
                                                        activeCenter = AppCenterDestination.BACKOFFICE
                                                        activeCenterModule = null
                                                    }
                                                }
                                            },
                                            onNavigate = { target ->
                                                val authOnlyTargets = setOf("complete_profile", "travel_stories", "bookings", "checkout", "my_bookings", "affiliate")
                                                if (!authState.authenticated && authOnlyTargets.contains(target)) {
                                                    showAuthSheet = true
                                                } else {
                                                    when (target) {
                                                        "complete_profile" -> globalScreen = GlobalScreen.COMPLETE_PROFILE
                                                        "safety" -> globalScreen = GlobalScreen.SAFETY_GUIDELINES
                                                        "region" -> globalScreen = GlobalScreen.REGION
                                                        "language" -> globalScreen = GlobalScreen.LANGUAGE
                                                        "currency" -> globalScreen = GlobalScreen.CURRENCY
                                                        "mode" -> globalScreen = GlobalScreen.APP_MODE
                                                        "notifications" -> globalScreen = GlobalScreen.NOTIFICATIONS
                                                        "chat", "help_center" -> globalScreen = GlobalScreen.CHAT
                                                        "terms", "privacy", "refund" -> activeCenter = AppCenterDestination.SUPPORT_LEGAL
                                                        "travel_stories" -> {
                                                            tab = 0
                                                            exploreFlow = ExploreFlow.HOME
                                                        }
                                                        "my_bookings" -> globalScreen = GlobalScreen.MY_BOOKINGS
                                                        "favorites" -> globalScreen = GlobalScreen.FAVORITES
                                                        "dashboard" -> globalScreen = GlobalScreen.USER_DASHBOARD
                                                        "tours" -> globalScreen = GlobalScreen.TOURS_BROWSE
                                                        "transport" -> globalScreen = GlobalScreen.TRANSPORT_BROWSE
                                                        "accommodations" -> globalScreen = GlobalScreen.ACCOMMODATIONS_BROWSE
                                                        "bookings", "checkout" -> activeCenter = AppCenterDestination.BOOKINGS_CHECKOUT
                                                        "affiliate" -> activeCenter = AppCenterDestination.AFFILIATE
                                                        "app_store", "google_play" -> {
                                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.merry360x.mobile"))
                                                            this@MainActivity.startActivity(intent)
                                                        }
                                                        else -> {}
                                                    }
                                                }
                                            }
                                        )
                                    } else {
                                        AppCentersScreen(
                                            destination = center,
                                            onBackToProfile = {
                                                activeCenter = null
                                                activeCenterModule = null
                                            },
                                            api = api,
                                            userId = authState.userId,
                                            accessToken = authState.accessToken,
                                            roles = authState.roles,
                                            initialModule = activeCenterModule,
                                        )
                                    }
                                }
                            }
                        }
                    }
            }
            } // End of showAnimatedSplash else block
        }
    }
}
