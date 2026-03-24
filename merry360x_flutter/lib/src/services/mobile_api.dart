import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../models/mobile_sync.dart';

extension _MapExt on Map {
  dynamic get(String key) => this[key];
}

class MobileApi {
  MobileApi({http.Client? client}) : _http = client ?? http.Client();

  final http.Client _http;

  SupabaseClient get _sb => Supabase.instance.client;

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

    // Home listings — aligned with website table columns
    final results = await Future.wait([
      safeQuery(
        _sb
            .from('properties')
            .select('id, title, location, price_per_night, currency, images')
            .eq('is_published', true)
            .order('created_at', ascending: false)
            .limit(20),
      ),
      safeQuery(
        _sb
            .from('tours')
            .select('id, title, location, price_per_person, currency, images')
            .eq('is_published', true)
            .order('created_at', ascending: false)
            .limit(10),
      ),
      safeQuery(
        _sb
            .from('tour_packages')
            .select('id, title, city, price_per_adult, currency, cover_image, gallery_images')
            .order('created_at', ascending: false)
            .limit(10),
      ),
      safeQuery(
        _sb
            .from('transport_vehicles')
            .select('id, title, vehicle_type, price_per_day, currency, image_url')
            .eq('is_published', true)
            .order('created_at', ascending: false)
            .limit(10),
      ),
    ]);

    final properties = results[0];
    final tours = results[1];
    final tourPkgs = results[2];
    final transport = results[3];

    final listings = <Map<String, dynamic>>[
      for (final p in properties) {...p, 'item_type': 'property'},
      for (final t in tours) {...t, 'item_type': 'tour'},
      for (final tp in tourPkgs)
        {
          ...tp,
          'item_type': 'tour_package',
          'location': tp['city'],
          // Normalize package media for explore card resolver.
          'images': tp['gallery_images'] ?? [tp['cover_image']],
          'main_image': tp['cover_image'],
        },
      for (final tv in transport)
        {
          ...tv,
          'item_type': 'transport',
          // Normalize transport media for explore card resolver.
          'images': [tv['image_url']],
          'main_image': tv['image_url'],
        },
    ];

    // User-specific data
    Map<String, dynamic>? profile;
    List<Map<String, dynamic>> wishlists = const [];
    List<Map<String, dynamic>> tripCart = const [];
    List<Map<String, dynamic>> bookings = const [];
    List<String> roles = const [];

    if (userId != null && userId.trim().isNotEmpty) {
      final uid = userId.trim();
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
    }

    return MobileSyncPayload(
      serverTime: DateTime.now().toUtc().toIso8601String(),
      homeListings: listings,
      stories: const [],
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
      if (propertyId != null) 'property_id': propertyId,
      if (tourId != null) 'tour_id': tourId,
      if (transportId != null) 'transport_id': transportId,
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
      if (metadata != null) 'metadata': metadata,
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
    final row = <String, dynamic>{
      'user_id': userId,
      'name': name,
      'email': email,
      if (phone != null) 'phone': phone,
      'total_amount': totalAmount,
      'base_price_amount': basePriceAmount,
      'service_fee_amount': serviceFeeAmount,
      'currency': currency,
      'payment_method': paymentMethod,
      if (paymentProvider != null) 'dpo_token': paymentProvider,
      'payment_status': 'pending',
      'status': 'pending',
      'items': items,
      if (specialRequests != null) 'message': specialRequests,
      if (metadata != null) 'metadata': metadata,
    };
    final result = await _sb.from('checkout_requests').insert(row).select('id').single();
    return (result as Map)['id'].toString();
  }

  /// Initiate PesaPal card payment via serverless function
  Future<Map<String, dynamic>> initPesapalPayment({
    required String checkoutId,
    required double amount,
    required String currency,
    required String payerName,
    required String payerEmail,
    String? phoneNumber,
    Map<String, String>? billingAddress,
    String? description,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/pesapal');
    final body = <String, dynamic>{
      'action': 'create-payment',
      'checkoutId': checkoutId,
      'amount': amount,
      'currency': currency,
      'payerName': payerName,
      'payerEmail': payerEmail,
      if (phoneNumber != null) 'phoneNumber': phoneNumber,
      if (billingAddress != null) 'billingAddress': billingAddress,
      'description': description ?? 'Merry360x Mobile Booking',
      'redirectUrl': 'https://merry360x.com/payment-pending?checkoutId=$checkoutId&provider=pesapal',
    };
    final resp = await _http.post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body));
    if (resp.statusCode != 200) throw Exception('PesaPal init failed: ${resp.body}');
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  /// Check PesaPal payment status
  Future<String> checkPesapalStatus(String checkoutId) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/pesapal');
    final resp = await _http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'action': 'check-status', 'checkoutId': checkoutId}),
    );
    if (resp.statusCode != 200) return 'pending';
    final data = jsonDecode(resp.body) as Map<String, dynamic>;
    return (data['paymentStatus'] ?? data['status'] ?? 'pending').toString();
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
          if (data != null) return {...data, 'item_type': 'property'};
        case 'tour':
          final data = await _sb.from('tours').select('*').eq('id', id).maybeSingle();
          if (data != null) return {...data, 'item_type': 'tour'};
        case 'tour_package':
          final data = await _sb.from('tour_packages').select('*').eq('id', id).maybeSingle();
          if (data != null) {
            return {
              ...data,
              'item_type': 'tour_package',
              'location': data['city'],
              'images': data['gallery_images'] ?? [data['cover_image']],
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
  }) async {
    final row = <String, dynamic>{
      'guest_id': userId,
      'item_type': itemType,
      'title': title,
      if (itemType == 'property') 'property_id': referenceId,
      if (itemType == 'tour') 'tour_id': referenceId,
      if (itemType == 'tour_package') 'tour_package_id': referenceId,
      if (itemType == 'transport') 'transport_vehicle_id': referenceId,
      if (checkIn != null) 'check_in': checkIn,
      if (checkOut != null) 'check_out': checkOut,
      'guests': guests,
      'total_amount': totalAmount,
      'currency': currency,
      'status': 'pending',
      if (paymentPhone != null) 'payment_phone': paymentPhone,
      if (paymentProvider != null) 'payment_method': paymentProvider,
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
    final results = <Map<String, dynamic>>[];

    try {
      if (category == 'all' || category == 'stays') {
        var req = _sb
            .from('properties')
            .select('id, title, location, price_per_night, currency, images')
            .eq('is_published', true);
        if (q.isNotEmpty) req = req.or('title.ilike.%$q%,location.ilike.%$q%');
        if (minPrice != null) req = req.gte('price_per_night', minPrice);
        if (maxPrice != null) req = req.lte('price_per_night', maxPrice);
        final data = await req.limit(30);
        for (final r in (data as List).cast<Map<String, dynamic>>()) {
          results.add({...r, 'item_type': 'property'});
        }
      }
      if (category == 'all' || category == 'tours') {
        var req2 = _sb
            .from('tours')
            .select('id, title, location, price_per_person, currency, images')
            .eq('is_published', true);
        if (q.isNotEmpty) req2 = req2.or('title.ilike.%$q%,location.ilike.%$q%');
        final data = await req2.limit(30);
        for (final r in (data as List).cast<Map<String, dynamic>>()) {
          results.add({...r, 'item_type': 'tour'});
        }
      }
      if (category == 'all' || category == 'transport') {
        var req3 = _sb
            .from('transport_vehicles')
            .select('id, title, vehicle_type, price_per_day, currency, image_url')
            .eq('is_published', true);
        if (q.isNotEmpty) req3 = req3.ilike('title', '%$q%');
        final data = await req3.limit(30);
        for (final r in (data as List).cast<Map<String, dynamic>>()) {
          results.add({...r, 'item_type': 'transport', 'images': [r['image_url']]});
        }
      }
    } catch (_) {}
    return results;
  }

  // ── Tours ──

  Future<List<Map<String, dynamic>>> fetchTours({String? category}) async {
    try {
      var req = _sb
          .from('tours')
          .select('id, title, location, price_per_person, currency, images, category, duration_days, group_size')
          .eq('is_published', true);
      if (category != null && category != 'all') req = req.eq('category', category);
      final data = await req.order('created_at', ascending: false).limit(50);
      return (data as List).cast<Map<String, dynamic>>().map((t) => {...t, 'item_type': 'tour'}).toList();
    } catch (_) {
      return [];
    }
  }

  // ── Transport ──

  Future<List<Map<String, dynamic>>> fetchTransportListings({String? category}) async {
    try {
      var req = _sb
          .from('transport_vehicles')
          .select('id, title, vehicle_type, price_per_day, currency, image_url, passenger_capacity, description')
          .eq('is_published', true);
      if (category != null && category != 'all') req = req.eq('vehicle_type', category);
      final data = await req.order('created_at', ascending: false).limit(50);
      return (data as List).cast<Map<String, dynamic>>().map((t) => {
        ...t, 'item_type': 'transport', 'images': [t['image_url']],
      }).toList();
    } catch (_) {
      return [];
    }
  }

  // ── Stories ──

  Future<List<Map<String, dynamic>>> fetchStories() async {
    try {
      final data = await _sb
          .from('stories')
          .select('id, title, body, image_url, video_url, location, author_id, created_at, profiles(full_name, avatar_url)')
          .order('created_at', ascending: false)
          .limit(50);
      return (data as List).cast<Map<String, dynamic>>();
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
    String? location,
  }) async {
    final result = await _sb.from('stories').insert({
      'author_id': userId,
      'title': title,
      if (body != null) 'body': body,
      if (imageUrl != null) 'image_url': imageUrl,
      if (videoUrl != null) 'video_url': videoUrl,
      if (location != null) 'location': location,
    }).select('id').single();
    return result['id']?.toString();
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
    await _sb.from('reviews').insert({
      'booking_id': bookingId,
      'reviewer_id': userId,
      'title': title,
      'accommodation_rating': accommodationRating,
      'service_rating': serviceRating,
      'comment': comment,
    });
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

  // ── Host dashboard ──

  Future<Map<String, dynamic>> fetchHostStats({required String userId}) async {
    try {
      final results = await Future.wait([
        _sb.from('properties').select('id').eq('host_id', userId),
        _sb.from('tours').select('id').eq('host_id', userId),
        _sb.from('transport_vehicles').select('id').eq('host_id', userId),
        _sb.from('bookings').select('total_amount, currency, status').eq('host_id', userId),
      ]);
      final bookings = (results[3] as List).cast<Map<String, dynamic>>();
      final totalRevenue = bookings
          .where((b) => b['status'] == 'confirmed' || b['status'] == 'completed')
          .fold<double>(0, (sum, b) => sum + ((b['total_amount'] as num?)?.toDouble() ?? 0));
      return {
        'property_count': (results[0] as List).length,
        'tour_count': (results[1] as List).length,
        'transport_count': (results[2] as List).length,
        'total_bookings': bookings.length,
        'total_revenue': totalRevenue,
      };
    } catch (_) {
      return {'property_count': 0, 'tour_count': 0, 'transport_count': 0, 'total_bookings': 0, 'total_revenue': 0.0};
    }
  }

  Future<List<Map<String, dynamic>>> fetchHostListings({required String userId}) async {
    try {
      final results = await Future.wait([
        _sb.from('properties').select('id, title, location, price_per_night, currency, images, is_published').eq('host_id', userId).order('created_at', ascending: false),
        _sb.from('tours').select('id, title, location, price_per_person, currency, images, is_published').eq('host_id', userId).order('created_at', ascending: false),
        _sb.from('transport_vehicles').select('id, title, vehicle_type, price_per_day, currency, image_url, is_published').eq('host_id', userId).order('created_at', ascending: false),
      ]);
      return [
        ...(results[0] as List).cast<Map<String, dynamic>>().map((r) => {...r, 'item_type': 'property'}),
        ...(results[1] as List).cast<Map<String, dynamic>>().map((r) => {...r, 'item_type': 'tour'}),
        ...(results[2] as List).cast<Map<String, dynamic>>().map((r) => {...r, 'item_type': 'transport', 'images': [r['image_url']]}),
      ];
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchHostBookings({required String userId}) async {
    try {
      final data = await _sb
          .from('bookings')
          .select('*')
          .eq('host_id', userId)
          .order('created_at', ascending: false)
          .limit(100);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
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
      var req = _sb.from('support_tickets').select('*, support_messages(id, body, sender_id, created_at)');
      if (!allTickets) req = req.eq('user_id', userId);
      final data = await req.order('created_at', ascending: false).limit(50);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
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
      'status': 'open',
    }).select('id').single();
    final ticketId = ticket['id']?.toString();
    if (ticketId != null) {
      await _sb.from('support_messages').insert({
        'ticket_id': ticketId,
        'sender_id': userId,
        'body': message,
      });
    }
    return ticketId;
  }

  Future<void> sendTicketReply({
    required String ticketId,
    required String userId,
    required String message,
  }) async {
    await _sb.from('support_messages').insert({
      'ticket_id': ticketId,
      'sender_id': userId,
      'body': message,
    });
    await _sb.from('support_tickets').update({'status': 'open', 'updated_at': DateTime.now().toIso8601String()}).eq('id', ticketId);
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

  // ════════════════════════════════════════════════
  // HOST — Properties CRUD
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchHostProperties({required String userId}) async {
    try {
      final data = await _sb
          .from('properties')
          .select('id, title, location, city, price_per_night, currency, is_published, images, main_image, item_type, property_type, max_guests, bedrooms, bathrooms')
          .or('host_id.eq.$userId,user_id.eq.$userId')
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) { return []; }
  }

  Future<String?> createProperty({
    required String userId,
    required Map<String, dynamic> fields,
  }) async {
    final row = <String, dynamic>{
      'host_id': userId,
      'user_id': userId,
      'item_type': 'property',
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
      final data = await _sb
          .from('tours')
          .select('id, title, location, price_per_person, currency, is_published, images, main_image, item_type, category, duration_hours, max_guests')
          .or('host_id.eq.$userId,user_id.eq.$userId,guide_id.eq.$userId,created_by.eq.$userId')
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) { return []; }
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

  // ════════════════════════════════════════════════
  // HOST — Transport CRUD
  // ════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> fetchHostTransport({required String userId}) async {
    try {
      final data = await _sb
          .from('transport_vehicles')
          .select('id, title, vehicle_type, capacity, price_per_day, currency, is_published, images, main_image, item_type, location')
          .or('host_id.eq.$userId,user_id.eq.$userId,owner_id.eq.$userId')
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) { return []; }
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
    } catch (_) { return []; }
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
      if (note != null) 'note': note,
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
          .select('id, code, discount_type, discount_value, max_uses, uses_count, expires_at, is_active, created_at')
          .eq('host_id', userId)
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) { return []; }
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
      'uses_count': 0,
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
          .select('id, method_type, account_name, phone_number, mobile_provider, bank_name, bank_account_number, is_primary, created_at')
          .eq('host_id', userId)
          .order('created_at', ascending: false);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) { return []; }
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
      'account_name': accountName,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      if (mobileProvider != null) 'mobile_provider': mobileProvider,
      if (bankName != null) 'bank_name': bankName,
      if (bankAccountNumber != null) 'bank_account_number': bankAccountNumber,
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
          .select('id, amount, currency, status, payout_method_type, created_at, completed_at')
          .eq('host_id', userId)
          .order('created_at', ascending: false)
          .limit(50);
      return (data as List).cast<Map<String, dynamic>>();
    } catch (_) { return []; }
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
      if (payoutMethodId != null) 'payout_method_id': payoutMethodId,
      if (payoutMethodType != null) 'payout_method_type': payoutMethodType,
    });
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
}

