import SwiftUI

struct CategoryChip: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
}

struct HomeView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = HomeViewModel()
    @State private var showSearchSheet = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                searchBar
                
                if viewModel.loading {
                    ProgressView("Loading...")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                }
                
                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if !viewModel.citySections.isEmpty {
                    ForEach(viewModel.citySections) { section in
                        citySection(section)
                    }
                } else if !viewModel.loading {
                    featuredSection
                }

                categorySection(title: "Tour Packages", listings: viewModel.events, emptyText: "No tour packages available yet")
                categorySection(title: "Tours", listings: viewModel.tours, emptyText: "No tours available yet")
                categorySection(title: "Transport", listings: viewModel.cars, emptyText: "No transport available yet")
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .task {
            await viewModel.load()
        }
        .fullScreenCover(isPresented: $showSearchSheet) {
            SearchSheet(isPresented: $showSearchSheet)
        }
    }

    private func categorySection(title: String, listings: [Listing], emptyText: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title)
                    .font(.system(size: 20, weight: .bold))
                Spacer()
                if !listings.isEmpty {
                    Text("See all")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppTheme.coral)
                }
            }

            if listings.isEmpty {
                Text(emptyText)
                    .font(.system(size: 13))
                    .foregroundColor(.gray)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(listings) { listing in
                            listingCard(listing)
                        }
                    }
                }
            }
        }
        .padding(.top, 8)
    }

    private var searchBar: some View {
        Button(action: { showSearchSheet = true }) {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18))
                    .foregroundColor(.gray)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Where to?")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.black)
                    Text("Anywhere · Any week · Add guests")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 14))
                    .foregroundColor(.black)
                    .frame(width: 36, height: 36)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 32))
            .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 2)
        }
    }

    private func citySection(_ section: CitySection) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Stays in \(section.city)")
                    .font(.system(size: 20, weight: .bold))
                Spacer()
                Text("\(section.count)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.gray)
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(section.listings) { listing in
                        listingCard(listing)
                    }
                }
            }
        }
        .padding(.top, 8)
    }
    
    private func listingCard(_ listing: Listing) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // Image placeholder
            ZStack(alignment: .topTrailing) {
                if let imageUrl = firstListingImageURL(from: listing),
                   let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                    }
                    .frame(width: 200, height: 140)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 200, height: 140)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                
                // Favorite button
                Button(action: {}) {
                    Image(systemName: "heart")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                }
                .padding(8)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(listing.title)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
                
                Text(listing.location)
                    .font(.system(size: 12))
                    .foregroundColor(.gray)
                    .lineLimit(1)
                
                HStack(spacing: 4) {
                    Text("\(listing.currency) \(Int(listing.pricePerNight))")
                        .font(.system(size: 14, weight: .semibold))
                    Text("/ night")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
            }
        }
        .frame(width: 200)
    }

    private func firstListingImageURL(from listing: Listing) -> String? {
        let refs = ((listing.images ?? []) + [listing.mainImage].compactMap { $0 })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        guard let firstImageRef = refs.first(where: isProbablyImageMedia) else {
            return nil
        }
        return resolveCloudinaryMediaReference(firstImageRef)
    }

    private func isProbablyImageMedia(_ value: String) -> Bool {
        let lower = value.lowercased()
        if lower.contains("/video/upload/") || lower.contains(".mp4") || lower.contains(".mov") || lower.contains(".webm") {
            return false
        }
        if lower.contains("/image/upload/") {
            return true
        }
        if lower.hasPrefix("http://") || lower.hasPrefix("https://") || lower.hasPrefix("//") {
            return lower.contains(".jpg") ||
                lower.contains(".jpeg") ||
                lower.contains(".png") ||
                lower.contains(".webp") ||
                lower.contains(".gif") ||
                lower.contains(".avif") ||
                lower.contains(".heic")
        }
        return true
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
    
    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Featured stays")
                    .font(.system(size: 20, weight: .bold))
                Spacer()
                Text("See all")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AppTheme.coral)
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.listings) { listing in
                        listingCard(listing)
                    }
                }
            }
        }
    }
}

#Preview {
    NavigationStack { HomeView() }
        .environmentObject(AppSessionViewModel())
}
