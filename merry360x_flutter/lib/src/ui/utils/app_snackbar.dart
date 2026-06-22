import 'dart:async';

import 'package:flutter/material.dart';

/// Centralized toast helper — compact pill at the top of the screen,
/// independent of scaffold/bottom-sheet position.
abstract class AppSnackBar {
  static const _errorColor   = Color(0xFFFF385C);
  static const _successColor = Color(0xFF00A699);
  static const _infoColor    = Color(0xFF484848);

  static OverlayEntry? _current;

  static void _show(
    BuildContext context,
    String message,
    Color accentColor, {
    IconData icon = Icons.info_outline_rounded,
  }) {
    if (!context.mounted) return;

    // Dismiss any existing toast immediately
    _current?.remove();
    _current = null;

    final overlay = Overlay.of(context, rootOverlay: true);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF2C2C2E) : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF1C1C1E);
    final top = MediaQuery.paddingOf(context).top + 16;

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _ToastWidget(
        message: message,
        icon: icon,
        accentColor: accentColor,
        bg: bg,
        textColor: textColor,
        top: top,
        onDone: () {
          entry.remove();
          if (_current == entry) _current = null;
        },
      ),
    );

    _current = entry;
    overlay.insert(entry);
  }

  static void error(BuildContext context, String message, {SnackBarAction? action}) =>
      _show(context, message, _errorColor, icon: Icons.error_outline_rounded);

  static void success(BuildContext context, String message) =>
      _show(context, message, _successColor, icon: Icons.check_circle_outline_rounded);

  static void info(BuildContext context, String message) =>
      _show(context, message, _infoColor, icon: Icons.info_outline_rounded);
}

class _ToastWidget extends StatefulWidget {
  const _ToastWidget({
    required this.message,
    required this.icon,
    required this.accentColor,
    required this.bg,
    required this.textColor,
    required this.top,
    required this.onDone,
  });

  final String message;
  final IconData icon;
  final Color accentColor;
  final Color bg;
  final Color textColor;
  final double top;
  final VoidCallback onDone;

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _opacity;
  late final Animation<Offset> _slide;
  late final Animation<double> _scale;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    );

    // Fade in quickly so it's visible as soon as it clears the notch
    _opacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0.0, 0.55, curve: Curves.easeOut)),
    );

    // Slide in from just above the final position
    _slide = Tween<Offset>(
      begin: const Offset(0, -0.35),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));

    // Slight scale-up from 0.88 → 1.0 for depth
    _scale = Tween<double>(begin: 0.88, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0.0, 0.6, curve: Curves.easeOutCubic)),
    );

    _ctrl.forward();
    _timer = Timer(const Duration(milliseconds: 3000), _dismiss);
  }

  void _dismiss() {
    if (!mounted) return;
    _ctrl.reverse().then((_) => widget.onDone());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: widget.top,
      left: 16,
      right: 16,
      child: ScaleTransition(
        scale: _scale,
        alignment: Alignment.topCenter,
        child: SlideTransition(
          position: _slide,
          child: FadeTransition(
            opacity: _opacity,
            child: Material(
              color: Colors.transparent,
              child: GestureDetector(
                onTap: _dismiss,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  decoration: BoxDecoration(
                    color: widget.bg,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.14),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(widget.icon, color: widget.accentColor, size: 20),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          widget.message,
                          style: TextStyle(
                            color: widget.textColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
