import Foundation

struct BookingDraft {
    let guestId: String
    let hostId: String?
    let bookingType: String?
    let guestName: String
    let guestEmail: String
    let propertyId: String
    let specialRequests: String?
    let paymentMethod: String?
    let checkIn: String
    let checkOut: String
    let guests: Int
    let totalPrice: Double
    let currency: String

    init(
        guestId: String,
        hostId: String? = nil,
        bookingType: String? = nil,
        guestName: String,
        guestEmail: String,
        propertyId: String,
        specialRequests: String? = nil,
        paymentMethod: String? = nil,
        checkIn: String,
        checkOut: String,
        guests: Int,
        totalPrice: Double,
        currency: String
    ) {
        self.guestId = guestId
        self.hostId = hostId
        self.bookingType = bookingType
        self.guestName = guestName
        self.guestEmail = guestEmail
        self.propertyId = propertyId
        self.specialRequests = specialRequests
        self.paymentMethod = paymentMethod
        self.checkIn = checkIn
        self.checkOut = checkOut
        self.guests = guests
        self.totalPrice = totalPrice
        self.currency = currency
    }

    func toPayload() -> [String: Any] {
        var payload: [String: Any] = [
            "guest_id": guestId,
            "guest_name": guestName,
            "guest_email": guestEmail,
            "property_id": propertyId,
            "check_in": checkIn,
            "check_out": checkOut,
            "guests": guests,
            "total_price": totalPrice,
            "currency": currency,
            "status": "pending",
            "confirmation_status": "pending",
            "booking_type": bookingType ?? "property",
            "payment_status": "pending",
            "payment_method": paymentMethod ?? "card"
        ]

        if let hostId, !hostId.isEmpty {
            payload["host_id"] = hostId
        }

        if let specialRequests, !specialRequests.isEmpty {
            payload["special_requests"] = specialRequests
        }

        return payload
    }
}
