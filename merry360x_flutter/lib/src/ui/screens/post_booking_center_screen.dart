import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../app.dart';
import '../../session_controller.dart';
import '../widgets/swipe_action_wrapper.dart';
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

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
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

      setState(() {
        _charges = _asMapList(data['charges']);
        _modifications = _asMapList(data['booking_modifications']);
        _disputes = _asMapList(data['disputes']);
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
                            Navigator.of(this.context).pop();
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

  Future<void> _showPayChargeSheet(Map<String, dynamic> charge) async {
    final phoneCtrl = TextEditingController();
    String method = 'card';
    String provider = 'MTN';
    bool processing = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
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
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: processing ? null : () => setLocal(() => method = 'mobile_money'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              decoration: BoxDecoration(
                                color: method == 'mobile_money' ? AppColors.rausch.withValues(alpha: 0.07) : AppColors.surfaceSubtle,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: method == 'mobile_money' ? AppColors.rausch : AppColors.border,
                                  width: 1.5,
                                ),
                              ),
                              child: const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.smartphone, size: 18, color: AppColors.black),
                                      SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'Mobile Money',
                                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'MTN, Airtel, M-Pesa, Orange & more',
                                    style: TextStyle(fontSize: 11, color: AppColors.foggy),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: processing ? null : () => setLocal(() => method = 'card'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              decoration: BoxDecoration(
                                color: method == 'card' ? AppColors.rausch.withValues(alpha: 0.07) : AppColors.surfaceSubtle,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: method == 'card' ? AppColors.rausch : AppColors.border,
                                  width: 1.5,
                                ),
                              ),
                              child: const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.credit_card, size: 18, color: AppColors.black),
                                      SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'Card',
                                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Visa, Mastercard, Amex',
                                    style: TextStyle(fontSize: 11, color: AppColors.foggy),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (method == 'mobile_money') ...[
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: provider,
                        decoration: const InputDecoration(labelText: 'Provider'),
                        items: const [
                          DropdownMenuItem(value: 'MTN', child: Text('MTN Mobile Money')),
                          DropdownMenuItem(value: 'AIRTEL', child: Text('Airtel Money')),
                          DropdownMenuItem(value: 'MPESA', child: Text('M-Pesa / Safaricom')),
                          DropdownMenuItem(value: 'VODACOM', child: Text('Vodacom M-Pesa')),
                          DropdownMenuItem(value: 'ORANGE', child: Text('Orange Money')),
                          DropdownMenuItem(value: 'MOOV', child: Text('Moov Money')),
                          DropdownMenuItem(value: 'HALOTEL', child: Text('Halotel')),
                          DropdownMenuItem(value: 'FREE', child: Text('Free Money')),
                          DropdownMenuItem(value: 'ZAMTEL', child: Text('Zamtel')),
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
                                  Navigator.of(this.context).pop();
                                } else {
                                  setLocal(() => processing = false);
                                }
                              },
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(method == 'mobile_money' ? Icons.smartphone : Icons.credit_card),
                            const SizedBox(width: 8),
                            Text(processing ? 'Processing...' : 'Pay now'),
                          ],
                        ),
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
        'initialize': true,
      };
      if (method == 'mobile_money') {
        body['provider'] = provider;
        body['phone_number'] = phoneNumber;
      }

      final result = await widget.session.postBookingAction('pay-charge', body: body);

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
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          backgroundColor: AppColors.surface,
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
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          backgroundColor: AppColors.surface,
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

    final pendingByCurrency = <String, double>{};
    for (final charge in _charges) {
      if ((charge['status'] ?? '').toString() != 'pending') continue;
      final currency = (charge['currency'] ?? 'USD').toString();
      pendingByCurrency[currency] = (pendingByCurrency[currency] ?? 0) + _num(charge['amount']);
    }
    final pendingSummary = pendingByCurrency.entries
        .map((entry) => _money(entry.value, entry.key))
        .join(' • ');
    final pendingCount = _charges.where((c) => (c['status'] ?? '').toString() == 'pending').length;
    final openDisputes = _disputes.where((d) {
      final status = (d['status'] ?? '').toString();
      return status == 'open' || status == 'in_review';
    }).length;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
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
          ],
        ),
      ),
      body: Column(
        children: [
          if (pendingCount > 0 || openDisputes > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  if (pendingCount > 0) ...[
                    Expanded(
                      child: _StatTile(
                        icon: Icons.receipt_long_outlined,
                        label: pendingCount == 1 ? '1 charge due' : '$pendingCount charges due',
                        value: pendingSummary,
                        color: const Color(0xFFE11D48),
                        accent: const Color(0xFFFFF1F2),
                      ),
                    ),
                    if (openDisputes > 0) const SizedBox(width: 8),
                  ],
                  if (openDisputes > 0)
                    Expanded(
                      child: _StatTile(
                        icon: Icons.balance_outlined,
                        label: openDisputes == 1 ? '1 open dispute' : '$openDisputes open disputes',
                        value: 'In review',
                        color: const Color(0xFFD97706),
                        accent: const Color(0xFFFFFBEB),
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
          final linkedDispute = _disputes.where((d) => d['charge_id'] == charge['id']).toList();

          final chargeId = (charge['id'] ?? '').toString();
          return SwipeActionWrapper(
            key: ValueKey('charge-$chargeId'),
            primaryAction: SwipeAction(
              onAction: () => _openDispute(chargeId: chargeId),
              color: const Color(0xFFE65100),
              icon: Icons.flag_outlined,
              label: 'Dispute',
            ),
            secondaryAction: SwipeAction(
              onAction: () => _showPayChargeSheet(charge),
              color: const Color(0xFF4CAF50),
              icon: Icons.payment,
              label: 'Pay',
            ),
            child: _ChargeCard(
              charge: charge,
              linkedDispute: linkedDispute.isNotEmpty ? linkedDispute.first : null,
              onPay: () => _showPayChargeSheet(charge),
              onDispute: () => _openDispute(chargeId: chargeId),
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

          final modId = (mod['id'] ?? '').toString();
          return SwipeActionWrapper(
            key: ValueKey('modification-$modId'),
            primaryAction: SwipeAction(
              onAction: () => _respondModification(modId, 'reject'),
              color: AppColors.rausch,
              icon: Icons.close,
              label: 'Decline',
              destructive: true,
            ),
            secondaryAction: SwipeAction(
              onAction: () => _respondModification(modId, 'accept'),
              color: const Color(0xFF0D9488),
              icon: Icons.check,
              label: 'Accept',
            ),
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
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
                          color: AppColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Payment is required to finalize this change.',
                                style: TextStyle(fontSize: 12, color: AppColors.hof),
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
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
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
                        color: AppColors.surfaceSubtle,
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

  Widget _statusChip(String status) => _StatusChip(status);

  Widget _outlineChip(String label) => _OutlineChip(label);

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
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year}';
    } catch (_) {
      return iso;
    }
  }

  String _money(double value, String currency) {
    final String number;
    if (value == value.truncateToDouble()) {
      final s = value.toInt().toString();
      final buf = StringBuffer();
      for (var i = 0; i < s.length; i++) {
        if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
        buf.write(s[i]);
      }
      number = buf.toString();
    } else {
      number = value.toStringAsFixed(2);
    }
    return '$currency $number';
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
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.accent,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: accent,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color),
                ),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: color.withOpacity(0.7)),
                ),
              ],
            ),
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

// ─── Charge card ─────────────────────────────────────────────────────────────

class _ChargeCard extends StatelessWidget {
  const _ChargeCard({
    required this.charge,
    required this.linkedDispute,
    required this.onPay,
    required this.onDispute,
  });

  final Map<String, dynamic> charge;
  final Map<String, dynamic>? linkedDispute;
  final VoidCallback onPay;
  final VoidCallback onDispute;

  static double _num(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse(v?.toString() ?? '') ?? 0;
  }

  static String _fmtDate(String iso) {
    if (iso.isEmpty) return '-';
    try {
      final d = DateTime.parse(iso).toLocal();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${months[d.month - 1]} ${d.day}, ${d.year}';
    } catch (_) {
      return iso;
    }
  }

  static String _chipLabel(String text) {
    if (text.trim().isEmpty) return text;
    return text.replaceAll('_', ' ').split(' ')
        .where((p) => p.isNotEmpty)
        .map((p) => '${p[0].toUpperCase()}${p.substring(1)}')
        .join(' ');
  }

  String _formatAmount(double value) {
    if (value == value.truncateToDouble()) {
      final s = value.toInt().toString();
      final buf = StringBuffer();
      for (var i = 0; i < s.length; i++) {
        if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
        buf.write(s[i]);
      }
      return buf.toString();
    }
    return value.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    final status = (charge['status'] ?? 'pending').toString();
    final currency = (charge['currency'] ?? 'USD').toString();
    final amount = _num(charge['amount']);
    final isPaid = status == 'paid' || status == 'approved' || status == 'settled';
    final isPending = status == 'pending';

    final Color stripeColor;
    if (isPaid) {
      stripeColor = const Color(0xFF22C55E);
    } else if (isPending) {
      stripeColor = AppColors.rausch;
    } else {
      stripeColor = const Color(0xFFD97706);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.hardEdge,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 4, color: stripeColor),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              _StatusChip(status),
                              _OutlineChip(_chipLabel(charge['charge_type']?.toString() ?? 'charge')),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '$currency ${_formatAmount(amount)}',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: isPaid ? const Color(0xFF16A34A) : AppColors.rausch,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      (charge['description'] ?? 'Additional charge').toString(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isPaid ? AppColors.foggy : AppColors.black,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Created ${_fmtDate(charge['created_at']?.toString() ?? '')}',
                      style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                    ),
                    if (linkedDispute != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.balance_outlined, size: 14, color: Color(0xFFD97706)),
                            const SizedBox(width: 6),
                            Text(
                              'Dispute ${_chipLabel((linkedDispute!['status'] ?? '').toString())}',
                              style: const TextStyle(color: AppColors.hof, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (isPending && linkedDispute == null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: FilledButton.icon(
                              onPressed: onPay,
                              icon: const Icon(Icons.credit_card, size: 16),
                              label: const Text('Pay now'),
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.rausch,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            flex: 2,
                            child: OutlinedButton.icon(
                              onPressed: onDispute,
                              icon: const Icon(Icons.gavel_outlined, size: 16),
                              label: const Text('Dispute'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.status);
  final String status;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final (fg, bg) = _colors(status.toLowerCase(), isDark);
    final label = status.isEmpty ? 'unknown' : status.replaceAll('_', ' ');
    final capitalized = label.isNotEmpty ? '${label[0].toUpperCase()}${label.substring(1)}' : label;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(capitalized, style: TextStyle(fontSize: 11, color: fg, fontWeight: FontWeight.w700)),
    );
  }

  static (Color, Color) _colors(String v, bool isDark) {
    if (v == 'paid' || v == 'approved' || v == 'settled') {
      return isDark
          ? (const Color(0xFF4ADE80), const Color(0xFF003D1A))
          : (const Color(0xFF166534), const Color(0xFFDCFCE7));
    }
    if (v == 'failed' || v == 'rejected' || v == 'cancelled' || v == 'closed') {
      return isDark
          ? (const Color(0xFFFC8181), const Color(0xFF3A0A0F))
          : (const Color(0xFFB42318), const Color(0xFFFEE4E2));
    }
    if (v == 'disputed' || v == 'in_review' || v == 'open') {
      return isDark
          ? (const Color(0xFFFCD34D), const Color(0xFF3A2800))
          : (const Color(0xFF92400E), const Color(0xFFFFFBEB));
    }
    if (v == 'pending') {
      return isDark
          ? (const Color(0xFFFB923C), const Color(0xFF3A1A00))
          : (const Color(0xFF9A3412), const Color(0xFFFFF7ED));
    }
    return isDark
        ? (AppColors.foggy, AppColors.surfaceSubtle)
        : (const Color(0xFF475467), const Color(0xFFF2F4F7));
  }
}

class _OutlineChip extends StatelessWidget {
  const _OutlineChip(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(label, style: const TextStyle(fontSize: 11, color: AppColors.hof, fontWeight: FontWeight.w600)),
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
            final parsed = Uri.tryParse(request.url);
            final host = (parsed?.host ?? '').toLowerCase();
            final path = parsed?.path ?? '';

            if ((host == 'merry360x.com' || host.endsWith('.merry360x.com')) && path == '/payment-failed') {
              Navigator.of(context).pop('failed');
              return NavigationDecision.prevent;
            }

            if ((host == 'merry360x.com' || host.endsWith('.merry360x.com')) &&
                path == '/my-bookings' &&
                parsed?.queryParameters['payment'] == 'confirmed') {
              Navigator.of(context).pop('success');
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
      color: AppColors.surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5)),
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
