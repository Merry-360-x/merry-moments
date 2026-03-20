import SwiftUI

struct SearchResultsView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    let initialQuery: String

    @State private var searchText: String
    @State private var selectedTab = 0
    @State private var properties: [Listing] = []
    @State private var tours: [Listing] = []
    @State private var transport: [Listing] = []
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var sortBy = "relevance"

    private let service = SupabaseService()
    private let tabs = ["All", "Properties", "Tours", "Transport"]
    private let sortOptions = ["relevance", "price_low", "price_high", "rating"]

    init(initialQuery: String) {
        self.initialQuery = initialQuery
        self._searchText = State(initialValue: initialQuery)
    }

    private var allResults: [SearchResultItem] {
        var items: [SearchResultItem] = []
        items.append(contentsOf: properties.map { SearchResultItem(listing: $0, type: .property) })
        items.append(contentsOf: tours.map { SearchResultItem(listing: $0, type: .tour) })
        items.append(contentsOf: transport.map { SearchResultItem(listing: $0, type: .transport) })
        return sortItems(items)
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Search bar
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(AppTheme.textSecondary)
                    TextField("Search everything...", text: $searchText)
                        .textFieldStyle(.plain)
                        .onSubmit { Task { await search() } }
                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(AppTheme.textSecondary)
                        }
                    }
                }
                .padding(12)
                .background(AppTheme.cardBackground)
                .cornerRadius(AppTheme.cornerRadiusMedium)

                // Tab bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(tabs.enumerated()), id: \.offset) { idx, tab in
                            let count = tabCount(idx)
                            FilterChip(
                                title: count > 0 ? "\(tab) (\(count))" : tab,
                                isSelected: selectedTab == idx
                            ) {
                                selectedTab = idx
                            }
                        }
                    }
                }

                // Sort
                HStack {
                    Text("\(totalCount) results")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                    Spacer()
                    Menu {
                        Button("Relevance") { sortBy = "relevance" }
                        Button("Price: Low to High") { sortBy = "price_low" }
                        Button("Price: High to Low") { sortBy = "price_high" }
                        Button("Rating") { sortBy = "rating" }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.up.arrow.down")
                            Text("Sort")
                        }
                        .font(.caption)
                        .foregroundColor(AppTheme.coral)
                    }
                }

                if loading {
                    MerryLoadingStateView(
                        title: "Searching",
                        subtitle: "Finding the best matches...",
                        showCardSkeletons: true
                    )
                } else if let error = errorMessage {
                    Text(error).font(.caption).foregroundColor(.red)
                } else if totalCount == 0 {
                    ContentUnavailableCard(
                        icon: "magnifyingglass",
                        title: "No results found",
                        subtitle: "Try different search terms"
                    )
                } else {
                    resultsContent
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Search Results")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: Listing.self) { listing in
            ListingDetailView(listing: listing)
                .environmentObject(session)
        }
        .task { await search() }
    }

    @ViewBuilder
    private var resultsContent: some View {
        switch selectedTab {
        case 1:
            ForEach(sortListings(properties)) { listing in
                NavigationLink(value: listing) {
                    SearchResultCard(listing: listing, typeBadge: "Stay")
                }
                .buttonStyle(.plain)
            }
        case 2:
            ForEach(sortListings(tours)) { listing in
                NavigationLink(value: listing) {
                    SearchResultCard(listing: listing, typeBadge: "Tour")
                }
                .buttonStyle(.plain)
            }
        case 3:
            ForEach(sortListings(transport)) { listing in
                SearchResultCard(listing: listing, typeBadge: "Transport")
            }
        default:
            ForEach(allResults) { item in
                NavigationLink(value: item.listing) {
                    SearchResultCard(listing: item.listing, typeBadge: item.type.label)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var totalCount: Int {
        properties.count + tours.count + transport.count
    }

    private func tabCount(_ index: Int) -> Int {
        switch index {
        case 0: return totalCount
        case 1: return properties.count
        case 2: return tours.count
        case 3: return transport.count
        default: return 0
        }
    }

    private func sortListings(_ items: [Listing]) -> [Listing] {
        switch sortBy {
        case "price_low": return items.sorted { $0.pricePerNight < $1.pricePerNight }
        case "price_high": return items.sorted { $0.pricePerNight > $1.pricePerNight }
        case "rating": return items.sorted { ($0.rating ?? 0) > ($1.rating ?? 0) }
        default: return items
        }
    }

    private func sortItems(_ items: [SearchResultItem]) -> [SearchResultItem] {
        switch sortBy {
        case "price_low": return items.sorted { $0.listing.pricePerNight < $1.listing.pricePerNight }
        case "price_high": return items.sorted { $0.listing.pricePerNight > $1.listing.pricePerNight }
        case "rating": return items.sorted { ($0.listing.rating ?? 0) > ($1.listing.rating ?? 0) }
        default: return items
        }
    }

    private func search() async {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        loading = true
        errorMessage = nil
        do {
            let results = try await service?.searchAll(query: searchText)
            properties = results?.properties ?? []
            tours = results?.tours ?? []
            transport = results?.transport ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private enum SearchResultType {
    case property, tour, transport
    var label: String {
        switch self {
        case .property: return "Stay"
        case .tour: return "Tour"
        case .transport: return "Transport"
        }
    }
    var color: Color {
        switch self {
        case .property: return AppTheme.coral
        case .tour: return .green
        case .transport: return .blue
        }
    }
}

private struct SearchResultItem: Identifiable {
    let listing: Listing
    let type: SearchResultType
    var id: String { "\(type.label)-\(listing.id)" }
}

private struct SearchResultCard: View {
    let listing: Listing
    let typeBadge: String

    var body: some View {
        HStack(spacing: 12) {
            if let imageUrl = listing.mainImage ?? listing.images?.first,
               let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        Rectangle().fill(AppTheme.cardBackground)
                    }
                }
                .frame(width: 100, height: 80)
                .clipped()
                .cornerRadius(AppTheme.cornerRadiusSmall)
            } else {
                Image(systemName: iconForType)
                    .font(.title2)
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(width: 100, height: 80)
                    .background(AppTheme.cardBackground)
                    .cornerRadius(AppTheme.cornerRadiusSmall)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(typeBadge)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(badgeColor)
                        .cornerRadius(4)

                    if let rating = listing.rating {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 9))
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.system(size: 10))
                        }
                    }
                }

                Text(listing.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(2)

                Text(listing.location)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .lineLimit(1)

                HStack {
                    Text("\(listing.currency) \(Int(listing.pricePerNight))")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.coral)
                    Text(priceLabel)
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(10)
        .background(AppTheme.cardBackground)
        .cornerRadius(AppTheme.cornerRadiusMedium)
        .modifier(SoftShadow())
    }

    private var iconForType: String {
        switch typeBadge {
        case "Tour": return "map"
        case "Transport": return "car"
        default: return "building.2"
        }
    }

    private var badgeColor: Color {
        switch typeBadge {
        case "Tour": return .green
        case "Transport": return .blue
        default: return AppTheme.coral
        }
    }

    private var priceLabel: String {
        switch typeBadge {
        case "Tour": return "/ person"
        case "Transport": return "/ day"
        default: return "/ night"
        }
    }
}
