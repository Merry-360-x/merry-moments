import Foundation

struct MobileAuthSession {
    let userId: String
    let accessToken: String
}

final class SupabaseService {
    private let baseURL: URL
    private let anonKey: String
    private let apiBaseURL: String
    private let sessionUserIdKey = "mobile.auth.userId"
    private let sessionAccessTokenKey = "mobile.auth.accessToken"

    init?() {
        guard let url = URL(string: MobileConfig.supabaseUrl), MobileConfig.isConfigured else {
            return nil
        }
        self.baseURL = url
        self.anonKey = MobileConfig.supabaseAnonKey
        self.apiBaseURL = MobileConfig.apiBaseUrl
    }

    func oauthAuthorizeURL(provider: String, redirectTo: String = "merry360x://auth/callback") -> URL? {
        var components = URLComponents(url: baseURL.appendingPathComponent("auth/v1/authorize"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "provider", value: provider),
            URLQueryItem(name: "redirect_to", value: redirectTo)
        ]
        return components?.url
    }

    func signInFromOAuthCallback(_ url: URL) async throws -> MobileAuthSession {
        guard let accessToken = extractOAuthAccessToken(from: url), !accessToken.isEmpty else {
            throw NSError(domain: "SupabaseService", code: 6, userInfo: [NSLocalizedDescriptionKey: "Missing OAuth access token"])
        }

        let userId = try await fetchUserId(accessToken: accessToken)
        storeSession(userId: userId, accessToken: accessToken)
        return MobileAuthSession(userId: userId, accessToken: accessToken)
    }

    private func extractOAuthAccessToken(from url: URL) -> String? {
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let queryToken = components.queryItems?.first(where: { $0.name == "access_token" })?.value,
           !queryToken.isEmpty {
            return queryToken
        }

        let absolute = url.absoluteString
        guard let hashIndex = absolute.firstIndex(of: "#") else { return nil }
        let fragment = String(absolute[absolute.index(after: hashIndex)...])
        guard !fragment.isEmpty else { return nil }

        let pairs = fragment.split(separator: "&")
        for pair in pairs {
            let parts = pair.split(separator: "=", maxSplits: 1)
            guard parts.count == 2 else { continue }
            if parts[0] == "access_token" {
                return String(parts[1]).removingPercentEncoding ?? String(parts[1])
            }
        }
        return nil
    }

    private func fetchUserId(accessToken: String) async throws -> String {
        let url = baseURL.appendingPathComponent("auth/v1/user")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "SupabaseService", code: 7, userInfo: [NSLocalizedDescriptionKey: "Unable to fetch OAuth user"])
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let userId = json?["id"] as? String, !userId.isEmpty else {
            throw NSError(domain: "SupabaseService", code: 8, userInfo: [NSLocalizedDescriptionKey: "OAuth user id not found"])
        }
        return userId
    }

    func signIn(email: String, password: String) async throws -> MobileAuthSession {
        let url = baseURL.appendingPathComponent("auth/v1/token")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "grant_type", value: "password")]

        guard let finalURL = components?.url else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: finalURL)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email,
            "password": password
        ])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "SupabaseService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid credentials"])
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let user = json?["user"] as? [String: Any]
        let userId = user?["id"] as? String
        let accessToken = json?["access_token"] as? String
        guard let userId, let accessToken, !accessToken.isEmpty else {
            throw NSError(domain: "SupabaseService", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not parse user id"])
        }

        storeSession(userId: userId, accessToken: accessToken)
        return MobileAuthSession(userId: userId, accessToken: accessToken)
    }

    func signUp(email: String, password: String) async throws -> MobileAuthSession {
        let url = baseURL.appendingPathComponent("auth/v1/signup")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email,
            "password": password
        ])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "SupabaseService", code: 3, userInfo: [NSLocalizedDescriptionKey: "Sign up failed"])
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let user = json?["user"] as? [String: Any]
        let session = json?["session"] as? [String: Any]
        let userId = user?["id"] as? String
        let accessToken = session?["access_token"] as? String

        guard let userId else {
            throw NSError(domain: "SupabaseService", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not parse created user"])
        }

        if let accessToken, !accessToken.isEmpty {
            storeSession(userId: userId, accessToken: accessToken)
            return MobileAuthSession(userId: userId, accessToken: accessToken)
        }

        throw NSError(domain: "SupabaseService", code: 5, userInfo: [NSLocalizedDescriptionKey: "Please verify your email before signing in"])
    }

    func getSessionUser() async throws -> String? {
        UserDefaults.standard.string(forKey: sessionUserIdKey)
    }

    func fetchUserRoles(userId: String) async throws -> [String] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/user_roles"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "role"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)")
        ]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        if let token = UserDefaults.standard.string(forKey: sessionAccessTokenKey), !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        }

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        return rows
            .compactMap { $0["role"] as? String }
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
            .filter { !$0.isEmpty }
    }

    func signOut() async throws {
        let url = baseURL.appendingPathComponent("auth/v1/logout")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")

        _ = try await URLSession.shared.data(for: request)
        clearSession()
    }

    func fetchWishlist(userId: String) async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/wishlists"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,title,item_type,created_at"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)")
        ]
        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    func fetchNotifications(userId: String) async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/notifications"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,title,message,created_at"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)")
        ]
        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    func fetchHostProperties(hostId: String) async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/properties"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,host_id,title,location,price_per_night,price_per_month,currency,is_published,monthly_only_listing,created_at"),
            URLQueryItem(name: "host_id", value: "eq.\(hostId)")
        ]
        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    func createFlutterwavePayment(payload: [String: Any]) async throws -> [String: Any] {
        guard let url = URL(string: "\(apiBaseURL)/api/flutterwave-create-payment") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }

    func fetchFeaturedListings(limit: Int = 20) async throws -> [Listing] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/properties"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,host_id,title,name,location,price_per_night,price_per_month,currency,is_published,monthly_only_listing,images,main_image,rating"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([Listing].self, from: data)
    }

    func submitBooking(_ draft: BookingDraft) async throws {
        let url = baseURL.appendingPathComponent("rest/v1/bookings")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

        request.httpBody = try JSONSerialization.data(withJSONObject: draft.toPayload())

        _ = try await URLSession.shared.data(for: request)
    }

    func createProperty(hostId: String, payload: [String: Any]) async throws -> [String: Any] {
        let url = baseURL.appendingPathComponent("rest/v1/properties")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")

        var body = payload
        body["host_id"] = hostId
        body["is_published"] = body["is_published"] ?? false
        body["monthly_only_listing"] = body["monthly_only_listing"] ?? false
        body["available_for_monthly_rental"] = body["available_for_monthly_rental"] ?? false

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        return rows.first ?? [:]
    }

    func becomeHost(userId: String, payload: [String: Any]) async throws {
        let hostApplicationsURL = baseURL.appendingPathComponent("rest/v1/host_applications")
        var applicationRequest = URLRequest(url: hostApplicationsURL)
        applicationRequest.httpMethod = "POST"
        applicationRequest.setValue(anonKey, forHTTPHeaderField: "apikey")
        applicationRequest.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        applicationRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        applicationRequest.setValue("return=minimal", forHTTPHeaderField: "Prefer")

        var appBody = payload
        appBody["user_id"] = userId
        appBody["status"] = appBody["status"] ?? "pending"
        applicationRequest.httpBody = try JSONSerialization.data(withJSONObject: appBody)

        _ = try await URLSession.shared.data(for: applicationRequest)

        let rpcURL = baseURL.appendingPathComponent("rest/v1/rpc/become_host")
        var rpcRequest = URLRequest(url: rpcURL)
        rpcRequest.httpMethod = "POST"
        rpcRequest.setValue(anonKey, forHTTPHeaderField: "apikey")
        rpcRequest.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        rpcRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        rpcRequest.httpBody = try JSONSerialization.data(withJSONObject: ["user_id": userId])

        _ = try await URLSession.shared.data(for: rpcRequest)
    }

    private func storeSession(userId: String, accessToken: String) {
        let defaults = UserDefaults.standard
        defaults.set(userId, forKey: sessionUserIdKey)
        defaults.set(accessToken, forKey: sessionAccessTokenKey)
    }

    private func clearSession() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: sessionUserIdKey)
        defaults.removeObject(forKey: sessionAccessTokenKey)
    }

    func fetchCitiesWithStays() async throws -> [(city: String, count: Int)] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/properties"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "location"),
            URLQueryItem(name: "is_published", value: "eq.true"),
            URLQueryItem(name: "location", value: "not.is.null")
        ]

        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        
        // Extract unique cities and count stays per city
        var cityCounts: [String: Int] = [:]
        for row in rows {
            if let location = row["location"] as? String {
                let city = location.components(separatedBy: ",").first?.trimmingCharacters(in: .whitespaces) ?? location
                cityCounts[city, default: 0] += 1
            }
        }
        
        // Sort by count descending
        return cityCounts.map { (city: $0.key, count: $0.value) }
            .sorted { $0.count > $1.count }
    }

    func fetchListingsByCity(_ city: String, limit: Int = 10) async throws -> [Listing] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/properties"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,host_id,title,name,location,price_per_night,price_per_month,currency,is_published,monthly_only_listing,images,main_image,rating"),
            URLQueryItem(name: "is_published", value: "eq.true"),
            URLQueryItem(name: "location", value: "ilike.\(city)*"),
            URLQueryItem(name: "order", value: "rating.desc.nullslast"),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([Listing].self, from: data)
    }

    func fetchTours(limit: Int = 30) async throws -> [Listing] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/tours"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,title,location,price_per_person,price_for_citizens,currency,is_published,images,rating"),
            URLQueryItem(name: "or", value: "(is_published.eq.true,is_published.is.null)"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        var items: [Listing] = []
        for row in rows {
            let id = row["id"] as? String ?? UUID().uuidString
            let title = (row["title"] as? String) ?? "Tour"
            let location = (row["location"] as? String) ?? "Rwanda"
            let price = number(row["price_per_person"]) ?? number(row["price_for_citizens"]) ?? 0
            let currency = (row["currency"] as? String) ?? "USD"
            let images = row["images"] as? [String]
            let mainImage = images?.first
            let rating = number(row["rating"])
            items.append(Listing(id: id, hostId: nil, title: title, location: location, pricePerNight: price, pricePerMonth: nil, currency: currency, isPublished: true, monthlyOnlyListing: nil, images: images, mainImage: mainImage, rating: rating))
        }
        return items
    }

    func fetchCars(limit: Int = 30) async throws -> [Listing] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/transport_vehicles"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,title,provider_name,vehicle_type,price_per_day,daily_price,currency,image_url,media,exterior_images,interior_images,is_published"),
            URLQueryItem(name: "or", value: "(is_published.eq.true,is_published.is.null)"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        var items: [Listing] = []
        for row in rows {
            let id = row["id"] as? String ?? UUID().uuidString
            let title = (row["title"] as? String) ?? "Car rental"
            let provider = (row["provider_name"] as? String) ?? (row["vehicle_type"] as? String) ?? "Transport"
            let price = number(row["price_per_day"]) ?? number(row["daily_price"]) ?? 0
            let currency = (row["currency"] as? String) ?? "USD"
            var images: [String] = []
            if let image = row["image_url"] as? String, !image.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                images.append(image)
            }
            if let exterior = row["exterior_images"] as? [String] { images.append(contentsOf: exterior) }
            if let interior = row["interior_images"] as? [String] { images.append(contentsOf: interior) }
            if let media = row["media"] as? [String] { images.append(contentsOf: media) }
            images = images.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            let mainImage = images.first
            items.append(Listing(id: id, hostId: nil, title: title, location: provider, pricePerNight: price, pricePerMonth: nil, currency: currency, isPublished: true, monthlyOnlyListing: nil, images: images, mainImage: mainImage, rating: nil))
        }

        if !items.isEmpty {
            return items
        }

        var routesComponents = URLComponents(url: baseURL.appendingPathComponent("rest/v1/airport_transfer_routes"), resolvingAgainstBaseURL: false)
        routesComponents?.queryItems = [
            URLQueryItem(name: "select", value: "id,from_location,to_location,base_price,currency,is_active"),
            URLQueryItem(name: "is_active", value: "eq.true"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        guard let routesUrl = routesComponents?.url else { return [] }
        var routesRequest = URLRequest(url: routesUrl)
        routesRequest.httpMethod = "GET"
        routesRequest.setValue(anonKey, forHTTPHeaderField: "apikey")
        routesRequest.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (routesData, _) = try await URLSession.shared.data(for: routesRequest)
        let routes = (try JSONSerialization.jsonObject(with: routesData) as? [[String: Any]]) ?? []
        return routes.map { row in
            let id = row["id"] as? String ?? UUID().uuidString
            let from = (row["from_location"] as? String) ?? "Airport"
            let to = (row["to_location"] as? String) ?? "City"
            let price = number(row["base_price"]) ?? 0
            let currency = (row["currency"] as? String) ?? "USD"
            return Listing(
                id: id,
                hostId: nil,
                title: "Airport transfer",
                location: "\(from) → \(to)",
                pricePerNight: price,
                pricePerMonth: nil,
                currency: currency,
                isPublished: true,
                monthlyOnlyListing: nil,
                images: nil,
                mainImage: nil,
                rating: nil
            )
        }
    }

    func fetchEvents(limit: Int = 30) async throws -> [Listing] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/tour_packages"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,title,city,country,price_per_person,price_per_adult,currency,cover_image,gallery_images,status,is_approved"),
            URLQueryItem(name: "or", value: "(status.eq.approved,status.eq.published,is_approved.eq.true)"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        guard let url = components?.url else { return [] }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        var items: [Listing] = []
        for row in rows {
            let id = row["id"] as? String ?? UUID().uuidString
            let title = (row["title"] as? String) ?? "Event"
            let city = (row["city"] as? String) ?? "Rwanda"
            let country = (row["country"] as? String) ?? ""
            let location = country.isEmpty ? city : "\(city), \(country)"
            let price = number(row["price_per_person"]) ?? number(row["price_per_adult"]) ?? 0
            let currency = (row["currency"] as? String) ?? "USD"
            let gallery = row["gallery_images"] as? [String] ?? []
            let cover = row["cover_image"] as? String
            let images = ([cover] + gallery).compactMap { $0 }.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            items.append(Listing(id: id, hostId: nil, title: title, location: location, pricePerNight: price, pricePerMonth: nil, currency: currency, isPublished: true, monthlyOnlyListing: nil, images: images, mainImage: cover, rating: nil))
        }
        return items
    }

    private func number(_ value: Any?) -> Double? {
        if let doubleValue = value as? Double { return doubleValue }
        if let intValue = value as? Int { return Double(intValue) }
        if let stringValue = value as? String { return Double(stringValue) }
        return nil
    }
}
