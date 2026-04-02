import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../app.dart';
import '../../session_controller.dart';
import '../utils/app_snackbar.dart';

class PostBookingCenterScreen extends StatefulWidget {
  const PostBookingCenterScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<PostBookingCenterScreen> createState() => _PostBookingCenterScreenState();
}

class _PostBookingCenterScreenState extends State<PostBookingCenterScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  bool _loading = true;
  bool _refreshing = false;

  List<Map<String, dynamic>> _charges = const [];
  List<Map<String, dynamic>> _modifications = const [];
  List<Map<String, dynamic>> _disputes = const [];
  Map<String, dynamic>? _walletAccount;
  List<Map<String, dynamic>> _walletTransactions = const [];

  bool _walletConsent = false;
  String _walletCurrency = 'USD';
  bool _savingWallet = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
    _loadOverview();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadOverview({bool showSpinner = true}) async {
    if (!widget.session.isAuthenticated) {
      if (mounted) {
        setState(() {
          _loading = false;
          _refreshing = false;
          _charges = const [];
          _modifications = const [];
          _disputes = const [];
          _walletAccount = null;
          _walletTransactions = const [];
        });
      }
      return;
    }

    if (mounted) {
      setState(() {
        if (showSpinner) _loading = true;
        _refreshing = true;
      });
    }

    try {
      final data = await widget.session.fetchUserPostBookingOverview();
      if (!mounted) return;

      final wallet = _asMap(data['wallet_account']);
      setState(() {
        _charges = _asMapList(data['charges']);
        _modifications = _asMapList(data['booking_modifications']);
        _disputes = _asMapList(data['disputes']);
        _walletAccount = wallet;
        _walletTransactions = _asMapList(data['wallet_transactions']);
        _walletConsent = (wallet?['auto_charge_consent'] == true);
        _walletCurrency = (wallet?['currency'] ?? 'USD').toString();
      });
    } catch (error) {
      if (mounted) {
        AppSnackBar.error(context, _cleanError(error));
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _refreshing = false;
        });
      }
    }
  }

  Future<void> _respondModification(String modificationId, String decision) async {
    try {
      await widget.session.postBookingAction(
        'respond-modification',
        body: {
          'booking_modification_id': modificationId,
          'decision': decision,
        },
      );
      if (!mounted) return;
      AppSnackBar.success(context, 'Response submitted.');
      await _loadOverview(showSpinner: false);
    } catch (error) {
      if (mounted) {
        AppSnackBar.error(context, _cleanError(error));
      }
    }
  }

  Future<void> _openDispute({String? chargeId, String? modificationId}) async {
    final reasonCtrl = TextEditingController();
    final detailsCtrl = TextEditingController();
    bool submitting = false;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Open dispute'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: reasonCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Reason',
                        hintText: 'Explain what is incorrect',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: detailsCtrl,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Details',
                        hintText: 'Share context and evidence summary',
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: submitting ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          final reason = reasonCtrl.text.trim();
                          if (reason.isEmpty) {
                            AppSnackBar.error(context, 'Reason is required.');
                            return;
                          }

                          setLocal(() => submitting = true);
                          try {
                            await widget.session.postBookingAction(
                              'open-dispute',
                              body: {
                                'charge_id': chargeId,
                                'booking_modification_id': modificationId,
                                'reason': reason,
                                'details': detailsCtrl.text.trim(),
                              },
                            );
                            if (!mounted) return;
                            Navigator.pop(context);
                            AppSnackBar.success(this.context, 'Dispute opened.');
                            await _loadOverview(showSpinner: false);
                          } catch (error) {
                            if (mounted) {
                              AppSnackBar.error(this.context, _cleanError(error));
                            }
                            setLocal(() => submitting = false);
                          }
                        },
                  child: Text(submitting ? 'Submitting...' : 'Submit'),
                ),
              ],
            );
          },
        );
      },
    );

    reasonCtrl.dispose();
    detailsCtrl.dispose();
  }

  Future<void> _saveWalletSettings() async {
    setState(() => _savingWallet = true);
    try {
      await widget.session.postBookingAction(
        'set-auto-charge-consent',
        body: {
          'auto_charge_consent': _walletConsent,
          'currency': _walletCurrency,
        },
      );
      if (!mounted) return;
      AppSnackBar.success(context, 'Wallet settings updated.');
      await _loadOverview(showSpinner: false);
    } catch (error) {
      if (mounted) {
        AppSnackBar.error(context, _cleanError(error));
      }
    } finally {
      if (mounted) {
        setState(() => _savingWallet = false);
      }
    }
  }

  Future<void> _showPayChargeSheet(Map<String, dynamic> charge) async {
    final phoneCtrl = TextEditingController();
    String method = 'wallet';
    String provider = 'MTN';
    bool processing = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            final amount = _num(charge['amount']);
            final currency = (charge['currency'] ?? 'USD').toString();

            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Pay charge',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.black,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _money(amount, currency),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.rausch,
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Payment method',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      value: method,
                      decoration: const InputDecoration(),
                      items: const [
                        DropdownMenuItem(value: 'wallet', child: Text('Wallet')),
                        DropdownMenuItem(value: 'card', child: Text('Card (Flutterwave)')),
                        DropdownMenuItem(value: 'mobile_money', child: Text('Mobile Money (PawaPay)')),
                      ],
                      onChanged: processing
                          ? null
                          : (value) {
                              if (value == null) return;
                              setLocal(() => method = value);
                            },
                    ),
                    if (method == 'mobile_money') ...[
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        value: provider,
                        decoration: const InputDecoration(labelText: 'Provider'),
                        items: const [
                          DropdownMenuItem(value: 'MTN', child: Text('MTN Mobile Money')),
                          DropdownMenuItem(value: 'AIRTEL', child: Text('Airtel Money')),
                          DropdownMenuItem(value: 'MPESA', child: Text('M-Pesa')),
                          DropdownMenuItem(value: 'VODACOM', child: Text('Vodacom M-Pesa')),
                          DropdownMenuItem(value: 'ORANGE', child: Text('Orange Money')),
                        ],
                        onChanged: processing
                            ? null
                            : (value) {
                                if (value == null) return;
                                setLocal(() => provider = value);
                              },
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: phoneCtrl,
                        enabled: !processing,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Phone number',
                          hintText: '+2507...',
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: processing
                            ? null
                            : () async {
                                if (method == 'mobile_money' && phoneCtrl.text.trim().isEmpty) {
                                  AppSnackBar.error(context, 'Phone number is required.');
                                  return;
                                }

                                setLocal(() => processing = true);
                                final ok = await _payCharge(
                                  chargeId: (charge['id'] ?? '').toString(),
                                  method: method,
                                  provider: provider,
                                  phoneNumber: phoneCtrl.text.trim(),
                                );
                                if (!mounted) return;
                                if (ok) {
                                  Navigator.pop(context);
                                } else {
                                  setLocal(() => processing = false);
                                }
                              },
                        child: Text(processing ? 'Processing...' : 'Pay now'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    phoneCtrl.dispose();
  }

  Future<bool> _payCharge({
    required String chargeId,
    required String method,
    required String provider,
    required String phoneNumber,
  }) async {
    try {
      final body = <String, dynamic>{
        'charge_id': chargeId,
        'method': method,
      };
      if (method != 'wallet') {
        body['initialize'] = true;
      }
      if (method == 'mobile_money') {
        body['provider'] = provider;
        body['phone_number'] = phoneNumber;
      }

      final result = await widget.session.postBookingAction('pay-charge', body: body);

      if (method == 'wallet') {
        if (mounted) {
          AppSnackBar.success(context, 'Charge paid from wallet.');
        }
        await _loadOverview(showSpinner: false);
        return true;
      }

      if (method == 'card') {
        final redirectUrl = _extractRedirectUrl(result);
        if (redirectUrl == null || redirectUrl.isEmpty) {
          if (mounted) {
            AppSnackBar.error(context, 'Could not start card payment.');
          }
          return false;
        }

        final paymentResult = await _showPaymentWebView(redirectUrl);
        if (!mounted) return false;

        if (paymentResult == 'success') {
          AppSnackBar.success(context, 'Payment completed.');
        } else if (paymentResult == 'failed') {
          AppSnackBar.error(context, 'Payment failed or was declined.');
        } else {
          AppSnackBar.info(context, 'Payment window closed.');
        }

        await _loadOverview(showSpinner: false);
        return paymentResult == 'success';
      }

      if (mounted) {
        AppSnackBar.success(
          context,
          'Mobile money request sent. Approve the prompt on your phone.',
        );
      }
      await _loadOverview(showSpinner: false);
      return true;
    } catch (error) {
      if (mounted) {
        AppSnackBar.error(context, _cleanError(error));
      }
      return false;
    }
  }

  Future<String?> _showPaymentWebView(String url) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      enableDrag: false,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0x66000000),
      builder: (_) => FractionallySizedBox(
        heightFactor: 0.92,
        child: _PaymentWebSheet(url: url),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.session.isAuthenticated) {
      return Scaffold(
        backgroundColor: AppColors.white,
        appBar: AppBar(
          backgroundColor: AppColors.white,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: const StageSafeLeadingButton(color: AppColors.black),
          title: const Text(
            'Post-Booking Center',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 20),
          ),
        ),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Sign in to manage post-booking payments, changes, and disputes.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.foggy, fontSize: 14),
            ),
          ),
        ),
      );
    }

    if (_loading) {
      return Scaffold(
        backgroundColor: AppColors.white,
        appBar: AppBar(
          backgroundColor: AppColors.white,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: const StageSafeLeadingButton(color: AppColors.black),
          title: const Text(
            'Post-Booking Center',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 20),
          ),
        ),
        body: const Center(child: CircularProgressIndicator(color: AppColors.rausch)),
      );
    }

    final pendingTotal = _charges
        .where((c) => (c['status'] ?? '').toString() == 'pending')
        .fold<double>(0, (sum, c) => sum + _num(c['amount']));
    final walletBalance = _num(_walletAccount?['balance']);
    final walletCurrency = (_walletAccount?['currency'] ?? 'USD').toString();
    final openDisputes = _disputes.where((d) {
      final status = (d['status'] ?? '').toString();
      return status == 'open' || status == 'in_review';
    }).length;

    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: const Text(
          'Post-Booking Center',
          style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 20),
        ),
        actions: [
          IconButton(
            icon: _refreshing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.rausch),
                  )
                : const Icon(Icons.refresh_outlined, color: AppColors.foggy),
            onPressed: _refreshing ? null : () => _loadOverview(showSpinner: false),
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          indicatorColor: AppColors.black,
          labelColor: AppColors.black,
          unselectedLabelColor: AppColors.foggy,
          tabs: const [
            Tab(text: 'Charges'),
            Tab(text: 'Changes'),
            Tab(text: 'Disputes'),
            Tab(text: 'Wallet'),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: _StatTile(
                    label: 'Pending',
                    value: _money(pendingTotal, walletCurrency),
                    color: const Color(0xFFE11D48),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _StatTile(
                    label: 'Disputes',
                    value: '$openDisputes',
                    color: const Color(0xFFD97706),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _StatTile(
                    label: 'Wallet',
                    value: _money(walletBalance, walletCurrency),
                    color: const Color(0xFF0284C7),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _buildChargesTab(),
                _buildModificationsTab(),
                _buildDisputesTab(),
                _buildWalletTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChargesTab() {
    if (_charges.isEmpty) {
      return const _EmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No charges yet',
        subtitle: 'Any post-booking fees will appear here.',
      );
    }

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: () => _loadOverview(showSpinner: false),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        itemCount: _charges.length,
        itemBuilder: (_, index) {
          final charge = _charges[index];
          final status = (charge['status'] ?? 'pending').toString();
          final currency = (charge['currency'] ?? 'USD').toString();
          final amount = _num(charge['amount']);
          final linkedDispute = _disputes.where((d) => d['charge_id'] == charge['id']).toList();

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE7E7EC)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                _statusChip(status),
                                const SizedBox(width: 6),
                                _outlineChip(_label(charge['charge_type']?.toString() ?? 'charge')),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              (charge['description'] ?? 'Additional charge').toString(),
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.black,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _money(amount, currency),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.rausch,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Created ${_fmtDate(charge['created_at']?.toString() ?? '')}',
                    style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                  ),
                  if (linkedDispute.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF8E1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'Dispute status: ${(linkedDispute.first['status'] ?? '').toString()}',
                        style: const TextStyle(color: Color(0xFF8A5100), fontSize: 12),
                      ),
                    ),
                  ],
                  if (status == 'pending') ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => _showPayChargeSheet(charge),
                            icon: const Icon(Icons.credit_card),
                            label: const Text('Pay'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _openDispute(chargeId: (charge['id'] ?? '').toString()),
                            icon: const Icon(Icons.gavel_outlined),
                            label: const Text('Dispute'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildModificationsTab() {
    if (_modifications.isEmpty) {
      return const _EmptyState(
        icon: Icons.swap_horiz_rounded,
        title: 'No modifications',
        subtitle: 'Booking changes and alternatives will appear here.',
      );
    }

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: () => _loadOverview(showSpinner: false),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        itemCount: _modifications.length,
        itemBuilder: (_, index) {
          final mod = _modifications[index];
          final status = (mod['status'] ?? '').toString();
          final paymentStatus = (mod['payment_status'] ?? '').toString();
          final diff = _num(mod['difference']);
          final currency = (mod['currency'] ?? 'USD').toString();

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE7E7EC)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _statusChip(status),
                      const SizedBox(width: 6),
                      _statusChip(paymentStatus),
                      const SizedBox(width: 6),
                      _outlineChip(_label((mod['modification_type'] ?? '').toString())),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    (mod['proposal_message'] ?? 'Booking update requested').toString(),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Old: ${_money(_num(mod['old_price']), currency)}\nNew: ${_money(_num(mod['new_price']), currency)}',
                          style: const TextStyle(fontSize: 12, color: AppColors.hof, height: 1.4),
                        ),
                      ),
                      Text(
                        '${diff > 0 ? '+' : ''}${_money(diff, currency)}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: diff > 0
                              ? AppColors.rausch
                              : diff < 0
                                  ? AppColors.babu
                                  : AppColors.foggy,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Created ${_fmtDate(mod['created_at']?.toString() ?? '')}',
                    style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                  ),
                  if (status == 'pending') ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => _respondModification(
                              (mod['id'] ?? '').toString(),
                              'accept',
                            ),
                            icon: const Icon(Icons.check_circle_outline),
                            label: const Text('Accept'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _respondModification(
                              (mod['id'] ?? '').toString(),
                              'reject',
                            ),
                            icon: const Icon(Icons.close),
                            label: const Text('Reject'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () => _openDispute(
                          modificationId: (mod['id'] ?? '').toString(),
                        ),
                        icon: const Icon(Icons.gavel_outlined),
                        label: const Text('Open dispute'),
                      ),
                    ),
                  ],
                  if (status == 'accepted' && paymentStatus == 'pending') ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF8E1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Payment is required to finalize this change.',
                              style: TextStyle(fontSize: 12, color: Color(0xFF8A5100)),
                            ),
                          ),
                          TextButton(
                            onPressed: () => _tabs.animateTo(0),
                            child: const Text('Go to Charges'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDisputesTab() {
    if (_disputes.isEmpty) {
      return const _EmptyState(
        icon: Icons.balance_outlined,
        title: 'No disputes yet',
        subtitle: 'Any dispute you open will appear in this resolution center.',
      );
    }

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: () => _loadOverview(showSpinner: false),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        itemCount: _disputes.length,
        itemBuilder: (_, index) {
          final dispute = _disputes[index];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE7E7EC)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _statusChip((dispute['status'] ?? '').toString()),
                      const SizedBox(width: 6),
                      if ((dispute['charge_id'] ?? '').toString().isNotEmpty)
                        _outlineChip('Charge')
                      else
                        _outlineChip('Modification'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    (dispute['reason'] ?? 'Dispute').toString(),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                  if ((dispute['details'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      (dispute['details'] ?? '').toString(),
                      style: const TextStyle(fontSize: 13, color: AppColors.hof),
                    ),
                  ],
                  if ((dispute['admin_notes'] ?? '').toString().isNotEmpty ||
                      (dispute['resolution'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF7F7FA),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if ((dispute['admin_notes'] ?? '').toString().isNotEmpty)
                            Text(
                              'Admin notes: ${(dispute['admin_notes'] ?? '').toString()}',
                              style: const TextStyle(fontSize: 12, color: AppColors.hof),
                            ),
                          if ((dispute['resolution'] ?? '').toString().isNotEmpty)
                            Text(
                              'Resolution: ${(dispute['resolution'] ?? '').toString()}',
                              style: const TextStyle(fontSize: 12, color: AppColors.hof),
                            ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    'Opened ${_fmtDate(dispute['created_at']?.toString() ?? '')}',
                    style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWalletTab() {
    final currency = (_walletAccount?['currency'] ?? 'USD').toString();
    final balance = _num(_walletAccount?['balance']);

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: () => _loadOverview(showSpinner: false),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE7E7EC)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Wallet Settings',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Manage auto-charge consent and wallet currency.',
                  style: TextStyle(fontSize: 12, color: AppColors.foggy),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F8FA),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'Balance: ${_money(balance, currency)}',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.black),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _walletCurrency,
                  decoration: const InputDecoration(labelText: 'Wallet currency'),
                  items: const [
                    DropdownMenuItem(value: 'USD', child: Text('USD')),
                    DropdownMenuItem(value: 'RWF', child: Text('RWF')),
                    DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                    DropdownMenuItem(value: 'KES', child: Text('KES')),
                    DropdownMenuItem(value: 'UGX', child: Text('UGX')),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() => _walletCurrency = value);
                  },
                ),
                const SizedBox(height: 8),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Auto-charge consent'),
                  subtitle: const Text(
                    'Allow approved post-booking fees to be deducted from wallet.',
                    style: TextStyle(fontSize: 12),
                  ),
                  value: _walletConsent,
                  onChanged: (value) => setState(() => _walletConsent = value),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _savingWallet ? null : _saveWalletSettings,
                    child: Text(_savingWallet ? 'Saving...' : 'Save settings'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE7E7EC)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Wallet Activity',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                if (_walletTransactions.isEmpty)
                  const Text(
                    'No wallet transactions yet.',
                    style: TextStyle(fontSize: 12, color: AppColors.foggy),
                  )
                else
                  ..._walletTransactions.take(25).map((tx) {
                    final direction = (tx['direction'] ?? 'out').toString();
                    final amount = _num(tx['amount']);
                    final after = _num(tx['balance_after']);
                    return Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F8FA),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _label((tx['tx_type'] ?? 'transaction').toString()),
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _fmtDate(tx['created_at']?.toString() ?? ''),
                                  style: const TextStyle(fontSize: 11, color: AppColors.foggy),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '${direction == 'in' ? '+' : '-'}${_money(amount, currency)}',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: direction == 'in' ? AppColors.babu : AppColors.rausch,
                                ),
                              ),
                              Text(
                                'Balance ${_money(after, currency)}',
                                style: const TextStyle(fontSize: 11, color: AppColors.foggy),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(String status) {
    final (fg, bg) = _statusColors(status);
    final label = status.isEmpty ? 'unknown' : status;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(
        _label(label),
        style: TextStyle(fontSize: 11, color: fg, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _outlineChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD9D9E3)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11, color: AppColors.hof, fontWeight: FontWeight.w600),
      ),
    );
  }

  (Color, Color) _statusColors(String raw) {
    final value = raw.toLowerCase();
    if (value == 'paid' || value == 'approved' || value == 'settled') {
      return (const Color(0xFF166534), const Color(0xFFDCFCE7));
    }
    if (value == 'failed' || value == 'rejected' || value == 'cancelled' || value == 'closed') {
      return (const Color(0xFFB42318), const Color(0xFFFEE4E2));
    }
    if (value == 'disputed' || value == 'in_review' || value == 'open') {
      return (const Color(0xFF8A5100), const Color(0xFFFFF8E1));
    }
    return (const Color(0xFF475467), const Color(0xFFF2F4F7));
  }

  String? _extractRedirectUrl(Map<String, dynamic> result) {
    final flutterwave = _asMap(result['flutterwave']);
    final body = flutterwave == null ? null : _asMap(flutterwave['body']);
    return (body?['redirectUrl'] ?? body?['link'] ?? result['redirectUrl'])?.toString();
  }

  String _label(String text) {
    if (text.trim().isEmpty) return text;
    return text
        .replaceAll('_', ' ')
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  String _fmtDate(String iso) {
    if (iso.isEmpty) return '-';
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return iso;
    }
  }

  String _money(double value, String currency) {
    return '$currency ${value.toStringAsFixed(2)}';
  }

  double _num(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _cleanError(Object error) {
    final raw = error.toString();
    return raw.replaceAll('Exception: ', '').trim();
  }

  List<Map<String, dynamic>> _asMapList(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((row) => row.map((key, val) => MapEntry(key.toString(), val)))
        .toList();
  }

  Map<String, dynamic>? _asMap(dynamic value) {
    if (value is! Map) return null;
    return value.map((key, val) => MapEntry(key.toString(), val));
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE7E7EC)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: AppColors.hackberry),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.black),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.foggy, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentWebSheet extends StatefulWidget {
  const _PaymentWebSheet({required this.url});

  final String url;

  @override
  State<_PaymentWebSheet> createState() => _PaymentWebSheetState();
}

class _PaymentWebSheetState extends State<_PaymentWebSheet> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() => _loading = false),
          onNavigationRequest: (request) {
            final url = request.url;
            if (url.contains('merry360x.com/payment-pending')) {
              Navigator.of(context).pop('success');
              return NavigationDecision.prevent;
            }
            if (url.contains('merry360x.com/payment-failed')) {
              Navigator.of(context).pop('failed');
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFFEBEBEB), width: 0.5)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock_outline, size: 15, color: AppColors.foggy),
                  const SizedBox(width: 6),
                  const Text(
                    'Secure Payment',
                    style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.black),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop('cancelled'),
                    icon: const Icon(Icons.close, color: AppColors.black),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  WebViewWidget(controller: _controller),
                  if (_loading)
                    const Center(
                      child: CircularProgressIndicator(color: AppColors.rausch),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
