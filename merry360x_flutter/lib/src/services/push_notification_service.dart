import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {
    // Ignore initialization failures in background isolate.
  }
}

class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  bool _initialized = false;
  bool _firebaseReady = false;
  bool _apnsPendingLogged = false;
  String? _cachedToken;
  StreamSubscription<String>? _tokenRefreshSub;

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
      // APNS token can arrive after permission prompt / app startup.
      String? apnsToken = await messaging.getAPNSToken();
      if (apnsToken == null || apnsToken.trim().isEmpty) {
        await Future<void>.delayed(const Duration(seconds: 2));
        apnsToken = await messaging.getAPNSToken();
      }

      if (apnsToken == null || apnsToken.trim().isEmpty) {
        if (!_apnsPendingLogged) {
          debugPrint(
            '[PushNotificationService] APNS token not ready yet; postponing FCM token sync',
          );
          _apnsPendingLogged = true;
        }
        return null;
      }

      _apnsPendingLogged = false;
    }

    return await messaging.getToken();
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

      _tokenRefreshSub = messaging.onTokenRefresh.listen((token) {
        _cachedToken = token;
        final userId = Supabase.instance.client.auth.currentUser?.id;
        if (userId != null && userId.isNotEmpty) {
          unawaited(syncForUser(userId));
        }
      });

      _firebaseReady = true;
      _initialized = true;
      debugPrint('[PushNotificationService] Firebase messaging initialized');
    } catch (error) {
      // Avoid retry loops in the same runtime when native Firebase plugin
      // is unavailable (for example a stale iOS build/session).
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
        debugPrint('[PushNotificationService] No FCM token yet for $trimmedUserId');
        return;
      }

      _cachedToken = token;

      await Supabase.instance.client.from('mobile_push_tokens').upsert(
        {
          'user_id': trimmedUserId,
          'token': token,
          'platform': _platformLabel,
          'is_active': true,
          'last_seen_at': DateTime.now().toUtc().toIso8601String(),
        },
        onConflict: 'user_id,token',
      );
    } catch (error) {
      if (_isApnsNotReadyError(error)) {
        if (!_apnsPendingLogged) {
          debugPrint(
            '[PushNotificationService] APNS token not set yet; waiting before retry',
          );
          _apnsPendingLogged = true;
        }
        return;
      }
      debugPrint('[PushNotificationService] Token sync failed: $error');
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
    _tokenRefreshSub = null;
  }
}
