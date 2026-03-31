import 'dart:io';

import 'package:flutter/material.dart';

import '../../app.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/cloudinary_service.dart';
import '../../services/app_database.dart';
import '../widgets/host_creation_scaffold.dart';

// ─────────────────────────────────────────────────
// Property Creation / Edit Wizard (5 steps)
// Steps: Basic Info → Details → Photos → Amenities → Review
// ─────────────────────────────────────────────────

const _kRed = AppColors.rausch;

const _kPropertyTypes = [
  'Hotel', 'Apartment', 'Room in Apartment', 'Villa', 'Guesthouse',
  'Resort', 'Lodge', 'Motel', 'House', 'Cabin',
];
const _kCurrencies = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];
const _kCancellationPolicies = ['strict', 'fair', 'lenient'];
const _kAmenityOptions = {
  'wifi': 'Wi-Fi', 'tv_smart': 'Smart TV', 'tv_basic': 'Basic TV',
  'parking_free': 'Free Parking', 'parking_paid': 'Paid Parking',
  'workspace': 'Workspace', 'wardrobe': 'Wardrobe', 'safe': 'Safe',
  'ac': 'Air Conditioning', 'heating': 'Heating', 'fans': 'Fans',
  'hot_water': 'Hot Water', 'toiletries': 'Toiletries', 'bathroom_essentials': 'Bathroom Essentials',
  'bedsheets_pillows': 'Bed Linens & Pillows',
  'washing_machine': 'Washing Machine', 'dryer': 'Dryer', 'iron': 'Iron & Board',
  'kitchen': 'Full Kitchen', 'kitchenette': 'Kitchenette', 'refrigerator': 'Refrigerator',
  'microwave': 'Microwave', 'stove': 'Stove/Cooker', 'oven': 'Oven',
  'dishwasher': 'Dishwasher', 'cookware': 'Cookware', 'dishes': 'Dishes & Utensils',
  'kettle': 'Electric Kettle', 'coffee_maker': 'Coffee Maker',
  'breakfast_included': 'Breakfast Included', 'breakfast_available': 'Breakfast (Paid)',
  'gym': 'Gym', 'pool': 'Swimming Pool', 'spa': 'Spa', 'jacuzzi': 'Hot Tub',
  'smoke_alarm': 'Smoke Alarm', 'fire_extinguisher': 'Fire Extinguisher',
  'first_aid': 'First Aid Kit', 'security_cameras': 'Security Cameras', 'security_system': 'Security System',
  'no_smoking': 'No Smoking', 'pets_allowed': 'Pets Allowed',
  'balcony': 'Balcony', 'patio': 'Patio', 'garden': 'Garden', 'terrace': 'Terrace',
  'city_view': 'City View', 'mountain_view': 'Mountain View', 'sea_view': 'Sea View',
  'lake_view': 'Lake View', 'landscape_view': 'Landscape View',
  'elevator': 'Elevator', 'wheelchair_accessible': 'Wheelchair Accessible',
  'meeting_room': 'Meeting Room', 'reception': '24/7 Reception',
  'restaurant': 'On-site Restaurant', 'room_service': 'Room Service',
  'family_friendly': 'Family Friendly', 'crib': 'Crib/Baby Bed',
  'fireplace': 'Fireplace', 'air_purifier': 'Air Purifier',
};

class PropertyWizardScreen extends StatefulWidget {
  const PropertyWizardScreen({
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
  State<PropertyWizardScreen> createState() => _PropertyWizardScreenState();
}

class _PropertyWizardScreenState extends State<PropertyWizardScreen> {
  int _step = 1;
  static const _totalSteps = 5;
  static const _stepTitles = ['Basic Info', 'Details', 'Photos', 'Amenities', 'Review'];

  bool _saving = false;
  bool _uploading = false;
  String? _error;

  // ── Step 1: Basic Info ──
  final _titleCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _propertyType = 'House';
  String _listingMode = 'standard';

  // ── Step 2: Details ──
  final _priceCtrl = TextEditingController();
  final _priceMonthCtrl = TextEditingController();
  final _checkInCtrl = TextEditingController(text: '14:00');
  final _checkOutCtrl = TextEditingController(text: '11:00');
  final _weeklyDiscCtrl = TextEditingController(text: '0');
  final _monthlyDiscCtrl = TextEditingController(text: '0');
  final _bfPriceCtrl = TextEditingController();
  String _currency = 'RWF';
  String _cancellationPolicy = 'fair';
  int _maxGuests = 2, _bedrooms = 1, _bathrooms = 1, _beds = 1;
  bool _monthlyRental = false, _breakfastAvailable = false;
  bool _petsAllowed = false, _eventsAllowed = false, _smokingAllowed = false;

  // ── Step 3: Photos ──
  List<String> _existingUrls = [];
  final List<XFile> _newFiles = [];
  final _picker = ImagePicker();

  // ── Step 4: Amenities ──
  List<String> _amenities = [];

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _titleCtrl.text = e['title'] ?? '';
      _locCtrl.text = e['location'] ?? '';
      _addressCtrl.text = e['address'] ?? '';
      _descCtrl.text = e['description'] ?? '';
      _propertyType = _kPropertyTypes.contains(e['property_type']) ? e['property_type'] as String : 'House';
      _listingMode = e['listing_mode'] ?? 'standard';
      _priceCtrl.text = e['price_per_night'] != null ? e['price_per_night'].toString() : '';
      _priceMonthCtrl.text = e['price_per_month'] != null ? e['price_per_month'].toString() : '';
      _checkInCtrl.text = e['check_in_time'] ?? '14:00';
      _checkOutCtrl.text = e['check_out_time'] ?? '11:00';
      _weeklyDiscCtrl.text = (e['weekly_discount'] ?? 0).toString();
      _monthlyDiscCtrl.text = (e['monthly_discount'] ?? 0).toString();
      _bfPriceCtrl.text = e['breakfast_price_per_night'] != null ? e['breakfast_price_per_night'].toString() : '';
      _currency = e['currency'] ?? 'RWF';
      _cancellationPolicy = e['cancellation_policy'] ?? 'fair';
      _maxGuests = (e['max_guests'] as num?)?.toInt() ?? 2;
      _bedrooms = (e['bedrooms'] as num?)?.toInt() ?? 1;
      _bathrooms = (e['bathrooms'] as num?)?.toInt() ?? 1;
      _beds = (e['beds'] as num?)?.toInt() ?? 1;
      _monthlyRental = e['available_for_monthly_rental'] == true;
      _breakfastAvailable = e['breakfast_available'] == true;
      _petsAllowed = e['pets_allowed'] == true;
      _eventsAllowed = e['events_allowed'] == true;
      _smokingAllowed = e['smoking_allowed'] == true;
      _existingUrls = List<String>.from(e['images'] as List? ?? []);
      _amenities = List<String>.from(e['amenities'] as List? ?? []);
    } else if (widget.seedTitle?.trim().isNotEmpty ?? false) {
      _titleCtrl.text = widget.seedTitle!.trim();
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose(); _locCtrl.dispose(); _addressCtrl.dispose(); _descCtrl.dispose();
    _priceCtrl.dispose(); _priceMonthCtrl.dispose(); _checkInCtrl.dispose(); _checkOutCtrl.dispose();
    _weeklyDiscCtrl.dispose(); _monthlyDiscCtrl.dispose(); _bfPriceCtrl.dispose();
    super.dispose();
  }

  bool get _canProceed {
    switch (_step) {
      case 1: return _titleCtrl.text.trim().length >= 3 && _locCtrl.text.trim().isNotEmpty;
      case 2: return double.tryParse(_priceCtrl.text.trim()) != null;
      case 3: return true;
      case 4: return true;
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

  Future<void> _submit() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _uploading = true;
      _error = null;
    });
    try {
      final newUrls = await CloudinaryService.uploadImages(
        _newFiles.map((f) => f.path).toList(),
        folder: 'properties',
      );
      final allImages = [..._existingUrls, ...newUrls];
      if (!mounted) return;
      setState(() => _uploading = false);

      final fields = <String, dynamic>{
      'is_published': true,
      'title': _titleCtrl.text.trim(),
      'location': _locCtrl.text.trim(),
      'address': _addressCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'property_type': _propertyType,
      'listing_mode': _listingMode,
      'price_per_night': double.tryParse(_priceCtrl.text.trim()) ?? 0,
      'currency': _currency,
      'max_guests': _maxGuests,
      'bedrooms': _bedrooms,
      'bathrooms': _bathrooms,
      'beds': _beds,
      'amenities': _amenities,
      'cancellation_policy': _cancellationPolicy,
      'check_in_time': _checkInCtrl.text.trim(),
      'check_out_time': _checkOutCtrl.text.trim(),
      'smoking_allowed': _smokingAllowed,
      'events_allowed': _eventsAllowed,
      'pets_allowed': _petsAllowed,
      'weekly_discount': int.tryParse(_weeklyDiscCtrl.text.trim()) ?? 0,
      'monthly_discount': int.tryParse(_monthlyDiscCtrl.text.trim()) ?? 0,
      'available_for_monthly_rental': _monthlyRental,
      if (_monthlyRental || _listingMode == 'monthly_only')
        'price_per_month': double.tryParse(_priceMonthCtrl.text.trim()),
      'breakfast_available': _breakfastAvailable,
      if (_breakfastAvailable)
        'breakfast_price_per_night': double.tryParse(_bfPriceCtrl.text.trim()),
      if (allImages.isNotEmpty) 'images': allImages,
      if (allImages.isNotEmpty) 'main_image': allImages.first,
      };

      final e = widget.existing;
      if (e != null) {
        await widget.api.updateProperty(id: e['id'], updates: fields);
      } else {
        await widget.api.createProperty(userId: widget.userId, fields: fields);
      }

      if (!mounted) return;
      setState(() => _saving = false);
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _uploading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditMode = widget.existing != null;
    return HostCreationScaffold(
      title: isEditMode ? 'Edit Property' : 'List Your Property',
      subtitle: isEditMode
          ? 'Update your property details'
          : 'Fill in the details to list your property',
      step: _step,
      totalSteps: _totalSteps,
      stepTitle: _stepTitles[_step - 1],
      onBack: _goBack,
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                mainAxisSize: MainAxisSize.min,
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
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red, fontSize: 12),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  _buildStep(),
                ],
              ),
            ),
          );
        },
      ),
      bottomNav: _BottomNav(
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
      case 1: return _buildStep1();
      case 2: return _buildStep2();
      case 3: return _buildStep3();
      case 4: return _buildStep4();
      case 5: return _buildStep5();
      default: return const SizedBox();
    }
  }

  // ── Step 1: Basic Info ──
  Widget _buildStep1() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    _StepHeader(icon: Icons.home_outlined, title: "Let's start with the basics", subtitle: 'Tell us about your property'),
    const SizedBox(height: 24),

    const Text('Listing Mode', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    const SizedBox(height: 8),
    Row(children: [
      Expanded(child: _ModeCard(
        label: 'Nightly Stays', subtitle: 'Charge per night',
        icon: Icons.nights_stay_outlined,
        selected: _listingMode == 'standard',
        onTap: () => setState(() => _listingMode = 'standard'),
      )),
      const SizedBox(width: 10),
      Expanded(child: _ModeCard(
        label: 'Monthly Only', subtitle: 'Long-stay rentals',
        icon: Icons.calendar_month_outlined,
        selected: _listingMode == 'monthly_only',
        onTap: () => setState(() => _listingMode = 'monthly_only'),
      )),
    ]),
    const SizedBox(height: 20),

    _WizField(ctrl: _titleCtrl, label: 'Property Title', hint: 'e.g. Cozy Kigali Apartment',
        onChanged: (_) => setState(() {})),
    _WizField(ctrl: _locCtrl, label: 'City / Area', hint: 'e.g. Kigali, Nyamirambo',
        onChanged: (_) => setState(() {})),
    _WizField(ctrl: _addressCtrl, label: 'Street Address', hint: 'Optional full address'),
    _WizField(ctrl: _descCtrl, label: 'Description', hint: 'Describe your space…', maxLines: 4),
    const SizedBox(height: 12),

    const Text('Property Type', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    const SizedBox(height: 8),
    Wrap(
      spacing: 8, runSpacing: 8,
      children: _kPropertyTypes.map((t) => ChoiceChip(
        label: Text(t, style: const TextStyle(fontSize: 12)),
        selected: _propertyType == t,
        selectedColor: _kRed.withValues(alpha: 0.15),
        checkmarkColor: _kRed,
        onSelected: (_) => setState(() => _propertyType = t),
      )).toList(),
    ),
  ]);

  // ── Step 2: Details ──
  Widget _buildStep2() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    _StepHeader(
      icon: Icons.attach_money_outlined,
      title: 'Set your pricing & capacity',
      subtitle: _listingMode == 'monthly_only' ? 'Set your monthly price for long-stay guests.' : 'How much per night?',
    ),
    const SizedBox(height: 24),

    // Pricing
    const Text('Pricing', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    const SizedBox(height: 8),
    Row(children: [
      Expanded(child: _WizField(
        ctrl: _priceCtrl,
        label: _listingMode == 'monthly_only' ? 'Price per Month' : 'Price per Night',
        hint: '0',
        inputType: TextInputType.number,
        onChanged: (_) => setState(() {}),
      )),
      const SizedBox(width: 10),
      SizedBox(width: 110, child: _WizDropdown<String>(
        label: 'Currency',
        value: _currency,
        items: _kCurrencies,
        onChanged: (v) => setState(() => _currency = v ?? _currency),
      )),
    ]),

    SwitchListTile(
      dense: true, contentPadding: EdgeInsets.zero,
      title: const Text('Available for Monthly Rental', style: TextStyle(fontSize: 14)),
      value: _monthlyRental, activeThumbColor: _kRed,
      onChanged: (v) => setState(() => _monthlyRental = v),
    ),
    if (_monthlyRental && _listingMode != 'monthly_only')
      _WizField(ctrl: _priceMonthCtrl, label: 'Monthly Price', hint: '0', inputType: TextInputType.number),

    const Divider(height: 28),
    const Text('Capacity', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    const SizedBox(height: 8),
    _CountRow(label: 'Max Guests', value: _maxGuests,
      onDec: () => setState(() => _maxGuests = (_maxGuests - 1).clamp(1, 50)),
      onInc: () => setState(() => _maxGuests = (_maxGuests + 1).clamp(1, 50))),
    _CountRow(label: 'Bedrooms', value: _bedrooms,
      onDec: () => setState(() => _bedrooms = (_bedrooms - 1).clamp(0, 20)),
      onInc: () => setState(() => _bedrooms = (_bedrooms + 1).clamp(0, 20))),
    _CountRow(label: 'Bathrooms', value: _bathrooms,
      onDec: () => setState(() => _bathrooms = (_bathrooms - 1).clamp(0, 20)),
      onInc: () => setState(() => _bathrooms = (_bathrooms + 1).clamp(0, 20))),
    _CountRow(label: 'Beds', value: _beds,
      onDec: () => setState(() => _beds = (_beds - 1).clamp(0, 20)),
      onInc: () => setState(() => _beds = (_beds + 1).clamp(0, 20))),

    const Divider(height: 28),
    const Text('Check-in / Check-out', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    const SizedBox(height: 8),
    Row(children: [
      Expanded(child: _WizField(ctrl: _checkInCtrl, label: 'Check-in', hint: '14:00')),
      const SizedBox(width: 10),
      Expanded(child: _WizField(ctrl: _checkOutCtrl, label: 'Check-out', hint: '11:00')),
    ]),
    _WizDropdown<String>(
      label: 'Cancellation Policy',
      value: _cancellationPolicy,
      items: _kCancellationPolicies,
      itemLabel: (p) => p[0].toUpperCase() + p.substring(1),
      onChanged: (v) => setState(() => _cancellationPolicy = v ?? _cancellationPolicy),
    ),

    const Divider(height: 28),
    const Text('House Rules', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    SwitchListTile(dense: true, contentPadding: EdgeInsets.zero,
      title: const Text('Pets Allowed', style: TextStyle(fontSize: 14)),
      value: _petsAllowed, activeThumbColor: _kRed, onChanged: (v) => setState(() => _petsAllowed = v)),
    SwitchListTile(dense: true, contentPadding: EdgeInsets.zero,
      title: const Text('Events Allowed', style: TextStyle(fontSize: 14)),
      value: _eventsAllowed, activeThumbColor: _kRed, onChanged: (v) => setState(() => _eventsAllowed = v)),
    SwitchListTile(dense: true, contentPadding: EdgeInsets.zero,
      title: const Text('Smoking Allowed', style: TextStyle(fontSize: 14)),
      value: _smokingAllowed, activeThumbColor: _kRed, onChanged: (v) => setState(() => _smokingAllowed = v)),

    const Divider(height: 28),
    const Text('Long Stay Discounts', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    const SizedBox(height: 8),
    Row(children: [
      Expanded(child: _WizField(ctrl: _weeklyDiscCtrl, label: 'Weekly Discount (%)', hint: '0', inputType: TextInputType.number)),
      const SizedBox(width: 10),
      Expanded(child: _WizField(ctrl: _monthlyDiscCtrl, label: 'Monthly Discount (%)', hint: '0', inputType: TextInputType.number)),
    ]),

    const Divider(height: 28),
    SwitchListTile(dense: true, contentPadding: EdgeInsets.zero,
      title: const Text('Breakfast Available', style: TextStyle(fontSize: 14)),
      value: _breakfastAvailable, activeThumbColor: _kRed, onChanged: (v) => setState(() => _breakfastAvailable = v)),
    if (_breakfastAvailable)
      _WizField(ctrl: _bfPriceCtrl, label: 'Breakfast Price per Night', hint: '0', inputType: TextInputType.number),
  ]);

  // ── Step 3: Photos ──
  Widget _buildStep3() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _StepHeader(icon: Icons.photo_library_outlined, title: 'Add photos of your property', subtitle: 'Great photos help guests choose your place'),
    const SizedBox(height: 24),

    // Add buttons
    Row(children: [
      Expanded(child: OutlinedButton.icon(
        onPressed: () async {
          final imgs = await _picker.pickMultiImage(imageQuality: 85);
          if (imgs.isNotEmpty) setState(() => _newFiles.addAll(imgs));
        },
        icon: const Icon(Icons.photo_library_outlined),
        label: const Text('Gallery (Multiple)'),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.black87,
          side: BorderSide(color: Colors.grey.shade300),
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
          foregroundColor: Colors.black87,
          side: BorderSide(color: Colors.grey.shade300),
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
          border: Border.all(color: Colors.grey.shade300, width: 2, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(16),
          color: Colors.grey.shade50,
        ),
        child: Column(children: [
          Icon(Icons.add_photo_alternate_outlined, size: 48, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          Text('No photos yet', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
          const SizedBox(height: 4),
          Text('Add at least one photo to continue', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
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
                  ? Image.network(_existingUrls[i], fit: BoxFit.cover, errorBuilder: (_, _, _) => Container(color: Colors.grey.shade200))
                  : Image.file(File(_newFiles[i - _existingUrls.length].path), fit: BoxFit.cover),
            ),
            if (!isExisting)
              Positioned(
                bottom: 4, left: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
                  child: const Text('New', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600)),
                ),
              ),
            Positioned(
              top: 4, right: 4,
              child: GestureDetector(
                onTap: () => setState(() {
                  if (isExisting) {
                    _existingUrls.removeAt(i);
                  } else {
                    _newFiles.removeAt(i - _existingUrls.length);
                  }
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

    if (_existingUrls.isNotEmpty || _newFiles.isNotEmpty) ...[
      const SizedBox(height: 12),
      Text(
        '${_existingUrls.length + _newFiles.length} photo${(_existingUrls.length + _newFiles.length) == 1 ? '' : 's'} selected',
        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
      ),
    ],
  ]);

  // ── Step 4: Amenities ──
  Widget _buildStep4() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _StepHeader(icon: Icons.chair_outlined, title: 'What does your place offer?', subtitle: 'Select all amenities available to guests'),
    const SizedBox(height: 24),
    Wrap(
      spacing: 8, runSpacing: 8,
      children: _kAmenityOptions.entries.map((e) => FilterChip(
        label: Text(e.value, style: const TextStyle(fontSize: 12)),
        selected: _amenities.contains(e.key),
        selectedColor: _kRed.withValues(alpha: 0.15),
        checkmarkColor: _kRed,
        onSelected: (sel) => setState(() {
          if (sel) {
            _amenities.add(e.key);
          } else {
            _amenities.remove(e.key);
          }
        }),
      )).toList(),
    ),
  ]);

  // ── Step 5: Review ──
  Widget _buildStep5() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _StepHeader(icon: Icons.check_circle_outline, title: "You're all set!", subtitle: 'Review your listing before publishing'),
    const SizedBox(height: 24),

    _ReviewCard(children: [
      _ReviewRow(label: 'Title', value: _titleCtrl.text.trim()),
      _ReviewRow(label: 'Location', value: _locCtrl.text.trim()),
      _ReviewRow(label: 'Type', value: _propertyType),
      _ReviewRow(label: 'Listing Mode', value: _listingMode == 'monthly_only' ? 'Monthly Only' : 'Standard'),
    ]),
    const SizedBox(height: 12),
    _ReviewCard(children: [
      _ReviewRow(label: 'Price per Night', value: '$_currency ${_priceCtrl.text.trim()}'),
      _ReviewRow(label: 'Max Guests', value: '$_maxGuests'),
      _ReviewRow(label: 'Bedrooms', value: '$_bedrooms'),
      _ReviewRow(label: 'Beds', value: '$_beds'),
      _ReviewRow(label: 'Bathrooms', value: '$_bathrooms'),
    ]),
    const SizedBox(height: 12),
    _ReviewCard(children: [
      _ReviewRow(label: 'Photos', value: '${_existingUrls.length + _newFiles.length} selected'),
      _ReviewRow(label: 'Amenities', value: '${_amenities.length} selected'),
    ]),
    const SizedBox(height: 12),
    _ReviewCard(children: [
      _ReviewRow(label: 'Check-in', value: _checkInCtrl.text),
      _ReviewRow(label: 'Check-out', value: _checkOutCtrl.text),
      _ReviewRow(label: 'Cancellation', value: _cancellationPolicy),
      _ReviewRow(label: 'Pets', value: _petsAllowed ? 'Allowed' : 'Not allowed'),
      _ReviewRow(label: 'Events', value: _eventsAllowed ? 'Allowed' : 'Not allowed'),
      _ReviewRow(label: 'Smoking', value: _smokingAllowed ? 'Allowed' : 'Not allowed'),
    ]),

    if (_uploading) ...[
      const SizedBox(height: 16),
      const LinearProgressIndicator(color: _kRed),
      const SizedBox(height: 8),
      const Center(child: Text('Uploading photos to Cloudinary…', style: TextStyle(fontSize: 13, color: Colors.black54))),
    ],
  ]);
}

// ─────────────────────────────────────── shared sub-widgets ───────────────────

class _BottomNav extends StatelessWidget {
  const _BottomNav({
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
            : Text(step < totalSteps ? 'Continue' : (step == totalSteps ? 'Publish Listing' : 'Save'),
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
      ),
    ),
  );
}

class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.icon, required this.title, required this.subtitle});
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
          Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.black45)),
        ]),
      ),
    ],
  );
}

class _WizField extends StatelessWidget {
  const _WizField({
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

class _WizDropdown<T> extends StatelessWidget {
  const _WizDropdown({
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

class _CountRow extends StatelessWidget {
  const _CountRow({required this.label, required this.value, required this.onDec, required this.onInc});
  final String label;
  final int value;
  final VoidCallback onDec, onInc;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Expanded(child: Text(label, style: const TextStyle(fontSize: 15))),
      IconButton(
        icon: const Icon(Icons.remove_circle_outline, size: 22),
        onPressed: onDec,
        color: _kRed,
      ),
      SizedBox(
        width: 36,
        child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
      ),
      IconButton(
        icon: const Icon(Icons.add_circle_outline, size: 22),
        onPressed: onInc,
        color: _kRed,
      ),
    ]),
  );
}

class _ModeCard extends StatelessWidget {
  const _ModeCard({required this.label, required this.subtitle, required this.icon, required this.selected, required this.onTap});
  final String label, subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: selected ? _kRed : Colors.grey.shade300, width: selected ? 2 : 1),
        color: selected ? _kRed.withValues(alpha: 0.05) : Colors.white,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: selected ? _kRed : Colors.grey.shade500, size: 22),
        const SizedBox(height: 8),
        Text(label, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: selected ? _kRed : Colors.black87)),
        Text(subtitle, style: TextStyle(fontSize: 11, color: selected ? _kRed.withValues(alpha: 0.7) : Colors.black45)),
      ]),
    ),
  );
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.children});
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

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});
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
