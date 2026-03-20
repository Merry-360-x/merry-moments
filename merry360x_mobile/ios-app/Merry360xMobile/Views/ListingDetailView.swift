import SwiftUI

struct ListingDetailView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Environment(\.dismiss) private var dismiss
    let listing: Listing
    
    @State private var currentImageIndex = 0
    @State private var isSaved = false
    @State private var showAllAmenities = false
    @State private var showFullDescription = false

    // Real data
    @State private var reviews: [[String: Any]] = []
    @State private var recommendedTours: [Listing] = []
    @State private var recommendedTransport: [Listing] = []
    @State private var loadingReviews = false
    @State private var showBooking = false
    @State private var cartAdded = false
    @State private var cartLoading = false
    private let service = SupabaseService()

    private var mediaRefs: [String] {
        ((listing.images ?? []) + [listing.mainImage].compactMap { $0 })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }
    
    private var displayRating: Double {
        listing.rating ?? 4.8
    }
    
    private var reviewCount: Int { reviews.count }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero Gallery
                    heroGallery
                    
                    VStack(alignment: .leading, spacing: 24) {
                        // Property Header
                        propertyHeader
                        
                        Divider()
                        
                        // Key Highlights
                        highlightsSection
                        
                        Divider()
                        
                        // About Section
                        aboutSection
                        
                        Divider()
                        
                        // Popular Amenities
                        amenitiesSection
                        
                        Divider()
                        
                        // Reviews Section
                        reviewsSection

                        // Recommended Tours & Transport
                        recommendedSection

                        // Spacer for bottom bar
                        Color.clear.frame(height: 110)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 20)
                }
            }
            .ignoresSafeArea(edges: .top)
            
            // Sticky Bottom Bar
            bottomBookingBar
        }
        .navigationBarHidden(true)
        .task {
            session.selectedListingId = listing.id
            session.selectedListingTitle = listing.title
            await loadExtras()
        }
        .sheet(isPresented: $showBooking) {
            BookingView().environmentObject(session)
        }
    }
    
    // MARK: - Hero Gallery
    private var heroGallery: some View {
        ZStack(alignment: .top) {
            TabView(selection: $currentImageIndex) {
                ForEach(Array(mediaRefs.enumerated()), id: \.offset) { index, ref in
                    if let url = URL(string: resolveCloudinaryMediaReference(ref)) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            case .failure:
                                placeholderImage
                            case .empty:
                                ProgressView()
                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                                    .background(AppTheme.cardBackground)
                            @unknown default:
                                placeholderImage
                            }
                        }
                        .tag(index)
                    } else {
                        placeholderImage.tag(index)
                    }
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 300)
            
            // Navigation & Actions Overlay
            VStack {
                HStack {
                    // Back Button
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(AppTheme.cardBackground.opacity(0.9))
                            .clipShape(Circle())
                    }
                    
                    Spacer()
                    
                    // Share Button
                    Button {
                        // Share action
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(AppTheme.cardBackground.opacity(0.9))
                            .clipShape(Circle())
                    }
                    
                    // Save Button
                    Button {
                        isSaved.toggle()
                    } label: {
                        Image(systemName: isSaved ? "heart.fill" : "heart")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(isSaved ? .red : .white)
                            .frame(width: 40, height: 40)
                            .background(AppTheme.cardBackground.opacity(0.9))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 50)
                
                Spacer()
                
                // Page Indicator
                HStack(spacing: 6) {
                    ForEach(0..<min(mediaRefs.count, 5), id: \.self) { index in
                        Circle()
                            .fill(currentImageIndex == index ? Color.white : Color.white.opacity(0.5))
                            .frame(width: 8, height: 8)
                    }
                    if mediaRefs.count > 5 {
                        Text("+\(mediaRefs.count - 5)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white)
                    }
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .background(AppTheme.cardBackground.opacity(0.85))
                .clipShape(Capsule())
                .padding(.bottom, 16)
            }
        }
    }
    
    private var placeholderImage: some View {
        Rectangle()
            .fill(AppTheme.cardBackground)
            .overlay {
                Image(systemName: "photo")
                    .font(.system(size: 40))
                    .foregroundColor(AppTheme.placeholderText)
            }
    }
    
    // MARK: - Property Header
    private var propertyHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Property Type Badge
            Text("ENTIRE HOME")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.secondary)
                .tracking(0.5)
            
            // Title
            Text(listing.title)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.primary)
            
            // Rating Row
            HStack(spacing: 8) {
                // Star Rating
                HStack(spacing: 2) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < Int(displayRating) ? "star.fill" : (Double(index) < displayRating ? "star.leadinghalf.filled" : "star"))
                            .font(.system(size: 14))
                            .foregroundColor(.yellow)
                    }
                }
                
                Text(String(format: "%.1f", displayRating))
                    .font(.system(size: 15, weight: .semibold))
                
                Text("(\(reviewCount) reviews)")
                    .font(.system(size: 14))
                    .foregroundColor(AppTheme.coral)
            }
            
            // Location
            HStack(spacing: 4) {
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                Text(listing.location)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
        }
    }
    
    // MARK: - Highlights Section
    private var highlightsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Property highlights")
                .font(.system(size: 18, weight: .bold))
            
            HStack(spacing: 0) {
                highlightItem(icon: "wifi", title: "Free WiFi")
                highlightItem(icon: "car.fill", title: "Parking")
                highlightItem(icon: "sparkles", title: "Clean")
                highlightItem(icon: "location.fill", title: "Great location")
            }
        }
    }
    
    private func highlightItem(icon: String, title: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 22))
                .foregroundColor(AppTheme.coral)
                .frame(width: 48, height: 48)
                .background(AppTheme.coral.opacity(0.1))
                .clipShape(Circle())
            
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - About Section
    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("About this property")
                .font(.system(size: 18, weight: .bold))
            
            Text(propertyDescription)
                .font(.system(size: 15))
                .foregroundColor(.secondary)
                .lineLimit(showFullDescription ? nil : 4)
            
            Button {
                withAnimation {
                    showFullDescription.toggle()
                }
            } label: {
                Text(showFullDescription ? "Show less" : "Read more")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AppTheme.coral)
            }
        }
    }
    
    private var propertyDescription: String {
        "Experience the best of \(listing.location) in this beautifully appointed property. Featuring modern amenities, comfortable furnishings, and a prime location, this space is perfect for both business travelers and vacationers alike.\n\nEnjoy seamless check-in, high-speed WiFi, and all the comforts of home. The property has been recently renovated with attention to detail, ensuring a memorable stay. Whether you're exploring the local attractions or need a peaceful retreat, this property offers the perfect base for your adventures."
    }
    
    // MARK: - Amenities Section
    private var amenitiesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Popular amenities")
                .font(.system(size: 18, weight: .bold))
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                amenityRow(icon: "wifi", title: "Free WiFi")
                amenityRow(icon: "car.fill", title: "Free parking")
                amenityRow(icon: "snowflake", title: "Air conditioning")
                amenityRow(icon: "tv", title: "Smart TV")
                amenityRow(icon: "washer.fill", title: "Washer")
                amenityRow(icon: "refrigerator.fill", title: "Kitchen")
            }
            
            Button {
                showAllAmenities = true
            } label: {
                Text("See all amenities")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AppTheme.coral)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .overlay {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(AppTheme.coral, lineWidth: 1.5)
                    }
            }
        }
    }
    
    private func amenityRow(icon: String, title: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.primary)
                .frame(width: 24)
            
            Text(title)
                .font(.system(size: 14))
                .foregroundColor(.primary)
            
            Spacer()
        }
    }
    
    // MARK: - Reviews Section
    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Guest reviews")
                    .font(.system(size: 18, weight: .bold))
                Spacer()
                if reviewCount > 0 {
                    Text("\(reviewCount) review\(reviewCount == 1 ? "" : "s")")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppTheme.coral)
                }
            }

            // Rating summary
            HStack(spacing: 16) {
                VStack {
                    Text(String(format: "%.1f", displayRating))
                        .font(.system(size: 36, weight: .bold))
                    Text("out of 5")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
                VStack(alignment: .leading, spacing: 4) {
                    ratingBar(label: "Cleanliness", value: 4.9)
                    ratingBar(label: "Location",    value: 4.8)
                    ratingBar(label: "Service",     value: 4.7)
                }
            }
            .padding(16)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if loadingReviews {
                HStack { Spacer(); ProgressView(); Spacer() }
            } else if reviews.isEmpty {
                Text("No reviews yet. Be the first to review!")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 8)
            } else {
                ForEach(Array(reviews.prefix(5).enumerated()), id: \.offset) { _, review in
                    reviewCard(review)
                }
            }
        }
    }

    private func reviewCard(_ review: [String: Any]) -> some View {
        let name = review["reviewer_name"] as? String ?? "Guest"
        let rating = review["rating"] as? Double ?? 5.0
        let comment = (review["comment"] as? String ?? review["review_text"] as? String) ?? ""
        let dateStr = (review["created_at"] as? String ?? "").prefix(10)
        let initials = String(name.prefix(2)).uppercased()

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle()
                    .fill(AppTheme.coral.opacity(0.15))
                    .frame(width: 40, height: 40)
                    .overlay {
                        Text(initials)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(AppTheme.coral)
                    }
                VStack(alignment: .leading, spacing: 2) {
                    Text(name).font(.system(size: 14, weight: .semibold))
                    Text(String(dateStr)).font(.system(size: 12)).foregroundColor(.secondary)
                }
                Spacer()
                HStack(spacing: 2) {
                    Image(systemName: "star.fill").font(.system(size: 12)).foregroundColor(.yellow)
                    Text(String(format: "%.1f", rating)).font(.system(size: 13, weight: .semibold))
                }
            }
            if !comment.isEmpty {
                Text(comment)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .lineLimit(4)
            }
        }
        .padding(16)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Recommended Section
    private var recommendedSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            if !recommendedTours.isEmpty {
                Divider()
                Text("Recommended Tours")
                    .font(.system(size: 18, weight: .bold))
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(recommendedTours.prefix(6)) { tour in
                            miniListingCard(tour)
                        }
                    }
                }
            }
            if !recommendedTransport.isEmpty {
                Divider()
                Text("Transport Options")
                    .font(.system(size: 18, weight: .bold))
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(recommendedTransport.prefix(6)) { vehicle in
                            miniListingCard(vehicle)
                        }
                    }
                }
            }
        }
    }

    private func miniListingCard(_ item: Listing) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            let imgUrl = (item.images?.first ?? item.mainImage)
                .flatMap { URL(string: resolveCloudinaryMediaReference($0)) }
            Group {
                if let url = imgUrl {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let img): img.resizable().scaledToFill()
                        default: AppTheme.cardBackground
                        }
                    }
                } else {
                    AppTheme.cardBackground
                }
            }
            .frame(width: 140, height: 90)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            Text(item.title)
                .font(.system(size: 12, weight: .semibold))
                .lineLimit(2)
                .frame(width: 140, alignment: .leading)

            HStack(spacing: 2) {
                Text(item.currency)
                Text(formatPrice(item.pricePerNight))
                    .fontWeight(.semibold)
                Text("/night").foregroundColor(.secondary)
            }
            .font(.system(size: 11))
            .frame(width: 140, alignment: .leading)
        }
        .frame(width: 140)
    }
    
    private func ratingBar(label: String, value: Double) -> some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.secondary)
                .frame(width: 80, alignment: .leading)
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(AppTheme.cardBackground)
                    
                    RoundedRectangle(cornerRadius: 2)
                        .fill(AppTheme.coral)
                        .frame(width: geometry.size.width * (value / 5))
                }
            }
            .frame(height: 6)
            
            Text(String(format: "%.1f", value))
                .font(.system(size: 12, weight: .medium))
                .frame(width: 28)
        }
    }
    
    // MARK: - Bottom Booking Bar
    private var bottomBookingBar: some View {
        VStack(spacing: 0) {
            Divider()
            HStack(spacing: 12) {
                // Price
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        Text(listing.currency)
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                        Text(formatPrice(listing.pricePerNight))
                            .font(.system(size: 20, weight: .bold))
                    }
                    Text("per night")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Add to Trip Cart
                Button {
                    Task { await addToCartAction() }
                } label: {
                    Group {
                        if cartLoading {
                            ProgressView().scaleEffect(0.7)
                        } else {
                            Label(cartAdded ? "Added ✓" : "Add to Cart", systemImage: cartAdded ? "checkmark" : "cart.badge.plus")
                        }
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(cartAdded ? .white : AppTheme.coral)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(cartAdded ? AppTheme.coral : AppTheme.coral.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(AppTheme.coral, lineWidth: 1))
                }
                .disabled(cartLoading || cartAdded)

                // Book Now
                Button {
                    session.selectedListingId = listing.id
                    session.selectedListingTitle = listing.title
                    showBooking = true
                } label: {
                    Text("Book Now")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(AppTheme.coral)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.regularMaterial)
        }
    }

    private func addToCartAction() async {
        guard let userId = session.userId else { return }
        cartLoading = true; defer { cartLoading = false }
        do {
            try await service?.addToTripCart(
                userId: userId,
                propertyId: listing.id,
                propertyTitle: listing.title,
                currency: listing.currency,
                pricePerNight: listing.pricePerNight
            )
            cartAdded = true
        } catch { /* silently ignore, could show toast */ }
    }

    private func loadExtras() async {
        loadingReviews = true
        async let rawReviews = service?.fetchPropertyReviews(propertyId: listing.id) ?? []
        async let tours      = service?.fetchToursFiltered(search: nil, limit: 6) ?? []
        async let transport  = service?.fetchTransportVehicles(serviceType: nil, search: nil, vehicleType: nil, limit: 6) ?? []
        reviews              = (try? await rawReviews) ?? []
        recommendedTours     = (try? await tours) ?? []
        recommendedTransport = (try? await transport) ?? []
        loadingReviews = false
    }
    
    // MARK: - Helpers
    private func formatPrice(_ price: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "\(Int(price))"
    }
    
    private func resolveCloudinaryMediaReference(_ value: String) -> String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return trimmed }
        
        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
            return trimmed
        }
        if trimmed.hasPrefix("//") {
            return "https:\(trimmed)"
        }
        if trimmed.hasPrefix("res.cloudinary.com/") {
            return "https://\(trimmed)"
        }
        
        let normalized = trimmed.hasPrefix("/") ? String(trimmed.dropFirst()) : trimmed
        let primaryCloud = "dghg9uebh"
        
        if normalized.hasPrefix("image/upload/") || normalized.hasPrefix("video/upload/") || normalized.hasPrefix("raw/upload/") {
            return "https://res.cloudinary.com/\(primaryCloud)/\(normalized)"
        }
        
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_.~/"))
        let encoded = normalized.addingPercentEncoding(withAllowedCharacters: allowed) ?? normalized
        return "https://res.cloudinary.com/\(primaryCloud)/image/upload/f_auto,q_auto/\(encoded)"
    }
}

#Preview {
    NavigationStack {
        ListingDetailView(
            listing: Listing(
                id: "preview",
                hostId: nil,
                title: "Kigali Hills Luxury Apartment",
                location: "Kigali, Rwanda",
                pricePerNight: 95000,
                pricePerMonth: nil,
                currency: "RWF",
                isPublished: true,
                monthlyOnlyListing: false,
                rating: 4.8
            )
        )
        .environmentObject(AppSessionViewModel())
    }
}
