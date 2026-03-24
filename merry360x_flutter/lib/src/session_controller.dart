import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'models/mobile_sync.dart';
import 'services/mobile_api.dart';

class SessionController extends ChangeNotifier {
  SessionController({MobileApi? api}) : _api = api ?? MobileApi() {
    _initAuth();
  }

  final MobileApi _api;

  String _userId = '';
  bool _loading = false;
  String? _error;
  MobileSyncPayload? _payload;
  StreamSubscription<AuthState>? _authSub;

  bool get isHost => payload?.roles.contains('host') == true;
  bool get isAdmin => payload?.roles.contains('admin') == true;
  bool get isStaff => payload?.roles.contains('staff') == true;

  String get userId => _userId;
  bool get loading => _loading;
  String? get error => _error;
  MobileSyncPayload? get payload => _payload;
  bool get isAuthenticated => _userId.trim().isNotEmpty;

  SupabaseClient? get _supabase {
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  String? get userEmail => _supabase?.auth.currentUser?.email;

  void _initAuth() {
    final client = _supabase;
    if (client == null) return;

    // Check for existing session
    final session = client.auth.currentSession;
    if (session != null) {
      _userId = session.user.id;
      notifyListeners();
    }

    // Listen for auth state changes
    _authSub = client.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      final newId = session?.user.id ?? '';
      if (newId != _userId) {
        _userId = newId;
        notifyListeners();
        if (newId.isNotEmpty) refresh();
      }
    });
  }

  // ---- Auth methods ----

  Future<void> signInWithEmail(String email, String password) async {
    final client = _supabase;
    if (client == null) throw Exception('Supabase not configured');
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      await client.auth.signInWithPassword(email: email, password: password);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> signUpWithEmail(String email, String password, {String? fullName}) async {
    final client = _supabase;
    if (client == null) throw Exception('Supabase not configured');
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      await client.auth.signUp(
        email: email,
        password: password,
        data: fullName != null ? {'full_name': fullName} : null,
      );
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithApple() async {
    final client = _supabase;
    if (client == null) throw Exception('Supabase not configured');
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final rawNonce = client.auth.generateRawNonce();
      final hashedNonce = sha256.convert(utf8.encode(rawNonce)).toString();

      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashedNonce,
      );

      final idToken = credential.identityToken;
      if (idToken == null) throw Exception('No identity token from Apple');

      await client.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    try {
      await _supabase?.auth.signOut();
    } catch (_) {}
    _userId = '';
    _payload = null;
    _error = null;
    notifyListeners();
  }

  Future<void> deleteAccount() async {
    final client = _supabase;
    if (client == null || !isAuthenticated) return;
    final accessToken = client.auth.currentSession?.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      throw Exception('No active session found for account deletion.');
    }
    await _api.deleteAccountWithToken(accessToken: accessToken);
    await signOut();
  }

  // ---- Legacy manual connect (fallback) ----

  Future<void> setUserId(String value) async {
    _userId = value.trim();
    notifyListeners();
    await refresh();
  }

  // ---- Data sync ----

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _payload = await _api.fetchSync(userId: _userId.isEmpty ? null : _userId);
    } catch (e, stack) {
      debugPrint('[SessionController.refresh] ERROR: $e');
      debugPrint('[SessionController.refresh] STACK: $stack');
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> upsertProfile({
    required String fullName,
    required String phone,
    required String bio,
  }) async {
    if (!isAuthenticated) return;
    await _api.upsertProfile(
      userId: _userId,
      fullName: fullName,
      phone: phone,
      bio: bio,
    );
    await refresh();
  }

  Future<void> addListingToWishlist(Map<String, dynamic> listing) async {
    if (!isAuthenticated) return;
    await _api.addToWishlist(
      userId: _userId,
      title: (listing['title'] ?? listing['name'] ?? 'Saved Item').toString(),
      itemType: 'property',
      propertyId: (listing['id'] ?? '').toString(),
    );
    await refresh();
  }

  Future<void> removeWishlistItem(String id) async {
    if (!isAuthenticated || id.isEmpty) return;
    await _api.removeFromWishlist(userId: _userId, id: id);
    await refresh();
  }

  Future<void> addListingToTripCart(Map<String, dynamic> listing) async {
    if (!isAuthenticated) return;
    final type = (listing['item_type'] ?? 'property').toString();
    await _api.addToTripCart(
      userId: _userId,
      itemType: type,
      quantity: 1,
      propertyId: type == 'property' ? (listing['id'] ?? '').toString() : null,
      tourId: type == 'tour' || type == 'tour_package' ? (listing['id'] ?? '').toString() : null,
      transportId: type == 'transport' ? (listing['id'] ?? '').toString() : null,
    );
    await refresh();
  }

  Future<String?> createBooking({
    required Map<String, dynamic> item,
    String? checkIn,
    String? checkOut,
    required int guests,
    required double totalAmount,
    required String currency,
    String? paymentPhone,
    String? paymentProvider,
    String? specialRequests,
  }) async {
    if (!isAuthenticated) throw Exception('Sign in to book');
    final type = (item['item_type'] ?? 'property').toString();
    return _api.createBooking(
      userId: _userId,
      itemType: type,
      referenceId: (item['id'] ?? '').toString(),
      title: (item['title'] ?? item['name'] ?? 'Listing').toString(),
      checkIn: checkIn,
      checkOut: checkOut,
      guests: guests,
      totalAmount: totalAmount,
      currency: currency,
      paymentPhone: paymentPhone,
      paymentProvider: paymentProvider,
      specialRequests: specialRequests,
    );
  }

  Future<void> removeTripCartItem(String id) async {
    if (!isAuthenticated || id.isEmpty) return;
    await _api.removeFromTripCart(userId: _userId, id: id);
    await refresh();
  }

  Future<void> forgotPassword(String email) async {
    await _api.forgotPassword(email);
  }

  Future<void> cancelBooking(String bookingId) async {
    if (!isAuthenticated) return;
    await _api.cancelBooking(bookingId: bookingId, userId: _userId);
    await refresh();
  }

  Future<void> submitReview({
    required String bookingId,
    required String title,
    required double accommodationRating,
    required double serviceRating,
    required String comment,
  }) async {
    if (!isAuthenticated) throw Exception('Sign in to submit review');
    await _api.submitReview(
      bookingId: bookingId,
      userId: _userId,
      title: title,
      accommodationRating: accommodationRating,
      serviceRating: serviceRating,
      comment: comment,
    );
    await refresh();
  }

  Future<void> markNotificationRead(String id) async {
    if (!isAuthenticated) return;
    await _api.markNotificationRead(id: id);
  }

  Future<void> markAllNotificationsRead() async {
    if (!isAuthenticated) return;
    await _api.markAllNotificationsRead(userId: _userId);
    await refresh();
  }

  Future<String?> createSupportTicket({
    required String subject,
    required String message,
  }) async {
    if (!isAuthenticated) throw Exception('Sign in to contact support');
    return _api.createSupportTicket(userId: _userId, subject: subject, message: message);
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }
}
