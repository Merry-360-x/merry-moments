import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import '../utils/app_snackbar.dart';
import 'admin_dashboard_screen.dart';
import 'affiliates_screen.dart';
import 'become_host_screen.dart';
import 'financial_dashboard_screen.dart';
import 'host_dashboard_screen.dart';
import 'legal_content_screen.dart';
import 'my_bookings_screen.dart';
import 'notifications_screen.dart';
import 'operations_dashboard_screen.dart';
import 'profile_details_screen.dart';
import 'support_dashboard_screen.dart';
import 'support_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = AppDatabase();
  int? _loyaltyPoints;

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
        title: const Text('Delete Account'),
        content: const Text(
          'This will permanently delete your account and all associated data. '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete My Account'),
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

    return ListView(
      padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 16, isWide ? 24 : 16, 16),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Profile',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF202025)),
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
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFE7E7EC)),
                        boxShadow: const [
                          BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4)),
                        ],
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: const Color(0xFFF1F1F6),
                            child: Text(
                              (fullName.isEmpty ? 'M' : fullName).substring(0, 1).toUpperCase(),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF2A2A30),
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
                                  style: const TextStyle(color: Color(0xFF7B7B86)),
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
                          const Icon(Icons.chevron_right, color: Color(0xFF8A8A95)),
                        ],
                      ),
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE7E7EC)),
                    ),
                    child: const Text(
                      'Log in to start planning your next trip.',
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                if (session.isAuthenticated && _loyaltyPoints != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.rausch, Color(0xFFFF8A70)],
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
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE7E7EC)),
                  ),
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
                if (session.isAuthenticated) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE7E7EC)),
                    ),
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
                  const SizedBox(height: 14),
                  // ── Account Deletion ────────────────────────────────────────
                  // Apple Guideline 5.1.1: users must be able to delete their account
                  // from within the app. This section is intentionally prominent.
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF5F5),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFFFCDD2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.delete_forever_rounded, color: Colors.red, size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Delete Account',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: Colors.red,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Permanently removes your account and all associated data. This cannot be undone.',
                          style: TextStyle(fontSize: 12, color: Color(0xFF9E2A2A), height: 1.4),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: OutlinedButton.icon(
                            onPressed: _confirmDeleteAccount,
                            icon: const Icon(Icons.delete_outline_rounded, size: 18),
                            label: const Text('Delete My Account'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red,
                              side: const BorderSide(color: Colors.red),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ],
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
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (icon != null) ...[
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFFF6F6F8),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFECECF1)),
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
            const Icon(Icons.chevron_right, color: Color(0xFF8A8A95), size: 20),
          ],
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

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7E7EC)),
        boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 520;
          final columns = isWide ? 3 : 2;
          final tileWidth = (constraints.maxWidth - (gap * (columns - 1))) / columns;

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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: width,
        constraints: const BoxConstraints(minHeight: 112),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F8FA),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFECECF1)),
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
                    color: const Color(0xFFF6F6F8),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFECECF1)),
                  ),
                  child: Icon(icon, color: AppColors.hof, size: 18),
                ),
                const Spacer(),
                const Icon(Icons.arrow_outward_rounded, size: 15, color: Color(0xFF9A9AA1)),
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