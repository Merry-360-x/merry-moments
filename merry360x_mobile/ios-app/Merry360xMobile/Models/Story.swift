import Foundation

struct Story: Identifiable, Decodable {
    let id: String
    let title: String
    let imageUrl: String?
    let mediaUrl: String?
    let location: String?
    let userId: String
    let createdAt: String?

    var displayImage: String? {
        imageUrl ?? mediaUrl
    }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case imageUrl = "image_url"
        case mediaUrl = "media_url"
        case location
        case userId = "user_id"
        case createdAt = "created_at"
    }
}
