import 'dart:async' show unawaited;
import 'dart:io' show Platform;
import 'dart:ui' show ColorSpace, PlatformDispatcher;

import 'package:flutter/cupertino.dart' show DefaultCupertinoLocalizations, CupertinoLocalizations;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'session_controller.dart';
import 'ui/main_shell.dart';

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
  // Deep near-black — feels premium, avoids the flat greenish cast
  static const _surfaceDark = Color(0xFF1C1C1E);
  static const _surfaceSubtleLight = Color(0xFFF7F7F7);
  // Nav / bottom bars sit slightly darker than content
  static const _surfaceSubtleDark = Color(0xFF111113);
  // Elevated cards: clearly one step above background
  static const _surfaceElevatedDark = Color(0xFF2C2C2E);
  static const _textLight = Color(0xFF222222);
  static const _textDark = Color(0xFFFFFFFF);
  static const _bodyLight = Color(0xFF484848);
  static const _bodyDark = Color(0xFFEBEBF5);
  static const _mutedLight = Color(0xFF767676);
  static const _mutedDark = Color(0xFF8E8E93);
  static const _hintLight = Color(0xFFB0B0B0);
  static const _hintDark = Color(0xFF636366);
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
      fontFamily: 'SF Pro Text',
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
          fontFamily: 'SF Pro Text',
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
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
            fontFamily: 'SF Pro Text',
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: onSurface),
          foregroundColor: onSurface,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
            fontFamily: 'SF Pro Text',
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: onSurface,
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            decoration: TextDecoration.underline,
            fontFamily: 'SF Pro Text',
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
      dialogTheme: DialogThemeData(backgroundColor: scheme.surfaceContainerHighest),
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
              // Slightly elevated surface for cards/sheets (#3A3F3F)
              surfaceContainerHighest: AppColors._surfaceElevatedDark,
              // App bars, nav bar, bottom sheets use the subtle darker tone
              surfaceContainerLow: AppColors._surfaceSubtleDark,
              surfaceContainer: AppColors._surfaceElevatedDark,
              onSurfaceVariant: AppColors._mutedDark,
            );

        return MaterialApp(
          key: ValueKey<ThemeMode>(_themeMode),
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
            final materialSupported = ['en', 'fr', 'zh', 'sw'].contains(locale.languageCode);
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