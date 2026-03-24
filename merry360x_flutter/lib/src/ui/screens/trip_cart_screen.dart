import 'package:flutter/material.dart';

import '../../services/mobile_api.dart';
import '../../session_controller.dart';
import 'checkout_screen.dart';
import 'explore_screen.dart' show resolveListingImageUrl;

class TripCartScreen extends StatelessWidget {
  const TripCartScreen({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final items = session.payload?.tripCart ?? const <Map<String, dynamic>>[];
    final listings = session.payload?.homeListings ?? const <Map<String, dynamic>>[];

    final enriched = items.map((ci) {
      final ref = (ci['property_id'] ?? ci['tour_id'] ?? ci['transport_id'] ?? ci['reference_id'] ?? '').toString();
      final type = (ci['item_type'] ?? 'property').toString();
      final matched = listings.firstWhere(
        (l) => l['id']?.toString() == ref && l['item_type']?.toString() == type,
        orElse: () => const {},
      );
      return <String, dynamic>{...ci, ...matched};
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 120),
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Trip cart',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: Color(0xFF202025)),
              ),
            ),
            if (items.isNotEmpty)
              TextButton(
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Clear cart?'),
                      content: const Text('Remove all items from your trip cart?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                        FilledButton(
                          style: FilledButton.styleFrom(backgroundColor: const Color(0xFFE2555A)),
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Clear'),
                        ),
                      ],
                    ),
                  );
                  if (confirmed == true) {
                    for (final item in items) {
                      await session.removeTripCartItem((item['id'] ?? '').toString());
                    }
                  }
                },
                child: const Text('Clear', style: TextStyle(color: Color(0xFFE2555A))),
              ),
          ],
        ),
        const SizedBox(height: 4),
        if (session.isAuthenticated)
          Text('${items.length} item${items.length != 1 ? 's' : ''}',
              style: const TextStyle(color: Color(0xFF7A7A84))),
        const SizedBox(height: 16),

        if (!session.isAuthenticated)
          _InfoCard(
            icon: Icons.person_outline,
            title: 'Sign in to view your cart',
            subtitle: 'Your trip cart will sync with your account across all devices.',
          )
        else if (items.isEmpty)
          _InfoCard(
            icon: Icons.luggage_outlined,
            title: 'Your trip cart is empty',
            subtitle: 'Explore stays, tours, or transport and add them to your trip.',
          )
        else ...[
          ...enriched.map(
            (ci) => _CartItemTile(cartItem: ci, session: session),
          ),
          const SizedBox(height: 8),
          _TotalBar(items: enriched),
          const SizedBox(height: 14),
          SizedBox(
            height: 52,
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
                    ),
                  ),
                );
              },
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFFF385C),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text(
                'Proceed to checkout',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
            ),
          ),
        ],
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
          color: const Color(0xFFFFEEEE),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.delete_outline, color: Color(0xFFE2555A)),
      ),
      onDismissed: (_) async {
        await session.removeTripCartItem(id);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Removed from cart'), behavior: SnackBarBehavior.floating),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE7E7EC)),
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 3))],
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
                        errorBuilder: (_, __, ___) => Container(
                          color: const Color(0xFFF0F0F3),
                          child: const Icon(Icons.image_outlined, color: Color(0xFF9E9EA8)),
                        ))
                    : Container(
                        color: const Color(0xFFF0F0F3),
                        child: const Icon(Icons.image_outlined, color: Color(0xFF9E9EA8)),
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
                            fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFE2555A))),
                    if (quantity > 1)
                      Text('Qty: $quantity',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF717171))),
                  ],
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 18, color: Color(0xFF9E9EA8)),
              onPressed: () async {
                await session.removeTripCartItem(id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Removed'), behavior: SnackBarBehavior.floating),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _TotalBar extends StatefulWidget {
  const _TotalBar({required this.items});
  final List<Map<String, dynamic>> items;

  @override
  State<_TotalBar> createState() => _TotalBarState();
}

class _TotalBarState extends State<_TotalBar> {
  final _api = MobileApi();
  final _promoCtrl = TextEditingController();
  bool _applying = false;
  double _discount = 0;
  String? _promoMsg;

  @override
  void dispose() {
    _promoCtrl.dispose();
    super.dispose();
  }

  Map<String, double> _computeTotals() {
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
      totals[currency] = (totals[currency] ?? 0) + price * qty;
    }
    return totals;
  }

  Future<void> _applyPromo() async {
    final code = _promoCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() { _applying = true; _promoMsg = null; });
    try {
      final result = await _api.validatePromoCode(code: code);
      if (!mounted) return;
      if (result == null) {
        setState(() { _discount = 0; _promoMsg = 'Invalid or expired promo code.'; });
      } else {
        final type = (result['discount_type'] ?? 'fixed').toString();
        final value = ((result['discount_value'] ?? 0) as num).toDouble();
        final totals = _computeTotals();
        final firstTotal = totals.values.isNotEmpty ? totals.values.first : 0.0;
        final disc = type == 'percentage' ? firstTotal * value / 100 : value;
        setState(() {
          _discount = disc;
          _promoMsg = 'Code applied! You save \$${disc.toStringAsFixed(2)}';
        });
      }
    } catch (_) {
      if (mounted) setState(() { _promoMsg = 'Error validating code.'; _discount = 0; });
    } finally {
      if (mounted) setState(() => _applying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totals = _computeTotals();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F8),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Promo code input
          Row(children: [
            Expanded(
              child: TextField(
                controller: _promoCtrl,
                decoration: InputDecoration(
                  hintText: 'Promo code',
                  hintStyle: const TextStyle(fontSize: 13),
                  filled: true, fillColor: Colors.white,
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
                style: const TextStyle(fontSize: 13),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              height: 40,
              child: ElevatedButton(
                onPressed: _applying ? null : _applyPromo,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE2555A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  elevation: 0,
                ),
                child: _applying
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Apply', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
            ),
          ]),
          if (_promoMsg != null) ...[
            const SizedBox(height: 6),
            Text(_promoMsg!,
                style: TextStyle(
                  fontSize: 12,
                  color: _discount > 0 ? const Color(0xFF4CAF50) : const Color(0xFFE2555A),
                )),
          ],
          const SizedBox(height: 12),
          const Text('Estimated total', style: TextStyle(fontSize: 13, color: Color(0xFF717171))),
          const SizedBox(height: 6),
          ...totals.entries.map((e) {
            if (_discount > 0) {
              final discounted = e.value - _discount;
              return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${e.key} ${e.value.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 15, decoration: TextDecoration.lineThrough, color: Color(0xFF9E9EA8))),
                Text('${e.key} ${discounted.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF4CAF50))),
              ]);
            }
            return Text('${e.key} ${e.value.toStringAsFixed(0)}',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700));
          }),
          const SizedBox(height: 4),
          const Text('Excluding service fees', style: TextStyle(fontSize: 11, color: Color(0xFF9E9EA8))),
        ],
      ),
    );
  }
}

class _TypePill extends StatelessWidget {
  const _TypePill({required this.type});

  final String type;

  String get _label {
    switch (type) {
      case 'tour':
        return 'Tour';
      case 'tour_package':
        return 'Package';
      case 'transport':
        return 'Transport';
      default:
        return 'Stay';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFFFE8E9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(_label,
          style: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFFE2555A))),
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE7E7EC)),
        boxShadow: const [
          BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 3)),
        ],
      ),
      child: Column(
        children: [
          Icon(icon, size: 36, color: const Color(0xFF9E9EA8)),
          const SizedBox(height: 12),
          Text(title,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              textAlign: TextAlign.center),
          const SizedBox(height: 6),
          Text(subtitle,
              style: const TextStyle(color: Color(0xFF777780), fontSize: 14),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
