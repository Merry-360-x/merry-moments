import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = AppDatabase();
  List<Map<String, dynamic>> _notifs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!widget.session.isAuthenticated) return;
    setState(() => _loading = true);
    final n = await _api.fetchNotifications(userId: widget.session.userId);
    if (mounted) {
      setState(() {
        _notifs = n;
        _loading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    await widget.session.markAllNotificationsRead();
    _load();
  }

  int get _unreadCount => _notifs.where((n) => n['is_read'] != true).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Notifications',
              style: TextStyle(
                color: AppColors.black,
                fontWeight: FontWeight.w800,
                fontSize: 22,
              ),
            ),
            if (_unreadCount > 0)
              Text(
                '$_unreadCount unread',
                style: const TextStyle(color: AppColors.rausch, fontSize: 12),
              ),
          ],
        ),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAllRead,
              child: const Text(
                'Mark all read',
                style: TextStyle(
                  color: AppColors.black,
                  fontSize: 13,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh_outlined, color: AppColors.foggy),
            onPressed: _load,
          ),
        ],
      ),
      body: _body(),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.rausch),
      );
    }
    if (_notifs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.notifications_none_outlined,
              size: 56,
              color: AppColors.hackberry,
            ),
            const SizedBox(height: 16),
            const Text(
              'All caught up!',
              style: TextStyle(
                color: AppColors.hof,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'No notifications yet',
              style: TextStyle(color: AppColors.foggy, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: _notifs.length,
        itemBuilder: (_, i) => _NotifTile(
          notif: _notifs[i],
          onTap: () async {
            if (_notifs[i]['is_read'] != true) {
              await _api.markNotificationRead(
                id: (_notifs[i]['id'] ?? '').toString(),
              );
              setState(() => _notifs[i]['is_read'] = true);
            }
          },
        ),
      ),
    );
  }
}

class _NotifTile extends StatelessWidget {
  const _NotifTile({required this.notif, required this.onTap});
  final Map<String, dynamic> notif;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final title = (notif['title'] ?? 'Notification').toString();
    final body = (notif['body'] ?? notif['message'] ?? '').toString();
    final type = (notif['notification_type'] ?? notif['type'] ?? 'info').toString();
    final isRead = notif['is_read'] == true;
    final createdAt = notif['created_at']?.toString() ?? '';

    final icon = switch (type) {
      'booking' => Icons.luggage_outlined,
      'payment' => Icons.payment_outlined,
      'review' => Icons.star_outline,
      'support' => Icons.support_agent_outlined,
      'special' => Icons.campaign_outlined,
      'announcement' => Icons.campaign_outlined,
      _ => Icons.notifications_outlined,
    };

    final color = switch (type) {
      'booking' => const Color(0xFF008489),
      'payment' => const Color(0xFF2196F3),
      'review' => const Color(0xFFFFB400),
      'support' => const Color(0xFF9C27B0),
      'special' => const Color(0xFFE11D48),
      'announcement' => const Color(0xFFE11D48),
      _ => AppColors.rausch,
    };

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: isRead
              ? AppColors.surface
              : (isDark ? const Color(0xFF000000) : const Color(0xFFFFF5F5)),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isRead
                ? AppColors.border
                : (isDark ? const Color(0xFF643245) : const Color(0xFFFFD5D5)),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontWeight: isRead
                                  ? FontWeight.w500
                                  : FontWeight.w700,
                              fontSize: 14,
                              color: AppColors.black,
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    if (body.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        body,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.foggy,
                        ),
                      ),
                    ],
                    if (createdAt.isNotEmpty) ...[
                      const SizedBox(height: 5),
                      Text(
                        _fmtDate(createdAt),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.hackberry,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _fmtDate(String s) {
    try {
      final d = DateTime.parse(s).toLocal();
      final now = DateTime.now();
      final diff = now.difference(d);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return s;
    }
  }
}
