import SwiftUI

struct CompleteProfileView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var fullName = ""
    @State private var phone = ""
    @State private var isOver18 = false
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @State private var loyaltyPoints: Int?

    private let service = SupabaseService()

    var body: some View {
        List {
            Section {
                VStack(spacing: 8) {
                    Image(systemName: "person.crop.circle.badge.checkmark")
                        .font(.system(size: 50))
                        .foregroundColor(AppTheme.coral)
                    Text("Complete Your Profile")
                        .font(.title3)
                        .fontWeight(.bold)
                    Text("Fill in your details to unlock all features")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .listRowBackground(Color.clear)
            }

            Section("Personal Information") {
                HStack {
                    Image(systemName: "person")
                        .foregroundColor(AppTheme.coral)
                        .frame(width: 24)
                    TextField("Full Name", text: $fullName)
                        .textContentType(.name)
                        .autocorrectionDisabled()
                }

                HStack {
                    Image(systemName: "phone")
                        .foregroundColor(AppTheme.coral)
                        .frame(width: 24)
                    TextField("Phone Number", text: $phone)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }
                Text("Include country code, e.g. +250 7XX XXX XXX")
                    .font(.caption2)
                    .foregroundColor(AppTheme.textSecondary)
            }

            Section {
                Toggle(isOn: $isOver18) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("I confirm I am 18 years or older")
                            .font(.subheadline)
                        Text("Required to use booking services")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
                .tint(AppTheme.coral)
            }

            if let error = errorMessage {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }

            Section {
                Button {
                    Task { await save() }
                } label: {
                    HStack {
                        Spacer()
                        if saving {
                            ProgressView()
                        } else {
                            Text("Complete Profile")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                    .foregroundColor(.white)
                    .padding(.vertical, 4)
                }
                .listRowBackground(canSave ? AppTheme.coral : Color.gray)
                .disabled(!canSave || saving)
            }
        }
        .navigationTitle("Complete Profile")
        .navigationBarTitleDisplayMode(.inline)
        .task { await prefill() }
        .alert("Welcome!", isPresented: $showSuccess) {
            Button("Continue") { dismiss() }
        } message: {
            if let points = loyaltyPoints, points > 0 {
                Text("Profile completed! You've earned \(points) loyalty points. 🎉")
            } else {
                Text("Your profile is now complete! You can access all features.")
            }
        }
    }

    private var canSave: Bool {
        !fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        isOver18
    }

    private func prefill() async {
        guard let userId = session.userId else { return }
        if let profile = try? await service?.fetchProfileFull(userId: userId) {
            if let name = profile["full_name"] as? String, !name.isEmpty { fullName = name }
            if let ph = profile["phone"] as? String, !ph.isEmpty { phone = ph }
        }
    }

    private func save() async {
        guard let userId = session.userId else { return }
        saving = true
        errorMessage = nil
        do {
            try await service?.completeProfile(userId: userId, fullName: fullName, phone: phone, isOver18: isOver18)
            if let profile = try? await service?.fetchProfileFull(userId: userId) {
                loyaltyPoints = profile["loyalty_points"] as? Int
            }
            showSuccess = true
        } catch {
            errorMessage = error.localizedDescription
        }
        saving = false
    }
}

// MARK: - Token-Based Review Screen

struct TokenReviewView: View {
    let token: String
    @State private var accommodationRating = 0
    @State private var serviceRating = 0
    @State private var comment = ""
    @State private var submitting = false
    @State private var submitted = false
    @State private var errorMessage: String?

    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "star.bubble")
                        .font(.system(size: 50))
                        .foregroundColor(AppTheme.coral)
                    Text("How was your stay?")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Your feedback helps us improve")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding(.top, 20)

                if submitted {
                    submittedView
                } else {
                    reviewForm
                }
            }
            .padding(20)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Review")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private var reviewForm: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Accommodation rating
            VStack(alignment: .leading, spacing: 8) {
                Text("Accommodation")
                    .font(.headline)
                TokenStarSelector(rating: $accommodationRating)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.cardBackground)
            .cornerRadius(AppTheme.cornerRadiusMedium)

            // Service rating
            VStack(alignment: .leading, spacing: 8) {
                Text("Service")
                    .font(.headline)
                TokenStarSelector(rating: $serviceRating)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.cardBackground)
            .cornerRadius(AppTheme.cornerRadiusMedium)

            // Comment
            VStack(alignment: .leading, spacing: 8) {
                Text("Your Review")
                    .font(.headline)
                TextEditor(text: $comment)
                    .frame(minHeight: 100)
                    .padding(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            }

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }

            Button {
                Task { await submitReview() }
            } label: {
                HStack {
                    Spacer()
                    if submitting {
                        ProgressView().tint(.white)
                    } else {
                        Text("Submit Review")
                            .fontWeight(.semibold)
                    }
                    Spacer()
                }
                .foregroundColor(.white)
                .padding(.vertical, 14)
                .background(accommodationRating > 0 && serviceRating > 0 ? AppTheme.coral : Color.gray)
                .cornerRadius(AppTheme.cornerRadiusMedium)
            }
            .disabled(accommodationRating == 0 || serviceRating == 0 || submitting)
        }
    }

    @ViewBuilder
    private var submittedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            Text("Thank you!")
                .font(.title2)
                .fontWeight(.bold)
            Text("Your review has been submitted successfully.")
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }

    private func submitReview() async {
        submitting = true
        errorMessage = nil
        do {
            try await service?.submitTokenReview(
                token: token,
                accommodationRating: accommodationRating,
                serviceRating: serviceRating,
                comment: comment
            )
            submitted = true
        } catch {
            errorMessage = error.localizedDescription
        }
        submitting = false
    }
}

private struct TokenStarSelector: View {
    @Binding var rating: Int
    private let labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"]

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 12) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            rating = star
                        }
                    } label: {
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.title)
                            .foregroundColor(star <= rating ? .yellow : .gray.opacity(0.3))
                            .scaleEffect(star == rating ? 1.15 : 1.0)
                    }
                }
            }
            if rating > 0, rating < labels.count {
                Text(labels[rating])
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .transition(.opacity)
            }
        }
    }
}

// MARK: - Favorites View (Full)

struct FavoritesListView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var favorites: [Listing] = []
    @State private var loading = false
    @State private var errorMessage: String?

    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                if loading && favorites.isEmpty {
                    MerryLoadingStateView(
                        title: "Loading favorites",
                        subtitle: "Fetching your saved properties...",
                        showCardSkeletons: true
                    )
                } else if let error = errorMessage {
                    Text(error).font(.caption).foregroundColor(.red)
                } else if favorites.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "heart")
                            .font(.system(size: 44))
                            .foregroundColor(AppTheme.textSecondary)
                        Text("No favorites yet")
                            .font(.headline)
                        Text("Save properties you love and they'll appear here")
                            .font(.subheadline)
                            .foregroundColor(AppTheme.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(40)
                    .frame(maxWidth: .infinity)
                } else {
                    ForEach(favorites) { listing in
                        NavigationLink(value: listing) {
                            FavoriteCard(listing: listing) {
                                guard let userId = session.userId else { return }
                                Task {
                                    try? await service?.removeFromWishlist(userId: userId, propertyId: listing.id)
                                    favorites.removeAll { $0.id == listing.id }
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Favorites")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: Listing.self) { listing in
            ListingDetailView(listing: listing)
                .environmentObject(session)
        }
        .task { await loadFavorites() }
        .refreshable { await loadFavorites() }
    }

    private func loadFavorites() async {
        guard let userId = session.userId else { return }
        loading = true
        errorMessage = nil
        do {
            favorites = try await service?.fetchFavoriteListings(userId: userId) ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct FavoriteCard: View {
    let listing: Listing
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            if let imageUrl = listing.mainImage ?? listing.images?.first,
               let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        Rectangle().fill(AppTheme.cardBackground)
                    }
                }
                .frame(width: 100, height: 80)
                .clipped()
                .cornerRadius(AppTheme.cornerRadiusSmall)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(listing.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                Text(listing.location)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .lineLimit(1)
                HStack {
                    Text("\(listing.currency) \(Int(listing.pricePerNight))")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.coral)
                    if let r = listing.rating {
                        Spacer()
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", r))
                                .font(.caption)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Button(action: onRemove) {
                Image(systemName: "heart.fill")
                    .foregroundColor(AppTheme.coral)
            }
        }
        .padding(10)
        .background(AppTheme.cardBackground)
        .cornerRadius(AppTheme.cornerRadiusMedium)
        .modifier(SoftShadow())
    }
}

// MARK: - User Dashboard View

struct UserDashboardView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var fullName = ""
    @State private var nickname = ""
    @State private var phone = ""
    @State private var dateOfBirth = ""
    @State private var bio = ""
    @State private var avatarUrl = ""
    @State private var loyaltyPoints = 0
    @State private var upcomingTrips = 0
    @State private var favoritesCount = 0
    @State private var recentBookings: [[String: Any]] = []
    @State private var loading = false
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var showSaved = false
    @State private var showEditSheet = false

    private let service = SupabaseService()

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Hero header
                udHeroHeader

                // Stats grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    UDStatCard(value: "\(upcomingTrips)", label: "Upcoming Trips",
                               icon: "airplane.departure", color: .blue)
                    UDStatCard(value: "\(favoritesCount)", label: "Favorites",
                               icon: "heart.fill", color: AppTheme.coral)
                    UDStatCard(value: "\(loyaltyPoints)", label: "Loyalty Points",
                               icon: "star.fill", color: .orange)
                    UDStatCard(value: phone.isEmpty ? "—" : "✓", label: "Phone Linked",
                               icon: "phone.fill", color: .green)
                }
                .padding(.horizontal, 16)
                .padding(.top, 20)

                // Quick access links
                udQuickAccess
                    .padding(.top, 20)

                // Recent bookings
                if !recentBookings.isEmpty {
                    udRecentBookings
                        .padding(.top, 20)
                }

                // Sign out
                Button {
                    Task { await session.signOut() }
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.forward")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.red.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.top, 24)
                .padding(.bottom, 48)
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Dashboard")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await loadProfile() }
        .sheet(isPresented: $showEditSheet) {
            UDEditProfileSheet(
                fullName: $fullName,
                nickname: $nickname,
                phone: $phone,
                dateOfBirth: $dateOfBirth,
                bio: $bio,
                saving: $saving,
                errorMessage: $errorMessage,
                onSave: { userId in await saveProfile(userId: userId) }
            )
            .environmentObject(session)
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .task { await loadProfile() }
        .alert("Saved", isPresented: $showSaved) {
            Button("OK") {}
        } message: {
            Text("Your profile has been updated.")
        }
    }

    // MARK: - Hero Header

    private var udHeroHeader: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: [AppTheme.coral, Color(red: 190/255, green: 55/255, blue: 60/255)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 190)

            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .center, spacing: 14) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(.white.opacity(0.25))
                            .frame(width: 72, height: 72)
                        if !avatarUrl.isEmpty, let url = URL(string: avatarUrl) {
                            AsyncImage(url: url) { img in img.resizable().scaledToFill() }
                            placeholder: { udAvatarInitials }
                                .frame(width: 68, height: 68)
                                .clipShape(Circle())
                        } else {
                            udAvatarInitials
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Welcome back")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.75))
                        Text(fullName.isEmpty ? (nickname.isEmpty ? "Traveler" : "@\(nickname)") : fullName)
                            .font(.title3.weight(.bold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        if !nickname.isEmpty && !fullName.isEmpty {
                            Text("@\(nickname)")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }

                    Spacer()

                    // Loyalty points badge
                    VStack(spacing: 3) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 13))
                        Text("\(loyaltyPoints)")
                            .font(.system(size: 17, weight: .bold))
                        Text("pts")
                            .font(.caption2)
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 13)
                    .padding(.vertical, 10)
                    .background(.white.opacity(0.2))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .padding(.horizontal, 20)

                // Edit profile button
                Button { showEditSheet = true } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "pencil")
                            .font(.caption.weight(.semibold))
                        Text("Edit Profile")
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(.white.opacity(0.2))
                    .clipShape(Capsule())
                }
                .padding(.top, 14)
                .padding(.horizontal, 20)
                .padding(.bottom, 22)
            }
        }
    }

    private var udAvatarInitials: some View {
        Text(String((fullName.isEmpty ? nickname : fullName).prefix(1)).uppercased())
            .font(.system(size: 26, weight: .bold))
            .foregroundColor(.white)
    }

    // MARK: - Quick Access

    private var udQuickAccess: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Quick Access")
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
                .textCase(.uppercase)
                .tracking(0.5)
                .padding(.horizontal, 20)
                .padding(.bottom, 8)

            VStack(spacing: 0) {
                NavigationLink(destination: MyBookingsView().environmentObject(session)) {
                    udLinkRow(icon: "suitcase.fill", color: .blue,
                              title: "My Bookings", sub: "\(upcomingTrips) upcoming")
                }.buttonStyle(.plain)

                Divider().padding(.leading, 58)

                NavigationLink(destination: FavoritesListView().environmentObject(session)) {
                    udLinkRow(icon: "heart.fill", color: AppTheme.coral,
                              title: "Favorites", sub: "\(favoritesCount) saved")
                }.buttonStyle(.plain)

                Divider().padding(.leading, 58)

                udLinkRow(icon: "cart.fill", color: .orange,
                          title: "Trip Cart", sub: "Review and manage your cart")
            }
            .background(AppTheme.cardBackground)
        }
    }

    private func udLinkRow(icon: String, color: Color, title: String, sub: String) -> some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(color.opacity(0.12))
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(color)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(AppTheme.textPrimary)
                Text(sub)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(AppTheme.textSecondary)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 13)
        .contentShape(Rectangle())
    }

    // MARK: - Recent Bookings

    private var udRecentBookings: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Recent Bookings")
                .font(.caption.weight(.semibold))
                .foregroundColor(AppTheme.textSecondary)
                .textCase(.uppercase)
                .tracking(0.5)
                .padding(.horizontal, 20)
                .padding(.bottom, 10)

            VStack(spacing: 10) {
                ForEach(Array(recentBookings.prefix(3).enumerated()), id: \.offset) { _, b in
                    udBookingCard(b)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func udBookingCard(_ booking: [String: Any]) -> some View {
        let bType = ((booking["booking_type"] as? String) ?? "stay").lowercased()
        let status = ((booking["status"] as? String) ?? "pending").lowercased()
        let title = (booking["listing_title"] as? String) ?? "Booking"
        let dateStr = (booking["check_in"] as? String) ?? (booking["start_date"] as? String) ?? ""
        let amount = (booking["total_amount"] as? Double) ?? 0
        let currency = (booking["currency"] as? String) ?? "RWF"
        let icon: String = bType == "tour" ? "figure.walk" : (bType == "transport" ? "car.fill" : "house.fill")
        let color: Color = bType == "tour" ? .green : (bType == "transport" ? .blue : AppTheme.coral)
        let statusColor: Color = {
            switch status {
            case "confirmed", "completed", "approved": return .green
            case "pending": return .orange
            default: return .gray
            }
        }()

        return HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(color.opacity(0.12))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(color)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AppTheme.textPrimary)
                    .lineLimit(1)
                Text(udPrettyDate(dateStr))
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(status.capitalized)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(statusColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusColor.opacity(0.12))
                    .clipShape(Capsule())
                Text("\(currency) \(Int(amount))")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(AppTheme.textPrimary)
            }
        }
        .padding(12)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func udPrettyDate(_ s: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let d = f.date(from: s) ?? ISO8601DateFormatter().date(from: s)
        guard let d else { return s.isEmpty ? "—" : String(s.prefix(10)) }
        let o = DateFormatter()
        o.dateFormat = "d MMM yyyy"
        return o.string(from: d)
    }

    // MARK: - Data

    private func loadProfile() async {
        guard let userId = session.userId, let svc = service else { return }
        loading = true
        async let profileTask = svc.fetchProfileFull(userId: userId)
        async let favTask = svc.countFavorites(userId: userId)
        async let upcomingTask = svc.countUpcomingBookings(userId: userId)
        async let bookingsTask = svc.fetchUserBookingsDetailed(userId: userId)

        if let profile = try? await profileTask {
            fullName    = (profile["full_name"]    as? String) ?? ""
            nickname    = (profile["nickname"]     as? String) ?? ""
            phone       = (profile["phone"]        as? String) ?? ""
            dateOfBirth = (profile["date_of_birth"] as? String) ?? ""
            bio         = (profile["bio"]          as? String) ?? ""
            avatarUrl   = (profile["avatar_url"]   as? String) ?? ""
            loyaltyPoints = (profile["loyalty_points"] as? Int) ?? 0
        }
        favoritesCount = (try? await favTask)     ?? 0
        upcomingTrips  = (try? await upcomingTask) ?? 0
        recentBookings = (try? await bookingsTask) ?? []
        loading = false
    }

    private func saveProfile(userId: String) async {
        saving = true
        errorMessage = nil
        do {
            try await service?.updateProfile(
                userId: userId,
                fullName: fullName.isEmpty ? nil : fullName,
                nickname: nickname.isEmpty ? nil : nickname,
                phone: phone.isEmpty ? nil : phone,
                dateOfBirth: dateOfBirth.isEmpty ? nil : dateOfBirth,
                bio: bio.isEmpty ? nil : bio
            )
            showSaved = true
        } catch {
            errorMessage = error.localizedDescription
        }
        saving = false
    }
}

// MARK: - UDStatCard

private struct UDStatCard: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(color.opacity(0.12))
                        .frame(width: 36, height: 36)
                    Image(systemName: icon)
                        .font(.system(size: 16))
                        .foregroundColor(color)
                }
                Spacer()
            }
            Text(value)
                .font(.title2.weight(.bold))
                .foregroundColor(AppTheme.textPrimary)
            Text(label)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
                .lineLimit(1)
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

// MARK: - UDEditProfileSheet

private struct UDEditProfileSheet: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Binding var fullName: String
    @Binding var nickname: String
    @Binding var phone: String
    @Binding var dateOfBirth: String
    @Binding var bio: String
    @Binding var saving: Bool
    @Binding var errorMessage: String?
    let onSave: (String) async -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    LabeledContent("Full Name") {
                        TextField("Your name", text: $fullName)
                            .multilineTextAlignment(.trailing)
                            .textContentType(.name)
                    }
                    LabeledContent("Nickname") {
                        TextField("@handle", text: $nickname)
                            .multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Phone") {
                        TextField("+250 7XX XXX XXX", text: $phone)
                            .multilineTextAlignment(.trailing)
                            .keyboardType(.phonePad)
                            .textContentType(.telephoneNumber)
                    }
                }
                Section("Personal") {
                    LabeledContent("Date of Birth") {
                        TextField("YYYY-MM-DD", text: $dateOfBirth)
                            .multilineTextAlignment(.trailing)
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Bio")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                        TextEditor(text: $bio)
                            .frame(minHeight: 80)
                    }
                }
                if let err = errorMessage {
                    Section {
                        Text(err).font(.caption).foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        guard let userId = session.userId else { return }
                        Task {
                            await onSave(userId)
                            dismiss()
                        }
                    } label: {
                        if saving {
                            ProgressView().scaleEffect(0.8)
                        } else {
                            Text("Save").fontWeight(.semibold)
                        }
                    }
                    .disabled(saving)
                }
            }
        }
    }
}
