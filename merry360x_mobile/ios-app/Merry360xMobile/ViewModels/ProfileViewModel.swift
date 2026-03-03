import Foundation

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var wishlist: [[String: Any]] = []
    @Published var loading = false

    private let service = SupabaseService()

    func load(userId: String) async {
        guard let service else { return }
        loading = true
        defer { loading = false }
        do {
            wishlist = try await service.fetchWishlist(userId: userId)
        } catch {
            wishlist = []
        }
    }
}
