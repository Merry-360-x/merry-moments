import 'package:flutter/material.dart';

import 'session_controller.dart';
import 'ui/main_shell.dart';

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
    const accent = Color(0xFFE2555A);
    const bg = Color(0xFFFFFFFF);

    return AnimatedBuilder(
      animation: _session,
      builder: (context, _) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'Merry360x Mobile',
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: accent,
              brightness: Brightness.light,
            ),
            scaffoldBackgroundColor: bg,
            fontFamily: 'SF Pro Text',
            appBarTheme: const AppBarTheme(
              centerTitle: false,
              elevation: 0,
              scrolledUnderElevation: 0,
              backgroundColor: bg,
              foregroundColor: Color(0xFF26262B),
              titleTextStyle: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: Color(0xFF26262B),
              ),
            ),
            textTheme: const TextTheme(
              headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w700),
              headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
              titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400),
              bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400),
              bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
            ),
            inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFFE6E6EB)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFFE6E6EB)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: accent, width: 1.5),
              ),
            ),
            filledButtonTheme: FilledButtonThemeData(
              style: FilledButton.styleFrom(
                backgroundColor: accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                textStyle: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            outlinedButtonTheme: OutlinedButtonThemeData(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFE3E3E8)),
                foregroundColor: const Color(0xFF222228),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                textStyle: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          home: MainShell(session: _session),
        );
      },
    );
  }
}
