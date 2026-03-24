import 'package:flutter/material.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';

import '../../session_controller.dart';
import 'property_details_screen.dart';
import 'search_screen.dart';
import 'stories_screen.dart';
import 'tours_screen.dart';
import 'transport_screen.dart';

// ── Image URL resolver (shared) ──

String? resolveListingImageUrl(Map<String, dynamic> item) {
  String? firstImage(dynamic value) {
    if (value is List) {
      for (final v in value) {
        final t = v?.toString().trim() ?? '';
        if (t.isNotEmpty) return t;
      }
      return null;
    }
    final t = value?.toString().trim() ?? '';
    return t.isEmpty ? null : t;
  }

  final raw = firstImage(item['images']) ??
      firstImage(item['main_image']) ??
      firstImage(item['image']) ??
      firstImage(item['photos']);
  if (raw == null) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('//')) return 'https:$raw';
  if (raw.startsWith('res.cloudinary.com/')) return 'https://$raw';
  return 'https://res.cloudinary.com/dghg9uebh/image/upload/f_auto,q_auto,c_fill,w_900,h_600/$raw';
}

// ── Price label helper ──

String _priceLabel(Map<String, dynamic> item) {
  final currency = (item['currency'] ?? 'USD').toString();
  final type = (item['item_type'] ?? 'property').toString();

  String amount;
  String unit;

  switch (type) {
    case 'tour':
      amount = (item['price_per_person'] ?? '-').toString();
      unit = '/ person';
    case 'tour_package':
      amount = (item['price_per_adult'] ?? '-').toString();
      unit = '/ person';
    case 'transport':
      amount = (item['price_per_day'] ?? '-').toString();
      unit = '/ day';
    default:
      amount = (item['price_per_night'] ?? '-').toString();
      unit = '/ night';
  }

  return '$currency $amount $unit';
}

String _itemSubtitle(Map<String, dynamic> item) {
  final type = (item['item_type'] ?? 'property').toString();
  final location = (item['location'] ?? item['city'] ?? '').toString();

  switch (type) {
    case 'tour':
      return location.isEmpty ? 'Tour' : 'Tour in $location';
    case 'tour_package':
      return location.isEmpty ? 'Tour package' : 'Tour package in $location';
    case 'transport':
      final vehicle = (item['vehicle_type'] ?? '').toString();
      return vehicle.isEmpty ? 'Transport' : vehicle;
    default:
      return location.isEmpty ? 'Stay' : location;
  }
}

// ══════════════════════════════════════════════════════════════════════
// ExploreScreen
// ══════════════════════════════════════════════════════════════════════

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final gridColumns = isTablet ? 3 : 2;
    final gridAspect = isTablet ? 0.72 : 0.76;
    final payload = session.payload;
    final all = payload?.homeListings ?? const <Map<String, dynamic>>[];

    final properties = all.where((i) => i['item_type'] == 'property').toList();
    final tours = all.where((i) => i['item_type'] == 'tour' || i['item_type'] == 'tour_package').toList();
    final transport = all.where((i) => i['item_type'] == 'transport').toList();

    final propertySections = <String, List<Map<String, dynamic>>>{};
    for (final item in properties) {
      final rawLocation = (item['location'] ?? item['city'] ?? '').toString().trim();
      final city = rawLocation.isEmpty ? 'Rwanda' : rawLocation.split(',').first.trim();
      propertySections.putIfAbsent(city, () => <Map<String, dynamic>>[]).add(item);
    }
    final sortedPropertySections = propertySections.entries.toList()
      ..sort((a, b) => b.value.length.compareTo(a.value.length));

    return RefreshIndicator(
      onRefresh: session.refresh,
      child: ListView(
        padding: EdgeInsets.fromLTRB(
          isTablet ? 28 : 16,
          isTablet ? 20 : 14,
          isTablet ? 28 : 16,
          isTablet ? 24 : 16,
        ),
        children: [
          // ── Search bar (taps to SearchScreen) ──
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => SearchScreen(session: session),
            )),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: isTablet ? 18 : 14, vertical: isTablet ? 16 : 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F7),
                borderRadius: BorderRadius.circular(isTablet ? 36 : 32),
              ),
              child: Row(
                children: [
                  Icon(Icons.search, size: isTablet ? 28 : 20, color: const Color(0xFF808089)),
                  SizedBox(width: isTablet ? 14 : 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Search stays, tours, transport', style: TextStyle(fontWeight: FontWeight.w600, fontSize: isTablet ? 25 : 17)),
                        Text('Anywhere · Any week · Add guests', style: TextStyle(fontSize: isTablet ? 18 : 12, color: const Color(0xFF8A8A94))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: isTablet ? 14 : 10),
          _CategoryChips(isTablet: isTablet),
          SizedBox(height: isTablet ? 16 : 12),

          // ── Content ──
          if (session.loading)
            const Center(child: Padding(padding: EdgeInsets.only(top: 40), child: CircularProgressIndicator()))
          else if (session.error != null)
            _ErrorCard(message: session.error!)
          else ...[
            // Airbnb-style property sections: one horizontal row per city
            ...sortedPropertySections.map(
              (entry) => _CityStaySection(
                city: entry.key,
                items: entry.value,
                session: session,
                isTablet: isTablet,
              ),
            ),

            // Tours & packages
            if (tours.isNotEmpty) ...[
              const _SectionHeader(title: 'Tours & experiences'),
              const SizedBox(height: 8),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: tours.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: gridColumns,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 10,
                  childAspectRatio: gridAspect,
                ),
                itemBuilder: (context, index) {
                  return ListingCard(item: tours[index], session: session, compact: true);
                },
              ),
              const SizedBox(height: 12),
            ],

            // Transport
            if (transport.isNotEmpty) ...[
              const _SectionHeader(title: 'Transport'),
              const SizedBox(height: 8),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: transport.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: gridColumns,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 10,
                  childAspectRatio: gridAspect,
                ),
                itemBuilder: (context, index) {
                  return ListingCard(item: transport[index], session: session, compact: true);
                },
              ),
              const SizedBox(height: 12),
            ],

            if (properties.isEmpty && tours.isEmpty && transport.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(child: Text('No listings yet', style: TextStyle(color: Color(0xFF9E9EA8)))),
              ),
          ],
        ],
      ),
    );
  }
}

class _CityStaySection extends StatelessWidget {
  const _CityStaySection({
    required this.city,
    required this.items,
    required this.session,
    required this.isTablet,
  });

  final String city;
  final List<Map<String, dynamic>> items;
  final SessionController session;
  final bool isTablet;

  static const int _previewCount = 8;

  @override
  Widget build(BuildContext context) {
    final gridColumns = isTablet ? 3 : 2;
    final gridAspect = isTablet ? 0.72 : 0.76;
    final previewItems = items.take(_previewCount).toList();
    final hasMore = items.length > previewItems.length;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: _SectionHeader(title: 'Stays in $city')),
              if (hasMore)
                TextButton(
                  onPressed: () {
                    showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      useSafeArea: true,
                      showDragHandle: true,
                      builder: (context) => FractionallySizedBox(
                        heightFactor: 0.9,
                        child: _CityStaysSheet(
                          city: city,
                          items: items,
                          session: session,
                        ),
                      ),
                    );
                  },
                  child: Text('See all (${items.length})', style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
            ],
          ),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: previewItems.length,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: gridColumns,
              crossAxisSpacing: 12,
              mainAxisSpacing: 10,
              childAspectRatio: gridAspect,
            ),
            itemBuilder: (context, index) {
              return ListingCard(item: previewItems[index], session: session, compact: true);
            },
          ),
        ],
      ),
    );
  }
}

class _CityStaysSheet extends StatefulWidget {
  const _CityStaysSheet({
    required this.city,
    required this.items,
    required this.session,
  });

  final String city;
  final List<Map<String, dynamic>> items;
  final SessionController session;

  @override
  State<_CityStaysSheet> createState() => _CityStaysSheetState();
}

class _CityStaysSheetState extends State<_CityStaysSheet> {
  static const int _pageSize = 10;
  int _visibleCount = _pageSize;

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final gridColumns = isTablet ? 3 : 2;
    final gridAspect = isTablet ? 0.72 : 0.76;
    final visibleItems = widget.items.take(_visibleCount).toList();
    final hasMore = _visibleCount < widget.items.length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            'Stays in ${widget.city}',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
          ),
        ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: visibleItems.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: gridColumns,
            crossAxisSpacing: 12,
            mainAxisSpacing: 10,
            childAspectRatio: gridAspect,
          ),
          itemBuilder: (context, index) {
            return ListingCard(item: visibleItems[index], session: widget.session, compact: true);
          },
        ),
        if (hasMore)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: SizedBox(
              height: 44,
              child: OutlinedButton(
                onPressed: () {
                  setState(() {
                    final next = _visibleCount + _pageSize;
                    _visibleCount = next > widget.items.length ? widget.items.length : next;
                  });
                },
                child: Text('Load more (${widget.items.length - _visibleCount} left)'),
              ),
            ),
          ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// ListingCard — Airbnb-style card for all listing types
// ══════════════════════════════════════════════════════════════════════

class ListingCard extends StatelessWidget {
  const ListingCard({super.key, required this.item, required this.session, this.compact = false});

  final Map<String, dynamic> item;
  final SessionController session;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PropertyDetailsScreen(item: item, session: session),
        ),
      ),
      child: _buildCard(context),
    );
  }

  Widget _buildCard(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final title = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final subtitle = _itemSubtitle(item);
    final price = _priceLabel(item);
    final imageUrl = resolveListingImageUrl(item);
    final rating = (item['rating'] ?? item['average_rating'])?.toString();
    final imageHeight = compact ? (isTablet ? 200.0 : 132.0) : (isTablet ? 230.0 : 220.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── Image with overlays ──
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            height: imageHeight,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _ListingImage(imageUrl: imageUrl),

                // "Guest favorite" badge
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 6, offset: Offset(0, 2))],
                    ),
                    child: const Text(
                      'Guest favorite',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF222222)),
                    ),
                  ),
                ),

                // Heart / wishlist button
                Positioned(
                  top: 10,
                  right: 10,
                  child: GestureDetector(
                    onTap: () async {
                      if (!session.isAuthenticated) {
                        AppSnackBar.info(context, 'Sign in to save to wishlist');
                        return;
                      }
                      await session.addListingToWishlist(item);
                      if (context.mounted) {
                        AppSnackBar.success(context, 'Saved to wishlist');
                      }
                    },
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: const BoxDecoration(
                        color: Color(0x66000000),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.favorite_border, color: Colors.white, size: 18),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 8),

        // ── Title row + rating ──
        Row(
          children: [
            Expanded(
              child: Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: compact ? 13 : 15, color: const Color(0xFF222222)),
              ),
            ),
            if (rating != null && rating != 'null') ...[
              const Icon(Icons.star, size: 14, color: Color(0xFF222222)),
              const SizedBox(width: 3),
              Text(rating, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF222222))),
            ],
          ],
        ),

        const SizedBox(height: 1),

        // ── Title ──
        Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: compact ? 12 : 13, color: const Color(0xFF717171)),
        ),

        const SizedBox(height: 4),

        // ── Price ──
        Text.rich(
          TextSpan(children: [
            TextSpan(text: price.split(' ').take(2).join(' '), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF222222))),
            TextSpan(text: ' ${price.split(' ').skip(2).join(' ')}', style: const TextStyle(fontSize: 13, color: Color(0xFF717171))),
          ]),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({required this.isTablet});

  final bool isTablet;

  @override
  Widget build(BuildContext context) {
    final chips = ['Stays', 'Tours', 'Cars', 'Events'];
    return SizedBox(
      height: isTablet ? 44 : 34,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: chips.length,
        separatorBuilder: (context, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final active = index == 0;
          return Container(
            padding: EdgeInsets.symmetric(horizontal: isTablet ? 16 : 12, vertical: isTablet ? 11 : 8),
            decoration: BoxDecoration(
              color: active ? const Color(0xFFFFE8E9) : const Color(0xFFF0F0F3),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              chips[index],
              style: TextStyle(
                fontSize: isTablet ? 16 : 12,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                color: active ? AppColors.rausch : const Color(0xFF565660),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF222222)));
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF0F0),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFCACA)),
      ),
      child: Text(message),
    );
  }
}

class _ListingImage extends StatelessWidget {
  const _ListingImage({required this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.isEmpty) {
      return Container(
        color: const Color(0xFFF0F0F3),
        child: const Center(child: Icon(Icons.image_outlined, color: Color(0xFF8E8E98), size: 38)),
      );
    }

    return Image.network(
      imageUrl!,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) {
        return Container(
          color: const Color(0xFFF0F0F3),
          child: const Center(child: Icon(Icons.image_outlined, color: Color(0xFF8E8E98), size: 38)),
        );
      },
    );
  }
}

// ── Quick Nav Chip ─────────────────────────────────────────────────────────

class _QuickNavChip extends StatelessWidget {
  const _QuickNavChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
    required this.isTablet,
  });
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final bool isTablet;

  @override
  Widget build(BuildContext context) {
    final size = isTablet ? 86.0 : 68.0;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: color, size: isTablet ? 28 : 22),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: color, fontSize: isTablet ? 13 : 11, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
