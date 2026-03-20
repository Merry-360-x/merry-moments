import SwiftUI
import PhotosUI
#if canImport(Charts)
import Charts
#endif

enum AppCenterDestination: String, Identifiable {
    case backoffice
    case adminDashboard
    case financialDashboard
    case operationsDashboard
    case supportDashboard
    case hostStudio
    case affiliateCenter
    case supportLegal
    case helpCenter
    case supportChat
    case privacyPolicy
    case termsConditions
    case refundPolicy
    case safetyGuidelines
    case bookingsCheckout
    case websiteRoutes
    case favorites
    case tripCart
    case completeProfile
    case myBookings
    case userDashboard
    case paymentsPayouts
    case notificationsCenter
    case hostingSwitch
    case manageListings
    case hostReservations
    case travelStories

    var id: String { rawValue }

    var title: String {
        switch self {
        case .backoffice: return "Backoffice Center"
        case .adminDashboard: return "Admin Dashboard"
        case .financialDashboard: return "Financial Dashboard"
        case .operationsDashboard: return "Operations Dashboard"
        case .supportDashboard: return "Support Dashboard"
        case .hostStudio: return "Host Studio"
        case .affiliateCenter: return "Affiliate Center"
        case .supportLegal: return "Support & Legal"
        case .helpCenter: return "Help Center"
        case .supportChat: return "Let's Chat"
        case .privacyPolicy: return "Privacy Policy"
        case .termsConditions: return "Terms & Conditions"
        case .refundPolicy: return "Refund Policy"
        case .safetyGuidelines: return "Safety Guidelines"
        case .bookingsCheckout: return "Bookings & Checkout"
        case .websiteRoutes: return "Website Routes"
        case .favorites: return "Favorites"
        case .tripCart: return "Trip Cart"
        case .completeProfile: return "Complete Profile"
        case .myBookings: return "My Bookings"
        case .userDashboard: return "Dashboard"
        case .paymentsPayouts: return "Payments & Payouts"
        case .notificationsCenter: return "Notifications"
        case .hostingSwitch: return "Switch to Hosting"
        case .manageListings: return "Manage Listings"
        case .hostReservations: return "Your Reservations"
        case .travelStories: return "Travel Stories"
        }
    }
}

struct AppCentersView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    let destination: AppCenterDestination

    private var normalizedRoles: Set<String> {
        Set(session.roles.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
    }

    private func hasAnyRole(_ roles: [String]) -> Bool {
        roles.contains { normalizedRoles.contains($0) }
    }

    var body: some View {
        NavigationStack {
            switch destination {
            case .backoffice:
                if hasAnyRole(["admin", "financial_staff", "operations_staff", "customer_support"]) {
                    BackofficeCenterView()
                        .environmentObject(session)
                } else {
                    NativeAccessDeniedView(message: "You do not have access to Backoffice Center.")
                }
            case .adminDashboard:
                if hasAnyRole(["admin"]) {
                    NativeAdminOverviewView()
                        .navigationTitle("Admin Dashboard")
                        .navigationBarTitleDisplayMode(.inline)
                } else {
                    NativeAccessDeniedView(message: "Admin role required.")
                }
            case .financialDashboard:
                if hasAnyRole(["admin", "financial_staff"]) {
                    NativeFinancialSummaryView()
                        .navigationTitle("Financial Dashboard")
                        .navigationBarTitleDisplayMode(.inline)
                } else {
                    NativeAccessDeniedView(message: "Financial staff role required.")
                }
            case .operationsDashboard:
                if hasAnyRole(["admin", "operations_staff"]) {
                    NativeOperationsSummaryView()
                        .navigationTitle("Operations Dashboard")
                        .navigationBarTitleDisplayMode(.inline)
                } else {
                    NativeAccessDeniedView(message: "Operations staff role required.")
                }
            case .supportDashboard:
                if hasAnyRole(["admin", "customer_support"]) {
                    NativeSupportSummaryView()
                        .navigationTitle("Support Dashboard")
                        .navigationBarTitleDisplayMode(.inline)
                } else {
                    NativeAccessDeniedView(message: "Customer support role required.")
                }
            case .hostStudio:
                if hasAnyRole(["admin", "host"]) {
                    HostStudioCenterView()
                        .environmentObject(session)
                } else {
                    NativeAccessDeniedView(message: "Host role required.")
                }
            case .affiliateCenter:
                if hasAnyRole(["admin", "affiliate"]) {
                    AffiliateCenterView()
                        .environmentObject(session)
                } else {
                    NativeAccessDeniedView(message: "Affiliate role required.")
                }
            case .supportLegal:
                SupportLegalCenterView()
            case .helpCenter:
                NativeHelpCenterView()
                    .navigationTitle("Help Center")
                    .navigationBarTitleDisplayMode(.inline)
            case .supportChat:
                NativeSupportChatView()
                    .navigationTitle("Let's Chat")
                    .navigationBarTitleDisplayMode(.inline)
            case .privacyPolicy:
                NativeLegalPolicyView(
                    contentType: "privacy_policy",
                    fallbackTitle: "Privacy Policy",
                    fallbackSections: [
                        "We collect account, booking, payment, and device information needed to provide and secure Merry360x services.",
                        "Your data is used to manage bookings, customer support, fraud prevention, and legal compliance.",
                        "We do not sell your personal data. We only share data with required service providers such as payment processors and support systems.",
                        "You can request access, correction, or deletion of your data by contacting support@merry360x.com."
                    ]
                )
                .navigationBarTitleDisplayMode(.inline)
            case .termsConditions:
                NativeLegalPolicyView(
                    contentType: "terms_and_conditions",
                    fallbackTitle: "Terms and Conditions",
                    fallbackSections: [
                        "By using Merry360x, you agree to our platform terms, booking rules, and payment conditions.",
                        "Hosts are responsible for listing accuracy and service delivery. Guests are responsible for lawful and respectful platform use.",
                        "Cancellation and refund outcomes depend on the listing policy shown at booking time.",
                        "For disputes or account issues, contact support@merry360x.com or +250 796 214 719."
                    ]
                )
                .navigationBarTitleDisplayMode(.inline)
            case .refundPolicy:
                NativeLegalPolicyView(
                    contentType: "refund_policy",
                    fallbackTitle: "Refund & Cancellation Policy",
                    fallbackSections: [
                        "Refund policies vary by listing and are set by hosts. Always review the listing cancellation policy before booking.",
                        "Accommodation (Fair): cancel 7+ days before check-in for full refund, 2-6 days for 50%, within 48 hours no refund.",
                        "Tours (standard day tours): 72+ hours full refund (excluding platform fees), 48-72 hours 50%, less than 48 hours no refund.",
                        "Transport: 48+ hours full refund, 24-48 hours 50%, within 24 hours no refund.",
                        "Refund processing times: mobile money 1-3 business days, cards 5-10 business days, bank transfer 3-7 business days, PayPal 3-5 business days.",
                        "Contact support@merry360x.com for disputes or special circumstances such as host cancellation, safety issues, or verified emergencies."
                    ]
                )
                .navigationBarTitleDisplayMode(.inline)
            case .safetyGuidelines:
                NativeLegalPolicyView(
                    contentType: "safety_guidelines",
                    fallbackTitle: "Safety Guidelines & Tips",
                    fallbackSections: [
                        "General safety: verify host identity, read reviews, keep communication and payments inside Merry360x, and share your itinerary with trusted contacts.",
                        "Accommodation safety: check smoke detectors, locate exits, lock doors/windows, secure valuables, and report concerns immediately.",
                        "Tour/activity safety: follow guide instructions, wear required protective gear, stay hydrated, and disclose medical conditions to operators.",
                        "Transport safety: inspect vehicle safety features, verify documents, wear seatbelts, and avoid unfamiliar routes late at night.",
                        "Emergency contacts: Rwanda Police 112, Ambulance 912, Fire 111, Merry360x Support +250 796 214 719."
                    ]
                )
                .navigationBarTitleDisplayMode(.inline)
            case .bookingsCheckout:
                BookingsCheckoutCenterView()
            case .favorites:
                WishlistsView()
                    .navigationTitle("Favorites")
                    .navigationBarTitleDisplayMode(.inline)
            case .tripCart:
                TripCartView()
                    .navigationTitle("Trip Cart")
                    .navigationBarTitleDisplayMode(.inline)
            case .completeProfile:
                CompleteProfileView()
                    .navigationTitle("Complete Profile")
                    .navigationBarTitleDisplayMode(.inline)
            case .myBookings:
                MyBookingsView()
                    .navigationTitle("My Bookings")
                    .navigationBarTitleDisplayMode(.inline)
            case .userDashboard:
                UserDashboardView()
                    .navigationTitle("Dashboard")
                    .navigationBarTitleDisplayMode(.inline)
            case .websiteRoutes:
                NativeWebsiteRoutesView()
                    .navigationTitle("Website Routes")
                    .navigationBarTitleDisplayMode(.inline)
            case .paymentsPayouts:
                BookingsCheckoutCenterView()
                    .navigationTitle("Payments & Payouts")
                    .navigationBarTitleDisplayMode(.inline)
            case .notificationsCenter:
                NativeSimpleRouteView(
                    icon: "bell.badge",
                    title: "Notifications",
                    subtitle: "Manage reminders, booking updates, and system alerts from your profile."
                )
                .navigationTitle("Notifications")
                .navigationBarTitleDisplayMode(.inline)
            case .hostingSwitch:
                if hasAnyRole(["admin", "host"]) {
                    HostStudioCenterView()
                        .environmentObject(session)
                        .navigationTitle("Switch to Hosting")
                        .navigationBarTitleDisplayMode(.inline)
                } else {
                    NativeAccessDeniedView(message: "Host role required.")
                }
            case .manageListings:
                if hasAnyRole(["admin", "host"]) {
                    NativeHostDashboardDetailView()
                        .navigationTitle("Manage Listings")
                        .navigationBarTitleDisplayMode(.inline)
                } else {
                    NativeAccessDeniedView(message: "Host role required.")
                }
            case .hostReservations:
                if hasAnyRole(["admin", "host"]) {
                    MyBookingsView()
                        .navigationTitle("Your Reservations")
                        .navigationBarTitleDisplayMode(.inline)
                } else {
                    NativeAccessDeniedView(message: "Host role required.")
                }
            case .travelStories:
                NativeStoriesRouteView()
                    .navigationTitle("Travel Stories")
                    .navigationBarTitleDisplayMode(.inline)
            }
        }
    }
}

private struct NativeAccessDeniedView: View {
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "lock.shield")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(AppTheme.coral)
            Text("Access Restricted")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
            Text(message)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.appBackground)
    }
}

private struct NativeCompleteProfileCenterView: View {
    var body: some View {
        List {
            Section("Complete Your Profile") {
                Label("Add full name, phone, and bio", systemImage: "person.text.rectangle")
                Label("Upload a clear profile photo", systemImage: "camera")
                Label("Set language, region, and currency", systemImage: "globe")
                Label("Profile completion helps unlock host/affiliate flows", systemImage: "checkmark.seal")
            }

            Section("Tip") {
                Text("For editing details, open Personal Info from the Profile screen.")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Complete Profile")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct NativeWebsiteRoute: Identifiable, Hashable {
    enum Destination: Hashable {
        case home
        case wishlists
        case tripCart
        case booking
        case auth
        case stories
        case becomeHost
        case aboutPage
        case contactPage
        case hostStudio
        case adminDashboard
        case financialDashboard
        case operationsDashboard
        case supportDashboard
        case helpCenter
        case affiliateCenter
        case legalPrivacy
        case legalTerms
        case legalRefund
        case legalSafety
        case notFound
        case authCallback
        case tourDetails
        case propertyDetails
        case hostAbout
        case hostReviews
        case reviewToken
        case paymentPending
        case paymentFailed
        case paymentSuccess
        case cookiesPage
        case connectionTest
        case placeholder
        case accommodations
        case toursBrowse
        case transportBrowse
        case searchResults
        case myBookings
        case favoritesList
        case userDashboard
        case completeProfileForm
        case tokenReview
    }

    let path: String
    let title: String
    let group: String
    let destination: Destination
    let note: String?

    var id: String { path }
}

private struct NativeWebsiteRoutesView: View {
    private let groups: [String] = [
        "Core",
        "Authentication",
        "Explore",
        "Host",
        "Staff",
        "Booking",
        "Account",
        "Legal & Help",
        "Affiliate"
    ]

    private let routes: [NativeWebsiteRoute] = [
        .init(path: "/", title: "Home", group: "Core", destination: .home, note: nil),
        .init(path: "*", title: "Not Found", group: "Core", destination: .notFound, note: "Fallback for unknown routes."),

        .init(path: "/auth", title: "Auth", group: "Authentication", destination: .auth, note: "Open login/signup flow."),
        .init(path: "/auth/callback", title: "Auth Callback", group: "Authentication", destination: .authCallback, note: "Handled by OAuth deep-link callback."),
        .init(path: "/complete-profile", title: "Complete Profile", group: "Authentication", destination: .completeProfileForm, note: "Functional profile completion with name, phone, 18+ check."),
        .init(path: "/forgot-password", title: "Forgot Password", group: "Authentication", destination: .auth, note: "Password reset request screen."),
        .init(path: "/reset-password", title: "Reset Password", group: "Authentication", destination: .auth, note: "Password reset confirmation screen."),
        .init(path: "/login", title: "Login", group: "Authentication", destination: .auth, note: "Alias to auth mode login."),
        .init(path: "/signup", title: "Signup", group: "Authentication", destination: .auth, note: "Alias to auth mode signup."),

        .init(path: "/accommodations", title: "Accommodations", group: "Explore", destination: .accommodations, note: "Dedicated accommodations browse with filters."),
        .init(path: "/stays", title: "Stays", group: "Explore", destination: .accommodations, note: "Redirects to /accommodations."),
        .init(path: "/tours", title: "Tours", group: "Explore", destination: .toursBrowse, note: "Dedicated tours browse with category/duration filters."),
        .init(path: "/tours/:id", title: "Tour Details", group: "Explore", destination: .tourDetails, note: "Open from a selected tour card."),
        .init(path: "/search", title: "Search Results", group: "Explore", destination: .searchResults, note: "Unified search across properties, tours, transport."),
        .init(path: "/transport", title: "Transport", group: "Explore", destination: .transportBrowse, note: "Dedicated transport browse with categories."),
        .init(path: "/services", title: "Services", group: "Explore", destination: .home, note: "Redirects to home on web."),
        .init(path: "/stories", title: "Stories", group: "Explore", destination: .stories, note: "Travel stories timeline."),
        .init(path: "/create-story", title: "Create Story", group: "Explore", destination: .stories, note: "Host/admin story publishing form."),
        .init(path: "/properties/:id", title: "Property Details", group: "Explore", destination: .propertyDetails, note: "Open from an accommodation listing."),
        .init(path: "/hosts/:id", title: "Host About", group: "Explore", destination: .hostAbout, note: "Host profile overview screen."),
        .init(path: "/hosts/:id/reviews", title: "Host Reviews", group: "Explore", destination: .hostReviews, note: "Host public review timeline."),
        .init(path: "/review/:token", title: "Review Token", group: "Explore", destination: .reviewToken, note: "Post-booking review submission entry."),

        .init(path: "/host-dashboard", title: "Host Dashboard", group: "Host", destination: .hostStudio, note: nil),
        .init(path: "/host", title: "Host Alias", group: "Host", destination: .hostStudio, note: "Redirects to /host-dashboard."),
        .init(path: "/become-host", title: "Become Host", group: "Host", destination: .becomeHost, note: "Host onboarding form."),
        .init(path: "/create-tour", title: "Create Tour", group: "Host", destination: .hostStudio, note: "Available in Host Studio."),
        .init(path: "/create-tour-package", title: "Create Tour Package", group: "Host", destination: .hostStudio, note: "Available in Host Studio."),
        .init(path: "/create-transport", title: "Create Transport", group: "Host", destination: .hostStudio, note: "Available in Host Studio."),
        .init(path: "/create-car-rental", title: "Create Car Rental", group: "Host", destination: .hostStudio, note: "Available in Host Studio."),
        .init(path: "/create-airport-transfer", title: "Create Airport Transfer", group: "Host", destination: .hostStudio, note: "Available in Host Studio."),

        .init(path: "/admin", title: "Admin Dashboard", group: "Staff", destination: .adminDashboard, note: nil),
        .init(path: "/admin/roles", title: "Admin Roles", group: "Staff", destination: .adminDashboard, note: "Shown under admin modules."),
        .init(path: "/admin/integrations", title: "Admin Integrations", group: "Staff", destination: .adminDashboard, note: "Shown under admin modules."),
        .init(path: "/financial-dashboard", title: "Financial Dashboard", group: "Staff", destination: .financialDashboard, note: nil),
        .init(path: "/operations-dashboard", title: "Operations Dashboard", group: "Staff", destination: .operationsDashboard, note: nil),
        .init(path: "/customer-support-dashboard", title: "Customer Support Dashboard", group: "Staff", destination: .supportDashboard, note: nil),
        .init(path: "/support-dashboard", title: "Support Dashboard Alias", group: "Staff", destination: .supportDashboard, note: "Redirects to /customer-support-dashboard."),
        .init(path: "/bookings", title: "Backoffice Bookings", group: "Staff", destination: .operationsDashboard, note: "Managed through operations/support dashboards."),

        .init(path: "/trip-cart", title: "Trip Cart", group: "Booking", destination: .tripCart, note: nil),
        .init(path: "/checkout", title: "Checkout", group: "Booking", destination: .booking, note: nil),
        .init(path: "/payment-pending", title: "Payment Pending", group: "Booking", destination: .paymentPending, note: "Payment status sheet state."),
        .init(path: "/payment-failed", title: "Payment Failed", group: "Booking", destination: .paymentFailed, note: "Payment status sheet state."),
        .init(path: "/booking-success", title: "Booking Success", group: "Booking", destination: .paymentSuccess, note: "Payment status sheet state."),
        .init(path: "/my-bookings", title: "My Bookings", group: "Booking", destination: .myBookings, note: "Full booking management with cancel, review, date change, refund."),

        .init(path: "/favorites", title: "Favorites", group: "Account", destination: .favoritesList, note: "Full favorites list with remove action."),
        .init(path: "/dashboard", title: "User Dashboard", group: "Account", destination: .userDashboard, note: "Full profile editing, stats, quick links."),
        .init(path: "/dashboard/watchlist", title: "Dashboard Watchlist", group: "Account", destination: .wishlists, note: "Redirects to /favorites."),
        .init(path: "/dashboard/trip-cart", title: "Dashboard Trip Cart", group: "Account", destination: .tripCart, note: "Redirects to /trip-cart."),
        .init(path: "/profile", title: "Profile", group: "Account", destination: .tripCart, note: "Profile/account surface in mobile tab nav."),

        .init(path: "/about", title: "About", group: "Legal & Help", destination: .aboutPage, note: "Company overview page."),
        .init(path: "/contact", title: "Contact", group: "Legal & Help", destination: .contactPage, note: "Support channels and contact info."),
        .init(path: "/help", title: "Help", group: "Legal & Help", destination: .helpCenter, note: "Redirects to /help-center."),
        .init(path: "/help-center", title: "Help Center", group: "Legal & Help", destination: .helpCenter, note: nil),
        .init(path: "/safety", title: "Safety", group: "Legal & Help", destination: .legalSafety, note: nil),
        .init(path: "/safety-guidelines", title: "Safety Guidelines", group: "Legal & Help", destination: .legalSafety, note: nil),
        .init(path: "/privacy", title: "Privacy", group: "Legal & Help", destination: .legalPrivacy, note: nil),
        .init(path: "/privacy-policy", title: "Privacy Policy", group: "Legal & Help", destination: .legalPrivacy, note: nil),
        .init(path: "/cookies", title: "Cookies", group: "Legal & Help", destination: .cookiesPage, note: "Cookie policy and consent details."),
        .init(path: "/terms", title: "Terms", group: "Legal & Help", destination: .legalTerms, note: nil),
        .init(path: "/terms-and-conditions", title: "Terms and Conditions", group: "Legal & Help", destination: .legalTerms, note: nil),
        .init(path: "/refund-policy", title: "Refund Policy", group: "Legal & Help", destination: .legalRefund, note: nil),
        .init(path: "/connection-test", title: "Connection Test", group: "Legal & Help", destination: .connectionTest, note: "Dev diagnostics page."),

        .init(path: "/affiliate-signup", title: "Affiliate Signup", group: "Affiliate", destination: .affiliateCenter, note: "Signup and onboarding live in affiliate center."),
        .init(path: "/affiliate-dashboard", title: "Affiliate Dashboard", group: "Affiliate", destination: .affiliateCenter, note: nil),
        .init(path: "/affiliate", title: "Affiliate Portal", group: "Affiliate", destination: .affiliateCenter, note: nil)
    ]

    var body: some View {
        List {
            Section {
                Text("Every website route from src/App.tsx is mapped below. Tap a route to open the closest native screen.")
                    .font(.footnote)
                    .foregroundColor(AppTheme.textSecondary)
            }

            ForEach(groups, id: \.self) { group in
                let items = routes.filter { $0.group == group }
                if !items.isEmpty {
                    Section(group) {
                        ForEach(items) { route in
                            NavigationLink {
                                destinationView(for: route)
                                    .navigationTitle(route.path)
                                    .navigationBarTitleDisplayMode(.inline)
                            } label: {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(route.path)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Text(route.title)
                                        .font(.system(size: 13))
                                        .foregroundColor(AppTheme.textSecondary)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    @ViewBuilder
    private func destinationView(for route: NativeWebsiteRoute) -> some View {
        switch route.destination {
        case .home:
            HomeView()
        case .wishlists:
            WishlistsView()
        case .tripCart:
            TripCartView()
        case .booking:
            BookingView()
        case .auth:
            NativeAuthRouteView(route: route)
        case .stories:
            NativeStoriesRouteView()
        case .becomeHost:
            NativeBecomeHostRouteView()
        case .aboutPage:
            NativeAboutRouteView()
        case .contactPage:
            NativeContactRouteView()
        case .hostStudio:
            HostStudioCenterView()
        case .adminDashboard:
            NativeAdminOverviewView()
        case .financialDashboard:
            NativeFinancialSummaryView()
        case .operationsDashboard:
            NativeOperationsSummaryView()
        case .supportDashboard:
            NativeSupportSummaryView()
        case .helpCenter:
            NativeHelpCenterView()
        case .affiliateCenter:
            AffiliateCenterView()
        case .legalPrivacy:
            NativeLegalPolicyView(
                contentType: "privacy_policy",
                fallbackTitle: "Privacy Policy",
                fallbackSections: [
                    "We collect only the data required to operate accounts, bookings, and support.",
                    "Data access and deletion requests can be sent to support@merry360x.com."
                ]
            )
        case .legalTerms:
            NativeLegalPolicyView(
                contentType: "terms_and_conditions",
                fallbackTitle: "Terms and Conditions",
                fallbackSections: [
                    "Use of Merry360x is subject to platform, booking, and payment terms.",
                    "Host and guest responsibilities follow the shared web policy model."
                ]
            )
        case .legalRefund:
            NativeLegalPolicyView(
                contentType: "refund_policy",
                fallbackTitle: "Refund Policy",
                fallbackSections: [
                    "Refund outcomes depend on listing policy and cancellation timing.",
                    "Processing timelines vary by payment channel."
                ]
            )
        case .legalSafety:
            NativeLegalPolicyView(
                contentType: "safety_guidelines",
                fallbackTitle: "Safety Guidelines",
                fallbackSections: [
                    "Use in-app communication/payment channels and verify listing details.",
                    "Contact emergency services or support when urgent assistance is needed."
                ]
            )
        case .notFound:
            NativeSimpleRouteView(
                icon: "questionmark.square.dashed",
                title: "Page Not Found",
                subtitle: "This route does not exist. Use the route map to open a valid page."
            )
        case .authCallback:
            NativeSimpleRouteView(
                icon: "link.badge.plus",
                title: "Auth Callback",
                subtitle: "OAuth callback is handled automatically when the app receives the deep link."
            )
        case .tourDetails:
            NativeSimpleRouteView(
                icon: "figure.walk",
                title: "Tour Details",
                subtitle: "Open any tour card from Explore to view full native details."
            )
        case .propertyDetails:
            NativeSimpleRouteView(
                icon: "house",
                title: "Property Details",
                subtitle: "Open any accommodation card from Explore to view full native listing details."
            )
        case .hostAbout:
            NativeSimpleRouteView(
                icon: "person.crop.circle",
                title: "Host About",
                subtitle: "Host public profile route is registered and ready for richer host profile details."
            )
        case .hostReviews:
            NativeSimpleRouteView(
                icon: "star.bubble",
                title: "Host Reviews",
                subtitle: "Host review timeline route is available as a native screen destination."
            )
        case .reviewToken:
            TokenReviewView(token: route.path.components(separatedBy: "/").last ?? "")
        case .paymentPending:
            NativePaymentStateRouteView(
                icon: "clock.fill",
                title: "Payment Pending",
                subtitle: "Your payment is being processed."
            )
        case .paymentFailed:
            NativePaymentStateRouteView(
                icon: "xmark.circle.fill",
                title: "Payment Failed",
                subtitle: "Payment did not complete. Please try again."
            )
        case .paymentSuccess:
            NativePaymentStateRouteView(
                icon: "checkmark.circle.fill",
                title: "Booking Success",
                subtitle: "Your booking is confirmed."
            )
        case .cookiesPage:
            NativeSimpleRouteView(
                icon: "hand.raised.app",
                title: "Cookies Policy",
                subtitle: "Cookies are used for session continuity, analytics, and platform security controls."
            )
        case .connectionTest:
            NativeSimpleRouteView(
                icon: "network",
                title: "Connection Test",
                subtitle: "Use this route as a diagnostics endpoint for mobile connectivity checks."
            )
        case .placeholder:
            NativeRoutePlaceholderView(route: route)
        case .accommodations:
            AccommodationsBrowseView()
        case .toursBrowse:
            ToursBrowseView()
        case .transportBrowse:
            TransportBrowseView()
        case .searchResults:
            SearchResultsView(initialQuery: "")
        case .myBookings:
            MyBookingsView()
        case .favoritesList:
            FavoritesListView()
        case .userDashboard:
            UserDashboardView()
        case .completeProfileForm:
            CompleteProfileView()
        case .tokenReview:
            TokenReviewView(token: "")
        }
    }
}

private struct NativeAuthRouteView: View {
    let route: NativeWebsiteRoute

    var body: some View {
        VStack(spacing: 10) {
            if route.path == "/signup" {
                Text("Use the Create account tab to sign up.")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
            } else if route.path == "/forgot-password" || route.path == "/reset-password" {
                Text("Password reset is handled in this native auth flow.")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
            }

            LoginView()
        }
        .background(AppTheme.appBackground)
    }
}

private struct NativeStoriesRouteView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var showCreateStory = false

    private var canCreateStory: Bool {
        let roles = Set(session.roles.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
        return roles.contains("host") || roles.contains("admin")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Travel Stories")
                        .font(.title3.weight(.bold))
                        .foregroundColor(.white)
                    Text("Inspiration from real trips across Rwanda and beyond.")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.92))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(
                    LinearGradient(
                        colors: [AppTheme.coral, Color.orange.opacity(0.85)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                VStack(alignment: .leading, spacing: 12) {
                    Text("What you will find")
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)

                    storyFeatureRow(icon: "photo.stack.fill", title: "Daily highlights", subtitle: "Fresh photos and stories from recent bookings")
                    storyFeatureRow(icon: "map.fill", title: "Local tips", subtitle: "Routes, timing, and practical notes from travelers")
                    storyFeatureRow(icon: "sparkles", title: "Host picks", subtitle: "Best experiences recommended by trusted hosts")
                }
                .padding(14)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                VStack(alignment: .leading, spacing: 8) {
                    Text("Before you post")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                    Text("Keep stories useful and authentic: include location details, budget hints, and respectful photos.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                if canCreateStory {
                    Button {
                        showCreateStory = true
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "square.and.pencil")
                                .font(.subheadline.weight(.semibold))
                            Text("Create Story")
                                .font(.headline)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppTheme.coral)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                } else {
                    Text("Story publishing is currently available for hosts and admins.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 2)
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .sheet(isPresented: $showCreateStory) {
            NavigationStack {
                NativeCreateStoryView()
                    .environmentObject(session)
                    .navigationTitle("Create Story")
                    .navigationBarTitleDisplayMode(.inline)
            }
        }
    }

    private func storyFeatureRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.coral)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
        }
    }
}

private struct NativeBecomeHostRouteView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var becomingHost = false
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                centerCard(title: "Become a Host", subtitle: "Native onboarding route equivalent to /become-host.")

                NativeInfoView(
                    title: "Host Requirements",
                    subtitle: "Submitting this action creates a host application with the shared backend flow.",
                    bullets: [
                        "Complete your profile",
                        "Keep listing details accurate",
                        "Follow host quality and safety rules"
                    ]
                )

                Button(becomingHost ? "Submitting..." : "Apply to Become Host") {
                    Task { await applyToBecomeHost() }
                }
                .disabled(becomingHost || !session.isAuthenticated)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundColor(.white)
                .background(AppTheme.coral)
                .clipShape(Capsule())
                .padding(.horizontal, 16)

                if let message {
                    Text(message)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .padding(.horizontal, 16)
                }
            }
            .padding(.vertical, 12)
        }
        .background(AppTheme.appBackground)
    }

    private func applyToBecomeHost() async {
        guard let service else {
            message = "Supabase is not configured."
            return
        }
        guard let userId = session.userId else {
            message = "Please sign in first."
            return
        }

        becomingHost = true
        defer { becomingHost = false }

        do {
            let payload: [String: Any] = [
                "status": "approved",
                "applicant_type": "individual",
                "service_types": [],
                "profile_complete": false
            ]
            try await service.becomeHost(userId: userId, payload: payload)
            await session.refreshRoles()
            message = "Host access granted."
        } catch {
            message = "Could not complete host onboarding: \(error.localizedDescription)"
        }
    }
}

private struct NativeAboutRouteView: View {
    var body: some View {
        NativeInfoView(
            title: "About Merry360x",
            subtitle: "Merry360x helps travelers book accommodations, tours, and transport in one platform.",
            bullets: [
                "Web route parity: /about",
                "Native-first mobile experience",
                "Shared backend and policy contracts"
            ]
        )
    }
}

private struct NativeContactRouteView: View {
    var body: some View {
        NativeInfoView(
            title: "Contact",
            subtitle: "Get support quickly with your booking ID and issue details.",
            bullets: [
                "Email: support@merry360x.com",
                "Phone: +250 796 214 719",
                "Route parity: /contact"
            ]
        )
    }
}

private struct NativeSimpleRouteView: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 42, weight: .medium))
                .foregroundColor(AppTheme.coral)

            Text(title)
                .font(.title3.weight(.semibold))
                .multilineTextAlignment(.center)

            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
        .background(AppTheme.appBackground)
    }
}

private struct NativePaymentStateRouteView: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(AppTheme.coral)
            Text(title)
                .font(.title3.bold())
            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.appBackground)
    }
}

private struct NativeRoutePlaceholderView: View {
    let route: NativeWebsiteRoute

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "rectangle.stack.badge.person.crop")
                .font(.system(size: 42, weight: .medium))
                .foregroundColor(AppTheme.coral)

            Text(route.title)
                .font(.title3.weight(.semibold))
                .multilineTextAlignment(.center)

            Text(route.note ?? "This route is registered for web parity and can be implemented as a fully native screen next.")
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)

            Text("Path: \(route.path)")
                .font(.footnote.monospaced())
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
        .background(AppTheme.appBackground)
    }
}

private struct BackofficeCenterView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var tab = 0
    @State private var selectedModule: BackofficeModule?

    private enum BackofficeModule: String, Identifiable, CaseIterable {
        case adminOverview
        case financialSummary
        case operationsSummary
        case supportSummary
        case roles
        case integrations

        var id: String { rawValue }

        var title: String {
            switch self {
            case .adminOverview: return "Admin Overview"
            case .financialSummary: return "Financial Summary"
            case .operationsSummary: return "Operations Summary"
            case .supportSummary: return "Support Summary"
            case .roles: return "Admin Roles"
            case .integrations: return "Admin Integrations"
            }
        }
    }

    private var normalizedRoles: Set<String> {
        Set(session.roles.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
    }

    private var dashboardModules: [BackofficeModule] {
        if normalizedRoles.contains("admin") {
            return [.adminOverview, .financialSummary, .operationsSummary, .supportSummary]
        }
        var result: [BackofficeModule] = []
        if normalizedRoles.contains("financial_staff") { result.append(.financialSummary) }
        if normalizedRoles.contains("operations_staff") { result.append(.operationsSummary) }
        if normalizedRoles.contains("customer_support") { result.append(.supportSummary) }
        return result
    }

    private var adminControlModules: [BackofficeModule] {
        normalizedRoles.contains("admin") ? [.roles, .integrations] : []
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                Picker("Backoffice", selection: $tab) {
                    Text("Dashboards").tag(0)
                    Text("Roles/Integrations").tag(1)
                }
                .pickerStyle(.segmented)

                if tab == 0 {
                    centerCard(title: "Dashboards", subtitle: "Native backoffice surface for admin + staff workflows")
                    if dashboardModules.isEmpty {
                        centerCard(title: "No modules available", subtitle: "Your role has no dashboard modules in this center.")
                    } else {
                        moduleList(items: dashboardModules.map(\.title)) { title in
                            selectedModule = dashboardModules.first(where: { $0.title == title })
                        }
                    }
                } else {
                    centerCard(title: "Admin Controls", subtitle: "Native role and integration management modules")
                    if adminControlModules.isEmpty {
                        centerCard(title: "Admin only", subtitle: "Role and integration controls require admin access.")
                    } else {
                        moduleList(items: adminControlModules.map(\.title)) { title in
                            selectedModule = adminControlModules.first(where: { $0.title == title })
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Backoffice Center")
        .sheet(item: $selectedModule) { module in
            NavigationStack {
                switch module {
                case .adminOverview:
                    NativeAdminOverviewView()
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .financialSummary:
                    NativeFinancialSummaryView()
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .operationsSummary:
                    NativeOperationsSummaryView()
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .supportSummary:
                    NativeSupportSummaryView()
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .roles:
                    NativeInfoView(
                        title: "Admin Roles",
                        subtitle: "Role and permission updates are reflected from the shared backend.",
                        bullets: [
                            "Admin: full control",
                            "Financial Staff: revenue + payout operations",
                            "Operations Staff: listing + workflow operations",
                            "Customer Support: tickets + incidents"
                        ]
                    )
                    .navigationTitle(module.title)
                    .navigationBarTitleDisplayMode(.inline)
                case .integrations:
                    NativeInfoView(
                        title: "Admin Integrations",
                        subtitle: "Payment and communication integrations use the same APIs as web.",
                        bullets: [
                            "Flutterwave payments",
                            "PawaPay payouts",
                            "Booking notifications",
                            "Calendar sync"
                        ]
                    )
                    .navigationTitle(module.title)
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
    }
}

private struct HostStudioCenterView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var model = HostStudioCenterViewModel()
    @State private var tab = 0
    @State private var selectedModule: HostStudioModule?

    private enum HostStudioModule: String, Identifiable, CaseIterable {
        case hostDashboard
        case bookings
        case hostReviews
        case financialReports
        case payoutRequests
        case payoutHistory
        case createProperty
        case createRoom
        case createTour
        case createTourPackage
        case createTransport
        case createCarRental
        case createAirportTransfer
        case createStory

        var id: String { rawValue }

        var title: String {
            switch self {
            case .hostDashboard: return "Host Dashboard"
            case .bookings: return "Bookings"
            case .hostReviews: return "Host Reviews"
            case .financialReports: return "Financial Reports"
            case .payoutRequests: return "Payout Requests"
            case .payoutHistory: return "Payout History"
            case .createProperty: return "Create Property"
            case .createRoom: return "Create Room"
            case .createTour: return "Create Tour"
            case .createTourPackage: return "Create Tour Package"
            case .createTransport: return "Create Transport"
            case .createCarRental: return "Create Car Rental"
            case .createAirportTransfer: return "Create Airport Transfer"
            case .createStory: return "Create Story"
            }
        }
    }

    var body: some View {
        if !normalizedRoles.contains("host") && !normalizedRoles.contains("admin") {
            NativeAccessDeniedView(message: "Host role required.")
        } else {
        ScrollView {
            VStack(spacing: 14) {
                centerCard(title: "Host Studio", subtitle: "Manage listings, bookings, payouts, and creation flows from one place")

                Picker("Host", selection: $tab) {
                    Text("Overview").tag(0)
                    Text("Financial").tag(1)
                    Text("Create").tag(2)
                }
                .pickerStyle(.segmented)

                if tab == 0 {
                    centerCard(title: "Host Overview", subtitle: "Track your operations and jump straight into daily tasks")

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        DashboardStatTile(title: "Listings", value: "\(model.propertiesCount)", caption: "Published and draft")
                        DashboardStatTile(title: "Bookings", value: "\(model.bookingsCount)", caption: "All reservations")
                        DashboardStatTile(title: "Payouts", value: "\(model.payoutsCount)", caption: "Request records")
                        DashboardStatTile(title: "Action", value: "Open", caption: "Manage your host tasks")
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Quick actions")
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)

                        HStack(spacing: 10) {
                            hostQuickActionButton(title: "Manage Listings", icon: "house") {
                                selectedModule = .hostDashboard
                            }
                            hostQuickActionButton(title: "Bookings", icon: "calendar") {
                                selectedModule = .bookings
                            }
                        }

                        HStack(spacing: 10) {
                            hostQuickActionButton(title: "Host Reviews", icon: "star.bubble") {
                                selectedModule = .hostReviews
                            }
                            hostQuickActionButton(title: "Request Payout", icon: "banknote") {
                                selectedModule = .payoutRequests
                            }
                        }
                    }
                    .padding(14)
                    .background(AppTheme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                } else if tab == 1 {
                    centerCard(title: "Financial", subtitle: "Review revenue and submit payouts with fewer steps")
                    metricRow(label: "Payout Records", value: "\(model.payoutsCount)")

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Financial tools")
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)

                        moduleList(items: [
                            HostStudioModule.financialReports.title,
                            HostStudioModule.payoutRequests.title,
                            HostStudioModule.payoutHistory.title,
                        ]) { title in
                            selectedModule = HostStudioModule.allCases.first(where: { $0.title == title })
                        }
                    }
                } else {
                    centerCard(title: "Creation Flows", subtitle: "Create listings and content using the same backend contracts as web")

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Stays & Experiences")
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                        moduleList(items: [
                            HostStudioModule.createProperty.title,
                            HostStudioModule.createRoom.title,
                            HostStudioModule.createTour.title,
                            HostStudioModule.createTourPackage.title,
                        ]) { title in
                            selectedModule = HostStudioModule.allCases.first(where: { $0.title == title })
                        }

                        Text("Transport")
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                        moduleList(items: [
                            HostStudioModule.createTransport.title,
                            HostStudioModule.createCarRental.title,
                            HostStudioModule.createAirportTransfer.title,
                        ]) { title in
                            selectedModule = HostStudioModule.allCases.first(where: { $0.title == title })
                        }

                        Text("Community")
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                        moduleList(items: [HostStudioModule.createStory.title]) { title in
                            selectedModule = HostStudioModule.allCases.first(where: { $0.title == title })
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Host Studio")
        .sheet(item: $selectedModule) { module in
            NavigationStack {
                switch module {
                case .bookings:
                    MyBookingsView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .createStory:
                    NativeCreateStoryView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .createProperty:
                    NativeCreatePropertyView(listingType: "property")
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .createRoom:
                    NativeCreatePropertyView(listingType: "room")
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .createTour:
                    NativeCreateTourView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .createTourPackage:
                    NativeCreateTourPackageView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .createTransport:
                    NativeCreateTransportVehicleView(serviceType: "transport")
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .createCarRental:
                    NativeCreateTransportVehicleView(serviceType: "car_rental")
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .createAirportTransfer:
                    NativeCreateAirportTransferView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .hostDashboard:
                    NativeHostDashboardDetailView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .hostReviews:
                    NativeHostReviewsView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .financialReports:
                    NativeHostFinancialReportsView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .payoutRequests:
                    NativeHostPayoutRequestView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .payoutHistory:
                    NativeHostPayoutHistoryView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
        .task {
            guard let userId = session.userId else { return }
            await model.load(hostId: userId)
        }
        }
    }

    private var normalizedRoles: Set<String> {
        Set(session.roles.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
    }

    @ViewBuilder
    private func hostQuickActionButton(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.coral)
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

private struct AffiliateCenterView: View {
    @EnvironmentObject private var session: AppSessionViewModel

    var body: some View {
        if !normalizedRoles.contains("affiliate") && !normalizedRoles.contains("admin") {
            NativeAccessDeniedView(message: "Affiliate role required.")
        } else {
        ScrollView {
            VStack(spacing: 14) {
                centerCard(title: "Affiliate", subtitle: "Native affiliate signup, dashboard and portal modules")
                NativeInfoView(
                    title: "Affiliate Center",
                    subtitle: "Affiliate workflows are handled natively and synced to the same backend.",
                    bullets: [
                        "Affiliate signup",
                        "Affiliate dashboard metrics",
                        "Referral tracking"
                    ]
                )
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Affiliate Center")
        }
    }

    private var normalizedRoles: Set<String> {
        Set(session.roles.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
    }
}

private struct SupportLegalCenterView: View {
    @State private var selectedModule: SupportLegalModule?

    private enum SupportLegalModule: String, Identifiable, CaseIterable {
        case supportCenter
        case helpCenter
        case contact
        case safety
        case privacy
        case terms
        case refund
        case about

        var id: String { rawValue }

        var title: String {
            switch self {
            case .supportCenter: return "Support Center"
            case .helpCenter: return "Help Center"
            case .contact: return "Contact"
            case .safety: return "Safety Guidelines"
            case .privacy: return "Privacy Policy"
            case .terms: return "Terms & Conditions"
            case .refund: return "Refund Policy"
            case .about: return "About"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                centerCard(title: "Support", subtitle: "Native support center and help operations")
                moduleList(items: [
                    SupportLegalModule.supportCenter.title,
                    SupportLegalModule.helpCenter.title,
                    SupportLegalModule.contact.title,
                    SupportLegalModule.safety.title,
                ]) { title in
                    selectedModule = SupportLegalModule.allCases.first(where: { $0.title == title })
                }

                centerCard(title: "Legal", subtitle: "Native legal/info page coverage")
                moduleList(items: [
                    SupportLegalModule.privacy.title,
                    SupportLegalModule.terms.title,
                    SupportLegalModule.refund.title,
                    SupportLegalModule.about.title,
                ]) { title in
                    selectedModule = SupportLegalModule.allCases.first(where: { $0.title == title })
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Support & Legal")
        .sheet(item: $selectedModule) { module in
            NavigationStack {
                switch module {
                case .helpCenter:
                    NativeHelpCenterView()
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .contact:
                    NativeInfoView(
                        title: "Contact",
                        subtitle: "Reach support with complete booking details for quick help.",
                        bullets: [
                            "Phone: +250 796 214 719",
                            "Email: support@merry360x.com",
                            "WhatsApp available"
                        ]
                    )
                    .navigationTitle(module.title)
                    .navigationBarTitleDisplayMode(.inline)
                case .supportCenter, .safety, .privacy, .terms, .refund, .about:
                    NativeInfoView(
                        title: module.title,
                        subtitle: "Content and policy behavior is aligned with website definitions.",
                        bullets: [
                            "Same policy intent",
                            "Same support channels",
                            "Same account-level visibility"
                        ]
                    )
                    .navigationTitle(module.title)
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
    }
}

private struct BookingsCheckoutCenterView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var selectedModule: BookingCheckoutModule?

    private enum BookingCheckoutModule: String, Identifiable, CaseIterable {
        case tripCart
        case myBookings
        case checkout
        case pending
        case failed
        case success

        var id: String { rawValue }

        var title: String {
            switch self {
            case .tripCart: return "Trip Cart"
            case .myBookings: return "My Bookings"
            case .checkout: return "Checkout"
            case .pending: return "Payment Pending"
            case .failed: return "Payment Failed"
            case .success: return "Booking Success"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                centerCard(title: "Bookings", subtitle: "Trip cart and my-bookings lifecycle managed in-app")
                moduleList(items: [
                    BookingCheckoutModule.tripCart.title,
                    BookingCheckoutModule.myBookings.title,
                ]) { title in
                    selectedModule = BookingCheckoutModule.allCases.first(where: { $0.title == title })
                }

                centerCard(title: "Checkout", subtitle: "Native checkout + payment status pages")
                moduleList(items: [
                    BookingCheckoutModule.checkout.title,
                    BookingCheckoutModule.pending.title,
                    BookingCheckoutModule.failed.title,
                    BookingCheckoutModule.success.title,
                ]) { title in
                    selectedModule = BookingCheckoutModule.allCases.first(where: { $0.title == title })
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Bookings & Checkout")
        .sheet(item: $selectedModule) { module in
            NavigationStack {
                switch module {
                case .tripCart:
                    TripCartView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .myBookings:
                    MyBookingsView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .checkout:
                    NativeCheckoutFlowView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .pending:
                    NativePaymentStateView(title: "Payment Pending", subtitle: "Your payment is still processing.", tone: .orange)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .failed:
                    NativePaymentStateView(title: "Payment Failed", subtitle: "Payment did not complete. Try another method.", tone: .red)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .success:
                    NativePaymentStateView(title: "Booking Success", subtitle: "Payment succeeded and your booking is confirmed.", tone: .green)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
    }
}

@MainActor
private final class HostStudioCenterViewModel: ObservableObject {
    @Published var propertiesCount = 0
    @Published var bookingsCount = 0
    @Published var payoutsCount = 0

    private let service = SupabaseService()

    func load(hostId: String) async {
        guard let service else { return }
        do {
            async let properties = service.fetchHostProperties(hostId: hostId)
            async let bookings = service.fetchHostBookings(hostId: hostId)
            async let payouts = service.fetchHostPayouts(hostId: hostId)

            propertiesCount = try await properties.count
            bookingsCount = try await bookings.count
            payoutsCount = try await payouts.count
        } catch {
            propertiesCount = 0
            bookingsCount = 0
            payoutsCount = 0
        }
    }
}

private func centerCard(title: String, subtitle: String) -> some View {
    VStack(alignment: .leading, spacing: 8) {
        Text(title)
            .font(.headline)
            .foregroundColor(AppTheme.textPrimary)
        Text(subtitle)
            .font(.caption)
            .foregroundColor(AppTheme.textSecondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(14)
    .background(AppTheme.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
}

private func moduleList(items: [String], onTap: @escaping (String) -> Void) -> some View {
    VStack(spacing: 0) {
        ForEach(items, id: \.self) { item in
            HStack {
                Text(item)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
            .onTapGesture {
                onTap(item)
            }

            Divider()
                .padding(.leading, 14)
        }
    }
    .background(AppTheme.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
}

private func metricRow(label: String, value: String) -> some View {
    HStack {
        Text(label)
            .font(.subheadline)
            .foregroundColor(AppTheme.textSecondary)
        Spacer()
        Text(value)
            .font(.subheadline.weight(.semibold))
            .foregroundColor(AppTheme.textPrimary)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
    .background(AppTheme.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
}

private struct NativeInfoView: View {
    let title: String
    let subtitle: String
    let bullets: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            centerCard(title: title, subtitle: subtitle)
            VStack(alignment: .leading, spacing: 8) {
                ForEach(bullets, id: \.self) { bullet in
                    Text("- \(bullet)")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textPrimary)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .padding(16)
        .background(AppTheme.appBackground)
    }
}

private struct DashboardTabPill: View {
    let title: String
    let count: Int?
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(selected ? .white : AppTheme.textPrimary)
                if let count, count > 0 {
                    Text("\(count)")
                        .font(.caption2.weight(.bold))
                        .foregroundColor(selected ? .white : .red)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(selected ? Color.white.opacity(0.2) : Color.red.opacity(0.12))
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(selected ? AppTheme.coral : Color.white)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

private struct DashboardStatTile: View {
    let title: String
    let value: String
    let caption: String
    var icon: String? = nil
    var accentColor: Color = AppTheme.coral

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let icon {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(accentColor.opacity(0.12))
                        .frame(width: 34, height: 34)
                    Image(systemName: icon)
                        .font(.system(size: 15))
                        .foregroundColor(accentColor)
                }
            }
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundColor(AppTheme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundColor(AppTheme.textPrimary)
            Text(caption)
                .font(.caption2)
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(accentColor.opacity(0.12), lineWidth: 1)
        )
    }
}

private struct DashboardSectionCard: View {
    let title: String
    let subtitle: String
    let columns: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            Text(subtitle)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(columns, id: \.self) { column in
                        Text(column)
                            .font(.caption2.weight(.semibold))
                            .foregroundColor(AppTheme.textSecondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(AppTheme.appBackground)
                            .clipShape(Capsule())
                    }
                }
            }

            Text("Native section mirrored from website dashboard layout.")
                .font(.caption2)
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private extension View {
    func dashboardActionStyle(prominent: Bool) -> some View {
        self
            .font(.caption.weight(.semibold))
            .foregroundColor(prominent ? .white : AppTheme.textPrimary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(prominent ? AppTheme.coral : AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .buttonStyle(.plain)
    }
}

private struct NativeAdminOverviewView: View {
    private struct RevenueTrendPoint: Identifiable {
        let id: String
        let label: String
        let amount: Double
    }

    private struct TrafficTrendPoint: Identifiable {
        let id: String
        let label: String
        let pageViews: Double
        let failedAttempts: Double
    }

    private struct BreakdownRow: Identifiable {
        let id: String
        let label: String
        let count: Int
        let share: Double
    }

    private struct AdminAdvancedAnalytics {
        let confirmationRate: Double
        let cancellationRate: Double
        let avgLeadDays: Double
        let repeatGuestRate: Double
        let bookingTypeBreakdown: [BreakdownRow]
        let paymentMethodBreakdown: [BreakdownRow]

        static let empty = AdminAdvancedAnalytics(
            confirmationRate: 0,
            cancellationRate: 0,
            avgLeadDays: 0,
            repeatGuestRate: 0,
            bookingTypeBreakdown: [],
            paymentMethodBreakdown: []
        )
    }

    private enum TrafficRange: String, CaseIterable {
        case oneHour = "1h"
        case day = "24h"
        case week = "7d"
        case month = "30d"

        var title: String { rawValue }
    }

    private enum RevenueRange: String, CaseIterable {
        case twelveWeeks = "12w"
        case twelveMonths = "12m"

        var title: String { rawValue }
    }

    private enum AnalyticsChart: String, CaseIterable {
        case traffic = "traffic"
        case revenue = "revenue"
    }

    private enum AdminTab: String, CaseIterable {
        case overview = "Overview"
        case ads = "Ads"
        case hostApplications = "Hosts"
        case users = "Users"
        case userData = "User Data"
        case accommodations = "Stays"
        case tours = "Tours"
        case transport = "Transport"
        case bookings = "Bookings"
        case payments = "Payments"
        case payouts = "Payouts"
        case reviews = "Reviews"
        case support = "Support"
        case safety = "Safety"
        case reports = "Reports"
        case legal = "Legal Content"
        case affiliates = "Referrals"
    }

    @State private var selectedTab: AdminTab = .overview
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var metrics = MobileAdminMetrics.empty
    @State private var financial: MobileFinancialSummary?
    @State private var operations: MobileOperationsSummary?
    @State private var support: MobileSupportSummary?
    @State private var adminUsers: [[String: Any]] = []
    @State private var hostApplications: [[String: Any]] = []
    @State private var recentBookings: [[String: Any]] = []
    @State private var recentPayments: [[String: Any]] = []
    @State private var recentPayouts: [[String: Any]] = []
    @State private var recentSupportTickets: [[String: Any]] = []
    @State private var recentReviews: [[String: Any]] = []
    @State private var legalContentRows: [[String: Any]] = []
    @State private var affiliateRows: [[String: Any]] = []
    @State private var adminProperties: [[String: Any]] = []
    @State private var adminTours: [[String: Any]] = []
    @State private var adminTransport: [[String: Any]] = []
    @State private var adminAds: [[String: Any]] = []
    @State private var analyticsChart: AnalyticsChart = .traffic
    @State private var trafficRange: TrafficRange = .day
    @State private var revenueRange: RevenueRange = .twelveWeeks
    @State private var liveWebAnalytics: MobileLiveWebAnalytics?
    @State private var webAnalyticsSeries: [MobileWebAnalyticsSeriesPoint] = []
    @State private var actionMessage: String?
    @State private var actionInFlight = false
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                if let actionMessage {
                    Text(actionMessage)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .padding(.horizontal, 16)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(AdminTab.allCases, id: \.self) { tab in
                            DashboardTabPill(
                                title: tab.rawValue,
                                count: badgeCount(for: tab),
                                selected: selectedTab == tab
                            ) {
                                selectedTab = tab
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }

                tabContent
            }
            .padding(.vertical, 12)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    @ViewBuilder
    private var tabContent: some View {
        VStack(spacing: 12) {
            switch selectedTab {
            case .overview:
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    DashboardStatTile(title: "Bookings", value: "\(metrics.bookingsTotal)", caption: "All time")
                    DashboardStatTile(title: "Users", value: "\(metrics.usersTotal)", caption: "Registered users")
                    DashboardStatTile(title: "Properties", value: "\(metrics.propertiesTotal)", caption: "Listings")
                    DashboardStatTile(title: "Host Earnings", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.hostNet))", caption: "Net after host fees")
                    DashboardStatTile(title: "Post-fee Totals", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.revenueGross))", caption: "Gross revenue")
                    DashboardStatTile(title: "Discount Amount", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.discountAmount))", caption: "Applied discounts")
                }
                .padding(.horizontal, 16)
                adminOverviewAnalyticsCard
                adminOverviewAdvancedAnalyticsCard
            case .ads:
                contentSection(
                    title: "Banner Ad Management",
                    subtitle: "Campaign overview and placement controls",
                    columns: ["Title", "Placement", "Status", "Start", "End", "Actions"]
                )
                liveRowsCard(items: adminAds.prefix(12).map { row in
                    let title = text(row["title"], fallback: "Banner")
                    let placement = text(row["placement"], fallback: "home")
                    let status = ((row["is_active"] as? Bool) == true) ? "Active" : "Inactive"
                    let start = prettyDate(row["start_date"] as? String)
                    let end = prettyDate(row["end_date"] as? String)
                    return "\(title) • \(placement) • \(status) • \(start) -> \(end)"
                }, empty: "No ad records found for homepage banners.")
            case .hostApplications:
                contentSection(title: "Host Applications", subtitle: "Pending and reviewed host onboarding records", columns: ["Name", "Status", "Service Types", "Submitted"])
                liveRowsCard(items: hostApplications.prefix(8).map { row in
                    let name = text(row["full_name"], fallback: "Unknown host")
                    let status = text(row["status"], fallback: "pending").capitalized
                    let serviceTypes = (row["service_types"] as? [String])?.joined(separator: ", ") ?? "-"
                    let date = prettyDate(row["created_at"] as? String)
                    return "\(name) • \(status) • \(serviceTypes) • \(date)"
                }, empty: "No host applications found.")
                actionRowsCard(title: "Host Actions", rows: hostApplications.prefix(6).map { row in
                    let id = text(row["id"], fallback: "")
                    let name = text(row["full_name"], fallback: "Host")
                    let status = text(row["status"], fallback: "pending")
                    return AnyView(
                        HStack(spacing: 10) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(name).font(.caption.weight(.semibold)).foregroundColor(AppTheme.textPrimary)
                                Text(status.capitalized).font(.caption2).foregroundColor(AppTheme.textSecondary)
                            }
                            Spacer()
                            if status.lowercased() != "approved" {
                                Button("Approve") {
                                    Task { await updateApplicationStatus(id: id, status: "approved") }
                                }
                                .dashboardActionStyle(prominent: true)
                            }
                            if status.lowercased() != "rejected" {
                                Button("Reject") {
                                    Task { await updateApplicationStatus(id: id, status: "rejected") }
                                }
                                .dashboardActionStyle(prominent: false)
                            }
                        }
                    )
                })
            case .users:
                contentSection(title: "Users", subtitle: "Role assignment and suspension management", columns: ["User", "Email", "Status", "Joined"])
                liveRowsCard(items: adminUsers.prefix(10).map { row in
                    let name = text(row["full_name"], fallback: "No name")
                    let email = text(row["email"], fallback: "No email")
                    let isSuspended = (row["is_suspended"] as? Bool) == true
                    let status = isSuspended ? "Suspended" : "Active"
                    let joined = prettyDate(row["created_at"] as? String)
                    return "\(name) • \(email) • \(status) • \(joined)"
                }, empty: "No users found.")
                actionRowsCard(title: "User Actions", rows: adminUsers.prefix(6).map { row in
                    let userId = text(row["user_id"], fallback: "")
                    let name = text(row["full_name"], fallback: "User")
                    let suspended = (row["is_suspended"] as? Bool) == true
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(name)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            Button(suspended ? "Activate" : "Suspend") {
                                Task { await setUserSuspended(userId: userId, suspended: !suspended) }
                            }
                            .dashboardActionStyle(prominent: suspended)
                        }
                    )
                })
            case .userData:
                contentSection(
                    title: "User Data",
                    subtitle: "KYC completeness and verification presence",
                    columns: ["User", "Type", "Profile Pic", "ID", "Selfie", "Status", "Actions"]
                )
                liveRowsCard(items: adminUsers.prefix(12).map { row in
                    let name = text(row["full_name"], fallback: "No name")
                    let verified = ((row["is_verified"] as? Bool) == true) ? "Verified" : "Pending"
                    let suspended = ((row["is_suspended"] as? Bool) == true) ? "Suspended" : "Active"
                    let email = text(row["email"], fallback: "No email")
                    return "\(name) • \(email) • \(verified) • \(suspended)"
                }, empty: "No user KYC rows found.")
            case .accommodations:
                contentSection(
                    title: "Accommodations",
                    subtitle: "Property inventory and publishing status",
                    columns: ["Image", "Property", "Host", "Location", "Price", "Rating", "Status", "Actions"]
                )
                liveRowsCard(items: adminProperties.prefix(12).map { row in
                    let title = text(row["title"], fallback: "Property")
                    let host = text(row["host_id"], fallback: "Host")
                    let location = text(row["location"], fallback: "-")
                    let amount = money(row["price_per_night"], currency: text(row["currency"], fallback: "RWF"))
                    let status = ((row["is_published"] as? Bool) == true) ? "Live" : "Draft"
                    return "\(title) • \(host.prefix(8))... • \(location) • \(amount) • \(status)"
                }, empty: "No accommodation rows found.")
                actionRowsCard(title: "Accommodation Actions", rows: adminProperties.prefix(6).map { row in
                    let id = text(row["id"], fallback: "")
                    let title = text(row["title"], fallback: "Property")
                    let published = (row["is_published"] as? Bool) == true
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(title)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            Button(published ? "Unpublish" : "Publish") {
                                Task { await updatePropertyPublishStatus(id: id, publish: !published) }
                            }
                            .dashboardActionStyle(prominent: !published)
                        }
                    )
                })
            case .tours:
                contentSection(
                    title: "Tours",
                    subtitle: "Tour and package records",
                    columns: ["Image", "Tour", "Type", "Location", "Price", "Status", "Actions"]
                )
                liveRowsCard(items: adminTours.prefix(12).map { row in
                    let title = text(row["title"], fallback: "Tour")
                    let location = text(row["location"], fallback: "-")
                    let amount = money(row["price_per_person"], currency: text(row["currency"], fallback: "RWF"))
                    let status = ((row["is_published"] as? Bool) == true) ? "Live" : "Draft"
                    return "\(title) • \(location) • \(amount) • \(status)"
                }, empty: "No tours rows found.")
                actionRowsCard(title: "Tour Actions", rows: adminTours.prefix(6).map { row in
                    let id = text(row["id"], fallback: "")
                    let title = text(row["title"], fallback: "Tour")
                    let published = (row["is_published"] as? Bool) == true
                    let source = text(row["source"], fallback: "tours")
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(title)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            Button(published ? "Unpublish" : "Publish") {
                                Task { await updateTourPublishStatus(id: id, publish: !published, source: source) }
                            }
                            .dashboardActionStyle(prominent: !published)
                        }
                    )
                })
            case .transport:
                contentSection(
                    title: "Transport",
                    subtitle: "Vehicle and transfer offerings",
                    columns: ["Service", "Provider", "Location", "Price", "Status", "Actions"]
                )
                liveRowsCard(items: adminTransport.prefix(12).map { row in
                    let serviceType = text(row["service_type"], fallback: "Transport")
                    let location = text(row["location"], fallback: "-")
                    let baseAmount = number(row["price_per_day"]) > 0 ? number(row["price_per_day"]) : number(row["price_per_hour"])
                    let amount = money(baseAmount, currency: text(row["currency"], fallback: "RWF"))
                    let status = ((row["is_published"] as? Bool) == true) ? "Live" : "Draft"
                    return "\(serviceType) • \(location) • \(amount) • \(status)"
                }, empty: "No transport rows found.")
                actionRowsCard(title: "Transport Actions", rows: adminTransport.prefix(6).map { row in
                    let id = text(row["id"], fallback: "")
                    let serviceType = text(row["service_type"], fallback: "Transport")
                    let published = (row["is_published"] as? Bool) == true
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(serviceType)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            Button(published ? "Unpublish" : "Publish") {
                                Task { await updateTransportPublishStatus(id: id, publish: !published) }
                            }
                            .dashboardActionStyle(prominent: !published)
                        }
                    )
                })
            case .bookings:
                contentSection(title: "Bookings", subtitle: "Booking history and status actions", columns: ["Booking", "Status", "Payment", "Amount", "Date"])
                liveRowsCard(items: recentBookings.prefix(10).map { row in
                    let booking = text(row["order_id"], fallback: text(row["id"], fallback: "Booking"))
                    let status = text(row["status"], fallback: "pending").capitalized
                    let payment = text(row["payment_status"], fallback: "unpaid").capitalized
                    let amount = money(row["total_price"], currency: text(row["currency"], fallback: "RWF"))
                    let date = prettyDate(row["created_at"] as? String)
                    return "\(booking) • \(status) • \(payment) • \(amount) • \(date)"
                }, empty: "No bookings found.")
            case .payments:
                contentSection(title: "Payments", subtitle: "Transaction status and reconciliation", columns: ["Date", "Customer", "Method", "Amount", "Status"])
                liveRowsCard(items: recentPayments.prefix(10).map { row in
                    let date = prettyDate(row["created_at"] as? String)
                    let customer = text(row["name"], fallback: text(row["email"], fallback: "Customer"))
                    let method = text(row["payment_method"], fallback: "-" )
                    let amount = money(row["total_amount"], currency: text(row["currency"], fallback: "RWF"))
                    let status = text(row["payment_status"], fallback: "unpaid").capitalized
                    return "\(date) • \(customer) • \(method) • \(amount) • \(status)"
                }, empty: "No payment rows found.")
                actionRowsCard(title: "Payment Actions", rows: recentPayments.prefix(6).map { row in
                    let checkoutId = text(row["id"], fallback: "")
                    let customer = text(row["name"], fallback: "Customer")
                    let status = text(row["payment_status"], fallback: "unpaid").lowercased()
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(customer)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            if status != "paid" {
                                Button("Mark Paid") {
                                    Task { await updateCheckoutStatus(id: checkoutId, status: "paid") }
                                }
                                .dashboardActionStyle(prominent: true)
                            }
                            if status != "refunded" {
                                Button("Refund") {
                                    Task { await updateCheckoutStatus(id: checkoutId, status: "refunded") }
                                }
                                .dashboardActionStyle(prominent: false)
                            }
                        }
                    )
                })
            case .payouts:
                contentSection(title: "Payouts", subtitle: "Host/provider payout requests", columns: ["Host", "Amount", "Method", "Status", "Requested"])
                liveRowsCard(items: recentPayouts.prefix(10).map { row in
                    let host = text(row["host_id"], fallback: "Host")
                    let amount = money(row["amount"], currency: text(row["currency"], fallback: "RWF"))
                    let method = text(row["payout_method"], fallback: "-")
                    let status = text(row["status"], fallback: "pending").capitalized
                    let date = prettyDate(row["created_at"] as? String)
                    return "\(host.prefix(8))... • \(amount) • \(method) • \(status) • \(date)"
                }, empty: "No payout rows found.")
                actionRowsCard(title: "Payout Actions", rows: recentPayouts.prefix(6).map { row in
                    let payoutId = text(row["id"], fallback: "")
                    let host = text(row["host_id"], fallback: "Host")
                    let status = text(row["status"], fallback: "pending").lowercased()
                    return AnyView(
                        HStack(spacing: 10) {
                            Text("\(host.prefix(8))...")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            if status != "approved" {
                                Button("Approve") {
                                    Task { await updatePayoutStatus(id: payoutId, status: "approved") }
                                }
                                .dashboardActionStyle(prominent: true)
                            }
                            if status != "paid" {
                                Button("Mark Paid") {
                                    Task { await updatePayoutStatus(id: payoutId, status: "paid") }
                                }
                                .dashboardActionStyle(prominent: false)
                            }
                        }
                    )
                })
            case .reviews:
                contentSection(
                    title: "Reviews",
                    subtitle: "Moderation queue and published ratings",
                    columns: ["User", "Target", "Rating", "Comment", "Created", "Actions"]
                )
                liveRowsCard(items: recentReviews.prefix(12).map { row in
                    let property = text(row["property_id"], fallback: "Property")
                    let rating = Int(number(row["rating"]))
                    let snippet = text(row["review_text"], fallback: "No comment")
                    let status = text(row["status"], fallback: "open").capitalized
                    let date = prettyDate(row["created_at"] as? String)
                    return "\(property.prefix(8))... • \(rating)/5 • \(status) • \(snippet.prefix(48)) • \(date)"
                }, empty: "No review rows found.")
                actionRowsCard(title: "Review Actions", rows: recentReviews.prefix(6).map { row in
                    let id = text(row["id"], fallback: "")
                    let snippet = text(row["review_text"], fallback: "Review")
                    let status = text(row["status"], fallback: "open").lowercased()
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(String(snippet.prefix(26)))
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            if status != "approved" {
                                Button("Approve") {
                                    Task { await updateReviewStatus(id: id, status: "approved") }
                                }
                                .dashboardActionStyle(prominent: true)
                            }
                            if status != "rejected" {
                                Button("Reject") {
                                    Task { await updateReviewStatus(id: id, status: "rejected") }
                                }
                                .dashboardActionStyle(prominent: false)
                            }
                        }
                    )
                })
            case .support:
                contentSection(title: "Support", subtitle: "Open tickets and priority triage", columns: ["Ticket", "User", "Priority", "Status", "Created"])
                liveRowsCard(items: recentSupportTickets.prefix(10).map { row in
                    let subject = text(row["subject"], fallback: "Support ticket")
                    let user = text(row["user_email"], fallback: text(row["user_id"], fallback: "User"))
                    let priority = text(row["priority"], fallback: "medium").capitalized
                    let status = text(row["status"], fallback: "open").capitalized
                    let date = prettyDate(row["created_at"] as? String)
                    return "\(subject) • \(user) • \(priority) • \(status) • \(date)"
                }, empty: "No support tickets found.")
                actionRowsCard(title: "Support Actions", rows: recentSupportTickets.prefix(6).map { row in
                    let ticketId = text(row["id"], fallback: "")
                    let subject = text(row["subject"], fallback: "Ticket")
                    let status = text(row["status"], fallback: "open").lowercased()
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(subject)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            if status != "in_progress" {
                                Button("In Progress") {
                                    Task { await updateTicketStatus(id: ticketId, status: "in_progress") }
                                }
                                .dashboardActionStyle(prominent: false)
                            }
                            if status != "resolved" {
                                Button("Resolve") {
                                    Task { await updateTicketStatus(id: ticketId, status: "resolved") }
                                }
                                .dashboardActionStyle(prominent: true)
                            }
                        }
                    )
                })
            case .safety:
                contentSection(
                    title: "Safety",
                    subtitle: "Incident reports and resolutions",
                    columns: ["Report", "Category", "Severity", "Status", "Created", "Actions"]
                )
                liveRowsCard(items: recentSupportTickets.prefix(12).map { row in
                    let subject = text(row["subject"], fallback: "Incident")
                    let category = text(row["priority"], fallback: "medium").capitalized
                    let severity = category
                    let status = text(row["status"], fallback: "open").capitalized
                    let date = prettyDate(row["created_at"] as? String)
                    return "\(subject) • \(category) • \(severity) • \(status) • \(date)"
                }, empty: "No safety/incident rows found.")
            case .reports:
                contentSection(
                    title: "Reports",
                    subtitle: "Analytics and exportable summaries",
                    columns: ["Report Type", "Window", "Generated", "Owner", "Actions"]
                )
                liveRowsCard(items: [
                    "Bookings Summary • 30d • Now • Admin",
                    "Revenue Summary • 30d • Now • Admin",
                    "Support Summary • 30d • Now • Admin",
                    "Listings Summary • 30d • Now • Admin",
                    "KPIs: Users \(metrics.usersTotal), Bookings \(metrics.bookingsTotal), Revenue \(metrics.revenueCurrency) \(formatAmount(metrics.revenueGross))"
                ], empty: "No reports available.")
            case .legal:
                contentSection(
                    title: "Legal Content",
                    subtitle: "Policy versions and publication state",
                    columns: ["Document", "Version", "Updated", "Status", "Actions"]
                )
                liveRowsCard(items: legalContentRows.prefix(12).map { row in
                    let contentType = text(row["content_type"], fallback: "policy")
                    let title = text(row["title"], fallback: "Untitled")
                    let updated = prettyDate(row["updated_at"] as? String)
                    let active = ((row["is_active"] as? Bool) == true) ? "Active" : "Draft"
                    return "\(contentType) • \(title) • \(updated) • \(active)"
                }, empty: "No legal content rows found.")
                actionRowsCard(title: "Legal Actions", rows: legalContentRows.prefix(6).map { row in
                    let id = text(row["id"], fallback: "")
                    let title = text(row["title"], fallback: "Policy")
                    let active = (row["is_active"] as? Bool) == true
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(title)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            Button(active ? "Deactivate" : "Activate") {
                                Task { await updateLegalActiveStatus(id: id, active: !active) }
                            }
                            .dashboardActionStyle(prominent: !active)
                        }
                    )
                })
            case .affiliates:
                contentSection(
                    title: "Referrals",
                    subtitle: "Affiliate and commission performance",
                    columns: ["Affiliate", "Code", "Referrals", "Commissions", "Status", "Actions"]
                )
                liveRowsCard(items: affiliateRows.prefix(12).map { row in
                    let affiliateId = text(row["id"], fallback: "Affiliate")
                    let code = text(row["referral_code"], fallback: text(row["affiliate_code"], fallback: "-"))
                    let status = text(row["status"], fallback: "active").capitalized
                    let date = prettyDate(row["created_at"] as? String)
                    return "\(affiliateId.prefix(8))... • \(code) • \(status) • \(date)"
                }, empty: "No affiliate rows found.")
                actionRowsCard(title: "Affiliate Actions", rows: affiliateRows.prefix(6).map { row in
                    let id = text(row["id"], fallback: "")
                    let code = text(row["referral_code"], fallback: text(row["affiliate_code"], fallback: "-"))
                    let status = text(row["status"], fallback: "active").lowercased()
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(code)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            if status != "active" {
                                Button("Activate") {
                                    Task { await updateAffiliateRecordStatus(id: id, status: "active") }
                                }
                                .dashboardActionStyle(prominent: true)
                            }
                            if status != "suspended" {
                                Button("Suspend") {
                                    Task { await updateAffiliateRecordStatus(id: id, status: "suspended") }
                                }
                                .dashboardActionStyle(prominent: false)
                            }
                        }
                    )
                })
            }
        }
    }

    @ViewBuilder
    private func contentSection(title: String, subtitle: String, columns: [String]) -> some View {
        DashboardSectionCard(title: title, subtitle: subtitle, columns: columns)
            .padding(.horizontal, 16)
    }

    private func liveRowsCard(items: [String], empty: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if items.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "tray")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                    Text(empty)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding(14)
            } else {
                ForEach(Array(items.enumerated()), id: \.offset) { index, line in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(index + 1)")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(AppTheme.textSecondary)
                            .frame(width: 20, height: 20)
                            .background(Color(uiColor: .systemGray6))
                            .clipShape(Circle())
                        Text(line)
                            .font(.caption)
                            .foregroundColor(AppTheme.textPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(index % 2 == 0 ? Color.white : Color(uiColor: .systemGray6).opacity(0.4))
                    if index < items.count - 1 {
                        Divider().padding(.leading, 14)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func actionRowsCard(title: String, rows: [AnyView]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                Spacer()
                if actionInFlight {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                row
                Divider()
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func badgeCount(for tab: AdminTab) -> Int? {
        switch tab {
        case .hostApplications:
            return operations?.hostApplicationsPending
        case .bookings:
            return financial?.pending
        case .payments:
            return financial?.unpaidCheckoutRequests
        case .payouts:
            return recentPayouts.filter { text($0["status"], fallback: "").lowercased() == "pending" }.count
        case .support:
            return support?.ticketsOpen
        default:
            return nil
        }
    }

    private func load() async {
        guard let service else {
            errorMessage = "Supabase is not configured."
            return
        }
        loading = true
        errorMessage = nil
        do {
            metrics = try await service.fetchAdminOverviewMetrics()
        } catch {
            metrics = .empty
            errorMessage = error.localizedDescription
        }

        financial = try? await service.fetchFinancialSummary()
        operations = try? await service.fetchOperationsSummary()
        support = try? await service.fetchSupportSummary()
        adminUsers = (try? await service.fetchAdminUsers()) ?? []
        hostApplications = (try? await service.fetchAdminHostApplications()) ?? []
        recentBookings = (try? await service.fetchAdminBookings()) ?? []
        recentPayments = (try? await service.fetchAdminPayments()) ?? []
        recentPayouts = (try? await service.fetchAdminPayouts()) ?? []
        recentSupportTickets = (try? await service.fetchAdminSupportTickets()) ?? []
        recentReviews = (try? await service.fetchAdminPropertyReviews()) ?? []
        legalContentRows = (try? await service.fetchAdminLegalContent()) ?? []
        affiliateRows = (try? await service.fetchAdminAffiliates()) ?? []
        adminProperties = (try? await service.fetchAdminProperties()) ?? []
        adminTours = (try? await service.fetchAdminTours()) ?? []
        adminTransport = (try? await service.fetchAdminTransportServices()) ?? []
        adminAds = (try? await service.fetchAdminAds()) ?? []
        liveWebAnalytics = try? await service.fetchAdminWebAnalyticsLive(windowMinutes: 15)
        webAnalyticsSeries = (try? await service.fetchAdminWebAnalyticsSeries(range: trafficRange.rawValue)) ?? []
        loading = false
    }

    private func formatAmount(_ value: Double) -> String {
        NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)
    }

    private var revenueTrendPoints: [RevenueTrendPoint] {
        let calendar = Calendar.current
        let now = Date()
        var buckets: [(key: Date, label: String, amount: Double)] = []

        if revenueRange == .twelveMonths {
            for offset in stride(from: 11, through: 0, by: -1) {
                guard let monthDate = calendar.date(byAdding: .month, value: -offset, to: now),
                      let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: monthDate)) else {
                    continue
                }
                let label = DateFormatter.localizedString(from: startOfMonth, dateStyle: .short, timeStyle: .none)
                buckets.append((key: startOfMonth, label: label, amount: 0))
            }
        } else {
            for offset in stride(from: 11, through: 0, by: -1) {
                guard let weekDate = calendar.date(byAdding: .weekOfYear, value: -offset, to: now),
                      let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: weekDate)?.start else {
                    continue
                }
                let label = DateFormatter.localizedString(from: startOfWeek, dateStyle: .short, timeStyle: .none)
                buckets.append((key: startOfWeek, label: label, amount: 0))
            }
        }

        for row in recentBookings {
            let paymentStatus = text(row["payment_status"], fallback: "").lowercased()
            if paymentStatus != "paid" { continue }

            guard let createdAt = row["created_at"] as? String,
                  let date = parseISODate(createdAt) else {
                continue
            }

            let normalizedDate: Date?
            if revenueRange == .twelveMonths {
                normalizedDate = calendar.date(from: calendar.dateComponents([.year, .month], from: date))
            } else {
                normalizedDate = calendar.dateInterval(of: .weekOfYear, for: date)?.start
            }
            guard let normalizedDate else { continue }

            guard let index = buckets.firstIndex(where: {
                if revenueRange == .twelveMonths {
                    return calendar.isDate($0.key, equalTo: normalizedDate, toGranularity: .month)
                }
                return calendar.isDate($0.key, equalTo: normalizedDate, toGranularity: .weekOfYear)
            }) else {
                continue
            }
            buckets[index].amount += number(row["total_price"])
        }

        return buckets.map { bucket in
            RevenueTrendPoint(id: "\(bucket.key.timeIntervalSince1970)", label: bucket.label, amount: bucket.amount)
        }
    }

    private var trafficTrendPoints: [TrafficTrendPoint] {
        webAnalyticsSeries.enumerated().map { index, point in
            let label = formattedTrafficBucket(point.bucket)
            return TrafficTrendPoint(
                id: "\(point.bucket)-\(index)",
                label: label,
                pageViews: Double(point.pageViews),
                failedAttempts: Double(point.failedAttempts)
            )
        }
    }

    private var adminAdvancedAnalytics: AdminAdvancedAnalytics {
        if recentBookings.isEmpty {
            return .empty
        }

        var totalBookings = 0
        var confirmedOrCompleted = 0
        var cancelled = 0

        var leadDaysSum: Double = 0
        var leadDaysCount = 0

        var guestBookingCounts: [String: Int] = [:]
        var bookingTypeCounts: [String: Int] = [:]
        var paymentMethodCounts: [String: Int] = [:]
        var paidBookings = 0

        for booking in recentBookings {
            totalBookings += 1

            let status = text(booking["status"], fallback: "").lowercased()
            let paymentStatus = text(booking["payment_status"], fallback: "").lowercased()
            if status == "confirmed" || status == "completed" {
                confirmedOrCompleted += 1
            }
            if status == "cancelled" {
                cancelled += 1
            }

            if let createdAtRaw = booking["created_at"] as? String,
               let checkInRaw = booking["check_in"] as? String,
               let createdAt = parseISODate(createdAtRaw),
               let checkIn = parseISODate(checkInRaw) {
                let diff = checkIn.timeIntervalSince(createdAt) / 86_400
                if diff >= 0 {
                    leadDaysSum += diff
                    leadDaysCount += 1
                }
            }

            let guestKey = text(booking["guest_id"], fallback: "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            if !guestKey.isEmpty {
                guestBookingCounts[guestKey, default: 0] += 1
            }

            var bookingType = text(booking["booking_type"], fallback: "").lowercased()
            if bookingType.isEmpty {
                if booking["property_id"] != nil {
                    bookingType = "property"
                } else if booking["tour_id"] != nil {
                    bookingType = "tour"
                } else if booking["transport_id"] != nil {
                    bookingType = "transport"
                } else {
                    bookingType = "other"
                }
            }
            bookingTypeCounts[bookingType, default: 0] += 1

            if paymentStatus == "paid" {
                paidBookings += 1
                let method = text(booking["payment_method"], fallback: "unknown").lowercased()
                paymentMethodCounts[method, default: 0] += 1
            }
        }

        let uniqueGuests = guestBookingCounts.count
        let repeatGuests = guestBookingCounts.values.filter { $0 > 1 }.count

        let bookingTypeBreakdown = bookingTypeCounts
            .map { key, value in
                BreakdownRow(
                    id: "type-\(key)",
                    label: key,
                    count: value,
                    share: totalBookings > 0 ? (Double(value) / Double(totalBookings)) * 100 : 0
                )
            }
            .sorted { $0.count > $1.count }

        let paymentMethodBreakdown = paymentMethodCounts
            .map { key, value in
                BreakdownRow(
                    id: "pay-\(key)",
                    label: key,
                    count: value,
                    share: paidBookings > 0 ? (Double(value) / Double(paidBookings)) * 100 : 0
                )
            }
            .sorted { $0.count > $1.count }

        return AdminAdvancedAnalytics(
            confirmationRate: totalBookings > 0 ? (Double(confirmedOrCompleted) / Double(totalBookings)) * 100 : 0,
            cancellationRate: totalBookings > 0 ? (Double(cancelled) / Double(totalBookings)) * 100 : 0,
            avgLeadDays: leadDaysCount > 0 ? leadDaysSum / Double(leadDaysCount) : 0,
            repeatGuestRate: uniqueGuests > 0 ? (Double(repeatGuests) / Double(uniqueGuests)) * 100 : 0,
            bookingTypeBreakdown: bookingTypeBreakdown,
            paymentMethodBreakdown: paymentMethodBreakdown
        )
    }

    @ViewBuilder
    private var adminOverviewAnalyticsCard: some View {
#if canImport(Charts)
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Live Traffic")
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                    Text("Switch between traffic and revenue analytics")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                Spacer()
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    Button("Traffic") {
                        analyticsChart = .traffic
                    }
                    .dashboardActionStyle(prominent: analyticsChart == .traffic)

                    Button("Revenue") {
                        analyticsChart = .revenue
                    }
                    .dashboardActionStyle(prominent: analyticsChart == .revenue)
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    if analyticsChart == .traffic {
                        ForEach(TrafficRange.allCases, id: \.self) { range in
                            Button(range.title) {
                                Task {
                                    trafficRange = range
                                    if let service {
                                        webAnalyticsSeries = (try? await service.fetchAdminWebAnalyticsSeries(range: range.rawValue)) ?? []
                                    } else {
                                        webAnalyticsSeries = []
                                    }
                                }
                            }
                            .dashboardActionStyle(prominent: trafficRange == range)
                        }
                    } else {
                        ForEach(RevenueRange.allCases, id: \.self) { range in
                            Button(range.title) {
                                revenueRange = range
                            }
                            .dashboardActionStyle(prominent: revenueRange == range)
                        }
                    }
                }
            }

            if analyticsChart == .traffic {
                let visitors = liveWebAnalytics?.liveVisitors ?? 0
                let hosts = liveWebAnalytics?.liveHosts ?? 0
                let guests = liveWebAnalytics?.liveGuests ?? 0
                let failures = liveWebAnalytics?.failedAttempts ?? 0

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    DashboardStatTile(title: "Visitors", value: "\(visitors)", caption: "Last 15 minutes")
                    DashboardStatTile(title: "Hosts", value: "\(hosts)", caption: "Last 15 minutes")
                    DashboardStatTile(title: "Guests", value: "\(guests)", caption: "Last 15 minutes")
                    DashboardStatTile(title: "Failed Attempts", value: "\(failures)", caption: "Last 15 minutes")
                }

                if trafficTrendPoints.isEmpty {
                    Text("No traffic analytics yet for this range.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                } else {
                    Chart(trafficTrendPoints) { point in
                        AreaMark(
                            x: .value("Bucket", point.label),
                            y: .value("Page Views", point.pageViews)
                        )
                        .foregroundStyle(AppTheme.coral.opacity(0.2))

                        LineMark(
                            x: .value("Bucket", point.label),
                            y: .value("Page Views", point.pageViews)
                        )
                        .foregroundStyle(AppTheme.coral)

                        AreaMark(
                            x: .value("Bucket", point.label),
                            y: .value("Failed Attempts", point.failedAttempts)
                        )
                        .foregroundStyle(Color.red.opacity(0.12))

                        LineMark(
                            x: .value("Bucket", point.label),
                            y: .value("Failed Attempts", point.failedAttempts)
                        )
                        .foregroundStyle(Color.red.opacity(0.9))
                    }
                    .frame(height: 190)
                }
            } else {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    DashboardStatTile(title: "Revenue (Gross)", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.revenueGross))", caption: "Paid bookings")
                    DashboardStatTile(title: "Platform Earnings", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.platformCharges))", caption: "Charges")
                    DashboardStatTile(title: "Host Earnings", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.hostNet))", caption: "Net")
                    DashboardStatTile(title: "Discount Total", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.discountAmount))", caption: "Applied")
                }

                Chart(revenueTrendPoints) { point in
                    AreaMark(
                        x: .value("Bucket", point.label),
                        y: .value("Revenue", point.amount)
                    )
                    .foregroundStyle(AppTheme.coral.opacity(0.2))

                    LineMark(
                        x: .value("Bucket", point.label),
                        y: .value("Revenue", point.amount)
                    )
                    .foregroundStyle(AppTheme.coral)
                }
                .frame(height: 190)
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
#else
        EmptyView()
#endif
    }

    @ViewBuilder
    private var adminOverviewAdvancedAnalyticsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Advanced Business Analytics")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                DashboardStatTile(title: "Confirmation Rate", value: "\(String(format: "%.1f", adminAdvancedAnalytics.confirmationRate))%", caption: "Confirmed/completed")
                DashboardStatTile(title: "Cancellation Rate", value: "\(String(format: "%.1f", adminAdvancedAnalytics.cancellationRate))%", caption: "Cancelled")
                DashboardStatTile(title: "Avg Lead Time", value: "\(String(format: "%.1f", adminAdvancedAnalytics.avgLeadDays))d", caption: "Days")
                DashboardStatTile(title: "Repeat Guest Rate", value: "\(String(format: "%.1f", adminAdvancedAnalytics.repeatGuestRate))%", caption: "Returning guests")
            }

            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Booking Type Mix")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                    ForEach(adminAdvancedAnalytics.bookingTypeBreakdown.prefix(4)) { row in
                        Text("\(row.label.capitalized): \(row.count) (\(String(format: "%.1f", row.share))%)")
                            .font(.caption2)
                            .foregroundColor(AppTheme.textPrimary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Paid Method Mix")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textSecondary)
                    ForEach(adminAdvancedAnalytics.paymentMethodBreakdown.prefix(4)) { row in
                        Text("\(row.label.capitalized): \(row.count) (\(String(format: "%.1f", row.share))%)")
                            .font(.caption2)
                            .foregroundColor(AppTheme.textPrimary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func text(_ any: Any?, fallback: String) -> String {
        if let value = any as? String, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return value }
        return fallback
    }

    private func number(_ any: Any?) -> Double {
        if let value = any as? Double { return value }
        if let value = any as? Int { return Double(value) }
        if let value = any as? NSNumber { return value.doubleValue }
        if let value = any as? String, let parsed = Double(value) { return parsed }
        return 0
    }

    private func money(_ amount: Any?, currency: String) -> String {
        "\(currency) \(formatAmount(number(amount)))"
    }

    private func money(_ amount: Double, currency: String) -> String {
        "\(currency) \(formatAmount(amount))"
    }

    private func prettyDate(_ value: String?) -> String {
        guard let value, let date = ISO8601DateFormatter().date(from: value) else { return "-" }
        return DateFormatter.localizedString(from: date, dateStyle: .short, timeStyle: .none)
    }

    private func formattedTrafficBucket(_ value: String) -> String {
        guard let date = parseISODate(value) else { return value }
        switch trafficRange {
        case .oneHour:
            return DateFormatter.localizedString(from: date, dateStyle: .none, timeStyle: .short)
        case .day:
            return DateFormatter.localizedString(from: date, dateStyle: .none, timeStyle: .short)
        case .week, .month:
            return DateFormatter.localizedString(from: date, dateStyle: .short, timeStyle: .none)
        }
    }

    private func parseISODate(_ value: String) -> Date? {
        let formatterWithFractional = ISO8601DateFormatter()
        formatterWithFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatterWithFractional.date(from: value) {
            return date
        }
        return ISO8601DateFormatter().date(from: value)
    }

    private func updateApplicationStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateHostApplicationStatus(applicationId: id, status: status)
            actionMessage = "Application updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func setUserSuspended(userId: String, suspended: Bool) async {
        guard !userId.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.setUserSuspended(userId: userId, isSuspended: suspended)
            actionMessage = suspended ? "User suspended." : "User activated."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateCheckoutStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateCheckoutRequestPaymentStatus(id: id, paymentStatus: status)
            actionMessage = "Payment updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updatePayoutStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateHostPayoutStatus(payoutId: id, status: status)
            actionMessage = "Payout updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateTicketStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateSupportTicketStatus(ticketId: id, status: status)
            actionMessage = "Ticket updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updatePropertyPublishStatus(id: String, publish: Bool) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.setPropertyPublished(propertyId: id, isPublished: publish)
            actionMessage = publish ? "Property published." : "Property unpublished."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateTourPublishStatus(id: String, publish: Bool, source: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            if source == "tour_packages" {
                try await service.setTourPackagePublished(packageId: id, isPublished: publish)
                actionMessage = publish ? "Tour package published." : "Tour package unpublished."
            } else {
                try await service.setTourPublished(tourId: id, isPublished: publish)
                actionMessage = publish ? "Tour published." : "Tour unpublished."
            }
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateTransportPublishStatus(id: String, publish: Bool) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.setTransportPublished(transportId: id, isPublished: publish)
            actionMessage = publish ? "Transport published." : "Transport unpublished."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateReviewStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updatePropertyReviewStatus(reviewId: id, status: status)
            actionMessage = "Review updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateLegalActiveStatus(id: String, active: Bool) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateLegalContentActive(contentId: id, isActive: active)
            actionMessage = active ? "Legal content activated." : "Legal content deactivated."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateAffiliateRecordStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateAffiliateStatus(affiliateId: id, status: status)
            actionMessage = "Affiliate updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }
}

private struct NativeFinancialSummaryView: View {
    private struct RevenueTrendPoint: Identifiable {
        let id: String
        let label: String
        let revenue: Double
    }

    private struct StatusBreakdownRow: Identifiable {
        let id: String
        let title: String
        let count: Int
        let share: Double
    }

    private enum RevenueRange: String, CaseIterable {
        case twelveWeeks = "12w"
        case twelveMonths = "12m"

        var title: String { rawValue }
    }

    private enum BookingFilter: String, CaseIterable {
        case all = "all"
        case pending = "pending"
        case confirmed = "confirmed"
        case paid = "paid"
        case cancelled = "cancelled"

        var title: String {
            switch self {
            case .all: return "All"
            case .pending: return "Pending"
            case .confirmed: return "Confirmed"
            case .paid: return "Paid"
            case .cancelled: return "Cancelled"
            }
        }
    }

    private enum FinancialTab: String, CaseIterable {
        case overview = "Overview"
        case bookings = "All Bookings"
        case payouts = "Host Payouts"
        case revenue = "Revenue by Currency"
    }

    @State private var selectedTab: FinancialTab = .overview
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var summary: MobileFinancialSummary?
    @State private var revenueRange: RevenueRange = .twelveWeeks
    @State private var bookingFilter: BookingFilter = .all
    @State private var bookingSearch: String = ""
    @State private var recentBookings: [[String: Any]] = []
    @State private var recentPayouts: [[String: Any]] = []
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(FinancialTab.allCases, id: \.self) { tab in
                            DashboardTabPill(title: tab.rawValue, count: badgeCount(for: tab), selected: selectedTab == tab) {
                                selectedTab = tab
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }

                if let summary {
                    switch selectedTab {
                    case .overview:
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            DashboardStatTile(title: "Total Bookings", value: "\(summary.bookingsTotal)", caption: "All time")
                            DashboardStatTile(title: "Paid Bookings", value: "\(summary.paid)", caption: "Successfully paid")
                            DashboardStatTile(title: "Pending Payments", value: "\(summary.pending)", caption: "Awaiting payment")
                            DashboardStatTile(title: "Confirmed", value: "\(summary.confirmed)", caption: "Confirmed bookings")
                            DashboardStatTile(title: "Revenue Gross", value: money(summary.revenueGross, currency: summary.revenueByCurrency.first?.currency ?? "RWF"), caption: "Total" )
                            DashboardStatTile(title: "Refunded", value: "\(summary.refundedCheckoutRequests)", caption: "Refund records")
                        }
                        .padding(.horizontal, 16)
                        financialRevenueAnalyticsCard
                        financialPaymentStatusBreakdownCard
                        DashboardSectionCard(title: "Recent Paid Bookings", subtitle: "Latest successful payments", columns: ["Date", "Amount", "Status"])
                            .padding(.horizontal, 16)
                        rowsList(items: recentBookings.filter { text($0["payment_status"]).lowercased() == "paid" }.prefix(5).map { row in
                            "\(prettyDate(row["created_at"] as? String)) • \(money(row["total_price"], currency: text(row["currency"]))) • \(text(row["status"]).capitalized)"
                        }, empty: "No paid bookings yet.")
                    case .bookings:
                        financialBookingsFilterBar
                        DashboardSectionCard(title: "All Bookings", subtitle: "Complete booking history with status filters", columns: ["Booking ID", "Amount", "Payment", "Status", "Date"])
                            .padding(.horizontal, 16)
                        rowsList(items: filteredBookings.prefix(30).map { row in
                            let booking = text(row["order_id"]).isEmpty ? text(row["id"]) : text(row["order_id"])
                            return "\(booking) • \(money(row["total_price"], currency: text(row["currency"]))) • \(text(row["payment_status"]).capitalized) • \(text(row["status"]).capitalized) • \(prettyDate(row["created_at"] as? String))"
                        }, empty: "No bookings found for current filters.")
                    case .payouts:
                        DashboardSectionCard(title: "Host Payouts", subtitle: "Pending and completed host payout requests", columns: ["Host", "Amount", "Method", "Status", "Requested"])
                            .padding(.horizontal, 16)
                        rowsList(items: recentPayouts.prefix(12).map { row in
                            "\(text(row["host_id"]).prefix(8))... • \(money(row["amount"], currency: text(row["currency"]))) • \(text(row["payout_method"])) • \(text(row["status"]).capitalized) • \(prettyDate(row["created_at"] as? String))"
                        }, empty: "No payouts found.")
                    case .revenue:
                        DashboardSectionCard(
                            title: "Revenue by Currency",
                            subtitle: "Totals split by booking currency",
                            columns: ["Currency", "Gross", "Charges", "Net", "Bookings"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: summary.revenueByCurrency.map { row in
                            "\(row.currency) • \(money(row.amount, currency: row.currency))"
                        }, empty: "No revenue totals available.")
                    }
                }
            }
            .padding(.vertical, 12)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func badgeCount(for tab: FinancialTab) -> Int? {
        guard let summary else { return nil }
        switch tab {
        case .bookings:
            return summary.pending
        case .payouts:
            return recentPayouts.filter { text($0["status"]).lowercased() == "pending" }.count
        default:
            return nil
        }
    }

    private var filteredBookings: [[String: Any]] {
        let search = bookingSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return recentBookings.filter { row in
            let status = text(row["status"]).lowercased()
            let paymentStatus = text(row["payment_status"]).lowercased()

            let matchesFilter: Bool
            switch bookingFilter {
            case .all:
                matchesFilter = true
            case .pending:
                matchesFilter = status == "pending" || status == "pending_confirmation" || paymentStatus == "unpaid"
            case .confirmed:
                matchesFilter = status == "confirmed"
            case .paid:
                matchesFilter = paymentStatus == "paid"
            case .cancelled:
                matchesFilter = status == "cancelled" || paymentStatus == "refunded"
            }

            if !matchesFilter { return false }
            if search.isEmpty { return true }

            let bookingId = text(row["id"]).lowercased()
            let orderId = text(row["order_id"]).lowercased()
            let email = text(row["guest_email"]).lowercased()
            let name = text(row["guest_name"]).lowercased()
            return bookingId.contains(search) || orderId.contains(search) || email.contains(search) || name.contains(search)
        }
    }

    private var paymentStatusBreakdown: [StatusBreakdownRow] {
        let total = recentBookings.count
        if total == 0 { return [] }

        let paid = recentBookings.filter { text($0["payment_status"]).lowercased() == "paid" }.count
        let unpaid = recentBookings.filter { text($0["payment_status"]).lowercased() == "unpaid" }.count
        let refunded = recentBookings.filter { text($0["payment_status"]).lowercased() == "refunded" }.count
        let pending = recentBookings.filter {
            let status = text($0["status"]).lowercased()
            return status == "pending" || status == "pending_confirmation"
        }.count

        let rows = [
            ("Paid", paid),
            ("Unpaid", unpaid),
            ("Refunded", refunded),
            ("Pending", pending)
        ]

        return rows.map { title, count in
            StatusBreakdownRow(
                id: title.lowercased(),
                title: title,
                count: count,
                share: total > 0 ? (Double(count) / Double(total)) * 100 : 0
            )
        }
    }

    private var revenueTrendPoints: [RevenueTrendPoint] {
        let calendar = Calendar.current
        let now = Date()
        var buckets: [(key: Date, label: String, amount: Double)] = []

        if revenueRange == .twelveMonths {
            for offset in stride(from: 11, through: 0, by: -1) {
                guard let monthDate = calendar.date(byAdding: .month, value: -offset, to: now),
                      let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: monthDate)) else {
                    continue
                }
                let label = DateFormatter.localizedString(from: startOfMonth, dateStyle: .short, timeStyle: .none)
                buckets.append((key: startOfMonth, label: label, amount: 0))
            }
        } else {
            for offset in stride(from: 11, through: 0, by: -1) {
                guard let weekDate = calendar.date(byAdding: .weekOfYear, value: -offset, to: now),
                      let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: weekDate)?.start else {
                    continue
                }
                let label = DateFormatter.localizedString(from: startOfWeek, dateStyle: .short, timeStyle: .none)
                buckets.append((key: startOfWeek, label: label, amount: 0))
            }
        }

        for row in recentBookings {
            let paymentStatus = text(row["payment_status"]).lowercased()
            if paymentStatus != "paid" { continue }

            guard let createdAt = row["created_at"] as? String,
                  let date = parseISODate(createdAt) else {
                continue
            }

            let normalized: Date?
            if revenueRange == .twelveMonths {
                normalized = calendar.date(from: calendar.dateComponents([.year, .month], from: date))
            } else {
                normalized = calendar.dateInterval(of: .weekOfYear, for: date)?.start
            }
            guard let normalized else { continue }

            guard let index = buckets.firstIndex(where: {
                if revenueRange == .twelveMonths {
                    return calendar.isDate($0.key, equalTo: normalized, toGranularity: .month)
                }
                return calendar.isDate($0.key, equalTo: normalized, toGranularity: .weekOfYear)
            }) else {
                continue
            }

            buckets[index].amount += number(row["total_price"])
        }

        return buckets.map { point in
            RevenueTrendPoint(id: "\(point.key.timeIntervalSince1970)", label: point.label, revenue: point.amount)
        }
    }

    private var financialBookingsFilterBar: some View {
        VStack(spacing: 8) {
            TextField("Search booking id, order id, email, guest", text: $bookingSearch)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(BookingFilter.allCases, id: \.self) { filter in
                        Button(filter.title) {
                            bookingFilter = filter
                        }
                        .dashboardActionStyle(prominent: bookingFilter == filter)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private var financialRevenueAnalyticsCard: some View {
#if canImport(Charts)
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Revenue Analytics")
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)
                    Text("Paid-booking trend aligned with web dashboard ranges")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                Spacer()
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(RevenueRange.allCases, id: \.self) { range in
                        Button(range.title) {
                            revenueRange = range
                        }
                        .dashboardActionStyle(prominent: revenueRange == range)
                    }
                }
            }

            Chart(revenueTrendPoints) { point in
                AreaMark(
                    x: .value("Bucket", point.label),
                    y: .value("Revenue", point.revenue)
                )
                .foregroundStyle(AppTheme.coral.opacity(0.2))

                LineMark(
                    x: .value("Bucket", point.label),
                    y: .value("Revenue", point.revenue)
                )
                .foregroundStyle(AppTheme.coral)
            }
            .frame(height: 180)
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
#else
        EmptyView()
#endif
    }

    private var financialPaymentStatusBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Payment Status Breakdown")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)
            ForEach(paymentStatusBreakdown) { row in
                HStack(spacing: 10) {
                    Text(row.title)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(AppTheme.textPrimary)
                    Spacer()
                    Text("\(row.count)")
                        .font(.caption)
                        .foregroundColor(AppTheme.textPrimary)
                    Text("(\(String(format: "%.1f", row.share))%)")
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            if paymentStatusBreakdown.isEmpty {
                Text("No booking payment records available yet.")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func rowsList(items: [String], empty: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if items.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "tray")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                    Text(empty)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding(14)
            } else {
                ForEach(Array(items.enumerated()), id: \.offset) { index, line in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(index + 1)")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(AppTheme.textSecondary)
                            .frame(width: 20, height: 20)
                            .background(Color(uiColor: .systemGray6))
                            .clipShape(Circle())
                        Text(line)
                            .font(.caption)
                            .foregroundColor(AppTheme.textPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(index % 2 == 0 ? Color.white : Color(uiColor: .systemGray6).opacity(0.4))
                    if index < items.count - 1 {
                        Divider().padding(.leading, 14)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func load() async {
        guard let service else { return }
        loading = true
        summary = try? await service.fetchFinancialSummary()
        recentBookings = (try? await service.fetchAdminBookings()) ?? []
        recentPayouts = (try? await service.fetchAdminPayouts()) ?? []
        errorMessage = nil
        loading = false
    }

    private func text(_ any: Any?) -> String {
        if let value = any as? String { return value }
        if let value = any as? NSNumber { return value.stringValue }
        return ""
    }

    private func number(_ any: Any?) -> Double {
        if let value = any as? Double { return value }
        if let value = any as? Int { return Double(value) }
        if let value = any as? NSNumber { return value.doubleValue }
        if let value = any as? String, let parsed = Double(value) { return parsed }
        return 0
    }

    private func money(_ amount: Any?, currency: String) -> String {
        "\(currency.isEmpty ? "RWF" : currency) \(NumberFormatter.localizedString(from: NSNumber(value: number(amount)), number: .decimal))"
    }

    private func prettyDate(_ value: String?) -> String {
        guard let value, let date = ISO8601DateFormatter().date(from: value) else { return "-" }
        return DateFormatter.localizedString(from: date, dateStyle: .short, timeStyle: .none)
    }

    private func parseISODate(_ value: String) -> Date? {
        let formatterWithFractional = ISO8601DateFormatter()
        formatterWithFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatterWithFractional.date(from: value) {
            return date
        }
        return ISO8601DateFormatter().date(from: value)
    }
}

private struct NativeOperationsSummaryView: View {
    private struct StatusBreakdownRow: Identifiable {
        let id: String
        let title: String
        let count: Int
        let share: Double
    }

    private enum BookingFilter: String, CaseIterable {
        case all = "all"
        case pending = "pending"
        case confirmed = "confirmed"
        case paid = "paid"
        case cancelled = "cancelled"

        var title: String {
            switch self {
            case .all: return "All"
            case .pending: return "Pending"
            case .confirmed: return "Confirmed"
            case .paid: return "Paid"
            case .cancelled: return "Cancelled"
            }
        }
    }

    private enum UserDataFilter: String, CaseIterable {
        case all = "all"
        case collected = "collected"
        case missing = "missing"

        var title: String {
            switch self {
            case .all: return "All"
            case .collected: return "Collected"
            case .missing: return "Missing"
            }
        }
    }

    private enum UserDataScope: String, CaseIterable {
        case all = "all"
        case users = "users"
        case hosts = "hosts"

        var title: String {
            switch self {
            case .all: return "All"
            case .users: return "Users"
            case .hosts: return "Hosts"
            }
        }
    }

    private enum OperationsTab: String, CaseIterable {
        case overview = "Overview"
        case applications = "Applications"
        case userData = "User Data"
        case bookings = "Bookings"
        case accommodations = "Accommodations"
        case tours = "Tours"
        case transport = "Transport"
    }

    @State private var selectedTab: OperationsTab = .overview
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var summary: MobileOperationsSummary?
    @State private var applications: [[String: Any]] = []
    @State private var users: [[String: Any]] = []
    @State private var bookings: [[String: Any]] = []
    @State private var properties: [[String: Any]] = []
    @State private var tours: [[String: Any]] = []
    @State private var transport: [[String: Any]] = []
    @State private var bookingSearch: String = ""
    @State private var bookingFilter: BookingFilter = .all
    @State private var userDataSearch: String = ""
    @State private var userDataFilter: UserDataFilter = .all
    @State private var userDataScope: UserDataScope = .all
    @State private var actionMessage: String?
    @State private var actionInFlight = false
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                if let actionMessage {
                    Text(actionMessage)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .padding(.horizontal, 16)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(OperationsTab.allCases, id: \.self) { tab in
                            DashboardTabPill(title: tab.rawValue, count: badgeCount(for: tab), selected: selectedTab == tab) {
                                selectedTab = tab
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }

                if let summary {
                    switch selectedTab {
                    case .overview:
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            DashboardStatTile(title: "Host Applications", value: "\(summary.hostApplicationsTotal)", caption: "Total submissions")
                            DashboardStatTile(title: "Pending Applications", value: "\(summary.hostApplicationsPending)", caption: "Need review")
                            DashboardStatTile(title: "Properties", value: "\(summary.propertiesTotal)", caption: "Accommodation listings")
                            DashboardStatTile(title: "Tours", value: "\(summary.toursTotal)", caption: "Tour inventory")
                            DashboardStatTile(title: "Pending Bookings", value: "\(pendingBookingsCount)", caption: "Need operations action")
                            DashboardStatTile(title: "Confirmed Bookings", value: "\(confirmedBookingsCount)", caption: "Operationally ready")
                            DashboardStatTile(title: "Published Stays", value: "\(publishedPropertiesCount)", caption: "Live accommodations")
                            DashboardStatTile(title: "Published Tours", value: "\(publishedToursCount)", caption: "Live tours")
                        }
                        .padding(.horizontal, 16)
                        operationsBookingStatusBreakdownCard
                        operationsInventoryMixCard
                        DashboardSectionCard(
                            title: "Pending Hosts",
                            subtitle: "New hosts requiring review",
                            columns: ["Name", "Email", "Service Types", "Date", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: applications.filter { text($0["status"]).lowercased() == "pending" }.prefix(6).map { row in
                            let name = text(row["full_name"])
                            let status = text(row["status"]).capitalized
                            let date = prettyDate(row["created_at"] as? String)
                            return "\(name.isEmpty ? "Host" : name) • \(status) • \(date)"
                        }, empty: "No pending applications.")
                    case .applications:
                        DashboardSectionCard(
                            title: "All Applications",
                            subtitle: "Complete application history",
                            columns: ["Name", "Email", "Service Types", "Status", "Date", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: applications.prefix(15).map { row in
                            let name = text(row["full_name"])
                            let status = text(row["status"]).capitalized
                            let date = prettyDate(row["created_at"] as? String)
                            return "\(name.isEmpty ? "Host" : name) • \(status) • \(date)"
                        }, empty: "No applications found.")
                        actionRowsCard(title: "Application Actions", rows: applications.prefix(6).map { row in
                            let id = text(row["id"])
                            let name = text(row["full_name"])
                            let status = text(row["status"]).lowercased()
                            return AnyView(
                                HStack {
                                    Text(name.isEmpty ? "Host" : name)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    if status != "approved" {
                                        Button("Approve") { Task { await updateApplicationStatus(id: id, status: "approved") } }
                                            .dashboardActionStyle(prominent: true)
                                    }
                                    if status != "rejected" {
                                        Button("Reject") { Task { await updateApplicationStatus(id: id, status: "rejected") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                }
                            )
                        })
                    case .userData:
                        DashboardSectionCard(
                            title: "User Data",
                            subtitle: "KYC files and profile completeness",
                            columns: ["User", "Type", "Profile Pic", "ID", "Selfie", "Status", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        operationsUserDataFilterBar
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            DashboardStatTile(title: "Rows", value: "\(userDataRows.count)", caption: "Filtered")
                            DashboardStatTile(title: "Collected", value: "\(userDataRows.filter { (($0["is_collected"] as? Bool) == true) }.count)", caption: "Complete KYC")
                        }
                        .padding(.horizontal, 16)
                        rowsList(items: userDataRows.prefix(30).map { row in
                            let name = text(row["full_name"])
                            let email = text(row["email"]) 
                            let type = text(row["user_type"]).capitalized
                            let collected = ((row["is_collected"] as? Bool) == true) ? "Collected" : "Missing"
                            let count = Int(number(row["collected_count"]))
                            return "\(name.isEmpty ? "User" : name) • \(email) • \(type) • \(collected) • \(count)/5 docs"
                        }, empty: "No user data rows found for current filters.")
                    case .bookings:
                        operationsBookingsFilterBar
                        DashboardSectionCard(
                            title: "Bookings",
                            subtitle: "Operational booking monitoring",
                            columns: ["Booking", "Guest", "Service", "Dates", "Amount", "Status", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: filteredBookings.prefix(30).map { row in
                            let booking = text(row["order_id"]).isEmpty ? text(row["id"]) : text(row["order_id"])
                            let status = text(row["status"]).capitalized
                            let amount = money(row["total_price"], currency: text(row["currency"]))
                            let date = prettyDate(row["created_at"] as? String)
                            return "\(booking) • \(status) • \(amount) • \(date)"
                        }, empty: "No bookings found for current filters.")
                        actionRowsCard(title: "Booking Actions", rows: bookings.prefix(6).map { row in
                            let id = text(row["id"])
                            let orderId = text(row["order_id"]) 
                            let status = text(row["status"]).lowercased()
                            return AnyView(
                                HStack {
                                    Text(orderId.isEmpty ? String(id.prefix(8)) : orderId)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    if status != "confirmed" {
                                        Button("Confirm") { Task { await updateBookingStatus(id: id, status: "confirmed") } }
                                            .dashboardActionStyle(prominent: true)
                                    }
                                    if status != "cancelled" {
                                        Button("Cancel") { Task { await updateBookingStatus(id: id, status: "cancelled") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                }
                            )
                        })
                    case .accommodations:
                        DashboardSectionCard(
                            title: "Accommodations",
                            subtitle: "Listing quality and publish controls",
                            columns: ["Image", "Property", "Host", "Location", "Price", "Status", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: properties.prefix(15).map { row in
                            let title = text(row["title"]) 
                            let location = text(row["location"])
                            let status = ((row["is_published"] as? Bool) == true) ? "Live" : "Draft"
                            let amount = money(row["price_per_night"], currency: text(row["currency"]))
                            return "\(title.isEmpty ? "Property" : title) • \(location) • \(amount) • \(status)"
                        }, empty: "No accommodations found.")
                        actionRowsCard(title: "Accommodation Actions", rows: properties.prefix(6).map { row in
                            let id = text(row["id"])
                            let title = text(row["title"])
                            let isPublished = (row["is_published"] as? Bool) == true
                            return AnyView(
                                HStack {
                                    Text(title.isEmpty ? "Property" : title)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    Button(isPublished ? "Unpublish" : "Publish") {
                                        Task { await updatePropertyPublished(id: id, publish: !isPublished) }
                                    }
                                    .dashboardActionStyle(prominent: !isPublished)
                                }
                            )
                        })
                    case .tours:
                        DashboardSectionCard(
                            title: "Tours",
                            subtitle: "Tour moderation and activation",
                            columns: ["Image", "Tour", "Type", "Location", "Price", "Status", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: tours.prefix(15).map { row in
                            let title = text(row["title"]) 
                            let location = text(row["location"])
                            let status = ((row["is_published"] as? Bool) == true) ? "Live" : "Draft"
                            let amount = money(row["price_per_person"], currency: text(row["currency"]))
                            return "\(title.isEmpty ? "Tour" : title) • \(location) • \(amount) • \(status)"
                        }, empty: "No tours found.")
                        actionRowsCard(title: "Tour Actions", rows: tours.prefix(6).map { row in
                            let id = text(row["id"])
                            let title = text(row["title"])
                            let isPublished = (row["is_published"] as? Bool) == true
                            let source = text(row["source"])
                            return AnyView(
                                HStack {
                                    Text(title.isEmpty ? "Tour" : title)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    Button(isPublished ? "Unpublish" : "Publish") {
                                        Task { await updateTourPublished(id: id, publish: !isPublished, source: source) }
                                    }
                                    .dashboardActionStyle(prominent: !isPublished)
                                }
                            )
                        })
                    case .transport:
                        DashboardSectionCard(
                            title: "Transport",
                            subtitle: "Vehicle and transfer operations",
                            columns: ["Service", "Provider", "Location", "Price", "Status", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: transport.prefix(15).map { row in
                            let serviceType = text(row["service_type"])
                            let location = text(row["location"])
                            let dayAmount = number(row["price_per_day"])
                            let hourAmount = number(row["price_per_hour"])
                            let value = dayAmount > 0 ? dayAmount : hourAmount
                            let status = ((row["is_published"] as? Bool) == true) ? "Live" : "Draft"
                            return "\(serviceType.isEmpty ? "Service" : serviceType) • \(location) • \(money(value, currency: text(row["currency"]))) • \(status)"
                        }, empty: "No transport services found.")
                        actionRowsCard(title: "Transport Actions", rows: transport.prefix(6).map { row in
                            let id = text(row["id"])
                            let serviceType = text(row["service_type"])
                            let isPublished = (row["is_published"] as? Bool) == true
                            return AnyView(
                                HStack {
                                    Text(serviceType.isEmpty ? "Service" : serviceType)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    Button(isPublished ? "Unpublish" : "Publish") {
                                        Task { await updateTransportPublished(id: id, publish: !isPublished) }
                                    }
                                    .dashboardActionStyle(prominent: !isPublished)
                                }
                            )
                        })
                    }
                }
            }
            .padding(.vertical, 12)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func badgeCount(for tab: OperationsTab) -> Int? {
        guard let summary else { return nil }
        switch tab {
        case .applications:
            return summary.hostApplicationsPending
        case .bookings:
            return pendingBookingsCount
        default:
            return nil
        }
    }

    private var pendingBookingsCount: Int {
        bookings.filter {
            let status = text($0["status"]).lowercased()
            return status == "pending" || status == "pending_confirmation"
        }.count
    }

    private var confirmedBookingsCount: Int {
        bookings.filter {
            let status = text($0["status"]).lowercased()
            return status == "confirmed" || status == "completed"
        }.count
    }

    private var publishedPropertiesCount: Int {
        properties.filter { ($0["is_published"] as? Bool) == true }.count
    }

    private var publishedToursCount: Int {
        tours.filter { ($0["is_published"] as? Bool) == true }.count
    }

    private var publishedTransportCount: Int {
        transport.filter { ($0["is_published"] as? Bool) == true }.count
    }

    private var filteredBookings: [[String: Any]] {
        let query = bookingSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return bookings.filter { row in
            let status = text(row["status"]).lowercased()
            let paymentStatus = text(row["payment_status"]).lowercased()

            let matchesFilter: Bool
            switch bookingFilter {
            case .all:
                matchesFilter = true
            case .pending:
                matchesFilter = status == "pending" || status == "pending_confirmation" || paymentStatus == "unpaid"
            case .confirmed:
                matchesFilter = status == "confirmed" || status == "completed"
            case .paid:
                matchesFilter = paymentStatus == "paid"
            case .cancelled:
                matchesFilter = status == "cancelled" || paymentStatus == "refunded"
            }

            if !matchesFilter { return false }
            if query.isEmpty { return true }

            let bookingId = text(row["id"]).lowercased()
            let orderId = text(row["order_id"]).lowercased()
            let email = text(row["guest_email"]).lowercased()
            let name = text(row["guest_name"]).lowercased()
            return bookingId.contains(query) || orderId.contains(query) || email.contains(query) || name.contains(query)
        }
    }

    private var bookingStatusBreakdownRows: [StatusBreakdownRow] {
        let total = bookings.count
        if total == 0 { return [] }

        let rows = [
            ("Pending", pendingBookingsCount),
            ("Confirmed", confirmedBookingsCount),
            ("Cancelled", bookings.filter { text($0["status"]).lowercased() == "cancelled" }.count),
            ("Paid", bookings.filter { text($0["payment_status"]).lowercased() == "paid" }.count),
        ]

        return rows.map { title, count in
            StatusBreakdownRow(
                id: title.lowercased(),
                title: title,
                count: count,
                share: total > 0 ? (Double(count) / Double(total)) * 100 : 0
            )
        }
    }

    private var userDataRows: [[String: Any]] {
        var userIndex: [String: [String: Any]] = [:]
        for row in users {
            let userId = text(row["user_id"])
            if !userId.isEmpty {
                userIndex[userId] = row
            }
        }

        var rows: [[String: Any]] = []
        let allUserIds = Set(userIndex.keys).union(Set(applications.map { text($0["user_id"]) }.filter { !$0.isEmpty }))

        for userId in allUserIds {
            let profile = userIndex[userId]
            let app = applications.first { text($0["user_id"]) == userId }

            let fullName = text(profile?["full_name"]) .isEmpty ? text(app?["full_name"]) : text(profile?["full_name"])
            let email = text(profile?["email"])
            let userType = app == nil ? "user" : "host"

            let avatar = text(profile?["avatar_url"])
            let idPhoto = text(app?["national_id_photo_url"])
            let selfie = text(app?["selfie_photo_url"])
            let tourLicense = text(app?["tour_license_url"])
            let rdb = text(app?["rdb_certificate_url"])
            let collectedCount = [avatar, idPhoto, selfie, tourLicense, rdb].filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }.count
            let isCollected = !avatar.isEmpty && !idPhoto.isEmpty && !selfie.isEmpty

            rows.append([
                "user_id": userId,
                "full_name": fullName,
                "email": email,
                "user_type": userType,
                "is_collected": isCollected,
                "collected_count": collectedCount,
            ])
        }

        let query = userDataSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return rows.filter { row in
            let type = text(row["user_type"]).lowercased()
            let isCollected = (row["is_collected"] as? Bool) == true

            if userDataScope == .hosts && type != "host" { return false }
            if userDataScope == .users && type != "user" { return false }
            if userDataFilter == .collected && !isCollected { return false }
            if userDataFilter == .missing && isCollected { return false }

            if query.isEmpty { return true }
            let name = text(row["full_name"]).lowercased()
            let email = text(row["email"]).lowercased()
            let userId = text(row["user_id"]).lowercased()
            return name.contains(query) || email.contains(query) || userId.contains(query)
        }
        .sorted { text($0["full_name"]).lowercased() < text($1["full_name"]).lowercased() }
    }

    private func load() async {
        guard let service else { return }
        loading = true
        summary = try? await service.fetchOperationsSummary()
        applications = (try? await service.fetchAdminHostApplications()) ?? []
        users = (try? await service.fetchAdminUsers()) ?? []
        bookings = (try? await service.fetchAdminBookings()) ?? []
        properties = (try? await service.fetchAdminProperties()) ?? []
        tours = (try? await service.fetchAdminTours()) ?? []
        transport = (try? await service.fetchAdminTransportServices()) ?? []
        errorMessage = nil
        loading = false
    }

    private var operationsBookingsFilterBar: some View {
        VStack(spacing: 8) {
            TextField("Search booking id, order id, email, guest", text: $bookingSearch)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(BookingFilter.allCases, id: \.self) { filter in
                        Button(filter.title) {
                            bookingFilter = filter
                        }
                        .dashboardActionStyle(prominent: bookingFilter == filter)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    private var operationsUserDataFilterBar: some View {
        VStack(spacing: 8) {
            TextField("Search by user id, name, email", text: $userDataSearch)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(UserDataScope.allCases, id: \.self) { scope in
                        Button(scope.title) {
                            userDataScope = scope
                        }
                        .dashboardActionStyle(prominent: userDataScope == scope)
                    }
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(UserDataFilter.allCases, id: \.self) { filter in
                        Button(filter.title) {
                            userDataFilter = filter
                        }
                        .dashboardActionStyle(prominent: userDataFilter == filter)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    private var operationsBookingStatusBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Booking Status Breakdown")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if bookingStatusBreakdownRows.isEmpty {
                Text("No bookings available yet.")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                ForEach(bookingStatusBreakdownRows) { row in
                    HStack(spacing: 10) {
                        Text(row.title)
                            .font(.caption.weight(.semibold))
                            .foregroundColor(AppTheme.textPrimary)
                        Spacer()
                        Text("\(row.count)")
                            .font(.caption)
                            .foregroundColor(AppTheme.textPrimary)
                        Text("(\(String(format: "%.1f", row.share))%)")
                            .font(.caption2)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private var operationsInventoryMixCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Inventory Mix")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            HStack(spacing: 10) {
                Text("Live Stays: \(publishedPropertiesCount)")
                    .font(.caption)
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                Text("Live Tours: \(publishedToursCount)")
                    .font(.caption)
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                Text("Live Transport: \(publishedTransportCount)")
                    .font(.caption)
                    .foregroundColor(AppTheme.textPrimary)
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func rowsList(items: [String], empty: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if items.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "tray")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                    Text(empty)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding(14)
            } else {
                ForEach(Array(items.enumerated()), id: \.offset) { index, line in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(index + 1)")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(AppTheme.textSecondary)
                            .frame(width: 20, height: 20)
                            .background(Color(uiColor: .systemGray6))
                            .clipShape(Circle())
                        Text(line)
                            .font(.caption)
                            .foregroundColor(AppTheme.textPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(index % 2 == 0 ? Color.white : Color(uiColor: .systemGray6).opacity(0.4))
                    if index < items.count - 1 {
                        Divider().padding(.leading, 14)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func actionRowsCard(title: String, rows: [AnyView]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                Spacer()
                if actionInFlight {
                    ProgressView().scaleEffect(0.8)
                }
            }
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                row
                Divider()
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func text(_ any: Any?) -> String {
        if let value = any as? String { return value }
        if let value = any as? NSNumber { return value.stringValue }
        return ""
    }

    private func number(_ any: Any?) -> Double {
        if let value = any as? Double { return value }
        if let value = any as? Int { return Double(value) }
        if let value = any as? NSNumber { return value.doubleValue }
        if let value = any as? String, let parsed = Double(value) { return parsed }
        return 0
    }

    private func money(_ amount: Any?, currency: String) -> String {
        "\((currency.isEmpty ? "RWF" : currency)) \(NumberFormatter.localizedString(from: NSNumber(value: number(amount)), number: .decimal))"
    }

    private func money(_ amount: Double, currency: String) -> String {
        "\((currency.isEmpty ? "RWF" : currency)) \(NumberFormatter.localizedString(from: NSNumber(value: amount), number: .decimal))"
    }

    private func prettyDate(_ value: String?) -> String {
        guard let value, let date = ISO8601DateFormatter().date(from: value) else { return "-" }
        return DateFormatter.localizedString(from: date, dateStyle: .short, timeStyle: .none)
    }

    private func updateApplicationStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateHostApplicationStatus(applicationId: id, status: status)
            actionMessage = "Application updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateBookingStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateBookingStatus(bookingId: id, status: status)
            actionMessage = "Booking updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updatePropertyPublished(id: String, publish: Bool) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.setPropertyPublished(propertyId: id, isPublished: publish)
            actionMessage = publish ? "Property published." : "Property unpublished."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateTourPublished(id: String, publish: Bool, source: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            if source == "tour_packages" {
                try await service.setTourPackagePublished(packageId: id, isPublished: publish)
                actionMessage = publish ? "Tour package published." : "Tour package unpublished."
            } else {
                try await service.setTourPublished(tourId: id, isPublished: publish)
                actionMessage = publish ? "Tour published." : "Tour unpublished."
            }
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateTransportPublished(id: String, publish: Bool) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.setTransportPublished(transportId: id, isPublished: publish)
            actionMessage = publish ? "Transport published." : "Transport unpublished."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }
}

private struct NativeSupportSummaryView: View {
    private struct StatusBreakdownRow: Identifiable {
        let id: String
        let title: String
        let count: Int
        let share: Double
    }

    private enum BookingFilter: String, CaseIterable {
        case all = "all"
        case pending = "pending"
        case confirmed = "confirmed"
        case cancelled = "cancelled"
        case refunded = "refunded"

        var title: String {
            switch self {
            case .all: return "All"
            case .pending: return "Pending"
            case .confirmed: return "Confirmed"
            case .cancelled: return "Cancelled"
            case .refunded: return "Refunded"
            }
        }
    }

    private enum TicketFilter: String, CaseIterable {
        case all = "all"
        case open = "open"
        case inProgress = "in_progress"
        case resolved = "resolved"
        case high = "high"

        var title: String {
            switch self {
            case .all: return "All"
            case .open: return "Open"
            case .inProgress: return "In Progress"
            case .resolved: return "Resolved"
            case .high: return "High Priority"
            }
        }
    }

    private enum SupportTab: String, CaseIterable {
        case overview = "Overview"
        case users = "Users"
        case bookings = "Bookings"
        case tickets = "Support Tickets"
    }

    @State private var selectedTab: SupportTab = .overview
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var summary: MobileSupportSummary?
    @State private var operations: MobileOperationsSummary?
    @State private var users: [[String: Any]] = []
    @State private var bookings: [[String: Any]] = []
    @State private var tickets: [[String: Any]] = []
    @State private var userSearch: String = ""
    @State private var bookingSearch: String = ""
    @State private var bookingFilter: BookingFilter = .all
    @State private var ticketSearch: String = ""
    @State private var ticketFilter: TicketFilter = .all
    @State private var actionMessage: String?
    @State private var actionInFlight = false
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                if let actionMessage {
                    Text(actionMessage)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .padding(.horizontal, 16)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(SupportTab.allCases, id: \.self) { tab in
                            DashboardTabPill(title: tab.rawValue, count: badgeCount(for: tab), selected: selectedTab == tab) {
                                selectedTab = tab
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }

                if let summary {
                    switch selectedTab {
                    case .overview:
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            DashboardStatTile(title: "Tickets Total", value: "\(summary.ticketsTotal)", caption: "All support tickets")
                            DashboardStatTile(title: "Open", value: "\(summary.ticketsOpen)", caption: "Urgent issues")
                            DashboardStatTile(title: "In Progress", value: "\(summary.ticketsInProgress)", caption: "Being worked")
                            DashboardStatTile(title: "Resolved", value: "\(summary.ticketsResolved)", caption: "Completed")
                            DashboardStatTile(title: "Users", value: "\(users.count)", caption: "Registered profiles")
                            DashboardStatTile(title: "New This Week", value: "\(newUsersThisWeek)", caption: "Recent signups")
                        }
                        .padding(.horizontal, 16)
                        supportTicketStatusBreakdownCard
                        DashboardSectionCard(
                            title: "Recent Users",
                            subtitle: "Latest user registrations",
                            columns: ["Name", "Phone", "Joined"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: users.prefix(5).map { row in
                            let name = text(row["full_name"])
                            let phone = text(row["phone"])
                            let joined = prettyDate(row["created_at"] as? String)
                            return "\(name.isEmpty ? "User" : name) • \(phone.isEmpty ? "No phone" : phone) • \(joined)"
                        }, empty: "No users found.")
                        DashboardSectionCard(
                            title: "Open Support Tickets",
                            subtitle: "Tickets requiring attention",
                            columns: ["Subject", "User", "Priority", "Created"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: tickets.filter { text($0["status"]).lowercased() == "open" }.prefix(6).map { row in
                            let subject = text(row["subject"])
                            let user = text(row["user_email"]).isEmpty ? text(row["user_id"]) : text(row["user_email"])
                            let priority = text(row["priority"]).capitalized
                            let created = prettyDate(row["created_at"] as? String)
                            return "\(subject) • \(user) • \(priority) • \(created)"
                        }, empty: "No open tickets.")
                    case .users:
                        DashboardSectionCard(
                            title: "All Users",
                            subtitle: "Search and manage user accounts",
                            columns: ["User ID", "Name", "Phone", "Joined", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        supportUsersSearchBar
                        rowsList(items: filteredUsers.prefix(30).map { row in
                            let id = text(row["user_id"])
                            let name = text(row["full_name"])
                            let phone = text(row["phone"])
                            return "\(id.prefix(8))... • \(name.isEmpty ? "N/A" : name) • \(phone.isEmpty ? "N/A" : phone)"
                        }, empty: "No users found for current search.")
                        actionRowsCard(title: "User Actions", rows: filteredUsers.prefix(8).map { row in
                            let userId = text(row["user_id"])
                            let name = text(row["full_name"])
                            let suspended = (row["is_suspended"] as? Bool) == true
                            return AnyView(
                                HStack {
                                    Text(name.isEmpty ? "User" : name)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    Button(suspended ? "Activate" : "Suspend") {
                                        Task { await setUserSuspended(userId: userId, suspended: !suspended) }
                                    }
                                    .dashboardActionStyle(prominent: suspended)
                                }
                            )
                        })
                    case .bookings:
                        supportBookingsFilterBar
                        DashboardSectionCard(
                            title: "Bookings",
                            subtitle: "View and assist with customer bookings",
                            columns: ["Booking", "Customer", "Service", "Dates", "Status", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: filteredBookings.prefix(30).map { row in
                            let booking = text(row["order_id"]).isEmpty ? text(row["id"]) : text(row["order_id"])
                            let status = text(row["status"]).capitalized
                            let payment = text(row["payment_status"]).capitalized
                            let guest = text(row["guest_name"]).isEmpty ? text(row["guest_email"]) : text(row["guest_name"])
                            let refundFlag = isRefundRequested(for: row) ? " • Refund Requested" : ""
                            return "\(booking) • \(guest) • \(status) • \(payment)\(refundFlag)"
                        }, empty: "No bookings found for current filters.")
                        actionRowsCard(title: "Booking Actions", rows: filteredBookings.prefix(8).map { row in
                            let id = text(row["id"])
                            let orderId = text(row["order_id"])
                            let status = text(row["status"]).lowercased()
                            let paymentStatus = text(row["payment_status"]).lowercased()
                            let refundActionable = isRefundRequested(for: row) && status == "cancelled" && paymentStatus == "paid"
                            return AnyView(
                                HStack {
                                    Text(orderId.isEmpty ? String(id.prefix(8)) : orderId)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    if refundActionable {
                                        Button("Approve Refund") {
                                            Task { await processRefundDecision(for: row, approve: true) }
                                        }
                                        .dashboardActionStyle(prominent: true)

                                        Button("Decline") {
                                            Task { await processRefundDecision(for: row, approve: false) }
                                        }
                                        .dashboardActionStyle(prominent: false)
                                    } else if status != "confirmed" {
                                        Button("Confirm") { Task { await updateBookingStatus(id: id, status: "confirmed") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                    if !refundActionable && status != "cancelled" {
                                        Button("Cancel") { Task { await updateBookingStatus(id: id, status: "cancelled") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                }
                            )
                        })
                    case .tickets:
                        supportTicketsFilterBar
                        DashboardSectionCard(
                            title: "Support Tickets",
                            subtitle: "Ticket queue and state transitions",
                            columns: ["Subject", "User", "Priority", "Status", "Created", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: filteredTickets.prefix(30).map { row in
                            let subject = text(row["subject"])
                            let user = text(row["user_email"]).isEmpty ? text(row["user_id"]) : text(row["user_email"])
                            let priority = text(row["priority"]).capitalized
                            let status = text(row["status"]).capitalized
                            return "\(subject) • \(user) • \(priority) • \(status)"
                        }, empty: "No support tickets found for current filters.")
                        actionRowsCard(title: "Ticket Actions", rows: filteredTickets.prefix(10).map { row in
                            let id = text(row["id"])
                            let subject = text(row["subject"])
                            let status = text(row["status"]).lowercased()
                            return AnyView(
                                HStack {
                                    Text(subject.isEmpty ? "Ticket" : subject)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    if status != "open" {
                                        Button("Open") { Task { await updateTicketStatus(id: id, status: "open") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                    if status != "in_progress" {
                                        Button("In Progress") { Task { await updateTicketStatus(id: id, status: "in_progress") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                    if status != "resolved" {
                                        Button("Resolve") { Task { await updateTicketStatus(id: id, status: "resolved") } }
                                            .dashboardActionStyle(prominent: true)
                                    }
                                    if status != "closed" {
                                        Button("Close") { Task { await updateTicketStatus(id: id, status: "closed") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                }
                            )
                        })
                    }
                }
            }
            .padding(.vertical, 12)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func badgeCount(for tab: SupportTab) -> Int? {
        switch tab {
        case .bookings:
            return operations?.bookingsTotal
        case .tickets:
            return filteredTickets.filter { text($0["status"]).lowercased() == "open" }.count
        default:
            return nil
        }
    }

    private var newUsersThisWeek: Int {
        let weekAgo = Date().addingTimeInterval(-7 * 24 * 60 * 60)
        return users.filter { row in
            guard let created = row["created_at"] as? String,
                  let date = ISO8601DateFormatter().date(from: created) else { return false }
            return date >= weekAgo
        }.count
    }

    private var filteredUsers: [[String: Any]] {
        let query = userSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return users }
        return users.filter { row in
            let id = text(row["user_id"]).lowercased()
            let name = text(row["full_name"]).lowercased()
            let phone = text(row["phone"]).lowercased()
            let email = text(row["email"]).lowercased()
            return id.contains(query) || name.contains(query) || phone.contains(query) || email.contains(query)
        }
    }

    private var filteredBookings: [[String: Any]] {
        let query = bookingSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return bookings.filter { row in
            let status = text(row["status"]).lowercased()
            let paymentStatus = text(row["payment_status"]).lowercased()

            let filterMatch: Bool
            switch bookingFilter {
            case .all:
                filterMatch = true
            case .pending:
                filterMatch = status == "pending" || status == "pending_confirmation"
            case .confirmed:
                filterMatch = status == "confirmed" || status == "completed"
            case .cancelled:
                filterMatch = status == "cancelled"
            case .refunded:
                filterMatch = paymentStatus == "refunded"
            }
            if !filterMatch { return false }
            if query.isEmpty { return true }

            let bookingId = text(row["id"]).lowercased()
            let orderId = text(row["order_id"]).lowercased()
            let guest = text(row["guest_name"]).lowercased()
            let email = text(row["guest_email"]).lowercased()
            return bookingId.contains(query) || orderId.contains(query) || guest.contains(query) || email.contains(query)
        }
    }

    private var filteredTickets: [[String: Any]] {
        let query = ticketSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return tickets.filter { row in
            let status = text(row["status"]).lowercased()
            let priority = text(row["priority"]).lowercased()

            let filterMatch: Bool
            switch ticketFilter {
            case .all:
                filterMatch = true
            case .open:
                filterMatch = status == "open"
            case .inProgress:
                filterMatch = status == "in_progress"
            case .resolved:
                filterMatch = status == "resolved" || status == "closed"
            case .high:
                filterMatch = priority == "high"
            }
            if !filterMatch { return false }
            if query.isEmpty { return true }

            let subject = text(row["subject"]).lowercased()
            let user = text(row["user_email"]).lowercased()
            let userId = text(row["user_id"]).lowercased()
            return subject.contains(query) || user.contains(query) || userId.contains(query)
        }
    }

    private var ticketStatusBreakdownRows: [StatusBreakdownRow] {
        let total = tickets.count
        if total == 0 { return [] }
        let open = tickets.filter { text($0["status"]).lowercased() == "open" }.count
        let inProgress = tickets.filter { text($0["status"]).lowercased() == "in_progress" }.count
        let resolved = tickets.filter {
            let s = text($0["status"]).lowercased()
            return s == "resolved" || s == "closed"
        }.count
        let high = tickets.filter { text($0["priority"]).lowercased() == "high" }.count

        let rows = [
            ("Open", open),
            ("In Progress", inProgress),
            ("Resolved", resolved),
            ("High Priority", high)
        ]
        return rows.map { title, count in
            StatusBreakdownRow(
                id: title.lowercased().replacingOccurrences(of: " ", with: "_"),
                title: title,
                count: count,
                share: total > 0 ? (Double(count) / Double(total)) * 100 : 0
            )
        }
    }

    private func extractRefundRefs(from ticket: [String: Any]) -> Set<String> {
        var refs = Set<String>()
        let status = text(ticket["status"]).lowercased()
        if status == "resolved" || status == "closed" {
            return refs
        }

        let subject = text(ticket["subject"])
        let category = text(ticket["category"]).lowercased()
        let isRefundTicket = subject.lowercased().contains("refund request") || category == "payment"
        if !isRefundTicket {
            return refs
        }

        let subjectPattern = "refund request for booking\\s+(.+)$"
        if let regex = try? NSRegularExpression(pattern: subjectPattern, options: [.caseInsensitive]) {
            let nsSubject = subject as NSString
            let range = NSRange(location: 0, length: nsSubject.length)
            if let match = regex.firstMatch(in: subject, options: [], range: range), match.numberOfRanges > 1 {
                let raw = nsSubject.substring(with: match.range(at: 1)).trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                if !raw.isEmpty { refs.insert(raw) }
            }
        }

        let bodyText = "\(text(ticket["message"]))\n\(text(ticket["response"]))"
        let patterns = [
            "booking\\s*id\\s*[:#-]?\\s*([a-z0-9-]{6,})",
            "order\\s*id\\s*[:#-]?\\s*([a-z0-9-]{6,})",
            "refund request for booking\\s+([a-z0-9-]{6,})"
        ]

        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { continue }
            let nsBody = bodyText as NSString
            let range = NSRange(location: 0, length: nsBody.length)
            let matches = regex.matches(in: bodyText, options: [], range: range)
            for match in matches where match.numberOfRanges > 1 {
                let value = nsBody.substring(with: match.range(at: 1)).trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                if !value.isEmpty { refs.insert(value) }
            }
        }

        return refs
    }

    private var refundRequestRefs: Set<String> {
        var refs = Set<String>()
        for ticket in tickets {
            refs.formUnion(extractRefundRefs(from: ticket))
        }
        return refs
    }

    private func isRefundRequested(for booking: [String: Any]) -> Bool {
        let bookingRef = text(booking["id"]).lowercased()
        let orderRef = text(booking["order_id"]).lowercased()
        return refundRequestRefs.contains(bookingRef) || (!orderRef.isEmpty && refundRequestRefs.contains(orderRef))
    }

    private func findOpenRefundTicket(for booking: [String: Any]) -> [String: Any]? {
        let bookingRef = text(booking["id"]).lowercased()
        let orderRef = text(booking["order_id"]).lowercased()

        return tickets.first { ticket in
            let refs = extractRefundRefs(from: ticket)
            return refs.contains(bookingRef) || (!orderRef.isEmpty && refs.contains(orderRef))
        }
    }

    private func load() async {
        guard let service else { return }
        loading = true
        summary = try? await service.fetchSupportSummary()
        operations = try? await service.fetchOperationsSummary()
        users = (try? await service.fetchAdminUsers()) ?? []
        bookings = (try? await service.fetchAdminBookings()) ?? []
        tickets = (try? await service.fetchAdminSupportTickets()) ?? []
        errorMessage = nil
        loading = false
    }

    private var supportUsersSearchBar: some View {
        TextField("Search by user id, name, phone, email", text: $userSearch)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .padding(.horizontal, 16)
    }

    private var supportBookingsFilterBar: some View {
        VStack(spacing: 8) {
            TextField("Search booking id, order id, guest, email", text: $bookingSearch)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(BookingFilter.allCases, id: \.self) { filter in
                        Button(filter.title) {
                            bookingFilter = filter
                        }
                        .dashboardActionStyle(prominent: bookingFilter == filter)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    private var supportTicketsFilterBar: some View {
        VStack(spacing: 8) {
            TextField("Search subject, user email, user id", text: $ticketSearch)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled(true)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(TicketFilter.allCases, id: \.self) { filter in
                        Button(filter.title) {
                            ticketFilter = filter
                        }
                        .dashboardActionStyle(prominent: ticketFilter == filter)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    private var supportTicketStatusBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Ticket Status Breakdown")
                .font(.headline)
                .foregroundColor(AppTheme.textPrimary)

            if ticketStatusBreakdownRows.isEmpty {
                Text("No support tickets available yet.")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                ForEach(ticketStatusBreakdownRows) { row in
                    HStack(spacing: 10) {
                        Text(row.title)
                            .font(.caption.weight(.semibold))
                            .foregroundColor(AppTheme.textPrimary)
                        Spacer()
                        Text("\(row.count)")
                            .font(.caption)
                            .foregroundColor(AppTheme.textPrimary)
                        Text("(\(String(format: "%.1f", row.share))%)")
                            .font(.caption2)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func rowsList(items: [String], empty: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if items.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "tray")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                    Text(empty)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding(14)
            } else {
                ForEach(Array(items.enumerated()), id: \.offset) { index, line in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(index + 1)")
                            .font(.caption2.weight(.bold))
                            .foregroundColor(AppTheme.textSecondary)
                            .frame(width: 20, height: 20)
                            .background(Color(uiColor: .systemGray6))
                            .clipShape(Circle())
                        Text(line)
                            .font(.caption)
                            .foregroundColor(AppTheme.textPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(index % 2 == 0 ? Color.white : Color(uiColor: .systemGray6).opacity(0.4))
                    if index < items.count - 1 {
                        Divider().padding(.leading, 14)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func actionRowsCard(title: String, rows: [AnyView]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textSecondary)
                Spacer()
                if actionInFlight {
                    ProgressView().scaleEffect(0.8)
                }
            }
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                row
                Divider()
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func text(_ any: Any?) -> String {
        if let value = any as? String { return value }
        if let value = any as? NSNumber { return value.stringValue }
        return ""
    }

    private func prettyDate(_ value: String?) -> String {
        guard let value, let date = ISO8601DateFormatter().date(from: value) else { return "-" }
        return DateFormatter.localizedString(from: date, dateStyle: .short, timeStyle: .none)
    }

    private func setUserSuspended(userId: String, suspended: Bool) async {
        guard !userId.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.setUserSuspended(userId: userId, isSuspended: suspended)
            actionMessage = suspended ? "User suspended." : "User activated."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateBookingStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateBookingStatus(bookingId: id, status: status)
            actionMessage = "Booking updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func processRefundDecision(for booking: [String: Any], approve: Bool) async {
        guard let service else { return }
        let bookingId = text(booking["id"])
        if bookingId.isEmpty { return }

        actionInFlight = true
        defer { actionInFlight = false }

        do {
            try await service.applySupportRefundDecision(
                bookingId: bookingId,
                orderId: text(booking["order_id"]),
                approve: approve
            )

            if let ticket = findOpenRefundTicket(for: booking) {
                let ticketId = text(ticket["id"])
                if !ticketId.isEmpty {
                    let response = approve
                        ? "Support: Refund approved and completed."
                        : "Support: Refund declined. Booking restored to confirmed/paid."
                    try? await service.updateSupportTicket(ticketId: ticketId, status: "resolved", response: response)
                }
            }

            actionMessage = approve ? "Refund approved and booking updated." : "Refund declined and booking reactivated."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }

    private func updateTicketStatus(id: String, status: String) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.updateSupportTicketStatus(ticketId: id, status: status)
            actionMessage = "Ticket updated to \(status)."
            await load()
        } catch {
            actionMessage = error.localizedDescription
        }
    }
}

// MARK: - Cloudinary uploader shared across creation forms

private extension Data {
    mutating func appendCFField(name: String, value: String, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
        append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8) ?? Data())
        append("\(value)\r\n".data(using: .utf8) ?? Data())
    }
    mutating func appendCFFile(name: String, fileName: String, jpeg: Data, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
        append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8) ?? Data())
        append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8) ?? Data())
        append(jpeg)
        append("\r\n".data(using: .utf8) ?? Data())
    }
}

private enum ListingCloudinaryUploader {
    private static var didRunPreflight = false
    private static var cachedPreflightIssue: String?

    static func preflightIssue() async -> String? {
        if didRunPreflight { return cachedPreflightIssue }
        didRunPreflight = true

        let cloud  = MobileConfig.cloudinaryCloudName.trimmingCharacters(in: .whitespacesAndNewlines)
        let preset = MobileConfig.cloudinaryUploadPreset.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cloud.isEmpty, !preset.isEmpty,
              let endpoint = URL(string: "https://api.cloudinary.com/v1_1/\(cloud)/image/upload")
        else {
            cachedPreflightIssue = "Cloudinary is not configured."
            return cachedPreflightIssue
        }

        // Tiny 1x1 PNG used only to verify Cloudinary account/preset validity.
        let probeData = Data(base64Encoded: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6P4+0AAAAASUVORK5CYII=") ?? Data()
        let boundary = "Boundary-\(UUID().uuidString)"
        var body = Data()
        body.appendCFField(name: "upload_preset", value: preset, boundary: boundary)
        body.appendCFField(name: "folder", value: "mobile-preflight", boundary: boundary)
        body.append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"probe.png\"\r\n".data(using: .utf8) ?? Data())
        body.append("Content-Type: image/png\r\n\r\n".data(using: .utf8) ?? Data())
        body.append(probeData)
        body.append("\r\n".data(using: .utf8) ?? Data())
        body.append("--\(boundary)--\r\n".data(using: .utf8) ?? Data())

        var req = URLRequest(url: endpoint)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        req.httpBody = body

        guard let (respData, resp) = try? await URLSession.shared.data(for: req),
              let http = resp as? HTTPURLResponse else {
            cachedPreflightIssue = "Cloudinary preflight failed. Check network connection."
            return cachedPreflightIssue
        }

        if (200...299).contains(http.statusCode) {
            cachedPreflightIssue = nil
            return nil
        }

        if let json = try? JSONSerialization.jsonObject(with: respData) as? [String: Any],
           let error = json["error"] as? [String: Any],
           let message = error["message"] as? String {
            cachedPreflightIssue = "Cloudinary error: \(message)"
            return cachedPreflightIssue
        }

        cachedPreflightIssue = "Cloudinary upload check failed (HTTP \(http.statusCode))."
        return cachedPreflightIssue
    }

    static func upload(_ items: [PhotosPickerItem], folder: String) async -> [String] {
        let cloud  = MobileConfig.cloudinaryCloudName.trimmingCharacters(in: .whitespacesAndNewlines)
        let preset = MobileConfig.cloudinaryUploadPreset.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cloud.isEmpty, !preset.isEmpty,
              let endpoint = URL(string: "https://api.cloudinary.com/v1_1/\(cloud)/image/upload")
        else { return [] }
        var result: [String] = []
        for item in items {
            guard let raw  = try? await item.loadTransferable(type: Data.self),
                  let img  = UIImage(data: raw),
                  let jpeg = img.jpegData(compressionQuality: 0.82) else { continue }
            let boundary = "Boundary-\(UUID().uuidString)"
            var body = Data()
            body.appendCFField(name: "upload_preset", value: preset, boundary: boundary)
            body.appendCFField(name: "folder",        value: folder, boundary: boundary)
            body.appendCFFile(name: "file", fileName: "photo-\(UUID().uuidString).jpg", jpeg: jpeg, boundary: boundary)
            body.append("--\(boundary)--\r\n".data(using: .utf8) ?? Data())
            var req = URLRequest(url: endpoint)
            req.httpMethod = "POST"
            req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            req.httpBody = body
            guard let (respData, _) = try? await URLSession.shared.data(for: req),
                  let json  = try? JSONSerialization.jsonObject(with: respData) as? [String: Any],
                  let url   = json["secure_url"] as? String else { continue }
            result.append(url)
        }
        return result
    }
}

// MARK: - Shared creation form UI helpers

private func cfProgressBar(step: Int, total: Int, title: String) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        HStack {
            Text("Step \(step) of \(total): \(title)")
                .font(.caption).foregroundColor(AppTheme.textSecondary)
            Spacer()
        }
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 3).fill(AppTheme.cardBackground).frame(height: 5)
                RoundedRectangle(cornerRadius: 3).fill(AppTheme.coral)
                    .frame(width: geo.size.width * CGFloat(step) / CGFloat(total), height: 5)
            }
        }.frame(height: 5)
    }
}

private func cfSectionHeader(_ text: String) -> some View {
    Text(text)
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(AppTheme.textPrimary)
        .frame(maxWidth: .infinity, alignment: .leading)
}

private func cfChipRow(_ label: String, options: [String], selected: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(label).font(.caption).foregroundColor(AppTheme.textSecondary)
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { opt in
                    Button(opt) { selected.wrappedValue = opt }
                        .font(.caption.weight(selected.wrappedValue == opt ? .semibold : .regular))
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(selected.wrappedValue == opt ? AppTheme.coral : Color.white)
                        .foregroundColor(selected.wrappedValue == opt ? .white : AppTheme.textSecondary)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(selected.wrappedValue == opt ? AppTheme.coral : AppTheme.borderSubtle, lineWidth: 1))
                }
            }
        }
    }
}

private func cfTextArea(_ label: String, text: Binding<String>, minHeight: CGFloat = 90) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(label).font(.caption).foregroundColor(AppTheme.textSecondary)
        TextEditor(text: text)
            .frame(minHeight: minHeight)
            .padding(8)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private func cfPhotoGrid(_ urls: [String]) -> some View {
    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
        ForEach(Array(urls.enumerated()), id: \.offset) { _, url in
            if let imgUrl = URL(string: url) {
                AsyncImage(url: imgUrl) { img in img.resizable().scaledToFill() }
                    placeholder: { Color.gray.opacity(0.15).overlay(ProgressView().scaleEffect(0.6)) }
                    .frame(height: 88)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
        }
    }
}

private func cfNavButtons(step: Binding<Int>, total: Int, canAdvance: Bool, saving: Bool, finalLabel: String, onSubmit: @escaping () -> Void) -> some View {
    HStack(spacing: 12) {
        if step.wrappedValue > 1 {
            Button("← Back") { step.wrappedValue -= 1 }
                .font(.system(size: 15, weight: .medium))
                .frame(maxWidth: .infinity).padding(.vertical, 13)
                .foregroundColor(AppTheme.textPrimary)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(AppTheme.borderSubtle, lineWidth: 1))
        }
        if step.wrappedValue < total {
            Button("Next →") { step.wrappedValue += 1 }
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity).padding(.vertical, 13)
                .foregroundColor(.white)
                .background(canAdvance ? AppTheme.coral : Color.gray.opacity(0.4))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .disabled(!canAdvance)
        } else {
            Button(saving ? "Publishing..." : finalLabel, action: onSubmit)
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity).padding(.vertical, 13)
                .foregroundColor(.white)
                .background(saving ? Color.gray.opacity(0.4) : AppTheme.coral)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .disabled(saving)
        }
    }
}

private func cfWarningCard(_ text: String) -> some View {
    HStack(spacing: 8) {
        Image(systemName: "exclamationmark.triangle.fill")
            .foregroundColor(.orange)
        Text(text)
            .font(.caption)
            .foregroundColor(AppTheme.textSecondary)
        Spacer(minLength: 0)
    }
    .padding(10)
    .background(Color.orange.opacity(0.12))
    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
}

// MARK: - Create Tour (4 steps)

private struct NativeCreateTourView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    private let service = SupabaseService()

    @State private var step = 1
    private let totalSteps = 4

    // Step 1
    @State private var title = ""
    @State private var description = ""
    @State private var location = ""

    // Step 2
    @State private var category = "Adventure"
    @State private var durationDays = "1"
    @State private var maxGroupSize = "10"
    @State private var pricingModel = "per_person"
    @State private var selectedPricingModels: [String] = ["per_person"]
    @State private var pricePerPerson = ""
    @State private var pricePerGroup = ""
    @State private var pricePerHour = ""
    @State private var pricePerMinute = ""
    @State private var pricePerGroupSize = "2"
    @State private var timeTierDurationValue = ""
    @State private var timeTierDurationUnit = "hour"
    @State private var timeTierPrice = ""
    @State private var timePricingTiers: [[String: Any]] = []
    @State private var tierMinGroupSize = ""
    @State private var tierMaxGroupSize = ""
    @State private var tierPrice = ""
    @State private var groupPricingTiers: [[String: Any]] = []
    @State private var currency = "RWF"

    // Step 3
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var uploadedUrls: [String] = []
    @State private var uploadingImages = false

    @State private var saving = false
    @State private var message: String?
    @State private var cloudinaryIssue: String?

    private let categoryOptions = ["Nature", "Adventure", "Cultural", "Wildlife", "Historical", "City Tours", "Eco-Tourism", "Photography"]
    private let currencyOptions  = ["RWF", "USD", "EUR", "KES", "UGX", "TZS"]
    private let pricingModelOptions = ["per_person", "per_group", "per_hour", "per_minute"]

    private var stepTitles: [String] { ["Basic Info", "Pricing", "Media", "Review"] }

    private func pricingModelDisplay(_ model: String) -> String {
        switch model {
        case "per_group": return "Per group"
        case "per_hour": return "Per hour"
        case "per_minute": return "Per minute"
        default: return "Per person"
        }
    }

    private func priceForModel(_ model: String) -> Double {
        switch model {
        case "per_group": return Double(pricePerGroup) ?? 0
        case "per_hour": return Double(pricePerHour) ?? 0
        case "per_minute": return Double(pricePerMinute) ?? 0
        default: return Double(pricePerPerson) ?? 0
        }
    }

    private var selectedPrice: Double {
        priceForModel(pricingModel)
    }

    private func hasTimeTier(for unit: String) -> Bool {
        timePricingTiers.contains { tier in
            let duration = tier["duration_value"] as? Double ?? 0
            let price = tier["price"] as? Double ?? 0
            let tierUnit = tier["duration_unit"] as? String ?? ""
            return tierUnit == unit && duration > 0 && price > 0
        }
    }

    private var hasValidPricing: Bool {
        guard !selectedPricingModels.isEmpty else { return false }
        for model in selectedPricingModels {
            switch model {
            case "per_group":
                if !(priceForModel(model) > 0 || !groupPricingTiers.isEmpty) { return false }
            case "per_hour":
                if !(priceForModel(model) > 0 || hasTimeTier(for: "hour")) { return false }
            case "per_minute":
                if !(priceForModel(model) > 0 || hasTimeTier(for: "minute")) { return false }
            default:
                if !(priceForModel(model) > 0) { return false }
            }
        }
        return true
    }

    private var canAdvance: Bool {
        switch step {
        case 1:
            return !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && !location.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case 2:
            return hasValidPricing
        default:
            return true
        }
    }

    private var pricingModelLabel: String {
        pricingModelDisplay(pricingModel)
    }

    private var effectivePriceLabel: String {
        switch pricingModel {
        case "per_group": return "Price Per Group"
        case "per_hour": return "Price Per Hour"
        case "per_minute": return "Price Per Minute"
        default: return "Price Per Person"
        }
    }

    private var pricingModelBinding: Binding<String> {
        Binding(
            get: { pricingModel },
            set: { next in
                if selectedPricingModels.contains(next) {
                    pricingModel = next
                }
            }
        )
    }

    private var timeTierUnitOptions: [String] {
        var options: [String] = []
        if selectedPricingModels.contains("per_hour") { options.append("hour") }
        if selectedPricingModels.contains("per_minute") { options.append("minute") }
        return options
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                cfProgressBar(step: step, total: totalSteps, title: stepTitles[step - 1])
                if let cloudinaryIssue { cfWarningCard(cloudinaryIssue) }

                switch step {
                case 1:
                    VStack(spacing: 12) {
                        cfSectionHeader("Basic Information")
                        labeledField("Tour Name *", text: $title)
                        cfTextArea("Description *", text: $description)
                        labeledField("Location *", text: $location)
                    }
                case 2:
                    VStack(spacing: 12) {
                        cfSectionHeader("Details & Pricing")
                        cfChipRow("Category", options: categoryOptions, selected: $category)
                        labeledField("Duration (days)", text: $durationDays)
                        labeledField("Max Group Size", text: $maxGroupSize)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Pricing Models")
                                .font(.caption)
                                .foregroundColor(AppTheme.textSecondary)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(pricingModelOptions, id: \.self) { model in
                                        let active = selectedPricingModels.contains(model)
                                        Button(action: {
                                            togglePricingModel(model)
                                        }) {
                                            HStack(spacing: 6) {
                                                Image(systemName: active ? "checkmark.circle.fill" : "circle")
                                                    .font(.caption)
                                                Text(pricingModelDisplay(model))
                                                    .font(.caption.weight(.semibold))
                                            }
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .foregroundColor(active ? .white : AppTheme.textSecondary)
                                            .background(active ? AppTheme.coral : Color.white)
                                            .clipShape(Capsule())
                                            .overlay(Capsule().stroke(active ? AppTheme.coral : AppTheme.borderSubtle, lineWidth: 1))
                                        }
                                    }
                                }
                            }
                        }

                        cfChipRow("Primary Pricing Model", options: selectedPricingModels, selected: pricingModelBinding)
                        Text("Use multiple models to match web behavior. Primary model is stored as pricing_model.")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        if selectedPricingModels.contains("per_person") {
                            labeledField("Price Per Person", text: $pricePerPerson)
                        }

                        if selectedPricingModels.contains("per_group") {
                            labeledField("Price Per Group", text: $pricePerGroup)
                            labeledField("Price Per Group Size", text: $pricePerGroupSize)

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Group Pricing Tiers (optional)")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)

                                labeledField("Min Group Size", text: $tierMinGroupSize)
                                labeledField("Max Group Size", text: $tierMaxGroupSize)
                                labeledField("Tier Price", text: $tierPrice)

                                Button(action: addGroupPricingTier) {
                                    Text("Add Group Tier")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(AppTheme.coral)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(AppTheme.coral.opacity(0.08))
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }

                                if !groupPricingTiers.isEmpty {
                                    VStack(spacing: 6) {
                                        ForEach(Array(groupPricingTiers.enumerated()), id: \.offset) { idx, tier in
                                            HStack(spacing: 8) {
                                                Text("\(Int(tier["min_group_size"] as? Double ?? 0)) - \(Int(tier["max_group_size"] as? Double ?? 0)) people")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.textPrimary)
                                                Spacer()
                                                Text("\(tier["price"] as? Double ?? 0, specifier: "%.2f") \(currency)")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.textSecondary)
                                                Button("Remove") {
                                                    groupPricingTiers.remove(at: idx)
                                                }
                                                .font(.caption)
                                                .foregroundColor(.red)
                                            }
                                            .padding(10)
                                            .background(AppTheme.cardBackground)
                                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                        }
                                    }
                                }
                            }
                        }

                        if selectedPricingModels.contains("per_hour") {
                            labeledField("Price Per Hour", text: $pricePerHour)
                        }

                        if selectedPricingModels.contains("per_minute") {
                            labeledField("Price Per Minute", text: $pricePerMinute)
                        }

                        if selectedPricingModels.contains("per_hour") || selectedPricingModels.contains("per_minute") {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Time Pricing Tiers (optional)")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)

                                labeledField("Duration Value", text: $timeTierDurationValue)
                                cfChipRow("Duration Unit", options: timeTierUnitOptions, selected: Binding(
                                    get: { timeTierDurationUnit },
                                    set: { next in
                                        if timeTierUnitOptions.contains(next) { timeTierDurationUnit = next }
                                    }
                                ))
                                labeledField("Tier Price", text: $timeTierPrice)

                                Button(action: addTimePricingTier) {
                                    Text("Add Time Tier")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(AppTheme.coral)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(AppTheme.coral.opacity(0.08))
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }

                                if !timePricingTiers.isEmpty {
                                    VStack(spacing: 6) {
                                        ForEach(Array(timePricingTiers.enumerated()), id: \.offset) { idx, tier in
                                            HStack(spacing: 8) {
                                                let duration = tier["duration_value"] as? Double ?? 0
                                                let unit = tier["duration_unit"] as? String ?? "hour"
                                                let price = tier["price"] as? Double ?? 0
                                                Text("\(duration, specifier: "%.2f") \(unit)")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.textPrimary)
                                                Spacer()
                                                Text("\(price, specifier: "%.2f") \(currency)")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.textSecondary)
                                                Button("Remove") {
                                                    timePricingTiers.remove(at: idx)
                                                }
                                                .font(.caption)
                                                .foregroundColor(.red)
                                            }
                                            .padding(10)
                                            .background(AppTheme.cardBackground)
                                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                        }
                                    }
                                }
                            }
                        }

                        cfChipRow("Currency", options: currencyOptions, selected: $currency)
                    }
                case 3:
                    VStack(spacing: 12) {
                        cfSectionHeader("Media")
                        Text("At least one photo recommended for better bookings.")
                            .font(.caption).foregroundColor(AppTheme.textSecondary)
                        PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 10, matching: .images) {
                            HStack(spacing: 8) {
                                Image(systemName: "photo.on.rectangle.angled")
                                Text(uploadingImages ? "Uploading…" : "Select Photos")
                            }
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .foregroundColor(AppTheme.coral)
                            .background(AppTheme.coral.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .disabled(uploadingImages)
                        .onChange(of: selectedPhotos) { items in Task { await uploadPhotos(items) } }
                        if !uploadedUrls.isEmpty { cfPhotoGrid(uploadedUrls) }
                    }
                default:
                    VStack(spacing: 12) {
                        cfSectionHeader("Review & Publish")
                        reviewRow("Tour Name", title)
                        reviewRow("Location", location)
                        reviewRow("Category", category)
                        reviewRow("Duration", "\(Int(durationDays) ?? 1) day(s)")
                        reviewRow("Max Group Size", "\(Int(maxGroupSize) ?? 10)")
                        reviewRow("Pricing Models", selectedPricingModels.map(pricingModelDisplay).joined(separator: ", "))
                        reviewRow("Pricing Model", pricingModelLabel)
                        reviewRow(effectivePriceLabel, String(format: "%.2f %@", selectedPrice, currency))
                        if selectedPricingModels.contains("per_person") {
                            reviewRow("Price Per Person", String(format: "%.2f %@", Double(pricePerPerson) ?? 0, currency))
                        }
                        if selectedPricingModels.contains("per_group") {
                            reviewRow("Price Per Group", String(format: "%.2f %@", Double(pricePerGroup) ?? 0, currency))
                            reviewRow("Price Per Group Size", "\(Int(pricePerGroupSize) ?? 2)")
                            reviewRow("Group Pricing Tiers", "\(groupPricingTiers.count)")
                        }
                        if selectedPricingModels.contains("per_hour") {
                            reviewRow("Price Per Hour", String(format: "%.2f %@", Double(pricePerHour) ?? 0, currency))
                        }
                        if selectedPricingModels.contains("per_minute") {
                            reviewRow("Price Per Minute", String(format: "%.2f %@", Double(pricePerMinute) ?? 0, currency))
                        }
                        if selectedPricingModels.contains("per_hour") || selectedPricingModels.contains("per_minute") {
                            reviewRow("Time Pricing Tiers", "\(timePricingTiers.count)")
                        }
                        reviewRow("Photos", "\(uploadedUrls.count)")
                    }
                }

                cfNavButtons(step: $step, total: totalSteps, canAdvance: canAdvance, saving: saving || uploadingImages, finalLabel: "Publish Tour") {
                    Task { await submit() }
                }

                if let message { Text(message).font(.caption).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading) }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task {
            cloudinaryIssue = await ListingCloudinaryUploader.preflightIssue()
        }
    }

    private func uploadPhotos(_ items: [PhotosPickerItem]) async {
        uploadingImages = true
        uploadedUrls = await ListingCloudinaryUploader.upload(items, folder: "tours/mobile")
        uploadingImages = false
        if !items.isEmpty, uploadedUrls.isEmpty {
            message = cloudinaryIssue ?? "Cloudinary upload failed. Please check account configuration and try again."
        }
    }

    private func addGroupPricingTier() {
        let minSize = max(1, Int(tierMinGroupSize) ?? 0)
        let maxSize = max(minSize, Int(tierMaxGroupSize) ?? 0)
        let price = Double(tierPrice) ?? 0
        guard price > 0 else { return }

        groupPricingTiers.append([
            "min_group_size": Double(minSize),
            "max_group_size": Double(maxSize),
            "price": price
        ])

        tierMinGroupSize = ""
        tierMaxGroupSize = ""
        tierPrice = ""
    }

    private func addTimePricingTier() {
        let duration = Double(timeTierDurationValue) ?? 0
        let price = Double(timeTierPrice) ?? 0
        guard duration > 0, price > 0 else { return }
        guard timeTierUnitOptions.contains(timeTierDurationUnit) else { return }

        timePricingTiers.append([
            "duration_value": duration,
            "duration_unit": timeTierDurationUnit,
            "price": price
        ])

        timeTierDurationValue = ""
        timeTierPrice = ""
    }

    private func togglePricingModel(_ model: String) {
        if selectedPricingModels.contains(model) {
            if selectedPricingModels.count == 1 { return }
            selectedPricingModels.removeAll { $0 == model }
            if pricingModel == model {
                pricingModel = selectedPricingModels.first ?? "per_person"
            }
            if model == "per_hour" && timeTierDurationUnit == "hour" && !selectedPricingModels.contains("per_hour") {
                timeTierDurationUnit = selectedPricingModels.contains("per_minute") ? "minute" : "hour"
            }
            if model == "per_minute" && timeTierDurationUnit == "minute" && !selectedPricingModels.contains("per_minute") {
                timeTierDurationUnit = selectedPricingModels.contains("per_hour") ? "hour" : "minute"
            }
            return
        }

        selectedPricingModels.append(model)
        if selectedPricingModels.count == 1 {
            pricingModel = model
        }
        if (model == "per_hour" || model == "per_minute") && !timeTierUnitOptions.contains(timeTierDurationUnit) {
            timeTierDurationUnit = model == "per_minute" ? "minute" : "hour"
        }
    }

    private func reviewRow(_ label: String, _ value: String) -> some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            Spacer()
            Text(value.isEmpty ? "-" : value)
                .font(.caption)
                .foregroundColor(AppTheme.textPrimary)
                .multilineTextAlignment(.trailing)
        }
        .padding(10)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        guard !uploadedUrls.isEmpty else {
            message = "Upload at least one photo before publishing."
            return
        }
        saving = true; defer { saving = false }
        do {
            var payload: [String: Any] = [
                "title": title, "description": description, "location": location,
                "category": category, "categories": [category],
                "duration_days": Int(durationDays) ?? 1,
                "max_group_size": Int(maxGroupSize) ?? 10,
                "price_per_person": Double(pricePerPerson) ?? selectedPrice,
                "currency": currency, "is_published": true
            ]

            var pricingTiers: [String: Any] = [
                "pricing_model": pricingModel,
                "pricing_models": selectedPricingModels
            ]

            if selectedPricingModels.contains("per_group") {
                pricingTiers["price_per_group_size"] = max(1, Int(pricePerGroupSize) ?? 2)
                pricingTiers["group_pricing_tiers"] = groupPricingTiers
            }

            if selectedPricingModels.contains("per_hour") || selectedPricingModels.contains("per_minute") {
                pricingTiers["pricing_duration_value"] = 1
                pricingTiers["time_pricing_tiers"] = timePricingTiers
            }

            payload["pricing_tiers"] = pricingTiers
            if !uploadedUrls.isEmpty { payload["images"] = uploadedUrls }
            try await service.createTour(hostId: hostId, payload: payload)
            message = "Tour published successfully ✓"
        } catch { message = "Error: \(error.localizedDescription)" }
    }
}

// MARK: - Create Tour Package (5 steps)

private struct NativeCreateTourPackageView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    private let service = SupabaseService()

    @State private var step = 1
    private let totalSteps = 5

    // Step 1
    @State private var title = ""
    @State private var category = "Cultural"
    @State private var description = ""
    @State private var city = "Kigali"
    @State private var duration = "1 day"

    // Step 2
    @State private var dailyItinerary = ""
    @State private var includedServices = ""
    @State private var excludedServices = ""
    @State private var meetingPoint = ""

    // Step 3
    @State private var pricePerAdult = ""
    @State private var pricingModel = "per_person"
    @State private var selectedPricingModels: [String] = ["per_person"]
    @State private var pricePerGroup = ""
    @State private var pricePerHour = ""
    @State private var pricePerMinute = ""
    @State private var timeTierDurationValue = ""
    @State private var timeTierDurationUnit = "hour"
    @State private var timeTierPrice = ""
    @State private var timePricingTiers: [[String: Any]] = []
    @State private var tierMinGroupSize = ""
    @State private var tierMaxGroupSize = ""
    @State private var tierPrice = ""
    @State private var groupPricingTiers: [[String: Any]] = []
    @State private var minGuests = "1"
    @State private var maxGuests = "8"
    @State private var currency = "RWF"

    // Step 4
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var uploadedUrls: [String] = []
    @State private var uploadingImages = false

    @State private var saving = false
    @State private var message: String?
    @State private var cloudinaryIssue: String?

    private let categoryOptions = ["Cultural", "Adventure", "Wildlife", "City Tours", "Hiking", "Photography", "Historical", "Eco-Tourism"]
    private let currencyOptions  = ["RWF", "USD", "EUR", "KES", "UGX", "TZS"]
    private let pricingModelOptions = ["per_person", "per_group", "per_hour", "per_minute"]

    private var stepTitles: [String] { ["Basic Info", "Itinerary", "Pricing", "Photos", "Review"] }

    private var primarySelectedPrice: Double {
        priceForModel(pricingModel)
    }

    private func pricingModelDisplay(_ model: String) -> String {
        switch model {
        case "per_group": return "Per group"
        case "per_hour": return "Per hour"
        case "per_minute": return "Per minute"
        default: return "Per person"
        }
    }

    private func priceForModel(_ model: String) -> Double {
        switch model {
        case "per_group": return Double(pricePerGroup) ?? 0
        case "per_hour": return Double(pricePerHour) ?? 0
        case "per_minute": return Double(pricePerMinute) ?? 0
        default: return Double(pricePerAdult) ?? 0
        }
    }

    private func hasTimeTier(for unit: String) -> Bool {
        timePricingTiers.contains { tier in
            let duration = tier["duration_value"] as? Double ?? 0
            let price = tier["price"] as? Double ?? 0
            let tierUnit = tier["duration_unit"] as? String ?? ""
            return tierUnit == unit && duration > 0 && price > 0
        }
    }

    private var timeTierUnitOptions: [String] {
        var options: [String] = []
        if selectedPricingModels.contains("per_hour") { options.append("hour") }
        if selectedPricingModels.contains("per_minute") { options.append("minute") }
        return options
    }

    private var pricingModelBinding: Binding<String> {
        Binding(
            get: { pricingModel },
            set: { next in
                if selectedPricingModels.contains(next) {
                    pricingModel = next
                }
            }
        )
    }

    private var hasValidPricing: Bool {
        guard !selectedPricingModels.isEmpty else { return false }
        for model in selectedPricingModels {
            switch model {
            case "per_group":
                if !(priceForModel(model) > 0 || !groupPricingTiers.isEmpty) { return false }
            case "per_hour":
                if !(priceForModel(model) > 0 || hasTimeTier(for: "hour")) { return false }
            case "per_minute":
                if !(priceForModel(model) > 0 || hasTimeTier(for: "minute")) { return false }
            default:
                if !(priceForModel(model) > 0) { return false }
            }
        }
        return true
    }

    private var canAdvance: Bool {
        switch step {
        case 1: return !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !city.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case 2: return !dailyItinerary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case 3: return hasValidPricing
        default: return true
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                cfProgressBar(step: step, total: totalSteps, title: stepTitles[step - 1])
                if let cloudinaryIssue { cfWarningCard(cloudinaryIssue) }

                switch step {
                case 1:
                    VStack(spacing: 12) {
                        cfSectionHeader("Basic Information")
                        labeledField("Package Title *", text: $title)
                        cfChipRow("Category", options: categoryOptions, selected: $category)
                        cfTextArea("Description *", text: $description)
                        labeledField("City *", text: $city)
                        labeledField("Duration (e.g. 3 Days, 2 Nights)", text: $duration)
                    }
                case 2:
                    VStack(spacing: 12) {
                        cfSectionHeader("Itinerary")
                        cfTextArea("Daily Itinerary *", text: $dailyItinerary, minHeight: 120)
                        cfTextArea("Included Services", text: $includedServices)
                        cfTextArea("Excluded Services", text: $excludedServices)
                        labeledField("Meeting Point *", text: $meetingPoint)
                    }
                case 3:
                    VStack(spacing: 12) {
                        cfSectionHeader("Pricing")
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Pricing Models")
                                .font(.caption)
                                .foregroundColor(AppTheme.textSecondary)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(pricingModelOptions, id: \.self) { model in
                                        let active = selectedPricingModels.contains(model)
                                        Button(action: { togglePricingModel(model) }) {
                                            HStack(spacing: 6) {
                                                Image(systemName: active ? "checkmark.circle.fill" : "circle")
                                                    .font(.caption)
                                                Text(pricingModelDisplay(model))
                                                    .font(.caption.weight(.semibold))
                                            }
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .foregroundColor(active ? .white : AppTheme.textSecondary)
                                            .background(active ? AppTheme.coral : Color.white)
                                            .clipShape(Capsule())
                                            .overlay(Capsule().stroke(active ? AppTheme.coral : AppTheme.borderSubtle, lineWidth: 1))
                                        }
                                    }
                                }
                            }
                        }
                        cfChipRow("Primary Pricing Model", options: selectedPricingModels, selected: pricingModelBinding)
                        labeledField("Price Per Adult", text: $pricePerAdult)
                        if selectedPricingModels.contains("per_group") {
                            labeledField("Price Per Group", text: $pricePerGroup)
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Group Pricing Tiers (optional)")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)
                                labeledField("Min Group Size", text: $tierMinGroupSize)
                                labeledField("Max Group Size", text: $tierMaxGroupSize)
                                labeledField("Tier Price", text: $tierPrice)
                                Button(action: addGroupPricingTier) {
                                    Text("Add Group Tier")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(AppTheme.coral)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(AppTheme.coral.opacity(0.08))
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                                if !groupPricingTiers.isEmpty {
                                    VStack(spacing: 6) {
                                        ForEach(Array(groupPricingTiers.enumerated()), id: \.offset) { idx, tier in
                                            HStack(spacing: 8) {
                                                Text("\(Int(tier["min_group_size"] as? Double ?? 0)) - \(Int(tier["max_group_size"] as? Double ?? 0)) people")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.textPrimary)
                                                Spacer()
                                                Text("\(tier["price"] as? Double ?? 0, specifier: "%.2f") \(currency)")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.textSecondary)
                                                Button("Remove") { groupPricingTiers.remove(at: idx) }
                                                    .font(.caption)
                                                    .foregroundColor(.red)
                                            }
                                            .padding(10)
                                            .background(AppTheme.cardBackground)
                                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                        }
                                    }
                                }
                            }
                        }
                        if selectedPricingModels.contains("per_hour") {
                            labeledField("Price Per Hour", text: $pricePerHour)
                        }
                        if selectedPricingModels.contains("per_minute") {
                            labeledField("Price Per Minute", text: $pricePerMinute)
                        }
                        if selectedPricingModels.contains("per_hour") || selectedPricingModels.contains("per_minute") {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Time Pricing Tiers (optional)")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)
                                labeledField("Duration Value", text: $timeTierDurationValue)
                                cfChipRow("Duration Unit", options: timeTierUnitOptions, selected: Binding(
                                    get: { timeTierDurationUnit },
                                    set: { next in
                                        if timeTierUnitOptions.contains(next) { timeTierDurationUnit = next }
                                    }
                                ))
                                labeledField("Tier Price", text: $timeTierPrice)
                                Button(action: addTimePricingTier) {
                                    Text("Add Time Tier")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(AppTheme.coral)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(AppTheme.coral.opacity(0.08))
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                                if !timePricingTiers.isEmpty {
                                    VStack(spacing: 6) {
                                        ForEach(Array(timePricingTiers.enumerated()), id: \.offset) { idx, tier in
                                            HStack(spacing: 8) {
                                                let duration = tier["duration_value"] as? Double ?? 0
                                                let unit = tier["duration_unit"] as? String ?? "hour"
                                                let price = tier["price"] as? Double ?? 0
                                                Text("\(duration, specifier: "%.2f") \(unit)")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.textPrimary)
                                                Spacer()
                                                Text("\(price, specifier: "%.2f") \(currency)")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.textSecondary)
                                                Button("Remove") { timePricingTiers.remove(at: idx) }
                                                    .font(.caption)
                                                    .foregroundColor(.red)
                                            }
                                            .padding(10)
                                            .background(AppTheme.cardBackground)
                                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                        }
                                    }
                                }
                            }
                        }
                        labeledField("Min Guests", text: $minGuests)
                        labeledField("Max Guests", text: $maxGuests)
                        cfChipRow("Currency", options: currencyOptions, selected: $currency)
                    }
                case 4:
                    VStack(spacing: 12) {
                        cfSectionHeader("Photos")
                        Text("Upload tour package photos.")
                            .font(.caption).foregroundColor(AppTheme.textSecondary)
                        PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 10, matching: .images) {
                            HStack(spacing: 8) {
                                Image(systemName: "photo.on.rectangle.angled")
                                Text(uploadingImages ? "Uploading…" : "Select Photos")
                            }
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .foregroundColor(AppTheme.coral)
                            .background(AppTheme.coral.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .disabled(uploadingImages)
                        .onChange(of: selectedPhotos) { items in Task { await uploadPhotos(items) } }
                        if !uploadedUrls.isEmpty { cfPhotoGrid(uploadedUrls) }
                    }
                default:
                    VStack(spacing: 12) {
                        cfSectionHeader("Review & Publish")
                        if uploadedUrls.isEmpty {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.orange)
                                Text("No photos added yet. Listings with photos usually perform better.")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)
                                Spacer(minLength: 0)
                            }
                            .padding(10)
                            .background(Color.orange.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        reviewRow("Package Title", title)
                        reviewRow("Category", category)
                        reviewRow("City", city)
                        reviewRow("Duration", duration)
                        reviewRow("Meeting Point", meetingPoint)
                        reviewRow("Min Guests", "\(Int(minGuests) ?? 1)")
                        reviewRow("Max Guests", "\(Int(maxGuests) ?? 8)")
                        reviewRow("Pricing Models", selectedPricingModels.map(pricingModelDisplay).joined(separator: ", "))
                        reviewRow("Primary Pricing", pricingModelDisplay(pricingModel))
                        reviewRow("Primary Price", String(format: "%.2f %@", primarySelectedPrice, currency))
                        if selectedPricingModels.contains("per_person") {
                            reviewRow("Price Per Adult", String(format: "%.2f %@", Double(pricePerAdult) ?? 0, currency))
                        }
                        if selectedPricingModels.contains("per_group") {
                            reviewRow("Price Per Group", String(format: "%.2f %@", Double(pricePerGroup) ?? 0, currency))
                            reviewRow("Group Pricing Tiers", "\(groupPricingTiers.count)")
                        }
                        if selectedPricingModels.contains("per_hour") {
                            reviewRow("Price Per Hour", String(format: "%.2f %@", Double(pricePerHour) ?? 0, currency))
                        }
                        if selectedPricingModels.contains("per_minute") {
                            reviewRow("Price Per Minute", String(format: "%.2f %@", Double(pricePerMinute) ?? 0, currency))
                        }
                        if selectedPricingModels.contains("per_hour") || selectedPricingModels.contains("per_minute") {
                            reviewRow("Time Pricing Tiers", "\(timePricingTiers.count)")
                        }
                        reviewRow("Photos", "\(uploadedUrls.count)")
                    }
                }

                cfNavButtons(step: $step, total: totalSteps, canAdvance: canAdvance, saving: saving || uploadingImages, finalLabel: "Publish Package") {
                    Task { await submit() }
                }

                if let message { Text(message).font(.caption).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading) }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task {
            cloudinaryIssue = await ListingCloudinaryUploader.preflightIssue()
        }
    }

    private func uploadPhotos(_ items: [PhotosPickerItem]) async {
        uploadingImages = true
        uploadedUrls = await ListingCloudinaryUploader.upload(items, folder: "tour-packages/mobile")
        uploadingImages = false
        if !items.isEmpty, uploadedUrls.isEmpty {
            message = cloudinaryIssue ?? "Cloudinary upload failed. Please check account configuration and try again."
        }
    }

    private func togglePricingModel(_ model: String) {
        if selectedPricingModels.contains(model) {
            if selectedPricingModels.count == 1 { return }
            selectedPricingModels.removeAll { $0 == model }
            if pricingModel == model {
                pricingModel = selectedPricingModels.first ?? "per_person"
            }
            if model == "per_hour" && timeTierDurationUnit == "hour" && !selectedPricingModels.contains("per_hour") {
                timeTierDurationUnit = selectedPricingModels.contains("per_minute") ? "minute" : "hour"
            }
            if model == "per_minute" && timeTierDurationUnit == "minute" && !selectedPricingModels.contains("per_minute") {
                timeTierDurationUnit = selectedPricingModels.contains("per_hour") ? "hour" : "minute"
            }
            return
        }

        selectedPricingModels.append(model)
        if selectedPricingModels.count == 1 {
            pricingModel = model
        }
        if (model == "per_hour" || model == "per_minute") && !timeTierUnitOptions.contains(timeTierDurationUnit) {
            timeTierDurationUnit = model == "per_minute" ? "minute" : "hour"
        }
    }

    private func addGroupPricingTier() {
        let minSize = max(1, Int(tierMinGroupSize) ?? 0)
        let maxSize = max(minSize, Int(tierMaxGroupSize) ?? 0)
        let price = Double(tierPrice) ?? 0
        guard price > 0 else { return }

        groupPricingTiers.append([
            "min_group_size": Double(minSize),
            "max_group_size": Double(maxSize),
            "price": price
        ])

        tierMinGroupSize = ""
        tierMaxGroupSize = ""
        tierPrice = ""
    }

    private func addTimePricingTier() {
        let duration = Double(timeTierDurationValue) ?? 0
        let price = Double(timeTierPrice) ?? 0
        guard duration > 0, price > 0 else { return }
        guard timeTierUnitOptions.contains(timeTierDurationUnit) else { return }

        timePricingTiers.append([
            "duration_value": duration,
            "duration_unit": timeTierDurationUnit,
            "price": price
        ])

        timeTierDurationValue = ""
        timeTierPrice = ""
    }

    private func reviewRow(_ label: String, _ value: String) -> some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            Spacer()
            Text(value.isEmpty ? "-" : value)
                .font(.caption)
                .foregroundColor(AppTheme.textPrimary)
                .multilineTextAlignment(.trailing)
        }
        .padding(10)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        guard !uploadedUrls.isEmpty else {
            message = "Upload at least one photo before publishing."
            return
        }
        saving = true; defer { saving = false }
        do {
            var payload: [String: Any] = [
                "title": title, "category": category, "tour_type": "Group",
                "city": city, "duration": duration, "description": description,
                "daily_itinerary": dailyItinerary,
                "meeting_point": meetingPoint,
                "price_per_adult": Double(pricePerAdult) ?? 0,
                "currency": currency,
                "min_guests": Int(minGuests) ?? 1,
                "max_guests": Int(maxGuests) ?? 8,
                "categories": [category], "status": "approved"
            ]

            var pricingTiers: [String: Any] = [
                "tiers": [[
                    "group_size": 1,
                    "price_per_person": Double(pricePerAdult) ?? 0
                ]],
                "pricing_model": pricingModel,
                "pricing_models": selectedPricingModels
            ]
            if selectedPricingModels.contains("per_group") {
                pricingTiers["group_pricing_tiers"] = groupPricingTiers
            }
            if selectedPricingModels.contains("per_hour") || selectedPricingModels.contains("per_minute") {
                pricingTiers["pricing_duration_value"] = 1
                pricingTiers["time_pricing_tiers"] = timePricingTiers
            }
            payload["pricing_tiers"] = pricingTiers

            if !includedServices.isEmpty { payload["included_services"] = includedServices }
            if !excludedServices.isEmpty { payload["excluded_services"] = excludedServices }
            if !uploadedUrls.isEmpty { payload["gallery_images"] = uploadedUrls; payload["cover_image"] = uploadedUrls[0] }
            try await service.createTourPackage(hostId: hostId, payload: payload)
            message = "Tour package published successfully ✓"
        } catch { message = "Error: \(error.localizedDescription)" }
    }
}

// MARK: - Create Property / Room (3 steps)

private struct NativeCreatePropertyView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    let listingType: String
    private let service = SupabaseService()

    @State private var step = 1
    private let totalSteps = 3

    // Step 1
    @State private var title = ""
    @State private var location = "Kigali"
    @State private var description = ""
    @State private var propertyType = "Apartment"

    // Step 2
    @State private var bedrooms = "1"
    @State private var bathrooms = "1"
    @State private var maxGuests = "2"
    @State private var pricePerNight = ""
    @State private var currency = "RWF"

    // Step 3
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var uploadedUrls: [String] = []
    @State private var uploadingImages = false

    @State private var saving = false
    @State private var message: String?
    @State private var cloudinaryIssue: String?

    private let propertyTypes = ["Apartment", "House", "Villa", "Studio", "Guesthouse", "Hotel Room", "Hostel", "Other"]
    private let currencyOptions = ["RWF", "USD", "EUR", "KES", "UGX", "TZS"]

    private var stepTitles: [String] { ["Basic Info", "Details & Pricing", "Photos"] }
    private var canAdvance: Bool {
        step == 1 ? (!title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !location.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) : true
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                cfProgressBar(step: step, total: totalSteps, title: stepTitles[step - 1])
                if let cloudinaryIssue { cfWarningCard(cloudinaryIssue) }

                switch step {
                case 1:
                    VStack(spacing: 12) {
                        cfSectionHeader("Basic Information")
                        labeledField(listingType == "room" ? "Room Title *" : "Property Title *", text: $title)
                        labeledField("Location *", text: $location)
                        cfTextArea("Description", text: $description)
                        if listingType != "room" {
                            cfChipRow("Property Type", options: propertyTypes, selected: $propertyType)
                        }
                    }
                case 2:
                    VStack(spacing: 12) {
                        cfSectionHeader("Details & Pricing")
                        labeledField("Bedrooms", text: $bedrooms)
                        labeledField("Bathrooms", text: $bathrooms)
                        labeledField("Max Guests", text: $maxGuests)
                        labeledField("Price Per Night *", text: $pricePerNight)
                        cfChipRow("Currency", options: currencyOptions, selected: $currency)
                    }
                default:
                    VStack(spacing: 12) {
                        cfSectionHeader("Photos")
                        Text("Upload photos to attract more guests.")
                            .font(.caption).foregroundColor(AppTheme.textSecondary)
                        PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 15, matching: .images) {
                            HStack(spacing: 8) {
                                Image(systemName: "photo.on.rectangle.angled")
                                Text(uploadingImages ? "Uploading…" : "Select Photos")
                            }
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .foregroundColor(AppTheme.coral)
                            .background(AppTheme.coral.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .disabled(uploadingImages)
                        .onChange(of: selectedPhotos) { items in Task { await uploadPhotos(items) } }
                        if !uploadedUrls.isEmpty { cfPhotoGrid(uploadedUrls) }
                    }
                }

                cfNavButtons(step: $step, total: totalSteps, canAdvance: canAdvance, saving: saving || uploadingImages,
                             finalLabel: listingType == "room" ? "Publish Room" : "Publish Property") {
                    Task { await submit() }
                }

                if let message { Text(message).font(.caption).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading) }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task {
            cloudinaryIssue = await ListingCloudinaryUploader.preflightIssue()
        }
    }

    private func uploadPhotos(_ items: [PhotosPickerItem]) async {
        uploadingImages = true
        uploadedUrls = await ListingCloudinaryUploader.upload(items, folder: "properties/mobile")
        uploadingImages = false
        if !items.isEmpty, uploadedUrls.isEmpty {
            message = cloudinaryIssue ?? "Cloudinary upload failed. Please check account configuration and try again."
        }
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { message = "Please sign in as host first."; return }
        let safeTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !safeTitle.isEmpty else { message = "Title is required."; return }
        guard !uploadedUrls.isEmpty else { message = "Upload at least one photo before publishing."; return }
        saving = true; defer { saving = false }
        do {
            var payload: [String: Any] = [
                "title": safeTitle, "location": location, "description": description,
                "property_type": listingType == "room" ? "Room" : propertyType,
                "bedrooms": Int(bedrooms) ?? 1, "bathrooms": Int(bathrooms) ?? 1,
                "max_guests": Int(maxGuests) ?? 2,
                "price_per_night": Double(pricePerNight) ?? 0,
                "currency": currency, "is_published": true,
                "monthly_only_listing": false, "available_for_monthly_rental": false
            ]
            if !uploadedUrls.isEmpty { payload["images"] = uploadedUrls; payload["main_image"] = uploadedUrls[0] }
            _ = try await service.createProperty(hostId: hostId, payload: payload)
            message = listingType == "room" ? "Room listed successfully ✓" : "Property listed successfully ✓"
        } catch { message = "Could not publish listing: \(error.localizedDescription)" }
    }
}

// MARK: - Create Transport Vehicle (3 steps)

private struct NativeCreateTransportVehicleView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    let serviceType: String
    private let service = SupabaseService()

    @State private var step = 1
    private let totalSteps = 3

    // Step 1
    @State private var title = ""
    @State private var providerName = ""
    @State private var carBrand = ""
    @State private var carModel = ""
    @State private var carYear = "2024"
    @State private var vehicleType = "Sedan"
    @State private var seats = "4"

    // Step 2
    @State private var dailyPrice = ""
    @State private var weeklyPrice = ""
    @State private var monthlyPrice = ""
    @State private var currency = "RWF"

    // Step 3
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var uploadedUrls: [String] = []
    @State private var uploadingImages = false

    @State private var saving = false
    @State private var message: String?
    @State private var cloudinaryIssue: String?

    private let vehicleTypes  = ["Sedan", "SUV", "Hatchback", "Van", "Minibus", "Luxury Car", "Pickup Truck", "Other"]
    private let carBrands     = ["Toyota", "Honda", "Nissan", "Mazda", "Mitsubishi", "Suzuki", "Hyundai", "Mercedes-Benz", "BMW", "Land Rover", "Other"]
    private let currencyOptions = ["RWF", "USD", "EUR", "KES", "UGX", "TZS"]

    private var stepTitles: [String] { ["Vehicle Details", "Pricing", "Photos"] }
    private var canAdvance: Bool {
        step == 1 ? (!carBrand.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !carModel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) : true
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                cfProgressBar(step: step, total: totalSteps, title: stepTitles[step - 1])
                if let cloudinaryIssue { cfWarningCard(cloudinaryIssue) }

                switch step {
                case 1:
                    VStack(spacing: 12) {
                        cfSectionHeader("Vehicle Details")
                        cfChipRow("Car Brand *", options: carBrands, selected: $carBrand)
                        labeledField("Car Model *", text: $carModel)
                        labeledField("Year (e.g. 2023)", text: $carYear)
                        cfChipRow("Vehicle Type", options: vehicleTypes, selected: $vehicleType)
                        labeledField("Seats", text: $seats)
                        labeledField("Provider / Company Name", text: $providerName)
                        labeledField("Listing Title (optional — auto-generated if empty)", text: $title)
                    }
                case 2:
                    VStack(spacing: 12) {
                        cfSectionHeader("Rental Pricing")
                        labeledField("Daily Price *", text: $dailyPrice)
                        labeledField("Weekly Price (optional)", text: $weeklyPrice)
                        labeledField("Monthly Price (optional)", text: $monthlyPrice)
                        cfChipRow("Currency", options: currencyOptions, selected: $currency)
                    }
                default:
                    VStack(spacing: 12) {
                        cfSectionHeader("Vehicle Photos")
                        Text("Upload exterior and interior photos.")
                            .font(.caption).foregroundColor(AppTheme.textSecondary)
                        PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 12, matching: .images) {
                            HStack(spacing: 8) {
                                Image(systemName: "car.fill")
                                Text(uploadingImages ? "Uploading…" : "Select Photos")
                            }
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity).padding(.vertical, 12)
                            .foregroundColor(AppTheme.coral)
                            .background(AppTheme.coral.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .disabled(uploadingImages)
                        .onChange(of: selectedPhotos) { items in Task { await uploadPhotos(items) } }
                        if !uploadedUrls.isEmpty { cfPhotoGrid(uploadedUrls) }
                    }
                }

                cfNavButtons(step: $step, total: totalSteps, canAdvance: canAdvance, saving: saving || uploadingImages, finalLabel: "Publish Vehicle") {
                    Task { await submit() }
                }

                if let message { Text(message).font(.caption).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading) }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task {
            cloudinaryIssue = await ListingCloudinaryUploader.preflightIssue()
        }
    }

    private func uploadPhotos(_ items: [PhotosPickerItem]) async {
        uploadingImages = true
        uploadedUrls = await ListingCloudinaryUploader.upload(items, folder: "transport/mobile")
        uploadingImages = false
        if !items.isEmpty, uploadedUrls.isEmpty {
            message = cloudinaryIssue ?? "Cloudinary upload failed. Please check account configuration and try again."
        }
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        guard !uploadedUrls.isEmpty else {
            message = "Upload at least one vehicle photo before publishing."
            return
        }
        saving = true; defer { saving = false }
        do {
            let listingTitle = title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? "\(carBrand) \(carModel) \(carYear)".trimmingCharacters(in: .whitespacesAndNewlines)
                : title
            var payload: [String: Any] = [
                "title": listingTitle, "provider_name": providerName,
                "vehicle_type": vehicleType, "car_type": vehicleType,
                "car_brand": carBrand, "car_model": carModel,
                "car_year": Int(carYear) ?? 2024, "seats": Int(seats) ?? 4,
                "daily_price": Double(dailyPrice) ?? 0,
                "weekly_price": Double(weeklyPrice) ?? 0,
                "monthly_price": Double(monthlyPrice) ?? 0,
                "currency": currency, "is_published": true
            ]
            if !uploadedUrls.isEmpty {
                payload["exterior_images"] = uploadedUrls
                payload["media"] = uploadedUrls
                payload["image_url"] = uploadedUrls[0]
            }
            _ = try await service.createTransportVehicle(hostId: hostId, payload: payload, serviceType: serviceType)
            message = "Vehicle published successfully ✓"
        } catch { message = "Error: \(error.localizedDescription)" }
    }
}

// MARK: - Create Airport Transfer (2 steps)

private struct NativeCreateAirportTransferView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    private let service = SupabaseService()

    @State private var step = 1
    private let totalSteps = 2

    // Step 1
    @State private var providerName = ""
    @State private var carBrand = ""
    @State private var carModel = ""
    @State private var carYear = "2024"
    @State private var seats = "4"

    // Step 2
    @State private var routeId = ""
    @State private var routePrice = ""
    @State private var currency = "RWF"

    @State private var saving = false
    @State private var message: String?

    private let currencyOptions = ["RWF", "USD", "EUR", "KES"]

    private var stepTitles: [String] { ["Vehicle", "Route & Pricing"] }
    private var canAdvance: Bool {
        step == 1 ? (!carBrand.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !carModel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) : true
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                cfProgressBar(step: step, total: totalSteps, title: stepTitles[step - 1])

                switch step {
                case 1:
                    VStack(spacing: 12) {
                        cfSectionHeader("Vehicle Details")
                        labeledField("Provider / Company Name", text: $providerName)
                        labeledField("Car Brand *", text: $carBrand)
                        labeledField("Car Model *", text: $carModel)
                        labeledField("Car Year", text: $carYear)
                        labeledField("Seats", text: $seats)
                    }
                default:
                    VStack(spacing: 12) {
                        cfSectionHeader("Route & Pricing")
                        labeledField("Route (e.g. Airport → Kigali City Center)", text: $routeId)
                        labeledField("Route Price", text: $routePrice)
                        cfChipRow("Currency", options: currencyOptions, selected: $currency)
                    }
                }

                cfNavButtons(step: $step, total: totalSteps, canAdvance: canAdvance, saving: saving, finalLabel: "Publish Airport Transfer") {
                    Task { await submit() }
                }

                if let message { Text(message).font(.caption).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading) }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        saving = true; defer { saving = false }
        do {
            let listingTitle = "Airport Transfer · \(carBrand) \(carModel) \(carYear)".trimmingCharacters(in: .whitespacesAndNewlines)
            let payload: [String: Any] = [
                "title": listingTitle, "provider_name": providerName,
                "vehicle_type": "Airport Transfer", "car_type": "Airport Transfer",
                "car_brand": carBrand, "car_model": carModel,
                "car_year": Int(carYear) ?? 2024, "seats": Int(seats) ?? 4,
                "currency": currency, "price_per_day": 0,
                "media": [], "exterior_images": [], "interior_images": []
            ]
            if let vehicleId = try await service.createTransportVehicle(hostId: hostId, payload: payload, serviceType: "airport_transfer"),
               !routeId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
               let routePriceValue = Double(routePrice) {
                try await service.createAirportTransferPricing(vehicleId: vehicleId, routeId: routeId, price: routePriceValue, currency: currency)
            }
            message = "Airport transfer published successfully ✓"
        } catch { message = "Error: \(error.localizedDescription)" }
    }
}

private func labeledField(_ label: String, text: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(label)
            .font(.caption)
            .foregroundColor(AppTheme.textSecondary)
        TextField(label, text: text)
            .textInputAutocapitalization(.sentences)
            .padding(12)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private func submitButton(title: String, saving: Bool, action: @escaping () async -> Void) -> some View {
    Button(saving ? "Saving..." : title) {
        Task { await action() }
    }
    .disabled(saving)
    .font(.headline)
    .frame(maxWidth: .infinity)
    .padding(.vertical, 14)
    .foregroundColor(.white)
    .background(AppTheme.coral)
    .clipShape(Capsule())
}

private struct NativeCreateStoryView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var location = ""
    @State private var storyBody = ""
    @State private var mediaURL = ""
    @State private var saving = false
    @State private var statusMessage: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                centerCard(title: "Add Story", subtitle: "Same payload contract as website: title, body, location, media_url, image_url, media_type")

                inputField(label: "Title", text: $title, placeholder: "My favorite place in Rwanda")
                inputField(label: "Location (optional)", text: $location, placeholder: "Kigali, Rwanda")

                VStack(alignment: .leading, spacing: 6) {
                    Text("Story")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                    TextEditor(text: $storyBody)
                        .frame(minHeight: 140)
                        .padding(8)
                        .background(AppTheme.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                inputField(label: "Media URL (optional)", text: $mediaURL, placeholder: "https://...")

                if let statusMessage {
                    Text(statusMessage)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button(saving ? "Publishing..." : "Publish Story") {
                    Task { await publish() }
                }
                .disabled(saving)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundColor(.white)
                .background(AppTheme.coral)
                .clipShape(Capsule())
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func inputField(label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            TextField(placeholder, text: text)
                .textInputAutocapitalization(.sentences)
                .padding(12)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func publish() async {
        guard let service else {
            statusMessage = "Supabase is not configured."
            return
        }
        guard let userId = session.userId else {
            statusMessage = "Login required to publish a story."
            return
        }

        let safeTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let safeBody = storyBody.trimmingCharacters(in: .whitespacesAndNewlines)
        if safeTitle.isEmpty || safeBody.isEmpty {
            statusMessage = "Title and story body are required."
            return
        }

        saving = true
        do {
            try await service.createStory(
                userId: userId,
                title: safeTitle,
                body: safeBody,
                location: location.trimmingCharacters(in: .whitespacesAndNewlines),
                mediaURL: mediaURL.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            statusMessage = "Story published successfully."
            dismiss()
        } catch {
            statusMessage = "Could not publish story: \(error.localizedDescription)"
        }
        saving = false
    }
}

private struct NativeHostDashboardDetailView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var loading = false
    @State private var properties: [[String: Any]] = []
    @State private var bookings: [[String: Any]] = []
    @State private var errorMessage: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                metricRow(label: "Total Listings", value: "\(properties.count)")
                metricRow(label: "Total Bookings", value: "\(bookings.count)")

                ForEach(Array(properties.prefix(12).enumerated()), id: \.offset) { _, row in
                    VStack(alignment: .leading, spacing: 4) {
                        Text((row["title"] as? String) ?? "Untitled listing")
                            .font(.subheadline.weight(.semibold))
                        Text((row["location"] as? String) ?? "Unknown location")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(AppTheme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func load() async {
        guard let service, let hostId = session.userId else { return }
        loading = true
        errorMessage = nil
        do {
            async let hostProperties = service.fetchHostProperties(hostId: hostId)
            async let hostBookings = service.fetchHostBookings(hostId: hostId)
            properties = try await hostProperties
            bookings = try await hostBookings
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct NativeHostReviewsView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var loading = false
    @State private var reviews: [[String: Any]] = []
    @State private var errorMessage: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                if !loading && reviews.isEmpty {
                    Text("No reviews yet.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                ForEach(Array(reviews.prefix(30).enumerated()), id: \.offset) { _, row in
                    VStack(alignment: .leading, spacing: 5) {
                        let rating = Int((row["rating"] as? Double) ?? 0)
                        Text("Rating: \(max(rating, 0))/5")
                            .font(.subheadline.weight(.semibold))
                        Text((row["review_text"] as? String) ?? "No text")
                            .font(.caption)
                        Text("Status: \((row["status"] as? String ?? "open").capitalized)")
                            .font(.caption2)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(AppTheme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func load() async {
        guard let service, let hostId = session.userId else { return }
        loading = true
        errorMessage = nil
        do {
            reviews = try await service.fetchHostReviews(hostId: hostId)
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct NativeHostFinancialReportsView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var loading = false
    @State private var bookings: [[String: Any]] = []
    @State private var errorMessage: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }

                metricRow(label: "Paid Bookings", value: "\(paidRows.count)")
                metricRow(label: "Revenue", value: "\(currency) \(format(totalRevenue))")
                metricRow(label: "Host Net", value: "\(currency) \(format(hostNet))")
                metricRow(label: "Platform Charges", value: "\(currency) \(format(platformCharges))")
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private var paidRows: [[String: Any]] {
        bookings.filter { String(describing: $0["payment_status"] ?? "").lowercased() == "paid" }
    }

    private var totalRevenue: Double {
        paidRows.reduce(0) { $0 + (number($1["total_price"]) ?? 0) }
    }

    private var hostNet: Double {
        paidRows.reduce(0) { total, row in
            let payout = number(row["host_payout_amount"])
            let gross = number(row["total_price"]) ?? 0
            let platform = (number(row["platform_fee"]) ?? 0) + (number(row["payment_method_fee"]) ?? 0)
            return total + (payout ?? max(gross - platform, 0))
        }
    }

    private var platformCharges: Double {
        max(totalRevenue - hostNet, 0)
    }

    private var currency: String {
        (paidRows.first?["currency"] as? String) ?? "RWF"
    }

    private func load() async {
        guard let service, let hostId = session.userId else { return }
        loading = true
        errorMessage = nil
        do {
            bookings = try await service.fetchHostBookings(hostId: hostId)
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    private func number(_ any: Any?) -> Double? {
        if let value = any as? Double { return value }
        if let value = any as? Int { return Double(value) }
        if let value = any as? NSNumber { return value.doubleValue }
        if let value = any as? String { return Double(value) }
        return nil
    }

    private func format(_ value: Double) -> String {
        NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)
    }
}

private struct NativeHostPayoutRequestView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var amount = ""
    @State private var currency = "RWF"
    @State private var payoutMethod = "mobile_money"
    @State private var payoutAccount = ""
    @State private var message: String?
    @State private var saving = false
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                labeledField("Amount", text: $amount)
                labeledField("Currency", text: $currency)
                labeledField("Payout Method (mobile_money/bank_transfer)", text: $payoutMethod)
                labeledField("Payout Account", text: $payoutAccount)

                submitButton(title: "Submit Payout Request", saving: saving) { await submit() }
                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        guard let amountValue = Double(amount), amountValue > 0 else {
            message = "Amount must be greater than 0."
            return
        }

        saving = true
        defer { saving = false }
        do {
            try await service.createHostPayoutRequest(
                hostId: hostId,
                amount: amountValue,
                currency: currency,
                payoutMethod: payoutMethod,
                payoutDetails: ["account": payoutAccount]
            )
            message = "Payout request submitted."
            amount = ""
        } catch {
            message = "Could not submit payout request: \(error.localizedDescription)"
        }
    }
}

private struct NativeHostPayoutHistoryView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var loading = false
    @State private var payouts: [[String: Any]] = []
    @State private var errorMessage: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                if !loading && payouts.isEmpty {
                    Text("No payout records yet.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                ForEach(Array(payouts.prefix(30).enumerated()), id: \.offset) { _, row in
                    HStack {
                        let c = (row["currency"] as? String) ?? "RWF"
                        let amt = NumberFormatter.localizedString(from: NSNumber(value: (row["amount"] as? Double) ?? 0), number: .decimal)
                        Text("\(c) \(amt)")
                        Spacer()
                        Text((row["status"] as? String ?? "pending").capitalized)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    .padding(12)
                    .background(AppTheme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func load() async {
        guard let service, let hostId = session.userId else { return }
        loading = true
        errorMessage = nil
        do {
            payouts = try await service.fetchHostPayouts(hostId: hostId)
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct NativeAffiliateSignupView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var companyName = ""
    @State private var websiteURL = ""
    @State private var saving = false
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                labeledField("Company Name (optional)", text: $companyName)
                labeledField("Website URL (optional)", text: $websiteURL)
                submitButton(title: "Submit Affiliate Application", saving: saving) { await submit() }
                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func submit() async {
        guard let service, let userId = session.userId else { return }
        saving = true
        defer { saving = false }
        do {
            try await service.createAffiliateAccount(userId: userId, companyName: companyName, websiteURL: websiteURL)
            message = "Affiliate application submitted."
        } catch {
            message = "Could not submit affiliate application: \(error.localizedDescription)"
        }
    }
}

private struct NativeAffiliateDashboardView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var loading = false
    @State private var account: MobileAffiliateAccount?
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if loading { ProgressView() }
                if let message {
                    Text(message).font(.caption).foregroundColor(.red)
                }
                if let account {
                    metricRow(label: "Status", value: account.status.capitalized)
                    metricRow(label: "Referral Code", value: account.referralCode)
                    metricRow(label: "Commission Rate", value: "\(Int(account.commissionRate))%")
                    metricRow(label: "Total Earnings", value: "RWF \(format(account.totalEarnings))")
                    metricRow(label: "Pending Earnings", value: "RWF \(format(account.pendingEarnings))")
                    metricRow(label: "Paid Earnings", value: "RWF \(format(account.paidEarnings))")
                    metricRow(label: "Total Referrals", value: "\(account.totalReferrals)")
                } else if !loading {
                    Text("No affiliate account found yet. Use Affiliate Signup first.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func load() async {
        guard let service, let userId = session.userId else { return }
        loading = true
        do {
            account = try await service.fetchAffiliateAccount(userId: userId)
            message = nil
        } catch {
            message = error.localizedDescription
        }
        loading = false
    }

    private func format(_ value: Double) -> String {
        NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)
    }
}

private struct NativeAffiliatePortalView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var loading = false
    @State private var account: MobileAffiliateAccount?
    @State private var referrals: [MobileAffiliateReferral] = []
    @State private var commissions: [MobileAffiliateCommission] = []
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if loading { ProgressView() }
                if let message {
                    Text(message).font(.caption).foregroundColor(.red)
                }
                if let account {
                    metricRow(label: "Referral Link", value: "merry360x.com/?ref=\(account.referralCode)")
                    metricRow(label: "Referrals", value: "\(referrals.count)")
                    metricRow(label: "Commissions", value: "\(commissions.count)")
                }

                ForEach(referrals.prefix(20), id: \.id) { row in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(row.referredUserEmail ?? "Anonymous referral")
                            .font(.subheadline.weight(.semibold))
                        Text("Status: \(row.status.capitalized) • Converted: \(row.converted ? "Yes" : "No")")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(AppTheme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func load() async {
        guard let service, let userId = session.userId else { return }
        loading = true
        do {
            account = try await service.fetchAffiliateAccount(userId: userId)
            if let affiliateId = account?.id {
                referrals = try await service.fetchAffiliateReferrals(affiliateId: affiliateId)
                commissions = try await service.fetchAffiliateCommissions(affiliateId: affiliateId)
            }
            message = nil
        } catch {
            message = error.localizedDescription
        }
        loading = false
    }
}

private struct NativeCheckoutFlowView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Environment(\.openURL) private var openURL

    private enum CheckoutPaymentMethod: String, CaseIterable, Identifiable {
        case mtnRwa
        case airtelRwa
        case mpesaKen
        case mtnUga
        case airtelUga
        case mtnZmb
        case zamtelZmb
        case cardPesapal

        var id: String { rawValue }

        var label: String {
            switch self {
            case .mtnRwa: return "MTN Mobile Money (Rwanda)"
            case .airtelRwa: return "Airtel Money (Rwanda)"
            case .mpesaKen: return "M-Pesa (Kenya)"
            case .mtnUga: return "MTN Mobile Money (Uganda)"
            case .airtelUga: return "Airtel Money (Uganda)"
            case .mtnZmb: return "MTN Mobile Money (Zambia)"
            case .zamtelZmb: return "Zamtel Money (Zambia)"
            case .cardPesapal: return "Card (Pesapal)"
            }
        }

        var provider: String {
            switch self {
            case .mtnRwa, .mtnUga, .mtnZmb: return "MTN"
            case .airtelRwa, .airtelUga: return "AIRTEL"
            case .mpesaKen: return "MPESA"
            case .zamtelZmb: return "ZAMTEL"
            case .cardPesapal: return "PESAPAL"
            }
        }

        var currency: String {
            switch self {
            case .mtnRwa, .airtelRwa, .cardPesapal: return "RWF"
            case .mpesaKen: return "KES"
            case .mtnUga, .airtelUga: return "UGX"
            case .mtnZmb, .zamtelZmb: return "ZMW"
            }
        }

        var isCard: Bool {
            self == .cardPesapal
        }

        var checkoutPaymentMethod: String {
            isCard ? "card" : "mobile_money"
        }
    }

    @State private var checkIn = "2026-03-15"
    @State private var checkOut = "2026-03-17"
    @State private var guests = "2"
    @State private var amount = "199500"
    @State private var currency = "RWF"
    @State private var paymentMethod: CheckoutPaymentMethod = .mtnRwa
    @State private var phone = ""
    @State private var note = ""
    @State private var statusMessage: String?
    @State private var checkoutId: String?
    @State private var bookingId: String?
    @State private var depositId: String?
    @State private var orderTrackingId: String?
    @State private var activeProvider: String?
    @State private var polling = false
    @State private var saving = false
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                labeledField("Check In", text: $checkIn)
                labeledField("Check Out", text: $checkOut)
                labeledField("Guests", text: $guests)
                labeledField("Amount", text: $amount)
                Picker("Payment Method", selection: $paymentMethod) {
                    ForEach(CheckoutPaymentMethod.allCases) { method in
                        Text(method.label).tag(method)
                    }
                }
                .pickerStyle(.menu)
                .padding(12)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                labeledField("Currency", text: $currency)
                if !paymentMethod.isCard {
                    labeledField("Phone", text: $phone)
                }
                labeledField("Message (optional)", text: $note)

                submitButton(title: "Start Checkout", saving: saving) { await startCheckout() }

                Button(polling ? "Checking..." : "Refresh Payment Status") {
                    Task { await refreshPaymentStatus() }
                }
                .disabled((checkoutId == nil) || polling)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .foregroundColor(AppTheme.coral)
                .background(AppTheme.cardBackground)
                .clipShape(Capsule())

                if let checkoutId {
                    Text("Checkout id: \(checkoutId)")
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if let orderTrackingId {
                    Text("Pesapal tracking id: \(orderTrackingId)")
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if let depositId {
                    Text("PawaPay deposit id: \(depositId)")
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if let statusMessage {
                    Text(statusMessage)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func startCheckout() async {
        guard let service, let userId = session.userId else {
            statusMessage = "Login required to checkout."
            return
        }
        guard let total = Double(amount), total > 0 else {
            statusMessage = "Amount must be greater than 0."
            return
        }

        let selectedCurrency = paymentMethod.currency
        currency = selectedCurrency
        depositId = nil
        orderTrackingId = nil
        activeProvider = nil

        saving = true
        defer { saving = false }
        do {
            let profile = try await service.fetchProfileBasics(userId: userId)
            let fullName = (profile?["full_name"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            let email = (profile?["email"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            let profilePhone = (profile?["phone"] as? String) ?? ""
            let phoneValue = phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? profilePhone : phone

            if !paymentMethod.isCard && phoneValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                statusMessage = "Phone is required for mobile money payments."
                return
            }

            let draft = BookingDraft(
                guestId: userId,
                guestName: fullName?.isEmpty == false ? fullName! : "Merry Mobile User",
                guestEmail: email?.isEmpty == false ? email! : "noreply@merry360x.com",
                propertyId: session.selectedListingId ?? "replace-with-real-property-id",
                specialRequests: note,
                paymentMethod: paymentMethod.checkoutPaymentMethod,
                checkIn: checkIn,
                checkOut: checkOut,
                guests: Int(guests) ?? 1,
                totalPrice: total,
                currency: selectedCurrency
            )

            bookingId = try await service.submitBookingReturningId(draft)

            let checkout = try await service.createCheckoutRequest(
                userId: userId,
                name: fullName?.isEmpty == false ? fullName! : "Guest",
                email: email?.isEmpty == false ? email! : "noreply@merry360x.com",
                phone: phoneValue,
                message: note,
                totalAmount: total,
                currency: selectedCurrency,
                paymentMethod: paymentMethod.checkoutPaymentMethod,
                items: [[
                    "type": "property",
                    "reference_id": session.selectedListingId ?? "replace-with-real-property-id",
                    "quantity": 1,
                    "amount": total
                ]]
            )
            checkoutId = checkout.id

            if paymentMethod.isCard {
                let cardResponse = try await service.createPesapalPayment(payload: [
                    "action": "create-payment",
                    "checkoutId": checkout.id,
                    "amount": total,
                    "currency": selectedCurrency,
                    "payerName": fullName?.isEmpty == false ? fullName! : "Guest",
                    "payerEmail": email?.isEmpty == false ? email! : "noreply@merry360x.com",
                    "phoneNumber": phoneValue,
                    "description": "Merry360x Booking (Mobile)",
                    "metadata": [
                        "platform": "ios_native"
                    ]
                ])

                activeProvider = "pesapal"
                orderTrackingId = cardResponse["orderTrackingId"] as? String
                if let redirectUrl = cardResponse["redirectUrl"] as? String,
                   let url = URL(string: redirectUrl) {
                    openURL(url)
                    statusMessage = "Pesapal checkout opened. Complete card payment, then tap Refresh Payment Status."
                } else {
                    statusMessage = "Pesapal initialized. Complete payment and refresh status."
                }
                return
            }

            let pawaResponse = try await service.createPawaPayPayment(payload: [
                "checkoutId": checkout.id,
                "amount": total,
                "currency": selectedCurrency,
                "phoneNumber": phoneValue,
                "description": "Merry360x Booking (Mobile)",
                "payerEmail": email?.isEmpty == false ? email! : "noreply@merry360x.com",
                "payerName": fullName?.isEmpty == false ? fullName! : "Guest",
                "provider": paymentMethod.provider,
            ])

            activeProvider = "pawapay"
            depositId = pawaResponse["depositId"] as? String
            statusMessage = "PawaPay prompt sent. Approve payment on your phone, then tap Refresh Payment Status."
        } catch {
            statusMessage = "Checkout failed: \(error.localizedDescription)"
        }
    }

    private func refreshPaymentStatus() async {
        guard let service, let checkoutId else { return }
        polling = true
        defer { polling = false }
        do {
            var providerStatus: String?

            if activeProvider == "pesapal" {
                let status = try await service.checkPesapalStatus(checkoutId: checkoutId, orderTrackingId: orderTrackingId)
                providerStatus = status["providerStatus"] as? String
            } else if activeProvider == "pawapay", let depositId {
                let status = try await service.checkPawaPayStatus(depositId: depositId, checkoutId: checkoutId)
                providerStatus = status["pawapayStatus"] as? String
            }

            guard let checkout = try await service.fetchCheckoutRequest(id: checkoutId) else {
                statusMessage = "Checkout request not found."
                return
            }

            let state = checkout.paymentStatus.lowercased()
            if state == "paid" || state == "completed" {
                if let bookingId {
                    try await service.updateBookingPaymentStatus(bookingId: bookingId, paymentStatus: "paid", bookingStatus: "confirmed")
                }
                statusMessage = "Payment confirmed. Booking is now confirmed."
            } else if state == "failed" || state == "rejected" || state == "cancelled" {
                if let bookingId {
                    try await service.updateBookingPaymentStatus(bookingId: bookingId, paymentStatus: "failed", bookingStatus: "pending")
                }
                statusMessage = "Payment failed. You can retry checkout."
            } else {
                if let providerStatus, !providerStatus.isEmpty {
                    statusMessage = "Payment is pending: \(checkout.paymentStatus) (provider: \(providerStatus))."
                } else {
                    statusMessage = "Payment is still pending: \(checkout.paymentStatus)."
                }
            }
        } catch {
            statusMessage = "Could not refresh payment status: \(error.localizedDescription)"
        }
    }
}

private struct NativeHelpCenterView: View {
    private let sections: [(title: String, items: [(question: String, answer: String)])] = [
        (
            "Booking & Account Support",
            [
                ("How do I create an account?", "Use Sign Up and register with your email so you can manage bookings and support."),
                ("Do I need an account to book?", "Yes, booking requires an account for confirmations and trip management."),
                ("Can I modify or cancel a booking?", "Yes, based on provider policy shown in My Bookings and confirmation details.")
            ]
        ),
        (
            "Payments & Pricing",
            [
                ("What payment methods are accepted?", "Available methods are shown at checkout and vary by service/location."),
                ("Are prices final?", "Displayed prices include listed fees/taxes unless explicitly stated otherwise."),
                ("Is payment secure?", "Yes, payments are processed via secure encrypted channels.")
            ]
        ),
        (
            "Safety & Trust",
            [
                ("How are providers verified?", "Basic verification and reviews are monitored on platform."),
                ("How do I report fraud or unsafe behavior?", "Contact support immediately with details and evidence.")
            ]
        )
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Help Center")
                        .font(.title3.weight(.bold))
                        .foregroundColor(.white)
                    Text("Find answers fast, then reach our support team with one tap.")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.92))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(
                    LinearGradient(
                        colors: [Color(red: 0.1, green: 0.42, blue: 0.78), Color(red: 0.05, green: 0.56, blue: 0.62)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                VStack(alignment: .leading, spacing: 10) {
                    Text("Quick actions")
                        .font(.headline)
                        .foregroundColor(AppTheme.textPrimary)

                    HStack(spacing: 10) {
                        Link(destination: URL(string: "mailto:support@merry360x.com")!) {
                            helpActionPill(icon: "envelope.fill", title: "Email")
                        }

                        Link(destination: URL(string: "tel:+250796214719")!) {
                            helpActionPill(icon: "phone.fill", title: "Call")
                        }
                    }
                }
                .padding(14)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                ForEach(sections, id: \.title) { section in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(section.title)
                            .font(.headline)
                            .foregroundColor(AppTheme.textPrimary)
                        ForEach(section.items, id: \.question) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.question)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(AppTheme.textPrimary)
                                Text(item.answer)
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white.opacity(0.72))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }

                NativeInfoView(
                    title: "Contact & Support",
                    subtitle: "Include booking id, service type, issue details, and any supporting evidence.",
                    bullets: ["Phone: +250 796 214 719", "Email: support@merry360x.com", "Response: within 0-24 business hours"]
                )
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func helpActionPill(icon: String, title: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption.weight(.bold))
            Text(title)
                .font(.subheadline.weight(.semibold))
        }
        .foregroundColor(AppTheme.textPrimary)
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(Color.white)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(AppTheme.coral.opacity(0.35), lineWidth: 1)
        )
    }
}

private struct NativeLegalPolicyView: View {
    let contentType: String
    let fallbackTitle: String
    let fallbackSections: [String]

    @State private var policy: MobileLegalContent?
    @State private var loading = true
    @State private var loadError: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(policyTitle)
                        .font(.title3.bold())
                        .foregroundColor(AppTheme.textPrimary)
                    if let updated = formattedDate(policy?.updatedAt) {
                        Text("Last updated: \(updated)")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
                .padding(.horizontal, 2)

                if loading {
                    MerryLoadingStateView(
                        title: "Loading policy",
                        subtitle: "Fetching the same legal content used on website...",
                        showCardSkeletons: false
                    )
                } else if let loadError {
                    NativeInfoView(
                        title: "Could not load policy",
                        subtitle: loadError,
                        bullets: ["Showing fallback policy details instead."]
                    )
                }

                ForEach(displaySections.indices, id: \.self) { index in
                    Text(displaySections[index])
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .background(AppTheme.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle(policyTitle)
        .task {
            await loadPolicy()
        }
    }

    private var policyTitle: String {
        let value = policy?.title.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return value.isEmpty ? fallbackTitle : value
    }

    private var displaySections: [String] {
        let sections = policy?.sections ?? []
        return sections.isEmpty ? fallbackSections : sections
    }

    private func formattedDate(_ isoDate: String?) -> String? {
        guard let isoDate, let date = ISO8601DateFormatter().date(from: isoDate) else { return nil }
        return DateFormatter.localizedString(from: date, dateStyle: .medium, timeStyle: .none)
    }

    private func loadPolicy() async {
        loading = true
        defer { loading = false }

        guard let service = SupabaseService() else {
            loadError = "App configuration is missing."
            return
        }

        do {
            policy = try await service.fetchLegalContent(contentType: contentType)
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }
}

private struct NativeSupportChatView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var tickets: [MobileSupportTicket] = []
    @State private var selectedTicketId: String?
    @State private var messages: [MobileSupportMessage] = []
    @State private var loadingTickets = false
    @State private var loadingMessages = false
    @State private var creatingTicket = false
    @State private var sendingMessage = false
    @State private var subject = ""
    @State private var ticketMessage = ""
    @State private var replyMessage = ""
    @State private var statusMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if !session.isAuthenticated {
                    NativeInfoView(
                        title: "Sign in required",
                        subtitle: "Please sign in to create and track support chats.",
                        bullets: ["Open Profile", "Tap Login / Sign In", "Return to Let's Chat"]
                    )
                } else {
                    createTicketCard
                    ticketListCard
                    if let selectedTicket {
                        chatThreadCard(ticket: selectedTicket)
                    }
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task {
            await refreshTickets(selectNewest: true)
        }
    }

    private var createTicketCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Start a New Support Chat")
                .font(.headline)
            TextField("Subject", text: $subject)
                .textFieldStyle(.roundedBorder)
            TextField("Describe your issue", text: $ticketMessage, axis: .vertical)
                .lineLimit(3...6)
                .textFieldStyle(.roundedBorder)

            Button {
                Task { await createTicket() }
            } label: {
                HStack {
                    if creatingTicket {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(creatingTicket ? "Creating..." : "Create Ticket")
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(AppTheme.coral)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .disabled(creatingTicket || subject.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || ticketMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            if let statusMessage {
                Text(statusMessage)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var ticketListCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Your Tickets")
                    .font(.headline)
                Spacer()
                if loadingTickets {
                    ProgressView()
                        .scaleEffect(0.8)
                }
                Button("Refresh") {
                    Task { await refreshTickets(selectNewest: selectedTicketId == nil) }
                }
                .font(.caption)
            }

            if tickets.isEmpty {
                Text("No support tickets yet.")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                ForEach(tickets, id: \.id) { ticket in
                    Button {
                        selectedTicketId = ticket.id
                        Task { await loadMessages(ticketId: ticket.id) }
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(ticket.subject)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(AppTheme.textPrimary)
                                Spacer()
                                Text(ticket.status.capitalized)
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)
                            }
                            Text(ticket.message)
                                .font(.caption)
                                .foregroundColor(AppTheme.textSecondary)
                                .lineLimit(2)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background((ticket.id == selectedTicketId ? AppTheme.coral.opacity(0.08) : Color.gray.opacity(0.05)))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func chatThreadCard(ticket: MobileSupportTicket) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Conversation")
                    .font(.headline)
                Spacer()
                if loadingMessages {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }

            if messages.isEmpty {
                Text("No messages yet. Send the first message below.")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                ForEach(messages, id: \.id) { message in
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text(message.senderType == "staff" ? "Support" : "You")
                                .font(.caption.weight(.semibold))
                            Spacer()
                            if let createdAt = formattedDate(message.createdAt) {
                                Text(createdAt)
                                    .font(.caption2)
                                    .foregroundColor(AppTheme.textSecondary)
                            }
                        }
                        Text(message.message)
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(message.senderType == "staff" ? AppTheme.coral.opacity(0.08) : Color.gray.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }

            TextField("Write a reply", text: $replyMessage, axis: .vertical)
                .lineLimit(2...4)
                .textFieldStyle(.roundedBorder)

            Button {
                Task { await sendReply(ticketId: ticket.id) }
            } label: {
                HStack {
                    if sendingMessage {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(sendingMessage ? "Sending..." : "Send Message")
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(AppTheme.coral)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .disabled(sendingMessage || replyMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var selectedTicket: MobileSupportTicket? {
        tickets.first(where: { $0.id == selectedTicketId })
    }

    private func refreshTickets(selectNewest: Bool) async {
        guard let userId = session.userId, let service = SupabaseService() else { return }
        loadingTickets = true
        defer { loadingTickets = false }

        do {
            tickets = try await service.fetchSupportTickets(userId: userId)
            if selectNewest, let firstId = tickets.first?.id {
                selectedTicketId = firstId
                await loadMessages(ticketId: firstId)
            }
            statusMessage = nil
        } catch {
            statusMessage = "Could not load support tickets: \(error.localizedDescription)"
        }
    }

    private func createTicket() async {
        guard let userId = session.userId, let service = SupabaseService() else { return }
        let trimmedSubject = subject.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedMessage = ticketMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSubject.isEmpty, !trimmedMessage.isEmpty else { return }

        creatingTicket = true
        defer { creatingTicket = false }

        do {
            let ticket = try await service.createSupportTicket(
                userId: userId,
                subject: trimmedSubject,
                message: trimmedMessage,
                category: "general"
            )
            subject = ""
            ticketMessage = ""
            statusMessage = "Support ticket created."
            selectedTicketId = ticket.id
            await refreshTickets(selectNewest: false)
            await loadMessages(ticketId: ticket.id)
        } catch {
            statusMessage = "Could not create ticket: \(error.localizedDescription)"
        }
    }

    private func loadMessages(ticketId: String) async {
        guard let service = SupabaseService() else { return }
        loadingMessages = true
        defer { loadingMessages = false }

        do {
            messages = try await service.fetchSupportMessages(ticketId: ticketId)
            statusMessage = nil
        } catch {
            statusMessage = "Could not load messages: \(error.localizedDescription)"
        }
    }

    private func sendReply(ticketId: String) async {
        guard let userId = session.userId, let service = SupabaseService() else { return }
        let text = replyMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        sendingMessage = true
        defer { sendingMessage = false }

        do {
            let message = try await service.createSupportMessage(
                ticketId: ticketId,
                userId: userId,
                senderName: "Guest",
                message: text
            )
            messages.append(message)
            replyMessage = ""
            statusMessage = nil
        } catch {
            statusMessage = "Could not send message: \(error.localizedDescription)"
        }
    }

    private func formattedDate(_ isoDate: String?) -> String? {
        guard let isoDate, let date = ISO8601DateFormatter().date(from: isoDate) else { return nil }
        return DateFormatter.localizedString(from: date, dateStyle: .short, timeStyle: .short)
    }
}

private struct NativePaymentStateView: View {
    let title: String
    let subtitle: String
    let tone: Color

    var body: some View {
        VStack(spacing: 12) {
            Circle()
                .fill(tone.opacity(0.2))
                .frame(width: 72, height: 72)
                .overlay(
                    Image(systemName: tone == .green ? "checkmark" : (tone == .red ? "xmark" : "clock"))
                        .font(.title2.bold())
                        .foregroundColor(tone)
                )
            Text(title)
                .font(.title3.bold())
            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.appBackground)
    }
}
