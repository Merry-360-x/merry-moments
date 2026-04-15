import 'package:flutter/material.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';

import '../../session_controller.dart';
import '../../../l10n/app_localizations.dart';

class WishlistsScreen extends StatelessWidget {
  const WishlistsScreen({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final items = session.isAuthenticated
        ? (session.payload?.wishlists ?? const <Map<String, dynamic>>[])
        : session.guestWishlists;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      children: [
        Text(l.wishlists, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.black)),
        const SizedBox(height: 8),
        if (items.isEmpty)
          _InfoCard(title: l.noWishlistItems, subtitle: l.savePlacesHint)
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
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
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
                        AppSnackBar.success(context, l.removedFromWishlist);
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
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
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
