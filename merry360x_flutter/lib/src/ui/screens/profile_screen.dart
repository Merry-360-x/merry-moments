import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../services/push_notification_service.dart';
import '../../session_controller.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/app_snackbar.dart';
import 'admin_dashboard_screen.dart';
import 'admin_post_booking_screen.dart';
import 'affiliates_screen.dart';
import 'auth_screen.dart';
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
import '../../../l10n/app_localizations.dart';

// ── Language & Currency data ──

const _languages = [
  ('en', 'English'),
  ('rw', 'Kinyarwanda'),
  ('fr', 'Français'),
  ('sw', 'Kiswahili'),
  ('zh', '中文'),
];

const _currencies = [
  ('RWF', 'FRw', 'Rwandan Franc'),
  ('USD', '\$', 'US Dollar'),
  ('EUR', '€', 'Euro'),
  ('GBP', '£', 'British Pound'),
  ('TZS', 'TSh', 'Tanzanian Shilling'),
  ('KES', 'KSh', 'Kenyan Shilling'),
  ('UGX', 'USh', 'Ugandan Shilling'),
  ('ZMW', 'ZK', 'Zambian Kwacha'),
  ('BIF', 'FBu', 'Burundian Franc'),
  ('ZAR', 'R', 'South African Rand'),
  ('CNY', '¥', 'Chinese Yuan'),
];

String _currencySymbol(String code) {
  for (final c in _currencies) {
    if (c.$1 == code) return c.$2;
  }
  return code;
}

String _languageLabel(String code) {
  for (final l in _languages) {
    if (l.$1 == code) return l.$2;
  }
  return code.toUpperCase();
}

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

  @override
  void initState() {
    super.initState();
    _loadLoyalty();
    widget.session.addListener(_onSessionChanged);
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadLoyalty() async {
    if (!widget.session.isAuthenticated) return;
    final points = await _api.fetchLoyaltyPoints(userId: widget.session.userId);
    if (mounted) setState(() => _loyaltyPoints = points);
  }

  void _pickLanguage() {
    final l = AppLocalizations.of(context)!;
    final sessionCtrl = widget.session;
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _PickerSheet(
        title: l.language,
        items: _languages.map((lang) => (lang.$1, lang.$2, lang.$1 == sessionCtrl.language)).toList(),
        onSelect: (code) async {
          await sessionCtrl.setLanguage(code);
          if (mounted) AppSnackBar.success(context, l.languageUpdated);
        },
      ),
    );
  }

  void _pickCurrency() {
    final l = AppLocalizations.of(context)!;
    final sessionCtrl = widget.session;
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _PickerSheet(
        title: l.currency,
        items: _currencies
            .map((c) => (c.$1, '(${c.$2}) ${c.$1}  —  ${c.$3}', c.$1 == sessionCtrl.currency))
            .toList(),
        onSelect: (code) async {
          await sessionCtrl.setCurrency(code);
          if (mounted) AppSnackBar.success(context, l.currencyUpdated);
        },
      ),
    );
  }

  Future<void> _confirmDeleteAccount() async {
    final l = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.deleteAccountTitle),
        content: Text(l.deleteAccountBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l.delete),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await widget.session.deleteAccount();
      if (mounted) {
        AppSnackBar.success(context, l.accountDeleted);
      }
    } catch (_) {
      if (mounted) {
        AppSnackBar.error(
          context,
          l.accountDeleteFailed,
          action: SnackBarAction(label: l.retry, onPressed: _confirmDeleteAccount),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
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
      color: isDark ? const Color(0xFF2C2C2E) : AppColors.surface,
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: AppColors.border),
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
                  l.profile,
                  style: TextStyle(
                    fontSize: isWide ? 36 : 32,
                    fontWeight: FontWeight.w800,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  session.isAuthenticated
                      ? l.manageAccount
                      : l.signInToPersonalize,
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
                                  fullName.isEmpty ? l.merry360xMember : fullName,
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  session.userEmail ?? l.addYourDetails,
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
                else if (!session.hasEverAuthenticated)
                  // Unauthenticated first-time user — show sign-in card
                  GestureDetector(
                    onTap: () async {
                      final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
                      await showModalBottomSheet<void>(
                        context: context,
                        isScrollControlled: true,
                        enableDrag: true,
                        useSafeArea: true,
                        backgroundColor: Colors.transparent,
                        barrierColor: const Color(0x66000000),
                        builder: (_) => FractionallySizedBox(
                          heightFactor: isTablet ? 0.9 : 0.92,
                          child: AuthScreen(
                            session: session,
                            asSheet: true,
                            onAuthenticated: () => Navigator.of(context).maybePop(),
                            onBrowseAsGuest: () => Navigator.of(context).maybePop(),
                          ),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
                      decoration: cardDecoration,
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.rausch.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.person_outline_rounded, color: AppColors.rausch, size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l.loginToPlan,
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  l.signInToPersonalize,
                                  style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, color: AppColors.foggy),
                        ],
                      ),
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
                      color: isDark ? const Color(0xFF2C2C2E) : AppColors.rausch,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.stars_rounded,
                          color: isDark ? AppColors.rausch : Colors.white,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '$_loyaltyPoints loyalty points',
                            style: TextStyle(
                              color: isDark ? const Color(0xFFFFFFFF) : Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        Text(
                          l.earnMore,
                          style: TextStyle(
                            color: isDark ? const Color(0xFF8E8E93) : Colors.white70,
                            fontSize: 12,
                          ),
                        ),
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
                      Text(l.supportAndLegal, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 10),
                      _ProfileRow(
                        title: l.supportInbox,
                        icon: Icons.headset_mic_outlined,
                        subtitle: l.ticketsAndHelp,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => SupportScreen(session: session)),
                        ),
                      ),
                      _ProfileRow(
                        title: l.privacyPolicy,
                        icon: Icons.privacy_tip_outlined,
                        subtitle: l.howDataHandled,
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
                        title: l.termsAndConditions,
                        icon: Icons.gavel_rounded,
                        subtitle: l.rulesAndTerms,
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
                  padding: const EdgeInsets.all(16),
                  decoration: cardDecoration,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF0F0F5),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              Icons.palette_outlined,
                              size: 20,
                              color: isDark ? Colors.white70 : Colors.black54,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            l.appearance,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          _ThemeModeCard(
                            icon: Icons.light_mode_rounded,
                            label: l.lightMode,
                            isSelected: widget.themeMode == ThemeMode.light,
                            isDark: isDark,
                            onTap: () => widget.onThemeModeChanged(ThemeMode.light),
                          ),
                          const SizedBox(width: 10),
                          _ThemeModeCard(
                            icon: Icons.dark_mode_rounded,
                            label: l.darkMode,
                            isSelected: widget.themeMode == ThemeMode.dark,
                            isDark: isDark,
                            onTap: () => widget.onThemeModeChanged(ThemeMode.dark),
                          ),
                          const SizedBox(width: 10),
                          _ThemeModeCard(
                            icon: Icons.brightness_auto_rounded,
                            label: l.systemMode,
                            isSelected: widget.themeMode == ThemeMode.system,
                            isDark: isDark,
                            onTap: () => widget.onThemeModeChanged(ThemeMode.system),
                          ),
                        ],
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
                      Text(l.notificationSettings, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      _NotificationSettingsTile(session: session),
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
                      Text(l.languageAndCurrency, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      _PreferenceTile(
                        icon: Icons.language_rounded,
                        label: l.language,
                        value: _languageLabel(session.language),
                        tag: session.language.toUpperCase(),
                        onTap: _pickLanguage,
                      ),
                      const Divider(height: 1, indent: 56),
                      _PreferenceTile(
                        icon: Icons.currency_exchange_rounded,
                        label: l.currency,
                        value: '${_currencySymbol(session.currency)}  ${session.currency}',
                        tag: session.currency,
                        onTap: _pickCurrency,
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
                            child: Text(l.signOut),
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
                      child: Text(l.deleteAccount),
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

class _ThemeModeCard extends StatelessWidget {
  const _ThemeModeCard({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selectedBg = isDark ? const Color(0xFF2C2C2E) : AppColors.rausch.withValues(alpha: 0.12);
    final unselectedBg = isDark ? const Color(0xFF3A3A3C) : const Color(0xFFF5F5F7);
    final selectedBorder = AppColors.rausch;
    final unselectedBorder = isDark ? const Color(0xFF38383A) : const Color(0xFFE0E0E0);
    final selectedIcon = AppColors.rausch;
    final unselectedIcon = isDark ? const Color(0xFF8E8E93) : Colors.black45;
    final selectedText = isDark ? const Color(0xFFFFFFFF) : Colors.black87;
    final unselectedText = isDark ? const Color(0xFF8E8E93) : Colors.black54;

    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: isSelected ? selectedBg : unselectedBg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? selectedBorder : unselectedBorder,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 24,
                color: isSelected ? selectedIcon : unselectedIcon,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  color: isSelected ? selectedText : unselectedText,
                ),
              ),
            ],
          ),
        ),
      ),
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
    final l = AppLocalizations.of(context)!;
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
          Text(
            l.socialStories,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 4),
          Text(
            l.storiesDesc,
            style: const TextStyle(fontSize: 12, color: AppColors.foggy),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _StoryShortcutCircle(
                label: l.yourStoryLabel,
                subtitle: displayName.trim().isEmpty ? 'You' : displayName.trim(),
                avatarUrl: avatarUrl,
                showAdd: true,
                onTap: () {
                  showStoriesPopup(
                    context,
                    session: session,
                    openMyStoryOnStart: true,
                  );
                },
                onAddTap: () {
                  showStoriesPopup(
                    context,
                    session: session,
                    openComposerOnStart: true,
                  );
                },
              ),
              const SizedBox(width: 14),
              _StoryShortcutCircle(
                label: l.community,
                subtitle: l.viewAll,
                avatarUrl: '',
                showAdd: false,
                onTap: () {
                  showStoriesPopup(
                    context,
                    session: session,
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
    this.onAddTap,
  });

  final String label;
  final String subtitle;
  final String avatarUrl;
  final bool showAdd;
  final VoidCallback onTap;
  final VoidCallback? onAddTap;

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
                  child: GestureDetector(
                    onTap: onAddTap ?? onTap,
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
    final l = AppLocalizations.of(context)!;
    const gap = 10.0;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2C2C2E) : AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
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
              Text(l.quickAccess, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 4),
              Text(
                l.manageQuickAccess,
                style: const TextStyle(fontSize: 12, color: AppColors.foggy),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: gap,
                runSpacing: gap,
                children: [
                  _QuickAccessTile(
                    width: tileWidth,
                    title: l.myBookings,
                    subtitle: l.manageReservations,
                    icon: Icons.luggage_rounded,
                    accentColor: const Color(0xFF2E7D32),
                    onTap: () => _go(context, MyBookingsScreen(session: session)),
                  ),
                  _QuickAccessTile(
                    width: tileWidth,
                    title: l.postBooking,
                    subtitle: l.postBookingDesc,
                    icon: Icons.account_balance_wallet_outlined,
                    accentColor: const Color(0xFFD97706),
                    onTap: () => _go(context, PostBookingCenterScreen(session: session)),
                  ),
                  _QuickAccessTile(
                    width: tileWidth,
                    title: l.notifications,
                    subtitle: l.notificationsDesc,
                    icon: Icons.notifications_active_outlined,
                    accentColor: const Color(0xFF1565C0),
                    onTap: () => _go(context, NotificationsScreen(session: session)),
                  ),
                  _QuickAccessTile(
                    width: tileWidth,
                    title: l.affiliatePortal,
                    subtitle: l.affiliateDesc,
                    icon: Icons.handshake_outlined,
                    accentColor: const Color(0xFF8E24AA),
                    onTap: () => _go(context, AffiliatesScreen(session: session)),
                  ),
                  if (!session.isHost)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: l.becomeHost,
                      subtitle: l.becomeHostDesc,
                      icon: Icons.storefront_outlined,
                      accentColor: const Color(0xFFEF6C00),
                      onTap: () => _go(context, BecomeHostScreen(session: session)),
                    ),
                  if (session.isHost)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: l.hostDashboard,
                      subtitle: l.hostDashboardDesc,
                      icon: Icons.grid_view_rounded,
                      accentColor: const Color(0xFF00897B),
                      onTap: () => _go(context, HostDashboardScreen(session: session)),
                    ),
                  if (session.canAccessAdminDashboard)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: l.adminDashboard,
                      subtitle: l.adminDashboardDesc,
                      icon: Icons.shield_outlined,
                      accentColor: const Color(0xFF6D4C41),
                      onTap: () => _go(context, AdminDashboardScreen(session: session)),
                    ),
                  if (session.canAccessOperationsDashboard)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: l.operationsDashboard,
                      subtitle: l.operationsDashboardDesc,
                      icon: Icons.route_outlined,
                      accentColor: const Color(0xFF7C3AED),
                      onTap: () => _go(context, OperationsDashboardScreen(session: session)),
                    ),
                  if (session.canAccessFinancialDashboard)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: l.financialDashboard,
                      subtitle: l.financialDashboardDesc,
                      icon: Icons.account_balance_wallet_outlined,
                      accentColor: const Color(0xFF155EEF),
                      onTap: () => _go(context, FinancialDashboardScreen(session: session)),
                    ),
                  if (session.canAccessSupportDashboard)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: l.supportDashboard,
                      subtitle: l.supportDashboardDesc,
                      icon: Icons.support_agent_outlined,
                      accentColor: const Color(0xFFB26A00),
                      onTap: () => _go(context, SupportDashboardScreen(session: session)),
                    ),
                  if (showPostBookingConsole)
                    _QuickAccessTile(
                      width: tileWidth,
                      title: l.postBookingConsole,
                      subtitle: l.postBookingConsoleDesc,
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
    final tileBackground = isDark ? const Color(0xFF3A3A3C) : const Color(0xFFF8F8FA);
    final tileBorder = isDark ? const Color(0xFF38383A) : const Color(0xFFECECF1);
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

// ── Shared preference tile ──

class _PreferenceTile extends StatelessWidget {
  const _PreferenceTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.tag,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final String tag;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Icon(icon, size: 22, color: AppColors.rausch),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.foggy, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 2),
                  Text(value,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.black)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.rausch.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(tag,
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.rausch,
                      letterSpacing: 0.4)),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right, size: 18, color: AppColors.foggy),
          ],
        ),
      ),
    );
  }
}

// ── Notification Settings Tile ──

class _NotificationSettingsTile extends StatefulWidget {
  const _NotificationSettingsTile({required this.session});
  final SessionController session;

  @override
  State<_NotificationSettingsTile> createState() => _NotificationSettingsTileState();
}

class _NotificationSettingsTileState extends State<_NotificationSettingsTile> {
  bool _pushEnabled = true;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPushStatus();
  }

  Future<void> _loadPushStatus() async {
    if (!widget.session.isAuthenticated) {
      setState(() {
        _pushEnabled = true;
        _loading = false;
      });
      return;
    }
    try {
      final supabase = Supabase.instance.client;
      final userId = widget.session.userId;
      final data = await supabase
          .from('mobile_push_tokens')
          .select('is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1);
      setState(() {
        _pushEnabled = (data as List).isNotEmpty;
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _pushEnabled = true;
        _loading = false;
      });
    }
  }

  Future<void> _togglePush(bool value) async {
    if (!widget.session.isAuthenticated) return;
    setState(() => _loading = true);
    try {
      final pushNotifications = PushNotificationService.instance;
      final userId = widget.session.userId;
      if (value) {
        // Re-register token
        await pushNotifications.syncForUser(userId);
      } else {
        // Deactivate tokens
        await pushNotifications.deactivateForUser(userId);
      }
      if (mounted) {
        setState(() {
          _pushEnabled = value;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        _SettingsRow(
          title: l.pushNotifications,
          subtitle: l.pushNotificationsDesc,
          icon: Icons.notifications_active_outlined,
          trailing: Switch(
            value: _pushEnabled,
            onChanged: _loading ? null : _togglePush,
            activeColor: AppColors.rausch,
          ),
        ),
        if (widget.session.isAuthenticated) ...[
          const Divider(height: 1, indent: 56),
          _SettingsRow(
            title: l.inAppNotifications,
            subtitle: l.inAppNotificationsDesc,
            icon: Icons.mail_outline,
            trailing: const Icon(Icons.chevron_right, color: AppColors.foggy, size: 18),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => NotificationsScreen(session: widget.session)),
            ),
          ),
        ],
      ],
    );
  }
}

// ── Settings Row Helper ──
class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.title,
    required this.subtitle,
    required this.icon,
    this.trailing,
    this.onTap,
  });
  final String title;
  final String subtitle;
  final IconData icon;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Icon(icon, size: 22, color: AppColors.rausch),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.black)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                ],
              ),
            ),
            if (trailing != null) trailing!,
            if (trailing == null && onTap != null)
              const Icon(Icons.chevron_right, size: 18, color: AppColors.foggy),
          ],
        ),
      ),
    );
  }
}

// ── Bottom-sheet picker ──

class _PickerSheet extends StatelessWidget {
  const _PickerSheet({
    required this.title,
    required this.items,
    required this.onSelect,
  });

  final String title;
  final List<(String code, String label, bool selected)> items;
  final Future<void> Function(String code) onSelect;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Text(title,
                style: const TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.black)),
          ),
          const Divider(height: 1),
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: items.length,
              itemBuilder: (_, i) {
                final (code, label, selected) = items[i];
                return ListTile(
                  title: Text(label,
                      style: TextStyle(
                          fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                          color: selected ? AppColors.rausch : AppColors.black)),
                  trailing: selected
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.rausch, size: 20)
                      : null,
                  onTap: () async {
                    Navigator.of(context).pop();
                    await onSelect(code);
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}