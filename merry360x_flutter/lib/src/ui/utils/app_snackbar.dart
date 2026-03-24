import 'package:flutter/material.dart';

/// Centralized snackbar helper.
/// White background; text is red for errors, teal/green for success, dark for info.
abstract class AppSnackBar {
  static const _bgColor = Color(0xFFFFFFFF);
  static const _errorColor = Color(0xFFFF385C);   // rausch — errors / deductions
  static const _successColor = Color(0xFF00A699); // babu  — confirmations / notes
  static const _infoColor = Color(0xFF222222);    // black — neutral info

  static void _show(
    BuildContext context,
    String message,
    Color textColor, {
    SnackBarAction? action,
  }) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(
        content: Text(
          message,
          style: TextStyle(
            color: textColor,
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
        ),
        backgroundColor: _bgColor,
        behavior: SnackBarBehavior.floating,
        elevation: 4,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
        ),
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        action: action,
      ));
  }

  /// Red text — use for errors, failures, validation messages, deductions.
  static void error(BuildContext context, String message, {SnackBarAction? action}) =>
      _show(context, message, _errorColor, action: action);

  /// Green text — use for confirmations, saves, additions, successes.
  static void success(BuildContext context, String message) =>
      _show(context, message, _successColor);

  /// Dark text — use for neutral info like "coming soon", "sign in to…".
  static void info(BuildContext context, String message) =>
      _show(context, message, _infoColor);
}
