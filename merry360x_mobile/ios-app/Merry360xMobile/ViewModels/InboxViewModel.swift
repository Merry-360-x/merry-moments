import Foundation

@MainActor
final class InboxViewModel: ObservableObject {
    @Published var notifications: [[String: Any]] = []
    @Published var loading = false
    @Published var errorMessage: String?

    private let service = SupabaseService()

    func load(userId: String) async {
        guard let service else { return }
        loading = true
        errorMessage = nil
        do {
            notifications = try await service.fetchNotifications(userId: userId)
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}
