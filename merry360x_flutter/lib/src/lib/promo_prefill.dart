import 'package:shared_preferences/shared_preferences.dart';

const String kSaveTenPromoCode = 'SAVE10';
const String _kPendingPromoCodeKey = 'merry360x.pending_promo_code';

String normalizePromoCode(String value) {
  return value.trim().toUpperCase();
}

Future<void> setPendingPromoCode(String code) async {
  final normalized = normalizePromoCode(code);
  if (normalized.isEmpty) return;

  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_kPendingPromoCodeKey, normalized);
}

Future<String?> getPendingPromoCode() async {
  final prefs = await SharedPreferences.getInstance();
  final stored = prefs.getString(_kPendingPromoCodeKey);
  if (stored == null) return null;

  final normalized = normalizePromoCode(stored);
  return normalized.isEmpty ? null : normalized;
}

Future<void> clearPendingPromoCode() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(_kPendingPromoCodeKey);
}
