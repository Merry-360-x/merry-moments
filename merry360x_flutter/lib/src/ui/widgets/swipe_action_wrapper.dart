import 'package:flutter/material.dart';

class SwipeAction {
  final VoidCallback onAction;
  final Color color;
  final IconData icon;
  final String label;
  final bool destructive;
  final DismissDirection direction;

  const SwipeAction({
    required this.onAction,
    required this.color,
    required this.icon,
    this.label = '',
    this.destructive = false,
    this.direction = DismissDirection.endToStart,
  });
}

class SwipeActionWrapper extends StatelessWidget {
  final Widget child;
  final SwipeAction? primaryAction;
  final SwipeAction? secondaryAction;
  final double? borderRadius;
  final EdgeInsetsGeometry? margin;

  const SwipeActionWrapper({
    super.key,
    required this.child,
    this.primaryAction,
    this.secondaryAction,
    this.borderRadius,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final hasPrimary = primaryAction != null;
    final hasSecondary = secondaryAction != null;
    if (!hasPrimary && !hasSecondary) return child;

    final radius = borderRadius ?? 12.0;
    final edgeMargin = margin ?? const EdgeInsets.only(bottom: 8);

    DismissDirection dir;
    if (hasPrimary && hasSecondary) {
      dir = DismissDirection.horizontal;
    } else if (hasPrimary) {
      dir = primaryAction!.direction;
    } else {
      dir = secondaryAction!.direction;
    }

    Widget? background;
    if (hasPrimary) {
      final action = primaryAction!;
      background = Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: edgeMargin,
        decoration: BoxDecoration(
          color: action.color,
          borderRadius: BorderRadius.circular(radius),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (action.label.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  action.label,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            Icon(action.icon, color: Colors.white, size: 22),
          ],
        ),
      );
    }

    Widget? secondaryBackground;
    if (hasSecondary) {
      final action = secondaryAction!;
      secondaryBackground = Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 20),
        margin: edgeMargin,
        decoration: BoxDecoration(
          color: action.color,
          borderRadius: BorderRadius.circular(radius),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(action.icon, color: Colors.white, size: 22),
            if (action.label.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: Text(
                  action.label,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
          ],
        ),
      );
    }

    return Dismissible(
      key: key ?? ValueKey(UniqueKey().toString()),
      direction: dir,
      background: background,
      secondaryBackground: secondaryBackground,
      confirmDismiss: (d) async {
        final action = d == DismissDirection.endToStart ? primaryAction : secondaryAction;
        if (action == null) return false;
        if (action.destructive && context.mounted) {
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Confirm'),
              content: Text('Are you sure you want to ${action.label.toLowerCase()}?'),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                TextButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: Text(action.label, style: TextStyle(color: action.color)),
                ),
              ],
            ),
          );
          return confirmed ?? false;
        }
        return true;
      },
      onDismissed: (_) {
        final action = primaryAction;
        if (action != null) action.onAction();
      },
      child: Stack(
        children: [
          Container(
            margin: edgeMargin,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(radius),
              child: child,
            ),
          ),
          if (hasPrimary)
            Positioned(
              right: 0,
              top: 8,
              bottom: 8,
              child: Container(
                width: 4,
                decoration: BoxDecoration(
                  color: primaryAction!.color.withValues(alpha: 0.5),
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(4),
                    bottomRight: Radius.circular(4),
                  ),
                ),
              ),
            ),
          if (hasSecondary)
            Positioned(
              left: 0,
              top: 8,
              bottom: 8,
              child: Container(
                width: 4,
                decoration: BoxDecoration(
                  color: secondaryAction!.color.withValues(alpha: 0.5),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    bottomLeft: Radius.circular(4),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
