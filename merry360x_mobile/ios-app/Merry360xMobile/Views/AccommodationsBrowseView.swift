import SwiftUI

struct AccommodationsBrowseView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var listings: [Listing] = []
    @State private var loading = false
    @State private var searchText = ""
    @State private var selectedType: String?
    @State private var minPrice: Double?
    @State private var maxPrice: Double?
    @State private var minRating: Double?
    @State private var monthlyOnly = false
    @State private var showFilterSheet = false
    @State private var errorMessage: String?
    @State private var currentPage = 0
    private let pageSize = 20

    private let service = SupabaseService()

    private let propertyTypes = ["Hotel", "Motel", "Resort", "Lodge", "Villa", "Apartment", "Hostel", "Guest House", "B&B", "Chalet"]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Search bar + filter button
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(AppTheme.textSecondary)
                    TextField("Search accommodations...", text: $searchText)
                        .textFieldStyle(.plain)
                        .onSubmit {
                            currentPage = 0
                            Task { await loadListings() }
                        }
                    Button {
                        showFilterSheet = true
                    } label: {
                        Image(systemName: "slider.horizontal.3")
                            .foregroundColor(hasActiveFilters ? AppTheme.coral : AppTheme.textSecondary)
                    }
                }
                .padding(12)
                .background(AppTheme.cardBackground)
                .cornerRadius(AppTheme.cornerRadiusMedium)

                // Property type filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", isSelected: selectedType == nil) {
                            selectedType = nil
                            currentPage = 0
                            Task { await loadListings() }
                        }
                        ForEach(propertyTypes, id: \.self) { type in
                            FilterChip(title: type, isSelected: selectedType == type) {
                                selectedType = selectedType == type ? nil : type
                                currentPage = 0
                                Task { await loadListings() }
                            }
                        }
                    }
                }

                // Monthly toggle
                if monthlyOnly {
                    HStack {
                        Image(systemName: "calendar")
                            .foregroundColor(AppTheme.coral)
                        Text("Monthly rentals only")
                            .font(.caption)
                            .foregroundColor(AppTheme.coral)
                        Spacer()
                        Button("Clear") {
                            monthlyOnly = false
                            currentPage = 0
                            Task { await loadListings() }
                        }
                        .font(.caption)
                    }
                    .padding(.horizontal, 4)
                }

                if loading && listings.isEmpty {
                    MerryLoadingStateView(
                        title: "Finding stays",
                        subtitle: "Loading accommodations...",
                        showCardSkeletons: true
                    )
                } else if let error = errorMessage {
                    Text(error).font(.caption).foregroundColor(.red)
                } else if listings.isEmpty {
                    ContentUnavailableCard(
                        icon: "building.2",
                        title: "No accommodations found",
                        subtitle: "Try adjusting your filters or search terms"
                    )
                } else {
                    ForEach(listings) { listing in
                        NavigationLink(value: listing) {
                            AccommodationCard(listing: listing, isFavorite: false, onToggleFavorite: {
                                guard let userId = session.userId else { return }
                                Task {
                                    try? await service?.addToWishlist(userId: userId, propertyId: listing.id)
                                }
                            })
                        }
                        .buttonStyle(.plain)
                    }

                    // Pagination
                    if listings.count >= pageSize {
                        HStack(spacing: 16) {
                            if currentPage > 0 {
                                Button("Previous") {
                                    currentPage -= 1
                                    Task { await loadListings() }
                                }
                                .font(.subheadline)
                            }
                            Text("Page \(currentPage + 1)")
                                .font(.caption)
                                .foregroundColor(AppTheme.textSecondary)
                            Button("Next") {
                                currentPage += 1
                                Task { await loadListings() }
                            }
                            .font(.subheadline)
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Accommodations")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: Listing.self) { listing in
            ListingDetailView(listing: listing)
                .environmentObject(session)
        }
        .sheet(isPresented: $showFilterSheet) {
            AccommodationFilterSheet(
                minPrice: $minPrice,
                maxPrice: $maxPrice,
                minRating: $minRating,
                monthlyOnly: $monthlyOnly,
                onApply: {
                    currentPage = 0
                    Task { await loadListings() }
                }
            )
        }
        .task { await loadListings() }
    }

    private var hasActiveFilters: Bool {
        selectedType != nil || minPrice != nil || maxPrice != nil || minRating != nil || monthlyOnly
    }

    private func loadListings() async {
        loading = true
        errorMessage = nil
        do {
            listings = try await service?.fetchAccommodations(
                search: searchText.isEmpty ? nil : searchText,
                propertyType: selectedType?.lowercased().replacingOccurrences(of: " ", with: "_"),
                minPrice: minPrice,
                maxPrice: maxPrice,
                minRating: minRating,
                monthlyOnly: monthlyOnly,
                limit: pageSize,
                offset: currentPage * pageSize
            ) ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct AccommodationCard: View {
    let listing: Listing
    let isFavorite: Bool
    let onToggleFavorite: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                if let imageUrl = listing.mainImage ?? listing.images?.first,
                   let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(16/10, contentMode: .fill)
                        default:
                            Rectangle().fill(AppTheme.cardBackground)
                                .aspectRatio(16/10, contentMode: .fill)
                        }
                    }
                    .frame(height: 200)
                    .clipped()
                } else {
                    Rectangle().fill(AppTheme.cardBackground)
                        .frame(height: 200)
                }

                Button(action: onToggleFavorite) {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .font(.title3)
                        .foregroundColor(isFavorite ? AppTheme.coral : .white)
                        .shadow(radius: 2)
                }
                .padding(12)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(listing.title)
                        .font(.headline)
                        .lineLimit(1)
                    Spacer()
                    if let rating = listing.rating {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                    }
                }

                HStack(spacing: 4) {
                    Image(systemName: "mappin")
                        .font(.caption2)
                    Text(listing.location)
                        .font(.caption)
                        .lineLimit(1)
                }
                .foregroundColor(AppTheme.textSecondary)

                HStack {
                    Text("\(listing.currency) \(Int(listing.pricePerNight))")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.coral)
                    Text(listing.monthlyOnlyListing == true ? "/ month" : "/ night")
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)

                    if let monthPrice = listing.pricePerMonth, monthPrice > 0 {
                        Text("•")
                            .foregroundColor(AppTheme.textSecondary)
                        Text("\(listing.currency) \(Int(monthPrice)) / month")
                            .font(.caption)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
            }
            .padding(12)
        }
        .background(AppTheme.cardBackground)
        .cornerRadius(AppTheme.cornerRadiusMedium)
        .modifier(SoftShadow())
    }
}

private struct AccommodationFilterSheet: View {
    @Binding var minPrice: Double?
    @Binding var maxPrice: Double?
    @Binding var minRating: Double?
    @Binding var monthlyOnly: Bool
    let onApply: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var minPriceText = ""
    @State private var maxPriceText = ""
    @State private var ratingSelection = 0

    var body: some View {
        NavigationStack {
            List {
                Section("Price Range") {
                    HStack {
                        TextField("Min price", text: $minPriceText)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)
                        Text("–")
                        TextField("Max price", text: $maxPriceText)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)
                    }
                }

                Section("Minimum Rating") {
                    Picker("Rating", selection: $ratingSelection) {
                        Text("Any").tag(0)
                        Text("3+ Stars").tag(3)
                        Text("4+ Stars").tag(4)
                        Text("4.5+ Stars").tag(5)
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    Toggle("Monthly rentals only", isOn: $monthlyOnly)
                }

                Section {
                    Button("Clear All Filters") {
                        minPriceText = ""
                        maxPriceText = ""
                        ratingSelection = 0
                        monthlyOnly = false
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        minPrice = Double(minPriceText)
                        maxPrice = Double(maxPriceText)
                        minRating = ratingSelection > 0 ? Double(ratingSelection) : nil
                        dismiss()
                        onApply()
                    }
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                minPriceText = minPrice.map { String(Int($0)) } ?? ""
                maxPriceText = maxPrice.map { String(Int($0)) } ?? ""
                ratingSelection = minRating.map { Int($0) } ?? 0
            }
        }
    }
}
