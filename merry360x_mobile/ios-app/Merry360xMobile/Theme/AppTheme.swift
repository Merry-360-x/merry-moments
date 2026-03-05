import SwiftUI

enum AppTheme {
    static let coral = Color(red: 226/255, green: 85/255, blue: 90/255)
    static let appBackground = Color.white
    static let cardBackground = Color(red: 245/255, green: 245/255, blue: 245/255)
    static let textPrimary = Color(red: 28/255, green: 28/255, blue: 30/255)
    static let textSecondary = Color(red: 96/255, green: 96/255, blue: 102/255)
    static let borderSubtle = Color.black.opacity(0.12)

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
