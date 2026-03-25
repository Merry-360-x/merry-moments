import 'package:flutter/material.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';
import 'package:flutter/services.dart';

import '../../services/app_database.dart';
import '../../session_controller.dart';

class AffiliatesScreen extends StatefulWidget {
  const AffiliatesScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<AffiliatesScreen> createState() => _AffiliatesScreenState();
}

class _AffiliatesScreenState extends State<AffiliatesScreen> {
  final _api = AppDatabase();
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!widget.session.isAuthenticated) return;
    setState(() => _loading = true);
    final d = await _api.fetchAffiliateData(userId: widget.session.userId);
    if (mounted) setState(() { _data = d; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: AppColors.black),
        title: const Text('Affiliate Portal',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined, color: AppColors.foggy), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.rausch))
          : _body(),
    );
  }

  Widget _body() {
    final data = _data ?? {};
    final profile = (data['profile'] as Map?) ?? {};
    final referrals = (data['referrals'] as List?) ?? [];
    final commissions = (data['commissions'] as List?) ?? [];
    final referralCode = (profile['referral_code'] ?? widget.session.userId ?? '').toString();
    final referralLink = 'https://merrymom.app/ref/$referralCode';
    final totalEarnings = commissions.fold<double>(0, (sum, c) => sum + ((c['amount'] ?? 0) as num).toDouble());

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Referral link card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.rausch, Color(0xFFFF8A70)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                Icon(Icons.link, color: Colors.white, size: 18),
                SizedBox(width: 6),
                Text('Your Referral Link', style: TextStyle(color: Colors.white70, fontSize: 12)),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: Text(referralLink,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                      overflow: TextOverflow.ellipsis),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: referralLink));
                    AppSnackBar.success(context, 'Copied!');
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(8)),
                    child: const Text('Copy', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12)),
                  ),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 16),

          // Stats row
          Row(children: [
            _StatCard(label: 'Referrals', value: referrals.length.toString(), icon: Icons.people_outline),
            const SizedBox(width: 10),
            _StatCard(label: 'Commissions', value: commissions.length.toString(), icon: Icons.receipt_long_outlined),
            const SizedBox(width: 10),
            _StatCard(label: 'Total Earned', value: '\$${totalEarnings.toStringAsFixed(0)}', icon: Icons.account_balance_wallet_outlined),
          ]),
          const SizedBox(height: 20),

          // Referrals section
          if (referrals.isNotEmpty) ...[
            const Text('Referrals', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.black)),
            const SizedBox(height: 10),
            ...referrals.map((r) {
              final name = '${r['first_name'] ?? ''} ${r['last_name'] ?? ''}'.trim();
              final date = _formatDate(r['created_at']?.toString() ?? '');
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                    ),
                child: Row(children: [
                  CircleAvatar(radius: 18, backgroundColor: AppColors.linnen,
                      child: Text((name.isEmpty ? 'U' : name[0]).toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.hof, fontSize: 13))),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name.isEmpty ? 'Anonymous User' : name,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black)),
                    Text(date, style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
                  ])),
                  const Icon(Icons.check_circle, color: Color(0xFF4CAF50), size: 18),
                ]),
              );
            }),
            const SizedBox(height: 20),
          ],

          // Commissions section
          const Text('Commission History', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.black)),
          const SizedBox(height: 10),
          if (commissions.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
              child: const Center(child: Text('No commissions yet.\nStart sharing your referral link!',
                  textAlign: TextAlign.center, style: TextStyle(color: AppColors.foggy, fontSize: 13))),
            )
          else
            ...commissions.map((c) {
              final amount = ((c['amount'] ?? 0) as num).toDouble();
              final status = (c['status'] ?? 'pending').toString();
              final date = _formatDate(c['created_at']?.toString() ?? '');
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                    ),
                child: Row(children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.attach_money, color: Color(0xFF4CAF50), size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('\$${amount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.black)),
                    Text(date, style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
                  ])),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: status == 'paid' ? const Color(0xFFE8F5E9) : const Color(0xFFFFF3E0),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(status[0].toUpperCase() + status.substring(1),
                        style: TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w600,
                          color: status == 'paid' ? const Color(0xFF4CAF50) : const Color(0xFFFF9800),
                        )),
                  ),
                ]),
              );
            }),
        ],
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day} ${_month(d.month)} ${d.year}';
    } catch (_) { return ''; }
  }

  String _month(int m) => const ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.icon});
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
            ),
        child: Column(children: [
          Icon(icon, color: AppColors.rausch, size: 20),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.black)),
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.foggy)),
        ]),
      ),
    );
  }
}
