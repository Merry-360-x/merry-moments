import 'package:flutter/material.dart';

import '../../app.dart';

import '../../services/mobile_api.dart';
import '../../session_controller.dart';

class _RegionCount {
  const _RegionCount({required this.region, required this.count, required this.share});
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
  final rawPhone = (booking['guest_phone'] ?? booking['phone'] ?? booking['guestPhone'])?.toString();
  final code = _extractPhoneCountryCode(rawPhone);
  if (code == null) return 'Outside Africa / Unknown';
  return _africanBookingCountryByCode[code] ?? 'Outside Africa / Unknown';
}

_BookingAnalyticsSummary _computeBookingAnalytics(List<Map<String, dynamic>> bookings) {
  int confirmedOrCompleted = 0;
  int paid = 0;
  final regionCounts = <String, int>{};

  for (final booking in bookings) {
    final status = (booking['status'] ?? '').toString().toLowerCase();
    final paymentStatus = (booking['payment_status'] ?? '').toString().toLowerCase();

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
  final regionBreakdown = regionCounts.entries
      .map((entry) => _RegionCount(
            region: entry.key,
            count: entry.value,
            share: total > 0 ? (entry.value / total) * 100 : 0,
          ))
      .toList()
    ..sort((a, b) => b.count.compareTo(a.count));

  return _BookingAnalyticsSummary(
    total: total,
    confirmedOrCompleted: confirmedOrCompleted,
    paid: paid,
    regionBreakdown: regionBreakdown,
  );
}

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> with SingleTickerProviderStateMixin {
  final _api = MobileApi();
  late TabController _tabs;

  Map<String, dynamic>? _stats;
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _bookings = [];
  List<Map<String, dynamic>> _applications = [];
  List<Map<String, dynamic>> _reviews = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 5, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      _api.fetchAdminStats(),
      _api.fetchAllUsers(limit: 50),
      _api.fetchAllBookingsAdmin(limit: 50),
      _api.fetchHostApplications(),
      _api.fetchReviews(limit: 30),
    ]);
    if (mounted) {
      setState(() {
        _stats = results[0] as Map<String, dynamic>;
        _users = results[1] as List<Map<String, dynamic>>;
        _bookings = results[2] as List<Map<String, dynamic>>;
        _applications = results[3] as List<Map<String, dynamic>>;
        _reviews = results[4] as List<Map<String, dynamic>>;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: AppColors.black),
        title: const Text('Admin Dashboard',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined, color: AppColors.foggy), onPressed: _load),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          indicatorColor: AppColors.rausch,
          labelColor: AppColors.rausch,
          unselectedLabelColor: AppColors.foggy,
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: [
            const Tab(text: 'Overview'),
            const Tab(text: 'Users'),
            const Tab(text: 'Bookings'),
            Tab(text: 'Host Apps ${_applications.where((a) => a['status'] == 'pending').isNotEmpty ? '●' : ''}'),
            const Tab(text: 'Reviews'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.rausch))
          : TabBarView(
              controller: _tabs,
              children: [
                _AdminOverview(stats: _stats ?? {}, bookings: _bookings),
                _AdminUsersTab(users: _users),
                _AdminBookingsTab(bookings: _bookings),
                _AdminApplicationsTab(applications: _applications, api: _api, onRefresh: _load),
                _AdminReviewsTab(reviews: _reviews, api: _api, onRefresh: _load),
              ],
            ),
    );
  }
}

// ── Overview ─────────────────────────────────────────────────
class _AdminOverview extends StatelessWidget {
  const _AdminOverview({required this.stats, required this.bookings});
  final Map<String, dynamic> stats;
  final List<Map<String, dynamic>> bookings;

  @override
  Widget build(BuildContext context) {
    final revenue = (stats['total_revenue'] as num?)?.toDouble() ?? 0;
    final analytics = _computeBookingAnalytics(bookings);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Platform Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.black)),
        const SizedBox(height: 16),
        GridView(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2, childAspectRatio: 1.35, crossAxisSpacing: 12, mainAxisSpacing: 12,
          ),
          children: [
            _AdminStatCard(icon: Icons.people_alt_outlined, label: 'Total Users', value: '${stats['total_users'] ?? 0}', color: const Color(0xFF2196F3)),
            _AdminStatCard(icon: Icons.luggage_outlined, label: 'Total Bookings', value: '${stats['total_bookings'] ?? 0}', color: const Color(0xFF4CAF50)),
            _AdminStatCard(icon: Icons.home_outlined, label: 'Active Listings', value: '${stats['active_properties'] ?? 0}', color: AppColors.rausch),
            _AdminStatCard(icon: Icons.pending_actions_outlined, label: 'Pending Apps', value: '${stats['pending_applications'] ?? 0}', color: const Color(0xFFFF9800)),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppColors.black, Color(0xFF2D2D44)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(children: [
            const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Platform Revenue', style: TextStyle(color: Color(0xAAFFFFFF), fontSize: 12)),
              SizedBox(height: 4),
              Text('Confirmed + Completed', style: TextStyle(color: Color(0x66FFFFFF), fontSize: 11)),
            ])),
            Text('USD ${revenue.toStringAsFixed(2)}',
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          ]),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Bookings Analytics', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.black)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _miniMetric('Total', '${analytics.total}')),
                const SizedBox(width: 10),
                Expanded(child: _miniMetric('Confirmed/Completed', '${analytics.confirmedOrCompleted}')),
                const SizedBox(width: 10),
                Expanded(child: _miniMetric('Paid', '${analytics.paid}')),
              ],
            ),
            const SizedBox(height: 12),
            const Text('Top Booking Regions', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.hof)),
            const SizedBox(height: 8),
            _RegionDistributionBars(regions: analytics.regionBreakdown, maxItems: 4),
          ]),
        ),
      ]),
    );
  }

  Widget _miniMetric(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.linnen,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: AppColors.foggy)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.black)),
        ],
      ),
    );
  }
}

class _AdminStatCard extends StatelessWidget {
  const _AdminStatCard({required this.icon, required this.label, required this.value, required this.color});
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
          ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: color)),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.black)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
      ]),
    );
  }
}

// ── Users Tab ─────────────────────────────────────────────────
class _AdminUsersTab extends StatelessWidget {
  const _AdminUsersTab({required this.users});
  final List<Map<String, dynamic>> users;

  @override
  Widget build(BuildContext context) {
    if (users.isEmpty) return const Center(child: Text('No users found', style: TextStyle(color: AppColors.foggy)));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: users.length,
      itemBuilder: (_, i) {
        final u = users[i];
        final name = (u['full_name'] ?? 'User').toString();
        final avatar = (u['avatar_url'] ?? '').toString();
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
              ),
          child: Row(children: [
            CircleAvatar(
              radius: 20, backgroundColor: AppColors.linnen,
              backgroundImage: avatar.isNotEmpty ? NetworkImage(avatar) : null,
              child: avatar.isEmpty ? Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.hof)) : null,
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black)),
              Text((u['bio'] ?? '').toString().isEmpty ? 'No bio' : (u['bio'] ?? '').toString(),
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
            ])),
          ]),
        );
      },
    );
  }
}

// ── Bookings Tab ──────────────────────────────────────────────
class _AdminBookingsTab extends StatelessWidget {
  const _AdminBookingsTab({required this.bookings});
  final List<Map<String, dynamic>> bookings;

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) return const Center(child: Text('No bookings', style: TextStyle(color: AppColors.foggy)));
    final analytics = _computeBookingAnalytics(bookings);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Bookings Analytics', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.black)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _AnalyticsBadge(label: 'Total', value: '${analytics.total}')),
                const SizedBox(width: 8),
                Expanded(child: _AnalyticsBadge(label: 'Confirmed/Completed', value: '${analytics.confirmedOrCompleted}')),
                const SizedBox(width: 8),
                Expanded(child: _AnalyticsBadge(label: 'Paid', value: '${analytics.paid}')),
              ],
            ),
            const SizedBox(height: 12),
            const Text('Top Regions', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.hof)),
            const SizedBox(height: 6),
            _RegionDistributionBars(regions: analytics.regionBreakdown, maxItems: 5),
          ]),
        ),
        ...bookings.map((b) {
          final title = (b['title'] ?? 'Booking').toString();
          final status = (b['status'] ?? 'pending').toString();
          final amount = (b['total_amount'] as num?)?.toDouble() ?? 0;
          final currency = (b['currency'] ?? 'USD').toString();

          final statusColor = switch (status) {
            'confirmed' => const Color(0xFF4CAF50),
            'completed' => const Color(0xFF2196F3),
            'cancelled' => AppColors.rausch,
            _ => const Color(0xFFFF9800),
          };

          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black)),
                Text('$currency ${amount.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 12, color: AppColors.hof)),
              ])),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                child: Text(status, style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600)),
              ),
            ]),
          );
        }),
      ],
    );
  }
}

class _AnalyticsBadge extends StatelessWidget {
  const _AnalyticsBadge({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.linnen,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: AppColors.foggy)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.black)),
        ],
      ),
    );
  }
}

class _RegionDistributionBars extends StatelessWidget {
  const _RegionDistributionBars({required this.regions, this.maxItems = 4});

  final List<_RegionCount> regions;
  final int maxItems;

  @override
  Widget build(BuildContext context) {
    final items = regions.take(maxItems).toList();
    if (items.isEmpty) {
      return const Text('No region data yet.', style: TextStyle(fontSize: 11, color: AppColors.foggy));
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
                        style: const TextStyle(fontSize: 12, color: AppColors.black),
                      ),
                    ),
                    Text(
                      '${items[i].count} (${items[i].share.toStringAsFixed(1)}%)',
                      style: const TextStyle(fontSize: 11, color: AppColors.foggy, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    height: 8,
                    color: AppColors.linnen,
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: (items[i].share / 100).clamp(0.0, 1.0),
                      child: Container(color: _regionPalette[i % _regionPalette.length]),
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

// ── Host Applications Tab ─────────────────────────────────────
class _AdminApplicationsTab extends StatelessWidget {
  const _AdminApplicationsTab({required this.applications, required this.api, required this.onRefresh});
  final List<Map<String, dynamic>> applications;
  final MobileApi api;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final pending = applications.where((a) => (a['status'] ?? '') == 'pending').toList();
    final others = applications.where((a) => (a['status'] ?? '') != 'pending').toList();
    final all = [...pending, ...others];

    if (all.isEmpty) return const Center(child: Text('No applications', style: TextStyle(color: AppColors.foggy)));

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: all.length,
      itemBuilder: (_, i) {
        final app = all[i];
        final status = (app['status'] ?? 'pending').toString();
        final name = (app['full_name'] ?? app['business_name'] ?? 'Applicant').toString();
        final isPending = status == 'pending';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: isPending ? Border.all(color: const Color(0xFFFFE0B2)) : null,
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isPending ? const Color(0xFFFFF3E0) : const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(status, style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600,
                  color: isPending ? const Color(0xFFFF9800) : const Color(0xFF4CAF50),
                )),
              ),
            ]),
            if (isPending) ...[
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      await api.updateHostApplication(id: app['id'].toString(), status: 'rejected');
                      onRefresh();
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.rausch,
                      side: const BorderSide(color: AppColors.rausch),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: const Text('Reject', style: TextStyle(fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      await api.updateHostApplication(id: app['id'].toString(), status: 'approved');
                      onRefresh();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4CAF50),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: const Text('Approve', style: TextStyle(fontSize: 13)),
                  ),
                ),
              ]),
            ],
          ]),
        );
      },
    );
  }
}

// ── Reviews Tab ───────────────────────────────────────────────
class _AdminReviewsTab extends StatelessWidget {
  const _AdminReviewsTab({required this.reviews, required this.api, required this.onRefresh});
  final List<Map<String, dynamic>> reviews;
  final MobileApi api;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    if (reviews.isEmpty) return const Center(child: Text('No reviews', style: TextStyle(color: AppColors.foggy)));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: reviews.length,
      itemBuilder: (_, i) {
        final r = reviews[i];
        final title = (r['title'] ?? 'Review').toString();
        final comment = (r['comment'] ?? '').toString();
        final rating = (r['accommodation_rating'] as num?)?.toDouble() ?? 0;

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
              ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black))),
              Row(children: [
                const Icon(Icons.star, size: 14, color: Color(0xFFFFB800)),
                const SizedBox(width: 3),
                Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
              IconButton(
                icon: const Icon(Icons.delete_outlined, size: 18, color: AppColors.rausch),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                onPressed: () async {
                  await api.deleteReview(id: r['id'].toString());
                  onRefresh();
                },
              ),
            ]),
            if (comment.isNotEmpty)
              Text(comment, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
          ]),
        );
      },
    );
  }
}
