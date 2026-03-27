import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import '../widgets/return_button.dart';

class SupportDashboardScreen extends StatefulWidget {
  const SupportDashboardScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<SupportDashboardScreen> createState() => _SupportDashboardScreenState();
}

class _SupportDashboardScreenState extends State<SupportDashboardScreen> {
  final _api = AppDatabase();
  final List<RealtimeChannel> _channels = [];

  bool _loading = true;
  String _tab = 'overview';
  List<Map<String, dynamic>> _users = const [];
  List<Map<String, dynamic>> _tickets = const [];
  List<Map<String, dynamic>> _bookings = const [];
  String? _ticketUpdateId;
  String? _updatingBookingKey;

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
          .channel('support-dashboard-$name')
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

    watchTable('profiles', 'profiles');
    watchTable('bookings', 'bookings');
    watchTable('tickets', 'support_tickets');
    watchTable('messages', 'support_messages');
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    final results = await Future.wait([
      _api.fetchAllUsers(limit: 120),
      _api.fetchAdminSupportTickets(limit: 160),
      _api.fetchAllBookingsAdmin(limit: 120),
    ]);
    if (!mounted) return;
    setState(() {
      _users = results[0];
      _tickets = results[1];
      _bookings = results[2];
      _loading = false;
    });
  }

  Future<void> _setTicketStatus(String id, String status) async {
    setState(() => _ticketUpdateId = id);
    try {
      await _api.updateSupportTicketStatus(id: id, status: status);
      await _load();
    } finally {
      if (mounted) {
        setState(() => _ticketUpdateId = null);
      }
    }
  }

  Set<String> _extractRefundRefs(Map<String, dynamic> ticket) {
    final refs = <String>{};
    final status = (ticket['status'] ?? '').toString().toLowerCase();
    if (status == 'resolved' || status == 'closed') return refs;
    final subject = (ticket['subject'] ?? '').toString();
    final category = (ticket['category'] ?? '').toString().toLowerCase();
    final message = '${ticket['message'] ?? ''}\n${ticket['response'] ?? ''}';
    final isRefund = subject.toLowerCase().contains('refund') || category == 'payment' || message.toLowerCase().contains('refund');
    if (!isRefund) return refs;
    final patterns = [
      RegExp(r'booking\s*id\s*[:#-]?\s*([a-z0-9-]{6,})', caseSensitive: false),
      RegExp(r'order\s*id\s*[:#-]?\s*([a-z0-9-]{6,})', caseSensitive: false),
      RegExp(r'refund request for booking\s+([a-z0-9-]{6,})', caseSensitive: false),
    ];
    for (final pattern in patterns) {
      for (final match in pattern.allMatches('$subject\n$message')) {
        final ref = match.group(1);
        if (ref != null && ref.isNotEmpty) refs.add(ref.toLowerCase());
      }
    }
    return refs;
  }

  Map<String, dynamic>? _findOpenRefundTicket(Map<String, dynamic> booking) {
    final bookingId = (booking['id'] ?? '').toString().toLowerCase();
    final orderId = (booking['order_id'] ?? '').toString().toLowerCase();
    for (final ticket in _tickets) {
      final refs = _extractRefundRefs(ticket);
      if (refs.contains(bookingId) || (orderId.isNotEmpty && refs.contains(orderId))) {
        return ticket;
      }
    }
    return null;
  }

  Future<void> _handleRefundDecision(Map<String, dynamic> booking, String decision) async {
    final targetKey = '${booking['id']}:refund:$decision';
    setState(() => _updatingBookingKey = targetKey);
    try {
      final approve = decision == 'approve';
      final client = Supabase.instance.client;
      final bookingId = (booking['id'] ?? '').toString();
      final orderId = (booking['order_id'] ?? '').toString();
      final payload = {
        'payment_status': approve ? 'refunded' : 'paid',
        'status': approve ? 'cancelled' : 'confirmed',
        'updated_at': DateTime.now().toIso8601String(),
      };
      final bookingQuery = client.from('bookings').update(payload);
      if (orderId.isNotEmpty) {
        await bookingQuery.eq('order_id', orderId);
      } else {
        await bookingQuery.eq('id', bookingId);
      }
      final ticket = _findOpenRefundTicket(booking);
      if (ticket != null) {
        await _api.updateSupportTicketStatus(id: (ticket['id'] ?? '').toString(), status: 'resolved');
      }
      await _load();
    } finally {
      if (mounted) {
        setState(() => _updatingBookingKey = null);
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
      case 'resolved':
      case 'closed':
      case 'paid':
      case 'completed':
        return const Color(0xFF1E8E5A);
      case 'open':
      case 'pending':
      case 'awaiting_confirmation':
        return const Color(0xFFB26A00);
      case 'urgent':
      case 'cancelled':
      case 'failed':
        return const Color(0xFFC73D32);
      default:
        return AppColors.hof;
    }
  }

  @override
  Widget build(BuildContext context) {
    final openTickets = _tickets.where((ticket) => (ticket['status'] ?? 'open').toString() != 'resolved').length;
    final highPriority = _tickets.where((ticket) => (ticket['priority'] ?? '').toString() == 'high').length;
    final pendingBookings = _bookings.where((booking) {
      final status = (booking['status'] ?? '').toString();
      return status == 'pending' || status == 'awaiting_confirmation';
    }).length;
    final recentUsers = _users.take(6).toList();
    final newThisWeek = _users.where((user) {
      final createdAt = DateTime.tryParse((user['created_at'] ?? '').toString());
      if (createdAt == null) return false;
      return createdAt.isAfter(DateTime.now().subtract(const Duration(days: 7)));
    }).length;

    return Scaffold(
      appBar: AppBar(
        leading: const ReturnButton(color: AppColors.black, fallbackRoute: '/'),
        title: const Text('Support Dashboard'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            const Text(
              'Users, tickets, and booking issues synced directly from the live platform tables.',
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
                _SupportMetricCard(label: 'Users', value: '${_users.length}', accent: const Color(0xFF155EEF)),
                _SupportMetricCard(label: 'Open Tickets', value: '$openTickets', accent: const Color(0xFFB26A00)),
                _SupportMetricCard(label: 'High Priority', value: '$highPriority', accent: const Color(0xFFC73D32)),
                _SupportMetricCard(label: 'New This Week', value: '$newThisWeek', accent: const Color(0xFF0F9D58)),
              ],
            ),
            const SizedBox(height: 14),
            _SupportTabStrip(
              value: _tab,
              tabs: const [
                ('overview', 'Overview'),
                ('tickets', 'Tickets'),
                ('users', 'Users'),
                ('bookings', 'Bookings'),
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
              _SupportPanel(
                title: 'Queue health',
                subtitle: 'A compact view of what needs response first.',
                child: Column(
                  children: [
                    _SupportKeyValueRow(label: 'Open tickets', value: '$openTickets', emphasized: true),
                    _SupportKeyValueRow(label: 'High priority tickets', value: '$highPriority'),
                    _SupportKeyValueRow(label: 'Resolved tickets', value: '${_tickets.length - openTickets}'),
                    _SupportKeyValueRow(label: 'Pending bookings', value: '$pendingBookings'),
                    _SupportKeyValueRow(label: 'Recent users added', value: '${recentUsers.length}'),
                  ],
                ),
              ),
              _SupportPanel(
                title: 'Newest users',
                subtitle: 'Recent profile records from the live user stream.',
                child: Column(
                  children: [
                    for (final user in recentUsers)
                      _SupportDenseRow(
                        title: (user['full_name'] ?? 'Unnamed user').toString(),
                        subtitle: (user['phone'] ?? 'No phone').toString(),
                        trailingTop: ((user['created_at'] ?? '').toString().split('T').first),
                        trailingBottom: 'Profile',
                        trailingColor: const Color(0xFF155EEF),
                      ),
                  ],
                ),
              ),
            ] else if (_tab == 'tickets') ...[
              _SupportPanel(
                title: 'Support tickets',
                subtitle: 'Realtime ticket queue with quick status changes.',
                child: Column(
                  children: [
                    for (final ticket in _tickets.take(50))
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
                                      (ticket['subject'] ?? 'Support ticket').toString(),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                  _SupportPill(
                                    label: _label((ticket['status'] ?? 'open').toString()),
                                    color: _statusColor((ticket['status'] ?? '').toString()),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  if ((ticket['priority'] ?? '').toString().isNotEmpty)
                                    _SupportPill(
                                      label: _label((ticket['priority'] ?? 'normal').toString()),
                                      color: (ticket['priority'] ?? '').toString() == 'high' ? const Color(0xFFC73D32) : const Color(0xFF155EEF),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                (ticket['message'] ?? '').toString().replaceAll('\n', ' '),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: _ticketUpdateId == ticket['id'] ? null : () => _setTicketStatus((ticket['id'] ?? '').toString(), 'open'),
                                      child: const Text('Reopen'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: _ticketUpdateId == ticket['id'] ? null : () => _setTicketStatus((ticket['id'] ?? '').toString(), 'resolved'),
                                      child: Text(_ticketUpdateId == ticket['id'] ? 'Updating...' : 'Resolve'),
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
            ] else if (_tab == 'users') ...[
              _SupportPanel(
                title: 'Profiles',
                subtitle: 'Recently created users and profile completeness signals.',
                child: Column(
                  children: [
                    for (final user in _users.take(60))
                      _SupportDenseRow(
                        title: (user['full_name'] ?? 'Unnamed user').toString(),
                        subtitle: (user['bio'] ?? user['phone'] ?? 'No bio or phone').toString(),
                        trailingTop: ((user['created_at'] ?? '').toString().split('T').first),
                        trailingBottom: (user['phone'] ?? '').toString().isEmpty ? 'Missing phone' : 'Profile ready',
                        trailingColor: (user['phone'] ?? '').toString().isEmpty ? const Color(0xFFB26A00) : const Color(0xFF1E8E5A),
                      ),
                  ],
                ),
              ),
            ] else ...[
              _SupportPanel(
                title: 'Booking issues feed',
                subtitle: 'Latest booking records with refund handling for support follow-up.',
                child: Column(
                  children: [
                    for (final booking in _bookings.take(50))
                      _SupportBookingCard(
                        title: (booking['guest_name'] ?? 'Guest booking').toString(),
                        subtitle: '${_label((booking['booking_type'] ?? 'booking').toString())} • ${(booking['id'] ?? '').toString().substring(0, 8)}',
                        topStatus: _label((booking['status'] ?? 'unknown').toString()),
                        bottomStatus: _label((booking['payment_status'] ?? 'unknown').toString()),
                        statusColor: _statusColor((booking['status'] ?? '').toString()),
                        showRefundActions: _findOpenRefundTicket(booking) != null,
                        onApproveRefund: () => _handleRefundDecision(booking, 'approve'),
                        onDeclineRefund: () => _handleRefundDecision(booking, 'decline'),
                        loading: _updatingBookingKey?.contains('${booking['id']}:refund:') == true,
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

class _SupportMetricCard extends StatelessWidget {
  const _SupportMetricCard({required this.label, required this.value, required this.accent});

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFECECF1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(999)),
          ),
          const Spacer(),
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.black)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
        ],
      ),
    );
  }
}

class _SupportTabStrip extends StatelessWidget {
  const _SupportTabStrip({required this.value, required this.tabs, required this.onChanged});

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

class _SupportPanel extends StatelessWidget {
  const _SupportPanel({required this.title, required this.subtitle, required this.child});

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
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

class _SupportKeyValueRow extends StatelessWidget {
  const _SupportKeyValueRow({required this.label, required this.value, this.emphasized = false});

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: 13, color: emphasized ? AppColors.black : AppColors.hof, fontWeight: emphasized ? FontWeight.w700 : FontWeight.w500),
            ),
          ),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _SupportDenseRow extends StatelessWidget {
  const _SupportDenseRow({
    required this.title,
    required this.subtitle,
    required this.trailingTop,
    required this.trailingBottom,
    required this.trailingColor,
  });

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

class _SupportPill extends StatelessWidget {
  const _SupportPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _SupportBookingCard extends StatelessWidget {
  const _SupportBookingCard({
    required this.title,
    required this.subtitle,
    required this.topStatus,
    required this.bottomStatus,
    required this.statusColor,
    required this.showRefundActions,
    required this.onApproveRefund,
    required this.onDeclineRefund,
    required this.loading,
  });

  final String title;
  final String subtitle;
  final String topStatus;
  final String bottomStatus;
  final Color statusColor;
  final bool showRefundActions;
  final VoidCallback onApproveRefund;
  final VoidCallback onDeclineRefund;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Padding(
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
                    Text(topStatus, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(bottomStatus, style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w700)),
                  ],
                ),
              ],
            ),
            if (showRefundActions) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: loading ? null : onDeclineRefund,
                      child: const Text('Decline Refund'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: loading ? null : onApproveRefund,
                      child: Text(loading ? 'Updating...' : 'Approve Refund'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}