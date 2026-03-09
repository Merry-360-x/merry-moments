import Foundation

@MainActor
final class AppSessionViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var userId: String?
    @Published var roles: [String] = []
    @Published var authErrorMessage: String?
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
        self.authErrorMessage = nil
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

        if let callbackError = oauthErrorMessage(from: url) {
            authErrorMessage = callbackError
            return
        }

        guard url.absoluteString.lowercased().contains("access_token") else {
            authErrorMessage = "OAuth callback missing access token. Please retry sign in."
            return
        }

        do {
            let authSession = try await service.signInFromOAuthCallback(url)
            let fetchedRoles = try await service.fetchUserRoles(userId: authSession.userId)
            markAuthenticated(userId: authSession.userId, roles: fetchedRoles)
        } catch {
            authErrorMessage = error.localizedDescription
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
        authErrorMessage = nil
        selectedListingId = nil
        selectedListingTitle = nil
    }

    private func oauthErrorMessage(from url: URL) -> String? {
        let absolute = url.absoluteString

        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let queryError = components.queryItems?.first(where: { $0.name == "error_description" || $0.name == "error" })?.value,
           !queryError.isEmpty {
            return queryError.removingPercentEncoding ?? queryError
        }

        guard let hashIndex = absolute.firstIndex(of: "#") else { return nil }
        let fragment = String(absolute[absolute.index(after: hashIndex)...])
        guard !fragment.isEmpty else { return nil }

        for pair in fragment.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1)
            guard parts.count == 2 else { continue }
            if parts[0] == "error_description" || parts[0] == "error" {
                let raw = String(parts[1])
                return raw.removingPercentEncoding ?? raw
            }
        }
        return nil
    }
}
