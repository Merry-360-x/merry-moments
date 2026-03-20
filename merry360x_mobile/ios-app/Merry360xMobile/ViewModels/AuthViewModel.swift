import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var loading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?

    private let service = SupabaseService()

    func signIn(session: AppSessionViewModel) async {
        guard let service else {
            errorMessage = "MobileConfig is not set. Add Supabase URL + anon key first."
            return
        }

        loading = true
        errorMessage = nil
        successMessage = nil

        do {
            let authSession = try await service.signIn(email: email, password: password)
            let roles = try await service.fetchUserRoles(userId: authSession.userId)
            session.markAuthenticated(userId: authSession.userId, roles: roles)
        } catch {
            errorMessage = error.localizedDescription
        }

        loading = false
    }

    func signUp(session: AppSessionViewModel) async {
        guard let service else {
            errorMessage = "MobileConfig is not set. Add Supabase URL + anon key first."
            return
        }

        loading = true
        errorMessage = nil
        successMessage = nil

        do {
            let authSession = try await service.signUp(email: email, password: password)
            let roles = try await service.fetchUserRoles(userId: authSession.userId)
            session.markAuthenticated(userId: authSession.userId, roles: roles)
        } catch {
            errorMessage = error.localizedDescription
        }

        loading = false
    }

    func sendPasswordReset() async {
        guard let service else {
            errorMessage = "MobileConfig is not set. Add Supabase URL + anon key first."
            return
        }

        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedEmail.isEmpty else {
            successMessage = nil
            errorMessage = "Enter your email first, then tap Forgot Password again."
            return
        }

        loading = true
        errorMessage = nil
        successMessage = nil

        do {
            try await service.requestPasswordReset(email: normalizedEmail)
            successMessage = "Reset link sent. Check your email to continue."
        } catch {
            errorMessage = error.localizedDescription
        }

        loading = false
    }
}
