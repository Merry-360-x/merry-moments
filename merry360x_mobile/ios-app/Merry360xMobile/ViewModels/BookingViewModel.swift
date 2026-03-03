import Foundation

@MainActor
final class BookingViewModel: ObservableObject {
    @Published var submitting = false
    @Published var statusMessage: String?

    private let service = SupabaseService()

    func submitSampleBooking(propertyId: String) async {
        guard let service else {
            statusMessage = "MobileConfig is not set. Add Supabase URL + anon key first."
            return
        }

        submitting = true
        statusMessage = nil

        let draft = BookingDraft(
            guestId: "replace-with-real-user-id",
            guestName: "Merry Mobile User",
            guestEmail: "mobile@example.com",
            propertyId: propertyId,
            checkIn: "2026-03-15",
            checkOut: "2026-03-17",
            guests: 2,
            totalPrice: 199500,
            currency: "RWF"
        )

        do {
            try await service.submitBooking(draft)
            statusMessage = "Booking request submitted."
        } catch {
            statusMessage = "Booking failed: \(error.localizedDescription)"
        }

        submitting = false
    }

    func startFlutterwavePayment(email: String, amount: Double, currency: String = "RWF") async {
        guard let service else {
            statusMessage = "MobileConfig is not set. Add Supabase URL + anon key first."
            return
        }

        do {
            let response = try await service.createFlutterwavePayment(payload: [
                "email": email,
                "amount": amount,
                "currency": currency
            ])
            if let link = response["paymentLink"] as? String {
                statusMessage = "Payment link created: \(link)"
            } else {
                statusMessage = "Payment initialized."
            }
        } catch {
            statusMessage = "Payment init failed: \(error.localizedDescription)"
        }
    }
}
