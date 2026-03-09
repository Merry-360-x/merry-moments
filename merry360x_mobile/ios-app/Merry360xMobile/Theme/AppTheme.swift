import SwiftUI

enum AppThemeMode: String, CaseIterable {
    case system
    case light
    case dark

    var label: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

enum ProfileSettingKind: String, Identifiable {
    case region
    case language
    case currency
    case mode

    var id: String { rawValue }
}

struct ProfileSettingOption: Identifiable, Hashable {
    let key: String
    let title: String
    let subtitle: String?

    var id: String { key }
}

enum AppTheme {
    static let coral = Color(red: 226/255, green: 85/255, blue: 90/255)
    static let appBackground = Color(uiColor: .systemBackground)
    static let cardBackground = Color(uiColor: .secondarySystemBackground)
    static let textPrimary = Color(uiColor: .label)
    static let textSecondary = Color(uiColor: .secondaryLabel)
    static let borderSubtle = Color(uiColor: .separator)
    static let destructive = Color(uiColor: .systemRed)

    static let cornerRadiusLarge: CGFloat = 20
    static let cornerRadiusMedium: CGFloat = 14
}

struct SoftShadow: ViewModifier {
    func body(content: Content) -> some View {
        content.shadow(color: Color.black.opacity(0.08), radius: 14, x: 0, y: 6)
    }
}

extension View {
    func softShadow() -> some View {
        modifier(SoftShadow())
    }
}

struct MerryLoadingStateView: View {
    let title: String
    let subtitle: String
    var showCardSkeletons: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                ProgressView()
                    .controlSize(.small)
                    .tint(AppTheme.coral)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppTheme.textPrimary)
                    Text(subtitle)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppTheme.textSecondary)
                }
            }

            if showCardSkeletons {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(0..<4, id: \.self) { _ in
                            ListingCardSkeletonView()
                        }
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading content")
    }
}

private struct ListingCardSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppTheme.cardBackground)
                .frame(width: 200, height: 140)

            RoundedRectangle(cornerRadius: 5, style: .continuous)
                .fill(AppTheme.cardBackground)
                .frame(width: 150, height: 12)

            RoundedRectangle(cornerRadius: 5, style: .continuous)
                .fill(AppTheme.cardBackground)
                .frame(width: 110, height: 10)

            RoundedRectangle(cornerRadius: 5, style: .continuous)
                .fill(AppTheme.cardBackground)
                .frame(width: 90, height: 12)
        }
        .frame(width: 200, alignment: .leading)
        .modifier(FastPulseSkeleton())
    }
}

private struct FastPulseSkeleton: ViewModifier {
    @State private var pulse = false

    func body(content: Content) -> some View {
        content
            .opacity(pulse ? 0.55 : 1)
            .animation(.easeInOut(duration: 0.75).repeatForever(autoreverses: true), value: pulse)
            .onAppear {
                pulse = true
            }
    }
}
