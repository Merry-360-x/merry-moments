import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import 'checkout_screen.dart';
import 'explore_screen.dart' show resolveListingImageUrl;

// ─────────────────────────────────────────────────────────────────────────────
// PropertyDetailsScreen
// Shows full listing details for any item_type: property / tour /
// tour_package / transport.
// ─────────────────────────────────────────────────────────────────────────────

class PropertyDetailsScreen extends StatefulWidget {
  const PropertyDetailsScreen({
    super.key,
    required this.item,
    required this.session,
    this.initialCheckIn,
    this.initialCheckOut,
    this.initialGuests = 1,
  });

  final Map<String, dynamic> item;
  final SessionController session;
  final DateTime? initialCheckIn;
  final DateTime? initialCheckOut;
  final int initialGuests;

  @override
  State<PropertyDetailsScreen> createState() => _PropertyDetailsScreenState();
}

class _PropertyDetailsScreenState extends State<PropertyDetailsScreen> {
  final AppDatabase _api = AppDatabase();

  Map<String, dynamic>? _full;
  List<Map<String, dynamic>> _recommendedTours = [];
  List<Map<String, dynamic>> _recommendedTourPackages = [];
  List<Map<String, dynamic>> _recommendedTransport = [];
  bool _loading = true;
  bool _loadingRecommendations = false;
  String? _error;

  // Booking state
  DateTime? _checkIn;
  DateTime? _checkOut;
  int _guests = 1;
  int _currentImage = 0;
  bool _liked = false;

  @override
  void initState() {
    super.initState();
    _checkIn  = widget.initialCheckIn;
    _checkOut = widget.initialCheckOut;
    _guests   = widget.initialGuests;
    _loadFull();
  }

  Future<void> _loadFull() async {
    final id = (widget.item['id'] ?? '').toString();
    final type = (widget.item['item_type'] ?? 'property').toString();
    if (id.isEmpty) {
      setState(() {
        _full = widget.item;
        _loading = false;
      });
      unawaited(_loadRecommendations(widget.item));
      return;
    }
    try {
      final result = await _api.fetchListingById(id: id, type: type);
      final resolved = result ?? widget.item;
      setState(() {
        _full = resolved;
        _loading = false;
      });
      unawaited(_loadRecommendations(resolved));
    } catch (e) {
      setState(() {
        _full = widget.item;
        _loading = false;
        _error = e.toString();
      });
      unawaited(_loadRecommendations(widget.item));
    }
  }

  Future<void> _loadRecommendations(Map<String, dynamic> baseItem) async {
    final query = _recommendationQuery(baseItem);
    final currentId = (baseItem['id'] ?? '').toString();
    final currentType = (baseItem['item_type'] ?? 'property').toString();

    setState(() => _loadingRecommendations = true);

    try {
      final results = await Future.wait([
        _api.fetchTours(query: query, limit: 8),
        _api.fetchTourPackages(query: query, limit: 8),
        _api.fetchTransportListings(query: query, limit: 8),
      ]);

      List<Map<String, dynamic>> sanitize(List<Map<String, dynamic>> items) {
        return items.where((candidate) {
          final candidateId = (candidate['id'] ?? '').toString();
          final candidateType = (candidate['item_type'] ?? '').toString();
          if (candidateId.isEmpty) return true;
          return candidateId != currentId || candidateType != currentType;
        }).take(6).toList();
      }

      if (!mounted) return;
      setState(() {
        _recommendedTours = sanitize(results[0]);
        _recommendedTourPackages = sanitize(results[1]);
        _recommendedTransport = sanitize(results[2]);
        _loadingRecommendations = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingRecommendations = false);
    }
  }

  Map<String, dynamic> get item => _full ?? widget.item;
  String get itemType => (item['item_type'] ?? 'property').toString();

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

  String get _currency => (item['currency'] ?? 'USD').toString();

  int get _nights {
    if (_checkIn == null || _checkOut == null) return 0;
    return _checkOut!.difference(_checkIn!).inDays.clamp(0, 999);
  }

  double get _subtotal {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return _pricePerUnit * _guests;
      case 'transport':
        return _pricePerUnit * (_nights == 0 ? 1 : _nights);
      default:
        return _pricePerUnit * (_nights == 0 ? 1 : _nights);
    }
  }

  List<String> get _allImages {
    final raw = item['images'];
    final List<String> urls = [];
    if (raw is List) {
      for (final v in raw) {
        final s = v?.toString().trim() ?? '';
        if (s.isNotEmpty) urls.add(s);
      }
    }
    final m = resolveListingImageUrl(item);
    if (urls.isEmpty && m != null) urls.add(m);
    // Resolve each image URL
    return urls.map((s) {
      String url = s;
      if (url.startsWith('//')) url = 'https:$url';
      if (url.startsWith('res.cloudinary.com/')) url = 'https://$url';
      if (!url.startsWith('http')) {
        url = 'https://res.cloudinary.com/dghg9uebh/image/upload/f_auto,q_auto,c_fill,w_900,h_600/$url';
      }
      return url;
    }).toList();
  }

  List<String> get _amenities {
    final raw = item['amenities'];
    if (raw is List) return raw.map((e) => e.toString()).toList();
    return [];
  }

  String _recommendationQuery(Map<String, dynamic> source) {
    final location = (source['location'] ?? source['city'] ?? source['provider_name'] ?? '').toString().trim();
    if (location.isNotEmpty) {
      final firstSegment = location.split(',').first.trim();
      if (firstSegment.isNotEmpty) return firstSegment;
    }

    return (source['title'] ?? source['name'] ?? '').toString().trim();
  }

  bool get _hasRecommendations =>
      _recommendedTours.isNotEmpty || _recommendedTourPackages.isNotEmpty || _recommendedTransport.isNotEmpty;

  Future<void> _pickDates() async {
    final now = DateTime.now();
    final result = await showDateRangePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      initialDateRange: (_checkIn != null && _checkOut != null)
          ? DateTimeRange(start: _checkIn!, end: _checkOut!)
          : null,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.rausch,
            onPrimary: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (result != null) {
      setState(() {
        _checkIn = result.start;
        _checkOut = result.end;
      });
    }
  }

  void _addToCart() {
    if (!widget.session.isAuthenticated) {
      _showSnack('Sign in to save to trip cart');
      return;
    }
    final metadata = <String, dynamic>{
      if (_checkIn != null) 'check_in': _checkIn!.toIso8601String().split('T').first,
      if (_checkOut != null) 'check_out': _checkOut!.toIso8601String().split('T').first,
      'guests': _guests,
      if (_nights > 0) 'nights': _nights,
    };
    if (mounted) _showSnack('Added to trip cart ✓', isSuccess: true);
    unawaited(
      widget.session.addListingToTripCart(item, metadata: metadata).catchError((e) {
        if (mounted) _showSnack('Could not add: $e', isError: true);
      }),
    );
  }

  void _bookNow() {
    if (!widget.session.isAuthenticated) {
      _showSnack('Sign in to book');
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CheckoutScreen(
          item: item,
          checkIn: _checkIn,
          checkOut: _checkOut,
          guests: _guests,
          session: widget.session,
        ),
      ),
    );
  }

  void _showSnack(String msg, {bool isError = false, bool isSuccess = false}) {
    if (isError) {
      AppSnackBar.error(context, msg);
    } else if (isSuccess) {
      AppSnackBar.success(context, msg);
    } else {
      AppSnackBar.info(context, msg);
    }
  }

  void _toggleLike() async {
    final session = widget.session;
    if (!session.isAuthenticated) {
      _showSnack('Sign in to save to wishlist');
      return;
    }
    setState(() => _liked = !_liked);
    try {
      if (_liked) {
        await session.addListingToWishlist(item);
        if (mounted) _showSnack('Saved to wishlist', isSuccess: true);
      } else {
        await session.removeWishlistItem((item['id'] ?? '').toString());
        if (mounted) _showSnack('Removed from wishlist', isSuccess: true);
      }
    } catch (e) {
      setState(() => _liked = !_liked);
      if (mounted) _showSnack('Could not update wishlist', isError: true);
    }
  }

  void _shareListing() {
    final title = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final location = (item['location'] ?? item['city'] ?? '').toString();
    final id = (item['id'] ?? '').toString();
    final url = 'https://merry360x.com/listing/$id';
    SharePlus.instance.share(
      ShareParams(text: '$title${location.isNotEmpty ? ' in $location' : ''}\n$url'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final images = _allImages;
    final title = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final location = (item['location'] ?? item['city'] ?? '').toString();
    final rating = (item['rating'] ?? item['average_rating'])?.toString();
    final reviewCount = item['review_count']?.toString();
    final description = (item['description'] ?? '').toString();
    final maxGuests = int.tryParse('${item['max_guests'] ?? 1}') ?? 1;
    final bedrooms = item['bedrooms']?.toString();
    final bathrooms = item['bathrooms']?.toString();
    final beds = item['beds']?.toString();
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: Colors.white,
      // ── Fixed bottom action bar ──
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(16, 12, 16, bottomPad + 10),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFEBEBEB), width: 0.5)),
        ),
        child: Row(
          children: [
            // Price
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$_currency ${_pricePerUnit.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.black),
                  ),
                  Text(_unitLabel, style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
                ],
              ),
            ),
            // Reserve button
            FilledButton(
              onPressed: _bookNow,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.rausch,
                minimumSize: const Size(0, 48),
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Reserve', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
            ),
          ],
        ),
      ),
      // ── Scrollable body ──
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // ── Image gallery with overlay buttons ──
          SizedBox(
            height: 260,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (_loading)
                  Container(color: const Color(0xFFF0F0F3))
                else
                  _GalleryView(
                    images: images,
                    onPageChanged: (i) => setState(() => _currentImage = i),
                  ),
                // Top bar: back, like, share
                Positioned(
                  top: MediaQuery.of(context).padding.top + 6,
                  left: 12,
                  right: 12,
                  child: Row(
                    children: [
                      _CircleBtn(
                        icon: Icons.arrow_back,
                        onTap: () => Navigator.pop(context),
                      ),
                      const Spacer(),
                      _CircleBtn(
                        icon: _liked ? Icons.favorite : Icons.favorite_border,
                        color: _liked ? AppColors.rausch : AppColors.black,
                        onTap: _toggleLike,
                      ),
                      const SizedBox(width: 10),
                      _CircleBtn(
                        icon: Icons.ios_share,
                        onTap: _shareListing,
                      ),
                    ],
                  ),
                ),
                // Dot indicators
                if (images.length > 1)
                  Positioned(
                    bottom: 10,
                    left: 0,
                    right: 0,
                    child: _DotIndicator(count: images.length, current: _currentImage),
                  ),
              ],
            ),
          ),

          // ── Content ──
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(10),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3CD),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Some details may be unavailable.', style: TextStyle(fontSize: 13)),
                  ),

                // Type badge
                _TypeBadge(type: itemType),
                const SizedBox(height: 8),

                // Title
                Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.black)),
                const SizedBox(height: 6),

                // Location
                if (location.isNotEmpty)
                  Row(children: [
                    const Icon(Icons.location_on_outlined, size: 16, color: AppColors.foggy),
                    const SizedBox(width: 4),
                    Expanded(child: Text(location, style: const TextStyle(fontSize: 15, color: AppColors.foggy))),
                  ]),

                // Rating
                if (rating != null && rating != 'null') ...[
                  const SizedBox(height: 8),
                  Row(children: [
                    const Icon(Icons.star, size: 16, color: AppColors.black),
                    const SizedBox(width: 4),
                    Text(rating, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    if (reviewCount != null && reviewCount != 'null') ...[
                      const SizedBox(width: 4),
                      Text('($reviewCount reviews)', style: const TextStyle(color: AppColors.foggy, fontSize: 14)),
                    ],
                  ]),
                ],

                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 16),

                // Property specs
                if (itemType == 'property') ...[
                  Wrap(spacing: 20, runSpacing: 6, children: [
                    if (beds != null && beds != 'null') _SpecChip(icon: Icons.bed_outlined, label: '$beds beds'),
                    if (bedrooms != null && bedrooms != 'null') _SpecChip(icon: Icons.door_front_door_outlined, label: '$bedrooms bedrooms'),
                    if (bathrooms != null && bathrooms != 'null') _SpecChip(icon: Icons.bathtub_outlined, label: '$bathrooms bathrooms'),
                    _SpecChip(icon: Icons.people_outline, label: 'Up to $maxGuests guests'),
                  ]),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                // Description
                if (description.isNotEmpty) ...[
                  const Text('About this place', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  _ExpandableText(text: description),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                // Amenities
                if (_amenities.isNotEmpty) ...[
                  const Text('Amenities', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 8,
                    children: _amenities.take(12).map((a) => _AmenityChip(amenity: a)).toList(),
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                if (_loadingRecommendations || _hasRecommendations) ...[
                  const Text('Recommended for your trip', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  if (_loadingRecommendations)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 18),
                      child: Center(child: CircularProgressIndicator(color: AppColors.rausch)),
                    )
                  else ...[
                    if (_recommendedTours.isNotEmpty)
                      _RecommendationRail(
                        title: 'Tours',
                        items: _recommendedTours,
                        session: widget.session,
                        initialCheckIn: _checkIn,
                        initialCheckOut: _checkOut,
                        initialGuests: _guests,
                      ),
                    if (_recommendedTourPackages.isNotEmpty)
                      _RecommendationRail(
                        title: 'Tour packages',
                        items: _recommendedTourPackages,
                        session: widget.session,
                        initialCheckIn: _checkIn,
                        initialCheckOut: _checkOut,
                        initialGuests: _guests,
                      ),
                    if (_recommendedTransport.isNotEmpty)
                      _RecommendationRail(
                        title: 'Transport',
                        items: _recommendedTransport,
                        session: widget.session,
                        initialCheckIn: _checkIn,
                        initialCheckOut: _checkOut,
                        initialGuests: _guests,
                      ),
                  ],
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                // ── Your Trip ──
                const Text('Your trip', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),

                // Dates
                GestureDetector(
                  onTap: _pickDates,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFD4D4D8)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(children: [
                      const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.black),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Dates', style: TextStyle(fontSize: 12, color: AppColors.foggy)),
                          const SizedBox(height: 2),
                          Text(
                            (_checkIn != null && _checkOut != null)
                                ? '${_fmtDate(_checkIn!)} → ${_fmtDate(_checkOut!)}'
                                : 'Select dates',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                          ),
                        ]),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.foggy),
                    ]),
                  ),
                ),

                const SizedBox(height: 10),

                // Guests
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFD4D4D8)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(children: [
                    const Icon(Icons.people_outline, size: 18, color: AppColors.black),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('Guests', style: TextStyle(fontSize: 12, color: AppColors.foggy)),
                        const SizedBox(height: 2),
                        Text('$_guests guest${_guests > 1 ? 's' : ''}',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      ]),
                    ),
                    _CounterButton(value: _guests, min: 1, max: maxGuests, onChanged: (v) => setState(() => _guests = v)),
                  ]),
                ),

                if (_nights > 0) ...[
                  const SizedBox(height: 16),
                  _PriceSummaryCard(
                    pricePerUnit: _pricePerUnit,
                    currency: _currency,
                    nights: _nights,
                    guests: _guests,
                    subtotal: _subtotal,
                    itemType: itemType,
                  ),
                ],

                const SizedBox(height: 20),

                // ── Add to Trip Cart button ──
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _addToCart,
                    icon: const Icon(Icons.luggage_outlined, size: 18),
                    label: const Text('Add to Trip Cart'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: AppColors.black),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String get _unitLabel {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return '/ person';
      case 'transport':
        return '/ day';
      default:
        return '/ night';
    }
  }

  String _fmtDate(DateTime d) => '${d.day}/${d.month}/${d.year}';
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery
// ─────────────────────────────────────────────────────────────────────────────

class _GalleryView extends StatelessWidget {
  const _GalleryView({required this.images, required this.onPageChanged});

  final List<String> images;
  final ValueChanged<int> onPageChanged;

  @override
  Widget build(BuildContext context) {
    if (images.isEmpty) {
      return Container(
        color: const Color(0xFFF0F0F3),
        child: const Center(child: Icon(Icons.image_outlined, size: 60, color: Color(0xFF8E8E98))),
      );
    }
    return PageView.builder(
      itemCount: images.length,
      onPageChanged: onPageChanged,
      itemBuilder: (context, index) {
        return Image.network(
          images[index],
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => Container(
            color: const Color(0xFFF0F0F3),
            child: const Icon(Icons.broken_image_outlined, size: 48, color: Color(0xFF8E8E98)),
          ),
        );
      },
    );
  }
}

class _DotIndicator extends StatelessWidget {
  const _DotIndicator({required this.count, required this.current});

  final int count;
  final int current;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count > 8 ? 8 : count, (i) {
        return Container(
          width: i == current ? 16.0 : 6.0,
          height: 6,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          decoration: BoxDecoration(
            color: i == current ? AppColors.rausch : const Color(0xFFD4D4D8),
            borderRadius: BorderRadius.circular(3),
          ),
        );
      }),
    );
  }
}

class _RecommendationRail extends StatelessWidget {
  const _RecommendationRail({
    required this.title,
    required this.items,
    required this.session,
    required this.initialCheckIn,
    required this.initialCheckOut,
    required this.initialGuests,
  });

  final String title;
  final List<Map<String, dynamic>> items;
  final SessionController session;
  final DateTime? initialCheckIn;
  final DateTime? initialCheckOut;
  final int initialGuests;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.black)),
        const SizedBox(height: 10),
        SizedBox(
          height: 224,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return _RecommendationCard(
                item: items[index],
                session: session,
                initialCheckIn: initialCheckIn,
                initialCheckOut: initialCheckOut,
                initialGuests: initialGuests,
              );
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({
    required this.item,
    required this.session,
    required this.initialCheckIn,
    required this.initialCheckOut,
    required this.initialGuests,
  });

  final Map<String, dynamic> item;
  final SessionController session;
  final DateTime? initialCheckIn;
  final DateTime? initialCheckOut;
  final int initialGuests;

  @override
  Widget build(BuildContext context) {
    final title = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final subtitle = _subtitle(item);
    final imageUrl = resolveListingImageUrl(item) ?? '';
    final rating = (item['rating'] ?? item['average_rating'])?.toString();

    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PropertyDetailsScreen(
            item: item,
            session: session,
            initialCheckIn: initialCheckIn,
            initialCheckOut: initialCheckOut,
            initialGuests: initialGuests,
          ),
        ),
      ),
      child: SizedBox(
        width: 220,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                height: 138,
                width: double.infinity,
                child: imageUrl.isNotEmpty
                    ? Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(
                          color: const Color(0xFFF0F0F3),
                          child: const Icon(Icons.broken_image_outlined, color: Color(0xFF8E8E98)),
                        ),
                      )
                    : Container(
                        color: const Color(0xFFF0F0F3),
                        child: const Icon(Icons.image_outlined, color: Color(0xFF8E8E98)),
                      ),
              ),
            ),
            const SizedBox(height: 10),
            _TypeBadge(type: (item['item_type'] ?? 'property').toString()),
            const SizedBox(height: 8),
            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.black),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: AppColors.foggy),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _priceLabel(item),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.black),
                  ),
                ),
                if (rating != null && rating != 'null') ...[
                  const SizedBox(width: 8),
                  const Icon(Icons.star, size: 14, color: AppColors.black),
                  const SizedBox(width: 3),
                  Text(rating, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _subtitle(Map<String, dynamic> item) {
    final type = (item['item_type'] ?? 'property').toString();
    switch (type) {
      case 'tour':
        return (item['location'] ?? item['category'] ?? 'Tour experience').toString();
      case 'tour_package':
        return (item['location'] ?? item['city'] ?? 'Tour package').toString();
      case 'transport':
        return (item['vehicle_type'] ?? item['provider_name'] ?? 'Transport').toString();
      default:
        return (item['location'] ?? item['property_type'] ?? 'Stay').toString();
    }
  }

  static String _priceLabel(Map<String, dynamic> item) {
    final currency = (item['currency'] ?? 'USD').toString();
    final type = (item['item_type'] ?? 'property').toString();
    final amount = switch (type) {
      'tour' => item['price_per_person'] ?? 0,
      'tour_package' => item['price_per_person'] ?? item['price_per_adult'] ?? 0,
      'transport' => item['price_per_day'] ?? 0,
      _ => item['price_per_night'] ?? 0,
    };
    final unit = switch (type) {
      'tour' || 'tour_package' => '/ person',
      'transport' => '/ day',
      _ => '/ night',
    };
    final parsed = double.tryParse('$amount') ?? 0;
    return '$currency ${parsed.toStringAsFixed(0)} $unit';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

class _CircleBtn extends StatelessWidget {
  const _CircleBtn({required this.icon, required this.onTap, this.color});

  final IconData icon;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: const BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Color(0x22000000), blurRadius: 6)],
        ),
        child: Icon(icon, size: 18, color: color ?? AppColors.black),
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.type});

  final String type;

  String get _label {
    switch (type) {
      case 'tour':
        return 'Tour';
      case 'tour_package':
        return 'Tour Package';
      case 'transport':
        return 'Transport';
      default:
        return 'Stay';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFFFE8E9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(_label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.rausch)),
    );
  }
}

class _SpecChip extends StatelessWidget {
  const _SpecChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: const Color(0xFF555560)),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(fontSize: 14, color: Color(0xFF222222))),
      ],
    );
  }
}

class _AmenityChip extends StatelessWidget {
  const _AmenityChip({required this.amenity});

  final String amenity;

  IconData _icon(String a) {
    final lower = a.toLowerCase();
    if (lower.contains('wifi') || lower.contains('internet')) return Icons.wifi_outlined;
    if (lower.contains('pool')) return Icons.pool_outlined;
    if (lower.contains('park')) return Icons.local_parking_outlined;
    if (lower.contains('tv') || lower.contains('television')) return Icons.tv_outlined;
    if (lower.contains('kitchen')) return Icons.kitchen_outlined;
    if (lower.contains('washer') || lower.contains('laundry')) return Icons.local_laundry_service_outlined;
    if (lower.contains('air') || lower.contains('ac')) return Icons.ac_unit_outlined;
    if (lower.contains('gym') || lower.contains('fitness')) return Icons.fitness_center_outlined;
    if (lower.contains('pet')) return Icons.pets_outlined;
    if (lower.contains('smoke')) return Icons.smoke_free_outlined;
    if (lower.contains('breakfast')) return Icons.free_breakfast_outlined;
    return Icons.check_circle_outline;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F7),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon(amenity), size: 14, color: const Color(0xFF555560)),
          const SizedBox(width: 5),
          Text(amenity, style: const TextStyle(fontSize: 13, color: Color(0xFF222222))),
        ],
      ),
    );
  }
}

class _ExpandableText extends StatefulWidget {
  const _ExpandableText({required this.text});

  final String text;

  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final shouldTruncate = widget.text.length > 300;
    final displayText = (!_expanded && shouldTruncate)
        ? '${widget.text.substring(0, 300)}...'
        : widget.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(displayText, style: const TextStyle(fontSize: 15, color: Color(0xFF444450), height: 1.5)),
        if (shouldTruncate)
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                _expanded ? 'Show less' : 'Show more',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _CounterButton extends StatelessWidget {
  const _CounterButton({
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _Btn(
          onTap: value > min ? () => onChanged(value - 1) : null,
          icon: Icons.remove,
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text('$value', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        ),
        _Btn(
          onTap: value < max ? () => onChanged(value + 1) : null,
          icon: Icons.add,
        ),
      ],
    );
  }
}

class _Btn extends StatelessWidget {
  const _Btn({this.onTap, required this.icon});

  final VoidCallback? onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: onTap == null ? const Color(0xFFDDDDDD) : const Color(0xFF888888),
          ),
        ),
        child: Icon(icon, size: 16, color: onTap == null ? const Color(0xFFDDDDDD) : const Color(0xFF222222)),
      ),
    );
  }
}

class _PriceSummaryCard extends StatelessWidget {
  const _PriceSummaryCard({
    required this.pricePerUnit,
    required this.currency,
    required this.nights,
    required this.guests,
    required this.subtotal,
    required this.itemType,
  });

  final double pricePerUnit;
  final String currency;
  final int nights;
  final int guests;
  final double subtotal;
  final String itemType;

  double get _serviceFee => subtotal * 0.05;
  double get _total => subtotal + _serviceFee;

  @override
  Widget build(BuildContext context) {
    String unitDesc;
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        unitDesc = '$currency ${pricePerUnit.toStringAsFixed(0)} × $guests guest${guests > 1 ? 's' : ''}';
      case 'transport':
        unitDesc = '$currency ${pricePerUnit.toStringAsFixed(0)} × $nights day${nights > 1 ? 's' : ''}';
      default:
        unitDesc = '$currency ${pricePerUnit.toStringAsFixed(0)} × $nights night${nights > 1 ? 's' : ''}';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F8),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Price breakdown', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 10),
          _Row(label: unitDesc, value: '$currency ${subtotal.toStringAsFixed(0)}'),
          const SizedBox(height: 6),
          _Row(label: 'Service fee (5%)', value: '$currency ${_serviceFee.toStringAsFixed(0)}'),
          const Divider(height: 18),
          _Row(
            label: 'Total',
            value: '$currency ${_total.toStringAsFixed(0)}',
            bold: true,
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value, this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final style = bold
        ? const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)
        : const TextStyle(fontSize: 14, color: Color(0xFF444450));
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(value, style: style),
      ],
    );
  }
}
