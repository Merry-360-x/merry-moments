import SwiftUI

struct ListingDetailView: View {
    var mediaRefs: [String] = []

    var body: some View {
        VStack(spacing: 12) {
            if let firstImage = firstListingImageURL(from: mediaRefs),
               let url = URL(string: firstImage) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle().fill(Color.gray.opacity(0.45))
                }
                .frame(height: 220)
                .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.45))
                    .frame(height: 220)
                    .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
            }

            detailCard
            aboutCard
            Spacer()
            bookingBar
        }
        .padding(16)
        .background(AppTheme.appBackground)
        .navigationTitle("Listing")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var detailCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Kigali Hills Apartment")
                .font(.title3.bold())
            Text("Kiyovu · 4.8 ★ (128 reviews)")
                .font(.caption)
                .foregroundColor(.gray)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                meta("2 guests")
                meta("1 bedroom")
                meta("1 bed")
                meta("Fast Wi‑Fi")
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
        .softShadow()
    }

    private func firstListingImageURL(from refs: [String]) -> String? {
        let normalized = refs
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard let firstImageRef = normalized.first(where: isProbablyImageMedia) else {
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

    private var aboutCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About this place")
                .font(.headline)
            Text("Modern apartment with city skyline views, walkable restaurants, and premium comfort for short and long stays.")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
        .softShadow()
    }

    private var bookingBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("RWF 95,000")
                    .font(.headline)
                Text("/ night")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            Spacer()
            Button("Reserve") {}
                .font(.headline)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .foregroundColor(.white)
                .background(AppTheme.coral)
                .clipShape(Capsule())
        }
        .padding(12)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusLarge, style: .continuous))
        .softShadow()
    }

    private func meta(_ text: String) -> some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white)
            .clipShape(Capsule())
    }
}

#Preview {
    NavigationStack { ListingDetailView() }
}
