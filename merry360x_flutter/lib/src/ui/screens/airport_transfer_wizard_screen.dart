import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../services/cloudinary_service.dart';
import '../widgets/host_creation_scaffold.dart';

const _kRed = AppColors.rausch;

const _kCarBrands = [
  'Toyota',
  'Honda',
  'Nissan',
  'Mazda',
  'Mitsubishi',
  'Suzuki',
  'Hyundai',
  'Kia',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Volkswagen',
  'Ford',
  'Chevrolet',
  'Isuzu',
  'Other',
];

const _kCarTypes = ['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Wagon', 'Van', 'Minibus'];
const _kTransmissions = ['Automatic', 'Manual', 'Hybrid'];
const _kFuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const _kDrivetrains = ['FWD', 'RWD', 'AWD', '4WD'];
const _kCurrencies = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];

class AirportTransferWizardScreen extends StatefulWidget {
  const AirportTransferWizardScreen({
    super.key,
    required this.api,
    required this.userId,
    this.existingVehicle,
    this.seedTitle,
  });

  final AppDatabase api;
  final String userId;
  final Map<String, dynamic>? existingVehicle;
  final String? seedTitle;

  @override
  State<AirportTransferWizardScreen> createState() => _AirportTransferWizardScreenState();
}

class _AirportTransferWizardScreenState extends State<AirportTransferWizardScreen> {
  int _step = 1;
  static const _totalSteps = 5;
  static const _stepTitles = ['Basic Info', 'Vehicle', 'Routes & Pricing', 'Documents', 'Review'];

  bool _saving = false;
  bool _uploading = false;
  String? _error;

  // Step 1 — Basic Info
  final _titleCtrl = TextEditingController();
  final _providerCtrl = TextEditingController();

  // Step 2 — Vehicle
  String _carBrand = 'Toyota';
  final _carModelCtrl = TextEditingController();
  int _carYear = DateTime.now().year;
  String _carType = 'Sedan';
  int _seats = 4;
  String _transmission = 'Automatic';
  String _fuelType = 'Petrol';
  String _driveTrain = 'FWD';
  String _currency = 'RWF';
  final Set<String> _keyFeatures = <String>{};

  // Step 3 — Routes & Pricing
  List<Map<String, dynamic>> _routes = [];
  final Map<String, TextEditingController> _routePriceCtrls = {};
  bool _routesLoading = false;

  // Step 4 — Documents
  String? _insuranceDocUrl;
  String? _registrationDocUrl;
  String? _roadworthinessDocUrl;
  String? _ownerIdDocUrl;

  // Step 2 — Vehicle media (exterior + interior like web)
  final List<String> _exteriorUrls = [];
  final List<String> _interiorUrls = [];
  final List<XFile> _newExteriorFiles = [];
  final List<XFile> _newInteriorFiles = [];
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final e = widget.existingVehicle;
    if (e != null) {
      _titleCtrl.text = (e['title'] ?? '').toString();
      _providerCtrl.text = (e['provider_name'] ?? '').toString();
      _carBrand = _kCarBrands.contains(e['car_brand']) ? (e['car_brand'] as String) : _carBrand;
      _carModelCtrl.text = (e['car_model'] ?? '').toString();
      _carYear = (e['car_year'] as num?)?.toInt() ?? _carYear;
      _carType = _kCarTypes.contains(e['car_type'])
          ? (e['car_type'] as String)
          : (_kCarTypes.contains(e['vehicle_type']) ? (e['vehicle_type'] as String) : _carType);
      _seats = (e['seats'] as num?)?.toInt() ?? _seats;
      _transmission = _kTransmissions.contains(e['transmission']) ? (e['transmission'] as String) : _transmission;
      _fuelType = _kFuelTypes.contains(e['fuel_type']) ? (e['fuel_type'] as String) : _fuelType;
      _driveTrain = _kDrivetrains.contains(e['drive_train']) ? (e['drive_train'] as String) : _driveTrain;
      _currency = (e['currency'] ?? _currency).toString();
      final kf = e['key_features'];
      if (kf is List) _keyFeatures.addAll(kf.map((x) => x.toString()));

      _insuranceDocUrl = (e['insurance_document_url'] as String?);
      _registrationDocUrl = (e['registration_document_url'] as String?);
      _roadworthinessDocUrl = (e['roadworthiness_certificate_url'] as String?);
      _ownerIdDocUrl = (e['owner_identification_url'] as String?);

      final ext = e['exterior_images'];
      if (ext is List) _exteriorUrls.addAll(ext.map((x) => x.toString()));
      final intl = e['interior_images'];
      if (intl is List) _interiorUrls.addAll(intl.map((x) => x.toString()));
    } else if (widget.seedTitle?.trim().isNotEmpty ?? false) {
      _titleCtrl.text = widget.seedTitle!.trim();
      _carModelCtrl.text = widget.seedTitle!.trim();
    }

    _loadRoutes();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _providerCtrl.dispose();
    _carModelCtrl.dispose();
    for (final c in _routePriceCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadRoutes() async {
    setState(() => _routesLoading = true);
    try {
      final routes = await widget.api.fetchTransportRoutes();
      if (!mounted) return;
      setState(() {
        _routes = routes;
      });

      // If editing, fetch existing pricing mapping.
      final vehicleId = widget.existingVehicle?['id']?.toString();
      final existingPricing = vehicleId == null
          ? <String, num>{}
          : await widget.api.fetchAirportTransferPricing(vehicleId: vehicleId);

      if (!mounted) return;
      for (final r in _routes) {
        final rid = r['id']?.toString();
        if (rid == null) continue;
        _routePriceCtrls.putIfAbsent(rid, () => TextEditingController());
        final price = existingPricing[rid];
        if (price != null) _routePriceCtrls[rid]!.text = price.toString();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _routesLoading = false);
    }
  }

  Future<void> _pickImages({required bool exterior}) async {
    final imgs = await _picker.pickMultiImage(imageQuality: 85);
    if (imgs.isEmpty) return;
    setState(() {
      if (exterior) {
        _newExteriorFiles.addAll(imgs);
      } else {
        _newInteriorFiles.addAll(imgs);
      }
    });
  }

  Future<void> _pickDoc({required String folderLabel, required void Function(String url) onUploaded}) async {
    final file = await _picker.pickImage(source: ImageSource.gallery);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final url = await CloudinaryService.uploadImage(file.path, folder: 'transport-documents');
      onUploaded(url);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  bool get _canProceed {
    switch (_step) {
      case 1:
        return _titleCtrl.text.trim().isNotEmpty;
      case 2:
        return _carModelCtrl.text.trim().isNotEmpty;
      case 3:
        // At least one route with a valid price
        return _routePriceCtrls.entries.any((e) => double.tryParse(e.value.text.trim()) != null && double.parse(e.value.text.trim()) > 0);
      case 4:
        return _insuranceDocUrl != null &&
            _registrationDocUrl != null &&
            _roadworthinessDocUrl != null &&
            _ownerIdDocUrl != null;
      default:
        return true;
    }
  }

  void _goBack() {
    if (_step > 1) {
      setState(() => _step -= 1);
    } else {
      Navigator.of(context).maybePop();
    }
  }

  void _goNext() {
    if (!_canProceed) return;
    if (_step < _totalSteps) setState(() => _step += 1);
  }

  Future<void> _submit() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      setState(() => _uploading = true);
      final newExterior = <String>[];
      for (final f in _newExteriorFiles) {
        newExterior.add(await CloudinaryService.uploadImage(f.path, folder: 'transport'));
      }
      final newInterior = <String>[];
      for (final f in _newInteriorFiles) {
        newInterior.add(await CloudinaryService.uploadImage(f.path, folder: 'transport'));
      }
      final exterior = [..._exteriorUrls, ...newExterior];
      final interior = [..._interiorUrls, ...newInterior];
      setState(() => _uploading = false);

      final vehicleFields = <String, dynamic>{
        'is_published': true,
        'title': _titleCtrl.text.trim(),
        'provider_name': _providerCtrl.text.trim(),
        'car_brand': _carBrand,
        'car_model': _carModelCtrl.text.trim(),
        'car_year': _carYear,
        'car_type': _carType,
        'vehicle_type': _carType,
        'seats': _seats,
        'transmission': _transmission,
        'fuel_type': _fuelType,
        'drive_train': _driveTrain,
        'currency': _currency,
        'key_features': _keyFeatures.toList(),
        'exterior_images': exterior,
        'interior_images': interior,
        if (_insuranceDocUrl != null) 'insurance_document_url': _insuranceDocUrl,
        if (_registrationDocUrl != null) 'registration_document_url': _registrationDocUrl,
        if (_roadworthinessDocUrl != null) 'roadworthiness_certificate_url': _roadworthinessDocUrl,
        if (_ownerIdDocUrl != null) 'owner_identification_url': _ownerIdDocUrl,
      };

      final e = widget.existingVehicle;
      final vehicleId = e != null
          ? e['id']?.toString()
          : await widget.api.createTransport(userId: widget.userId, fields: vehicleFields);

      if (vehicleId == null || vehicleId.isEmpty) {
        throw Exception('Failed to create transfer vehicle');
      }

      if (e != null) {
        await widget.api.updateTransport(id: vehicleId, updates: vehicleFields);
      }

      final pricing = <String, num>{};
      for (final entry in _routePriceCtrls.entries) {
        final v = double.tryParse(entry.value.text.trim());
        if (v != null && v > 0) pricing[entry.key] = v;
      }
      await widget.api.upsertAirportTransferPricing(vehicleId: vehicleId, pricingByRouteId: pricing);

      if (!mounted) return;
      Navigator.of(context).pop(true);
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
    final isEditMode = widget.existingVehicle != null;
    return HostCreationScaffold(
      title: isEditMode ? 'Edit Airport Transfer' : 'Create Airport Transfer',
      subtitle: isEditMode ? 'Update your listing' : 'Step-by-step',
      step: _step,
      totalSteps: _totalSteps,
      stepTitle: _stepTitles[_step - 1],
      onBack: _goBack,
      bottomNav: _BottomNav(
        step: _step,
        totalSteps: _totalSteps,
        canProceed: _canProceed,
        saving: _saving,
        onNext: _goNext,
        onSubmit: _submit,
      ),
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
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 1:
        return _stepBasic();
      case 2:
        return _stepVehicle();
      case 3:
        return _stepRoutes();
      case 4:
        return _stepDocs();
      case 5:
        return _stepReview();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _stepBasic() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Header(icon: Icons.flight_takeoff_outlined, title: 'Basic info', subtitle: 'Name your airport transfer listing'),
          const SizedBox(height: 20),
          TextField(
            controller: _titleCtrl,
            decoration: const InputDecoration(labelText: 'Title', hintText: 'e.g. Kigali Airport Transfer'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _providerCtrl,
            decoration: const InputDecoration(labelText: 'Provider name', hintText: 'e.g. Merry360x Transport'),
          ),
        ],
      );

  Widget _stepVehicle() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Header(icon: Icons.directions_car_outlined, title: 'Vehicle', subtitle: 'Tell us about your car'),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            initialValue: _carBrand,
            decoration: const InputDecoration(labelText: 'Car brand'),
            items: _kCarBrands.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
            onChanged: (v) => setState(() => _carBrand = v ?? _carBrand),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _carModelCtrl,
            decoration: const InputDecoration(labelText: 'Car model', hintText: 'e.g. Prado'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _carType,
                  decoration: const InputDecoration(labelText: 'Car type'),
                  items: _kCarTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (v) => setState(() => _carType = v ?? _carType),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _currency,
                  decoration: const InputDecoration(labelText: 'Currency'),
                  items: _kCurrencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (v) => setState(() => _currency = v ?? _currency),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _transmission,
                  decoration: const InputDecoration(labelText: 'Transmission'),
                  items: _kTransmissions.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (v) => setState(() => _transmission = v ?? _transmission),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _fuelType,
                  decoration: const InputDecoration(labelText: 'Fuel'),
                  items: _kFuelTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (v) => setState(() => _fuelType = v ?? _fuelType),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _driveTrain,
                  decoration: const InputDecoration(labelText: 'Drivetrain'),
                  items: _kDrivetrains.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (v) => setState(() => _driveTrain = v ?? _driveTrain),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(child: _Counter(label: 'Seats', value: _seats, onChanged: (v) => setState(() => _seats = v))),
            ],
          ),
          const SizedBox(height: 18),
          const Text('Key features', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final f in const ['Air Conditioning', 'Bluetooth', 'GPS Navigation', 'Backup Camera', 'USB Ports', 'Leather Seats', 'Spacious Luggage'])
                FilterChip(
                  label: Text(f, style: const TextStyle(fontSize: 12)),
                  selected: _keyFeatures.contains(f),
                  selectedColor: Colors.black.withValues(alpha: 0.06),
                  checkmarkColor: Colors.black87,
                  onSelected: (sel) => setState(() {
                    if (sel) {
                      _keyFeatures.add(f);
                    } else {
                      _keyFeatures.remove(f);
                    }
                  }),
                ),
            ],
          ),
          const SizedBox(height: 18),
          const Text('Photos', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _saving ? null : () => _pickImages(exterior: true),
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Exterior'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black87,
                    side: BorderSide(color: Colors.grey.shade300),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _saving ? null : () => _pickImages(exterior: false),
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Interior'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black87,
                    side: BorderSide(color: Colors.grey.shade300),
                  ),
                ),
              ),
            ],
          ),
          if (_uploading) ...[
            const SizedBox(height: 14),
            const LinearProgressIndicator(color: _kRed),
          ],
        ],
      );

  Widget _stepRoutes() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Header(icon: Icons.route_outlined, title: 'Routes & pricing', subtitle: 'Choose routes and set prices'),
          const SizedBox(height: 16),
          if (_routesLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(child: CircularProgressIndicator(color: _kRed)),
            )
          else if (_routes.isEmpty)
            const Text('No routes found. Add routes on the website first.', style: TextStyle(color: Colors.black54))
          else
            Column(
              children: [
                for (final r in _routes) _routeRow(r),
              ],
            ),
        ],
      );

  Widget _routeRow(Map<String, dynamic> r) {
    final id = r['id']?.toString() ?? '';
    final from = (r['from_location'] ?? '').toString();
    final to = (r['to_location'] ?? '').toString();
    final base = r['base_price'];
    final cur = (r['currency'] ?? _currency).toString();
    final ctrl = _routePriceCtrls.putIfAbsent(id, () => TextEditingController());

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFEBEBEB)),
        borderRadius: BorderRadius.circular(12),
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$from → $to', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 6),
          Text('Default: $cur ${base ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
          const SizedBox(height: 10),
          TextField(
            controller: ctrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Your price ($cur)',
              hintText: '0',
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepDocs() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Header(icon: Icons.description_outlined, title: 'Documents', subtitle: 'Upload required documents'),
          const SizedBox(height: 18),
          _docRow(
            label: 'Insurance document',
            url: _insuranceDocUrl,
            onPick: () => _pickDoc(folderLabel: 'insurance', onUploaded: (u) => setState(() => _insuranceDocUrl = u)),
          ),
          _docRow(
            label: 'Registration document',
            url: _registrationDocUrl,
            onPick: () => _pickDoc(folderLabel: 'registration', onUploaded: (u) => setState(() => _registrationDocUrl = u)),
          ),
          _docRow(
            label: 'Roadworthiness certificate',
            url: _roadworthinessDocUrl,
            onPick: () => _pickDoc(folderLabel: 'roadworthiness', onUploaded: (u) => setState(() => _roadworthinessDocUrl = u)),
          ),
          _docRow(
            label: 'Owner identification',
            url: _ownerIdDocUrl,
            onPick: () => _pickDoc(folderLabel: 'owner_id', onUploaded: (u) => setState(() => _ownerIdDocUrl = u)),
          ),
          if (_uploading) ...[
            const SizedBox(height: 14),
            const LinearProgressIndicator(color: _kRed),
          ],
        ],
      );

  Widget _docRow({required String label, required String? url, required VoidCallback onPick}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFEBEBEB)),
        borderRadius: BorderRadius.circular(12),
        color: Colors.white,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 4),
                Text(url == null ? 'Not uploaded' : 'Uploaded', style: TextStyle(fontSize: 12, color: url == null ? Colors.black45 : Colors.green.shade700)),
              ],
            ),
          ),
          OutlinedButton(
            onPressed: _saving ? null : onPick,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.black87,
              side: BorderSide(color: Colors.grey.shade300),
            ),
            child: Text(url == null ? 'Upload' : 'Replace'),
          ),
        ],
      ),
    );
  }

  Widget _stepReview() {
    final selectedRoutes = _routePriceCtrls.entries
        .where((e) => double.tryParse(e.value.text.trim()) != null && double.parse(e.value.text.trim()) > 0)
        .length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Header(icon: Icons.check_circle_outline, title: 'Review', subtitle: 'Confirm your listing details'),
        const SizedBox(height: 18),
        _reviewCard([
          _reviewRow('Title', _titleCtrl.text.trim()),
          _reviewRow('Provider', _providerCtrl.text.trim()),
          _reviewRow('Vehicle', '$_carBrand ${_carModelCtrl.text.trim()}'),
          _reviewRow('Seats', '$_seats'),
          _reviewRow('Currency', _currency),
          _reviewRow('Routes priced', '$selectedRoutes'),
        ]),
      ],
    );
  }

  Widget _reviewCard(List<Widget> children) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFEBEBEB)),
        ),
        child: Column(children: children),
      );

  Widget _reviewRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.black45)),
            const Spacer(),
            Flexible(
              child: Text(value.isEmpty ? '—' : value,
                  textAlign: TextAlign.end, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({
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
    final isLast = step >= totalSteps;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEBEBEB))),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: canProceed ? _kRed : Colors.grey.shade300,
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onPressed: saving ? null : (canProceed ? (isLast ? () => onSubmit() : onNext) : null),
          child: saving
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
              : Text(isLast ? 'Create Transfer' : 'Continue', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.icon, required this.title, required this.subtitle});

  final IconData icon;
  final String title;
  final String subtitle;

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
              Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.black45)),
            ]),
          ),
        ],
      );
}

class _Counter extends StatelessWidget {
  const _Counter({required this.label, required this.value, required this.onChanged});
  final String label;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
        const SizedBox(height: 6),
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.remove_circle_outline, size: 22),
              color: _kRed,
              onPressed: () => onChanged((value - 1).clamp(1, 20)),
            ),
            SizedBox(
              width: 34,
              child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, size: 22),
              color: _kRed,
              onPressed: () => onChanged((value + 1).clamp(1, 20)),
            ),
          ],
        ),
      ],
    );
  }
}
