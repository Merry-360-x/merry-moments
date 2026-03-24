import 'package:flutter/material.dart';

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
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFFFCFCFD),
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: const Color(0xFFE7E7EC)),
              boxShadow: const [
                BoxShadow(color: Color(0x14000000), blurRadius: 18, offset: Offset(0, 6)),
              ],
            ),
            padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
            child: Row(
              children: [
                _NavItem(
                  label: 'Home',
                  selected: _tab == 0,
                  onTap: () => _openTab(0),
                  child: const Icon(Icons.home_outlined, size: 22),
                ),
                _NavItem(
                  label: 'Wishlists',
                  selected: _tab == 1,
                  onTap: () => _openTab(1),
                  child: const Icon(Icons.favorite_border, size: 21),
                ),
                _NavItem(
                  label: 'AI',
                  selected: _tab == 2,
                  onTap: () => _openTab(2),
                  child: const Icon(Icons.auto_awesome_outlined, size: 22),
                ),
                _NavItem(
                  label: 'Trips',
                  selected: _tab == 3,
                  onTap: () => _openTab(3),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(Icons.luggage_outlined, size: 22),
                      if (cartCount > 0)
                        Positioned(
                          right: -8,
                          top: -8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2555A),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$cartCount',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                _NavItem(
                  label: 'Profile',
                  selected: _tab == 4,
                  onTap: () => _openTab(4),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(Icons.person_outline, size: 22),
                      if (unreadCount > 0)
                        Positioned(
                          right: -6,
                          top: -6,
                          child: Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2555A),
                              borderRadius: BorderRadius.circular(7),
                            ),
                            child: Center(
                              child: Text(
                                unreadCount > 9 ? '9+' : '$unreadCount',
                                style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700),
                              ),
                            ),
                          ),
                        ),
                    ],
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

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.child,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final color = selected ? const Color(0xFFE2555A) : const Color(0xFF7D7D86);

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          margin: const EdgeInsets.symmetric(horizontal: 1),
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: selected ? const Color(0x1AE2555A) : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconTheme(
                data: IconThemeData(color: color),
                child: DefaultTextStyle.merge(
                  style: TextStyle(color: color),
                  child: child,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


