import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import 'property_wizard_screen.dart';
import 'tour_wizard_screen.dart';
import 'tour_package_wizard_screen.dart';
import 'vehicle_wizard_screen.dart';
import 'airport_transfer_wizard_screen.dart';

enum HostCreateType {
  property,
  tour,
  tourPackage,
  carRental,
  airportTransfer,
}

class HostQuickCreateScreen extends StatefulWidget {
  const HostQuickCreateScreen({
    super.key,
    required this.api,
    required this.userId,
  });

  final AppDatabase api;
  final String userId;

  @override
  State<HostQuickCreateScreen> createState() => _HostQuickCreateScreenState();
}

class _HostQuickCreateScreenState extends State<HostQuickCreateScreen> {
  final _titleCtrl = TextEditingController();
  int _step = 1;
  HostCreateType _type = HostCreateType.property;

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  String get _titleLabel {
    switch (_type) {
      case HostCreateType.property:
        return 'Property name';
      case HostCreateType.tour:
        return 'Tour name';
      case HostCreateType.tourPackage:
        return 'Package name';
      case HostCreateType.carRental:
        return 'Vehicle name';
      case HostCreateType.airportTransfer:
        return 'Transfer name';
    }
  }

  String get _typeLabel {
    switch (_type) {
      case HostCreateType.property:
        return 'Property';
      case HostCreateType.tour:
        return 'Tour';
      case HostCreateType.tourPackage:
        return 'Tour Package';
      case HostCreateType.carRental:
        return 'Car Rental';
      case HostCreateType.airportTransfer:
        return 'Airport Transfer';
    }
  }

  Future<void> _goNext() async {
    if (_step == 1) {
      if (_titleCtrl.text.trim().isEmpty) return;
      setState(() => _step = 2);
      return;
    }

    final seedTitle = _titleCtrl.text.trim();
    Widget screen;
    switch (_type) {
      case HostCreateType.property:
        screen = PropertyWizardScreen(api: widget.api, userId: widget.userId, seedTitle: seedTitle);
        break;
      case HostCreateType.tour:
        screen = TourWizardScreen(api: widget.api, userId: widget.userId, seedTitle: seedTitle);
        break;
      case HostCreateType.tourPackage:
        screen = TourPackageWizardScreen(api: widget.api, userId: widget.userId, seedTitle: seedTitle);
        break;
      case HostCreateType.carRental:
        screen = VehicleWizardScreen(api: widget.api, userId: widget.userId, seedTitle: seedTitle);
        break;
      case HostCreateType.airportTransfer:
        screen = AirportTransferWizardScreen(api: widget.api, userId: widget.userId, seedTitle: seedTitle);
        break;
    }

    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => screen),
    );
    if (!mounted) return;
    Navigator.of(context).pop(changed == true);
  }

  void _goBack() {
    if (_step > 1) {
      setState(() => _step -= 1);
    } else {
      Navigator.of(context).maybePop();
    }
  }

  bool get _canContinue => _step == 1 ? _titleCtrl.text.trim().isNotEmpty : true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        leading: StageSafeLeadingButton(
          icon: Icons.chevron_left,
          onPressed: _goBack,
        ),
        title: const Text('Create'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Step $_step of 2', style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
              const SizedBox(height: 10),
              LinearProgressIndicator(
                value: _step / 2,
                backgroundColor: Colors.grey.shade200,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.rausch),
                minHeight: 3,
              ),
              const SizedBox(height: 22),
              if (_step == 1) ...[
                const Text('Quick setup', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                const Text('Name it and choose what you’re creating.', style: TextStyle(fontSize: 13, color: AppColors.foggy)),
                const SizedBox(height: 18),
                TextField(
                  controller: _titleCtrl,
                  decoration: InputDecoration(
                    labelText: _titleLabel,
                    hintText: 'e.g. Lake Kivu Sunset Tour',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<HostCreateType>(
                  initialValue: _type,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: const [
                    DropdownMenuItem(value: HostCreateType.property, child: Text('Property')),
                    DropdownMenuItem(value: HostCreateType.tour, child: Text('Tour')),
                    DropdownMenuItem(value: HostCreateType.tourPackage, child: Text('Tour Package')),
                    DropdownMenuItem(value: HostCreateType.carRental, child: Text('Car Rental')),
                    DropdownMenuItem(value: HostCreateType.airportTransfer, child: Text('Airport Transfer')),
                  ],
                  onChanged: (v) => setState(() => _type = v ?? _type),
                ),
              ] else ...[
                Text(_typeLabel, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text('We’ll take you through the full steps next.', style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
                const SizedBox(height: 18),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFEBEBEB)),
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.grey.shade50,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.edit_note, color: AppColors.foggy),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Title: ${_titleCtrl.text.trim()}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _canContinue ? AppColors.rausch : Colors.grey.shade300,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _canContinue ? _goNext : null,
                  child: Text(_step == 1 ? 'Continue' : 'Start $_typeLabel creation', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
