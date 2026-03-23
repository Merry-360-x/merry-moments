import 'package:flutter/material.dart';

import '../../session_controller.dart';

class TripCartScreen extends StatelessWidget {
  const TripCartScreen({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final items = session.payload?.tripCart ?? const <Map<String, dynamic>>[];
    final totalItems = items.fold<int>(0, (sum, item) => sum + int.tryParse('${item['quantity'] ?? 1}')!.clamp(1, 999));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        const Text('Trip cart', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF202025))),
        const SizedBox(height: 8),
        if (session.isAuthenticated)
          Text('Items: $totalItems', style: const TextStyle(color: Color(0xFF7A7A84))),
        const SizedBox(height: 8),
        if (!session.isAuthenticated)
          const _TripInfoCard(
            title: 'Connect account',
            subtitle: 'Set user id in Profile to sync your trip cart with your website account.',
          )
        else if (items.isEmpty)
          const _TripInfoCard(
            title: 'Trip cart is empty',
            subtitle: 'Add stays, tours, or transport from Explore.',
          )
        else ...[
          ...items.map((item) {
            final id = (item['id'] ?? '').toString();
            final itemType = (item['item_type'] ?? 'item').toString();
            final quantity = (item['quantity'] ?? 1).toString();
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE7E7EC)),
                boxShadow: const [
                  BoxShadow(color: Color(0x11000000), blurRadius: 10, offset: Offset(0, 4)),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F3FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.shopping_bag_outlined, color: Color(0xFF4454A3), size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(itemType, style: const TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 3),
                        Text('Quantity: $quantity', style: const TextStyle(color: Color(0xFF777780))),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () async {
                      await session.removeTripCartItem(id);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Removed from trip cart.')),
                        );
                      }
                    },
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 14),
          SizedBox(
            height: 50,
            child: FilledButton(onPressed: () {}, child: const Text('Proceed to checkout')),
          ),
        ],
      ],
    );
  }
}

class _TripInfoCard extends StatelessWidget {
  const _TripInfoCard({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE7E7EC)),
        boxShadow: const [
          BoxShadow(color: Color(0x11000000), blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: Color(0xFF777780))),
        ],
      ),
    );
  }
}
