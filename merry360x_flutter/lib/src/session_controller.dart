import 'package:flutter/foundation.dart';

import 'models/mobile_sync.dart';
import 'services/mobile_api.dart';

class SessionController extends ChangeNotifier {
  SessionController({MobileApi? api}) : _api = api ?? MobileApi();

  final MobileApi _api;

  String _userId = '';
  bool _loading = false;
  String? _error;
  MobileSyncPayload? _payload;

  String get userId => _userId;
  bool get loading => _loading;
  String? get error => _error;
  MobileSyncPayload? get payload => _payload;
  bool get isAuthenticated => _userId.trim().isNotEmpty;

  Future<void> setUserId(String value) async {
    _userId = value.trim();
    notifyListeners();
    await refresh();
  }

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _payload = await _api.fetchSync(userId: _userId.isEmpty ? null : _userId);
    } catch (e) {
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
    await _api.addToTripCart(
      userId: _userId,
      itemType: 'property',
      quantity: 1,
      propertyId: (listing['id'] ?? '').toString(),
    );
    await refresh();
  }

  Future<void> removeTripCartItem(String id) async {
    if (!isAuthenticated || id.isEmpty) return;
    await _api.removeFromTripCart(userId: _userId, id: id);
    await refresh();
  }
}
