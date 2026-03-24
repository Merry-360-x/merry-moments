import 'package:flutter/material.dart';

import '../../services/mobile_api.dart';
import '../../session_controller.dart';

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
      backgroundColor: const Color(0xFFF8F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Color(0xFF1A1A2E)),
        title: const Text('Admin Dashboard',
            style: TextStyle(color: Color(0xFF1A1A2E), fontWeight: FontWeight.w700, fontSize: 17)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined, color: Color(0xFF8A8A99)), onPressed: _load),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          indicatorColor: const Color(0xFFE2555A),
          labelColor: const Color(0xFFE2555A),
          unselectedLabelColor: const Color(0xFF8A8A99),
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
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFE2555A)))
          : TabBarView(
              controller: _tabs,
              children: [
                _AdminOverview(stats: _stats ?? {}),
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
  const _AdminOverview({required this.stats});
  final Map<String, dynamic> stats;

  @override
  Widget build(BuildContext context) {
    final revenue = (stats['total_revenue'] as num?)?.toDouble() ?? 0;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Platform Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1A1A2E))),
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
            _AdminStatCard(icon: Icons.home_outlined, label: 'Active Listings', value: '${stats['active_properties'] ?? 0}', color: const Color(0xFFE2555A)),
            _AdminStatCard(icon: Icons.pending_actions_outlined, label: 'Pending Apps', value: '${stats['pending_applications'] ?? 0}', color: const Color(0xFFFF9800)),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF1A1A2E), Color(0xFF2D2D44)]),
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
      ]),
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
          boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8)]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: color)),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF1A1A2E))),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF8A8A99))),
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
    if (users.isEmpty) return const Center(child: Text('No users found', style: TextStyle(color: Color(0xFF8A8A99))));
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
              boxShadow: const [BoxShadow(color: Color(0x06000000), blurRadius: 6)]),
          child: Row(children: [
            CircleAvatar(
              radius: 20, backgroundColor: const Color(0xFFF2F2F5),
              backgroundImage: avatar.isNotEmpty ? NetworkImage(avatar) : null,
              child: avatar.isEmpty ? Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF5A5A6B))) : null,
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF1A1A2E))),
              Text((u['bio'] ?? '').toString().isEmpty ? 'No bio' : (u['bio'] ?? '').toString(),
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF8A8A99))),
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
    if (bookings.isEmpty) return const Center(child: Text('No bookings', style: TextStyle(color: Color(0xFF8A8A99))));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: bookings.length,
      itemBuilder: (_, i) {
        final b = bookings[i];
        final title = (b['title'] ?? 'Booking').toString();
        final status = (b['status'] ?? 'pending').toString();
        final amount = (b['total_amount'] as num?)?.toDouble() ?? 0;
        final currency = (b['currency'] ?? 'USD').toString();

        final statusColor = switch (status) {
          'confirmed' => const Color(0xFF4CAF50),
          'completed' => const Color(0xFF2196F3),
          'cancelled' => const Color(0xFFE2555A),
          _ => const Color(0xFFFF9800),
        };

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
              boxShadow: const [BoxShadow(color: Color(0x06000000), blurRadius: 6)]),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF1A1A2E))),
              Text('$currency ${amount.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF5A5A6B))),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
              child: Text(status, style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600)),
            ),
          ]),
        );
      },
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

    if (all.isEmpty) return const Center(child: Text('No applications', style: TextStyle(color: Color(0xFF8A8A99))));

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
            boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 6)],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF1A1A2E)))),
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
                      foregroundColor: const Color(0xFFE2555A),
                      side: const BorderSide(color: Color(0xFFE2555A)),
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
    if (reviews.isEmpty) return const Center(child: Text('No reviews', style: TextStyle(color: Color(0xFF8A8A99))));
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
              boxShadow: const [BoxShadow(color: Color(0x06000000), blurRadius: 6)]),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF1A1A2E)))),
              Row(children: [
                const Icon(Icons.star, size: 14, color: Color(0xFFFFB800)),
                const SizedBox(width: 3),
                Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
              IconButton(
                icon: const Icon(Icons.delete_outlined, size: 18, color: Color(0xFFE2555A)),
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
                  style: const TextStyle(fontSize: 12, color: Color(0xFF8A8A99))),
          ]),
        );
      },
    );
  }
}
