import SwiftUI
import UIKit
import ImageIO
import PhotosUI

struct CategoryChip: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
}

struct HomeView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @StateObject private var viewModel = HomeViewModel()
    @State private var showSearchSheet = false
    @State private var showCreateStorySheet = false
    @State private var storyInfoMessage: String?

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

                // Stories row - always show (with add button even if no stories)
                storiesRow

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
        .sheet(isPresented: $showCreateStorySheet) {
            NavigationStack {
                HomeCreateStorySheet {
                    await viewModel.load()
                }
                .environmentObject(session)
                .navigationTitle("Create Story")
                .navigationBarTitleDisplayMode(.inline)
            }
        }
        .alert(
            "Story",
            isPresented: Binding(
                get: { storyInfoMessage != nil },
                set: { if !$0 { storyInfoMessage = nil } }
            )
        ) {
            Button("OK", role: .cancel) { storyInfoMessage = nil }
        } message: {
            Text(storyInfoMessage ?? "")
        }
    }

    private func categorySection(title: String, listings: [Listing], emptyText: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(AppTheme.textPrimary)
                Spacer()
                if listings.count > 15 {
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
                        ForEach(listings.prefix(15)) { listing in
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

    private var storiesRow: some View {
        StoriesRow(
            stories: viewModel.stories,
            isLoggedIn: session.isAuthenticated,
            onAddStory: {
                if session.isAuthenticated {
                    showCreateStorySheet = true
                } else {
                    storyInfoMessage = "Login required to publish a story."
                }
            }
        )
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
                    if section.listings.count > 15 {
                        seeAllLink(title: "Stays in \(section.city)", listings: section.listings)
                    }
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(section.listings.prefix(15)) { listing in
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
                if viewModel.listings.count > 15 {
                    seeAllLink(title: "Featured stays", listings: viewModel.listings)
                }
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.listings.prefix(15)) { listing in
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

private struct HomeCreateStorySheet: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var location = ""
    @State private var storyBody = ""
    @State private var mediaURL = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var saving = false
    @State private var uploading = false
    @State private var statusMessage: String?

    private let service = SupabaseService()
    let onPublished: () async -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                inputField(label: "Title", text: $title, placeholder: "My favorite place in Rwanda")
                inputField(label: "Location (optional)", text: $location, placeholder: "Kigali, Rwanda")

                VStack(alignment: .leading, spacing: 6) {
                    Text("Story")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                    TextEditor(text: $storyBody)
                        .frame(minHeight: 140)
                        .padding(8)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                inputField(label: "Media URL (optional)", text: $mediaURL, placeholder: "https://...")

                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    Text(uploading ? "Uploading image..." : "Upload Image to Cloudinary")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundColor(.black)
                        .background(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 999, style: .continuous)
                                .stroke(AppTheme.borderSubtle, lineWidth: 1)
                        )
                        .clipShape(Capsule())
                }
                .disabled(uploading || saving)

                if let statusMessage {
                    Text(statusMessage)
                        .font(.caption)
                        .foregroundColor(statusMessage.hasPrefix("Could") ? .red : AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button(saving ? "Publishing..." : "Publish Story") {
                    Task { await publish() }
                }
                .disabled(saving || uploading)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundColor(.white)
                .background(AppTheme.coral)
                .clipShape(Capsule())
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .onChange(of: selectedPhoto) { newItem in
            guard let newItem else { return }
            Task { await uploadSelectedPhoto(newItem) }
        }
    }

    private func inputField(label: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
            TextField(placeholder, text: text)
                .textInputAutocapitalization(.sentences)
                .padding(12)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func uploadSelectedPhoto(_ item: PhotosPickerItem) async {
        uploading = true
        statusMessage = nil

        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                throw NSError(domain: "HomeCreateStorySheet", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not read selected image."])
            }

            guard let image = UIImage(data: data),
                  let jpeg = image.jpegData(compressionQuality: 0.85) else {
                throw NSError(domain: "HomeCreateStorySheet", code: 2, userInfo: [NSLocalizedDescriptionKey: "Selected file is not a valid image."])
            }

            let fileName = "story-\(UUID().uuidString).jpg"
            let uploadedURL = try await HomeCloudinaryService.uploadImage(data: jpeg, fileName: fileName)
            mediaURL = uploadedURL
            statusMessage = "Image uploaded and attached."
        } catch {
            statusMessage = "Could not upload image: \(error.localizedDescription)"
        }

        uploading = false
    }

    private func publish() async {
        guard let service else {
            statusMessage = "Supabase is not configured."
            return
        }
        guard let userId = session.userId else {
            statusMessage = "Login required to publish a story."
            return
        }

        let safeTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let safeBody = storyBody.trimmingCharacters(in: .whitespacesAndNewlines)
        if safeTitle.isEmpty || safeBody.isEmpty {
            statusMessage = "Title and story body are required."
            return
        }

        saving = true
        do {
            try await service.createStory(
                userId: userId,
                title: safeTitle,
                body: safeBody,
                location: location.trimmingCharacters(in: .whitespacesAndNewlines),
                mediaURL: mediaURL.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            await onPublished()
            dismiss()
        } catch {
            statusMessage = "Could not publish story: \(error.localizedDescription)"
        }
        saving = false
    }
}

private enum HomeCloudinaryService {
    static func uploadImage(data: Data, fileName: String = "story.jpg") async throws -> String {
        let cloudName = MobileConfig.cloudinaryCloudName.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        let uploadPreset = MobileConfig.cloudinaryUploadPreset.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)

        guard !cloudName.isEmpty, !uploadPreset.isEmpty else {
            throw NSError(
                domain: "HomeCloudinaryService",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Cloudinary is not configured."]
            )
        }

        let endpoint = "https://api.cloudinary.com/v1_1/\(cloudName)/image/upload"
        guard let url = URL(string: endpoint) else {
            throw NSError(
                domain: "HomeCloudinaryService",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Invalid Cloudinary endpoint."]
            )
        }

        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.appendMultipartField(name: "upload_preset", value: uploadPreset, boundary: boundary)
        body.appendMultipartField(name: "folder", value: "stories/mobile", boundary: boundary)
        body.appendMultipartFile(
            name: "file",
            fileName: fileName,
            mimeType: "image/jpeg",
            data: data,
            boundary: boundary
        )
        body.append("--\(boundary)--\r\n".data(using: .utf8) ?? Data())

        request.httpBody = body

        let (responseData, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw NSError(
                domain: "HomeCloudinaryService",
                code: 3,
                userInfo: [NSLocalizedDescriptionKey: "No response from Cloudinary."]
            )
        }

        guard (200...299).contains(http.statusCode) else {
            let message = parseCloudinaryError(from: responseData) ?? "Upload failed (\(http.statusCode))."
            throw NSError(
                domain: "HomeCloudinaryService",
                code: 4,
                userInfo: [NSLocalizedDescriptionKey: message]
            )
        }

        guard
            let json = try JSONSerialization.jsonObject(with: responseData) as? [String: Any],
            let secureURL = json["secure_url"] as? String,
            !secureURL.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines).isEmpty
        else {
            throw NSError(
                domain: "HomeCloudinaryService",
                code: 5,
                userInfo: [NSLocalizedDescriptionKey: "Upload succeeded but no URL was returned."]
            )
        }

        return secureURL
    }

    private static func parseCloudinaryError(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return String(data: data, encoding: .utf8)
        }

        if let error = json["error"] as? [String: Any],
           let message = error["message"] as? String,
           !message.isEmpty {
            return message
        }

        if let message = json["message"] as? String, !message.isEmpty {
            return message
        }

        return nil
    }
}

private extension Data {
    mutating func appendMultipartField(name: String, value: String, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
        append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8) ?? Data())
        append("\(value)\r\n".data(using: .utf8) ?? Data())
    }

    mutating func appendMultipartFile(name: String, fileName: String, mimeType: String, data: Data, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
        append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8) ?? Data())
        append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8) ?? Data())
        append(data)
        append("\r\n".data(using: .utf8) ?? Data())
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

// MARK: - Stories Row

private struct StoriesRow: View {
    let stories: [Story]
    let isLoggedIn: Bool
    var onAddStory: () -> Void = {}

    private let storyRingGradient = LinearGradient(
        colors: [Color(red: 1.0, green: 0.42, blue: 0.42), Color(red: 1.0, green: 0.85, blue: 0.24), Color(red: 1.0, green: 0.42, blue: 0.42)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 14) {
                // "Your Story" / Add button
                addStoryButton

                ForEach(stories) { story in
                    storyBubble(story)
                }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 12)
        }
    }

    private var addStoryButton: some View {
        Button(action: onAddStory) {
            VStack(spacing: 5) {
                ZStack {
                    Circle()
                        .fill(isLoggedIn ? AppTheme.coral : Color.gray.opacity(0.2))
                        .frame(width: 64, height: 64)
                    Image(systemName: "plus")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundColor(isLoggedIn ? .white : AppTheme.textSecondary)
                }
                Text("Your Story")
                    .font(.system(size: 10))
                    .foregroundColor(AppTheme.textSecondary)
                    .lineLimit(1)
            }
            .frame(width: 66)
        }
        .buttonStyle(.plain)
    }

    private func storyBubble(_ story: Story) -> some View {
        VStack(spacing: 5) {
            ZStack {
                Circle()
                    .strokeBorder(storyRingGradient, lineWidth: 2.5)
                    .frame(width: 64, height: 64)

                if let imageUrl = story.displayImage, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        default:
                            storyPlaceholder(story)
                        }
                    }
                    .frame(width: 58, height: 58)
                    .clipShape(Circle())
                } else {
                    storyPlaceholder(story)
                }
            }

            Text(story.location ?? story.title)
                .font(.system(size: 10))
                .foregroundColor(AppTheme.textSecondary)
                .lineLimit(1)
        }
        .frame(width: 66)
    }

    private func storyPlaceholder(_ story: Story) -> some View {
        ZStack {
            Circle()
                .fill(LinearGradient(colors: [Color(red: 0.24, green: 0.24, blue: 0.24), Color(red: 0.1, green: 0.1, blue: 0.1)], startPoint: .top, endPoint: .bottom))
                .frame(width: 58, height: 58)
            Text(String(story.title.prefix(1)).uppercased())
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)
        }
    }
}
