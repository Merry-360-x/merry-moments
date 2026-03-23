import 'package:flutter/material.dart';

import '../../session_controller.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key, required this.session});

  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final payload = session.payload;
    final listings = payload?.homeListings ?? const <Map<String, dynamic>>[];
    final stories = payload?.stories ?? const <Map<String, dynamic>>[];

    return RefreshIndicator(
      onRefresh: session.refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 120),
        children: [
          const Text('Explore', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF202025))),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: const Color(0xFFE8E8ED)),
              boxShadow: const [
                BoxShadow(color: Color(0x14000000), blurRadius: 14, offset: Offset(0, 3)),
              ],
            ),
            child: const Row(
              children: [
                Icon(Icons.search, size: 20, color: Color(0xFF808089)),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Where to?', style: TextStyle(fontWeight: FontWeight.w600)),
                      Text(
                        'Anywhere · Any week · Add guests',
                        style: TextStyle(fontSize: 12, color: Color(0xFF8A8A94)),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.tune, size: 18, color: Color(0xFF2C2C33)),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (session.loading)
            const Center(child: CircularProgressIndicator())
          else if (session.error != null)
            _ErrorCard(message: session.error!)
          else ...[
            const Text('Stories', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF24242A))),
            const SizedBox(height: 8),
            SizedBox(
              height: 98,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: stories.length + 1,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Container(
                      width: 92,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2555A),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add, color: Colors.white),
                          SizedBox(height: 6),
                          Text('Your story', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    );
                  }
                  final item = stories[index - 1];
                  final title = (item['title'] ?? item['location'] ?? 'Story').toString();
                  return Container(
                    width: 170,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE6E6E8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        const CircleAvatar(radius: 15, backgroundColor: Color(0xFFE2555A), child: Icon(Icons.person, color: Colors.white, size: 16)),
                        const SizedBox(height: 8),
                        Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 18),
            const Text('Listings', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF24242A))),
            const SizedBox(height: 8),
            ...listings.map((listing) {
              final title = (listing['title'] ?? listing['name'] ?? 'Listing').toString();
              final location = (listing['location'] ?? 'Unknown').toString();
              final currency = (listing['currency'] ?? 'RWF').toString();
              final price = (listing['price_per_night'] ?? listing['price_per_month'] ?? '-').toString();

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE6E6E8)),
                  boxShadow: const [
                    BoxShadow(color: Color(0x11000000), blurRadius: 10, offset: Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Stack(
                      children: [
                        Container(
                          height: 170,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xFFF0F0F3), Color(0xFFE6E7EC)],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                            borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                          ),
                          child: const Center(
                            child: Icon(Icons.image_outlined, color: Color(0xFF8E8E98), size: 42),
                          ),
                        ),
                        Positioned(
                          right: 10,
                          top: 10,
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.95),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.favorite_border, color: Color(0xFF34343A), size: 18),
                          ),
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                          const SizedBox(height: 4),
                          Text(location, style: const TextStyle(color: Color(0xFF72727D))),
                          const SizedBox(height: 6),
                          Text('$currency $price / night', style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () async {
                                    if (!session.isAuthenticated) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Set user id in Profile first.')),
                                      );
                                      return;
                                    }
                                    await session.addListingToWishlist(listing);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Added to wishlist.')),
                                      );
                                    }
                                  },
                                  child: const Text('Wishlist'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: FilledButton(
                                  onPressed: () async {
                                    if (!session.isAuthenticated) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Set user id in Profile first.')),
                                      );
                                      return;
                                    }
                                    await session.addListingToTripCart(listing);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Added to trip cart.')),
                                      );
                                    }
                                  },
                                  child: const Text('Trip cart'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
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
