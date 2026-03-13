import SwiftUI

struct MerryLoadingAnimation: View {
    @State private var activeIndex = 0
    @State private var scales: [CGFloat] = [1, 1, 1, 1]
    @State private var opacities: [Double] = [0.3, 0.3, 0.3, 0.3]
    
    private let icons = ["house.fill", "building.2.fill", "car.fill", "airplane"]
    private let iconColors: [Color] = [
        Color(red: 1, green: 0.34, blue: 0.25),   // Coral - House
        Color(red: 0.4, green: 0.6, blue: 1),     // Blue - Apartment
        Color(red: 0.3, green: 0.8, blue: 0.5),   // Green - Car
        Color(red: 1, green: 0.6, blue: 0.2)      // Orange - Airplane
    ]
    
    let timer = Timer.publish(every: 0.4, on: .main, in: .common).autoconnect()
    
    var body: some View {
        VStack(spacing: 24) {
            HStack(spacing: 20) {
                ForEach(0..<4, id: \.self) { index in
                    ZStack {
                        // Glow effect
                        Circle()
                            .fill(iconColors[index].opacity(0.3))
                            .frame(width: 50, height: 50)
                            .blur(radius: 10)
                            .scaleEffect(scales[index])
                            .opacity(opacities[index])
                        
                        // Icon
                        Image(systemName: icons[index])
                            .font(.system(size: 28, weight: .medium))
                            .foregroundColor(iconColors[index])
                            .scaleEffect(scales[index])
                            .opacity(opacities[index] + 0.4)
                    }
                    .frame(width: 50, height: 50)
                }
            }
            
            Text("Loading...")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.gray)
        }
        .onReceive(timer) { _ in
            withAnimation(.easeInOut(duration: 0.3)) {
                // Reset previous
                let prevIndex = (activeIndex - 1 + 4) % 4
                scales[prevIndex] = 1
                opacities[prevIndex] = 0.3
                
                // Animate current
                scales[activeIndex] = 1.3
                opacities[activeIndex] = 1.0
                
                // Move to next
                activeIndex = (activeIndex + 1) % 4
            }
        }
    }
}

// Full screen loading overlay
struct MerryLoadingOverlay: View {
    let message: String
    
    init(message: String = "Loading...") {
        self.message = message
    }
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                MerryLoadingAnimation()
                
                Text(message)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(.ultraThinMaterial)
            )
        }
    }
}

// Compact inline loading
struct MerryLoadingCompact: View {
    @State private var rotation: Double = 0
    
    private let icons = ["house.fill", "building.2.fill", "car.fill", "airplane"]
    private let iconColors: [Color] = [
        Color(red: 1, green: 0.34, blue: 0.25),
        Color(red: 0.4, green: 0.6, blue: 1),
        Color(red: 0.3, green: 0.8, blue: 0.5),
        Color(red: 1, green: 0.6, blue: 0.2)
    ]
    
    var body: some View {
        ZStack {
            ForEach(0..<4, id: \.self) { index in
                Image(systemName: icons[index])
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(iconColors[index])
                    .offset(x: 18 * cos(Double(index) * .pi / 2 + rotation),
                            y: 18 * sin(Double(index) * .pi / 2 + rotation))
            }
        }
        .frame(width: 60, height: 60)
        .onAppear {
            withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
                rotation = .pi * 2
            }
        }
    }
}

// Bouncing dots style with travel icons
struct MerryLoadingBounce: View {
    @State private var bounceOffsets: [CGFloat] = [0, 0, 0, 0]
    
    private let icons = ["house.fill", "building.2.fill", "car.fill", "airplane"]
    private let iconColors: [Color] = [
        Color(red: 1, green: 0.34, blue: 0.25),
        Color(red: 0.4, green: 0.6, blue: 1),
        Color(red: 0.3, green: 0.8, blue: 0.5),
        Color(red: 1, green: 0.6, blue: 0.2)
    ]
    
    var body: some View {
        HStack(spacing: 12) {
            ForEach(0..<4, id: \.self) { index in
                Image(systemName: icons[index])
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(iconColors[index])
                    .offset(y: bounceOffsets[index])
            }
        }
        .onAppear {
            for i in 0..<4 {
                withAnimation(
                    .easeInOut(duration: 0.5)
                    .repeatForever()
                    .delay(Double(i) * 0.15)
                ) {
                    bounceOffsets[i] = -15
                }
            }
        }
    }
}

#Preview("Standard") {
    MerryLoadingAnimation()
}

#Preview("Overlay") {
    ZStack {
        Color.gray.opacity(0.3)
        Text("Content behind")
    }
    .overlay(MerryLoadingOverlay(message: "Finding your stay..."))
}

#Preview("Compact") {
    MerryLoadingCompact()
}

#Preview("Bounce") {
    MerryLoadingBounce()
}
