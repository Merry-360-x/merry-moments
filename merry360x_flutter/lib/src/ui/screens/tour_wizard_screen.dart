import 'dart:io';

import 'package:flutter/material.dart';

import '../../app.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/cloudinary_service.dart';
import '../../services/mobile_api.dart';

const _kRed = AppColors.rausch;

const _kTourCategories = [
  'Adventure', 'Cultural', 'Wildlife', 'Beach', 'Historical',
  'Food & Drink', 'City Tour', 'Hiking',
];
const _kCurrencies = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];
const _kPricingModels = ['per_person', 'per_group', 'flat_rate'];

class TourWizardScreen extends StatefulWidget {
  const TourWizardScreen({
    super.key,
    required this.api,
    required this.userId,
    this.existing,
  });

  final MobileApi api;
  final String userId;
  final Map<String, dynamic>? existing;

  @override
  State<TourWizardScreen> createState() => _TourWizardScreenState();
}

class _TourWizardScreenState extends State<TourWizardScreen> {
  int _step = 1;
  static const _totalSteps = 4;
  static const _stepTitles = ['Basic Info', 'Pricing', 'Media', 'Review'];

  bool _saving = false;
  bool _uploading = false;

  // ── Step 1: Basic Info ──
  final _titleCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _activitiesCtrl = TextEditingController();
  int _durationDays = 1;
  int _maxParticipants = 10;
  List<String> _categories = [];

  // ── Step 2: Pricing ──
  String _pricingModel = 'per_person';
  String _currency = 'RWF';
  final _priceCtrl = TextEditingController();
  bool _hasDifferentialPricing = false;
  final _citizenPriceCtrl = TextEditingController();
  final _eaPriceCtrl = TextEditingController();
  final _foreignPriceCtrl = TextEditingController();

  // ── Step 3: Media ──
  List<String> _existingUrls = [];
  List<XFile> _newFiles = [];
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _titleCtrl.text = e['title'] ?? '';
      _locCtrl.text = e['location'] ?? '';
      _descCtrl.text = e['description'] ?? '';
      _activitiesCtrl.text = e['optional_activities'] ?? '';
      _durationDays = (e['duration_days'] as num?)?.toInt() ?? 1;
      _maxParticipants = (e['max_participants'] as num?)?.toInt() ?? 10;
      _categories = List<String>.from(e['categories'] as List? ?? []);
      _pricingModel = e['pricing_model'] ?? 'per_person';
      _currency = e['currency'] ?? 'RWF';
      _priceCtrl.text = e['price_per_person'] != null ? e['price_per_person'].toString() : '';
      _hasDifferentialPricing = e['has_differential_pricing'] == true;
      _citizenPriceCtrl.text = e['price_for_citizens'] != null ? e['price_for_citizens'].toString() : '';
      _eaPriceCtrl.text = e['price_for_east_africans'] != null ? e['price_for_east_africans'].toString() : '';
      _foreignPriceCtrl.text = e['price_for_foreigners'] != null ? e['price_for_foreigners'].toString() : '';
      _existingUrls = List<String>.from(e['images'] as List? ?? []);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose(); _locCtrl.dispose(); _descCtrl.dispose(); _activitiesCtrl.dispose();
    _priceCtrl.dispose(); _citizenPriceCtrl.dispose(); _eaPriceCtrl.dispose(); _foreignPriceCtrl.dispose();
    super.dispose();
  }

  bool get _canProceed {
    switch (_step) {
      case 1: return _titleCtrl.text.trim().length >= 3 && _locCtrl.text.trim().isNotEmpty;
      case 2: return double.tryParse(_priceCtrl.text.trim()) != null;
      case 3: return true;
      default: return true;
    }
  }

  void _goBack() {
    if (_step > 1) setState(() => _step--);
    else Navigator.pop(context);
  }

  void _goNext() {
    if (_canProceed && _step < _totalSteps) setState(() => _step++);
  }

  Future<void> _submit() async {
    setState(() { _saving = true; _uploading = true; });
    final newUrls = await CloudinaryService.uploadImages(
      _newFiles.map((f) => f.path).toList(),
      folder: 'tours',
    );
    final allImages = [..._existingUrls, ...newUrls];
    setState(() => _uploading = false);

    final fields = <String, dynamic>{
      'title': _titleCtrl.text.trim(),
      'location': _locCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'optional_activities': _activitiesCtrl.text.trim(),
      'duration_days': _durationDays,
      'max_participants': _maxParticipants,
      'categories': _categories,
      'pricing_model': _pricingModel,
      'currency': _currency,
      'price_per_person': double.tryParse(_priceCtrl.text.trim()) ?? 0,
      'has_differential_pricing': _hasDifferentialPricing,
      if (_hasDifferentialPricing) ...{
        'price_for_citizens': double.tryParse(_citizenPriceCtrl.text.trim()),
        'price_for_east_africans': double.tryParse(_eaPriceCtrl.text.trim()),
        'price_for_foreigners': double.tryParse(_foreignPriceCtrl.text.trim()),
      },
      if (allImages.isNotEmpty) 'images': allImages,
      if (allImages.isNotEmpty) 'main_image': allImages.first,
    };

    final e = widget.existing;
    if (e != null) {
      await widget.api.updateTour(id: e['id'], updates: fields);
    } else {
      await widget.api.createTour(userId: widget.userId, fields: fields);
    }

    setState(() => _saving = false);
    if (mounted) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(children: [
              GestureDetector(
                onTap: _goBack,
                child: Row(children: [
                  const Icon(Icons.chevron_left, size: 22, color: Colors.black54),
                  Text(_step > 1 ? 'Back' : 'Cancel',
                      style: const TextStyle(fontSize: 14, color: Colors.black54)),
                ]),
              ),
              Expanded(
                child: Column(children: [
                  Text(widget.existing == null ? 'Create a Tour' : 'Edit Tour',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  Text('Step $_step of $_totalSteps: ${_stepTitles[_step - 1]}',
                      style: const TextStyle(fontSize: 12, color: Colors.black45)),
                ]),
              ),
              const SizedBox(width: 60),
            ]),
          ),
          LinearProgressIndicator(
            value: _step / _totalSteps,
            backgroundColor: Colors.grey.shade200,
            valueColor: const AlwaysStoppedAnimation<Color>(_kRed),
            minHeight: 3,
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: _buildStep(),
            ),
          ),
          _TourBottomNav(
            step: _step,
            totalSteps: _totalSteps,
            canProceed: _canProceed,
            saving: _saving,
            onNext: _goNext,
            onSubmit: _submit,
          ),
        ]),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 1: return _buildStep1();
      case 2: return _buildStep2();
      case 3: return _buildStep3();
      case 4: return _buildStep4();
      default: return const SizedBox();
    }
  }

  // ── Step 1: Basic Info ──
  Widget _buildStep1() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _TStepHeader(icon: Icons.explore_outlined, title: 'Tell us about your tour', subtitle: 'Help travelers discover your experience'),
    const SizedBox(height: 24),

    _TWizField(ctrl: _titleCtrl, label: 'Tour Title', hint: 'e.g. Nyungwe Canopy Walk', onChanged: (_) => setState(() {})),
    _TWizField(ctrl: _locCtrl, label: 'Location', hint: 'e.g. Nyungwe Forest, Rwanda', onChanged: (_) => setState(() {})),
    _TWizField(ctrl: _descCtrl, label: 'Description', hint: 'Describe the experience…', maxLines: 4),
    _TWizField(ctrl: _activitiesCtrl, label: 'Optional Activities', hint: 'e.g. Bird watching, swimming', maxLines: 2),

    const SizedBox(height: 8),
    _TCountRow(label: 'Duration (days)', value: _durationDays,
      onDec: () => setState(() => _durationDays = (_durationDays - 1).clamp(1, 30)),
      onInc: () => setState(() => _durationDays = (_durationDays + 1).clamp(1, 30))),
    _TCountRow(label: 'Max Participants', value: _maxParticipants,
      onDec: () => setState(() => _maxParticipants = (_maxParticipants - 1).clamp(1, 200)),
      onInc: () => setState(() => _maxParticipants = (_maxParticipants + 1).clamp(1, 200))),

    const SizedBox(height: 16),
    const Text('Categories', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    const SizedBox(height: 8),
    Wrap(
      spacing: 8, runSpacing: 8,
      children: _kTourCategories.map((c) => FilterChip(
        label: Text(c, style: const TextStyle(fontSize: 12)),
        selected: _categories.contains(c),
        selectedColor: _kRed.withValues(alpha: 0.15),
        checkmarkColor: _kRed,
        onSelected: (sel) => setState(() {
          if (sel) _categories.add(c); else _categories.remove(c);
        }),
      )).toList(),
    ),
  ]);

  // ── Step 2: Pricing ──
  Widget _buildStep2() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _TStepHeader(icon: Icons.monetization_on_outlined, title: 'Set your pricing', subtitle: 'Choose how you charge for your tour'),
    const SizedBox(height: 24),

    _TWizDropdown<String>(
      label: 'Pricing Model',
      value: _pricingModel,
      items: _kPricingModels,
      itemLabel: (p) => p.replaceAll('_', ' ').split(' ').map((w) => w[0].toUpperCase() + w.substring(1)).join(' '),
      onChanged: (v) => setState(() => _pricingModel = v ?? _pricingModel),
    ),
    Row(children: [
      Expanded(child: _TWizField(
        ctrl: _priceCtrl,
        label: 'Base Price',
        hint: '0',
        inputType: TextInputType.number,
        onChanged: (_) => setState(() {}),
      )),
      const SizedBox(width: 10),
      SizedBox(width: 110, child: _TWizDropdown<String>(
        label: 'Currency',
        value: _currency,
        items: _kCurrencies,
        onChanged: (v) => setState(() => _currency = v ?? _currency),
      )),
    ]),

    SwitchListTile(
      dense: true, contentPadding: EdgeInsets.zero,
      title: const Text('Differential Pricing', style: TextStyle(fontSize: 14)),
      subtitle: const Text('Different rates for citizens, East Africans, foreigners', style: TextStyle(fontSize: 11)),
      value: _hasDifferentialPricing, activeColor: _kRed,
      onChanged: (v) => setState(() => _hasDifferentialPricing = v),
    ),

    if (_hasDifferentialPricing) ...[
      const SizedBox(height: 8),
      _TWizField(ctrl: _citizenPriceCtrl, label: 'Citizens Price', hint: '0', inputType: TextInputType.number),
      _TWizField(ctrl: _eaPriceCtrl, label: 'East African Price', hint: '0', inputType: TextInputType.number),
      _TWizField(ctrl: _foreignPriceCtrl, label: 'Foreign Price', hint: '0', inputType: TextInputType.number),
    ],
  ]);

  // ── Step 3: Media ──
  Widget _buildStep3() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _TStepHeader(icon: Icons.photo_camera_outlined, title: 'Add tour photos', subtitle: 'Show travelers what to expect'),
    const SizedBox(height: 24),

    Row(children: [
      Expanded(child: OutlinedButton.icon(
        onPressed: () async {
          final imgs = await _picker.pickMultiImage(imageQuality: 85);
          if (imgs.isNotEmpty) setState(() => _newFiles.addAll(imgs));
        },
        icon: const Icon(Icons.photo_library_outlined),
        label: const Text('Gallery'),
        style: OutlinedButton.styleFrom(
          foregroundColor: _kRed, side: const BorderSide(color: _kRed),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
      )),
      const SizedBox(width: 10),
      OutlinedButton(
        onPressed: () async {
          final img = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
          if (img != null) setState(() => _newFiles.add(img));
        },
        style: OutlinedButton.styleFrom(
          foregroundColor: _kRed, side: const BorderSide(color: _kRed),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
        ),
        child: const Icon(Icons.camera_alt_outlined),
      ),
    ]),
    const SizedBox(height: 16),

    if (_existingUrls.isEmpty && _newFiles.isEmpty)
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300, width: 2),
          borderRadius: BorderRadius.circular(16),
          color: Colors.grey.shade50,
        ),
        child: Column(children: [
          Icon(Icons.add_photo_alternate_outlined, size: 48, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          Text('No photos yet', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
        ]),
      )
    else
      GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8,
        ),
        itemCount: _existingUrls.length + _newFiles.length,
        itemBuilder: (ctx, i) {
          final isExisting = i < _existingUrls.length;
          return Stack(fit: StackFit.expand, children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: isExisting
                  ? Image.network(_existingUrls[i], fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade200))
                  : Image.file(File(_newFiles[i - _existingUrls.length].path), fit: BoxFit.cover),
            ),
            Positioned(
              top: 4, right: 4,
              child: GestureDetector(
                onTap: () => setState(() {
                  if (isExisting) _existingUrls.removeAt(i);
                  else _newFiles.removeAt(i - _existingUrls.length);
                }),
                child: Container(
                  width: 22, height: 22,
                  decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                  child: const Icon(Icons.close, size: 14, color: Colors.white),
                ),
              ),
            ),
          ]);
        },
      ),
  ]);

  // ── Step 4: Review ──
  Widget _buildStep4() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _TStepHeader(icon: Icons.check_circle_outline, title: "Almost there!", subtitle: 'Review your tour before saving'),
    const SizedBox(height: 24),

    _TReviewCard(children: [
      _TReviewRow(label: 'Title', value: _titleCtrl.text.trim()),
      _TReviewRow(label: 'Location', value: _locCtrl.text.trim()),
      _TReviewRow(label: 'Duration', value: '$_durationDays day${_durationDays == 1 ? '' : 's'}'),
      _TReviewRow(label: 'Max Participants', value: '$_maxParticipants'),
      _TReviewRow(label: 'Categories', value: _categories.isEmpty ? '—' : _categories.join(', ')),
    ]),
    const SizedBox(height: 12),
    _TReviewCard(children: [
      _TReviewRow(label: 'Pricing Model', value: _pricingModel.replaceAll('_', ' ')),
      _TReviewRow(label: 'Base Price', value: '$_currency ${_priceCtrl.text.trim()}'),
      _TReviewRow(label: 'Differential Pricing', value: _hasDifferentialPricing ? 'Enabled' : 'Disabled'),
    ]),
    const SizedBox(height: 12),
    _TReviewCard(children: [
      _TReviewRow(label: 'Photos', value: '${_existingUrls.length + _newFiles.length} selected'),
    ]),

    if (_uploading) ...[
      const SizedBox(height: 16),
      const LinearProgressIndicator(color: _kRed),
      const SizedBox(height: 8),
      const Center(child: Text('Uploading photos…', style: TextStyle(fontSize: 13, color: Colors.black54))),
    ],
  ]);
}

// ─── Tour-specific sub-widgets ──────────────────────────────────────────────

class _TourBottomNav extends StatelessWidget {
  const _TourBottomNav({
    required this.step, required this.totalSteps, required this.canProceed,
    required this.saving, required this.onNext, required this.onSubmit,
  });
  final int step, totalSteps;
  final bool canProceed, saving;
  final VoidCallback onNext;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: Color(0xFFEBEBEB))),
    ),
    child: SizedBox(
      width: double.infinity, height: 52,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: canProceed ? _kRed : Colors.grey.shade300,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        onPressed: saving ? null : (canProceed ? (step < totalSteps ? onNext : () { onSubmit(); }) : null),
        child: saving
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
            : Text(step < totalSteps ? 'Continue' : 'Create Tour',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
      ),
    ),
  );
}

class _TStepHeader extends StatelessWidget {
  const _TStepHeader({required this.icon, required this.title, required this.subtitle});
  final IconData icon;
  final String title, subtitle;

  @override
  Widget build(BuildContext context) => Column(children: [
    const SizedBox(height: 8),
    Icon(icon, size: 48, color: _kRed),
    const SizedBox(height: 14),
    Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
    const SizedBox(height: 6),
    Text(subtitle, style: const TextStyle(fontSize: 14, color: Colors.black45), textAlign: TextAlign.center),
  ]);
}

class _TWizField extends StatelessWidget {
  const _TWizField({
    required this.ctrl, required this.label, required this.hint,
    this.inputType = TextInputType.text, this.maxLines = 1, this.onChanged,
  });
  final TextEditingController ctrl;
  final String label, hint;
  final TextInputType inputType;
  final int maxLines;
  final void Function(String)? onChanged;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: TextField(
      controller: ctrl, keyboardType: inputType, maxLines: maxLines,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label, hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _kRed, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    ),
  );
}

class _TWizDropdown<T> extends StatelessWidget {
  const _TWizDropdown({
    required this.label, required this.value, required this.items,
    required this.onChanged, this.itemLabel,
  });
  final String label;
  final T value;
  final List<T> items;
  final void Function(T?) onChanged;
  final String Function(T)? itemLabel;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: DropdownButtonFormField<T>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _kRed, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
      items: items.map((i) => DropdownMenuItem<T>(
        value: i,
        child: Text(itemLabel != null ? itemLabel!(i) : i.toString(), style: const TextStyle(fontSize: 13)),
      )).toList(),
      onChanged: onChanged,
    ),
  );
}

class _TCountRow extends StatelessWidget {
  const _TCountRow({required this.label, required this.value, required this.onDec, required this.onInc});
  final String label;
  final int value;
  final VoidCallback onDec, onInc;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Expanded(child: Text(label, style: const TextStyle(fontSize: 15))),
      IconButton(icon: const Icon(Icons.remove_circle_outline, size: 22), onPressed: onDec, color: _kRed),
      SizedBox(width: 36, child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
      IconButton(icon: const Icon(Icons.add_circle_outline, size: 22), onPressed: onInc, color: _kRed),
    ]),
  );
}

class _TReviewCard extends StatelessWidget {
  const _TReviewCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Column(children: children),
  );
}

class _TReviewRow extends StatelessWidget {
  const _TReviewRow({required this.label, required this.value});
  final String label, value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(children: [
      Text(label, style: const TextStyle(color: Colors.black45, fontSize: 13)),
      const Spacer(),
      Flexible(child: Text(value.isEmpty ? '—' : value,
          textAlign: TextAlign.end,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
    ]),
  );
}
