import 'package:flutter/material.dart';

import '../../app.dart';
import '../../session_controller.dart';
import '../utils/app_snackbar.dart';

class AdminPostBookingScreen extends StatefulWidget {
  const AdminPostBookingScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<AdminPostBookingScreen> createState() => _AdminPostBookingScreenState();
}

class _AdminPostBookingScreenState extends State<AdminPostBookingScreen>
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
    if (!widget.session.canManagePostBooking) {
      if (mounted) {
        setState(() {
          _loading = false;
          _refreshing = false;
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
      final data = await widget.session.fetchAdminPostBookingOverview();
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

  Future<void> _updateChargeStatus(String chargeId, String status) async {
    try {
      await widget.session.postBookingAction(
        'update-charge-status',
        body: {
          'charge_id': chargeId,
          'status': status,
        },
      );
      if (!mounted) return;
      AppSnackBar.success(context, 'Charge updated.');
      await _loadOverview(showSpinner: false);
    } catch (error) {
      if (mounted) {
        AppSnackBar.error(context, _cleanError(error));
      }
    }
  }

  Future<void> _openCreateChargeDialog() async {
    final bookingCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final descriptionCtrl = TextEditingController();
    String chargeType = 'damage';
    String currency = 'USD';
    bool submitting = false;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Add charge'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: bookingCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Booking ID',
                        hintText: 'Booking UUID',
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: chargeType,
                      decoration: const InputDecoration(labelText: 'Charge type'),
                      items: const [
                        DropdownMenuItem(value: 'damage', child: Text('Damage')),
                        DropdownMenuItem(value: 'late_fee', child: Text('Late fee')),
                        DropdownMenuItem(value: 'extra_service', child: Text('Extra service')),
                        DropdownMenuItem(value: 'upgrade', child: Text('Upgrade')),
                      ],
                      onChanged: submitting
                          ? null
                          : (value) {
                              if (value == null) return;
                              setLocal(() => chargeType = value);
                            },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: amountCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Amount',
                        hintText: '0.00',
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: currency,
                      decoration: const InputDecoration(labelText: 'Currency'),
                      items: const [
                        DropdownMenuItem(value: 'USD', child: Text('USD')),
                        DropdownMenuItem(value: 'RWF', child: Text('RWF')),
                        DropdownMenuItem(value: 'EUR', child: Text('EUR')),
                        DropdownMenuItem(value: 'KES', child: Text('KES')),
                        DropdownMenuItem(value: 'UGX', child: Text('UGX')),
                      ],
                      onChanged: submitting
                          ? null
                          : (value) {
                              if (value == null) return;
                              setLocal(() => currency = value);
                            },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: descriptionCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        hintText: 'Explain why this charge was added',
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
                          final bookingId = bookingCtrl.text.trim();
                          final amount = double.tryParse(amountCtrl.text.trim());
                          final description = descriptionCtrl.text.trim();
                          if (bookingId.isEmpty || amount == null || amount <= 0 || description.isEmpty) {
                            AppSnackBar.error(context, 'Booking ID, amount, and description are required.');
                            return;
                          }

                          setLocal(() => submitting = true);
                          try {
                            await widget.session.postBookingAction(
                              'create-charge',
                              body: {
                                'booking_id': bookingId,
                                'charge_type': chargeType,
                                'amount': amount,
                                'currency': currency,
                                'description': description,
                                'proof_urls': const <String>[],
                              },
                            );
                            if (!mounted) return;
                            Navigator.of(this.context).pop();
                            AppSnackBar.success(this.context, 'Charge created.');
                            await _loadOverview(showSpinner: false);
                          } catch (error) {
                            if (mounted) {
                              AppSnackBar.error(this.context, _cleanError(error));
                            }
                            setLocal(() => submitting = false);
                          }
                        },
                  child: Text(submitting ? 'Creating...' : 'Create'),
                ),
              ],
            );
          },
        );
      },
    );

    bookingCtrl.dispose();
    amountCtrl.dispose();
    descriptionCtrl.dispose();
  }

  Future<void> _openCreateModificationDialog({required bool alternativeOffer}) async {
    final bookingCtrl = TextEditingController();
    final checkInCtrl = TextEditingController();
    final checkOutCtrl = TextEditingController();
    final propertyCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();
    final messageCtrl = TextEditingController();

    String modificationType = alternativeOffer ? 'alternative_offer' : 'date_change';
    bool submitting = false;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: Text(alternativeOffer ? 'Suggest alternative offer' : 'Create booking modification'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: bookingCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Booking ID',
                        hintText: 'Booking UUID',
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: modificationType,
                      decoration: const InputDecoration(labelText: 'Modification type'),
                      items: const [
                        DropdownMenuItem(value: 'date_change', child: Text('Date change')),
                        DropdownMenuItem(value: 'property_change', child: Text('Property change')),
                        DropdownMenuItem(value: 'alternative_offer', child: Text('Alternative offer')),
                      ],
                      onChanged: submitting || alternativeOffer
                          ? null
                          : (value) {
                              if (value == null) return;
                              setLocal(() => modificationType = value);
                            },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: checkInCtrl,
                      decoration: const InputDecoration(
                        labelText: 'New check-in (optional)',
                        hintText: 'YYYY-MM-DD',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: checkOutCtrl,
                      decoration: const InputDecoration(
                        labelText: 'New check-out (optional)',
                        hintText: 'YYYY-MM-DD',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: propertyCtrl,
                      decoration: const InputDecoration(
                        labelText: 'New property ID (optional)',
                        hintText: 'Property UUID',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: reasonCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Reason (optional)',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: messageCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Proposal message',
                        hintText: 'Explain the proposed change',
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
                          final bookingId = bookingCtrl.text.trim();
                          if (bookingId.isEmpty) {
                            AppSnackBar.error(context, 'Booking ID is required.');
                            return;
                          }

                          setLocal(() => submitting = true);
                          try {
                            final action = alternativeOffer ? 'propose-alternative' : 'create-modification';
                            await widget.session.postBookingAction(
                              action,
                              body: {
                                'booking_id': bookingId,
                                'modification_type': alternativeOffer ? 'alternative_offer' : modificationType,
                                'new_check_in': _emptyToNull(checkInCtrl.text),
                                'new_check_out': _emptyToNull(checkOutCtrl.text),
                                'new_property_id': _emptyToNull(propertyCtrl.text),
                                'reason': _emptyToNull(reasonCtrl.text),
                                'proposal_message': _emptyToNull(messageCtrl.text),
                              },
                            );
                            if (!mounted) return;
                            Navigator.of(this.context).pop();
                            AppSnackBar.success(this.context, 'Modification proposal sent.');
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

    bookingCtrl.dispose();
    checkInCtrl.dispose();
    checkOutCtrl.dispose();
    propertyCtrl.dispose();
    reasonCtrl.dispose();
    messageCtrl.dispose();
  }

  Future<void> _openResolveDialog(Map<String, dynamic> dispute) async {
    String status = (dispute['status'] ?? 'in_review').toString();
    final notesCtrl = TextEditingController(text: (dispute['admin_notes'] ?? '').toString());
    final resolutionCtrl = TextEditingController(text: (dispute['resolution'] ?? '').toString());
    bool submitting = false;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Resolve dispute'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(value: 'in_review', child: Text('In review')),
                        DropdownMenuItem(value: 'approved', child: Text('Approved')),
                        DropdownMenuItem(value: 'rejected', child: Text('Rejected')),
                        DropdownMenuItem(value: 'settled', child: Text('Settled')),
                        DropdownMenuItem(value: 'closed', child: Text('Closed')),
                      ],
                      onChanged: submitting
                          ? null
                          : (value) {
                              if (value == null) return;
                              setLocal(() => status = value);
                            },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: notesCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Admin notes'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: resolutionCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Resolution message'),
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
                          setLocal(() => submitting = true);
                          try {
                            await widget.session.postBookingAction(
                              'resolve-dispute',
                              body: {
                                'dispute_id': (dispute['id'] ?? '').toString(),
                                'status': status,
                                'admin_notes': notesCtrl.text.trim(),
                                'resolution': resolutionCtrl.text.trim(),
                              },
                            );
                            if (!mounted) return;
                            Navigator.of(this.context).pop();
                            AppSnackBar.success(this.context, 'Dispute updated.');
                            await _loadOverview(showSpinner: false);
                          } catch (error) {
                            if (mounted) {
                              AppSnackBar.error(this.context, _cleanError(error));
                            }
                            setLocal(() => submitting = false);
                          }
                        },
                  child: Text(submitting ? 'Saving...' : 'Save'),
                ),
              ],
            );
          },
        );
      },
    );

    notesCtrl.dispose();
    resolutionCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.session.canManagePostBooking) {
      return Scaffold(
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          backgroundColor: AppColors.surface,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: const StageSafeLeadingButton(color: AppColors.black),
          title: const Text(
            'Post-Booking Console',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 20),
          ),
        ),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'You do not have access to this console.',
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
            'Post-Booking Console',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 20),
          ),
        ),
        body: const Center(child: CircularProgressIndicator(color: AppColors.rausch)),
      );
    }

    final pendingCharges = _charges.where((c) => (c['status'] ?? '').toString() == 'pending').length;
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
          'Post-Booking Console',
          style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 20),
        ),
        actions: [
          IconButton(
            tooltip: 'Add charge',
            onPressed: _openCreateChargeDialog,
            icon: const Icon(Icons.add_circle_outline, color: AppColors.hof),
          ),
          PopupMenuButton<String>(
            tooltip: 'Modification actions',
            icon: const Icon(Icons.swap_horiz_rounded, color: AppColors.hof),
            onSelected: (value) {
              if (value == 'mod') {
                _openCreateModificationDialog(alternativeOffer: false);
              } else {
                _openCreateModificationDialog(alternativeOffer: true);
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'mod', child: Text('Create modification')),
              PopupMenuItem(value: 'alt', child: Text('Suggest alternative offer')),
            ],
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: _refreshing ? null : () => _loadOverview(showSpinner: false),
            icon: _refreshing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.rausch),
                  )
                : const Icon(Icons.refresh_outlined, color: AppColors.foggy),
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: AppColors.black,
          labelColor: AppColors.black,
          unselectedLabelColor: AppColors.foggy,
          tabs: const [
            Tab(text: 'Charges'),
            Tab(text: 'Modifications'),
            Tab(text: 'Disputes'),
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
                  child: _AdminStatTile(
                    label: 'Pending Charges',
                    value: '$pendingCharges',
                    color: const Color(0xFFE11D48),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _AdminStatTile(
                    label: 'Open Disputes',
                    value: '$openDisputes',
                    color: const Color(0xFFD97706),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _AdminStatTile(
                    label: 'Pending Changes',
                    value: '${_modifications.where((m) => (m['status'] ?? '').toString() == 'pending').length}',
                    color: const Color(0xFF1D4ED8),
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
      return const _AdminEmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No charges yet',
        subtitle: 'Create a charge to notify a guest.',
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
          final status = (charge['status'] ?? '').toString();
          final currency = (charge['currency'] ?? 'USD').toString();
          final amount = _num(charge['amount']);

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
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
                                _outlineChip(_label((charge['charge_type'] ?? '').toString())),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              (charge['description'] ?? 'Charge').toString(),
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Booking ${(charge['booking_id'] ?? '').toString().substring(0, ((charge['booking_id'] ?? '').toString().length > 8) ? 8 : (charge['booking_id'] ?? '').toString().length)}',
                              style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '$currency ${amount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: AppColors.rausch,
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                          PopupMenuButton<String>(
                            onSelected: (value) => _updateChargeStatus((charge['id'] ?? '').toString(), value),
                            itemBuilder: (_) => const [
                              PopupMenuItem(value: 'pending', child: Text('Mark pending')),
                              PopupMenuItem(value: 'paid', child: Text('Mark paid')),
                              PopupMenuItem(value: 'failed', child: Text('Mark failed')),
                              PopupMenuItem(value: 'disputed', child: Text('Mark disputed')),
                              PopupMenuItem(value: 'cancelled', child: Text('Mark cancelled')),
                            ],
                            child: const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              child: Icon(Icons.more_vert, size: 18, color: AppColors.foggy),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
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
      return const _AdminEmptyState(
        icon: Icons.swap_horiz_rounded,
        title: 'No modifications yet',
        subtitle: 'Use the top action to create a booking change.',
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
          final payStatus = (mod['payment_status'] ?? '').toString();
          final currency = (mod['currency'] ?? 'USD').toString();
          final oldPrice = _num(mod['old_price']);
          final newPrice = _num(mod['new_price']);
          final diff = _num(mod['difference']);

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
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
                      _statusChip(payStatus),
                      const SizedBox(width: 6),
                      _outlineChip(_label((mod['modification_type'] ?? '').toString())),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    (mod['proposal_message'] ?? 'Modification proposal').toString(),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Old: $currency ${oldPrice.toStringAsFixed(2)}  ·  New: $currency ${newPrice.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 12, color: AppColors.hof),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Difference: ${diff > 0 ? '+' : ''}$currency ${diff.toStringAsFixed(2)}',
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
            ),
          );
        },
      ),
    );
  }

  Widget _buildDisputesTab() {
    if (_disputes.isEmpty) {
      return const _AdminEmptyState(
        icon: Icons.balance_outlined,
        title: 'No disputes',
        subtitle: 'Disputes opened by users will appear here.',
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
          final status = (dispute['status'] ?? '').toString();

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
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
                      style: const TextStyle(fontSize: 12, color: AppColors.hof),
                    ),
                  ],
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _openResolveDialog(dispute),
                      icon: const Icon(Icons.gavel_outlined),
                      label: const Text('Resolve / update'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
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

  String _label(String text) {
    if (text.trim().isEmpty) return text;
    return text
        .replaceAll('_', ' ')
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  List<Map<String, dynamic>> _asMapList(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((row) => row.map((key, val) => MapEntry(key.toString(), val)))
        .toList();
  }

  String _cleanError(Object error) {
    return error.toString().replaceAll('Exception: ', '').trim();
  }

  double _num(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String? _emptyToNull(String value) {
    final v = value.trim();
    return v.isEmpty ? null : v;
  }
}

class _AdminStatTile extends StatelessWidget {
  const _AdminStatTile({
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
        color: AppColors.surface,
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
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

class _AdminEmptyState extends StatelessWidget {
  const _AdminEmptyState({
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
