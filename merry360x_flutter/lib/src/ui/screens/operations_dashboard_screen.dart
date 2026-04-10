import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import '../widgets/return_button.dart';

class OperationsDashboardScreen extends StatefulWidget {
  const OperationsDashboardScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<OperationsDashboardScreen> createState() => _OperationsDashboardScreenState();
}

class _OperationsDashboardScreenState extends State<OperationsDashboardScreen> {
  final _api = AppDatabase();
  final List<RealtimeChannel> _channels = [];

  bool _loading = true;
  String _tab = 'overview';
  List<Map<String, dynamic>> _applications = const [];
  List<Map<String, dynamic>> _properties = const [];
  List<Map<String, dynamic>> _tours = const [];
  List<Map<String, dynamic>> _transport = const [];
  List<Map<String, dynamic>> _bookings = const [];
  List<Map<String, dynamic>> _users = const [];
  String? _updatingApplicationId;
  String? _updatingListingKey;

  @override
  void initState() {
    super.initState();
    _load();
    _setupRealtime();
  }

  @override
  void dispose() {
    for (final channel in _channels) {
      Supabase.instance.client.removeChannel(channel);
    }
    super.dispose();
  }

  void _setupRealtime() {
    RealtimeChannel watchTable(String name, String table) {
      final channel = Supabase.instance.client
          .channel('operations-dashboard-$name')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: table,
            callback: (_) => _load(),
          )
          .subscribe();
      _channels.add(channel);
      return channel;
    }

    watchTable('applications', 'host_applications');
    watchTable('properties', 'properties');
    watchTable('tours', 'tour_packages');
    watchTable('transport', 'transport_vehicles');
    watchTable('bookings', 'bookings');
    watchTable('profiles', 'profiles');
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    final results = await Future.wait([
      _api.fetchHostApplications(),
      _api.fetchAdminProperties(),
      _api.fetchAdminAllTours(),
      _api.fetchAdminTransportVehicles(),
      _api.fetchAllBookingsAdmin(limit: 120),
      _api.fetchAllUsers(limit: 120),
    ]);
    if (!mounted) return;
    setState(() {
      _applications = results[0];
      _properties = results[1];
      _tours = results[2];
      _transport = results[3];
      _bookings = results[4];
      _users = results[5];
      _loading = false;
    });
  }

  Future<void> _setApplicationStatus(String id, String status) async {
    setState(() => _updatingApplicationId = id);
    try {
      await _api.updateHostApplication(id: id, status: status);
      await _load();
    } finally {
      if (mounted) {
        setState(() => _updatingApplicationId = null);
      }
    }
  }

  Future<void> _toggleListing(String table, String id, bool published) async {
    setState(() => _updatingListingKey = '$table:$id');
    try {
      await _api.toggleListingPublished(table: table, id: id, published: published);
      await _load();
    } finally {
      if (mounted) {
        setState(() => _updatingListingKey = null);
      }
    }
  }

  String _label(String raw) {
    if (raw.isEmpty) return 'Unknown';
    return raw
        .split('_')
        .map((part) => part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  Color _statusColor(String raw) {
    switch (raw.toLowerCase()) {
      case 'approved':
      case 'published':
      case 'confirmed':
      case 'completed':
        return const Color(0xFF1E8E5A);
      case 'pending':
      case 'awaiting_confirmation':
        return const Color(0xFFB26A00);
      case 'rejected':
      case 'cancelled':
        return const Color(0xFFC73D32);
      default:
        return AppColors.hof;
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingApplications = _applications.where((a) => (a['status'] ?? '').toString() == 'pending').toList();
    final allListings = [
      ..._properties.map((item) => {...item, '_table': 'properties'}),
      ..._tours,
      ..._transport.map((item) => {...item, '_table': 'transport_vehicles'}),
    ];
    final publishedListings = allListings.where((item) => item['is_published'] == true).length;
    final pendingListings = allListings.length - publishedListings;
    final pendingBookings = _bookings.where((booking) {
      final status = (booking['status'] ?? '').toString();
      return status == 'pending' || status == 'awaiting_confirmation';
    }).length;
    final completeProfiles = _users.where((user) {
      return (user['full_name'] ?? '').toString().trim().isNotEmpty &&
          (user['phone'] ?? '').toString().trim().isNotEmpty;
    }).length;

    return Scaffold(
      appBar: AppBar(
        leading: const ReturnButton(color: AppColors.black, fallbackRoute: '/'),
        title: const Text('Operations Dashboard'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            const Text(
              'Operations review for applications, publishing flow, bookings, and profile readiness.',
              style: TextStyle(fontSize: 13, color: AppColors.foggy),
            ),
            const SizedBox(height: 14),
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.45,
              children: [
                _OpsMetricCard(label: 'Pending Apps', value: '${pendingApplications.length}', accent: const Color(0xFFB26A00)),
                _OpsMetricCard(label: 'Live Listings', value: '$publishedListings', accent: const Color(0xFF0F9D58)),
                _OpsMetricCard(label: 'Pending Bookings', value: '$pendingBookings', accent: const Color(0xFF155EEF)),
                _OpsMetricCard(label: 'Ready Profiles', value: '$completeProfiles/${_users.length}', accent: const Color(0xFF7C3AED)),
              ],
            ),
            const SizedBox(height: 14),
            _OpsTabStrip(
              value: _tab,
              tabs: const [
                ('overview', 'Overview'),
                ('applications', 'Applications'),
                ('listings', 'Listings'),
                ('bookings', 'Bookings'),
                ('users', 'User Data'),
              ],
              onChanged: (value) => setState(() => _tab = value),
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_tab == 'overview') ...[
              _OpsPanel(
                title: 'Operations health',
                subtitle: 'Current workflow pressure across approvals, publishing, and bookings.',
                child: Column(
                  children: [
                    _OpsKeyValueRow(label: 'Pending applications', value: '${pendingApplications.length}', emphasized: true),
                    _OpsKeyValueRow(label: 'Published listings', value: '$publishedListings'),
                    _OpsKeyValueRow(label: 'Unpublished listings', value: '$pendingListings'),
                    _OpsKeyValueRow(label: 'Pending bookings', value: '$pendingBookings'),
                    _OpsKeyValueRow(label: 'Profiles with phone and name', value: '$completeProfiles'),
                  ],
                ),
              ),
              _OpsPanel(
                title: 'Newest host applications',
                subtitle: 'Most recent host applications entering review.',
                child: Column(
                  children: [
                    for (final app in _applications.take(8))
                      _OpsDenseRow(
                        title: (app['business_name'] ?? app['full_name'] ?? 'Host application').toString(),
                        subtitle: _label((app['applicant_type'] ?? 'host').toString()),
                        trailingTop: _label((app['status'] ?? 'pending').toString()),
                        trailingBottom: ((app['created_at'] ?? '').toString().split('T').first),
                        trailingColor: _statusColor((app['status'] ?? '').toString()),
                      ),
                  ],
                ),
              ),
            ] else if (_tab == 'applications') ...[
              _OpsPanel(
                title: 'Host applications',
                subtitle: 'Approve or reject incoming host requests.',
                child: Column(
                  children: [
                    for (final app in _applications.take(50))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F8FA),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFECECF1)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      (app['business_name'] ?? app['full_name'] ?? 'Host application').toString(),
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                  _OpsPill(
                                    label: _label((app['status'] ?? 'pending').toString()),
                                    color: _statusColor((app['status'] ?? '').toString()),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                [
                                  (app['hosting_location'] ?? '').toString(),
                                  (app['listing_title'] ?? '').toString(),
                                ].where((part) => part.trim().isNotEmpty).join(' • '),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: _updatingApplicationId == app['id'] ? null : () => _setApplicationStatus((app['id'] ?? '').toString(), 'rejected'),
                                      child: const Text('Reject'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: _updatingApplicationId == app['id'] ? null : () => _setApplicationStatus((app['id'] ?? '').toString(), 'approved'),
                                      child: Text(_updatingApplicationId == app['id'] ? 'Updating...' : 'Approve'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ] else if (_tab == 'listings') ...[
              _OpsPanel(
                title: 'Publishing queue',
                subtitle: 'Toggle listing visibility across stays, tours, and transport.',
                child: Column(
                  children: [
                    for (final item in allListings.take(80))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F8FA),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFECECF1)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text((item['title'] ?? 'Listing').toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 2),
                                    Text(
                                      _label((item['_table'] ?? 'listing').toString().replaceAll('transport_vehicles', 'transport').replaceAll('properties', 'property').replaceAll('tour_packages', 'tour package')),
                                      style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              SizedBox(
                                height: 36,
                                child: OutlinedButton(
                                  onPressed: _updatingListingKey == '${item['_table']}:${item['id']}'
                                      ? null
                                      : () => _toggleListing(
                                            (item['_table'] ?? 'properties').toString(),
                                            (item['id'] ?? '').toString(),
                                            !(item['is_published'] == true),
                                          ),
                                  child: Text(_updatingListingKey == '${item['_table']}:${item['id']}' ? 'Updating...' : (item['is_published'] == true ? 'Unpublish' : 'Publish')),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ] else if (_tab == 'bookings') ...[
              _OpsPanel(
                title: 'Recent bookings',
                subtitle: 'Operational watchlist for the newest reservations.',
                child: Column(
                  children: [
                    for (final booking in _bookings.take(60))
                      _OpsDenseRow(
                        title: (booking['guest_name'] ?? 'Guest booking').toString(),
                        subtitle: '${_label((booking['booking_type'] ?? 'booking').toString())} • ${(booking['id'] ?? '').toString().substring(0, 8)}',
                        trailingTop: _label((booking['status'] ?? 'unknown').toString()),
                        trailingBottom: _label((booking['payment_status'] ?? 'unknown').toString()),
                        trailingColor: _statusColor((booking['status'] ?? '').toString()),
                      ),
                  ],
                ),
              ),
            ] else ...[
              _OpsPanel(
                title: 'User data coverage',
                subtitle: 'Profiles with missing contact data surface here first.',
                child: Column(
                  children: [
                    for (final user in _users.take(80))
                      _OpsDenseRow(
                        title: (user['full_name'] ?? 'Unnamed user').toString(),
                        subtitle: (user['bio'] ?? 'No bio').toString(),
                        trailingTop: (user['phone'] ?? '').toString().isEmpty ? 'Missing phone' : 'Ready',
                        trailingBottom: ((user['created_at'] ?? '').toString().split('T').first),
                        trailingColor: (user['phone'] ?? '').toString().isEmpty ? const Color(0xFFB26A00) : const Color(0xFF1E8E5A),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _OpsMetricCard extends StatelessWidget {
  const _OpsMetricCard({required this.label, required this.value, required this.accent});

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFECECF1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(999))),
          const Spacer(),
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.black)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
        ],
      ),
    );
  }
}

class _OpsTabStrip extends StatelessWidget {
  const _OpsTabStrip({required this.value, required this.tabs, required this.onChanged});

  final String value;
  final List<(String, String)> tabs;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final tab in tabs)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(tab.$2),
                selected: value == tab.$1,
                onSelected: (_) => onChanged(tab.$1),
              ),
            ),
        ],
      ),
    );
  }
}

class _OpsPanel extends StatelessWidget {
  const _OpsPanel({required this.title, required this.subtitle, required this.child});

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7E7EC)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 3),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _OpsKeyValueRow extends StatelessWidget {
  const _OpsKeyValueRow({required this.label, required this.value, this.emphasized = false});

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(fontSize: 13, color: emphasized ? AppColors.black : AppColors.hof, fontWeight: emphasized ? FontWeight.w700 : FontWeight.w500))),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _OpsDenseRow extends StatelessWidget {
  const _OpsDenseRow({required this.title, required this.subtitle, required this.trailingTop, required this.trailingBottom, required this.trailingColor});

  final String title;
  final String subtitle;
  final String trailingTop;
  final String trailingBottom;
  final Color trailingColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(trailingTop, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(trailingBottom, style: TextStyle(fontSize: 11, color: trailingColor, fontWeight: FontWeight.w700)),
            ],
          ),
        ],
      ),
    );
  }
}

class _OpsPill extends StatelessWidget {
  const _OpsPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }
}