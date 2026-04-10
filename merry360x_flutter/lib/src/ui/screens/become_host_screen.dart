import 'dart:async';

import 'package:flutter/material.dart';

import '../../app.dart';
import '../widgets/return_button.dart';

import '../../services/app_database.dart';
import '../../services/local_draft_store.dart';
import '../../session_controller.dart';

const _kRed = AppColors.rausch;

class BecomeHostScreen extends StatefulWidget {
  const BecomeHostScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<BecomeHostScreen> createState() => _BecomeHostScreenState();
}

class _BecomeHostScreenState extends State<BecomeHostScreen> {
  final _api = AppDatabase();
  static const _draftScope = 'host_application';
  int _step = 0; // 0 = form, 1 = success / already submitted
  bool _loading = true;
  bool _alreadySubmitted = false;
  bool _submitting = false;
  bool _draftRestored = false;
  Timer? _draftSaveTimer;

  // Step 1 — Personal Info
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _aboutCtrl = TextEditingController();
  // Step 2 — Service Types
  final List<String> _serviceTypes = [];
  // Step 3 — Verification
  final _nationalIdCtrl = TextEditingController();

  final _formKey = GlobalKey<FormState>();

  static const _kServiceOptions = [
    ('accommodation', Icons.home_outlined, 'Accommodation', 'Rooms, houses, apartments, villas, hotels'),
    ('transport', Icons.directions_car_outlined, 'Transport', 'Vehicles, drivers, airport transfers'),
    ('tour', Icons.explore_outlined, 'Tours & Experiences', 'Guided tours, cultural experiences'),
    ('tour_package', Icons.luggage_outlined, 'Tour Packages', 'Multi-day packages combining tours and stays'),
  ];

  @override
  void initState() {
    super.initState();
    _attachDraftListeners();
    _checkExisting();
  }

  @override
  void dispose() {
    _draftSaveTimer?.cancel();
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _aboutCtrl.dispose();
    _nationalIdCtrl.dispose();
    super.dispose();
  }

  String get _draftKey => LocalDraftStore.key(_draftScope, widget.session.userId);

  void _attachDraftListeners() {
    for (final controller in [_nameCtrl, _phoneCtrl, _aboutCtrl, _nationalIdCtrl]) {
      controller.addListener(_scheduleDraftSave);
    }
  }

  Map<String, dynamic> _collectDraft() => {
    'step': _step,
    'fullName': _nameCtrl.text,
    'phone': _phoneCtrl.text,
    'about': _aboutCtrl.text,
    'serviceTypes': List<String>.from(_serviceTypes),
    'nationalId': _nationalIdCtrl.text,
  };

  void _scheduleDraftSave() {
    if (_alreadySubmitted) return;
    _draftSaveTimer?.cancel();
    _draftSaveTimer = Timer(const Duration(milliseconds: 400), () {
      LocalDraftStore.write(_draftKey, _collectDraft());
    });
  }

  Future<void> _restoreDraftIfNeeded() async {
    final draft = await LocalDraftStore.read(_draftKey);
    if (draft == null || !mounted) return;

    setState(() {
      _step = ((draft['step'] as num?)?.toInt() ?? 0).clamp(0, 2);
      _nameCtrl.text = (draft['fullName'] ?? '').toString();
      _phoneCtrl.text = (draft['phone'] ?? '').toString();
      _aboutCtrl.text = (draft['about'] ?? '').toString();
      _serviceTypes
        ..clear()
        ..addAll(((draft['serviceTypes'] as List?) ?? const []).map((item) => item.toString()).where((item) => item.isNotEmpty));
      _nationalIdCtrl.text = (draft['nationalId'] ?? '').toString();
      _draftRestored = true;
    });
  }

  Future<void> _discardDraft() async {
    await LocalDraftStore.clear(_draftKey);
    if (!mounted) return;
    setState(() {
      _step = 0;
      _nameCtrl.clear();
      _phoneCtrl.clear();
      _aboutCtrl.clear();
      _serviceTypes.clear();
      _nationalIdCtrl.clear();
      _draftRestored = false;
    });
  }

  Future<void> _checkExisting() async {
    final app = await _api.fetchMyHostApplication(userId: widget.session.userId);
    if (app == null) {
      await _restoreDraftIfNeeded();
    } else {
      await LocalDraftStore.clear(_draftKey);
    }
    setState(() {
      _alreadySubmitted = app != null;
      _loading = false;
      if (_alreadySubmitted) _step = 1;
    });
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _submitting = true);
    await _api.submitHostApplication(
      userId: widget.session.userId,
      fullName: _nameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
      serviceTypes: _serviceTypes,
      about: _aboutCtrl.text.trim().isNotEmpty ? _aboutCtrl.text.trim() : null,
      nationalIdNumber: _nationalIdCtrl.text.trim().isNotEmpty ? _nationalIdCtrl.text.trim() : null,
    );
    await LocalDraftStore.clear(_draftKey);
    setState(() { _submitting = false; _step = 1; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const ReturnButton(color: AppColors.black, fallbackRoute: '/'),
        title: const Text('Become a Host',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _kRed))
          : _step == 1
              ? _SuccessView(alreadySubmitted: _alreadySubmitted)
              : _buildForm(),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(children: [
        LinearProgressIndicator(
          value: (_step + 1) / 3,
          color: _kRed,
          backgroundColor: _kRed.withValues(alpha: 0.15),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Step ${_step + 1} of 3',
                  style: const TextStyle(color: AppColors.hackberry, fontSize: 13)),
              const SizedBox(height: 6),
              if (_draftRestored) ...[
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF4EFE7),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE6D6BF)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.save_outlined, size: 18, color: _kRed),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Saved host application draft restored on this device.',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    TextButton(onPressed: _discardDraft, child: const Text('Discard')),
                  ]),
                ),
              ],

              // Step 1 — Personal Info
              if (_step == 0) ...[
                const Text('Personal Information',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
                const SizedBox(height: 4),
                const Text('Tell us a little about yourself.',
                    style: TextStyle(color: AppColors.foggy)),
                const SizedBox(height: 20),
                _ValidatedField(ctrl: _nameCtrl, label: 'Full Name', required: true),
                _ValidatedField(ctrl: _phoneCtrl, label: 'Phone Number',
                    inputType: TextInputType.phone, required: true),
                _ValidatedField(
                  ctrl: _aboutCtrl, label: 'About You', maxLines: 4, required: false,
                  hint: 'Tell guests about your background and what makes you a great host...',
                ),
              ],

              // Step 2 — Service Types
              if (_step == 1) ...[
                const Text('What will you offer?',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
                const SizedBox(height: 4),
                const Text('Select all service types you plan to provide.',
                    style: TextStyle(color: AppColors.foggy)),
                const SizedBox(height: 20),
                ..._kServiceOptions.map((item) {
                  final (value, icon, title, subtitle) = item;
                  final selected = _serviceTypes.contains(value);
                  return GestureDetector(
                    onTap: () => setState(() {
                      if (selected) { _serviceTypes.remove(value); }
                      else { _serviceTypes.add(value); }
                      _scheduleDraftSave();
                    }),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: selected ? _kRed.withValues(alpha: 0.06) : AppColors.surface,
                        border: Border.all(color: selected ? _kRed : const Color(0xFFE0E0E0), width: selected ? 2 : 1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(children: [
                        Icon(icon, color: selected ? _kRed : AppColors.foggy),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: selected ? _kRed : AppColors.black)),
                          Text(subtitle, style: const TextStyle(color: AppColors.foggy, fontSize: 12)),
                        ])),
                        if (selected) const Icon(Icons.check_circle, color: _kRed, size: 20),
                      ]),
                    ),
                  );
                }),
                if (_serviceTypes.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 4),
                    child: Text('Please select at least one service type.',
                        style: TextStyle(color: Colors.red, fontSize: 12)),
                  ),
              ],

              // Step 3 — Verification
              if (_step == 2) ...[
                const Text('Identity Verification',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
                const SizedBox(height: 4),
                const Text('We need to verify your identity to activate your host account.',
                    style: TextStyle(color: AppColors.foggy)),
                const SizedBox(height: 20),
                _ValidatedField(ctrl: _nationalIdCtrl, label: 'National ID Number', required: true),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    border: Border.all(color: Colors.amber.shade200),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(children: [
                    const Icon(Icons.info_outline, size: 18, color: Colors.amber),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Please have a clear photo of your National ID / Passport and a selfie ready. Our team will contact you for document verification.',
                        style: TextStyle(color: Colors.amber.shade900, fontSize: 13, height: 1.4),
                      ),
                    ),
                  ]),
                ),
              ],
            ]),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Row(children: [
            if (_step > 0)
              Expanded(child: OutlinedButton(
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: () => setState(() {
                  _step -= 1;
                  _scheduleDraftSave();
                }),
                child: const Text('Back'),
              )),
            if (_step > 0) const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                    backgroundColor: _kRed, foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                onPressed: _submitting ? null : () {
                  if (_step == 1 && _serviceTypes.isEmpty) return; // guard: must pick at least one
                  if (_step < 2) {
                    setState(() {
                      _step += 1;
                      _scheduleDraftSave();
                    });
                  }
                  else { _submit(); }
                },
                child: _submitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(_step < 2 ? 'Continue' : 'Submit Application'),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({required this.alreadySubmitted});
  final bool alreadySubmitted;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.check_circle_outline, size: 72, color: Colors.green),
        const SizedBox(height: 20),
        Text(
          alreadySubmitted ? 'Application Already Submitted' : 'Application Sent!',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          alreadySubmitted
              ? 'Your host application is under review. We\'ll notify you once it\'s approved.'
              : 'Thank you for applying! Our team will review your application and get back to you within 2–3 business days.',
          style: const TextStyle(color: AppColors.foggy, fontSize: 15, height: 1.5),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: _kRed, foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            onPressed: () => Navigator.pop(context),
            child: const Text('Back to Profile'),
          ),
        ),
      ]),
    ),
  );
}

class _ValidatedField extends StatelessWidget {
  const _ValidatedField({
    required this.ctrl, required this.label,
    this.inputType = TextInputType.text, this.maxLines = 1,
    this.hint, this.required = true,
  });
  final TextEditingController ctrl;
  final String label;
  final TextInputType inputType;
  final int maxLines;
  final String? hint;
  final bool required;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: TextFormField(
      controller: ctrl,
      keyboardType: inputType,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      validator: required
          ? (v) => (v == null || v.trim().isEmpty) ? 'Please enter $label' : null
          : null,
    ),
  );
}
