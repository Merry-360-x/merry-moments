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
                // Notification button
                HStack {
                    Spacer()
                    Button(action: { activeCenter = .supportChat }) {
                        Image(systemName: "bell")
                            .font(.system(size: 20))
                            .foregroundColor(AppTheme.textPrimary)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                
                // Profile Avatar
                VStack(spacing: 12) {
                    ZStack {
                        if let avatarURL = viewModel.avatarURL,
                           let url = URL(string: avatarURL) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .scaledToFill()
                            } placeholder: {
                                Circle()
                                    .fill(session.isAuthenticated ? AppTheme.coral.opacity(0.3) : Color(uiColor: .tertiarySystemFill))
                            }
                            .frame(width: session.isAuthenticated ? 88 : 80, height: session.isAuthenticated ? 88 : 80)
                            .clipShape(Circle())
                        } else {
                            Circle()
                                .fill(session.isAuthenticated ? AppTheme.coral : Color(uiColor: .tertiarySystemFill))
                                .frame(width: session.isAuthenticated ? 88 : 80, height: session.isAuthenticated ? 88 : 80)

                            Text(String(profileHeaderName.prefix(1)).uppercased())
                                .font(.system(size: session.isAuthenticated ? 34 : 32, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                    
                    Text(profileHeaderName)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(AppTheme.textPrimary)

                    if let email = viewModel.email {
                        Text(email)
                            .font(.system(size: 13))
                            .foregroundColor(AppTheme.textSecondary)
                    } else {
                        Text(session.isAuthenticated ? "Account active" : "Browse and sign in")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.textSecondary)
                    }

                    // Role chips
                    if session.isAuthenticated {
                        let displayRoles = normalizedRoles.isEmpty
                            ? ["Traveler"]
                            : normalizedRoles.sorted().map { $0.replacingOccurrences(of: "_", with: " ").capitalized }
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(displayRoles, id: \.self) { tag in
                                    Text(tag)
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(AppTheme.coral)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 5)
                                        .background(AppTheme.coral.opacity(0.12))
                                        .clipShape(Capsule())
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }
                }
                .padding(.vertical, 20)

                // Quick stats (logged-in only)
                if session.isAuthenticated {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ProfileStatCard(value: "\(viewModel.upcomingTrips)", label: "Upcoming")
                        ProfileStatCard(value: "\(viewModel.loyaltyPoints)", label: "Points")
                        ProfileStatCard(value: "\(viewModel.savedCount)", label: "Saved")
                    }
                    .padding(.horizontal, 20)

                    if let ms = viewModel.memberSince {
                        Text("Member since: \(ms)")
                            .font(.system(size: 12))
                            .foregroundColor(AppTheme.textSecondary)
                            .padding(.top, 8)
                            .padding(.horizontal, 20)
                    }
                }

                if viewModel.loading {
                    MerryLoadingStateView(
                        title: "Loading your profile",
                        subtitle: "Fetching wishlist and account data...",
                        showCardSkeletons: false
                    )
                    .padding(.horizontal, 20)
                }
                
                if session.isAuthenticated && !normalizedRoles.contains("host") {
                    Button(action: {
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
                                hostActionMessage = "You are now a host."
                            } catch {
                                hostActionMessage = "Could not become host. Please try again."
                            }
                            becomingHost = false
                        }
                    }) {
                        HStack {
                            Image(systemName: "person.badge.plus")
                            Text(becomingHost ? "Activating Host..." : "Become a Host")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(AppTheme.coral)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .padding(.horizontal, 20)
                    .disabled(becomingHost)
                }

                if let hostActionMessage {
                    Text(hostActionMessage)
                        .font(.system(size: 13))
                        .foregroundColor(AppTheme.textSecondary)
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                }

                // Account Section (logged-in only)
                if session.isAuthenticated {
                    ProfileSection(title: "Account") {
                        ProfileMenuItem(
                            systemName: "person.text.rectangle",
                            title: "Personal Info",
                            value: viewModel.editFullName.isEmpty ? nil : viewModel.editFullName
                        ) {
                            showPersonalInfoSheet = true
                        }
                        ProfileMenuItem(systemName: "lock.shield", title: "Security") {
                            showSecuritySheet = true
                        }
                        ProfileMenuItem(
                            systemName: "checkmark.seal",
                            title: "Complete Profile",
                            value: viewModel.loyaltyPoints < 5 ? "Earn 5 pts" : nil
                        ) {
                            showPersonalInfoSheet = true
                        }
                    }
                }
                
                // Settings Section
                ProfileSection(title: "Settings") {
                    ProfileMenuItem(systemName: "globe", title: "Region", value: selectedRegion) {
                        activeSettingSheet = .region
                    }
                    ProfileMenuItem(systemName: "textformat", title: "Language", value: selectedLanguage) {
                        activeSettingSheet = .language
                    }
                    ProfileMenuItem(systemName: "dollarsign.circle", title: "Currency", value: selectedCurrency) {
                        activeSettingSheet = .currency
                    }
                    ProfileMenuItem(systemName: "sun.max", title: "Mode", value: selectedModeLabel) {
                        activeSettingSheet = .mode
                    }
                }
                
                // Explore Section
                ProfileSection(title: "Explore") {
                    ProfileMenuItem(systemName: "camera", title: "Travel Stories") {
                        activeCenter = .helpCenter
                    }
                    ProfileMenuItem(systemName: "link", title: "Affiliate Program") {
                        activeCenter = .affiliateCenter
                    }
                    ProfileMenuItem(systemName: "map", title: "Website Route Map") {
                        activeCenter = .websiteRoutes
                    }
                }
                
                // Legal Section
                ProfileSection(title: "Legal") {
                    ProfileMenuItem(systemName: "doc.text", title: "Terms & Conditions") {
                        activeCenter = .termsConditions
                    }
                    ProfileMenuItem(systemName: "lock", title: "Privacy Policy") {
                        activeCenter = .privacyPolicy
                    }
                    ProfileMenuItem(systemName: "arrow.uturn.left", title: "Refund Policy") {
                        activeCenter = .refundPolicy
                    }
                    ProfileMenuItem(systemName: "checkmark.shield", title: "Safety Guidelines") {
                        activeCenter = .safetyGuidelines
                    }
                }
                
                // Help Section
                ProfileSection(title: "Help") {
                    ProfileMenuItem(systemName: "bubble.left", title: "Let's Chat") {
                        activeCenter = .supportChat
                    }
                    ProfileMenuItem(systemName: "questionmark.circle", title: "Help Center") {
                        activeCenter = .helpCenter
                    }
                }
                
                if session.isAuthenticated && !dashboardEntries.isEmpty {
                    ProfileSection(title: "Dashboards You Can Access") {
                        ForEach(dashboardEntries, id: \.title) { item in
                            ProfileMenuItem(systemName: item.systemName, title: item.title) {
                                activeCenter = item.destination
                            }
                        }
                    }
                }

                if session.isAuthenticated {
                    ProfileSection(title: "Bookings") {
                        ProfileMenuItem(systemName: "calendar", title: "My Bookings") {
                            activeCenter = .bookingsCheckout
                        }
                        ProfileMenuItem(systemName: "creditcard", title: "Checkout & Payment Status") {
                            activeCenter = .bookingsCheckout
                        }
                        ProfileMenuItem(systemName: "heart", title: "Favorites") {
                            activeCenter = .favorites
                        }
                        ProfileMenuItem(systemName: "cart", title: "Trip Cart") {
                            activeCenter = .tripCart
                        }
                    }
                }
                
                // Login/Sign Out Button
                Button(action: {
                    if session.isAuthenticated {
                        Task { await session.signOut() }
                    } else {
                        showAuthSheet = true
                    }
                }) {
                    Text(session.isAuthenticated ? "Sign Out" : "Login / Sign In")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppTheme.coral)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, 20)
                .padding(.top, 24)
                .padding(.bottom, 120)
            }
        }
        .background(AppTheme.appBackground)
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

private struct ProfileSettingSheet: View {
    let title: String
    let options: [ProfileSettingOption]
    let selectedKey: String
    let onSelect: (String) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(title)
                    .font(.headline)
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                Button("Done") {
                    dismiss()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(AppTheme.coral)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 10)

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(options) { option in
                        Button {
                            onSelect(option.key)
                            dismiss()
                        } label: {
                            HStack(spacing: 10) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(option.title)
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(AppTheme.textPrimary)
                                    if let subtitle = option.subtitle {
                                        Text(subtitle)
                                            .font(.system(size: 13))
                                            .foregroundColor(AppTheme.textSecondary)
                                    }
                                }
                                Spacer()
                                if option.key == selectedKey {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(AppTheme.coral)
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 14)
                        }
                        .buttonStyle(.plain)

                        Divider()
                            .padding(.leading, 20)
                    }
                }
            }
        }
        .background(AppTheme.appBackground)
    }
}

struct ProfileSectionItem: View {
    let systemName: String
    let title: String
    let subtitle: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemName)
                .font(.system(size: 20))
                    .foregroundColor(AppTheme.textSecondary)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .medium))
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundColor(AppTheme.textSecondary)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(AppTheme.textSecondary)
                .font(.system(size: 14))
        }
        .padding(.vertical, 12)
    }
}

struct ProfileSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 16, weight: .bold))
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 8)
            
            content
        }
    }
}

struct ProfileMenuItem: View {
    let systemName: String
    let title: String
    var value: String? = nil
    var action: () -> Void = {}
    
    var body: some View {
        VStack(spacing: 0) {
            Button(action: action) {
                HStack(spacing: 12) {
                    Image(systemName: systemName)
                        .font(.system(size: 18))
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(width: 24)

                    Text(title)
                        .font(.system(size: 15))
                        .foregroundColor(AppTheme.textPrimary)

                    Spacer()

                    if let value = value {
                        Text(value)
                            .font(.system(size: 15))
                            .foregroundColor(AppTheme.textSecondary)
                    }

                    Image(systemName: "chevron.right")
                        .foregroundColor(AppTheme.textSecondary)
                        .font(.system(size: 12))
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            
            Divider()
                .padding(.leading, 52)
        }
    }
}

#Preview {
    NavigationStack { ProfileView() }
        .environmentObject(AppSessionViewModel())
}

// MARK: - Quick Stat Card

private struct ProfileStatCard: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(AppTheme.textPrimary)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
                Section("Name") {
                    LabeledContent("Full Name") {
                        TextField("Your name", text: $viewModel.editFullName)
                            .multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Nickname") {
                        TextField("Shown to guests", text: $viewModel.editNickname)
                            .multilineTextAlignment(.trailing)
                    }
                }
                Section("Contact") {
                    LabeledContent("Phone") {
                        TextField("+250...", text: $viewModel.editPhone)
                            .multilineTextAlignment(.trailing)
                            .keyboardType(.phonePad)
                    }
                    LabeledContent("Date of Birth") {
                        TextField("YYYY-MM-DD", text: $viewModel.editDateOfBirth)
                            .multilineTextAlignment(.trailing)
                    }
                }
                Section("About You") {
                    TextEditor(text: $viewModel.editBio)
                        .frame(minHeight: 80)
                }
                if viewModel.saveSuccess {
                    Section {
                        Label("Changes saved!", systemImage: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                }
                if let err = viewModel.saveError {
                    Section {
                        Text(err).foregroundColor(.red).font(.caption)
                    }
                }
            }
            .navigationTitle("Personal Info")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(viewModel.saving ? "Saving..." : "Save") {
                        Task {
                            await viewModel.saveProfile(userId: userId)
                            if viewModel.saveSuccess { dismiss() }
                        }
                    }
                    .disabled(viewModel.saving)
                    .foregroundColor(AppTheme.coral)
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
                Section("Account Email") {
                    HStack {
                        Image(systemName: "envelope")
                            .foregroundColor(AppTheme.textSecondary)
                        Text(email.isEmpty ? "—" : email)
                            .foregroundColor(AppTheme.textPrimary)
                    }
                    Text("To change your email, contact support.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
                Section("Password Reset") {
                    Text("A reset link will be sent to your email address.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                    Button(action: {
                        guard !email.isEmpty else { return }
                        Task { await viewModel.requestPasswordReset(email: email) }
                    }) {
                        HStack {
                            Image(systemName: "envelope.badge.shield.half.filled")
                            Text(viewModel.resettingPassword ? "Sending..." : "Send Password Reset Email")
                        }
                        .foregroundColor(AppTheme.coral)
                    }
                    .disabled(viewModel.resettingPassword || email.isEmpty)
                }
                if viewModel.resetSuccess {
                    Section {
                        Label("Reset email sent! Check your inbox.", systemImage: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                    }
                }
                if let err = viewModel.resetError {
                    Section {
                        Text(err).foregroundColor(.red).font(.caption)
                    }
                }
            }
            .navigationTitle("Security")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .foregroundColor(AppTheme.coral)
                }
            }
        }
    }
}
