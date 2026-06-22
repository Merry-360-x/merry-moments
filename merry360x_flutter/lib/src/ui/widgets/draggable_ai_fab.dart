import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'ai_fab_button.dart';
import '../screens/ai_screen.dart';
import '../../session_controller.dart';

const _kPosKey = 'ai_fab_position';

class DraggableAiFab extends StatefulWidget {
  const DraggableAiFab({super.key, required this.session});

  final SessionController session;

  @override
  State<DraggableAiFab> createState() => _DraggableAiFabState();
}

class _DraggableAiFabState extends State<DraggableAiFab>
    with WidgetsBindingObserver {
  double _posX = 0;
  double _posY = 0;
  double _dragStartX = 0;
  double _dragStartY = 0;
  bool _isDragging = false;
  bool _initialized = false;
  Size _screenSize = Size.zero;

  static const double _fabSize = 52;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _initPosition());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeMetrics() {
    _clampPosition();
  }

  Future<void> _initPosition() async {
    final size = MediaQuery.of(context).size;
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
        _posX = (double.tryParse(parts[0]) ?? size.width - _fabSize - 16) * ratioX;
        _posY = (double.tryParse(parts[1]) ?? size.height * 0.8) * ratioY;
      }
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
      child: GestureDetector(
        onLongPressStart: (_) {
          setState(() {
            _isDragging = true;
            _dragStartX = _posX;
            _dragStartY = _posY;
          });
          HapticFeedback.mediumImpact();
        },
        onLongPressMoveUpdate: (details) {
          if (!_isDragging) return;
          setState(() {
            _posX = (_dragStartX + details.offsetFromOrigin.dx)
                .clamp(minX, maxX);
            _posY = (_dragStartY + details.offsetFromOrigin.dy)
                .clamp(minY, maxY);
          });
        },
        onLongPressEnd: (_) {
          _isDragging = false;
          _clampPosition();
          _savePosition();
        },
        child: AnimatedScale(
          scale: _isDragging ? 1.08 : 1.0,
          duration: const Duration(milliseconds: 200),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              AiFabButton(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => AiScreen(
                        session: widget.session,
                        onBack: () => Navigator.of(context).maybePop(),
                      ),
                    ),
                  );
                },
              ),
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
    );
  }
}
