import SwiftUI

struct TransportBrowseView: View {
    @EnvironmentObject private var session: AppSessionViewModel
    @State private var selectedTab = 0
    @State private var vehicles: [Listing] = []
    @State private var airportRoutes: [[String: Any]] = []
    @State private var carRentals: [[String: Any]] = []
    @State private var loading = false
    @State private var searchText = ""
    @State private var errorMessage: String?

    private let service = SupabaseService()
    private let tabs = ["All Vehicles", "Airport Transfer", "Car Rental", "Intercity"]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Search bar
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(AppTheme.textSecondary)
                    TextField("Search transport...", text: $searchText)
                        .textFieldStyle(.plain)
                        .onSubmit { Task { await loadData() } }
                }
                .padding(12)
                .background(AppTheme.cardBackground)
                .cornerRadius(AppTheme.cornerRadiusMedium)

                // Category tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(tabs.enumerated()), id: \.offset) { idx, tab in
                            Button {
                                selectedTab = idx
                                Task { await loadData() }
                            } label: {
                                Text(tab)
                                    .font(.caption)
                                    .fontWeight(selectedTab == idx ? .semibold : .regular)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(selectedTab == idx ? AppTheme.coral : AppTheme.cardBackground)
                                    .foregroundColor(selectedTab == idx ? .white : AppTheme.textPrimary)
                                    .cornerRadius(20)
                            }
                        }
                    }
                }

                if loading && vehicles.isEmpty && airportRoutes.isEmpty && carRentals.isEmpty {
                    MerryLoadingStateView(
                        title: "Finding transport",
                        subtitle: "Loading vehicles and routes...",
                        showCardSkeletons: true
                    )
                } else if let error = errorMessage {
                    Text(error).font(.caption).foregroundColor(.red)
                } else {
                    switch selectedTab {
                    case 0: allVehiclesSection
                    case 1: airportTransferSection
                    case 2: carRentalSection
                    case 3: intercitySection
                    default: allVehiclesSection
                    }
                }
            }
            .padding(16)
        }
        .background(AppTheme.appBackground)
        .navigationTitle("Transport")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadData() }
    }

    @ViewBuilder
    private var allVehiclesSection: some View {
        if vehicles.isEmpty {
            emptyCard(icon: "car", title: "No vehicles found", subtitle: "Try adjusting your search")
        } else {
            ForEach(vehicles) { vehicle in
                TransportVehicleCard(listing: vehicle)
            }
        }
    }

    @ViewBuilder
    private var airportTransferSection: some View {
        if airportRoutes.isEmpty {
            emptyCard(icon: "airplane", title: "No airport transfers available", subtitle: "Check back later for airport transfer routes")
        } else {
            ForEach(Array(airportRoutes.enumerated()), id: \.offset) { _, route in
                AirportRouteCard(route: route)
            }
        }
    }

    @ViewBuilder
    private var carRentalSection: some View {
        if carRentals.isEmpty {
            emptyCard(icon: "car.2", title: "No car rentals available", subtitle: "Check back later")
        } else {
            ForEach(Array(carRentals.enumerated()), id: \.offset) { _, car in
                CarRentalCard(car: car)
            }
        }
    }

    @ViewBuilder
    private var intercitySection: some View {
        let intercity = vehicles
        if intercity.isEmpty {
            emptyCard(icon: "bus", title: "No intercity transport available", subtitle: "Check back later")
        } else {
            ForEach(intercity) { vehicle in
                TransportVehicleCard(listing: vehicle)
            }
        }
    }

    @ViewBuilder
    private func emptyCard(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundColor(AppTheme.textSecondary)
            Text(title)
                .font(.headline)
            Text(subtitle)
                .font(.caption)
                .foregroundColor(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(AppTheme.cardBackground)
        .cornerRadius(AppTheme.cornerRadiusMedium)
    }

    private func loadData() async {
        loading = true
        errorMessage = nil
        do {
            switch selectedTab {
            case 1:
                airportRoutes = try await service?.fetchAirportTransferRoutes() ?? []
            case 2:
                carRentals = try await service?.fetchCarRentals() ?? []
            case 3:
                vehicles = try await service?.fetchTransportVehicles(serviceType: "intercity", search: searchText.isEmpty ? nil : searchText) ?? []
            default:
                vehicles = try await service?.fetchTransportVehicles(search: searchText.isEmpty ? nil : searchText) ?? []
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}

private struct TransportVehicleCard: View {
    let listing: Listing

    var body: some View {
        HStack(spacing: 12) {
            if let imageUrl = listing.mainImage ?? listing.images?.first,
               let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        Image(systemName: "car.fill")
                            .font(.title)
                            .foregroundColor(AppTheme.textSecondary)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(AppTheme.cardBackground)
                    }
                }
                .frame(width: 110, height: 90)
                .clipped()
                .cornerRadius(10)
            } else {
                Image(systemName: "car.fill")
                    .font(.title)
                    .foregroundColor(AppTheme.textSecondary)
                    .frame(width: 110, height: 90)
                    .background(AppTheme.cardBackground)
                    .cornerRadius(10)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(listing.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(2)

                Text(listing.location)
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                    .lineLimit(1)

                Spacer()

                HStack {
                    Text("\(listing.currency) \(Int(listing.pricePerNight))")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.coral)
                    Text("/ day")
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
}

private struct AirportRouteCard: View {
    let route: [String: Any]

    private var from: String { (route["from_location"] as? String) ?? "Airport" }
    private var to: String { (route["to_location"] as? String) ?? "City" }
    private var price: Double {
        if let d = route["base_price"] as? Double { return d }
        if let i = route["base_price"] as? Int { return Double(i) }
        return 0
    }
    private var currency: String { (route["currency"] as? String) ?? "USD" }

    var body: some View {
        HStack(spacing: 12) {
            VStack(spacing: 4) {
                Image(systemName: "airplane.departure")
                    .font(.title2)
                    .foregroundColor(AppTheme.coral)
                Image(systemName: "arrow.down")
                    .font(.caption)
                    .foregroundColor(AppTheme.textSecondary)
                Image(systemName: "mappin.circle.fill")
                    .font(.title3)
                    .foregroundColor(AppTheme.coral)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(from)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(to)
                    .font(.subheadline)
                    .foregroundColor(AppTheme.textSecondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("\(currency) \(Int(price))")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(AppTheme.coral)
                Text("base price")
                    .font(.caption2)
                    .foregroundColor(AppTheme.textSecondary)
            }
        }
        .padding(14)
        .background(AppTheme.cardBackground)
        .cornerRadius(AppTheme.cornerRadiusMedium)
        .modifier(SoftShadow())
    }
}

private struct CarRentalCard: View {
    let car: [String: Any]

    private var title: String { (car["title"] as? String) ?? "\(brand) \(model)" }
    private var brand: String { (car["brand"] as? String) ?? "" }
    private var model: String { (car["model"] as? String) ?? "" }
    private var year: Int { (car["year"] as? Int) ?? 0 }
    private var seats: Int { (car["seats"] as? Int) ?? 0 }
    private var transmission: String { (car["transmission"] as? String) ?? "" }
    private var fuelType: String { (car["fuel_type"] as? String) ?? "" }
    private var price: Double {
        if let d = car["price_per_day"] as? Double { return d }
        if let d = car["daily_price"] as? Double { return d }
        if let i = car["price_per_day"] as? Int { return Double(i) }
        if let i = car["daily_price"] as? Int { return Double(i) }
        return 0
    }
    private var currency: String { (car["currency"] as? String) ?? "USD" }
    private var isVerified: Bool { (car["is_verified"] as? Bool) ?? false }

    private var imageUrl: String? {
        if let url = car["image_url"] as? String, !url.isEmpty { return url }
        if let ext = car["exterior_images"] as? [String], let first = ext.first { return first }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                if let imgUrl = imageUrl, let url = URL(string: imgUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(16/10, contentMode: .fill)
                        default:
                            carPlaceholder
                        }
                    }
                    .frame(height: 170)
                    .clipped()
                } else {
                    carPlaceholder
                }

                if isVerified {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption2)
                        Text("Verified")
                            .font(.caption2)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppTheme.cardBackground)
                    .cornerRadius(12)
                    .padding(8)
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(title.isEmpty ? "\(brand) \(model)" : title)
                    .font(.headline)
                    .lineLimit(1)

                if year > 0 {
                    Text("\(String(year)) • \(seats) seats")
                        .font(.caption)
                        .foregroundColor(AppTheme.textSecondary)
                }

                HStack(spacing: 12) {
                    if !transmission.isEmpty {
                        Label(transmission.capitalized, systemImage: "gearshape")
                            .font(.caption2)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                    if !fuelType.isEmpty {
                        Label(fuelType.capitalized, systemImage: "fuelpump")
                            .font(.caption2)
                            .foregroundColor(AppTheme.textSecondary)
                    }
                }

                HStack {
                    Spacer()
                    Text("\(currency) \(Int(price))")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.coral)
                    Text("/ day")
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

    private var carPlaceholder: some View {
        Image(systemName: "car.fill")
            .font(.system(size: 40))
            .foregroundColor(AppTheme.textSecondary)
            .frame(height: 170)
            .frame(maxWidth: .infinity)
            .background(AppTheme.cardBackground)
    }
}
