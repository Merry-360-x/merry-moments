import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../app.dart';

/// A beautiful, animated bottom-sheet date picker with white theme.
/// Replaces the default Material pink date picker.
class AnimatedDatePicker extends StatefulWidget {
  const AnimatedDatePicker({
    super.key,
    required this.initialDate,
    required this.firstDate,
    required this.lastDate,
    this.title = 'Select date',
    this.confirmText = 'OK',
    this.cancelText = 'Cancel',
  });

  final DateTime initialDate;
  final DateTime firstDate;
  final DateTime lastDate;
  final String title;
  final String confirmText;
  final String cancelText;

  static Future<DateTime?> show({
    required BuildContext context,
    required DateTime initialDate,
    required DateTime firstDate,
    required DateTime lastDate,
    String title = 'Select date',
  }) async {
    return showModalBottomSheet<DateTime?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AnimatedDatePicker(
        initialDate: initialDate,
        firstDate: firstDate,
        lastDate: lastDate,
        title: title,
      ),
    );
  }

  @override
  State<AnimatedDatePicker> createState() => _AnimatedDatePickerState();
}

class _AnimatedDatePickerState extends State<AnimatedDatePicker>
    with SingleTickerProviderStateMixin {
  late DateTime _viewMonth;
  late DateTime _selectedDate;
  late AnimationController _animCtrl;
  late Animation<Offset> _slideAnim;
  bool _isForward = true;

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.initialDate;
    _viewMonth = DateTime(widget.initialDate.year, widget.initialDate.month);
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 260),
    );
    _slideAnim = Tween<Offset>(
      begin: Offset.zero,
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animCtrl,
      curve: Curves.easeInOutCubic,
    ));
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  void _goToMonth(int delta) {
    final newMonth = DateTime(_viewMonth.year, _viewMonth.month + delta);
    if (newMonth.isAfter(widget.lastDate) ||
        DateTime(newMonth.year, newMonth.month + 1, 0).isBefore(widget.firstDate)) {
      return;
    }
    setState(() {
      _isForward = delta > 0;
      _slideAnim = Tween<Offset>(
        begin: Offset(delta > 0 ? 0.15 : -0.15, 0),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: _animCtrl,
        curve: Curves.easeOutCubic,
      ));
      _viewMonth = newMonth;
    });
    _animCtrl.forward(from: 0);
  }

  void _selectDate(DateTime date) {
    HapticFeedback.selectionClick();
    setState(() => _selectedDate = date);
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  bool _isToday(DateTime d) {
    final now = DateTime.now();
    return _isSameDay(d, now);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final text = isDark ? Colors.white : const Color(0xFF1C1C1E);
    final subtle = isDark ? const Color(0xFF8E8E93) : const Color(0xFF767676);

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: subtle.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title
              Text(
                widget.title,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: text,
                ),
              ),
              const SizedBox(height: 4),

              // Selected date display
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Text(
                  _formatDate(_selectedDate),
                  key: ValueKey(_selectedDate),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: AppColors.rausch,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Month navigator
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _NavButton(
                    icon: Icons.chevron_left,
                    onTap: () => _goToMonth(-1),
                  ),
                  Text(
                    _monthYearText(_viewMonth),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: text,
                    ),
                  ),
                  _NavButton(
                    icon: Icons.chevron_right,
                    onTap: () => _goToMonth(1),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Weekday headers
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                    .map((d) => SizedBox(
                          width: 36,
                          child: Text(
                            d,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: subtle,
                            ),
                          ),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 8),

              // Calendar grid with animation
              AnimatedBuilder(
                animation: _animCtrl,
                builder: (_, child) => SlideTransition(
                  position: _slideAnim,
                  child: child,
                ),
                child: _buildCalendarGrid(isDark, text, subtle),
              ),
              const SizedBox(height: 24),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: text,
                        side: BorderSide(color: AppColors.border),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(widget.cancelText),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context, _selectedDate),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.rausch,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(widget.confirmText),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCalendarGrid(bool isDark, Color text, Color subtle) {
    final daysInMonth = DateTime(_viewMonth.year, _viewMonth.month + 1, 0).day;
    final firstWeekday = DateTime(_viewMonth.year, _viewMonth.month, 1).weekday % 7;

    final cells = <Widget>[];

    // Empty cells for days before the 1st
    for (int i = 0; i < firstWeekday; i++) {
      cells.add(const SizedBox(width: 40, height: 40));
    }

    // Day cells
    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(_viewMonth.year, _viewMonth.month, day);
      final isSelected = _isSameDay(date, _selectedDate);
      final isToday = _isToday(date);
      final isDisabled = date.isBefore(widget.firstDate) || date.isAfter(widget.lastDate);

      cells.add(
        _DayCell(
          day: day,
          isSelected: isSelected,
          isToday: isToday,
          isDisabled: isDisabled,
          onTap: isDisabled ? null : () => _selectDate(date),
        ),
      );
    }

    return Wrap(
      alignment: WrapAlignment.start,
      spacing: 4,
      runSpacing: 4,
      children: cells,
    );
  }

  String _formatDate(DateTime d) {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${days[d.weekday - 1]}, ${months[d.month - 1]} ${d.day}';
  }

  String _monthYearText(DateTime d) {
    final months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[d.month - 1]} ${d.year}';
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.rausch.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(icon, size: 20, color: AppColors.rausch),
        ),
      ),
    );
  }
}

class _DayCell extends StatefulWidget {
  const _DayCell({
    required this.day,
    required this.isSelected,
    required this.isToday,
    required this.isDisabled,
    required this.onTap,
  });

  final int day;
  final bool isSelected;
  final bool isToday;
  final bool isDisabled;
  final VoidCallback? onTap;

  @override
  State<_DayCell> createState() => _DayCellState();
}

class _DayCellState extends State<_DayCell>
    with SingleTickerProviderStateMixin {
  late AnimationController _scaleCtrl;

  @override
  void initState() {
    super.initState();
    _scaleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    if (widget.isSelected) {
      _scaleCtrl.value = 1;
    }
  }

  @override
  void didUpdateWidget(_DayCell old) {
    super.didUpdateWidget(old);
    if (widget.isSelected && !old.isSelected) {
      _scaleCtrl.forward(from: 0);
    } else if (!widget.isSelected && old.isSelected) {
      _scaleCtrl.reverse();
    }
  }

  @override
  void dispose() {
    _scaleCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bg = widget.isSelected
        ? AppColors.rausch
        : widget.isToday
            ? AppColors.rausch.withValues(alpha: 0.1)
            : Colors.transparent;

    final textColor = widget.isSelected
        ? Colors.white
        : widget.isDisabled
            ? const Color(0xFFD1D5DB)
            : widget.isToday
                ? AppColors.rausch
                : AppColors.black;

    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: widget.isToday && !widget.isSelected
              ? Border.all(color: AppColors.rausch.withValues(alpha: 0.4), width: 1.5)
              : null,
        ),
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.85, end: 1.0).animate(
            CurvedAnimation(parent: _scaleCtrl, curve: Curves.elasticOut),
          ),
          child: Center(
            child: Text(
              '${widget.day}',
              style: TextStyle(
                fontSize: 14,
                fontWeight: widget.isSelected || widget.isToday
                    ? FontWeight.w700
                    : FontWeight.w500,
                color: textColor,
              ),
            ),
          ),
        ),
      ),
    );
  }
}