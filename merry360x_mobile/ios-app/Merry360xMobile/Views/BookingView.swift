import SwiftUI

struct BookingView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = BookingViewModel()
    @State private var activePaymentState: PaymentStateScreen?

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Confirm your trip")
                    .font(.title3.bold())
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text("Selected: \(session.selectedListingTitle ?? "No listing selected yet")")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                bookingSection(title: "Dates") {
                    HStack(spacing: 8) {
                        inputCard(label: "Check in", value: "12 Mar")
                        inputCard(label: "Check out", value: "14 Mar")
                    }
                }

                bookingSection(title: "Guests") {
                    inputCard(label: "Adults", value: "2")
                }

                bookingSection(title: "Price details") {
                    VStack(spacing: 8) {
                        line("RWF 95,000 × 2 nights", "RWF 190,000")
                        line("Service fee", "RWF 9,500")
                        Divider()
                        line("Total", "RWF 199,500", bold: true)
                    }
                }

                Button(viewModel.submitting ? "Submitting..." : "Continue to payment") {
                    Task {
                        await viewModel.submitSampleBooking(propertyId: session.selectedListingId ?? "replace-with-real-property-id")
                        if viewModel.statusMessage?.lowercased().contains("submitted") == true {
                            activePaymentState = .pending
                        }
                    }
                }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .foregroundColor(.white)
                    .background(AppTheme.coral)
                    .clipShape(Capsule())

                Button("Initialize Flutterwave Payment") {
                    Task {
                        await viewModel.startFlutterwavePayment(email: "mobile@example.com", amount: 199500)
                        activePaymentState = .success
                    }
                }
                .font(.subheadline.bold())
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .foregroundColor(AppTheme.coral)
                .background(AppTheme.cardBackground)
                .clipShape(Capsule())

                HStack(spacing: 10) {
                    Button("Payment Failed") { activePaymentState = .failed }
                        .font(.caption.bold())
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.12))
                        .clipShape(Capsule())

                    Button("Booking Success") { activePaymentState = .success }
                        .font(.caption.bold())
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.green.opacity(0.12))
                        .clipShape(Capsule())
                }

                if let status = viewModel.statusMessage {
                    Text(status)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Text("You won’t be charged yet.")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Booking")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $activePaymentState) { state in
            PaymentStateView(state: state)
        }
    }

    private func bookingSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
            content()
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
        .softShadow()
    }

    private func inputCard(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.gray)
            Text(value)
                .font(.subheadline.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func line(_ left: String, _ right: String, bold: Bool = false) -> some View {
        HStack {
            Text(left)
                .font(bold ? .subheadline.bold() : .subheadline)
            Spacer()
            Text(right)
                .font(bold ? .subheadline.bold() : .subheadline)
        }
    }
}

enum PaymentStateScreen: String, Identifiable {
    case pending
    case failed
    case success

    var id: String { rawValue }
}

private struct PaymentStateView: View {
    let state: PaymentStateScreen

    var title: String {
        switch state {
        case .pending: return "Payment Pending"
        case .failed: return "Payment Failed"
        case .success: return "Booking Success"
        }
    }

    var subtitle: String {
        switch state {
        case .pending: return "Your payment is processing. You will be notified when it completes."
        case .failed: return "Payment did not complete. Retry or choose another payment method."
        case .success: return "Your booking is confirmed and visible in your trips."
        }
    }

    var tone: Color {
        switch state {
        case .pending: return .orange
        case .failed: return .red
        case .success: return .green
        }
    }

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: state == .success ? "checkmark.circle.fill" : (state == .failed ? "xmark.circle.fill" : "clock.fill"))
                .font(.system(size: 48))
                .foregroundColor(tone)
            Text(title)
                .font(.title3.bold())
            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.appBackground)
    }
}

#Preview {
    NavigationStack { BookingView() }
}
