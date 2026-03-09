import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var wishlist: [[String: Any]] = []
    @Published var loading = false
    @Published var displayName: String?
    @Published var avatarURL: String?
    @Published var email: String?

    private let service = SupabaseService()

    func clear() {
        wishlist = []
        loading = false
        displayName = nil
        avatarURL = nil
        email = nil
    }

    func load(userId: String) async {
        guard let service else { return }
        loading = true
        defer { loading = false }
        do {
            async let wishlistTask = service.fetchWishlist(userId: userId)
            async let profileTask = service.fetchProfileBasics(userId: userId)

            wishlist = try await wishlistTask
            let profile = try await profileTask

            let nickname = (profile?["nickname"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            let fullName = (profile?["full_name"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            displayName = (nickname?.isEmpty == false ? nickname : fullName)

            let avatar = (profile?["avatar_url"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            avatarURL = avatar?.isEmpty == true ? nil : avatar
            email = profile?["email"] as? String
        } catch {
            wishlist = []
            displayName = nil
            avatarURL = nil
            email = nil
        }
    }
}
