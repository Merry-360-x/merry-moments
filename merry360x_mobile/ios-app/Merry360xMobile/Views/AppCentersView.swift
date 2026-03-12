import SwiftUI

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
        }
    }
}

struct AppCentersView: View {
    let destination: AppCenterDestination

    var body: some View {
        NavigationStack {
            switch destination {
            case .backoffice:
                BackofficeCenterView()
            case .adminDashboard:
                NativeAdminOverviewView()
                    .navigationTitle("Admin Dashboard")
                    .navigationBarTitleDisplayMode(.inline)
            case .financialDashboard:
                NativeFinancialSummaryView()
                    .navigationTitle("Financial Dashboard")
                    .navigationBarTitleDisplayMode(.inline)
            case .operationsDashboard:
                NativeOperationsSummaryView()
                    .navigationTitle("Operations Dashboard")
                    .navigationBarTitleDisplayMode(.inline)
            case .supportDashboard:
                NativeSupportSummaryView()
                    .navigationTitle("Support Dashboard")
                    .navigationBarTitleDisplayMode(.inline)
            case .hostStudio:
                HostStudioCenterView()
            case .affiliateCenter:
                AffiliateCenterView()
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
                NativeCompleteProfileCenterView()
            case .websiteRoutes:
                NativeWebsiteRoutesView()
                    .navigationTitle("Website Routes")
                    .navigationBarTitleDisplayMode(.inline)
            }
        }
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
        .init(path: "/complete-profile", title: "Complete Profile", group: "Authentication", destination: .auth, note: "Shown after account creation."),
        .init(path: "/forgot-password", title: "Forgot Password", group: "Authentication", destination: .auth, note: "Password reset request screen."),
        .init(path: "/reset-password", title: "Reset Password", group: "Authentication", destination: .auth, note: "Password reset confirmation screen."),
        .init(path: "/login", title: "Login", group: "Authentication", destination: .auth, note: "Alias to auth mode login."),
        .init(path: "/signup", title: "Signup", group: "Authentication", destination: .auth, note: "Alias to auth mode signup."),

        .init(path: "/accommodations", title: "Accommodations", group: "Explore", destination: .home, note: "Rendered in Explore home feed."),
        .init(path: "/stays", title: "Stays", group: "Explore", destination: .home, note: "Redirects to /accommodations."),
        .init(path: "/tours", title: "Tours", group: "Explore", destination: .home, note: "Rendered in Explore category sections."),
        .init(path: "/tours/:id", title: "Tour Details", group: "Explore", destination: .tourDetails, note: "Open from a selected tour card."),
        .init(path: "/search", title: "Search Results", group: "Explore", destination: .home, note: "Use Explore search sheet."),
        .init(path: "/transport", title: "Transport", group: "Explore", destination: .home, note: "Rendered in Explore transport section."),
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
        .init(path: "/my-bookings", title: "My Bookings", group: "Booking", destination: .tripCart, note: "Upcoming/completed bookings live in Trip Cart tabs."),

        .init(path: "/favorites", title: "Favorites", group: "Account", destination: .wishlists, note: nil),
        .init(path: "/dashboard", title: "User Dashboard", group: "Account", destination: .tripCart, note: "Account dashboard maps to profile + booking tabs."),
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
            NativeSimpleRouteView(
                icon: "checkmark.seal",
                title: "Review Submission",
                subtitle: "Token-based review route is mapped and can be completed after booking confirmation flows."
            )
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
            VStack(spacing: 12) {
                centerCard(title: "Travel Stories", subtitle: "Native stories feed aligned with website route structure.")

                NativeInfoView(
                    title: "Stories",
                    subtitle: "Story publishing is fully native and uses the same backend payload as web.",
                    bullets: [
                        "Route parity: /stories",
                        "Route parity: /create-story",
                        "Shared Supabase contract"
                    ]
                )

                if canCreateStory {
                    Button("Create Story") {
                        showCreateStory = true
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .foregroundColor(.white)
                    .background(AppTheme.coral)
                    .clipShape(Capsule())
                    .padding(.horizontal, 16)
                }
            }
            .padding(.vertical, 12)
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
                    moduleList(items: [
                        BackofficeModule.adminOverview.title,
                        BackofficeModule.financialSummary.title,
                        BackofficeModule.operationsSummary.title,
                        BackofficeModule.supportSummary.title,
                    ]) { title in
                        selectedModule = BackofficeModule.allCases.first(where: { $0.title == title })
                    }
                } else {
                    centerCard(title: "Admin Controls", subtitle: "Native role and integration management modules")
                    moduleList(items: [BackofficeModule.roles.title, BackofficeModule.integrations.title]) { title in
                        selectedModule = BackofficeModule.allCases.first(where: { $0.title == title })
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
        ScrollView {
            VStack(spacing: 14) {
                Picker("Host", selection: $tab) {
                    Text("Overview").tag(0)
                    Text("Financial").tag(1)
                    Text("Create").tag(2)
                }
                .pickerStyle(.segmented)

                if tab == 0 {
                    centerCard(title: "Host Overview", subtitle: "Listings, bookings, moderation and review operations")
                    metricRow(label: "Listings", value: "\(model.propertiesCount)")
                    metricRow(label: "Bookings", value: "\(model.bookingsCount)")
                    moduleList(items: [
                        HostStudioModule.hostDashboard.title,
                        HostStudioModule.bookings.title,
                        HostStudioModule.hostReviews.title,
                    ]) { title in
                        selectedModule = HostStudioModule.allCases.first(where: { $0.title == title })
                    }
                } else if tab == 1 {
                    centerCard(title: "Financial", subtitle: "Host financial reports, payout workflows and reconciliations")
                    metricRow(label: "Payout Records", value: "\(model.payoutsCount)")
                    moduleList(items: [
                        HostStudioModule.financialReports.title,
                        HostStudioModule.payoutRequests.title,
                        HostStudioModule.payoutHistory.title,
                    ]) { title in
                        selectedModule = HostStudioModule.allCases.first(where: { $0.title == title })
                    }
                } else {
                    centerCard(title: "Creation Flows", subtitle: "Native create flows mirrored from website routes")
                    moduleList(items: [
                        HostStudioModule.createProperty.title,
                        HostStudioModule.createRoom.title,
                        HostStudioModule.createTour.title,
                        HostStudioModule.createTourPackage.title,
                        HostStudioModule.createTransport.title,
                        HostStudioModule.createCarRental.title,
                        HostStudioModule.createAirportTransfer.title,
                        HostStudioModule.createStory.title,
                    ]) { title in
                        selectedModule = HostStudioModule.allCases.first(where: { $0.title == title })
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
                    TripCartView()
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

private struct AffiliateCenterView: View {
    var body: some View {
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
                case .tripCart, .myBookings:
                    TripCartView()
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
    .background(Color.white)
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
    .background(Color.white)
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
            .background(Color.white)
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

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            Text(value)
                .font(.headline.weight(.semibold))
                .foregroundColor(AppTheme.textPrimary)
            Text(caption)
                .font(.caption2)
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
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
        .background(Color.white)
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
                    return AnyView(
                        HStack(spacing: 10) {
                            Text(title)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Spacer()
                            Button(published ? "Unpublish" : "Publish") {
                                Task { await updateTourPublishStatus(id: id, publish: !published) }
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
                    let code = text(row["affiliate_code"], fallback: "-")
                    let status = text(row["status"], fallback: "active").capitalized
                    let date = prettyDate(row["created_at"] as? String)
                    return "\(affiliateId.prefix(8))... • \(code) • \(status) • \(date)"
                }, empty: "No affiliate rows found.")
                actionRowsCard(title: "Affiliate Actions", rows: affiliateRows.prefix(6).map { row in
                    let id = text(row["id"], fallback: "")
                    let code = text(row["affiliate_code"], fallback: "-")
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
        VStack(alignment: .leading, spacing: 8) {
            if items.isEmpty {
                Text(empty)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                ForEach(Array(items.enumerated()), id: \.offset) { _, line in
                    Text(line)
                        .font(.caption)
                        .foregroundColor(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 6)
                    Divider()
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
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
        .background(Color.white)
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
            async let adminTask = service.fetchAdminOverviewMetrics()
            async let financialTask = service.fetchFinancialSummary()
            async let operationsTask = service.fetchOperationsSummary()
            async let supportTask = service.fetchSupportSummary()
            async let usersTask = service.fetchAdminUsers()
            async let applicationsTask = service.fetchAdminHostApplications()
            async let bookingsTask = service.fetchAdminBookings()
            async let paymentsTask = service.fetchAdminPayments()
            async let payoutsTask = service.fetchAdminPayouts()
            async let supportRowsTask = service.fetchAdminSupportTickets()
            async let reviewsTask = service.fetchAdminPropertyReviews()
            async let legalTask = service.fetchAdminLegalContent()
            async let affiliatesTask = service.fetchAdminAffiliates()
            async let propertiesTask = service.fetchAdminProperties()
            async let toursTask = service.fetchAdminTours()
            async let transportTask = service.fetchAdminTransportServices()
            metrics = try await adminTask
            financial = try await financialTask
            operations = try await operationsTask
            support = try await supportTask
            adminUsers = try await usersTask
            hostApplications = try await applicationsTask
            recentBookings = try await bookingsTask
            recentPayments = try await paymentsTask
            recentPayouts = try await payoutsTask
            recentSupportTickets = try await supportRowsTask
            recentReviews = try await reviewsTask
            legalContentRows = try await legalTask
            affiliateRows = try await affiliatesTask
            adminProperties = try await propertiesTask
            adminTours = try await toursTask
            adminTransport = try await transportTask

            // Keep ads optional because some deployments do not have banner table.
            do {
                adminAds = try await service.fetchAdminAds()
            } catch {
                adminAds = []
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    private func formatAmount(_ value: Double) -> String {
        NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)
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

    private func updateTourPublishStatus(id: String, publish: Bool) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.setTourPublished(tourId: id, isPublished: publish)
            actionMessage = publish ? "Tour published." : "Tour unpublished."
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
                        }
                        .padding(.horizontal, 16)
                        DashboardSectionCard(title: "Recent Paid Bookings", subtitle: "Latest successful payments", columns: ["Date", "Amount", "Status"])
                            .padding(.horizontal, 16)
                        rowsList(items: recentBookings.filter { text($0["payment_status"]).lowercased() == "paid" }.prefix(5).map { row in
                            "\(prettyDate(row["created_at"] as? String)) • \(money(row["total_price"], currency: text(row["currency"]))) • \(text(row["status"]).capitalized)"
                        }, empty: "No paid bookings yet.")
                    case .bookings:
                        DashboardSectionCard(title: "All Bookings", subtitle: "Complete booking history with status filters", columns: ["Booking ID", "Amount", "Payment", "Status", "Date"])
                            .padding(.horizontal, 16)
                        rowsList(items: recentBookings.prefix(15).map { row in
                            let booking = text(row["order_id"]).isEmpty ? text(row["id"]) : text(row["order_id"])
                            return "\(booking) • \(money(row["total_price"], currency: text(row["currency"]))) • \(text(row["payment_status"]).capitalized) • \(text(row["status"]).capitalized) • \(prettyDate(row["created_at"] as? String))"
                        }, empty: "No bookings found.")
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

    private func rowsList(items: [String], empty: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if items.isEmpty {
                Text(empty)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                ForEach(Array(items.enumerated()), id: \.offset) { _, line in
                    Text(line)
                        .font(.caption)
                        .foregroundColor(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 6)
                    Divider()
                }
            }
        }
        .padding(14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 16)
    }

    private func load() async {
        guard let service else { return }
        loading = true
        do {
            async let summaryTask = service.fetchFinancialSummary()
            async let bookingsTask = service.fetchAdminBookings()
            async let payoutsTask = service.fetchAdminPayouts()
            summary = try await summaryTask
            recentBookings = try await bookingsTask
            recentPayouts = try await payoutsTask
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
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
}

private struct NativeOperationsSummaryView: View {
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
    @State private var bookings: [[String: Any]] = []
    @State private var properties: [[String: Any]] = []
    @State private var tours: [[String: Any]] = []
    @State private var transport: [[String: Any]] = []
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
                        }
                        .padding(.horizontal, 16)
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
                    case .bookings:
                        DashboardSectionCard(
                            title: "Bookings",
                            subtitle: "Operational booking monitoring",
                            columns: ["Booking", "Guest", "Service", "Dates", "Amount", "Status", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: bookings.prefix(15).map { row in
                            let booking = text(row["order_id"]).isEmpty ? text(row["id"]) : text(row["order_id"])
                            let status = text(row["status"]).capitalized
                            let amount = money(row["total_price"], currency: text(row["currency"]))
                            let date = prettyDate(row["created_at"] as? String)
                            return "\(booking) • \(status) • \(amount) • \(date)"
                        }, empty: "No bookings found.")
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
                            return AnyView(
                                HStack {
                                    Text(title.isEmpty ? "Tour" : title)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    Button(isPublished ? "Unpublish" : "Publish") {
                                        Task { await updateTourPublished(id: id, publish: !isPublished) }
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
            return summary.bookingsTotal
        default:
            return nil
        }
    }

    private func load() async {
        guard let service else { return }
        loading = true
        do {
            async let summaryTask = service.fetchOperationsSummary()
            async let applicationsTask = service.fetchAdminHostApplications()
            async let bookingsTask = service.fetchAdminBookings()
            async let propertiesTask = service.fetchAdminProperties()
            async let toursTask = service.fetchAdminTours()
            async let transportTask = service.fetchAdminTransportServices()
            summary = try await summaryTask
            applications = try await applicationsTask
            bookings = try await bookingsTask
            properties = try await propertiesTask
            tours = try await toursTask
            transport = try await transportTask
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    private func rowsList(items: [String], empty: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if items.isEmpty {
                Text(empty)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                ForEach(Array(items.enumerated()), id: \.offset) { _, line in
                    Text(line)
                        .font(.caption)
                        .foregroundColor(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 6)
                    Divider()
                }
            }
        }
        .padding(14)
        .background(Color.white)
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
        .background(Color.white)
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

    private func updateTourPublished(id: String, publish: Bool) async {
        guard !id.isEmpty, let service else { return }
        actionInFlight = true
        defer { actionInFlight = false }
        do {
            try await service.setTourPublished(tourId: id, isPublished: publish)
            actionMessage = publish ? "Tour published." : "Tour unpublished."
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
                        }
                        .padding(.horizontal, 16)
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
                        rowsList(items: users.prefix(15).map { row in
                            let id = text(row["user_id"])
                            let name = text(row["full_name"])
                            let phone = text(row["phone"])
                            return "\(id.prefix(8))... • \(name.isEmpty ? "N/A" : name) • \(phone.isEmpty ? "N/A" : phone)"
                        }, empty: "No users found.")
                        actionRowsCard(title: "User Actions", rows: users.prefix(6).map { row in
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
                        DashboardSectionCard(
                            title: "Bookings",
                            subtitle: "View and assist with customer bookings",
                            columns: ["Booking", "Customer", "Service", "Dates", "Status", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: bookings.prefix(15).map { row in
                            let booking = text(row["order_id"]).isEmpty ? text(row["id"]) : text(row["order_id"])
                            let status = text(row["status"]).capitalized
                            let payment = text(row["payment_status"]).capitalized
                            return "\(booking) • \(status) • \(payment)"
                        }, empty: "No bookings found.")
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
                                            .dashboardActionStyle(prominent: false)
                                    }
                                    if status != "cancelled" {
                                        Button("Cancel") { Task { await updateBookingStatus(id: id, status: "cancelled") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                }
                            )
                        })
                    case .tickets:
                        DashboardSectionCard(
                            title: "Support Tickets",
                            subtitle: "Ticket queue and state transitions",
                            columns: ["Subject", "User", "Priority", "Status", "Created", "Actions"]
                        )
                        .padding(.horizontal, 16)
                        rowsList(items: tickets.prefix(15).map { row in
                            let subject = text(row["subject"])
                            let user = text(row["user_email"]).isEmpty ? text(row["user_id"]) : text(row["user_email"])
                            let priority = text(row["priority"]).capitalized
                            let status = text(row["status"]).capitalized
                            return "\(subject) • \(user) • \(priority) • \(status)"
                        }, empty: "No support tickets found.")
                        actionRowsCard(title: "Ticket Actions", rows: tickets.prefix(6).map { row in
                            let id = text(row["id"])
                            let subject = text(row["subject"])
                            let status = text(row["status"]).lowercased()
                            return AnyView(
                                HStack {
                                    Text(subject.isEmpty ? "Ticket" : subject)
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                    Spacer()
                                    if status != "in_progress" {
                                        Button("In Progress") { Task { await updateTicketStatus(id: id, status: "in_progress") } }
                                            .dashboardActionStyle(prominent: false)
                                    }
                                    if status != "resolved" {
                                        Button("Resolve") { Task { await updateTicketStatus(id: id, status: "resolved") } }
                                            .dashboardActionStyle(prominent: true)
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
            return summary?.ticketsOpen
        default:
            return nil
        }
    }

    private func load() async {
        guard let service else { return }
        loading = true
        do {
            async let supportTask = service.fetchSupportSummary()
            async let operationsTask = service.fetchOperationsSummary()
            async let usersTask = service.fetchAdminUsers()
            async let bookingsTask = service.fetchAdminBookings()
            async let ticketsTask = service.fetchAdminSupportTickets()
            summary = try await supportTask
            operations = try await operationsTask
            users = try await usersTask
            bookings = try await bookingsTask
            tickets = try await ticketsTask
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    private func rowsList(items: [String], empty: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if items.isEmpty {
                Text(empty)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            } else {
                ForEach(Array(items.enumerated()), id: \.offset) { _, line in
                    Text(line)
                        .font(.caption)
                        .foregroundColor(AppTheme.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 6)
                    Divider()
                }
            }
        }
        .padding(14)
        .background(Color.white)
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
        .background(Color.white)
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

private struct NativeCreateTourView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var title = ""
    @State private var description = ""
    @State private var location = ""
    @State private var category = "Adventure"
    @State private var durationDays = "1"
    @State private var maxGroupSize = "2"
    @State private var price = ""
    @State private var currency = "RWF"
    @State private var saving = false
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                labeledField("Title", text: $title)
                labeledField("Description", text: $description)
                labeledField("Location", text: $location)
                labeledField("Category", text: $category)
                labeledField("Duration Days", text: $durationDays)
                labeledField("Max Group Size", text: $maxGroupSize)
                labeledField("Price Per Person", text: $price)
                labeledField("Currency", text: $currency)
                submitButton(title: "Publish Tour", saving: saving) { await submit() }
                if let message { Text(message).font(.caption).foregroundColor(.secondary) }
            }.padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        saving = true
        defer { saving = false }
        do {
            let payload: [String: Any] = [
                "title": title,
                "description": description,
                "location": location,
                "category": category,
                "categories": [category],
                "duration_days": Int(durationDays) ?? 1,
                "max_group_size": Int(maxGroupSize) ?? 2,
                "price_per_person": Double(price) ?? 0,
                "currency": currency,
            ]
            try await service.createTour(hostId: hostId, payload: payload)
            message = "Tour created successfully."
        } catch {
            message = "Could not create tour: \(error.localizedDescription)"
        }
    }
}

private struct NativeCreateTourPackageView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var title = ""
    @State private var category = "Culture"
    @State private var city = "Kigali"
    @State private var duration = "1 day"
    @State private var description = ""
    @State private var pricePerAdult = ""
    @State private var minGuests = "1"
    @State private var maxGuests = "8"
    @State private var currency = "RWF"
    @State private var saving = false
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                labeledField("Title", text: $title)
                labeledField("Category", text: $category)
                labeledField("City", text: $city)
                labeledField("Duration", text: $duration)
                labeledField("Description", text: $description)
                labeledField("Price Per Adult", text: $pricePerAdult)
                labeledField("Min Guests", text: $minGuests)
                labeledField("Max Guests", text: $maxGuests)
                labeledField("Currency", text: $currency)
                submitButton(title: "Publish Package", saving: saving) { await submit() }
                if let message { Text(message).font(.caption).foregroundColor(.secondary) }
            }.padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        saving = true
        defer { saving = false }
        do {
            let payload: [String: Any] = [
                "title": title,
                "category": category,
                "tour_type": category,
                "city": city,
                "duration": duration,
                "description": description,
                "price_per_adult": Double(pricePerAdult) ?? 0,
                "currency": currency,
                "min_guests": Int(minGuests) ?? 1,
                "max_guests": Int(maxGuests) ?? 8,
                "categories": [category],
            ]
            try await service.createTourPackage(hostId: hostId, payload: payload)
            message = "Tour package created successfully."
        } catch {
            message = "Could not create tour package: \(error.localizedDescription)"
        }
    }
}

private struct NativeCreatePropertyView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    let listingType: String
    @State private var title = ""
    @State private var location = "Kigali"
    @State private var description = ""
    @State private var propertyType = "Apartment"
    @State private var bedrooms = "1"
    @State private var bathrooms = "1"
    @State private var maxGuests = "2"
    @State private var pricePerNight = ""
    @State private var currency = "RWF"
    @State private var saving = false
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                labeledField("Title", text: $title)
                labeledField("Location", text: $location)
                labeledField("Description", text: $description)
                labeledField("Property Type", text: $propertyType)
                labeledField("Bedrooms", text: $bedrooms)
                labeledField("Bathrooms", text: $bathrooms)
                labeledField("Max Guests", text: $maxGuests)
                labeledField("Price Per Night", text: $pricePerNight)
                labeledField("Currency", text: $currency)

                submitButton(title: listingType == "room" ? "Publish Room" : "Publish Property", saving: saving) {
                    await submit()
                }

                if let message {
                    Text(message)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func submit() async {
        guard let service, let hostId = session.userId else {
            message = "Please sign in as host first."
            return
        }

        let safeTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if safeTitle.isEmpty {
            message = "Title is required."
            return
        }

        saving = true
        defer { saving = false }

        do {
            let payload: [String: Any] = [
                "title": safeTitle,
                "location": location,
                "description": description,
                "property_type": listingType == "room" ? "Room" : propertyType,
                "bedrooms": Int(bedrooms) ?? 1,
                "bathrooms": Int(bathrooms) ?? 1,
                "max_guests": Int(maxGuests) ?? 2,
                "price_per_night": Double(pricePerNight) ?? 0,
                "currency": currency,
                "is_published": true,
                "monthly_only_listing": false,
                "available_for_monthly_rental": false
            ]
            _ = try await service.createProperty(hostId: hostId, payload: payload)
            message = listingType == "room" ? "Room listed successfully." : "Property listed successfully."
        } catch {
            message = "Could not publish listing: \(error.localizedDescription)"
        }
    }
}

private struct NativeCreateTransportVehicleView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    let serviceType: String
    @State private var title = ""
    @State private var providerName = ""
    @State private var vehicleType = "Sedan"
    @State private var carBrand = ""
    @State private var carModel = ""
    @State private var carYear = "2024"
    @State private var seats = "4"
    @State private var dailyPrice = ""
    @State private var weeklyPrice = ""
    @State private var monthlyPrice = ""
    @State private var currency = "RWF"
    @State private var saving = false
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                labeledField("Title", text: $title)
                labeledField("Provider Name", text: $providerName)
                labeledField("Vehicle Type", text: $vehicleType)
                labeledField("Car Brand", text: $carBrand)
                labeledField("Car Model", text: $carModel)
                labeledField("Car Year", text: $carYear)
                labeledField("Seats", text: $seats)
                labeledField("Daily Price", text: $dailyPrice)
                labeledField("Weekly Price", text: $weeklyPrice)
                labeledField("Monthly Price", text: $monthlyPrice)
                labeledField("Currency", text: $currency)
                submitButton(title: "Publish Vehicle", saving: saving) { await submit() }
                if let message { Text(message).font(.caption).foregroundColor(.secondary) }
            }.padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        saving = true
        defer { saving = false }
        do {
            let payload: [String: Any] = [
                "title": title,
                "provider_name": providerName,
                "vehicle_type": vehicleType,
                "car_type": vehicleType,
                "car_brand": carBrand,
                "car_model": carModel,
                "car_year": Int(carYear) ?? 2024,
                "seats": Int(seats) ?? 4,
                "daily_price": Double(dailyPrice) ?? 0,
                "weekly_price": Double(weeklyPrice) ?? 0,
                "monthly_price": Double(monthlyPrice) ?? 0,
                "currency": currency,
                "media": [],
                "exterior_images": [],
                "interior_images": [],
            ]
            _ = try await service.createTransportVehicle(hostId: hostId, payload: payload, serviceType: serviceType)
            message = "Vehicle created successfully."
        } catch {
            message = "Could not create vehicle: \(error.localizedDescription)"
        }
    }
}

private struct NativeCreateAirportTransferView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var title = "Airport Transfer"
    @State private var providerName = ""
    @State private var carBrand = ""
    @State private var carModel = ""
    @State private var carYear = "2024"
    @State private var seats = "4"
    @State private var routeId = ""
    @State private var routePrice = ""
    @State private var currency = "RWF"
    @State private var saving = false
    @State private var message: String?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                labeledField("Title", text: $title)
                labeledField("Provider Name", text: $providerName)
                labeledField("Car Brand", text: $carBrand)
                labeledField("Car Model", text: $carModel)
                labeledField("Car Year", text: $carYear)
                labeledField("Seats", text: $seats)
                labeledField("Route ID", text: $routeId)
                labeledField("Route Price", text: $routePrice)
                labeledField("Currency", text: $currency)
                submitButton(title: "Publish Airport Transfer", saving: saving) { await submit() }
                if let message { Text(message).font(.caption).foregroundColor(.secondary) }
            }.padding(16)
        }
        .background(AppTheme.appBackground)
    }

    private func submit() async {
        guard let service, let hostId = session.userId else { return }
        saving = true
        defer { saving = false }
        do {
            let payload: [String: Any] = [
                "title": title,
                "provider_name": providerName,
                "vehicle_type": "Airport Transfer",
                "car_type": "Airport Transfer",
                "car_brand": carBrand,
                "car_model": carModel,
                "car_year": Int(carYear) ?? 2024,
                "seats": Int(seats) ?? 4,
                "currency": currency,
                "price_per_day": 0,
                "media": [],
                "exterior_images": [],
                "interior_images": [],
            ]
            if let vehicleId = try await service.createTransportVehicle(hostId: hostId, payload: payload, serviceType: "airport_transfer"),
               !routeId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
               let routePriceValue = Double(routePrice) {
                try await service.createAirportTransferPricing(vehicleId: vehicleId, routeId: routeId, price: routePriceValue, currency: currency)
            }
            message = "Airport transfer created successfully."
        } catch {
            message = "Could not create airport transfer: \(error.localizedDescription)"
        }
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
            .background(Color.white)
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
                        .background(Color.white)
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
                .background(Color.white)
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
                    .background(Color.white)
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
                    .background(Color.white)
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
                    .background(Color.white)
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
                    .background(Color.white)
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
    @State private var checkIn = "2026-03-15"
    @State private var checkOut = "2026-03-17"
    @State private var guests = "2"
    @State private var amount = "199500"
    @State private var currency = "RWF"
    @State private var phone = ""
    @State private var note = ""
    @State private var statusMessage: String?
    @State private var checkoutId: String?
    @State private var bookingId: String?
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
                labeledField("Currency", text: $currency)
                labeledField("Phone", text: $phone)
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

        saving = true
        defer { saving = false }
        do {
            let profile = try await service.fetchProfileBasics(userId: userId)
            let fullName = (profile?["full_name"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            let email = (profile?["email"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            let phoneValue = phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? ((profile?["phone"] as? String) ?? "") : phone

            let draft = BookingDraft(
                guestId: userId,
                guestName: fullName?.isEmpty == false ? fullName! : "Merry Mobile User",
                guestEmail: email?.isEmpty == false ? email! : "noreply@merry360x.com",
                propertyId: session.selectedListingId ?? "replace-with-real-property-id",
                specialRequests: note,
                paymentMethod: "mobile_money",
                checkIn: checkIn,
                checkOut: checkOut,
                guests: Int(guests) ?? 1,
                totalPrice: total,
                currency: currency
            )

            bookingId = try await service.submitBookingReturningId(draft)

            let checkout = try await service.createCheckoutRequest(
                userId: userId,
                name: fullName?.isEmpty == false ? fullName! : "Guest",
                email: email?.isEmpty == false ? email! : "noreply@merry360x.com",
                phone: phoneValue,
                message: note,
                totalAmount: total,
                currency: currency,
                paymentMethod: "mobile_money",
                items: [[
                    "type": "property",
                    "reference_id": session.selectedListingId ?? "replace-with-real-property-id",
                    "quantity": 1,
                    "amount": total
                ]]
            )
            checkoutId = checkout.id

            let paymentResponse = try await service.createFlutterwavePayment(payload: [
                "email": email?.isEmpty == false ? email! : "noreply@merry360x.com",
                "amount": total,
                "currency": currency,
                "checkoutId": checkout.id
            ])

            if let link = paymentResponse["paymentLink"] as? String, !link.isEmpty {
                statusMessage = "Checkout started. Payment link: \(link)"
            } else {
                statusMessage = "Checkout started. Waiting for payment confirmation."
            }
        } catch {
            statusMessage = "Checkout failed: \(error.localizedDescription)"
        }
    }

    private func refreshPaymentStatus() async {
        guard let service, let checkoutId else { return }
        polling = true
        defer { polling = false }
        do {
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
                statusMessage = "Payment is still pending: \(checkout.paymentStatus)."
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
            VStack(alignment: .leading, spacing: 12) {
                centerCard(title: "Help Center", subtitle: "Native support content mirroring website guidance.")
                ForEach(sections, id: \.title) { section in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(section.title)
                            .font(.headline)
                        ForEach(section.items, id: \.question) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.question)
                                    .font(.subheadline.weight(.semibold))
                                Text(item.answer)
                                    .font(.caption)
                                    .foregroundColor(AppTheme.textSecondary)
                            }
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white)
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
        .background(Color.white)
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
        .background(Color.white)
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
        .background(Color.white)
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
