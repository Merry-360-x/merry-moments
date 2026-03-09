import SwiftUI
import UIKit
import ImageIO

struct CategoryChip: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
}

struct HomeView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = HomeViewModel()
    @State private var showSearchSheet = false

    private var hasAnyContent: Bool {
        !viewModel.citySections.isEmpty || !viewModel.listings.isEmpty || !viewModel.tours.isEmpty || !viewModel.cars.isEmpty || !viewModel.events.isEmpty
    }

    private var showInitialLoader: Bool {
        viewModel.loading && !hasAnyContent
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                searchBar

                if showInitialLoader {
                    MerryLoadingStateView(
                        title: "Loading your stays",
                        subtitle: "Fetching cards and optimizing images...",
                        showCardSkeletons: true
                    )
                    .padding(.top, 6)
                }
                
                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if !showInitialLoader && !viewModel.citySections.isEmpty {
                    ForEach(viewModel.citySections) { section in
                        citySection(section)
                    }
                } else if !showInitialLoader && !viewModel.loading {
                    featuredSection
                }

                if !showInitialLoader {
                    categorySection(title: "Tour Packages", listings: viewModel.events, emptyText: "No tour packages available yet")
                    categorySection(title: "Tours", listings: viewModel.tours, emptyText: "No tours available yet")
                    categorySection(title: "Transport", listings: viewModel.cars, emptyText: "No transport available yet")
                }
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
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                if !listings.isEmpty {
                    seeAllLink(title: title, listings: listings)
                }
            }

            if listings.isEmpty {
                Text(emptyText)
                    .font(.system(size: 13))
                    .foregroundColor(AppTheme.textSecondary)
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
                    .foregroundColor(AppTheme.textSecondary)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Where to?")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppTheme.textPrimary)
                    Text("Anywhere · Any week · Add guests")
                        .font(.system(size: 12))
                        .foregroundColor(AppTheme.textSecondary)
                }
                
                Spacer()
                
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 14))
                    .foregroundColor(AppTheme.textPrimary)
                    .frame(width: 36, height: 36)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(AppTheme.borderSubtle, lineWidth: 1)
                    )
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 32))
            .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 2)
        }
    }

    private func citySection(_ section: CitySection) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Stays in \(section.city)")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                HStack(spacing: 10) {
                    Text("\(section.count)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(AppTheme.textSecondary)
                    if !section.listings.isEmpty {
                        seeAllLink(title: "Stays in \(section.city)", listings: section.listings)
                    }
                }
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
        NavigationLink {
            ListingDetailView(listing: listing)
                .environmentObject(session)
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                ZStack(alignment: .topTrailing) {
                    if let imageUrl = firstListingImageURL(from: listing),
                       let url = URL(string: imageUrl) {
                        OptimizedRemoteImage(url: url, targetSize: CGSize(width: 200, height: 140))
                            .frame(width: 200, height: 140)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    } else {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: 200, height: 140)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Image(systemName: "heart")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .padding(8)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(listing.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppTheme.textPrimary)
                        .lineLimit(1)

                    Text(listing.location)
                        .font(.system(size: 12))
                        .foregroundColor(AppTheme.textSecondary)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text("\(listing.currency) \(Int(listing.pricePerNight))")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(AppTheme.textPrimary)
                        Text("/ night")
                            .font(.system(size: 12))
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }
            }
            .frame(width: 200)
        }
        .buttonStyle(.plain)
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
            return optimizeCloudinaryCardURL(trimmed)
        }
        if trimmed.hasPrefix("//") {
            return optimizeCloudinaryCardURL("https:\(trimmed)")
        }
        if trimmed.hasPrefix("res.cloudinary.com/") {
            return optimizeCloudinaryCardURL("https://\(trimmed)")
        }

        let normalized = trimmed.hasPrefix("/") ? String(trimmed.dropFirst()) : trimmed
        let primaryCloud = "dghg9uebh"

        if normalized.hasPrefix("image/upload/") || normalized.hasPrefix("video/upload/") || normalized.hasPrefix("raw/upload/") {
            return optimizeCloudinaryCardURL("https://res.cloudinary.com/\(primaryCloud)/\(normalized)")
        }

        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_.~/"))
        let encoded = normalized.addingPercentEncoding(withAllowedCharacters: allowed) ?? normalized
        return "https://res.cloudinary.com/\(primaryCloud)/image/upload/f_auto,q_auto,dpr_auto,c_fill,w_400,h_280/\(encoded)"
    }

    private func optimizeCloudinaryCardURL(_ url: String) -> String {
        guard url.contains("res.cloudinary.com"),
              url.contains("/image/upload/") else {
            return url
        }

        // Do not override explicit transforms that already size/compress the image.
        if url.contains("/image/upload/f_auto,q_auto") || url.contains("/image/upload/c_fill") || url.contains("/image/upload/w_") {
            return url
        }

        return url.replacingOccurrences(of: "/image/upload/", with: "/image/upload/f_auto,q_auto,dpr_auto,c_fill,w_400,h_280/", options: .literal)
    }
    
    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Featured stays")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                if !viewModel.listings.isEmpty {
                    seeAllLink(title: "Featured stays", listings: viewModel.listings)
                }
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

    private func seeAllLink(title: String, listings: [Listing]) -> some View {
        NavigationLink {
            ListingCollectionView(title: title, listings: listings)
                .environmentObject(session)
        } label: {
            Text("See all")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(AppTheme.coral)
        }
        .buttonStyle(.plain)
    }
}

private final class OptimizedImageLoader: ObservableObject {
    @Published var image: UIImage?

    private static let decodedCache = NSCache<NSString, UIImage>()
    private let url: URL
    private let targetSize: CGSize
    private var task: Task<Void, Never>?

    init(url: URL, targetSize: CGSize) {
        self.url = url
        self.targetSize = targetSize
    }

    deinit {
        task?.cancel()
    }

    func load() {
        let cacheKey = "\(url.absoluteString)|\(Int(targetSize.width))x\(Int(targetSize.height))" as NSString
        if let cached = Self.decodedCache.object(forKey: cacheKey) {
            image = cached
            return
        }

        task?.cancel()
        task = Task { [weak self] in
            guard let self else { return }
            let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 30)

            do {
                let (data, _) = try await URLSession.shared.data(for: request)
                if Task.isCancelled { return }
                guard let decoded = Self.downsampledImage(from: data, to: targetSize) else { return }
                Self.decodedCache.setObject(decoded, forKey: cacheKey)
                await MainActor.run {
                    self.image = decoded
                }
            } catch {
                // Keep placeholder on failures.
            }
        }
    }

    private static func downsampledImage(from data: Data, to pointSize: CGSize) -> UIImage? {
        let scale = UIScreen.main.scale
        let maxDimension = max(pointSize.width, pointSize.height) * scale

        let cfData = data as CFData
        guard let source = CGImageSourceCreateWithData(cfData, nil) else {
            return UIImage(data: data)
        }

        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: maxDimension,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceShouldCache: true
        ]

        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return UIImage(data: data)
        }
        return UIImage(cgImage: cgImage)
    }
}

private struct OptimizedRemoteImage: View {
    let url: URL
    let targetSize: CGSize

    @StateObject private var loader: OptimizedImageLoader

    init(url: URL, targetSize: CGSize) {
        self.url = url
        self.targetSize = targetSize
        _loader = StateObject(wrappedValue: OptimizedImageLoader(url: url, targetSize: targetSize))
    }

    var body: some View {
        Group {
            if let image = loader.image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
            }
        }
        .onAppear {
            loader.load()
        }
    }
}

private struct ListingCollectionView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    let title: String
    let listings: [Listing]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                ForEach(listings) { listing in
                    NavigationLink {
                        ListingDetailView(listing: listing)
                            .environmentObject(session)
                    } label: {
                        VStack(alignment: .leading, spacing: 10) {
                            if let imageUrl = firstListingImageURL(from: listing),
                               let url = URL(string: imageUrl) {
                                OptimizedRemoteImage(url: url, targetSize: CGSize(width: 360, height: 220))
                                    .frame(height: 180)
                                    .frame(maxWidth: .infinity)
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            } else {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(height: 180)
                                    .frame(maxWidth: .infinity)
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text(listing.title)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(AppTheme.textPrimary)
                                    .lineLimit(1)

                                Text(listing.location)
                                    .font(.system(size: 13))
                                    .foregroundColor(AppTheme.textSecondary)
                                    .lineLimit(1)

                                Text("\(listing.currency) \(Int(listing.pricePerNight)) / night")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(AppTheme.textPrimary)
                            }
                        }
                        .padding(12)
                        .background(AppTheme.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
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
            return optimizeCloudinaryCardURL(trimmed)
        }
        if trimmed.hasPrefix("//") {
            return optimizeCloudinaryCardURL("https:\(trimmed)")
        }
        if trimmed.hasPrefix("res.cloudinary.com/") {
            return optimizeCloudinaryCardURL("https://\(trimmed)")
        }

        let normalized = trimmed.hasPrefix("/") ? String(trimmed.dropFirst()) : trimmed
        let primaryCloud = "dghg9uebh"

        if normalized.hasPrefix("image/upload/") || normalized.hasPrefix("video/upload/") || normalized.hasPrefix("raw/upload/") {
            return optimizeCloudinaryCardURL("https://res.cloudinary.com/\(primaryCloud)/\(normalized)")
        }

        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_.~/"))
        let encoded = normalized.addingPercentEncoding(withAllowedCharacters: allowed) ?? normalized
        return "https://res.cloudinary.com/\(primaryCloud)/image/upload/f_auto,q_auto,dpr_auto,c_fill,w_720,h_440/\(encoded)"
    }

    private func optimizeCloudinaryCardURL(_ url: String) -> String {
        guard url.contains("res.cloudinary.com"),
              url.contains("/image/upload/") else {
            return url
        }

        if url.contains("/image/upload/f_auto,q_auto") || url.contains("/image/upload/c_fill") || url.contains("/image/upload/w_") {
            return url
        }

        return url.replacingOccurrences(of: "/image/upload/", with: "/image/upload/f_auto,q_auto,dpr_auto,c_fill,w_720,h_440/", options: .literal)
    }
}

#Preview {
    NavigationStack { HomeView() }
        .environmentObject(AppSessionViewModel())
}
