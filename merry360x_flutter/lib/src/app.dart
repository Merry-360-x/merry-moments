import 'dart:async' show unawaited;
import 'dart:io' show Platform;
import 'dart:ui' show ColorSpace, PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'session_controller.dart';
import 'ui/main_shell.dart';

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
  static const _surfaceDark = Color(0xFF000000);
  static const _surfaceSubtleLight = Color(0xFFF7F7F7);
  static const _surfaceSubtleDark = Color(0xFF000000);
  static const _textLight = Color(0xFF222222);
  static const _textDark = Color(0xFFF3F5F8);
  static const _bodyLight = Color(0xFF484848);
  static const _bodyDark = Color(0xFFDADADA);
  static const _mutedLight = Color(0xFF767676);
  static const _mutedDark = Color(0xFFA8A8A8);
  static const _hintLight = Color(0xFFB0B0B0);
  static const _hintDark = Color(0xFF7A7A7A);
  static const _borderLight = Color(0xFFEBEBEB);
  static const _borderDark = Color(0xFF2E2E2E);

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
  static const border = AdaptiveColor(light: _borderLight, dark: _borderDark);
  static const hof = AdaptiveColor(light: _bodyLight, dark: _bodyDark);
  static const foggy = AdaptiveColor(light: _mutedLight, dark: _mutedDark);
  static const hackberry = AdaptiveColor(light: _hintLight, dark: _hintDark);
  static const linnen = AdaptiveColor(
    light: _surfaceSubtleLight,
    dark: _surfaceSubtleDark,
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
  bool _showSplash = true;
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
        color: scheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: EdgeInsets.zero,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
      ),
      dialogTheme: DialogThemeData(backgroundColor: scheme.surface),
      popupMenuTheme: PopupMenuThemeData(color: scheme.surface),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceSubtle,
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
    final savedThemeMode = await _readThemeModePreference();
    if (!mounted) return;

    // Apply saved theme early so splash uses the user's selected mode.
    setState(() {
      _themeMode = savedThemeMode;
    });

    await Future.wait<dynamic>([
      _session.refresh(),
      Future<void>.delayed(const Duration(milliseconds: 1600)),
    ]);

    if (!mounted) return;
    setState(() {
      _showSplash = false;
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
    _syncNativePlatformStyle(effectiveBrightness);

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
              surfaceContainerHighest: AppColors._surfaceSubtleDark,
            );

        return MaterialApp(
          key: ValueKey<ThemeMode>(_themeMode),
          debugShowCheckedModeBanner: false,
          title: 'Merry360x',
          theme: _buildTheme(scheme: lightScheme, isTablet: isTablet),
          darkTheme: _buildTheme(scheme: darkScheme, isTablet: isTablet),
          themeMode: _themeMode,
          home: _showSplash
              ? const _SplashScreen()
              : MainShell(
                  session: _session,
                  themeMode: _themeMode,
                  onThemeModeChanged: (mode) {
                    _setThemeMode(mode);
                  },
                ),
        );
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final isDark = brightness == Brightness.dark;
    final backgroundColor = isDark ? Colors.black : Colors.white;

    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
        statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
        systemNavigationBarColor: backgroundColor,
        systemNavigationBarIconBrightness: isDark
            ? Brightness.light
            : Brightness.dark,
      ),
    );

    return Scaffold(
      backgroundColor: backgroundColor,
      body: SafeArea(
        child: Center(
          child: Image.asset(
            'assets/brand/logo.png',
            width: 132,
            height: 132,
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
