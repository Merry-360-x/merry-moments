import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../services/cloudinary_service.dart';
import '../widgets/host_creation_scaffold.dart';

const _kRed = AppColors.rausch;

const _kTourPkgCurrencies = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];

class TourPackageWizardScreen extends StatefulWidget {
  const TourPackageWizardScreen({
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
  State<TourPackageWizardScreen> createState() => _TourPackageWizardScreenState();
}

class _TourPackageWizardScreenState extends State<TourPackageWizardScreen> {
  int _step = 1;
  static const _totalSteps = 4;
  static const _stepTitles = ['Basic Info', 'Itinerary', 'Pricing', 'Media & Review'];

  bool _saving = false;
  bool _uploading = false;
  String? _error;

  // ── Step 1: Basic Info ──
  final _titleCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _countryCtrl = TextEditingController();
  final _categoryCtrl = TextEditingController();
  final _durationCtrl = TextEditingController(text: '1');
  final _maxGuestsCtrl = TextEditingController(text: '2');
  final _descCtrl = TextEditingController();

  // ── Step 2: Itinerary ──
  final _itineraryCtrl = TextEditingController();

  // ── Step 3: Pricing ──
  String _currency = 'RWF';
  final _priceAdultCtrl = TextEditingController();
  final _priceChildCtrl = TextEditingController();

  // ── Step 4: Media & Review ──
  String? _coverImageUrl;
  final List<String> _galleryUrls = [];
  final List<XFile> _newGalleryFiles = [];
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _titleCtrl.text = (e['title'] ?? '').toString();
      _cityCtrl.text = (e['city'] ?? '').toString();
      _countryCtrl.text = (e['country'] ?? '').toString();
      _categoryCtrl.text = (e['category'] ?? '').toString();
      _durationCtrl.text = (e['duration'] ?? e['duration_days'] ?? 1).toString();
      _maxGuestsCtrl.text = (e['max_guests'] ?? e['maxParticipants'] ?? 2).toString();
      _descCtrl.text = (e['description'] ?? '').toString();

      final pricingTiers = e['pricing_tiers'];
      if (pricingTiers is Map) {
        _itineraryCtrl.text = (pricingTiers['itinerary'] ?? pricingTiers['itinerary_text'] ?? '').toString();
      }

      _currency = (e['currency'] ?? 'RWF').toString();
      _priceAdultCtrl.text = (e['price_per_adult'] ?? e['price_per_person'] ?? '').toString();
      _priceChildCtrl.text = (e['price_per_child'] ?? '').toString();
    } else if (widget.seedTitle?.trim().isNotEmpty ?? false) {
      _titleCtrl.text = widget.seedTitle!.trim();
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _cityCtrl.dispose();
    _countryCtrl.dispose();
    _categoryCtrl.dispose();
    _durationCtrl.dispose();
    _maxGuestsCtrl.dispose();
    _descCtrl.dispose();
    _itineraryCtrl.dispose();
    _priceAdultCtrl.dispose();
    _priceChildCtrl.dispose();
    super.dispose();
  }

  bool get _canProceed {
    switch (_step) {
      case 1:
        return _titleCtrl.text.trim().length >= 3 &&
            _cityCtrl.text.trim().isNotEmpty &&
            _countryCtrl.text.trim().isNotEmpty;
      case 2:
        return _itineraryCtrl.text.trim().length >= 20;
      case 3:
        return double.tryParse(_priceAdultCtrl.text.trim()) != null;
      case 4:
        return true;
      default:
        return true;
    }
  }

  void _goBack() {
    if (_step > 1) {
      setState(() => _step--);
    } else {
      Navigator.pop(context);
    }
  }

  void _goNext() {
    if (_canProceed && _step < _totalSteps) setState(() => _step++);
  }

  Future<void> _pickCover() async {
    final img = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (img == null) return;
    setState(() { _uploading = true; });
    try {
      final urls = await CloudinaryService.uploadImages([img.path], folder: 'tour-packages');
      if (urls.isNotEmpty) setState(() => _coverImageUrl = urls.first);
    } finally {
      if (mounted) setState(() { _uploading = false; });
    }
  }

  Future<void> _pickGallery() async {
    final imgs = await _picker.pickMultiImage(imageQuality: 85);
    if (imgs.isEmpty) return;
    setState(() => _newGalleryFiles.addAll(imgs));
  }

  Future<void> _submit() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final uploadedGalleryUrls = <String>[];
      if (_newGalleryFiles.isNotEmpty) {
        setState(() => _uploading = true);
        final newUrls = await CloudinaryService.uploadImages(
          _newGalleryFiles.map((f) => f.path).toList(),
          folder: 'tour-packages',
        );
        uploadedGalleryUrls.addAll(newUrls);
      }

      final gallery = [..._galleryUrls, ...uploadedGalleryUrls];
      setState(() => _uploading = false);

      final pricingTiers = <String, dynamic>{
        'itinerary': _itineraryCtrl.text.trim(),
        if (_priceChildCtrl.text.trim().isNotEmpty)
          'price_per_child': double.tryParse(_priceChildCtrl.text.trim()),
      };

      final fields = <String, dynamic>{
        'title': _titleCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'country': _countryCtrl.text.trim(),
        if (_categoryCtrl.text.trim().isNotEmpty) 'category': _categoryCtrl.text.trim(),
        'duration': int.tryParse(_durationCtrl.text.trim()) ?? 1,
        'max_guests': int.tryParse(_maxGuestsCtrl.text.trim()) ?? 2,
        if (_descCtrl.text.trim().isNotEmpty) 'description': _descCtrl.text.trim(),
        'currency': _currency,
        'price_per_adult': double.tryParse(_priceAdultCtrl.text.trim()) ?? 0,
        'pricing_tiers': pricingTiers,
        if ((_coverImageUrl ?? '').trim().isNotEmpty) 'cover_image': _coverImageUrl,
        if (gallery.isNotEmpty) 'gallery_images': gallery,
      };

      final e = widget.existing;
      if (e != null && (e['id'] ?? '').toString().isNotEmpty) {
        await widget.api.updateTourPackage(id: e['id'].toString(), updates: fields);
      } else {
        await widget.api.createTourPackage(userId: widget.userId, fields: fields);
      }

      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
          _uploading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditMode = widget.existing != null;

    return HostCreationScaffold(
      title: isEditMode ? 'Edit Tour Package' : 'Create Tour Package',
      subtitle: isEditMode
          ? 'Update your tour package details'
          : 'Fill in the details to create your package',
      step: _step,
      totalSteps: _totalSteps,
      stepTitle: _stepTitles[_step - 1],
      onBack: _goBack,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
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
      bottomNav: _WizardBottomNav(
        step: _step,
        totalSteps: _totalSteps,
        canProceed: _canProceed,
        saving: _saving,
        onNext: _goNext,
        onSubmit: _submit,
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 1:
        return _stepBasic();
      case 2:
        return _stepItinerary();
      case 3:
        return _stepPricing();
      case 4:
        return _stepMediaReview();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _stepBasic() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepHeader(
          icon: Icons.article_outlined,
          title: 'Basic information',
          subtitle: 'Name, location, and overview',
        ),
        const SizedBox(height: 24),
        _Field(ctrl: _titleCtrl, label: 'Package Title', hint: 'e.g. 3-Day Volcanoes Adventure', onChanged: (_) => setState(() {})),
        _Field(ctrl: _descCtrl, label: 'Description', hint: 'Describe what’s included…', maxLines: 4),
        Row(
          children: [
            Expanded(child: _Field(ctrl: _cityCtrl, label: 'City', hint: 'e.g. Musanze', onChanged: (_) => setState(() {}))),
            const SizedBox(width: 10),
            Expanded(child: _Field(ctrl: _countryCtrl, label: 'Country', hint: 'e.g. Rwanda', onChanged: (_) => setState(() {}))),
          ],
        ),
        _Field(ctrl: _categoryCtrl, label: 'Category', hint: 'Optional'),
        Row(
          children: [
            Expanded(child: _Field(ctrl: _durationCtrl, label: 'Duration (days)', hint: '1', inputType: TextInputType.number)),
            const SizedBox(width: 10),
            Expanded(child: _Field(ctrl: _maxGuestsCtrl, label: 'Max Guests', hint: '2', inputType: TextInputType.number)),
          ],
        ),
      ],
    );
  }

  Widget _stepItinerary() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepHeader(
          icon: Icons.map_outlined,
          title: 'Itinerary',
          subtitle: 'Outline the day-by-day plan (min 20 chars)',
        ),
        const SizedBox(height: 24),
        _Field(
          ctrl: _itineraryCtrl,
          label: 'Itinerary',
          hint: 'Day 1: ...\nDay 2: ...\nDay 3: ...',
          maxLines: 8,
          onChanged: (_) => setState(() {}),
        ),
      ],
    );
  }

  Widget _stepPricing() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepHeader(
          icon: Icons.monetization_on_outlined,
          title: 'Pricing',
          subtitle: 'Set your prices and currency',
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: _Field(
                ctrl: _priceAdultCtrl,
                label: 'Price per adult',
                hint: '0',
                inputType: TextInputType.number,
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(width: 10),
            SizedBox(
              width: 110,
              child: _Dropdown<String>(
                label: 'Currency',
                value: _currency,
                items: _kTourPkgCurrencies,
                onChanged: (v) => setState(() => _currency = v ?? _currency),
              ),
            ),
          ],
        ),
        _Field(
          ctrl: _priceChildCtrl,
          label: 'Price per child (optional)',
          hint: '0',
          inputType: TextInputType.number,
        ),
      ],
    );
  }

  Widget _stepMediaReview() {
    final totalImages = (_coverImageUrl == null ? 0 : 1) + _galleryUrls.length + _newGalleryFiles.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepHeader(
          icon: Icons.photo_camera_outlined,
          title: 'Media & review',
          subtitle: 'Add photos and double-check details',
        ),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: _uploading ? null : _pickCover,
          icon: const Icon(Icons.image_outlined),
          label: Text(_coverImageUrl == null ? 'Upload cover image' : 'Replace cover image'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.black,
            side: BorderSide(color: Colors.grey.shade300),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _pickGallery,
          icon: const Icon(Icons.photo_library_outlined),
          label: const Text('Add gallery images'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.black,
            side: BorderSide(color: Colors.grey.shade300),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
        const SizedBox(height: 16),
        _ReviewCard(children: [
          _ReviewRow(label: 'Title', value: _titleCtrl.text.trim()),
          _ReviewRow(label: 'Location', value: '${_cityCtrl.text.trim()}, ${_countryCtrl.text.trim()}'),
          _ReviewRow(label: 'Duration', value: '${_durationCtrl.text.trim()} day(s)'),
          _ReviewRow(label: 'Max guests', value: _maxGuestsCtrl.text.trim()),
          _ReviewRow(label: 'Price', value: '$_currency ${_priceAdultCtrl.text.trim()}'),
          _ReviewRow(label: 'Images', value: '$totalImages added'),
        ]),
        if (_uploading) ...[
          const SizedBox(height: 16),
          const LinearProgressIndicator(color: _kRed),
          const SizedBox(height: 8),
          const Center(child: Text('Uploading…', style: TextStyle(fontSize: 13, color: AppColors.foggy))),
        ],
      ],
    );
  }
}

class _WizardBottomNav extends StatelessWidget {
  const _WizardBottomNav({
    required this.step,
    required this.totalSteps,
    required this.canProceed,
    required this.saving,
    required this.onNext,
    required this.onSubmit,
  });

  final int step;
  final int totalSteps;
  final bool canProceed;
  final bool saving;
  final VoidCallback onNext;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: step < totalSteps && canProceed && !saving ? onNext : null,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.black,
                side: BorderSide(color: Colors.grey.shade300),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(step < totalSteps ? 'Next' : 'Review'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: step == totalSteps && canProceed && !saving ? () => onSubmit() : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: _kRed,
                foregroundColor: AppColors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: saving ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Save'),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.icon, required this.title, required this.subtitle});
  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: _kRed.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: _kRed),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
            ],
          ),
        ),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.ctrl,
    required this.label,
    required this.hint,
    this.maxLines = 1,
    this.inputType,
    this.onChanged,
  });

  final TextEditingController ctrl;
  final String label;
  final String hint;
  final int maxLines;
  final TextInputType? inputType;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextField(
            controller: ctrl,
            onChanged: onChanged,
            keyboardType: inputType,
            maxLines: maxLines,
            decoration: InputDecoration(
              hintText: hint,
              filled: true,
              fillColor: Colors.grey.shade50,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Dropdown<T> extends StatelessWidget {
  const _Dropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final T value;
  final List<T> items;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        DropdownButtonFormField<T>(
          initialValue: value,
          items: items.map((c) => DropdownMenuItem<T>(value: c, child: Text(c.toString()))).toList(),
          onChanged: onChanged,
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.grey.shade50,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
          ),
        ),
      ],
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(14),
        color: AppColors.surface,
      ),
      child: Column(children: children),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.foggy))),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              value.isEmpty ? '—' : value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
