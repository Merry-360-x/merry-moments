import 'package:intl/intl.dart';

/// Number formatting utility for the Merry360x app.
/// Provides consistent formatting with thousands separators and optional decimals.
/// Never uses compact notation (K, M, B) - always shows full numbers.

final _rwfFormatter = NumberFormat('#,###');
final _usdFormatter = NumberFormat('#,###.00');
final _genericFormatter = NumberFormat('#,###');
final _genericDecimalFormatter = NumberFormat('#,###.00');

/// Format a whole number with thousands separators (e.g., 42000 -> "42,000")
String fmtInt(num value) {
  return _genericFormatter.format(value.round());
}

/// Format a number with 2 decimal places and thousands separators (e.g., 42000.50 -> "42,000.50")
String fmtDecimal(num value, {int decimalDigits = 2}) {
  if (decimalDigits == 0) return fmtInt(value);
  final formatter = NumberFormat('#,###.${'0' * decimalDigits}');
  return formatter.format(value);
}

/// Format RWF (Rwandan Franc) - whole numbers only, no decimals
String fmtRWF(num value) {
  return _rwfFormatter.format(value.round());
}

/// Format USD - always 2 decimal places
String fmtUSD(num value) {
  return _usdFormatter.format(value);
}

/// Format any currency with proper decimal handling
/// RWF, JPY, KRW: 0 decimals | Most others: 2 decimals
String fmtCurrency(num value, String currencyCode) {
  final code = currencyCode.toUpperCase();
  const zeroDecimalCurrencies = {'RWF', 'JPY', 'KRW', 'VND', 'IDR', 'CLP', 'PYG'};
  
  if (zeroDecimalCurrencies.contains(code)) {
    return fmtInt(value);
  }
  return fmtDecimal(value);
}

/// Format with currency code suffix (e.g., "42,000 RWF")
String fmtCurrencyWithCode(num value, String currencyCode) {
  return '${fmtCurrency(value, currencyCode)} ${currencyCode.toUpperCase()}';
}

/// Format a compact number for display in tight spaces (still full number, just smaller)
/// Returns full formatted number - no K/M notation
String fmtFull(num value) {
  return fmtInt(value);
}

/// Format percentage with 1 decimal place
String fmtPercent(num value) {
  return NumberFormat('#,###.#').format(value);
}