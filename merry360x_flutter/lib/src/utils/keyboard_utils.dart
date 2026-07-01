import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Utility class for keyboard management across the app.
class KeyboardUtils {
  /// Dismisses the on-screen keyboard if open.
  static void dismiss(BuildContext context) {
    FocusScope.of(context).unfocus();
  }

  /// Dismisses the keyboard without requiring a BuildContext.
  static void dismissGlobal() {
    final focus = FocusManager.instance.primaryFocus;
    focus?.unfocus();
  }

  /// Wraps a child widget with a GestureDetector that dismisses
  /// the keyboard when tapping outside of text fields.
  static Widget dismissOnTap({
    required Widget child,
    bool dismissOnTap = true,
    HitTestBehavior behavior = HitTestBehavior.translucent,
  }) {
    if (!dismissOnTap) return child;

    return GestureDetector(
      onTap: () {
        final focus = FocusManager.instance.primaryFocus;
        focus?.unfocus();
      },
      behavior: behavior,
      child: child,
    );
  }
}

/// Mixin to add automatic keyboard dismissal on route blur
/// for screens that contain phone/number inputs.
mixin KeyboardDismissMixin<T extends StatefulWidget> on State<T> {
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route != null) {
      route.addLocalHistoryEntry(LocalHistoryEntry(
        onRemove: _onWillPop,
      ));
    }
  }

  void _onWillPop() {
    KeyboardUtils.dismiss(context);
  }

  @override
  void dispose() {
    KeyboardUtils.dismiss(context);
    super.dispose();
  }
}