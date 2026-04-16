import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show Locale;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'lib/fx.dart';
import 'models/mobile_sync.dart';
import 'services/app_database.dart';
import 'services/push_notification_service.dart';

class SessionController extends ChangeNotifier {
  SessionController({AppDatabase? api}) : _api = api ?? AppDatabase() {
    _initAuth();
  }

  static const String _mobileAuthRedirectUri =
      'com.merry360x.mobile://login-callback/';

  final AppDatabase _api;
  final PushNotificationService _pushNotifications =
      PushNotificationService.instance;

  String _userId = '';
  bool _loading = false;
  String? _error;
  MobileSyncPayload? _payload;
  StreamSubscription<AuthState>? _authSub;
  final List<RealtimeChannel> _syncChannels = <RealtimeChannel>[];
  final List<RealtimeChannel> _userSyncChannels = <RealtimeChannel>[];
  Timer? _syncDebounceTimer;
  Timer? _periodicSyncTimer;
  Timer? _supportMessageRebindTimer;
  bool _refreshInFlight = false;
  bool _refreshQueued = false;
  bool _queuedSilentRefresh = true;
  AuthChangeEvent? _lastAuthEvent;
  DateTime? _lastSuccessfulRefreshAt;
  int _userSyncGeneration = 0;

  // User preferences — kept in sync with web via `user_preferences` table.
  String _language = 'en';
  String _currency = 'RWF';

  // Live FX rates fetched from admin_fx_rates — overrides kFxRates defaults.
  Map<String, double> _fxRates = kFxRates;
  RealtimeChannel? _fxRatesChannel;

  static const Duration _periodicSyncInterval = Duration(seconds: 30);
  static const Duration _realtimeDebounce = Duration(milliseconds: 900);

  bool get isHost => payload?.roles.contains('host') == true;
  bool get isAdmin => payload?.roles.contains('admin') == true;
  bool get isStaff => payload?.roles.contains('staff') == true;
  bool get isOperationsStaff => payload?.roles.contains('operations_staff') == true;
  bool get isFinancialStaff => payload?.roles.contains('financial_staff') == true;
  bool get isCustomerSupport => payload?.roles.contains('customer_support') == true;

  bool get canAccessAdminDashboard => isAdmin || isStaff;
  bool get canAccessOperationsDashboard => isAdmin || isOperationsStaff;
  bool get canAccessFinancialDashboard => isAdmin || isFinancialStaff;
  bool get canAccessSupportDashboard => isAdmin || isCustomerSupport;
  bool get canManagePostBooking => isAdmin || isFinancialStaff || isOperationsStaff || isCustomerSupport;

  String get userId => _userId;
  String? get accessToken => _supabase?.auth.currentSession?.accessToken;
  bool get loading => _loading;
  String? get error => _error;
  MobileSyncPayload? get payload => _payload;
  bool get isAuthenticated => _userId.trim().isNotEmpty;
  AuthChangeEvent? get lastAuthEvent => _lastAuthEvent;
  bool _hasEverAuthenticated = false;
  bool get hasEverAuthenticated => _hasEverAuthenticated;
  String get language => _language;
  String get currency => _currency;

  // Guest info collected when user browses without signing in.
  Map<String, String>? _guestInfo;
  Map<String, String>? get guestInfo => _guestInfo;
  bool get hasGuestInfo => _guestInfo != null && (_guestInfo!['name']?.isNotEmpty ?? false);

  // In-memory guest wishlist and cart (not persisted to DB).
  final List<Map<String, dynamic>> _guestWishlists = [];
  final List<Map<String, dynamic>> _guestTripCart = [];
  List<Map<String, dynamic>> get guestWishlists => _guestWishlists;
  List<Map<String, dynamic>> get guestTripCart => _guestTripCart;

  void setGuestInfo({required String name, required String email, required String phone}) {
    _guestInfo = {'name': name, 'email': email, 'phone': phone};
    notifyListeners();
  }

  void clearGuestInfo() {
    _guestInfo = null;
    notifyListeners();
  }

  /// Locale derived from the user's language preference.
  Locale get locale {
    switch (_language) {
      case 'rw': return const Locale('rw');
      case 'fr': return const Locale('fr');
      case 'sw': return const Locale('sw');
      case 'zh': return const Locale('zh');
      default:   return const Locale('en');
    }
  }

  /// Format [amount] (stored in [itemCurrency]) converted to the user's
  /// selected display currency using live admin FX rates.
  /// Falls back to the item's own currency if the rate is unknown.
  String formatPrice(num amount, {String? itemCurrency}) {
    final from = (itemCurrency ?? _currency).toUpperCase();
    return formatMoneyWithConversion(amount, from, _currency, _fxRates);
  }

  SupabaseClient? get _supabase {
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  String? get userEmail => _supabase?.auth.currentUser?.email;

  void _initAuth() {
    final client = _supabase;
    if (client == null) return;

    _startSyncSubscriptions();
    _startPeriodicSync();
    unawaited(_loadFxRates());
    _watchFxRates();

    // Check for existing session
    final session = client.auth.currentSession;
    if (session != null) {
      _userId = session.user.id;
      _rebindUserSyncSubscriptions();
      unawaited(_pushNotifications.syncForUser(_userId));
      unawaited(loadPreferences());
      notifyListeners();
    } else {
      unawaited(loadPreferences());
    }

    // Restore persisted "has ever authenticated" flag.
    unawaited(() async {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getBool('has_ever_authenticated') ?? false;
      if (stored && !_hasEverAuthenticated) {
        _hasEverAuthenticated = true;
        notifyListeners();
      }
    }());

    // Listen for auth state changes
    _authSub = client.auth.onAuthStateChange.listen((data) {
      _lastAuthEvent = data.event;
      final session = data.session;
      final newId = session?.user.id ?? '';
      if (newId != _userId) {
        _userId = newId;
        _lastSuccessfulRefreshAt = null;
        _rebindUserSyncSubscriptions();
        if (_userId.isNotEmpty) {
          unawaited(_pushNotifications.syncForUser(_userId));
          // Mark as ever authenticated (persisted across sessions).
          if (!_hasEverAuthenticated) {
            _hasEverAuthenticated = true;
            unawaited(() async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.setBool('has_ever_authenticated', true);
            }());
          }
        } else {
          // Signed out — clear the persistent flag.
          _hasEverAuthenticated = false;
          unawaited(() async {
            final prefs = await SharedPreferences.getInstance();
            await prefs.remove('has_ever_authenticated');
          }());
        }
        unawaited(loadPreferences());
        notifyListeners();
        // Refresh for both login (load user data) and logout (load public data)
        refresh();
      } else {
        // Same user ID but event changed (e.g. tokenRefreshed) — still expose event.
        notifyListeners();
      }
    });
  }

  // ---- Auth methods ----

  Future<void> signInWithEmail(String email, String password) async {
    final client = _supabase;
    if (client == null) throw Exception('Supabase not configured');
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      await client.auth.signInWithPassword(email: email, password: password);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> signUpWithEmail(String email, String password, {String? fullName}) async {
    final client = _supabase;
    if (client == null) throw Exception('Supabase not configured');
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      await client.auth.signUp(
        email: email,
        password: password,
        emailRedirectTo: _mobileAuthRedirectUri,
        data: fullName != null ? {'full_name': fullName} : null,
      );
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithApple() async {
    final client = _supabase;
    if (client == null) throw Exception('Supabase not configured');
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final rawNonce = client.auth.generateRawNonce();
      final hashedNonce = sha256.convert(utf8.encode(rawNonce)).toString();

      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashedNonce,
      );

      final idToken = credential.identityToken;
      if (idToken == null) throw Exception('No identity token from Apple');

      // Capture name/email NOW — Apple only sends these on first sign-in.
      final givenName = credential.givenName?.trim() ?? '';
      final familyName = credential.familyName?.trim() ?? '';
      final appleEmail = credential.email?.trim() ?? '';
      final fullName = [givenName, familyName].where((s) => s.isNotEmpty).join(' ');

      await client.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );

      // After sign-in, persist profile data if Apple provided it.
      final userId = client.auth.currentUser?.id;
      if (userId != null && userId.isNotEmpty) {
        final updates = <String, dynamic>{'user_id': userId};
        if (fullName.isNotEmpty) updates['full_name'] = fullName;
        if (appleEmail.isNotEmpty) updates['email'] = appleEmail;
        if (updates.length > 1) {
          try {
            await client.from('profiles').upsert(updates, onConflict: 'user_id');
            // Also update Supabase auth user_metadata so it is consistent.
            if (fullName.isNotEmpty) {
              await client.auth.updateUser(
                UserAttributes(data: {'full_name': fullName}),
              );
            }
          } catch (e) {
            // Non-fatal: profile save failed, but auth succeeded.
            debugPrint('[signInWithApple] profile upsert failed: $e');
          }
        }
      }
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  bool _isGoogleCancelError(Object error) {
    final lower = error.toString().toLowerCase();
    return lower.contains('canceled') ||
        lower.contains('cancelled') ||
        lower.contains('sign_in_canceled') ||
        lower.contains('popup_closed_by_user') ||
        lower.contains('aborted by user');
  }

  bool _isGoogleNonceError(Object error) {
    final lower = error.toString().toLowerCase();
    return lower.contains('nonces mismatch') ||
        lower.contains('passed nonce and nonce in id_token');
  }

  Future<void> signInWithGoogle() async {
    final client = _supabase;
    if (client == null) throw Exception('Supabase not configured');
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      const googlePickerParams = <String, String>{
        'prompt': 'select_account',
      };

      final completer = Completer<void>();
      late final StreamSubscription<AuthState> sub;
      sub = client.auth.onAuthStateChange.listen((data) {
        if (!completer.isCompleted && data.session != null) {
          completer.complete();
        }
      });
      try {
        if (kIsWeb) {
          await client.auth.signInWithOAuth(
            OAuthProvider.google,
            queryParams: googlePickerParams,
          );
        } else {
          final iosClientId = AppConfig.googleIosClientId.trim();
          final googleSignIn = GoogleSignIn(
            scopes: const <String>['email', 'profile'],
            clientId: defaultTargetPlatform == TargetPlatform.iOS && iosClientId.isNotEmpty
                ? iosClientId
                : null,
            // Keep native sign-in tied to mobile app client identity.
            serverClientId: null,
          );

          // Force chooser every time.
          try {
            await googleSignIn.signOut();
          } catch (_) {}

          final googleUser = await googleSignIn.signIn();
          if (googleUser == null) {
            // User closed chooser -> continue guest silently.
            return;
          }

          final googleAuth = await googleUser.authentication;
          final idToken = googleAuth.idToken;
          if (idToken == null || idToken.isEmpty) {
            throw Exception('Google sign in missing ID token.');
          }

          await client.auth.signInWithIdToken(
            provider: OAuthProvider.google,
            idToken: idToken,
            accessToken: googleAuth.accessToken,
          );
        }
        if (client.auth.currentSession == null) {
          await completer.future.timeout(const Duration(minutes: 2));
        }
      } finally {
        await sub.cancel();
      }
      if (client.auth.currentSession == null) {
        throw Exception('Google sign in did not complete');
      }
    } on TimeoutException {
      throw Exception(
        'Google sign in did not return to the app. '
        'Check Supabase redirect URL: $_mobileAuthRedirectUri',
      );
    } catch (e) {
      if (_isGoogleCancelError(e)) {
        // Silent cancel: user remains a guest and no error banner is shown.
        _error = null;
        return;
      }
      if (_isGoogleNonceError(e)) {
        throw Exception(
          'Google native sign-in is blocked by Supabase nonce validation. '
          'In Supabase Dashboard -> Authentication -> Sign in/Providers -> Google, '
          'enable "Skip nonce checks" for mobile/native Google sign-in.',
        );
      }
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    final previousUserId = _userId;
    if (previousUserId.trim().isNotEmpty) {
      await _pushNotifications.deactivateForUser(previousUserId);
    }
    try {
      await _supabase?.auth.signOut(scope: SignOutScope.local);
    } catch (_) {
      try {
        await _supabase?.auth.signOut();
      } catch (_) {}
    }
    _userId = '';
    _rebindUserSyncSubscriptions();
    _payload = null;
    _error = null;
    notifyListeners();
    // Reload public listings so the app doesn't appear empty after logout
    refresh();
  }

  Future<void> deleteAccount() async {
    final client = _supabase;
    if (client == null || !isAuthenticated) return;
    final accessToken = client.auth.currentSession?.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      throw Exception('No active session found for account deletion.');
    }
    await _api.deleteAccountWithToken(accessToken: accessToken);
    await signOut();
  }

  // ---- Legacy manual connect (fallback) ----

  Future<void> setUserId(String value) async {
    _userId = value.trim();
    _rebindUserSyncSubscriptions();
    if (_userId.isNotEmpty) {
      unawaited(_pushNotifications.syncForUser(_userId));
    }
    notifyListeners();
    await refresh();
  }

  // ---- Data sync ----

  Future<void> refresh({bool silent = false}) async {
    if (_refreshInFlight) {
      _refreshQueued = true;
      _queuedSilentRefresh = _queuedSilentRefresh && silent;
      return;
    }

    _refreshInFlight = true;

    final showLoading = !silent || _payload == null;
    if (showLoading) {
      _loading = true;
      _error = null;
      notifyListeners();
    } else {
      _error = null;
    }

    try {
      _payload = await _api.fetchSync(userId: _userId.isEmpty ? null : _userId);
      _lastSuccessfulRefreshAt = DateTime.now();
    } catch (e, stack) {
      debugPrint('[SessionController.refresh] ERROR: $e');
      debugPrint('[SessionController.refresh] STACK: $stack');
      _error = e.toString();
    } finally {
      if (showLoading) {
        _loading = false;
      }
      _refreshInFlight = false;
      notifyListeners();

      if (_refreshQueued) {
        final queuedSilent = _queuedSilentRefresh;
        _refreshQueued = false;
        _queuedSilentRefresh = true;
        unawaited(refresh(silent: queuedSilent));
      }
    }
  }

  /// Fire-and-forget background refresh (doesn't block UI).
  void _backgroundRefresh() {
    unawaited(refresh(silent: true));
  }

  Future<void> refreshIfStale({
    Duration maxAge = _periodicSyncInterval,
    bool silent = true,
  }) async {
    final last = _lastSuccessfulRefreshAt;
    if (last != null && DateTime.now().difference(last) < maxAge && _payload != null) {
      return;
    }
    await refresh(silent: silent);
  }

  Future<void> onAppResumed() async {
    await refreshIfStale(maxAge: const Duration(seconds: 8), silent: true);
  }

  void _scheduleRealtimeRefresh() {
    _syncDebounceTimer?.cancel();
    _syncDebounceTimer = Timer(_realtimeDebounce, _backgroundRefresh);
  }

  void _startPeriodicSync() {
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = Timer.periodic(_periodicSyncInterval, (_) {
      unawaited(refreshIfStale(maxAge: _periodicSyncInterval, silent: true));
    });
  }

  void _startSyncSubscriptions() {
    final client = _supabase;
    if (client == null || _syncChannels.isNotEmpty) return;

    RealtimeChannel watch(String name, String table) {
      final channel = client
          .channel('mobile-sync-$name')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: table,
            callback: (_) => _scheduleRealtimeRefresh(),
          )
          .subscribe();
      _syncChannels.add(channel);
      return channel;
    }

    // Public listing feeds
    watch('properties', 'properties');
    watch('tours', 'tours');
    watch('tour-packages', 'tour_packages');
    watch('transport-vehicles', 'transport_vehicles');
    watch('stories', 'stories');

    // User-specific slices are refreshed on interval and app resume.
  }

  void _rebindUserSyncSubscriptions() {
    _clearUserSyncSubscriptions();

    final client = _supabase;
    final userId = _userId.trim();
    if (client == null || userId.isEmpty) return;

    final generation = ++_userSyncGeneration;

    RealtimeChannel watchUser(
      String name,
      String table, {
      String? filterColumn,
      VoidCallback? onChanged,
    }) {
      final channel = client
          .channel('mobile-user-sync-$name-$userId')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: table,
            filter: filterColumn != null
                ? PostgresChangeFilter(
                    type: PostgresChangeFilterType.eq,
                    column: filterColumn,
                    value: userId,
                  )
                : null,
            callback: (_) {
              if (onChanged != null) {
                onChanged();
              } else {
                _scheduleRealtimeRefresh();
              }
            },
          )
          .subscribe();
      _userSyncChannels.add(channel);
      return channel;
    }

    watchUser('favorites', 'favorites', filterColumn: 'user_id');
    watchUser('trip-cart', 'trip_cart_items', filterColumn: 'user_id');
    watchUser('bookings-guest', 'bookings', filterColumn: 'guest_id');
    watchUser('bookings-host', 'bookings', filterColumn: 'host_id');
    watchUser('profile', 'profiles', filterColumn: 'user_id');
    watchUser('roles', 'user_roles', filterColumn: 'user_id');
    watchUser(
      'support-tickets',
      'support_tickets',
      filterColumn: 'user_id',
      onChanged: () {
        _scheduleRealtimeRefresh();
        _scheduleSupportMessageRebind();
      },
    );

    // Listen to message inserts/updates for the user's own tickets.
    unawaited(_bindSupportMessageChannelsForUser(userId: userId, generation: generation));
  }

  void _scheduleSupportMessageRebind() {
    _supportMessageRebindTimer?.cancel();
    _supportMessageRebindTimer = Timer(const Duration(milliseconds: 1200), () {
      _rebindUserSyncSubscriptions();
    });
  }

  Future<void> _bindSupportMessageChannelsForUser({
    required String userId,
    required int generation,
  }) async {
    final client = _supabase;
    if (client == null || userId.isEmpty) return;

    try {
      final rows = await client
          .from('support_tickets')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(40);

      if (_userSyncGeneration != generation || _userId.trim() != userId) {
        return;
      }

      final ticketIds = (rows as List)
          .whereType<Map>()
          .map((row) => row['id']?.toString() ?? '')
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      for (final ticketId in ticketIds) {
        if (_userSyncGeneration != generation || _userId.trim() != userId) {
          return;
        }

        final channel = client
            .channel('mobile-user-sync-support-msg-$userId-$ticketId')
            .onPostgresChanges(
              event: PostgresChangeEvent.all,
              schema: 'public',
              table: 'support_ticket_messages',
              filter: PostgresChangeFilter(
                type: PostgresChangeFilterType.eq,
                column: 'ticket_id',
                value: ticketId,
              ),
              callback: (_) => _scheduleRealtimeRefresh(),
            )
            .subscribe();
        _userSyncChannels.add(channel);
      }
    } catch (_) {
      // Keep sync alive even if support tables are unavailable in some environments.
    }
  }

  void _clearSyncSubscriptions() {
    final client = _supabase;
    if (client != null) {
      for (final channel in _syncChannels) {
        client.removeChannel(channel);
      }
    }
    _syncChannels.clear();
  }

  void _clearUserSyncSubscriptions() {
    _userSyncGeneration++;
    _supportMessageRebindTimer?.cancel();
    final client = _supabase;
    if (client != null) {
      for (final channel in _userSyncChannels) {
        client.removeChannel(channel);
      }
    }
    _userSyncChannels.clear();
  }

  Future<void> upsertProfile({
    required String fullName,
    required String phone,
    required String bio,
  }) async {
    if (!isAuthenticated) return;
    // Optimistic local update
    if (_payload != null && _payload!.profile != null) {
      _payload!.profile!['full_name'] = fullName;
      _payload!.profile!['phone'] = phone;
      _payload!.profile!['bio'] = bio;
      notifyListeners();
    }
    await _api.upsertProfile(
      userId: _userId,
      fullName: fullName,
      phone: phone,
      bio: bio,
    );
    _backgroundRefresh();
  }

  // ── Preferences ──

  /// Load language + currency from Supabase (if authed) or SharedPreferences (guest).
  /// Fetch live FX rates from admin_fx_rates table and merge with BNR defaults.
  Future<void> _loadFxRates() async {
    final client = _supabase;
    if (client == null) return;
    try {
      final data = await client
          .from('admin_fx_rates')
          .select('currency_code,rate_to_rwf')
          .eq('is_active', true) as List;
      if (data.isEmpty) return;
      final loaded = <String, double>{};
      for (final row in data) {
        final code = (row['currency_code'] as String? ?? '').toUpperCase().trim();
        final rate = double.tryParse('${row['rate_to_rwf'] ?? 0}') ?? 0;
        if (code.isNotEmpty && rate > 0) loaded[code] = rate;
      }
      if (loaded.isNotEmpty) {
        _fxRates = {...kFxRates, ...loaded, 'RWF': 1.0};
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Subscribe to realtime changes on admin_fx_rates and reload on any change.
  void _watchFxRates() {
    _fxRatesChannel?.unsubscribe();
    _fxRatesChannel = _supabase
        ?.channel('fx-rates-flutter')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'admin_fx_rates',
          callback: (_) => unawaited(_loadFxRates()),
        )
        .subscribe();
  }

  Future<void> loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    // Load local fallbacks first so UI is always populated synchronously.
    final localLang = prefs.getString('merry360_language');
    final localCurrency = prefs.getString('merry360_currency');
    final userId = _userId.trim();

    if (userId.isNotEmpty) {
      try {
        final data = await _api.fetchUserPreferences(userId: userId);
        final lang = (data['language'] as String?)?.trim();
        final cur = (data['currency'] as String?)?.trim();
        if (lang != null && lang.isNotEmpty) {
          _language = lang;
          await prefs.setString('merry360_language', lang);
        } else if (localLang != null && localLang.isNotEmpty) {
          _language = localLang;
        }
        if (cur != null && cur.isNotEmpty) {
          _currency = cur;
          await prefs.setString('merry360_currency', cur);
        } else if (localCurrency != null && localCurrency.isNotEmpty) {
          _currency = localCurrency;
        }
      } catch (_) {
        if (localLang != null && localLang.isNotEmpty) _language = localLang;
        if (localCurrency != null && localCurrency.isNotEmpty) _currency = localCurrency;
      }
    } else {
      if (localLang != null && localLang.isNotEmpty) _language = localLang;
      if (localCurrency != null && localCurrency.isNotEmpty) _currency = localCurrency;
    }
    notifyListeners();
  }

  Future<void> setLanguage(String lang) async {
    _language = lang;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('merry360_language', lang);
    if (_userId.trim().isNotEmpty) {
      await _api.upsertUserPreference(userId: _userId, language: lang);
    }
  }

  Future<void> setCurrency(String cur) async {
    _currency = cur;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('merry360_currency', cur);
    if (_userId.trim().isNotEmpty) {
      await _api.upsertUserPreference(userId: _userId, currency: cur);
    }
  }

  Future<void> addListingToWishlist(Map<String, dynamic> listing) async {
    if (!isAuthenticated) {
      // Guest mode: store in local list only (no DB write).
      final placeholder = <String, dynamic>{
        'id': 'guest_${DateTime.now().millisecondsSinceEpoch}',
        'title': (listing['title'] ?? listing['name'] ?? 'Saved Item').toString(),
        'item_type': 'property',
        'property_id': (listing['id'] ?? '').toString(),
        'created_at': DateTime.now().toUtc().toIso8601String(),
      };
      _guestWishlists.insert(0, placeholder);
      notifyListeners();
      return;
    }
    // Optimistic: add a placeholder to local wishlists
    final placeholder = <String, dynamic>{
      'id': 'temp_${DateTime.now().millisecondsSinceEpoch}',
      'user_id': _userId,
      'title': (listing['title'] ?? listing['name'] ?? 'Saved Item').toString(),
      'item_type': 'property',
      'property_id': (listing['id'] ?? '').toString(),
      'created_at': DateTime.now().toUtc().toIso8601String(),
    };
    _payload?.wishlists.insert(0, placeholder);
    notifyListeners();
    await _api.addToWishlist(
      userId: _userId,
      title: placeholder['title'] as String,
      itemType: 'property',
      propertyId: (listing['id'] ?? '').toString(),
    );
    _backgroundRefresh();
  }

  Future<void> removeWishlistItem(String id) async {
    if (id.isEmpty) return;
    if (!isAuthenticated) {
      _guestWishlists.removeWhere((w) => w['id'].toString() == id || w['property_id'].toString() == id);
      notifyListeners();
      return;
    }
    // Optimistic: remove locally
    _payload?.wishlists.removeWhere((w) => w['id'].toString() == id || w['property_id'].toString() == id);
    notifyListeners();
    await _api.removeFromWishlist(userId: _userId, id: id);
    _backgroundRefresh();
  }

  Future<void> addListingToTripCart(Map<String, dynamic> listing, {Map<String, dynamic>? metadata}) async {
    if (!isAuthenticated) {
      // Guest mode: store locally — spread listing so enrichment works later.
      final type = (listing['item_type'] ?? 'property').toString();
      final refId = (listing['id'] ?? '').toString();
      final placeholder = <String, dynamic>{
        ...listing,
        'id': 'guest_${DateTime.now().millisecondsSinceEpoch}',
        'item_type': type,
        'reference_id': refId,
        'quantity': 1,
        'metadata': metadata,
        'created_at': DateTime.now().toUtc().toIso8601String(),
      };
      _guestTripCart.insert(0, placeholder);
      notifyListeners();
      return;
    }
    final type = (listing['item_type'] ?? 'property').toString();
    final refId = (listing['id'] ?? '').toString();
    // Optimistic: add placeholder
    final placeholder = <String, dynamic>{
      'id': 'temp_${DateTime.now().millisecondsSinceEpoch}',
      'user_id': _userId,
      'item_type': type,
      'reference_id': refId,
      'quantity': 1,
      'metadata': metadata,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    };
    _payload?.tripCart.insert(0, placeholder);
    notifyListeners();
    await _api.addToTripCart(
      userId: _userId,
      itemType: type,
      referenceId: refId,
      quantity: 1,
      metadata: metadata,
    );
    _backgroundRefresh();
  }

  Future<String?> createBooking({
    required Map<String, dynamic> item,
    String? checkIn,
    String? checkOut,
    required int guests,
    required double totalAmount,
    required String currency,
    String? paymentPhone,
    String? paymentProvider,
    String? specialRequests,
    String? discountCode,
    double? discountAmount,
  }) async {
    if (!isAuthenticated && !hasGuestInfo) {
      throw Exception('Please enter your name and contact details to book as a guest');
    }
    final type = (item['item_type'] ?? 'property').toString();
    final result = await _api.createBooking(
      userId: isAuthenticated ? _userId : '',
      itemType: type,
      referenceId: (item['id'] ?? '').toString(),
      title: (item['title'] ?? item['name'] ?? 'Listing').toString(),
      checkIn: checkIn,
      checkOut: checkOut,
      guests: guests,
      totalAmount: totalAmount,
      currency: currency,
      paymentPhone: paymentPhone,
      paymentProvider: paymentProvider,
      specialRequests: specialRequests,
      discountCode: discountCode,
      discountAmount: discountAmount,
      guestName: isAuthenticated ? null : _guestInfo?['name'],
      guestEmail: isAuthenticated ? null : _guestInfo?['email'],
      guestPhone: isAuthenticated ? null : (_guestInfo?['phone'] ?? paymentPhone),
    );
    _backgroundRefresh();
    return result;
  }

  Future<void> removeTripCartItem(String id) async {
    if (id.isEmpty) return;
    if (!isAuthenticated) {
      _guestTripCart.removeWhere((c) => c['id'].toString() == id);
      notifyListeners();
      return;
    }
    // Optimistic: remove locally first — no re-fetch so the UI stays stable.
    _payload?.tripCart.removeWhere((c) => c['id'].toString() == id);
    notifyListeners();
    unawaited(_api.removeFromTripCart(userId: _userId, id: id));
  }

  Future<void> clearTripCart() async {
    if (!isAuthenticated) {
      _guestTripCart.clear();
      notifyListeners();
      return;
    }
    // Optimistic: clear locally — no re-fetch so the UI stays stable.
    _payload?.tripCart.clear();
    notifyListeners();
    unawaited(_api.clearTripCart(userId: _userId));
  }

  Future<void> forgotPassword(String email) async {
    await _api.forgotPassword(email);
  }

  Future<void> cancelBooking(String bookingId) async {
    if (!isAuthenticated) return;
    // Optimistic: mark as cancelled locally
    final booking = _payload?.bookings.firstWhere(
      (b) => b['id'].toString() == bookingId,
      orElse: () => <String, dynamic>{},
    );
    if (booking != null && booking.isNotEmpty) {
      booking['status'] = 'cancelled';
      notifyListeners();
    }
    await _api.cancelBooking(bookingId: bookingId, userId: _userId);
    _backgroundRefresh();
  }

  Future<void> submitReview({
    required String bookingId,
    required String title,
    required double accommodationRating,
    required double serviceRating,
    required String comment,
  }) async {
    if (!isAuthenticated) throw Exception('Sign in to submit review');
    await _api.submitReview(
      bookingId: bookingId,
      userId: _userId,
      title: title,
      accommodationRating: accommodationRating,
      serviceRating: serviceRating,
      comment: comment,
    );
    _backgroundRefresh();
  }

  Future<void> markNotificationRead(String id) async {
    if (!isAuthenticated) return;
    // Optimistic
    final n = _payload?.notifications.firstWhere(
      (n) => n['id'].toString() == id,
      orElse: () => <String, dynamic>{},
    );
    if (n != null && n.isNotEmpty) {
      n['read'] = true;
      notifyListeners();
    }
    await _api.markNotificationRead(id: id);
  }

  Future<void> markAllNotificationsRead() async {
    if (!isAuthenticated) return;
    // Optimistic
    for (final n in _payload?.notifications ?? <Map<String, dynamic>>[]) {
      n['read'] = true;
    }
    notifyListeners();
    await _api.markAllNotificationsRead(userId: _userId);
    _backgroundRefresh();
  }

  Future<String?> createSupportTicket({
    required String subject,
    required String message,
  }) async {
    if (!isAuthenticated) throw Exception('Sign in to contact support');
    return _api.createSupportTicket(userId: _userId, subject: subject, message: message);
  }

  // ---- Social graph + direct messages ----

  static String? validateDirectMessage(String rawMessage) {
    return AppDatabase.validateDirectMessage(rawMessage);
  }

  Future<Map<String, dynamic>?> fetchPublicProfile({required String userId}) {
    return _api.fetchPublicProfile(userId: userId);
  }

  Future<int> fetchHostFollowersCount({required String hostId}) {
    return _api.fetchHostFollowersCount(hostId: hostId);
  }

  Future<bool> isFollowingHost({required String hostId}) async {
    if (!isAuthenticated) return false;
    return _api.isFollowingHost(userId: _userId, hostId: hostId);
  }

  Future<void> followHost({required String hostId}) async {
    if (!isAuthenticated) throw Exception('Sign in to follow hosts');
    await _api.followHost(userId: _userId, hostId: hostId);
  }

  Future<void> unfollowHost({required String hostId}) async {
    if (!isAuthenticated) throw Exception('Sign in to manage follows');
    await _api.unfollowHost(userId: _userId, hostId: hostId);
  }

  Future<void> sendDirectMessage({
    required String recipientId,
    required String body,
  }) async {
    if (!isAuthenticated) throw Exception('Sign in to send messages');
    await _api.sendDirectMessage(
      senderId: _userId,
      recipientId: recipientId,
      body: body,
    );
  }

  Future<List<Map<String, dynamic>>> fetchDirectMessages({
    required String peerId,
    int limit = 200,
  }) async {
    if (!isAuthenticated) return [];
    return _api.fetchDirectMessages(userId: _userId, peerId: peerId, limit: limit);
  }

  Future<List<Map<String, dynamic>>> fetchDirectConversations({int limit = 500}) async {
    if (!isAuthenticated) return [];
    return _api.fetchDirectConversations(userId: _userId, limit: limit);
  }

  Future<void> markDirectConversationRead({required String peerId}) async {
    if (!isAuthenticated) return;
    await _api.markDirectConversationRead(userId: _userId, peerId: peerId);
  }

  // ---- Post-booking workflows ----

  Future<Map<String, dynamic>> fetchUserPostBookingOverview() async {
    if (!isAuthenticated) throw Exception('Sign in to continue');
    final token = await _resolveAccessToken();
    return _api.fetchPostBookingOverview(accessToken: token);
  }

  Future<Map<String, dynamic>> fetchAdminPostBookingOverview() async {
    if (!isAuthenticated) throw Exception('Sign in to continue');
    if (!canManagePostBooking) {
      throw Exception('You do not have access to the post-booking console');
    }
    final token = await _resolveAccessToken();
    return _api.fetchPostBookingOverview(accessToken: token, admin: true);
  }

  Future<Map<String, dynamic>> postBookingAction(
    String action, {
    Map<String, dynamic> body = const <String, dynamic>{},
  }) async {
    if (!isAuthenticated) throw Exception('Sign in to continue');
    final token = await _resolveAccessToken();
    return _api.postBookingAction(
      accessToken: token,
      action: action,
      body: body,
    );
  }

  /// Returns a valid access token, attempting a session refresh if the
  /// in-memory token is missing or empty (e.g., after a background sign-out
  /// or token rotation that hasn't propagated to the listener yet).
  Future<String> _resolveAccessToken() async {
    var token = accessToken;
    if (token != null && token.isNotEmpty) return token;

    // Token missing — try an explicit refresh before giving up.
    if (_userId.isNotEmpty) {
      try {
        final refreshed = await _supabase?.auth.refreshSession();
        token = (refreshed?.session?.accessToken ?? '').trim();
      } catch (_) {}
    }

    if (token == null || token.isEmpty) {
      throw Exception('Your session expired. Please sign in again.');
    }
    return token;
  }

  @override
  void dispose() {
    _authSub?.cancel();
    _syncDebounceTimer?.cancel();
    _periodicSyncTimer?.cancel();
    _supportMessageRebindTimer?.cancel();
    _clearUserSyncSubscriptions();
    _clearSyncSubscriptions();
    _fxRatesChannel?.unsubscribe();
    unawaited(_pushNotifications.dispose());
    super.dispose();
  }
}
