import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class SlideToConfirmButton extends StatefulWidget {
  const SlideToConfirmButton({
    super.key,
    required this.label,
    required this.onConfirmed,
    this.height = 52,
    this.borderRadius = 26,
    this.activeColor,
    this.trackColor,
    this.thumbColor,
    this.labelStyle,
    this.activeLabelStyle,
    this.confirmed = false,
    this.disabled = false,
    this.isProcessing = false,
    this.showSuccess = false,
    this.hasError = false,
    this.errorText,
  });

  final String label;
  final VoidCallback onConfirmed;
  final double height;
  final double borderRadius;
  final Color? activeColor;
  final Color? trackColor;
  final Color? thumbColor;
  final TextStyle? labelStyle;
  final TextStyle? activeLabelStyle;
  final bool confirmed;
  final bool disabled;
  final bool isProcessing;
  final bool showSuccess;
  final bool hasError;
  final String? errorText;

  @override
  State<SlideToConfirmButton> createState() => _SlideToConfirmButtonState();
}

class _SlideToConfirmButtonState extends State<SlideToConfirmButton>
    with TickerProviderStateMixin {
  late AnimationController _animCtrl;
  late AnimationController _successCtrl;
  late AnimationController _errorCtrl;
  double _dragProgress = 0.0;
  double _successProgress = 0.0;
  double _errorFlash = 0.0;
  bool _isDragging = false;
  bool _isConfirmed = false;
  bool _wasShowSuccess = false;
  bool _wasError = false;

  static const double _threshold = 0.88;

  @override
  void initState() {
    super.initState();
    _isConfirmed = widget.confirmed;
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _animCtrl.addListener(() {
      if (mounted) setState(() => _dragProgress = _animCtrl.value);
    });
    _animCtrl.addStatusListener((status) {
      if (status == AnimationStatus.completed && _animCtrl.value == 1.0) {
        _isConfirmed = true;
        HapticFeedback.heavyImpact();
        if (mounted) widget.onConfirmed();
      }
    });

    _successCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _successCtrl.addListener(() {
      if (mounted) setState(() => _successProgress = _successCtrl.value);
    });

    _errorCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _errorCtrl.addListener(() {
      if (mounted) setState(() => _errorFlash = _errorCtrl.value);
    });
    _errorCtrl.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _errorCtrl.reverse();
      }
    });
  }

  @override
  void didUpdateWidget(SlideToConfirmButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.confirmed != oldWidget.confirmed) {
      if (!widget.confirmed) _reset();
    }
    if (widget.showSuccess && !_wasShowSuccess) {
      _successCtrl.forward(from: 0.0);
    }
    _wasShowSuccess = widget.showSuccess;

    if (widget.hasError && !_wasError) {
      _onError();
    } else if (!widget.hasError && _wasError) {
      _clearError();
    }
    _wasError = widget.hasError;
  }

  void _onError() {
    HapticFeedback.selectionClick();
    _isConfirmed = false;
    _snapTo(0.0);
    _errorCtrl.forward(from: 0.0);
  }

  void _clearError() {
    _errorFlash = 0.0;
    _errorCtrl.value = 0.0;
    if (mounted) setState(() {});
  }

  void _reset() {
    _isConfirmed = false;
    _dragProgress = 0.0;
    _animCtrl.value = 0.0;
    _successProgress = 0.0;
    _successCtrl.value = 0.0;
    _errorFlash = 0.0;
    _errorCtrl.value = 0.0;
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _successCtrl.dispose();
    _errorCtrl.dispose();
    super.dispose();
  }

  void _snapTo(double target) {
    _animCtrl
      ..value = _dragProgress
      ..animateTo(
        target,
        duration: Duration(milliseconds: target == 0.0 ? 400 : 300),
        curve: target == 1.0 ? Curves.easeOutBack : Curves.easeOutCubic,
      );
  }

  void _onDragUpdate(DragUpdateDetails details) {
    if (_isConfirmed || widget.disabled || widget.isProcessing || widget.hasError) return;
    _isDragging = true;
    final width = context.size?.width ?? 1;
    if (width <= 0) return;
    final raw = (_dragProgress * width + details.delta.dx) / width;
    setState(() => _dragProgress = raw.clamp(0.0, 1.0));
  }

  void _onDragEnd(DragEndDetails details) {
    if (!_isDragging) return;
    _isDragging = false;
    if (_dragProgress >= _threshold) {
      _snapTo(1.0);
    } else {
      _snapTo(0.0);
      HapticFeedback.selectionClick();
    }
  }

  void _onDragCancel() {
    _isDragging = false;
    _snapTo(0.0);
  }

  bool get showProcessing => widget.isProcessing;
  bool get showSuccessAnim => widget.showSuccess;
  bool get isLocked =>
      _isConfirmed || showProcessing || showSuccessAnim || widget.disabled || widget.hasError;

  @override
  Widget build(BuildContext context) {
    final activeColor = widget.activeColor ?? const Color(0xFFFF385C);
    final trackColor = widget.trackColor ?? const Color(0xFFF0F0F0);
    final thumbColor = widget.thumbColor ?? Colors.white;
    final labelStyle = widget.labelStyle ??
        const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 15,
          color: Color(0xFF222222),
        );
    final activeLabelStyle = widget.activeLabelStyle ??
        labelStyle.copyWith(color: Colors.white);
    final thumbSize = widget.height - 6;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: widget.height,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final trackWidth = constraints.maxWidth;
              final maxThumbLeft = trackWidth - thumbSize - 4;
              final thumbLeft = isLocked
                  ? maxThumbLeft + 2
                  : (_dragProgress * maxThumbLeft + 2)
                      .clamp(2.0, maxThumbLeft + 2);

              return GestureDetector(
                onHorizontalDragUpdate: _onDragUpdate,
                onHorizontalDragEnd: _onDragEnd,
                onHorizontalDragCancel: _onDragCancel,
                child: Stack(
                  children: [
                    // Track
                    Container(
                      width: trackWidth,
                      height: widget.height,
                      decoration: BoxDecoration(
                        color: widget.hasError
                            ? const Color(0xFFE53935).withValues(alpha: 0.3 + _errorFlash * 0.7)
                            : showSuccessAnim || _isConfirmed || showProcessing
                                ? activeColor
                                : trackColor,
                        borderRadius:
                            BorderRadius.circular(widget.borderRadius),
                      ),
                      alignment: Alignment.center,
                      child: AnimatedOpacity(
                        opacity: showProcessing || showSuccessAnim || _dragProgress > 0.7
                            ? 0.0
                            : 1.0,
                        duration: const Duration(milliseconds: 120),
                        child: Text(
                          widget.hasError && widget.errorText != null
                              ? widget.errorText!
                              : widget.label,
                          style: _isConfirmed ? activeLabelStyle : labelStyle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),

                    // Active fill overlay (only during non-locked drag)
                    if (!isLocked && _dragProgress > 0.01)
                      ClipRRect(
                        borderRadius:
                            BorderRadius.circular(widget.borderRadius),
                        child: FractionallySizedBox(
                          widthFactor: _dragProgress + 0.02,
                          alignment: Alignment.centerLeft,
                          child: Container(
                            height: widget.height,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  activeColor,
                                  activeColor.withValues(alpha: 0.85),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                    // Processing spinner overlay
                    if (showProcessing)
                      const Positioned.fill(
                        child: Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2.5,
                            ),
                          ),
                        ),
                      ),

                    // Success checkmark overlay
                    if (showSuccessAnim)
                      Positioned.fill(
                        child: Center(
                          child: SizedBox(
                            width: 40,
                            height: 40,
                            child: CustomPaint(
                              painter: _CheckmarkPainter(
                                progress: _successProgress,
                                color: Colors.white,
                                strokeWidth: 3.5,
                              ),
                            ),
                          ),
                        ),
                      ),

                    // Thumb — hidden during processing
                    if (!showProcessing)
                      Positioned(
                        left: thumbLeft,
                        top: 3,
                        child: Container(
                          width: thumbSize,
                          height: thumbSize,
                          decoration: BoxDecoration(
                            color: showSuccessAnim
                                ? activeColor
                                : widget.hasError
                                    ? const Color(0xFFE53935)
                                    : _isConfirmed
                                        ? Colors.white
                                        : thumbColor,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Center(
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 250),
                              child: showSuccessAnim
                                  ? const Icon(
                                      Icons.check,
                                      key: ValueKey('check-filled'),
                                      color: Colors.white,
                                      size: 20,
                                    )
                                  : _isConfirmed
                                      ? Icon(
                                          Icons.check,
                                          key: const ValueKey('check'),
                                          color: activeColor,
                                          size: 20,
                                        )
                                      : Icon(
                                          _dragProgress > 0.5
                                              ? Icons.arrow_forward_rounded
                                              : Icons.chevron_right_rounded,
                                          key: ValueKey(_dragProgress > 0.5
                                              ? 'arrow'
                                              : 'chevron'),
                                          color: widget.hasError
                                              ? Colors.white
                                              : const Color(0xFF222222),
                                          size: _dragProgress > 0.5 ? 18 : 22,
                                        ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),

        // ── Inline error message ──
        if (widget.hasError && widget.errorText != null)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              widget.errorText!,
              style: const TextStyle(
                color: Color(0xFFE53935),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
      ],
    );
  }
}

class _CheckmarkPainter extends CustomPainter {
  const _CheckmarkPainter({
    required this.progress,
    required this.color,
    required this.strokeWidth,
  });

  final double progress;
  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path()
      ..moveTo(size.width * 0.22, size.height * 0.52)
      ..lineTo(size.width * 0.45, size.height * 0.72)
      ..lineTo(size.width * 0.82, size.height * 0.28);

    final metrics = path.computeMetrics();
    final totalLength =
        metrics.fold(0.0, (double sum, var m) => sum + m.length);
    final drawLength = totalLength * progress.clamp(0.0, 1.0);
    var drawn = 0.0;

    for (final metric in metrics) {
      if (drawn >= drawLength) break;
      final remaining = drawLength - drawn;
      final len = math.min(remaining, metric.length);
      if (len <= 0) continue;
      final extract = metric.extractPath(0.0, len);
      canvas.drawPath(extract, paint);
      drawn += len;
    }
  }

  @override
  bool shouldRepaint(covariant _CheckmarkPainter old) =>
      old.progress != progress;
}
