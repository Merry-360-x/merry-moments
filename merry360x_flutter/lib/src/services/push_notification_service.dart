import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {
    // Ignore initialization failures in background isolate.
  }
}

/// Android notification channel used for all app push notifications.
const _kAndroidChannelId = 'merry360x_default';
const _kAndroidChannelName = 'Merry360x Notifications';
const _kAndroidChannelDesc = 'Booking updates, messages, and special offers';

class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  bool _initialized = false;
  bool _firebaseReady = false;
  bool _apnsPendingLogged = false;
  String? _cachedToken;
  StreamSubscription<String>? _tokenRefreshSub;
  StreamSubscription<RemoteMessage>? _foregroundSub;

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  /// Emits the data payload whenever a notification is tapped
  /// (background or cold-start). Consumers should listen in their
  /// navigator context to perform routing.
  final StreamController<Map<String, String>> onNotificationTap =
      StreamController<Map<String, String>>.broadcast();

  bool get _isIos => !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

  bool _isApnsNotReadyError(Object error) {
    if (error is FirebaseException) {
      return error.plugin == 'firebase_messaging' &&
          error.code == 'apns-token-not-set';
    }
    return error.toString().toLowerCase().contains('apns-token-not-set');
  }

  Future<String?> _resolveFcmToken({bool waitForApns = true}) async {
    final cached = _cachedToken?.trim();
    if (cached != null && cached.isNotEmpty) {
      return cached;
    }

    final messaging = FirebaseMessaging.instance;

    if (_isIos && waitForApns) {
      String? apnsToken = await messaging.getAPNSToken();
      if (apnsToken == null || apnsToken.trim().isEmpty) {
        await Future<void>.delayed(const Duration(seconds: 3));
        apnsToken = await messaging.getAPNSToken();
      }
    }

    // Even if APNs token wasn't ready, still try getToken() –
    // the Firebase SDK handles the APNs registration internally.
    try {
      return await messaging.getToken();
    } catch (error) {
      debugPrint('[PushNotificationService] getToken() failed: $error');
      return null;
    }
  }

  Future<void> _initLocalNotifications() async {
    const initSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettingsIOs = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    const initSettings = InitializationSettings(
      android: initSettingsAndroid,
      iOS: initSettingsIOs,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // Foreground local notification tapped — emit data payload
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          onNotificationTap.add({'type': payload});
        }
      },
    );

    // Create Android notification channel
    const channel = AndroidNotificationChannel(
      _kAndroidChannelId,
      _kAndroidChannelName,
      description: _kAndroidChannelDesc,
      importance: Importance.high,
      enableVibration: true,
      playSound: true,
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);
  }

  void _showForegroundNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    final title = notification.title ?? '';
    final body = notification.body ?? '';
    final type = message.data['type'] ?? 'general';

    if (title.isEmpty && body.isEmpty) return;

    _localNotifications.show(
      message.hashCode,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _kAndroidChannelId,
          _kAndroidChannelName,
          channelDescription: _kAndroidChannelDesc,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: type,
    );
  }

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      final messaging = FirebaseMessaging.instance;
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      await _initLocalNotifications();

      // Request permission at launch so the OS prompt appears on first open.
      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      // Foreground messages — show a local notification on Android
      // (iOS is handled natively via setForegroundNotificationPresentationOptions)
      _foregroundSub = FirebaseMessaging.onMessage.listen((message) {
        if (!_isIos) {
          _showForegroundNotification(message);
        }
        // Emit tap event in case the app wants to react in-app too
        // (not auto-navigating here — only on explicit tap)
      });

      // Background → foreground tap
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        onNotificationTap.add(Map<String, String>.from(message.data));
      });

      // Cold-start tap (app was terminated)
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        // Queue it so the navigator listener has time to attach
        Future.delayed(const Duration(milliseconds: 500), () {
          onNotificationTap.add(Map<String, String>.from(initialMessage.data));
        });
      }

      _tokenRefreshSub = messaging.onTokenRefresh.listen((token) {
        _cachedToken = token;
        final userId = Supabase.instance.client.auth.currentUser?.id;
        if (userId != null && userId.isNotEmpty) {
          unawaited(syncForUser(userId));
        } else {
          unawaited(syncAnonymous());
        }
      });

      _firebaseReady = true;
      _initialized = true;
      debugPrint('[PushNotificationService] Firebase messaging initialized');

      // If no user is signed in yet, save the token as a guest row so the
      // device can receive broadcasts before authentication.
      // If APNs is not ready (iOS), retry after a short delay.
      final currentUser = Supabase.instance.client.auth.currentUser;
      if (currentUser == null) {
        final token = await _resolveFcmToken();
        if (token != null && token.isNotEmpty) {
          unawaited(syncAnonymous());
        } else {
          // APNs not ready yet — retry once after 5 seconds
          Future<void>.delayed(const Duration(seconds: 5), () async {
            final retryToken = await _resolveFcmToken();
            if (retryToken != null && retryToken.isNotEmpty) {
              final uid = Supabase.instance.client.auth.currentUser?.id;
              if (uid != null && uid.isNotEmpty) {
                unawaited(syncForUser(uid));
              } else {
                unawaited(syncAnonymous());
              }
            }
          });
        }
      }
    } catch (error) {
      _firebaseReady = false;
      _initialized = true;
      debugPrint('[PushNotificationService] Firebase init skipped: $error');
    }
  }

  Future<void> syncForUser(String userId) async {
    final trimmedUserId = userId.trim();
    if (trimmedUserId.isEmpty) return;

    await initialize();
    if (!_firebaseReady) return;

    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      final token = await _resolveFcmToken();
      if (token == null || token.trim().isEmpty) {
        debugPrint('[PushNotificationService] No FCM token yet for $trimmedUserId; retrying in 5s');
        Future<void>.delayed(const Duration(seconds: 5), () {
          syncForUser(trimmedUserId);
        });
        return;
      }

      _cachedToken = token;

      debugPrint('[PushNotificationService] Syncing FCM token for $trimmedUserId ($_platformLabel)');
      await Supabase.instance.client.from('mobile_push_tokens').upsert(
        {
          'user_id': trimmedUserId,
          'token': token,
          'platform': _platformLabel,
          'is_active': true,
          'last_seen_at': DateTime.now().toUtc().toIso8601String(),
        },
        onConflict: 'token',
      );
      debugPrint('[PushNotificationService] Token synced OK');
    } catch (error) {
      debugPrint('[PushNotificationService] Token sync failed: $error');
    }
  }

  /// Saves the FCM token for a guest (unauthenticated) device.
  /// When the guest later signs in, [syncForUser] upserts over this row
  /// using the token as the conflict key, attaching the user_id.
  Future<void> syncAnonymous() async {
    await initialize();
    if (!_firebaseReady) return;

    try {
      final token = await _resolveFcmToken();
      if (token == null || token.trim().isEmpty) {
        debugPrint('[PushNotificationService] No FCM token yet for guest');
        return;
      }

      _cachedToken = token;

      await Supabase.instance.client.from('mobile_push_tokens').upsert(
        {
          'user_id': null,
          'token': token,
          'platform': _platformLabel,
          'is_active': true,
          'last_seen_at': DateTime.now().toUtc().toIso8601String(),
        },
        onConflict: 'token',
      );
    } catch (error) {
      if (_isApnsNotReadyError(error)) {
        return;
      }
      debugPrint('[PushNotificationService] Guest token sync failed: $error');
    }
  }

  Future<void> deactivateForUser(String userId) async {
    final trimmedUserId = userId.trim();
    if (trimmedUserId.isEmpty) return;

    await initialize();
    if (!_firebaseReady) return;

    try {
      final token = await _resolveFcmToken(waitForApns: false);
      if (token == null || token.trim().isEmpty) return;

      await Supabase.instance.client
          .from('mobile_push_tokens')
          .update({
            'is_active': false,
            'last_seen_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('user_id', trimmedUserId)
          .eq('token', token);
    } catch (error) {
      if (_isApnsNotReadyError(error)) {
        return;
      }
      debugPrint('[PushNotificationService] Token deactivate failed: $error');
    }
  }

  String get _platformLabel {
    if (kIsWeb) return 'web';

    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.android:
        return 'android';
      default:
        return 'unknown';
    }
  }

  Future<void> dispose() async {
    await _tokenRefreshSub?.cancel();
    await _foregroundSub?.cancel();
    _tokenRefreshSub = null;
    _foregroundSub = null;
    await onNotificationTap.close();
  }
}

