import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final String? screenRoute;
  final Map<String, dynamic> data;
  final bool isRead;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.screenRoute,
    this.data = const {},
    this.isRead = false,
    required this.createdAt,
  });

  factory AppNotification.fromMap(Map<String, dynamic> map) {
    return AppNotification(
      id: map['id']?.toString() ?? '',
      type: map['type']?.toString() ?? '',
      title: map['title']?.toString() ?? '',
      body: map['body']?.toString() ?? '',
      screenRoute: map['screen_route']?.toString(),
      data: map['data'] is Map ? Map<String, dynamic>.from(map['data']) : {},
      isRead: map['is_read'] == true,
      createdAt: DateTime.tryParse(map['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'type': type,
    'title': title,
    'body': body,
    'screen_route': screenRoute,
    'data': data,
    'is_read': isRead,
    'created_at': createdAt.toIso8601String(),
  };
}

class NotificationService extends ChangeNotifier {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  final SupabaseClient _sb = Supabase.instance.client;

  List<AppNotification> _notifications = [];
  int _unreadCount = 0;
  bool _loading = false;
  RealtimeChannel? _realtimeSub;

  /// Stream controller that emits new notifications in real time
  /// for the in-app banner overlay widget.
  final StreamController<AppNotification> _onNotification =
      StreamController<AppNotification>.broadcast();

  Stream<AppNotification> get onNotification => _onNotification.stream;

  List<AppNotification> get notifications => List.unmodifiable(_notifications);
  int get unreadCount => _unreadCount;
  bool get loading => _loading;

  void init({required String userId}) {
    _realtimeSub?.unsubscribe();
    loadNotifications(userId: userId);
    _subscribeRealtime(userId: userId);
  }

  @override
  void dispose() {
    _realtimeSub?.unsubscribe();
    _onNotification.close();
    super.dispose();
  }

  void _subscribeRealtime({required String userId}) {
    _realtimeSub = _sb
        .channel('user-notifications-$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'notifications',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (payload) {
            // Emit the new notification for in-app banner
            final newNotif = AppNotification.fromMap(payload.newRecord);
            _onNotification.add(newNotif);
            // Reload full list
            loadNotifications(userId: userId);
          },
        )
        .subscribe();
  }

  Future<void> loadNotifications({required String userId, int limit = 50}) async {
    if (userId.isEmpty) return;
    _loading = true;
    notifyListeners();

    try {
      final data = await _sb
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(limit);

      final list = (data as List).map((e) => AppNotification.fromMap(e as Map<String, dynamic>)).toList();
      _notifications = list;
      _unreadCount = list.where((n) => !n.isRead).length;
    } catch (e) {
      debugPrint('[NotificationService] Load failed: $e');
    }

    _loading = false;
    notifyListeners();
  }

  Future<void> markAsRead({required String notificationId}) async {
    try {
      await _sb.rpc('mark_notifications_read', params: {
        'p_user_id': _sb.auth.currentUser?.id ?? '',
        'p_ids': [notificationId],
      });
      final idx = _notifications.indexWhere((n) => n.id == notificationId);
      if (idx != -1) {
        _notifications[idx] = AppNotification(
          id: _notifications[idx].id,
          type: _notifications[idx].type,
          title: _notifications[idx].title,
          body: _notifications[idx].body,
          screenRoute: _notifications[idx].screenRoute,
          data: _notifications[idx].data,
          isRead: true,
          createdAt: _notifications[idx].createdAt,
        );
        _unreadCount = _notifications.where((n) => !n.isRead).length;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[NotificationService] markAsRead failed: $e');
    }
  }

  Future<void> markAllAsRead({required String userId}) async {
    try {
      await _sb.rpc('mark_all_notifications_read', params: {
        'p_user_id': userId,
      });
      _notifications = _notifications.map((n) => AppNotification(
        id: n.id, type: n.type, title: n.title, body: n.body,
        screenRoute: n.screenRoute, data: n.data, isRead: true,
        createdAt: n.createdAt,
      )).toList();
      _unreadCount = 0;
      notifyListeners();
    } catch (e) {
      debugPrint('[NotificationService] markAllAsRead failed: $e');
    }
  }

  Future<void> deleteNotification({required String notificationId}) async {
    try {
      final userId = _sb.auth.currentUser?.id ?? '';
      await _sb.rpc('delete_notification', params: {
        'p_id': notificationId,
        'p_user_id': userId,
      });
      _notifications.removeWhere((n) => n.id == notificationId);
      _unreadCount = _notifications.where((n) => !n.isRead).length;
      notifyListeners();
    } catch (e) {
      debugPrint('[NotificationService] deleteNotification failed: $e');
    }
  }
}
