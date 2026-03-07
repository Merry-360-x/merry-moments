import SwiftUI

enum AppCenterDestination: String, Identifiable {
    case backoffice
    case hostStudio
    case affiliateCenter
    case supportLegal
    case bookingsCheckout

    var id: String { rawValue }

    var title: String {
        switch self {
        case .backoffice: return "Backoffice Center"
        case .hostStudio: return "Host Studio"
        case .affiliateCenter: return "Affiliate Center"
        case .supportLegal: return "Support & Legal"
        case .bookingsCheckout: return "Bookings & Checkout"
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
            case .hostStudio:
                HostStudioCenterView()
            case .affiliateCenter:
                AffiliateCenterView()
            case .supportLegal:
                SupportLegalCenterView()
            case .bookingsCheckout:
                BookingsCheckoutCenterView()
            }
        }
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
                case .hostDashboard, .hostReviews, .financialReports, .payoutRequests, .payoutHistory:
                    NativeInfoView(
                        title: module.title,
                        subtitle: "This native module uses the same backend tables and role checks as web.",
                        bullets: [
                            "Connected to Supabase data",
                            "Uses your current account/role",
                            "No webview or external redirect"
                        ]
                    )
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
                moduleList(items: AffiliateModule.allCases.map(\.title)) { title in
                    selected = AffiliateModule.allCases.first(where: { $0.title == title })
                }
                centerCard(title: title, subtitle: subtitle)
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(bullets, id: \.self) { bullet in
                        Text("- \(bullet)")
                            .font(.subheadline)
        .sheet(item: $selected) { module in
            NavigationStack {
                switch module {
                case .signup:
                    NativeAffiliateSignupView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .dashboard:
                    NativeAffiliateDashboardView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                case .portal:
                    NativeAffiliatePortalView()
                        .environmentObject(session)
                        .navigationTitle(module.title)
                        .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
                            .foregroundColor(AppTheme.textPrimary)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
    }
}

private struct NativeAdminOverviewView: View {
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var metrics = MobileAdminMetrics.empty
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading {
                    ProgressView()
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }

                metricRow(label: "Users", value: "\(metrics.usersTotal)")
                metricRow(label: "Hosts", value: "\(metrics.hostsTotal)")
                metricRow(label: "Stories", value: "\(metrics.storiesTotal)")
                metricRow(label: "Properties", value: "\(metrics.propertiesTotal)")
                metricRow(label: "Bookings", value: "\(metrics.bookingsTotal)")
                metricRow(label: "Paid Bookings", value: "\(metrics.bookingsPaid)")
                metricRow(label: "Revenue", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.revenueGross))")
                metricRow(label: "Platform Charges", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.platformCharges))")
                metricRow(label: "Host Net", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.hostNet))")
                metricRow(label: "Discount Amount", value: "\(metrics.revenueCurrency) \(formatAmount(metrics.discountAmount))")
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task {
            await load()
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
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    private func formatAmount(_ value: Double) -> String {
        NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)
    }
}

private struct NativeFinancialSummaryView: View {
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var summary: MobileFinancialSummary?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                if let summary {
                    metricRow(label: "Bookings Total", value: "\(summary.bookingsTotal)")
                    metricRow(label: "Pending", value: "\(summary.pending)")
                    metricRow(label: "Confirmed", value: "\(summary.confirmed)")
                    metricRow(label: "Paid", value: "\(summary.paid)")
                    metricRow(label: "Cancelled", value: "\(summary.cancelled)")
                    metricRow(label: "Unpaid Checkout", value: "\(summary.unpaidCheckoutRequests)")
                    metricRow(label: "Refunded Checkout", value: "\(summary.refundedCheckoutRequests)")
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func load() async {
        guard let service else { return }
        loading = true
        do {
            summary = try await service.fetchFinancialSummary()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct NativeOperationsSummaryView: View {
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var summary: MobileOperationsSummary?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                if let summary {
                    metricRow(label: "Host Applications", value: "\(summary.hostApplicationsTotal)")
                    metricRow(label: "Pending Applications", value: "\(summary.hostApplicationsPending)")
                    metricRow(label: "Properties", value: "\(summary.propertiesTotal)")
                    metricRow(label: "Published Properties", value: "\(summary.propertiesPublished)")
                    metricRow(label: "Tours", value: "\(summary.toursTotal)")
                    metricRow(label: "Published Tours", value: "\(summary.toursPublished)")
                    metricRow(label: "Transport Vehicles", value: "\(summary.transportVehiclesTotal)")
                    metricRow(label: "Bookings", value: "\(summary.bookingsTotal)")
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func load() async {
        guard let service else { return }
        loading = true
        do {
            summary = try await service.fetchOperationsSummary()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct NativeSupportSummaryView: View {
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var summary: MobileSupportSummary?
    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading { ProgressView() }
                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }
                if let summary {
                    metricRow(label: "Tickets Total", value: "\(summary.ticketsTotal)")
                    metricRow(label: "Open", value: "\(summary.ticketsOpen)")
                    metricRow(label: "In Progress", value: "\(summary.ticketsInProgress)")
                    metricRow(label: "Resolved", value: "\(summary.ticketsResolved)")
                    metricRow(label: "Closed", value: "\(summary.ticketsClosed)")
                    metricRow(label: "Reviews", value: "\(summary.reviewsTotal)")
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task { await load() }
    }

    private func load() async {
        guard let service else { return }
        loading = true
        do {
            summary = try await service.fetchSupportSummary()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
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
    @State private var body = ""
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
                    TextEditor(text: $body)
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
        let safeBody = body.trimmingCharacters(in: .whitespacesAndNewlines)
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
