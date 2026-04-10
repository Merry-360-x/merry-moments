import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import '../utils/app_snackbar.dart';
import 'admin_dashboard_screen.dart';
import 'admin_post_booking_screen.dart';
import 'affiliates_screen.dart';
import 'become_host_screen.dart';
import 'financial_dashboard_screen.dart';
import 'host_dashboard_screen.dart';
import 'legal_content_screen.dart';
import 'my_bookings_screen.dart';
import 'notifications_screen.dart';
import 'operations_dashboard_screen.dart';
import 'post_booking_center_screen.dart';
import 'profile_details_screen.dart';
import 'support_dashboard_screen.dart';
import 'support_screen.dart';
import 'stories_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.session,
    required this.themeMode,
    required this.onThemeModeChanged,
  });

  final SessionController session;
  final ThemeMode themeMode;
  final ValueChanged<ThemeMode> onThemeModeChanged;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = AppDatabase();
  int? _loyaltyPoints;

  String _themeModeDescription(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'Light mode always on.';
      case ThemeMode.dark:
        return 'Dark mode always on.';
      case ThemeMode.system:
        return 'Follows your device appearance.';
    }
  }

  @override
  void initState() {
    super.initState();
    _loadLoyalty();
  }

  Future<void> _loadLoyalty() async {
    if (!widget.session.isAuthenticated) return;
    final points = await _api.fetchLoyaltyPoints(userId: widget.session.userId);
    if (mounted) setState(() => _loyaltyPoints = points);
  }

  Future<void> _confirmDeleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete account?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await widget.session.deleteAccount();
      if (mounted) {
        AppSnackBar.success(context, 'Your account has been deleted.');
      }
    } catch (_) {
      if (mounted) {
        AppSnackBar.error(
          context,
          'Could not complete account deletion in-app.',
          action: SnackBarAction(label: 'Retry', onPressed: _confirmDeleteAccount),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final profile = session.payload?.profile;
    final fullName = (profile?['full_name'] ?? '').toString();
    final phone = (profile?['phone'] ?? '').toString();
    final bio = (profile?['bio'] ?? '').toString();
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 600;
    final maxWidth = isWide ? 560.0 : double.infinity;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final cardDecoration = BoxDecoration(
      color: isDark ? const Color(0xFF000000) : AppColors.surface,
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: AppColors.border.withValues(alpha: isDark ? 0.86 : 1.0)),
      boxShadow: [
        BoxShadow(
          color: isDark ? Colors.transparent : const Color(0x0C000000),
          blurRadius: 14,
          offset: const Offset(0, 6),
        ),
      ],
    );

    return ListView(
      padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 16, isWide ? 24 : 16, 16),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Profile',
                  style: TextStyle(
                    fontSize: isWide ? 36 : 32,
                    fontWeight: FontWeight.w800,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  session.isAuthenticated
                      ? 'Manage your account and preferences.'
                      : 'Sign in to personalize your experience.',
                  style: const TextStyle(fontSize: 13, color: AppColors.foggy),
                ),
                const SizedBox(height: 14),
                if (session.isAuthenticated)
                  InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => ProfileDetailsScreen(session: session)),
                    ),
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: isDark
                              ? const [Color(0xFF121C2F), Color(0xFF0A111D)]
                              : const [Color(0xFFFFFFFF), Color(0xFFF5F8FF)],
                        ),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppColors.border.withValues(alpha: 0.95)),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: AppColors.surfaceSubtle,
                            child: Text(
                              (fullName.isEmpty ? 'M' : fullName).substring(0, 1).toUpperCase(),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: AppColors.black,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  fullName.isEmpty ? 'Merry360x Member' : fullName,
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  session.userEmail ?? 'Add your details',
                                  style: const TextStyle(color: AppColors.foggy),
                                ),
                                if (phone.isNotEmpty || bio.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    phone.isNotEmpty ? phone : bio,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 13, color: AppColors.foggy),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: AppColors.hackberry),
                        ],
                      ),
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: cardDecoration,
                    child: const Text(
                      'Log in to start planning your next trip.',
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                if (session.isAuthenticated) ...[
                  const SizedBox(height: 10),
                  _ProfileStoriesEntry(
                    session: session,
                    displayName: fullName,
                    avatarUrl: (profile?['avatar_url'] ?? '').toString(),
                  ),
                ],
                if (session.isAuthenticated && _loyaltyPoints != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isDark
                            ? const [Color(0xFF6B1D2E), Color(0xFF3A1B26)]
                            : const [AppColors.rausch, Color(0xFFFF8A70)],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.stars_rounded, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '$_loyaltyPoints loyalty points',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        const Text('Earn more →', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                if (session.isAuthenticated) ...[
                  _QuickAccessSection(session: session),
                  const SizedBox(height: 14),
                ],
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: cardDecoration,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Support & legal', style: TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 10),
                      _ProfileRow(
                        title: 'Support inbox',
                        icon: Icons.headset_mic_outlined,
                        subtitle: 'Tickets, replies, and direct help',
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => SupportScreen(session: session)),
                        ),
                      ),
                      _ProfileRow(
                        title: 'Privacy Policy',
                        icon: Icons.privacy_tip_outlined,
                        subtitle: 'How your data is handled',
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LegalContentScreen(
                              contentType: 'privacy_policy',
                              fallbackTitle: 'Privacy Policy',
                              emptyMessage:
                                  'No privacy policy content has been added yet. Please check back later or contact support@merry360x.com.',
                            ),
                          ),
                        ),
                      ),
                      _ProfileRow(
                        title: 'Terms & Conditions',
                        icon: Icons.gavel_rounded,
                        subtitle: 'Rules, bookings, and platform terms',
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LegalContentScreen(
                              contentType: 'terms_and_conditions',
                              fallbackTitle: 'Terms and Conditions',
                              emptyMessage:
                                  'No terms and conditions have been added yet. Please check back later or contact support@merry360x.com.',
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: cardDecoration,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Appearance', style: TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 10),
                      SegmentedButton<ThemeMode>(
                        segments: const [
                          ButtonSegment<ThemeMode>(
                            value: ThemeMode.light,
                            icon: Icon(Icons.light_mode_outlined),
                            label: Text('Light'),
                          ),
                          ButtonSegment<ThemeMode>(
                            value: ThemeMode.dark,
                            icon: Icon(Icons.dark_mode_outlined),
                            label: Text('Dark'),
                          ),
                          ButtonSegment<ThemeMode>(
                            value: ThemeMode.system,
                            icon: Icon(Icons.brightness_auto_outlined),
                            label: Text('System'),
                          ),
                        ],
                        selected: <ThemeMode>{widget.themeMode},
                        showSelectedIcon: false,
                        style: ButtonStyle(
                          side: WidgetStateProperty.all(
                            const BorderSide(color: AppColors.border),
                          ),
                          backgroundColor:
                              WidgetStateProperty.resolveWith<Color>((states) {
                            if (states.contains(WidgetState.selected)) {
                              return AppColors.rausch.withValues(
                                alpha: isDark ? 0.34 : 0.16,
                              );
                            }
                            return AppColors.surfaceSubtle;
                          }),
                          foregroundColor:
                              WidgetStateProperty.resolveWith<Color>((states) {
                            if (states.contains(WidgetState.selected)) {
                              return AppColors.black;
                            }
                            return AppColors.foggy;
                          }),
                        ),
                        onSelectionChanged: (selection) {
                          if (selection.isEmpty) return;
                          widget.onThemeModeChanged(selection.first);
                        },
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _themeModeDescription(widget.themeMode),
                        style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                      ),
                    ],
                  ),
                ),
                if (session.isAuthenticated) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: cardDecoration,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(
                          height: 46,
                          child: OutlinedButton(
                            onPressed: () => session.signOut(),
                            child: const Text('Sign Out'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: TextButton(
                      onPressed: _confirmDeleteAccount,
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.red,
                      ),
                      child: const Text('Delete Account'),
                    ),
                  ),
                ],
                if (session.error != null) ...[
                  const SizedBox(height: 10),
                  Text(session.error!, style: const TextStyle(color: Colors.red)),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ProfileStoriesEntry extends StatelessWidget {
  const _ProfileStoriesEntry({
    required this.session,
    required this.displayName,
    required this.avatarUrl,
  });

  final SessionController session;
  final String displayName;
  final String avatarUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Social Stories',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 4),
          const Text(
            'Share your moments and see how other travelers are experiencing their trips.',
            style: TextStyle(fontSize: 12, color: AppColors.foggy),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _StoryShortcutCircle(
                label: 'Your story',
                subtitle: displayName.trim().isEmpty ? 'You' : displayName.trim(),
                avatarUrl: avatarUrl,
                showAdd: true,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => StoriesScreen(
                        session: session,
                        openComposerOnStart: true,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: 14),
              _StoryShortcutCircle(
                label: 'Community',
                subtitle: 'View all',
                avatarUrl: '',
                showAdd: false,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => StoriesScreen(session: session)),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StoryShortcutCircle extends StatelessWidget {
  const _StoryShortcutCircle({
    required this.label,
    required this.subtitle,
    required this.avatarUrl,
    required this.showAdd,
    required this.onTap,
  });

  final String label;
  final String subtitle;
  final String avatarUrl;
  final bool showAdd;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fallback = subtitle.trim().isEmpty ? 'S' : subtitle.trim().substring(0, 1).toUpperCase();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 66,
                height: 66,
                padding: const EdgeInsets.all(2.5),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.rausch, width: 2),
                ),
                child: ClipOval(
                  child: avatarUrl.trim().isNotEmpty
                      ? Image.network(
                          avatarUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => _StoryShortcutFallback(fallback: fallback),
                        )
                      : _StoryShortcutFallback(fallback: fallback),
                ),
              ),
              if (showAdd)
                Positioned(
                  bottom: -2,
                  right: -2,
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: AppColors.rausch,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.surface, width: 2),
                    ),
                    child: const Icon(Icons.add, color: Colors.white, size: 12),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _StoryShortcutFallback extends StatelessWidget {
  const _StoryShortcutFallback({required this.fallback});

  final String fallback;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surfaceSubtle,
      alignment: Alignment.center,
      child: Text(
        fallback,
        style: const TextStyle(
          color: AppColors.black,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({required this.title, this.onTap, this.icon, this.subtitle});

  final String title;
  final VoidCallback? onTap;
  final IconData? icon;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.75)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (icon != null) ...[
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Icon(icon, size: 16, color: AppColors.hof),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(subtitle!, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.hackberry, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickAccessSection extends StatelessWidget {
  const _QuickAccessSection({required this.session});

  final SessionController session;

  void _go(BuildContext context, Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    const gap = 10.0;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF000000) : AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border.withValues(alpha: isDark ? 0.86 : 1.0)),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.transparent : const Color(0x0C000000),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 520;
          final columns = isWide ? 3 : 2;
          final tileWidth = (constraints.maxWidth - (gap * (columns - 1))) / columns;
          final showPostBookingConsole =
              session.canManagePostBooking && !session.canAccessOperationsDashboard;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Quick Access', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 4),
              const Text(
                'Manage the parts of your account you use most.',
                style: TextStyle(fontSize: 12, color: AppColors.foggy),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: gap,
                runSpacing: gap,
                children: [
                  _QuickAccessTile(
                    width: tileWidth,
                    title: 'My Bookings',
                    subtitle: 'Manage reservations',
                    icon: Icons.luggage_rounded,
                    accentColor: const Color(0xFF2E7D32),
                    onTap: () => _go(context, MyBookingsScreen(session: session)),
                  ),
                  _QuickAccessTile(
                    width: tileWidth,
                    title: 'Post-Booking',
                    subtitle: 'Charges, changes, disputes',
                    icon: Icons.account_balance_wallet_outlined,
                    accentColor: const Color(0xFFD97706),
                    onTap: () => _go(context, PostBookingCenterScreen(session: session)),
                  ),
                  _QuickAccessTile(
                    width: tileWidth,
                    title: 'Notifications',
                    subtitle: 'Updates and alerts',
                    icon: Icons.notifications_active_outlined,
                    accentColor: const Color(0xFF1565C0),
                    onTap: () => _go(context, NotificationsScreen(session: session)),
                  ),
                  _QuickAccessTile(
                    width: tileWidth,
                    title: 'Affiliate Portal',
                    subtitle: 'Partnership tools',
                    icon: Icons.handshake_outlined,
                    accentColor: const Color(0xFF8E24AA),
                    onTap: () => _go(context, AffiliatesScreen(session: session)),
                  ),
                  if (!session.isHost)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: 'Become a Host',
                      subtitle: 'Start listing spaces',
                      icon: Icons.storefront_outlined,
                      accentColor: const Color(0xFFEF6C00),
                      onTap: () => _go(context, BecomeHostScreen(session: session)),
                    ),
                  if (session.isHost)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: 'Host Dashboard',
                      subtitle: 'Listings and income',
                      icon: Icons.grid_view_rounded,
                      accentColor: const Color(0xFF00897B),
                      onTap: () => _go(context, HostDashboardScreen(session: session)),
                    ),
                  if (session.canAccessAdminDashboard)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: 'Admin Dashboard',
                      subtitle: 'Platform controls',
                      icon: Icons.shield_outlined,
                      accentColor: const Color(0xFF6D4C41),
                      onTap: () => _go(context, AdminDashboardScreen(session: session)),
                    ),
                  if (session.canAccessOperationsDashboard)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: 'Operations Dashboard',
                      subtitle: 'Approvals and publishing',
                      icon: Icons.route_outlined,
                      accentColor: const Color(0xFF7C3AED),
                      onTap: () => _go(context, OperationsDashboardScreen(session: session)),
                    ),
                  if (session.canAccessFinancialDashboard)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: 'Financial Dashboard',
                      subtitle: 'Revenue and payouts',
                      icon: Icons.account_balance_wallet_outlined,
                      accentColor: const Color(0xFF155EEF),
                      onTap: () => _go(context, FinancialDashboardScreen(session: session)),
                    ),
                  if (session.canAccessSupportDashboard)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: 'Support Dashboard',
                      subtitle: 'Tickets and users',
                      icon: Icons.support_agent_outlined,
                      accentColor: const Color(0xFFB26A00),
                      onTap: () => _go(context, SupportDashboardScreen(session: session)),
                    ),
                  if (showPostBookingConsole)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: 'Post-Booking Console',
                      subtitle: 'Admin charge and dispute queue',
                      icon: Icons.gavel_outlined,
                      accentColor: const Color(0xFF92400E),
                      onTap: () => _go(context, AdminPostBookingScreen(session: session)),
                    ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class _QuickAccessTile extends StatelessWidget {
  const _QuickAccessTile({
    required this.width,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
    required this.onTap,
  });

  final double width;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color accentColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tileBackground = isDark ? const Color(0xFF000000) : const Color(0xFFF8F8FA);
    final tileBorder = isDark ? const Color(0xFF2A3342) : const Color(0xFFECECF1);
    final iconBackground = accentColor.withValues(alpha: isDark ? 0.22 : 0.10);
    final iconBorder = accentColor.withValues(alpha: isDark ? 0.45 : 0.20);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: width,
        constraints: const BoxConstraints(minHeight: 112),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: tileBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: tileBorder),
          boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: iconBackground,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: iconBorder),
                  ),
                  child: Icon(icon, color: isDark ? AppColors.black : accentColor, size: 18),
                ),
                const Spacer(),
                const Icon(Icons.arrow_outward_rounded, size: 15, color: AppColors.hackberry),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
                height: 1.15,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppColors.foggy, height: 1.25),
            ),
          ],
        ),
      ),
    );
  }
}