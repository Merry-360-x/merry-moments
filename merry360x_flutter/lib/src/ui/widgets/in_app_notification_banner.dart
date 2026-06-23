import 'dart:async';
import 'package:flutter/material.dart';
import '../screens/notifications_screen.dart';
import '../../app.dart';
import '../../services/notification_service.dart';

/// An overlay banner that slides down from the top of the screen
/// when a new notification arrives in real time.
class InAppNotificationBanner extends StatefulWidget {
  const InAppNotificationBanner({super.key, required this.session});
  final dynamic session;

  @override
  State<InAppNotificationBanner> createState() => _InAppNotificationBannerState();
}

class _InAppNotificationBannerState extends State<InAppNotificationBanner>
    with SingleTickerProviderStateMixin {
  final NotificationService _notifService = NotificationService.instance;
  StreamSubscription<AppNotification>? _sub;

  late AnimationController _animCtrl;
  late Animation<Offset> _slideAnim;
  late Animation<double> _opacityAnim;

  AppNotification? _currentNotif;
  Timer? _autoDismiss;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic));
    _opacityAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animCtrl, curve: const Interval(0, 0.6, curve: Curves.easeOut)),
    );

    _sub = _notifService.onNotification.listen(_onNotification);
  }

  @override
  void dispose() {
    _sub?.cancel();
    _autoDismiss?.cancel();
    _animCtrl.dispose();
    super.dispose();
  }

  void _onNotification(AppNotification notif) {
    _autoDismiss?.cancel();
    setState(() => _currentNotif = notif);
    _animCtrl.forward();
    _autoDismiss = Timer(const Duration(seconds: 4), _dismiss);
  }

  void _dismiss() {
    _animCtrl.reverse().then((_) {
      if (mounted) setState(() => _currentNotif = null);
    });
  }

  void _onTap() {
    _autoDismiss?.cancel();
    _animCtrl.reverse();
    if (_currentNotif != null && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => NotificationsScreen(session: widget.session),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_currentNotif == null) return const SizedBox.shrink();
    final n = _currentNotif!;
    final topPad = MediaQuery.of(context).padding.top;

    return SlideTransition(
      position: _slideAnim,
      child: FadeTransition(
        opacity: _opacityAnim,
        child: GestureDetector(
          onTap: _onTap,
          onVerticalDragEnd: (_) => _dismiss(),
          child: Container(
            margin: EdgeInsets.only(top: topPad + 8, left: 12, right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF2C2C2E),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF38383A)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 3,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.rausch,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        n.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: Color(0xFFFFFFFF),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        n.body,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF8E8E93),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.close, size: 18, color: Color(0xFF6C6C70)),
                  onPressed: _dismiss,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
