import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app.dart';
import '../../l10n/app_localizations.dart';
import '../session_controller.dart';
import 'screens/ai_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/explore_screen.dart';
import 'screens/messages_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/trip_cart_screen.dart';
import 'screens/wishlists_screen.dart';

// ── Custom nav SVG icons ─────────────────────────────────────────────────────
const _kSvgExplore = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const _kSvgWishlists = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.1111 3C19.6333 3 22 6.3525 22 9.48C22 15.8138 12.1778 21 12 21C11.8222 21 2 15.8138 2 9.48C2 6.3525 4.36667 3 7.88889 3C9.91111 3 11.2333 4.02375 12 4.92375C12.7667 4.02375 14.0889 3 16.1111 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

class MainShell extends StatefulWidget {
  const MainShell({
    super.key,
    required this.session,
    required this.themeMode,
    required this.onThemeModeChanged,
  });

  final SessionController session;
  final ThemeMode themeMode;
  final ValueChanged<ThemeMode> onThemeModeChanged;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tab = 0;
  bool _authSheetOpen = false;

  Future<void> _showAuthSheet({int? requestedTab}) async {
    if (_authSheetOpen) return;
    _authSheetOpen = true;
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final didAuthenticate = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      enableDrag: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0x66000000),
      builder: (context) {
        return FractionallySizedBox(
          heightFactor: isTablet ? 0.9 : 0.92,
          child: AuthScreen(
            session: widget.session,
            asSheet: true,
            onAuthenticated: () => Navigator.of(context).pop(true),
            onBrowseAsGuest: () => Navigator.of(context).pop(false),
          ),
        );
      },
    );
    _authSheetOpen = false;

    if (!mounted) return;
    if (didAuthenticate == true && requestedTab != null && widget.session.isAuthenticated) {
      setState(() {
        _tab = requestedTab;
      });
    }
  }

  void _openTab(int index) {
    final requiresAuth = index >= 1;
    if (requiresAuth && !widget.session.isAuthenticated) {
      _showAuthSheet(requestedTab: index);
      return;
    }
    HapticFeedback.selectionClick();
    setState(() {
      _tab = index;
    });
  }

  Future<void> _openAiSupport() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AiScreen(
          session: widget.session,
          onBack: () => Navigator.of(context).maybePop(),
        ),
      ),
    );
  }

  List<Widget> _buildTabs(SessionController session) => [
    SafeArea(bottom: false, child: ExploreScreen(session: session)),
    SafeArea(bottom: false, child: WishlistsScreen(session: session)),
    SafeArea(bottom: false, child: TripCartScreen(session: session)),
    SafeArea(bottom: false, child: MessagesScreen(session: session)),
    SafeArea(
      bottom: false,
      child: ProfileScreen(
        session: session,
        themeMode: widget.themeMode,
        onThemeModeChanged: widget.onThemeModeChanged,
      ),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final l = AppLocalizations.of(context)!;

    final payload = session.payload;
    final cartCount = payload?.tripCart.length ?? 0;
    final notifications = payload?.notifications ?? const [];
    final unreadCount = notifications.where((n) => n['read'] != true).length;

    final tabs = _buildTabs(session);

    return Scaffold(
      key: ValueKey<ThemeMode>(widget.themeMode),
      body: IndexedStack(
        key: ValueKey<ThemeMode>(widget.themeMode),
        index: _tab,
        children: tabs,
      ),
      floatingActionButton: _AiTripAdvisorButton(onTap: _openAiSupport),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 2),
            child: Row(
              children: [
                _NavItem(
                  svgData: _kSvgExplore,
                  label: l.navExplore,
                  selected: _tab == 0,
                  onTap: () => _openTab(0),
                ),
                _NavItem(
                  svgData: _kSvgWishlists,
                  label: l.navWishlist,
                  selected: _tab == 1,
                  onTap: () => _openTab(1),
                ),
                _NavItem(
                  assetPath: 'assets/nav/tripcart.png',
                  label: l.navTripCart,
                  selected: _tab == 2,
                  onTap: () => _openTab(2),
                  badge: cartCount > 0 ? cartCount : null,
                ),
                _NavItem(
                  assetPath: 'assets/nav/messages.png',
                  label: l.navMessages,
                  selected: _tab == 3,
                  onTap: () => _openTab(3),
                ),
                _NavItem(
                  icon: Icons.person_outline,
                  label: l.navProfile,
                  selected: _tab == 4,
                  onTap: () => _openTab(4),
                  badge: unreadCount > 0 ? unreadCount : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}



// ── Phone bottom nav item ─────────────────────────────────────────────────────
class _NavItem extends StatelessWidget {
  const _NavItem({
    this.icon,
    this.svgData,
    this.assetPath,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge,
  });

  final IconData? icon;
  final String? svgData;
  final String? assetPath;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final int? badge;

  static String _toHex(Color c) =>
      '#${c.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}';

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.rausch : AppColors.foggy;

    final Widget iconWidget = svgData != null
        ? SvgPicture.string(
            svgData!.replaceAll('currentColor', _toHex(color)),
            width: 22,
            height: 22,
          )
        : assetPath != null
            ? ImageIcon(
                AssetImage(assetPath!),
                size: 24,
                color: color,
              )
        : Icon(icon!, size: 24, color: color);

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                iconWidget,
                if (badge != null)
                  Positioned(
                    right: -8,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.rausch,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.white, width: 1.5),
                      ),
                      child: Text(
                        badge! > 9 ? '9+' : '$badge',
                        style: const TextStyle(color: AppColors.white, fontSize: 9, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AiTripAdvisorButton extends StatefulWidget {
  const _AiTripAdvisorButton({required this.onTap});
  final VoidCallback onTap;

  @override
  State<_AiTripAdvisorButton> createState() => _AiTripAdvisorButtonState();
}

class _AiTripAdvisorButtonState extends State<_AiTripAdvisorButton>
    with TickerProviderStateMixin, RouteAware {
  OverlayEntry? _tooltip;
  bool _visible = true;
  late AnimationController _wave1;
  late AnimationController _wave2;
  late AnimationController _wave3;

  @override
  void initState() {
    super.initState();
    _wave1 = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))
      ..repeat();
    _wave2 = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))
      ..repeat();
    _wave3 = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))
      ..repeat();

    // Stagger the three rings
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) _wave2.value = 0.3;
    });
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) _wave3.value = 0.6;
    });

    WidgetsBinding.instance.addPostFrameCallback((_) => _showTooltip());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route != null) {
      appRouteObserver.subscribe(this, route);
    }
  }

  /// A modal/sheet/route was pushed on top — hide the button and tooltip.
  @override
  void didPushNext() {
    _tooltip?.remove();
    _tooltip = null;
    if (mounted) setState(() => _visible = false);
  }

  /// Returned to this route — show the button again.
  @override
  void didPopNext() {
    if (mounted) setState(() => _visible = true);
  }

  void _showTooltip() {
    if (!mounted || !_visible) return;
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
              'Ask our AI ✨',
              style: TextStyle(color: AppColors.black, fontSize: 13, fontWeight: FontWeight.w600),
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
  void dispose() {
    appRouteObserver.unsubscribe(this);
    _wave1.dispose();
    _wave2.dispose();
    _wave3.dispose();
    _tooltip?.remove();
    _tooltip = null;
    super.dispose();
  }

  Widget _ring(AnimationController ctrl, double maxRadius) {
    return AnimatedBuilder(
      animation: ctrl,
      builder: (_, __) {
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
    if (!_visible) return const SizedBox.shrink();
    const double btnSize = 52;
    const double iconSize = 24;
    return GestureDetector(
      onTap: widget.onTap,
      child: SizedBox(
        width: btnSize + 28,
        height: btnSize + 28,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Wave rings
            _ring(_wave1, btnSize * 0.88),
            _ring(_wave2, btnSize * 0.88),
            _ring(_wave3, btnSize * 0.88),
            // Theme-aware pill button
            Container(
              width: btnSize,
              height: btnSize,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Theme.of(context).colorScheme.surface,
                border: Border.all(
                  color: AppColors.rausch.withValues(alpha: 0.35),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.rausch.withValues(alpha: 0.25),
                    blurRadius: 18,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Center(
                child: Icon(Icons.auto_awesome, size: iconSize, color: AppColors.rausch),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


