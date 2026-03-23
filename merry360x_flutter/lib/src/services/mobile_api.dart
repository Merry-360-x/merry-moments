import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/mobile_sync.dart';

class MobileApi {
  MobileApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<MobileSyncPayload> fetchSync({String? userId}) async {
    final response = await _client.get(AppConfig.mobileSyncUri(userId: userId));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Sync failed with status ${response.statusCode}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (json['ok'] != true) {
      throw Exception((json['error'] ?? 'Sync request failed').toString());
    }

    return MobileSyncPayload.fromJson(json);
  }

  Future<void> upsertProfile({
    required String userId,
    required String fullName,
    required String phone,
    required String bio,
  }) async {
    await _postAction({
      'action': 'upsert-profile',
      'userId': userId,
      'fullName': fullName,
      'phone': phone,
      'bio': bio,
    });
  }

  Future<void> addToWishlist({
    required String userId,
    required String title,
    required String itemType,
    String? propertyId,
    String? tourId,
    String? transportId,
  }) async {
    await _postAction({
      'action': 'add-to-wishlist',
      'userId': userId,
      'title': title,
      'itemType': itemType,
      'propertyId': propertyId,
      'tourId': tourId,
      'transportId': transportId,
    });
  }

  Future<void> removeFromWishlist({required String userId, required String id}) async {
    await _postAction({
      'action': 'remove-from-wishlist',
      'userId': userId,
      'id': id,
    });
  }

  Future<void> addToTripCart({
    required String userId,
    required String itemType,
    int quantity = 1,
    String? propertyId,
    String? tourId,
    String? transportId,
  }) async {
    await _postAction({
      'action': 'add-to-trip-cart',
      'userId': userId,
      'itemType': itemType,
      'quantity': quantity,
      'propertyId': propertyId,
      'tourId': tourId,
      'transportId': transportId,
    });
  }

  Future<void> removeFromTripCart({required String userId, required String id}) async {
    await _postAction({
      'action': 'remove-from-trip-cart',
      'userId': userId,
      'id': id,
    });
  }

  Future<void> _postAction(Map<String, dynamic> payload) async {
    final response = await _client.post(
      AppConfig.mobileActionUri(),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Action failed with status ${response.statusCode}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (json['ok'] != true) {
      throw Exception((json['error'] ?? 'Action failed').toString());
    }
  }
}
