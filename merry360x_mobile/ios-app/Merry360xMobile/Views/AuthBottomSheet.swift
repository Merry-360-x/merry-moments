import SwiftUI

enum AuthMode: String, CaseIterable {
    case login = "Log in"
    case signup = "Sign up"
}

enum AuthInputTab: String, CaseIterable {
    case email = "Email"
    case phone = "Phone"
}

struct AuthBottomSheet: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Environment(\.openURL) private var openURL
    @StateObject private var viewModel = AuthViewModel()
    @Binding var isPresented: Bool
    
    @State private var authMode: AuthMode = .login
    @State private var inputTab: AuthInputTab = .email
    @State private var phone = ""
    @State private var confirmPassword = ""
    @State private var name = ""
    @State private var showPassword = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Drag Handle and Close
            HStack {
                Spacer()
                    .frame(width: 44)
                
                Spacer()
                
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.gray.opacity(0.4))
                    .frame(width: 40, height: 4)
                
                Spacer()
                
                Button(action: { isPresented = false }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.gray)
                        .frame(width: 44, height: 44)
                }
            }
            .padding(.top, 8)
            
            ScrollView {
                VStack(spacing: 20) {
                    // Logo
                    ZStack {
                        Circle()
                            .fill(AppTheme.coral)
                            .frame(width: 64, height: 64)
                        
                        Text("M")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    // Title
                    VStack(spacing: 4) {
                        Text(authMode == .login ? "Welcome back" : "Create account")
                            .font(.system(size: 24, weight: .bold))
                        
                        Text(authMode == .login ? "Sign in to continue" : "Join Merry360x today")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    
                    // Login / Signup Toggle
                    HStack(spacing: 4) {
                        ForEach(AuthMode.allCases, id: \.self) { mode in
                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    authMode = mode
                                }
                            }) {
                                Text(mode.rawValue)
                                    .font(.system(size: 14, weight: authMode == mode ? .semibold : .regular))
                                    .foregroundColor(authMode == mode ? .black : .gray)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(authMode == mode ? Color.white : Color.clear)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                        }
                    }
                    .padding(4)
                    .background(AppTheme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    
                    // Email / Phone Tab
                    HStack(spacing: 0) {
                        ForEach(AuthInputTab.allCases, id: \.self) { tab in
                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    inputTab = tab
                                }
                            }) {
                                VStack(spacing: 8) {
                                    HStack(spacing: 6) {
                                        Image(systemName: tab == .email ? "envelope" : "phone")
                                            .font(.system(size: 14))
                                        Text(tab.rawValue)
                                            .font(.system(size: 14, weight: inputTab == tab ? .semibold : .regular))
                                    }
                                    .foregroundColor(inputTab == tab ? AppTheme.coral : .gray)
                                    
                                    Rectangle()
                                        .fill(inputTab == tab ? AppTheme.coral : Color.clear)
                                        .frame(height: 2)
                                }
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    
                    // Form Fields
                    VStack(spacing: 12) {
                        // Name (signup only)
                        if authMode == .signup {
                            AuthTextField(
                                label: "Full Name",
                                placeholder: "Enter your name",
                                text: $name
                            )
                        }
                        
                        // Email or Phone
                        if inputTab == .email {
                            AuthTextField(
                                label: "Email",
                                placeholder: "Enter your email",
                                text: $viewModel.email,
                                keyboardType: .emailAddress,
                                autocapitalization: .never
                            )
                        } else {
                            HStack(spacing: 8) {
                                // Country code
                                HStack {
                                    Text("🇷🇼")
                                    Text("+250")
                                        .foregroundColor(AppTheme.textPrimary)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 14)
                                .background(AppTheme.cardBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                                
                                AuthTextField(
                                    label: "",
                                    placeholder: "Phone number",
                                    text: $phone,
                                    keyboardType: .phonePad
                                )
                            }
                        }
                        
                        // Password
                        AuthSecureField(
                            label: "Password",
                            placeholder: "Enter your password",
                            text: $viewModel.password,
                            showPassword: $showPassword
                        )
                        
                        // Confirm Password (signup only)
                        if authMode == .signup {
                            AuthSecureField(
                                label: "Confirm Password",
                                placeholder: "Confirm your password",
                                text: $confirmPassword,
                                showPassword: .constant(false)
                            )
                        }
                        
                        // Forgot Password (login only)
                        if authMode == .login {
                            HStack {
                                Spacer()
                                Button("Forgot Password?") {
                                    // Handle forgot password
                                }
                                .font(.system(size: 13))
                                .foregroundColor(AppTheme.coral)
                            }
                        }
                    }
                    
                    // Error Message
                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }
                    
                    // Main Action Button
                    Button(action: handleAuth) {
                        HStack {
                            if viewModel.loading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text(authMode == .login ? "Sign In" : "Create Account")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppTheme.coral)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(viewModel.loading)
                    
                    // Divider
                    HStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                        
                        Text("or continue with")
                            .font(.system(size: 13))
                            .foregroundColor(AppTheme.textSecondary)
                        
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                    }
                    
                    // Social Login Buttons
                    HStack(spacing: 12) {
                        // Apple
                        Button(action: { handleOAuth(provider: "apple") }) {
                            HStack(spacing: 8) {
                                Image(systemName: "apple.logo")
                                    .font(.system(size: 18))
                                Text("Apple")
                                    .font(.system(size: 15, weight: .medium))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.black)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Google
                        Button(action: { handleOAuth(provider: "google") }) {
                            HStack(spacing: 8) {
                                Text("G")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.red)
                                Text("Google")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(.black)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    
                    // Terms
                    Text("By continuing, you agree to our Terms of Service and Privacy Policy")
                        .font(.system(size: 11))
                        .foregroundColor(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .background(Color.white)
    }
    
    private func handleAuth() {
        guard !viewModel.loading else { return }
        
        // Set email from phone if using phone tab
        if inputTab == .phone {
            viewModel.email = "+250\(phone)"
        }
        
        guard !viewModel.email.isEmpty, !viewModel.password.isEmpty else {
            viewModel.errorMessage = "Please fill in all fields"
            return
        }
        
        if authMode == .signup {
            guard !name.isEmpty else {
                viewModel.errorMessage = "Please enter your name"
                return
            }
            guard viewModel.password == confirmPassword else {
                viewModel.errorMessage = "Passwords do not match"
                return
            }
        }
        
        Task {
            if authMode == .signup {
                await viewModel.signUp(session: session)
            } else {
                await viewModel.signIn(session: session)
            }
            if session.isAuthenticated {
                isPresented = false
            }
        }
    }

    private func handleOAuth(provider: String) {
        guard let service = SupabaseService(), let url = service.oauthAuthorizeURL(provider: provider) else {
            viewModel.errorMessage = "Unable to start \(provider.capitalized) sign in."
            return
        }
        openURL(url)
    }
}

// MARK: - Text Field Components

struct AuthTextField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !label.isEmpty {
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.gray)
            }
            
            TextField(placeholder, text: $text)
                .keyboardType(keyboardType)
                .textInputAutocapitalization(autocapitalization)
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(AppTheme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                )
        }
    }
}

struct AuthSecureField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    @Binding var showPassword: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.gray)
            
            HStack {
                if showPassword {
                    TextField(placeholder, text: $text)
                        .textContentType(.password)
                } else {
                    SecureField(placeholder, text: $text)
                        .textContentType(.password)
                }
                
                Button(action: { showPassword.toggle() }) {
                    Image(systemName: showPassword ? "eye.slash" : "eye")
                        .foregroundColor(.gray)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
    }
}

#Preview {
    AuthBottomSheet(isPresented: .constant(true))
        .environmentObject(AppSessionViewModel())
}
