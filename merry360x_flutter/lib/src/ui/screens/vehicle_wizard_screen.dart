import 'dart:io';

import 'package:flutter/material.dart';

import '../../app.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/cloudinary_service.dart';
import '../../services/app_database.dart';

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
  });

  final AppDatabase api;
  final String userId;
  final Map<String, dynamic>? existing;

  @override
  State<VehicleWizardScreen> createState() => _VehicleWizardScreenState();
}

class _VehicleWizardScreenState extends State<VehicleWizardScreen> {
  int _step = 1;
  static const _totalSteps = 4;
  static const _stepTitles = ['Basics', 'Media', 'Pricing', 'Review'];

  bool _saving = false;
  bool _uploading = false;

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
  List<String> _existingUrls = [];
  List<XFile> _newFiles = [];
  final _picker = ImagePicker();

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
      _existingUrls = List<String>.from(e['images'] as List? ?? []);
      _dailyPriceCtrl.text = e['daily_price'] != null ? e['daily_price'].toString() : '';
      _weeklyPriceCtrl.text = e['weekly_price'] != null ? e['weekly_price'].toString() : '';
      _monthlyPriceCtrl.text = e['monthly_price'] != null ? e['monthly_price'].toString() : '';
      _currency = e['currency'] ?? 'RWF';
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
      case 2: return true;
      case 3: return double.tryParse(_dailyPriceCtrl.text.trim()) != null;
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
      folder: 'transport',
    );
    final allImages = [..._existingUrls, ...newUrls];
    setState(() => _uploading = false);

    final fields = <String, dynamic>{
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
      if (allImages.isNotEmpty) 'images': allImages,
      if (allImages.isNotEmpty) 'main_image': allImages.first,
    };

    final e = widget.existing;
    if (e != null) {
      await widget.api.updateTransport(id: e['id'], updates: fields);
    } else {
      await widget.api.createTransport(userId: widget.userId, fields: fields);
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
                  Text(widget.existing == null ? 'List Your Vehicle' : 'Edit Vehicle',
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
          _VehicleBottomNav(
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
      value: _driverIncluded, activeColor: _kRed,
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
        selectedColor: _kRed.withValues(alpha: 0.15),
        checkmarkColor: _kRed,
        onSelected: (sel) => setState(() {
          if (sel) _keyFeatures.add(f); else _keyFeatures.remove(f);
        }),
      )).toList(),
    ),
  ]);

  // ── Step 2: Media ──
  Widget _buildStep2() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _VStepHeader(icon: Icons.photo_camera_outlined, title: 'Add vehicle photos', subtitle: 'Help renters see what to expect'),
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
      _VReviewRow(label: 'Photos', value: '${_existingUrls.length + _newFiles.length} selected'),
      _VReviewRow(label: 'Key Features', value: '${_keyFeatures.length} selected'),
    ]),

    if (_uploading) ...[
      const SizedBox(height: 16),
      const LinearProgressIndicator(color: _kRed),
      const SizedBox(height: 8),
      const Center(child: Text('Uploading photos…', style: TextStyle(fontSize: 13, color: Colors.black54))),
    ],
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
  Widget build(BuildContext context) => Column(children: [
    const SizedBox(height: 8),
    Icon(icon, size: 48, color: _kRed),
    const SizedBox(height: 14),
    Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
    const SizedBox(height: 6),
    Text(subtitle, style: const TextStyle(fontSize: 14, color: Colors.black45), textAlign: TextAlign.center),
  ]);
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
      value: value,
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
      color: Colors.white,
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
      Text(label, style: const TextStyle(color: Colors.black45, fontSize: 13)),
      const Spacer(),
      Text(value.isEmpty ? '—' : value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
    ]),
  );
}
