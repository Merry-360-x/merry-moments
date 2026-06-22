import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../app.dart';
import '../../../l10n/app_localizations.dart';
import '../utils/app_snackbar.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../services/app_database.dart';
import '../../session_controller.dart';
import 'package:merry360x_flutter/src/lib/fees.dart';
import 'package:merry360x_flutter/src/lib/promo_prefill.dart';
import 'explore_screen.dart' show resolveListingImageUrl;
import '../widgets/slide_to_confirm_button.dart';

enum _SubmitState { idle, processing, success, failed }

// ─────────────────────────────────────────────────────────────────────────────
// Payment method definitions (mirrors web Checkout.tsx)
// ─────────────────────────────────────────────────────────────────────────────

class _PayMethod {
  const _PayMethod({
    required this.id,
    required this.name,
    required this.country,
    required this.countryCode,
    required this.currency,
    required this.color,
    required this.asset,
    this.textLight = true,
  });

  final String id;
  final String name;
  final String country;
  final String countryCode;
  final String currency;
  final Color color;
  final String asset; // e.g. 'assets/payment/mtn-momo.png'
  final bool textLight;
}

const _kPayMethods = <_PayMethod>[
  // Rwanda (+250) — RWF
  _PayMethod(
    id: 'MTN_MOMO_RWA',
    name: 'MTN MoMo',
    country: 'Rwanda',
    countryCode: '+250',
    currency: 'RWF',
    color: Color(0xFFFFC107),
    asset: 'assets/payment/mtn-momo.png',
    textLight: false,
  ),
  _PayMethod(
    id: 'AIRTEL_RWA',
    name: 'Airtel Money',
    country: 'Rwanda',
    countryCode: '+250',
    currency: 'RWF',
    color: Color(0xFFEF5350),
    asset: 'assets/payment/airtel-money.png',
  ),
  // Kenya (+254) — KES
  _PayMethod(
    id: 'MPESA_KEN',
    name: 'M-Pesa',
    country: 'Kenya',
    countryCode: '+254',
    currency: 'KES',
    color: Color(0xFF4CAF50),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Uganda (+256) — UGX
  _PayMethod(
    id: 'MTN_MOMO_UGA',
    name: 'MTN MoMo',
    country: 'Uganda',
    countryCode: '+256',
    currency: 'UGX',
    color: Color(0xFFFFC107),
    asset: 'assets/payment/mtn-momo.png',
    textLight: false,
  ),
  _PayMethod(
    id: 'AIRTEL_OAPI_UGA',
    name: 'Airtel Money',
    country: 'Uganda',
    countryCode: '+256',
    currency: 'UGX',
    color: Color(0xFFEF5350),
    asset: 'assets/payment/airtel-money.png',
  ),
  // Zambia (+260) — ZMW
  _PayMethod(
    id: 'MTN_MOMO_ZMB',
    name: 'MTN MoMo',
    country: 'Zambia',
    countryCode: '+260',
    currency: 'ZMW',
    color: Color(0xFFFFC107),
    asset: 'assets/payment/mtn-momo.png',
    textLight: false,
  ),
  _PayMethod(
    id: 'ZAMTEL_ZMB',
    name: 'Zamtel',
    country: 'Zambia',
    countryCode: '+260',
    currency: 'ZMW',
    color: Color(0xFF388E3C),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Tanzania (+255) — TZS
  _PayMethod(
    id: 'VODACOM_TZN',
    name: 'Vodacom M-Pesa',
    country: 'Tanzania',
    countryCode: '+255',
    currency: 'TZS',
    color: Color(0xFFD32F2F),
    asset: 'assets/payment/mtn-momo.png',
  ),
  _PayMethod(
    id: 'TIGO_TZN',
    name: 'Tigo Pesa',
    country: 'Tanzania',
    countryCode: '+255',
    currency: 'TZS',
    color: Color(0xFF1565C0),
    asset: 'assets/payment/mtn-momo.png',
  ),
  _PayMethod(
    id: 'AIRTEL_TZN',
    name: 'Airtel Money',
    country: 'Tanzania',
    countryCode: '+255',
    currency: 'TZS',
    color: Color(0xFFEF5350),
    asset: 'assets/payment/airtel-money.png',
  ),
  _PayMethod(
    id: 'HALOTEL_TZN',
    name: 'Halotel',
    country: 'Tanzania',
    countryCode: '+255',
    currency: 'TZS',
    color: Color(0xFF4CAF50),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Ghana (+233) — GHS
  _PayMethod(
    id: 'MTN_MOMO_GHA',
    name: 'MTN MoMo',
    country: 'Ghana',
    countryCode: '+233',
    currency: 'GHS',
    color: Color(0xFFFFC107),
    asset: 'assets/payment/mtn-momo.png',
    textLight: false,
  ),
  _PayMethod(
    id: 'VODAFONE_GHA',
    name: 'Vodafone Cash',
    country: 'Ghana',
    countryCode: '+233',
    currency: 'GHS',
    color: Color(0xFFD32F2F),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // DR Congo (+243) — CDF
  _PayMethod(
    id: 'VODACOM_MPESA_COD',
    name: 'Vodacom M-Pesa',
    country: 'DR Congo',
    countryCode: '+243',
    currency: 'CDF',
    color: Color(0xFFD32F2F),
    asset: 'assets/payment/mtn-momo.png',
  ),
  _PayMethod(
    id: 'AIRTEL_COD',
    name: 'Airtel Money',
    country: 'DR Congo',
    countryCode: '+243',
    currency: 'CDF',
    color: Color(0xFFEF5350),
    asset: 'assets/payment/airtel-money.png',
  ),
  _PayMethod(
    id: 'ORANGE_COD',
    name: 'Orange Money',
    country: 'DR Congo',
    countryCode: '+243',
    currency: 'CDF',
    color: Color(0xFFFF9800),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Cameroon (+237) — XAF
  _PayMethod(
    id: 'MTN_MOMO_CMR',
    name: 'MTN MoMo',
    country: 'Cameroon',
    countryCode: '+237',
    currency: 'XAF',
    color: Color(0xFFFFC107),
    asset: 'assets/payment/mtn-momo.png',
    textLight: false,
  ),
  _PayMethod(
    id: 'ORANGE_CMR',
    name: 'Orange Money',
    country: 'Cameroon',
    countryCode: '+237',
    currency: 'XAF',
    color: Color(0xFFFF9800),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Senegal (+221) — XOF
  _PayMethod(
    id: 'ORANGE_SEN',
    name: 'Orange Money',
    country: 'Senegal',
    countryCode: '+221',
    currency: 'XOF',
    color: Color(0xFFFF9800),
    asset: 'assets/payment/mtn-momo.png',
  ),
  _PayMethod(
    id: 'FREE_SEN',
    name: 'Free Money',
    country: 'Senegal',
    countryCode: '+221',
    currency: 'XOF',
    color: Color(0xFF00897B),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Ivory Coast (+225) — XOF
  _PayMethod(
    id: 'MTN_MOMO_CIV',
    name: 'MTN MoMo',
    country: 'Ivory Coast',
    countryCode: '+225',
    currency: 'XOF',
    color: Color(0xFFFFC107),
    asset: 'assets/payment/mtn-momo.png',
    textLight: false,
  ),
  _PayMethod(
    id: 'ORANGE_CIV',
    name: 'Orange Money',
    country: 'Ivory Coast',
    countryCode: '+225',
    currency: 'XOF',
    color: Color(0xFFFF9800),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Mozambique (+258) — MZN
  _PayMethod(
    id: 'VODACOM_MOZ',
    name: 'Vodacom M-Pesa',
    country: 'Mozambique',
    countryCode: '+258',
    currency: 'MZN',
    color: Color(0xFFD32F2F),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Malawi (+265) — MWK
  _PayMethod(
    id: 'AIRTEL_MWI',
    name: 'Airtel Money',
    country: 'Malawi',
    countryCode: '+265',
    currency: 'MWK',
    color: Color(0xFFEF5350),
    asset: 'assets/payment/airtel-money.png',
  ),
  _PayMethod(
    id: 'TNM_MWI',
    name: 'TNM Mpamba',
    country: 'Malawi',
    countryCode: '+265',
    currency: 'MWK',
    color: Color(0xFF1976D2),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Burundi (+257) — BIF
  _PayMethod(
    id: 'ECONET_BDI',
    name: 'Econet Leo',
    country: 'Burundi',
    countryCode: '+257',
    currency: 'BIF',
    color: Color(0xFF1565C0),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Benin (+229) — XOF
  _PayMethod(
    id: 'MTN_MOMO_BEN',
    name: 'MTN MoMo',
    country: 'Benin',
    countryCode: '+229',
    currency: 'XOF',
    color: Color(0xFFFFC107),
    asset: 'assets/payment/mtn-momo.png',
    textLight: false,
  ),
  _PayMethod(
    id: 'MOOV_BEN',
    name: 'Moov Money',
    country: 'Benin',
    countryCode: '+229',
    currency: 'XOF',
    color: Color(0xFF1976D2),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Gabon (+241) — XAF
  _PayMethod(
    id: 'AIRTEL_GAB',
    name: 'Airtel Money',
    country: 'Gabon',
    countryCode: '+241',
    currency: 'XAF',
    color: Color(0xFFEF5350),
    asset: 'assets/payment/airtel-money.png',
  ),
  // Sierra Leone (+232) — SLE
  _PayMethod(
    id: 'ORANGE_SLE',
    name: 'Orange Money',
    country: 'Sierra Leone',
    countryCode: '+232',
    currency: 'SLE',
    color: Color(0xFFFF9800),
    asset: 'assets/payment/mtn-momo.png',
  ),
  // Congo-Brazzaville (+242) — XAF
  _PayMethod(
    id: 'MTN_MOMO_COG',
    name: 'MTN MoMo',
    country: 'Congo',
    countryCode: '+242',
    currency: 'XAF',
    color: Color(0xFFFFC107),
    asset: 'assets/payment/mtn-momo.png',
    textLight: false,
  ),
  _PayMethod(
    id: 'AIRTEL_COG',
    name: 'Airtel Money',
    country: 'Congo',
    countryCode: '+242',
    currency: 'XAF',
    color: Color(0xFFEF5350),
    asset: 'assets/payment/airtel-money.png',
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// CheckoutScreen
// ─────────────────────────────────────────────────────────────────────────────

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({
    super.key,
    required this.item,
    this.checkIn,
    this.checkOut,
    required this.guests,
    required this.session,
    this.allCartItems,
    this.initialDiscountCode,
    this.initialDiscount,
  });

  final Map<String, dynamic> item;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final int guests;
  final SessionController session;

  /// When set, this is a multi-item cart checkout. All service fees and host
  /// earnings are computed per-item using their respective service types.
  final List<Map<String, dynamic>>? allCartItems;
  final String? initialDiscountCode;
  final Map<String, dynamic>? initialDiscount;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  // Steps: 0 = Details, 1 = Payment, 2 = Confirm
  int _step = 0;

  // Details step
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  // Payment step — 0 = Mobile Money, 1 = Card, 2 = Bank Transfer
  int _payTab = 0;
  _PayMethod? _selectedMethod;
  final _phoneCtrl = TextEditingController();
  bool _showMobileMoney = true; // hidden for non-African regions
  String? _detectedCountryISO; // 2-letter ISO e.g. 'RW', 'US'

  _SubmitState _submitState = _SubmitState.idle;
  int _resetCounter = 0;
  String? _bookingId;
  String? _paymentMethod; // 'mobile_money', 'card', 'bank_transfer'

  // Editable dates — start from widget values; null means user must pick.
  DateTime? _checkIn;
  DateTime? _checkOut;
  int _guests = 1;

  // Promo code
  final _promoCtrl = TextEditingController();
  bool _applyingPromo = false;
  Map<String, dynamic>? _appliedDiscount;
  double _discountAmount = 0;
  String? _promoMsg;
  bool _promoSuccess = false;

  bool _showPriceDetails = false;
  late AppLocalizations _l;

  @override
  void initState() {
    super.initState();
    // Pre-fill with user data
    final profile = widget.session.payload?.profile;
    final guestInfo = widget.session.guestInfo;
    _nameCtrl.text = (profile?['full_name'] ?? guestInfo?['name'] ?? '')
        .toString();
    _emailCtrl.text = widget.session.userEmail ?? guestInfo?['email'] ?? '';
    if (guestInfo?['phone'] != null && guestInfo!['phone']!.isNotEmpty) {
      _phoneCtrl.text = guestInfo['phone']!;
    }
    // Seed dates from widget (may be null when coming from trip cart).
    _checkIn = widget.checkIn;
    _checkOut = widget.checkOut;
    _guests = _guests;
    // Auto-select first method
    _selectedMethod = _kPayMethods.first;
    _phoneCtrl.clear();
    // Detect user region
    _detectRegion();
    // Load discount passed from trip cart
    if (widget.initialDiscount != null && widget.initialDiscountCode != null) {
      _appliedDiscount = widget.initialDiscount;
      _promoCtrl.text = widget.initialDiscountCode!;
      _recalcDiscount();
      clearPendingPromoCode();
    } else {
      _bootstrapPendingPromoCode();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _notesCtrl.dispose();
    _phoneCtrl.dispose();
    _promoCtrl.dispose();
    super.dispose();
  }

  // African countries with PawaPay mobile money support (ISO 3166-1 alpha-2)
  static const _africanPawapayCountries = {
    'RW',
    'KE',
    'UG',
    'ZM',
    'TZ',
    'GH',
    'CD',
    'CM',
    'SN',
    'CI',
    'MZ',
    'MW',
    'BI',
    'CG',
  };

  // Map ISO code \u2192 default PawaPay method ID
  static const _geoDefaultMethod = <String, String>{
    'RW': 'MTN_MOMO_RWA',
    'KE': 'MPESA_KEN',
    'UG': 'MTN_MOMO_UGA',
    'ZM': 'MTN_MOMO_ZMB',
    'TZ': 'VODACOM_TZN',
    'GH': 'MTN_MOMO_GHA',
    'CD': 'VODACOM_MPESA_COD',
    'CM': 'MTN_MOMO_CMR',
    'SN': 'ORANGE_SEN',
    'CI': 'MTN_MOMO_CIV',
    'MZ': 'VODACOM_MOZ',
    'MW': 'AIRTEL_MWI',
    'BI': 'ECONET_BDI',
    'CG': 'MTN_MOMO_COG',
    'BJ': 'MTN_MOMO_BEN',
    'GA': 'AIRTEL_GAB',
    'SL': 'ORANGE_SLE',
  };

  static const _geoCountryName = <String, String>{
    'RW': 'Rwanda',
    'KE': 'Kenya',
    'UG': 'Uganda',
    'ZM': 'Zambia',
    'TZ': 'Tanzania',
    'GH': 'Ghana',
    'CD': 'DR Congo',
    'CM': 'Cameroon',
    'SN': 'Senegal',
    'CI': 'Ivory Coast',
    'MZ': 'Mozambique',
    'MW': 'Malawi',
    'BI': 'Burundi',
    'CG': 'Congo',
    'BJ': 'Benin',
    'GA': 'Gabon',
    'SL': 'Sierra Leone',
  };

  List<_PayMethod> get _regionPayMethods {
    final iso = _detectedCountryISO;
    if (iso != null) {
      final countryName = _geoCountryName[iso.toUpperCase()];
      if (countryName != null) {
        final methods = _kPayMethods
            .where((m) => m.country == countryName)
            .toList();
        if (methods.isNotEmpty) return methods;
      }
    }

    if (_selectedMethod != null) {
      final methods = _kPayMethods
          .where((m) => m.country == _selectedMethod!.country)
          .toList();
      if (methods.isNotEmpty) return methods;
    }

    return const <_PayMethod>[];
  }

  Future<void> _detectRegion() async {
    // 1. Try IP-based geolocation (fast, 3s timeout)
    String? iso;
    try {
      final res = await http
          .get(Uri.parse('https://ipapi.co/json/'))
          .timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        iso = (data['country_code'] as String?)?.toUpperCase();
      }
    } catch (_) {
      // Fallback below
    }

    // 2. Fallback to secondary IP API
    if (iso == null || iso.isEmpty) {
      try {
        final res = await http
            .get(Uri.parse('https://ipinfo.io/json'))
            .timeout(const Duration(seconds: 3));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body) as Map<String, dynamic>;
          iso = (data['country'] as String?)?.toUpperCase();
        }
      } catch (_) {
        // Fallback below
      }
    }

    // 3. Fallback to Cloudflare trace endpoint
    if (iso == null || iso.isEmpty) {
      try {
        final res = await http
            .get(Uri.parse('https://www.cloudflare.com/cdn-cgi/trace'))
            .timeout(const Duration(seconds: 3));
        if (res.statusCode == 200) {
          final line = res.body
              .split('\n')
              .firstWhere((l) => l.startsWith('loc='), orElse: () => '');
          if (line.isNotEmpty) {
            iso = line.split('=').last.trim().toUpperCase();
          }
        }
      } catch (_) {
        // Fallback below
      }
    }

    // 4. Fallback to device locale country
    iso ??= Platform.localeName.split('_').lastOrNull?.toUpperCase();

    if (!mounted) return;

    _detectedCountryISO = iso;
    final isAfrican = iso != null && _africanPawapayCountries.contains(iso);

    setState(() {
      _showMobileMoney = isAfrican;
      if (isAfrican) {
        // Select the local default method
        final defaultId = _geoDefaultMethod[iso!];
        final localMethod = _kPayMethods
            .where((m) => m.id == defaultId)
            .firstOrNull;
        if (localMethod != null) {
          _selectedMethod = localMethod;
          _phoneCtrl.clear();
        }
        _payTab = 0;
      } else {
        // Non-African region \u2014 default to Card
        _payTab = 1;
      }
    });
  }

  Map<String, dynamic> get item => widget.item;
  String get itemType => (item['item_type'] ?? 'property').toString();
  String get _currency => (item['currency'] ?? 'USD').toString();

  String get _serviceType {
    switch (itemType) {
      case 'property':
        return 'accommodation';
      case 'tour':
      case 'tour_package':
        return 'tour';
      case 'transport':
        return 'transport';
      default:
        return 'accommodation';
    }
  }

  double get _pricePerUnit {
    switch (itemType) {
      case 'tour':
        return double.tryParse('${item['price_per_person'] ?? 0}') ?? 0;
      case 'tour_package':
        return double.tryParse('${item['price_per_adult'] ?? 0}') ?? 0;
      case 'transport':
        return double.tryParse('${item['price_per_day'] ?? 0}') ?? 0;
      default:
        return double.tryParse('${item['price_per_night'] ?? 0}') ?? 0;
    }
  }

  int get _nights {
    if (_checkIn == null || _checkOut == null) return 1;
    return _checkOut!.difference(_checkIn!).inDays.clamp(1, 999);
  }

  Future<void> _pickDate({required bool isCheckIn}) async {
    final now = DateTime.now();
    final minDate = isCheckIn
        ? now
        : (_checkIn ?? now).add(const Duration(days: 1));
    final initialDate = isCheckIn ? (_checkIn ?? now) : (_checkOut ?? minDate);
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate.isBefore(minDate) ? minDate : initialDate,
      firstDate: minDate,
      lastDate: now.add(const Duration(days: 730)),
    );
    if (picked == null) return;
    setState(() {
      if (isCheckIn) {
        _checkIn = picked;
        // If check-out is now on or before new check-in, clear it.
        if (_checkOut != null && !_checkOut!.isAfter(picked)) {
          _checkOut = null;
        }
      } else {
        _checkOut = picked;
      }
    });
  }

  double get _subtotal {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return _pricePerUnit * _guests;
      default:
        return _pricePerUnit * _nights;
    }
  }

  BookingFinancials get _financials {
    final discountedListingSubtotal = (_subtotal - _discountAmount)
        .clamp(0.0, double.infinity)
        .toDouble();
    return calculateBookingFinancialsFromDiscountedListing(
      discountedListingSubtotal: discountedListingSubtotal,
      serviceType: _serviceType,
    );
  }

  /// Returns the service type string for any item type.
  String _serviceTypeFor(String t) {
    switch (t) {
      case 'tour':
      case 'tour_package':
        return 'tour';
      case 'transport':
      case 'transport_vehicle':
      case 'airport_transfer_pricing':
      case 'transport_route':
      case 'transport_service':
        return 'transport';
      default:
        return 'accommodation';
    }
  }

  /// Per-item base price (before fees) for a cart item map.
  double _baseForCartItem(Map<String, dynamic> ci) {
    final t = (ci['item_type'] ?? 'property').toString();
    final qty = int.tryParse('${ci['quantity'] ?? 1}') ?? 1;
    double price;
    switch (t) {
      case 'tour':
        price = double.tryParse('${ci['price_per_person'] ?? 0}') ?? 0;
      case 'tour_package':
        price = double.tryParse('${ci['price_per_adult'] ?? 0}') ?? 0;
      case 'transport':
      case 'transport_vehicle':
      case 'airport_transfer_pricing':
      case 'transport_route':
      case 'transport_service':
        price = double.tryParse('${ci['price_per_day'] ?? 0}') ?? 0;
      default:
        price = double.tryParse('${ci['price_per_night'] ?? 0}') ?? 0;
    }
    return (price * qty).clamp(0.0, double.infinity).toDouble();
  }

  /// Total guest-paid amount summed over all cart items, each with correct fee.
  double get _cartTotal {
    final items = widget.allCartItems;
    if (items == null || items.isEmpty) return _financials.guestTotal;
    double total = 0;
    for (final ci in items) {
      final base = (_baseForCartItem(ci) - _discountAmount / items.length)
          .clamp(0.0, double.infinity);
      final financials = calculateBookingFinancialsFromDiscountedListing(
        discountedListingSubtotal: base,
        serviceType: _serviceTypeFor(
          (ci['item_type'] ?? 'property').toString(),
        ),
      );
      total += financials.guestTotal;
    }
    return total;
  }

  /// Total service fees summed over all cart items.
  double get _cartServiceFee {
    final items = widget.allCartItems;
    if (items == null || items.isEmpty) return _financials.guestFee;
    double fee = 0;
    for (final ci in items) {
      final base = (_baseForCartItem(ci) - _discountAmount / items.length)
          .clamp(0.0, double.infinity);
      final financials = calculateBookingFinancialsFromDiscountedListing(
        discountedListingSubtotal: base,
        serviceType: _serviceTypeFor(
          (ci['item_type'] ?? 'property').toString(),
        ),
      );
      fee += financials.guestFee;
    }
    return fee;
  }

  /// Total base price (sum of listing subtotals before fees) for all cart items.
  double get _cartBasePrice {
    final items = widget.allCartItems;
    if (items == null || items.isEmpty) return _subtotal;
    double base = 0;
    for (final ci in items) {
      base += _baseForCartItem(ci);
    }
    return base;
  }

  double get _serviceFee =>
      widget.allCartItems != null ? _cartServiceFee : _financials.guestFee;
  double get _total =>
      widget.allCartItems != null ? _cartTotal : _financials.guestTotal;

  String _fmtDate(DateTime d) => '${d.day}/${d.month}/${d.year}';

  String _normalizedMobileMoneyPhone(String input) {
    final raw = input.trim();
    if (raw.isEmpty) return '';

    final compact = raw.replaceAll(RegExp(r'[^0-9+]'), '');
    if (compact.isEmpty) return '';
    if (compact.startsWith('+')) return compact;

    final cc = (_selectedMethod?.countryCode ?? '').trim();
    if (cc.isEmpty) return compact;

    final ccDigits = cc.replaceAll('+', '');
    var local = compact;
    if (local.startsWith(ccDigits)) {
      return '+$local';
    }

    local = local.replaceFirst(RegExp(r'^0+'), '');
    if (local.isEmpty) return '';

    final normalizedCc = cc.startsWith('+') ? cc : '+$cc';
    return '$normalizedCc$local';
  }

  Future<void> _bootstrapPendingPromoCode() async {
    final pendingCode = await getPendingPromoCode();
    if (!mounted || pendingCode == null || pendingCode.isEmpty) return;

    _promoCtrl.text = pendingCode;
    await _applyPromo(autoTriggered: true);
  }

  void _recalcDiscount() {
    if (_appliedDiscount == null) {
      _discountAmount = 0;
      return;
    }
    final type = (_appliedDiscount!['discount_type'] ?? 'fixed').toString();
    final value = ((_appliedDiscount!['discount_value'] ?? 0) as num)
        .toDouble();
    if (type == 'percentage') {
      _discountAmount = _subtotal * value / 100;
    } else {
      _discountAmount = value;
    }
    // Clamp: discount can't exceed subtotal (fees are computed after discounts on web)
    final maxDiscount = _subtotal;
    if (_discountAmount > maxDiscount) _discountAmount = maxDiscount;
  }

  Future<void> _applyPromo({bool autoTriggered = false}) async {
    final code = _promoCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _applyingPromo = true;
      _promoMsg = null;
      _promoSuccess = false;
    });
    try {
      final api = AppDatabase();
      final result = await api.validatePromoCode(
        code: code,
        subtotal: _subtotal,
        currency: _currency,
        itemType: itemType,
      );
      if (!mounted) return;
      if (result.data == null) {
        setState(() {
          _appliedDiscount = null;
          _discountAmount = 0;
          _promoMsg = autoTriggered
              ? null
              : (result.error ?? 'Invalid or expired promo code.');
          _promoSuccess = false;
        });
      } else {
        _appliedDiscount = result.data;
        _recalcDiscount();
        final normalizedCode = normalizePromoCode(code);
        _promoCtrl.text = normalizedCode;
        await clearPendingPromoCode();
        setState(() {
          _promoMsg =
              'Code applied! You save $_currency ${_discountAmount.toStringAsFixed(0)}';
          _promoSuccess = true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _promoMsg = autoTriggered ? null : 'Error validating code.';
          _promoSuccess = false;
          _discountAmount = 0;
        });
      }
    } finally {
      if (mounted) setState(() => _applyingPromo = false);
    }
  }

  void _removePromo() {
    setState(() {
      _appliedDiscount = null;
      _discountAmount = 0;
      _promoMsg = null;
      _promoSuccess = false;
      _promoCtrl.clear();
    });
  }

  String get _unitLabel {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return '$_guests guest${_guests > 1 ? 's' : ''}';
      case 'transport':
        return '$_nights day${_nights > 1 ? 's' : ''}';
      default:
        return '$_nights night${_nights > 1 ? 's' : ''}';
    }
  }

  /// Extract the best-available main image URL from a listing/cart item.
  String? _itemMainImage(Map<String, dynamic> item) {
    final images = item['images'];
    if (images is List && images.isNotEmpty) return images.first.toString();
    final img = item['main_image']?.toString() ?? item['image']?.toString();
    if (img != null && img.isNotEmpty) return img;
    final cover = item['cover_image']?.toString();
    if (cover != null && cover.isNotEmpty) return cover;
    return null;
  }

  Future<void> _confirmAndPay() async {
    HapticFeedback.mediumImpact();
    setState(() => _submitState = _SubmitState.processing);
    try {
      // For guest users, persist form details into the session so the auth
      // guard in SessionController.createBooking() passes.
      if (!widget.session.isAuthenticated) {
        final name = _nameCtrl.text.trim();
        if (name.isEmpty) {
          _showSnack(_l.enterFullName);
          setState(() => _submitState = _SubmitState.idle);
          return;
        }
        widget.session.setGuestInfo(
          name: name,
          email: _emailCtrl.text.trim(),
          phone: _phoneCtrl.text.trim(),
        );
      }

      if (_payTab == 0) {
        // ── Mobile Money (PawaPay) ──
        if (_selectedMethod == null) {
          _showSnack(_l.selectMomoProvider);
          setState(() => _submitState = _SubmitState.idle);
          return;
        }
        final localPhone = _phoneCtrl.text.trim();
        final phone = _normalizedMobileMoneyPhone(localPhone);
        if (localPhone.isEmpty || phone.isEmpty) {
          _showSnack(_l.enterMomoNumber);
          setState(() => _submitState = _SubmitState.idle);
          return;
        }

        final api = AppDatabase();
        final checkoutPhone = _normalizedMobileMoneyPhone(_phoneCtrl.text);
        final allItems = widget.allCartItems;

        // Build per-item list with correct financials for each service type.
        final checkoutItems = (allItems != null && allItems.isNotEmpty)
            ? allItems.map((ci) {
                final t = (ci['item_type'] ?? 'property').toString();
                final base = _baseForCartItem(ci);
                final fin = calculateBookingFinancialsFromDiscountedListing(
                  discountedListingSubtotal:
                      (base - _discountAmount / allItems.length).clamp(
                        0.0,
                        double.infinity,
                      ),
                  serviceType: _serviceTypeFor(t),
                );
                return {
                  'item_type': t,
                  'reference_id': (ci['id'] ?? ci['reference_id'] ?? '')
                      .toString(),
                  'title': (ci['title'] ?? ci['name'] ?? 'Listing').toString(),
                  'main_image': _itemMainImage(ci),
                  'quantity': int.tryParse('${ci['quantity'] ?? 1}') ?? 1,
                  'amount': fin.discountedListingSubtotal,
                  'calculated_price': fin.guestTotal,
                  'host_earnings_amount': fin.hostNetEarnings,
                  'platform_fee': fin.guestFee,
                  'host_fee_amount': fin.hostFee,
                  'guest_fee_percent': fin.guestFeePercent,
                  'host_fee_percent': fin.hostFeePercent,
                  'currency': (ci['currency'] ?? _currency).toString(),
                };
              }).toList()
            : [
                {
                  'item_type': itemType,
                  'reference_id': (item['id'] ?? '').toString(),
                  'title': (item['title'] ?? item['name'] ?? 'Listing')
                      .toString(),
                  'quantity': 1,
                  'amount': _subtotal,
                  'calculated_price': _total,
                  'host_earnings_amount': _financials.hostNetEarnings,
                  'platform_fee': _serviceFee,
                  'host_fee_amount': _financials.hostFee,
                  'guest_fee_percent': _financials.guestFeePercent,
                  'host_fee_percent': _financials.hostFeePercent,
                  'main_image': _itemMainImage(item),
                  'currency': _currency,
                },
              ];

        // Always use checkout_request for PawaPay so the webhook can process it.
        final checkoutId = await api.createCheckoutRequest(
          userId: widget.session.userId,
          name: _nameCtrl.text.trim(),
          email: _emailCtrl.text.trim(),
          phone: checkoutPhone.isEmpty ? null : checkoutPhone,
          totalAmount: _total,
          basePriceAmount: _cartBasePrice,
          serviceFeeAmount: _serviceFee,
          currency: _currency,
          paymentMethod: 'mobile_money',
          paymentProvider: _selectedMethod!.id,
          items: checkoutItems,
          specialRequests: _notesCtrl.text.trim().isEmpty
              ? null
              : _notesCtrl.text.trim(),
          metadata: {
            if (_appliedDiscount != null)
              'discount_code': _appliedDiscount!['code'],
            if (_discountAmount > 0) 'discount_amount': _discountAmount,
            'booking_details': {
              'check_in': _checkIn?.toIso8601String().split('T').first,
              'check_out': _checkOut?.toIso8601String().split('T').first,
              'guests': _guests,
            },
          },
        );
        if (_appliedDiscount != null && _discountAmount > 0) {
          AppDatabase().incrementPromoCodeUsage(
            codeId: _appliedDiscount!['id'].toString(),
          );
        }

        // ── Currency conversion: PawaPay expects RWF ──
        String payCurrency = _currency;
        double payAmount = _total;
        double? exchangeRate;

        if (_currency != 'RWF') {
          exchangeRate = await api.fetchExchangeRate();
          if (exchangeRate != null && exchangeRate > 0) {
            payAmount = _total * exchangeRate;
            payCurrency = 'RWF';
            // Store conversion details in the checkout request metadata
            await api.updateCheckoutRequestMetadata(
              checkoutId: checkoutId,
              metadata: {
                'priceUSD': _total,
                'exchangeRateUsed': exchangeRate,
                'totalAmountRWF': payAmount,
              },
            );
          }
        }

        final pawaPayResult = await api.initiatePawaPayDeposit(
          bookingId: checkoutId,
          amount: payAmount,
          currency: payCurrency,
          phoneNumber: phone,
          payerName: _nameCtrl.text.trim().isNotEmpty
              ? _nameCtrl.text.trim()
              : null,
          payerEmail: _emailCtrl.text.trim().isNotEmpty
              ? _emailCtrl.text.trim()
              : null,
          provider: _selectedMethod!.id,
        );
        // Check if PawaPay immediately rejected the payment (insufficient funds, invalid number, etc.)
        final pawaSuccess = pawaPayResult['success'];
        final pawaStatus =
            pawaPayResult['status']?.toString().toUpperCase().trim() ?? '';
        final validInitiationStatuses = {
          'SUBMITTED',
          'ACCEPTED',
          'PENDING',
          'ENQUEUED',
          'CREATED',
          'QUEUED',
        };

        if (pawaSuccess == false ||
            (pawaStatus.isNotEmpty &&
                !validInitiationStatuses.contains(pawaStatus))) {
          final msg =
              pawaPayResult['message']?.toString() ??
              pawaPayResult['error']?.toString() ??
              (pawaStatus.isEmpty
                  ? 'Payment was not initiated. The payment provider returned an empty status.'
                  : 'Payment failed with status: $pawaStatus. Please try again.');
          _showSnack(msg);
          setState(() => _submitState = _SubmitState.idle);
          return;
        }
        _paymentMethod = 'mobile_money';

        // Poll the PawaPay webhook to confirm the payment actually completed.
        // PawaPay is async — the initial response just means the deposit was queued.
        // We wait up to 15 s for the status to reach 'paid' before showing success.
        final depositId =
            pawaPayResult['depositId']?.toString() ??
            pawaPayResult['data']?['depositId']?.toString();
        final pollResult = await _pollCheckoutStatus(
          checkoutId,
          'paid',
          depositId: depositId,
        );
        if (pollResult == 'paid') {
          setState(() {
            _bookingId = checkoutId;
            _submitState = _SubmitState.success;
          });
          await Future.delayed(const Duration(milliseconds: 1500));
          if (!mounted) return;
          setState(() => _step = 2);
        } else if (pollResult != null) {
          // Explicit failure (failed / rejected / cancelled)
          if (!mounted) return;
          setState(() {
            _bookingId = checkoutId;
            _submitState = _SubmitState.idle;
            _step = 3;
          });
        } else {
          // Timed out — payment may still be pending on the network side.
          if (!mounted) return;
          _showPawaPayPendingDialog(checkoutId, phone);
          setState(() {
            _bookingId = checkoutId;
          });
        }
      } else if (_payTab == 1) {
        // ── Card (Flutterwave) ──
        final api = AppDatabase();
        final checkoutPhone = _normalizedMobileMoneyPhone(_phoneCtrl.text);
        final allItems = widget.allCartItems;

        final checkoutItems = (allItems != null && allItems.isNotEmpty)
            ? allItems.map((ci) {
                final t = (ci['item_type'] ?? 'property').toString();
                final base = _baseForCartItem(ci);
                final fin = calculateBookingFinancialsFromDiscountedListing(
                  discountedListingSubtotal:
                      (base - _discountAmount / allItems.length).clamp(
                        0.0,
                        double.infinity,
                      ),
                  serviceType: _serviceTypeFor(t),
                );
                return {
                  'item_type': t,
                  'reference_id': (ci['id'] ?? ci['reference_id'] ?? '')
                      .toString(),
                  'title': (ci['title'] ?? ci['name'] ?? 'Listing').toString(),
                  'main_image': _itemMainImage(ci),
                  'quantity': int.tryParse('${ci['quantity'] ?? 1}') ?? 1,
                  'amount': fin.discountedListingSubtotal,
                  'calculated_price': fin.guestTotal,
                  'host_earnings_amount': fin.hostNetEarnings,
                  'platform_fee': fin.guestFee,
                  'host_fee_amount': fin.hostFee,
                  'guest_fee_percent': fin.guestFeePercent,
                  'host_fee_percent': fin.hostFeePercent,
                  'currency': (ci['currency'] ?? _currency).toString(),
                };
              }).toList()
            : [
                {
                  'item_type': itemType,
                  'reference_id': (item['id'] ?? '').toString(),
                  'title': (item['title'] ?? item['name'] ?? 'Listing')
                      .toString(),
                  'quantity': 1,
                  'amount': _subtotal,
                  'calculated_price': _total,
                  'host_earnings_amount': _financials.hostNetEarnings,
                  'platform_fee': _serviceFee,
                  'host_fee_amount': _financials.hostFee,
                  'guest_fee_percent': _financials.guestFeePercent,
                  'host_fee_percent': _financials.hostFeePercent,
                  'main_image': _itemMainImage(item),
                  'currency': _currency,
                },
              ];

        final checkoutId = await api.createCheckoutRequest(
          userId: widget.session.userId,
          name: _nameCtrl.text.trim(),
          email: _emailCtrl.text.trim(),
          phone: checkoutPhone.isEmpty ? null : checkoutPhone,
          totalAmount: _total,
          basePriceAmount: allItems != null ? _cartBasePrice : _subtotal,
          serviceFeeAmount: _serviceFee,
          currency: _currency,
          paymentMethod: 'card',
          paymentProvider: 'FLUTTERWAVE',
          items: checkoutItems,
          specialRequests: _notesCtrl.text.trim().isEmpty
              ? null
              : _notesCtrl.text.trim(),
          metadata: {
            if (_appliedDiscount != null)
              'discount_code': _appliedDiscount!['code'],
            if (_discountAmount > 0) 'discount_amount': _discountAmount,
          },
        );
        final flwResult = await api.initFlutterwavePayment(
          checkoutId: checkoutId,
          amount: _total,
          currency: _currency,
          payerName: _nameCtrl.text.trim(),
          payerEmail: _emailCtrl.text.trim(),
          description: 'Merry360x Booking',
        );
        final redirectUrl =
            flwResult['redirectUrl']?.toString() ??
            flwResult['link']?.toString();
        if (redirectUrl == null || redirectUrl.isEmpty) {
          throw Exception('No payment URL received');
        }
        if (_appliedDiscount != null && _discountAmount > 0) {
          api.incrementPromoCodeUsage(
            codeId: _appliedDiscount!['id'].toString(),
          );
        }
        _paymentMethod = 'card';
        _bookingId = checkoutId;
        if (!mounted) return;
        final payResult = await _showPaymentWebView(redirectUrl);
        if (!mounted) return;
        if (payResult == 'success') {
          // Verify payment actually completed via server-side check
          final status = await api.checkFlutterwaveStatus(checkoutId);
          if (!mounted) return;
          if (status.toLowerCase() == 'paid' ||
              status.toLowerCase() == 'successful') {
            setState(() => _submitState = _SubmitState.success);
            await Future.delayed(const Duration(milliseconds: 1500));
            if (mounted) setState(() => _step = 2);
          } else if (status.toLowerCase() == 'failed' ||
              status.toLowerCase() == 'rejected') {
            if (mounted) setState(() {
              _submitState = _SubmitState.idle;
              _step = 3;
            });
          } else {
            // Payment still pending on Flutterwave side — poll briefly
            final pollResult = await _pollCheckoutStatus(
              checkoutId,
              'paid',
              statusChecker: (id, {depositId}) =>
                  api.checkFlutterwaveStatus(id),
            );
            if (pollResult == 'paid' && mounted) {
              setState(() => _submitState = _SubmitState.success);
              await Future.delayed(const Duration(milliseconds: 1500));
              if (mounted) setState(() => _step = 2);
            } else if (pollResult != null && mounted) {
              // Explicit failure
              setState(() {
                _submitState = _SubmitState.idle;
                _step = 3;
              });
            } else if (mounted) {
              _showSnack(
                'Payment is being processed. Please check your bookings.',
              );
            }
          }
        } else if (payResult == 'failed') {
          if (mounted) setState(() {
            _submitState = _SubmitState.idle;
            _step = 3;
          });
        }
        // 'cancelled' or null: user closed the sheet, stay on payment step
      } else {
        // ── Bank Transfer ──
        final id = await widget.session.createBooking(
          item: item,
          checkIn: _checkIn?.toIso8601String().split('T').first,
          checkOut: _checkOut?.toIso8601String().split('T').first,
          guests: _guests,
          totalAmount: _total,
          currency: _currency,
          paymentProvider: 'bank_transfer',
          specialRequests: _notesCtrl.text.trim().isEmpty
              ? null
              : _notesCtrl.text.trim(),
          discountCode: _appliedDiscount?['code']?.toString(),
          discountAmount: _discountAmount > 0 ? _discountAmount : null,
        );
        if (_appliedDiscount != null && _discountAmount > 0) {
          AppDatabase().incrementPromoCodeUsage(
            codeId: _appliedDiscount!['id'].toString(),
          );
        }
        _paymentMethod = 'bank_transfer';
        setState(() {
          _bookingId = id;
          _step = 2;
        });
      }
    } catch (e) {
      _showSnack(
        'Booking failed: ${e.toString().replaceAll('Exception: ', '')}',
      );
    } finally {
      if (mounted) setState(() => _submitState = _SubmitState.idle);
    }
  }

  Future<String?> _showPaymentWebView(String url) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      enableDrag: false,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0x66000000),
      builder: (_) => FractionallySizedBox(
        heightFactor: 0.92,
        child: _PaymentWebSheet(url: url),
      ),
    );
  }

  void _showSnack(String msg) => AppSnackBar.error(context, msg);

  /// Poll the checkout status until it reaches the expected value or timeout.
  /// Returns true if the status reached [expected], false otherwise.
  /// Poll checkout status until it reaches [expected] or a terminal state.
  /// Returns `'paid'` (or [expected]) on success,
  /// `'failed'`/`'rejected'`/`'cancelled'` on explicit failure,
  /// or `null` if the poll timed out (still pending).
  Future<String?> _pollCheckoutStatus(
    String checkoutId,
    String expected, {
    String? depositId,
    Future<String> Function(String checkoutId, {String? depositId})?
    statusChecker,
    int maxAttempts = 5,
    Duration delay = const Duration(seconds: 3),
  }) async {
    final api = AppDatabase();
    final checker =
        statusChecker ??
        ((id, {depositId}) => api.checkPawaPayStatus(id, depositId: depositId));
    for (int i = 0; i < maxAttempts; i++) {
      if (!mounted) return null;
      await Future.delayed(delay);
      if (!mounted) return null;
      final status = await checker(checkoutId, depositId: depositId);
      final s = status.toLowerCase();
      if (s == expected.toLowerCase()) return expected;
      if (s == 'failed' || s == 'rejected' || s == 'cancelled') return s;
    }
    return null;
  }

  /// Show dialog when PawaPay payment is pending (webhook hasn't confirmed yet).
  void _showPawaPayPendingDialog(String checkoutId, String phone) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          _l.paymentInitiated,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.hourglass_top, size: 40, color: AppColors.foggy),
            const SizedBox(height: 16),
            Text(
              'Awaiting confirmation from $phone',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You should receive an SMS prompt to confirm payment on your mobile money account. '
              'Confirm on your phone to complete the booking.',
              style: TextStyle(fontSize: 13, color: AppColors.foggy),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => Clipboard.setData(ClipboardData(text: checkoutId)),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.copy,
                      size: 12,
                      color: AppColors.hackberry,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Ref: ${checkoutId.substring(0, 8)}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.hackberry,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    _l = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 1,
        leading: StageSafeLeadingButton(
          color: AppColors.black,
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _step == 2
              ? _l.bookingConfirmed
              : _step == 3
              ? 'Booking Failed'
              : 'Review & Pay',
          style: const TextStyle(
            color: AppColors.black,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
      ),
      body: _step == 2
          ? _buildSuccess()
          : _step == 3
          ? _buildFailed()
          : _buildCombinedBody(),
    );
  }

  Widget _buildCombinedBody() {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 160),
            child: Column(
              children: [
                _buildDetailsStep(),
                const SizedBox(height: 24),
                _buildPaymentStep(),
              ],
            ),
          ),
        ),

        // ── Sticky bottom bar: Total + Slide to pay ──
        Container(
          padding: EdgeInsets.fromLTRB(
            18,
            14,
            18,
            MediaQuery.of(context).padding.bottom + 14,
          ),
          decoration: BoxDecoration(
            color: AppColors.surface,
            boxShadow: [
              BoxShadow(
                color: AppColors.black.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _l.total,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.foggy,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$_currency ${_total.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              SlideToConfirmButton(
                key: ValueKey(_resetCounter),
                label: _l.confirmAndPay,
                onConfirmed: _confirmAndPay,
                disabled: _submitState != _SubmitState.idle,
                confirmed: _submitState == _SubmitState.processing ||
                    _submitState == _SubmitState.success,
                isProcessing: _submitState == _SubmitState.processing,
                showSuccess: _submitState == _SubmitState.success,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildGuestCounter() {
    final maxGuests = int.tryParse('${item['max_guests'] ?? 1}') ?? 1;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.people_outline, size: 20, color: AppColors.hackberry),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _l.guests,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
          _buildCounterRow(_guests, 1, maxGuests, (v) => setState(() => _guests = v)),
        ],
      ),
    );
  }

  Widget _buildCounterRow(int value, int min, int max, ValueChanged<int> onChanged) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: value > min ? () => onChanged(value - 1) : null,
          child: Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: value > min ? AppColors.hackberry : AppColors.border,
              ),
            ),
            child: Icon(Icons.remove, size: 16, color: value > min ? AppColors.black : AppColors.hackberry),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text('$value', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        ),
        GestureDetector(
          onTap: value < max ? () => onChanged(value + 1) : null,
          child: Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: value < max ? AppColors.hackberry : AppColors.border,
              ),
            ),
            child: Icon(Icons.add, size: 16, color: value < max ? AppColors.black : AppColors.hackberry),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsStep() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final placeholderColor = AppColors.surfaceSubtle;
    final placeholderIconColor = AppColors.hackberry;
    final totalStripColor = isDark
        ? const Color(0xFF1C1C1E)
        : const Color(0xFFFFF0F2);
    final promoAppliedBg = isDark
        ? const Color(0x1A4CAF50)
        : const Color(0xFFE8F5E9);
    final promoAppliedBorder = isDark
        ? const Color(0x554CAF50)
        : const Color(0x4D4CAF50);
    final promoAppliedText = isDark
        ? const Color(0xFF93DFA6)
        : const Color(0xFF2E7D32);

    final imageUrl = resolveListingImageUrl(item);
    final title = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final location = (item['location'] ?? item['city'] ?? '').toString();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Listing hero card ──
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: AppColors.surface,
            boxShadow: [
              BoxShadow(
                color: AppColors.black.withValues(alpha: 0.07),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  height: 140,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (imageUrl != null)
                        Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              Container(color: placeholderColor),
                        )
                      else
                        Container(
                          color: placeholderColor,
                          child: Icon(
                            Icons.image_outlined,
                            size: 32,
                            color: placeholderIconColor,
                          ),
                        ),
                      // Gradient overlay
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                AppColors.black.withValues(alpha: 0.55),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 14,
                        bottom: 12,
                        right: 14,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                                color: Colors.white,
                              ),
                            ),
                            if (location.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 3),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.location_on_outlined,
                                      size: 13,
                                      color: Colors.white70,
                                    ),
                                    const SizedBox(width: 3),
                                    Expanded(
                                      child: Text(
                                        location,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.white70,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  color: AppColors.surface,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$_currency ${_pricePerUnit.toStringAsFixed(0)} · $_unitLabel',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.black,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F5E9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _l.instantConfirm,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF2E7D32),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 18),

        // ── Trip dates ──
        _SectionTitle(label: _l.yourTrip),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => _pickDate(isCheckIn: true),
                child: _InfoTile(
                  icon: Icons.calendar_today_outlined,
                  label: _l.checkIn,
                  value: _checkIn != null ? _fmtDate(_checkIn!) : 'Select date',
                  highlight: _checkIn == null,
                ),
              ),
            ),
            if (itemType != 'tour' && itemType != 'tour_package') ...[
              const SizedBox(width: 10),
              Expanded(
                child: GestureDetector(
                  onTap: () => _pickDate(isCheckIn: false),
                  child: _InfoTile(
                    icon: Icons.calendar_today_outlined,
                    label: _l.checkOut,
                    value: _checkOut != null
                        ? _fmtDate(_checkOut!)
                        : 'Select date',
                    highlight: _checkOut == null,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 10),
        _buildGuestCounter(),
        const SizedBox(height: 18),

        // ── Price breakdown ──
        _SectionTitle(label: _l.priceBreakdown),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                child: Column(
                  children: [
                    _PriceRow(
                      label:
                          '$_currency ${_pricePerUnit.toStringAsFixed(0)} × $_unitLabel',
                      value: '$_currency ${_subtotal.toStringAsFixed(0)}',
                    ),
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: GestureDetector(
                        onTap: () => setState(
                          () => _showPriceDetails = !_showPriceDetails,
                        ),
                        child: Text(
                          _showPriceDetails
                              ? _l.hidePriceDetails
                              : _l.showPriceDetails,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.rausch,
                          ),
                        ),
                      ),
                    ),
                    if (_showPriceDetails) ...[
                      const SizedBox(height: 10),
                      _PriceRow(
                        label:
                            'Platform fee (${_financials.guestFeePercent.toStringAsFixed(0)}%)',
                        value: '$_currency ${_serviceFee.toStringAsFixed(0)}',
                      ),
                    ],
                    if (_discountAmount > 0) ...[
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.local_offer,
                                size: 14,
                                color: Color(0xFF4CAF50),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Promo: ${_appliedDiscount?['code'] ?? ''}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF4CAF50),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            '- $_currency ${_discountAmount.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF4CAF50),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: totalStripColor,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(13),
                    bottomRight: Radius.circular(13),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _l.total,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        color: AppColors.black,
                      ),
                    ),
                    Text(
                      '$_currency ${_total.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        color: AppColors.rausch,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // ── Promo code input ──
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.linnen,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _l.promoCode,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              if (_promoSuccess && _appliedDiscount != null) ...[
                // Applied state — show chip with remove
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: promoAppliedBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: promoAppliedBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle,
                        size: 16,
                        color: Color(0xFF4CAF50),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${_appliedDiscount!['code']}  •  -$_currency ${_discountAmount.toStringAsFixed(0)} off',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: promoAppliedText,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: _removePromo,
                        child: const Icon(
                          Icons.close,
                          size: 16,
                          color: AppColors.hackberry,
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // Input state
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _promoCtrl,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          hintText: _l.enterCode,
                          hintStyle: const TextStyle(fontSize: 13),
                          filled: true,
                          fillColor: AppColors.surface,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(
                              color: AppColors.border,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(
                              color: AppColors.border,
                            ),
                          ),
                        ),
                        style: const TextStyle(
                          fontSize: 13,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      height: 40,
                      child: ElevatedButton(
                        onPressed: _applyingPromo ? null : _applyPromo,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.rausch,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          elevation: 0,
                        ),
                        child: _applyingPromo
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                _l.apply,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
                if (_promoMsg != null && !_promoSuccess) ...[
                  const SizedBox(height: 6),
                  Text(
                    _promoMsg!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.rausch,
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),

        const SizedBox(height: 18),

        // ── Guest details form ──
        _SectionTitle(label: _l.guestDetails),
        const SizedBox(height: 10),
        _InputField(
          label: _l.fullName,
          controller: _nameCtrl,
          icon: Icons.person_outline,
        ),
        const SizedBox(height: 10),
        _InputField(
          label: _l.email,
          controller: _emailCtrl,
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 10),
        _InputField(
          label: _l.specialRequests,
          controller: _notesCtrl,
          icon: Icons.note_outlined,
          maxLines: 3,
        ),
      ],
    );
  }

  Widget _buildPaymentStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Total reminder ──
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.lock_outline, size: 18, color: AppColors.foggy),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Total: $_currency ${_total.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // ── 3-tab payment selector ──
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          padding: const EdgeInsets.all(6),
          child: Row(
            children: [
              if (_showMobileMoney)
                _PayTabButton(
                  label: _l.mobileMoney,
                  assetPath: 'assets/payment/mtn-momo.png',
                  selected: _payTab == 0,
                  onTap: () => setState(() => _payTab = 0),
                ),
              _PayTabButton(
                label: _l.card,
                assetPath: 'assets/payment/card.png',
                selected: _payTab == 1,
                onTap: () => setState(() => _payTab = 1),
              ),
              _PayTabButton(
                label: _l.bankTransfer,
                assetPath: 'assets/payment/bank-transfer.png',
                selected: _payTab == 2,
                onTap: () => setState(() => _payTab = 2),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        if (_showMobileMoney && _payTab == 0) _buildMobileMoneySection(),
        if (_payTab == 1) _buildCardSection(),
        if (_payTab == 2) _buildBankTransferSection(),
      ],
    );
  }

  // ── Mobile Money Tab ──
  Widget _buildMobileMoneySection() {
    final regionMethods = _regionPayMethods;
    if (regionMethods.isEmpty) {
      return Text(
        _l.momoNotAvailable,
        style: const TextStyle(fontSize: 13, color: AppColors.foggy),
      );
    }

    final country = regionMethods.first.country;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(label: _l.selectProvider),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            country,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.hof,
            ),
          ),
        ),
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: regionMethods
              .map(
                (m) => _MethodChip(
                  method: m,
                  selected: _selectedMethod?.id == m.id,
                  onTap: () {
                    setState(() {
                      _selectedMethod = m;
                      _phoneCtrl.clear();
                    });
                  },
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 16),

        // ── Phone number ──
        _SectionTitle(label: _l.momoNumber),
        const SizedBox(height: 10),
        TextFormField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[\d\s+]')),
          ],
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          decoration: InputDecoration(
            prefixText: _selectedMethod != null
                ? '${_selectedMethod!.countryCode} '
                : '',
            prefixStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.black,
            ),
            hintText: _l.momoPlaceholder,
            filled: true,
            fillColor: AppColors.surface,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.black, width: 1.5),
            ),
          ),
        ),

        const SizedBox(height: 16),
        _securityNote(_l.momoPromptDesc),
      ],
    );
  }

  // ── Card Tab ──
  Widget _buildCardSection() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardInfoBg = isDark
        ? const Color(0xFF1C1C1E)
        : const Color(0xFFF8F9FF);
    final cardInfoBorder = isDark
        ? const Color(0xFF2A3342)
        : const Color(0xFFDDE2F5);
    final cardInfoText = isDark
        ? const Color(0xFFD8E1F2)
        : const Color(0xFF3D3D3D);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 4),

        // Card logos
        Row(
          children: [
            _visaLogo(),
            const SizedBox(width: 8),
            _mastercardLogo(),
            const SizedBox(width: 8),
            _amexLogo(),
            const Spacer(),
            const Icon(Icons.lock_outline, size: 14, color: AppColors.foggy),
            const SizedBox(width: 4),
            const Text(
              'Secure',
              style: TextStyle(
                fontSize: 11,
                color: AppColors.foggy,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: cardInfoBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cardInfoBorder),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.credit_card_outlined,
                size: 18,
                color: Color(0xFF3D5AFE),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _l.cardSecureDesc,
                  style: TextStyle(
                    fontSize: 13,
                    color: cardInfoText,
                    height: 1.45,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),
        _securityNote(_l.cardSecureNote),
      ],
    );
  }

  // ── Bank Transfer Tab ──
  Widget _buildBankTransferSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, size: 18, color: AppColors.foggy),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _l.bankTransferDesc,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.hof,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),
        _securityNote(_l.bankHoldNote),
      ],
    );
  }

  // ── Real brand card logos ──

  Widget _visaLogo() {
    return Container(
      width: 52,
      height: 34,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.border),
      ),
      child: const Center(
        child: Text(
          'VISA',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            fontStyle: FontStyle.italic,
            color: Color(0xFF1A1F71),
            letterSpacing: 1.2,
          ),
        ),
      ),
    );
  }

  Widget _mastercardLogo() {
    return Container(
      width: 52,
      height: 34,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.border),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            left: 12,
            child: Container(
              width: 18,
              height: 18,
              decoration: const BoxDecoration(
                color: Color(0xFFEB001B),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            left: 22,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: const Color(0xFFF79E1B).withValues(alpha: 0.9),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _amexLogo() {
    return Container(
      width: 52,
      height: 34,
      decoration: BoxDecoration(
        color: const Color(0xFF2E77BC),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Center(
        child: Text(
          'AMEX',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: Colors.white,
            letterSpacing: 1.5,
          ),
        ),
      ),
    );
  }

  Widget _securityNote(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.shield_outlined, size: 16, color: AppColors.foggy),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.foggy,
              height: 1.5,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccess() {
    return _SuccessPage(
      paymentMethod: _paymentMethod,
      bookingId: _bookingId,
      selectedMethodName: _selectedMethod?.name,
      onHome: () => Navigator.of(context).popUntil((route) => route.isFirst),
      onViewBookings: () =>
          Navigator.of(context).popUntil((route) => route.isFirst),
    );
  }

  Widget _buildFailed() {
    return _FailedPage(
      paymentMethod: _paymentMethod,
      selectedMethodName: _selectedMethod?.name,
      onRetry: () => setState(() {
        _step = 0;
        _resetCounter++;
        _submitState = _SubmitState.idle;
      }),
      onHome: () => Navigator.of(context).popUntil((route) => route.isFirst),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: AppColors.black,
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final borderColor = highlight
        ? AppColors.rausch.withValues(alpha: 0.6)
        : AppColors.border;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: AppColors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.rausch.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: AppColors.rausch),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.foggy,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: highlight ? AppColors.rausch : AppColors.black,
                  ),
                ),
              ],
            ),
          ),
          if (highlight)
            const Icon(
              Icons.edit_calendar_outlined,
              size: 16,
              color: AppColors.rausch,
            ),
        ],
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(fontSize: 14, color: AppColors.hof);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(value, style: style),
      ],
    );
  }
}

class _InputField extends StatelessWidget {
  const _InputField({
    required this.label,
    required this.controller,
    required this.icon,
    this.keyboardType,
    this.maxLines = 1,
  });

  final String label;
  final TextEditingController controller;
  final IconData icon;
  final TextInputType? keyboardType;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      style: const TextStyle(fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.black, width: 1.5),
        ),
      ),
    );
  }
}

class _MethodChip extends StatelessWidget {
  const _MethodChip({
    required this.method,
    required this.selected,
    required this.onTap,
  });

  final _PayMethod method;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.rausch : AppColors.border,
            width: 1,
          ),
          boxShadow: null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.asset(
                method.asset,
                width: 30,
                height: 30,
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: method.color,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Center(
                    child: Text(
                      method.id.split('_').first,
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        color: method.textLight
                            ? Colors.white
                            : AppColors.black,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              method.name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: AppColors.black,
              ),
            ),
            if (selected) ...[
              const SizedBox(width: 6),
              const Icon(Icons.check, size: 18, color: AppColors.black),
            ],
          ],
        ),
      ),
    );
  }
}

class _PayTabButton extends StatelessWidget {
  const _PayTabButton({
    required this.label,
    required this.assetPath,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String assetPath;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selectedBg = isDark
        ? const Color(0xFF1C1C1E)
        : const Color(0xFFF7F7F8);
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? selectedBg : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: null,
          ),
          child: Column(
            children: [
              Image.asset(
                assetPath,
                width: 26,
                height: 26,
                fit: BoxFit.contain,
                color: null,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected ? AppColors.black : AppColors.foggy,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Flutterwave in-app payment sheet
// ─────────────────────────────────────────────────────────────────────────────

class _PaymentWebSheet extends StatefulWidget {
  const _PaymentWebSheet({required this.url});
  final String url;

  @override
  State<_PaymentWebSheet> createState() => _PaymentWebSheetState();
}

class _PaymentWebSheetState extends State<_PaymentWebSheet> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() => _loading = false),
          onNavigationRequest: (request) {
            final url = request.url;
            if (url.contains('merry360x.com/payment-pending')) {
              Navigator.of(context).pop('success');
              return NavigationDecision.prevent;
            }
            if (url.contains('merry360x.com/payment-failed')) {
              Navigator.of(context).pop('failed');
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        child: Column(
          children: [
            // ── Header ──
            Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(
                  bottom: BorderSide(color: AppColors.border, width: 0.5),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const Spacer(),
                  const Icon(
                    Icons.lock_outline,
                    size: 15,
                    color: AppColors.foggy,
                  ),
                  const SizedBox(width: 5),
                  const Text(
                    'Secure Payment',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: AppColors.black,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(
                      Icons.close,
                      size: 20,
                      color: AppColors.black,
                    ),
                    onPressed: () => Navigator.of(context).pop('cancelled'),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 40,
                      minHeight: 40,
                    ),
                  ),
                ],
              ),
            ),
            // ── WebView ──
            Expanded(
              child: Stack(
                children: [
                  WebViewWidget(controller: _controller),
                  if (_loading)
                    const Center(
                      child: CircularProgressIndicator(color: AppColors.rausch),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// _SuccessPage — animated payment success screen
// ─────────────────────────────────────────────────────────────────────────────

class _SuccessPage extends StatefulWidget {
  const _SuccessPage({
    required this.paymentMethod,
    required this.bookingId,
    required this.selectedMethodName,
    required this.onHome,
    required this.onViewBookings,
  });

  final String? paymentMethod;
  final String? bookingId;
  final String? selectedMethodName;
  final VoidCallback onHome;
  final VoidCallback onViewBookings;

  @override
  State<_SuccessPage> createState() => _SuccessPageState();
}

class _SuccessPageState extends State<_SuccessPage>
    with TickerProviderStateMixin {
  // ── Check circle ──
  late final AnimationController _circleCtrl;
  late final Animation<double> _circleScale;
  late final Animation<double> _checkOpacity;

  // ── Content cards slide-up ──
  late final AnimationController _contentCtrl;
  late final Animation<Offset> _contentSlide;
  late final Animation<double> _contentFade;

  // ── Confetti particles ──
  late final AnimationController _confettiCtrl;

  static const _kCheckDuration = Duration(milliseconds: 550);
  static const _kContentDelay = Duration(milliseconds: 340);
  static const _kContentDuration = Duration(milliseconds: 500);
  static const _kConfettiDuration = Duration(milliseconds: 2200);

  @override
  void initState() {
    super.initState();

    // ── Circle spring ──
    _circleCtrl = AnimationController(vsync: this, duration: _kCheckDuration);
    _circleScale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.22), weight: 55),
      TweenSequenceItem(tween: Tween(begin: 1.22, end: 0.88), weight: 20),
      TweenSequenceItem(tween: Tween(begin: 0.88, end: 1.06), weight: 15),
      TweenSequenceItem(tween: Tween(begin: 1.06, end: 1.0), weight: 10),
    ]).animate(CurvedAnimation(parent: _circleCtrl, curve: Curves.easeOut));
    _checkOpacity = CurvedAnimation(
      parent: _circleCtrl,
      curve: const Interval(0.4, 0.8, curve: Curves.easeIn),
    );

    // ── Content ──
    _contentCtrl = AnimationController(
      vsync: this,
      duration: _kContentDuration,
    );
    _contentSlide =
        Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero).animate(
          CurvedAnimation(parent: _contentCtrl, curve: Curves.easeOutCubic),
        );
    _contentFade = CurvedAnimation(parent: _contentCtrl, curve: Curves.easeOut);

    // ── Confetti ──
    _confettiCtrl = AnimationController(
      vsync: this,
      duration: _kConfettiDuration,
    );

    _runSequence();
  }

  Future<void> _runSequence() async {
    // Immediate success haptic
    await Future.delayed(const Duration(milliseconds: 60));
    if (!mounted) return;
    await HapticFeedback.mediumImpact();

    _circleCtrl.forward();
    _confettiCtrl.forward();

    // Checkmark pop haptic
    await Future.delayed(const Duration(milliseconds: 240));
    if (!mounted) return;
    await HapticFeedback.lightImpact();

    // Content slides in
    await Future.delayed(_kContentDelay);
    if (!mounted) return;
    _contentCtrl.forward();

    // Gentle notification tap
    await Future.delayed(const Duration(milliseconds: 180));
    if (!mounted) return;
    await HapticFeedback.selectionClick();
  }

  @override
  void dispose() {
    _circleCtrl.dispose();
    _contentCtrl.dispose();
    _confettiCtrl.dispose();
    super.dispose();
  }

  bool get _isPending => widget.paymentMethod == 'bank_transfer';
  bool get _isCard => widget.paymentMethod == 'card';

  Color get _accentColor => _isPending
      ? const Color(0xFFE65100)
      : _isCard
      ? const Color(0xFF3B5BDB)
      : const Color(0xFF2E7D32);

  Color get _ringBgLight => _isPending
      ? const Color(0xFFFFF3C4)
      : _isCard
      ? const Color(0xFFDBE4FF)
      : const Color(0xFFD4EDDA);

  Color get _ringBgDark => _isPending
      ? const Color(0xFF3A3116)
      : _isCard
      ? const Color(0xFF243359)
      : const Color(0xFF1E3625);

  IconData get _icon => _isPending
      ? Icons.schedule_rounded
      : _isCard
      ? Icons.open_in_browser_rounded
      : Icons.check_rounded;

  String _title(AppLocalizations l) => _isCard
      ? l.paymentInitiated
      : _isPending
      ? l.bookingPending
      : l.bookingConfirmed;

  String _subtitle(AppLocalizations l) => _isCard
      ? l.completeCardPayment
      : _isPending
      ? l.bankTransferPending
      : "You'll receive an SMS to confirm payment\nvia ${widget.selectedMethodName ?? 'mobile money'}.";

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final topTone = isDark
        ? (_isPending
              ? const Color(0xFF2A2412)
              : _isCard
              ? const Color(0xFF18223A)
              : const Color(0xFF15261A))
        : (_isPending
              ? const Color(0xFFFFF8E1)
              : _isCard
              ? const Color(0xFFF0F4FF)
              : const Color(0xFFEDF7ED));
    final bottomTone = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final ringBg = isDark ? _ringBgDark : _ringBgLight;
    final ringGlow = _accentColor.withValues(alpha: isDark ? 0.28 : 0.18);

    return Stack(
      children: [
        // ── Gradient background ──
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [topTone, bottomTone],
                stops: const [0.0, 0.55],
              ),
            ),
          ),
        ),

        // ── Confetti particles ──
        if (!_isPending)
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _confettiCtrl,
              builder: (context, _) => CustomPaint(
                painter: _ConfettiPainter(progress: _confettiCtrl.value),
              ),
            ),
          ),

        // ── Body ──
        SafeArea(
          top: false,
          child: LayoutBuilder(
            builder: (ctx, constraints) {
              return SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  24,
                  0,
                  24,
                  24 + MediaQuery.of(context).padding.bottom,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Column(
                    children: [
                      const SizedBox(height: 52),

                      // ── Animated circle ──
                      AnimatedBuilder(
                        animation: _circleScale,
                        builder: (context, _) => Transform.scale(
                          scale: _circleScale.value,
                          child: Container(
                            width: 108,
                            height: 108,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: ringBg,
                              boxShadow: [
                                BoxShadow(
                                  color: ringGlow,
                                  blurRadius: 36,
                                  spreadRadius: 8,
                                ),
                              ],
                            ),
                            child: FadeTransition(
                              opacity: _checkOpacity,
                              child: Icon(_icon, size: 52, color: _accentColor),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 32),

                      // ── Title + subtitle + ref (all slide in together) ──
                      FadeTransition(
                        opacity: _contentFade,
                        child: SlideTransition(
                          position: _contentSlide,
                          child: Column(
                            children: [
                              Text(
                                _title(l),
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.5,
                                  color: AppColors.black,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                _subtitle(l),
                                style: TextStyle(
                                  fontSize: 15,
                                  color: isDark
                                      ? AppColors.hof
                                      : AppColors.foggy,
                                  height: 1.6,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              if (widget.bookingId != null) ...[
                                const SizedBox(height: 24),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 10,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.confirmation_number_outlined,
                                        size: 16,
                                        color: AppColors.foggy,
                                      ),
                                      const SizedBox(width: 8),
                                      Flexible(
                                        child: Text(
                                          'Ref: ${widget.bookingId}',
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: AppColors.hof,
                                            fontWeight: FontWeight.w600,
                                            fontFamily: 'monospace',
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 40),
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: FilledButton(
                                  onPressed: widget.onHome,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.rausch,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  child: Text(
                                    l.backToHome,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                height: 48,
                                child: OutlinedButton(
                                  onPressed: widget.onViewBookings,
                                  style: OutlinedButton.styleFrom(
                                    backgroundColor: isDark
                                        ? AppColors.surfaceSubtle
                                        : AppColors.surface,
                                    side: const BorderSide(
                                      color: AppColors.border,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  child: Text(
                                    l.viewMyBookings,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.black,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// _FailedPage — shown when payment is explicitly rejected / failed
// ─────────────────────────────────────────────────────────────────────────────

class _FailedPage extends StatelessWidget {
  const _FailedPage({
    required this.paymentMethod,
    required this.selectedMethodName,
    required this.onRetry,
    required this.onHome,
  });

  final String? paymentMethod;
  final String? selectedMethodName;
  final VoidCallback onRetry;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Stack(
      children: [
        // ── Subtle gradient ──
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  isDark ? const Color(0xFF2A1215) : const Color(0xFFFFF0F0),
                  isDark ? const Color(0xFF1C1C1E) : Colors.white,
                ],
                stops: const [0.0, 0.55],
              ),
            ),
          ),
        ),

        // ── Body ──
        SafeArea(
          top: false,
          child: LayoutBuilder(
            builder: (ctx, constraints) {
              return SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  24,
                  0,
                  24,
                  24 + MediaQuery.of(context).padding.bottom,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Column(
                    children: [
                      const SizedBox(height: 72),

                      // ── X mark circle ──
                      Container(
                        width: 108,
                        height: 108,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isDark
                              ? const Color(0xFF3A1A1E)
                              : const Color(0xFFFFE5E5),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(
                                0xFFE53935,
                              ).withValues(alpha: isDark ? 0.28 : 0.18),
                              blurRadius: 36,
                              spreadRadius: 8,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.close_rounded,
                          size: 52,
                          color: Color(0xFFE53935),
                        ),
                      ),

                      const SizedBox(height: 32),

                      // ── Title ──
                      Text(
                        'Payment Failed',
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                          color: AppColors.black,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 12),

                      // ── Subtitle ──
                      Text(
                        'Your payment could not be processed.\n'
                        'Please check your mobile money balance\n'
                        'and try again.',
                        style: TextStyle(
                          fontSize: 15,
                          color: isDark ? AppColors.hof : AppColors.foggy,
                          height: 1.6,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 40),

                      // ── Try Again ──
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: FilledButton(
                          onPressed: onRetry,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.rausch,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            'Try Again',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // ── Back to Home ──
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton(
                          onPressed: onHome,
                          style: OutlinedButton.styleFrom(
                            backgroundColor: isDark
                                ? AppColors.surfaceSubtle
                                : AppColors.surface,
                            side: const BorderSide(color: AppColors.border),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            l.backToHome,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppColors.black,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// _ConfettiPainter — lightweight canvas confetti without external packages
// ─────────────────────────────────────────────────────────────────────────────

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter({required this.progress});

  final double progress;

  // Deterministic particles — generated once per unique seed
  static final List<_Particle> _particles = _generateParticles(60);

  static List<_Particle> _generateParticles(int count) {
    final list = <_Particle>[];
    // Pseudo-random positions using prime-based Halton sequence for good spread
    for (var i = 0; i < count; i++) {
      final t = i / count;
      // halton base 2 and 3 for x/y spread
      double h2 = 0, b2 = 0.5;
      var n2 = i + 1;
      while (n2 > 0) {
        h2 += (n2 % 2) * b2;
        n2 ~/= 2;
        b2 /= 2;
      }
      double h3 = 0, b3 = 1 / 3;
      var n3 = i + 1;
      while (n3 > 0) {
        h3 += (n3 % 3) * b3;
        n3 ~/= 3;
        b3 /= 3;
      }

      list.add(
        _Particle(
          startX: h2,
          startY: 0.05 + (t * 0.35),
          velocityX: (h2 - 0.5) * 1.4,
          velocityY: 0.5 + h3 * 1.8,
          size: 4.0 + (h2 * 8),
          color: _kConfettiColors[i % _kConfettiColors.length],
          rotationSpeed: (h3 - 0.5) * 14,
          shape: i % 3, // 0=rect, 1=circle, 2=line
          delay: t * 0.35,
        ),
      );
    }
    return list;
  }

  static const _kConfettiColors = [
    Color(0xFFFF385C), // rausch
    Color(0xFF00A699), // babu
    Color(0xFFFC642D), // arches
    Color(0xFFFFD700), // gold
    Color(0xFF4CAF50), // green
    Color(0xFF3B5BDB), // blue
    Color(0xFFE040FB), // purple
    Color(0xFFFFFFFF), // white
  ];

  @override
  void paint(Canvas canvas, Size size) {
    if (progress == 0 || progress == 1) return;

    final paint = Paint()..isAntiAlias = true;

    for (final p in _particles) {
      // Each particle has its own start delay
      final t = ((progress - p.delay) / (1.0 - p.delay)).clamp(0.0, 1.0);
      if (t <= 0) continue;

      // Gravity: y accelerates, x drifts
      final x = size.width * (p.startX + p.velocityX * t * 0.45);
      final y = size.height * (p.startY + p.velocityY * t * t * 0.85);

      // Fade out in the last 30%
      final opacity = t < 0.7 ? 1.0 : (1.0 - t) / 0.3;
      paint.color = p.color.withValues(alpha: opacity.clamp(0.0, 1.0));

      final angle = p.rotationSpeed * t;

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(angle);

      switch (p.shape) {
        case 0:
          canvas.drawRect(
            Rect.fromCenter(
              center: Offset.zero,
              width: p.size,
              height: p.size * 0.5,
            ),
            paint,
          );
        case 1:
          canvas.drawCircle(Offset.zero, p.size * 0.4, paint);
        default:
          canvas.drawRRect(
            RRect.fromRectAndRadius(
              Rect.fromCenter(
                center: Offset.zero,
                width: p.size * 0.25,
                height: p.size,
              ),
              const Radius.circular(2),
            ),
            paint,
          );
      }

      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.progress != progress;
}

class _Particle {
  const _Particle({
    required this.startX,
    required this.startY,
    required this.velocityX,
    required this.velocityY,
    required this.size,
    required this.color,
    required this.rotationSpeed,
    required this.shape,
    required this.delay,
  });

  final double startX;
  final double startY;
  final double velocityX;
  final double velocityY;
  final double size;
  final Color color;
  final double rotationSpeed;
  final int shape;
  final double delay;
}
