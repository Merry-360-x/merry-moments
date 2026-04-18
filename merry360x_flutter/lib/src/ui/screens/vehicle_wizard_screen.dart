import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../app.dart';
import '../../services/cloudinary_service.dart';
import '../../services/app_database.dart';
import '../widgets/cloudinary_image_picker.dart';
import '../widgets/host_creation_scaffold.dart';

const _kRed = AppColors.rausch;

const _kCarBrands = [
  'Toyota', 'Suzuki', 'Hyundai', 'Kia', 'Nissan', 'Mazda', 'Honda',
  'Mitsubishi', 'Mercedes-Benz', 'BMW', 'Volkswagen', 'Audi', 'Ford',
  'Jeep', 'Land Rover', 'Subaru', 'Isuzu', 'Peugeot', 'Renault',
  'Citroën', 'Volvo', 'Lexus', 'Chevrolet', 'Dodge', 'BYD', 'Other',
];
const _kCarTypes = [
  'Sedan', 'Hatchback', 'SUV', 'Pickup Truck', 'Van', 'Minibus',
  'Bus', 'Coupe', 'Convertible', 'Wagon', 'Crossover', 'Sports',
];
const _kTransmissions = ['Automatic', 'Manual'];
const _kFuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const _kDrivetrains = ['FWD', 'RWD', '4WD', 'AWD'];
const _kCurrencies = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];
const _kKeyFeatures = [
  'GPS Navigation', 'Bluetooth', 'USB Charging', 'Air Conditioning',
  'Sunroof/Panoramic Roof', 'Cruise Control', 'Backup Camera',
  'Park Sensors', 'Heated Seats', 'Leather Seats', 'Luggage Rack',
  'Bull Bar', 'Winch', 'Roof Tent', 'Child Seat', 'Wi-Fi Hotspot',
  'Entertainment System', 'Dashcam', 'Extended Fuel Range', 'Recovery Kit',
];

class VehicleWizardScreen extends StatefulWidget {
  const VehicleWizardScreen({
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
  State<VehicleWizardScreen> createState() => _VehicleWizardScreenState();
}

class _VehicleWizardScreenState extends State<VehicleWizardScreen> {
  int _step = 1;
  static const _totalSteps = 5;
  static const _stepTitles = ['Vehicle', 'Pricing', 'Photos', 'Documents', 'Review'];

  bool _saving = false;
  String? _error;

  // ── Step 1: Basics ──
  String _carBrand = 'Toyota';
  final _carModelCtrl = TextEditingController();
  int _carYear = DateTime.now().year;
  String _carType = 'SUV';
  String _transmission = 'Automatic';
  String _fuelType = 'Petrol';
  String _driveTrain = 'FWD';
  int _seats = 5;
  bool _driverIncluded = false;
  final _providerCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  List<String> _keyFeatures = [];

  // ── Step 2: Media ──
  List<String> _uploadedImageUrls = [];
  bool _uploadingDoc = false;
  final _picker = ImagePicker();

  // ── Step 4: Documents ──
  String? _insuranceDocUrl;
  String? _registrationDocUrl;
  String? _roadworthinessDocUrl;
  String? _ownerIdDocUrl;

  // ── Step 3: Pricing ──
  final _dailyPriceCtrl = TextEditingController();
  final _weeklyPriceCtrl = TextEditingController();
  final _monthlyPriceCtrl = TextEditingController();
  String _currency = 'RWF';

  List<int> _yearOptions() {
    final currentYear = DateTime.now().year;
    return List.generate(currentYear - 1989, (i) => currentYear - i);
  }

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _carBrand = _kCarBrands.contains(e['car_brand']) ? e['car_brand'] as String : 'Toyota';
      _carModelCtrl.text = e['car_model'] ?? '';
      _carYear = (e['car_year'] as num?)?.toInt() ?? DateTime.now().year;
      _carType = _kCarTypes.contains(e['car_type']) ? e['car_type'] as String : 'SUV';
      _transmission = _kTransmissions.contains(e['transmission']) ? e['transmission'] as String : 'Automatic';
      _fuelType = _kFuelTypes.contains(e['fuel_type']) ? e['fuel_type'] as String : 'Petrol';
      _driveTrain = _kDrivetrains.contains(e['drive_train']) ? e['drive_train'] as String : 'FWD';
      _seats = (e['seats'] as num?)?.toInt() ?? 5;
      _driverIncluded = e['driver_included'] == true;
      _providerCtrl.text = e['provider_name'] ?? '';
      _descCtrl.text = e['description'] ?? '';
      _keyFeatures = List<String>.from(e['key_features'] as List? ?? []);
      _uploadedImageUrls = List<String>.from(e['images'] as List? ?? []);
      _dailyPriceCtrl.text = e['daily_price'] != null ? e['daily_price'].toString() : '';
      _weeklyPriceCtrl.text = e['weekly_price'] != null ? e['weekly_price'].toString() : '';
      _monthlyPriceCtrl.text = e['monthly_price'] != null ? e['monthly_price'].toString() : '';
      _currency = e['currency'] ?? 'RWF';
    } else if (widget.seedTitle?.trim().isNotEmpty ?? false) {
      _carModelCtrl.text = widget.seedTitle!.trim();
    }
  }

  @override
  void dispose() {
    _carModelCtrl.dispose(); _providerCtrl.dispose(); _descCtrl.dispose();
    _dailyPriceCtrl.dispose(); _weeklyPriceCtrl.dispose(); _monthlyPriceCtrl.dispose();
    super.dispose();
  }

  bool get _canProceed {
    switch (_step) {
      case 1: return _carModelCtrl.text.trim().isNotEmpty;
      case 2: return double.tryParse(_dailyPriceCtrl.text.trim()) != null;
      case 3: return true;
      case 4:
        return _insuranceDocUrl != null &&
            _registrationDocUrl != null &&
            _roadworthinessDocUrl != null &&
            _ownerIdDocUrl != null;
      default: return true;
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

  Future<void> _pickDoc({
    required String label,
    required void Function(String url) onUploaded,
  }) async {
    final file = await _picker.pickImage(source: ImageSource.gallery);
    if (file == null) return;

    setState(() { _uploadingDoc = true; });
    try {
      final urls = await CloudinaryService.uploadImages(
        [file.path],
        folder: 'transport-documents',
      );
      if (urls.isNotEmpty) {
        onUploaded(urls.first);
      }
    } finally {
      if (mounted) setState(() { _uploadingDoc = false; });
    }
  }

  Future<void> _submit() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final allImages = List<String>.from(_uploadedImageUrls);

      final fields = <String, dynamic>{
        'is_published': true,
        'car_brand': _carBrand,
        'car_model': _carModelCtrl.text.trim(),
        'car_year': _carYear,
        'car_type': _carType,
        'transmission': _transmission,
        'fuel_type': _fuelType,
        'drive_train': _driveTrain,
        'seats': _seats,
        'driver_included': _driverIncluded,
        'provider_name': _providerCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'key_features': _keyFeatures,
        'daily_price': double.tryParse(_dailyPriceCtrl.text.trim()) ?? 0,
        if (_weeklyPriceCtrl.text.trim().isNotEmpty)
          'weekly_price': double.tryParse(_weeklyPriceCtrl.text.trim()),
        if (_monthlyPriceCtrl.text.trim().isNotEmpty)
          'monthly_price': double.tryParse(_monthlyPriceCtrl.text.trim()),
        'currency': _currency,
        if (_insuranceDocUrl != null) 'insurance_document_url': _insuranceDocUrl,
        if (_registrationDocUrl != null) 'registration_document_url': _registrationDocUrl,
        if (_roadworthinessDocUrl != null) 'roadworthiness_certificate_url': _roadworthinessDocUrl,
        if (_ownerIdDocUrl != null) 'owner_identification_url': _ownerIdDocUrl,
        if (allImages.isNotEmpty) 'images': allImages,
        if (allImages.isNotEmpty) 'main_image': allImages.first,
      };

      final e = widget.existing;
      if (e != null) {
        await widget.api.updateTransport(id: e['id'], updates: fields);
      } else {
        await widget.api.createTransport(userId: widget.userId, fields: fields);
      }

      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditMode = widget.existing != null;
    return HostCreationScaffold(
      title: isEditMode ? 'Edit Transport' : 'Create Transport',
      subtitle: isEditMode
          ? 'Update your vehicle details'
          : 'Fill in the details to create your transport listing',
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
      bottomNav: _VehicleBottomNav(
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
        return _buildStepVehicle();
      case 2:
        return _buildStepPricing();
      case 3:
        return _buildStepPhotos();
      case 4:
        return _buildStepDocuments();
      case 5:
        return _buildStepReview();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildStepVehicle() => _buildStep1();
  Widget _buildStepPhotos() => _buildStep2();
  Widget _buildStepPricing() => _buildStep3();
  Widget _buildStepReview() => _buildStep4();

  Widget _buildStepDocuments() {
    Widget docRow({
      required String label,
      required String? url,
      required VoidCallback onPick,
    }) {
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
            Text(
              url == null ? 'Missing' : 'Added',
              style: TextStyle(
                fontSize: 12,
                color: url == null ? Colors.redAccent : Colors.green,
              ),
            ),
            const SizedBox(width: 10),
            OutlinedButton(
              onPressed: _uploadingDoc ? null : onPick,
              child: Text(url == null ? 'Upload' : 'Replace'),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Documents',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        const Text(
          'Upload required legal documents.',
          style: TextStyle(fontSize: 12, color: AppColors.foggy),
        ),
        const SizedBox(height: 16),
        docRow(
          label: 'Insurance document',
          url: _insuranceDocUrl,
          onPick: () => _pickDoc(
            label: 'Insurance document',
            onUploaded: (u) => setState(() => _insuranceDocUrl = u),
          ),
        ),
        docRow(
          label: 'Registration document',
          url: _registrationDocUrl,
          onPick: () => _pickDoc(
            label: 'Registration document',
            onUploaded: (u) => setState(() => _registrationDocUrl = u),
          ),
        ),
        docRow(
          label: 'Roadworthiness certificate',
          url: _roadworthinessDocUrl,
          onPick: () => _pickDoc(
            label: 'Roadworthiness certificate',
            onUploaded: (u) => setState(() => _roadworthinessDocUrl = u),
          ),
        ),
        docRow(
          label: 'Owner identification',
          url: _ownerIdDocUrl,
          onPick: () => _pickDoc(
            label: 'Owner identification',
            onUploaded: (u) => setState(() => _ownerIdDocUrl = u),
          ),
        ),
      ],
    );
  }

  // ── Step 1: Basics ──
  Widget _buildStep1() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _VStepHeader(icon: Icons.directions_car_outlined, title: "Tell us about your vehicle", subtitle: 'Provide the basic details'),
    const SizedBox(height: 24),

    _VWizDropdown<String>(
      label: 'Car Brand',
      value: _carBrand,
      items: _kCarBrands,
      onChanged: (v) => setState(() => _carBrand = v ?? _carBrand),
    ),
    _VWizField(ctrl: _carModelCtrl, label: 'Model', hint: 'e.g. Land Cruiser', onChanged: (_) => setState(() {})),
    _VWizDropdown<int>(
      label: 'Year',
      value: _carYear,
      items: _yearOptions(),
      onChanged: (v) => setState(() => _carYear = v ?? _carYear),
    ),

    Row(children: [
      Expanded(child: _VWizDropdown<String>(
        label: 'Car Type',
        value: _carType,
        items: _kCarTypes,
        onChanged: (v) => setState(() => _carType = v ?? _carType),
      )),
      const SizedBox(width: 10),
      Expanded(child: _VWizDropdown<String>(
        label: 'Transmission',
        value: _transmission,
        items: _kTransmissions,
        onChanged: (v) => setState(() => _transmission = v ?? _transmission),
      )),
    ]),
    Row(children: [
      Expanded(child: _VWizDropdown<String>(
        label: 'Fuel Type',
        value: _fuelType,
        items: _kFuelTypes,
        onChanged: (v) => setState(() => _fuelType = v ?? _fuelType),
      )),
      const SizedBox(width: 10),
      Expanded(child: _VWizDropdown<String>(
        label: 'Drive Train',
        value: _driveTrain,
        items: _kDrivetrains,
        onChanged: (v) => setState(() => _driveTrain = v ?? _driveTrain),
      )),
    ]),

    _VCountRow(label: 'Seats', value: _seats,
      onDec: () => setState(() => _seats = (_seats - 1).clamp(1, 60)),
      onInc: () => setState(() => _seats = (_seats + 1).clamp(1, 60))),

    SwitchListTile(
      dense: true, contentPadding: EdgeInsets.zero,
      title: const Text('Driver Included', style: TextStyle(fontSize: 14)),
      value: _driverIncluded, activeThumbColor: _kRed,
      onChanged: (v) => setState(() => _driverIncluded = v),
    ),

    _VWizField(ctrl: _providerCtrl, label: 'Provider / Agency Name', hint: 'Optional'),
    _VWizField(ctrl: _descCtrl, label: 'Description', hint: 'Describe your vehicle…', maxLines: 3),

    const SizedBox(height: 8),
    const Text('Key Features', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    const SizedBox(height: 8),
    Wrap(
      spacing: 8, runSpacing: 8,
      children: _kKeyFeatures.map((f) => FilterChip(
        label: Text(f, style: const TextStyle(fontSize: 12)),
        selected: _keyFeatures.contains(f),
        selectedColor: AppColors.black.withValues(alpha: 0.06),
        checkmarkColor: AppColors.black,
        onSelected: (sel) => setState(() {
          if (sel) {
            _keyFeatures.add(f);
          } else {
            _keyFeatures.remove(f);
          }
        }),
      )).toList(),
    ),
  ]);

  // ── Step 2: Media ──
  Widget _buildStep2() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _VStepHeader(icon: Icons.photo_camera_outlined, title: 'Add vehicle photos', subtitle: 'Help renters see what to expect'),
    const SizedBox(height: 20),
    CloudinaryImagePicker(
      folder: 'transport',
      uploadedUrls: _uploadedImageUrls,
      onChanged: (urls) => setState(() => _uploadedImageUrls = List<String>.from(urls)),
      hint: 'Show exterior, interior, and key features',
    ),
  ]);

  // ── Step 3: Pricing ──
  Widget _buildStep3() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _VStepHeader(icon: Icons.local_offer_outlined, title: 'Set your pricing', subtitle: 'How much do you charge per day?'),
    const SizedBox(height: 24),

    Row(children: [
      Expanded(child: _VWizField(
        ctrl: _dailyPriceCtrl,
        label: 'Daily Price *',
        hint: '0',
        inputType: TextInputType.number,
        onChanged: (_) => setState(() {}),
      )),
      const SizedBox(width: 10),
      SizedBox(width: 110, child: _VWizDropdown<String>(
        label: 'Currency',
        value: _currency,
        items: _kCurrencies,
        onChanged: (v) => setState(() => _currency = v ?? _currency),
      )),
    ]),
    _VWizField(ctrl: _weeklyPriceCtrl, label: 'Weekly Price (optional)', hint: '0', inputType: TextInputType.number),
    _VWizField(ctrl: _monthlyPriceCtrl, label: 'Monthly Price (optional)', hint: '0', inputType: TextInputType.number),
  ]);

  // ── Step 4: Review ──
  Widget _buildStep4() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _VStepHeader(icon: Icons.check_circle_outline, title: 'Ready to list!', subtitle: 'Review your vehicle details'),
    const SizedBox(height: 24),

    _VReviewCard(children: [
      _VReviewRow(label: 'Brand', value: _carBrand),
      _VReviewRow(label: 'Model', value: _carModelCtrl.text.trim()),
      _VReviewRow(label: 'Year', value: '$_carYear'),
      _VReviewRow(label: 'Type', value: _carType),
      _VReviewRow(label: 'Transmission', value: _transmission),
      _VReviewRow(label: 'Fuel', value: _fuelType),
      _VReviewRow(label: 'Drive Train', value: _driveTrain),
      _VReviewRow(label: 'Seats', value: '$_seats'),
      _VReviewRow(label: 'Driver Included', value: _driverIncluded ? 'Yes' : 'No'),
    ]),
    const SizedBox(height: 12),
    _VReviewCard(children: [
      _VReviewRow(label: 'Daily Price', value: '$_currency ${_dailyPriceCtrl.text.trim()}'),
      if (_weeklyPriceCtrl.text.trim().isNotEmpty)
        _VReviewRow(label: 'Weekly Price', value: '$_currency ${_weeklyPriceCtrl.text.trim()}'),
      if (_monthlyPriceCtrl.text.trim().isNotEmpty)
        _VReviewRow(label: 'Monthly Price', value: '$_currency ${_monthlyPriceCtrl.text.trim()}'),
    ]),
    const SizedBox(height: 12),
    _VReviewCard(children: [
      _VReviewRow(label: 'Photos', value: '${_uploadedImageUrls.length} uploaded'),
      _VReviewRow(label: 'Key Features', value: '${_keyFeatures.length} selected'),
    ]),
  ]);
}

// ─── Vehicle-specific sub-widgets ─────────────────────────────────────────

class _VehicleBottomNav extends StatelessWidget {
  const _VehicleBottomNav({
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
            : Text(step < totalSteps ? 'Continue' : 'List Vehicle',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
      ),
    ),
  );
}

class _VStepHeader extends StatelessWidget {
  const _VStepHeader({required this.icon, required this.title, required this.subtitle});
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

class _VWizField extends StatelessWidget {
  const _VWizField({
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

class _VWizDropdown<T> extends StatelessWidget {
  const _VWizDropdown({
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
      isExpanded: true,
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
        child: Text(itemLabel != null ? itemLabel!(i) : i.toString(),
            style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
      )).toList(),
      onChanged: onChanged,
    ),
  );
}

class _VCountRow extends StatelessWidget {
  const _VCountRow({required this.label, required this.value, required this.onDec, required this.onInc});
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

class _VReviewCard extends StatelessWidget {
  const _VReviewCard({required this.children});
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

class _VReviewRow extends StatelessWidget {
  const _VReviewRow({required this.label, required this.value});
  final String label, value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(children: [
      Text(label, style: const TextStyle(color: AppColors.foggy, fontSize: 13)),
      const Spacer(),
      Text(value.isEmpty ? '—' : value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
    ]),
  );
}
