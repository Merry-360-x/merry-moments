import 'package:flutter/material.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';
import '../../session_controller.dart';
import 'post_booking_center_screen.dart';

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
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: const Text('My Bookings',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 22)),
        actions: [
          IconButton(
            tooltip: 'Post-booking center',
            icon: const Icon(Icons.account_balance_wallet_outlined, color: AppColors.hof),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => PostBookingCenterScreen(session: widget.session),
              ),
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: AppColors.black,
          indicatorWeight: 2,
          labelColor: AppColors.black,
          unselectedLabelColor: AppColors.foggy,
          dividerColor: const Color(0xFFEBEBEB),
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
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
          Icon(isPast ? Icons.history : Icons.luggage_outlined, size: 56, color: AppColors.hackberry),
          const SizedBox(height: 16),
          Text(isPast ? 'No past bookings' : 'No upcoming bookings',
              style: const TextStyle(color: AppColors.foggy, fontSize: 15)),
        ]),
      );
    }
    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
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
      'confirmed' => (const Color(0xFF008489), const Color(0xFFE6F6F5)),
      'completed' => (const Color(0xFF2196F3), const Color(0xFFE3F2FD)),
      'cancelled' => (AppColors.rausch, const Color(0xFFFFF0F1)),
      _ => (const Color(0xFFFFB400), const Color(0xFFFFF8E1)),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: AppColors.black)),
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
              const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.foggy),
              const SizedBox(width: 6),
              Text('${_fmt(checkIn)}${checkOut.isNotEmpty ? ' \u2192 ${_fmt(checkOut)}' : ''}',
                  style: const TextStyle(fontSize: 13, color: AppColors.hof)),
            ]),
            const SizedBox(height: 6),
          ],
          Row(children: [
            const Icon(Icons.payment_outlined, size: 14, color: AppColors.foggy),
            const SizedBox(width: 6),
            Text('$currency ${amount.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.black)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            if (!isPast && status == 'pending' || status == 'confirmed') ...[
              _ActionBtn(
                label: 'Cancel',
                color: AppColors.rausch,
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
            child: const Text('Cancel Booking', style: TextStyle(color: AppColors.rausch)),
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
      AppSnackBar.error(context, 'Please add a comment');
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
        AppSnackBar.success(context, 'Review submitted. Thank you!');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) AppSnackBar.error(context, 'Error: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: const Text('Write a Review',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 22)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.listingTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.black)),
          const SizedBox(height: 24),
          _ratingSection('Accommodation Rating', _accomRating, (v) => setState(() => _accomRating = v)),
          const SizedBox(height: 20),
          _ratingSection('Service Rating', _serviceRating, (v) => setState(() => _serviceRating = v)),
          const SizedBox(height: 20),
          const Text('Your Review', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.black)),
          const SizedBox(height: 8),
          TextField(
            controller: _commentCtrl,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: 'Share your experience\u2026',
              hintStyle: const TextStyle(color: AppColors.foggy),
              filled: true, fillColor: AppColors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFEBEBEB))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFEBEBEB))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.black, width: 2)),
            ),
          ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.rausch,
                foregroundColor: AppColors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.black)),
        const Spacer(),
        Text(value.toStringAsFixed(1), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.rausch)),
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
