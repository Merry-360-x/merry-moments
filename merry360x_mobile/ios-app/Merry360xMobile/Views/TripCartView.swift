import SwiftUI

struct TripCartView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var isLoading = false
    @State private var bookings: [[String: Any]] = []
    @State private var errorMessage: String?
    @State private var activeCenter: AppCenterDestination?

    private let service = SupabaseService()

    private var cartBookings: [[String: Any]] {
        bookings.filter { String(($0["status"] as? String ?? "")).lowercased() == "pending" }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            Text("Trip Cart")
                .font(.system(size: 24, weight: .bold))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 16)
            
            Spacer()
            
            // Content
            if isLoading {
                MerryLoadingStateView(
                    title: "Loading your cart",
                    subtitle: "Syncing bookings...",
                    showCardSkeletons: true
                )
                .padding(.horizontal, 16)
            } else if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 14))
                    .foregroundColor(.red)
                    .padding(.horizontal, 20)
            } else if cartBookings.isEmpty {
                VStack(spacing: 8) {
                    Text("Your cart is empty")
                        .font(.system(size: 18, weight: .semibold))
                    
                    Text("Add stays, tours, or transport to see them here")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 40)
            } else {
                VStack(spacing: 12) {
                    Button {
                        activeCenter = .bookingsCheckout
                    } label: {
                        Text("Proceed to checkout")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(AppTheme.coral)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 16)

                    ScrollView {
                        VStack(spacing: 10) {
                            ForEach(Array(cartBookings.enumerated()), id: \.offset) { _, booking in
                                BookingRow(booking: booking)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
            }
            
            Spacer()
        }
        .background(AppTheme.appBackground)
        .sheet(item: $activeCenter) { destination in
            AppCentersView(destination: destination)
                .environmentObject(session)
        }
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

#Preview {
    TripCartView()
}
