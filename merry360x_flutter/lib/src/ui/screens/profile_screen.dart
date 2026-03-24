import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/mobile_api.dart';
import '../../session_controller.dart';
import 'admin_dashboard_screen.dart';
import 'affiliates_screen.dart';
import 'become_host_screen.dart';
import 'host_dashboard_screen.dart';
import 'my_bookings_screen.dart';
import 'notifications_screen.dart';
import 'support_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = MobileApi();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _bioController = TextEditingController();
  bool _profilePrefilled = false;
  int? _loyaltyPoints;

  @override
  void initState() {
    super.initState();
    _loadLoyalty();
  }

  Future<void> _loadLoyalty() async {
    if (!widget.session.isAuthenticated) return;
    final pts = await _api.fetchLoyaltyPoints(userId: widget.session.userId);
    if (mounted) setState(() => _loyaltyPoints = pts);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    super.dispose();
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Your account has been deleted.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Could not complete account deletion in-app.'),
            action: SnackBarAction(
              label: 'Open Website',
              onPressed: () => _openUrl('https://merry360x.com/profile'),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final profile = session.payload?.profile;
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 600;
    final maxWidth = isWide ? 560.0 : double.infinity;

    if (profile != null && !_profilePrefilled) {
      _nameController.text = (profile['full_name'] ?? '').toString();
      _phoneController.text = (profile['phone'] ?? '').toString();
      _bioController.text = (profile['bio'] ?? '').toString();
      _profilePrefilled = true;
    }

    return ListView(
      padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 16, isWide ? 24 : 16, 120),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Profile', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF202025))),
                const SizedBox(height: 14),
                if (session.isAuthenticated)
                  Container(
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
                            (_nameController.text.isEmpty ? 'M' : _nameController.text).substring(0, 1).toUpperCase(),
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF2A2A30)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _nameController.text.isEmpty ? 'Merry360x Member' : _nameController.text,
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                session.userEmail ?? 'Show profile',
                                style: const TextStyle(color: Color(0xFF7B7B86)),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: Color(0xFF8A8A95)),
                      ],
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
                    child: const Text('Log in to start planning your next trip.', style: TextStyle(fontSize: 16)),
                  ),
                // Loyalty points badge
                if (session.isAuthenticated && _loyaltyPoints != null) ...[  
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFE2555A), Color(0xFFFF8A70)],
                        begin: Alignment.centerLeft, end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(children: [
                      const Icon(Icons.stars_rounded, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Expanded(child: Text('$_loyaltyPoints loyalty points',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14))),
                      const Text('Earn more →', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    ]),
                  ),
                ],

                const SizedBox(height: 14),

                // Quick Access
                if (session.isAuthenticated) ...[  
                  _QuickAccessSection(session: session),
                  const SizedBox(height: 14),
                ],

                // Edit profile
                if (session.isAuthenticated)
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE7E7EC)),
                      boxShadow: const [
                        BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4)),
                      ],
                    ),
                    child: Column(
                      children: [
                        TextField(
                          controller: _nameController,
                          decoration: const InputDecoration(labelText: 'Full name'),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _phoneController,
                          decoration: const InputDecoration(labelText: 'Phone'),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _bioController,
                          maxLines: 3,
                          decoration: const InputDecoration(labelText: 'Bio'),
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: FilledButton(
                            onPressed: session.isAuthenticated
                                ? () async {
                                    await session.upsertProfile(
                                      fullName: _nameController.text,
                                      phone: _phoneController.text,
                                      bio: _bioController.text,
                                    );
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Profile synced to website.')),
                                      );
                                    }
                                  }
                                : null,
                            child: const Text('Save to website'),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 14),

// ── My Bookings (recent) ──
                if (session.isAuthenticated) ...[
                  _BookingsSection(session: session),
                  const SizedBox(height: 14),
                ],

                // Support & legal
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
                        title: 'Help Center',
                        onTap: () => _openUrl('https://merry360x.com/support'),
                      ),
                      _ProfileRow(
                        title: 'Privacy Policy',
                        onTap: () => _openUrl('https://merry360x.com/privacy'),
                      ),
                      _ProfileRow(
                        title: 'Terms & Conditions',
                        onTap: () => _openUrl('https://merry360x.com/terms'),
                      ),
                    ],
                  ),
                ),

                // Sign out & Delete account
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
                        const SizedBox(height: 10),
                        SizedBox(
                          height: 46,
                          child: TextButton(
                            onPressed: _confirmDeleteAccount,
                            style: TextButton.styleFrom(foregroundColor: Colors.red),
                            child: const Text('Delete Account'),
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextButton(
                          onPressed: () => _openUrl('https://merry360x.com/profile'),
                          child: const Text('Delete Account on Website'),
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

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
    }
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({required this.title, this.onTap, this.icon});

  final String title;
  final VoidCallback? onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 18, color: const Color(0xFFE2555A)),
              const SizedBox(width: 8),
            ],
            Expanded(child: Text(title, style: const TextStyle(fontSize: 15))),
            const Icon(Icons.chevron_right, color: Color(0xFF8A8A95), size: 20),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Access section — navigates to all new feature screens
// ─────────────────────────────────────────────────────────────────────────────

class _QuickAccessSection extends StatelessWidget {
  const _QuickAccessSection({required this.session});
  final SessionController session;

  void _go(BuildContext context, Widget screen) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => screen));

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7E7EC)),
        boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Quick Access', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        const SizedBox(height: 8),
        _ProfileRow(
          title: 'My Bookings',
          icon: Icons.receipt_long_outlined,
          onTap: () => _go(context, MyBookingsScreen(session: session)),
        ),
        _ProfileRow(
          title: 'Notifications',
          icon: Icons.notifications_outlined,
          onTap: () => _go(context, NotificationsScreen(session: session)),
        ),
        _ProfileRow(
          title: 'Contact Support',
          icon: Icons.support_agent_outlined,
          onTap: () => _go(context, SupportScreen(session: session)),
        ),
        _ProfileRow(
          title: 'Affiliate Portal',
          icon: Icons.share_outlined,
          onTap: () => _go(context, AffiliatesScreen(session: session)),
        ),
        if (!session.isHost)
          _ProfileRow(
            title: 'Become a Host',
            icon: Icons.home_work_outlined,
            onTap: () => _go(context, BecomeHostScreen(session: session)),
          ),
        if (session.isHost)
          _ProfileRow(
            title: 'Host Dashboard',
            icon: Icons.dashboard_outlined,
            onTap: () => _go(context, HostDashboardScreen(session: session)),
          ),
        if (session.isAdmin || session.isStaff)
          _ProfileRow(
            title: 'Admin Dashboard',
            icon: Icons.admin_panel_settings_outlined,
            onTap: () => _go(context, AdminDashboardScreen(session: session)),
          ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookings section
// ─────────────────────────────────────────────────────────────────────────────

class _BookingsSection extends StatelessWidget {
  const _BookingsSection({required this.session});

  final SessionController session;

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return const Color(0xFF2E7D32);
      case 'cancelled':
      case 'canceled':
        return const Color(0xFFE53935);
      case 'completed':
        return const Color(0xFF1565C0);
      default:
        return const Color(0xFFE65100);
    }
  }

  Color _statusBg(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return const Color(0xFFE8F5E9);
      case 'cancelled':
      case 'canceled':
        return const Color(0xFFFFEBEE);
      case 'completed':
        return const Color(0xFFE3F2FD);
      default:
        return const Color(0xFFFFF3E0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookings = session.payload?.bookings ?? const [];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE7E7EC)),
        boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('My bookings', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
          const SizedBox(height: 10),
          if (bookings.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'No bookings yet. Start exploring and reserve a stay, tour, or transport.',
                style: TextStyle(color: Color(0xFF777780), fontSize: 14),
              ),
            )
          else
            ...bookings.take(5).map((b) {
              final title = (b['title'] ?? b['property_id'] ?? 'Booking').toString();
              final status = (b['status'] ?? 'pending').toString();
              final checkIn = (b['check_in'] ?? '').toString();
              final checkOut = (b['check_out'] ?? '').toString();
              final amount = b['total_amount'];
              final currency = (b['currency'] ?? 'USD').toString();

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFE8E9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.receipt_long_outlined,
                          size: 20, color: Color(0xFFE2555A)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 14)),
                          if (checkIn.isNotEmpty && checkOut.isNotEmpty)
                            Text('$checkIn → $checkOut',
                                style: const TextStyle(
                                    fontSize: 12, color: Color(0xFF717171))),
                          if (amount != null)
                            Text('$currency $amount',
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF222222))),
                        ],
                      ),
                    ),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _statusBg(status),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        status[0].toUpperCase() + status.substring(1),
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _statusColor(status)),
                      ),
                    ),
                  ],
                ),
              );
            }),
          if (bookings.length > 5)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: TextButton(
                onPressed: null,
                child: Text(
                  'View all ${bookings.length} bookings',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
