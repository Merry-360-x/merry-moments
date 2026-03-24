import 'package:flutter/material.dart';

import '../../services/mobile_api.dart';
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
  });

  final Map<String, dynamic> item;
  final SessionController session;

  @override
  State<PropertyDetailsScreen> createState() => _PropertyDetailsScreenState();
}

class _PropertyDetailsScreenState extends State<PropertyDetailsScreen> {
  final MobileApi _api = MobileApi();

  Map<String, dynamic>? _full;
  bool _loading = true;
  String? _error;

  // Booking state
  DateTime? _checkIn;
  DateTime? _checkOut;
  int _guests = 1;
  int _currentImage = 0;

  @override
  void initState() {
    super.initState();
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
      return;
    }
    try {
      final result = await _api.fetchListingById(id: id, type: type);
      setState(() {
        _full = result ?? widget.item;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _full = widget.item;
        _loading = false;
        _error = e.toString();
      });
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
            primary: Color(0xFFFF385C),
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

  Future<void> _addToCart() async {
    if (!widget.session.isAuthenticated) {
      _showSnack('Sign in to save to trip cart');
      return;
    }
    try {
      await widget.session.addListingToTripCart(item);
      if (mounted) _showSnack('Added to trip cart ✓');
    } catch (e) {
      if (mounted) _showSnack('Could not add: $e');
    }
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

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      behavior: SnackBarBehavior.floating,
    ));
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

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              // ── Image gallery SliverAppBar ──
              SliverAppBar(
                expandedHeight: 300,
                pinned: true,
                backgroundColor: Colors.white,
                foregroundColor: Colors.white,
                leading: Padding(
                  padding: const EdgeInsets.all(8),
                  child: CircleAvatar(
                    backgroundColor: Colors.white,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Color(0xFF222222), size: 20),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: _loading
                      ? Container(color: const Color(0xFFF0F0F3))
                      : _GalleryView(
                          images: images,
                          onPageChanged: (i) => setState(() => _currentImage = i),
                        ),
                ),
              ),

              SliverPadding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 160),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    if (_error != null)
                      Container(
                        padding: const EdgeInsets.all(10),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF3CD),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('Some details may be unavailable.', style: const TextStyle(fontSize: 13)),
                      ),

                    // ── Image dots ──
                    if (images.length > 1)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _DotIndicator(count: images.length, current: _currentImage),
                      ),

                    // ── Type badge ──
                    _TypeBadge(type: itemType),
                    const SizedBox(height: 8),

                    // ── Title ──
                    Text(
                      title,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Color(0xFF222222)),
                    ),
                    const SizedBox(height: 6),

                    // ── Location ──
                    if (location.isNotEmpty)
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 16, color: Color(0xFF717171)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              location,
                              style: const TextStyle(fontSize: 15, color: Color(0xFF717171)),
                            ),
                          ),
                        ],
                      ),

                    // ── Rating ──
                    if (rating != null && rating != 'null') ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.star, size: 16, color: Color(0xFF222222)),
                          const SizedBox(width: 4),
                          Text(
                            rating,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          if (reviewCount != null && reviewCount != 'null') ...[
                            const SizedBox(width: 4),
                            Text('($reviewCount reviews)', style: const TextStyle(color: Color(0xFF717171), fontSize: 14)),
                          ],
                        ],
                      ),
                    ],

                    const SizedBox(height: 16),
                    const Divider(height: 1),
                    const SizedBox(height: 16),

                    // ── Property specs ──
                    if (itemType == 'property') ...[
                      Wrap(
                        spacing: 20,
                        runSpacing: 6,
                        children: [
                          if (beds != null && beds != 'null') _SpecChip(icon: Icons.bed_outlined, label: '$beds beds'),
                          if (bedrooms != null && bedrooms != 'null') _SpecChip(icon: Icons.door_front_door_outlined, label: '$bedrooms bedrooms'),
                          if (bathrooms != null && bathrooms != 'null') _SpecChip(icon: Icons.bathtub_outlined, label: '$bathrooms bathrooms'),
                          _SpecChip(icon: Icons.people_outline, label: 'Up to $maxGuests guests'),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 16),
                    ],

                    // ── Description ──
                    if (description.isNotEmpty) ...[
                      const Text('About this place', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      _ExpandableText(text: description),
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 16),
                    ],

                    // ── Amenities ──
                    if (_amenities.isNotEmpty) ...[
                      const Text('Amenities', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 10,
                        runSpacing: 8,
                        children: _amenities
                            .take(12)
                            .map((a) => _AmenityChip(amenity: a))
                            .toList(),
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 16),
                    ],

                    // ── Date & Guests picker ──
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
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined, size: 18, color: Color(0xFF222222)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Dates', style: TextStyle(fontSize: 12, color: Color(0xFF717171))),
                                  const SizedBox(height: 2),
                                  Text(
                                    (_checkIn != null && _checkOut != null)
                                        ? '${_fmtDate(_checkIn!)} → ${_fmtDate(_checkOut!)}'
                                        : 'Select dates',
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right, color: Color(0xFF717171)),
                          ],
                        ),
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
                      child: Row(
                        children: [
                          const Icon(Icons.people_outline, size: 18, color: Color(0xFF222222)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Guests', style: TextStyle(fontSize: 12, color: Color(0xFF717171))),
                                const SizedBox(height: 2),
                                Text('$_guests guest${_guests > 1 ? 's' : ''}',
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                              ],
                            ),
                          ),
                          _CounterButton(
                            value: _guests,
                            min: 1,
                            max: maxGuests,
                            onChanged: (v) => setState(() => _guests = v),
                          ),
                        ],
                      ),
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
                  ]),
                ),
              ),
            ],
          ),

          // ── Loading overlay ──
          if (_loading)
            const Positioned(
              top: 320,
              left: 0,
              right: 0,
              child: Center(child: CircularProgressIndicator()),
            ),

          // ── Bottom action bar ──
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(
                16,
                12,
                16,
                MediaQuery.of(context).padding.bottom + 12,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE7E7EC))),
              ),
              child: Row(
                children: [
                  // Price summary
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$_currency ${_pricePerUnit.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                        Text(
                          _unitLabel,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF717171)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Add to cart
                  OutlinedButton(
                    onPressed: _addToCart,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                      side: const BorderSide(color: Color(0xFF222222)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Save', style: TextStyle(color: Color(0xFF222222), fontWeight: FontWeight.w600)),
                  ),
                  const SizedBox(width: 8),

                  // Book now
                  FilledButton(
                    onPressed: _bookNow,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFFF385C),
                      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Reserve', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  ),
                ],
              ),
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
          errorBuilder: (_, __, ___) => Container(
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
            color: i == current ? const Color(0xFFFF385C) : const Color(0xFFD4D4D8),
            borderRadius: BorderRadius.circular(3),
          ),
        );
      }),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
      child: Text(_label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFE2555A))),
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
