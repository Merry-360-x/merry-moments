import SwiftUI

struct ToursBrowseView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var tours: [Listing] = []
    @State private var loading = false
    @State private var searchText = ""
    @State private var selectedCategory: String?
    @State private var selectedDuration: String?
    @State private var errorMessage: String?

    private let service = SupabaseService()

    private let categories = ["Nature", "Adventure", "Cultural", "Wildlife", "Historical"]
    private let durations = ["Half Day", "Full Day", "Multi-Day"]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Search bar
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(AppTheme.textSecondary)
                    TextField("Search tours...", text: $searchText)
                        .textFieldStyle(.plain)
                        .onSubmit { Task { await loadTours() } }
                }
                .padding(12)
                .background(AppTheme.cardBackground)
                .cornerRadius(AppTheme.cornerRadiusMedium)

                // Category filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", isSelected: selectedCategory == nil) {
                            selectedCategory = nil
                            Task { await loadTours() }
                        }
                        ForEach(categories, id: \.self) { cat in
                            FilterChip(title: cat, isSelected: selectedCategory == cat) {
                                selectedCategory = selectedCategory == cat ? nil : cat
                                Task { await loadTours() }
                            }
                        }
                    }
                }

                // Duration filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(durations, id: \.self) { dur in
                            FilterChip(title: dur, isSelected: selectedDuration == dur) {
                                selectedDuration = selectedDuration == dur ? nil : dur
                                Task { await loadTours() }
                            }
                        }
                    }
                }

                if loading && tours.isEmpty {
                    MerryLoadingStateView(
                        title: "Finding tours",
                        subtitle: "Searching for the best experiences...",
                        showCardSkeletons: true
                    )
                } else if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                } else if tours.isEmpty {
                    ContentUnavailableCard(
                        icon: "map",
                        title: "No tours found",
                        subtitle: "Try adjusting your filters or search terms"
                    )
                } else {
                    ForEach(tours) { tour in
                        NavigationLink(value: tour) {
                            TourBrowseCard(listing: tour)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Tours")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: Listing.self) { listing in
            ListingDetailView(listing: listing)
                .environmentObject(session)
        }
        .task { await loadTours() }
    }

    private func loadTours() async {
        loading = true
        errorMessage = nil
        do {
            tours = try await service?.fetchToursFiltered(
                search: searchText.isEmpty ? nil : searchText,
                category: selectedCategory,
                duration: selectedDuration?.lowercased().replacingOccurrences(of: " ", with: "_")
            ) ?? []
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct TourBrowseCard: View {
    let listing: Listing

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image
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
                .frame(height: 180)
                .clipped()
                .cornerRadius(AppTheme.cornerRadiusMedium, corners: [.topLeft, .topRight])
            } else {
                Rectangle().fill(AppTheme.cardBackground)
                    .frame(height: 180)
                    .cornerRadius(AppTheme.cornerRadiusMedium, corners: [.topLeft, .topRight])
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(listing.title)
                    .font(.headline)
                    .lineLimit(2)

                HStack(spacing: 4) {
                    Image(systemName: "mappin")
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                    Text(listing.location)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .lineLimit(1)
                }

                HStack {
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
                    Spacer()
                    Text("\(listing.currency) \(Int(listing.pricePerNight))")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(AppTheme.coral)
                    Text("/ person")
                        .font(.caption2)
                        .foregroundColor(AppTheme.textSecondary)
                }
            }
            .padding(12)
        }
        .background(AppTheme.cardBackground)
        .cornerRadius(AppTheme.cornerRadiusMedium)
        .modifier(SoftShadow())
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? AppTheme.coral : AppTheme.cardBackground)
                .foregroundColor(isSelected ? .white : AppTheme.textPrimary)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isSelected ? Color.clear : Color.gray.opacity(0.3), lineWidth: 1)
                )
        }
    }
}

struct ContentUnavailableCard: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 44))
                .foregroundColor(AppTheme.textSecondary)
            Text(title)
                .font(.headline)
            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(maxWidth: .infinity)
    }
}

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCornerShape(radius: radius, corners: corners))
    }
}

struct RoundedCornerShape: Shape {
    var radius: CGFloat
    var corners: UIRectCorner

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}
