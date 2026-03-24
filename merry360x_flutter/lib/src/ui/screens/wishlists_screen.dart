import 'package:flutter/material.dart';

import '../../app.dart';

import '../../session_controller.dart';

class WishlistsScreen extends StatelessWidget {
  const WishlistsScreen({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final items = session.payload?.wishlists ?? const <Map<String, dynamic>>[];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      children: [
        const Text('Wishlists', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.black)),
        const SizedBox(height: 8),
        if (!session.isAuthenticated)
          _InfoCard(
            title: 'Connect your account',
            subtitle: 'Sign in to sync your wishlists across devices.',
          )
        else if (items.isEmpty)
          const _InfoCard(title: 'No wishlist items yet.', subtitle: 'Save places from Explore and they will appear here.')
        else
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text('${items.length} saved place${items.length == 1 ? '' : 's'}', style: const TextStyle(color: AppColors.foggy)),
          ),
        if (items.isNotEmpty)
          ...items.map((item) {
            final id = (item['id'] ?? '').toString();
            final title = (item['title'] ?? item['item_type'] ?? 'Saved item').toString();
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFEBEBEB)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEFF0),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: const Icon(Icons.favorite, color: AppColors.rausch, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 3),
                        Text(
                          (item['created_at'] ?? '').toString(),
                          style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () async {
                      await session.removeWishlistItem(id);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Removed from wishlist.')),
                        );
                      }
                    },
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: AppColors.foggy)),
        ],
      ),
    );
  }
}
