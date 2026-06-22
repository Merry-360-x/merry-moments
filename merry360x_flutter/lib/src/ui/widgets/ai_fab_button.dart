import 'package:flutter/material.dart';

import '../../app.dart';

class AiFabButton extends StatefulWidget {
  const AiFabButton({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  State<AiFabButton> createState() => _AiFabButtonState();
}

class _AiFabButtonState extends State<AiFabButton>
    with TickerProviderStateMixin {
  OverlayEntry? _tooltip;
  late AnimationController _wave1;
  late AnimationController _wave2;
  late AnimationController _wave3;

  @override
  void initState() {
    super.initState();
    _wave1 = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
    _wave2 = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
    _wave3 = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) _wave2.value = 0.3;
    });
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) _wave3.value = 0.6;
    });

    WidgetsBinding.instance.addPostFrameCallback((_) => _showTooltip());
  }

  @override
  void dispose() {
    _wave1.dispose();
    _wave2.dispose();
    _wave3.dispose();
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

  Widget _ring(AnimationController ctrl, double maxRadius) {
    return AnimatedBuilder(
      animation: ctrl,
      builder: (_, _) {
        final t = ctrl.value;
        return Container(
          width: maxRadius * 2 * t,
          height: maxRadius * 2 * t,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: AppColors.rausch.withValues(alpha: (1 - t) * 0.45),
              width: 1.5,
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    const double btnSize = 52;
    const double iconSize = 26;
    const double totalSize = btnSize;
    const double borderRadius = 14;
    return GestureDetector(
      onTap: widget.onTap,
      child: SizedBox(
        width: totalSize,
        height: totalSize,
        child: Stack(
          alignment: Alignment.center,
          children: [
            _ring(_wave1, btnSize * 0.88),
            _ring(_wave2, btnSize * 0.88),
            _ring(_wave3, btnSize * 0.88),
            Container(
              width: btnSize,
              height: btnSize,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(borderRadius),
                color: Theme.of(context).colorScheme.surface,
                border: Border.all(
                  color: AppColors.rausch.withValues(alpha: 0.35),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0x66FF5050),
                    blurRadius: 10,
                    spreadRadius: 0,
                  ),
                ],
              ),
              child: const Center(
                child: Icon(
                  Icons.auto_awesome,
                  size: iconSize,
                  color: AppColors.rausch,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
