import 'package:flutter/material.dart';

import '../../app.dart';

class AiFabButton extends StatefulWidget {
  const AiFabButton({super.key});

  @override
  State<AiFabButton> createState() => _AiFabButtonState();
}

class _AiFabButtonState extends State<AiFabButton>
    with TickerProviderStateMixin {
  OverlayEntry? _tooltip;
  late AnimationController _pulseCtrl;

  static const double _btnSize = 49;
  static const double _iconSize = 20;
  static const double _borderRadius = 11;
  static const double _ringRadius = _btnSize * 0.86;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();

    WidgetsBinding.instance.addPostFrameCallback((_) => _showTooltip());
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _tooltip?.remove();
    _tooltip = null;
    super.dispose();
  }

  void _showTooltip() {
    if (!mounted) return;
    final box = context.findRenderObject() as RenderBox?;
    if (box == null) return;
    final pos = box.localToGlobal(Offset.zero);

    _tooltip = OverlayEntry(
      builder: (_) => Positioned(
        right: 16,
        top: pos.dy - 50,
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
              boxShadow: [
                BoxShadow(
                  color: AppColors.black.withValues(alpha: 0.16),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Text(
              'Ask our AI \u2728',
              style: TextStyle(
                color: AppColors.black,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );

    Overlay.of(context).insert(_tooltip!);

    Future.delayed(const Duration(seconds: 3), () {
      _tooltip?.remove();
      _tooltip = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SizedBox(
      width: _btnSize,
      height: _btnSize,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Subtle pulse ring
          AnimatedBuilder(
            animation: _pulseCtrl,
            builder: (_, child) {
              final t = _pulseCtrl.value;
              final scale = 0.92 + t * 0.20;
              final opacity = (1.0 - t) * 0.25;
              return Container(
                width: _ringRadius * 2 * scale,
                height: _ringRadius * 2 * scale,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.rausch.withValues(alpha: opacity),
                    width: 1.2,
                  ),
                ),
              );
            },
          ),
          // Main button body
          Container(
            width: _btnSize,
            height: _btnSize,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(_borderRadius),
              color: isDark
                  ? const Color(0xFF2A2A2E)
                  : Colors.white,
              border: Border.all(
                color: AppColors.rausch.withValues(alpha: 0.30),
                width: 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.rausch.withValues(alpha: isDark ? 0.12 : 0.08),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Center(
              child: Icon(
                Icons.auto_awesome,
                size: _iconSize,
                color: AppColors.rausch,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
