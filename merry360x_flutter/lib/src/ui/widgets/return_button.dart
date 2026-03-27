import 'package:flutter/material.dart';

/// A consistent top-left "return" control.
///
/// Behavior:
/// - If the current navigator can pop, it pops.
/// - Otherwise, it navigates to the provided [fallbackRoute] (if given).
/// - Otherwise, it does nothing.
class ReturnButton extends StatelessWidget {
  const ReturnButton({
    super.key,
    this.color,
    this.fallbackRoute,
    this.tooltip = 'Back',
  });

  final Color? color;
  final String? fallbackRoute;
  final String tooltip;

  void _handleTap(BuildContext context) {
    final nav = Navigator.of(context);
    if (nav.canPop()) {
      nav.pop();
      return;
    }

    final route = fallbackRoute;
    if (route != null && route.isNotEmpty) {
      nav.pushNamedAndRemoveUntil(route, (r) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      icon: Icon(Icons.arrow_back, color: color),
      onPressed: () => _handleTap(context),
    );
  }
}
