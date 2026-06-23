import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/notification_service.dart';
import '../../session_controller.dart';
import 'package:merry360x_flutter/l10n/app_localizations.dart';
import 'my_bookings_screen.dart';
import 'post_booking_center_screen.dart';
import 'messages_screen.dart';
import 'explore_screen.dart';
import 'wishlists_screen.dart';
import 'host_dashboard_screen.dart';
import 'admin_dashboard_screen.dart';

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
    _navigateToRoute(notif);
  }

  void _navigateToRoute(AppNotification notif) {
    final route = notif.screenRoute;
    if (route == null || route.isEmpty) return;

    final uri = Uri.tryParse(route);
    final path = uri?.path ?? route;
    final session = widget.session;

    if (path.startsWith('/my-bookings')) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => MyBookingsScreen(session: session),
      ));
    } else if (path.startsWith('/host/')) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => HostDashboardScreen(session: session),
      ));
    } else if (path.startsWith('/admin/')) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => AdminDashboardScreen(session: session),
      ));
    } else if (path.startsWith('/post-booking')) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => PostBookingCenterScreen(session: session),
      ));
    } else if (path.startsWith('/messages')) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => MessagesScreen(session: session),
      ));
    } else if (path.startsWith('/explore')) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => ExploreScreen(session: session),
      ));
    } else if (path.startsWith('/wishlists')) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => WishlistsScreen(session: session),
      ));
    } else {
      // Unknown route — pop back to MainShell
      Navigator.pop(context);
    }
  }

  void _onDismissed(AppNotification notif) {
    _notifService.deleteNotification(notificationId: notif.id);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final notifs = _notifService.notifications;
    final unread = _notifService.unreadCount;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1C1C1E) : AppColors.surface,
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1C1C1E) : AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: StageSafeLeadingButton(
          color: isDark ? const Color(0xFFFFFFFF) : AppColors.black,
        ),
        title: Text(
          l.notifications,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 22,
            color: isDark ? const Color(0xFFFFFFFF) : AppColors.black,
          ),
        ),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: () => _notifService.markAllAsRead(userId: widget.session.userId),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.rausch,
              ),
              child: Text(
                l.markAllRead,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
        ],
      ),
      body: notifs.isEmpty
          ? _emptyState(isDark, l)
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: notifs.length,
              itemBuilder: (ctx, i) {
                final n = notifs[i];
                return _NotificationTile(
                  notification: n,
                  isDark: isDark,
                  onTap: () => _handleTap(n),
                  onDismissed: () => _onDismissed(n),
                );
              },
            ),
    );
  }

  Widget _emptyState(bool isDark, AppLocalizations l) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(
          Icons.notifications_outlined,
          size: 56,
          color: isDark ? const Color(0xFF6C6C70) : AppColors.hackberry,
        ),
        const SizedBox(height: 16),
        Text(
          l.noNotifications,
          style: TextStyle(
            color: isDark ? const Color(0xFF8E8E93) : AppColors.foggy,
            fontSize: 15,
          ),
        ),
      ]),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.isDark,
    required this.onTap,
    required this.onDismissed,
  });

  final AppNotification notification;
  final bool isDark;
  final VoidCallback onTap;
  final VoidCallback onDismissed;

  @override
  Widget build(BuildContext context) {
    final n = notification;
    final bgColor = n.isRead
        ? (isDark ? const Color(0xFF1C1C1E) : AppColors.surface)
        : (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF0F7FF));
    final borderColor = n.isRead
        ? (isDark ? const Color(0xFF38383A) : AppColors.border)
        : AppColors.rausch.withValues(alpha: isDark ? 0.5 : 0.3);

    return Dismissible(
      key: ValueKey(n.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: AppColors.rausch,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.white, size: 22),
      ),
      onDismissed: (_) => onDismissed(),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor, width: n.isRead ? 0.5 : 1),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Left accent bar for unread
                if (!n.isRead)
                  Container(
                    width: 3,
                    decoration: BoxDecoration(
                      color: AppColors.rausch,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(12),
                        bottomLeft: Radius.circular(12),
                      ),
                    ),
                  ),
                if (n.isRead)
                  const SizedBox(width: 3),
                const SizedBox(width: 12),
                // Icon
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: _iconForType(n.type),
                ),
                const SizedBox(width: 12),
                // Content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          n.title,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: isDark
                                ? const Color(0xFFFFFFFF)
                                : (n.isRead ? AppColors.hof : AppColors.black),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          n.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? const Color(0xFF8E8E93) : AppColors.foggy,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _timeAgo(n.createdAt),
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? const Color(0xFF6C6C70) : AppColors.foggy,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
            ),
          ),
        ),
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
      case 'payment_received':
      case 'extra_charge_paid':
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
      case 'guest_checked_out':
        icon = Icons.logout;
        color = const Color(0xFFFF8F00);
      case 'guest_checked_in':
        icon = Icons.login;
        color = const Color(0xFF008489);
      case 'review_reminder':
      case 'new_review':
      case 'host_review_received':
      case 'host_review_reply':
        icon = Icons.star_outline;
        color = const Color(0xFFFFB800);
      case 'new_message':
      case 'new_message_from_host':
      case 'new_message_from_guest':
        icon = Icons.mail_outline;
        color = const Color(0xFF7C3AED);
      case 'listing_approved':
      case 'listing_submitted':
      case 'listing_tour_approved':
        icon = Icons.home_outlined;
        color = const Color(0xFF008489);
      case 'listing_rejected':
      case 'listing_flagged':
        icon = Icons.warning_amber_outlined;
        color = AppColors.rausch;
      case 'price_drop':
      case 'promotional_offer':
        icon = Icons.local_offer_outlined;
        color = const Color(0xFFE91E63);
      case 'new_charge_added':
        icon = Icons.receipt_long_outlined;
        color = const Color(0xFFD97706);
      case 'dispute_resolved':
      case 'dispute_requires_admin':
        icon = Icons.gavel_outlined;
        color = const Color(0xFF92400E);
      case 'dispute_opened':
        icon = Icons.gavel_outlined;
        color = AppColors.rausch;
      case 'account_verified':
        icon = Icons.verified_outlined;
        color = const Color(0xFF008489);
      case 'password_changed':
        icon = Icons.lock_outline;
        color = const Color(0xFFFF8F00);
      case 'host_registered':
        icon = Icons.person_add_outlined;
        color = const Color(0xFF008489);
      case 'new_support_ticket':
        icon = Icons.support_agent_outlined;
        color = const Color(0xFF1565C0);
      case 'high_value_booking':
        icon = Icons.trending_up_outlined;
        color = const Color(0xFFE91E63);
      case 'user_flagged':
        icon = Icons.flag_outlined;
        color = AppColors.rausch;
      case 'platform_milestone':
        icon = Icons.emoji_events_outlined;
        color = const Color(0xFFFFB800);
      case 'tour_pending_approval':
      case 'tour_starts_soon':
        icon = Icons.explore_outlined;
        color = const Color(0xFF008489);
      default:
        icon = Icons.notifications_outlined;
        color = isDark ? const Color(0xFF8E8E93) : AppColors.hof;
    }
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
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
