import 'package:flutter/material.dart';

import '../../services/mobile_api.dart';
import '../../session_controller.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = MobileApi();
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
    if (mounted) setState(() { _notifs = n; _loading = false; });
  }

  Future<void> _markAllRead() async {
    await widget.session.markAllNotificationsRead();
    _load();
  }

  int get _unreadCount => _notifs.where((n) => n['is_read'] != true).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Color(0xFF1A1A2E)),
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Notifications', style: TextStyle(color: Color(0xFF1A1A2E), fontWeight: FontWeight.w700, fontSize: 17)),
          if (_unreadCount > 0)
            Text('$_unreadCount unread', style: const TextStyle(color: Color(0xFFE2555A), fontSize: 11)),
        ]),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Mark all read', style: TextStyle(color: Color(0xFFE2555A), fontSize: 13)),
            ),
          IconButton(
            icon: const Icon(Icons.refresh_outlined, color: Color(0xFF8A8A99)),
            onPressed: _load,
          ),
        ],
      ),
      body: _body(),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFFE2555A)));
    if (_notifs.isEmpty) return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.notifications_none_outlined, size: 52, color: Color(0xFFD0D0D8)),
        const SizedBox(height: 12),
        const Text('All caught up!', style: TextStyle(color: Color(0xFF8A8A99), fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        const Text('No notifications yet', style: TextStyle(color: Color(0xFFB0B0BC), fontSize: 13)),
      ]),
    );

    return RefreshIndicator(
      color: const Color(0xFFE2555A),
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _notifs.length,
        itemBuilder: (_, i) => _NotifTile(
          notif: _notifs[i],
          onTap: () async {
            if (_notifs[i]['is_read'] != true) {
              await _api.markNotificationRead(id: (_notifs[i]['id'] ?? '').toString());
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
    final title = (notif['title'] ?? 'Notification').toString();
    final body = (notif['body'] ?? notif['message'] ?? '').toString();
    final type = (notif['type'] ?? 'info').toString();
    final isRead = notif['is_read'] == true;
    final createdAt = notif['created_at']?.toString() ?? '';

    final icon = switch (type) {
      'booking' => Icons.luggage_outlined,
      'payment' => Icons.payment_outlined,
      'review' => Icons.star_outline,
      'support' => Icons.support_agent_outlined,
      _ => Icons.notifications_outlined,
    };

    final color = switch (type) {
      'booking' => const Color(0xFF4CAF50),
      'payment' => const Color(0xFF2196F3),
      'review' => const Color(0xFFFFB800),
      'support' => const Color(0xFF9C27B0),
      _ => const Color(0xFFE2555A),
    };

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: isRead ? Colors.white : const Color(0xFFFFF5F5),
          borderRadius: BorderRadius.circular(14),
          border: isRead ? null : Border.all(color: const Color(0xFFFFD5D5)),
          boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2))],
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(
                    child: Text(title, style: TextStyle(
                      fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                      fontSize: 13, color: const Color(0xFF1A1A2E),
                    )),
                  ),
                  if (!isRead)
                    Container(width: 8, height: 8,
                        decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                ]),
                if (body.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(body, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF8A8A99))),
                ],
                if (createdAt.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(_fmtDate(createdAt), style: const TextStyle(fontSize: 11, color: Color(0xFFB0B0BC))),
                ],
              ]),
            ),
          ]),
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
