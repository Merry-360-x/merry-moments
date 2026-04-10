import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app.dart';
import '../session_controller.dart';
import 'screens/ai_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/explore_screen.dart';
import 'screens/messages_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/trip_cart_screen.dart';
import 'screens/wishlists_screen.dart';

// ── Custom nav SVG icons ─────────────────────────────────────────────────────
const _kSvgHome = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10.5651C3 9.9907 3 9.70352 3.07403 9.43905C3.1396 9.20478 3.24737 8.98444 3.39203 8.78886C3.55534 8.56806 3.78202 8.39175 4.23539 8.03912L11.0177 2.764C11.369 2.49075 11.5447 2.35412 11.7387 2.3016C11.9098 2.25526 12.0902 2.25526 12.2613 2.3016C12.4553 2.35412 12.631 2.49075 12.9823 2.764L19.7646 8.03913C20.218 8.39175 20.4447 8.56806 20.608 8.78886C20.7526 8.98444 20.8604 9.20478 20.926 9.43905C21 9.70352 21 9.9907 21 10.5651V17.8C21 18.9201 21 19.4801 20.782 19.908C20.5903 20.2843 20.2843 20.5903 19.908 20.782C19.4802 21 18.9201 21 17.8 21H6.2C5.07989 21 4.51984 21 4.09202 20.782C3.71569 20.5903 3.40973 20.2843 3.21799 19.908C3 19.4801 3 18.9201 3 17.8V10.5651Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
                  svgData: _kSvgHome,
                  label: 'Home',
                  selected: _tab == 0,
                  onTap: () => _openTab(0),
                ),
                _NavItem(
                  svgData: _kSvgWishlists,
                  label: 'Wish list',
                  selected: _tab == 1,
                  onTap: () => _openTab(1),
                ),
                _NavItem(
                  icon: Icons.shopping_bag_outlined,
                  label: 'Trip cart',
                  selected: _tab == 2,
                  onTap: () => _openTab(2),
                  badge: cartCount > 0 ? cartCount : null,
                ),
                _NavItem(
                  icon: Icons.chat_bubble_outline,
                  label: 'Message',
                  selected: _tab == 3,
                  onTap: () => _openTab(3),
                ),
                _NavItem(
                  icon: Icons.person_outline,
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



// ── Phone bottom nav item ─────────────────────────────────────────────────────
class _NavItem extends StatelessWidget {
  const _NavItem({
    this.icon,
    this.svgData,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge,
  });

  final IconData? icon;
  final String? svgData;
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

class _AiTripAdvisorButton extends StatelessWidget {
  const _AiTripAdvisorButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = isDark
        ? const Color(0xFF000000)
        : const Color(0xFF1F262F);
    final borderColor = isDark
        ? const Color(0x59FFFFFF)
        : const Color(0x66FFFFFF);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Ink(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: borderColor, width: 1),
            boxShadow: const [
              BoxShadow(
                color: Color(0x3A000000),
                blurRadius: 12,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: const Center(
            child: Icon(Icons.auto_awesome_rounded, size: 20, color: AppColors.white),
          ),
        ),
      ),
    );
  }
}


