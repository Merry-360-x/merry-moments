import 'package:flutter/material.dart';

import '../../app.dart';

import '../../services/app_database.dart';
import '../../session_controller.dart';
import 'explore_screen.dart' show resolveListingImageUrl;

class _RegionCount {
  const _RegionCount({
    required this.region,
    required this.count,
    required this.share,
  });
  final String region;
  final int count;
  final double share;
}

class _BookingAnalyticsSummary {
  const _BookingAnalyticsSummary({
    required this.total,
    required this.confirmedOrCompleted,
    required this.paid,
    required this.regionBreakdown,
  });

  final int total;
  final int confirmedOrCompleted;
  final int paid;
  final List<_RegionCount> regionBreakdown;
}

const List<Color> _regionPalette = [
  Color(0xFF2563EB),
  Color(0xFF06B6D4),
  Color(0xFFF97316),
  Color(0xFF22C55E),
  Color(0xFFEAB308),
  Color(0xFFEF4444),
];

const Map<String, String> _africanBookingCountryByCode = {
  '250': 'Rwanda',
  '254': 'Kenya',
  '256': 'Uganda',
  '260': 'Zambia',
  '255': 'Tanzania',
  '233': 'Ghana',
  '243': 'DR Congo',
  '237': 'Cameroon',
  '221': 'Senegal',
  '225': 'Ivory Coast',
  '258': 'Mozambique',
  '265': 'Malawi',
  '257': 'Burundi',
  '242': 'Congo',
};

String? _extractPhoneCountryCode(String? phone) {
  final digits = (phone ?? '').replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return null;
  final prefixes = _africanBookingCountryByCode.keys.toList()
    ..sort((a, b) => b.length.compareTo(a.length));
  for (final prefix in prefixes) {
    if (digits.startsWith(prefix)) return prefix;
  }
  return null;
}

String _bookingRegionLabel(Map<String, dynamic> booking) {
  final rawPhone =
      (booking['guest_phone'] ?? booking['phone'] ?? booking['guestPhone'])
          ?.toString();
  final code = _extractPhoneCountryCode(rawPhone);
  if (code == null) return 'Outside Africa / Unknown';
  return _africanBookingCountryByCode[code] ?? 'Outside Africa / Unknown';
}

_BookingAnalyticsSummary _computeBookingAnalytics(
  List<Map<String, dynamic>> bookings,
) {
  int confirmedOrCompleted = 0;
  int paid = 0;
  final regionCounts = <String, int>{};

  for (final booking in bookings) {
    final status = (booking['status'] ?? '').toString().toLowerCase();
    final paymentStatus = (booking['payment_status'] ?? '')
        .toString()
        .toLowerCase();

    if (status == 'confirmed' || status == 'completed') {
      confirmedOrCompleted += 1;
    }
    if (paymentStatus == 'paid') {
      paid += 1;
    }

    final region = _bookingRegionLabel(booking);
    regionCounts.update(region, (v) => v + 1, ifAbsent: () => 1);
  }

  final total = bookings.length;
  final regionBreakdown =
      regionCounts.entries
          .map(
            (entry) => _RegionCount(
              region: entry.key,
              count: entry.value,
              share: total > 0 ? (entry.value / total) * 100 : 0,
            ),
          )
          .toList()
        ..sort((a, b) => b.count.compareTo(a.count));

  return _BookingAnalyticsSummary(
    total: total,
    confirmedOrCompleted: confirmedOrCompleted,
    paid: paid,
    regionBreakdown: regionBreakdown,
  );
}

String _fmtNum(double v) {
  if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
  if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
  return v.toStringAsFixed(0);
}

// ─── Shared widgets ───────────────────────────────────────────────────────────

class _RegionDistributionBars extends StatelessWidget {
  const _RegionDistributionBars({required this.regions, this.maxItems = 4});
  final List<_RegionCount> regions;
  final int maxItems;

  @override
  Widget build(BuildContext context) {
    final items = regions.take(maxItems).toList();
    if (items.isEmpty) {
      return const Text(
        'No region data yet.',
        style: TextStyle(fontSize: 11, color: AppColors.foggy),
      );
    }
    return Column(
      children: [
        for (var i = 0; i < items.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _regionPalette[i % _regionPalette.length],
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        items[i].region,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.black,
                        ),
                      ),
                    ),
                    Text(
                      '${items[i].count} (${items[i].share.toStringAsFixed(1)}%)',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.foggy,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    height: 7,
                    color: AppColors.border.withValues(alpha: 0.75),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: (items[i].share / 100).clamp(0.0, 1.0),
                      child: Container(
                        color: _regionPalette[i % _regionPalette.length],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _AdminStatCard extends StatelessWidget {
  const _AdminStatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 17, color: color),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.black,
            ),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: AppColors.foggy),
          ),
        ],
      ),
    );
  }
}

class _FinanceRow extends StatelessWidget {
  const _FinanceRow({
    required this.label,
    required this.value,
    this.isBold = false,
    this.color,
  });
  final String label;
  final String value;
  final bool isBold;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: isBold ? AppColors.black : AppColors.hof,
                fontWeight: isBold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: color ?? AppColors.black,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: child,
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge(this.status);
  final String status;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final neutralBg = isDark
        ? const Color(0xFF000000)
        : const Color(0xFFEEEEEE);
    final neutralFg = isDark
        ? const Color(0xFFD5DAE3)
        : const Color(0xFF757575);
    final fallbackBg = isDark
      ? const Color(0xFF000000)
        : const Color(0xFFF5F5F5);
    final fallbackFg = isDark
        ? const Color(0xFFC8D0DF)
        : const Color(0xFF5B6475);
    final s = status.toLowerCase();
    final (bg, fg) = switch (s) {
      'confirmed' => (const Color(0xFFE8F5E9), const Color(0xFF2E7D32)),
      'completed' => (const Color(0xFFE3F2FD), const Color(0xFF1565C0)),
      'cancelled' => (const Color(0xFFFFEBEE), AppColors.rausch),
      'pending' => (const Color(0xFFFFF8E1), const Color(0xFFF57F17)),
      'paid' => (const Color(0xFFE8F5E9), const Color(0xFF2E7D32)),
      'approved' => (const Color(0xFFE8F5E9), const Color(0xFF2E7D32)),
      'rejected' => (const Color(0xFFFFEBEE), AppColors.rausch),
      'open' => (const Color(0xFFFFF8E1), const Color(0xFFF57F17)),
      'closed' => (neutralBg, neutralFg),
      'processing' => (const Color(0xFFE8EAF6), const Color(0xFF3949AB)),
      'high' => (const Color(0xFFFFEBEE), AppColors.rausch),
      'low' => (neutralBg, neutralFg),
      _ => (fallbackBg, fallbackFg),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: TextStyle(fontSize: 10, color: fg, fontWeight: FontWeight.w600),
      ),
    );
  }
}

Widget _sectionTitle(String title) => Padding(
  padding: const EdgeInsets.only(bottom: 10),
  child: Text(
    title,
    style: const TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: AppColors.black,
    ),
  ),
);

InputDecoration _inputDeco(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: const TextStyle(fontSize: 13, color: AppColors.foggy),
  filled: true,
  fillColor: AppColors.surfaceSubtle,
  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
  border: OutlineInputBorder(
    borderRadius: BorderRadius.circular(10),
    borderSide: const BorderSide(color: AppColors.border),
  ),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(10),
    borderSide: const BorderSide(color: AppColors.border),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(10),
    borderSide: const BorderSide(color: AppColors.rausch, width: 1.5),
  ),
);

Future<void> _confirmDeleteListing(
  BuildContext context, {
  required String title,
  required Future<void> Function() onDelete,
}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (dCtx) => AlertDialog(
      title: const Text('Delete listing?'),
      content: Text('Delete "$title" permanently? This cannot be undone.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dCtx, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.rausch),
          onPressed: () => Navigator.pop(dCtx, true),
          child: const Text('Delete'),
        ),
      ],
    ),
  );
  if (ok == true) {
    await onDelete();
  }
}

class _AdminListingCard extends StatelessWidget {
  const _AdminListingCard({
    required this.item,
    required this.hostName,
    required this.location,
    required this.price,
    required this.rating,
    required this.isPublished,
    required this.onToggle,
    required this.onDelete,
  });

  final Map<String, dynamic> item;
  final String hostName;
  final String location;
  final String price;
  final String rating;
  final bool isPublished;
  final Future<void> Function() onToggle;
  final Future<void> Function() onDelete;

  @override
  Widget build(BuildContext context) {
    final imageUrl = resolveListingImageUrl(item);
    final title = (item['title'] ?? 'Listing').toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 68,
                  height: 68,
                  color: AppColors.surfaceSubtle,
                  child: imageUrl == null
                      ? const Icon(Icons.image_outlined, color: AppColors.foggy)
                      : Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const Icon(
                            Icons.broken_image_outlined,
                            color: AppColors.foggy,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: AppColors.black,
                      ),
                    ),
                    if (hostName.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        hostName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.hof,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    if (location.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        location,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.foggy,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            price,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.black,
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.star_rounded,
                          size: 14,
                          color: Color(0xFFFFB800),
                        ),
                        const SizedBox(width: 2),
                        Text(
                          rating,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.hof,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _StatusBadge(isPublished ? 'Live' : 'Hidden'),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onToggle,
                  icon: Icon(
                    isPublished
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    size: 16,
                  ),
                  label: Text(isPublished ? 'Unpublish' : 'Publish'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.black,
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _confirmDeleteListing(
                    context,
                    title: title,
                    onDelete: onDelete,
                  ),
                  icon: const Icon(Icons.delete_outline, size: 16),
                  label: const Text('Delete'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.rausch,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Main screen ─────────────────────────────────────────────────────────────

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  final _api = AppDatabase();
  late TabController _tabs;
  static const _tabCount = 14;

  Map<String, dynamic>? _enhancedStats;
  List<Map<String, dynamic>> _bookings = [];
  List<Map<String, dynamic>> _applications = [];
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _properties = [];
  List<Map<String, dynamic>> _tours = [];
  List<Map<String, dynamic>> _transport = [];
  List<Map<String, dynamic>> _payouts = [];
  List<Map<String, dynamic>> _banners = [];
  List<Map<String, dynamic>> _reviews = [];
  List<Map<String, dynamic>> _support = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _tabCount, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.fetchAdminEnhancedStats(),
        _api.fetchAllBookingsAdmin(limit: 200),
        _api.fetchHostApplications(),
        _api.fetchAdminAllUsers(),
        _api.fetchAdminProperties(),
        _api.fetchAdminAllTours(),
        _api.fetchAdminTransportVehicles(),
        _api.fetchAdminPayouts(),
        _api.fetchAdminBanners(),
        _api.fetchReviews(limit: 50),
        _api.fetchAdminSupportTickets(),
      ]);
      if (!mounted) return;
      setState(() {
        _enhancedStats = results[0] as Map<String, dynamic>;
        _bookings = results[1] as List<Map<String, dynamic>>;
        _applications = results[2] as List<Map<String, dynamic>>;
        _users = results[3] as List<Map<String, dynamic>>;
        _properties = results[4] as List<Map<String, dynamic>>;
        _tours = results[5] as List<Map<String, dynamic>>;
        _transport = results[6] as List<Map<String, dynamic>>;
        _payouts = results[7] as List<Map<String, dynamic>>;
        _banners = results[8] as List<Map<String, dynamic>>;
        _reviews = results[9] as List<Map<String, dynamic>>;
        _support = results[10] as List<Map<String, dynamic>>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _pendingApps =>
      _applications.where((a) => (a['status'] ?? '') == 'pending').length;
  int get _pendingPayouts =>
      _payouts.where((p) => (p['status'] ?? '') == 'pending').length;
  Map<String, Map<String, dynamic>> get _userLookup => {
    for (final user in _users) (user['user_id'] ?? '').toString(): user,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.linnen,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: const Text(
          'Admin Dashboard',
          style: TextStyle(
            color: AppColors.black,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined, color: AppColors.foggy),
            onPressed: _load,
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          indicatorColor: AppColors.rausch,
          labelColor: AppColors.rausch,
          unselectedLabelColor: AppColors.foggy,
          dividerColor: AppColors.border,
          labelStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
          tabs: [
            const Tab(text: 'Overview'),
            const Tab(text: 'Ads'),
            Tab(text: _pendingApps > 0 ? 'Hosts ($_pendingApps)' : 'Hosts'),
            const Tab(text: 'Users'),
            const Tab(text: 'Stays'),
            const Tab(text: 'Tours'),
            const Tab(text: 'Transport'),
            const Tab(text: 'Bookings'),
            const Tab(text: 'Calc'),
            const Tab(text: 'Payments'),
            Tab(
              text: _pendingPayouts > 0
                  ? 'Payouts ($_pendingPayouts)'
                  : 'Payouts',
            ),
            const Tab(text: 'Reviews'),
            const Tab(text: 'Support'),
            const Tab(text: 'Notify'),
          ],
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.rausch),
            )
          : TabBarView(
              controller: _tabs,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _AdminOverviewTab(
                  stats: _enhancedStats ?? {},
                  bookings: _bookings,
                ),
                _AdminAdsTab(banners: _banners, api: _api, onRefresh: _load),
                _AdminHostsTab(
                  applications: _applications,
                  api: _api,
                  onRefresh: _load,
                ),
                _AdminUsersTab(users: _users, api: _api, onRefresh: _load),
                _AdminStaysTab(
                  properties: _properties,
                  usersById: _userLookup,
                  api: _api,
                  onRefresh: _load,
                ),
                _AdminToursTab(
                  tours: _tours,
                  usersById: _userLookup,
                  api: _api,
                  onRefresh: _load,
                ),
                _AdminTransportTab(
                  transport: _transport,
                  usersById: _userLookup,
                  api: _api,
                  onRefresh: _load,
                ),
                _AdminBookingsTab(bookings: _bookings),
                _AdminBookingCalcTab(bookings: _bookings),
                _AdminPaymentsTab(
                  stats: _enhancedStats ?? {},
                  bookings: _bookings,
                ),
                _AdminPayoutsTab(
                  payouts: _payouts,
                  api: _api,
                  onRefresh: _load,
                ),
                _AdminReviewsTab(
                  reviews: _reviews,
                  api: _api,
                  onRefresh: _load,
                ),
                _AdminSupportTab(
                  tickets: _support,
                  api: _api,
                  onRefresh: _load,
                ),
                _AdminNotifyTab(api: _api),
              ],
            ),
    );
  }
}

// ─── Tab 0: Overview ─────────────────────────────────────────────────────────

class _AdminOverviewTab extends StatelessWidget {
  const _AdminOverviewTab({
    required this.stats,
    required this.bookings,
  });

  final Map<String, dynamic> stats;
  final List<Map<String, dynamic>> bookings;

  double _num(String key) {
    return (stats[key] as num?)?.toDouble() ?? 0;
  }

  String _fc(String key) {
    return _fmtNum(_num(key));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final analytics = _computeBookingAnalytics(bookings);

    final revByCurrency = <String, double>{};
    final rawRevenueByCurrency = stats['revenue_by_currency'];
    if (rawRevenueByCurrency is Map) {
      for (final entry in rawRevenueByCurrency.entries) {
        revByCurrency[entry.key.toString()] =
            (entry.value as num?)?.toDouble() ?? 0;
      }
    }

    final totalUsers = (stats['total_users'] as num?)?.toInt() ?? 0;
    final totalBookings = (stats['total_bookings'] as num?)?.toInt() ?? 0;
    final pendingBookings = (stats['pending_bookings'] as num?)?.toInt() ?? 0;
    final totalProperties = (stats['total_properties'] as num?)?.toInt() ?? 0;
    final publishedProperties =
        (stats['published_properties'] as num?)?.toInt() ?? 0;
    final pendingHosts = (stats['pending_applications'] as num?)?.toInt() ?? 0;

    final totalRevenue = _num('total_revenue');
    final netRevenue = _num('net_revenue');
    final hostEarnings = _num('total_host_earnings');
    final platformEarnings = _num('total_platform_earnings');
    final pawaPayFees = _num('total_pawapay_fees');

    final topRegion = analytics.regionBreakdown.isEmpty
        ? null
        : analytics.regionBreakdown.first;

    final screenWidth = MediaQuery.sizeOf(context).width;
    final metricColumns = screenWidth >= 900 ? 4 : 2;
    final metricGap = 10.0;
    final metricCardWidth =
        (screenWidth - 32 - (metricGap * (metricColumns - 1))) / metricColumns;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isDark
                    ? const Color(0xFF2E2E2E)
                    : const Color(0xFFDDE5FF),
              ),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? const [Color(0xFF000000), Color(0xFF000000)]
                    : const [Color(0xFFF7F9FF), Color(0xFFEEF3FF)],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.rausch,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Revenue Ledger',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.black,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '$totalBookings bookings',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.foggy,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  'RWF ${_fmtNum(netRevenue)}',
                  style: const TextStyle(
                    fontSize: 34,
                    height: 0.95,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Net received after payment fees',
                  style: TextStyle(fontSize: 12, color: AppColors.hof),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: _heroMetric(
                        label: 'Platform',
                        value: 'RWF ${_fmtNum(platformEarnings)}',
                        valueColor: const Color(0xFF059669),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _heroMetric(
                        label: 'PawaPay',
                        value: 'RWF ${_fmtNum(pawaPayFees)}',
                        valueColor: AppColors.rausch,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _heroMetric(
                        label: 'Host payout',
                        value: 'RWF ${_fmtNum(hostEarnings)}',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: metricGap,
            runSpacing: metricGap,
            children: [
              SizedBox(
                width: metricCardWidth,
                child: _quickMetricCard(
                  icon: Icons.people_alt_outlined,
                  label: 'Users',
                  value: '$totalUsers',
                  accent: const Color(0xFF2563EB),
                ),
              ),
              SizedBox(
                width: metricCardWidth,
                child: _quickMetricCard(
                  icon: Icons.luggage_outlined,
                  label: 'Pending Bookings',
                  value: '$pendingBookings',
                  caption: '$totalBookings total',
                  accent: const Color(0xFF0EA5E9),
                ),
              ),
              SizedBox(
                width: metricCardWidth,
                child: _quickMetricCard(
                  icon: Icons.home_outlined,
                  label: 'Live Properties',
                  value: '$publishedProperties',
                  caption: '$totalProperties total',
                  accent: const Color(0xFF7C3AED),
                ),
              ),
              SizedBox(
                width: metricCardWidth,
                child: _quickMetricCard(
                  icon: Icons.pending_actions_outlined,
                  label: 'Pending Hosts',
                  value: '$pendingHosts',
                  accent: AppColors.rausch,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _overviewSection(
            title: 'Revenue Structure',
            subtitle: 'Simple split between gross, fees, and net received',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ledgerRow(
                  label: 'Gross Revenue',
                  value: 'RWF ${_fmtNum(totalRevenue)}',
                  emphasize: true,
                ),
                _ledgerRow(
                  label: 'Guest Fee',
                  value: 'RWF ${_fc('total_guest_fee')}',
                  valueColor: const Color(0xFF059669),
                ),
                _ledgerRow(
                  label: 'Host Fee',
                  value: 'RWF ${_fc('total_host_fee')}',
                  valueColor: const Color(0xFF059669),
                ),
                _ledgerRow(
                  label: 'Platform Earnings',
                  value: 'RWF ${_fc('total_platform_earnings')}',
                  valueColor: const Color(0xFF0284C7),
                ),
                _ledgerRow(
                  label: 'PawaPay Fees (3.1%)',
                  value: 'RWF ${_fc('total_pawapay_fees')}',
                  valueColor: AppColors.rausch,
                ),
                const Divider(height: 18),
                _ledgerRow(
                  label: 'Net Received',
                  value: 'RWF ${_fc('net_revenue')}',
                  emphasize: true,
                ),
              ],
            ),
          ),
          if (revByCurrency.isNotEmpty)
            _overviewSection(
              title: 'Currency Split',
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: revByCurrency.entries.map((e) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      '${e.key} ${_fmtNum(e.value)}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.black,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          _overviewSection(
            title: 'Regional Demand',
            subtitle: topRegion == null
                ? 'No booking region data yet'
                : 'Top market: ${topRegion.region} (${topRegion.share.toStringAsFixed(1)}%)',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LayoutBuilder(
                  builder: (context, constraints) {
                    final chipWidth = (constraints.maxWidth - 16) / 3;
                    return Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        SizedBox(
                          width: chipWidth,
                          child: _statChip(
                            label: 'Total',
                            value: '${analytics.total}',
                          ),
                        ),
                        SizedBox(
                          width: chipWidth,
                          child: _statChip(
                            label: 'Confirmed',
                            value: '${analytics.confirmedOrCompleted}',
                          ),
                        ),
                        SizedBox(
                          width: chipWidth,
                          child: _statChip(
                            label: 'Paid',
                            value: '${analytics.paid}',
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 12),
                _RegionDistributionBars(
                  regions: analytics.regionBreakdown,
                  maxItems: 5,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroMetric({
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.foggy,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: valueColor ?? AppColors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _quickMetricCard({
    required IconData icon,
    required String label,
    required String value,
    required Color accent,
    String? caption,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 15, color: accent),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              height: 1,
              fontWeight: FontWeight.w900,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.hof,
            ),
          ),
          if (caption != null)
            Text(
              caption,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10, color: AppColors.foggy),
            ),
        ],
      ),
    );
  }

  Widget _overviewSection({
    required String title,
    String? subtitle,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppColors.black,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 11, color: AppColors.foggy),
            ),
          ],
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _ledgerRow({
    required String label,
    required String value,
    bool emphasize = false,
    Color? valueColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: emphasize ? 13 : 12,
                fontWeight: emphasize ? FontWeight.w700 : FontWeight.w500,
                color: emphasize ? AppColors.black : AppColors.hof,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: emphasize ? 14 : 12,
              fontWeight: FontWeight.w800,
              color: valueColor ?? AppColors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statChip({
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        color: AppColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.foggy,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: valueColor ?? AppColors.black,
            ),
          ),
        ],
      ),
    );
  }
}
// ─── Tab 1: Ads ───────────────────────────────────────────────────────────────

class _AdminAdsTab extends StatefulWidget {
  const _AdminAdsTab({
    required this.banners,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> banners;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  State<_AdminAdsTab> createState() => _AdminAdsTabState();
}

class _AdminAdsTabState extends State<_AdminAdsTab> {
  final _msgCtrl = TextEditingController();
  final _ctaLabelCtrl = TextEditingController();
  final _ctaUrlCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _msgCtrl.dispose();
    _ctaLabelCtrl.dispose();
    _ctaUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    if (_msgCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    await widget.api.createAdBanner(
      message: _msgCtrl.text.trim(),
      ctaLabel: _ctaLabelCtrl.text.trim(),
      ctaUrl: _ctaUrlCtrl.text.trim(),
    );
    _msgCtrl.clear();
    _ctaLabelCtrl.clear();
    _ctaUrlCtrl.clear();
    setState(() => _saving = false);
    widget.onRefresh();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionTitle('New Banner'),
              const Text(
                'Banners rotate above the header every 5 seconds.',
                style: TextStyle(fontSize: 11, color: AppColors.foggy),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _msgCtrl,
                decoration: _inputDeco('Banner message *'),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _ctaLabelCtrl,
                      decoration: _inputDeco('CTA label (opt.)'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _ctaUrlCtrl,
                      decoration: _inputDeco('CTA URL (opt.)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _create,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.rausch,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Add Banner',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ),
        ),
        if (widget.banners.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: Text(
                'No banners yet',
                style: TextStyle(color: AppColors.foggy),
              ),
            ),
          )
        else ...[
          _sectionTitle('Active Banners'),
          ...widget.banners.map(
            (b) => _SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          b['message']?.toString() ?? '',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.black,
                          ),
                        ),
                      ),
                      Switch.adaptive(
                        value: b['is_active'] == true,
                        activeThumbColor: AppColors.rausch,
                        activeTrackColor: AppColors.rausch.withValues(
                          alpha: 0.5,
                        ),
                        onChanged: (v) async {
                          await widget.api.updateAdBannerActive(
                            id: b['id'].toString(),
                            isActive: v,
                          );
                          widget.onRefresh();
                        },
                      ),
                    ],
                  ),
                  if ((b['cta_label'] ?? '').toString().isNotEmpty)
                    Text(
                      'CTA: ${b['cta_label']}  →  ${b['cta_url'] ?? ''}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.foggy,
                      ),
                    ),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () async {
                        await widget.api.deleteAdBanner(id: b['id'].toString());
                        widget.onRefresh();
                      },
                      icon: const Icon(
                        Icons.delete_outline,
                        size: 15,
                        color: AppColors.rausch,
                      ),
                      label: const Text(
                        'Delete',
                        style: TextStyle(color: AppColors.rausch, fontSize: 12),
                      ),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ─── Tab 2: Hosts ─────────────────────────────────────────────────────────────

class _AdminHostsTab extends StatelessWidget {
  const _AdminHostsTab({
    required this.applications,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> applications;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final pending = applications
        .where((a) => (a['status'] ?? '') == 'pending')
        .toList();
    final others = applications
        .where((a) => (a['status'] ?? '') != 'pending')
        .toList();
    final all = [...pending, ...others];

    if (all.isEmpty) {
      return const Center(
        child: Text(
          'No applications',
          style: TextStyle(color: AppColors.foggy),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: all.length,
      itemBuilder: (_, i) {
        final app = all[i];
        final status = (app['status'] ?? 'pending').toString();
        final name = (app['full_name'] ?? app['business_name'] ?? 'Applicant')
            .toString();
        final phone = (app['phone'] ?? '').toString();
        final services = (app['service_types'] as List?)?.join(', ') ?? '';
        final isPending = status == 'pending';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: isPending
                ? Border.all(color: const Color(0xFFFFCC02), width: 1.5)
                : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: AppColors.black,
                      ),
                    ),
                  ),
                  _StatusBadge(status),
                ],
              ),
              if (phone.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  phone,
                  style: const TextStyle(fontSize: 11, color: AppColors.foggy),
                ),
              ],
              if (services.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  services,
                  style: const TextStyle(fontSize: 11, color: AppColors.hof),
                ),
              ],
              if (isPending) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          await api.updateHostApplication(
                            id: app['id'].toString(),
                            status: 'rejected',
                          );
                          onRefresh();
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.rausch,
                          side: const BorderSide(color: AppColors.rausch),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        child: const Text(
                          'Reject',
                          style: TextStyle(fontSize: 13),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          await api.updateHostApplication(
                            id: app['id'].toString(),
                            status: 'approved',
                          );
                          onRefresh();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4CAF50),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        child: const Text(
                          'Approve',
                          style: TextStyle(fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

// ─── Tab 3: Users ─────────────────────────────────────────────────────────────

class _AdminUsersTab extends StatefulWidget {
  const _AdminUsersTab({
    required this.users,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> users;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  State<_AdminUsersTab> createState() => _AdminUsersTabState();
}

class _AdminUsersTabState extends State<_AdminUsersTab> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final filtered = _q.isEmpty
        ? widget.users
        : widget.users.where((u) {
            final name = (u['full_name'] ?? '').toString().toLowerCase();
            final email = (u['email'] ?? '').toString().toLowerCase();
            return name.contains(_q.toLowerCase()) ||
                email.contains(_q.toLowerCase());
          }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            onChanged: (v) => setState(() => _q = v),
            decoration: _inputDeco('Search by name or email...'),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Text(
                    'No users found',
                    style: TextStyle(color: AppColors.foggy),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final u = filtered[i];
                    final name = (u['full_name'] ?? 'User').toString();
                    final email = (u['email'] ?? '').toString();
                    final isSuspended = u['is_suspended'] == true;
                    final isVerified = u['is_verified'] == true;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: isSuspended
                            ? Border.all(
                                color: AppColors.rausch.withValues(alpha: 0.35),
                              )
                            : null,
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: AppColors.surfaceSubtle,
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : '?',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13,
                                          color: AppColors.black,
                                        ),
                                      ),
                                    ),
                                    if (isVerified) ...[
                                      const SizedBox(width: 3),
                                      const Icon(
                                        Icons.verified,
                                        size: 13,
                                        color: Color(0xFF1565C0),
                                      ),
                                    ],
                                  ],
                                ),
                                if (email.isNotEmpty)
                                  Text(
                                    email,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.foggy,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () async {
                              await widget.api.suspendUser(
                                userId: u['user_id'].toString(),
                                suspended: !isSuspended,
                              );
                              widget.onRefresh();
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: isSuspended
                                    ? const Color(0xFFFFEBEE)
                                    : AppColors.surfaceSubtle,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isSuspended ? 'Unsuspend' : 'Suspend',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isSuspended
                                      ? AppColors.rausch
                                      : AppColors.foggy,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

// ─── Tab 4: Stays ─────────────────────────────────────────────────────────────

class _AdminStaysTab extends StatelessWidget {
  const _AdminStaysTab({
    required this.properties,
    required this.usersById,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> properties;
  final Map<String, Map<String, dynamic>> usersById;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    if (properties.isEmpty) {
      return const Center(
        child: Text('No properties', style: TextStyle(color: AppColors.foggy)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: properties.length,
      itemBuilder: (_, i) {
        final p = properties[i];
        final location = (p['location'] ?? '').toString();
        final price = (p['price_per_night'] as num?)?.toDouble() ?? 0;
        final currency = (p['currency'] ?? 'RWF').toString();
        final isPublished = p['is_published'] == true;
        final hostId = (p['host_id'] ?? '').toString();
        final host = usersById[hostId];
        final hostName = (host?['full_name'] ?? '').toString();
        final ratingValue = (p['rating'] as num?)?.toDouble();
        return _AdminListingCard(
          item: p,
          hostName: hostName,
          location: location,
          price: '$currency ${price.toStringAsFixed(0)}/night',
          rating: ratingValue == null || ratingValue <= 0
              ? '-'
              : ratingValue.toStringAsFixed(1),
          isPublished: isPublished,
          onToggle: () async {
            await api.toggleListingPublished(
              table: 'properties',
              id: p['id'].toString(),
              published: !isPublished,
            );
            onRefresh();
          },
          onDelete: () async {
            await api.deleteProperty(id: p['id'].toString());
            onRefresh();
          },
        );
      },
    );
  }
}

// ─── Tab 5: Tours ─────────────────────────────────────────────────────────────

class _AdminToursTab extends StatelessWidget {
  const _AdminToursTab({
    required this.tours,
    required this.usersById,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> tours;
  final Map<String, Map<String, dynamic>> usersById;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    if (tours.isEmpty) {
      return const Center(
        child: Text('No tours', style: TextStyle(color: AppColors.foggy)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tours.length,
      itemBuilder: (_, i) {
        final t = tours[i];
        final location = (t['location'] ?? t['city'] ?? t['country'] ?? '')
            .toString();
        final table = (t['_table'] ?? 'tours').toString();
        final price = (t['price_per_person'] as num?)?.toDouble() ?? 0;
        final currency = (t['currency'] ?? 'RWF').toString();
        final isPublished = t['is_published'] == true;
        final hostId = (t['host_id'] ?? t['created_by'] ?? '').toString();
        final host = usersById[hostId];
        final hostName = (host?['full_name'] ?? '').toString();
        final ratingValue = (t['rating'] as num?)?.toDouble();
        return _AdminListingCard(
          item: t,
          hostName: hostName,
          location: location,
          price: price > 0
              ? '$currency ${price.toStringAsFixed(0)}/person'
              : (table == 'tour_packages' ? 'Package' : 'Tour'),
          rating: ratingValue == null || ratingValue <= 0
              ? '-'
              : ratingValue.toStringAsFixed(1),
          isPublished: isPublished,
          onToggle: () async {
            await api.toggleListingPublished(
              table: table,
              id: t['id'].toString(),
              published: !isPublished,
            );
            onRefresh();
          },
          onDelete: () async {
            if (table == 'tours') {
              await api.deleteTour(id: t['id'].toString());
            } else {
              await api.deleteAdminListing(
                table: table,
                id: t['id'].toString(),
              );
            }
            onRefresh();
          },
        );
      },
    );
  }
}

// ─── Tab 6: Transport ─────────────────────────────────────────────────────────

class _AdminTransportTab extends StatelessWidget {
  const _AdminTransportTab({
    required this.transport,
    required this.usersById,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> transport;
  final Map<String, Map<String, dynamic>> usersById;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    if (transport.isEmpty) {
      return const Center(
        child: Text('No vehicles', style: TextStyle(color: AppColors.foggy)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: transport.length,
      itemBuilder: (_, i) {
        final v = transport[i];
        final price = (v['price_per_day'] as num?)?.toDouble() ?? 0;
        final currency = (v['currency'] ?? 'RWF').toString();
        final isPublished = v['is_published'] == true;
        final hostId = (v['created_by'] ?? '').toString();
        final host = usersById[hostId];
        final hostName = (host?['full_name'] ?? v['provider_name'] ?? '')
            .toString();
        return _AdminListingCard(
          item: {...v, 'images': v['media'], 'main_image': v['image_url']},
          hostName: hostName,
          location: (v['vehicle_type'] ?? '').toString(),
          price: '$currency ${price.toStringAsFixed(0)}/day',
          rating: '-',
          isPublished: isPublished,
          onToggle: () async {
            await api.toggleListingPublished(
              table: 'transport_vehicles',
              id: v['id'].toString(),
              published: !isPublished,
            );
            onRefresh();
          },
          onDelete: () async {
            await api.deleteTransport(id: v['id'].toString());
            onRefresh();
          },
        );
      },
    );
  }
}

// ─── Tab 7: Bookings ─────────────────────────────────────────────────────────

class _AdminBookingsTab extends StatefulWidget {
  const _AdminBookingsTab({required this.bookings});
  final List<Map<String, dynamic>> bookings;

  @override
  State<_AdminBookingsTab> createState() => _AdminBookingsTabState();
}

class _AdminBookingsTabState extends State<_AdminBookingsTab> {
  String _filter = 'all';
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final filtered = widget.bookings.where((b) {
      final status = (b['status'] ?? '').toString().toLowerCase();
      final matchesFilter = _filter == 'all' || status == _filter;
      final matchesQ =
          _q.isEmpty ||
          (b['guest_name'] ?? '').toString().toLowerCase().contains(
            _q.toLowerCase(),
          ) ||
          (b['order_id'] ?? '').toString().toLowerCase().contains(
            _q.toLowerCase(),
          );
      return matchesFilter && matchesQ;
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: TextField(
            onChanged: (v) => setState(() => _q = v),
            decoration: _inputDeco('Search by name or booking ID...'),
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
          child: Row(
            children: [
              for (final f in [
                'all',
                'pending',
                'confirmed',
                'completed',
                'cancelled',
              ])
                GestureDetector(
                  onTap: () => setState(() => _filter = f),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _filter == f
                          ? AppColors.rausch
                          : AppColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      f[0].toUpperCase() + f.substring(1),
                      style: TextStyle(
                        fontSize: 12,
                        color: _filter == f ? Colors.white : AppColors.hof,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Text(
                    'No bookings',
                    style: TextStyle(color: AppColors.foggy),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final b = filtered[i];
                    final guestName = (b['guest_name'] ?? 'Guest').toString();
                    final orderId = (b['order_id'] ?? b['id'] ?? '').toString();
                    final shortId = orderId.length > 12
                        ? orderId.substring(0, 12)
                        : orderId;
                    final status = (b['status'] ?? 'pending').toString();
                    final payStatus = (b['payment_status'] ?? '').toString();
                    final type = (b['booking_type'] ?? 'property').toString();
                    final amount = (b['total_price'] as num?)?.toDouble() ?? 0;
                    final currency = (b['currency'] ?? 'RWF').toString();
                    final checkIn = (b['check_in'] ?? '').toString().split(
                      'T',
                    )[0];
                    final checkOut = (b['check_out'] ?? '').toString().split(
                      'T',
                    )[0];

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  guestName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                    color: AppColors.black,
                                  ),
                                ),
                              ),
                              _StatusBadge(status),
                              if (payStatus.isNotEmpty) ...[
                                const SizedBox(width: 5),
                                _StatusBadge(payStatus),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text(
                                '#$shortId',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.foggy,
                                  fontFamily: 'monospace',
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                type,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.hof,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '$currency ${amount.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.black,
                                ),
                              ),
                            ],
                          ),
                          if (checkIn.isNotEmpty)
                            Text(
                              '$checkIn → $checkOut',
                              style: const TextStyle(
                                fontSize: 10,
                                color: AppColors.foggy,
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

// ─── Tab 8: Booking Calculations ─────────────────────────────────────────────

class _AdminBookingCalcTab extends StatelessWidget {
  const _AdminBookingCalcTab({required this.bookings});
  final List<Map<String, dynamic>> bookings;

  static const _guestFeePct = 12.0 / 112.0;
  static const _hostFeePct = 0.03;
  static const _pawaPayPct = 0.031;

  @override
  Widget build(BuildContext context) {
    final paid = bookings
        .where(
          (b) =>
              (b['status'] ?? '') == 'confirmed' ||
              (b['status'] ?? '') == 'completed',
        )
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF000000),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Fee Formula',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              SizedBox(height: 6),
              Text(
                'Guest Fee = GuestPaid × 12/112\nHost Fee = Base × 3%\nPawaPay = GuestPaid × 3.1%\nPlatform = GuestFee + HostFee',
                style: TextStyle(
                  color: Color(0xAAFFFFFF),
                  fontSize: 11,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
        if (paid.isEmpty)
          const Expanded(
            child: Center(
              child: Text(
                'No confirmed/completed bookings',
                style: TextStyle(color: AppColors.foggy),
              ),
            ),
          )
        else
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.vertical,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(
                    AppColors.surfaceSubtle,
                  ),
                  headingTextStyle: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.black,
                  ),
                  dataTextStyle: const TextStyle(
                    fontSize: 11,
                    color: AppColors.black,
                  ),
                  columnSpacing: 16,
                  horizontalMargin: 12,
                  dataRowMinHeight: 40,
                  dataRowMaxHeight: 48,
                  columns: const [
                    DataColumn(label: Text('ID')),
                    DataColumn(label: Text('Type')),
                    DataColumn(label: Text('Status')),
                    DataColumn(label: Text('Guest Paid'), numeric: true),
                    DataColumn(label: Text('Guest Fee'), numeric: true),
                    DataColumn(label: Text('Base'), numeric: true),
                    DataColumn(label: Text('Host Fee'), numeric: true),
                    DataColumn(label: Text('Host Net'), numeric: true),
                    DataColumn(label: Text('Platform'), numeric: true),
                    DataColumn(label: Text('PawaPay'), numeric: true),
                    DataColumn(label: Text('Net'), numeric: true),
                  ],
                  rows: paid.map((b) {
                    final guestPaid =
                        (b['total_price'] as num?)?.toDouble() ?? 0;
                    final guestFee = guestPaid * _guestFeePct;
                    final base = guestPaid - guestFee;
                    final hostFee = base * _hostFeePct;
                    final hostNet = base - hostFee;
                    final platform = guestFee + hostFee;
                    final pawaPay = guestPaid * _pawaPayPct;
                    final net = guestPaid - pawaPay;

                    final id = (b['order_id'] ?? b['id'] ?? '').toString();
                    final shortId = id.length > 8 ? id.substring(0, 8) : id;

                    return DataRow(
                      cells: [
                        DataCell(
                          Text(
                            shortId,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 10,
                            ),
                          ),
                        ),
                        DataCell(Text((b['booking_type'] ?? '').toString())),
                        DataCell(_StatusBadge((b['status'] ?? '').toString())),
                        DataCell(Text(_fmtNum(guestPaid))),
                        DataCell(Text(_fmtNum(guestFee))),
                        DataCell(Text(_fmtNum(base))),
                        DataCell(Text(_fmtNum(hostFee))),
                        DataCell(Text(_fmtNum(hostNet))),
                        DataCell(Text(_fmtNum(platform))),
                        DataCell(
                          Text(
                            _fmtNum(pawaPay),
                            style: const TextStyle(color: Color(0xFFE53935)),
                          ),
                        ),
                        DataCell(
                          Text(
                            _fmtNum(net),
                            style: const TextStyle(color: Color(0xFF2E7D32)),
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ─── Tab 9: Payments ─────────────────────────────────────────────────────────

class _AdminPaymentsTab extends StatelessWidget {
  const _AdminPaymentsTab({required this.stats, required this.bookings});
  final Map<String, dynamic> stats;
  final List<Map<String, dynamic>> bookings;

  @override
  Widget build(BuildContext context) {
    final revenue = (stats['total_revenue'] as num?)?.toDouble() ?? 0;
    final paidCount = (stats['paid_bookings'] as num?)?.toInt() ?? 0;
    final pawapay = (stats['total_pawapay_fees'] as num?)?.toDouble() ?? 0;
    final netRev = (stats['net_revenue'] as num?)?.toDouble() ?? 0;
    final platform =
        (stats['total_platform_earnings'] as num?)?.toDouble() ?? 0;
    final revByCurrency =
        (stats['revenue_by_currency'] as Map?)?.cast<String, double>() ?? {};

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GridView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 1.3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            children: [
              _AdminStatCard(
                icon: Icons.attach_money_outlined,
                label: 'Total Revenue',
                value: _fmtNum(revenue),
                color: const Color(0xFF4CAF50),
              ),
              _AdminStatCard(
                icon: Icons.receipt_outlined,
                label: 'Paid Bookings',
                value: '$paidCount',
                color: const Color(0xFF2196F3),
              ),
              _AdminStatCard(
                icon: Icons.account_balance_outlined,
                label: 'Platform Earnings',
                value: _fmtNum(platform),
                color: AppColors.rausch,
              ),
              _AdminStatCard(
                icon: Icons.trending_up_outlined,
                label: 'Net (After Fees)',
                value: _fmtNum(netRev),
                color: const Color(0xFF2E7D32),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionTitle('Revenue by Currency'),
                if (revByCurrency.isEmpty)
                  const Text(
                    'No payment data yet',
                    style: TextStyle(color: AppColors.foggy, fontSize: 13),
                  )
                else
                  ...revByCurrency.entries.map(
                    (e) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      child: Row(
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: AppColors.rausch.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.currency_exchange_outlined,
                              size: 16,
                              color: AppColors.rausch,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              e.key,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          Text(
                            '${e.key} ${_fmtNum(e.value)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: AppColors.black,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionTitle('Fee Breakdown'),
                _FinanceRow(
                  label: 'Gross Revenue',
                  value: 'RWF ${_fmtNum(revenue)}',
                  isBold: true,
                ),
                _FinanceRow(
                  label: 'PawaPay Fees (3.1%)',
                  value: '− RWF ${_fmtNum(pawapay)}',
                  color: AppColors.rausch,
                ),
                const Divider(height: 14),
                _FinanceRow(
                  label: 'Net Received',
                  value: 'RWF ${_fmtNum(netRev)}',
                  isBold: true,
                  color: const Color(0xFF2E7D32),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Tab 10: Payouts ─────────────────────────────────────────────────────────

class _AdminPayoutsTab extends StatefulWidget {
  const _AdminPayoutsTab({
    required this.payouts,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> payouts;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  State<_AdminPayoutsTab> createState() => _AdminPayoutsTabState();
}

class _AdminPayoutsTabState extends State<_AdminPayoutsTab> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final filtered = _filter == 'all'
        ? widget.payouts
        : widget.payouts.where((p) => (p['status'] ?? '') == _filter).toList();

    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: Row(
            children: [
              for (final f in [
                'all',
                'pending',
                'processing',
                'paid',
                'failed',
              ])
                GestureDetector(
                  onTap: () => setState(() => _filter = f),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _filter == f
                          ? AppColors.rausch
                          : AppColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      f[0].toUpperCase() + f.substring(1),
                      style: TextStyle(
                        fontSize: 12,
                        color: _filter == f ? Colors.white : AppColors.hof,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Text(
                    'No payouts',
                    style: TextStyle(color: AppColors.foggy),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final p = filtered[i];
                    final hostName =
                        ((p['profiles'] as Map?)?['full_name'] ??
                                p['host_id'] ??
                                'Host')
                            .toString();
                    final amount = (p['amount'] as num?)?.toDouble() ?? 0;
                    final currency = (p['currency'] ?? 'RWF').toString();
                    final status = (p['status'] ?? 'pending').toString();
                    final method = (p['payout_method'] ?? '').toString();
                    final createdAt = (p['created_at'] ?? '').toString().split(
                      'T',
                    )[0];
                    final isPending = status == 'pending';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: isPending
                            ? Border.all(
                                color: const Color(0xFFFFCC02),
                                width: 1.5,
                              )
                            : null,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  hostName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                    color: AppColors.black,
                                  ),
                                ),
                              ),
                              Text(
                                '$currency ${amount.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14,
                                  color: AppColors.black,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              _StatusBadge(status),
                              if (method.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                Text(
                                  method,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.foggy,
                                  ),
                                ),
                              ],
                              const Spacer(),
                              Text(
                                createdAt,
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: AppColors.foggy,
                                ),
                              ),
                            ],
                          ),
                          if (isPending) ...[
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () async {
                                      await widget.api.updatePayoutStatus(
                                        id: p['id'].toString(),
                                        status: 'processing',
                                      );
                                      widget.onRefresh();
                                    },
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: const Color(0xFF3949AB),
                                      side: const BorderSide(
                                        color: Color(0xFF3949AB),
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 7,
                                      ),
                                    ),
                                    child: const Text(
                                      'Approve',
                                      style: TextStyle(fontSize: 12),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: () async {
                                      await widget.api.updatePayoutStatus(
                                        id: p['id'].toString(),
                                        status: 'paid',
                                      );
                                      widget.onRefresh();
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF4CAF50),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 7,
                                      ),
                                    ),
                                    child: const Text(
                                      'Mark Paid',
                                      style: TextStyle(fontSize: 12),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

// ─── Tab 11: Reviews ─────────────────────────────────────────────────────────

class _AdminReviewsTab extends StatelessWidget {
  const _AdminReviewsTab({
    required this.reviews,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> reviews;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    if (reviews.isEmpty) {
      return const Center(
        child: Text('No reviews', style: TextStyle(color: AppColors.foggy)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: reviews.length,
      itemBuilder: (_, i) {
        final r = reviews[i];
        final title = (r['title'] ?? r['reviewer_name'] ?? 'Review').toString();
        final comment = (r['comment'] ?? '').toString();
        final rating =
            ((r['accommodation_rating'] ?? r['rating']) as num?)?.toDouble() ??
            0;
        final createdAt = (r['created_at'] ?? '').toString().split('T')[0];

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppColors.black,
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        size: 14,
                        color: Color(0xFFFFB800),
                      ),
                      const SizedBox(width: 2),
                      Text(
                        rating.toStringAsFixed(1),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    icon: const Icon(
                      Icons.delete_outline,
                      size: 18,
                      color: AppColors.rausch,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 28,
                      minHeight: 28,
                    ),
                    onPressed: () async {
                      await api.deleteReview(id: r['id'].toString());
                      onRefresh();
                    },
                  ),
                ],
              ),
              if (comment.isNotEmpty)
                Text(
                  comment,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                ),
              if (createdAt.isNotEmpty)
                Text(
                  createdAt,
                  style: const TextStyle(fontSize: 10, color: AppColors.foggy),
                ),
            ],
          ),
        );
      },
    );
  }
}

// ─── Tab 12: Support ─────────────────────────────────────────────────────────

class _AdminSupportTab extends StatefulWidget {
  const _AdminSupportTab({
    required this.tickets,
    required this.api,
    required this.onRefresh,
  });
  final List<Map<String, dynamic>> tickets;
  final AppDatabase api;
  final VoidCallback onRefresh;

  @override
  State<_AdminSupportTab> createState() => _AdminSupportTabState();
}

class _AdminSupportTabState extends State<_AdminSupportTab> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final filtered = _filter == 'all'
        ? widget.tickets
        : widget.tickets.where((t) => (t['status'] ?? '') == _filter).toList();

    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: Row(
            children: [
              for (final f in ['all', 'open', 'in_progress', 'closed'])
                GestureDetector(
                  onTap: () => setState(() => _filter = f),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _filter == f
                          ? AppColors.rausch
                          : AppColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      f.replaceAll('_', ' '),
                      style: TextStyle(
                        fontSize: 12,
                        color: _filter == f ? Colors.white : AppColors.hof,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Text(
                    'No tickets',
                    style: TextStyle(color: AppColors.foggy),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final t = filtered[i];
                    final subject = (t['subject'] ?? 'Support Ticket')
                        .toString();
                    final category = (t['category'] ?? '').toString();
                    final priority = (t['priority'] ?? '').toString();
                    final status = (t['status'] ?? 'open').toString();
                    final createdAt = (t['created_at'] ?? '').toString().split(
                      'T',
                    )[0];
                    final message = (t['message'] ?? '').toString();

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  subject,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                    color: AppColors.black,
                                  ),
                                ),
                              ),
                              _StatusBadge(status),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              if (category.isNotEmpty) ...[
                                Text(
                                  category,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.hof,
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              if (priority.isNotEmpty) _StatusBadge(priority),
                              const Spacer(),
                              Text(
                                createdAt,
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: AppColors.foggy,
                                ),
                              ),
                            ],
                          ),
                          if (message.isNotEmpty)
                            Text(
                              message,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.foggy,
                              ),
                            ),
                          const SizedBox(height: 6),
                          if (status != 'closed')
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () async {
                                  await widget.api.updateSupportTicketStatus(
                                    id: t['id'].toString(),
                                    status: 'closed',
                                  );
                                  widget.onRefresh();
                                },
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  minimumSize: Size.zero,
                                ),
                                child: const Text(
                                  'Close ticket',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.rausch,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

// ─── Tab 13: Notify ──────────────────────────────────────────────────────────

class _AdminNotifyTab extends StatefulWidget {
  const _AdminNotifyTab({required this.api});
  final AppDatabase api;

  @override
  State<_AdminNotifyTab> createState() => _AdminNotifyTabState();
}

class _AdminNotifyTabState extends State<_AdminNotifyTab> {
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  final _customUserIdsCtrl = TextEditingController();
  final _typeCtrl = TextEditingController(text: 'special');
  final _deepLinkCtrl = TextEditingController();

  String _audience = 'all';
  String _delivery = 'both';
  bool _sending = false;
  String? _lastSummary;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    _customUserIdsCtrl.dispose();
    _typeCtrl.dispose();
    _deepLinkCtrl.dispose();
    super.dispose();
  }

  void _showSnack(String message, {bool error = false}) {
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: error ? const Color(0xFFB42318) : const Color(0xFF256029),
      ),
    );
  }

  List<String> _parseCustomUserIds() {
    return _customUserIdsCtrl.text
        .split(RegExp(r'[\s,]+'))
        .map((v) => v.trim())
        .where((v) => v.isNotEmpty)
        .toSet()
        .toList();
  }

  Future<void> _send() async {
    final title = _titleCtrl.text.trim();
    final body = _bodyCtrl.text.trim();

    if (title.length < 3) {
      _showSnack('Title must be at least 3 characters.', error: true);
      return;
    }
    if (body.length < 3) {
      _showSnack('Message must be at least 3 characters.', error: true);
      return;
    }

    final customUserIds = _audience == 'custom' ? _parseCustomUserIds() : <String>[];
    if (_audience == 'custom' && customUserIds.isEmpty) {
      _showSnack('Add at least one user ID for custom audience.', error: true);
      return;
    }

    setState(() => _sending = true);
    try {
      final sendPush = _delivery != 'in_app_only';
      final sendInApp = _delivery != 'push_only';

      final result = await widget.api.sendAdminGeneralNotification(
        title: title,
        body: body,
        audience: _audience,
        userIds: customUserIds,
        notificationType: _typeCtrl.text.trim().isEmpty
            ? 'special'
            : _typeCtrl.text.trim(),
        deepLink: _deepLinkCtrl.text.trim(),
        sendPush: sendPush,
        sendInApp: sendInApp,
      );

      final recipientCount = (result['recipientCount'] as num?)?.toInt() ?? 0;
      final inAppInserted = (result['inAppInserted'] as num?)?.toInt() ?? 0;

      var pushSent = 0;
      var pushFailed = 0;
      var pushSkipped = '';
      final push = result['push'];
      if (push is Map) {
        pushSent = (push['sent'] as num?)?.toInt() ?? 0;
        pushFailed = (push['failed'] as num?)?.toInt() ?? 0;
        pushSkipped = (push['skippedReason'] ?? '').toString();
      }

      final summaryBits = <String>[
        'Recipients: $recipientCount',
        'In-app: $inAppInserted',
        'Push sent: $pushSent',
      ];
      if (pushFailed > 0) summaryBits.add('Push failed: $pushFailed');
      if (pushSkipped.isNotEmpty) {
        summaryBits.add('Push: ${pushSkipped.replaceAll('_', ' ')}');
      }

      final summary = summaryBits.join(' • ');
      setState(() {
        _lastSummary = summary;
      });

      _showSnack('Notification sent');
      _titleCtrl.clear();
      _bodyCtrl.clear();
      _customUserIdsCtrl.clear();
      _deepLinkCtrl.clear();
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('invalid jwt') || msg.contains('session expired')) {
        var details = e.toString();
        if (details.length > 420) {
          details = '${details.substring(0, 420)}...';
        }
        _showSnack(
          details,
          error: true,
        );
      } else {
        _showSnack('Failed to send: $e', error: true);
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.campaign_outlined, size: 20, color: AppColors.rausch),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Special Notification Generator',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.black,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Send targeted announcements by push, in-app, or both.',
                  style: TextStyle(fontSize: 12, color: AppColors.foggy),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Audience',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.hof,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final option in const [
                      ('all', 'All'),
                      ('customers', 'Customers'),
                      ('hosts', 'Hosts'),
                      ('staff', 'Staff'),
                      ('custom', 'Custom'),
                    ])
                      ChoiceChip(
                        label: Text(option.$2),
                        selected: _audience == option.$1,
                        onSelected: (_) => setState(() => _audience = option.$1),
                        selectedColor: AppColors.rausch,
                        labelStyle: TextStyle(
                          color: _audience == option.$1 ? Colors.white : AppColors.hof,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        backgroundColor: AppColors.surfaceSubtle,
                        side: const BorderSide(color: AppColors.border),
                      ),
                  ],
                ),
                if (_audience == 'custom') ...[
                  const SizedBox(height: 10),
                  TextField(
                    controller: _customUserIdsCtrl,
                    minLines: 2,
                    maxLines: 4,
                    decoration: InputDecoration(
                      labelText: 'Custom user IDs',
                      hintText: 'uuid-1, uuid-2, uuid-3',
                      labelStyle: const TextStyle(fontSize: 12),
                      hintStyle: const TextStyle(fontSize: 12),
                      filled: true,
                      fillColor: AppColors.surfaceSubtle,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                const Text(
                  'Delivery',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.hof,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final option in const [
                      ('both', 'Push + In-app'),
                      ('push_only', 'Push only'),
                      ('in_app_only', 'In-app only'),
                    ])
                      ChoiceChip(
                        label: Text(option.$2),
                        selected: _delivery == option.$1,
                        onSelected: (_) => setState(() => _delivery = option.$1),
                        selectedColor: const Color(0xFF000000),
                        labelStyle: TextStyle(
                          color: _delivery == option.$1 ? Colors.white : AppColors.hof,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        backgroundColor: AppColors.surfaceSubtle,
                        side: const BorderSide(color: AppColors.border),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _titleCtrl,
                  decoration: InputDecoration(
                    labelText: 'Title',
                    hintText: 'Example: Weekend campaign is live',
                    filled: true,
                    fillColor: AppColors.surfaceSubtle,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _bodyCtrl,
                  minLines: 3,
                  maxLines: 5,
                  decoration: InputDecoration(
                    labelText: 'Message',
                    hintText: 'Write the notification body users should receive.',
                    filled: true,
                    fillColor: AppColors.surfaceSubtle,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _typeCtrl,
                        decoration: InputDecoration(
                          labelText: 'Type',
                          hintText: 'special',
                          filled: true,
                          fillColor: AppColors.surfaceSubtle,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _deepLinkCtrl,
                        decoration: InputDecoration(
                          labelText: 'Deep link (optional)',
                          hintText: '/support',
                          filled: true,
                          fillColor: AppColors.surfaceSubtle,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _sending ? null : _send,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.rausch,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                    ),
                    icon: _sending
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Icon(Icons.send_rounded, size: 16),
                    label: Text(_sending ? 'Sending...' : 'Send notification'),
                  ),
                ),
                if ((_lastSummary ?? '').isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF6F9F3),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFCCE3C0)),
                    ),
                    child: Text(
                      _lastSummary!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF2D5E1A),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
