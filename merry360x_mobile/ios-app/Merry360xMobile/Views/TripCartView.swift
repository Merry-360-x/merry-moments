import SwiftUI

enum TripTab: String, CaseIterable {
    case cart = "Cart"
    case upcoming = "Upcoming"
    case completed = "Completed"
    case cancelled = "Cancelled"
}

struct TripCartView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var selectedTab: TripTab = .cart
    @State private var isLoading = false
    @State private var bookings: [[String: Any]] = []
    @State private var errorMessage: String?

    private let service = SupabaseService()

    private var filteredBookings: [[String: Any]] {
        switch selectedTab {
        case .cart:
            return bookings.filter { String(($0["status"] as? String ?? "")).lowercased() == "pending" }
        case .upcoming:
            return bookings.filter {
                let status = String(($0["status"] as? String ?? "")).lowercased()
                return status == "confirmed" || status == "completed"
            }
        case .completed:
            return bookings.filter { String(($0["status"] as? String ?? "")).lowercased() == "completed" }
        case .cancelled:
            return bookings.filter { String(($0["status"] as? String ?? "")).lowercased() == "cancelled" }
        }
    }
    
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
            } else if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 14))
                    .foregroundColor(.red)
                    .padding(.horizontal, 20)
            } else if filteredBookings.isEmpty {
                TripEmptyState(tab: selectedTab)
            } else {
                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(Array(filteredBookings.enumerated()), id: \.offset) { _, booking in
                            BookingRow(booking: booking)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            
            Spacer()
        }
        .background(Color.white)
        .task {
            await loadBookings()
        }
    }

    private func loadBookings() async {
        guard let userId = session.userId, let service else {
            errorMessage = "Login required to view bookings."
            return
        }

        isLoading = true
        errorMessage = nil
        do {
            bookings = try await service.fetchUserBookings(userId: userId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

private struct BookingRow: View {
    let booking: [String: Any]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Booking \(String(describing: booking["id"] as? String ?? "" ).prefix(8))")
                .font(.system(size: 14, weight: .semibold))

            Text("Status: \(String(booking["status"] as? String ?? "pending").capitalized)")
                .font(.system(size: 12))
                .foregroundColor(.gray)

            let currency = String(booking["currency"] as? String ?? "RWF")
            let amount = NumberFormatter.localizedString(from: NSNumber(value: Double(booking["total_price"] as? Double ?? 0)), number: .decimal)
            Text("\(currency) \(amount)")
                .font(.system(size: 13, weight: .medium))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
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
