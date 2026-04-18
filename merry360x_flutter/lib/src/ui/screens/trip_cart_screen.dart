import 'dart:async';

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../../l10n/app_localizations.dart';
import '../utils/app_snackbar.dart';

import '../../services/app_database.dart';
import 'package:merry360x_flutter/src/lib/fees.dart';
import 'package:merry360x_flutter/src/lib/promo_prefill.dart';
import '../../session_controller.dart';
import 'checkout_screen.dart';
import 'explore_screen.dart' show resolveListingImageUrl;

class TripCartScreen extends StatefulWidget {
  const TripCartScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<TripCartScreen> createState() => _TripCartScreenState();
}

class _TripCartScreenState extends State<TripCartScreen> {
  String? _discountCode;
  Map<String, dynamic>? _discountData;

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_onSessionChanged);
  }

  @override
  void didUpdateWidget(covariant TripCartScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.session != widget.session) {
      oldWidget.session.removeListener(_onSessionChanged);
      widget.session.addListener(_onSessionChanged);
    }
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    if (!mounted) return;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final session = widget.session;
    final items = session.isAuthenticated
        ? (session.payload?.tripCart ?? const <Map<String, dynamic>>[])
        : session.guestTripCart;
    final listings = session.payload?.homeListings ?? const <Map<String, dynamic>>[];

    // IMPORTANT: spread matched first, then ci, so cart-specific fields (id,
    // item_type, quantity, etc.) are never overwritten by listing data.
    final enriched = items.map((ci) {
      final ref = (ci['property_id'] ?? ci['tour_id'] ?? ci['transport_id'] ?? ci['reference_id'] ?? '').toString();
      final type = (ci['item_type'] ?? 'property').toString();
      final matched = listings.firstWhere(
        (l) => l['id']?.toString() == ref && l['item_type']?.toString() == type,
        orElse: () => const {},
      );
      return <String, dynamic>{...matched, ...ci}; // ci wins — preserves cart id
    }).toList();

    final bool hasItems = items.isNotEmpty;

    return Column(
      children: [
        // ── Scrollable content ──
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l.tripCart,
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.black),
                    ),
                  ),
                  if (items.isNotEmpty)
                    TextButton(
                      onPressed: () async {
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: Text(l.clearCartTitle),
                            content: Text(l.clearCartBody),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
                              FilledButton(
                                style: FilledButton.styleFrom(backgroundColor: AppColors.rausch),
                                onPressed: () => Navigator.pop(ctx, true),
                                child: Text(l.clear),
                              ),
                            ],
                          ),
                        );
                        if (!context.mounted) return;
                        if (confirmed == true) {
                          AppSnackBar.info(context, 'Clearing ${items.length} item${items.length == 1 ? '' : 's'}...');
                          unawaited(session.clearTripCart());
                        }
                      },
                      child: Text(l.clearCart, style: const TextStyle(color: AppColors.rausch)),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              if (items.isNotEmpty)
                Text('${items.length} item${items.length != 1 ? 's' : ''}',
                    style: const TextStyle(color: AppColors.foggy)),
              const SizedBox(height: 16),

              if (items.isEmpty)
                _InfoCard(
                  icon: Icons.luggage_outlined,
                  title: l.cartEmpty,
                  subtitle: l.exploreToAdd,
                )
              else ...[
                ...enriched.map((ci) => _CartItemTile(cartItem: ci, session: session)),
                const SizedBox(height: 8),
                _TotalBar(
                  items: enriched,
                  onDiscountChanged: (code, data) {
                    setState(() { _discountCode = code; _discountData = data; });
                  },
                ),
                const SizedBox(height: 8),
              ],
            ],
          ),
        ),

        // ── Pinned checkout button ──
        if (hasItems)
          Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                height: 52,
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    if (enriched.isEmpty) return;
                    final first = enriched.first;
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => CheckoutScreen(
                          item: first,
                          guests: int.tryParse('${first['quantity'] ?? 1}') ?? 1,
                          session: session,
                          initialDiscountCode: _discountCode,
                          initialDiscount: _discountData,
                        ),
                      ),
                    );
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.rausch,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    l.proceedToCheckout,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _CartItemTile extends StatelessWidget {
  const _CartItemTile({required this.cartItem, required this.session});

  final Map<String, dynamic> cartItem;
  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final title = (cartItem['title'] ?? cartItem['name'] ?? 'Listing').toString();
    final type = (cartItem['item_type'] ?? 'property').toString();
    final quantity = int.tryParse('${cartItem['quantity'] ?? 1}') ?? 1;
    final id = (cartItem['id'] ?? '').toString();
    final imageUrl = resolveListingImageUrl(cartItem);

    String priceStr;
    switch (type) {
      case 'tour':
        priceStr = '${cartItem['currency'] ?? 'USD'} ${cartItem['price_per_person'] ?? '-'} / person';
      case 'tour_package':
        priceStr = '${cartItem['currency'] ?? 'USD'} ${cartItem['price_per_adult'] ?? '-'} / person';
      case 'transport':
        priceStr = '${cartItem['currency'] ?? 'USD'} ${cartItem['price_per_day'] ?? '-'} / day';
      default:
        priceStr = '${cartItem['currency'] ?? 'USD'} ${cartItem['price_per_night'] ?? '-'} / night';
    }

    return Dismissible(
      key: Key(id.isEmpty ? UniqueKey().toString() : id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.rausch.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.delete_outline, color: AppColors.rausch),
      ),
      onDismissed: (_) {
        if (context.mounted) {
          final l = AppLocalizations.of(context)!;
          AppSnackBar.success(context, l.removedFromCart);
        }
        unawaited(
          session.removeTripCartItem(id).catchError((_) {
            if (!context.mounted) return;
            final l = AppLocalizations.of(context)!;
            AppSnackBar.error(context, l.couldNotRemoveItem);
          }),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(15),
                bottomLeft: Radius.circular(15),
              ),
              child: SizedBox(
                width: 90,
                height: 90,
                child: imageUrl != null
                    ? Image.network(imageUrl, fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(
                          color: AppColors.linnen,
                          child: const Icon(Icons.image_outlined, color: AppColors.hackberry),
                        ))
                    : Container(
                        color: AppColors.linnen,
                        child: const Icon(Icons.image_outlined, color: AppColors.hackberry),
                      ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _TypePill(type: type),
                    const SizedBox(height: 4),
                    Text(title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(priceStr,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.rausch)),
                    if (quantity > 1)
                      Text('Qty: $quantity',
                          style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                  ],
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 18, color: AppColors.hackberry),
              onPressed: () {
                if (context.mounted) {
                  final l = AppLocalizations.of(context)!;
                  AppSnackBar.success(context, l.removed);
                }
                unawaited(
                  session.removeTripCartItem(id).catchError((_) {
                    if (!context.mounted) return;
                    final l = AppLocalizations.of(context)!;
                    AppSnackBar.error(context, l.couldNotRemoveItem);
                  }),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _TotalBar extends StatefulWidget {
  const _TotalBar({required this.items, this.onDiscountChanged});
  final List<Map<String, dynamic>> items;
  final void Function(String? code, Map<String, dynamic>? data)? onDiscountChanged;

  @override
  State<_TotalBar> createState() => _TotalBarState();
}

class _TotalBarState extends State<_TotalBar> {
  final _api = AppDatabase();
  final _promoCtrl = TextEditingController();
  bool _applying = false;
  double _discount = 0;
  String? _promoMsg;
  bool _promoSuccess = false;
  Map<String, dynamic>? _appliedData;

  bool _showPriceDetails = false;

  @override
  void initState() {
    super.initState();
    _bootstrapPendingPromoCode();
  }

  String _serviceTypeForItemType(String itemType) {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return 'tour';
      case 'transport':
        return 'transport';
      default:
        return 'accommodation';
    }
  }

  Map<String, double> _computeBaseTotals() {
    final totals = <String, double>{};
    for (final item in widget.items) {
      final type = (item['item_type'] ?? 'property').toString();
      final qty = int.tryParse('${item['quantity'] ?? 1}') ?? 1;
      double price;
      switch (type) {
        case 'tour':
          price = double.tryParse('${item['price_per_person'] ?? 0}') ?? 0;
        case 'tour_package':
          price = double.tryParse('${item['price_per_adult'] ?? 0}') ?? 0;
        case 'transport':
          price = double.tryParse('${item['price_per_day'] ?? 0}') ?? 0;
        default:
          price = double.tryParse('${item['price_per_night'] ?? 0}') ?? 0;
      }
      final currency = (item['currency'] ?? 'USD').toString();
      totals[currency] = (totals[currency] ?? 0) + (price * qty);
    }
    return totals;
  }

  Map<String, double> _computeServiceFees({required Map<String, double> baseTotals}) {
    final fees = <String, double>{};

    // Apply promo discount to the first currency only (matches existing promo validation behavior)
    final firstCurrency = baseTotals.keys.isNotEmpty ? baseTotals.keys.first : null;
    for (final item in widget.items) {
      final type = (item['item_type'] ?? 'property').toString();
      final qty = int.tryParse('${item['quantity'] ?? 1}') ?? 1;
      double price;
      switch (type) {
        case 'tour':
          price = double.tryParse('${item['price_per_person'] ?? 0}') ?? 0;
        case 'tour_package':
          price = double.tryParse('${item['price_per_adult'] ?? 0}') ?? 0;
        case 'transport':
          price = double.tryParse('${item['price_per_day'] ?? 0}') ?? 0;
        default:
          price = double.tryParse('${item['price_per_night'] ?? 0}') ?? 0;
      }
      final currency = (item['currency'] ?? 'USD').toString();
      final base = (price * qty).clamp(0.0, double.infinity).toDouble();
      final discountedBase = (firstCurrency != null && currency == firstCurrency)
          ? (base - _discount).clamp(0.0, double.infinity).toDouble()
          : base;

      final financials = calculateBookingFinancialsFromDiscountedListing(
        discountedListingSubtotal: discountedBase,
        serviceType: _serviceTypeForItemType(type),
      );
      fees[currency] = (fees[currency] ?? 0) + financials.guestFee;
    }

    return fees;
  }

  @override
  void dispose() {
    _promoCtrl.dispose();
    super.dispose();
  }

  Future<void> _bootstrapPendingPromoCode() async {
    final pendingCode = await getPendingPromoCode();
    if (!mounted || pendingCode == null || pendingCode.isEmpty) return;

    _promoCtrl.text = pendingCode;
    await _applyPromo(autoTriggered: true);
  }

  Map<String, double> _computeTotals() {
    // Guest totals (base minus promo discount, then service fee applied per item type)
    final totals = <String, double>{};
    for (final item in widget.items) {
      final type = (item['item_type'] ?? 'property').toString();
      final qty = int.tryParse('${item['quantity'] ?? 1}') ?? 1;
      double price;
      switch (type) {
        case 'tour':
          price = double.tryParse('${item['price_per_person'] ?? 0}') ?? 0;
        case 'tour_package':
          price = double.tryParse('${item['price_per_adult'] ?? 0}') ?? 0;
        case 'transport':
          price = double.tryParse('${item['price_per_day'] ?? 0}') ?? 0;
        default:
          price = double.tryParse('${item['price_per_night'] ?? 0}') ?? 0;
      }
      final currency = (item['currency'] ?? 'USD').toString();
      final base = (price * qty).clamp(0.0, double.infinity).toDouble();
      // Apply promo discount to the first currency only (same behavior as current promo validation)
      final discountedBase = (currency == (totals.keys.isNotEmpty ? totals.keys.first : currency))
          ? (base - _discount).clamp(0.0, double.infinity).toDouble()
          : base;
      final financials = calculateBookingFinancialsFromDiscountedListing(
        discountedListingSubtotal: discountedBase,
        serviceType: _serviceTypeForItemType(type),
      );
      totals[currency] = (totals[currency] ?? 0) + financials.guestTotal;
    }
    return totals;
  }

  Future<void> _applyPromo({bool autoTriggered = false}) async {
    final code = _promoCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() { _applying = true; _promoMsg = null; _promoSuccess = false; });
    try {
      final totals = _computeTotals();
      final firstTotal = totals.values.isNotEmpty ? totals.values.first : 0.0;
      final firstCurrency = totals.keys.isNotEmpty ? totals.keys.first : 'USD';
      final firstItem = widget.items.isNotEmpty ? widget.items.first : null;
      final itemType = (firstItem?['item_type'] ?? 'property').toString();

      final result = await _api.validatePromoCode(
        code: code,
        subtotal: firstTotal,
        currency: firstCurrency,
        itemType: itemType,
      );
      if (!mounted) return;
      if (result.data == null) {
        setState(() {
          _discount = 0;
          _promoMsg = autoTriggered ? null : (result.error ?? 'Invalid promo code.');
          _appliedData = null;
        });
        widget.onDiscountChanged?.call(null, null);
      } else {
        final type = (result.data!['discount_type'] ?? 'fixed').toString();
        final value = ((result.data!['discount_value'] ?? 0) as num).toDouble();
        final disc = type == 'percentage' ? firstTotal * value / 100 : value;
        setState(() {
          _discount = disc;
          _promoMsg = 'Code applied! You save $firstCurrency ${disc.toStringAsFixed(0)}';
          _promoSuccess = true;
          _appliedData = result.data;
        });
        final normalizedCode = code.toUpperCase().trim();
        widget.onDiscountChanged?.call(normalizedCode, result.data);
        await clearPendingPromoCode();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _promoMsg = autoTriggered ? null : 'Error validating code.';
          _discount = 0;
          _appliedData = null;
        });
        widget.onDiscountChanged?.call(null, null);
      }
    } finally {
      if (mounted) setState(() => _applying = false);
    }
  }

  void _removePromo() {
    setState(() {
      _discount = 0;
      _promoMsg = null;
      _promoSuccess = false;
      _appliedData = null;
      _promoCtrl.clear();
    });
    widget.onDiscountChanged?.call(null, null);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseTotals = _computeBaseTotals();
    final serviceFees = _computeServiceFees(baseTotals: baseTotals);
    final totals = _computeTotals();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.linnen,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Promo code input
          if (_promoSuccess && _appliedData != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF003D1A) : const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF4CAF50).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, size: 16, color: Color(0xFF4CAF50)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${_appliedData!['code']}  •  Save ${totals.keys.isNotEmpty ? totals.keys.first : ''} ${_discount.toStringAsFixed(0)}',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? const Color(0xFF4ADE80) : const Color(0xFF2E7D32)),
                    ),
                  ),
                  GestureDetector(onTap: _removePromo, child: const Icon(Icons.close, size: 16, color: Color(0xFF757575))),
                ],
              ),
            ),
          ] else ...[
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _promoCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    hintText: l.promoCode,
                    hintStyle: const TextStyle(fontSize: 13),
                    filled: true, fillColor: AppColors.surface,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                  ),
                  style: const TextStyle(fontSize: 13, letterSpacing: 1.2),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 40,
                child: ElevatedButton(
                  onPressed: _applying ? null : _applyPromo,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.rausch,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    elevation: 0,
                  ),
                  child: _applying
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(l.apply, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ),
            ]),
            if (_promoMsg != null && !_promoSuccess) ...[
              const SizedBox(height: 6),
              Text(_promoMsg!, style: const TextStyle(fontSize: 12, color: AppColors.rausch)),
            ],
          ],
          const SizedBox(height: 12),
          Text(l.estimatedTotal, style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
          const SizedBox(height: 6),
          if (baseTotals.isNotEmpty) ...[
            ...baseTotals.entries.map((e) {
              final fee = (serviceFees[e.key] ?? 0);
              final total = (totals[e.key] ?? e.value);
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(l.total, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                        Text('${e.key} ${total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: GestureDetector(
                        onTap: () => setState(() => _showPriceDetails = !_showPriceDetails),
                        child: Text(
                          _showPriceDetails ? l.hidePriceDetails : l.showPriceDetails,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.rausch),
                        ),
                      ),
                    ),
                    if (_showPriceDetails) ...[
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(l.base, style: const TextStyle(fontSize: 12, color: AppColors.hackberry)),
                          Text('${e.key} ${e.value.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: AppColors.hackberry)),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(l.platformFees, style: const TextStyle(fontSize: 12, color: AppColors.hackberry)),
                          Text('${e.key} ${fee.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: AppColors.hackberry)),
                        ],
                      ),
                      if (_discount > 0) ...[
                        const SizedBox(height: 3),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(l.promoDiscount, style: const TextStyle(fontSize: 12, color: Color(0xFF2E7D32), fontWeight: FontWeight.w600)),
                            Text('- ${e.key} ${_discount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: Color(0xFF2E7D32), fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
                    ],
                  ],
                ),
              );
            }),
            const SizedBox(height: 4),
          ],
          Text(l.platformFeesNote, style: const TextStyle(fontSize: 11, color: AppColors.hackberry)),
        ],
      ),
    );
  }
}

class _TypePill extends StatelessWidget {
  const _TypePill({required this.type});

  final String type;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    String label;
    switch (type) {
      case 'tour':
        label = l.tourLabel;
      case 'tour_package':
        label = l.packageLabel;
      case 'transport':
        label = l.transport;
      default:
        label = l.stayLabel;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.rausch.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.rausch)),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.icon, required this.title, required this.subtitle});

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, size: 36, color: AppColors.hackberry),
          const SizedBox(height: 12),
          Text(title,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              textAlign: TextAlign.center),
          const SizedBox(height: 6),
          Text(subtitle,
              style: const TextStyle(color: AppColors.foggy, fontSize: 14),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
