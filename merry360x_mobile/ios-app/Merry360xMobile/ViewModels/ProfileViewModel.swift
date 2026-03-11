import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    // Display
    @Published var wishlist: [[String: Any]] = []
    @Published var loading = false
    @Published var displayName: String?
    @Published var avatarURL: String?
    @Published var email: String?

    // Editable personal info
    @Published var editFullName: String = ""
    @Published var editNickname: String = ""
    @Published var editPhone: String = ""
    @Published var editDateOfBirth: String = ""
    @Published var editBio: String = ""

    // Stats
    @Published var loyaltyPoints: Int = 0
    @Published var memberSince: String? = nil
    @Published var upcomingTrips: Int = 0
    @Published var savedCount: Int = 0

    // Save / reset state
    @Published var saving = false
    @Published var saveSuccess = false
    @Published var saveError: String? = nil
    @Published var resettingPassword = false
    @Published var resetSuccess = false
    @Published var resetError: String? = nil

    private let service = SupabaseService()

    func clear() {
        wishlist = []
        loading = false
        displayName = nil
        avatarURL = nil
        email = nil
        editFullName = ""
        editNickname = ""
        editPhone = ""
        editDateOfBirth = ""
        editBio = ""
        loyaltyPoints = 0
        memberSince = nil
        upcomingTrips = 0
        savedCount = 0
    }

    func load(userId: String) async {
        guard let service else { return }
        loading = true
        defer { loading = false }
        do {
            async let wishlistTask = service.fetchWishlist(userId: userId)
            async let profileTask = service.fetchProfileFull(userId: userId)
            async let upcomingTask = service.countUpcomingBookings(userId: userId)
            async let savedTask = service.countFavorites(userId: userId)

            wishlist = (try? await wishlistTask) ?? []
            let profile = try await profileTask
            upcomingTrips = (try? await upcomingTask) ?? 0
            savedCount = (try? await savedTask) ?? 0

            let nickname = (profile?["nickname"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            let fullName = (profile?["full_name"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            displayName = (nickname?.isEmpty == false ? nickname : fullName)

            let avatar = (profile?["avatar_url"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            avatarURL = avatar?.isEmpty == true ? nil : avatar
            email = profile?["email"] as? String

            // Populate editor fields
            editFullName = fullName ?? ""
            editNickname = nickname ?? ""
            editPhone = (profile?["phone"] as? String) ?? ""
            editDateOfBirth = (profile?["date_of_birth"] as? String) ?? ""
            editBio = (profile?["bio"] as? String) ?? ""

            // Stats
            loyaltyPoints = (profile?["loyalty_points"] as? Int) ?? 0
            if let createdAt = profile?["created_at"] as? String {
                memberSince = formatMemberSince(createdAt)
            }
        } catch {
            wishlist = []
            displayName = nil
            avatarURL = nil
            email = nil
        }
    }

    func saveProfile(userId: String) async {
        guard let service else { return }
        saving = true
        saveError = nil
        saveSuccess = false
        defer { saving = false }
        do {
            try await service.updateProfile(
                userId: userId,
                fullName: editFullName.isEmpty ? nil : editFullName,
                nickname: editNickname.isEmpty ? nil : editNickname,
                phone: editPhone.isEmpty ? nil : editPhone,
                dateOfBirth: editDateOfBirth.isEmpty ? nil : editDateOfBirth,
                bio: editBio.isEmpty ? nil : editBio
            )
            // Refresh display name
            let nickname = editNickname.trimmingCharacters(in: .whitespacesAndNewlines)
            let full = editFullName.trimmingCharacters(in: .whitespacesAndNewlines)
            displayName = nickname.isEmpty ? (full.isEmpty ? nil : full) : nickname
            saveSuccess = true
        } catch {
            saveError = error.localizedDescription
        }
    }

    func requestPasswordReset(email: String) async {
        guard let service else { return }
        resettingPassword = true
        resetError = nil
        resetSuccess = false
        defer { resettingPassword = false }
        do {
            try await service.requestPasswordReset(email: email)
            resetSuccess = true
        } catch {
            resetError = error.localizedDescription
        }
    }

    private func formatMemberSince(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate, .withDashSeparatorInDate]
        guard let date = formatter.date(from: String(iso.prefix(10))) else { return iso }
        let cal = Calendar.current
        let now = Date()
        let months = cal.dateComponents([.month], from: date, to: now).month ?? 0
        let years = months / 12
        let remMonths = months % 12
        let monthFmt = DateFormatter()
        monthFmt.dateFormat = "MMM yyyy"
        let label = monthFmt.string(from: date)
        if years > 0 && remMonths > 0 {
            return "\(label) · \(years)y \(remMonths)mo ago"
        } else if years > 0 {
            return "\(label) · \(years) year\(years == 1 ? "" : "s") ago"
        } else if months > 0 {
            return "\(label) · \(months) month\(months == 1 ? "" : "s") ago"
        } else {
            let days = cal.dateComponents([.day], from: date, to: now).day ?? 0
            return "\(label) · \(days) day\(days == 1 ? "" : "s") ago"
        }
    }
}
