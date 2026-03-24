import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'session_controller.dart';
import 'ui/main_shell.dart';

/// Airbnb-style design tokens
class AppColors {
  static const rausch = Color(0xFFFF385C);
  static const babu = Color(0xFF00A699);
  static const arches = Color(0xFFFC642D);
  static const hof = Color(0xFF484848);
  static const foggy = Color(0xFF767676);
  static const hackberry = Color(0xFFB0B0B0);
  static const linnen = Color(0xFFF7F7F7);
  static const white = Color(0xFFFFFFFF);
  static const black = Color(0xFF222222);
}

class Merry360xMobileApp extends StatefulWidget {
  const Merry360xMobileApp({super.key});

  @override
  State<Merry360xMobileApp> createState() => _Merry360xMobileAppState();
}

class _Merry360xMobileAppState extends State<Merry360xMobileApp> {
  late final SessionController _session;

  @override
  void initState() {
    super.initState();
    _session = SessionController();
    _session.refresh();
  }

  @override
  void dispose() {
    _session.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: AppColors.white,
    ));

    return AnimatedBuilder(
      animation: _session,
      builder: (context, _) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'Merry360x',
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: AppColors.rausch,
              brightness: Brightness.light,
              primary: AppColors.rausch,
              onPrimary: AppColors.white,
              surface: AppColors.white,
              onSurface: AppColors.black,
            ),
            scaffoldBackgroundColor: AppColors.white,
            fontFamily: 'SF Pro Text',
            dividerColor: const Color(0xFFEBEBEB),
            dividerTheme: const DividerThemeData(
              color: Color(0xFFEBEBEB),
              thickness: 1,
              space: 0,
            ),
            appBarTheme: const AppBarTheme(
              centerTitle: false,
              elevation: 0,
              scrolledUnderElevation: 0,
              backgroundColor: AppColors.white,
              surfaceTintColor: Colors.transparent,
              foregroundColor: AppColors.black,
              titleTextStyle: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
                fontFamily: 'SF Pro Text',
              ),
            ),
            textTheme: const TextTheme(
              headlineLarge: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: AppColors.black, letterSpacing: -0.5),
              headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.black, letterSpacing: -0.3),
              titleLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.black),
              titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.black),
              bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: AppColors.hof),
              bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.hof),
              bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.foggy),
            ),
            inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: AppColors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFDDDDDD)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFDDDDDD)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.black, width: 2),
              ),
              hintStyle: const TextStyle(color: AppColors.hackberry),
            ),
            filledButtonTheme: FilledButtonThemeData(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.rausch,
                foregroundColor: AppColors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, fontFamily: 'SF Pro Text'),
              ),
            ),
            outlinedButtonTheme: OutlinedButtonThemeData(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.black),
                foregroundColor: AppColors.black,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, fontFamily: 'SF Pro Text'),
              ),
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: AppColors.black,
                textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, decoration: TextDecoration.underline, fontFamily: 'SF Pro Text'),
              ),
            ),
            chipTheme: ChipThemeData(
              backgroundColor: AppColors.white,
              side: const BorderSide(color: Color(0xFFDDDDDD)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.hof),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            cardTheme: CardThemeData(
              elevation: 0,
              color: AppColors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              margin: EdgeInsets.zero,
            ),
            bottomSheetTheme: const BottomSheetThemeData(
              backgroundColor: AppColors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
            ),
            snackBarTheme: const SnackBarThemeData(
              backgroundColor: AppColors.white,
              behavior: SnackBarBehavior.floating,
              elevation: 4,
              actionTextColor: AppColors.rausch,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(10)),
              ),
            ),
          ),
          home: MainShell(session: _session),
        );
      },
    );
  }
}
