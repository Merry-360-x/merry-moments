import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Environment(\.openURL) private var openURL
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showAuthSheet = false
    @State private var becomingHost = false
    @State private var hostActionMessage: String?

    private var normalizedRoles: Set<String> {
        Set(session.roles.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
    }

    private var dashboardEntries: [(systemName: String, title: String, path: String)] {
        var entries: [(String, String, String)] = []
        if normalizedRoles.contains("admin") { entries.append(("shield", "Admin Dashboard", "/admin")) }
        if normalizedRoles.contains("financial_staff") { entries.append(("dollarsign.circle", "Financial Dashboard", "/financial-dashboard")) }
        if normalizedRoles.contains("operations_staff") { entries.append(("gearshape", "Operations Dashboard", "/operations-dashboard")) }
        if normalizedRoles.contains("customer_support") { entries.append(("headphones", "Support Dashboard", "/customer-support-dashboard")) }
        if normalizedRoles.contains("host") { entries.append(("house", "Host Dashboard", "/host-dashboard")) }
        return entries
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Notification button
                HStack {
                    Spacer()
                    Button(action: { /* Open notifications */ }) {
                        Image(systemName: "bell")
                            .font(.system(size: 20))
                            .foregroundColor(.black)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                
                // Profile Avatar
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color.black)
                            .frame(width: 80, height: 80)
                        
                        Text(String((session.userId ?? "G").prefix(1)).uppercased())
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    Text("Guest")
                        .font(.system(size: 20, weight: .semibold))
                    
                    Text(session.isAuthenticated ? "Logged in" : "Browsing as guest")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                }
                .padding(.vertical, 20)
                
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
                        .foregroundColor(.gray)
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                }
                
                // Settings Section
                ProfileSection(title: "Settings") {
                    ProfileMenuItem(systemName: "globe", title: "Region", value: "Rwanda")
                    ProfileMenuItem(systemName: "textformat", title: "Language", value: "English")
                    ProfileMenuItem(systemName: "dollarsign.circle", title: "Currency", value: "RWF")
                    ProfileMenuItem(systemName: "sun.max", title: "Mode", value: "Light")
                }
                
                // Explore Section
                ProfileSection(title: "Explore") {
                    ProfileMenuItem(systemName: "camera", title: "Travel Stories")
                }
                
                // Legal Section
                ProfileSection(title: "Legal") {
                    ProfileMenuItem(systemName: "doc.text", title: "Terms & Conditions")
                    ProfileMenuItem(systemName: "lock", title: "Privacy Policy")
                    ProfileMenuItem(systemName: "arrow.uturn.left", title: "Refund Policy")
                    ProfileMenuItem(systemName: "checkmark.shield", title: "Safety Guidelines")
                }
                
                // Help Section
                ProfileSection(title: "Help") {
                    ProfileMenuItem(systemName: "bubble.left", title: "Let's Chat")
                    ProfileMenuItem(systemName: "questionmark.circle", title: "Help Center")
                    ProfileMenuItem(systemName: "star", title: "App Store")
                    ProfileMenuItem(systemName: "play.fill", title: "Google Play")
                }
                
                // Parity Section
                ProfileSection(title: "Parity") {
                    ProfileMenuItem(systemName: "iphone", title: "All Website Pages")
                }
                
                if session.isAuthenticated && !dashboardEntries.isEmpty {
                    ProfileSection(title: "Dashboards") {
                        ForEach(dashboardEntries, id: \.path) { item in
                            ProfileMenuItem(systemName: item.systemName, title: item.title) {
                                if let url = URL(string: "\(MobileConfig.apiBaseUrl)\(item.path)") {
                                    openURL(url)
                                }
                            }
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
                .padding(.bottom, 32)
            }
        }
        .background(Color.white)
        .sheet(isPresented: $showAuthSheet) {
            AuthBottomSheet(isPresented: $showAuthSheet)
                .presentationDetents([.large])
                .presentationDragIndicator(.hidden)
        }
        .task {
            if let userId = session.userId {
                await viewModel.load(userId: userId)
            }
        }
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
                .foregroundColor(.gray)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .medium))
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
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
            HStack(spacing: 12) {
                Image(systemName: systemName)
                    .font(.system(size: 18))
                    .foregroundColor(.gray)
                    .frame(width: 24)
                
                Text(title)
                    .font(.system(size: 15))
                
                Spacer()
                
                if let value = value {
                    Text(value)
                        .font(.system(size: 15))
                        .foregroundColor(.gray)
                }
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.gray)
                    .font(.system(size: 12))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .contentShape(Rectangle())
            .onTapGesture(perform: action)
            
            Divider()
                .padding(.leading, 52)
        }
    }
}

#Preview {
    NavigationStack { ProfileView() }
        .environmentObject(AppSessionViewModel())
}
