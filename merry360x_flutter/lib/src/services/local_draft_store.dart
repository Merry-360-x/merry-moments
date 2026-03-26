import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class LocalDraftStore {
  const LocalDraftStore._();

  static String key(String scope, String userId) => 'merry360x_draft_${scope}_$userId';

  static Future<Map<String, dynamic>?> read(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return null;

    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        return decoded.map((key, value) => MapEntry(key.toString(), value));
      }
    } catch (_) {
      await prefs.remove(key);
    }
    return null;
  }

  static Future<void> write(String key, Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    final enriched = Map<String, dynamic>.from(payload)
      ..['savedAt'] = DateTime.now().toIso8601String();
    await prefs.setString(key, jsonEncode(enriched));
  }

  static Future<void> clear(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }
}