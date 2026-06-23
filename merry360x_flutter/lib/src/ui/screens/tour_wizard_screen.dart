import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../utils/error_handler.dart';
import '../utils/app_snackbar.dart';
import '../widgets/cloudinary_image_picker.dart';
import '../widgets/host_creation_scaffold.dart';

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
    this.seedTitle,
  });

  final AppDatabase api;
  final String userId;
  final Map<String, dynamic>? existing;
  final String? seedTitle;

  @override
  State<TourWizardScreen> createState() => _TourWizardScreenState();
}

class _TourWizardScreenState extends State<TourWizardScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleCtrl;
  late final TextEditingController _locCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _activitiesCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _citizenPriceCtrl;
  late final TextEditingController _eaPriceCtrl;
  late final TextEditingController _foreignPriceCtrl;

  int _step = 1;
  int _durationDays = 1;
  int _maxParticipants = 1;
  String _currency = _kCurrencies.first;
  String _pricingModel = _kPricingModels.first;
  bool _hasDifferentialPricing = false;
  final Set<String> _categories = <String>{};
  List<String> _uploadedImageUrls = [];
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final ex = widget.existing;
    final seed = (widget.seedTitle?.trim().isNotEmpty ?? false) ? widget.seedTitle!.trim() : null;
    _titleCtrl = TextEditingController(text: ex?['title']?.toString() ?? (seed ?? ''));
    _locCtrl = TextEditingController(text: ex?['location']?.toString() ?? '');
    _descCtrl = TextEditingController(text: ex?['description']?.toString() ?? '');
    _activitiesCtrl = TextEditingController(text: ex?['activities']?.toString() ?? '');
    _priceCtrl = TextEditingController(text: (ex?['price'] ?? ex?['base_price'])?.toString() ?? '');
    _citizenPriceCtrl = TextEditingController(text: ex?['citizens_price']?.toString() ?? '');
    _eaPriceCtrl = TextEditingController(text: ex?['east_african_price']?.toString() ?? '');
    _foreignPriceCtrl = TextEditingController(text: ex?['foreigners_price']?.toString() ?? '');

    _durationDays = (ex?['duration_days'] as int?) ?? (ex?['duration'] as int?) ?? 1;
    _maxParticipants = (ex?['max_participants'] as int?) ?? (ex?['max_guests'] as int?) ?? 1;
    _currency = (ex?['currency']?.toString() ?? _currency);
    _pricingModel = (ex?['pricing_model']?.toString() ?? _pricingModel);

    final cats = ex?['categories'];
    if (cats is List) {
      _categories.addAll(cats.map((e) => e.toString()));
    } else if (cats is String && cats.trim().isNotEmpty) {
      _categories.addAll(cats.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty));
    }

    final images = ex?['images'] ?? ex?['gallery_urls'] ?? ex?['image_urls'];
    if (images is List) {
      _uploadedImageUrls = images.map((e) => e.toString()).toList();
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _locCtrl.dispose();
    _descCtrl.dispose();
    _activitiesCtrl.dispose();
    _priceCtrl.dispose();
    _citizenPriceCtrl.dispose();
    _eaPriceCtrl.dispose();
    _foreignPriceCtrl.dispose();
    super.dispose();
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
        selectedColor: AppColors.black.withValues(alpha: 0.06),
        checkmarkColor: AppColors.black,
        onSelected: (sel) => setState(() {
          if (sel) {
            _categories.add(c);
          } else {
            _categories.remove(c);
          }
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
      value: _hasDifferentialPricing, activeThumbColor: _kRed,
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
    const SizedBox(height: 20),
    CloudinaryImagePicker(
      folder: 'tours',
      uploadedUrls: _uploadedImageUrls,
      onChanged: (urls) => setState(() => _uploadedImageUrls = List<String>.from(urls)),
      hint: 'Show travelers what your tour looks like',
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
      _TReviewRow(label: 'Photos', value: '${_uploadedImageUrls.length} uploaded'),
    ]),
  ]);

  bool get _canProceed {
    if (_submitting) return false;
    switch (_step) {
      case 1:
        return _titleCtrl.text.trim().isNotEmpty &&
            _locCtrl.text.trim().isNotEmpty &&
            _descCtrl.text.trim().isNotEmpty;
      case 2:
        return double.tryParse(_priceCtrl.text.trim()) != null;
      case 3:
        return _uploadedImageUrls.isNotEmpty;
      case 4:
        return true;
      default:
        return false;
    }
  }

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final allImages = List<String>.from(_uploadedImageUrls);
      final fields = <String, dynamic>{
        'is_published': true,
        'title': _titleCtrl.text.trim(),
        'location': _locCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'activities': _activitiesCtrl.text.trim(),
        'duration_days': _durationDays,
        'max_participants': _maxParticipants,
        'categories': _categories.toList(),
        'pricing_model': _pricingModel,
        'currency': _currency,
        'price': double.tryParse(_priceCtrl.text.trim()),
        'images': allImages,
        'citizens_price': _hasDifferentialPricing ? double.tryParse(_citizenPriceCtrl.text.trim()) : null,
        'east_african_price': _hasDifferentialPricing ? double.tryParse(_eaPriceCtrl.text.trim()) : null,
        'foreigners_price': _hasDifferentialPricing ? double.tryParse(_foreignPriceCtrl.text.trim()) : null,
      };

      final ex = widget.existing;
      if (ex != null && (ex['id'] != null)) {
        await widget.api.updateTour(id: ex['id'].toString(), updates: fields);
      } else {
        await widget.api.createTour(userId: widget.userId, fields: fields);
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      final friendlyMsg = ErrorHandler.formatPublishError(e);
      setState(() => _error = friendlyMsg);
      AppSnackBar.error(context, friendlyMsg);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const stepTitles = ['Basic Info', 'Pricing', 'Media', 'Review'];
    return HostCreationScaffold(
      title: widget.existing == null ? 'Create Tour' : 'Edit Tour',
      subtitle: 'Step-by-step',
      step: _step,
      totalSteps: stepTitles.length,
      stepTitle: stepTitles[_step - 1],
      onBack: () {
        if (_step > 1) {
          setState(() => _step -= 1);
        } else {
          Navigator.of(context).maybePop();
        }
      },
      bottomNav: _TourBottomNav(
        step: _step,
        totalSteps: stepTitles.length,
        canProceed: _canProceed,
        saving: _submitting,
        onNext: () => setState(() => _step = (_step + 1).clamp(1, stepTitles.length)),
        onSubmit: _submit,
      ),
      body: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_error != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  border: Border.all(color: Colors.red.shade200),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
              ),
              const SizedBox(height: 12),
            ],
            _buildStep(),
          ],
        ),
      ),
    );
  }
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
      color: AppColors.surface,
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
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      Container(
        width: 40, height: 40,
        decoration: BoxDecoration(
          color: _kRed.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, size: 22, color: _kRed),
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
        ]),
      ),
    ],
  );
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
      initialValue: value,
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
      color: AppColors.surface,
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
      Text(label, style: const TextStyle(color: AppColors.foggy, fontSize: 13)),
      const Spacer(),
      Flexible(child: Text(value.isEmpty ? '—' : value,
          textAlign: TextAlign.end,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
    ]),
  );
}
