import 'package:flutter/material.dart';

import '../app.dart';
import '../session_controller.dart';
import 'screens/ai_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/explore_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/trip_cart_screen.dart';
import 'screens/wishlists_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key, required this.session});

  final SessionController session;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tab = 0;
  bool _hasPromptedAuth = false;
  bool _authSheetOpen = false;

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_handleSessionChange);
  }

  @override
  void dispose() {
    widget.session.removeListener(_handleSessionChange);
    super.dispose();
  }

  void _handleSessionChange() {
    if (mounted) {
      setState(() {});
    }
    if (!mounted || _authSheetOpen || _hasPromptedAuth) {
      return;
    }
    _queueAuthSheetIfNeeded();
  }

  void _queueAuthSheetIfNeeded() {
    final session = widget.session;
    if (session.loading || session.isAuthenticated || _authSheetOpen || _hasPromptedAuth) {
      return;
    }
    _hasPromptedAuth = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _showAuthSheet();
    });
  }

  Future<void> _showAuthSheet() async {
    if (_authSheetOpen) return;
    _authSheetOpen = true;
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    await showModalBottomSheet<void>(
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
            onAuthenticated: () => Navigator.of(context).pop(),
            onBrowseAsGuest: () => Navigator.of(context).pop(),
          ),
        );
      },
    );
    _authSheetOpen = false;
  }

  void _openTab(int index) {
    final requiresAuth = index == 1 || index == 3 || index == 4;
    if (requiresAuth && !widget.session.isAuthenticated) {
      _showAuthSheet();
      return;
    }
    setState(() => _tab = index);
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    _queueAuthSheetIfNeeded();

    final payload = session.payload;
    final cartCount = payload?.tripCart.length ?? 0;
    final notifications = payload?.notifications ?? const [];
    final unreadCount = notifications.where((n) => n['read'] != true).length;

    final tabs = [
      ExploreScreen(session: session),
      WishlistsScreen(session: session),
      AiScreen(session: session),
      TripCartScreen(session: session),
      ProfileScreen(session: session),
    ];

    return Scaffold(
      body: SafeArea(bottom: false, child: IndexedStack(index: _tab, children: tabs)),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          border: Border(top: BorderSide(color: Color(0xFFEBEBEB), width: 0.5)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 2),
            child: Row(
              children: [
                _NavItem(
                  icon: Icons.search,
                  label: 'Explore',
                  selected: _tab == 0,
                  onTap: () => _openTab(0),
                ),
                _NavItem(
                  icon: Icons.favorite_border,
                  activeIcon: Icons.favorite,
                  label: 'Wishlists',
                  selected: _tab == 1,
                  onTap: () => _openTab(1),
                ),
                _NavItem(
                  icon: Icons.auto_awesome_outlined,
                  activeIcon: Icons.auto_awesome,
                  label: 'AI',
                  selected: _tab == 2,
                  onTap: () => _openTab(2),
                ),
                _NavItem(
                  icon: Icons.luggage_outlined,
                  activeIcon: Icons.luggage,
                  label: 'Trips',
                  selected: _tab == 3,
                  onTap: () => _openTab(3),
                  badge: cartCount > 0 ? cartCount : null,
                ),
                _NavItem(
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  label: 'Profile',
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

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge,
  });

  final IconData icon;
  final IconData? activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.rausch : AppColors.foggy;
    final displayIcon = selected ? (activeIcon ?? icon) : icon;

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
                Icon(displayIcon, size: 24, color: color),
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


