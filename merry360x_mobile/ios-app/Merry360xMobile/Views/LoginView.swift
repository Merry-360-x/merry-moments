import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = AuthViewModel()
    @State private var selectedTab = 0 // 0 = Email, 1 = Phone
    @State private var phoneNumber = ""
    @State private var showPassword = false
    
    private let tabs = ["Email", "Phone"]

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Logo/Header
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.coral)
                            .frame(width: 80, height: 80)
                        
                        Text("M")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    Text("Welcome to Merry360x")
                        .font(.system(size: 24, weight: .bold))
                    
                    Text("Sign in to continue")
                        .font(.system(size: 15))
                        .foregroundColor(.gray)
                }
                .padding(.top, 40)
                
                // Tab Selector
                HStack(spacing: 0) {
                    ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                        Button(action: { 
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedTab = index
                            }
                        }) {
                            VStack(spacing: 8) {
                                Text(tab)
                                    .font(.system(size: 15, weight: selectedTab == index ? .semibold : .regular))
                                    .foregroundColor(selectedTab == index ? AppTheme.coral : .gray)
                                
                                Rectangle()
                                    .fill(selectedTab == index ? AppTheme.coral : Color.clear)
                                    .frame(height: 2)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 20)
                
                // Input Fields
                VStack(spacing: 16) {
                    if selectedTab == 0 {
                        // Email Field
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.gray)
                            
                            TextField("Enter your email", text: $viewModel.email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(AppTheme.cardBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    } else {
                        // Phone Field
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Phone Number")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.gray)
                            
                            HStack(spacing: 8) {
                                HStack {
                                    Text("🇷🇼")
                                    Text("+250")
                                        .foregroundColor(.black)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 14)
                                .background(AppTheme.cardBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                
                                TextField("Phone number", text: $phoneNumber)
                                    .textContentType(.telephoneNumber)
                                    .keyboardType(.phonePad)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 14)
                                    .background(AppTheme.cardBackground)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                    }
                    
                    // Password Field
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.gray)
                        
                        HStack {
                            if showPassword {
                                TextField("Enter your password", text: $viewModel.password)
                                    .textContentType(.password)
                            } else {
                                SecureField("Enter your password", text: $viewModel.password)
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
                    }
                    
                    // Forgot Password
                    HStack {
                        Spacer()
                        Button("Forgot Password?") {
                            // Navigate to forgot password
                        }
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.coral)
                    }
                }
                .padding(.horizontal, 20)
                
                // Error Message if any
                if let error = viewModel.errorMessage, !error.isEmpty {
                    Text(error)
                        .font(.system(size: 14))
                        .foregroundColor(.red)
                        .padding(.horizontal, 20)
                }
                
                // Sign In Button
                Button(action: {
                    if selectedTab == 1 {
                        viewModel.email = "+250\(phoneNumber)"
                    }
                    Task { await viewModel.signIn(session: session) }
                }) {
                    HStack {
                        if viewModel.loading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Sign In")
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
                .padding(.horizontal, 20)
                
                // Divider
                HStack {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 1)
                    
                    Text("or continue with")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                    
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 1)
                }
                .padding(.horizontal, 20)
                
                // Social Auth Buttons
                VStack(spacing: 12) {
                    // Apple Sign In
                    Button(action: { /* Apple sign in */ }) {
                        HStack(spacing: 12) {
                            Image(systemName: "apple.logo")
                                .font(.system(size: 20))
                            Text("Sign in with Apple")
                                .font(.system(size: 15, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.black)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    
                    // Google Sign In
                    Button(action: { /* Google sign in */ }) {
                        HStack(spacing: 12) {
                            Text("G")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.red)
                            Text("Sign in with Google")
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
                .padding(.horizontal, 20)
                
                // Sign Up Link
                HStack {
                    Text("Don't have an account?")
                        .foregroundColor(.gray)
                    
                    Button("Sign Up") {
                        // Navigate to sign up
                    }
                    .foregroundColor(AppTheme.coral)
                    .fontWeight(.semibold)
                }
                .font(.system(size: 14))
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
        }
        .background(Color.white)
    }
}

#Preview {
    LoginView()
        .environmentObject(AppSessionViewModel())
}
