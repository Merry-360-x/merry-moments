import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/notification_service.dart';
import '../../session_controller.dart';
import 'package:merry360x_flutter/l10n/app_localizations.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notifService = NotificationService.instance;

  @override
  void initState() {
    super.initState();
    _notifService.addListener(_onChanged);
  }

  @override
  void dispose() {
    _notifService.removeListener(_onChanged);
    super.dispose();
  }

  void _onChanged() {
    if (mounted) setState(() {});
  }

  void _handleTap(AppNotification notif) {
    if (!notif.isRead) {
      _notifService.markAsRead(notificationId: notif.id);
    }
    if (notif.screenRoute != null && notif.screenRoute!.isNotEmpty) {
      Navigator.pushNamed(context, notif.screenRoute!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final notifs = _notifService.notifications;
    final unread = _notifService.unreadCount;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: Text(l.notifications,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22, color: AppColors.black)),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: () => _notifService.markAllAsRead(userId: widget.session.userId),
              child: Text(l.markAllRead,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      body: notifs.isEmpty
          ? Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.notifications_outlined, size: 56, color: AppColors.hackberry),
                const SizedBox(height: 16),
                Text(l.noNotifications,
                    style: const TextStyle(color: AppColors.foggy, fontSize: 15)),
              ]),
            )
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: notifs.length,
              itemBuilder: (ctx, i) {
                final n = notifs[i];
                final isDark = Theme.of(context).brightness == Brightness.dark;
                return GestureDetector(
                  onTap: () => _handleTap(n),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: n.isRead ? AppColors.surface : (isDark ? const Color(0xFF1A1A2E) : const Color(0xFFF0F7FF)),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: n.isRead ? AppColors.border : AppColors.rausch.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      _iconForType(n.type),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(n.title,
                              style: TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 14,
                                  color: n.isRead ? AppColors.hof : AppColors.black)),
                          const SizedBox(height: 4),
                          Text(n.body,
                              maxLines: 2, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
                          const SizedBox(height: 6),
                          Text(_timeAgo(n.createdAt),
                              style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
                        ]),
                      ),
                      if (!n.isRead)
                        Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.rausch, shape: BoxShape.circle,
                          ),
                        ),
                    ]),
                  ),
                );
              },
            ),
    );
  }

  Widget _iconForType(String type) {
    IconData icon;
    Color color;
    switch (type) {
      case 'booking_confirmed':
      case 'booking_request_sent':
      case 'instant_booking_confirmed':
        icon = Icons.check_circle_outline;
        color = const Color(0xFF008489);
      case 'booking_declined':
      case 'booking_cancelled':
      case 'booking_cancelled_by_guest':
      case 'payment_failed':
      case 'payout_failed':
        icon = Icons.cancel_outlined;
        color = AppColors.rausch;
      case 'payment_success':
      case 'payout_sent':
        icon = Icons.payment_outlined;
        color = const Color(0xFF2E7D32);
      case 'refund_issued':
        icon = Icons.replay;
        color = const Color(0xFF1565C0);
      case 'check_in_reminder':
      case 'guest_check_in_reminder':
        icon = Icons.login;
        color = const Color(0xFFFF8F00);
      case 'check_out_reminder':
        icon = Icons.logout;
        color = const Color(0xFFFF8F00);
      case 'review_reminder':
      case 'new_review':
        icon = Icons.star_outline;
        color = const Color(0xFFFFB800);
      case 'new_message':
        icon = Icons.mail_outline;
        color = const Color(0xFF7C3AED);
      case 'listing_approved':
        icon = Icons.home_outlined;
        color = const Color(0xFF008489);
      case 'listing_flagged':
        icon = Icons.warning_amber_outlined;
        color = AppColors.rausch;
      case 'price_drop':
      case 'promotional_offer':
        icon = Icons.local_offer_outlined;
        color = const Color(0xFFE91E63);
      case 'account_verified':
        icon = Icons.verified_outlined;
        color = const Color(0xFF008489);
      case 'password_changed':
        icon = Icons.lock_outline;
        color = const Color(0xFFFF8F00);
      default:
        icon = Icons.notifications_outlined;
        color = AppColors.hof;
    }
    return Container(
      width: 36, height: 36,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
      child: Icon(icon, size: 18, color: color),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
