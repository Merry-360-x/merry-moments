import Foundation

@MainActor
final class AppSessionViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var userId: String?
    @Published var roles: [String] = []
    @Published var selectedListingId: String?
    @Published var selectedListingTitle: String?

    private let service = SupabaseService()

    func restoreSession() async {
        guard let service else {
            isAuthenticated = false
            return
        }

        do {
            let restoredUserId = try await service.getSessionUser()
            isAuthenticated = restoredUserId != nil
            userId = restoredUserId
            if let restoredUserId {
                roles = try await service.fetchUserRoles(userId: restoredUserId)
            } else {
                roles = []
            }
        } catch {
            isAuthenticated = false
            userId = nil
            roles = []
        }
    }

    func markAuthenticated(userId: String, roles: [String]) {
        self.userId = userId
        self.roles = roles
        self.isAuthenticated = true
    }

    func refreshRoles() async {
        guard let service, let userId else {
            roles = []
            return
        }

        do {
            roles = try await service.fetchUserRoles(userId: userId)
        } catch {
            roles = []
        }
    }

    func handleOAuthCallback(_ url: URL) async {
        guard let service else { return }
        guard url.absoluteString.lowercased().contains("access_token") else { return }

        do {
            let authSession = try await service.signInFromOAuthCallback(url)
            let fetchedRoles = try await service.fetchUserRoles(userId: authSession.userId)
            markAuthenticated(userId: authSession.userId, roles: fetchedRoles)
        } catch {
            // keep current state if OAuth callback parsing/fetch fails
        }
    }

    func signOut() async {
        guard let service else {
            isAuthenticated = false
            userId = nil
            return
        }

        do {
            try await service.signOut()
        } catch {
            // ignore and clear local state
        }
        isAuthenticated = false
        userId = nil
        roles = []
        selectedListingId = nil
        selectedListingTitle = nil
    }
}
