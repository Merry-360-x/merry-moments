import SwiftUI

struct MyBookingsView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var bookings: [[String: Any]] = []
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var selectedTab = "all"
    @State private var showCancelAlert = false
    @State private var showReviewSheet = false
    @State private var showDateChangeSheet = false
    @State private var showRefundSheet = false
    @State private var activeBookingId: String?

    private let service = SupabaseService()
    private let tabs = ["all", "upcoming", "completed", "cancelled"]

    private var filteredBookings: [[String: Any]] {
        switch selectedTab {
        case "upcoming":
            return bookings.filter { b in
                let status = (b["status"] as? String) ?? ""
                return status == "confirmed" || status == "pending"
            }
        case "completed":
            return bookings.filter { ($0["status"] as? String) == "completed" }
        case "cancelled":
            return bookings.filter { ($0["status"] as? String) == "cancelled" }
        default:
            return bookings
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(tabs, id: \.self) { tab in
                        FilterChip(title: tab.capitalized, isSelected: selectedTab == tab) {
                            selectedTab = tab
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
            }

            if loading && bookings.isEmpty {
                MerryLoadingStateView(
                    title: "Loading bookings",
                    subtitle: "Fetching your reservations...",
                    showCardSkeletons: true
                )
                .padding(16)
            } else if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(16)
            } else if filteredBookings.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "suitcase")
                        .font(.system(size: 44))
                        .foregroundColor(AppTheme.textSecondary)
                    Text("No bookings yet")
                        .font(.headline)
                    Text("Your reservations will appear here")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textSecondary)
                }
                .padding(40)
                .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 14) {
                        ForEach(Array(filteredBookings.enumerated()), id: \.offset) { _, booking in
                            BookingDetailCard(
                                booking: booking,
                                onCancel: {
                                    activeBookingId = booking["id"] as? String
                                    showCancelAlert = true
                                },
                                onReview: {
                                    activeBookingId = booking["id"] as? String
                                    showReviewSheet = true
                                },
                                onDateChange: {
                                    activeBookingId = booking["id"] as? String
                                    showDateChangeSheet = true
                                },
                                onRefund: {
                                    activeBookingId = booking["id"] as? String
                                    showRefundSheet = true
                                }
                            )
                        }
                    }
                    .padding(16)
                }
            }
        }
        .background(AppTheme.appBackground)
        .navigationTitle("My Bookings")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadBookings() }
        .refreshable { await loadBookings() }
        .alert("Cancel Booking", isPresented: $showCancelAlert) {
            Button("Yes, Cancel", role: .destructive) {
                guard let id = activeBookingId else { return }
                Task {
                    try? await service?.cancelBooking(bookingId: id)
                    await loadBookings()
                }
            }
            Button("No", role: .cancel) {}
        } message: {
            Text("Are you sure you want to cancel this booking? This action may be subject to the cancellation policy.")
        }
        .sheet(isPresented: $showReviewSheet) {
            if let bookingId = activeBookingId {
                ReviewSubmissionSheet(bookingId: bookingId, onSubmit: {
                    showReviewSheet = false
                })
                .environmentObject(session)
            }
        }
        .sheet(isPresented: $showDateChangeSheet) {
            if let bookingId = activeBookingId {
                DateChangeSheet(bookingId: bookingId, onSubmit: {
                    showDateChangeSheet = false
                    Task { await loadBookings() }
                })
            }
        }
        .sheet(isPresented: $showRefundSheet) {
            if let bookingId = activeBookingId {
                RefundRequestSheet(bookingId: bookingId, onSubmit: {
                    showRefundSheet = false
                })
            }
        }
    }

    private func loadBookings() async {
        guard let userId = session.userId else { return }
        loading = true
        errorMessage = nil
        do {
            bookings = try await service?.fetchUserBookingsDetailed(userId: userId) ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct BookingDetailCard: View {
    let booking: [String: Any]
    let onCancel: () -> Void
    let onReview: () -> Void
    let onDateChange: () -> Void
    let onRefund: () -> Void

    private var id: String { (booking["id"] as? String) ?? "" }
    private var status: String { (booking["status"] as? String) ?? "pending" }
    private var paymentStatus: String { (booking["payment_status"] as? String) ?? "pending" }
    private var totalPrice: Double {
        if let d = booking["total_price"] as? Double { return d }
        if let i = booking["total_price"] as? Int { return Double(i) }
        return 0
    }
    private var currency: String { (booking["currency"] as? String) ?? "RWF" }
    private var checkIn: String { (booking["check_in"] as? String) ?? "" }
    private var checkOut: String { (booking["check_out"] as? String) ?? "" }
    private var guests: Int { (booking["guests"] as? Int) ?? 1 }
    private var guestName: String { (booking["guest_name"] as? String) ?? "" }
    private var specialRequests: String? { booking["special_requests"] as? String }
    private var cancellationPolicy: String? { booking["cancellation_policy"] as? String }
    private var createdAt: String { (booking["created_at"] as? String) ?? "" }

    private var propertyInfo: [String: Any]? { booking["properties"] as? [String: Any] }
    private var propertyTitle: String { (propertyInfo?["title"] as? String) ?? (propertyInfo?["name"] as? String) ?? "Property" }
    private var propertyLocation: String { (propertyInfo?["location"] as? String) ?? "" }
    private var propertyImage: String? {
        if let main = propertyInfo?["main_image"] as? String, !main.isEmpty { return main }
        if let imgs = propertyInfo?["images"] as? [String] { return imgs.first }
        return nil
    }

    private var isCancellable: Bool { status == "pending" || status == "confirmed" }
    private var isReviewable: Bool { status == "completed" }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Property image
            if let imgUrl = propertyImage, let url = URL(string: imgUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(16/9, contentMode: .fill)
                    default:
                        Rectangle().fill(AppTheme.cardBackground)
                            .aspectRatio(16/9, contentMode: .fill)
                    }
                }
                .frame(height: 140)
                .clipped()
            }

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(propertyTitle)
                        .font(.headline)
                        .lineLimit(1)
                    Spacer()
                    StatusBadge(status: status)
                }

                if !propertyLocation.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.caption2)
                        Text(propertyLocation)
                            .font(.caption)
                    }
                    .foregroundColor(AppTheme.textSecondary)
                }

                HStack(spacing: 16) {
                    if !checkIn.isEmpty {
                        Label(formatDate(checkIn), systemImage: "calendar")
                            .font(.caption)
                    }
                    if !checkOut.isEmpty {
                        Label(formatDate(checkOut), systemImage: "calendar.badge.checkmark")
                            .font(.caption)
                    }
                    Label("\(guests) guests", systemImage: "person.2")
                        .font(.caption)
                }
                .foregroundColor(AppTheme.textSecondary)

                Divider()

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Total")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                        Text("\(currency) \(Int(totalPrice))")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(AppTheme.coral)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Payment")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                        StatusBadge(status: paymentStatus)
                    }
                }

                if let policy = cancellationPolicy, !policy.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "info.circle")
                            .font(.caption2)
                        Text(policy)
                            .font(.caption2)
                    }
                    .foregroundColor(AppTheme.textSecondary)
                }

                // Actions
                HStack(spacing: 10) {
                    if isCancellable {
                        Button(action: onCancel) {
                            Label("Cancel", systemImage: "xmark.circle")
                                .font(.caption)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.red.opacity(0.1))
                                .foregroundColor(.red)
                                .cornerRadius(8)
                        }

                        Button(action: onDateChange) {
                            Label("Change Dates", systemImage: "calendar.badge.clock")
                                .font(.caption)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.blue.opacity(0.1))
                                .foregroundColor(.blue)
                                .cornerRadius(8)
                        }
                    }

                    if isReviewable {
                        Button(action: onReview) {
                            Label("Review", systemImage: "star")
                                .font(.caption)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(AppTheme.coral.opacity(0.1))
                                .foregroundColor(AppTheme.coral)
                                .cornerRadius(8)
                        }
                    }

                    if paymentStatus == "paid" && isCancellable {
                        Button(action: onRefund) {
                            Label("Refund", systemImage: "arrow.uturn.left")
                                .font(.caption)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.orange.opacity(0.1))
                                .foregroundColor(.orange)
                                .cornerRadius(8)
                        }
                    }
                }
            }
            .padding(14)
        }
        .background(AppTheme.cardBackground)
        .cornerRadius(AppTheme.cornerRadiusMedium)
        .modifier(SoftShadow())
    }

    private func formatDate(_ isoDate: String) -> String {
        let input = ISO8601DateFormatter()
        input.formatOptions = [.withFullDate]
        guard let date = input.date(from: String(isoDate.prefix(10))) else { return isoDate.prefix(10).description }
        let output = DateFormatter()
        output.dateStyle = .medium
        return output.string(from: date)
    }
}

private struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(status.capitalized)
            .font(.system(size: 11, weight: .semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(statusColor.opacity(0.15))
            .foregroundColor(statusColor)
            .cornerRadius(6)
    }

    private var statusColor: Color {
        switch status.lowercased() {
        case "confirmed", "paid", "completed": return .green
        case "pending": return .orange
        case "cancelled", "failed", "refunded": return .red
        default: return .gray
        }
    }
}

private struct ReviewSubmissionSheet: View {
    @EnvironmentObject private var session: AppSessionViewModel
    let bookingId: String
    let onSubmit: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var accommodationRating = 0
    @State private var serviceRating = 0
    @State private var comment = ""
    @State private var submitting = false
    @State private var errorMessage: String?

    private let service = SupabaseService()

    var body: some View {
        NavigationStack {
            List {
                Section("Accommodation Rating") {
                    StarRatingPicker(rating: $accommodationRating)
                }
                Section("Service Rating") {
                    StarRatingPicker(rating: $serviceRating)
                }
                Section("Your Review") {
                    TextEditor(text: $comment)
                        .frame(minHeight: 100)
                }
                if let error = errorMessage {
                    Section {
                        Text(error).foregroundColor(.red).font(.caption)
                    }
                }
            }
            .navigationTitle("Leave a Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") {
                        Task { await submitReview() }
                    }
                    .disabled(accommodationRating == 0 || submitting)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func submitReview() async {
        guard let userId = session.userId else { return }
        submitting = true
        errorMessage = nil
        do {
            try await service?.submitGuestReview(
                bookingId: bookingId,
                propertyId: "",
                userId: userId,
                rating: accommodationRating,
                comment: comment,
                serviceRating: serviceRating > 0 ? serviceRating : nil
            )
            onSubmit()
        } catch {
            errorMessage = error.localizedDescription
        }
        submitting = false
    }
}

private struct StarRatingPicker: View {
    @Binding var rating: Int
    private let labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"]

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        rating = star
                    } label: {
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.title2)
                            .foregroundColor(star <= rating ? .yellow : .gray.opacity(0.3))
                    }
                }
            }
            if rating > 0, rating < labels.count {
                Text(labels[rating])
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
            }
        }
    }
}

private struct DateChangeSheet: View {
    let bookingId: String
    let onSubmit: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var newCheckIn = Date()
    @State private var newCheckOut = Date().addingTimeInterval(86400)
    @State private var reason = ""
    @State private var submitting = false

    private let service = SupabaseService()

    var body: some View {
        NavigationStack {
            List {
                Section("New Dates") {
                    DatePicker("Check-in", selection: $newCheckIn, displayedComponents: .date)
                    DatePicker("Check-out", selection: $newCheckOut, in: newCheckIn..., displayedComponents: .date)
                }
                Section("Reason (optional)") {
                    TextField("Why are you changing dates?", text: $reason)
                }
            }
            .navigationTitle("Change Dates")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Request") {
                        Task {
                            submitting = true
                            let fmt = ISO8601DateFormatter()
                            fmt.formatOptions = [.withFullDate]
                            try? await service?.requestDateChange(
                                bookingId: bookingId,
                                newCheckIn: fmt.string(from: newCheckIn),
                                newCheckOut: fmt.string(from: newCheckOut),
                                reason: reason.isEmpty ? nil : reason
                            )
                            submitting = false
                            onSubmit()
                        }
                    }
                    .disabled(submitting)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

private struct RefundRequestSheet: View {
    let bookingId: String
    let onSubmit: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var reason = ""
    @State private var submitting = false

    private let service = SupabaseService()

    var body: some View {
        NavigationStack {
            List {
                Section("Reason for Refund") {
                    TextEditor(text: $reason)
                        .frame(minHeight: 100)
                }
                Section {
                    Text("Our support team will review your request and respond within 1-3 business days.")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .navigationTitle("Request Refund")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") {
                        Task {
                            submitting = true
                            try? await service?.requestRefund(bookingId: bookingId, reason: reason)
                            submitting = false
                            onSubmit()
                        }
                    }
                    .disabled(reason.isEmpty || submitting)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}
