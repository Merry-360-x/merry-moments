import SwiftUI

enum TripTab: String, CaseIterable {
    case cart = "Cart"
    case upcoming = "Upcoming"
    case completed = "Completed"
    case cancelled = "Cancelled"
}

struct TripCartView: View {
    @State private var selectedTab: TripTab = .cart
    @State private var isLoading = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Tab Row
            HStack(spacing: 24) {
                ForEach(TripTab.allCases, id: \.self) { tab in
                    TripTabButton(
                        title: tab.rawValue,
                        isSelected: selectedTab == tab
                    ) {
                        selectedTab = tab
                    }
                }
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            
            Spacer()
            
            // Content
            if isLoading {
                VStack(spacing: 12) {
                    ProgressView()
                        .tint(AppTheme.coral)
                    Text("Loading trips...")
                        .font(.system(size: 15))
                        .foregroundColor(.gray)
                }
            } else {
                TripEmptyState(tab: selectedTab)
            }
            
            Spacer()
        }
        .background(Color.white)
    }
}

struct TripTabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 15, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? AppTheme.coral : .gray)
                
                Rectangle()
                    .fill(isSelected ? AppTheme.coral : Color.clear)
                    .frame(height: 2)
            }
        }
        .buttonStyle(.plain)
    }
}

struct TripEmptyState: View {
    let tab: TripTab
    
    var title: String {
        switch tab {
        case .cart: return "Your cart is empty"
        case .upcoming: return "No upcoming trips"
        case .completed: return "No completed trips"
        case .cancelled: return "No cancelled trips"
        }
    }
    
    var subtitle: String {
        switch tab {
        case .cart: return "Add stays, tours, or transport to see them here"
        case .upcoming: return "When you book a trip, it will appear here"
        case .completed: return "Your past trips will appear here"
        case .cancelled: return "Cancelled bookings will appear here"
        }
    }
    
    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
            
            Text(subtitle)
                .font(.system(size: 14))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 40)
    }
}

#Preview {
    TripCartView()
}
