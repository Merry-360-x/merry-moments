import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../app.dart';

import '../../services/app_database.dart';
import '../../session_controller.dart';
import 'explore_screen.dart' show resolveListingImages;
import 'property_details_screen.dart';
import '../../../l10n/app_localizations.dart';

class TransportScreen extends StatefulWidget {
  const TransportScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<TransportScreen> createState() => _TransportScreenState();
}

class _TransportScreenState extends State<TransportScreen> {
  final _api = AppDatabase();
  String _category = 'all';
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  final _searchCtrl = TextEditingController();

  List<(String, String)> _buildCats(AppLocalizations l) => [
    ('all', l.all),
    ('car', l.cars),
    ('van', l.vansAndBuses),
    ('motorcycle', l.motorbikes),
    ('boat', l.boats),
  ];

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_onSessionChanged);
    _syncFromSession();
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSessionChanged() {
    if (mounted) _syncFromSession();
  }

  /// Pull transport listings out of the already-synced session payload.
  /// Falls back to a direct network fetch when the payload isn't ready yet.
  void _syncFromSession() {
    final listings = widget.session.payload?.homeListings;
    if (listings != null) {
      final transport = listings
          .where((i) => i['item_type'] == 'transport')
          .toList();
      if (mounted) setState(() { _items = transport; _loading = false; });
    } else if (_loading) {
      // Payload not yet available — do a one-time fetch to show content quickly.
      _fetchFallback();
    }
  }

  Future<void> _fetchFallback() async {
    final t = await _api.fetchTransportListings(category: _category == 'all' ? null : _category);
    if (mounted) setState(() { _items = t; _loading = false; });
  }

  List<Map<String, dynamic>> get _filtered {
    var items = _items;
    if (_category != 'all') {
      items = items.where((i) =>
        (i['vehicle_type'] ?? '').toString().toLowerCase() == _category
      ).toList();
    }
    final q = _searchCtrl.text.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items.where((i) =>
      (i['title'] ?? '').toString().toLowerCase().contains(q) ||
      (i['vehicle_type'] ?? '').toString().toLowerCase().contains(q)
    ).toList();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final cats = _buildCats(l);
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface, surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: Text(l.transportAndTransfers,
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 18)),
        centerTitle: false,
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: l.searchVehicles,
                prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.foggy),
                filled: true,
                fillColor: AppColors.linnen,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
            child: Row(
              children: cats.map((c) {
                final active = c.$1 == _category;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () { setState(() => _category = c.$1); },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: active ? AppColors.rausch : AppColors.linnen,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(c.$2, style: TextStyle(
                        color: active ? Colors.white : AppColors.hof,
                        fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                        fontSize: 13,
                      )),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(child: _body(l)),
        ],
      ),
    );
  }

  Widget _body(AppLocalizations l) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.rausch));
    final items = _filtered;
    if (items.isEmpty) {
      return Center(
      child: Text(l.noVehiclesFound, style: const TextStyle(color: AppColors.foggy)),
    );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (_, i) => _TransportTile(item: items[i], session: widget.session),
    );
  }
}

class _TransportTile extends StatefulWidget {
  const _TransportTile({required this.item, required this.session});
  final Map<String, dynamic> item;
  final SessionController session;

  @override
  State<_TransportTile> createState() => _TransportTileState();
}

class _TransportTileState extends State<_TransportTile> {
  final _pageCtrl = PageController();
  int _currentPage = 0;
  Timer? _autoRotate;

  @override
  void initState() {
    super.initState();
    _autoRotate = Timer.periodic(const Duration(seconds: 4), (_) {
      final images = resolveListingImages(widget.item);
      if (images.length > 1 && mounted) {
        final next = (_currentPage + 1) % images.length;
        _pageCtrl.animateToPage(next, duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
      }
    });
  }

  @override
  void dispose() {
    _autoRotate?.cancel();
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final title = (widget.item['title'] ?? 'Vehicle').toString();
    final type = (widget.item['vehicle_type'] ?? '').toString();
    final price = widget.item['price_per_day'];
    final currency = (widget.item['currency'] ?? 'USD').toString();
    final seats = widget.item['seats'] ?? widget.item['passenger_capacity'];
    final transmission = (widget.item['transmission'] ?? '').toString();
    final description = (widget.item['description'] ?? '').toString().trim();
    final images = resolveListingImages(widget.item);

    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => PropertyDetailsScreen(item: widget.item, session: widget.session),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image carousel ──
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: SizedBox(
                height: 190,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    PageView.builder(
                      controller: _pageCtrl,
                      itemCount: images.isEmpty ? 1 : images.length,
                      onPageChanged: (i) => setState(() => _currentPage = i),
                      itemBuilder: (_, i) {
                        final url = images.isEmpty ? null : images[i];
                        return (url != null && url.isNotEmpty)
                            ? CachedNetworkImage(imageUrl: url, fit: BoxFit.cover, width: double.infinity,
                                errorWidget: (_, _, _) => _ph())
                            : _ph();
                      },
                    ),
                    // Type badge
                    if (type.isNotEmpty)
                      Positioned(
                        top: 10, left: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2196F3).withValues(alpha: 0.85),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(type.toUpperCase(), style: const TextStyle(
                            fontSize: 9, color: Colors.white, fontWeight: FontWeight.w700, letterSpacing: 0.5,
                          )),
                        ),
                      ),
                    // Left arrow
                    if (images.length > 1 && _currentPage > 0)
                      Positioned(
                        left: 8, top: 0, bottom: 0,
                        child: Center(child: GestureDetector(
                          onTap: () => _pageCtrl.previousPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut),
                          child: Container(
                            width: 30, height: 30,
                            decoration: const BoxDecoration(color: Color(0xBBFFFFFF), shape: BoxShape.circle),
                            child: const Icon(Icons.chevron_left, size: 18, color: AppColors.black),
                          ),
                        )),
                      ),
                    // Right arrow
                    if (images.length > 1 && _currentPage < images.length - 1)
                      Positioned(
                        right: 8, top: 0, bottom: 0,
                        child: Center(child: GestureDetector(
                          onTap: () => _pageCtrl.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut),
                          child: Container(
                            width: 30, height: 30,
                            decoration: const BoxDecoration(color: Color(0xBBFFFFFF), shape: BoxShape.circle),
                            child: const Icon(Icons.chevron_right, size: 18, color: AppColors.black),
                          ),
                        )),
                      ),
                    // Dots
                    if (images.length > 1)
                      Positioned(
                        bottom: 8, left: 0, right: 0,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(images.length, (i) => Container(
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            width: _currentPage == i ? 6 : 4,
                            height: _currentPage == i ? 6 : 4,
                            decoration: BoxDecoration(
                              color: _currentPage == i ? Colors.white : Colors.white54,
                              shape: BoxShape.circle,
                            ),
                          )),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            // ── Details ──
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.black)),
                  const SizedBox(height: 6),
                  Row(children: [
                    if (seats != null) ...[
                      const Icon(Icons.people_alt_outlined, size: 14, color: AppColors.foggy),
                      const SizedBox(width: 4),
                      Text('$seats seats', style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                    ],
                    if (seats != null && transmission.isNotEmpty) ...[
                      const SizedBox(width: 10),
                      const Text('•', style: TextStyle(fontSize: 12, color: AppColors.foggy)),
                      const SizedBox(width: 10),
                    ],
                    if (transmission.isNotEmpty)
                      Text(transmission, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                  ]),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(description, maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (price != null)
                        Text(
                          '${widget.session.formatPrice(double.tryParse('$price') ?? 0, itemCurrency: currency)}/day',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.rausch),
                        ),
                      const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.hackberry),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ph() => Container(
    color: AppColors.linnen,
    child: const Center(child: Icon(Icons.directions_car_outlined, color: AppColors.hackberry, size: 40)),
  );
}
