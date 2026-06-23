import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'ai_fab_button.dart';
import '../screens/ai_screen.dart';
import '../../session_controller.dart';

const _kPosKey = 'ai_fab_position';
const _kHoldDuration = Duration(milliseconds: 600);
const _kTapThreshold = Duration(milliseconds: 200);

class DraggableAiFab extends StatefulWidget {
  const DraggableAiFab({super.key, required this.session, required this.navigatorKey});

  final SessionController session;
  final GlobalKey<NavigatorState> navigatorKey;

  @override
  State<DraggableAiFab> createState() => _DraggableAiFabState();
}

class _DraggableAiFabState extends State<DraggableAiFab>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  double _posX = 0;
  double _posY = 0;
  bool _isDragging = false;
  bool _initialized = false;
  Size _screenSize = Size.zero;
  Timer? _holdTimer;
  DateTime? _pointerDownTime;
  Offset? _dragGlobalStart;
  late AnimationController _pulseCtrl;

  static const double _fabSize = 49;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _initPosition());
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    _pulseCtrl.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeMetrics() {
    _clampPosition();
  }

  double _defaultPosX(Size size) {
    const tabCount = 5;
    final profileTabCenter = size.width - (size.width / tabCount / 2);
    return profileTabCenter - _fabSize / 2;
  }

  double _defaultPosY(Size size, EdgeInsets padding) {
    const navBarHeight = 60.0;
    final availableY = size.height - padding.bottom - navBarHeight - 12;
    return availableY - _fabSize;
  }

  Future<void> _initPosition() async {
    final size = MediaQuery.of(context).size;
    final padding = MediaQuery.of(context).padding;
    _screenSize = size;

    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kPosKey);
    if (raw != null) {
      final parts = raw.split(',');
      if (parts.length == 4) {
        final storedW = double.tryParse(parts[2]) ?? size.width;
        final storedH = double.tryParse(parts[3]) ?? size.height;
        final ratioX = size.width / storedW;
        final ratioY = size.height / storedH;
        _posX = (double.tryParse(parts[0]) ?? _defaultPosX(size)) * ratioX;
        _posY = (double.tryParse(parts[1]) ?? _defaultPosY(size, padding)) * ratioY;
      } else {
        _posX = _defaultPosX(size);
        _posY = _defaultPosY(size, padding);
      }
    } else {
      _posX = _defaultPosX(size);
      _posY = _defaultPosY(size, padding);
    }
    _clampPosition();
    _initialized = true;
    if (mounted) setState(() {});
  }

  void _clampPosition() {
    if (!mounted) return;
    final size = MediaQuery.of(context).size;
    final padding = MediaQuery.of(context).padding;
    _screenSize = size;
    const edge = 4.0;
    final minX = padding.left + edge;
    final maxX = size.width - padding.right - _fabSize - edge;
    final minY = padding.top + edge;
    final maxY = size.height - padding.bottom - _fabSize - edge;
    _posX = _posX.clamp(minX, maxX);
    _posY = _posY.clamp(minY, maxY);
  }

  Future<void> _savePosition() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kPosKey,
      '${_posX.toStringAsFixed(0)},${_posY.toStringAsFixed(0)},${_screenSize.width.toStringAsFixed(0)},${_screenSize.height.toStringAsFixed(0)}',
    );
  }

  void _onPointerDown(PointerDownEvent event) {
    _holdTimer?.cancel();
    _pointerDownTime = DateTime.now();
    _holdTimer = Timer(_kHoldDuration, () {
      if (!mounted) return;
      setState(() {
        _isDragging = true;
        _dragGlobalStart = event.position;
      });
      HapticFeedback.mediumImpact();
      _pulseCtrl.repeat(reverse: true);
    });
  }

  void _onPointerMove(PointerMoveEvent event) {
    if (!_isDragging || _dragGlobalStart == null) return;
    final padding = MediaQuery.of(context).padding;
    final size = MediaQuery.of(context).size;
    const edge = 4.0;
    final minX = padding.left + edge;
    final maxX = size.width - padding.right - _fabSize - edge;
    final minY = padding.top + edge;
    final maxY = size.height - padding.bottom - _fabSize - edge;
    final dx = event.position.dx - _dragGlobalStart!.dx;
    final dy = event.position.dy - _dragGlobalStart!.dy;
    setState(() {
      _posX = (_posX + (_dragGlobalStart == null ? 0 : dx)).clamp(minX, maxX);
      _posY = (_posY + (_dragGlobalStart == null ? 0 : dy)).clamp(minY, maxY);
      _dragGlobalStart = event.position;
    });
  }

  void _onPointerUp(PointerUpEvent event) {
    _holdTimer?.cancel();
    _pulseCtrl.stop();
    _pulseCtrl.reset();

    if (_isDragging) {
      _isDragging = false;
      _snapToEdge();
      _savePosition();
      if (mounted) setState(() {});
      return;
    }

    if (_pointerDownTime != null) {
      final elapsed = DateTime.now().difference(_pointerDownTime!);
      if (elapsed < _kTapThreshold) {
        _openAi();
      }
    }
  }

  void _onPointerCancel(PointerCancelEvent event) {
    _holdTimer?.cancel();
    _pulseCtrl.stop();
    _pulseCtrl.reset();
    if (_isDragging) {
      _isDragging = false;
      if (mounted) setState(() {});
    }
  }

  void _snapToEdge() {
    final size = _screenSize;
    const edgeMargin = 4.0;
    final leftDist = _posX - edgeMargin;
    final rightDist = (size.width - _fabSize - edgeMargin) - _posX;
    if (rightDist > leftDist) {
      _posX = edgeMargin;
    } else {
      _posX = size.width - _fabSize - edgeMargin;
    }
  }

  void _openAi() {
    widget.navigatorKey.currentState?.push(
      MaterialPageRoute(
        builder: (_) => AiScreen(
          session: widget.session,
          onBack: () => widget.navigatorKey.currentState?.maybePop(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) return const SizedBox.shrink();

    final padding = MediaQuery.of(context).padding;
    final size = MediaQuery.of(context).size;
    const edge = 4.0;
    final minX = padding.left + edge;
    final maxX = size.width - padding.right - _fabSize - edge;
    final minY = padding.top + edge;
    final maxY = size.height - padding.bottom - _fabSize - edge;
    final clampedX = _posX.clamp(minX, maxX);
    final clampedY = _posY.clamp(minY, maxY);

    return Positioned(
      left: clampedX,
      top: clampedY,
      child: Listener(
        onPointerDown: _onPointerDown,
        onPointerMove: _onPointerMove,
        onPointerUp: _onPointerUp,
        onPointerCancel: _onPointerCancel,
        child: AnimatedScale(
          scale: _isDragging ? 1.08 : 1.0,
          duration: const Duration(milliseconds: 200),
          child: AnimatedBuilder(
            animation: _pulseCtrl,
            builder: (context, child) {
              return Transform.scale(
                scale: 1.0 + _pulseCtrl.value * 0.04,
                child: child,
              );
            },
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                const AiFabButton(),
                if (_isDragging)
                  Positioned(
                    right: -4,
                    top: -4,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFF385C),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.drag_indicator,
                        size: 12,
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
