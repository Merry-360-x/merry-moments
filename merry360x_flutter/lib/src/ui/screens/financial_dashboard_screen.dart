import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app.dart';
import '../../utils/number_format.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import '../widgets/return_button.dart';
import '../widgets/swipe_action_wrapper.dart';

class FinancialDashboardScreen extends StatefulWidget {
  const FinancialDashboardScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<FinancialDashboardScreen> createState() => _FinancialDashboardScreenState();
}

class _FinancialDashboardScreenState extends State<FinancialDashboardScreen> {
  final _api = AppDatabase();
  final List<RealtimeChannel> _channels = [];

  bool _loading = true;
  String _tab = 'overview';
  Map<String, dynamic> _stats = const {};
  List<Map<String, dynamic>> _bookings = const [];
  List<Map<String, dynamic>> _payouts = const [];
  List<Map<String, dynamic>> _tickets = const [];
  String? _updatingPayoutId;
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
          .channel('financial-dashboard-$name')
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

    watchTable('bookings', 'bookings');
    watchTable('checkout', 'checkout_requests');
    watchTable('payouts', 'host_payouts');
    watchTable('tickets', 'support_tickets');
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    final results = await Future.wait([
      _api.fetchAdminEnhancedStats(),
      _api.fetchAllBookingsAdmin(limit: 120),
      _api.fetchAdminPayouts(limit: 120),
      _api.fetchAdminSupportTickets(limit: 120),
    ]);
    if (!mounted) return;
    setState(() {
      _stats = results[0] as Map<String, dynamic>;
      _bookings = results[1] as List<Map<String, dynamic>>;
      _payouts = results[2] as List<Map<String, dynamic>>;
      _tickets = results[3] as List<Map<String, dynamic>>;
      _loading = false;
    });
  }

  Future<void> _markPayoutPaid(String id) async {
    setState(() => _updatingPayoutId = id);
    try {
      await _api.updatePayoutStatus(id: id, status: 'paid');
      await _load();
    } finally {
      if (mounted) {
        setState(() => _updatingPayoutId = null);
      }
    }
  }

  Set<String> _extractRefundRefs(Map<String, dynamic> ticket) {
    final refs = <String>{};
    final status = (ticket['status'] ?? '').toString().toLowerCase();
    if (status == 'resolved' || status == 'closed') return refs;

    final subject = (ticket['subject'] ?? '').toString();
    final message = '${ticket['message'] ?? ''}\n${ticket['response'] ?? ''}';
    final category = (ticket['category'] ?? '').toString().toLowerCase();
    if (!subject.toLowerCase().contains('refund') && !message.toLowerCase().contains('refund') && category != 'payment') {
      return refs;
    }

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

  Future<void> _updateBookingPaymentStatus(Map<String, dynamic> booking, String paymentStatus, {String? bookingStatus}) async {
    final bookingId = (booking['id'] ?? '').toString();
    final orderId = (booking['order_id'] ?? '').toString();
    final targetKey = '$bookingId:$paymentStatus';
    setState(() => _updatingBookingKey = targetKey);
    try {
      final payload = <String, dynamic>{
        'payment_status': paymentStatus,
        'updated_at': DateTime.now().toIso8601String(),
      };
      if (bookingStatus != null) payload['status'] = bookingStatus;
      final client = Supabase.instance.client;
      final bookingQuery = client.from('bookings').update(payload);
      if (orderId.isNotEmpty) {
        await bookingQuery.eq('order_id', orderId);
        await client.from('checkout_requests').update({
          'payment_status': paymentStatus,
          'updated_at': DateTime.now().toIso8601String(),
        }).eq('id', orderId);
      } else {
        await bookingQuery.eq('id', bookingId);
      }
      await _load();
    } finally {
      if (mounted) {
        setState(() => _updatingBookingKey = null);
      }
    }
  }

  Future<void> _handleRefundDecision(Map<String, dynamic> booking, String decision) async {
    final targetKey = '${booking['id']}:refund:$decision';
    setState(() => _updatingBookingKey = targetKey);
    try {
      final approve = decision == 'approve';
      await _updateBookingPaymentStatus(
        booking,
        approve ? 'refunded' : 'paid',
        bookingStatus: approve ? 'cancelled' : 'confirmed',
      );
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

  List<Map<String, dynamic>> get _refundTickets {
    return _tickets.where((ticket) {
      final subject = (ticket['subject'] ?? '').toString().toLowerCase();
      final message = (ticket['message'] ?? '').toString().toLowerCase();
      final category = (ticket['category'] ?? '').toString().toLowerCase();
      return subject.contains('refund') || message.contains('refund') || category.contains('refund');
    }).toList();
  }

  String _money(dynamic raw, [String currency = 'RWF']) {
    final value = (raw as num?)?.toDouble() ?? 0;
    return fmtCurrencyWithCode(value, currency);
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
      case 'paid':
      case 'completed':
      case 'resolved':
        return const Color(0xFF1E8E5A);
      case 'pending':
      case 'open':
      case 'awaiting_confirmation':
        return const Color(0xFFB26A00);
      case 'cancelled':
      case 'failed':
        return const Color(0xFFC73D32);
      default:
        return AppColors.hof;
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingPayouts = _payouts.where((p) => (p['status'] ?? '').toString() == 'pending').toList();
    final paidBookings = _bookings.where((b) => (b['payment_status'] ?? '').toString() == 'paid').length;
    final requestedBookings = _bookings.where((b) => (b['payment_status'] ?? '').toString() == 'requested').length;
    final pendingBookings = _bookings.where((b) {
      final status = (b['status'] ?? '').toString();
      return status == 'pending' || status == 'awaiting_confirmation';
    }).length;

    return Scaffold(
      appBar: AppBar(
        leading: const ReturnButton(color: AppColors.black, fallbackRoute: '/'),
        title: const Text('Financial Dashboard'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            // ── Hero revenue banner ──
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
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
                        'NET REVENUE',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF9DA3AE),
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _money(_stats['net_revenue']),
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      height: 1.0,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'After PawaPay & platform fees',
                    style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                  ),
                ],
              ),
            ),
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.35,
              children: [
                _MetricCard(label: 'Gross Revenue', value: _money(_stats['total_revenue']), accent: const Color(0xFF155EEF), icon: Icons.account_balance_wallet_outlined),
                _MetricCard(label: 'Platform Earnings', value: _money(_stats['total_platform_earnings']), accent: const Color(0xFF0F9D58), icon: Icons.trending_up_rounded),
                _MetricCard(label: 'Paid Bookings', value: '$paidBookings', accent: const Color(0xFF7C3AED), icon: Icons.check_circle_outline),
                _MetricCard(label: 'Payment Requests', value: '$requestedBookings', accent: const Color(0xFFEF6C00), icon: Icons.pending_outlined),
              ],
            ),
            const SizedBox(height: 14),
            _TabStrip(
              value: _tab,
              tabs: const [
                ('overview', 'Overview'),
                ('bookings', 'Bookings'),
                ('payouts', 'Payouts'),
                ('refunds', 'Refunds'),
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
              _Panel(
                title: 'Live summary',
                subtitle: 'Realtime values update when bookings, checkout requests, payouts, or tickets change.',
                child: Column(
                  children: [
                    _KeyValueRow(label: 'Net revenue after fees', value: _money(_stats['net_revenue'])),
                    _KeyValueRow(label: 'Host earnings', value: _money(_stats['total_host_earnings'])),
                    _KeyValueRow(label: 'Guest fees', value: _money(_stats['total_guest_fee'])),
                    _KeyValueRow(label: 'Host fees', value: _money(_stats['total_host_fee'])),
                    _KeyValueRow(label: 'PawaPay fees', value: _money(_stats['total_pawapay_fees'])),
                    _KeyValueRow(label: 'Pending bookings', value: '$pendingBookings'),
                    _KeyValueRow(label: 'Pending payouts', value: '${pendingPayouts.length}'),
                    _KeyValueRow(label: 'Refund requests', value: '${_refundTickets.length}', emphasized: true),
                  ],
                ),
              ),
              _Panel(
                title: 'Currency mix',
                subtitle: 'Current gross totals grouped by booking currency.',
                child: (_stats['revenue_by_currency'] is Map && (_stats['revenue_by_currency'] as Map).isNotEmpty)
                    ? Column(
                        children: [
                          for (final entry in (_stats['revenue_by_currency'] as Map).entries)
                            _KeyValueRow(label: entry.key.toString(), value: _money(entry.value, entry.key.toString())),
                        ],
                      )
                    : const Text('No revenue breakdown available yet.', style: TextStyle(fontSize: 13, color: AppColors.foggy)),
              ),
            ] else if (_tab == 'bookings') ...[
              _Panel(
                title: 'Recent bookings',
                subtitle: 'Latest booking and payment states with direct finance actions.',
                child: Column(
                  children: [
                    for (final booking in _bookings.take(40))
                      SwipeActionWrapper(
                        key: ValueKey('finance-booking-${booking['id']}'),
                        primaryAction: ((booking['payment_status'] ?? '').toString() != 'paid' && (booking['payment_status'] ?? '').toString() != 'refunded')
                            ? SwipeAction(
                                onAction: () => _updateBookingPaymentStatus(booking, 'paid'),
                                color: const Color(0xFF1E8E5A),
                                icon: Icons.check_circle,
                                label: 'Mark Paid',
                              )
                            : null,
                        secondaryAction: ((booking['payment_status'] ?? '').toString() != 'paid' && (booking['payment_status'] ?? '').toString() != 'refunded')
                            ? SwipeAction(
                                onAction: () => _updateBookingPaymentStatus(booking, 'requested'),
                                color: const Color(0xFFEF6C00),
                                icon: Icons.payments,
                                label: 'Request',
                                direction: DismissDirection.startToEnd,
                              )
                            : null,
                        child: _FinanceBookingCard(
                          title: (booking['guest_name'] ?? 'Guest booking').toString(),
                          subtitle: '${_label((booking['booking_type'] ?? 'booking').toString())} • ${(booking['id'] ?? '').toString().substring(0, 8)}',
                          amount: _money(booking['total_price'], (booking['currency'] ?? 'RWF').toString()),
                          status: _label((booking['payment_status'] ?? booking['status'] ?? 'unknown').toString()),
                          statusColor: _statusColor((booking['payment_status'] ?? booking['status'] ?? '').toString()),
                          onRequestPayment: ((booking['payment_status'] ?? '').toString() == 'paid' || (booking['payment_status'] ?? '').toString() == 'refunded')
                              ? null
                              : () => _updateBookingPaymentStatus(booking, 'requested'),
                          onMarkPaid: ((booking['payment_status'] ?? '').toString() == 'paid' || (booking['payment_status'] ?? '').toString() == 'refunded')
                              ? null
                              : () => _updateBookingPaymentStatus(booking, 'paid'),
                          loading: _updatingBookingKey == '${booking['id']}:requested' || _updatingBookingKey == '${booking['id']}:paid',
                        ),
                      ),
                  ],
                ),
              ),
            ] else if (_tab == 'payouts') ...[
              _Panel(
                title: 'Host payouts',
                subtitle: 'Pending and completed payout requests.',
                child: Column(
                  children: [
                    for (final payout in _payouts.take(40))
                      SwipeActionWrapper(
                        key: ValueKey('finance-payout-${payout['id']}'),
                        primaryAction: (payout['status'] ?? '').toString() == 'pending'
                            ? SwipeAction(
                                onAction: () => _markPayoutPaid((payout['id'] ?? '').toString()),
                                color: const Color(0xFF1E8E5A),
                                icon: Icons.check_circle,
                                label: 'Mark Paid',
                              )
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        (payout['profiles'] is Map ? ((payout['profiles'] as Map)['full_name'] ?? 'Host payout') : 'Host payout').toString(),
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.black,
                                        ),
                                      ),
                                    ),
                                    _Pill(
                                      label: _label((payout['status'] ?? 'unknown').toString()),
                                      color: _statusColor((payout['status'] ?? '').toString()),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _money(payout['amount'], (payout['currency'] ?? 'RWF').toString()),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.black,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                if ((payout['status'] ?? '').toString() == 'pending')
                                  SizedBox(
                                    width: double.infinity,
                                    child: FilledButton(
                                      onPressed: _updatingPayoutId == payout['id'] ? null : () => _markPayoutPaid((payout['id'] ?? '').toString()),
                                      style: FilledButton.styleFrom(
                                        backgroundColor: AppColors.rausch,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        padding: const EdgeInsets.symmetric(vertical: 10),
                                        textStyle: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      child: Text(_updatingPayoutId == payout['id'] ? 'Updating...' : 'Mark as paid'),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ] else ...[
              _Panel(
                title: 'Refund-related tickets',
                subtitle: 'Support tickets likely requiring financial review and booking decisions.',
                child: _refundTickets.isEmpty
                    ? const Text('No refund tickets found.', style: TextStyle(fontSize: 13, color: AppColors.foggy))
                    : Column(
                        children: [
                          for (final ticket in _refundTickets.take(40))
                            SwipeActionWrapper(
                              key: ValueKey('finance-refund-${ticket['id']}'),
                              primaryAction: (() {
                                final booking = _bookings.cast<Map<String, dynamic>?>().firstWhere(
                                      (entry) {
                                        if (entry == null) return false;
                                        final refs = _extractRefundRefs(ticket);
                                        final bookingId = (entry['id'] ?? '').toString().toLowerCase();
                                        final orderId = (entry['order_id'] ?? '').toString().toLowerCase();
                                        return refs.contains(bookingId) || (orderId.isNotEmpty && refs.contains(orderId));
                                      },
                                      orElse: () => null,
                                    );
                                return booking != null ? SwipeAction(
                                  onAction: () => _handleRefundDecision(booking, 'approve'),
                                  color: const Color(0xFF1E8E5A),
                                  icon: Icons.check_circle,
                                  label: 'Approve',
                                ) : null;
                              })(),
                              secondaryAction: (() {
                                final booking = _bookings.cast<Map<String, dynamic>?>().firstWhere(
                                      (entry) {
                                        if (entry == null) return false;
                                        final refs = _extractRefundRefs(ticket);
                                        final bookingId = (entry['id'] ?? '').toString().toLowerCase();
                                        final orderId = (entry['order_id'] ?? '').toString().toLowerCase();
                                        return refs.contains(bookingId) || (orderId.isNotEmpty && refs.contains(orderId));
                                      },
                                      orElse: () => null,
                                    );
                                return booking != null ? SwipeAction(
                                  onAction: () => _handleRefundDecision(booking, 'decline'),
                                  color: const Color(0xFFC73D32),
                                  icon: Icons.cancel,
                                  label: 'Decline',
                                  direction: DismissDirection.startToEnd,
                                ) : null;
                              })(),
                              child: _FinanceRefundCard(
                                title: (ticket['subject'] ?? 'Support ticket').toString(),
                                subtitle: (ticket['message'] ?? '').toString().replaceAll('\n', ' ').trim(),
                                status: _label((ticket['status'] ?? 'open').toString()),
                                statusColor: _statusColor((ticket['status'] ?? '').toString()),
                                booking: _bookings.cast<Map<String, dynamic>?>().firstWhere(
                                      (booking) {
                                        if (booking == null) return false;
                                        final refs = _extractRefundRefs(ticket);
                                        final bookingId = (booking['id'] ?? '').toString().toLowerCase();
                                        final orderId = (booking['order_id'] ?? '').toString().toLowerCase();
                                        return refs.contains(bookingId) || (orderId.isNotEmpty && refs.contains(orderId));
                                      },
                                      orElse: () => null,
                                    ),
                                onApprove: () {
                                  final booking = _bookings.cast<Map<String, dynamic>?>().firstWhere(
                                        (entry) {
                                          if (entry == null) return false;
                                          final refs = _extractRefundRefs(ticket);
                                          final bookingId = (entry['id'] ?? '').toString().toLowerCase();
                                          final orderId = (entry['order_id'] ?? '').toString().toLowerCase();
                                          return refs.contains(bookingId) || (orderId.isNotEmpty && refs.contains(orderId));
                                        },
                                        orElse: () => null,
                                      );
                                  if (booking != null) {
                                    _handleRefundDecision(booking, 'approve');
                                  }
                                },
                                onDecline: () {
                                  final booking = _bookings.cast<Map<String, dynamic>?>().firstWhere(
                                        (entry) {
                                          if (entry == null) return false;
                                          final refs = _extractRefundRefs(ticket);
                                          final bookingId = (entry['id'] ?? '').toString().toLowerCase();
                                          final orderId = (entry['order_id'] ?? '').toString().toLowerCase();
                                          return refs.contains(bookingId) || (orderId.isNotEmpty && refs.contains(orderId));
                                        },
                                        orElse: () => null,
                                      );
                                  if (booking != null) {
                                    _handleRefundDecision(booking, 'decline');
                                  }
                                },
                                loading: _updatingBookingKey?.contains(':refund:') == true,
                              ),
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

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.accent,
    required this.icon,
  });

  final String label;
  final String value;
  final Color accent;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, size: 17, color: accent),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w900,
              color: AppColors.black,
              height: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.foggy,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _TabStrip extends StatelessWidget {
  const _TabStrip({required this.value, required this.tabs, required this.onChanged});

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
            GestureDetector(
              onTap: () => onChanged(tab.$1),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: value == tab.$1
                      ? AppColors.rausch
                      : AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: value == tab.$1
                        ? AppColors.rausch
                        : AppColors.border,
                  ),
                ),
                child: Text(
                  tab.$2,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: value == tab.$1 ? Colors.white : AppColors.hof,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.title, required this.subtitle, required this.child});

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.foggy,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _KeyValueRow extends StatelessWidget {
  const _KeyValueRow({required this.label, required this.value, this.emphasized = false});

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Divider(height: 1, thickness: 0.6),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 9),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    color: emphasized ? AppColors.black : AppColors.hof,
                    fontWeight: emphasized ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: emphasized ? AppColors.rausch : AppColors.black,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FinanceBookingCard extends StatelessWidget {
  const _FinanceBookingCard({
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.status,
    required this.statusColor,
    required this.onRequestPayment,
    required this.onMarkPaid,
    required this.loading,
  });

  final String title;
  final String subtitle;
  final String amount;
  final String status;
  final Color statusColor;
  final VoidCallback? onRequestPayment;
  final VoidCallback? onMarkPaid;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
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
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.black,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    amount,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.black,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppColors.foggy),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                status,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: loading ? null : onRequestPayment,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.black,
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    child: const Text('Request'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: loading ? null : onMarkPaid,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.rausch,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    child: Text(loading ? 'Updating...' : 'Mark Paid'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FinanceRefundCard extends StatelessWidget {
  const _FinanceRefundCard({
    required this.title,
    required this.subtitle,
    required this.status,
    required this.statusColor,
    required this.booking,
    required this.onApprove,
    required this.onDecline,
    required this.loading,
  });

  final String title;
  final String subtitle;
  final String status;
  final Color statusColor;
  final Map<String, dynamic>? booking;
  final VoidCallback onApprove;
  final VoidCallback onDecline;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppColors.foggy),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                status,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
            ),
            if (booking != null) ...[
              const SizedBox(height: 4),
              Text('Booking ${(booking!['id'] ?? '').toString().substring(0, 8)}', style: const TextStyle(fontSize: 11, color: AppColors.hof)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: loading ? null : onDecline,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.rausch,
                        side: const BorderSide(color: AppColors.rausch),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        textStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      child: const Text('Decline'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: loading ? null : onApprove,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF1E8E5A),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        textStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      child: Text(loading ? 'Updating...' : 'Approve'),
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

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color});

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