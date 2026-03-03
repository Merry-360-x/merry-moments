import Foundation

@MainActor
final class HostToolsViewModel: ObservableObject {
    @Published var properties: [[String: Any]] = []
    @Published var loading = false
    @Published var errorMessage: String?

    private let service = SupabaseService()

    func load(hostId: String) async {
        guard let service else { return }
        loading = true
        errorMessage = nil
        do {
            properties = try await service.fetchHostProperties(hostId: hostId)
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}
