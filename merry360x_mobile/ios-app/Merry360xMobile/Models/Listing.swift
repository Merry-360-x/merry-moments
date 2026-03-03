import Foundation

struct Listing: Identifiable, Decodable {
    let id: String
    let hostId: String?
    let title: String
    let location: String
    let pricePerNight: Double
    let pricePerMonth: Double?
    let currency: String
    let isPublished: Bool?
    let monthlyOnlyListing: Bool?
    let images: [String]?
    let mainImage: String?
    let rating: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case hostId = "host_id"
        case title
        case name
        case location
        case pricePerNight = "price_per_night"
        case pricePerMonth = "price_per_month"
        case currency
        case isPublished = "is_published"
        case monthlyOnlyListing = "monthly_only_listing"
        case images
        case mainImage = "main_image"
        case rating
    }

    init(id: String, hostId: String?, title: String, location: String, pricePerNight: Double, pricePerMonth: Double?, currency: String, isPublished: Bool?, monthlyOnlyListing: Bool?, images: [String]? = nil, mainImage: String? = nil, rating: Double? = nil) {
        self.id = id
        self.hostId = hostId
        self.title = title
        self.location = location
        self.pricePerNight = pricePerNight
        self.pricePerMonth = pricePerMonth
        self.currency = currency
        self.isPublished = isPublished
        self.monthlyOnlyListing = monthlyOnlyListing
        self.images = images
        self.mainImage = mainImage
        self.rating = rating
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id = try container.decode(String.self, forKey: .id)
        let hostId = try container.decodeIfPresent(String.self, forKey: .hostId)
        let title = try container.decodeIfPresent(String.self, forKey: .title) ?? container.decodeIfPresent(String.self, forKey: .name) ?? "Untitled"
        let location = try container.decodeIfPresent(String.self, forKey: .location) ?? "Unknown"
        let price = try container.decodeIfPresent(Double.self, forKey: .pricePerNight) ?? 0
        let monthlyPrice = try container.decodeIfPresent(Double.self, forKey: .pricePerMonth)
        let currency = try container.decodeIfPresent(String.self, forKey: .currency) ?? "RWF"
        let isPublished = try container.decodeIfPresent(Bool.self, forKey: .isPublished)
        let monthlyOnlyListing = try container.decodeIfPresent(Bool.self, forKey: .monthlyOnlyListing)
        let images = try container.decodeIfPresent([String].self, forKey: .images)
        let mainImage = try container.decodeIfPresent(String.self, forKey: .mainImage)
        let rating = try container.decodeIfPresent(Double.self, forKey: .rating)

        self.init(id: id, hostId: hostId, title: title, location: location, pricePerNight: price, pricePerMonth: monthlyPrice, currency: currency, isPublished: isPublished, monthlyOnlyListing: monthlyOnlyListing, images: images, mainImage: mainImage, rating: rating)
    }
}
