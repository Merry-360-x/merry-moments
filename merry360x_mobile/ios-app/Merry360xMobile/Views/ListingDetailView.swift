import SwiftUI

struct ListingDetailView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Environment(\.dismiss) private var dismiss
    let listing: Listing
    
    @State private var currentImageIndex = 0
    @State private var isSaved = false
    @State private var showAllAmenities = false
    @State private var showFullDescription = false
    
    private var mediaRefs: [String] {
        ((listing.images ?? []) + [listing.mainImage].compactMap { $0 })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }
    
    private var displayRating: Double {
        listing.rating ?? 4.8
    }
    
    private var reviewCount: Int {
        Int.random(in: 45...320)
    }
    
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
                        
                        // Location Preview
                        locationSection
                        
                        Divider()
                        
                        // Reviews Section
                        reviewsSection
                        
                        // Spacer for bottom bar
                        Color.clear.frame(height: 100)
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
        .onAppear {
            session.selectedListingId = listing.id
            session.selectedListingTitle = listing.title
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
                                    .background(Color.gray.opacity(0.2))
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
                            .background(.ultraThinMaterial.opacity(0.8))
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
                            .background(.ultraThinMaterial.opacity(0.8))
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
                            .background(.ultraThinMaterial.opacity(0.8))
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
                .background(.ultraThinMaterial.opacity(0.6))
                .clipShape(Capsule())
                .padding(.bottom, 16)
            }
        }
    }
    
    private var placeholderImage: some View {
        Rectangle()
            .fill(LinearGradient(colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.2)], startPoint: .topLeading, endPoint: .bottomTrailing))
            .overlay {
                Image(systemName: "photo")
                    .font(.system(size: 40))
                    .foregroundColor(.gray.opacity(0.5))
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
    
    // MARK: - Location Section
    private var locationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Explore the area")
                .font(.system(size: 18, weight: .bold))
            
            // Map Preview Placeholder
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.15))
                    .frame(height: 160)
                
                VStack(spacing: 8) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.gray.opacity(0.5))
                    Text(listing.location)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                }
            }
            
            // Nearby Places
            VStack(spacing: 12) {
                nearbyPlace(icon: "building.2.fill", name: "City Center", distance: "1.2 km")
                nearbyPlace(icon: "cart.fill", name: "Shopping Mall", distance: "0.8 km")
                nearbyPlace(icon: "fork.knife", name: "Restaurants", distance: "0.3 km")
            }
        }
    }
    
    private func nearbyPlace(icon: String, name: String, distance: String) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.secondary)
                .frame(width: 24)
            
            Text(name)
                .font(.system(size: 14))
            
            Spacer()
            
            Text(distance)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Reviews Section
    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Guest reviews")
                    .font(.system(size: 18, weight: .bold))
                
                Spacer()
                
                Text("See all \(reviewCount)")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AppTheme.coral)
            }
            
            // Rating Summary
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
                    ratingBar(label: "Location", value: 4.8)
                    ratingBar(label: "Service", value: 4.7)
                }
            }
            .padding(16)
            .background(Color.gray.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            
            // Sample Review
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 40, height: 40)
                        .overlay {
                            Text("JD")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.secondary)
                        }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("John D.")
                            .font(.system(size: 14, weight: .semibold))
                        Text("March 2026")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.yellow)
                        Text("5.0")
                            .font(.system(size: 13, weight: .semibold))
                    }
                }
                
                Text("\"Amazing property! The location was perfect and the host was very responsive. Would definitely stay again.\"")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .italic()
            }
            .padding(16)
            .background(Color.gray.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
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
                        .fill(Color.gray.opacity(0.2))
                    
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
            
            HStack(spacing: 16) {
                // Price
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(listing.currency)")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                        Text(formatPrice(listing.pricePerNight))
                            .font(.system(size: 22, weight: .bold))
                    }
                    Text("per night")
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Reserve Button
                NavigationLink {
                    BookingView()
                        .environmentObject(session)
                        .onAppear {
                            session.selectedListingId = listing.id
                            session.selectedListingTitle = listing.title
                        }
                } label: {
                    Text("Reserve")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 14)
                        .background(AppTheme.coral)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.regularMaterial)
        }
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
