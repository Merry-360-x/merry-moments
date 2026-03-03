import Foundation

struct CitySection: Identifiable {
    let id = UUID()
    let city: String
    let count: Int
    var listings: [Listing] = []
}

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var listings: [Listing] = []
    @Published var tours: [Listing] = []
    @Published var cars: [Listing] = []
    @Published var events: [Listing] = []
    @Published var citySections: [CitySection] = []
    @Published var cities: [(city: String, count: Int)] = []
    @Published var loading = false
    @Published var errorMessage: String?

    private let service = SupabaseService()

    private func extractRegion(from location: String) -> String {
        let tokens = location
            .split(separator: ",")
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        if tokens.isEmpty { return "Other" }
        if tokens.count == 1 { return tokens[0] }

        let broadValues = Set([
            "kigali", "rwanda", "rw", "gasabo", "nyarugenge", "kicukiro",
            "rubavu", "musanze", "huye", "bugesera", "nyanza", "karongi"
        ])

        let first = tokens[0].lowercased()
        if broadValues.contains(first) {
            return tokens[1]
        }

        return tokens[0]
    }

    func load() async {
        guard let service else {
            errorMessage = "MobileConfig is not set. Add Supabase URL + anon key first."
            return
        }

        loading = true
        errorMessage = nil
        do {
            async let stayTask = service.fetchFeaturedListings(limit: 1000)
            async let toursTask = service.fetchTours(limit: 300)
            async let carsTask = service.fetchCars(limit: 300)
            async let eventsTask = service.fetchEvents(limit: 300)

            let stayRows = try await stayTask
            let tourRows = try await toursTask
            let carRows = try await carsTask
            let eventRows = try await eventsTask

            listings = stayRows
            tours = tourRows
            cars = carRows
            events = eventRows

            var grouped: [String: [Listing]] = [:]
            for listing in stayRows {
                let region = extractRegion(from: listing.location)
                grouped[region, default: []].append(listing)
            }

            let sortedSections = grouped
                .map { key, value in
                    CitySection(city: key, count: value.count, listings: value)
                }
                .sorted { lhs, rhs in
                    if lhs.count == rhs.count {
                        return lhs.city.localizedCaseInsensitiveCompare(rhs.city) == .orderedAscending
                    }
                    return lhs.count > rhs.count
                }

            citySections = sortedSections
            cities = sortedSections.map { (city: $0.city, count: $0.count) }
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}
