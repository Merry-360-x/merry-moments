import Foundation

struct MobileAuthSession {
    let userId: String
    let accessToken: String
}

struct MobileAdminMetrics {
    let usersTotal: Int
    let hostsTotal: Int
    let storiesTotal: Int
    let propertiesTotal: Int
    let bookingsTotal: Int
    let bookingsPaid: Int
    let revenueGross: Double
    let platformCharges: Double
    let hostNet: Double
    let discountAmount: Double
    let revenueCurrency: String

    static let empty = MobileAdminMetrics(
        usersTotal: 0,
        hostsTotal: 0,
        storiesTotal: 0,
        propertiesTotal: 0,
        bookingsTotal: 0,
        bookingsPaid: 0,
        revenueGross: 0,
        platformCharges: 0,
        hostNet: 0,
        discountAmount: 0,
        revenueCurrency: "RWF"
    )
}

struct MobileFinancialSummary {
    let bookingsTotal: Int
    let pending: Int
    let confirmed: Int
    let paid: Int
    let cancelled: Int
    let unpaidCheckoutRequests: Int
    let refundedCheckoutRequests: Int
}

struct MobileOperationsSummary {
    let hostApplicationsTotal: Int
    let hostApplicationsPending: Int
    let propertiesTotal: Int
    let propertiesPublished: Int
    let toursTotal: Int
    let toursPublished: Int
    let transportVehiclesTotal: Int
    let bookingsTotal: Int
}

struct MobileSupportSummary {
    let ticketsTotal: Int
    let ticketsOpen: Int
    let ticketsInProgress: Int
    let ticketsResolved: Int
    let ticketsClosed: Int
    let reviewsTotal: Int
}

struct MobileAffiliateAccount {
    let id: String
    let status: String
    let referralCode: String
    let companyName: String?
    let websiteURL: String?
    let commissionRate: Double
    let totalEarnings: Double
    let pendingEarnings: Double
    let paidEarnings: Double
    let totalReferrals: Int
}

struct MobileAffiliateReferral {
    let id: String
    let referredUserEmail: String?
    let converted: Bool
    let status: String
    let createdAt: String?
}

struct MobileAffiliateCommission {
    let id: String
    let amount: Double
    let status: String
    let bookingId: String?
    let createdAt: String?
}

struct MobileCheckoutRequest {
    let id: String
    let paymentStatus: String
    let totalAmount: Double
    let currency: String
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

    func fetchHostBookings(hostId: String) async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/bookings"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,order_id,status,payment_status,total_price,currency,created_at"),
            URLQueryItem(name: "host_id", value: "eq.\(hostId)"),
            URLQueryItem(name: "order", value: "created_at.desc")
        ]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    func fetchUserBookings(userId: String) async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/bookings"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,status,payment_status,total_price,currency,check_in,check_out,created_at"),
            URLQueryItem(name: "guest_id", value: "eq.\(userId)"),
            URLQueryItem(name: "order", value: "created_at.desc")
        ]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    func fetchHostPayouts(hostId: String) async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/host_payouts"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,status,amount,currency,created_at"),
            URLQueryItem(name: "host_id", value: "eq.\(hostId)"),
            URLQueryItem(name: "order", value: "created_at.desc")
        ]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    func fetchHostReviews(hostId: String) async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/property_reviews"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,rating,review_text,status,property_id,created_at"),
            URLQueryItem(name: "host_id", value: "eq.\(hostId)"),
            URLQueryItem(name: "order", value: "created_at.desc")
        ]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    func createHostPayoutRequest(hostId: String, amount: Double, currency: String, payoutMethod: String, payoutDetails: [String: Any]) async throws {
        let body: [String: Any] = [
            "host_id": hostId,
            "amount": amount,
            "currency": currency,
            "status": "pending",
            "payout_method": payoutMethod,
            "payout_details": payoutDetails,
        ]
        _ = try await insertRows(table: "host_payouts", body: body, preferRepresentation: false)
    }

    func fetchAffiliateAccount(userId: String) async throws -> MobileAffiliateAccount? {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/affiliates"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,status,referral_code,company_name,website_url,commission_rate,total_earnings,pending_earnings,paid_earnings,total_referrals"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "limit", value: "1")
        ]
        guard let url = components?.url else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        guard let row = rows.first else { return nil }

        return MobileAffiliateAccount(
            id: row["id"] as? String ?? "",
            status: (row["status"] as? String) ?? "pending",
            referralCode: (row["referral_code"] as? String) ?? "",
            companyName: row["company_name"] as? String,
            websiteURL: row["website_url"] as? String,
            commissionRate: number(row["commission_rate"]) ?? 10,
            totalEarnings: number(row["total_earnings"]) ?? 0,
            pendingEarnings: number(row["pending_earnings"]) ?? 0,
            paidEarnings: number(row["paid_earnings"]) ?? 0,
            totalReferrals: Int(number(row["total_referrals"]) ?? 0)
        )
    }

    func createAffiliateAccount(userId: String, companyName: String?, websiteURL: String?) async throws {
        var referralCode: String?
        if let code = try await callCodeRPC(name: "generate_referral_code") {
            referralCode = code
        } else if let code = try await callCodeRPC(name: "generate_affiliate_code") {
            referralCode = code
        }

        guard let referralCode, !referralCode.isEmpty else {
            throw NSError(domain: "SupabaseService", code: 72, userInfo: [NSLocalizedDescriptionKey: "Could not generate referral code"])
        }

        var body: [String: Any] = [
            "user_id": userId,
            "referral_code": referralCode,
            "status": "pending",
            "commission_rate": 10,
        ]
        if let companyName, !companyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            body["company_name"] = companyName
        }
        if let websiteURL, !websiteURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            body["website_url"] = websiteURL
        }

        _ = try await insertRows(table: "affiliates", body: body, preferRepresentation: false)
    }

    func fetchAffiliateReferrals(affiliateId: String) async throws -> [MobileAffiliateReferral] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/affiliate_referrals"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,referred_user_email,converted,status,created_at"),
            URLQueryItem(name: "affiliate_id", value: "eq.\(affiliateId)"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: "50"),
        ]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        return rows.map { row in
            MobileAffiliateReferral(
                id: row["id"] as? String ?? "",
                referredUserEmail: row["referred_user_email"] as? String,
                converted: (row["converted"] as? Bool) ?? false,
                status: (row["status"] as? String) ?? "pending",
                createdAt: row["created_at"] as? String
            )
        }
    }

    func fetchAffiliateCommissions(affiliateId: String) async throws -> [MobileAffiliateCommission] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/affiliate_commissions"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,amount,status,booking_id,created_at"),
            URLQueryItem(name: "affiliate_id", value: "eq.\(affiliateId)"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: "50"),
        ]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        return rows.map { row in
            MobileAffiliateCommission(
                id: row["id"] as? String ?? "",
                amount: number(row["amount"]) ?? 0,
                status: (row["status"] as? String) ?? "pending",
                bookingId: row["booking_id"] as? String,
                createdAt: row["created_at"] as? String
            )
        }
    }

    func createCheckoutRequest(userId: String, name: String, email: String, phone: String, message: String?, totalAmount: Double, currency: String, paymentMethod: String, items: [[String: Any]]) async throws -> MobileCheckoutRequest {
        let body: [String: Any] = [
            "user_id": userId,
            "name": name,
            "email": email,
            "phone": phone,
            "message": message ?? "",
            "status": "pending_confirmation",
            "payment_status": "unpaid",
            "payment_method": paymentMethod,
            "total_amount": totalAmount,
            "currency": currency,
            "items": items,
        ]

        let rows = try await insertRows(table: "checkout_requests", body: body, preferRepresentation: true)
        guard let row = rows.first, let id = row["id"] as? String else {
            throw NSError(domain: "SupabaseService", code: 73, userInfo: [NSLocalizedDescriptionKey: "Checkout creation failed"])
        }

        return MobileCheckoutRequest(
            id: id,
            paymentStatus: (row["payment_status"] as? String) ?? "unpaid",
            totalAmount: number(row["total_amount"]) ?? totalAmount,
            currency: (row["currency"] as? String) ?? currency
        )
    }

    func fetchCheckoutRequest(id: String) async throws -> MobileCheckoutRequest? {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/checkout_requests"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,payment_status,total_amount,currency"),
            URLQueryItem(name: "id", value: "eq.\(id)"),
            URLQueryItem(name: "limit", value: "1")
        ]
        guard let url = components?.url else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        guard let row = rows.first else { return nil }

        return MobileCheckoutRequest(
            id: row["id"] as? String ?? id,
            paymentStatus: (row["payment_status"] as? String) ?? "unpaid",
            totalAmount: number(row["total_amount"]) ?? 0,
            currency: (row["currency"] as? String) ?? "RWF"
        )
    }

    func updateCheckoutRequestPaymentStatus(id: String, paymentStatus: String, errorMessage: String? = nil) async throws {
        let url = baseURL.appendingPathComponent("rest/v1/checkout_requests?id=eq.\(id)")
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

        var body: [String: Any] = ["payment_status": paymentStatus]
        if let errorMessage {
            body["payment_error"] = errorMessage
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "SupabaseService", code: 74, userInfo: [NSLocalizedDescriptionKey: "Could not update checkout status"])
        }
    }

    func updateBookingPaymentStatus(bookingId: String, paymentStatus: String, bookingStatus: String?) async throws {
        let url = baseURL.appendingPathComponent("rest/v1/bookings?id=eq.\(bookingId)")
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

        var body: [String: Any] = ["payment_status": paymentStatus]
        if let bookingStatus {
            body["status"] = bookingStatus
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "SupabaseService", code: 75, userInfo: [NSLocalizedDescriptionKey: "Could not update booking payment status"])
        }
    }

    func fetchProfileBasics(userId: String) async throws -> [String: Any]? {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/profiles"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "full_name,email,phone"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "limit", value: "1")
        ]
        guard let url = components?.url else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        return rows.first
    }

    func createStory(userId: String, title: String, body: String, location: String?, mediaURL: String?) async throws {
        let url = baseURL.appendingPathComponent("rest/v1/stories")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

        let trimmedMedia = mediaURL?.trimmingCharacters(in: .whitespacesAndNewlines)
        let media = (trimmedMedia?.isEmpty == false) ? trimmedMedia : nil
        let mediaType: String?
        if let media {
            mediaType = isVideoURL(media) ? "video" : "image"
        } else {
            mediaType = nil
        }

        let payload: [String: Any?] = [
            "user_id": userId,
            "title": title,
            "body": body,
            "location": (location?.isEmpty == false ? location : nil),
            "media_url": media,
            "image_url": mediaType == "image" ? media : nil,
            "media_type": mediaType,
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: payload.compactMapValues { $0 })
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "SupabaseService", code: 40, userInfo: [NSLocalizedDescriptionKey: "Could not create story"])
        }
    }

    func fetchAdminOverviewMetrics() async throws -> MobileAdminMetrics {
        async let usersTotal = countRows(table: "profiles")
        async let hostsTotal = countRows(table: "user_roles", filters: [URLQueryItem(name: "role", value: "eq.host")])
        async let storiesTotal = countRows(table: "stories")
        async let propertiesTotal = countRows(table: "properties")
        async let bookingsTotal = countRows(table: "bookings")

        let paidBookings = try await fetchPaidBookingRevenueRows()
        var revenueGross: Double = 0
        var platformCharges: Double = 0
        var hostNet: Double = 0
        var discountAmount: Double = 0
        var currency = "RWF"

        for row in paidBookings {
            let total = number(row["total_price"]) ?? 0
            let hostPayout = number(row["host_payout_amount"])
            let platformFee = number(row["platform_fee"]) ?? 0
            let paymentFee = number(row["payment_method_fee"]) ?? 0
            let discount = number(row["discount_amount"]) ?? 0

            if let rowCurrency = row["currency"] as? String, !rowCurrency.isEmpty {
                currency = rowCurrency
            }

            revenueGross += total
            discountAmount += discount

            let inferredPlatform = platformFee + paymentFee
            if inferredPlatform > 0 {
                platformCharges += inferredPlatform
            }

            if let hostPayout {
                hostNet += hostPayout
            } else {
                hostNet += max(total - inferredPlatform, 0)
            }
        }

        if platformCharges == 0 {
            platformCharges = max(revenueGross - hostNet, 0)
        }

        return MobileAdminMetrics(
            usersTotal: try await usersTotal,
            hostsTotal: try await hostsTotal,
            storiesTotal: try await storiesTotal,
            propertiesTotal: try await propertiesTotal,
            bookingsTotal: try await bookingsTotal,
            bookingsPaid: paidBookings.count,
            revenueGross: revenueGross,
            platformCharges: platformCharges,
            hostNet: hostNet,
            discountAmount: discountAmount,
            revenueCurrency: currency
        )
    }

    func fetchFinancialSummary() async throws -> MobileFinancialSummary {
        let bookings = try await fetchRows(
            table: "bookings",
            select: "id,status,payment_status"
        )
        let checkoutRequests = try await fetchRows(
            table: "checkout_requests",
            select: "id,payment_status"
        )

        let pending = bookings.filter { row in
            let s = String(describing: row["status"] ?? "").lowercased()
            return s == "pending" || s == "pending_confirmation"
        }.count
        let confirmed = bookings.filter { String(describing: $0["status"] ?? "").lowercased() == "confirmed" }.count
        let paid = bookings.filter { String(describing: $0["payment_status"] ?? "").lowercased() == "paid" }.count
        let cancelled = bookings.filter { String(describing: $0["status"] ?? "").lowercased() == "cancelled" }.count

        let unpaidCheckout = checkoutRequests.filter { String(describing: $0["payment_status"] ?? "").lowercased() == "unpaid" }.count
        let refundedCheckout = checkoutRequests.filter { String(describing: $0["payment_status"] ?? "").lowercased() == "refunded" }.count

        return MobileFinancialSummary(
            bookingsTotal: bookings.count,
            pending: pending,
            confirmed: confirmed,
            paid: paid,
            cancelled: cancelled,
            unpaidCheckoutRequests: unpaidCheckout,
            refundedCheckoutRequests: refundedCheckout
        )
    }

    func fetchOperationsSummary() async throws -> MobileOperationsSummary {
        let hostApplications = try await fetchRows(table: "host_applications", select: "id,status")
        let properties = try await fetchRows(table: "properties", select: "id,is_published")
        let tours = try await fetchRows(table: "tours", select: "id,is_published")
        let transport = try await fetchRows(table: "transport_vehicles", select: "id")
        let bookings = try await fetchRows(table: "bookings", select: "id")

        return MobileOperationsSummary(
            hostApplicationsTotal: hostApplications.count,
            hostApplicationsPending: hostApplications.filter { String(describing: $0["status"] ?? "").lowercased() == "pending" }.count,
            propertiesTotal: properties.count,
            propertiesPublished: properties.filter { ($0["is_published"] as? Bool) == true }.count,
            toursTotal: tours.count,
            toursPublished: tours.filter { ($0["is_published"] as? Bool) == true }.count,
            transportVehiclesTotal: transport.count,
            bookingsTotal: bookings.count
        )
    }

    func fetchSupportSummary() async throws -> MobileSupportSummary {
        let tickets = try await fetchRows(table: "support_tickets", select: "id,status")
        let reviews = try await fetchRows(table: "property_reviews", select: "id")

        return MobileSupportSummary(
            ticketsTotal: tickets.count,
            ticketsOpen: tickets.filter { String(describing: $0["status"] ?? "").lowercased() == "open" }.count,
            ticketsInProgress: tickets.filter { String(describing: $0["status"] ?? "").lowercased() == "in_progress" }.count,
            ticketsResolved: tickets.filter { String(describing: $0["status"] ?? "").lowercased() == "resolved" }.count,
            ticketsClosed: tickets.filter { String(describing: $0["status"] ?? "").lowercased() == "closed" }.count,
            reviewsTotal: reviews.count
        )
    }

    func createTour(hostId: String, payload: [String: Any]) async throws {
        var body = payload
        body["created_by"] = hostId
        body["is_published"] = true
        _ = try await insertRows(table: "tours", body: body, preferRepresentation: false)
    }

    func createTourPackage(hostId: String, payload: [String: Any]) async throws {
        var body = payload
        body["host_id"] = hostId
        body["country"] = body["country"] ?? "Rwanda"
        body["status"] = body["status"] ?? "approved"
        _ = try await insertRows(table: "tour_packages", body: body, preferRepresentation: false)
    }

    func createTransportVehicle(hostId: String, payload: [String: Any], serviceType: String) async throws -> String? {
        var body = payload
        body["created_by"] = hostId
        body["service_type"] = serviceType
        body["is_published"] = true
        let rows = try await insertRows(table: "transport_vehicles", body: body, preferRepresentation: true)
        return rows.first?["id"] as? String
    }

    func createAirportTransferPricing(vehicleId: String, routeId: String, price: Double, currency: String) async throws {
        let body: [String: Any] = [
            "vehicle_id": vehicleId,
            "route_id": routeId,
            "price": price,
            "currency": currency,
        ]
        _ = try await insertRows(table: "airport_transfer_pricing", body: body, preferRepresentation: false)
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

    func submitBookingReturningId(_ draft: BookingDraft) async throws -> String {
        let rows = try await insertRows(table: "bookings", body: draft.toPayload(), preferRepresentation: true)
        guard let id = rows.first?["id"] as? String, !id.isEmpty else {
            throw NSError(domain: "SupabaseService", code: 76, userInfo: [NSLocalizedDescriptionKey: "Booking id not returned"])
        }
        return id
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

    private func authorizedBearer() -> String {
        if let token = UserDefaults.standard.string(forKey: sessionAccessTokenKey), !token.isEmpty {
            return "Bearer \(token)"
        }
        return "Bearer \(anonKey)"
    }

    private func countRows(table: String, filters: [URLQueryItem] = []) async throws -> Int {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/\(table)"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "select", value: "id")]
        components?.queryItems?.append(contentsOf: filters)

        guard let url = components?.url else { return 0 }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")
        request.setValue("count=exact", forHTTPHeaderField: "Prefer")
        request.setValue("0-0", forHTTPHeaderField: "Range")

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { return 0 }
        guard let contentRange = http.value(forHTTPHeaderField: "Content-Range") else { return 0 }

        // Supabase returns "start-end/total" in Content-Range.
        let totalPart = contentRange.split(separator: "/").last
        return Int(totalPart ?? "0") ?? 0
    }

    private func fetchPaidBookingRevenueRows() async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/bookings"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,total_price,currency,status,payment_status,host_payout_amount,platform_fee,payment_method_fee,discount_amount"),
            URLQueryItem(name: "payment_status", value: "eq.paid"),
            URLQueryItem(name: "status", value: "in.(confirmed,completed)")
        ]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    private func fetchRows(table: String, select: String) async throws -> [[String: Any]] {
        var components = URLComponents(url: baseURL.appendingPathComponent("rest/v1/\(table)"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "select", value: select)]
        guard let url = components?.url else { return [] }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    private func insertRows(table: String, body: [String: Any], preferRepresentation: Bool) async throws -> [[String: Any]] {
        let url = baseURL.appendingPathComponent("rest/v1/\(table)")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(preferRepresentation ? "return=representation" : "return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "SupabaseService", code: 41, userInfo: [NSLocalizedDescriptionKey: "Insert failed for \(table)"])
        }
        guard preferRepresentation else { return [] }
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    private func number(_ any: Any?) -> Double? {
        if let value = any as? Double { return value }
        if let value = any as? Int { return Double(value) }
        if let value = any as? NSNumber { return value.doubleValue }
        if let value = any as? String { return Double(value) }
        return nil
    }

    private func callCodeRPC(name: String) async throws -> String? {
        let url = baseURL.appendingPathComponent("rest/v1/rpc/\(name)")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue(authorizedBearer(), forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data("{}".utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            return nil
        }
        if let code = String(data: data, encoding: .utf8)?
            .replacingOccurrences(of: "\"", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines), !code.isEmpty {
            return code
        }
        return nil
    }

    private func isVideoURL(_ url: String) -> Bool {
        let lower = url.lowercased()
        if lower.contains("/video/upload/") { return true }
        return lower.hasSuffix(".mp4") || lower.hasSuffix(".webm") || lower.hasSuffix(".mov") || lower.hasSuffix(".m4v") || lower.hasSuffix(".avi")
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

}
