import 'package:flutter/material.dart';

import '../session_controller.dart';
import 'screens/ai_screen.dart';
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

  @override
  Widget build(BuildContext context) {
    final payload = widget.session.payload;
    final cartCount = payload?.tripCart.length ?? 0;

    final tabs = [
      ExploreScreen(session: widget.session),
      WishlistsScreen(session: widget.session),
      const AiScreen(),
      TripCartScreen(session: widget.session),
      ProfileScreen(session: widget.session),
    ];

    return Scaffold(
      body: SafeArea(bottom: false, child: IndexedStack(index: _tab, children: tabs)),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFE8E8ED)),
              boxShadow: const [
                BoxShadow(color: Color(0x1F000000), blurRadius: 20, offset: Offset(0, 8)),
              ],
            ),
            padding: const EdgeInsets.fromLTRB(4, 6, 4, 6),
            child: Row(
              children: [
                _NavItem(
                  label: 'Explore',
                  selected: _tab == 0,
                  onTap: () => setState(() => _tab = 0),
                  child: const _AssetNavIcon(path: 'assets/nav/explore.png'),
                ),
                _NavItem(
                  label: 'Wishlists',
                  selected: _tab == 1,
                  onTap: () => setState(() => _tab = 1),
                  child: const Icon(Icons.favorite_border, size: 21),
                ),
                _NavItem(
                  label: 'AI',
                  selected: _tab == 2,
                  onTap: () => setState(() => _tab = 2),
                  child: const _AssetNavIcon(path: 'assets/nav/ai.png'),
                ),
                _NavItem(
                  label: 'Trip cart',
                  selected: _tab == 3,
                  onTap: () => setState(() => _tab = 3),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const _AssetNavIcon(path: 'assets/nav/tripcart.png'),
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
                  onTap: () => setState(() => _tab = 4),
                  child: const _AssetNavIcon(path: 'assets/nav/profile.png'),
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
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: selected ? const Color(0x1AE2555A) : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
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
                  fontSize: 10,
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

class _AssetNavIcon extends StatelessWidget {
  const _AssetNavIcon({required this.path});

  final String path;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 21,
      height: 21,
      child: Image.asset(path, fit: BoxFit.contain),
    );
  }
}
