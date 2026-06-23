import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app.dart';
import '../../l10n/app_localizations.dart';
import '../session_controller.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthChangeEvent;
import 'screens/auth_screen.dart';
import 'screens/explore_screen.dart';
import 'screens/messages_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/trip_cart_screen.dart';
import 'screens/wishlists_screen.dart';
import 'utils/app_snackbar.dart';

// ── Custom nav SVG icons ─────────────────────────────────────────────────────
const _kSvgExplore =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const _kSvgWishlists =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.1111 3C19.6333 3 22 6.3525 22 9.48C22 15.8138 12.1778 21 12 21C11.8222 21 2 15.8138 2 9.48C2 6.3525 4.36667 3 7.88889 3C9.91111 3 11.2333 4.02375 12 4.92375C12.7667 4.02375 14.0889 3 16.1111 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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
  bool _wasAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _wasAuthenticated = widget.session.isAuthenticated;
    widget.session.addListener(_onSessionChanged);
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    if (!mounted) return;
    final isAuth = widget.session.isAuthenticated;
    final event = widget.session.lastAuthEvent;

    // Ignore initial session restore — this fires on startup when Supabase reads
    // the stored session from secure storage.  It is not a user-initiated sign-in
    // so we must not show a welcome toast or leave the auth sheet open.
    final isSessionRestore = event == AuthChangeEvent.initialSession;

    if (!_wasAuthenticated && isAuth && isSessionRestore) {
      // Session restored from storage — dismiss any open modal (likely auth sheet)
      // opened before the session finished loading from secure storage.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        // Close any modal route (auth sheet from Profile or MainShell)
        final navigator = Navigator.of(context, rootNavigator: false);
        if (navigator.canPop()) {
          navigator.pop();
        }
        _authSheetOpen = false;
      });
    } else if (!_wasAuthenticated && isAuth && !_authSheetOpen) {
      // Actual user sign-in (not session restore) from outside MainShell's auth sheet.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final profile = widget.session.payload?.profile;
        final name = (profile?['full_name'] ?? profile?['nickname'] ?? '')
            .toString()
            .trim();
        AppSnackBar.success(
          context,
          name.isNotEmpty ? 'Welcome, $name! 👋' : 'Signed in successfully',
        );
      });
    } else if (_wasAuthenticated && !isAuth) {
      // Signed out — navigate to Explore and show toast.
      // Use addPostFrameCallback to avoid calling setState during a build/notify cycle.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() => _tab = 0);
        AppSnackBar.info(context, 'Signed out successfully');
      });
    }
    _wasAuthenticated = isAuth;
  }

  Future<void> _showAuthSheet({int? requestedTab}) async {
    if (_authSheetOpen) return;
    // Once the user has authenticated at any point, never pop the auth sheet
    // unprompted — only show it if they have never signed in before.
    if (widget.session.hasEverAuthenticated) return;
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

    if (didAuthenticate == true) {
      // Trust onAuthenticated — auth state may still be propagating asyncly.
      // Navigate to the requested tab (default to Explore) and show welcome toast.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (requestedTab != null) {
          setState(() => _tab = requestedTab);
        }
        // Wait a tick for the session payload to arrive before reading the name.
        Future.microtask(() {
          if (!mounted) return;
          final profile = widget.session.payload?.profile;
          final name = (profile?['full_name'] ?? profile?['nickname'] ?? '')
              .toString()
              .trim();
          AppSnackBar.success(
            context,
            name.isNotEmpty ? 'Welcome, $name! 👋' : 'Signed in successfully',
          );
        });
      });
      return;
    }

    if (didAuthenticate == false) {
      // User chose "Continue as guest" — collect their basic info.
      await _showGuestInfoSheet();
      return;
    }
  }

  Future<void> _showGuestInfoSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      enableDrag: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0x66000000),
      builder: (_) => _GuestInfoSheet(session: widget.session),
    );
  }

  void _openTab(int index) {
    // Profile tab (index 4) is accessible without auth — shows sign-in prompt inline.
    // Wishlists (1), Cart (2), Messages (3) require authentication.
    final requiresAuth = index == 3; // Only Messages requires auth
    if (requiresAuth && !widget.session.isAuthenticated) {
      _showAuthSheet(requestedTab: index);
      return;
    }
    HapticFeedback.selectionClick();
    setState(() {
      _tab = index;
    });
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
        ? ImageIcon(AssetImage(assetPath!), size: 24, color: color)
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
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.rausch,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.white, width: 1.5),
                      ),
                      child: Text(
                        badge! > 9 ? '9+' : '$badge',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
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

// ── Guest info collection sheet ───────────────────────────────────────────────

class _GuestInfoSheet extends StatefulWidget {
  const _GuestInfoSheet({required this.session});
  final SessionController session;

  @override
  State<_GuestInfoSheet> createState() => _GuestInfoSheetState();
}

class _GuestInfoSheetState extends State<_GuestInfoSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    widget.session.setGuestInfo(
      name: _nameCtrl.text.trim(),
      email: _emailCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
    );
    if (mounted) {
      Navigator.of(context).pop();
      AppSnackBar.success(
        context,
        'Welcome, ${_nameCtrl.text.trim()}! Browsing as guest 👋',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final label = isDark ? const Color(0xFFEBEBF5) : const Color(0xFF1A1A1A);
    final hint = isDark ? const Color(0xFF8E8E93) : const Color(0xFF9CA3AF);
    final border = isDark ? const Color(0xFF38383A) : const Color(0xFFE5E7EB);

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: Form(
            key: _formKey,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: hint,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Continue as guest',
                    style: TextStyle(
                      color: label,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Share your contact details so hosts can reach you.',
                    style: TextStyle(color: hint, fontSize: 14),
                  ),
                  const SizedBox(height: 20),
                  _buildField(
                    controller: _nameCtrl,
                    label: 'Full name',
                    hint: 'e.g. Jane Doe',
                    icon: Icons.person_outline,
                    isDark: isDark,
                    border: border,
                    labelColor: label,
                    hintColor: hint,
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Please enter your name'
                        : null,
                  ),
                  const SizedBox(height: 14),
                  _buildField(
                    controller: _emailCtrl,
                    label: 'Email',
                    hint: 'e.g. jane@example.com',
                    icon: Icons.mail_outline,
                    keyboardType: TextInputType.emailAddress,
                    isDark: isDark,
                    border: border,
                    labelColor: label,
                    hintColor: hint,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty)
                        return 'Please enter your email';
                      if (!v.contains('@') || !v.contains('.'))
                        return 'Enter a valid email';
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),
                  _buildField(
                    controller: _phoneCtrl,
                    label: 'Phone number',
                    hint: 'e.g. +250 788 000 000',
                    icon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                    isDark: isDark,
                    border: border,
                    labelColor: label,
                    hintColor: hint,
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Please enter your phone number'
                        : null,
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      onPressed: _saving ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.rausch,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        textStyle: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Continue'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        'Skip for now',
                        style: TextStyle(color: hint, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    required bool isDark,
    required Color border,
    required Color labelColor,
    required Color hintColor,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: labelColor,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          style: TextStyle(color: labelColor, fontSize: 15),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: hintColor, fontSize: 15),
            prefixIcon: Icon(icon, color: hintColor, size: 20),
            filled: true,
            fillColor: isDark
                ? const Color(0xFF2C2C2E)
                : const Color(0xFFF9FAFB),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.rausch, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
