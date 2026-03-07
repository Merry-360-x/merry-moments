import Foundation

@MainActor
final class HostToolsViewModel: ObservableObject {
    @Published var properties: [[String: Any]] = []
    @Published var bookings: [[String: Any]] = []
    @Published var payouts: [[String: Any]] = []
    @Published var loading = false
    @Published var errorMessage: String?

    private let service = SupabaseService()

    func load(hostId: String) async {
        guard let service else { return }
        loading = true
        errorMessage = nil
        do {
            async let propertiesTask = service.fetchHostProperties(hostId: hostId)
            async let bookingsTask = service.fetchHostBookings(hostId: hostId)
            async let payoutsTask = service.fetchHostPayouts(hostId: hostId)

            properties = try await propertiesTask
            bookings = try await bookingsTask
            payouts = try await payoutsTask
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}
