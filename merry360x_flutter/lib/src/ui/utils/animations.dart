import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ══════════════════════════════════════════════════════════════════════
// AnimatedPressable — spring scale feedback on tap/press
// ══════════════════════════════════════════════════════════════════════

class AnimatedPressable extends StatefulWidget {
  const AnimatedPressable({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scaleEnd = 1.0,
    this.scaleStart = 0.96,
    this.haptic = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scaleStart;
  final double scaleEnd;
  final bool haptic;

  @override
  State<AnimatedPressable> createState() => _AnimatedPressableState();
}

class _AnimatedPressableState extends State<AnimatedPressable>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;
  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _scale = Tween<double>(
      begin: widget.scaleEnd,
      end: widget.scaleStart,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutBack));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails d) {
    if (!_pressed) {
      _pressed = true;
      _ctrl.forward();
    }
  }

  void _handleTapUp(TapUpDetails d) {
    if (_pressed) {
      _pressed = false;
      _ctrl.reverse();
    }
    if (widget.haptic) HapticFeedback.lightImpact();
    widget.onTap?.call();
  }

  void _handleTapCancel() {
    if (_pressed) {
      _pressed = false;
      _ctrl.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: widget.onTap != null ? _handleTapDown : null,
      onTapUp: widget.onTap != null ? _handleTapUp : null,
      onTapCancel: widget.onTap != null ? _handleTapCancel : null,
      onLongPress: widget.onLongPress,
      child: AnimatedBuilder(
        animation: _scale,
        builder: (context, child) => Transform.scale(
          scale: _scale.value,
          child: child,
        ),
        child: widget.child,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// StaggeredSlideFade — staggered entrance for list items
// ══════════════════════════════════════════════════════════════════════

class StaggeredSlideFade extends StatefulWidget {
  const StaggeredSlideFade({
    super.key,
    required this.index,
    this.child,
    this.offsetX = 0,
    this.offsetY = 20,
    this.delayMs = 50,
    this.durationMs = 350,
  });

  final int index;
  final Widget? child;
  final double offsetX;
  final double offsetY;
  final int delayMs;
  final int durationMs;

  @override
  State<StaggeredSlideFade> createState() => _StaggeredSlideFadeState();
}

class _StaggeredSlideFadeState extends State<StaggeredSlideFade>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _opacity;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: widget.durationMs),
    );
    final delay = widget.index * widget.delayMs;
    _opacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: Interval(delay / widget.durationMs, 1, curve: Curves.easeOut),
      ),
    );
    _slide = Tween<Offset>(
      begin: Offset(widget.offsetX, widget.offsetY),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: Interval(delay / widget.durationMs, 1, curve: Curves.easeOutCubic),
      ),
    );
    Future.delayed(Duration.zero, () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slide,
      child: FadeTransition(opacity: _opacity, child: widget.child),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// ShimmerLoading — skeleton shimmer placeholder
// ══════════════════════════════════════════════════════════════════════

class ShimmerLoading extends StatefulWidget {
  const ShimmerLoading({
    super.key,
    this.baseColor,
    this.highlightColor,
    this.child,
    this.isLoading = true,
  });

  final Color? baseColor;
  final Color? highlightColor;
  final Widget? child;
  final bool isLoading;

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _animation = Tween<double>(begin: -2, end: 2).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLoading) return widget.child ?? const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = widget.baseColor ?? (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE8E8ED));
    final highlight = widget.highlightColor ?? (isDark ? const Color(0xFF3A3A3C) : const Color(0xFFF2F2F7));

    return widget.child ??
        AnimatedBuilder(
          animation: _animation,
          builder: (context, _) {
            return ShaderMask(
              blendMode: BlendMode.srcATop,
              shaderCallback: (bounds) => LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [base, highlight, base],
                stops: [_animation.value - 0.5, _animation.value, _animation.value + 0.5],
              ).createShader(bounds),
              child: Container(color: base),
            );
          },
        );
  }
}

// ══════════════════════════════════════════════════════════════════════
// ShimmerCardPlaceholder — ready-made shimmer skeleton cards
// ══════════════════════════════════════════════════════════════════════

class ShimmerCardPlaceholder extends StatelessWidget {
  const ShimmerCardPlaceholder({
    super.key,
    this.compact = false,
    this.imageHeightOverride,
  });

  final bool compact;
  final double? imageHeightOverride;

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final imageHeight = imageHeightOverride ?? (compact ? (isTablet ? 150.0 : 132.0) : (isTablet ? 230.0 : 220.0));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: ShimmerLoading(
            child: Container(height: imageHeight, width: double.infinity),
          ),
        ),
        const SizedBox(height: 8),
        ShimmerLoading(
          child: Container(
            height: compact ? 12 : 14,
            width: compact ? 120 : 180,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(4),
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 4),
        ShimmerLoading(
          child: Container(
            height: compact ? 10 : 12,
            width: compact ? 80 : 140,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(4),
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 4),
        if (!compact)
          ShimmerLoading(
            child: Container(
              height: 10,
              width: 60,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                color: Colors.white,
              ),
            ),
          ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// HeartBurst — like/unlike with particle burst
// ══════════════════════════════════════════════════════════════════════

class HeartBurst extends StatefulWidget {
  const HeartBurst({
    super.key,
    this.size = 18,
    this.color = Colors.white,
    this.liked = false,
    this.onChanged,
  });

  final double size;
  final Color color;
  final bool liked;
  final ValueChanged<bool>? onChanged;

  @override
  State<HeartBurst> createState() => _HeartBurstState();
}

class _HeartBurstState extends State<HeartBurst>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;
  late final Animation<double> _particleOpacity;
  late final Animation<double> _particleScale;

  final _rng = math.Random();
  bool _liked = false;

  @override
  void initState() {
    super.initState();
    _liked = widget.liked;
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _scale = Tween<double>(begin: 1, end: 1.3).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0, 0.3, curve: Curves.easeOut)),
    );
    _particleOpacity = Tween<double>(begin: 1, end: 0).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0.2, 1, curve: Curves.easeOut)),
    );
    _particleScale = Tween<double>(begin: 0.3, end: 1).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0, 0.5, curve: Curves.easeOutBack)),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _toggle() {
    HapticFeedback.mediumImpact();
    final next = !_liked;
    setState(() => _liked = next);
    _ctrl
      ..reset()
      ..forward();
    widget.onChanged?.call(next);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _toggle,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (context, child) {
          final particles = List.generate(6, (i) {
            final angle = (i / 6) * math.pi * 2;
            final distance = 12 + _rng.nextDouble() * 8;
            return Positioned(
              left: widget.size / 2 - 3 + math.cos(angle) * distance * _particleScale.value,
              top: widget.size / 2 - 3 + math.sin(angle) * distance * _particleScale.value,
              child: Opacity(
                opacity: _particleOpacity.value,
                child: Container(
                  width: 4 + _rng.nextDouble() * 3,
                  height: 4 + _rng.nextDouble() * 3,
                  decoration: BoxDecoration(
                    color: widget.color,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          });

          return Transform.scale(
            scale: _scale.value,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                ...particles,
                Icon(
                  _liked ? Icons.favorite : Icons.favorite_border,
                  color: _liked ? const Color(0xFFFF385C) : widget.color,
                  size: widget.size,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
