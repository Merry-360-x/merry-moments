import 'package:flutter/material.dart';

import '../../app.dart';

import '../../services/app_database.dart';
import '../utils/app_snackbar.dart';
import '../widgets/host_creation_scaffold.dart';
import '../widgets/cloudinary_image_picker.dart';

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
final _kAmenitiesByCategory = <(String, Map<String, String>)>[
  ('📶 Entertainment', {
    'wifi': 'Wi-Fi', 'tv_smart': 'Smart TV', 'tv_basic': 'Basic TV',
  }),
  ('🚗 Parking', {
    'parking_free': 'Free Parking', 'parking_paid': 'Paid Parking',
  }),
  ('💼 Work & Storage', {
    'workspace': 'Dedicated Workspace', 'wardrobe': 'Wardrobe',
    'hangers': 'Hangers', 'safe': 'Safe',
  }),
  ('❄️ Climate Control', {
    'ac': 'Air Conditioning', 'heating': 'Heating', 'fans': 'Fans',
    'fireplace': 'Fireplace', 'air_purifier': 'Air Purifier',
  }),
  ('🚿 Bathroom', {
    'hot_water': 'Hot Water', 'toiletries': 'Toiletries',
    'bathroom_essentials': 'Bathroom Essentials', 'cleaning_items': 'Cleaning Supplies',
  }),
  ('🛏️ Bedroom', {
    'bedsheets_pillows': 'Bed Linens & Pillows', 'soundproofing': 'Soundproofing',
  }),
  ('👕 Laundry', {
    'washing_machine': 'Washing Machine', 'dryer': 'Dryer', 'iron': 'Iron & Ironing Board',
  }),
  ('🍳 Kitchen', {
    'kitchen': 'Full Kitchen', 'kitchenette': 'Kitchenette', 'refrigerator': 'Refrigerator',
    'microwave': 'Microwave', 'stove': 'Stove/Cooker', 'oven': 'Oven',
    'dishwasher': 'Dishwasher', 'cookware': 'Cookware', 'dishes': 'Dishes & Utensils',
    'dining_table': 'Dining Table', 'blender': 'Blender',
    'kettle': 'Electric Kettle', 'coffee_maker': 'Coffee Maker',
  }),
  ('🍽️ Meals', {
    'breakfast_included': 'Breakfast Included', 'breakfast_available': 'Breakfast Available (Paid)',
  }),
  ('💪 Recreation', {
    'gym': 'Gym/Fitness Center', 'pool': 'Swimming Pool', 'spa': 'Spa',
    'sauna': 'Sauna', 'jacuzzi': 'Hot Tub/Jacuzzi',
  }),
  ('🔒 Safety', {
    'smoke_alarm': 'Smoke Alarm', 'carbon_monoxide_alarm': 'Carbon Monoxide Alarm',
    'fire_extinguisher': 'Fire Extinguisher', 'first_aid': 'First Aid Kit',
    'security_cameras': 'Security Cameras', 'security_system': 'Security System',
  }),
  ('🛎️ Services', {
    'meeting_room': 'Meeting Room', 'conference_room': 'Conference Room',
    'reception': '24/7 Reception', 'concierge': 'Concierge Service',
    'restaurant': 'On-site Restaurant', 'room_service': 'Room Service',
  }),
  ('🌿 Outdoor', {
    'balcony': 'Balcony', 'patio': 'Patio', 'garden': 'Garden', 'terrace': 'Terrace',
  }),
  ('🌄 Views', {
    'city_view': 'City View', 'mountain_view': 'Mountain View',
    'sea_view': 'Sea/Ocean View', 'lake_view': 'Lake View', 'landscape_view': 'Landscape View',
  }),
  ('♿ Accessibility', {
    'elevator': 'Elevator', 'wheelchair_accessible': 'Wheelchair Accessible',
    'ground_floor': 'Ground Floor Access',
  }),
  ('📋 Rules', {
    'no_smoking': 'No Smoking', 'pets_allowed': 'Pets Allowed',
  }),
  ('👶 Family', {
    'family_friendly': 'Family Friendly', 'crib': 'Crib/Baby Bed', 'high_chair': 'High Chair',
  }),
];

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

  // ── Step 3: Photos — uploaded URLs collected in real-time by CloudinaryImagePicker ──
  List<String> _uploadedImageUrls = [];

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
      _uploadedImageUrls = List<String>.from(e['images'] as List? ?? []);
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

  Map<String, dynamic> _buildFields({List<String> images = const []}) => {
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
    if (images.isNotEmpty) 'images': images,
    if (images.isNotEmpty) 'main_image': images.first,
  };

  void _showCancellationPolicyInfo(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36, height: 4,
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 18),
            const Text('Cancellation Policies', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            _PolicyTile(
              icon: Icons.lock_outline,
              color: Colors.red.shade600,
              title: 'Strict',
              description: 'Guests receive a 50% refund (minus the first night and fees) if cancelled at least 7 days before check-in. No refund within 7 days of arrival.',
            ),
            const SizedBox(height: 12),
            _PolicyTile(
              icon: Icons.balance_outlined,
              color: Colors.orange.shade700,
              title: 'Fair',
              description: 'Full refund if cancelled at least 5 days before check-in. 50% refund for cancellations 1–5 days prior. No refund within 24 hours of arrival.',
            ),
            const SizedBox(height: 12),
            _PolicyTile(
              icon: Icons.sentiment_satisfied_alt_outlined,
              color: Colors.green.shade600,
              title: 'Lenient',
              description: 'Full refund up to 24 hours before check-in. 50% refund for cancellations made within 24 hours of arrival.',
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      // All images are already uploaded by CloudinaryImagePicker — just save and publish immediately
      final fields = _buildFields(images: _uploadedImageUrls);
      final existing = widget.existing;
      if (existing != null) {
        await widget.api.updateProperty(id: existing['id'].toString(), updates: {...fields, 'is_published': true});
      } else {
        await widget.api.createProperty(userId: widget.userId, fields: {...fields, 'is_published': true});
      }
      if (!mounted) return;
      AppSnackBar.success(context, 'Property published!');
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceAll('Exception: ', '');
      setState(() { _saving = false; _error = msg; });
      AppSnackBar.error(context, 'Failed to publish. Check details and retry.');
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
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red, fontSize: 12),
                ),
              ),
              const SizedBox(height: 12),
            ],
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, animation) {
                return FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0.05, 0),
                      end: Offset.zero,
                    ).animate(CurvedAnimation(
                      parent: animation,
                      curve: Curves.easeOutCubic,
                    )),
                    child: child,
                  ),
                );
              },
              child: KeyedSubtree(
                key: ValueKey(_step),
                child: _buildStep(),
              ),
            ),
          ],
        ),
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
      children: _kPropertyTypes.map((t) => _AnimatedPropertyTypeChip(
        label: t,
        selected: _propertyType == t,
        onTap: () => setState(() => _propertyType = t),
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
    Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: _WizDropdown<String>(
            label: 'Cancellation Policy',
            value: _cancellationPolicy,
            items: _kCancellationPolicies,
            itemLabel: (p) => p[0].toUpperCase() + p.substring(1),
            onChanged: (v) => setState(() => _cancellationPolicy = v ?? _cancellationPolicy),
          ),
        ),
        const SizedBox(width: 4),
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: IconButton(
            icon: const Icon(Icons.info_outline, size: 22),
            color: _kRed,
            tooltip: 'About cancellation policies',
            onPressed: () => _showCancellationPolicyInfo(context),
          ),
        ),
      ],
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
    const _StepHeader(
      icon: Icons.photo_library_outlined,
      title: 'Add photos of your property',
      subtitle: 'Great photos help your listing stand out',
    ),
    const SizedBox(height: 20),
    CloudinaryImagePicker(
      folder: 'properties',
      uploadedUrls: _uploadedImageUrls,
      onChanged: (urls) => setState(() => _uploadedImageUrls = List<String>.from(urls)),
      hint: 'Add at least 5 photos · Use daylight · Show every room',
    ),
    const SizedBox(height: 8),
  ]);

  // ── Step 4: Amenities ──
  Widget _buildStep4() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const _StepHeader(icon: Icons.star_border_rounded, title: 'What does your place offer?', subtitle: 'Select all amenities available to guests'),
      const SizedBox(height: 24),
      for (final (category, items) in _kAmenitiesByCategory) ..._buildAmenityGroup(category, items),
      if (_amenities.isNotEmpty) ...[
        const SizedBox(height: 4),
        AnimatedOpacity(
          opacity: 1.0,
          duration: const Duration(milliseconds: 300),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _kRed.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _kRed.withValues(alpha: 0.2)),
            ),
            child: Row(children: [
              Icon(Icons.check_circle, color: _kRed, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${_amenities.length} amenity${_amenities.length == 1 ? '' : 'ties'} selected',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _kRed),
                ),
              ),
            ]),
          ),
        ),
      ],
    ]);
  }

  List<Widget> _buildAmenityGroup(String category, Map<String, String> items) => [
    Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 10),
      child: Text(
        category,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.foggy, letterSpacing: 0.2),
      ),
    ),
    Wrap(
      spacing: 8, runSpacing: 8,
      children: items.entries.map((e) {
        final isSelected = _amenities.contains(e.key);
        return _AnimatedAmenityChip(
          label: e.value,
          selected: isSelected,
          onTap: () => setState(() {
            if (isSelected) {
              _amenities.remove(e.key);
            } else {
              _amenities.add(e.key);
            }
          }),
        );
      }).toList(),
    ),
    const SizedBox(height: 20),
    const Divider(height: 1, color: Color(0xFFF0F0F0)),
    const SizedBox(height: 16),
  ];

  // ── Step 5: Review ──
  Widget _buildStep5() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const _StepHeader(icon: Icons.check_circle_outline, title: "You're all set!", subtitle: 'Review your listing before publishing'),
    const SizedBox(height: 24),

    // Cover photo preview
    if (_uploadedImageUrls.isNotEmpty) ...[
      ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Image.network(_uploadedImageUrls.first, fit: BoxFit.cover),
        ),
      ),
      const SizedBox(height: 16),
    ],

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
      _ReviewRow(label: 'Photos', value: '${_uploadedImageUrls.length} uploaded'),
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
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
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
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(children: [
      Expanded(child: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500))),
      _AnimatedCountButton(
        icon: Icons.remove_circle_outline,
        onPressed: onDec,
      ),
      SizedBox(
        width: 50,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 150),
          transitionBuilder: (child, animation) => ScaleTransition(scale: animation, child: child),
          child: Text(
            '$value',
            key: ValueKey(value),
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
          ),
        ),
      ),
      _AnimatedCountButton(
        icon: Icons.add_circle_outline,
        onPressed: onInc,
      ),
    ]),
  );
}

class _AnimatedCountButton extends StatefulWidget {
  const _AnimatedCountButton({required this.icon, required this.onPressed});
  final IconData icon;
  final VoidCallback onPressed;

  @override
  State<_AnimatedCountButton> createState() => _AnimatedCountButtonState();
}

class _AnimatedCountButtonState extends State<_AnimatedCountButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 100),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTap() {
    _controller.forward().then((_) => _controller.reverse());
    widget.onPressed();
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: _handleTap,
    child: ScaleTransition(
      scale: _scaleAnimation,
      child: Container(
        padding: const EdgeInsets.all(6),
        child: Icon(widget.icon, size: 26, color: _kRed),
      ),
    ),
  );
}

class _AnimatedPropertyTypeChip extends StatefulWidget {
  const _AnimatedPropertyTypeChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_AnimatedPropertyTypeChip> createState() => _AnimatedPropertyTypeChipState();
}

class _AnimatedPropertyTypeChipState extends State<_AnimatedPropertyTypeChip> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 120),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.93).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) => _controller.forward();
  void _handleTapUp(TapUpDetails _) {
    _controller.reverse();
    widget.onTap();
  }
  void _handleTapCancel() => _controller.reverse();

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTapDown: _handleTapDown,
    onTapUp: _handleTapUp,
    onTapCancel: _handleTapCancel,
    child: ScaleTransition(
      scale: _scaleAnimation,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: widget.selected ? _kRed : Colors.grey.shade300,
            width: widget.selected ? 1.5 : 1,
          ),
          color: widget.selected ? _kRed.withValues(alpha: 0.12) : AppColors.surface,
          boxShadow: widget.selected ? [
            BoxShadow(color: _kRed.withValues(alpha: 0.2), blurRadius: 6, offset: const Offset(0, 2)),
          ] : null,
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 150),
            transitionBuilder: (child, animation) => ScaleTransition(scale: animation, child: child),
            child: widget.selected
              ? Icon(Icons.check_circle, key: const ValueKey('check'), size: 14, color: _kRed)
              : const SizedBox.shrink(key: ValueKey('empty')),
          ),
          if (widget.selected) const SizedBox(width: 5),
          Text(
            widget.label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: widget.selected ? FontWeight.w600 : FontWeight.w500,
              color: widget.selected ? _kRed : AppColors.foggy,
            ),
          ),
        ]),
      ),
    ),
  );
}

class _ModeCard extends StatefulWidget {
  const _ModeCard({required this.label, required this.subtitle, required this.icon, required this.selected, required this.onTap});
  final String label, subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_ModeCard> createState() => _ModeCardState();
}

class _ModeCardState extends State<_ModeCard> with SingleTickerProviderStateMixin {
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 100),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) => _scaleController.forward();
  void _handleTapUp(TapUpDetails _) {
    _scaleController.reverse();
    widget.onTap();
  }
  void _handleTapCancel() => _scaleController.reverse();

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTapDown: _handleTapDown,
    onTapUp: _handleTapUp,
    onTapCancel: _handleTapCancel,
    child: ScaleTransition(
      scale: _scaleAnimation,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: widget.selected ? _kRed : Colors.grey.shade300, width: widget.selected ? 2 : 1),
          color: widget.selected ? _kRed.withValues(alpha: 0.08) : AppColors.surface,
          boxShadow: widget.selected ? [
            BoxShadow(color: _kRed.withValues(alpha: 0.15), blurRadius: 8, offset: const Offset(0, 2)),
          ] : null,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(widget.icon, color: widget.selected ? _kRed : Colors.grey.shade500, size: 24),
            const Spacer(),
            if (widget.selected) Icon(Icons.check_circle, color: _kRed, size: 18),
          ]),
          const SizedBox(height: 10),
          Text(widget.label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: widget.selected ? _kRed : AppColors.black)),
          const SizedBox(height: 2),
          Text(widget.subtitle, style: TextStyle(fontSize: 11, color: widget.selected ? _kRed.withValues(alpha: 0.7) : AppColors.foggy)),
        ]),
      ),
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
      color: AppColors.surface,
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
      Text(label, style: const TextStyle(color: AppColors.foggy, fontSize: 13)),
      const Spacer(),
      Text(value.isEmpty ? '—' : value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
    ]),
  );
}

class _PolicyTile extends StatelessWidget {
  const _PolicyTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
  });
  final IconData icon;
  final Color color;
  final String title, description;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 18, color: color),
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 3),
          Text(description, style: const TextStyle(fontSize: 12, color: AppColors.foggy, height: 1.4)),
        ]),
      ),
    ],
  );
}

// ─────────────────────────────────────── Modern Animated Widgets ───────────────────

class _AnimatedAmenityChip extends StatefulWidget {
  const _AnimatedAmenityChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_AnimatedAmenityChip> createState() => _AnimatedAmenityChipState();
}

class _AnimatedAmenityChipState extends State<_AnimatedAmenityChip> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    _controller.forward();
  }

  void _onTapUp(TapUpDetails details) {
    _controller.reverse();
  }

  void _onTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onTap,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: widget.selected 
              ? _kRed.withValues(alpha: 0.12)
              : AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: widget.selected 
                ? _kRed
                : Colors.grey.shade300,
              width: widget.selected ? 1.5 : 1,
            ),
            boxShadow: widget.selected ? [
              BoxShadow(
                color: _kRed.withValues(alpha: 0.15),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ] : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                transitionBuilder: (child, animation) {
                  return ScaleTransition(scale: animation, child: child);
                },
                child: widget.selected
                  ? Icon(Icons.check_circle, key: const ValueKey('check'), size: 16, color: _kRed)
                  : SizedBox(key: const ValueKey('empty'), width: 16),
              ),
              if (widget.selected) const SizedBox(width: 6),
              Text(
                widget.label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: widget.selected ? FontWeight.w600 : FontWeight.w500,
                  color: widget.selected ? _kRed : AppColors.black,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
