import 'package:intl/intl.dart';

// ── BNR exchange rates (RWF-based: how many RWF per 1 unit of each currency) ──
// Source: National Bank of Rwanda (Feb 2026) — used as fallback defaults.
const Map<String, double> kFxRates = {
  'RWF': 1.0,
  'USD': 1455.5,
  'EUR': 1716.76225,
  'GBP': 1972.4936,
  'CNY': 209.732456,
  'TZS': 0.563279,
  'KES': 11.283036,
  'UGX': 0.408996,
  'ZMW': 78.35757,
  'BIF': 0.491231,
  'ZAR': 89.412093,
  'AED': 396.323917,
};

/// Currencies that display with 0 decimal places.
const Set<String> _zeroDec = {'RWF', 'TZS', 'KES', 'UGX', 'BIF'};

/// Returns the number of decimal places standard for [currency].
int getCurrencyDecimals(String currency) =>
    _zeroDec.contains(currency.toUpperCase()) ? 0 : 2;

/// Convert [amount] from [from] currency to [to] currency via RWF,
/// using the provided [rates] map (defaults to [kFxRates]).
double? convertAmount(num amount, String from, String to,
    [Map<String, double>? rates]) {
  final r = rates ?? kFxRates;
  final f = from.toUpperCase();
  final t = to.toUpperCase();
  if (f == t) return amount.toDouble();
  final fromRate = r[f];
  final toRate = r[t];
  if (fromRate == null || toRate == null) return null;
  return amount * fromRate / toRate;
}

/// Format [amount] in [currency] with the correct decimal places.
/// Returns e.g. "1,500 RWF" or "1.03 USD".
String formatMoney(num amount, String currency) {
  final code = currency.toUpperCase();
  final decimals = getCurrencyDecimals(code);
  final pattern = decimals > 0
      ? '#,##0.${'0' * decimals}'
      : '#,##0';
  final fmt = NumberFormat(pattern);
  return '${fmt.format(amount)} $code';
}

/// Format [amount] converting from [from] to [to] currency,
/// using the provided [rates] map (defaults to [kFxRates]).
/// Falls back to showing the original amount if the rate is unknown.
String formatMoneyWithConversion(num amount, String from, String to,
    [Map<String, double>? rates]) {
  final f = from.toUpperCase();
  final t = to.toUpperCase();
  if (f == t) return formatMoney(amount, t);
  final converted = convertAmount(amount, f, t, rates);
  if (converted == null) return formatMoney(amount, f);
  return formatMoney(converted, t);
}
