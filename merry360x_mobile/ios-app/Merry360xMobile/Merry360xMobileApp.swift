import SwiftUI
import UIKit

@main
struct Merry360xMobileApp: App {
    @StateObject private var session = AppSessionViewModel()
    @State private var cartBadge: Int = 0
    @State private var showSplash = true
    @AppStorage("merry_mobile_theme_mode") private var themeModeRaw = AppThemeMode.system.rawValue

    init() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.systemBackground
        appearance.backgroundEffect = nil

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().isTranslucent = false
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                MainTabView(cartBadge: $cartBadge)
                    .environmentObject(session)
                    .tint(AppTheme.coral)

                if showSplash {
                    BrandedSplashView()
                        .transition(.opacity)
                        .zIndex(1)
                }
            }
            .task {
                await session.restoreSession()
                try? await Task.sleep(nanoseconds: 700_000_000)
                withAnimation(.easeOut(duration: 0.18)) {
                    showSplash = false
                }
            }
            .onOpenURL { url in
                Task {
                    await session.handleOAuthCallback(url)
                }
            }
            .preferredColorScheme(currentThemeMode.colorScheme)
        }
    }

    private var currentThemeMode: AppThemeMode {
        AppThemeMode(rawValue: themeModeRaw) ?? .system
    }
}

private struct BrandedSplashView: View {
    @State private var logoScale: CGFloat = 0.8
    @State private var logoOpacity: Double = 0
    @State private var textOpacity: Double = 0
    @State private var showLoading = false
    @State private var activeIconIndex = 0
    
    private let icons = ["house.fill", "building.2.fill", "car.fill", "airplane"]
    private let timer = Timer.publish(every: 0.35, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            // Background gradient - coral to white
            LinearGradient(
                colors: [
                    AppTheme.coral.opacity(0.15),
                    Color.white,
                    Color(red: 248/255, green: 248/255, blue: 250/255)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 24) {
                Spacer()
                
                // Logo with glow
                ZStack {
                    // Glow effect
                    Circle()
                        .fill(AppTheme.coral.opacity(0.2))
                        .frame(width: 160, height: 160)
                        .blur(radius: 30)
                        .scaleEffect(logoScale)
                    
                    Image("SplashLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                        .scaleEffect(logoScale)
                        .opacity(logoOpacity)
                }
                
                // Brand name
                VStack(spacing: 4) {
                    Text("Merry 360x")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(AppTheme.coral)
                    
                    Text("Your travel companion")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                }
                .opacity(textOpacity)
                
                Spacer()
                
                // Loading animation
                if showLoading {
                    HStack(spacing: 12) {
                        ForEach(0..<4, id: \.self) { index in
                            Image(systemName: icons[index])
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(AppTheme.coral)
                                .scaleEffect(activeIconIndex == index ? 1.3 : 1)
                                .opacity(activeIconIndex == index ? 1 : 0.4)
                                .animation(.easeInOut(duration: 0.25), value: activeIconIndex)
                        }
                    }
                    .transition(.opacity)
                }
                
                Spacer()
                    .frame(height: 60)
            }
        }
        .onAppear {
            // Animate in
            withAnimation(.easeOut(duration: 0.5)) {
                logoScale = 1
                logoOpacity = 1
            }
            withAnimation(.easeOut(duration: 0.5).delay(0.2)) {
                textOpacity = 1
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation {
                    showLoading = true
                }
            }
        }
        .onReceive(timer) { _ in
            if showLoading {
                activeIconIndex = (activeIconIndex + 1) % 4
            }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Binding var cartBadge: Int
    @State private var selectedTab = 0

    private var hasDashboardRole: Bool {
        let roles = Set(session.roles.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
        return roles.contains("host")
            || roles.contains("admin")
            || roles.contains("financial_staff")
            || roles.contains("operations_staff")
            || roles.contains("customer_support")
    }
    
    var body: some View {
        ZStack {
            switch selectedTab {
            case 0:
                NavigationStack { HomeView() }
            case 1:
                NavigationStack { WishlistsView() }
            case 2:
                NavigationStack { MerryAIView() }
            case 3:
                NavigationStack { TripCartView() }
            default:
                NavigationStack { ProfileView() }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            AndroidStyleBottomNav(selectedTab: $selectedTab, cartBadge: cartBadge)
        }
        .onChange(of: session.isAuthenticated) { authenticated in
            if authenticated && hasDashboardRole {
                selectedTab = 4
            }
        }
        .onChange(of: session.roles) { _ in
            if session.isAuthenticated && hasDashboardRole {
                selectedTab = 4
            }
        }
    }
}

private struct AndroidStyleBottomNav: View {
    @Binding var selectedTab: Int
    let cartBadge: Int

    var body: some View {
        HStack(spacing: 0) {
            navButton(index: 0, label: "Explore") {
                selected in
                navVectorIcon(.explore, selected: selected)
            }

            navButton(index: 1, label: "Wishlists") {
                selected in
                Image(systemName: "heart")
                    .font(.system(size: 22, weight: .regular))
                    .foregroundStyle(selected ? AppTheme.coral : Color.gray)
            }

            navButton(index: 2, label: "AI") {
                selected in
                navVectorIcon(.ai, selected: selected)
            }

            navButton(index: 3, label: "Trip cart") {
                selected in
                ZStack(alignment: .topTrailing) {
                    navVectorIcon(.tripCart, selected: selected)
                    if cartBadge > 0 {
                        Text("\(cartBadge)")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(AppTheme.coral)
                            .clipShape(Capsule())
                            .offset(x: 10, y: -8)
                    }
                }
            }

            navButton(index: 4, label: "Profile") {
                selected in
                navVectorIcon(.profile, selected: selected)
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 10)
        .background(AppTheme.appBackground)
        .overlay(alignment: .top) {
            Divider()
        }
    }

    @ViewBuilder
    private func navButton(index: Int, label: String, @ViewBuilder icon: (Bool) -> some View) -> some View {
        let selected = selectedTab == index

        Button {
            selectedTab = index
        } label: {
            VStack(spacing: 4) {
                icon(selected)
                    .frame(width: 24, height: 24)
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .lineLimit(1)
            }
            .foregroundColor(selected ? AppTheme.coral : .gray)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func navVectorIcon(_ icon: NavIconType, selected: Bool) -> some View {
        NavVectorIcon(icon: icon, color: selected ? AppTheme.coral : .gray)
    }
}

private enum NavIconType {
    case explore
    case ai
    case tripCart
    case profile
}

private struct NavVectorIcon: View {
    let icon: NavIconType
    let color: Color

    var body: some View {
        ZStack {
            switch icon {
            case .explore:
                SVGPathParser.path(from: "M20.9801 3.02084C20.1101 2.15084 18.8801 1.81084 17.6901 2.11084L7.8901 4.56084C6.2401 4.97084 4.9701 6.25084 4.5601 7.89084L2.1101 17.7008C1.8101 18.8908 2.1501 20.1208 3.0201 20.9908C3.6801 21.6408 4.5501 22.0008 5.4501 22.0008C5.7301 22.0008 6.0201 21.9708 6.3001 21.8908L16.1101 19.4408C17.7501 19.0308 19.0301 17.7608 19.4401 16.1108L21.8901 6.30084C22.1901 5.11084 21.8501 3.88084 20.9801 3.02084ZM12.0001 15.8808C9.8601 15.8808 8.1201 14.1408 8.1201 12.0008C8.1201 9.86084 9.8601 8.12084 12.0001 8.12084C14.1401 8.12084 15.8801 9.86084 15.8801 12.0008C15.8801 14.1408 14.1401 15.8808 12.0001 15.8808Z")
                    .fill(color)
            case .ai:
                SVGPathParser.path(from: "M18.68 12.43C18.39 12.62 18.06 12.74 17.7 12.74C16.87 12.74 16.17 12.21 15.95 11.4L15.61 10.16C15.44 9.56003 14.98 9.10003 14.38 8.93003L13.11 8.59003C12.33 8.37003 11.8 7.67003 11.8 6.85003C11.8 6.03003 12.33 5.32003 13.15 5.09003L14.38 4.77003C14.38 4.77003 14.47 4.73003 14.51 4.71003C12.7 2.26003 8.82 2.44003 7.31 5.25003L2.28 14.71C1.29 16.56 1.82 18.66 3.19 19.9C3.93 20.58 4.92 21 6.05 21H16.13C19.36 21 21.42 17.56 19.9 14.71L18.68 12.43Z")
                    .fill(color)
                SVGPathParser.path(from: "M22.1999 6.8701C22.1999 6.9601 22.1499 7.1701 21.9099 7.2501L20.6399 7.6001C19.5499 7.9001 18.7299 8.7201 18.4299 9.8101L18.0899 11.0501C18.0099 11.3301 17.7899 11.3601 17.6899 11.3601C17.5899 11.3601 17.3699 11.3301 17.2899 11.0501L16.9499 9.8001C16.6499 8.7201 15.8199 7.9001 14.7399 7.6001L13.4899 7.2601C13.2199 7.1801 13.1899 6.9501 13.1899 6.8601C13.1899 6.7601 13.2199 6.5301 13.4899 6.4501L14.7499 6.1201C15.8299 5.8101 16.6499 4.9901 16.9499 3.9101L17.3099 2.6001C17.3999 2.3801 17.5999 2.3501 17.6899 2.3501C17.7799 2.3501 17.9899 2.3801 18.0699 2.5801L18.4299 3.9001C18.7299 4.9801 19.5599 5.8001 20.6399 6.1101L21.9299 6.4601C22.1899 6.5601 22.1999 6.7901 22.1999 6.8701Z")
                    .fill(color)
            case .tripCart:
                SVGPathParser.path(from: "M13 9H7")
                    .stroke(color, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
                SVGPathParser.path(from: "M22.0002 10.9702V13.0302C22.0002 13.5802 21.5602 14.0302 21.0002 14.0502H19.0402C17.9602 14.0502 16.9702 13.2602 16.8802 12.1802C16.8202 11.5502 17.0602 10.9602 17.4802 10.5502C17.8502 10.1702 18.3602 9.9502 18.9202 9.9502H21.0002C21.5602 9.9702 22.0002 10.4202 22.0002 10.9702Z")
                    .stroke(color, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
                SVGPathParser.path(from: "M2 8.5C2 5.78 3.64 3.88 6.19 3.56C6.45 3.52 6.72 3.5 7 3.5H16C16.26 3.5 16.51 3.50999 16.75 3.54999C19.33 3.84999 21 5.76 21 8.5V9.95001H18.92C18.36 9.95001 17.85 10.17 17.48 10.55C17.06 10.96 16.82 11.55 16.88 12.18C16.97 13.26 17.96 14.05 19.04 14.05H21V15.5C21 18.5 19 20.5 16 20.5H7C4 20.5 2 18.5 2 15.5V12.26")
                    .stroke(color, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
            case .profile:
                SVGPathParser.path(from: "M12 2C9.38 2 7.25 4.13 7.25 6.75C7.25 9.32 9.26 11.4 11.88 11.49C11.96 11.48 12.04 11.48 12.1 11.49C12.12 11.49 12.13 11.49 12.15 11.49C12.16 11.49 12.16 11.49 12.17 11.49C14.73 11.4 16.74 9.32 16.75 6.75C16.75 4.13 14.62 2 12 2Z")
                    .fill(color)
                SVGPathParser.path(from: "M17.08 14.1499C14.29 12.2899 9.73996 12.2899 6.92996 14.1499C5.65996 14.9999 4.95996 16.1499 4.95996 17.3799C4.95996 18.6099 5.65996 19.7499 6.91996 20.5899C8.31996 21.5299 10.16 21.9999 12 21.9999C13.84 21.9999 15.68 21.5299 17.08 20.5899C18.34 19.7399 19.04 18.5999 19.04 17.3599C19.03 16.1299 18.34 14.9899 17.08 14.1499Z")
                    .fill(color)
            }
        }
        .frame(width: 24, height: 24)
    }
}

private enum SVGPathParser {
    static func path(from data: String) -> Path {
        let tokens = tokenize(data)
        var index = 0
        var command: Character = " "
        var current = CGPoint.zero
        var subpathStart = CGPoint.zero
        let cgPath = CGMutablePath()

        while index < tokens.count {
            if let char = singleCommand(tokens[index]) {
                command = char
                index += 1
            }

            switch command {
            case "M", "m":
                guard let x = nextNumber(tokens, &index), let y = nextNumber(tokens, &index) else { break }
                let point = CGPoint(x: command == "m" ? current.x + x : x, y: command == "m" ? current.y + y : y)
                cgPath.move(to: point)
                current = point
                subpathStart = point
                while let nx = nextNumber(tokens, &index), let ny = nextNumber(tokens, &index) {
                    let linePoint = CGPoint(x: command == "m" ? current.x + nx : nx, y: command == "m" ? current.y + ny : ny)
                    cgPath.addLine(to: linePoint)
                    current = linePoint
                }
            case "L", "l":
                while let x = nextNumber(tokens, &index), let y = nextNumber(tokens, &index) {
                    let point = CGPoint(x: command == "l" ? current.x + x : x, y: command == "l" ? current.y + y : y)
                    cgPath.addLine(to: point)
                    current = point
                }
            case "H", "h":
                while let x = nextNumber(tokens, &index) {
                    let point = CGPoint(x: command == "h" ? current.x + x : x, y: current.y)
                    cgPath.addLine(to: point)
                    current = point
                }
            case "V", "v":
                while let y = nextNumber(tokens, &index) {
                    let point = CGPoint(x: current.x, y: command == "v" ? current.y + y : y)
                    cgPath.addLine(to: point)
                    current = point
                }
            case "C", "c":
                while let x1 = nextNumber(tokens, &index),
                      let y1 = nextNumber(tokens, &index),
                      let x2 = nextNumber(tokens, &index),
                      let y2 = nextNumber(tokens, &index),
                      let x = nextNumber(tokens, &index),
                      let y = nextNumber(tokens, &index) {
                    let cp1 = CGPoint(x: command == "c" ? current.x + x1 : x1, y: command == "c" ? current.y + y1 : y1)
                    let cp2 = CGPoint(x: command == "c" ? current.x + x2 : x2, y: command == "c" ? current.y + y2 : y2)
                    let end = CGPoint(x: command == "c" ? current.x + x : x, y: command == "c" ? current.y + y : y)
                    cgPath.addCurve(to: end, control1: cp1, control2: cp2)
                    current = end
                }
            case "Z", "z":
                cgPath.closeSubpath()
                current = subpathStart
            default:
                index += 1
            }
        }

        return Path(cgPath)
    }

    private static func tokenize(_ data: String) -> [String] {
        var tokens: [String] = []
        var number = ""

        func flushNumber() {
            if !number.isEmpty {
                tokens.append(number)
                number = ""
            }
        }

        for character in data {
            if character.isLetter {
                flushNumber()
                tokens.append(String(character))
            } else if character == "-" {
                flushNumber()
                number.append(character)
            } else if character.isNumber || character == "." {
                number.append(character)
            } else {
                flushNumber()
            }
        }
        flushNumber()
        return tokens
    }

    private static func singleCommand(_ token: String) -> Character? {
        guard token.count == 1, let char = token.first, "MmLlHhVvCcZz".contains(char) else {
            return nil
        }
        return char
    }

    private static func nextNumber(_ tokens: [String], _ index: inout Int) -> CGFloat? {
        while index < tokens.count, singleCommand(tokens[index]) != nil {
            return nil
        }
        guard index < tokens.count, let value = Double(tokens[index]) else {
            return nil
        }
        index += 1
        return CGFloat(value)
    }
}

#Preview {
    MainTabView(cartBadge: .constant(2))
        .environmentObject(AppSessionViewModel())
}
