import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../app.dart';

import '../../services/app_database.dart';
import '../../session_controller.dart';
import 'explore_screen.dart' show resolveListingImageUrl, resolveListingImages;
import 'property_details_screen.dart';
import '../../../l10n/app_localizations.dart';

class ToursScreen extends StatefulWidget {
  const ToursScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<ToursScreen> createState() => _ToursScreenState();
}

class _ToursScreenState extends State<ToursScreen> {
  final _api = AppDatabase();
  String _category = 'all';
  List<Map<String, dynamic>> _tours = [];
  bool _loading = true;
  final _precachedUrls = <String>{};

  void _precacheTourImages(List<Map<String, dynamic>> items) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      for (final item in items) {
        final url = resolveListingImageUrl(item);
        if (url != null && _precachedUrls.add(url)) {
          precacheImage(CachedNetworkImageProvider(url), context);
        }
      }
    });
  }

  List<(String, String)> _buildCats(AppLocalizations l) => [
    ('all', l.all),
    ('nature', l.nature),
    ('adventure', l.adventure),
    ('cultural', l.cultural),
    ('wildlife', l.wildlife),
    ('historical', l.historical),
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
    super.dispose();
  }

  void _onSessionChanged() {
    if (mounted) _syncFromSession();
  }

  void _syncFromSession() {
    final listings = widget.session.payload?.homeListings;
    if (listings != null) {
      final tourItems = listings
          .where((i) => i['item_type'] == 'tour' || i['item_type'] == 'tour_package')
          .toList();
      if (mounted) {
        setState(() { _tours = tourItems; _loading = false; });
        _precacheTourImages(tourItems);
      }
    } else if (_loading) {
      _fetchFallback();
    }
  }

  Future<void> _fetchFallback() async {
    final results = await Future.wait([
      _api.fetchTours(),
      _api.fetchTourPackages(),
    ]);
    final merged = <Map<String, dynamic>>[...results[0], ...results[1]];
    merged.sort((a, b) {
      final ad = a['created_at']?.toString() ?? '';
      final bd = b['created_at']?.toString() ?? '';
      return bd.compareTo(ad);
    });
    if (mounted) {
      setState(() {
        _tours = merged;
        _loading = false;
      });
      _precacheTourImages(merged);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    String norm(dynamic v) => (v ?? '').toString().trim().toLowerCase();
    final selected = norm(_category);
    final base = selected == 'all'
        ? _tours
        : _tours.where((i) {
            final cat = norm(i['category']);
            if (cat == selected) return true;
            final cats = i['categories'];
            if (cats is List) {
              return cats.map(norm).contains(selected);
            }
            return false;
          }).toList();
    base.sort((a, b) {
      final ad = a['created_at']?.toString() ?? '';
      final bd = b['created_at']?.toString() ?? '';
      return bd.compareTo(ad);
    });
    return base;
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
        title: Text(l.toursAndExperiences,
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 18)),
        centerTitle: false,
      ),
      body: Column(
        children: [
          _CategoryChips(cats: cats, selected: _category, onSelect: (c) {
            setState(() => _category = c);
          }),
          Expanded(child: _body(l)),
        ],
      ),
    );
  }

  Widget _body(AppLocalizations l) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.rausch));
    final tours = _filtered;
    if (tours.isEmpty) {
      return Center(
      child: Text(l.noToursAvailable, style: const TextStyle(color: AppColors.foggy)),
    );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.75,
      ),
      itemCount: tours.length,
      itemBuilder: (_, i) => _TourCard(item: tours[i], session: widget.session),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({required this.cats, required this.selected, required this.onSelect});
  final List<(String, String)> cats;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        child: Row(
          children: cats.map((c) {
            final active = c.$1 == selected;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => onSelect(c.$1),
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
    );
  }
}

class _TourCard extends StatefulWidget {
  const _TourCard({required this.item, required this.session});
  final Map<String, dynamic> item;
  final SessionController session;

  @override
  State<_TourCard> createState() => _TourCardState();
}

class _TourCardState extends State<_TourCard> {
  final _pageCtrl = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final title = (widget.item['title'] ?? '').toString();
    final location = (widget.item['location'] ?? '').toString();
    final price = widget.item['price_per_person'];
    final currency = (widget.item['currency'] ?? 'USD').toString();
    final duration = widget.item['duration_days'];
    final description = (widget.item['description'] ?? '').toString().trim();
    final images = resolveListingImages(widget.item);

    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => PropertyDetailsScreen(item: widget.item, session: widget.session),
      )),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
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
                                errorWidget: (_, _, _) => _imgPlaceholder())
                            : _imgPlaceholder();
                      },
                    ),
                    // Left arrow
                    if (images.length > 1 && _currentPage > 0)
                      Positioned(
                        left: 6, top: 0, bottom: 0,
                        child: Center(child: GestureDetector(
                          onTap: () => _pageCtrl.previousPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut),
                          child: Container(
                            width: 26, height: 26,
                            decoration: const BoxDecoration(color: Color(0xBBFFFFFF), shape: BoxShape.circle),
                            child: const Icon(Icons.chevron_left, size: 16, color: AppColors.black),
                          ),
                        )),
                      ),
                    // Right arrow
                    if (images.length > 1 && _currentPage < images.length - 1)
                      Positioned(
                        right: 6, top: 0, bottom: 0,
                        child: Center(child: GestureDetector(
                          onTap: () => _pageCtrl.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut),
                          child: Container(
                            width: 26, height: 26,
                            decoration: const BoxDecoration(color: Color(0xBBFFFFFF), shape: BoxShape.circle),
                            child: const Icon(Icons.chevron_right, size: 16, color: AppColors.black),
                          ),
                        )),
                      ),
                    // Dots
                    if (images.length > 1)
                      Positioned(
                        bottom: 6, left: 0, right: 0,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(images.length, (i) => Container(
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            width: _currentPage == i ? 5 : 3,
                            height: _currentPage == i ? 5 : 3,
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
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black)),
                  if (location.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Row(children: [
                        const Icon(Icons.location_on_outlined, size: 11, color: AppColors.foggy),
                        const SizedBox(width: 2),
                        Expanded(child: Text(location, maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: AppColors.foggy))),
                      ]),
                    ),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(description, maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(price != null ? '${widget.session.formatPrice(double.tryParse('$price') ?? 0, itemCurrency: currency)}/pp' : '',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.rausch)),
                      if (duration != null)
                        Text('${duration}d', style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
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

  Widget _imgPlaceholder() => Container(
    color: AppColors.linnen,
    child: const Center(child: Icon(Icons.landscape_outlined, color: AppColors.hackberry, size: 32)),
  );
}
