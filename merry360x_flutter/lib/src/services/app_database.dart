import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../models/mobile_sync.dart';

extension _MapExt on Map {
  dynamic get(String key) => this[key];
}

/// Cloud names that are known-disabled and should never be used for display.
const _disabledCloudNames = {'dxdblhmbm'};

bool _isWorkingImageUrl(String url) {
  // Filter out Cloudinary URLs from disabled cloud accounts.
  final uri = Uri.tryParse(url);
  if (uri != null && uri.host == 'res.cloudinary.com') {
    final segments = uri.pathSegments; // e.g. ['dxdblhmbm', 'image', 'upload', ...]
    if (segments.isNotEmpty && _disabledCloudNames.contains(segments[0])) return false;
  }
  return true;
}

List<dynamic> _nonEmptyImages(dynamic imgs, dynamic mainImage) {
  List<dynamic> filtered(List<dynamic> list) =>
      list.where((v) => v != null && _isWorkingImageUrl(v.toString())).toList();

  if (imgs is List && imgs.isNotEmpty) {
    final f = filtered(imgs);
    if (f.isNotEmpty) return f;
  }
  final mi = mainImage?.toString() ?? '';
  if (mi.isNotEmpty && _isWorkingImageUrl(mi)) return [mi];
  return [];
}

Map<String, dynamic> _normalizeProperty(Map<String, dynamic> row) {
  final imgs = _nonEmptyImages(row['images'], row['main_image']);
  final mainImage = () {
    final mi = row['main_image']?.toString() ?? '';
    if (mi.isNotEmpty && _isWorkingImageUrl(mi)) return mi;
    return imgs.isNotEmpty ? imgs.first as String? : null;
  }();
  return {...row, 'item_type': 'property', 'images': imgs, 'main_image': mainImage};
}

Map<String, dynamic> _normalizeTour(Map<String, dynamic> row) {
  final imgs = _nonEmptyImages(row['images'], row['main_image']);
  final mainImage = () {
    final mi = row['main_image']?.toString() ?? '';
    if (mi.isNotEmpty && _isWorkingImageUrl(mi)) return mi;
    return imgs.isNotEmpty ? imgs.first as String? : null;
  }();
  return {...row, 'item_type': 'tour', 'source': row['source'] ?? 'tours', 'images': imgs, 'main_image': mainImage};
}

Map<String, dynamic> _normalizeTourPackage(Map<String, dynamic> row) => {
  ...row,
  'item_type': 'tour_package',
  'source': 'tour_packages',
  'location': [row['city'], row['country']].where((v) => (v ?? '').toString().isNotEmpty).join(', '),
  'price_per_person': row['price_per_person'] ?? row['price_per_adult'],
  'is_published': row['is_published'] ?? row['status'] == 'approved',
  'images': [
    if ((row['cover_image'] ?? '').toString().isNotEmpty) row['cover_image'],
    ...((row['gallery_images'] as List?) ?? const []),
  ],
  'main_image': row['cover_image'],
};

Map<String, dynamic> _normalizeTransport(Map<String, dynamic> row) => {
  ...row,
  'item_type': 'transport',
  'location': row['provider_name'] ?? row['vehicle_type'],
  'price_per_day': row['price_per_day'] ?? row['daily_price'],
  'daily_price': row['daily_price'] ?? row['price_per_day'],
  'images': [
    if ((row['image_url'] ?? '').toString().isNotEmpty) row['image_url'],
    ...((row['media'] as List?) ?? const []),
  ],
  'main_image': row['image_url'],
};

class AppDatabase {
  AppDatabase({http.Client? client}) : _http = client ?? http.Client();

  final http.Client _http;
  static final RegExp _emailPattern = RegExp(
    r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
  );
  static final RegExp _linkPattern = RegExp(r'(https?://|www\.)', caseSensitive: false);
  static final RegExp _phonePattern = RegExp(
    r'(^|[^0-9])\+?[0-9][0-9\-\s\(\)]{6,}[0-9]([^0-9]|$)',
  );
  static final RegExp _blockedWordPattern = RegExp(
    r'\b(address|phone|telephone|whatsapp|telegram|snapchat|instagram|facebook|contact me|call me|text me|dm me)\b',
    caseSensitive: false,
  );

  SupabaseClient get _sb => Supabase.instance.client;

  static String? validateDirectMessage(String rawMessage) {
    final message = rawMessage.trim();
    if (message.isEmpty) {
      return 'Message cannot be empty.';
    }
    if (message.length > 1200) {
      return 'Message is too long. Keep it under 1200 characters.';
    }
    if (_emailPattern.hasMatch(message)) {
      return 'Sharing emails is not allowed in chat.';
    }
    if (_linkPattern.hasMatch(message)) {
      return 'Sharing links is not allowed in chat.';
    }
    if (_phonePattern.hasMatch(message)) {
      return 'Sharing phone numbers is not allowed in chat.';
    }
    if (_blockedWordPattern.hasMatch(message)) {
      return 'For safety, contact details and off-platform coordination are blocked.';
    }
    return null;
  }

  /// Enrich stories with profile data (username, avatar_url)
  Future<List<Map<String, dynamic>>> _enrichStoriesWithProfiles(List<Map<String, dynamic>> stories) async {
    if (stories.isEmpty) return stories;

    try {
      final userIds = stories
          .map((row) => (row['user_id'] ?? '').toString())
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      if (userIds.isEmpty) return stories;

      final profiles = await _sb
          .from('profiles')
          .select('user_id, full_name, nickname, avatar_url')
          .inFilter('user_id', userIds);

      final profileMap = <String, Map<String, dynamic>>{};
      for (final row in (profiles as List).cast<Map<String, dynamic>>()) {
        final uid = (row['user_id'] ?? '').toString();
        if (uid.isNotEmpty) {
          profileMap[uid] = row;
        }
      }

      return stories.map((story) {
        final uid = (story['user_id'] ?? '').toString();
        final profile = profileMap[uid];
        final username = profile != null
            ? ((profile['full_name'] ?? profile['nickname'] ?? 'User').toString())
            : 'User';
        final avatarUrl = profile != null
            ? ((profile['avatar_url'] ?? '').toString())
            : '';

        return {
          ...story,
          'username': username,
          'avatar_url': avatarUrl,
        };
      }).toList();
    } catch (e) {
      debugPrint('[_enrichStoriesWithProfiles] error: $e');
      // Return stories without enrichment if profile fetch fails
      return stories;
    }
  }

  // ── Data sync (direct Supabase queries — same tables as website) ──

  Future<MobileSyncPayload> fetchSync({String? userId}) async {
    Future<List<Map<String, dynamic>>> safeQuery(Future<dynamic> query) async {
      try {
        final data = await query;
        return (data as List).cast<Map<String, dynamic>>();
      } catch (e) {
        // Keep the feed alive even if one table shape changes.
        return const <Map<String, dynamic>>[];
      }
    }

    const propertyLimit = 120;
    const feedLimit = 80;
    final storiesCutoffIso = DateTime.now().toUtc().subtract(const Duration(hours: 24)).toIso8601String();

    // Home listings — aligned with website table columns (web uses RecommendationEngine scoring)
    final results = await Future.wait([
      safeQuery(
        _sb
            .from('properties')
            .select('id, title, location, price_per_night, price_per_month, monthly_only_listing, currency, property_type, rating, review_count, bedrooms, beds, bathrooms, max_guests, images, main_image, host_id, created_at')
            .eq('is_published', true)
            .order('rating', ascending: false)
            .order('review_count', ascending: false)
            .order('created_at', ascending: false)
            .limit(propertyLimit),
      ),
      safeQuery(
        _sb
            .from('tours')
            .select('id, title, location, price_per_person, currency, images, main_image, rating, review_count, category, duration_days, created_by, created_at')
            .eq('is_published', true)
            .order('rating', ascending: false)
            .order('review_count', ascending: false)
            .order('created_at', ascending: false)
            .limit(feedLimit),
      ),
      safeQuery(
        _sb
            .from('tour_packages')
            .select('id, title, city, country, price_per_adult, price_per_person, currency, status, cover_image, gallery_images, category, duration, host_id, created_at')
            .eq('status', 'approved')
            .order('created_at', ascending: false)
            .limit(feedLimit),
      ),
      safeQuery(
        _sb
            .from('transport_vehicles')
            .select('id, title, provider_name, vehicle_type, seats, price_per_day, currency, driver_included, image_url, media, created_at')
            .eq('is_published', true)
            .order('created_at', ascending: false)
            .limit(feedLimit),
      ),
      safeQuery(
        _sb
          .from('stories')
          .select('id, user_id, image_url, media_url, title, location, created_at')
          .gte('created_at', storiesCutoffIso)
          .order('created_at', ascending: false)
          .limit(feedLimit),
      ),
    ]);

    final properties = results[0];
    final tours = results[1];
    final tourPkgs = results[2];
    final transport = results[3];
    final storiesRaw = results[4];

    // Enrich stories with username and avatar from profiles
    final stories = await _enrichStoriesWithProfiles(storiesRaw);

    final listings = <Map<String, dynamic>>[
      for (final p in properties) _normalizeProperty(p),
      for (final t in tours) _normalizeTour(t),
      for (final tp in tourPkgs) _normalizeTourPackage(tp),
      for (final tv in transport) _normalizeTransport(tv),
    ];

    // User-specific data
    Map<String, dynamic>? profile;
    List<Map<String, dynamic>> wishlists = const [];
    List<Map<String, dynamic>> tripCart = const [];
    List<Map<String, dynamic>> bookings = const [];
    List<String> roles = const [];

    if (userId != null && userId.trim().isNotEmpty) {
      final uid = userId.trim();
      try {
        final userResults = await Future.wait([
          _sb.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
          _sb.from('favorites').select('*').eq('user_id', uid).order('created_at', ascending: false),
          _sb.from('trip_cart_items').select('*').eq('user_id', uid).order('created_at', ascending: false),
          _sb.from('bookings').select('*').eq('guest_id', uid).order('created_at', ascending: false).limit(50),
          _sb.from('user_roles').select('role').eq('user_id', uid),
        ]);

        profile = userResults[0] as Map<String, dynamic>?;
        wishlists = (userResults[1] as List).cast<Map<String, dynamic>>();
        tripCart = (userResults[2] as List).cast<Map<String, dynamic>>();
        bookings = (userResults[3] as List).cast<Map<String, dynamic>>();
        roles = (userResults[4] as List).map((r) => (r as Map)['role'].toString()).where((r) => r.isNotEmpty).toList();
      } catch (e) {
        // User-specific queries failed (JWT not yet propagated, RLS issue, or
        // transient network error). Serve public data only — the periodic sync
        // will retry and populate user data once the session is stable.
        debugPrint('[fetchSync] user queries failed for $uid: $e');
      }
    }

    return MobileSyncPayload(
      serverTime: DateTime.now().toUtc().toIso8601String(),
      homeListings: listings,
      stories: stories,
      profile: profile,
      roles: roles,
      bookings: bookings,
      wishlists: wishlists,
      tripCart: tripCart,
      notifications: const [],
    );
  }

  // ── Profile ──

  Future<void> upsertProfile({
    required String userId,
    required String fullName,
    required String phone,
    required String bio,
  }) async {
    await _sb.from('profiles').upsert({
      'user_id': userId,
      'full_name': fullName,
      'phone': phone,
      'bio': bio,
    });
  }

  // ── Wishlists (favorites) ──

  Future<void> addToWishlist({
    required String userId,
    required String title,
    required String itemType,
    String? propertyId,
    String? tourId,
    String? transportId,
  }) async {
    await _sb.from('favorites').insert({
      'user_id': userId,
      'title': title,
      'item_type': itemType,
      'property_id': ?propertyId,
      'tour_id': ?tourId,
      'transport_id': ?transportId,
    });
  }

  Future<void> removeFromWishlist({required String userId, required String id}) async {
    await _sb.from('favorites').delete().eq('id', id).eq('user_id', userId);
  }

  // ── Trip cart ──

  Future<void> addToTripCart({
    required String userId,
    required String itemType,
    required String referenceId,
    int quantity = 1,
    Map<String, dynamic>? metadata,
  }) async {
    await _sb.from('trip_cart_items').insert({
      'user_id': userId,
      'item_type': itemType,
      'reference_id': referenceId,
      'quantity': quantity,
      'metadata': ?metadata,
    });
  }

  Future<void> removeFromTripCart({required String userId, required String id}) async {
    await _sb.from('trip_cart_items').delete().eq('id', id).eq('user_id', userId);
  }

  Future<void> clearTripCart({required String userId}) async {
    await _sb.from('trip_cart_items').delete().eq('user_id', userId);
  }

  // ── Checkout requests ──

  /// Create a checkout_requests row (needed for card / bank transfer payments)
  Future<String> createCheckoutRequest({
    required String userId,
    required String name,
    required String email,
    String? phone,
    required double totalAmount,
    required double basePriceAmount,
    required double serviceFeeAmount,
    required String currency,
    required String paymentMethod,
    String? paymentProvider,
    required List<Map<String, dynamic>> items,
    String? specialRequests,
    Map<String, dynamic>? metadata,
  }) async {
    final mergedMetadata = <String, dynamic>{
      ...?metadata,
      'items': items,
      if (paymentProvider != null) 'payment_provider': paymentProvider,
    };
    final row = <String, dynamic>{
      'user_id': userId.trim().isEmpty ? null : userId,
      'name': name,
      'email': email,
      'phone': ?phone,
      'total_amount': totalAmount,
      'base_price_amount': basePriceAmount,
      'service_fee_amount': serviceFeeAmount,
      'currency': currency,
      'payment_method': paymentMethod,
      'dpo_token': ?paymentProvider,
      'payment_status': 'pending',
      'status': 'pending',
      'items': items,
      'message': ?specialRequests,
      'metadata': mergedMetadata,
    };
    final result = await _sb.from('checkout_requests').insert(row).select('id').single();
    return (result as Map)['id'].toString();
  }

  /// Update metadata on an existing checkout request.
  Future<void> updateCheckoutRequestMetadata({
    required String checkoutId,
    required Map<String, dynamic> metadata,
  }) async {
    try {
      final existing = await _sb
          .from('checkout_requests')
          .select('metadata')
          .eq('id', checkoutId)
          .maybeSingle();
      final existingMap = existing as Map<String, dynamic>?;
      final oldMeta = existingMap?['metadata'] as Map<String, dynamic>?;
      final merged = <String, dynamic>{...?oldMeta, ...metadata};
      await _sb.from('checkout_requests').update({'metadata': merged}).eq('id', checkoutId);
    } catch (_) {}
  }

  /// Initiate Flutterwave card payment via serverless function
  Future<Map<String, dynamic>> initFlutterwavePayment({
    required String checkoutId,
    required double amount,
    required String currency,
    required String payerName,
    required String payerEmail,
    String? phoneNumber,
    String? description,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/flutterwave');
    final body = <String, dynamic>{
      'action': 'create-payment',
      'checkoutId': checkoutId,
      'amount': amount,
      'currency': currency,
      'payerName': payerName,
      'payerEmail': payerEmail,
      'phoneNumber': ?phoneNumber,
      'description': description ?? 'Merry360x Mobile Booking',
      'redirectUrl': 'https://merry360x.com/payment-pending?checkoutId=$checkoutId&provider=flutterwave',
    };
    final resp = await _http.post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body));
    if (resp.statusCode != 200) throw Exception('Flutterwave init failed: ${resp.body}');
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  /// Check Flutterwave payment status
  Future<String> checkFlutterwaveStatus(String checkoutId) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/flutterwave');
    final resp = await _http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'action': 'verify-payment', 'checkoutId': checkoutId}),
    );
    if (resp.statusCode != 200) return 'pending';
    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    return (data['paymentStatus'] ?? data['status'] ?? 'pending').toString();
  }

  /// Check PawaPay mobile money deposit/checkout status.
  /// Returns one of: 'paid', 'pending', 'failed', or 'unknown'.
  Future<String> checkPawaPayStatus(String checkoutId, {String? depositId}) async {
    final queryParams = <String, String>{
      'checkoutId': checkoutId,
      if (depositId != null && depositId.isNotEmpty) 'depositId': depositId,
    };
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/pawapay-check-status').replace(queryParameters: queryParams);
    final resp = await _http.get(uri);
    if (resp.statusCode != 200) return 'pending';
    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    final status = (data['status'] ?? data['paymentStatus'] ?? '').toString().toLowerCase();
    if (status == 'paid' || status == 'completed') return 'paid';
    if (status == 'failed' || status == 'rejected' || status == 'cancelled') return 'failed';
    return 'pending';
  }

  /// Fetch the USD→RWF exchange rate from a free public API.
  /// Returns the rate (e.g. 1100.0) or null on failure.
  Future<double?> fetchExchangeRate() async {
    try {
      final uri = Uri.parse('https://api.exchangerate-api.com/v4/latest/USD');
      final resp = await _http.get(uri);
      if (resp.statusCode != 200) return null;
      final data = jsonDecode(resp.body) as Map<String, dynamic>;
      final rates = data['rates'] as Map<String, dynamic>?;
      if (rates == null) return null;
      final rate = rates['RWF'] ?? rates['rwf'];
      return double.tryParse('$rate');
    } catch (_) {
      return null;
    }
  }

  /// Initiate PawaPay mobile money deposit via serverless function.
  /// Call after creating a booking to send a payment push to the payer's phone.
  Future<Map<String, dynamic>> initiatePawaPayDeposit({
    required String bookingId,
    required double amount,
    required String currency,
    required String phoneNumber,
    String? payerName,
    String? payerEmail,
    required String provider,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/pawapay-create-payment');
    final body = <String, dynamic>{
      'checkoutId': bookingId,
      'amount': amount,
      'currency': currency,
      'phoneNumber': phoneNumber,
      'payerName': payerName?.isNotEmpty == true ? payerName : 'Guest',
      if (payerEmail != null && payerEmail.isNotEmpty) 'payerEmail': payerEmail,
      'provider': provider,
      'description': 'Merry360x Booking',
    };
    final resp = await _http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (resp.statusCode != 200) {
      throw Exception('Payment initiation failed (${resp.statusCode}): ${resp.body}');
    }
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  // ── Listing detail (full fetch) ──

  Future<Map<String, dynamic>?> fetchListingById({
    required String id,
    required String type,
  }) async {
    try {
      switch (type) {
        case 'property':
          final data = await _sb.from('properties').select('*').eq('id', id).maybeSingle();
          if (data != null) return _normalizeProperty({...data, 'item_type': 'property'});
        case 'tour':
          final data = await _sb.from('tours').select('*').eq('id', id).maybeSingle();
          if (data != null) return _normalizeTour({...data, 'item_type': 'tour'});
        case 'tour_package':
          final data = await _sb.from('tour_packages').select('*').eq('id', id).maybeSingle();
          if (data != null) {
            return {
              ...data,
              'item_type': 'tour_package',
              'source': 'tour_packages',
              'location': [data['city'], data['country']]
                  .where((v) => (v ?? '').toString().isNotEmpty)
                  .join(', '),
              'price_per_person': data['price_per_person'] ?? data['price_per_adult'],
              'is_published': data['is_published'] ?? data['status'] == 'approved',
              'images': [
                if ((data['cover_image'] ?? '').toString().isNotEmpty) data['cover_image'],
                ...((data['gallery_images'] as List?) ?? const []),
              ],
              'main_image': data['cover_image'],
            };
          }
        case 'transport':
          final data = await _sb.from('transport_vehicles').select('*').eq('id', id).maybeSingle();
          if (data != null) {
            return {
              ...data,
              'item_type': 'transport',
              'images': [data['image_url']],
              'main_image': data['image_url'],
            };
          }
      }
    } catch (_) {}
    return null;
  }

  // ── Bookings ──

  Future<String?> createBooking({
    required String userId,
    required String itemType,
    required String referenceId,
    required String title,
    String? mainImage,
    String? hostId,
    String? checkIn,
    String? checkOut,
    required int guests,
    required double totalAmount,
    required String currency,
    String? paymentPhone,
    String? paymentProvider,
    String? specialRequests,
    String? discountCode,
    double? discountAmount,
    // Guest-mode fields — populated when userId is empty.
    String? guestName,
    String? guestEmail,
    String? guestPhone,
  }) async {
    final isGuest = userId.trim().isEmpty;
    // Normalize booking_type: 'tour_package' → 'tour' to satisfy the DB check constraint.
    final bookingType = itemType == 'tour_package' ? 'tour' : itemType;
    final row = <String, dynamic>{
      if (!isGuest) 'guest_id': userId,
      'is_guest_booking': isGuest,
      'booking_type': bookingType,
      // guest_name = actual guest's name (for guests) or listing title (for members).
      'guest_name': isGuest ? (guestName ?? title) : title,
      if (isGuest && guestEmail != null && guestEmail.isNotEmpty) 'guest_email': guestEmail,
      if (isGuest && guestPhone != null && guestPhone.isNotEmpty) 'guest_phone': guestPhone,
      if (itemType == 'property') 'property_id': referenceId,
      if (itemType == 'tour' || itemType == 'tour_package') 'tour_id': referenceId,
      if (itemType == 'transport') 'transport_id': referenceId,
      'check_in': ?checkIn,
      'check_out': ?checkOut,
      'guests': guests,
      'total_price': totalAmount,
      'currency': currency,
      if (mainImage != null && mainImage.isNotEmpty) 'main_image': mainImage,
      if (hostId != null && hostId.isNotEmpty) 'host_id': hostId,
      'status': 'pending',
      'payment_status': 'pending',
      if (!isGuest) 'guest_phone': ?paymentPhone,
      'payment_phone': ?paymentPhone,
      'payment_method': ?paymentProvider,
      if (specialRequests != null && specialRequests.isNotEmpty) 'special_requests': specialRequests,
    };
    // Note: discount is already reflected in totalAmount; discount_code tracked via usage increment

    try {
      final result = await _sb.from('bookings').insert(row).select('id').single();
      return (result as Map)['id']?.toString();
    } catch (e) {
      throw Exception('Failed to create booking: $e');
    }
  }

  Future<List<Map<String, String>>> fetchBookedDateRanges(String listingId) async {
    try {
      final data = await _sb
          .from('bookings')
          .select('check_in, check_out')
          .eq('property_id', listingId)
          .inFilter('status', ['confirmed', 'pending']);
      final ranges = <Map<String, String>>[];
      for (final row in data) {
        final checkIn = row['check_in']?.toString();
        final checkOut = row['check_out']?.toString();
        if (checkIn == null || checkOut == null) continue;
        ranges.add({'start': checkIn, 'end': checkOut});
      }
      return ranges;
    } catch (_) {
      return [];
    }
  }

  // ── Auth helpers ──

  Future<void> forgotPassword(String email) async {
    await _sb.auth.resetPasswordForEmail(email);
  }

  // ── Search ──

  Future<List<Map<String, dynamic>>> searchListings({
    required String query,
    String category = 'all',
    double? minPrice,
    double? maxPrice,
    int guests = 1,
  }) async {
    final q = query.trim().toLowerCase();

    // Build an OR filter string that also matches individual tokens so that
    // formatted destinations like "Rubavu (Gisenyi)" match rows where the
    // location column contains only "Rubavu" or only "Gisenyi".
    String buildLocationFilter(String raw) {
      final tokens = raw
          .split(RegExp(r'[()\[\],]+'))
          .map((t) => t.trim())
          .where((t) => t.length >= 2)
          .toSet();
      final conditions = <String>[];
      for (final t in tokens) {
        conditions
          ..add('title.ilike.%$t%')
          ..add('location.ilike.%$t%');
      }
      return conditions.join(',');
    }

    final results = <Map<String, dynamic>>[];

    try {
      if (category == 'all' || category == 'stays') {
        var req = _sb
            .from('properties')
          .select('id, title, location, price_per_night, currency, property_type, rating, review_count, images, main_image')
            .eq('is_published', true);
        if (q.isNotEmpty) req = req.or(buildLocationFilter(q));
        if (minPrice != null) req = req.gte('price_per_night', minPrice);
        if (maxPrice != null) req = req.lte('price_per_night', maxPrice);
        final data = await req.limit(30);
        for (final r in (data as List).cast<Map<String, dynamic>>()) {
          results.add(_normalizeProperty(r));
        }
      }
      if (category == 'all' || category == 'tours') {
        var req2 = _sb
            .from('tours')
            .select('id, title, location, price_per_person, currency, images, main_image, rating, review_count, category, duration_days')
            .or('is_published.eq.true,is_published.is.null');
        if (q.isNotEmpty) req2 = req2.or(buildLocationFilter(q));
        final data = await req2.limit(30);
        for (final r in (data as List).cast<Map<String, dynamic>>()) {
          results.add(_normalizeTour(r));
        }
      }
      if (category == 'all' || category == 'transport') {
        var req3 = _sb
            .from('transport_vehicles')
            .select('id, title, provider_name, vehicle_type, seats, price_per_day, currency, driver_included, image_url, media')
            .or('is_published.eq.true,is_published.is.null');
        if (q.isNotEmpty) req3 = req3.ilike('title', '%$q%');
        final data = await req3.limit(30);
        for (final r in (data as List).cast<Map<String, dynamic>>()) {
          results.add(_normalizeTransport(r));
        }
      }
      if (category == 'all' || category == 'packages') {
        var req4 = _sb
            .from('tour_packages')
            .select('id, title, city, country, category, duration, max_guests, price_per_adult, price_per_person, currency, status, cover_image, gallery_images')
            .eq('status', 'approved');
        if (q.isNotEmpty) {
          final tokens = q.split(RegExp(r'[()?\[\],]+')).map((t) => t.trim()).where((t) => t.length >= 2).toSet();
          final pkgConds = <String>[];
          for (final t in tokens) {
            pkgConds..add('title.ilike.%$t%')..add('city.ilike.%$t%')..add('country.ilike.%$t%');
          }
          req4 = req4.or(pkgConds.join(','));
        }
        final data = await req4.limit(30);
        for (final r in (data as List).cast<Map<String, dynamic>>()) {
          results.add(_normalizeTourPackage(r));
        }
      }
    } catch (_) {}
    return results;
  }

  // ── Tours ──

  Future<List<Map<String, dynamic>>> fetchProperties({String? query, int limit = 50}) async {
    try {
      var req = _sb
          .from('properties')
          .select('id, title, location, price_per_night, currency, property_type, rating, review_count, images, main_image, created_at')
          .eq('is_published', true);
      final q = query?.trim().toLowerCase();
      if (q != null && q.isNotEmpty) {
        req = req.or('title.ilike.%$q%,location.ilike.%$q%,property_type.ilike.%$q%');
      }
      final data = await req.order('created_at', ascending: false).limit(limit);
      return (data as List).cast<Map<String, dynamic>>().map(_normalizeProperty).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchTours({String? category, String? query, int limit = 50}) async {
    try {
      var req = _sb
          .from('tours')
          // NOTE: keep this aligned with the actual DB schema. Some environments
          // don't have `main_image` on `tours`.
          .select('id, title, location, price_per_person, currency, images, rating, review_count, category, duration_days, max_group_size, created_at')
            .or('is_published.eq.true,is_published.is.null');
      if (category != null && category != 'all') req = req.eq('category', category);
      final q = query?.trim().toLowerCase();
      if (q != null && q.isNotEmpty) req = req.or('title.ilike.%$q%,location.ilike.%$q%,category.ilike.%$q%');
      final data = await req.order('created_at', ascending: false).limit(limit);
      assert(() {
        // ignore: avoid_print
        print('[fetchTours] rows=${(data as List).length} category=$category query=$query');
        return true;
      }());
      return (data as List).cast<Map<String, dynamic>>().map(_normalizeTour).toList();
    } catch (error) {
      assert(() {
        // ignore: avoid_print
        print('[fetchTours] error=$error');
        return true;
      }());
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchTourPackages({String? query, int limit = 50}) async {
    try {
      var req = _sb
          .from('tour_packages')
          // NOTE: keep this aligned with the actual DB schema. Some environments
          // don't have `difficulty` on `tour_packages`.
          .select('id, title, city, country, category, duration, max_guests, price_per_adult, price_per_person, currency, status, cover_image, gallery_images, non_refundable_items, pricing_tiers, created_at')
          .eq('status', 'approved');
      final q = query?.trim().toLowerCase();
      if (q != null && q.isNotEmpty) req = req.or('title.ilike.%$q%,city.ilike.%$q%,country.ilike.%$q%,category.ilike.%$q%');
      final data = await req.order('created_at', ascending: false).limit(limit);
      assert(() {
        // ignore: avoid_print
        print('[fetchTourPackages] rows=${(data as List).length} query=$query');
        return true;
      }());
      return (data as List).cast<Map<String, dynamic>>().map(_normalizeTourPackage).toList();
    } catch (error) {
      assert(() {
        // ignore: avoid_print
        print('[fetchTourPackages] error=$error');
        return true;
      }());
      return [];
    }
  }

  // ── Transport ──

  Future<List<Map<String, dynamic>>> fetchTransportListings({String? category, String? query, int limit = 50}) async {
    try {
      var req = _sb
          .from('transport_vehicles')
          .select('id, title, provider_name, vehicle_type, seats, price_per_day, currency, driver_included, image_url, media, created_at')
          .or('is_published.eq.true,is_published.is.null');
      if (category != null && category != 'all') req = req.eq('vehicle_type', category);
      final q = query?.trim().toLowerCase();
      if (q != null && q.isNotEmpty) req = req.or('title.ilike.%$q%,provider_name.ilike.%$q%,vehicle_type.ilike.%$q%');
      final data = await req.order('created_at', ascending: false).limit(limit);
      return (data as List).cast<Map<String, dynamic>>().map(_normalizeTransport).toList();
    } catch (_) {
      return [];
    }
  }

  // ── Stories ──

  Future<List<Map<String, dynamic>>> fetchStories() async {
    try {
      final cutoffIso = DateTime.now().toUtc().subtract(const Duration(hours: 24)).toIso8601String();
      final data = await _sb
          .from('stories')
          .select('id, user_id, title, body, location, media_url, media_type, image_url, created_at')
          .gte('created_at', cutoffIso)
          .order('created_at', ascending: false)
          .limit(80);

      final stories = (data as List).cast<Map<String, dynamic>>();
      if (stories.isEmpty) return stories;

      final userIds = stories
          .map((row) => (row['user_id'] ?? '').toString())
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      final profileMap = <String, Map<String, dynamic>>{};
      if (userIds.isNotEmpty) {
        final profiles = await _sb
            .from('profiles')
            .select('user_id, full_name, nickname, avatar_url')
            .inFilter('user_id', userIds);

        for (final row in (profiles as List).cast<Map<String, dynamic>>()) {
          final uid = (row['user_id'] ?? '').toString();
          if (uid.isNotEmpty) {
            profileMap[uid] = row;
          }
        }
      }

      return stories
          .map((story) {
            final uid = (story['user_id'] ?? '').toString();
            final profile = profileMap[uid];
            return {
              ...story,
              'profiles': ?profile,
            };
          })
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<String?> createStory({
    required String userId,
    required String title,
    String? body,
    String? imageUrl,
    String? videoUrl,
    String? mediaUrl,
    String? mediaType,
    String? location,
  }) async {
    final normalizedMediaUrl = mediaUrl ?? videoUrl ?? imageUrl;
    final normalizedMediaType = mediaType ??
        ((videoUrl ?? '').trim().isNotEmpty
            ? 'video'
            : (normalizedMediaUrl ?? '').trim().isNotEmpty
                ? 'image'
                : null);

    final result = await _sb.from('stories').insert({
      'user_id': userId,
      'title': title,
      'body': ?body,
      'media_url': ?normalizedMediaUrl,
      'media_type': ?normalizedMediaType,
      'image_url': ?(normalizedMediaType == 'image' ? normalizedMediaUrl : imageUrl),
      'location': ?location,
    }).select('id').single();
    return result['id']?.toString();
  }

  Future<void> deleteStory({
    required String storyId,
    required String userId,
  }) async {
    await _sb.from('stories').delete().eq('id', storyId).eq('user_id', userId);
  }

  Future<List<Map<String, dynamic>>> fetchStoryLikes({
    required List<String> storyIds,
  }) async {
    final ids = storyIds.where((id) => id.trim().isNotEmpty).toList();
    if (ids.isEmpty) return const [];

    try {
      final data = await _sb
          .from('story_likes')
          .select('story_id, user_id')
          .inFilter('story_id', ids);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return const [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchStoryComments({
    required List<String> storyIds,
    int limit = 200,
  }) async {
    final ids = storyIds.where((id) => id.trim().isNotEmpty).toList();
    if (ids.isEmpty) return const [];

    try {
      final data = await _sb
          .from('story_comments')
          .select('id, story_id, user_id, comment_text, created_at')
          .inFilter('story_id', ids)
          .order('created_at', ascending: false)
          .limit(limit);

      final comments = (data as List).cast<Map<String, dynamic>>();
      if (comments.isEmpty) return comments;

      final userIds = comments
          .map((row) => (row['user_id'] ?? '').toString())
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      final profileMap = <String, Map<String, dynamic>>{};
      if (userIds.isNotEmpty) {
        final profiles = await _sb
            .from('profiles')
            .select('user_id, full_name, nickname, avatar_url')
            .inFilter('user_id', userIds);

        for (final row in (profiles as List).cast<Map<String, dynamic>>()) {
          final uid = (row['user_id'] ?? '').toString();
          if (uid.isNotEmpty) {
            profileMap[uid] = row;
          }
        }
      }

      return comments
          .map((comment) {
            final uid = (comment['user_id'] ?? '').toString();
            final profile = profileMap[uid];
            return {
              ...comment,
              'profiles': ?profile,
            };
          })
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> likeStory({
    required String storyId,
    required String userId,
  }) async {
    await _sb.from('story_likes').insert({
      'story_id': storyId,
      'user_id': userId,
    });
  }

  Future<void> unlikeStory({
    required String storyId,
    required String userId,
  }) async {
    await _sb
        .from('story_likes')
        .delete()
        .eq('story_id', storyId)
        .eq('user_id', userId);
  }

  Future<void> addStoryComment({
    required String storyId,
    required String userId,
    required String commentText,
  }) async {
    await _sb.from('story_comments').insert({
      'story_id': storyId,
      'user_id': userId,
      'comment_text': commentText,
    });
  }

  // ── Booking management ──

  Future<void> cancelBooking({required String bookingId, required String userId}) async {
    await _sb
        .from('bookings')
        .update({'status': 'cancelled'})
        .eq('id', bookingId)
        .eq('guest_id', userId);
  }

  Future<void> submitReview({
    required String bookingId,
    required String userId,
    required String title,
    required double accommodationRating,
    required double serviceRating,
    required String comment,
  }) async {
    final booking = await _sb
        .from('bookings')
        .select('id, guest_id, property_id, tour_id, transport_id')
        .eq('id', bookingId)
        .eq('guest_id', userId)
        .maybeSingle();

    final propertyId = (booking?['property_id'] ?? '').toString().trim();
    final tourId = (booking?['tour_id'] ?? '').toString().trim();
    final transportId = (booking?['transport_id'] ?? '').toString().trim();

    final int accom = accommodationRating.round().clamp(1, 5);
    final int service = serviceRating.round().clamp(1, 5);
    final int overall = ((accom + service) / 2).round().clamp(1, 5);

    final cleanTitle = title.trim();
    final cleanComment = comment.trim();
    final mergedComment = cleanTitle.isEmpty
        ? cleanComment
        : '$cleanTitle\n\n$cleanComment';

    if (propertyId.isNotEmpty) {
      await _sb.from('property_reviews').insert({
        'booking_id': bookingId,
        'property_id': propertyId,
        'reviewer_id': userId,
        'rating': accom,
        'service_rating': service,
        'comment': mergedComment,
        'service_comment': cleanComment,
        'is_hidden': false,
      });
    } else {
      await _sb.from('reviews').insert({
        'booking_id': bookingId,
        'user_id': userId,
        'property_id': null,
        'tour_id': tourId.isEmpty ? null : tourId,
        'transport_id': transportId.isEmpty ? null : transportId,
        'rating': overall,
        'comment': mergedComment,
        'is_hidden': false,
      });
    }

    await _sb.from('bookings').update({'has_review': true}).eq('id', bookingId);
  }

  // ── Notifications ──

  Future<List<Map<String, dynamic>>> fetchNotifications({required String userId}) async {
    try {
      final data = await _sb
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(50);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<void> markNotificationRead({required String id}) async {
    await _sb.from('notifications').update({'is_read': true}).eq('id', id);
  }

  Future<void> markAllNotificationsRead({required String userId}) async {
    await _sb.from('notifications').update({'is_read': true}).eq('user_id', userId).eq('is_read', false);
  }

  /// Returns deduplicated broadcast records sent by admin/staff.
  /// Each entry represents one broadcast batch with recipient count.
  Future<List<Map<String, dynamic>>> fetchAdminNotificationBroadcasts() async {
    try {
      final data = await _sb
          .from('notifications')
          .select('title, body, notification_type, data, created_at')
          .filter('data->>source', 'eq', 'admin_notification_generator')
          .order('created_at', ascending: false)
          .limit(500);

      final rows = (data as List).cast<Map<String, dynamic>>();

      // Deduplicate: group entries that share the same title+body+type+audience.
      final Map<String, Map<String, dynamic>> grouped = {};
      for (final row in rows) {
        final title = row['title']?.toString() ?? '';
        final body = row['body']?.toString() ?? '';
        final type = row['notification_type']?.toString() ?? '';
        final dataMap = (row['data'] is Map)
            ? Map<String, dynamic>.from(row['data'] as Map)
            : <String, dynamic>{};
        final audience = dataMap['audience']?.toString() ?? 'all';
        final deepLink = dataMap['deep_link']?.toString() ?? '';
        final key = '$title\x00$body\x00$type\x00$audience';

        if (grouped.containsKey(key)) {
          grouped[key]!['_count'] = (grouped[key]!['_count'] as int) + 1;
        } else {
          grouped[key] = {
            'title': title,
            'body': body,
            'notification_type': type,
            'audience': audience,
            'deep_link': deepLink,
            'sent_at': row['created_at'],
            '_count': 1,
          };
        }
      }

      return grouped.values.toList();
    } catch (_) {
      return [];
    }
  }

  // ── Host dashboard ──


  Future<Map<String, dynamic>> fetchHostStats({required String userId}) async {
    try {
      final results = await Future.wait<dynamic>([
        fetchHostProperties(userId: userId),
        fetchHostTours(userId: userId),
        fetchHostTransport(userId: userId),
        fetchHostBookings(userId: userId),
        fetchHostPayouts(userId: userId),
      ]);

      final properties = (results[0] as List).cast<Map<String, dynamic>>();
      final tours = (results[1] as List).cast<Map<String, dynamic>>();
      final transport = (results[2] as List).cast<Map<String, dynamic>>();
      final bookings = (results[3] as List).cast<Map<String, dynamic>>();
      final payouts = (results[4] as List).cast<Map<String, dynamic>>();

      final confirmedBookings = bookings.where((booking) {
        final status = (booking['status'] ?? '').toString().toLowerCase();
        final paymentStatus = (booking['payment_status'] ?? '').toString().toLowerCase();
        final isConfirmed = status == 'confirmed' || status == 'completed';
        final isRefunded = paymentStatus.contains('refund');
        final isUnpaid = paymentStatus == 'failed' || paymentStatus == 'pending' || paymentStatus == 'requested' || paymentStatus == 'unpaid' || paymentStatus == 'not_paid' || paymentStatus == 'expired';
        return isConfirmed && !isRefunded && !isUnpaid;
      }).toList();

      final grossRevenue = confirmedBookings.fold<double>(
        0,
        (sum, booking) => sum + ((booking['total_price'] as num?)?.toDouble() ?? 0),
      );
      final netEarnings = grossRevenue * 0.97;
      final pendingPayout = payouts
          .where((payout) {
            final status = (payout['status'] ?? '').toString().toLowerCase();
            return status == 'pending' || status == 'processing';
          })
          .fold<double>(0, (sum, payout) => sum + ((payout['amount'] as num?)?.toDouble() ?? 0));
      final completedPayout = payouts
          .where((payout) => (payout['status'] ?? '').toString().toLowerCase() == 'completed')
          .fold<double>(0, (sum, payout) => sum + ((payout['amount'] as num?)?.toDouble() ?? 0));
      final availableForPayout = (netEarnings - pendingPayout - completedPayout).clamp(0, double.infinity).toDouble();
      final publishedProperties = properties.where((property) => property['is_published'] == true).length;
      final pendingBookings = bookings.where((booking) {
        final status = (booking['status'] ?? '').toString().toLowerCase();
        return status == 'pending' || status == 'pending_confirmation';
      }).length;

      return {
        'property_count': properties.length,
        'published_property_count': publishedProperties,
        'tour_count': tours.length,
        'transport_count': transport.length,
        'total_bookings': bookings.length,
        'pending_bookings': pendingBookings,
        'confirmed_bookings': confirmedBookings.length,
        'gross_revenue': grossRevenue,
        'net_earnings': netEarnings,
        'total_revenue': netEarnings,
        'pending_payout': pendingPayout,
        'completed_payout': completedPayout,
        'available_for_payout': availableForPayout,
        'currency': bookings.isNotEmpty ? (bookings.first['currency'] ?? 'RWF') : 'RWF',
      };
    } catch (_) {
      return {
        'property_count': 0,
        'published_property_count': 0,
        'tour_count': 0,
        'transport_count': 0,
        'total_bookings': 0,
        'pending_bookings': 0,
        'confirmed_bookings': 0,
        'gross_revenue': 0.0,
        'net_earnings': 0.0,
        'total_revenue': 0.0,
        'pending_payout': 0.0,
        'completed_payout': 0.0,
        'available_for_payout': 0.0,
        'currency': 'RWF',
      };
    }
  }

  Future<List<Map<String, dynamic>>> fetchHostListings({required String userId}) async {
    try {
      final results = await Future.wait([
        _sb.from('properties').select('id, title, location, price_per_night, currency, images, main_image, rating, review_count, is_published').eq('host_id', userId).order('created_at', ascending: false),
        _sb.from('tours').select('id, title, location, price_per_person, currency, images, main_image, rating, review_count, is_published').eq('host_id', userId).order('created_at', ascending: false),
        _sb.from('transport_vehicles').select('id, title, provider_name, vehicle_type, seats, price_per_day, currency, image_url, media, is_published').eq('host_id', userId).order('created_at', ascending: false),
      ]);
      return [
        ...(results[0] as List).cast<Map<String, dynamic>>().map(_normalizeProperty),
        ...(results[1] as List).cast<Map<String, dynamic>>().map(_normalizeTour),
        ...(results[2] as List).cast<Map<String, dynamic>>().map(_normalizeTransport),
      ];
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchHostBookings({required String userId}) async {
    try {
      final inventoryResults = await Future.wait<dynamic>([
        _sb.from('properties').select('id').eq('host_id', userId),
        _sb.from('tours').select('id').eq('created_by', userId),
        _sb.from('tour_packages').select('id').eq('host_id', userId),
        _sb.from('transport_vehicles').select('id').eq('created_by', userId),
      ]);

      final propertyIds = (inventoryResults[0] as List).map((row) => (row as Map)['id']?.toString()).whereType<String>().toList();
      final tourIds = (inventoryResults[1] as List).map((row) => (row as Map)['id']?.toString()).whereType<String>().toList();
      final tourPackageIds = (inventoryResults[2] as List).map((row) => (row as Map)['id']?.toString()).whereType<String>().toList();
      final transportIds = (inventoryResults[3] as List).map((row) => (row as Map)['id']?.toString()).whereType<String>().toList();
      final allTourIds = {...tourIds, ...tourPackageIds}.toList();

      // Use '*' (like the web) to avoid failures from non-existent columns in explicit lists
      final bookingQueries = <Future<dynamic>>[];
      if (propertyIds.isNotEmpty) {
        bookingQueries.add(
          _sb
              .from('bookings')
              .select('*, properties(title, price_per_night, currency, main_image, images)')
              .eq('booking_type', 'property')
              .inFilter('property_id', propertyIds)
              .order('created_at', ascending: false),
        );
      }
      if (allTourIds.isNotEmpty) {
        bookingQueries.add(
          _sb
              .from('bookings')
              .select('*, tour_packages(title, price_per_adult, currency, main_image, images)')
              .eq('booking_type', 'tour')
              .inFilter('tour_id', allTourIds)
              .order('created_at', ascending: false),
        );
      }
      if (transportIds.isNotEmpty) {
        bookingQueries.add(
          _sb
              .from('bookings')
              .select('*, transport_vehicles(title, currency, main_image, images)')
              .eq('booking_type', 'transport')
              .inFilter('transport_id', transportIds)
              .order('created_at', ascending: false),
        );
      }

      if (bookingQueries.isEmpty) {
        return [];
      }

      final bookingResults = await Future.wait<dynamic>(bookingQueries);
      final bookingRows = bookingResults.expand((rows) => (rows as List).cast<Map<String, dynamic>>()).toList();

      // Fetch checkout_requests by order_id (same as web) for accurate payment amounts
      final orderIds = bookingRows
          .map((row) => row['order_id']?.toString())
          .whereType<String>()
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      final checkoutByOrderId = <String, Map<String, dynamic>>{};
      if (orderIds.isNotEmpty) {
        final checkouts = await _sb
            .from('checkout_requests')
            .select('id, total_amount, currency, payment_status, payment_method, base_price_amount, service_fee_amount')
            .inFilter('id', orderIds);
        for (final cr in (checkouts as List).cast<Map<String, dynamic>>()) {
          final cid = cr['id']?.toString();
          if (cid != null && cid.isNotEmpty) checkoutByOrderId[cid] = cr;
        }
      }

      // Fetch guest profiles
      final guestIds = bookingRows
          .map((row) => row['guest_id']?.toString())
          .whereType<String>()
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      final guestLookup = <String, Map<String, dynamic>>{};
      if (guestIds.isNotEmpty) {
        final guests = await _sb
            .from('profiles')
            .select('user_id, full_name, avatar_url, email, phone')
            .inFilter('user_id', guestIds);
        for (final guest in (guests as List).cast<Map<String, dynamic>>()) {
          final gId = guest['user_id']?.toString();
          if (gId != null && gId.isNotEmpty) guestLookup[gId] = guest;
        }
      }

      final normalized = bookingRows.map((row) {
        final bookingType = (row['booking_type'] ?? '').toString();
        final property = row['properties'] as Map<String, dynamic>?;
        final tourPackage = row['tour_packages'] as Map<String, dynamic>?;
        final transport = row['transport_vehicles'] as Map<String, dynamic>?;
        final guestProfile = guestLookup[row['guest_id']?.toString() ?? ''];
        final checkout = checkoutByOrderId[row['order_id']?.toString() ?? ''];

        String listingTitle = 'Booking';
        if (bookingType == 'property') {
          listingTitle = (property?['title'] ?? 'Accommodation booking').toString();
        } else if (bookingType == 'tour') {
          listingTitle = (tourPackage?['title'] ?? 'Tour booking').toString();
        } else if (bookingType == 'transport') {
          listingTitle = (transport?['title'] ?? 'Transport booking').toString();
        }

        // Prefer checkout_request total_amount (authoritative) over bookings.total_price
        final totalAmount = checkout?['total_amount'] != null
            ? (checkout!['total_amount'] as num).toDouble()
            : (row['total_price'] as num?)?.toDouble();
        final currency = checkout?['currency'] ?? row['currency'];

        final mainImage = switch (bookingType) {
          'property' => property?['main_image']?.toString(),
          'tour' => tourPackage?['main_image']?.toString(),
          'transport' => transport?['main_image']?.toString(),
          _ => null,
        } ?? row['main_image']?.toString() ?? '';

        final images = switch (bookingType) {
          'property' => property?['images'],
          'tour' => tourPackage?['images'],
          'transport' => transport?['images'],
          _ => null,
        } ?? row['images'];

        return {
          ...row,
          'listing_title': listingTitle,
          'item_title': listingTitle,
          'main_image': mainImage,
          'images': images,
          'guest_name': row['guest_name'] ?? guestProfile?['full_name'],
          'guest_email': row['guest_email'] ?? guestProfile?['email'],
          'guest_phone': row['guest_phone'] ?? guestProfile?['phone'],
          'guest_avatar_url': guestProfile?['avatar_url'],
          'total_amount': totalAmount,
          'currency': currency,
          'payment_status': checkout?['payment_status'] ?? row['payment_status'],
          'payment_method': checkout?['payment_method'] ?? row['payment_method'],
        };
      }).toList()
        ..sort((a, b) => ((b['created_at'] ?? '') as String).compareTo((a['created_at'] ?? '') as String));

      return normalized;
    } catch (e) {
      debugPrint('[fetchHostBookings] error: $e');
      return [];
    }
  }

  Future<void> updateListingStatus({
    required String id,
    required String type,
    required bool published,
  }) async {
    final table = type == 'property' ? 'properties' : type == 'tour' ? 'tours' : 'transport_vehicles';
    await _sb.from(table).update({'is_published': published}).eq('id', id);
  }

  // ── Support tickets ──

  Future<List<Map<String, dynamic>>> fetchSupportTickets({required String userId, bool allTickets = false}) async {
    try {
      var req = _sb.from('support_tickets').select(
        '*, support_ticket_messages(id, message, sender_id, sender_type, sender_name, attachments, reply_to_id, created_at)',
      );
      if (!allTickets) req = req.eq('user_id', userId);
      final data = await req.order('created_at', ascending: false).limit(50);
      final tickets = (data as List).cast<Map<String, dynamic>>();
      for (final ticket in tickets) {
        final messages = ((ticket['support_ticket_messages'] as List?) ?? const <dynamic>[])
            .whereType<Map>()
            .map((row) => Map<String, dynamic>.from(row))
            .toList()
          ..sort((a, b) =>
              (a['created_at'] ?? '').toString().compareTo((b['created_at'] ?? '').toString()));
        ticket['support_ticket_messages'] = messages;
      }
      return tickets;
    } catch (_) {
      // Legacy fallback for environments still using support_messages.
      try {
        var req = _sb.from('support_tickets').select('*, support_messages(id, body, sender_id, created_at)');
        if (!allTickets) req = req.eq('user_id', userId);
        final data = await req.order('created_at', ascending: false).limit(50);
        final tickets = (data as List).cast<Map<String, dynamic>>();
        for (final ticket in tickets) {
          final legacy = ((ticket['support_messages'] as List?) ?? const <dynamic>[])
              .whereType<Map>()
              .map((row) => <String, dynamic>{
                    'id': row['id'],
                    'message': row['body'],
                    'sender_id': row['sender_id'],
                    'sender_type': 'customer',
                    'sender_name': null,
                    'attachments': const <dynamic>[],
                    'reply_to_id': null,
                    'created_at': row['created_at'],
                  })
              .toList()
            ..sort((a, b) =>
                (a['created_at'] ?? '').toString().compareTo((b['created_at'] ?? '').toString()));
          ticket['support_ticket_messages'] = legacy;
        }
        return tickets;
      } catch (_) {
        return [];
      }
    }
  }

  Future<String?> createSupportTicket({
    required String userId,
    required String subject,
    required String message,
  }) async {
    final ticket = await _sb.from('support_tickets').insert({
      'user_id': userId,
      'subject': subject,
      'message': message,
      'category': 'general',
      'status': 'open',
    }).select('id').single();
    final ticketId = ticket['id']?.toString();
    if (ticketId != null) {
      await _sb.from('support_ticket_messages').insert({
        'ticket_id': ticketId,
        'sender_id': userId,
        'sender_type': 'customer',
        'message': message,
      });
    }
    return ticketId;
  }

  Future<Map<String, dynamic>> sendTicketReply({
    required String ticketId,
    required String userId,
    required String message,
    String senderType = 'customer',
    String? senderName,
  }) async {
    final saved = await _sb
        .from('support_ticket_messages')
        .insert({
          'ticket_id': ticketId,
          'sender_id': userId,
          'sender_type': senderType,
          if (senderName != null && senderName.trim().isNotEmpty)
            'sender_name': senderName.trim(),
          'message': message,
        })
        .select('id, ticket_id, sender_id, sender_type, sender_name, message, attachments, reply_to_id, created_at')
        .single();
    final nextStatus = senderType == 'staff' ? 'in_progress' : 'open';
    await _sb
      .from('support_tickets')
      .update({'status': nextStatus, 'updated_at': DateTime.now().toIso8601String()})
      .eq('id', ticketId);
    return Map<String, dynamic>.from(saved as Map);
  }

  // ── Social graph + direct host messaging ──

  Future<Map<String, dynamic>?> fetchPublicProfile({required String userId}) async {
    try {
      final data = await _sb
          .from('profiles')
          .select('user_id, full_name, nickname, avatar_url, bio, created_at')
          .eq('user_id', userId)
          .maybeSingle();
      if (data == null) return null;
      return Map<String, dynamic>.from(data as Map);
    } catch (_) {
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> searchProfiles({required String query, int limit = 20}) async {
    if (query.trim().isEmpty) return [];
    try {
      final q = '%${query.trim().toLowerCase()}%';
      final data = await _sb
          .from('profiles')
          .select('user_id, full_name, nickname, avatar_url')
          .or('full_name.ilike.$q,nickname.ilike.$q')
          .limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<int> fetchHostFollowersCount({required String hostId}) async {
    try {
      final data = await _sb.from('host_follows').select('id').eq('host_id', hostId);
      return (data as List).length;
    } catch (_) {
      return 0;
    }
  }

  Future<bool> isFollowingHost({required String userId, required String hostId}) async {
    try {
      final data = await _sb
          .from('host_follows')
          .select('id')
          .eq('follower_id', userId)
          .eq('host_id', hostId)
          .maybeSingle();
      return data != null;
    } catch (_) {
      return false;
    }
  }

  Future<void> followHost({required String userId, required String hostId}) async {
    if (userId == hostId) return;
    await _sb.from('host_follows').upsert(
      {
        'follower_id': userId,
        'host_id': hostId,
      },
      onConflict: 'follower_id,host_id',
    );
  }

  Future<void> unfollowHost({required String userId, required String hostId}) async {
    await _sb
        .from('host_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('host_id', hostId);
  }

  Future<void> sendDirectMessage({
    required String senderId,
    required String recipientId,
    required String body,
  }) async {
    if (senderId == recipientId) {
      throw Exception('You cannot message yourself.');
    }

    final validationError = validateDirectMessage(body);
    if (validationError != null) {
      throw Exception(validationError);
    }

    await _sb.from('direct_messages').insert({
      'sender_id': senderId,
      'recipient_id': recipientId,
      'body': body.trim(),
    });
  }

  Future<List<Map<String, dynamic>>> fetchDirectMessages({
    required String userId,
    required String peerId,
    int limit = 200,
  }) async {
    try {
      final data = await _sb
          .from('direct_messages')
          .select('id, sender_id, recipient_id, body, created_at, read_at')
          .or('and(sender_id.eq.$userId,recipient_id.eq.$peerId),and(sender_id.eq.$peerId,recipient_id.eq.$userId)')
          .order('created_at', ascending: true)
          .limit(limit);

      final rows = (data as List)
          .whereType<Map>()
          .map((row) => Map<String, dynamic>.from(row))
          .toList();

      if (rows.isEmpty) return rows;

      final profile = await fetchPublicProfile(userId: peerId);
      if (profile != null) {
        for (final row in rows) {
          row['peer_profile'] = profile;
        }
      }

      return rows;
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchDirectConversations({
    required String userId,
    int limit = 500,
  }) async {
    try {
      final data = await _sb
          .from('direct_messages')
          .select('id, sender_id, recipient_id, body, created_at, read_at')
          .or('sender_id.eq.$userId,recipient_id.eq.$userId')
          .order('created_at', ascending: false)
          .limit(limit);

      final rows = (data as List)
          .whereType<Map>()
          .map((row) => Map<String, dynamic>.from(row))
          .toList();

      final byPeer = <String, Map<String, dynamic>>{};
      for (final row in rows) {
        final senderId = (row['sender_id'] ?? '').toString();
        final recipientId = (row['recipient_id'] ?? '').toString();
        final peerId = senderId == userId ? recipientId : senderId;
        if (peerId.isEmpty) continue;

        final existing = byPeer[peerId];
        if (existing == null) {
          byPeer[peerId] = {
            'peer_id': peerId,
            'last_message': row['body'],
            'last_message_at': row['created_at'],
            'unread_count':
                recipientId == userId && row['read_at'] == null ? 1 : 0,
          };
          continue;
        }

        if (recipientId == userId && row['read_at'] == null) {
          existing['unread_count'] = (existing['unread_count'] as int) + 1;
        }
      }

      final peerIds = byPeer.keys.toList();
      if (peerIds.isNotEmpty) {
        final profiles = await _sb
            .from('profiles')
            .select('user_id, full_name, nickname, avatar_url')
            .inFilter('user_id', peerIds);

        final profileMap = <String, Map<String, dynamic>>{};
        for (final row in (profiles as List).whereType<Map>()) {
          final uid = (row['user_id'] ?? '').toString();
          if (uid.isEmpty) continue;
          profileMap[uid] = Map<String, dynamic>.from(row);
        }

        for (final entry in byPeer.entries) {
          entry.value['peer_profile'] = profileMap[entry.key];
        }
      }

      final conversations = byPeer.values.toList()
        ..sort((a, b) => (b['last_message_at'] ?? '')
            .toString()
            .compareTo((a['last_message_at'] ?? '').toString()));
      return conversations;
    } catch (_) {
      return [];
    }
  }

  Future<void> markDirectConversationRead({
    required String userId,
    required String peerId,
  }) async {
    await _sb
        .from('direct_messages')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()})
        .eq('recipient_id', userId)
        .eq('sender_id', peerId)
        .isFilter('read_at', null);
  }

  // ── Affiliate ──

  Future<Map<String, dynamic>> fetchAffiliateData({required String userId}) async {
    try {
      final results = await Future.wait([
        _sb.from('affiliates').select('*').eq('user_id', userId).maybeSingle(),
        _sb.from('affiliate_referrals').select('id, created_at').eq('affiliate_id', userId).limit(100),
        _sb.from('affiliate_commissions').select('id, amount, currency, created_at, status').eq('affiliate_id', userId).limit(100),
      ]);
      return {
        'profile': results[0],
        'referrals': (results[1] as List).cast<Map<String, dynamic>>(),
        'commissions': (results[2] as List).cast<Map<String, dynamic>>(),
      };
    } catch (_) {
      return {'profile': null, 'referrals': [], 'commissions': []};
    }
  }

  // ── Admin ──

  Future<Map<String, dynamic>> fetchAdminStats() async {
    try {
      final results = await Future.wait([
        _sb.from('profiles').select('id').limit(1000),
        _sb.from('bookings').select('id, total_amount, currency, status').limit(1000),
        _sb.from('properties').select('id').eq('is_published', true),
        _sb.from('host_applications').select('id').eq('status', 'pending'),
      ]);
      final bookings = (results[1] as List).cast<Map<String, dynamic>>();
      final revenue = bookings
          .where((b) => b['status'] == 'confirmed' || b['status'] == 'completed')
          .fold<double>(0, (s, b) => s + ((b['total_amount'] as num?)?.toDouble() ?? 0));
      return {
        'total_users': (results[0] as List).length,
        'total_bookings': bookings.length,
        'active_properties': (results[2] as List).length,
        'pending_applications': (results[3] as List).length,
        'total_revenue': revenue,
      };
    } catch (_) {
      return {'total_users': 0, 'total_bookings': 0, 'active_properties': 0, 'pending_applications': 0, 'total_revenue': 0.0};
    }
  }

  Future<List<Map<String, dynamic>>> fetchAllUsers({int limit = 50}) async {
    try {
      final data = await _sb.from('profiles').select('user_id, full_name, bio, avatar_url, phone, created_at').order('created_at', ascending: false).limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchHostApplications({String? status}) async {
    try {
      var req = _sb.from('host_applications').select('*');
      if (status != null) req = req.eq('status', status);
      final data = await req.order('created_at', ascending: false).limit(50);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<void> updateHostApplication({required String id, required String status}) async {
    await _sb.from('host_applications').update({'status': status}).eq('id', id);
  }

  Future<List<Map<String, dynamic>>> fetchAllBookingsAdmin({int limit = 100}) async {
    try {
      final data = await _sb.from('bookings').select('*').order('created_at', ascending: false).limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchReviews({int limit = 50}) async {
    try {
      final data = await _sb.from('reviews').select('*').order('created_at', ascending: false).limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<void> deleteReview({required String id}) async {
    await _sb.from('reviews').delete().eq('id', id);
  }

  // ── Admin (extended) ──

  Future<Map<String, dynamic>> fetchAdminEnhancedStats() async {
    try {
      final metricsRaw = await _sb.rpc('admin_dashboard_metrics');
      final bookingsRaw = await _sb
          .from('bookings')
          .select('id, total_price, currency, status, payment_status, booking_type')
          .limit(5000);
      final hostAppsRaw = await _sb
          .from('host_applications')
          .select('id, status')
          .limit(1000);
      final payoutsRaw = await _sb
          .from('host_payouts')
          .select('id, amount, status, currency')
          .limit(1000);

      final metrics = ((metricsRaw as Map?) ?? const <String, dynamic>{}).cast<String, dynamic>();
      final bookings = (bookingsRaw as List).cast<Map<String, dynamic>>();
      final hostApps = (hostAppsRaw as List).cast<Map<String, dynamic>>();
      final payouts = (payoutsRaw as List).cast<Map<String, dynamic>>();

      final paid = bookings.where(
          (b) => b['status'] == 'confirmed' || b['status'] == 'completed');
      final pending =
          bookings.where((b) => b['status'] == 'pending' || b['status'] == 'awaiting_confirmation');

      const guestFeeMultiplier = 12.0 / 112.0;
      const hostFeePct = 0.03;
      const pawaPayPct = 0.031;

      double totalRevenue = (metrics['revenue_gross'] as num?)?.toDouble() ?? 0;
      double totalHostEarnings = 0;
      double totalGuestFee = 0;
      double totalHostFee = 0;
      double totalPawaPay = 0;
      final Map<String, double> revByCurrency = {};

      final rawRevenueByCurrency = metrics['revenue_by_currency'];
      if (rawRevenueByCurrency is List) {
        for (final item in rawRevenueByCurrency) {
          if (item is Map) {
            final currency = (item['currency'] ?? 'RWF').toString();
            final amount = (item['amount'] as num?)?.toDouble() ?? 0;
            revByCurrency[currency] = (revByCurrency[currency] ?? 0) + amount;
          }
        }
      }

      for (final b in paid) {
        final guestPaid = (b['total_price'] as num?)?.toDouble() ?? 0;
        final currency = (b['currency'] as String?) ?? 'RWF';
        final guestFee = guestPaid * guestFeeMultiplier;
        final base = guestPaid - guestFee;
        final hostFee = base * hostFeePct;
        final pawaPay = guestPaid * pawaPayPct;
        totalGuestFee += guestFee;
        totalHostFee += hostFee;
        totalHostEarnings += base - hostFee;
        totalPawaPay += pawaPay;
        if (revByCurrency.isEmpty) {
          revByCurrency[currency] = (revByCurrency[currency] ?? 0) + guestPaid;
        }
      }

      if (bookings.isEmpty && totalRevenue > 0) {
        totalGuestFee = totalRevenue * guestFeeMultiplier;
        final base = totalRevenue - totalGuestFee;
        totalHostFee = base * hostFeePct;
        totalHostEarnings = base - totalHostFee;
        totalPawaPay = totalRevenue * pawaPayPct;
      }

      final pendingPayoutsTotal = payouts
          .where((p) => p['status'] == 'pending')
          .fold<double>(0, (s, p) => s + ((p['amount'] as num?)?.toDouble() ?? 0));

      return {
        'total_users': (metrics['users_total'] as num?)?.toInt() ?? 0,
        'total_bookings': (metrics['bookings_total'] as num?)?.toInt() ?? bookings.length,
        'pending_bookings': (metrics['bookings_pending'] as num?)?.toInt() ?? pending.length,
        'paid_bookings': (metrics['bookings_paid'] as num?)?.toInt() ?? paid.length,
        'total_properties': (metrics['properties_total'] as num?)?.toInt() ?? 0,
        'published_properties': (metrics['properties_published'] as num?)?.toInt() ?? 0,
        'total_tours': (metrics['tours_total'] as num?)?.toInt() ?? 0,
        'total_transport': (metrics['transport_vehicles_total'] as num?)?.toInt() ?? 0,
        'pending_applications': hostApps.where((h) => h['status'] == 'pending').length,
        'total_revenue': totalRevenue,
        'total_host_earnings': totalHostEarnings,
        'total_guest_fee': totalGuestFee,
        'total_host_fee': totalHostFee,
        'total_platform_earnings': totalGuestFee + totalHostFee,
        'total_pawapay_fees': totalPawaPay,
        'net_revenue': totalRevenue - totalPawaPay,
        'revenue_by_currency': revByCurrency,
        'pending_payouts_total': pendingPayoutsTotal,
      };
    } catch (_) {
      return {};
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdminAllUsers({String? search}) async {
    try {
      final params = <String, dynamic>{};
      if (search != null && search.isNotEmpty) params['_search'] = search;
      final data = await _sb.rpc('admin_list_users', params: params.isEmpty ? {} : params);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdminProperties({int limit = 150}) async {
    try {
      final data = await _sb
          .from('properties')
          .select('id, title, location, price_per_night, currency, is_published, host_id, rating, review_count, images, main_image, created_at')
          .order('created_at', ascending: false)
          .limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdminAllTours({int limit = 150}) async {
    try {
      final results = await Future.wait([
        _sb.from('tours').select('id, title, location, price_per_person, currency, is_published, created_by, rating, review_count, images, main_image, created_at').order('created_at', ascending: false).limit(limit),
        _sb.from('tour_packages').select('id, title, city, country, price_per_adult, currency, status, host_id, price_per_person, cover_image, gallery_images, created_at').order('created_at', ascending: false).limit(limit),
      ]);
      final list = [
        ...(results[0] as List).cast<Map<String, dynamic>>().map((t) => {...t, '_table': 'tours'}),
        ...(results[1] as List).cast<Map<String, dynamic>>().map((t) => {
          ...t,
          'location': '${t['city'] ?? ''}, ${t['country'] ?? ''}'.trim(),
          'price_per_person': t['price_per_person'] ?? t['price_per_adult'],
          'is_published': t['status'] == 'approved',
          'images': [
            if ((t['cover_image'] ?? '').toString().isNotEmpty) t['cover_image'],
            ...((t['gallery_images'] as List?) ?? const []),
          ],
          '_table': 'tour_packages',
        }),
      ];
      list.sort((a, b) => (b['created_at'] ?? '').compareTo(a['created_at'] ?? ''));
      return list;
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdminTransportVehicles({int limit = 150}) async {
    try {
      final data = await _sb
          .from('transport_vehicles')
          .select('id, title, is_published, is_approved, vehicle_type, price_per_day, currency, provider_name, created_by, image_url, media, created_at')
          .order('created_at', ascending: false)
          .limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdminPayouts({int limit = 100}) async {
    try {
      final data = await _sb
          .from('host_payouts')
          .select('*, profiles!host_payouts_host_id_profiles_fkey(full_name, phone)')
          .order('created_at', ascending: false)
          .limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdminBanners() async {
    try {
      final data = await _sb
          .from('ad_banners')
          .select('*')
          .order('sort_order', ascending: true);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<void> createAdBanner({
    required String message,
    String? ctaLabel,
    String? ctaUrl,
    String? bgColor,
    String? textColor,
  }) async {
    await _sb.from('ad_banners').insert({
      'message': message,
      if (ctaLabel != null && ctaLabel.isNotEmpty) 'cta_label': ctaLabel,
      if (ctaUrl != null && ctaUrl.isNotEmpty) 'cta_url': ctaUrl,
      if (bgColor != null && bgColor.isNotEmpty) 'bg_color': bgColor,
      if (textColor != null && textColor.isNotEmpty) 'text_color': textColor,
      'is_active': true,
    });
  }

  Future<void> updateAdBannerActive({required String id, required bool isActive}) async {
    await _sb.from('ad_banners').update({'is_active': isActive}).eq('id', id);
  }

  Future<void> deleteAdBanner({required String id}) async {
    await _sb.from('ad_banners').delete().eq('id', id);
  }

  Future<void> suspendUser({required String userId, required bool suspended}) async {
    try {
      await _sb.from('profiles').update({'is_suspended': suspended}).eq('user_id', userId);
    } on PostgrestException catch (e) {
      final message = e.message.toLowerCase();
      final isMissingSuspensionColumn =
          e.code == 'PGRST204' && message.contains('is_suspended');
      if (!isMissingSuspensionColumn) rethrow;

      // Backward-compatible fallback for older schemas where profiles.is_suspended
      // has not been migrated yet.
      await _sb.from('host_applications').update({
        'suspended': suspended,
        if (!suspended) 'suspension_reason': null,
        'suspended_at': suspended ? DateTime.now().toIso8601String() : null,
      }).eq('user_id', userId);
    }
  }

  Future<void> toggleListingPublished({
    required String table,
    required String id,
    required bool published,
  }) async {
    if (table == 'tour_packages') {
      await _sb.from(table).update({'status': published ? 'approved' : 'pending'}).eq('id', id);
      return;
    }
    await _sb.from(table).update({'is_published': published}).eq('id', id);
  }

  Future<void> deleteAdminListing({required String table, required String id}) async {
    await _sb.from(table).delete().eq('id', id);
  }

  Future<void> updatePayoutStatus({required String id, required String status}) async {
    await _sb.from('host_payouts').update({
      'status': status,
      if (status == 'paid' || status == 'completed') 'processed_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
  }

  Future<List<Map<String, dynamic>>> fetchAdminSupportTickets({int limit = 80}) async {
    try {
      final data = await _sb
          .from('support_tickets')
          .select('*')
          .order('created_at', ascending: false)
          .limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<void> updateSupportTicketStatus({required String id, required String status}) async {
    await _sb.from('support_tickets').update({'status': status, 'updated_at': DateTime.now().toIso8601String()}).eq('id', id);
  }

  Future<Map<String, dynamic>> sendAdminGeneralNotification({
    required String title,
    required String body,
    String audience = 'all',
    List<String> userIds = const <String>[],
    String notificationType = 'special',
    String? deepLink,
    bool sendPush = true,
    bool sendInApp = true,
  }) async {
    Map<String, dynamic>? decodeJwtPayload(String token) {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      try {
        final normalized = base64Url.normalize(parts[1]);
        final payload = utf8.decode(base64Url.decode(normalized));
        final decoded = jsonDecode(payload);
        if (decoded is Map<String, dynamic>) return decoded;
        if (decoded is Map) return Map<String, dynamic>.from(decoded);
      } catch (_) {
        return null;
      }
      return null;
    }

    String expectedProjectRef() {
      try {
        final host = Uri.parse(AppConfig.supabaseUrl).host;
        return host.split('.').first.trim();
      } catch (_) {
        return '';
      }
    }

    Future<int> authUserPreflightStatus(String token) async {
      try {
        final uri = Uri.parse('${AppConfig.supabaseUrl}/auth/v1/user');
        final resp = await _http.get(
          uri,
          headers: {
            'apikey': AppConfig.supabaseAnonKey,
            'Authorization': 'Bearer $token',
          },
        );
        return resp.statusCode;
      } catch (_) {
        return -1;
      }
    }

    Future<String> resolveAccessToken({bool forceRefresh = false}) async {
      Session? session = _sb.auth.currentSession;

      if (session == null) {
        throw Exception('You are signed out. Please sign in again.');
      }

      int? tokenExp(String token) {
        final payload = decodeJwtPayload(token);
        final raw = payload?['exp'];
        if (raw is int) return raw;
        return int.tryParse(raw?.toString() ?? '');
      }

      final nowEpochSec = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final expiresAt = session.expiresAt;
      final shouldRefresh =
          forceRefresh ||
          session.accessToken.trim().isEmpty ||
          expiresAt == null ||
          expiresAt <= nowEpochSec + 300;

      if (shouldRefresh) {
        final refreshed = await _sb.auth.refreshSession();
        session = refreshed.session ?? _sb.auth.currentSession;
        if (session == null) {
          throw Exception('Session expired. Please sign out and sign in again.');
        }
      }

      var token = session.accessToken.trim();
      if (token.isEmpty) {
        throw Exception('Session expired. Please sign out and sign in again.');
      }

      var exp = tokenExp(token);
      if (exp == null || exp <= nowEpochSec + 60) {
        final refreshed = await _sb.auth.refreshSession();
        session = refreshed.session ?? _sb.auth.currentSession;
        token = (session?.accessToken ?? '').trim();
        exp = tokenExp(token);
      }

      if (token.isEmpty || exp == null || exp <= nowEpochSec + 60) {
        throw Exception('Session expired. Please sign out and sign in again.');
      }

      // NOTE: We intentionally skip getUser() here — it adds a network round-trip
      // that can return null for valid tokens when the project ref changes, causing
      // a false "session expired" that signs the user out unnecessarily.
      return token;
    }

    String accessToken;
    try {
      accessToken = await resolveAccessToken();
    } catch (_) {
      throw Exception('Session expired. Please sign out and sign in again.');
    }

    final payload = <String, dynamic>{
      'title': title,
      'body': body,
      'audience': audience,
      'notificationType': notificationType,
      'sendPush': sendPush,
      'sendInApp': sendInApp,
      if (userIds.isNotEmpty) 'userIds': userIds,
      if ((deepLink ?? '').trim().isNotEmpty) 'deepLink': deepLink!.trim(),
    };

    Future<Map<String, dynamic>> invokeSendGeneralPush(String token) async {
      final uri = Uri.parse('${AppConfig.supabaseUrl}/functions/v1/send-general-push');
      // Use the anon key as the Bearer token so the Edge Function gateway accepts
      // the call even when the project issues ES256-algorithm JWTs (which the
      // gateway JWT verifier rejects with UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM).
      // The actual user JWT is forwarded in the body as `userToken` so the function
      // can still call auth.getUser() to verify identity and role.
      final resp = await _http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AppConfig.supabaseAnonKey}',
          'apikey': AppConfig.supabaseAnonKey,
        },
        body: jsonEncode({...payload, 'userToken': token}),
      );

      final rawBody = resp.body.trim();
      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        if (rawBody.isEmpty) return const <String, dynamic>{};
        final decoded = jsonDecode(rawBody);
        if (decoded is Map<String, dynamic>) return decoded;
        if (decoded is Map) return Map<String, dynamic>.from(decoded);
        return const <String, dynamic>{};
      }

      throw Exception('send-general-push failed (${resp.statusCode}): ${resp.body}');
    }

    Future<Map<String, dynamic>> invokeSendGeneralPushViaSdk() async {
      final result = await _sb.functions.invoke(
        'send-general-push',
        body: payload,
      );

      final dynamic data = result.data;
      if (data is Map<String, dynamic>) return data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return const <String, dynamic>{};
    }

    bool shouldRetryAuth(Object error) {
      final message = error.toString().toLowerCase();
      return message.contains('invalid jwt') ||
          message.contains('session expired') ||
          message.contains('auth token') ||
          message.contains('jwt') ||
          message.contains('401') ||
          message.contains('unauthorized');
    }

    Map<String, dynamic> response;

    try {
      response = await invokeSendGeneralPush(accessToken);
    } catch (error) {
      if (!shouldRetryAuth(error)) rethrow;

      try {
        accessToken = await resolveAccessToken(forceRefresh: true);
        response = await invokeSendGeneralPush(accessToken);
      } catch (retryError) {
        if (!shouldRetryAuth(retryError)) rethrow;

        try {
          response = await invokeSendGeneralPushViaSdk();
        } catch (sdkError) {
          if (!shouldRetryAuth(sdkError)) rethrow;

          final payload = decodeJwtPayload(accessToken);
          final tokenRef = (payload?['ref'] ?? '').toString().trim();
          final tokenRole = (payload?['role'] ?? '').toString().trim();
          final expectedRef = expectedProjectRef();
          final authStatus = await authUserPreflightStatus(accessToken);
          final directError = error.toString();
          final retryErrorText = retryError.toString();
          final sdkErrorText = sdkError.toString();

          // NOTE: We no longer call clearLocalSessionSilently() here. Signing the
          // user out silently on a transient auth failure is too aggressive — it
          // causes a "session expired" loop where the user signs in but the next
          // notification attempt signs them out again.
          if (tokenRef.isNotEmpty && expectedRef.isNotEmpty && tokenRef != expectedRef) {
            throw Exception(
              'Auth token project mismatch. token_ref=$tokenRef expected_ref=$expectedRef role=$tokenRole auth_user_status=$authStatus. Please check SUPABASE_URL/ANON_KEY config.',
            );
          }

          throw Exception(
            'Notification delivery failed after retries. token_ref=${tokenRef.isEmpty ? 'unknown' : tokenRef} role=${tokenRole.isEmpty ? 'unknown' : tokenRole} auth_user_status=$authStatus direct_error=$directError retry_error=$retryErrorText sdk_error=$sdkErrorText',
          );
        }
      }
    }

    return response;
  }

  Future<Map<String, dynamic>> fetchAdminAiAnalyticsSummary({int days = 30}) async {
    try {
      final data = await _sb.rpc('admin_ai_analytics_summary', params: {
        'p_days': days,
      });
      if (data is List && data.isNotEmpty && data.first is Map) {
        return Map<String, dynamic>.from(data.first as Map);
      }
      if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
      return {};
    } catch (_) {
      return {};
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdminAiAnalyticsSeries({int days = 30}) async {
    try {
      final data = await _sb.rpc('admin_ai_analytics_series', params: {
        'p_days': days,
      });
      if (data is List) {
        return data
            .whereType<Map>()
            .map((row) => Map<String, dynamic>.from(row))
            .toList();
      }
      return const [];
    } catch (_) {
      return const [];
    }
  }

  // ── Promo code ──

  /// Validate a promo code with full checks: active, expiry, max uses, minimum amount, applies_to.
  /// Returns the discount row if valid, or null + error message.
  Future<({Map<String, dynamic>? data, String? error})> validatePromoCode({
    required String code,
    double subtotal = 0,
    String currency = 'USD',
    String itemType = 'all',
  }) async {
    try {
      final data = await _sb
          .from('discount_codes')
          .select('*')
          .eq('code', code.toUpperCase().trim())
          .eq('is_active', true)
          .maybeSingle();
      if (data == null) return (data: null, error: 'Invalid or expired promo code.');

      // Expiry check
      final validUntil = data['valid_until'];
      if (validUntil != null) {
        final expiry = DateTime.tryParse(validUntil.toString());
        if (expiry != null && DateTime.now().isAfter(expiry)) {
          return (data: null, error: 'This promo code has expired.');
        }
      }

      // Max uses check
      final maxUses = (data['max_uses'] as num?)?.toInt();
      final currentUses = (data['current_uses'] as num?)?.toInt() ?? 0;
      if (maxUses != null && currentUses >= maxUses) {
        return (data: null, error: 'This promo code has reached its usage limit.');
      }

      // Minimum amount check
      final minAmount = (data['minimum_amount'] as num?)?.toDouble() ?? 0;
      if (minAmount > 0 && subtotal < minAmount) {
        return (data: null, error: 'Minimum spend of ${data['currency'] ?? currency} ${minAmount.toStringAsFixed(0)} required.');
      }

      // Applies-to check
      final appliesTo = (data['applies_to'] ?? 'all').toString();
      if (appliesTo != 'all') {
        final normalised = itemType == 'tour_package' ? 'tours' : '${itemType}s';
        if (appliesTo != normalised) {
          return (data: null, error: 'This code only applies to $appliesTo.');
        }
      }

      return (data: data, error: null);
    } catch (_) {
      return (data: null, error: 'Error validating code.');
    }
  }

  /// Increment current_uses on a discount code after a successful booking.
  Future<void> incrementPromoCodeUsage({required String codeId}) async {
    try {
      final row = await _sb.from('discount_codes').select('current_uses').eq('id', codeId).maybeSingle();
      final current = ((row as Map?)?['current_uses'] as num?)?.toInt() ?? 0;
      await _sb.from('discount_codes').update({'current_uses': current + 1}).eq('id', codeId);
    } catch (_) {
      // Best-effort — don't block the booking flow
    }
  }

  // ── Loyalty points ──

  Future<int> fetchLoyaltyPoints({required String userId}) async {
    try {
      final data = await _sb.from('profiles').select('loyalty_points').eq('user_id', userId).maybeSingle();
      return ((data as Map?)?.get('loyalty_points') as num?)?.toInt() ?? 0;
    } catch (_) {
      return 0;
    }
  }

  // ── Complete profile ──

  Future<void> completeProfile({
    required String userId,
    required String firstName,
    required String lastName,
    required String phone,
  }) async {
    await _sb.from('profiles').upsert({
      'user_id': userId,
      'full_name': '$firstName $lastName',
      'phone': phone,
      'profile_completed': true,
    });
  }

  // ── Account deletion (still via API — needs service role key) ──

  Future<void> deleteAccountWithToken({required String accessToken}) async {
    final baseUrl = AppConfig.apiBaseUrl.replaceAll('/api', '');
    final response = await _http.post(
      Uri.parse('$baseUrl/api/account-delete'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({'confirm': true}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Delete account failed with status ${response.statusCode}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (json['ok'] != true) {
      throw Exception((json['error'] ?? 'Delete account failed').toString());
    }
  }

  // ── Post-booking API (server-validated flows) ──

  Future<Map<String, dynamic>> fetchPostBookingOverview({
    required String accessToken,
    bool admin = false,
  }) async {
    final action = admin ? 'admin-overview' : 'user-overview';
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/post-booking')
        .replace(queryParameters: {'action': action});

    final response = await _http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );

    return _parsePostBookingResponse(
      response,
      fallbackError: 'Failed to load post-booking data',
    );
  }

  Future<Map<String, dynamic>> postBookingAction({
    required String accessToken,
    required String action,
    Map<String, dynamic> body = const <String, dynamic>{},
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/post-booking');
    final payload = <String, dynamic>{
      'action': action,
      ...body,
    };

    final response = await _http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode(payload),
    );

    return _parsePostBookingResponse(
      response,
      fallbackError: 'Post-booking request failed',
    );
  }

  Map<String, dynamic> _parsePostBookingResponse(
    http.Response response, {
    required String fallbackError,
  }) {
    Map<String, dynamic> payload = const <String, dynamic>{};
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map) {
        payload = decoded.map(
          (key, value) => MapEntry(key.toString(), value),
        );
      }
    } catch (_) {
      payload = const <String, dynamic>{};
    }

    final hasHttpError = response.statusCode < 200 || response.statusCode >= 300;
    final hasApiError = payload['ok'] == false;

    if (hasHttpError || hasApiError) {
      final message = (payload['error'] ?? fallbackError).toString();
      throw Exception(message);
    }

    return payload;
  }

  // ════════════════════════════════════════════════
  // HOST — Properties CRUD
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchHostProperties({required String userId}) async {
    try {
      final data = await _sb
          .from('properties')
          .select('id, title, location, price_per_night, price_per_month, currency, is_published, images, main_image, property_type, listing_mode, rating, review_count, max_guests, bedrooms, bathrooms')
          .eq('host_id', userId)
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>().map(_normalizeProperty).toList();
    } catch (e) {
      debugPrint('[fetchHostProperties] error: $e');
      return [];
    }
  }

  Future<String?> createProperty({
    required String userId,
    required Map<String, dynamic> fields,
  }) async {
    final row = <String, dynamic>{
      'host_id': userId,
      'is_published': false,
      ...fields,
    };
    final result = await _sb.from('properties').insert(row).select('id').single();
    return (result as Map?)?.get('id')?.toString();
  }

  Future<void> updateProperty({required String id, required Map<String, dynamic> updates}) async {
    await _sb.from('properties').update(updates).eq('id', id);
  }

  Future<void> deleteProperty({required String id}) async {
    await _sb.from('properties').delete().eq('id', id);
  }

  // ════════════════════════════════════════════════
  // HOST — Tours CRUD
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchHostTours({required String userId}) async {
    try {
      final results = await Future.wait<dynamic>([
        _sb
            .from('tours')
            .select('id, title, location, price_per_person, currency, is_published, images, main_image, category, duration_days, rating, review_count, max_guests, created_at')
            .or('host_id.eq.$userId,user_id.eq.$userId,guide_id.eq.$userId,created_by.eq.$userId')
            .order('created_at', ascending: false),
        _sb
            .from('tour_packages')
            .select('id, title, city, country, price_per_person, price_per_adult, currency, status, cover_image, gallery_images, max_guests, duration, created_at')
            .eq('host_id', userId)
            .order('created_at', ascending: false),
      ]);

      final tours = (results[0] as List).cast<Map<String, dynamic>>().map(_normalizeTour);
      final packages = (results[1] as List).cast<Map<String, dynamic>>().map(_normalizeTourPackage);
      final merged = [...tours, ...packages].toList()
        ..sort((a, b) => ((b['created_at'] ?? '') as String).compareTo((a['created_at'] ?? '') as String));
      return merged;
    } catch (e) {
      debugPrint('[fetchHostTours] error: $e');
      return [];
    }
  }

  Future<String?> createTour({
    required String userId,
    required Map<String, dynamic> fields,
  }) async {
    final row = <String, dynamic>{
      'host_id': userId,
      'user_id': userId,
      'created_by': userId,
      'item_type': 'tour',
      'is_published': false,
      ...fields,
    };
    final result = await _sb.from('tours').insert(row).select('id').single();
    return (result as Map?)?.get('id')?.toString();
  }

  Future<void> updateTour({required String id, required Map<String, dynamic> updates}) async {
    await _sb.from('tours').update(updates).eq('id', id);
  }

  Future<void> deleteTour({required String id}) async {
    await _sb.from('tours').delete().eq('id', id);
  }

  Future<String?> createTourPackage({
    required String userId,
    required Map<String, dynamic> fields,
  }) async {
    final row = <String, dynamic>{
      'host_id': userId,
      'user_id': userId,
      'created_by': userId,
      'status': 'pending',
      ...fields,
    };
    final result = await _sb.from('tour_packages').insert(row).select('id').single();
    return (result as Map?)?.get('id')?.toString();
  }

  Future<void> updateTourPackage({required String id, required Map<String, dynamic> updates}) async {
    await _sb.from('tour_packages').update(updates).eq('id', id);
  }

  // ════════════════════════════════════════════════
  // HOST — Transport CRUD
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchHostTransport({required String userId}) async {
    try {
      final data = await _sb
          .from('transport_vehicles')
          .select('id, title, provider_name, vehicle_type, seats, price_per_day, daily_price, currency, is_published, image_url, media, created_at')
          .eq('created_by', userId)
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>().map(_normalizeTransport).toList();
    } catch (e) {
      debugPrint('[fetchHostTransport] error: $e');
      return [];
    }
  }

  Future<void> updateHostTourListing({
    required String id,
    required Map<String, dynamic> updates,
    String source = 'tours',
  }) async {
    if (source == 'tour_packages') {
      final payload = <String, dynamic>{...updates};
      if (payload.containsKey('is_published')) {
        final shouldPublish = payload.remove('is_published') == true;
        payload['status'] = shouldPublish ? 'approved' : 'pending';
      }
      await _sb.from('tour_packages').update(payload).eq('id', id);
      return;
    }

    await _sb.from('tours').update(updates).eq('id', id);
  }

  Future<void> deleteHostTourListing({required String id, String source = 'tours'}) async {
    final table = source == 'tour_packages' ? 'tour_packages' : 'tours';
    await _sb.from(table).delete().eq('id', id);
  }

  // ── Transport routes / Airport transfer pricing ──

  Future<List<Map<String, dynamic>>> fetchTransportRoutes() async {
    final data = await _sb
        .from('transport_routes')
        .select('id, from_location, to_location, distance_km, base_price, currency')
        .order('from_location', ascending: true)
        .order('to_location', ascending: true);
    return (data as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, num>> fetchAirportTransferPricing({required String vehicleId}) async {
    final data = await _sb
        .from('airport_transfer_pricing')
        .select('route_id, price')
        .eq('vehicle_id', vehicleId);

    final map = <String, num>{};
    for (final r in (data as List)) {
      final row = (r as Map);
      final rid = row['route_id']?.toString();
      final price = row['price'];
      if (rid != null && price is num) map[rid] = price;
    }
    return map;
  }

  Future<void> upsertAirportTransferPricing({
    required String vehicleId,
    required Map<String, num> pricingByRouteId,
  }) async {
    await _sb.from('airport_transfer_pricing').delete().eq('vehicle_id', vehicleId);
    if (pricingByRouteId.isEmpty) return;

    final rows = pricingByRouteId.entries
        .map((e) => {
              'vehicle_id': vehicleId,
              'route_id': e.key,
              'price': e.value,
            })
        .toList();
    await _sb.from('airport_transfer_pricing').insert(rows);
  }

  Future<String?> createTransport({
    required String userId,
    required Map<String, dynamic> fields,
  }) async {
    final row = <String, dynamic>{
      'host_id': userId,
      'user_id': userId,
      'owner_id': userId,
      'item_type': 'transport',
      'is_published': false,
      ...fields,
    };
    final result = await _sb.from('transport_vehicles').insert(row).select('id').single();
    return (result as Map?)?.get('id')?.toString();
  }

  Future<void> updateTransport({required String id, required Map<String, dynamic> updates}) async {
    await _sb.from('transport_vehicles').update(updates).eq('id', id);
  }

  Future<void> deleteTransport({required String id}) async {
    await _sb.from('transport_vehicles').delete().eq('id', id);
  }

  // ════════════════════════════════════════════════
  // HOST — Availability
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchAvailabilityExceptions({required String propertyId}) async {
    try {
      final data = await _sb
          .from('availability_exceptions')
          .select('id, date, available, note')
          .eq('property_id', propertyId)
          .order('date', ascending: true);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('[fetchAvailabilityExceptions] error: $e');
      return [];
    }
  }

  Future<void> setAvailabilityException({
    required String propertyId,
    required String date,
    required bool available,
    String? note,
  }) async {
    await _sb.from('availability_exceptions').upsert({
      'property_id': propertyId,
      'date': date,
      'available': available,
      'note': ?note,
    });
  }

  Future<void> deleteAvailabilityException({required String propertyId, required String date}) async {
    await _sb.from('availability_exceptions').delete().eq('property_id', propertyId).eq('date', date);
  }

  // ════════════════════════════════════════════════
  // HOST — Discount Codes
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchHostDiscounts({required String userId}) async {
    try {
      final data = await _sb
          .from('discount_codes')
          .select('id, code, discount_type, discount_value, max_uses, current_uses, valid_until, is_active, created_at')
          .eq('host_id', userId)
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('[fetchHostDiscounts] error: $e');
      return [];
    }
  }

  Future<void> createDiscount({
    required String userId,
    required String code,
    required String discountType,
    required double discountValue,
    int? maxUses,
    String? description,
    String currency = 'RWF',
    double minimumAmount = 0,
    String? validUntil,
    String appliesTo = 'all',
  }) async {
    await _sb.from('discount_codes').insert({
      'host_id': userId,
      'code': code.toUpperCase(),
      'discount_type': discountType,
      'discount_value': discountValue,
      'max_uses': maxUses,
      'description': description,
      'currency': currency,
      'minimum_amount': minimumAmount,
      'valid_until': validUntil,
      'applies_to': appliesTo,
      'current_uses': 0,
      'is_active': true,
    });
  }

  Future<void> toggleDiscount({required String id, required bool active}) async {
    await _sb.from('discount_codes').update({'is_active': active}).eq('id', id);
  }

  Future<void> deleteDiscount({required String id}) async {
    await _sb.from('discount_codes').delete().eq('id', id);
  }

  // ════════════════════════════════════════════════
  // HOST — Payout Methods
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchPayoutMethods({required String userId}) async {
    try {
      final data = await _sb
          .from('host_payout_methods')
          .select('id, method_type, nickname, bank_account_name, phone_number, mobile_provider, bank_name, bank_account_number, bank_swift_code, is_primary, created_at')
          .eq('host_id', userId)
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('[fetchPayoutMethods] error: $e');
      return [];
    }
  }

  Future<void> createPayoutMethod({
    required String userId,
    required String methodType,
    required String accountName,
    String? phoneNumber,
    String? mobileProvider,
    String? bankName,
    String? bankAccountNumber,
    bool isPrimary = false,
  }) async {
    await _sb.from('host_payout_methods').insert({
      'host_id': userId,
      'method_type': methodType,
      'nickname': accountName.isNotEmpty ? accountName : null,
      'bank_account_name': accountName.isNotEmpty ? accountName : null,
      'phone_number': ?phoneNumber,
      'mobile_provider': ?mobileProvider,
      'bank_name': ?bankName,
      'bank_account_number': ?bankAccountNumber,
      'is_primary': isPrimary,
    });
  }

  Future<void> deletePayoutMethod({required String id}) async {
    await _sb.from('host_payout_methods').delete().eq('id', id);
  }

  Future<void> setPrimaryPayoutMethod({required String id, required String userId}) async {
    // Unset all primaries first, then set new one
    await _sb.from('host_payout_methods').update({'is_primary': false}).eq('host_id', userId);
    await _sb.from('host_payout_methods').update({'is_primary': true}).eq('id', id);
  }

  // ════════════════════════════════════════════════
  // HOST — Payouts
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchHostPayouts({required String userId}) async {
    try {
      final data = await _sb
          .from('host_payouts')
          .select('id, amount, currency, status, payout_method, payout_details, processed_at, created_at')
          .eq('host_id', userId)
          .order('created_at', ascending: false)
          .limit(50);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('[fetchHostPayouts] error: $e');
      return [];
    }
  }

  Future<void> requestPayout({
    required String userId,
    required double amount,
    required String currency,
    String? payoutMethodId,
    String? payoutMethodType,
  }) async {
    await _sb.from('host_payouts').insert({
      'host_id': userId,
      'amount': amount,
      'currency': currency,
      'status': 'pending',
      'payout_method': payoutMethodType ?? 'mobile_money',
      'payout_details': {
        'payout_method_id': ?payoutMethodId,
        'method_type': ?payoutMethodType,
      },
    });
  }

  Future<List<Map<String, dynamic>>> fetchManualReviewRequests({required String userId}) async {
    try {
      final uri = Uri.parse('${AppConfig.apiBaseUrl}/review').replace(queryParameters: {
        'action': 'list-manual-requests',
        'hostId': userId,
        '_ts': DateTime.now().millisecondsSinceEpoch.toString(),
      });
      final response = await _http.get(uri, headers: {'Content-Type': 'application/json'});
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode < 200 || response.statusCode >= 300 || body['ok'] != true) {
        return [];
      }
      final requests = (body['requests'] as List? ?? const []).cast<dynamic>();
      return requests.map((row) => Map<String, dynamic>.from(row as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> sendManualReviewRequest({
    required String userId,
    required String propertyId,
    required String reviewerEmail,
    String? reviewerName,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/review').replace(queryParameters: {
      'action': 'send-manual-email',
    });
    final response = await _http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'hostId': userId,
        'propertyId': propertyId,
        'reviewerEmail': reviewerEmail,
        if (reviewerName != null && reviewerName.trim().isNotEmpty) 'reviewerName': reviewerName.trim(),
      }),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300 || body['ok'] != true) {
      throw Exception((body['error'] ?? 'Failed to send manual review request').toString());
    }
  }

  Future<void> sendBookingReviewEmail({required Map<String, dynamic> booking}) async {
    final reviewToken = (booking['review_token'] ?? '').toString();
    final guestEmail = (booking['guest_email'] ?? '').toString();
    if (reviewToken.isEmpty || guestEmail.isEmpty) {
      throw Exception('Missing review token or guest email');
    }

    final uri = Uri.parse('${AppConfig.apiBaseUrl}/review').replace(queryParameters: {
      'action': 'send-email',
    });
    final response = await _http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'guestName': booking['guest_name'],
        'guestEmail': guestEmail,
        'propertyTitle': booking['listing_title'] ?? booking['item_title'],
        'propertyImage': booking['main_image'],
        'location': booking['location'],
        'checkIn': booking['check_in'],
        'checkOut': booking['check_out'],
        'reviewToken': reviewToken,
      }),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300 || body['ok'] != true) {
      throw Exception((body['error'] ?? 'Failed to send review email').toString());
    }

    await _sb.from('bookings').update({'review_email_sent': true}).eq('id', booking['id']);
  }

  Future<void> _notifyGuestBookingDecision({
    required String action,
    required Map<String, dynamic> booking,
    String? rejectionReason,
  }) async {
    final guestEmail = (booking['guest_email'] ?? '').toString();
    if (guestEmail.isEmpty) {
      return;
    }

    final uri = Uri.parse('${AppConfig.apiBaseUrl}/booking-confirmation-email');
    await _http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'action': action,
        'guestEmail': guestEmail,
        'guestName': booking['guest_name'] ?? 'Guest',
        'bookingId': booking['id'],
        'orderId': booking['order_id'],
        'itemName': booking['listing_title'] ?? booking['item_title'] ?? 'Booking',
        'checkIn': booking['check_in'],
        'checkOut': booking['check_out'],
        if (rejectionReason != null && rejectionReason.trim().isNotEmpty) 'rejectionReason': rejectionReason.trim(),
      }),
    );
  }

  Future<void> confirmHostBookingRequest({
    required String actorUserId,
    required Map<String, dynamic> booking,
  }) async {
    final payload = {
      'status': 'confirmed',
      'confirmation_status': 'approved',
      'confirmed_at': DateTime.now().toIso8601String(),
      'confirmed_by': actorUserId,
      'rejection_reason': null,
      'rejected_at': null,
    };
    final orderId = booking['order_id']?.toString();
    if (orderId != null && orderId.isNotEmpty) {
      await _sb.from('bookings').update(payload).eq('order_id', orderId);
    } else {
      await _sb.from('bookings').update(payload).eq('id', booking['id']);
    }
    await _notifyGuestBookingDecision(action: 'approved', booking: booking);
  }

  Future<void> rejectHostBookingRequest({
    required String actorUserId,
    required Map<String, dynamic> booking,
    required String reason,
  }) async {
    final payload = {
      'status': 'cancelled',
      'confirmation_status': 'rejected',
      'rejection_reason': reason,
      'rejected_at': DateTime.now().toIso8601String(),
      'confirmed_by': actorUserId,
    };
    final orderId = booking['order_id']?.toString();
    if (orderId != null && orderId.isNotEmpty) {
      await _sb.from('bookings').update(payload).eq('order_id', orderId);
    } else {
      await _sb.from('bookings').update(payload).eq('id', booking['id']);
    }
    await _notifyGuestBookingDecision(action: 'rejected', booking: booking, rejectionReason: reason);
  }

  Future<void> markHostBookingComplete({required Map<String, dynamic> booking}) async {
    final orderId = booking['order_id']?.toString();
    if (orderId != null && orderId.isNotEmpty) {
      await _sb.from('bookings').update({'status': 'completed'}).eq('order_id', orderId);
    } else {
      await _sb.from('bookings').update({'status': 'completed'}).eq('id', booking['id']);
    }
  }

  // ════════════════════════════════════════════════
  // HOST — Bookings: update status
  // ════════════════════════════════════════════════

  Future<void> updateBookingStatus({required String bookingId, required String status}) async {
    await _sb.from('bookings').update({'status': status}).eq('id', bookingId);
  }

  // ════════════════════════════════════════════════
  // HOST — Application (Become Host)
  // ════════════════════════════════════════════════

  Future<Map<String, dynamic>?> fetchMyHostApplication({required String userId}) async {
    try {
      final data = await _sb
          .from('host_applications')
          .select('id, status, created_at, rejection_reason')
          .eq('user_id', userId)
          .maybeSingle();
      return (data as Map?)?.cast<String, dynamic>();
    } catch (_) { return null; }
  }

  Future<void> submitHostApplication({
    required String userId,
    required String fullName,
    required String phone,
    required List<String> serviceTypes,
    String? about,
    String? nationalIdNumber,
    String? nationalIdPhotoUrl,
    String? selfiePhotoUrl,
  }) async {
    await _sb.from('host_applications').upsert({
      'user_id': userId,
      'full_name': fullName,
      'phone': phone,
      'service_types': serviceTypes,
      'about': about,
      'national_id_number': nationalIdNumber,
      'national_id_photo_url': nationalIdPhotoUrl,
      'selfie_photo_url': selfiePhotoUrl,
      'status': 'pending',
    });
  }

  // ── User Preferences ──

  Future<Map<String, dynamic>> fetchUserPreferences({required String userId}) async {
    try {
      final data = await _sb
          .from('user_preferences')
          .select('language, currency')
          .eq('user_id', userId)
          .maybeSingle();
      return (data as Map?)?.cast<String, dynamic>() ?? const {};
    } catch (_) {
      return const {};
    }
  }

  Future<void> upsertUserPreference({
    required String userId,
    String? language,
    String? currency,
  }) async {
    final updates = <String, dynamic>{'user_id': userId};
    if (language != null) updates['language'] = language;
    if (currency != null) updates['currency'] = currency;
    await _sb.from('user_preferences').upsert(updates, onConflict: 'user_id');
  }

  // ── Loyalty Transactions ──

  Future<List<Map<String, dynamic>>> fetchLoyaltyTransactions({
    required String userId,
    int limit = 50,
  }) async {
    try {
      final data = await _sb
          .from('loyalty_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return const [];
    }
  }

  // ── Property Blocked Dates ──

  Future<List<Map<String, dynamic>>> fetchPropertyBlockedDates({
    required String propertyId,
  }) async {
    try {
      final data = await _sb
          .from('property_blocked_dates')
          .select('*')
          .eq('property_id', propertyId)
          .order('start_date', ascending: true);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return const [];
    }
  }

  Future<void> addPropertyBlockedDates({
    required String propertyId,
    required String startDate,
    required String endDate,
    String reason = 'Blocked by host',
    String? createdBy,
  }) async {
    await _sb.from('property_blocked_dates').insert({
      'property_id': propertyId,
      'start_date': startDate,
      'end_date': endDate,
      'reason': reason,
      'created_by': ?createdBy,
    });
  }

  Future<void> removePropertyBlockedDate({required String id}) async {
    await _sb.from('property_blocked_dates').delete().eq('id', id);
  }

  // ── Property Custom Prices ──

  Future<List<Map<String, dynamic>>> fetchPropertyCustomPrices({
    required String propertyId,
  }) async {
    try {
      final data = await _sb
          .from('property_custom_prices')
          .select('*')
          .eq('property_id', propertyId)
          .order('start_date', ascending: true);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return const [];
    }
  }

  Future<void> addPropertyCustomPrice({
    required String propertyId,
    required String startDate,
    required String endDate,
    required double customPricePerNight,
    String? reason,
  }) async {
    await _sb.from('property_custom_prices').insert({
      'property_id': propertyId,
      'start_date': startDate,
      'end_date': endDate,
      'custom_price_per_night': customPricePerNight,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
  }

  Future<void> removePropertyCustomPrice({required String id}) async {
    await _sb.from('property_custom_prices').delete().eq('id', id);
  }

  // ── Booking Change Requests ──

  Future<List<Map<String, dynamic>>> fetchBookingChangeRequests({
    required String userId,
    bool asHost = false,
  }) async {
    try {
      var req = _sb.from('booking_change_requests').select('*');
      req = asHost ? req.eq('host_id', userId) : req.eq('user_id', userId);
      final data = await req.order('created_at', ascending: false).limit(50);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return const [];
    }
  }

  Future<void> createBookingChangeRequest({
    required String bookingId,
    required String userId,
    required String hostId,
    required String originalStartDate,
    required String originalEndDate,
    String? requestedStartDate,
    String? requestedEndDate,
    String? reason,
  }) async {
    await _sb.from('booking_change_requests').insert({
      'booking_id': bookingId,
      'user_id': userId,
      'host_id': hostId,
      'original_start_date': originalStartDate,
      'original_end_date': originalEndDate,
      'requested_start_date': ?requestedStartDate,
      'requested_end_date': ?requestedEndDate,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
  }

  Future<void> updateBookingChangeRequestStatus({
    required String id,
    required String status,
  }) async {
    await _sb.from('booking_change_requests').update({'status': status}).eq('id', id);
  }

  // ── Transport Services ──

  Future<List<Map<String, dynamic>>> fetchTransportServices({int limit = 50}) async {
    try {
      final data = await _sb
          .from('transport_services')
          .select('id, title, description, slug')
          .or('is_published.eq.true,is_published.is.null')
          .order('created_at', ascending: true)
          .limit(limit);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return const [];
    }
  }

  // ── Support Ticket Logs ──

  Future<List<Map<String, dynamic>>> fetchSupportTicketLogs({
    required String ticketId,
  }) async {
    try {
      final data = await _sb
          .from('support_ticket_logs')
          .select('id, ticket_id, user_id, action_type, created_at')
          .eq('ticket_id', ticketId)
          .order('created_at', ascending: false)
          .limit(50);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return const [];
    }
  }
}

