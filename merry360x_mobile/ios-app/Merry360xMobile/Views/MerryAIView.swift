import SwiftUI

struct MerryAIView: View {
    @State private var inputText = ""
    
    private let suggestions = [
        "Cheapest stay in Kigali",
        "Cheapest villa in Rwanda",
        "Cheapest transport from Kigali Airport",
        "Cheapest 2-day tour package"
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: 12) {
                // AI Icon
                ZStack {
                    Circle()
                        .fill(AppTheme.coral.opacity(0.1))
                        .frame(width: 36, height: 36)
                    Text("✨")
                        .font(.system(size: 16))
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Merry AI")
                        .font(.system(size: 18, weight: .bold))
                    Text("Travel assistant for stays, tours and transport")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                Button(action: { /* Reset conversation */ }) {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.gray)
                        .font(.system(size: 18))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            
            // Scrollable content
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Try asking:")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.gray)
                    
                    // Suggestion chips
                    FlowLayout(spacing: 8) {
                        ForEach(suggestions, id: \.self) { suggestion in
                            SuggestionChip(text: suggestion)
                        }
                    }
                    
                    // AI Welcome Message
                    VStack(alignment: .leading, spacing: 12) {
                        Text("👋 Hi! I'm Merry AI, your personal travel assistant.")
                            .font(.system(size: 15, weight: .medium))
                        
                        Text("I can help you:")
                            .font(.system(size: 14, weight: .medium))
                        
                        VStack(alignment: .leading, spacing: 4) {
                            BulletPoint(text: "Find stays, tours & transport")
                            BulletPoint(text: "Plan your itinerary")
                            BulletPoint(text: "Compare prices")
                        }
                        
                        Text("What would you like to explore?")
                            .font(.system(size: 14, weight: .medium))
                            .padding(.top, 4)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .frame(maxWidth: UIScreen.main.bounds.width * 0.85, alignment: .leading)
                    .padding(.top, 12)
                }
                .padding(.horizontal, 20)
            }
            
            // Input field
            HStack(spacing: 12) {
                TextField("Ask about places, tours, packages...", text: $inputText)
                    .padding(12)
                    .background(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                
                Button(action: {
                    // Send message
                    inputText = ""
                }) {
                    ZStack {
                        Circle()
                            .fill(inputText.isEmpty ? Color.gray.opacity(0.3) : AppTheme.coral)
                            .frame(width: 44, height: 44)
                        
                        Image(systemName: "arrow.up")
                            .foregroundColor(.white)
                            .font(.system(size: 18, weight: .semibold))
                    }
                }
                .disabled(inputText.isEmpty)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(Color.white)
    }
}

struct SuggestionChip: View {
    let text: String
    
    var body: some View {
        Button(action: { /* Handle tap */ }) {
            Text(text)
                .font(.system(size: 13))
                .foregroundColor(.secondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

struct BulletPoint: View {
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 4) {
            Text("•")
            Text(text)
        }
        .font(.system(size: 14))
    }
}

// Simple flow layout for suggestion chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, 
                                       y: bounds.minY + result.positions[index].y),
                         proposal: .unspecified)
        }
    }
    
    struct FlowResult {
        var positions: [CGPoint] = []
        var size: CGSize = .zero
        
        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0
            
            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                
                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }
                
                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
                
                self.size.width = max(self.size.width, x)
            }
            
            self.size.height = y + rowHeight
        }
    }
}

#Preview {
    MerryAIView()
}
