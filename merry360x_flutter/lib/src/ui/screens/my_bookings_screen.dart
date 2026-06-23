import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';
import '../../session_controller.dart';
import 'post_booking_center_screen.dart';
import '../../../l10n/app_localizations.dart';
import 'explore_screen.dart' show resolveListingImageUrl;
import '../widgets/swipe_action_wrapper.dart';

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
    widget.session.addListener(_onSessionChanged);
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    _tabs.dispose();
    super.dispose();
  }

  void _onSessionChanged() {
    if (mounted) setState(() {});
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
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: Text(l.myBookings,
            style: const TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 22)),
        actions: [
          IconButton(
            tooltip: l.postBookingCenter,
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
          dividerColor: AppColors.border,
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          tabs: [Tab(text: l.upcoming), Tab(text: l.past)],
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
    final l = AppLocalizations.of(context)!;
    if (bookings.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(isPast ? Icons.history : Icons.luggage_outlined, size: 56, color: AppColors.hackberry),
          const SizedBox(height: 16),
          Text(isPast ? l.noPastBookings : l.noUpcomingBookings,
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
        itemBuilder: (_, i) => _BookingTile(booking: bookings[i], session: session, isPast: isPast, onRefresh: onRefresh, index: i),
      ),
    );
  }
}

String? _resolveBookingImage(Map<String, dynamic> booking, List<Map<String, dynamic>> listings) {
  final direct = booking['main_image']?.toString();
  if (direct != null && direct.isNotEmpty) return direct;

  final ref = (booking['property_id'] ?? booking['tour_id'] ?? booking['transport_id'] ?? '').toString();
  if (ref.isEmpty) return null;

  final type = (booking['booking_type'] ?? '').toString();
  final matched = listings.firstWhere(
    (l) => l['id']?.toString() == ref && (type.isEmpty || l['item_type']?.toString() == type),
    orElse: () => const {},
  );
  if (matched.isEmpty) return null;

  return resolveListingImageUrl(matched);
}

class _BookingTile extends StatelessWidget {
  const _BookingTile({required this.booking, required this.session, required this.isPast, required this.onRefresh, required this.index});
  final Map<String, dynamic> booking;
  final SessionController session;
  final bool isPast;
  final VoidCallback onRefresh;
  final int index;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final listings = session.payload?.homeListings ?? const <Map<String, dynamic>>[];
    final imageUrl = _resolveBookingImage(booking, listings);
    final title = (booking['title'] ?? 'Booking').toString();
    final checkIn = booking['check_in']?.toString() ?? '';
    final checkOut = booking['check_out']?.toString() ?? '';
    final amount = (booking['total_amount'] as num?)?.toDouble() ??
        (booking['total_price'] as num?)?.toDouble() ??
        0;
    final currency = (booking['currency'] ?? 'USD').toString();
    final status = (booking['status'] ?? 'pending').toString();
    final paymentStatus = (booking['payment_status'] ?? 'pending').toString();
    final bookingId = (booking['id'] ?? '').toString();
    final hasReview = booking['has_review'] == true;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final (statusColor, statusBg) = switch (status) {
      'confirmed' => (const Color(0xFF008489), isDark ? const Color(0xFF003D3A) : const Color(0xFFE6F6F5)),
      'completed' => (const Color(0xFF2196F3), isDark ? const Color(0xFF0D2238) : const Color(0xFFE3F2FD)),
      'cancelled' => (AppColors.rausch, isDark ? const Color(0xFF3A0A0F) : const Color(0xFFFFF0F1)),
      _ => (const Color(0xFFFFB400), isDark ? const Color(0xFF3A2800) : const Color(0xFFFFF8E1)),
    };
    final (payColor, payBg) = switch (paymentStatus) {
      'paid' || 'completed' => (const Color(0xFF2E7D32), isDark ? const Color(0xFF1B3A1B) : const Color(0xFFE8F5E9)),
      'failed' || 'rejected' => (AppColors.rausch, isDark ? const Color(0xFF3A0A0F) : const Color(0xFFFFF0F1)),
      'refunded' => (const Color(0xFF1565C0), isDark ? const Color(0xFF0D2238) : const Color(0xFFE3F2FD)),
      _ => (const Color(0xFFFF8F00), isDark ? const Color(0xFF3A2800) : const Color(0xFFFFF8E1)),
    };

    final Widget cardBody = Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 56, height: 42,
                child: imageUrl != null
                    ? CachedNetworkImage(imageUrl: imageUrl, fit: BoxFit.cover,
                        errorWidget: (_, _, _) => _imagePlaceholder,
                        placeholder: (_, _) => _imagePlaceholder)
                    : _imagePlaceholder,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: AppColors.black)),
            ),
            const SizedBox(width: 8),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(20)),
                child: Text(status[0].toUpperCase() + status.substring(1),
                    style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: payBg, borderRadius: BorderRadius.circular(20)),
                child: Text(paymentStatus[0].toUpperCase() + paymentStatus.substring(1),
                    style: TextStyle(fontSize: 11, color: payColor, fontWeight: FontWeight.w600)),
              ),
            ]),
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
            Text(session.formatPrice(amount, itemCurrency: currency),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.black)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            if (!isPast && status == 'pending' || status == 'confirmed') ...[
              _ActionBtn(
                label: l.cancel,
                color: AppColors.rausch,
                icon: Icons.cancel_outlined,
                onTap: () => _confirmCancel(context, bookingId),
              ),
              const SizedBox(width: 8),
            ],
            if (isPast && status == 'completed' && !hasReview)
              _ActionBtn(
                label: l.writeReview,
                color: const Color(0xFF4CAF50),
                icon: Icons.star_outline,
                onTap: () => _openReview(context, bookingId, title),
              ),
          ]),
        ]),
      ),
    );

    final SwipeAction? action;
    if (!isPast && (status == 'pending' || status == 'confirmed')) {
      action = SwipeAction(
        onAction: () => _confirmCancel(context, bookingId),
        color: AppColors.rausch,
        icon: Icons.cancel_outlined,
        label: 'Cancel',
        destructive: true,
      );
    } else if (isPast && status == 'completed' && !hasReview) {
      action = SwipeAction(
        onAction: () => _openReview(context, bookingId, title),
        color: const Color(0xFF4CAF50),
        icon: Icons.star_outline,
        label: 'Review',
      );
    } else {
      action = null;
    }

    if (action != null) {
      return SwipeActionWrapper(
        key: ValueKey('my-booking-${booking['id'] ?? index}'),
        borderRadius: 12,
        margin: const EdgeInsets.only(bottom: 16),
        primaryAction: action,
        child: cardBody,
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: cardBody,
    );
  }

  Widget get _imagePlaceholder => Container(
    color: AppColors.border,
    child: const Icon(Icons.image_outlined, size: 20, color: AppColors.foggy),
  );

  String _fmt(String s) {
    try {
      final d = DateTime.parse(s);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return s;
    }
  }

  void _confirmCancel(BuildContext context, String bookingId) {
    final l = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(l.cancelBooking),
        content: Text(l.cancelBookingConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(l.keepBooking)),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await session.cancelBooking(bookingId);
              onRefresh();
            },
            child: Text(l.cancelBooking, style: const TextStyle(color: AppColors.rausch)),
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
    final l = AppLocalizations.of(context)!;
    if (_commentCtrl.text.trim().isEmpty) {
      AppSnackBar.error(context, l.addComment);
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
        AppSnackBar.success(context, l.reviewSubmitted);
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
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: Text(l.writeAReview,
            style: const TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 22)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.listingTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.black)),
          const SizedBox(height: 24),
          _ratingSection(l.accommodationRating, _accomRating, (v) => setState(() => _accomRating = v)),
          const SizedBox(height: 20),
          _ratingSection(l.serviceRating, _serviceRating, (v) => setState(() => _serviceRating = v)),
          const SizedBox(height: 20),
          Text(l.yourReview, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.black)),
          const SizedBox(height: 8),
          TextField(
            controller: _commentCtrl,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: 'Share your experience\u2026',
              hintStyle: const TextStyle(color: AppColors.foggy),
              filled: true, fillColor: AppColors.surfaceSubtle,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.border)),
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
                  : Text(l.submitReview, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
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
