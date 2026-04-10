import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import 'explore_screen.dart' show resolveListingImageUrl;
import 'property_details_screen.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SearchResultsScreen
// Full-screen results page pushed by SearchScreen after tapping "Search".
// Shows all matching stays / tours / transport in tab view, and passes the
// search dates + guest count through to PropertyDetailsScreen / CheckoutScreen.
// ─────────────────────────────────────────────────────────────────────────────

class SearchResultsScreen extends StatefulWidget {
  const SearchResultsScreen({
    super.key,
    required this.query,
    required this.initialCategory, // 'accommodations' | 'tours' | 'transport'
    this.dateRange,
    this.guests = 1,
    required this.session,
  });

  final String query;
  final String initialCategory;
  final DateTimeRange? dateRange;
  final int guests;
  final SessionController session;

  @override
  State<SearchResultsScreen> createState() => _SearchResultsScreenState();
}

class _SearchResultsScreenState extends State<SearchResultsScreen>
    with SingleTickerProviderStateMixin {
  final _api = AppDatabase();

  late final TabController _tabs;

  List<Map<String, dynamic>> _stays = [];
  List<Map<String, dynamic>> _tours = [];
  List<Map<String, dynamic>> _transport = [];

  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    final initialIndex = switch (widget.initialCategory) {
      'tours' => 2,
      'transport' => 3,
      _ => 0, // 'all' or 'accommodations' → All tab
    };
    _tabs = TabController(length: 4, vsync: this, initialIndex: initialIndex);
    _fetchAll();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _fetchAll() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        _api.searchListings(query: widget.query, category: 'stays', guests: widget.guests),
        _api.searchListings(query: widget.query, category: 'tours',  guests: widget.guests),
        _api.searchListings(query: widget.query, category: 'transport', guests: widget.guests),
      ]);
      if (mounted) {
        setState(() {
          _stays     = results[0];
          _tours     = results[1];
          _transport = results[2];
          _loading   = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  List<Map<String, dynamic>> get _all => [..._stays, ..._tours, ..._transport];

  // Format the summary header line
  String get _summaryLine {
    final parts = <String>[];
    if (widget.query.isNotEmpty) parts.add(widget.query);
    final dr = widget.dateRange;
    if (dr != null) {
      parts.add(
        '${_shortDate(dr.start)} – ${_shortDate(dr.end)}',
      );
    }
    parts.add(widget.guests == 1 ? '1 guest' : '${widget.guests} guests');
    return parts.join(' · ');
  }

  static String _shortDate(DateTime d) =>
      '${_monthAbbr(d.month)} ${d.day}';

  static String _monthAbbr(int m) =>
      const ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];

  void _openDetails(Map<String, dynamic> item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PropertyDetailsScreen(
          item: item,
          session: widget.session,
          initialCheckIn: widget.dateRange?.start,
          initialCheckOut: widget.dateRange?.end,
          initialGuests: widget.guests,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final all = _all;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(112),
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Back + title row
              Padding(
                padding: EdgeInsets.fromLTRB(
                  MediaQuery.of(context).size.shortestSide >= 600 ? 28 : 4,
                  6,
                  16,
                  0,
                ),
                child: Row(
                  children: [
                    StageSafeLeadingButton(
                      color: const Color(0xFF1A1A1A),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.query.isEmpty ? 'Browse all' : widget.query,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1A1A1A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            _summaryLine,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF888888),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              // Category tabs
              TabBar(
                controller: _tabs,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                indicatorColor: AppColors.rausch,
                indicatorWeight: 2.5,
                labelColor: AppColors.rausch,
                unselectedLabelColor: const Color(0xFF888888),
                labelPadding: const EdgeInsets.symmetric(horizontal: 14),
                padding: const EdgeInsets.symmetric(horizontal: 2),
                labelStyle: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                unselectedLabelStyle: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                ),
                tabs: [
                  _CountTab(label: 'All',       count: all.length,        loading: _loading),
                  _CountTab(label: 'Stays',     count: _stays.length,     loading: _loading),
                  _CountTab(label: 'Tours',     count: _tours.length,     loading: _loading),
                  _CountTab(label: 'Transport', count: _transport.length, loading: _loading),
                ],
              ),
            ],
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.rausch))
          : _error != null
              ? _ErrorState(onRetry: _fetchAll)
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _ResultList(
                      items: all,
                      onTap: _openDetails,
                      emptyLabel: 'No results found',
                    ),
                    _ResultList(
                      items: _stays,
                      onTap: _openDetails,
                      emptyLabel: 'No stays found',
                    ),
                    _ResultList(
                      items: _tours,
                      onTap: _openDetails,
                      emptyLabel: 'No tours found',
                    ),
                    _ResultList(
                      items: _transport,
                      onTap: _openDetails,
                      emptyLabel: 'No transport found',
                    ),
                  ],
                ),
    );
  }
}

// ── Tab label with count badge ──────────────────────────────────────────────

class _CountTab extends StatelessWidget {
  const _CountTab({
    required this.label,
    required this.count,
    required this.loading,
  });
  final String label;
  final int count;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Tab(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          if (!loading && count > 0) ...[
            const SizedBox(width: 5),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: AppColors.rausch.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '$count',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Scrollable result list ───────────────────────────────────────────────────

class _ResultList extends StatelessWidget {
  const _ResultList({
    required this.items,
    required this.onTap,
    required this.emptyLabel,
  });
  final List<Map<String, dynamic>> items;
  final void Function(Map<String, dynamic>) onTap;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off, size: 52, color: Color(0xFFCCCCCC)),
            const SizedBox(height: 12),
            Text(
              emptyLabel,
              style: const TextStyle(fontSize: 15, color: Color(0xFF999999)),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: () async {},          // parent handles; this just gives pull-to-refresh UX
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        itemCount: items.length,
        itemBuilder: (ctx, i) {
          final item = items[i];
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _ResultCard(item: item, onTap: () => onTap(item)),
          );
        },
      ),
    );
  }
}

// ── Single result card ───────────────────────────────────────────────────────

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.item, required this.onTap});
  final Map<String, dynamic> item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final title    = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final location = (item['location'] ?? item['city']    ?? '').toString();
    final type     = (item['item_type'] ?? 'property').toString();
    final imageUrl = resolveListingImageUrl(item) ?? '';
    final price    = _priceLabel(item);
    final rating   = (item['rating'] ?? item['average_rating'])?.toString();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEAEAEA)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: imageUrl.isNotEmpty
                    ? Image.network(
                        imageUrl,
                        height: 104,
                        width: 104,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const _HorizontalPlaceholderImage(size: 104),
                      )
                    : const _HorizontalPlaceholderImage(size: 104),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 104,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _typeColor(type).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _typeLabel(type),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: _typeColor(type),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A1A),
                          height: 1.15,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (location.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          location,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF888888)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const Spacer(),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: Text(
                              price,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF1A1A1A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (rating != null && rating != 'null' && rating.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            const Icon(Icons.star, size: 13, color: Color(0xFFF5A623)),
                            const SizedBox(width: 3),
                            Text(
                              double.tryParse(rating) != null
                                  ? double.parse(rating).toStringAsFixed(1)
                                  : rating,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF444444),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _priceLabel(Map<String, dynamic> item) {
    final currency = (item['currency'] ?? 'RWF').toString();
    final n = item['price_per_night'] ?? item['price_per_person'] ??
              item['price_per_adult'] ?? item['price_per_day'] ?? 0;
    final amount = (n is num ? n : num.tryParse(n.toString()) ?? 0).toInt();
    final suffix = _priceSuffix(item);
    return '$currency ${_formatNum(amount)}$suffix';
  }

  static String _priceSuffix(Map<String, dynamic> item) {
    if (item['price_per_night'] != null) return '/night';
    if (item['price_per_person'] != null || item['price_per_adult'] != null) return '/person';
    if (item['price_per_day'] != null) return '/day';
    return '';
  }

  static String _formatNum(int n) {
    if (n >= 1000) {
      return n.toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]},',
      );
    }
    return n.toString();
  }

  static String _typeLabel(String type) => switch (type) {
    'property'      => 'Stay',
    'tour'          => 'Tour',
    'tour_package'  => 'Package',
    'transport'     => 'Transport',
    _               => 'Listing',
  };

  static Color _typeColor(String type) => switch (type) {
    'property'      => const Color(0xFF00A699),
    'tour'          => const Color(0xFFFF5A5F),
    'tour_package'  => const Color(0xFFFFB400),
    'transport'     => const Color(0xFF007AFF),
    _               => const Color(0xFF888888),
  };
}

class _HorizontalPlaceholderImage extends StatelessWidget {
  const _HorizontalPlaceholderImage({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: size,
      width: size,
      color: const Color(0xFFF0F0F0),
      child: const Icon(Icons.image_not_supported_outlined, size: 28, color: Color(0xFFCCCCCC)),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded, size: 52, color: Color(0xFFCCCCCC)),
          const SizedBox(height: 12),
          const Text(
            'Could not load results',
            style: TextStyle(fontSize: 15, color: Color(0xFF999999)),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry', style: TextStyle(color: AppColors.rausch)),
          ),
        ],
      ),
    );
  }
}
