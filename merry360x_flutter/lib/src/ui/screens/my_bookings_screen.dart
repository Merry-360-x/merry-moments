import 'package:flutter/material.dart';

import '../../session_controller.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _all => widget.session.payload?.bookings ?? [];

  List<Map<String, dynamic>> get _upcoming => _all.where((b) {
    final s = (b['status'] ?? '').toString();
    return s == 'pending' || s == 'confirmed';
  }).toList();

  List<Map<String, dynamic>> get _past => _all.where((b) {
    final s = (b['status'] ?? '').toString();
    return s == 'completed' || s == 'cancelled';
  }).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Color(0xFF1A1A2E)),
        title: const Text('My Bookings',
            style: TextStyle(color: Color(0xFF1A1A2E), fontWeight: FontWeight.w700, fontSize: 17)),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: const Color(0xFFE2555A),
          labelColor: const Color(0xFFE2555A),
          unselectedLabelColor: const Color(0xFF8A8A99),
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: const [Tab(text: 'Upcoming'), Tab(text: 'Past')],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _BookingList(bookings: _upcoming, session: widget.session, isPast: false, onRefresh: () => widget.session.refresh()),
          _BookingList(bookings: _past, session: widget.session, isPast: true, onRefresh: () => widget.session.refresh()),
        ],
      ),
    );
  }
}

class _BookingList extends StatelessWidget {
  const _BookingList({required this.bookings, required this.session, required this.isPast, required this.onRefresh});
  final List<Map<String, dynamic>> bookings;
  final SessionController session;
  final bool isPast;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(isPast ? Icons.history : Icons.luggage_outlined, size: 48, color: const Color(0xFFD0D0D8)),
          const SizedBox(height: 12),
          Text(isPast ? 'No past bookings' : 'No upcoming bookings',
              style: const TextStyle(color: Color(0xFF8A8A99), fontSize: 14)),
        ]),
      );
    }
    return RefreshIndicator(
      color: const Color(0xFFE2555A),
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: bookings.length,
        itemBuilder: (_, i) => _BookingTile(booking: bookings[i], session: session, isPast: isPast, onRefresh: onRefresh),
      ),
    );
  }
}

class _BookingTile extends StatelessWidget {
  const _BookingTile({required this.booking, required this.session, required this.isPast, required this.onRefresh});
  final Map<String, dynamic> booking;
  final SessionController session;
  final bool isPast;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final title = (booking['title'] ?? 'Booking').toString();
    final checkIn = booking['check_in']?.toString() ?? '';
    final checkOut = booking['check_out']?.toString() ?? '';
    final amount = (booking['total_amount'] as num?)?.toDouble() ?? 0;
    final currency = (booking['currency'] ?? 'USD').toString();
    final status = (booking['status'] ?? 'pending').toString();
    final bookingId = (booking['id'] ?? '').toString();
    final hasReview = booking['has_review'] == true;

    final (statusColor, statusBg) = switch (status) {
      'confirmed' => (const Color(0xFF4CAF50), const Color(0xFFE8F5E9)),
      'completed' => (const Color(0xFF2196F3), const Color(0xFFE3F2FD)),
      'cancelled' => (const Color(0xFFE2555A), const Color(0xFFFFEBEE)),
      _ => (const Color(0xFFFF9800), const Color(0xFFFFF3E0)),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: Color(0xFF1A1A2E))),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(20)),
              child: Text(status[0].toUpperCase() + status.substring(1),
                  style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 10),
          if (checkIn.isNotEmpty) ...[
            Row(children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF8A8A99)),
              const SizedBox(width: 6),
              Text('${_fmt(checkIn)}${checkOut.isNotEmpty ? ' → ${_fmt(checkOut)}' : ''}',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF5A5A6B))),
            ]),
            const SizedBox(height: 6),
          ],
          Row(children: [
            const Icon(Icons.payment_outlined, size: 14, color: Color(0xFF8A8A99)),
            const SizedBox(width: 6),
            Text('$currency ${amount.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1A1A2E))),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            if (!isPast && status == 'pending' || status == 'confirmed') ...[
              _ActionBtn(
                label: 'Cancel',
                color: const Color(0xFFE2555A),
                icon: Icons.cancel_outlined,
                onTap: () => _confirmCancel(context, bookingId),
              ),
              const SizedBox(width: 8),
            ],
            if (isPast && status == 'completed' && !hasReview)
              _ActionBtn(
                label: 'Write Review',
                color: const Color(0xFF4CAF50),
                icon: Icons.star_outline,
                onTap: () => _openReview(context, bookingId, title),
              ),
          ]),
        ]),
      ),
    );
  }

  String _fmt(String s) {
    try {
      final d = DateTime.parse(s);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return s;
    }
  }

  void _confirmCancel(BuildContext context, String bookingId) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel Booking'),
        content: const Text('Are you sure you want to cancel this booking? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Keep Booking')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await session.cancelBooking(bookingId);
              onRefresh();
            },
            child: const Text('Cancel Booking', style: TextStyle(color: Color(0xFFE2555A))),
          ),
        ],
      ),
    );
  }

  void _openReview(BuildContext context, String bookingId, String title) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => WriteReviewScreen(session: session, bookingId: bookingId, listingTitle: title),
    ));
  }
}

class _ActionBtn extends StatelessWidget {
  const _ActionBtn({required this.label, required this.color, required this.icon, required this.onTap});
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

// ── Write Review Screen ───────────────────────────────────────
class WriteReviewScreen extends StatefulWidget {
  const WriteReviewScreen({
    super.key, required this.session,
    required this.bookingId, required this.listingTitle,
  });
  final SessionController session;
  final String bookingId;
  final String listingTitle;

  @override
  State<WriteReviewScreen> createState() => _WriteReviewScreenState();
}

class _WriteReviewScreenState extends State<WriteReviewScreen> {
  double _accomRating = 5;
  double _serviceRating = 5;
  final _commentCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_commentCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please add a comment')));
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.session.submitReview(
        bookingId: widget.bookingId,
        title: widget.listingTitle,
        accommodationRating: _accomRating,
        serviceRating: _serviceRating,
        comment: _commentCtrl.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted. Thank you!')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _saving = false);
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
        title: const Text('Write a Review',
            style: TextStyle(color: Color(0xFF1A1A2E), fontWeight: FontWeight.w700, fontSize: 17)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.listingTitle, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1A1A2E))),
          const SizedBox(height: 24),
          _ratingSection('Accommodation Rating', _accomRating, (v) => setState(() => _accomRating = v)),
          const SizedBox(height: 20),
          _ratingSection('Service Rating', _serviceRating, (v) => setState(() => _serviceRating = v)),
          const SizedBox(height: 20),
          const Text('Your Review', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1A1A2E))),
          const SizedBox(height: 8),
          TextField(
            controller: _commentCtrl,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: 'Share your experience…',
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE7E7EC))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE7E7EC))),
            ),
          ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE2555A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _ratingSection(String label, double value, ValueChanged<double> onChange) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1A1A2E))),
        const Spacer(),
        Text(value.toStringAsFixed(1), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFFE2555A))),
      ]),
      const SizedBox(height: 8),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(5, (i) {
          final filled = i < value;
          return GestureDetector(
            onTap: () => onChange((i + 1).toDouble()),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Icon(filled ? Icons.star : Icons.star_border,
                  size: 34, color: filled ? const Color(0xFFFFB800) : const Color(0xFFD0D0D8)),
            ),
          );
        }),
      ),
    ]);
  }
}
