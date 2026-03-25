import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../services/cloudinary_service.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import '../../app.dart';
import 'explore_screen.dart' show resolveListingImageUrl;

const _kRed = AppColors.rausch;

// ── Host Form Constants ──
const _kCurrencies = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];
const _kPropertyTypes = ['Hotel', 'Apartment', 'Room in Apartment', 'Villa', 'Guesthouse', 'Resort', 'Lodge', 'Motel', 'House', 'Cabin'];
const _kCancellationPolicies = ['strict', 'fair', 'lenient'];
const _kTourCategories = ['Nature', 'Adventure', 'Cultural', 'Wildlife', 'Historical', 'City Tours', 'Eco-Tourism', 'Photography'];
const _kPricingModels = ['per_person', 'per_group', 'per_hour'];
const _kCarBrands = ['Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Suzuki', 'Hyundai', 'Kia', 'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Ford', 'Chevrolet', 'Jeep', 'Land Rover', 'Range Rover', 'Porsche', 'Lexus', 'Infiniti', 'Subaru', 'Volvo', 'Peugeot', 'Renault', 'Isuzu', 'Other'];
const _kCarTypes = ['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Convertible', 'Van', 'Minibus', 'Bus', 'Pickup Truck', 'Luxury Car', 'Sports Car', 'Crossover'];
const _kTransmissions = ['Automatic', 'Manual', 'Hybrid (CVT)'];
const _kFuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const _kDrivetrains = ['FWD', 'RWD', 'AWD', '4WD'];
const _kKeyFeatures = ['Air Conditioning', 'Bluetooth', 'GPS Navigation', 'Backup Camera', 'Cruise Control', 'Leather Seats', 'Sunroof/Moonroof', 'Heated Seats', 'Apple CarPlay', 'Android Auto', 'USB Ports', 'WiFi Hotspot', 'Parking Sensors', 'Keyless Entry', 'Push Button Start', 'Blind Spot Monitor', 'Lane Departure Warning', 'Emergency Braking', 'Roof Rack', 'Third Row Seating'];
const _kMobileProviders = ['MTN', 'Airtel', 'Tigo', 'M-Pesa', 'Orange'];
const _kDiscountAppliesTo = ['all', 'properties', 'tours', 'transport'];
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

class HostDashboardScreen extends StatefulWidget {
  const HostDashboardScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<HostDashboardScreen> createState() => _HostDashboardScreenState();
}

class _HostDashboardScreenState extends State<HostDashboardScreen>
    with TickerProviderStateMixin, WidgetsBindingObserver {
  final _api = AppDatabase();
  late TabController _tabs;
  final List<RealtimeChannel> _channels = [];
  Timer? _realtimeReloadTimer;

  Map<String, dynamic>? _stats;
  List<Map<String, dynamic>> _properties = [];
  List<Map<String, dynamic>> _tours = [];
  List<Map<String, dynamic>> _transport = [];
  List<Map<String, dynamic>> _bookings = [];
  List<Map<String, dynamic>> _manualReviewRequests = [];
  List<Map<String, dynamic>> _discounts = [];
  List<Map<String, dynamic>> _payoutMethods = [];
  List<Map<String, dynamic>> _payouts = [];
  bool _loading = true;

  static const _tabLabels = [
    'Overview', 'Properties', 'Tours', 'Transport',
    'Bookings', 'Manual Reviews', 'Discount Codes',
    'Financial Reports', 'Payout Methods', 'Calendar & Availability',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _tabs = TabController(length: _tabLabels.length, vsync: this);
    _load();
    _setupRealtime();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _realtimeReloadTimer?.cancel();
    for (final channel in _channels) {
      Supabase.instance.client.removeChannel(channel);
    }
    _tabs.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _load(silent: true);
    }
  }

  void _queueRealtimeRefresh() {
    _realtimeReloadTimer?.cancel();
    _realtimeReloadTimer = Timer(const Duration(milliseconds: 900), () {
      if (mounted) {
        _load(silent: true);
      }
    });
  }

  void _setupRealtime() {
    final supabase = Supabase.instance.client;
    final userId = widget.session.userId;

    RealtimeChannel watchTable(String name, String table, {String? filterColumn}) {
      final channel = supabase
          .channel('host-dashboard-$name-$userId')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: table,
            filter: filterColumn != null ? PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: filterColumn, value: userId) : null,
            callback: (_) => _queueRealtimeRefresh(),
          )
          .subscribe();
      _channels.add(channel);
      return channel;
    }

    watchTable('bookings', 'bookings');
    watchTable('properties', 'properties');
    watchTable('tours', 'tours');
    watchTable('tour-packages', 'tour_packages');
    watchTable('transport', 'transport_vehicles');
    watchTable('reviews', 'property_reviews');
    watchTable('manual-reviews', 'manual_review_requests', filterColumn: 'host_id');
    watchTable('discounts', 'discount_codes', filterColumn: 'host_id');
    watchTable('payouts', 'host_payouts', filterColumn: 'host_id');
    watchTable('payout-methods', 'host_payout_methods', filterColumn: 'host_id');
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() => _loading = true);
    }
    final uid = widget.session.userId;
    final results = await Future.wait([
      _api.fetchHostStats(userId: uid),
      _api.fetchHostProperties(userId: uid),
      _api.fetchHostTours(userId: uid),
      _api.fetchHostTransport(userId: uid),
      _api.fetchHostBookings(userId: uid),
      _api.fetchManualReviewRequests(userId: uid),
      _api.fetchHostDiscounts(userId: uid),
      _api.fetchPayoutMethods(userId: uid),
      _api.fetchHostPayouts(userId: uid),
    ]);
    if (mounted) {
      setState(() {
        _stats = results[0] as Map<String, dynamic>?;
        _properties = results[1] as List<Map<String, dynamic>>;
        _tours = results[2] as List<Map<String, dynamic>>;
        _transport = results[3] as List<Map<String, dynamic>>;
        _bookings = results[4] as List<Map<String, dynamic>>;
        _manualReviewRequests = results[5] as List<Map<String, dynamic>>;
        _discounts = results[6] as List<Map<String, dynamic>>;
        _payoutMethods = results[7] as List<Map<String, dynamic>>;
        _payouts = results[8] as List<Map<String, dynamic>>;
        _loading = false;
      });
    }
  }

  String get _uid => widget.session.userId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('Host Dashboard',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22, color: AppColors.black)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: AppColors.hof), onPressed: _load),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          labelColor: AppColors.black,
          unselectedLabelColor: AppColors.foggy,
          indicatorColor: AppColors.black,
          indicatorWeight: 2,
          dividerColor: const Color(0xFFEBEBEB),
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w400, fontSize: 13),
          tabs: _tabLabels.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.rausch))
          : TabBarView(
              controller: _tabs,
              children: [
                _OverviewTab(stats: _stats, properties: _properties, tours: _tours, transport: _transport, bookings: _bookings),
                _PropertiesTab(api: _api, userId: _uid, items: _properties, onRefresh: _load),
                _ToursTab(api: _api, userId: _uid, items: _tours, onRefresh: _load),
                _TransportTab(api: _api, userId: _uid, items: _transport, onRefresh: _load),
                _BookingsTab(api: _api, userId: _uid, bookings: _bookings, onRefresh: _load),
                _ManualReviewsTab(
                  api: _api,
                  userId: _uid,
                  properties: _properties,
                  requests: _manualReviewRequests,
                  onRefresh: _load,
                ),
                _DiscountsTab(api: _api, userId: _uid, items: _discounts, onRefresh: _load),
                _FinancialTab(stats: _stats, payouts: _payouts, payoutMethods: _payoutMethods, api: _api, userId: _uid, onRefresh: _load),
                _PayoutMethodsTab(api: _api, userId: _uid, methods: _payoutMethods, onRefresh: _load),
                _CalendarTab(api: _api, properties: _properties),
              ],
            ),
    );
  }
}

// ===================== OVERVIEW =====================
class _OverviewTab extends StatelessWidget {
  const _OverviewTab({required this.stats, required this.properties, required this.tours, required this.transport, required this.bookings});
  final Map<String, dynamic>? stats;
  final List<Map<String, dynamic>> properties, tours, transport, bookings;

  @override
  Widget build(BuildContext context) {
    final availableForPayout = (stats?['available_for_payout'] as num?) ?? 0;
    final netEarnings = (stats?['net_earnings'] as num?) ?? (stats?['total_revenue'] as num?) ?? 0;
    final pendingPayout = (stats?['pending_payout'] as num?) ?? 0;
    final completedPayout = (stats?['completed_payout'] as num?) ?? 0;
    final totalBookings = (stats?['total_bookings'] as num?)?.toInt() ?? bookings.length;
    final pending = (stats?['pending_bookings'] as num?)?.toInt() ?? bookings.where((b) => b['status'] == 'pending').length;
    final publishedProperties = (stats?['published_property_count'] as num?)?.toInt() ?? properties.where((item) => item['is_published'] == true).length;
    final propertyCount = (stats?['property_count'] as num?)?.toInt() ?? properties.length;
    final currency = (stats?['currency'] ?? 'RWF').toString();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _sectionTitle('At a Glance'),
        const SizedBox(height: 8),
        GridView.count(
          crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.7,
          children: [
            _StatCard(title: 'Available for payout', value: _formatMoney(availableForPayout, currency), icon: Icons.account_balance_wallet_outlined, color: Colors.green),
            _StatCard(title: 'Properties', value: '$publishedProperties / $propertyCount', icon: Icons.home_outlined, color: Colors.indigo),
            _StatCard(title: 'Pending', value: '$pending', icon: Icons.hourglass_empty_outlined, color: Colors.amber),
            _StatCard(title: 'Total bookings', value: '$totalBookings', icon: Icons.calendar_today_outlined, color: _kRed),
            _StatCard(title: 'Tours', value: '${tours.length}', icon: Icons.explore_outlined, color: Colors.teal),
            _StatCard(title: 'Transport', value: '${transport.length}', icon: Icons.directions_car_outlined, color: Colors.orange),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity, padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6)]),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Net Earnings', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
            const SizedBox(height: 4),
            Text(_formatMoney(netEarnings, currency),
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: _kRed)),
            const SizedBox(height: 8),
            Text('Pending payouts: ${_formatMoney(pendingPayout, currency)}',
              style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
            Text('Completed payouts: ${_formatMoney(completedPayout, currency)}',
              style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
          ]),
        ),
        if (bookings.isNotEmpty) ...[
          const SizedBox(height: 20),
          _sectionTitle('Recent Bookings'),
          const SizedBox(height: 8),
          ...bookings.take(3).map((b) => _BookingSummaryRow(booking: b)),
        ],
      ]),
    );
  }
}

// ===================== PROPERTIES =====================
class _PropertiesTab extends StatelessWidget {
  const _PropertiesTab({required this.api, required this.userId, required this.items, required this.onRefresh});
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: items.isEmpty
          ? const _EmptyState(label: 'No properties yet', icon: Icons.home_outlined)
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (ctx, i) => _ListingCard(
                item: items[i],
                onToggle: (pub) async {
                  await api.updateListingStatus(id: items[i]['id'], type: 'property', published: pub);
                  onRefresh();
                },
                onEdit: () => _showPropertySheet(ctx, api, userId, onRefresh, existing: items[i]),
                onDelete: () async { await api.deleteProperty(id: items[i]['id']); onRefresh(); },
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.rausch,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Property'),
        onPressed: () => _showPropertySheet(context, api, userId, onRefresh),
      ),
    );
  }
}

void _showPropertySheet(BuildContext ctx, AppDatabase api, String userId, VoidCallback onRefresh, {Map<String, dynamic>? existing}) {
  final titleCtrl = TextEditingController(text: existing?['title'] ?? '');
  final locCtrl = TextEditingController(text: existing?['location'] ?? '');
  final addressCtrl = TextEditingController(text: existing?['address'] ?? '');
  final priceCtrl = TextEditingController(text: existing?['price_per_night'] != null ? existing!['price_per_night'].toString() : '');
  final priceMonthCtrl = TextEditingController(text: existing?['price_per_month'] != null ? existing!['price_per_month'].toString() : '');
  final descCtrl = TextEditingController(text: existing?['description'] ?? '');
  final checkInCtrl = TextEditingController(text: existing?['check_in_time'] ?? '14:00');
  final checkOutCtrl = TextEditingController(text: existing?['check_out_time'] ?? '11:00');
  final bfPriceCtrl = TextEditingController(text: existing?['breakfast_price_per_night'] != null ? existing!['breakfast_price_per_night'].toString() : '');
  final weeklyDiscCtrl = TextEditingController(text: (existing?['weekly_discount'] ?? 0).toString());
  final monthlyDiscCtrl = TextEditingController(text: (existing?['monthly_discount'] ?? 0).toString());

  String propertyType = (_kPropertyTypes.contains(existing?['property_type'])) ? existing!['property_type'] as String : 'House';
  String currency = existing?['currency'] ?? 'RWF';
  String cancellationPolicy = existing?['cancellation_policy'] ?? 'fair';
  String listingMode = existing?['listing_mode'] ?? 'standard';

  int maxGuests = (existing?['max_guests'] as num?)?.toInt() ?? 2;
  int bedrooms = (existing?['bedrooms'] as num?)?.toInt() ?? 1;
  int bathrooms = (existing?['bathrooms'] as num?)?.toInt() ?? 1;
  int beds = (existing?['beds'] as num?)?.toInt() ?? 1;

  bool smokingAllowed = existing?['smoking_allowed'] == true;
  bool eventsAllowed = existing?['events_allowed'] == true;
  bool petsAllowed = existing?['pets_allowed'] == true;
  bool monthlyRental = existing?['available_for_monthly_rental'] == true;
  bool breakfastAvailable = existing?['breakfast_available'] == true;

  List<String> amenities = List<String>.from(existing?['amenities'] as List? ?? []);

  // Image state
  final _picker = ImagePicker();
  List<String> existingImageUrls = List<String>.from(existing?['images'] as List? ?? []);
  List<XFile> newPickedImages = [];
  bool _uploading = false;

  showModalBottomSheet(
    context: ctx, isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => StatefulBuilder(builder: (sCtx, setSt) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(sheetCtx).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(existing == null ? 'Add Property' : 'Edit Property',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 16),

          // ── Photos ──
          const Text('Photos', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          _ImagePickerRow(
            existingUrls: existingImageUrls,
            newFiles: newPickedImages,
            onAddFromGallery: () async {
              final imgs = await _picker.pickMultiImage(imageQuality: 85);
              if (imgs.isNotEmpty) setSt(() => newPickedImages.addAll(imgs));
            },
            onAddFromCamera: () async {
              final img = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
              if (img != null) setSt(() => newPickedImages.add(img));
            },
            onRemoveExisting: (i) => setSt(() => existingImageUrls.removeAt(i)),
            onRemoveNew: (i) => setSt(() => newPickedImages.removeAt(i)),
          ),
          const SizedBox(height: 16),

          // Basic Info
          _Field(ctrl: titleCtrl, label: 'Title'),
          _Field(ctrl: locCtrl, label: 'City / Area'),
          _Field(ctrl: addressCtrl, label: 'Street Address'),
          _Field(ctrl: descCtrl, label: 'Description', maxLines: 3),

          // Type & Currency
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              key: ValueKey('pt_$propertyType'),
              value: propertyType,
              decoration: _inputDecoration('Property Type'),
              items: _kPropertyTypes.map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 13)))).toList(),
              onChanged: (v) => setSt(() => propertyType = v ?? propertyType),
            )),
            const SizedBox(width: 8),
            SizedBox(width: 100, child: DropdownButtonFormField<String>(
              key: ValueKey('curr_$currency'),
              value: currency,
              decoration: _inputDecoration('Currency'),
              items: _kCurrencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setSt(() => currency = v ?? currency),
            )),
          ]),
          const SizedBox(height: 12),

          // Pricing
          _Field(ctrl: priceCtrl, label: 'Price per Night', inputType: TextInputType.number),
          DropdownButtonFormField<String>(
            key: ValueKey('lm_$listingMode'),
            value: listingMode,
            decoration: _inputDecoration('Listing Mode'),
            items: const [
              DropdownMenuItem(value: 'standard', child: Text('Standard (per night)')),
              DropdownMenuItem(value: 'monthly_only', child: Text('Monthly Only')),
            ],
            onChanged: (v) => setSt(() => listingMode = v ?? listingMode),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            dense: true, contentPadding: EdgeInsets.zero,
            title: const Text('Available for Monthly Rental', style: TextStyle(fontSize: 14)),
            value: monthlyRental, activeColor: _kRed,
            onChanged: (v) => setSt(() => monthlyRental = v),
          ),
          if (monthlyRental || listingMode == 'monthly_only')
            _Field(ctrl: priceMonthCtrl, label: 'Price per Month', inputType: TextInputType.number),

          // Room Counts
          const Divider(height: 24),
          const Text('Room Details', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          _countRow('Max Guests', maxGuests,
            () => setSt(() => maxGuests = (maxGuests - 1).clamp(1, 50)),
            () => setSt(() => maxGuests = (maxGuests + 1).clamp(1, 50))),
          _countRow('Bedrooms', bedrooms,
            () => setSt(() => bedrooms = (bedrooms - 1).clamp(0, 20)),
            () => setSt(() => bedrooms = (bedrooms + 1).clamp(0, 20))),
          _countRow('Bathrooms', bathrooms,
            () => setSt(() => bathrooms = (bathrooms - 1).clamp(0, 20)),
            () => setSt(() => bathrooms = (bathrooms + 1).clamp(0, 20))),
          _countRow('Beds', beds,
            () => setSt(() => beds = (beds - 1).clamp(0, 20)),
            () => setSt(() => beds = (beds + 1).clamp(0, 20))),

          // Check-in / Check-out
          const Divider(height: 24),
          Row(children: [
            Expanded(child: _Field(ctrl: checkInCtrl, label: 'Check-in (HH:MM)')),
            const SizedBox(width: 8),
            Expanded(child: _Field(ctrl: checkOutCtrl, label: 'Check-out (HH:MM)')),
          ]),
          DropdownButtonFormField<String>(
            key: ValueKey('cp_$cancellationPolicy'),
            value: cancellationPolicy,
            decoration: _inputDecoration('Cancellation Policy'),
            items: _kCancellationPolicies.map((p) => DropdownMenuItem(value: p, child: Text(p[0].toUpperCase() + p.substring(1)))).toList(),
            onChanged: (v) => setSt(() => cancellationPolicy = v ?? cancellationPolicy),
          ),
          const SizedBox(height: 12),

          // House Rules
          const Divider(height: 24),
          const Text('House Rules', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          SwitchListTile(dense: true, contentPadding: EdgeInsets.zero,
            title: const Text('Pets Allowed', style: TextStyle(fontSize: 14)),
            value: petsAllowed, activeColor: _kRed, onChanged: (v) => setSt(() => petsAllowed = v)),
          SwitchListTile(dense: true, contentPadding: EdgeInsets.zero,
            title: const Text('Events Allowed', style: TextStyle(fontSize: 14)),
            value: eventsAllowed, activeColor: _kRed, onChanged: (v) => setSt(() => eventsAllowed = v)),
          SwitchListTile(dense: true, contentPadding: EdgeInsets.zero,
            title: const Text('Smoking Allowed', style: TextStyle(fontSize: 14)),
            value: smokingAllowed, activeColor: _kRed, onChanged: (v) => setSt(() => smokingAllowed = v)),

          // Long-stay Discounts
          const Divider(height: 24),
          const Text('Long Stay Discounts', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          Row(children: [
            Expanded(child: _Field(ctrl: weeklyDiscCtrl, label: 'Weekly Discount (%)', inputType: TextInputType.number)),
            const SizedBox(width: 8),
            Expanded(child: _Field(ctrl: monthlyDiscCtrl, label: 'Monthly Discount (%)', inputType: TextInputType.number)),
          ]),

          // Breakfast
          const Divider(height: 24),
          SwitchListTile(dense: true, contentPadding: EdgeInsets.zero,
            title: const Text('Breakfast Available', style: TextStyle(fontSize: 14)),
            value: breakfastAvailable, activeColor: _kRed, onChanged: (v) => setSt(() => breakfastAvailable = v)),
          if (breakfastAvailable)
            _Field(ctrl: bfPriceCtrl, label: 'Breakfast Price per Night', inputType: TextInputType.number),

          // Amenities
          const Divider(height: 24),
          const Text('Amenities', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6, runSpacing: 4,
            children: _kAmenityOptions.entries.map((e) => FilterChip(
              label: Text(e.value, style: const TextStyle(fontSize: 11)),
              selected: amenities.contains(e.key),
              selectedColor: _kRed.withValues(alpha: 0.15),
              checkmarkColor: _kRed,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              onSelected: (sel) => setSt(() { if (sel) amenities.add(e.key); else amenities.remove(e.key); }),
            )).toList(),
          ),
          const SizedBox(height: 16),

          if (_uploading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: _kRed)),
                SizedBox(width: 10),
                Text('Uploading photos…', style: TextStyle(fontSize: 13, color: Colors.black54)),
              ]),
            ),

          _SaveButton(label: existing == null ? 'Create Property' : 'Save Changes', onPressed: _uploading ? null : () async {
            setSt(() => _uploading = true);
            // Upload new images to Cloudinary
            final newUrls = await CloudinaryService.uploadImages(
              newPickedImages.map((f) => f.path).toList(),
              folder: 'properties',
            );
            final allImages = [...existingImageUrls, ...newUrls];
            setSt(() => _uploading = false);

            final fields = {
              'title': titleCtrl.text.trim(),
              'location': locCtrl.text.trim(),
              'address': addressCtrl.text.trim(),
              'price_per_night': double.tryParse(priceCtrl.text.trim()) ?? 0,
              'description': descCtrl.text.trim(),
              'property_type': propertyType,
              'currency': currency,
              'max_guests': maxGuests,
              'bedrooms': bedrooms,
              'bathrooms': bathrooms,
              'beds': beds,
              'amenities': amenities,
              'cancellation_policy': cancellationPolicy,
              'check_in_time': checkInCtrl.text.trim(),
              'check_out_time': checkOutCtrl.text.trim(),
              'smoking_allowed': smokingAllowed,
              'events_allowed': eventsAllowed,
              'pets_allowed': petsAllowed,
              'weekly_discount': int.tryParse(weeklyDiscCtrl.text.trim()) ?? 0,
              'monthly_discount': int.tryParse(monthlyDiscCtrl.text.trim()) ?? 0,
              'available_for_monthly_rental': monthlyRental,
              'price_per_month': (monthlyRental || listingMode == 'monthly_only')
                  ? double.tryParse(priceMonthCtrl.text.trim()) : null,
              'breakfast_available': breakfastAvailable,
              'breakfast_price_per_night': breakfastAvailable
                  ? double.tryParse(bfPriceCtrl.text.trim()) : null,
              'listing_mode': listingMode,
              if (allImages.isNotEmpty) 'images': allImages,
              if (allImages.isNotEmpty) 'main_image': allImages.first,
            };
            if (existing != null) { await api.updateProperty(id: existing['id'], updates: fields); }
            else { await api.createProperty(userId: userId, fields: fields); }
            if (sheetCtx.mounted) Navigator.pop(sheetCtx);
            onRefresh();
          }),
          const SizedBox(height: 8),
        ]),
      ),
    )),
  );
}

// ===================== TOURS =====================
class _ToursTab extends StatelessWidget {
  const _ToursTab({required this.api, required this.userId, required this.items, required this.onRefresh});
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: items.isEmpty
          ? const _EmptyState(label: 'No tours yet', icon: Icons.explore_outlined)
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (ctx, i) => _ListingCard(
                item: items[i], priceLabel: 'per person', priceField: 'price_per_person',
                onToggle: (pub) async {
                  await api.updateHostTourListing(
                    id: items[i]['id'],
                    updates: {'is_published': pub},
                    source: (items[i]['source'] ?? 'tours').toString(),
                  );
                  onRefresh();
                },
                onEdit: (items[i]['source'] ?? 'tours') == 'tour_packages'
                    ? null
                    : () => _showTourSheet(ctx, api, userId, onRefresh, existing: items[i]),
                onDelete: () async {
                  await api.deleteHostTourListing(
                    id: items[i]['id'],
                    source: (items[i]['source'] ?? 'tours').toString(),
                  );
                  onRefresh();
                },
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.rausch, foregroundColor: AppColors.white,
        icon: const Icon(Icons.add), label: const Text('Add Tour'),
        onPressed: () => _showTourSheet(context, api, userId, onRefresh),
      ),
    );
  }
}

void _showTourSheet(BuildContext ctx, AppDatabase api, String userId, VoidCallback onRefresh, {Map<String, dynamic>? existing}) {
  final titleCtrl = TextEditingController(text: existing?['title'] ?? '');
  final locCtrl = TextEditingController(text: existing?['location'] ?? '');
  final priceCtrl = TextEditingController(text: existing?['price_per_person'] != null ? existing!['price_per_person'].toString() : '');
  final descCtrl = TextEditingController(text: existing?['description'] ?? '');
  final durationCtrl = TextEditingController(text: existing?['duration_days'] != null ? existing!['duration_days'].toString() : '');
  final maxPaxCtrl = TextEditingController(text: (existing?['max_participants'] ?? 10).toString());
  final optActCtrl = TextEditingController(text: existing?['optional_activities'] ?? '');
  final citizenCtrl = TextEditingController(text: existing?['price_for_citizens'] != null ? existing!['price_for_citizens'].toString() : '');
  final eaCtrl = TextEditingController(text: existing?['price_for_east_african'] != null ? existing!['price_for_east_african'].toString() : '');
  final foreignerCtrl = TextEditingController(text: existing?['price_for_foreigners'] != null ? existing!['price_for_foreigners'].toString() : '');

  String currency = existing?['currency'] ?? 'RWF';
  String pricingModel = existing?['pricing_model'] ?? 'per_person';
  bool hasDiffPricing = existing?['has_differential_pricing'] == true;
  List<String> categories = List<String>.from(existing?['categories'] as List? ?? []);

  // Image state
  final _picker = ImagePicker();
  List<String> existingImageUrls = List<String>.from(existing?['images'] as List? ?? []);
  List<XFile> newPickedImages = [];
  bool _uploading = false;

  showModalBottomSheet(
    context: ctx, isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => StatefulBuilder(builder: (sCtx, setSt) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(sheetCtx).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(existing == null ? 'Add Tour' : 'Edit Tour',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 16),

          // ── Photos ──
          const Text('Photos', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          _ImagePickerRow(
            existingUrls: existingImageUrls,
            newFiles: newPickedImages,
            onAddFromGallery: () async {
              final imgs = await _picker.pickMultiImage(imageQuality: 85);
              if (imgs.isNotEmpty) setSt(() => newPickedImages.addAll(imgs));
            },
            onAddFromCamera: () async {
              final img = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
              if (img != null) setSt(() => newPickedImages.add(img));
            },
            onRemoveExisting: (i) => setSt(() => existingImageUrls.removeAt(i)),
            onRemoveNew: (i) => setSt(() => newPickedImages.removeAt(i)),
          ),
          const SizedBox(height: 16),

          _Field(ctrl: titleCtrl, label: 'Title'),
          _Field(ctrl: locCtrl, label: 'Location / Meeting Point'),
          _Field(ctrl: descCtrl, label: 'Description', maxLines: 3),
          _Field(ctrl: optActCtrl, label: 'Optional Activities', maxLines: 2),

          Row(children: [
            Expanded(child: _Field(ctrl: durationCtrl, label: 'Duration (days)', inputType: TextInputType.number)),
            const SizedBox(width: 8),
            Expanded(child: _Field(ctrl: maxPaxCtrl, label: 'Max Participants', inputType: TextInputType.number)),
          ]),

          // Pricing Model & Currency
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              key: ValueKey('pm_$pricingModel'),
              value: pricingModel,
              decoration: _inputDecoration('Pricing Model'),
              items: _kPricingModels.map((m) => DropdownMenuItem(value: m, child: Text(m.replaceAll('_', ' '), style: const TextStyle(fontSize: 13)))).toList(),
              onChanged: (v) => setSt(() => pricingModel = v ?? pricingModel),
            )),
            const SizedBox(width: 8),
            SizedBox(width: 100, child: DropdownButtonFormField<String>(
              key: ValueKey('tc_$currency'),
              value: currency,
              decoration: _inputDecoration('Currency'),
              items: _kCurrencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setSt(() => currency = v ?? currency),
            )),
          ]),
          const SizedBox(height: 12),
          _Field(ctrl: priceCtrl, label: 'Base Price per Person', inputType: TextInputType.number),

          // Categories
          const Divider(height: 24),
          const Text('Categories', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6, runSpacing: 4,
            children: _kTourCategories.map((cat) => FilterChip(
              label: Text(cat, style: const TextStyle(fontSize: 12)),
              selected: categories.contains(cat),
              selectedColor: _kRed.withValues(alpha: 0.15),
              checkmarkColor: _kRed,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              onSelected: (sel) => setSt(() { if (sel) categories.add(cat); else categories.remove(cat); }),
            )).toList(),
          ),

          // Differential pricing
          const Divider(height: 24),
          SwitchListTile(
            dense: true, contentPadding: EdgeInsets.zero,
            title: const Text('Differential Pricing (Citizen / EA / Foreign)', style: TextStyle(fontSize: 14)),
            value: hasDiffPricing, activeColor: _kRed,
            onChanged: (v) => setSt(() => hasDiffPricing = v),
          ),
          if (hasDiffPricing) ...[
            _Field(ctrl: citizenCtrl, label: 'Price for Citizens', inputType: TextInputType.number),
            _Field(ctrl: eaCtrl, label: 'Price for East Africans', inputType: TextInputType.number),
            _Field(ctrl: foreignerCtrl, label: 'Price for Foreigners', inputType: TextInputType.number),
          ],
          const SizedBox(height: 16),

          if (_uploading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: _kRed)),
                SizedBox(width: 10),
                Text('Uploading photos…', style: TextStyle(fontSize: 13, color: Colors.black54)),
              ]),
            ),

          _SaveButton(label: existing == null ? 'Create Tour' : 'Save Changes', onPressed: _uploading ? null : () async {
            setSt(() => _uploading = true);
            final newUrls = await CloudinaryService.uploadImages(
              newPickedImages.map((f) => f.path).toList(),
              folder: 'tours',
            );
            final allImages = [...existingImageUrls, ...newUrls];
            setSt(() => _uploading = false);

            final fields = <String, dynamic>{
              'title': titleCtrl.text.trim(),
              'location': locCtrl.text.trim(),
              'price_per_person': double.tryParse(priceCtrl.text.trim()) ?? 0,
              'duration_days': int.tryParse(durationCtrl.text.trim()),
              'max_participants': int.tryParse(maxPaxCtrl.text.trim()) ?? 10,
              'description': descCtrl.text.trim(),
              'optional_activities': optActCtrl.text.trim(),
              'categories': categories,
              'currency': currency,
              'pricing_model': pricingModel,
              'has_differential_pricing': hasDiffPricing,
              if (hasDiffPricing) ...{
                'price_for_citizens': double.tryParse(citizenCtrl.text.trim()),
                'price_for_east_african': double.tryParse(eaCtrl.text.trim()),
                'price_for_foreigners': double.tryParse(foreignerCtrl.text.trim()),
              },
              if (allImages.isNotEmpty) 'images': allImages,
              if (allImages.isNotEmpty) 'main_image': allImages.first,
            };
            if (existing != null) { await api.updateTour(id: existing['id'], updates: fields); }
            else { await api.createTour(userId: userId, fields: fields); }
            if (sheetCtx.mounted) Navigator.pop(sheetCtx);
            onRefresh();
          }),
          const SizedBox(height: 8),
        ]),
      ),
    )),
  );
}

// ===================== TRANSPORT =====================
class _TransportTab extends StatelessWidget {
  const _TransportTab({required this.api, required this.userId, required this.items, required this.onRefresh});
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: items.isEmpty
          ? const _EmptyState(label: 'No vehicles yet', icon: Icons.directions_car_outlined)
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (ctx, i) => _ListingCard(
                item: items[i], priceLabel: 'per day', priceField: 'price_per_day',
                onToggle: (pub) async { await api.updateTransport(id: items[i]['id'], updates: {'is_published': pub}); onRefresh(); },
                onEdit: () => _showTransportSheet(ctx, api, userId, onRefresh, existing: items[i]),
                onDelete: () async { await api.deleteTransport(id: items[i]['id']); onRefresh(); },
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.rausch, foregroundColor: AppColors.white,
        icon: const Icon(Icons.add), label: const Text('Add Vehicle'),
        onPressed: () => _showTransportSheet(context, api, userId, onRefresh),
      ),
    );
  }
}

void _showTransportSheet(BuildContext ctx, AppDatabase api, String userId, VoidCallback onRefresh, {Map<String, dynamic>? existing}) {
  final carModelCtrl = TextEditingController(text: existing?['car_model'] ?? '');
  final providerCtrl = TextEditingController(text: existing?['provider_name'] ?? '');
  final descCtrl = TextEditingController(text: existing?['description'] ?? '');
  final dailyCtrl = TextEditingController(text: existing?['daily_price'] != null ? existing!['daily_price'].toString() : '');
  final weeklyCtrl = TextEditingController(text: existing?['weekly_price'] != null ? existing!['weekly_price'].toString() : '');
  final monthlyCtrl = TextEditingController(text: existing?['monthly_price'] != null ? existing!['monthly_price'].toString() : '');

  final currentYear = DateTime.now().year;
  final years = List.generate(currentYear - 1999, (i) => 2000 + i);

  String carBrand = (_kCarBrands.contains(existing?['car_brand'])) ? existing!['car_brand'] as String : 'Toyota';
  String carType = (_kCarTypes.contains(existing?['car_type'])) ? existing!['car_type'] as String : 'SUV';
  String transmission = (_kTransmissions.contains(existing?['transmission'])) ? existing!['transmission'] as String : 'Automatic';
  String fuelType = (_kFuelTypes.contains(existing?['fuel_type'])) ? existing!['fuel_type'] as String : 'Petrol';
  String driveTrain = (_kDrivetrains.contains(existing?['drive_train'])) ? existing!['drive_train'] as String : 'AWD';
  String currency = existing?['currency'] ?? 'RWF';
  int carYear = (existing?['car_year'] as num?)?.toInt() ?? currentYear;
  int seats = (existing?['seats'] as num?)?.toInt() ?? 5;
  bool driverIncluded = existing?['driver_included'] == true;
  List<String> keyFeatures = List<String>.from(existing?['key_features'] as List? ?? []);

  // Image state
  final _picker = ImagePicker();
  List<String> existingImageUrls = List<String>.from(existing?['images'] as List? ?? []);
  List<XFile> newPickedImages = [];
  bool _uploading = false;

  showModalBottomSheet(
    context: ctx, isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => StatefulBuilder(builder: (sCtx, setSt) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(sheetCtx).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(existing == null ? 'Add Vehicle' : 'Edit Vehicle',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 16),

          // ── Photos ──
          const Text('Photos', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          _ImagePickerRow(
            existingUrls: existingImageUrls,
            newFiles: newPickedImages,
            onAddFromGallery: () async {
              final imgs = await _picker.pickMultiImage(imageQuality: 85);
              if (imgs.isNotEmpty) setSt(() => newPickedImages.addAll(imgs));
            },
            onAddFromCamera: () async {
              final img = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
              if (img != null) setSt(() => newPickedImages.add(img));
            },
            onRemoveExisting: (i) => setSt(() => existingImageUrls.removeAt(i)),
            onRemoveNew: (i) => setSt(() => newPickedImages.removeAt(i)),
          ),
          const SizedBox(height: 16),

          // Brand, Year
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              key: ValueKey('brand_$carBrand'),
              value: carBrand,
              decoration: _inputDecoration('Brand'),
              items: _kCarBrands.map((b) => DropdownMenuItem(value: b, child: Text(b, style: const TextStyle(fontSize: 13)))).toList(),
              onChanged: (v) => setSt(() => carBrand = v ?? carBrand),
            )),
            const SizedBox(width: 8),
            SizedBox(width: 90, child: DropdownButtonFormField<int>(
              key: ValueKey('year_$carYear'),
              value: years.contains(carYear) ? carYear : currentYear,
              decoration: _inputDecoration('Year'),
              items: years.reversed.toList().map((y) => DropdownMenuItem(value: y, child: Text('$y'))).toList(),
              onChanged: (v) => setSt(() => carYear = v ?? carYear),
            )),
          ]),
          const SizedBox(height: 12),
          _Field(ctrl: carModelCtrl, label: 'Model (e.g. Land Cruiser)'),

          // Car Type & Transmission
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              key: ValueKey('ct_$carType'),
              value: carType,
              decoration: _inputDecoration('Car Type'),
              items: _kCarTypes.map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 13)))).toList(),
              onChanged: (v) => setSt(() => carType = v ?? carType),
            )),
            const SizedBox(width: 8),
            Expanded(child: DropdownButtonFormField<String>(
              key: ValueKey('tr_$transmission'),
              value: transmission,
              decoration: _inputDecoration('Transmission'),
              items: _kTransmissions.map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 12)))).toList(),
              onChanged: (v) => setSt(() => transmission = v ?? transmission),
            )),
          ]),
          const SizedBox(height: 12),

          // Fuel & Drive Train
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              key: ValueKey('ft_$fuelType'),
              value: fuelType,
              decoration: _inputDecoration('Fuel Type'),
              items: _kFuelTypes.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
              onChanged: (v) => setSt(() => fuelType = v ?? fuelType),
            )),
            const SizedBox(width: 8),
            Expanded(child: DropdownButtonFormField<String>(
              key: ValueKey('dt_$driveTrain'),
              value: driveTrain,
              decoration: _inputDecoration('Drive Train'),
              items: _kDrivetrains.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
              onChanged: (v) => setSt(() => driveTrain = v ?? driveTrain),
            )),
          ]),
          const SizedBox(height: 12),

          // Seats
          _countRow('Seats', seats,
            () => setSt(() => seats = (seats - 1).clamp(1, 60)),
            () => setSt(() => seats = (seats + 1).clamp(1, 60))),

          // Pricing
          const Divider(height: 24),
          const Text('Pricing', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          Row(children: [
            Expanded(child: _Field(ctrl: dailyCtrl, label: 'Daily Price', inputType: TextInputType.number)),
            const SizedBox(width: 8),
            SizedBox(width: 100, child: DropdownButtonFormField<String>(
              key: ValueKey('vc_$currency'),
              value: currency,
              decoration: _inputDecoration('Currency'),
              items: _kCurrencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setSt(() => currency = v ?? currency),
            )),
          ]),
          Row(children: [
            Expanded(child: _Field(ctrl: weeklyCtrl, label: 'Weekly Price', inputType: TextInputType.number)),
            const SizedBox(width: 8),
            Expanded(child: _Field(ctrl: monthlyCtrl, label: 'Monthly Price', inputType: TextInputType.number)),
          ]),

          // Driver & Provider
          const Divider(height: 24),
          SwitchListTile(
            dense: true, contentPadding: EdgeInsets.zero,
            title: const Text('Driver Included', style: TextStyle(fontSize: 14)),
            value: driverIncluded, activeColor: _kRed,
            onChanged: (v) => setSt(() => driverIncluded = v),
          ),
          _Field(ctrl: providerCtrl, label: 'Provider / Company Name'),
          _Field(ctrl: descCtrl, label: 'Description', maxLines: 2),

          // Key Features
          const Divider(height: 24),
          const Text('Key Features', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6, runSpacing: 4,
            children: _kKeyFeatures.map((feat) => FilterChip(
              label: Text(feat, style: const TextStyle(fontSize: 11)),
              selected: keyFeatures.contains(feat),
              selectedColor: _kRed.withValues(alpha: 0.15),
              checkmarkColor: _kRed,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              onSelected: (sel) => setSt(() { if (sel) keyFeatures.add(feat); else keyFeatures.remove(feat); }),
            )).toList(),
          ),
          const SizedBox(height: 16),

          if (_uploading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: _kRed)),
                SizedBox(width: 10),
                Text('Uploading photos…', style: TextStyle(fontSize: 13, color: Colors.black54)),
              ]),
            ),

          _SaveButton(label: existing == null ? 'Create Vehicle' : 'Save Changes', onPressed: _uploading ? null : () async {
            setSt(() => _uploading = true);
            final newUrls = await CloudinaryService.uploadImages(
              newPickedImages.map((f) => f.path).toList(),
              folder: 'transport',
            );
            final allImages = [...existingImageUrls, ...newUrls];
            setSt(() => _uploading = false);

            final model = carModelCtrl.text.trim();
            final fields = {
              'title': '$carBrand${model.isNotEmpty ? ' $model' : ''} $carYear',
              'car_brand': carBrand,
              'car_model': model,
              'car_year': carYear,
              'car_type': carType,
              'seats': seats,
              'transmission': transmission,
              'fuel_type': fuelType,
              'drive_train': driveTrain,
              'daily_price': double.tryParse(dailyCtrl.text.trim()) ?? 0,
              'weekly_price': double.tryParse(weeklyCtrl.text.trim()),
              'monthly_price': double.tryParse(monthlyCtrl.text.trim()),
              'currency': currency,
              'driver_included': driverIncluded,
              'key_features': keyFeatures,
              'provider_name': providerCtrl.text.trim(),
              'description': descCtrl.text.trim(),
              if (allImages.isNotEmpty) 'images': allImages,
              if (allImages.isNotEmpty) 'main_image': allImages.first,
              if (allImages.isNotEmpty) 'image_url': allImages.first,
            };
            if (existing != null) { await api.updateTransport(id: existing['id'], updates: fields); }
            else { await api.createTransport(userId: userId, fields: fields); }
            if (sheetCtx.mounted) Navigator.pop(sheetCtx);
            onRefresh();
          }),
          const SizedBox(height: 8),
        ]),
      ),
    )),
  );
}

// ===================== BOOKINGS =====================
class _BookingsTab extends StatefulWidget {
  const _BookingsTab({required this.api, required this.userId, required this.bookings, required this.onRefresh});
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> bookings;
  final VoidCallback onRefresh;

  @override
  State<_BookingsTab> createState() => _BookingsTabState();
}

class _BookingsTabState extends State<_BookingsTab> {
  String _filter = 'all';
  final Set<String> _busyIds = <String>{};

  List<Map<String, dynamic>> get _filtered =>
      _filter == 'all' ? widget.bookings : widget.bookings.where((b) => b['status'] == _filter).toList();

  Future<void> _runBookingAction(String key, Future<void> Function() action, String successMessage) async {
    setState(() => _busyIds.add(key));
    try {
      await action();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(successMessage)));
      widget.onRefresh();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) {
        setState(() => _busyIds.remove(key));
      }
    }
  }

  Future<String?> _askRejectReason() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Reject booking'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Reason for rejection',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.rausch),
            onPressed: () => Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: ['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(s == 'all' ? 'All' : s[0].toUpperCase() + s.substring(1)),
                selected: _filter == s,
                selectedColor: _kRed,
                onSelected: (_) => setState(() => _filter = s),
                labelStyle: TextStyle(color: _filter == s ? Colors.white : Colors.black87, fontSize: 12),
              ),
            )).toList(),
          ),
        ),
      ),
      Expanded(
        child: _filtered.isEmpty
            ? _EmptyState(label: 'No ${_filter == 'all' ? '' : _filter} bookings', icon: Icons.calendar_today_outlined)
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: _filtered.length,
                itemBuilder: (ctx, i) {
                  final b = _filtered[i];
                  final status = b['status'] as String? ?? 'pending';
                  final actionKey = (b['order_id'] ?? b['id']).toString();
                  final isBusy = _busyIds.contains(actionKey);
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text(b['listing_title'] ?? b['item_title'] ?? 'Booking',
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
                          _StatusChip(status: status),
                        ]),
                        const SizedBox(height: 6),
                        Text('Guest: ${b['guest_name'] ?? b['user_name'] ?? '—'}',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        if ((b['guest_email'] ?? '').toString().isNotEmpty)
                          Text((b['guest_email'] ?? '').toString(),
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        if (b['check_in'] != null)
                          Text('Check-in: ${b['check_in']}  ->  ${b['check_out'] ?? ''}',
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        Text('Total: ${_formatMoney(((b['total_amount'] ?? b['total_price']) as num?) ?? 0, (b['currency'] ?? 'RWF').toString())}',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        if ((b['rejection_reason'] ?? '').toString().isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text('Reason: ${b['rejection_reason']}',
                                style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12, color: AppColors.rausch)),
                          ),
                        if (status == 'pending') ...[
                          const SizedBox(height: 10),
                          Row(children: [
                            Expanded(child: OutlinedButton(
                              style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                              onPressed: isBusy ? null : () async {
                                final reason = await _askRejectReason();
                                if (reason == null || reason.isEmpty) {
                                  return;
                                }
                                await _runBookingAction(
                                  actionKey,
                                  () => widget.api.rejectHostBookingRequest(actorUserId: widget.userId, booking: b, reason: reason),
                                  'Booking rejected',
                                );
                              },
                              child: const Text('Decline'),
                            )),
                            const SizedBox(width: 8),
                            Expanded(child: ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                              onPressed: isBusy ? null : () async {
                                await _runBookingAction(
                                  actionKey,
                                  () => widget.api.confirmHostBookingRequest(actorUserId: widget.userId, booking: b),
                                  'Booking confirmed',
                                );
                              },
                              child: const Text('Confirm'),
                            )),
                          ]),
                        ],
                        if (status == 'confirmed') ...[
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
                              onPressed: isBusy ? null : () async {
                                await _runBookingAction(
                                  actionKey,
                                  () => widget.api.markHostBookingComplete(booking: b),
                                  'Booking marked complete',
                                );
                              },
                              child: const Text('Mark Complete'),
                            ),
                          ),
                        ],
                        if ((status == 'confirmed' || status == 'completed') && (b['review_token'] ?? '').toString().isNotEmpty) ...[
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.star_outline),
                              label: Text(b['review_email_sent'] == true ? 'Review Request Sent' : 'Send Review Request'),
                              onPressed: isBusy || b['review_email_sent'] == true ? null : () async {
                                await _runBookingAction(
                                  actionKey,
                                  () => widget.api.sendBookingReviewEmail(booking: b),
                                  'Review request sent',
                                );
                              },
                            ),
                          ),
                        ],
                      ]),
                    ),
                  );
                },
              ),
      ),
    ]);
  }
}

// ===================== MANUAL REVIEWS =====================
class _ManualReviewsTab extends StatelessWidget {
  const _ManualReviewsTab({
    required this.api,
    required this.userId,
    required this.properties,
    required this.requests,
    required this.onRefresh,
  });

  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> properties;
  final List<Map<String, dynamic>> requests;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return _ManualReviewsContent(
      api: api,
      userId: userId,
      properties: properties,
      requests: requests,
      onRefresh: onRefresh,
    );
  }
}

class _ManualReviewsContent extends StatefulWidget {
  const _ManualReviewsContent({required this.api, required this.userId, required this.properties, required this.requests, required this.onRefresh});

  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> properties;
  final List<Map<String, dynamic>> requests;
  final VoidCallback onRefresh;

  @override
  State<_ManualReviewsContent> createState() => _ManualReviewsContentState();
}

class _ManualReviewsContentState extends State<_ManualReviewsContent> {
  String? _propertyId;
  final _emailCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final propertyId = (_propertyId ?? '').trim();
    final reviewerEmail = _emailCtrl.text.trim();
    final reviewerName = _nameCtrl.text.trim();
    if (propertyId.isEmpty || reviewerEmail.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a property and enter an email.')));
      return;
    }

    setState(() => _sending = true);
    try {
      await widget.api.sendManualReviewRequest(
        userId: widget.userId,
        propertyId: propertyId,
        reviewerEmail: reviewerEmail,
        reviewerName: reviewerName.isEmpty ? null : reviewerName,
      );
      if (!mounted) return;
      _emailCtrl.clear();
      _nameCtrl.clear();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Review request sent to $reviewerEmail')));
      widget.onRefresh();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Manual Reviews', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.black)),
          const SizedBox(height: 6),
          const Text('Send a direct review link for a selected property. No booking is required.', style: TextStyle(fontSize: 13, color: AppColors.foggy)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFEBEBEB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<String>(
                  key: ValueKey(_propertyId),
                  value: _propertyId,
                  decoration: _inputDecoration('Property'),
                  hint: const Text('Select property'),
                  items: widget.properties.map((property) => DropdownMenuItem<String>(
                    value: property['id']?.toString(),
                    child: Text((property['title'] ?? 'Property').toString(), overflow: TextOverflow.ellipsis),
                  )).toList(),
                  onChanged: (value) => setState(() => _propertyId = value),
                ),
                const SizedBox(height: 12),
                _Field(ctrl: _emailCtrl, label: 'Reviewer Email', inputType: TextInputType.emailAddress),
                _Field(ctrl: _nameCtrl, label: 'Reviewer Name (optional)'),
                const SizedBox(height: 8),
                _SaveButton(label: _sending ? 'Sending…' : 'Send Review Request', onPressed: _sending ? null : _send),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Recent Requests', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.black)),
          const SizedBox(height: 10),
          if (widget.requests.isEmpty)
            const _EmptyState(label: 'No manual review requests yet', icon: Icons.mail_outline)
          else
            ...widget.requests.map((request) {
              final status = (request['status'] ?? 'pending').toString();
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFEBEBEB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            (request['propertyTitle'] ?? 'Property').toString(),
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.black),
                          ),
                        ),
                        _StatusChip(status: status == 'collected' ? 'completed' : status == 'sent' ? 'confirmed' : 'pending'),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text((request['reviewerEmail'] ?? '').toString(), style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
                    if ((request['reviewerName'] ?? '').toString().isNotEmpty)
                      Text((request['reviewerName'] ?? '').toString(), style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
                    if (request['createdAt'] != null)
                      Text('Created ${request['createdAt'].toString().substring(0, 10)}', style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

// ===================== CALENDAR =====================
class _CalendarTab extends StatefulWidget {
  const _CalendarTab({required this.api, required this.properties});
  final AppDatabase api;
  final List<Map<String, dynamic>> properties;

  @override
  State<_CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends State<_CalendarTab> {
  String? _selectedPropertyId;
  bool _loadingEx = false;
  final Set<DateTime> _blockedDays = {};
  DateTime _focusedDay = DateTime.now();

  Future<void> _loadExceptions(String propertyId) async {
    setState(() { _loadingEx = true; _blockedDays.clear(); });
    final data = await widget.api.fetchAvailabilityExceptions(propertyId: propertyId);
    final blocked = <DateTime>{};
    for (final e in data) {
      if (e['available'] == false) {
        try { blocked.add(DateTime.parse(e['date'] as String)); } catch (_) {}
      }
    }
    setState(() { _blockedDays.addAll(blocked); _loadingEx = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.properties.isEmpty) {
      return const _EmptyState(label: 'Add a property first', icon: Icons.calendar_month_outlined);
    }
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: DropdownButtonFormField<String>(
          key: ValueKey(_selectedPropertyId),
          initialValue: _selectedPropertyId,
          hint: const Text('Select a property'),
          decoration: _inputDecoration('Property'),
          items: widget.properties.map((p) => DropdownMenuItem<String>(
            value: p['id'] as String?,
            child: Text(p['title'] as String? ?? 'Property', overflow: TextOverflow.ellipsis),
          )).toList(),
          onChanged: (v) { if (v != null) { setState(() => _selectedPropertyId = v); _loadExceptions(v); } },
        ),
      ),
      if (_selectedPropertyId != null)
        _loadingEx
            ? const CircularProgressIndicator(color: _kRed)
            : Expanded(child: Column(children: [
                TableCalendar(
                  firstDay: DateTime.now().subtract(const Duration(days: 30)),
                  lastDay: DateTime.now().add(const Duration(days: 365)),
                  focusedDay: _focusedDay,
                  onPageChanged: (fd) => setState(() => _focusedDay = fd),
                  calendarBuilders: CalendarBuilders(
                    defaultBuilder: (ctx, day, _) {
                      final norm = DateTime(day.year, day.month, day.day);
                      final blocked = _blockedDays.contains(norm);
                      return Container(
                        margin: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: blocked ? _kRed.withValues(alpha: 0.15) : null,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        alignment: Alignment.center,
                        child: Text('${day.day}', style: TextStyle(color: blocked ? _kRed : null)),
                      );
                    },
                  ),
                  onDaySelected: (selectedDay, focusedDay) async {
                    setState(() => _focusedDay = focusedDay);
                    final norm = DateTime(selectedDay.year, selectedDay.month, selectedDay.day);
                    final dateStr = DateFormat('yyyy-MM-dd').format(norm);
                    if (_blockedDays.contains(norm)) {
                      await widget.api.deleteAvailabilityException(propertyId: _selectedPropertyId!, date: dateStr);
                      setState(() => _blockedDays.remove(norm));
                    } else {
                      await widget.api.setAvailabilityException(propertyId: _selectedPropertyId!, date: dateStr, available: false);
                      setState(() => _blockedDays.add(norm));
                    }
                  },
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(children: [
                    Container(width: 16, height: 16, decoration: BoxDecoration(
                        color: _kRed.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(3))),
                    const SizedBox(width: 8),
                    const Text('Blocked', style: TextStyle(fontSize: 12, color: Colors.black54)),
                    const Spacer(),
                    const Icon(Icons.touch_app, size: 14, color: Colors.black45),
                    const SizedBox(width: 4),
                    const Text('Tap to toggle', style: TextStyle(fontSize: 12, color: Colors.black45)),
                  ]),
                ),
              ])),
    ]);
  }
}

// ===================== DISCOUNTS =====================
class _DiscountsTab extends StatelessWidget {
  const _DiscountsTab({required this.api, required this.userId, required this.items, required this.onRefresh});
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: items.isEmpty
          ? const _EmptyState(label: 'No discount codes yet', icon: Icons.local_offer_outlined)
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (ctx, i) {
                final d = items[i];
                final isActive = d['is_active'] == true;
                final type = d['discount_type'] as String? ?? 'percentage';
                final value = (d['discount_value'] as num?) ?? 0;
                final uses = (d['uses_count'] as num?)?.toInt() ?? 0;
                final maxUses = (d['max_uses'] as num?)?.toInt();
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEBEBEB)),
                  ),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                          color: isActive ? AppColors.rausch.withValues(alpha: 0.08) : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(6)),
                      child: Text(d['code'] as String? ?? '',
                          style: TextStyle(fontWeight: FontWeight.w700, color: isActive ? AppColors.rausch : AppColors.foggy)),
                    ),
                    title: Text(type == 'percentage' ? '${value.toStringAsFixed(0)}% off' : '\$${value.toStringAsFixed(2)} off',
                        style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.black)),
                    subtitle: Text('Used $uses${maxUses != null ? " / $maxUses" : ""} times',
                        style: const TextStyle(color: AppColors.foggy)),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Switch(value: isActive, activeColor: const Color(0xFF008489), onChanged: (v) async {
                        await api.toggleDiscount(id: d['id'], active: v); onRefresh();
                      }),
                      IconButton(icon: const Icon(Icons.delete_outline, color: AppColors.rausch), onPressed: () async {
                        await api.deleteDiscount(id: d['id']); onRefresh();
                      }),
                    ]),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.rausch, foregroundColor: AppColors.white,
        icon: const Icon(Icons.add), label: const Text('Add Code'),
        onPressed: () => _showDiscountSheet(context, api, userId, onRefresh),
      ),
    );
  }
}

void _showDiscountSheet(BuildContext ctx, AppDatabase api, String userId, VoidCallback onRefresh) {
  final codeCtrl = TextEditingController();
  final descCtrl = TextEditingController();
  final valueCtrl = TextEditingController();
  final maxUsesCtrl = TextEditingController();
  final minAmountCtrl = TextEditingController(text: '0');
  String discountType = 'percentage';
  String currency = 'RWF';
  String appliesTo = 'all';
  DateTime? validUntil;

  showModalBottomSheet(
    context: ctx, isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => StatefulBuilder(builder: (sCtx, setSt) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(sheetCtx).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Create Discount Code', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 16),
          _Field(ctrl: codeCtrl, label: 'Code (e.g. SAVE20)', capitalization: TextCapitalization.characters),
          _Field(ctrl: descCtrl, label: 'Description'),
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(
              key: ValueKey('dt_$discountType'),
              value: discountType,
              decoration: _inputDecoration('Discount Type'),
              items: const [
                DropdownMenuItem(value: 'percentage', child: Text('Percentage (%)')),
                DropdownMenuItem(value: 'fixed', child: Text('Fixed Amount')),
              ],
              onChanged: (v) => setSt(() => discountType = v ?? discountType),
            )),
            const SizedBox(width: 8),
            SizedBox(width: 100, child: DropdownButtonFormField<String>(
              key: ValueKey('dc_$currency'),
              value: currency,
              decoration: _inputDecoration('Currency'),
              items: _kCurrencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setSt(() => currency = v ?? currency),
            )),
          ]),
          const SizedBox(height: 12),
          _Field(ctrl: valueCtrl, label: 'Value', inputType: TextInputType.number),
          _Field(ctrl: maxUsesCtrl, label: 'Max Uses (blank = unlimited)', inputType: TextInputType.number),
          _Field(ctrl: minAmountCtrl, label: 'Minimum Booking Amount', inputType: TextInputType.number),
          DropdownButtonFormField<String>(
            key: ValueKey('at_$appliesTo'),
            value: appliesTo,
            decoration: _inputDecoration('Applies To'),
            items: _kDiscountAppliesTo.map((a) => DropdownMenuItem(value: a, child: Text(a[0].toUpperCase() + a.substring(1)))).toList(),
            onChanged: (v) => setSt(() => appliesTo = v ?? appliesTo),
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Expiry Date (optional)', style: TextStyle(fontSize: 14)),
            subtitle: Text(
              validUntil != null ? DateFormat('dd MMM yyyy').format(validUntil!) : 'No expiry',
              style: TextStyle(color: validUntil != null ? _kRed : Colors.black45, fontSize: 13),
            ),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(
                icon: const Icon(Icons.calendar_today_outlined, size: 20),
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: sheetCtx,
                    initialDate: validUntil ?? DateTime.now().add(const Duration(days: 30)),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
                    builder: (ctx, child) => Theme(
                      data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: _kRed)),
                      child: child!,
                    ),
                  );
                  if (picked != null) setSt(() => validUntil = picked);
                },
              ),
              if (validUntil != null)
                IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () => setSt(() => validUntil = null)),
            ]),
          ),
          const SizedBox(height: 16),
          _SaveButton(label: 'Create Code', onPressed: () async {
            await api.createDiscount(
              userId: userId,
              code: codeCtrl.text.trim(),
              discountType: discountType,
              discountValue: double.tryParse(valueCtrl.text.trim()) ?? 0,
              maxUses: int.tryParse(maxUsesCtrl.text.trim()),
              description: descCtrl.text.trim().isNotEmpty ? descCtrl.text.trim() : null,
              currency: currency,
              minimumAmount: double.tryParse(minAmountCtrl.text.trim()) ?? 0,
              validUntil: validUntil != null ? DateFormat('yyyy-MM-dd').format(validUntil!) : null,
              appliesTo: appliesTo,
            );
            if (sheetCtx.mounted) Navigator.pop(sheetCtx);
            onRefresh();
          }),
          const SizedBox(height: 8),
        ]),
      ),
    )),
  );
}

// ===================== FINANCIAL =====================
class _FinancialTab extends StatelessWidget {
  const _FinancialTab({required this.stats, required this.payouts, required this.payoutMethods, required this.api, required this.userId, required this.onRefresh});
  final Map<String, dynamic>? stats;
  final List<Map<String, dynamic>> payouts, payoutMethods;
  final AppDatabase api;
  final String userId;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final currency = (stats?['currency'] ?? 'RWF').toString();
    final revenue = (stats?['net_earnings'] as num?) ?? (stats?['total_revenue'] as num?) ?? 0;
    final pending = (stats?['pending_payout'] as num?) ?? 0;
    final completed = (stats?['completed_payout'] as num?) ?? 0;
    final available = (stats?['available_for_payout'] as num?) ?? 0;
    final totalBookings = (stats?['total_bookings'] as num?)?.toInt() ?? 0;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: _StatCard(title: 'Net Earnings', value: _formatMoney(revenue, currency), icon: Icons.payments_outlined, color: Colors.green)),
          const SizedBox(width: 10),
          Expanded(child: _StatCard(title: 'Available for payout', value: _formatMoney(available, currency), icon: Icons.account_balance_wallet_outlined, color: Colors.amber)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _StatCard(title: 'Pending payouts', value: _formatMoney(pending, currency), icon: Icons.schedule_outlined, color: Colors.orange)),
          const SizedBox(width: 10),
          Expanded(child: _StatCard(title: 'Completed payouts', value: _formatMoney(completed, currency), icon: Icons.check_circle_outline, color: Colors.blue)),
        ]),
        const SizedBox(height: 10),
        _StatCard(title: 'Total Bookings', value: '$totalBookings', icon: Icons.calendar_today_outlined, color: _kRed),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: AppColors.rausch, foregroundColor: AppColors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            icon: const Icon(Icons.send),
            label: const Text('Request Payout', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            onPressed: () => _showRequestPayoutSheet(context, api, userId, payoutMethods, available.toDouble(), currency, onRefresh),
          ),
        ),
        const SizedBox(height: 24),
        _sectionTitle('Payout History'),
        const SizedBox(height: 8),
        if (payouts.isEmpty)
          const Text('No payouts yet.', style: TextStyle(color: Colors.black45))
        else
          ...payouts.map((p) => _PayoutRow(payout: p)),
      ]),
    );
  }
}

void _showRequestPayoutSheet(BuildContext ctx, AppDatabase api, String userId,
  List<Map<String, dynamic>> methods, double availBalance, String currency, VoidCallback onRefresh) {
  final amountCtrl = TextEditingController(text: availBalance.toStringAsFixed(2));
  String? selectedMethodId;
  String? selectedMethodType;

  showModalBottomSheet(
    context: ctx, isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => StatefulBuilder(builder: (sCtx, setSt) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(sheetCtx).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Request Payout', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 16),
          _Field(ctrl: amountCtrl, label: 'Amount ($currency)', inputType: TextInputType.number),
          if (methods.isNotEmpty)
            DropdownButtonFormField<String>(
              key: ValueKey(selectedMethodId),
              initialValue: selectedMethodId,
              decoration: _inputDecoration('Payout Method'),
              hint: const Text('Select method'),
              items: methods.map((m) => DropdownMenuItem<String>(
                value: m['id'] as String?,
                child: Text(
                m['method_type'] == 'mobile_money'
                    ? 'Mobile Money (${m['mobile_provider'] ?? ''}) - ${m['phone_number'] ?? ''}'
                    : 'Bank (${m['bank_name'] ?? ''}) - ${m['bank_account_number'] ?? ''}',
              ),
              )).toList(),
              onChanged: (v) => setSt(() {
                selectedMethodId = v;
                selectedMethodType = methods.firstWhere((m) => m['id'] == v, orElse: () => {})['method_type']?.toString();
              }),
            )
          else
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text('No payout methods added yet. Add one in the Payouts tab.',
                  style: TextStyle(color: Colors.orange, fontSize: 13)),
            ),
          const SizedBox(height: 16),
          _SaveButton(
            label: 'Submit Request',
            onPressed: methods.isEmpty ? null : () async {
              await api.requestPayout(
                userId: userId,
                amount: double.tryParse(amountCtrl.text.trim()) ?? availBalance,
                currency: currency,
                payoutMethodId: selectedMethodId,
                payoutMethodType: selectedMethodType,
              );
              if (sheetCtx.mounted) Navigator.pop(sheetCtx);
              onRefresh();
            },
          ),
          const SizedBox(height: 8),
        ]),
      ),
    )),
  );
}

// ===================== PAYOUT METHODS =====================
class _PayoutMethodsTab extends StatelessWidget {
  const _PayoutMethodsTab({required this.api, required this.userId, required this.methods, required this.onRefresh});
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> methods;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: methods.isEmpty
          ? const _EmptyState(label: 'No payout methods added', icon: Icons.account_balance_outlined)
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: methods.length,
              itemBuilder: (ctx, i) {
                final m = methods[i];
                final isPrimary = m['is_primary'] == true;
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEBEBEB)),
                  ),
                  child: ListTile(
                    leading: Icon(
                      m['method_type'] == 'mobile_money' ? Icons.phone_android : Icons.account_balance,
                      color: AppColors.rausch,
                    ),
                    title: Text('${m['account_name'] ?? ''} (${(m['method_type'] as String? ?? '').replaceAll('_', ' ')})',
                        style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.black)),
                    subtitle: Text(
                      m['method_type'] == 'mobile_money'
                          ? '${m['mobile_provider'] ?? ''} \u00b7 ${m['phone_number'] ?? ''}'
                          : '${m['bank_name'] ?? ''} \u00b7 ${m['bank_account_number'] ?? ''}',
                      style: const TextStyle(color: AppColors.foggy),
                    ),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      if (isPrimary) const Icon(Icons.star, color: Color(0xFFFFB400), size: 18),
                      if (!isPrimary) TextButton(
                        child: const Text('Set Primary', style: TextStyle(color: AppColors.black)),
                        onPressed: () async { await api.setPrimaryPayoutMethod(id: m['id'], userId: userId); onRefresh(); },
                      ),
                      IconButton(icon: const Icon(Icons.delete_outline, color: AppColors.rausch), onPressed: () async {
                        await api.deletePayoutMethod(id: m['id']); onRefresh();
                      }),
                    ]),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.rausch, foregroundColor: AppColors.white,
        icon: const Icon(Icons.add), label: const Text('Add Method'),
        onPressed: () => _showPayoutMethodSheet(context, api, userId, onRefresh),
      ),
    );
  }
}

void _showPayoutMethodSheet(BuildContext ctx, AppDatabase api, String userId, VoidCallback onRefresh) {
  final nameCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final bankNameCtrl = TextEditingController();
  final bankAcctCtrl = TextEditingController();
  String methodType = 'mobile_money';
  String mobileProvider = 'MTN';

  showModalBottomSheet(
    context: ctx, isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => StatefulBuilder(builder: (sCtx, setSt) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(sheetCtx).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Add Payout Method', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            key: ValueKey('mt_$methodType'),
            value: methodType,
            decoration: _inputDecoration('Method Type'),
            items: const [
              DropdownMenuItem(value: 'mobile_money', child: Text('Mobile Money')),
              DropdownMenuItem(value: 'bank_transfer', child: Text('Bank Transfer')),
            ],
            onChanged: (v) => setSt(() => methodType = v ?? methodType),
          ),
          const SizedBox(height: 12),
          _Field(ctrl: nameCtrl, label: 'Account Holder Name'),
          if (methodType == 'mobile_money') ...[
            DropdownButtonFormField<String>(
              key: ValueKey('mp_$mobileProvider'),
              value: mobileProvider,
              decoration: _inputDecoration('Mobile Provider'),
              items: _kMobileProviders.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
              onChanged: (v) => setSt(() => mobileProvider = v ?? mobileProvider),
            ),
            const SizedBox(height: 12),
            _Field(ctrl: phoneCtrl, label: 'Phone Number', inputType: TextInputType.phone),
          ] else ...[
            _Field(ctrl: bankNameCtrl, label: 'Bank Name'),
            _Field(ctrl: bankAcctCtrl, label: 'Bank Account Number'),
          ],
          const SizedBox(height: 16),
          _SaveButton(label: 'Save Method', onPressed: () async {
            await api.createPayoutMethod(
              userId: userId,
              methodType: methodType,
              accountName: nameCtrl.text.trim(),
              phoneNumber: methodType == 'mobile_money' ? phoneCtrl.text.trim() : null,
              mobileProvider: methodType == 'mobile_money' ? mobileProvider : null,
              bankName: methodType == 'bank_transfer' ? bankNameCtrl.text.trim() : null,
              bankAccountNumber: methodType == 'bank_transfer' ? bankAcctCtrl.text.trim() : null,
            );
            if (sheetCtx.mounted) Navigator.pop(sheetCtx);
            onRefresh();
          }),
          const SizedBox(height: 8),
        ]),
      ),
    )),
  );
}

// ===================== SHARED WIDGETS =====================
class _ListingCard extends StatelessWidget {
  const _ListingCard({
    required this.item, required this.onToggle, required this.onEdit, required this.onDelete,
    this.priceLabel = 'per night', this.priceField = 'price_per_night',
  });
  final Map<String, dynamic> item;
  final void Function(bool) onToggle;
  final VoidCallback? onEdit;
  final VoidCallback onDelete;
  final String priceLabel;
  final String priceField;

  @override
  Widget build(BuildContext context) {
    final imgUrl = resolveListingImageUrl(item);
    final published = item['is_published'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (imgUrl != null)
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            child: Image.network(imgUrl, height: 160, width: double.infinity, fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => const SizedBox(height: 60)),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item['title'] as String? ?? '—',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: AppColors.black),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              if (item['location'] != null)
                Text(item['location'].toString(), style: const TextStyle(color: AppColors.foggy, fontSize: 13)),
              if (item[priceField] != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('\$${(item[priceField] as num).toStringAsFixed(2)} $priceLabel',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.black)),
                ),
            ])),
            Row(mainAxisSize: MainAxisSize.min, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: published ? const Color(0xFF008489).withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(published ? 'Live' : 'Draft',
                    style: TextStyle(fontSize: 11, color: published ? const Color(0xFF008489) : AppColors.foggy,
                        fontWeight: FontWeight.w600)),
              ),
              const SizedBox(width: 4),
              Switch(value: published, activeColor: const Color(0xFF008489), onChanged: onToggle),
            ]),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.only(left: 8, right: 8, bottom: 10),
          child: Row(children: [
            if (onEdit != null)
              TextButton.icon(icon: const Icon(Icons.edit_outlined, size: 16, color: AppColors.black), label: const Text('Edit', style: TextStyle(color: AppColors.black)), onPressed: onEdit),
            TextButton.icon(
              icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.rausch),
              label: const Text('Delete', style: TextStyle(color: AppColors.rausch)),
              onPressed: () => showDialog(context: context, builder: (dCtx) => AlertDialog(
                title: const Text('Delete listing?'),
                content: const Text('This cannot be undone.'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(dCtx), child: const Text('Cancel')),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.rausch),
                    onPressed: () { Navigator.pop(dCtx); onDelete(); },
                    child: const Text('Delete'),
                  ),
                ],
              )),
            ),
          ]),
        ),
      ]),
    );
  }
}

String _formatMoney(num amount, String currency) {
  final needsDecimals = currency != 'RWF' && amount % 1 != 0;
  return '$currency ${needsDecimals ? amount.toStringAsFixed(2) : amount.toStringAsFixed(0)}';
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.title, required this.value, required this.icon, required this.color});
  final String title, value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppColors.black)),
          const SizedBox(height: 2),
          Text(title, style: const TextStyle(color: AppColors.foggy, fontSize: 12)),
        ])),
      ]),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  Color get _c {
    switch (status) {
      case 'confirmed': return Colors.green;
      case 'pending': return Colors.amber;
      case 'completed': return Colors.blue;
      case 'cancelled': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: _c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
    child: Text(status[0].toUpperCase() + status.substring(1),
        style: TextStyle(color: _c, fontSize: 11, fontWeight: FontWeight.w600)),
  );
}

class _BookingSummaryRow extends StatelessWidget {
  const _BookingSummaryRow({required this.booking});
  final Map<String, dynamic> booking;

  @override
  Widget build(BuildContext context) {
    final status = booking['status'] as String? ?? 'pending';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(booking['listing_title'] ?? booking['item_title'] ?? '—',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: AppColors.black)),
          const SizedBox(height: 2),
          Text(booking['guest_name'] ?? booking['user_name'] ?? '—',
              style: const TextStyle(color: AppColors.foggy, fontSize: 13)),
        ])),
        _StatusChip(status: status),
      ]),
    );
  }
}

class _PayoutRow extends StatelessWidget {
  const _PayoutRow({required this.payout});
  final Map<String, dynamic> payout;

  @override
  Widget build(BuildContext context) {
    final status = payout['status'] as String? ?? 'pending';
    final amount = (payout['amount'] as num?) ?? 0;
    final currency = payout['currency'] as String? ?? 'USD';
    return Container(
      margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Row(children: [
        const Icon(Icons.send, size: 18, color: AppColors.rausch),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$currency ${amount.toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: AppColors.black)),
          if (payout['created_at'] != null)
            Text(payout['created_at'].toString().substring(0, 10),
                style: const TextStyle(color: AppColors.foggy, fontSize: 12)),
        ])),
        _StatusChip(status: status),
      ]),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.label, required this.icon});
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 56, color: AppColors.hackberry),
    const SizedBox(height: 16),
    Text(label, style: const TextStyle(color: AppColors.foggy, fontSize: 16), textAlign: TextAlign.center),
  ]));
}

class _SaveButton extends StatelessWidget {
  const _SaveButton({required this.label, required this.onPressed});
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: FilledButton(
      style: FilledButton.styleFrom(backgroundColor: AppColors.rausch, foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
      onPressed: onPressed,
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
    ),
  );
}

// ── Helpers ──
Widget _sectionTitle(String text) =>
    Text(text, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.black));

Widget _countRow(String label, int value, VoidCallback dec, VoidCallback inc) => Padding(
  padding: const EdgeInsets.symmetric(vertical: 4),
  child: Row(children: [
    Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
    IconButton(icon: const Icon(Icons.remove_circle_outline, size: 20), onPressed: dec, visualDensity: VisualDensity.compact),
    SizedBox(width: 32, child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
    IconButton(icon: const Icon(Icons.add_circle_outline, size: 20), onPressed: inc, visualDensity: VisualDensity.compact),
  ]),
);

InputDecoration _inputDecoration(String label) => InputDecoration(
  labelText: label,
  labelStyle: const TextStyle(color: AppColors.foggy),
  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.black, width: 2)),
  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
);

class _Field extends StatelessWidget {
  const _Field({
    required this.ctrl, required this.label,
    this.inputType = TextInputType.text, this.maxLines = 1,
    this.capitalization = TextCapitalization.sentences,
  });
  final TextEditingController ctrl;
  final String label;
  final TextInputType inputType;
  final int maxLines;
  final TextCapitalization capitalization;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextField(
      controller: ctrl, keyboardType: inputType, maxLines: maxLines,
      textCapitalization: capitalization,
      decoration: _inputDecoration(label),
    ),
  );
}

// ── Image Picker Row ──
class _ImagePickerRow extends StatelessWidget {
  const _ImagePickerRow({
    required this.existingUrls,
    required this.newFiles,
    required this.onAddFromGallery,
    required this.onAddFromCamera,
    required this.onRemoveExisting,
    required this.onRemoveNew,
  });

  final List<String> existingUrls;
  final List<XFile> newFiles;
  final VoidCallback onAddFromGallery;
  final VoidCallback onAddFromCamera;
  final void Function(int index) onRemoveExisting;
  final void Function(int index) onRemoveNew;

  @override
  Widget build(BuildContext context) {
    final totalHasImages = existingUrls.isNotEmpty || newFiles.isNotEmpty;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Thumbnail strip
      if (totalHasImages)
        SizedBox(
          height: 90,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              // Existing (already-uploaded) thumbnails
              ...existingUrls.asMap().entries.map((e) => _Thumb(
                child: Image.network(e.value, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_outlined)),
                onRemove: () => onRemoveExisting(e.key),
              )),
              // Newly picked (not yet uploaded) thumbnails
              ...newFiles.asMap().entries.map((e) => _Thumb(
                child: Image.file(File(e.value.path), fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade200, child: const Icon(Icons.image_outlined, color: Colors.grey))),
                onRemove: () => onRemoveNew(e.key),
                badge: const Icon(Icons.upload_outlined, size: 12, color: Colors.white),
              )),
            ],
          ),
        ),
      if (totalHasImages) const SizedBox(height: 8),
      // Add buttons
      Row(children: [
        OutlinedButton.icon(
          onPressed: onAddFromGallery,
          icon: const Icon(Icons.photo_library_outlined, size: 18),
          label: const Text('Gallery', style: TextStyle(fontSize: 13)),
          style: OutlinedButton.styleFrom(
            foregroundColor: _kRed,
            side: const BorderSide(color: _kRed),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
        ),
        const SizedBox(width: 8),
        OutlinedButton.icon(
          onPressed: onAddFromCamera,
          icon: const Icon(Icons.camera_alt_outlined, size: 18),
          label: const Text('Camera', style: TextStyle(fontSize: 13)),
          style: OutlinedButton.styleFrom(
            foregroundColor: _kRed,
            side: const BorderSide(color: _kRed),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
        ),
        if (totalHasImages) ...[
          const SizedBox(width: 8),
          Text(
            '${existingUrls.length + newFiles.length} photo${existingUrls.length + newFiles.length == 1 ? '' : 's'}',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
        ],
      ]),
    ]);
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.child, required this.onRemove, this.badge});
  final Widget child;
  final VoidCallback onRemove;
  final Widget? badge;

  @override
  Widget build(BuildContext context) => Container(
    width: 80, height: 80,
    margin: const EdgeInsets.only(right: 8),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(8),
      color: Colors.grey.shade100,
    ),
    child: Stack(fit: StackFit.expand, children: [
      ClipRRect(borderRadius: BorderRadius.circular(8), child: child),
      if (badge != null)
        Positioned(
          bottom: 4, left: 4,
          child: Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
            child: badge,
          ),
        ),
      Positioned(
        top: 2, right: 2,
        child: GestureDetector(
          onTap: onRemove,
          child: Container(
            width: 20, height: 20,
            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
            child: const Icon(Icons.close, size: 14, color: Colors.white),
          ),
        ),
      ),
    ]),
  );
}
