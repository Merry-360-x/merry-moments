import 'dart:async' show StreamSubscription, unawaited;
import 'dart:io' show Platform;
import 'dart:ui' show ColorSpace, PlatformDispatcher;

import 'package:flutter/cupertino.dart'
    show DefaultCupertinoLocalizations, CupertinoLocalizations;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../l10n/app_localizations.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/push_notification_service.dart';
import 'ui/widgets/in_app_notification_banner.dart';
import 'session_controller.dart';
import 'ui/main_shell.dart';
import 'ui/screens/my_bookings_screen.dart';
import 'ui/screens/notifications_screen.dart';
import 'ui/screens/support_screen.dart';
import 'ui/screens/explore_screen.dart';
import 'ui/screens/post_booking_center_screen.dart';
import 'ui/screens/messages_screen.dart';
import 'ui/screens/wishlists_screen.dart';
import 'ui/screens/host_dashboard_screen.dart';
import 'ui/screens/admin_dashboard_screen.dart';
import 'ui/widgets/draggable_ai_fab.dart';
import 'utils/keyboard_utils.dart';

/// Global route observer — used to hide floating UI (e.g. AI button tooltip)
/// when a modal/sheet is pushed on top of the main shell.
final RouteObserver<ModalRoute<dynamic>> appRouteObserver =
    RouteObserver<ModalRoute<dynamic>>();

/// Airbnb-style design tokens
class AdaptiveColor extends Color {
  const AdaptiveColor({required this.light, required this.dark})
    : super(0x00000000);

  final Color light;
  final Color dark;

  Color get _resolved =>
      AppColors.effectiveBrightness == Brightness.dark ? dark : light;

  @override
  int get value => _resolved.toARGB32();

  @override
  int toARGB32() => _resolved.toARGB32();

  @override
  double get a => _resolved.a;

  @override
  double get r => _resolved.r;

  @override
  double get g => _resolved.g;

  @override
  double get b => _resolved.b;

  @override
  ColorSpace get colorSpace => _resolved.colorSpace;

  @override
  Color withValues({
    double? alpha,
    double? red,
    double? green,
    double? blue,
    ColorSpace? colorSpace,
  }) {
    return AdaptiveColor(
      light: light.withValues(
        alpha: alpha,
        red: red,
        green: green,
        blue: blue,
        colorSpace: colorSpace,
      ),
      dark: dark.withValues(
        alpha: alpha,
        red: red,
        green: green,
        blue: blue,
        colorSpace: colorSpace,
      ),
    );
  }

  @override
  Color withAlpha(int a) =>
      AdaptiveColor(light: light.withAlpha(a), dark: dark.withAlpha(a));

  @override
  Color withOpacity(double opacity) => AdaptiveColor(
    light: light.withValues(alpha: opacity),
    dark: dark.withValues(alpha: opacity),
  );

  @override
  Color withRed(int r) =>
      AdaptiveColor(light: light.withRed(r), dark: dark.withRed(r));

  @override
  Color withGreen(int g) =>
      AdaptiveColor(light: light.withGreen(g), dark: dark.withGreen(g));

  @override
  Color withBlue(int b) =>
      AdaptiveColor(light: light.withBlue(b), dark: dark.withBlue(b));

  @override
  bool operator ==(Object other) {
    return other is AdaptiveColor && other.light == light && other.dark == dark;
  }

  @override
  int get hashCode => Object.hash(light, dark);
}

class AppColors {
  static Brightness? _brightnessOverride;

  static Brightness get effectiveBrightness =>
      _brightnessOverride ?? PlatformDispatcher.instance.platformBrightness;

  static void setBrightnessOverride(Brightness brightness) {
    _brightnessOverride = brightness;
  }

  static const rausch = Color(0xFFFF385C);
  static const babu = Color(0xFF00A699);
  static const arches = Color(0xFFFC642D);
  static const _surfaceLight = Color(0xFFFFFFFF);
  // Warm dark gray page background — replaces pure black for depth
  static const _surfaceDark = Color(0xFF1C1C1E);
  static const _surfaceSubtleLight = Color(0xFFF7F7F7);
  // Card / surface background — lifts off the page
  static const _surfaceSubtleDark = Color(0xFF2C2C2E);
  // Elevated surfaces: cards-on-cards, dropdowns, selected pills
  static const _surfaceElevatedDark = Color(0xFF3A3A3C);
  static const _textLight = Color(0xFF222222);
  static const _textDark = Color(0xFFFFFFFF);
  static const _bodyLight = Color(0xFF484848);
  static const _bodyDark = Color(0xFFEBEBF5);
  static const _mutedLight = Color(0xFF767676);
  static const _mutedDark = Color(0xFF8E8E93);
  static const _hintLight = Color(0xFFB0B0B0);
  // Tertiary text / placeholders
  static const _hintDark = Color(0xFF6C6C70);
  static const _borderLight = Color(0xFFEBEBEB);
  static const _borderDark = Color(0xFF38383A);

  static const white = Color(0xFFFFFFFF);
  static const black = AdaptiveColor(light: _textLight, dark: _textDark);
  static const surface = AdaptiveColor(
    light: _surfaceLight,
    dark: _surfaceDark,
  );
  static const surfaceSubtle = AdaptiveColor(
    light: _surfaceSubtleLight,
    dark: _surfaceSubtleDark,
  );
  static const surfaceElevated = AdaptiveColor(
    light: _surfaceLight,
    dark: _surfaceElevatedDark,
  );
  static const border = AdaptiveColor(light: _borderLight, dark: _borderDark);
  static const hof = AdaptiveColor(light: _bodyLight, dark: _bodyDark);
  static const foggy = AdaptiveColor(light: _mutedLight, dark: _mutedDark);
  static const hackberry = AdaptiveColor(light: _hintLight, dark: _hintDark);
  static const linnen = AdaptiveColor(
    light: _surfaceSubtleLight,
    dark: _surfaceElevatedDark,
  );
}

class StageSafeLeadingButton extends StatelessWidget {
  const StageSafeLeadingButton({
    super.key,
    this.icon = Icons.arrow_back,
    this.color,
    this.onPressed,
    this.tooltip,
  });

  final IconData icon;
  final Color? color;
  final VoidCallback? onPressed;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.sizeOf(context).shortestSide >= 600;

    return Padding(
      padding: EdgeInsets.only(left: isTablet ? 44 : 0),
      child: IconButton(
        tooltip: tooltip,
        icon: Icon(
          icon,
          color: color ?? Theme.of(context).colorScheme.onSurface,
        ),
        onPressed: onPressed ?? () => Navigator.maybePop(context),
      ),
    );
  }
}

class Merry360xMobileApp extends StatefulWidget {
  const Merry360xMobileApp({super.key});

  @override
  State<Merry360xMobileApp> createState() => _Merry360xMobileAppState();
}

class _Merry360xMobileAppState extends State<Merry360xMobileApp>
    with WidgetsBindingObserver {
  static const _themeModePreferenceKey = 'merry360x.theme_mode';
  static const _nativeThemeChannel = MethodChannel('merry360x/system_theme');

  late final SessionController _session;
  ThemeMode _themeMode = ThemeMode.system;
  Brightness? _lastSyncedNativeBrightness;
  StreamSubscription<Map<String, String>>? _notifTapSub;
  final _navigatorKey = GlobalKey<NavigatorState>();

  ThemeMode _parseThemeModePreference(String? stored) {
    switch (stored) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  String _serializeThemeModePreference(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  Future<ThemeMode> _readThemeModePreference() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_themeModePreferenceKey);
    return _parseThemeModePreference(stored);
  }

  Future<void> _setThemeMode(ThemeMode mode) async {
    if (_themeMode == mode) return;
    setState(() => _themeMode = mode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _themeModePreferenceKey,
      _serializeThemeModePreference(mode),
    );
  }

  void _syncNativePlatformStyle(Brightness brightness) {
    if (!Platform.isIOS) return;
    if (_lastSyncedNativeBrightness == brightness) return;
    _lastSyncedNativeBrightness = brightness;
    final style = brightness == Brightness.dark ? 'dark' : 'light';
    unawaited(
      _nativeThemeChannel
          .invokeMethod<void>('setPlatformStyle', style)
          .catchError((_) {}),
    );
  }

  ThemeData _buildTheme({required ColorScheme scheme, required bool isTablet}) {
    final outline = scheme.outline;
    final onSurface = scheme.onSurface;

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      canvasColor: scheme.surface,
      cardColor: scheme.surface,
      fontFamily: GoogleFonts.inter().fontFamily,
      dividerColor: outline,
      dividerTheme: DividerThemeData(color: outline, thickness: 1, space: 0),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: isTablet ? 116 : kToolbarHeight,
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        foregroundColor: onSurface,
        titleTextStyle: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: onSurface,
        ),
      ),
      textTheme: TextTheme(
        headlineLarge: TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.w800,
          color: onSurface,
          letterSpacing: -0.5,
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w800,
          color: onSurface,
          letterSpacing: -0.3,
        ),
        titleLarge: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: onSurface,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: onSurface,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          color: AppColors.hof,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: AppColors.hof,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: AppColors.foggy,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: onSurface, width: 2),
        ),
        hintStyle: TextStyle(color: AppColors.hackberry),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.rausch,
          foregroundColor: AppColors.white,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: onSurface),
          foregroundColor: onSurface,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: onSurface,
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            decoration: TextDecoration.underline,
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: scheme.surface,
        side: BorderSide(color: outline),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        labelStyle: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: AppColors.hof,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: scheme.surfaceContainerHighest,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: EdgeInsets.zero,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surfaceContainerHighest,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surfaceContainerHighest,
      ),
      popupMenuTheme: PopupMenuThemeData(color: scheme.surfaceContainerHighest),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceElevated,
        behavior: SnackBarBehavior.floating,
        elevation: 4,
        actionTextColor: AppColors.rausch,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _session = SessionController();
    _bootstrap();
    _listenToNotificationTaps();
  }

  void _listenToNotificationTaps() {
    _notifTapSub = PushNotificationService.instance.onNotificationTap.stream
        .listen(_handleNotificationTap);
  }

  void _handleNotificationTap(Map<String, String> data) {
    final nav = _navigatorKey.currentState;
    if (nav == null) return;
    final type = data['type'] ?? '';

    Widget screen;
    switch (type) {
      // ── Guest: booking related ──
      case 'booking_confirmed':
      case 'booking_request_sent':
      case 'payment_success':
      case 'refund_issued':
      case 'check_in_reminder':
      case 'check_out_reminder':
      case 'dispute_resolved':
      case 'tour_starts_soon':
        screen = MyBookingsScreen(session: _session);

      case 'booking_declined':
        screen = ExploreScreen(session: _session);

      case 'payment_failed':
        screen = MyBookingsScreen(session: _session);

      case 'new_charge_added':
        screen = PostBookingCenterScreen(session: _session);

      case 'new_message':
        screen = MessagesScreen(session: _session);

      case 'host_review_received':
      case 'review_reminder':
        screen = MyBookingsScreen(session: _session);

      case 'price_drop':
        screen = WishlistsScreen(session: _session);

      // ── Host: dashboard or bookings ──
      case 'new_booking_request':
      case 'instant_booking_confirmed':
      case 'booking_cancelled_by_guest':
      case 'payment_received':
      case 'guest_checked_in':
      case 'guest_checked_out':
      case 'extra_charge_paid':
      case 'dispute_opened':
      case 'new_review':
      case 'host_review_reply':
      case 'listing_approved':
      case 'listing_rejected':
      case 'payout_sent':
      case 'payout_failed':
        screen = HostDashboardScreen(session: _session);

      // ── Admin: all admin notifications navigate to admin dashboard ──
      case 'listing_submitted':
      case 'host_registered':
      case 'user_flagged':
      case 'dispute_requires_admin':
      case 'new_support_ticket':
      case 'high_value_booking':
      case 'platform_milestone':
      case 'tour_pending_approval':
        screen = AdminDashboardScreen(session: _session);

      // ── System ──
      case 'support':
        screen = SupportScreen(session: _session);

      default:
        screen = NotificationsScreen(session: _session);
    }
    nav.push(MaterialPageRoute(builder: (_) => screen));
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_session.onAppResumed());
    }
  }

  Future<void> _bootstrap() async {
    unawaited(_session.refresh());

    final savedThemeMode = await _readThemeModePreference();
    if (!mounted) return;

    setState(() {
      _themeMode = savedThemeMode;
    });
  }

  @override
  void dispose() {
    _notifTapSub?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _session.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.sizeOf(context).shortestSide >= 600;
    final platformBrightness = MediaQuery.platformBrightnessOf(context);
    final effectiveBrightness = switch (_themeMode) {
      ThemeMode.light => Brightness.light,
      ThemeMode.dark => Brightness.dark,
      ThemeMode.system => platformBrightness,
    };
    AppColors.setBrightnessOverride(effectiveBrightness);
    // Native iOS surfaces should follow the device appearance, not a saved in-app override.
    _syncNativePlatformStyle(platformBrightness);

    return AnimatedBuilder(
      animation: _session,
      builder: (context, _) {
        final lightScheme =
            ColorScheme.fromSeed(
              seedColor: AppColors.rausch,
              brightness: Brightness.light,
            ).copyWith(
              primary: AppColors.rausch,
              onPrimary: AppColors.white,
              surface: AppColors._surfaceLight,
              onSurface: AppColors._textLight,
              outline: AppColors._borderLight,
              surfaceContainerHighest: AppColors._surfaceSubtleLight,
            );

        final darkScheme =
            ColorScheme.fromSeed(
              seedColor: AppColors.rausch,
              brightness: Brightness.dark,
            ).copyWith(
              primary: AppColors.rausch,
              onPrimary: AppColors.white,
              surface: AppColors._surfaceDark,
              onSurface: AppColors._textDark,
              outline: AppColors._borderDark,
              // #2C2C2E — card / surface background
              surfaceContainerLow: AppColors._surfaceSubtleDark,
              // #3A3A3C — elevated surfaces (dropdowns, selected pills, popups)
              surfaceContainerHighest: AppColors._surfaceElevatedDark,
              surfaceContainer: AppColors._surfaceSubtleDark,
              onSurfaceVariant: AppColors._mutedDark,
            );

        return MaterialApp(
          key: ValueKey<ThemeMode>(_themeMode),
          navigatorKey: _navigatorKey,
          debugShowCheckedModeBanner: false,
          title: 'Merry360x',
          locale: _session.locale,
          supportedLocales: const [
            Locale('en'),
            Locale('rw'),
            Locale('fr'),
            Locale('sw'),
            Locale('zh'),
          ],
          localeListResolutionCallback: (locales, supportedLocales) {
            // For locales not supported by Material (like rw), use English
            // for Material widgets but keep our custom AppLocalizations
            final locale = locales?.firstOrNull;
            if (locale == null) return const Locale('en');

            // Check if Material supports this locale
            final materialSupported = [
              'en',
              'fr',
              'zh',
              'sw',
            ].contains(locale.languageCode);
            if (!materialSupported && locale.languageCode == 'rw') {
              // Use English for Material, but the app's own l10n will use rw
              return locale;
            }
            return supportedLocales.firstWhere(
              (s) => s.languageCode == locale.languageCode,
              orElse: () => const Locale('en'),
            );
          },
          localizationsDelegates: [
            AppLocalizations.delegate,
            // Custom fallback for unsupported Material locales
            _FallbackMaterialLocalizationsDelegate(),
            _FallbackCupertinoLocalizationsDelegate(),
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: _buildTheme(scheme: lightScheme, isTablet: isTablet),
          darkTheme: _buildTheme(scheme: darkScheme, isTablet: isTablet),
          themeMode: _themeMode,
          home: MainShell(
            session: _session,
            themeMode: _themeMode,
            onThemeModeChanged: (mode) {
              _setThemeMode(mode);
            },
          ),
          builder: (context, child) {
            final mainShellState = context.findAncestorStateOfType<MainShellState>();
            return KeyboardUtils.dismissOnTap(
              child: Stack(
                children: [
                  if (child != null) child,
                  InAppNotificationBanner(session: _session),
                  if (mainShellState != null)
                    ValueListenableBuilder<int>(
                      valueListenable: mainShellState.tabNotifier,
                      builder: (context, tabIndex, _) {
                        // Show AI button only on Explore (0), WishList (1), TripCart (2), Messages (3)
                        // Hide on Profile (4) and any detail screens
                        const aiButtonTabs = {0, 1, 2, 3};
                        if (aiButtonTabs.contains(tabIndex)) {
                          return DraggableAiFab(session: _session, navigatorKey: _navigatorKey);
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                ],
              ),
            );
          },
          navigatorObservers: [appRouteObserver],
        );
      },
    );
  }
}

/// Fallback Material localizations for unsupported locales (e.g., rw)
class _FallbackMaterialLocalizationsDelegate
    extends LocalizationsDelegate<MaterialLocalizations> {
  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<MaterialLocalizations> load(Locale locale) async {
    return const DefaultMaterialLocalizations();
  }

  @override
  bool shouldReload(_FallbackMaterialLocalizationsDelegate old) => false;
}

/// Fallback Cupertino localizations for unsupported locales (e.g., rw)
class _FallbackCupertinoLocalizationsDelegate
    extends LocalizationsDelegate<CupertinoLocalizations> {
  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<CupertinoLocalizations> load(Locale locale) async {
    return const DefaultCupertinoLocalizations();
  }

  @override
  bool shouldReload(_FallbackCupertinoLocalizationsDelegate old) => false;
}
