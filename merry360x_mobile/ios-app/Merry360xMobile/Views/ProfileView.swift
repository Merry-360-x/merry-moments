import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showAuthSheet = false
    @State private var becomingHost = false
    @State private var hostActionMessage: String?
    @State private var activeCenter: AppCenterDestination?
    @State private var activeSettingSheet: ProfileSettingKind?
    @State private var showPersonalInfoSheet = false
    @State private var showSecuritySheet = false

    @AppStorage("merry_mobile_region") private var selectedRegion = "Rwanda"
    @AppStorage("merry_mobile_language") private var selectedLanguage = "English"
    @AppStorage("merry_mobile_currency") private var selectedCurrency = "RWF"
    @AppStorage("merry_mobile_theme_mode") private var selectedThemeMode = AppThemeMode.system.rawValue

    private let regionOptions: [ProfileSettingOption] = [
        .init(key: "Rwanda", title: "Rwanda", subtitle: "+250"),
        .init(key: "Kenya", title: "Kenya", subtitle: "+254"),
        .init(key: "Uganda", title: "Uganda", subtitle: "+256"),
        .init(key: "Zambia", title: "Zambia", subtitle: "+260")
    ]

    private let languageOptions: [ProfileSettingOption] = [
        .init(key: "English", title: "English", subtitle: "en"),
        .init(key: "Kinyarwanda", title: "Kinyarwanda", subtitle: "rw"),
        .init(key: "French", title: "French", subtitle: "fr"),
        .init(key: "Swahili", title: "Swahili", subtitle: "sw"),
        .init(key: "Chinese", title: "Chinese", subtitle: "zh")
    ]

    private let currencyOptions: [ProfileSettingOption] = [
        .init(key: "RWF", title: "RWF", subtitle: "FRw"),
        .init(key: "USD", title: "USD", subtitle: "$"),
        .init(key: "EUR", title: "EUR", subtitle: "€"),
        .init(key: "GBP", title: "GBP", subtitle: "£"),
        .init(key: "CNY", title: "CNY", subtitle: "¥"),
        .init(key: "TZS", title: "TZS", subtitle: "TSh"),
        .init(key: "KES", title: "KES", subtitle: "KSh"),
        .init(key: "UGX", title: "UGX", subtitle: "USh"),
        .init(key: "ZMW", title: "ZMW", subtitle: "ZK"),
        .init(key: "BIF", title: "BIF", subtitle: "FBu"),
        .init(key: "ZAR", title: "ZAR", subtitle: "R")
    ]

    private var modeOptions: [ProfileSettingOption] {
        AppThemeMode.allCases.map { mode in
            .init(key: mode.rawValue, title: mode.label, subtitle: nil)
        }
    }

    private var normalizedRoles: Set<String> {
        Set(session.roles.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
    }

    private var selectedModeLabel: String {
        (AppThemeMode(rawValue: selectedThemeMode) ?? .system).label
    }

    private var dashboardEntries: [(systemName: String, title: String, destination: AppCenterDestination)] {
        var entries: [(String, String, AppCenterDestination)] = []
        if normalizedRoles.contains("admin") {
            entries.append(("shield", "Admin Dashboard", .adminDashboard))
        }
        if normalizedRoles.contains("financial_staff") {
            entries.append(("chart.bar", "Financial Dashboard", .financialDashboard))
        }
        if normalizedRoles.contains("operations_staff") {
            entries.append(("gearshape.2", "Operations Dashboard", .operationsDashboard))
        }
        if normalizedRoles.contains("customer_support") {
            entries.append(("person.2.wave.2", "Support Dashboard", .supportDashboard))
        }
        if normalizedRoles.contains("host") {
            entries.append(("house", "Host Studio", .hostStudio))
        }
        if normalizedRoles.contains("affiliate") {
            entries.append(("link", "Affiliate Center", .affiliateCenter))
        }
        return entries
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Profile Header - Airbnb Style
                profileHeader
                
                // Login prompt for guests
                if !session.isAuthenticated {
                    guestLoginCard
                }
                
                // Your Merry 360x host action message
                if let hostActionMessage {
                    Text(hostActionMessage)
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.textSecondary)
                        .padding(.horizontal, 24)
                        .padding(.top, 8)
                }
                
                // Settings Section (only show when logged in)
                if session.isAuthenticated {
                    AirbnbSection(title: "Settings") {
                        AirbnbMenuItem(icon: "person", title: "Personal information") {
                            showPersonalInfoSheet = true
                        }
                        AirbnbMenuItem(icon: "lock.shield", title: "Login & security") {
                            showSecuritySheet = true
                        }
                        AirbnbMenuItem(icon: "creditcard", title: "Payments and payouts") {
                            activeCenter = .bookingsCheckout
                        }
                        AirbnbMenuItem(icon: "bell", title: "Notifications") {
                            activeCenter = .supportChat
                        }
                        AirbnbMenuItem(icon: "eye.slash", title: "Privacy and sharing", showDivider: false) {
                            activeCenter = .privacyPolicy
                        }
                    }
                }
                
                // Preferences Section
                AirbnbSection(title: "Preferences") {
                    AirbnbMenuItem(icon: "globe", title: "Region", value: selectedRegion) {
                        activeSettingSheet = .region
                    }
                    AirbnbMenuItem(icon: "character.bubble", title: "Language", value: selectedLanguage) {
                        activeSettingSheet = .language
                    }
                    AirbnbMenuItem(icon: "dollarsign.circle", title: "Currency", value: selectedCurrency) {
                        activeSettingSheet = .currency
                    }
                    AirbnbMenuItem(icon: "moon", title: "Appearance", value: selectedModeLabel, showDivider: false) {
                        activeSettingSheet = .mode
                    }
                }
                
                // Hosting Section (if host or can become host)
                if session.isAuthenticated {
                    AirbnbSection(title: "Hosting") {
                        if normalizedRoles.contains("host") {
                            AirbnbMenuItem(icon: "house", title: "Switch to hosting") {
                                activeCenter = .hostStudio
                            }
                            AirbnbMenuItem(icon: "list.bullet", title: "Manage your listings") {
                                activeCenter = .hostStudio
                            }
                            AirbnbMenuItem(icon: "calendar", title: "Your reservations", showDivider: false) {
                                activeCenter = .hostStudio
                            }
                        } else {
                            AirbnbMenuItem(icon: "house", title: "Become a Host", showDivider: false) {
                                becomeHost()
                            }
                        }
                    }
                }
                
                // Your Dashboards Section (role-based)
                if session.isAuthenticated && !dashboardEntries.isEmpty {
                    AirbnbSection(title: "Your dashboards") {
                        ForEach(Array(dashboardEntries.enumerated()), id: \.element.title) { index, item in
                            AirbnbMenuItem(
                                icon: item.systemName,
                                title: item.title,
                                showDivider: index < dashboardEntries.count - 1
                            ) {
                                activeCenter = item.destination
                            }
                        }
                    }
                }
                
                // Bookings Section
                if session.isAuthenticated {
                    AirbnbSection(title: "Bookings") {
                        AirbnbMenuItem(icon: "calendar.badge.clock", title: "Your trips") {
                            activeCenter = .bookingsCheckout
                        }
                        AirbnbMenuItem(icon: "heart", title: "Wishlists") {
                            activeCenter = .favorites
                        }
                        AirbnbMenuItem(icon: "cart", title: "Trip cart", showDivider: false) {
                            activeCenter = .tripCart
                        }
                    }
                }
                
                // Support Section
                AirbnbSection(title: "Support") {
                    AirbnbMenuItem(icon: "questionmark.circle", title: "Visit the Help Centre") {
                        activeCenter = .helpCenter
                    }
                    AirbnbMenuItem(icon: "bubble.left.and.bubble.right", title: "Get help") {
                        activeCenter = .supportChat
                    }
                    AirbnbMenuItem(icon: "shield.checkerboard", title: "Report a safety issue", showDivider: false) {
                        activeCenter = .safetyGuidelines
                    }
                }
                
                // Discover Section
                AirbnbSection(title: "Discover") {
                    AirbnbMenuItem(icon: "newspaper", title: "Travel stories", showDivider: false) {
                        activeCenter = .helpCenter
                    }
                }
                
                // Legal Section
                AirbnbSection(title: "Legal") {
                    AirbnbMenuItem(icon: "doc.text", title: "Terms of Service") {
                        activeCenter = .termsConditions
                    }
                    AirbnbMenuItem(icon: "hand.raised", title: "Privacy Policy") {
                        activeCenter = .privacyPolicy
                    }
                    AirbnbMenuItem(icon: "arrow.uturn.backward", title: "Refund Policy", showDivider: false) {
                        activeCenter = .refundPolicy
                    }
                }
                
                // Log out
                if session.isAuthenticated {
                    Button(action: {
                        Task { await session.signOut() }
                    }) {
                        Text("Log out")
                            .font(.system(size: 16))
                            .foregroundColor(AppTheme.textPrimary)
                            .underline()
                    }
                    .padding(.top, 32)
                    .padding(.bottom, 16)
                }
                
                // Version
                Text("Version 1.0.0")
                    .font(.system(size: 12))
                    .foregroundColor(AppTheme.textSecondary)
                    .padding(.bottom, 100)
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .sheet(isPresented: $showAuthSheet) {
            AuthBottomSheet(isPresented: $showAuthSheet)
                .presentationDetents([.large])
                .presentationDragIndicator(.hidden)
        }
        .sheet(item: $activeCenter) { destination in
            AppCentersView(destination: destination)
                .environmentObject(session)
        }
        .sheet(item: $activeSettingSheet) { setting in
            ProfileSettingSheet(
                title: settingTitle(for: setting),
                options: settingOptions(for: setting),
                selectedKey: selectedKey(for: setting)
            ) { selected in
                applySelection(selected, for: setting)
            }
            .presentationDetents([.height(330), .medium])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showPersonalInfoSheet) {
            PersonalInfoSheet(viewModel: viewModel, userId: session.userId ?? "")
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showSecuritySheet) {
            SecuritySheet(viewModel: viewModel, email: viewModel.email ?? "")
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .task(id: session.userId) {
            if let userId = session.userId {
                await viewModel.load(userId: userId)
            } else {
                viewModel.clear()
            }
        }
        .onChange(of: session.isAuthenticated) { authenticated in
            if !authenticated {
                viewModel.clear()
                hostActionMessage = nil
            }
        }
        .onChange(of: session.roles) { _ in
            guard let userId = session.userId else { return }
            Task {
                await viewModel.load(userId: userId)
            }
        }
    }
    
    // MARK: - Profile Header (Airbnb Style)
    
    private var profileHeader: some View {
        VStack(spacing: 0) {
            // Top navigation
            HStack {
                Text("Profile")
                    .font(.system(size: 32, weight: .bold))
                Spacer()
                if session.isAuthenticated {
                    Button(action: { activeCenter = .supportChat }) {
                        Image(systemName: "bell")
                            .font(.system(size: 20))
                            .foregroundColor(AppTheme.textPrimary)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 24)
            
            // Profile card
            if session.isAuthenticated {
                Button(action: { showPersonalInfoSheet = true }) {
                    HStack(spacing: 16) {
                        // Avatar
                        ZStack {
                            Circle()
                                .fill(Color(uiColor: .systemGray5))
                                .frame(width: 64, height: 64)
                            
                            if let avatarURL = viewModel.avatarURL, let url = URL(string: avatarURL) {
                                AsyncImage(url: url) { image in
                                    image.resizable().scaledToFill()
                                } placeholder: {
                                    Text(String(profileHeaderName.prefix(1)).uppercased())
                                        .font(.system(size: 26, weight: .semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                }
                                .frame(width: 64, height: 64)
                                .clipShape(Circle())
                            } else {
                                Text(String(profileHeaderName.prefix(1)).uppercased())
                                    .font(.system(size: 26, weight: .semibold))
                                    .foregroundColor(AppTheme.textPrimary)
                            }
                        }
                        
                        // Name and show profile
                        VStack(alignment: .leading, spacing: 4) {
                            Text(profileHeaderName)
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundColor(AppTheme.textPrimary)
                            Text("Show profile")
                                .font(.system(size: 14))
                                .foregroundColor(AppTheme.textSecondary)
                        }
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    .padding(16)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .black.opacity(0.08), radius: 8, y: 2)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
    }
    
    // MARK: - Guest Login Card
    
    private var guestLoginCard: some View {
        VStack(spacing: 16) {
            // Profile placeholder
            ZStack {
                Circle()
                    .fill(Color(uiColor: .systemGray5))
                    .frame(width: 100, height: 100)
                Image(systemName: "person.fill")
                    .font(.system(size: 40))
                    .foregroundColor(Color(uiColor: .systemGray3))
            }
            
            Text("Log in to start planning your next trip.")
                .font(.system(size: 17))
                .foregroundColor(AppTheme.textPrimary)
                .multilineTextAlignment(.center)
            
            Button(action: { showAuthSheet = true }) {
                Text("Log in")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppTheme.coral)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            
            HStack(spacing: 4) {
                Text("Don't have an account?")
                    .font(.system(size: 14))
                    .foregroundColor(AppTheme.textSecondary)
                Button(action: { showAuthSheet = true }) {
                    Text("Sign up")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppTheme.textPrimary)
                        .underline()
                }
            }
        }
        .padding(24)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.08), radius: 8, y: 2)
        .padding(.horizontal, 24)
        .padding(.bottom, 24)
    }
    
    // MARK: - Helper Functions
    
    private func becomeHost() {
        guard let userId = session.userId, !becomingHost else { return }
        becomingHost = true
        hostActionMessage = nil
        Task {
            do {
                let payload: [String: Any] = [
                    "status": "approved",
                    "applicant_type": "individual",
                    "service_types": [],
                    "profile_complete": false
                ]
                if let service = SupabaseService() {
                    try await service.becomeHost(userId: userId, payload: payload)
                }
                await session.refreshRoles()
                hostActionMessage = "You are now a host!"
            } catch {
                hostActionMessage = "Could not become host. Please try again."
            }
            becomingHost = false
        }
    }

    private func settingTitle(for kind: ProfileSettingKind) -> String {
        switch kind {
        case .region: return "Choose Region"
        case .language: return "Choose Language"
        case .currency: return "Choose Currency"
        case .mode: return "Choose Display Mode"
        }
    }

    private func settingOptions(for kind: ProfileSettingKind) -> [ProfileSettingOption] {
        switch kind {
        case .region: return regionOptions
        case .language: return languageOptions
        case .currency: return currencyOptions
        case .mode: return modeOptions
        }
    }

    private func selectedKey(for kind: ProfileSettingKind) -> String {
        switch kind {
        case .region: return selectedRegion
        case .language: return selectedLanguage
        case .currency: return selectedCurrency
        case .mode: return selectedThemeMode
        }
    }

    private func applySelection(_ value: String, for kind: ProfileSettingKind) {
        switch kind {
        case .region:
            selectedRegion = value
        case .language:
            selectedLanguage = value
        case .currency:
            selectedCurrency = value
        case .mode:
            selectedThemeMode = value
        }
    }

    private var profileHeaderName: String {
        guard session.isAuthenticated else { return "Welcome" }

        if let displayName = viewModel.displayName, !displayName.isEmpty {
            return displayName
        }
        if let email = viewModel.email, let local = email.split(separator: "@").first, !local.isEmpty {
            return String(local)
        }
        return "Traveler"
    }
}

// MARK: - Airbnb Section

private struct AirbnbSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(AppTheme.textSecondary)
                .textCase(.uppercase)
                .tracking(0.5)
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 8)
            
            VStack(spacing: 0) {
                content
            }
            .background(.white)
        }
    }
}

// MARK: - Airbnb Menu Item

private struct AirbnbMenuItem: View {
    let icon: String
    let title: String
    var value: String? = nil
    var showDivider: Bool = true
    var action: () -> Void = {}
    
    var body: some View {
        VStack(spacing: 0) {
            Button(action: action) {
                HStack(spacing: 16) {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(AppTheme.textPrimary)
                        .frame(width: 24, height: 24)
                    
                    Text(title)
                        .font(.system(size: 16))
                        .foregroundColor(AppTheme.textPrimary)
                    
                    Spacer()
                    
                    if let value {
                        Text(value)
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            
            if showDivider {
                Divider()
                    .padding(.leading, 64)
            }
        }
    }
}

// MARK: - Settings Sheet

private struct ProfileSettingSheet: View {
    let title: String
    let options: [ProfileSettingOption]
    let selectedKey: String
    let onSelect: (String) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(AppTheme.textPrimary)
                        .frame(width: 32, height: 32)
                        .background(Color(uiColor: .systemGray5))
                        .clipShape(Circle())
                }
                Spacer()
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                Color.clear.frame(width: 32, height: 32)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 16)

            Divider()

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(options) { option in
                        Button {
                            onSelect(option.key)
                            dismiss()
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(option.title)
                                        .font(.system(size: 16))
                                        .foregroundColor(AppTheme.textPrimary)
                                    if let subtitle = option.subtitle {
                                        Text(subtitle)
                                            .font(.system(size: 13))
                                            .foregroundColor(AppTheme.textSecondary)
                                    }
                                }
                                Spacer()
                                if option.key == selectedKey {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(AppTheme.textPrimary)
                                }
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 16)
                        }
                        .buttonStyle(.plain)

                        Divider()
                            .padding(.leading, 24)
                    }
                }
            }
        }
        .background(.white)
    }
}

// MARK: - Personal Info Sheet

private struct PersonalInfoSheet: View {
    @ObservedObject var viewModel: ProfileViewModel
    let userId: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    TextField("Full Name", text: $viewModel.editFullName)
                    TextField("Nickname", text: $viewModel.editNickname)
                    TextField("Phone Number", text: $viewModel.editPhone)
                        .keyboardType(.phonePad)
                }

                Section("Personal") {
                    TextField("Date of Birth", text: $viewModel.editDateOfBirth)
                        .keyboardType(.numbersAndPunctuation)
                    TextField("Bio", text: $viewModel.editBio, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Personal Info")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.saveProfile(userId: userId)
                            dismiss()
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Security Sheet

private struct SecuritySheet: View {
    @ObservedObject var viewModel: ProfileViewModel
    let email: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    HStack {
                        Text("Email")
                        Spacer()
                        Text(email)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }

                Section("Security") {
                    HStack {
                        Image(systemName: "lock.shield")
                            .foregroundColor(AppTheme.coral)
                        Text("Password protected")
                            .foregroundColor(AppTheme.textPrimary)
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                }

                Section(footer: Text("To reset your password, please use the web application or sign out and use 'Forgot Password' on the login screen.")) {
                    EmptyView()
                }
            }
            .navigationTitle("Login & security")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    NavigationStack { ProfileView() }
        .environmentObject(AppSessionViewModel())
}
