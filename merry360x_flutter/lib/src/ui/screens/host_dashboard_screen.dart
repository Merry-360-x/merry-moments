// ignore_for_file: unused_element

import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../services/cloudinary_service.dart';
import '../../services/app_database.dart';
import '../../services/local_draft_store.dart';
import '../../session_controller.dart';
import '../../app.dart';
import '../widgets/return_button.dart';
import 'explore_screen.dart' show resolveListingImageUrl;
import 'tour_package_wizard_screen.dart';
import 'host_quick_create_screen.dart';
import 'vehicle_wizard_screen.dart';
import 'airport_transfer_wizard_screen.dart';
import 'property_wizard_screen.dart';
import 'tour_wizard_screen.dart';

const _kRed = AppColors.rausch;

// ── Host Form Constants ──
const _kCurrencies = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'];
const _kPropertyTypes = [
  'Hotel',
  'Apartment',
  'Room in Apartment',
  'Villa',
  'Guesthouse',
  'Resort',
  'Lodge',
  'Motel',
  'House',
  'Cabin',
];
const _kCancellationPolicies = ['strict', 'fair', 'lenient'];
const _kTourCategories = [
  'Nature',
  'Adventure',
  'Cultural',
  'Wildlife',
  'Historical',
  'City Tours',
  'Eco-Tourism',
  'Photography',
];
const _kPricingModels = ['per_person', 'per_group', 'per_hour'];
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
  'Jeep',
  'Land Rover',
  'Range Rover',
  'Porsche',
  'Lexus',
  'Infiniti',
  'Subaru',
  'Volvo',
  'Peugeot',
  'Renault',
  'Isuzu',
  'Other',
];
const _kCarTypes = [
  'SUV',
  'Sedan',
  'Hatchback',
  'Coupe',
  'Convertible',
  'Van',
  'Minibus',
  'Bus',
  'Pickup Truck',
  'Luxury Car',
  'Sports Car',
  'Crossover',
];
const _kTransmissions = ['Automatic', 'Manual', 'Hybrid (CVT)'];
const _kFuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const _kDrivetrains = ['FWD', 'RWD', 'AWD', '4WD'];
const _kKeyFeatures = [
  'Air Conditioning',
  'Bluetooth',
  'GPS Navigation',
  'Backup Camera',
  'Cruise Control',
  'Leather Seats',
  'Sunroof/Moonroof',
  'Heated Seats',
  'Apple CarPlay',
  'Android Auto',
  'USB Ports',
  'WiFi Hotspot',
  'Parking Sensors',
  'Keyless Entry',
  'Push Button Start',
  'Blind Spot Monitor',
  'Lane Departure Warning',
  'Emergency Braking',
  'Roof Rack',
  'Third Row Seating',
];
const _kMobileProviders = ['MTN', 'Airtel', 'Tigo', 'M-Pesa', 'Orange'];
const _kDiscountAppliesTo = ['all', 'properties', 'tours', 'transport'];
const _kAmenityOptions = {
  'wifi': 'Wi-Fi',
  'tv_smart': 'Smart TV',
  'tv_basic': 'Basic TV',
  'parking_free': 'Free Parking',
  'parking_paid': 'Paid Parking',
  'workspace': 'Workspace',
  'wardrobe': 'Wardrobe',
  'safe': 'Safe',
  'ac': 'Air Conditioning',
  'heating': 'Heating',
  'fans': 'Fans',
  'hot_water': 'Hot Water',
  'toiletries': 'Toiletries',
  'bathroom_essentials': 'Bathroom Essentials',
  'bedsheets_pillows': 'Bed Linens & Pillows',
  'washing_machine': 'Washing Machine',
  'dryer': 'Dryer',
  'iron': 'Iron & Board',
  'kitchen': 'Full Kitchen',
  'kitchenette': 'Kitchenette',
  'refrigerator': 'Refrigerator',
  'microwave': 'Microwave',
  'stove': 'Stove/Cooker',
  'oven': 'Oven',
  'dishwasher': 'Dishwasher',
  'cookware': 'Cookware',
  'dishes': 'Dishes & Utensils',
  'kettle': 'Electric Kettle',
  'coffee_maker': 'Coffee Maker',
  'breakfast_included': 'Breakfast Included',
  'breakfast_available': 'Breakfast (Paid)',
  'gym': 'Gym',
  'pool': 'Swimming Pool',
  'spa': 'Spa',
  'jacuzzi': 'Hot Tub',
  'smoke_alarm': 'Smoke Alarm',
  'fire_extinguisher': 'Fire Extinguisher',
  'first_aid': 'First Aid Kit',
  'security_cameras': 'Security Cameras',
  'security_system': 'Security System',
  'no_smoking': 'No Smoking',
  'pets_allowed': 'Pets Allowed',
  'balcony': 'Balcony',
  'patio': 'Patio',
  'garden': 'Garden',
  'terrace': 'Terrace',
  'city_view': 'City View',
  'mountain_view': 'Mountain View',
  'sea_view': 'Sea View',
  'lake_view': 'Lake View',
  'landscape_view': 'Landscape View',
  'elevator': 'Elevator',
  'wheelchair_accessible': 'Wheelchair Accessible',
  'meeting_room': 'Meeting Room',
  'reception': '24/7 Reception',
  'restaurant': 'On-site Restaurant',
  'room_service': 'Room Service',
  'family_friendly': 'Family Friendly',
  'crib': 'Crib/Baby Bed',
  'fireplace': 'Fireplace',
  'air_purifier': 'Air Purifier',
};

String _hostDraftKey(String formType, String userId) =>
    LocalDraftStore.key('host_$formType', userId);

List<String> _draftStringList(dynamic value) {
  if (value is! List) return const [];
  return value
      .map((item) => item.toString())
      .where((item) => item.isNotEmpty)
      .toList();
}

List<XFile> _draftImageFiles(dynamic value) {
  return _draftStringList(value)
      .where((path) => File(path).existsSync())
      .map((path) => XFile(path))
      .toList();
}

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
    'Overview',
    'Properties',
    'Tours',
    'Transport',
    'Bookings',
    'Manual Reviews',
    'Discount Codes',
    'Financial Reports',
    'Payout Methods',
    'Calendar & Availability',
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

    RealtimeChannel watchTable(
      String name,
      String table, {
      String? filterColumn,
    }) {
      final channel = supabase
          .channel('host-dashboard-$name-$userId')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: table,
            filter: filterColumn != null
                ? PostgresChangeFilter(
                    type: PostgresChangeFilterType.eq,
                    column: filterColumn,
                    value: userId,
                  )
                : null,
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
    watchTable(
      'manual-reviews',
      'manual_review_requests',
      filterColumn: 'host_id',
    );
    watchTable('discounts', 'discount_codes', filterColumn: 'host_id');
    watchTable('payouts', 'host_payouts', filterColumn: 'host_id');
    watchTable(
      'payout-methods',
      'host_payout_methods',
      filterColumn: 'host_id',
    );
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
    final hostName = widget.session.userEmail?.split('@').first ?? 'Host';
    final initials = hostName.isNotEmpty ? hostName[0].toUpperCase() : 'H';
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.06),
        leading: const ReturnButton(color: AppColors.black, fallbackRoute: '/'),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF385C), Color(0xFFE00B3C)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Host Dashboard',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: AppColors.black,
                    height: 1.1,
                  ),
                ),
                Text(
                  hostName,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.foggy,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            child: IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.hof),
              onPressed: _load,
              tooltip: 'Refresh',
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(42),
          child: Container(
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AppColors.border, width: 1),
              ),
            ),
            child: TabBar(
              controller: _tabs,
              isScrollable: true,
              labelColor: AppColors.rausch,
              unselectedLabelColor: AppColors.foggy,
              indicatorColor: AppColors.rausch,
              indicatorWeight: 2.5,
              indicatorSize: TabBarIndicatorSize.label,
              dividerColor: Colors.transparent,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w400,
                fontSize: 13,
              ),
              tabAlignment: TabAlignment.start,
              padding: const EdgeInsets.symmetric(horizontal: 4),
              tabs: _tabLabels
                  .map((t) => Tab(
                        height: 40,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          child: Text(t),
                        ),
                      ))
                  .toList(),
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.rausch),
            )
          : TabBarView(
              controller: _tabs,
              children: [
                _OverviewTab(
                  stats: _stats,
                  properties: _properties,
                  tours: _tours,
                  transport: _transport,
                  bookings: _bookings,
                ),
                _PropertiesTab(
                  api: _api,
                  userId: _uid,
                  items: _properties,
                  onRefresh: _load,
                ),
                _ToursTab(
                  api: _api,
                  userId: _uid,
                  items: _tours,
                  onRefresh: _load,
                ),
                _TransportTab(
                  api: _api,
                  userId: _uid,
                  items: _transport,
                  onRefresh: _load,
                ),
                _BookingsTab(
                  api: _api,
                  userId: _uid,
                  bookings: _bookings,
                  onRefresh: _load,
                ),
                _ManualReviewsTab(
                  api: _api,
                  userId: _uid,
                  properties: _properties,
                  requests: _manualReviewRequests,
                  onRefresh: _load,
                ),
                _DiscountsTab(
                  api: _api,
                  userId: _uid,
                  items: _discounts,
                  onRefresh: _load,
                ),
                _FinancialTab(
                  stats: _stats,
                  payouts: _payouts,
                  payoutMethods: _payoutMethods,
                  api: _api,
                  userId: _uid,
                  onRefresh: _load,
                ),
                _PayoutMethodsTab(
                  api: _api,
                  userId: _uid,
                  methods: _payoutMethods,
                  onRefresh: _load,
                ),
                _CalendarTab(api: _api, properties: _properties, bookings: _bookings),
              ],
            ),
    );
  }
}

// ===================== OVERVIEW =====================
class _OverviewTab extends StatelessWidget {
  const _OverviewTab({
    required this.stats,
    required this.properties,
    required this.tours,
    required this.transport,
    required this.bookings,
  });
  final Map<String, dynamic>? stats;
  final List<Map<String, dynamic>> properties, tours, transport, bookings;

  @override
  Widget build(BuildContext context) {
    final availableForPayout = (stats?['available_for_payout'] as num?) ?? 0;
    final netEarnings =
        (stats?['net_earnings'] as num?) ??
        (stats?['total_revenue'] as num?) ??
        0;
    final pendingPayout = (stats?['pending_payout'] as num?) ?? 0;
    final completedPayout = (stats?['completed_payout'] as num?) ?? 0;
    final totalBookings =
        (stats?['total_bookings'] as num?)?.toInt() ?? bookings.length;
    final pending =
        (stats?['pending_bookings'] as num?)?.toInt() ??
        bookings.where((b) => b['status'] == 'pending').length;
    final confirmed = bookings.where((b) => b['status'] == 'confirmed').length;
    final completed = bookings.where((b) => b['status'] == 'completed').length;
    final publishedProperties =
        (stats?['published_property_count'] as num?)?.toInt() ??
        properties.where((item) => item['is_published'] == true).length;
    final propertyCount =
        (stats?['property_count'] as num?)?.toInt() ?? properties.length;
    final currency = (stats?['currency'] ?? 'RWF').toString();

    // Revenue proportion for bar
    final payoutBar = (netEarnings > 0)
        ? (completedPayout / netEarnings).clamp(0.0, 1.0)
        : 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Dark hero earnings card ───────────────────────────────────
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1A2E4A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0F172A).withValues(alpha: 0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Stack(
              children: [
                Positioned(
                  right: -20,
                  top: -20,
                  child: Container(
                    width: 110,
                    height: 110,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _kRed.withValues(alpha: 0.12),
                    ),
                  ),
                ),
                Positioned(
                  right: 30,
                  bottom: -15,
                  child: Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.04),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.15),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF22C55E),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                const Text(
                                  'Host Earnings',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: _kRed.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              '$totalBookings bookings',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Net Earnings',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF94A3B8),
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatMoney(netEarnings, currency),
                        style: const TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          height: 0.95,
                          letterSpacing: -1.0,
                        ),
                      ),
                      const SizedBox(height: 14),
                      // Payout progress bar
                      if (netEarnings > 0) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${(payoutBar * 100).toStringAsFixed(0)}% paid out',
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            Text(
                              '${_formatMoney(availableForPayout, currency)} available',
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF22C55E),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Stack(
                            children: [
                              Container(
                                height: 5,
                                width: double.infinity,
                                color: Colors.white.withValues(alpha: 0.1),
                              ),
                              FractionallySizedBox(
                                widthFactor: payoutBar,
                                child: Container(
                                  height: 5,
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        const Color(0xFF22C55E),
                                        const Color(0xFF16A34A),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],
                      Row(
                        children: [
                          Expanded(
                            child: _darkPill(
                              label: 'Available',
                              value: _formatMoney(availableForPayout, currency),
                              color: const Color(0xFF22C55E),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _darkPill(
                              label: 'Paid out',
                              value: _formatMoney(completedPayout, currency),
                              color: const Color(0xFF60A5FA),
                            ),
                          ),
                          if (pendingPayout > 0) ...[
                            const SizedBox(width: 8),
                            Expanded(
                              child: _darkPill(
                                label: 'Pending',
                                value: _formatMoney(pendingPayout, currency),
                                color: const Color(0xFFFBBF24),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── Booking stats row ─────────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _statTile(
                  value: '$totalBookings',
                  label: 'Total',
                  icon: Icons.calendar_month_rounded,
                  color: const Color(0xFF6C63FF),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _statTile(
                  value: '$pending',
                  label: 'Pending',
                  icon: Icons.hourglass_top_rounded,
                  color: const Color(0xFFF59E0B),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _statTile(
                  value: '$confirmed',
                  label: 'Confirmed',
                  icon: Icons.check_circle_rounded,
                  color: const Color(0xFF22C55E),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _statTile(
                  value: '$completed',
                  label: 'Done',
                  icon: Icons.done_all_rounded,
                  color: const Color(0xFF0EA5E9),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // ── Listings inventory ────────────────────────────────────────
          Row(
            children: [
              const Text(
                'Your Listings',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.black,
                ),
              ),
              const Spacer(),
              Text(
                '${propertyCount + tours.length + transport.length} total',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.foggy,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _inventoryCard(
                  icon: Icons.home_rounded,
                  label: 'Properties',
                  total: propertyCount,
                  live: publishedProperties,
                  color: const Color(0xFF2563EB),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _inventoryCard(
                  icon: Icons.explore_rounded,
                  label: 'Tours',
                  total: tours.length,
                  live: tours
                      .where((t) => t['is_published'] == true)
                      .length,
                  color: const Color(0xFF0D9488),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _inventoryCard(
                  icon: Icons.directions_car_rounded,
                  label: 'Transport',
                  total: transport.length,
                  live: transport
                      .where((t) => t['is_published'] == true)
                      .length,
                  color: const Color(0xFFF59E0B),
                ),
              ),
            ],
          ),

          if (bookings.isNotEmpty) ...[
            const SizedBox(height: 24),
            Row(
              children: [
                const Text(
                  'Recent Bookings',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.black,
                  ),
                ),
                const Spacer(),
                if (pending > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '$pending pending',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFD97706),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            ...bookings.take(5).map(
                  (b) => _BookingSummaryRow(booking: b),
                ),
          ],
        ],
      ),
    );
  }

  Widget _darkPill({
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 5),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF94A3B8),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statTile({
    required String value,
    required String label,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: color,
              height: 1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _inventoryCard({
    required IconData icon,
    required String label,
    required int total,
    required int live,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 17, color: color),
          ),
          const SizedBox(height: 10),
          Text(
            '$total',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: AppColors.black,
              height: 1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.hof,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: live > 0
                      ? const Color(0xFF22C55E)
                      : AppColors.border,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '$live live',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: live > 0
                      ? const Color(0xFF22C55E)
                      : AppColors.foggy,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ===================== PROPERTIES =====================
class _PropertiesTab extends StatelessWidget {
  const _PropertiesTab({
    required this.api,
    required this.userId,
    required this.items,
    required this.onRefresh,
  });
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefresh;

  Future<void> _openWizard(
    BuildContext context, {
    Map<String, dynamic>? existing,
  }) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            PropertyWizardScreen(api: api, userId: userId, existing: existing),
      ),
    );
    if (result == true) onRefresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: items.isEmpty
          ? const _EmptyState(
              label: 'No properties yet',
              icon: Icons.home_outlined,
            )
          : GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.68,
              ),
              itemCount: items.length,
              itemBuilder: (ctx, i) => _ListingCard(
                item: items[i],
                onToggle: (pub) async {
                  await api.updateListingStatus(
                    id: items[i]['id'],
                    type: 'property',
                    published: pub,
                  );
                  onRefresh();
                },
                onEdit: () => _openWizard(ctx, existing: items[i]),
                onDelete: () async {
                  await api.deleteProperty(id: items[i]['id']);
                  onRefresh();
                },
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.rausch,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Property'),
        onPressed: () => _openWizard(context),
      ),
    );
  }
}

void _showPropertySheet(
  BuildContext ctx,
  AppDatabase api,
  String userId,
  VoidCallback onRefresh, {
  Map<String, dynamic>? existing,
}) {
  final titleCtrl = TextEditingController(text: existing?['title'] ?? '');
  final locCtrl = TextEditingController(text: existing?['location'] ?? '');
  final addressCtrl = TextEditingController(text: existing?['address'] ?? '');
  final priceCtrl = TextEditingController(
    text: existing?['price_per_night'] != null
        ? existing!['price_per_night'].toString()
        : '',
  );
  final priceMonthCtrl = TextEditingController(
    text: existing?['price_per_month'] != null
        ? existing!['price_per_month'].toString()
        : '',
  );
  final descCtrl = TextEditingController(text: existing?['description'] ?? '');
  final checkInCtrl = TextEditingController(
    text: existing?['check_in_time'] ?? '14:00',
  );
  final checkOutCtrl = TextEditingController(
    text: existing?['check_out_time'] ?? '11:00',
  );
  final bfPriceCtrl = TextEditingController(
    text: existing?['breakfast_price_per_night'] != null
        ? existing!['breakfast_price_per_night'].toString()
        : '',
  );
  final weeklyDiscCtrl = TextEditingController(
    text: (existing?['weekly_discount'] ?? 0).toString(),
  );
  final monthlyDiscCtrl = TextEditingController(
    text: (existing?['monthly_discount'] ?? 0).toString(),
  );

  String propertyType = (_kPropertyTypes.contains(existing?['property_type']))
      ? existing!['property_type'] as String
      : 'House';
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

  List<String> amenities = List<String>.from(
    existing?['amenities'] as List? ?? [],
  );

  // Image state
  final picker = ImagePicker();
  List<String> existingImageUrls = List<String>.from(
    existing?['images'] as List? ?? [],
  );
  List<XFile> newPickedImages = [];
  bool uploading = false;
  final draftKey = _hostDraftKey('property', userId);
  Timer? draftSaveTimer;
  bool draftHydrated = existing != null;
  bool restoringDraft = false;
  bool draftRestored = false;

  Map<String, dynamic> collectDraft() => {
    'title': titleCtrl.text,
    'location': locCtrl.text,
    'address': addressCtrl.text,
    'pricePerNight': priceCtrl.text,
    'pricePerMonth': priceMonthCtrl.text,
    'description': descCtrl.text,
    'checkInTime': checkInCtrl.text,
    'checkOutTime': checkOutCtrl.text,
    'breakfastPrice': bfPriceCtrl.text,
    'weeklyDiscount': weeklyDiscCtrl.text,
    'monthlyDiscount': monthlyDiscCtrl.text,
    'propertyType': propertyType,
    'currency': currency,
    'cancellationPolicy': cancellationPolicy,
    'listingMode': listingMode,
    'maxGuests': maxGuests,
    'bedrooms': bedrooms,
    'bathrooms': bathrooms,
    'beds': beds,
    'smokingAllowed': smokingAllowed,
    'eventsAllowed': eventsAllowed,
    'petsAllowed': petsAllowed,
    'monthlyRental': monthlyRental,
    'breakfastAvailable': breakfastAvailable,
    'amenities': amenities,
    'existingImageUrls': existingImageUrls,
    'newImagePaths': newPickedImages.map((file) => file.path).toList(),
  };

  void resetDraftState() {
    titleCtrl.text = '';
    locCtrl.text = '';
    addressCtrl.text = '';
    priceCtrl.text = '';
    priceMonthCtrl.text = '';
    descCtrl.text = '';
    checkInCtrl.text = '14:00';
    checkOutCtrl.text = '11:00';
    bfPriceCtrl.text = '';
    weeklyDiscCtrl.text = '0';
    monthlyDiscCtrl.text = '0';
    propertyType = 'House';
    currency = 'RWF';
    cancellationPolicy = 'fair';
    listingMode = 'standard';
    maxGuests = 2;
    bedrooms = 1;
    bathrooms = 1;
    beds = 1;
    smokingAllowed = false;
    eventsAllowed = false;
    petsAllowed = false;
    monthlyRental = false;
    breakfastAvailable = false;
    amenities = [];
    existingImageUrls = [];
    newPickedImages = [];
  }

  void applyDraft(Map<String, dynamic> draft) {
    restoringDraft = true;
    titleCtrl.text = (draft['title'] ?? '').toString();
    locCtrl.text = (draft['location'] ?? '').toString();
    addressCtrl.text = (draft['address'] ?? '').toString();
    priceCtrl.text = (draft['pricePerNight'] ?? '').toString();
    priceMonthCtrl.text = (draft['pricePerMonth'] ?? '').toString();
    descCtrl.text = (draft['description'] ?? '').toString();
    checkInCtrl.text = (draft['checkInTime'] ?? '14:00').toString();
    checkOutCtrl.text = (draft['checkOutTime'] ?? '11:00').toString();
    bfPriceCtrl.text = (draft['breakfastPrice'] ?? '').toString();
    weeklyDiscCtrl.text = (draft['weeklyDiscount'] ?? '0').toString();
    monthlyDiscCtrl.text = (draft['monthlyDiscount'] ?? '0').toString();
    propertyType = _kPropertyTypes.contains(draft['propertyType'])
        ? draft['propertyType'].toString()
        : 'House';
    currency = _kCurrencies.contains(draft['currency'])
        ? draft['currency'].toString()
        : 'RWF';
    cancellationPolicy =
        _kCancellationPolicies.contains(draft['cancellationPolicy'])
        ? draft['cancellationPolicy'].toString()
        : 'fair';
    listingMode = draft['listingMode'] == 'monthly_only'
        ? 'monthly_only'
        : 'standard';
    maxGuests = (draft['maxGuests'] as num?)?.toInt() ?? 2;
    bedrooms = (draft['bedrooms'] as num?)?.toInt() ?? 1;
    bathrooms = (draft['bathrooms'] as num?)?.toInt() ?? 1;
    beds = (draft['beds'] as num?)?.toInt() ?? 1;
    smokingAllowed = draft['smokingAllowed'] == true;
    eventsAllowed = draft['eventsAllowed'] == true;
    petsAllowed = draft['petsAllowed'] == true;
    monthlyRental = draft['monthlyRental'] == true;
    breakfastAvailable = draft['breakfastAvailable'] == true;
    amenities = _draftStringList(draft['amenities']);
    existingImageUrls = _draftStringList(draft['existingImageUrls']);
    newPickedImages = _draftImageFiles(draft['newImagePaths']);
    restoringDraft = false;
  }

  void scheduleDraftSave() {
    if (existing != null || restoringDraft) return;
    draftSaveTimer?.cancel();
    draftSaveTimer = Timer(const Duration(milliseconds: 400), () {
      LocalDraftStore.write(draftKey, collectDraft());
    });
  }

  for (final controller in [
    titleCtrl,
    locCtrl,
    addressCtrl,
    priceCtrl,
    priceMonthCtrl,
    descCtrl,
    checkInCtrl,
    checkOutCtrl,
    bfPriceCtrl,
    weeklyDiscCtrl,
    monthlyDiscCtrl,
  ]) {
    controller.addListener(scheduleDraftSave);
  }

  showModalBottomSheet(
    context: ctx,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetCtx) => StatefulBuilder(
      builder: (sCtx, setSt) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
        ),
        child: Builder(
          builder: (context) {
            if (!draftHydrated) {
              draftHydrated = true;
              Future<void>(() async {
                final draft = await LocalDraftStore.read(draftKey);
                if (draft == null || !sheetCtx.mounted) return;
                setSt(() {
                  applyDraft(draft);
                  draftRestored = true;
                });
              });
            }
            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 40,
                          minHeight: 40,
                        ),
                        onPressed: () => Navigator.of(sheetCtx).maybePop(),
                        icon: const Icon(Icons.close, color: AppColors.black),
                        tooltip: 'Close',
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          existing == null ? 'Add Property' : 'Edit Property',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (draftRestored && existing == null) ...[
                    const SizedBox(height: 12),
                    _DraftNotice(
                      message: 'Saved property draft restored on this device.',
                      onClear: () async {
                        await LocalDraftStore.clear(draftKey);
                        setSt(() {
                          restoringDraft = true;
                          resetDraftState();
                          draftRestored = false;
                          restoringDraft = false;
                        });
                      },
                    ),
                  ],
                  const SizedBox(height: 16),

                  // ── Photos ──
                  const Text(
                    'Photos',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  _ImagePickerRow(
                    existingUrls: existingImageUrls,
                    newFiles: newPickedImages,
                    onAddFromGallery: () async {
                      final imgs = await picker.pickMultiImage(
                        imageQuality: 85,
                      );
                      if (imgs.isNotEmpty) {
                        setSt(() => newPickedImages.addAll(imgs));
                        scheduleDraftSave();
                      }
                    },
                    onAddFromCamera: () async {
                      final img = await picker.pickImage(
                        source: ImageSource.camera,
                        imageQuality: 85,
                      );
                      if (img != null) {
                        setSt(() => newPickedImages.add(img));
                        scheduleDraftSave();
                      }
                    },
                    onRemoveExisting: (i) {
                      setSt(() => existingImageUrls.removeAt(i));
                      scheduleDraftSave();
                    },
                    onRemoveNew: (i) {
                      setSt(() => newPickedImages.removeAt(i));
                      scheduleDraftSave();
                    },
                  ),
                  const SizedBox(height: 16),

                  // Basic Info
                  _Field(ctrl: titleCtrl, label: 'Title'),
                  _Field(ctrl: locCtrl, label: 'City / Area'),
                  _Field(ctrl: addressCtrl, label: 'Street Address'),
                  _Field(ctrl: descCtrl, label: 'Description', maxLines: 3),

                  // Type & Currency
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('pt_$propertyType'),
                          initialValue: propertyType,
                          decoration: _inputDecoration('Property Type'),
                          items: _kPropertyTypes
                              .map(
                                (t) => DropdownMenuItem(
                                  value: t,
                                  child: Text(
                                    t,
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => propertyType = v ?? propertyType);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 100,
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('curr_$currency'),
                          initialValue: currency,
                          decoration: _inputDecoration('Currency'),
                          items: _kCurrencies
                              .map(
                                (c) =>
                                    DropdownMenuItem(value: c, child: Text(c)),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => currency = v ?? currency);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Pricing
                  _Field(
                    ctrl: priceCtrl,
                    label: 'Price per Night',
                    inputType: TextInputType.number,
                  ),
                  DropdownButtonFormField<String>(
                    key: ValueKey('lm_$listingMode'),
                    initialValue: listingMode,
                    decoration: _inputDecoration('Listing Mode'),
                    items: const [
                      DropdownMenuItem(
                        value: 'standard',
                        child: Text('Standard (per night)'),
                      ),
                      DropdownMenuItem(
                        value: 'monthly_only',
                        child: Text('Monthly Only'),
                      ),
                    ],
                    onChanged: (v) {
                      setSt(() => listingMode = v ?? listingMode);
                      scheduleDraftSave();
                    },
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Available for Monthly Rental',
                      style: TextStyle(fontSize: 14),
                    ),
                    value: monthlyRental,
                    activeThumbColor: _kRed,
                    onChanged: (v) {
                      setSt(() => monthlyRental = v);
                      scheduleDraftSave();
                    },
                  ),
                  if (monthlyRental || listingMode == 'monthly_only')
                    _Field(
                      ctrl: priceMonthCtrl,
                      label: 'Price per Month',
                      inputType: TextInputType.number,
                    ),

                  // Room Counts
                  const Divider(height: 24),
                  const Text(
                    'Room Details',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  _countRow(
                    'Max Guests',
                    maxGuests,
                    () {
                      setSt(() => maxGuests = (maxGuests - 1).clamp(1, 50));
                      scheduleDraftSave();
                    },
                    () {
                      setSt(() => maxGuests = (maxGuests + 1).clamp(1, 50));
                      scheduleDraftSave();
                    },
                  ),
                  _countRow(
                    'Bedrooms',
                    bedrooms,
                    () {
                      setSt(() => bedrooms = (bedrooms - 1).clamp(0, 20));
                      scheduleDraftSave();
                    },
                    () {
                      setSt(() => bedrooms = (bedrooms + 1).clamp(0, 20));
                      scheduleDraftSave();
                    },
                  ),
                  _countRow(
                    'Bathrooms',
                    bathrooms,
                    () {
                      setSt(() => bathrooms = (bathrooms - 1).clamp(0, 20));
                      scheduleDraftSave();
                    },
                    () {
                      setSt(() => bathrooms = (bathrooms + 1).clamp(0, 20));
                      scheduleDraftSave();
                    },
                  ),
                  _countRow(
                    'Beds',
                    beds,
                    () {
                      setSt(() => beds = (beds - 1).clamp(0, 20));
                      scheduleDraftSave();
                    },
                    () {
                      setSt(() => beds = (beds + 1).clamp(0, 20));
                      scheduleDraftSave();
                    },
                  ),

                  // Check-in / Check-out
                  const Divider(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: _Field(
                          ctrl: checkInCtrl,
                          label: 'Check-in (HH:MM)',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Field(
                          ctrl: checkOutCtrl,
                          label: 'Check-out (HH:MM)',
                        ),
                      ),
                    ],
                  ),
                  DropdownButtonFormField<String>(
                    key: ValueKey('cp_$cancellationPolicy'),
                    initialValue: cancellationPolicy,
                    decoration: _inputDecoration('Cancellation Policy'),
                    items: _kCancellationPolicies
                        .map(
                          (p) => DropdownMenuItem(
                            value: p,
                            child: Text(p[0].toUpperCase() + p.substring(1)),
                          ),
                        )
                        .toList(),
                    onChanged: (v) {
                      setSt(() => cancellationPolicy = v ?? cancellationPolicy);
                      scheduleDraftSave();
                    },
                  ),
                  const SizedBox(height: 12),

                  // House Rules
                  const Divider(height: 24),
                  const Text(
                    'House Rules',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  SwitchListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Pets Allowed',
                      style: TextStyle(fontSize: 14),
                    ),
                    value: petsAllowed,
                    activeThumbColor: _kRed,
                    onChanged: (v) {
                      setSt(() => petsAllowed = v);
                      scheduleDraftSave();
                    },
                  ),
                  SwitchListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Events Allowed',
                      style: TextStyle(fontSize: 14),
                    ),
                    value: eventsAllowed,
                    activeThumbColor: _kRed,
                    onChanged: (v) {
                      setSt(() => eventsAllowed = v);
                      scheduleDraftSave();
                    },
                  ),
                  SwitchListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Smoking Allowed',
                      style: TextStyle(fontSize: 14),
                    ),
                    value: smokingAllowed,
                    activeThumbColor: _kRed,
                    onChanged: (v) {
                      setSt(() => smokingAllowed = v);
                      scheduleDraftSave();
                    },
                  ),

                  // Long-stay Discounts
                  const Divider(height: 24),
                  const Text(
                    'Long Stay Discounts',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: _Field(
                          ctrl: weeklyDiscCtrl,
                          label: 'Weekly Discount (%)',
                          inputType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Field(
                          ctrl: monthlyDiscCtrl,
                          label: 'Monthly Discount (%)',
                          inputType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),

                  // Breakfast
                  const Divider(height: 24),
                  SwitchListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Breakfast Available',
                      style: TextStyle(fontSize: 14),
                    ),
                    value: breakfastAvailable,
                    activeThumbColor: _kRed,
                    onChanged: (v) {
                      setSt(() => breakfastAvailable = v);
                      scheduleDraftSave();
                    },
                  ),
                  if (breakfastAvailable)
                    _Field(
                      ctrl: bfPriceCtrl,
                      label: 'Breakfast Price per Night',
                      inputType: TextInputType.number,
                    ),

                  // Amenities
                  const Divider(height: 24),
                  const Text(
                    'Amenities',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: _kAmenityOptions.entries
                        .map(
                          (e) => FilterChip(
                            label: Text(
                              e.value,
                              style: const TextStyle(fontSize: 11),
                            ),
                            selected: amenities.contains(e.key),
                            selectedColor: _kRed.withValues(alpha: 0.15),
                            checkmarkColor: _kRed,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            onSelected: (sel) => setSt(() {
                              if (sel) {
                                amenities.add(e.key);
                              } else {
                                amenities.remove(e.key);
                              }
                              scheduleDraftSave();
                            }),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 16),

                  if (uploading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: _kRed,
                            ),
                          ),
                          SizedBox(width: 10),
                          Text(
                            'Uploading photos…',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.foggy,
                            ),
                          ),
                        ],
                      ),
                    ),

                  _SaveButton(
                    label: existing == null
                        ? 'Create Property'
                        : 'Save Changes',
                    onPressed: uploading
                        ? null
                        : () async {
                            setSt(() => uploading = true);
                            // Upload new images to Cloudinary
                            final newUrls =
                                await CloudinaryService.uploadImages(
                                  newPickedImages.map((f) => f.path).toList(),
                                  folder: 'properties',
                                );
                            final allImages = [
                              ...existingImageUrls,
                              ...newUrls,
                            ];
                            setSt(() => uploading = false);

                            final fields = {
                              'title': titleCtrl.text.trim(),
                              'location': locCtrl.text.trim(),
                              'address': addressCtrl.text.trim(),
                              'price_per_night':
                                  double.tryParse(priceCtrl.text.trim()) ?? 0,
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
                              'weekly_discount':
                                  int.tryParse(weeklyDiscCtrl.text.trim()) ?? 0,
                              'monthly_discount':
                                  int.tryParse(monthlyDiscCtrl.text.trim()) ??
                                  0,
                              'available_for_monthly_rental': monthlyRental,
                              'price_per_month':
                                  (monthlyRental ||
                                      listingMode == 'monthly_only')
                                  ? double.tryParse(priceMonthCtrl.text.trim())
                                  : null,
                              'breakfast_available': breakfastAvailable,
                              'breakfast_price_per_night': breakfastAvailable
                                  ? double.tryParse(bfPriceCtrl.text.trim())
                                  : null,
                              'listing_mode': listingMode,
                              if (allImages.isNotEmpty) 'images': allImages,
                              if (allImages.isNotEmpty)
                                'main_image': allImages.first,
                            };
                            if (existing != null) {
                              await api.updateProperty(
                                id: existing['id'],
                                updates: fields,
                              );
                            } else {
                              await api.createProperty(
                                userId: userId,
                                fields: fields,
                              );
                            }
                            await LocalDraftStore.clear(draftKey);
                            if (sheetCtx.mounted) Navigator.pop(sheetCtx);
                            onRefresh();
                          },
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            );
          },
        ),
      ),
    ),
  ).whenComplete(() {
    draftSaveTimer?.cancel();
    titleCtrl.dispose();
    locCtrl.dispose();
    addressCtrl.dispose();
    priceCtrl.dispose();
    priceMonthCtrl.dispose();
    descCtrl.dispose();
    checkInCtrl.dispose();
    checkOutCtrl.dispose();
    bfPriceCtrl.dispose();
    weeklyDiscCtrl.dispose();
    monthlyDiscCtrl.dispose();
  });
}

// ===================== TOURS =====================
class _ToursTab extends StatelessWidget {
  const _ToursTab({
    required this.api,
    required this.userId,
    required this.items,
    required this.onRefresh,
  });
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: items.isEmpty
          ? const _EmptyState(
              label: 'No tours yet',
              icon: Icons.explore_outlined,
            )
          : GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.68,
              ),
              itemCount: items.length,
              itemBuilder: (ctx, i) => _ListingCard(
                item: items[i],
                priceLabel: 'per person',
                priceField: 'price_per_person',
                onToggle: (pub) async {
                  await api.updateHostTourListing(
                    id: items[i]['id'],
                    updates: {'is_published': pub},
                    source: (items[i]['source'] ?? 'tours').toString(),
                  );
                  onRefresh();
                },
                onEdit: () async {
                  final isPkg =
                      (items[i]['source'] ?? 'tours') == 'tour_packages';
                  final changed = await Navigator.of(ctx).push<bool>(
                    MaterialPageRoute(
                      builder: (_) => isPkg
                          ? TourPackageWizardScreen(
                              api: api,
                              userId: userId,
                              existing: items[i],
                            )
                          : TourWizardScreen(
                              api: api,
                              userId: userId,
                              existing: items[i],
                            ),
                    ),
                  );
                  if (changed == true) onRefresh();
                },
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
        backgroundColor: AppColors.rausch,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('Create'),
        onPressed: () async {
          final changed = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => HostQuickCreateScreen(api: api, userId: userId),
            ),
          );
          if (changed == true) onRefresh();
        },
      ),
    );
  }
}

void _showTourSheet(
  BuildContext ctx,
  AppDatabase api,
  String userId,
  VoidCallback onRefresh, {
  Map<String, dynamic>? existing,
}) {
  final titleCtrl = TextEditingController(text: existing?['title'] ?? '');
  final locCtrl = TextEditingController(text: existing?['location'] ?? '');
  final priceCtrl = TextEditingController(
    text: existing?['price_per_person'] != null
        ? existing!['price_per_person'].toString()
        : '',
  );
  final descCtrl = TextEditingController(text: existing?['description'] ?? '');
  final durationCtrl = TextEditingController(
    text: existing?['duration_days'] != null
        ? existing!['duration_days'].toString()
        : '',
  );
  final maxPaxCtrl = TextEditingController(
    text: (existing?['max_participants'] ?? 10).toString(),
  );
  final optActCtrl = TextEditingController(
    text: existing?['optional_activities'] ?? '',
  );
  final citizenCtrl = TextEditingController(
    text: existing?['price_for_citizens'] != null
        ? existing!['price_for_citizens'].toString()
        : '',
  );
  final eaCtrl = TextEditingController(
    text: existing?['price_for_east_african'] != null
        ? existing!['price_for_east_african'].toString()
        : '',
  );
  final foreignerCtrl = TextEditingController(
    text: existing?['price_for_foreigners'] != null
        ? existing!['price_for_foreigners'].toString()
        : '',
  );

  String currency = existing?['currency'] ?? 'RWF';
  String pricingModel = existing?['pricing_model'] ?? 'per_person';
  bool hasDiffPricing = existing?['has_differential_pricing'] == true;
  List<String> categories = List<String>.from(
    existing?['categories'] as List? ?? [],
  );

  // Image state
  final picker = ImagePicker();
  List<String> existingImageUrls = List<String>.from(
    existing?['images'] as List? ?? [],
  );
  List<XFile> newPickedImages = [];
  bool uploading = false;
  final draftKey = _hostDraftKey('tour', userId);
  Timer? draftSaveTimer;
  bool draftHydrated = existing != null;
  bool restoringDraft = false;
  bool draftRestored = false;

  Map<String, dynamic> collectDraft() => {
    'title': titleCtrl.text,
    'location': locCtrl.text,
    'pricePerPerson': priceCtrl.text,
    'description': descCtrl.text,
    'durationDays': durationCtrl.text,
    'maxParticipants': maxPaxCtrl.text,
    'optionalActivities': optActCtrl.text,
    'citizenPrice': citizenCtrl.text,
    'eastAfricanPrice': eaCtrl.text,
    'foreignerPrice': foreignerCtrl.text,
    'currency': currency,
    'pricingModel': pricingModel,
    'hasDifferentialPricing': hasDiffPricing,
    'categories': categories,
    'existingImageUrls': existingImageUrls,
    'newImagePaths': newPickedImages.map((file) => file.path).toList(),
  };

  void resetDraftState() {
    titleCtrl.text = '';
    locCtrl.text = '';
    priceCtrl.text = '';
    descCtrl.text = '';
    durationCtrl.text = '';
    maxPaxCtrl.text = '10';
    optActCtrl.text = '';
    citizenCtrl.text = '';
    eaCtrl.text = '';
    foreignerCtrl.text = '';
    currency = 'RWF';
    pricingModel = 'per_person';
    hasDiffPricing = false;
    categories = [];
    existingImageUrls = [];
    newPickedImages = [];
  }

  void applyDraft(Map<String, dynamic> draft) {
    restoringDraft = true;
    titleCtrl.text = (draft['title'] ?? '').toString();
    locCtrl.text = (draft['location'] ?? '').toString();
    priceCtrl.text = (draft['pricePerPerson'] ?? '').toString();
    descCtrl.text = (draft['description'] ?? '').toString();
    durationCtrl.text = (draft['durationDays'] ?? '').toString();
    maxPaxCtrl.text = (draft['maxParticipants'] ?? '10').toString();
    optActCtrl.text = (draft['optionalActivities'] ?? '').toString();
    citizenCtrl.text = (draft['citizenPrice'] ?? '').toString();
    eaCtrl.text = (draft['eastAfricanPrice'] ?? '').toString();
    foreignerCtrl.text = (draft['foreignerPrice'] ?? '').toString();
    currency = _kCurrencies.contains(draft['currency'])
        ? draft['currency'].toString()
        : 'RWF';
    pricingModel = _kPricingModels.contains(draft['pricingModel'])
        ? draft['pricingModel'].toString()
        : 'per_person';
    hasDiffPricing = draft['hasDifferentialPricing'] == true;
    categories = _draftStringList(draft['categories']);
    existingImageUrls = _draftStringList(draft['existingImageUrls']);
    newPickedImages = _draftImageFiles(draft['newImagePaths']);
    restoringDraft = false;
  }

  void scheduleDraftSave() {
    if (existing != null || restoringDraft) return;
    draftSaveTimer?.cancel();
    draftSaveTimer = Timer(const Duration(milliseconds: 400), () {
      LocalDraftStore.write(draftKey, collectDraft());
    });
  }

  for (final controller in [
    titleCtrl,
    locCtrl,
    priceCtrl,
    descCtrl,
    durationCtrl,
    maxPaxCtrl,
    optActCtrl,
    citizenCtrl,
    eaCtrl,
    foreignerCtrl,
  ]) {
    controller.addListener(scheduleDraftSave);
  }

  showModalBottomSheet(
    context: ctx,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetCtx) => StatefulBuilder(
      builder: (sCtx, setSt) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
        ),
        child: Builder(
          builder: (context) {
            if (!draftHydrated) {
              draftHydrated = true;
              Future<void>(() async {
                final draft = await LocalDraftStore.read(draftKey);
                if (draft == null || !sheetCtx.mounted) return;
                setSt(() {
                  applyDraft(draft);
                  draftRestored = true;
                });
              });
            }
            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 40,
                          minHeight: 40,
                        ),
                        onPressed: () => Navigator.of(sheetCtx).maybePop(),
                        icon: const Icon(Icons.close, color: AppColors.black),
                        tooltip: 'Close',
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          existing == null ? 'Add Tour' : 'Edit Tour',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (draftRestored && existing == null) ...[
                    const SizedBox(height: 12),
                    _DraftNotice(
                      message: 'Saved tour draft restored on this device.',
                      onClear: () async {
                        await LocalDraftStore.clear(draftKey);
                        setSt(() {
                          restoringDraft = true;
                          resetDraftState();
                          draftRestored = false;
                          restoringDraft = false;
                        });
                      },
                    ),
                  ],
                  const SizedBox(height: 16),

                  // ── Photos ──
                  const Text(
                    'Photos',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  _ImagePickerRow(
                    existingUrls: existingImageUrls,
                    newFiles: newPickedImages,
                    onAddFromGallery: () async {
                      final imgs = await picker.pickMultiImage(
                        imageQuality: 85,
                      );
                      if (imgs.isNotEmpty) {
                        setSt(() => newPickedImages.addAll(imgs));
                        scheduleDraftSave();
                      }
                    },
                    onAddFromCamera: () async {
                      final img = await picker.pickImage(
                        source: ImageSource.camera,
                        imageQuality: 85,
                      );
                      if (img != null) {
                        setSt(() => newPickedImages.add(img));
                        scheduleDraftSave();
                      }
                    },
                    onRemoveExisting: (i) {
                      setSt(() => existingImageUrls.removeAt(i));
                      scheduleDraftSave();
                    },
                    onRemoveNew: (i) {
                      setSt(() => newPickedImages.removeAt(i));
                      scheduleDraftSave();
                    },
                  ),
                  const SizedBox(height: 16),

                  _Field(ctrl: titleCtrl, label: 'Title'),
                  _Field(ctrl: locCtrl, label: 'Location / Meeting Point'),
                  _Field(ctrl: descCtrl, label: 'Description', maxLines: 3),
                  _Field(
                    ctrl: optActCtrl,
                    label: 'Optional Activities',
                    maxLines: 2,
                  ),

                  Row(
                    children: [
                      Expanded(
                        child: _Field(
                          ctrl: durationCtrl,
                          label: 'Duration (days)',
                          inputType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Field(
                          ctrl: maxPaxCtrl,
                          label: 'Max Participants',
                          inputType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),

                  // Pricing Model & Currency
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('pm_$pricingModel'),
                          initialValue: pricingModel,
                          decoration: _inputDecoration('Pricing Model'),
                          items: _kPricingModels
                              .map(
                                (m) => DropdownMenuItem(
                                  value: m,
                                  child: Text(
                                    m.replaceAll('_', ' '),
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => pricingModel = v ?? pricingModel);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 100,
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('tc_$currency'),
                          initialValue: currency,
                          decoration: _inputDecoration('Currency'),
                          items: _kCurrencies
                              .map(
                                (c) =>
                                    DropdownMenuItem(value: c, child: Text(c)),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => currency = v ?? currency);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _Field(
                    ctrl: priceCtrl,
                    label: 'Base Price per Person',
                    inputType: TextInputType.number,
                  ),

                  // Categories
                  const Divider(height: 24),
                  const Text(
                    'Categories',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: _kTourCategories
                        .map(
                          (cat) => FilterChip(
                            label: Text(
                              cat,
                              style: const TextStyle(fontSize: 12),
                            ),
                            selected: categories.contains(cat),
                            selectedColor: _kRed.withValues(alpha: 0.15),
                            checkmarkColor: _kRed,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            onSelected: (sel) => setSt(() {
                              if (sel) {
                                categories.add(cat);
                              } else {
                                categories.remove(cat);
                              }
                              scheduleDraftSave();
                            }),
                          ),
                        )
                        .toList(),
                  ),

                  // Differential pricing
                  const Divider(height: 24),
                  SwitchListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Differential Pricing (Citizen / EA / Foreign)',
                      style: TextStyle(fontSize: 14),
                    ),
                    value: hasDiffPricing,
                    activeThumbColor: _kRed,
                    onChanged: (v) {
                      setSt(() => hasDiffPricing = v);
                      scheduleDraftSave();
                    },
                  ),
                  if (hasDiffPricing) ...[
                    _Field(
                      ctrl: citizenCtrl,
                      label: 'Price for Citizens',
                      inputType: TextInputType.number,
                    ),
                    _Field(
                      ctrl: eaCtrl,
                      label: 'Price for East Africans',
                      inputType: TextInputType.number,
                    ),
                    _Field(
                      ctrl: foreignerCtrl,
                      label: 'Price for Foreigners',
                      inputType: TextInputType.number,
                    ),
                  ],
                  const SizedBox(height: 16),

                  if (uploading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: _kRed,
                            ),
                          ),
                          SizedBox(width: 10),
                          Text(
                            'Uploading photos…',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.foggy,
                            ),
                          ),
                        ],
                      ),
                    ),

                  _SaveButton(
                    label: existing == null ? 'Create Tour' : 'Save Changes',
                    onPressed: uploading
                        ? null
                        : () async {
                            setSt(() => uploading = true);
                            final newUrls =
                                await CloudinaryService.uploadImages(
                                  newPickedImages.map((f) => f.path).toList(),
                                  folder: 'tours',
                                );
                            final allImages = [
                              ...existingImageUrls,
                              ...newUrls,
                            ];
                            setSt(() => uploading = false);

                            final fields = <String, dynamic>{
                              'title': titleCtrl.text.trim(),
                              'location': locCtrl.text.trim(),
                              'price_per_person':
                                  double.tryParse(priceCtrl.text.trim()) ?? 0,
                              'duration_days': int.tryParse(
                                durationCtrl.text.trim(),
                              ),
                              'max_participants':
                                  int.tryParse(maxPaxCtrl.text.trim()) ?? 10,
                              'description': descCtrl.text.trim(),
                              'optional_activities': optActCtrl.text.trim(),
                              'categories': categories,
                              'currency': currency,
                              'pricing_model': pricingModel,
                              'has_differential_pricing': hasDiffPricing,
                              if (hasDiffPricing) ...{
                                'price_for_citizens': double.tryParse(
                                  citizenCtrl.text.trim(),
                                ),
                                'price_for_east_african': double.tryParse(
                                  eaCtrl.text.trim(),
                                ),
                                'price_for_foreigners': double.tryParse(
                                  foreignerCtrl.text.trim(),
                                ),
                              },
                              if (allImages.isNotEmpty) 'images': allImages,
                              if (allImages.isNotEmpty)
                                'main_image': allImages.first,
                            };
                            if (existing != null) {
                              await api.updateTour(
                                id: existing['id'],
                                updates: fields,
                              );
                            } else {
                              await api.createTour(
                                userId: userId,
                                fields: fields,
                              );
                            }
                            await LocalDraftStore.clear(draftKey);
                            if (sheetCtx.mounted) Navigator.pop(sheetCtx);
                            onRefresh();
                          },
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            );
          },
        ),
      ),
    ),
  ).whenComplete(() {
    draftSaveTimer?.cancel();
    titleCtrl.dispose();
    locCtrl.dispose();
    priceCtrl.dispose();
    descCtrl.dispose();
    durationCtrl.dispose();
    maxPaxCtrl.dispose();
    optActCtrl.dispose();
    citizenCtrl.dispose();
    eaCtrl.dispose();
    foreignerCtrl.dispose();
  });
}

// ===================== TRANSPORT =====================
class _TransportTab extends StatelessWidget {
  const _TransportTab({
    required this.api,
    required this.userId,
    required this.items,
    required this.onRefresh,
  });
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefresh;

  bool _isAirportTransfer(Map<String, dynamic> item) {
    final vType = (item['vehicle_type'] ?? item['car_type'] ?? '')
        .toString()
        .toLowerCase();
    final title = (item['title'] ?? '').toString().toLowerCase();
    return vType.contains('airport') || title.contains('airport');
  }

  Future<void> _edit(BuildContext context, Map<String, dynamic> item) async {
    final isTransfer = _isAirportTransfer(item);
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => isTransfer
            ? AirportTransferWizardScreen(
                api: api,
                userId: userId,
                existingVehicle: item,
              )
            : VehicleWizardScreen(api: api, userId: userId, existing: item),
      ),
    );
    if (result == true) onRefresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: items.isEmpty
          ? const _EmptyState(
              label: 'No vehicles yet',
              icon: Icons.directions_car_outlined,
            )
          : GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.68,
              ),
              itemCount: items.length,
              itemBuilder: (ctx, i) => _ListingCard(
                item: items[i],
                priceLabel: 'per day',
                priceField: 'price_per_day',
                onToggle: (pub) async {
                  await api.updateTransport(
                    id: items[i]['id'],
                    updates: {'is_published': pub},
                  );
                  onRefresh();
                },
                onEdit: () => _edit(ctx, items[i]),
                onDelete: () async {
                  await api.deleteTransport(id: items[i]['id']);
                  onRefresh();
                },
              ),
            ),
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            FloatingActionButton.extended(
              heroTag: 'add_car_rental',
              backgroundColor: AppColors.rausch,
              foregroundColor: AppColors.white,
              icon: const Icon(Icons.directions_car_outlined, size: 18),
              label: const Text('Car Rental', style: TextStyle(fontWeight: FontWeight.w600)),
              onPressed: () async {
                final result = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => VehicleWizardScreen(api: api, userId: userId),
                  ),
                );
                if (result == true) onRefresh();
              },
            ),
            const SizedBox(width: 10),
            FloatingActionButton.extended(
              heroTag: 'add_airport_transfer',
              backgroundColor: AppColors.surface,
              foregroundColor: AppColors.rausch,
              icon: const Icon(Icons.flight_takeoff_outlined, size: 18),
              label: const Text('Airport Transfer', style: TextStyle(fontWeight: FontWeight.w600)),
              elevation: 2,
              onPressed: () async {
                final result = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => AirportTransferWizardScreen(api: api, userId: userId),
                  ),
                );
                if (result == true) onRefresh();
              },
            ),
          ],
        ),
      ),
    );
  }
}

void _showTransportSheet(
  BuildContext ctx,
  AppDatabase api,
  String userId,
  VoidCallback onRefresh, {
  Map<String, dynamic>? existing,
}) {
  final carModelCtrl = TextEditingController(
    text: existing?['car_model'] ?? '',
  );
  final providerCtrl = TextEditingController(
    text: existing?['provider_name'] ?? '',
  );
  final descCtrl = TextEditingController(text: existing?['description'] ?? '');
  final dailyCtrl = TextEditingController(
    text: existing?['daily_price'] != null
        ? existing!['daily_price'].toString()
        : '',
  );
  final weeklyCtrl = TextEditingController(
    text: existing?['weekly_price'] != null
        ? existing!['weekly_price'].toString()
        : '',
  );
  final monthlyCtrl = TextEditingController(
    text: existing?['monthly_price'] != null
        ? existing!['monthly_price'].toString()
        : '',
  );

  final currentYear = DateTime.now().year;
  final years = List.generate(currentYear - 1999, (i) => 2000 + i);

  String carBrand = (_kCarBrands.contains(existing?['car_brand']))
      ? existing!['car_brand'] as String
      : 'Toyota';
  String carType = (_kCarTypes.contains(existing?['car_type']))
      ? existing!['car_type'] as String
      : 'SUV';
  String transmission = (_kTransmissions.contains(existing?['transmission']))
      ? existing!['transmission'] as String
      : 'Automatic';
  String fuelType = (_kFuelTypes.contains(existing?['fuel_type']))
      ? existing!['fuel_type'] as String
      : 'Petrol';
  String driveTrain = (_kDrivetrains.contains(existing?['drive_train']))
      ? existing!['drive_train'] as String
      : 'AWD';
  String currency = existing?['currency'] ?? 'RWF';
  int carYear = (existing?['car_year'] as num?)?.toInt() ?? currentYear;
  int seats = (existing?['seats'] as num?)?.toInt() ?? 5;
  bool driverIncluded = existing?['driver_included'] == true;
  List<String> keyFeatures = List<String>.from(
    existing?['key_features'] as List? ?? [],
  );

  // Image state
  final picker = ImagePicker();
  List<String> existingImageUrls = List<String>.from(
    existing?['images'] as List? ?? [],
  );
  List<XFile> newPickedImages = [];
  bool uploading = false;
  final draftKey = _hostDraftKey('transport', userId);
  Timer? draftSaveTimer;
  bool draftHydrated = existing != null;
  bool restoringDraft = false;
  bool draftRestored = false;

  Map<String, dynamic> collectDraft() => {
    'carModel': carModelCtrl.text,
    'providerName': providerCtrl.text,
    'description': descCtrl.text,
    'dailyPrice': dailyCtrl.text,
    'weeklyPrice': weeklyCtrl.text,
    'monthlyPrice': monthlyCtrl.text,
    'carBrand': carBrand,
    'carType': carType,
    'transmission': transmission,
    'fuelType': fuelType,
    'driveTrain': driveTrain,
    'currency': currency,
    'carYear': carYear,
    'seats': seats,
    'driverIncluded': driverIncluded,
    'keyFeatures': keyFeatures,
    'existingImageUrls': existingImageUrls,
    'newImagePaths': newPickedImages.map((file) => file.path).toList(),
  };

  void resetDraftState() {
    carModelCtrl.text = '';
    providerCtrl.text = '';
    descCtrl.text = '';
    dailyCtrl.text = '';
    weeklyCtrl.text = '';
    monthlyCtrl.text = '';
    carBrand = 'Toyota';
    carType = 'SUV';
    transmission = 'Automatic';
    fuelType = 'Petrol';
    driveTrain = 'AWD';
    currency = 'RWF';
    carYear = currentYear;
    seats = 5;
    driverIncluded = false;
    keyFeatures = [];
    existingImageUrls = [];
    newPickedImages = [];
  }

  void applyDraft(Map<String, dynamic> draft) {
    restoringDraft = true;
    carModelCtrl.text = (draft['carModel'] ?? '').toString();
    providerCtrl.text = (draft['providerName'] ?? '').toString();
    descCtrl.text = (draft['description'] ?? '').toString();
    dailyCtrl.text = (draft['dailyPrice'] ?? '').toString();
    weeklyCtrl.text = (draft['weeklyPrice'] ?? '').toString();
    monthlyCtrl.text = (draft['monthlyPrice'] ?? '').toString();
    carBrand = _kCarBrands.contains(draft['carBrand'])
        ? draft['carBrand'].toString()
        : 'Toyota';
    carType = _kCarTypes.contains(draft['carType'])
        ? draft['carType'].toString()
        : 'SUV';
    transmission = _kTransmissions.contains(draft['transmission'])
        ? draft['transmission'].toString()
        : 'Automatic';
    fuelType = _kFuelTypes.contains(draft['fuelType'])
        ? draft['fuelType'].toString()
        : 'Petrol';
    driveTrain = _kDrivetrains.contains(draft['driveTrain'])
        ? draft['driveTrain'].toString()
        : 'AWD';
    currency = _kCurrencies.contains(draft['currency'])
        ? draft['currency'].toString()
        : 'RWF';
    carYear = (draft['carYear'] as num?)?.toInt() ?? currentYear;
    seats = (draft['seats'] as num?)?.toInt() ?? 5;
    driverIncluded = draft['driverIncluded'] == true;
    keyFeatures = _draftStringList(draft['keyFeatures']);
    existingImageUrls = _draftStringList(draft['existingImageUrls']);
    newPickedImages = _draftImageFiles(draft['newImagePaths']);
    restoringDraft = false;
  }

  void scheduleDraftSave() {
    if (existing != null || restoringDraft) return;
    draftSaveTimer?.cancel();
    draftSaveTimer = Timer(const Duration(milliseconds: 400), () {
      LocalDraftStore.write(draftKey, collectDraft());
    });
  }

  for (final controller in [
    carModelCtrl,
    providerCtrl,
    descCtrl,
    dailyCtrl,
    weeklyCtrl,
    monthlyCtrl,
  ]) {
    controller.addListener(scheduleDraftSave);
  }

  showModalBottomSheet(
    context: ctx,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetCtx) => StatefulBuilder(
      builder: (sCtx, setSt) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
        ),
        child: Builder(
          builder: (context) {
            if (!draftHydrated) {
              draftHydrated = true;
              Future<void>(() async {
                final draft = await LocalDraftStore.read(draftKey);
                if (draft == null || !sheetCtx.mounted) return;
                setSt(() {
                  applyDraft(draft);
                  draftRestored = true;
                });
              });
            }
            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 40,
                          minHeight: 40,
                        ),
                        onPressed: () => Navigator.of(sheetCtx).maybePop(),
                        icon: const Icon(Icons.close, color: AppColors.black),
                        tooltip: 'Close',
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          existing == null ? 'Add Vehicle' : 'Edit Vehicle',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (draftRestored && existing == null) ...[
                    const SizedBox(height: 12),
                    _DraftNotice(
                      message: 'Saved vehicle draft restored on this device.',
                      onClear: () async {
                        await LocalDraftStore.clear(draftKey);
                        setSt(() {
                          restoringDraft = true;
                          resetDraftState();
                          draftRestored = false;
                          restoringDraft = false;
                        });
                      },
                    ),
                  ],
                  const SizedBox(height: 16),

                  // ── Photos ──
                  const Text(
                    'Photos',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  _ImagePickerRow(
                    existingUrls: existingImageUrls,
                    newFiles: newPickedImages,
                    onAddFromGallery: () async {
                      final imgs = await picker.pickMultiImage(
                        imageQuality: 85,
                      );
                      if (imgs.isNotEmpty) {
                        setSt(() => newPickedImages.addAll(imgs));
                        scheduleDraftSave();
                      }
                    },
                    onAddFromCamera: () async {
                      final img = await picker.pickImage(
                        source: ImageSource.camera,
                        imageQuality: 85,
                      );
                      if (img != null) {
                        setSt(() => newPickedImages.add(img));
                        scheduleDraftSave();
                      }
                    },
                    onRemoveExisting: (i) {
                      setSt(() => existingImageUrls.removeAt(i));
                      scheduleDraftSave();
                    },
                    onRemoveNew: (i) {
                      setSt(() => newPickedImages.removeAt(i));
                      scheduleDraftSave();
                    },
                  ),
                  const SizedBox(height: 16),

                  // Brand, Year
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('brand_$carBrand'),
                          initialValue: carBrand,
                          decoration: _inputDecoration('Brand'),
                          items: _kCarBrands
                              .map(
                                (b) => DropdownMenuItem(
                                  value: b,
                                  child: Text(
                                    b,
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => carBrand = v ?? carBrand);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 115,
                        child: DropdownButtonFormField<int>(
                          key: ValueKey('year_$carYear'),
                          isExpanded: true,
                          initialValue: years.contains(carYear)
                              ? carYear
                              : currentYear,
                          decoration: _inputDecoration('Year'),
                          items: years.reversed
                              .toList()
                              .map(
                                (y) => DropdownMenuItem(
                                  value: y,
                                  child: Text('$y'),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => carYear = v ?? carYear);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _Field(
                    ctrl: carModelCtrl,
                    label: 'Model (e.g. Land Cruiser)',
                  ),

                  // Car Type & Transmission
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('ct_$carType'),
                          initialValue: carType,
                          decoration: _inputDecoration('Car Type'),
                          items: _kCarTypes
                              .map(
                                (t) => DropdownMenuItem(
                                  value: t,
                                  child: Text(
                                    t,
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => carType = v ?? carType);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('tr_$transmission'),
                          initialValue: transmission,
                          decoration: _inputDecoration('Transmission'),
                          items: _kTransmissions
                              .map(
                                (t) => DropdownMenuItem(
                                  value: t,
                                  child: Text(
                                    t,
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => transmission = v ?? transmission);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Fuel & Drive Train
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('ft_$fuelType'),
                          initialValue: fuelType,
                          decoration: _inputDecoration('Fuel Type'),
                          items: _kFuelTypes
                              .map(
                                (f) =>
                                    DropdownMenuItem(value: f, child: Text(f)),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => fuelType = v ?? fuelType);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('dt_$driveTrain'),
                          initialValue: driveTrain,
                          decoration: _inputDecoration('Drive Train'),
                          items: _kDrivetrains
                              .map(
                                (d) =>
                                    DropdownMenuItem(value: d, child: Text(d)),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => driveTrain = v ?? driveTrain);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Seats
                  _countRow(
                    'Seats',
                    seats,
                    () {
                      setSt(() => seats = (seats - 1).clamp(1, 60));
                      scheduleDraftSave();
                    },
                    () {
                      setSt(() => seats = (seats + 1).clamp(1, 60));
                      scheduleDraftSave();
                    },
                  ),

                  // Pricing
                  const Divider(height: 24),
                  const Text(
                    'Pricing',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: _Field(
                          ctrl: dailyCtrl,
                          label: 'Daily Price',
                          inputType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 100,
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('vc_$currency'),
                          initialValue: currency,
                          decoration: _inputDecoration('Currency'),
                          items: _kCurrencies
                              .map(
                                (c) =>
                                    DropdownMenuItem(value: c, child: Text(c)),
                              )
                              .toList(),
                          onChanged: (v) {
                            setSt(() => currency = v ?? currency);
                            scheduleDraftSave();
                          },
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: _Field(
                          ctrl: weeklyCtrl,
                          label: 'Weekly Price',
                          inputType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Field(
                          ctrl: monthlyCtrl,
                          label: 'Monthly Price',
                          inputType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),

                  // Driver & Provider
                  const Divider(height: 24),
                  SwitchListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Driver Included',
                      style: TextStyle(fontSize: 14),
                    ),
                    value: driverIncluded,
                    activeThumbColor: _kRed,
                    onChanged: (v) {
                      setSt(() => driverIncluded = v);
                      scheduleDraftSave();
                    },
                  ),
                  _Field(ctrl: providerCtrl, label: 'Provider / Company Name'),
                  _Field(ctrl: descCtrl, label: 'Description', maxLines: 2),

                  // Key Features
                  const Divider(height: 24),
                  const Text(
                    'Key Features',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: _kKeyFeatures
                        .map(
                          (feat) => FilterChip(
                            label: Text(
                              feat,
                              style: const TextStyle(fontSize: 11),
                            ),
                            selected: keyFeatures.contains(feat),
                            selectedColor: _kRed.withValues(alpha: 0.15),
                            checkmarkColor: _kRed,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            onSelected: (sel) => setSt(() {
                              if (sel) {
                                keyFeatures.add(feat);
                              } else {
                                keyFeatures.remove(feat);
                              }
                              scheduleDraftSave();
                            }),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 16),

                  if (uploading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: _kRed,
                            ),
                          ),
                          SizedBox(width: 10),
                          Text(
                            'Uploading photos…',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.foggy,
                            ),
                          ),
                        ],
                      ),
                    ),

                  _SaveButton(
                    label: existing == null ? 'Create Vehicle' : 'Save Changes',
                    onPressed: uploading
                        ? null
                        : () async {
                            setSt(() => uploading = true);
                            final newUrls =
                                await CloudinaryService.uploadImages(
                                  newPickedImages.map((f) => f.path).toList(),
                                  folder: 'transport',
                                );
                            final allImages = [
                              ...existingImageUrls,
                              ...newUrls,
                            ];
                            setSt(() => uploading = false);

                            final model = carModelCtrl.text.trim();
                            final fields = {
                              'title':
                                  '$carBrand${model.isNotEmpty ? ' $model' : ''} $carYear',
                              'car_brand': carBrand,
                              'car_model': model,
                              'car_year': carYear,
                              'car_type': carType,
                              'seats': seats,
                              'transmission': transmission,
                              'fuel_type': fuelType,
                              'drive_train': driveTrain,
                              'daily_price':
                                  double.tryParse(dailyCtrl.text.trim()) ?? 0,
                              'weekly_price': double.tryParse(
                                weeklyCtrl.text.trim(),
                              ),
                              'monthly_price': double.tryParse(
                                monthlyCtrl.text.trim(),
                              ),
                              'currency': currency,
                              'driver_included': driverIncluded,
                              'key_features': keyFeatures,
                              'provider_name': providerCtrl.text.trim(),
                              'description': descCtrl.text.trim(),
                              if (allImages.isNotEmpty) 'images': allImages,
                              if (allImages.isNotEmpty)
                                'main_image': allImages.first,
                              if (allImages.isNotEmpty)
                                'image_url': allImages.first,
                            };
                            if (existing != null) {
                              await api.updateTransport(
                                id: existing['id'],
                                updates: fields,
                              );
                            } else {
                              await api.createTransport(
                                userId: userId,
                                fields: fields,
                              );
                            }
                            await LocalDraftStore.clear(draftKey);
                            if (sheetCtx.mounted) Navigator.pop(sheetCtx);
                            onRefresh();
                          },
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            );
          },
        ),
      ),
    ),
  ).whenComplete(() {
    draftSaveTimer?.cancel();
    carModelCtrl.dispose();
    providerCtrl.dispose();
    descCtrl.dispose();
    dailyCtrl.dispose();
    weeklyCtrl.dispose();
    monthlyCtrl.dispose();
  });
}

// ===================== BOOKINGS =====================
class _BookingsTab extends StatefulWidget {
  const _BookingsTab({
    required this.api,
    required this.userId,
    required this.bookings,
    required this.onRefresh,
  });
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

  List<Map<String, dynamic>> get _filtered => _filter == 'all'
      ? widget.bookings
      : widget.bookings.where((b) => b['status'] == _filter).toList();

  Future<void> _runBookingAction(
    String key,
    Future<void> Function() action,
    String successMessage,
  ) async {
    setState(() => _busyIds.add(key));
    try {
      await action();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(successMessage)));
      widget.onRefresh();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
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
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.rausch),
            onPressed: () =>
                Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  // Status colour helpers
  Color _statusBg(String s) {
    switch (s) {
      case 'confirmed': return const Color(0xFFDCFCE7);
      case 'completed': return const Color(0xFFDBEAFE);
      case 'cancelled': return const Color(0xFFFFE4E6);
      default:          return const Color(0xFFFEF9C3);
    }
  }
  Color _statusFg(String s) {
    switch (s) {
      case 'confirmed': return const Color(0xFF16A34A);
      case 'completed': return const Color(0xFF1D4ED8);
      case 'cancelled': return AppColors.rausch;
      default:          return const Color(0xFF854D0E);
    }
  }

  @override
  Widget build(BuildContext context) {
    const filters = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
    return Column(
      children: [
        // ── Filter pills ──────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: filters.map((s) {
                final active = _filter == s;
                final label = s == 'all' ? 'All' : '${s[0].toUpperCase()}${s.substring(1)}';
                return Padding(
                  padding: const EdgeInsets.only(right: 7),
                  child: GestureDetector(
                    onTap: () => setState(() => _filter = s),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: active ? AppColors.rausch : AppColors.surfaceSubtle,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: active ? AppColors.rausch : AppColors.border,
                        ),
                      ),
                      child: Text(
                        label,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: active ? Colors.white : AppColors.black,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        // ── List ─────────────────────────────────────────────────────
        Expanded(
          child: _filtered.isEmpty
              ? _EmptyState(
                  label: 'No ${_filter == 'all' ? '' : _filter} bookings',
                  icon: Icons.calendar_today_outlined,
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 24),
                  itemCount: _filtered.length,
                  itemBuilder: (ctx, i) {
                    final b = _filtered[i];
                    final status = b['status'] as String? ?? 'pending';
                    final actionKey = (b['order_id'] ?? b['id']).toString();
                    final isBusy = _busyIds.contains(actionKey);
                    final guestName = (b['guest_name'] ?? b['user_name'] ?? '?').toString();
                    final initial = guestName.isNotEmpty ? guestName[0].toUpperCase() : '?';
                    final listingTitle = (b['listing_title'] ?? b['item_title'] ?? 'Booking').toString();
                    final checkIn  = (b['check_in']  ?? '').toString();
                    final checkOut = (b['check_out'] ?? '').toString();
                    final amount   = ((b['total_amount'] ?? b['total_price']) as num?) ?? 0;
                    final currency = (b['currency'] ?? 'RWF').toString();
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // ── Header row ──
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Guest avatar
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: AppColors.rausch.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  initial,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.rausch,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      listingTitle,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                        color: AppColors.black,
                                      ),
                                    ),
                                    Text(
                                      guestName,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.foggy,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              // Status badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _statusBg(status),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '${status[0].toUpperCase()}${status.substring(1)}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: _statusFg(status),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          // ── Dates + amount ──
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceSubtle,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_month_rounded,
                                    size: 13, color: AppColors.foggy),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    checkIn.isNotEmpty
                                        ? '$checkIn → $checkOut'
                                        : 'No dates',
                                    style: const TextStyle(
                                        fontSize: 12, color: AppColors.foggy),
                                  ),
                                ),
                                Text(
                                  _formatMoney(amount, currency),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.black,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Rejection reason
                          if ((b['rejection_reason'] ?? '').toString().isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Reason: ${b['rejection_reason']}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.rausch,
                              ),
                            ),
                          ],
                          // ── Actions ──
                          if (status == 'pending') ...[
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: isBusy ? null : () async {
                                      final reason = await _askRejectReason();
                                      if (reason == null || reason.isEmpty) return;
                                      await _runBookingAction(
                                        actionKey,
                                        () => widget.api.rejectHostBookingRequest(
                                          actorUserId: widget.userId,
                                          booking: b,
                                          reason: reason,
                                        ),
                                        'Booking rejected',
                                      );
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: AppColors.rausch.withValues(alpha: 0.08),
                                        borderRadius: BorderRadius.circular(9),
                                      ),
                                      alignment: Alignment.center,
                                      child: isBusy
                                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.rausch))
                                          : const Text('Decline', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.rausch)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: isBusy ? null : () async {
                                      await _runBookingAction(
                                        actionKey,
                                        () => widget.api.confirmHostBookingRequest(
                                          actorUserId: widget.userId,
                                          booking: b,
                                        ),
                                        'Booking confirmed',
                                      );
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF16A34A),
                                        borderRadius: BorderRadius.circular(9),
                                      ),
                                      alignment: Alignment.center,
                                      child: isBusy
                                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white))
                                          : const Text('Confirm', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                          if (status == 'confirmed') ...[
                            const SizedBox(height: 10),
                            GestureDetector(
                              onTap: isBusy ? null : () async {
                                await _runBookingAction(
                                  actionKey,
                                  () => widget.api.markHostBookingComplete(booking: b),
                                  'Booking marked complete',
                                );
                              },
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB),
                                  borderRadius: BorderRadius.circular(9),
                                ),
                                alignment: Alignment.center,
                                child: isBusy
                                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white))
                                    : const Text('Mark Complete', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                              ),
                            ),
                          ],
                          if ((status == 'confirmed' || status == 'completed') &&
                              (b['review_token'] ?? '').toString().isNotEmpty) ...[
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: (isBusy || b['review_email_sent'] == true) ? null : () async {
                                await _runBookingAction(
                                  actionKey,
                                  () => widget.api.sendBookingReviewEmail(booking: b),
                                  'Review request sent',
                                );
                              },
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: b['review_email_sent'] == true
                                      ? AppColors.surfaceSubtle
                                      : const Color(0xFFF59E0B).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(9),
                                  border: Border.all(
                                    color: b['review_email_sent'] == true
                                        ? AppColors.border
                                        : const Color(0xFFF59E0B).withValues(alpha: 0.4),
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.star_rounded,
                                      size: 13,
                                      color: b['review_email_sent'] == true
                                          ? AppColors.foggy
                                          : const Color(0xFFD97706),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      b['review_email_sent'] == true
                                          ? 'Review Request Sent'
                                          : 'Send Review Request',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: b['review_email_sent'] == true
                                            ? AppColors.foggy
                                            : const Color(0xFFD97706),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
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
  const _ManualReviewsContent({
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a property and enter an email.')),
      );
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Review request sent to $reviewerEmail')),
      );
      widget.onRefresh();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
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
          const Text(
            'Manual Reviews',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Send a direct review link for a selected property. No booking is required.',
            style: TextStyle(fontSize: 13, color: AppColors.foggy),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<String>(
                  key: ValueKey(_propertyId),
                  initialValue: _propertyId,
                  decoration: _inputDecoration('Property'),
                  hint: const Text('Select property'),
                  items: widget.properties
                      .map(
                        (property) => DropdownMenuItem<String>(
                          value: property['id']?.toString(),
                          child: Text(
                            (property['title'] ?? 'Property').toString(),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _propertyId = value),
                ),
                const SizedBox(height: 12),
                _Field(
                  ctrl: _emailCtrl,
                  label: 'Reviewer Email',
                  inputType: TextInputType.emailAddress,
                ),
                _Field(ctrl: _nameCtrl, label: 'Reviewer Name (optional)'),
                const SizedBox(height: 8),
                _SaveButton(
                  label: _sending ? 'Sending…' : 'Send Review Request',
                  onPressed: _sending ? null : _send,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Recent Requests',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 10),
          if (widget.requests.isEmpty)
            const _EmptyState(
              label: 'No manual review requests yet',
              icon: Icons.mail_outline,
            )
          else
            ...widget.requests.map((request) {
              final status = (request['status'] ?? 'pending').toString();
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            (request['propertyTitle'] ?? 'Property').toString(),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: AppColors.black,
                            ),
                          ),
                        ),
                        _StatusChip(
                          status: status == 'collected'
                              ? 'completed'
                              : status == 'sent'
                              ? 'confirmed'
                              : 'pending',
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      (request['reviewerEmail'] ?? '').toString(),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.foggy,
                      ),
                    ),
                    if ((request['reviewerName'] ?? '').toString().isNotEmpty)
                      Text(
                        (request['reviewerName'] ?? '').toString(),
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.foggy,
                        ),
                      ),
                    if (request['createdAt'] != null)
                      Text(
                        'Created ${request['createdAt'].toString().substring(0, 10)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.foggy,
                        ),
                      ),
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
  const _CalendarTab({
    required this.api,
    required this.properties,
    required this.bookings,
  });
  final AppDatabase api;
  final List<Map<String, dynamic>> properties;
  final List<Map<String, dynamic>> bookings;

  @override
  State<_CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends State<_CalendarTab> {
  String? _selectedPropertyId;
  bool _loadingEx = false;
  final Set<DateTime> _blockedDays = {};
  DateTime _focusedDay = DateTime.now();

  // Availability / Custom Pricing toggle
  int _calendarMode = 0; // 0 = availability, 1 = custom pricing

  // Custom pricing
  DateTime? _rangeStart;
  DateTime? _rangeEnd;
  bool _loadingPrices = false;
  List<Map<String, dynamic>> _customPrices = [];
  final _priceCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();

  @override
  void dispose() {
    _priceCtrl.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadExceptions(String propertyId) async {
    setState(() {
      _loadingEx = true;
      _blockedDays.clear();
    });
    final data = await widget.api.fetchAvailabilityExceptions(
      propertyId: propertyId,
    );
    final blocked = <DateTime>{};
    for (final e in data) {
      if (e['available'] == false) {
        try {
          blocked.add(DateTime.parse(e['date'] as String));
        } catch (_) {}
      }
    }
    setState(() {
      _blockedDays.addAll(blocked);
      _loadingEx = false;
    });
  }

  Future<void> _loadCustomPrices(String propertyId) async {
    setState(() => _loadingPrices = true);
    final data = await widget.api.fetchPropertyCustomPrices(
        propertyId: propertyId);
    setState(() {
      _customPrices = data;
      _loadingPrices = false;
    });
  }

  void _selectProperty(String pid) {
    setState(() {
      _selectedPropertyId = pid;
      _rangeStart = null;
      _rangeEnd = null;
    });
    _loadExceptions(pid);
    _loadCustomPrices(pid);
  }

  /// Booked ranges for the selected property
  List<Map<String, dynamic>> get _bookedRanges {
    if (_selectedPropertyId == null) return [];
    return widget.bookings
        .where((b) =>
            b['property_id'] == _selectedPropertyId &&
            b['booking_type'] == 'property' &&
            (b['status'] == 'confirmed' ||
                b['status'] == 'pending' ||
                b['status'] == 'checked_in'))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.properties.isEmpty) {
      return const _EmptyState(
        label: 'Add a property first',
        icon: Icons.calendar_month_outlined,
      );
    }

    final selectedProperty = widget.properties.firstWhere(
      (p) => p['id'] == _selectedPropertyId,
      orElse: () => <String, dynamic>{},
    );
    final currency =
        (selectedProperty['currency'] ?? 'RWF').toString();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Property selector ─────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Property',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.foggy,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 68,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: widget.properties.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (ctx, i) {
                    final p = widget.properties[i];
                    final pid = p['id'] as String?;
                    final isActive = pid == _selectedPropertyId;
                    final imgUrl = resolveListingImageUrl(p);
                    return GestureDetector(
                      onTap: () {
                        if (pid != null) _selectProperty(pid);
                      },
                      child: Container(
                        width: 200,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isActive
                              ? AppColors.rausch.withValues(alpha: 0.06)
                              : AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isActive
                                ? AppColors.rausch
                                : AppColors.border,
                            width: isActive ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(7),
                              child: imgUrl != null
                                  ? Image.network(
                                      imgUrl,
                                      width: 40,
                                      height: 40,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, _, _) =>
                                          Container(
                                            width: 40,
                                            height: 40,
                                            color: const Color(0xFFF1F5F9),
                                            child: const Icon(
                                                Icons.home_rounded,
                                                size: 18,
                                                color: Color(0xFFCBD5E1)),
                                          ),
                                    )
                                  : Container(
                                      width: 40,
                                      height: 40,
                                      color: const Color(0xFFF1F5F9),
                                      child: const Icon(Icons.home_rounded,
                                          size: 18,
                                          color: Color(0xFFCBD5E1)),
                                    ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                mainAxisAlignment:
                                    MainAxisAlignment.center,
                                children: [
                                  Text(
                                    (p['title'] ?? 'Property')
                                        .toString(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: isActive
                                          ? AppColors.rausch
                                          : AppColors.black,
                                    ),
                                  ),
                                  if ((p['location'] ?? '')
                                      .toString()
                                      .isNotEmpty)
                                    Text(
                                      (p['location'] ?? '').toString(),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: AppColors.foggy,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            if (isActive)
                              const Icon(Icons.check_circle_rounded,
                                  size: 14, color: AppColors.rausch),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // ── Availability / Custom Pricing toggle ───────────────
        if (_selectedPropertyId != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF2F2F2),
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  _CalToggle(
                    label: 'Availability',
                    icon: Icons.block_rounded,
                    selected: _calendarMode == 0,
                    onTap: () =>
                        setState(() => _calendarMode = 0),
                  ),
                  _CalToggle(
                    label: 'Custom Pricing',
                    icon: Icons.sell_rounded,
                    selected: _calendarMode == 1,
                    onTap: () =>
                        setState(() => _calendarMode = 1),
                  ),
                ],
              ),
            ),
          ),

        const SizedBox(height: 10),

        if (_selectedPropertyId == null)
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppColors.rausch.withValues(alpha: 0.08),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.calendar_month_rounded,
                        size: 32, color: AppColors.rausch),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Select a property above\nto manage availability',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.foggy,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          )
        else if (_loadingEx)
          const Expanded(
            child: Center(
                child: CircularProgressIndicator(color: _kRed)),
          )
        else
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Section header ───────────────────────────
                  Padding(
                    padding:
                        const EdgeInsets.fromLTRB(2, 0, 2, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _calendarMode == 0
                              ? 'Block Dates'
                              : 'Set Custom Price',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: AppColors.black,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _calendarMode == 0
                              ? 'Tap dates to make them unavailable for booking'
                              : 'Override the default nightly rate for a date range',
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.foggy),
                        ),
                      ],
                    ),
                  ),

                  // ── Calendar card ────────────────────────────
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                      boxShadow: [
                        BoxShadow(
                          color:
                              Colors.black.withValues(alpha: 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        TableCalendar(
                          firstDay: DateTime.now()
                              .subtract(const Duration(days: 30)),
                          lastDay: DateTime.now()
                              .add(const Duration(days: 365)),
                          focusedDay: _focusedDay,
                          onPageChanged: (fd) =>
                              setState(() => _focusedDay = fd),
                          headerStyle: const HeaderStyle(
                            formatButtonVisible: false,
                            titleCentered: true,
                            titleTextStyle: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.black,
                            ),
                            leftChevronIcon: Icon(
                                Icons.chevron_left_rounded,
                                size: 20,
                                color: AppColors.black),
                            rightChevronIcon: Icon(
                                Icons.chevron_right_rounded,
                                size: 20,
                                color: AppColors.black),
                          ),
                          daysOfWeekStyle: const DaysOfWeekStyle(
                            weekdayStyle: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.foggy),
                            weekendStyle: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.foggy),
                          ),
                          calendarStyle: CalendarStyle(
                            defaultTextStyle: const TextStyle(
                                fontSize: 13,
                                color: AppColors.black),
                            weekendTextStyle: const TextStyle(
                                fontSize: 13,
                                color: AppColors.black),
                            outsideDaysVisible: false,
                            todayDecoration: BoxDecoration(
                              color: _calendarMode == 0
                                  ? const Color(0xFFFF385C)
                                  : const Color(0xFFFF385C),
                              shape: BoxShape.circle,
                            ),
                          ),
                          calendarBuilders: CalendarBuilders(
                            defaultBuilder: (ctx, day, _) {
                              final norm = DateTime(
                                  day.year, day.month, day.day);
                              if (_calendarMode == 0) {
                                // Availability mode
                                final blocked =
                                    _blockedDays.contains(norm);
                                return Container(
                                  margin: const EdgeInsets.all(3),
                                  decoration: BoxDecoration(
                                    color: blocked
                                        ? _kRed.withValues(alpha: 0.12)
                                        : null,
                                    borderRadius:
                                        BorderRadius.circular(8),
                                    border: blocked
                                        ? Border.all(
                                            color: _kRed
                                                .withValues(alpha: 0.3))
                                        : null,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    '${day.day}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: blocked
                                          ? FontWeight.w700
                                          : FontWeight.w400,
                                      color: blocked
                                          ? _kRed
                                          : AppColors.black,
                                    ),
                                  ),
                                );
                              } else {
                                // Pricing mode — highlight selected range
                                final inRange = _rangeStart != null &&
                                    _rangeEnd != null &&
                                    !norm.isBefore(_rangeStart!) &&
                                    !norm.isAfter(_rangeEnd!);
                                final isEdge = norm == _rangeStart ||
                                    norm == _rangeEnd;
                                return Container(
                                  margin: const EdgeInsets.all(3),
                                  decoration: BoxDecoration(
                                    color: isEdge
                                        ? _kRed
                                        : inRange
                                            ? _kRed.withValues(alpha: 0.12)
                                            : null,
                                    borderRadius:
                                        BorderRadius.circular(8),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    '${day.day}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: isEdge
                                          ? AppColors.white
                                          : AppColors.black,
                                      fontWeight: isEdge
                                          ? FontWeight.w700
                                          : FontWeight.w400,
                                    ),
                                  ),
                                );
                              }
                            },
                          ),
                          onDaySelected: (selectedDay, focusedDay) async {
                            setState(() => _focusedDay = focusedDay);
                            final norm = DateTime(
                              selectedDay.year,
                              selectedDay.month,
                              selectedDay.day,
                            );
                            if (_calendarMode == 0) {
                              // Toggle blocked day
                              final dateStr = DateFormat('yyyy-MM-dd')
                                  .format(norm);
                              if (_blockedDays.contains(norm)) {
                                await widget.api
                                    .deleteAvailabilityException(
                                  propertyId: _selectedPropertyId!,
                                  date: dateStr,
                                );
                                setState(
                                    () => _blockedDays.remove(norm));
                              } else {
                                await widget.api
                                    .setAvailabilityException(
                                  propertyId: _selectedPropertyId!,
                                  date: dateStr,
                                  available: false,
                                );
                                setState(() => _blockedDays.add(norm));
                              }
                            } else {
                              // Range pick for custom price
                              setState(() {
                                if (_rangeStart == null ||
                                    (_rangeStart != null &&
                                        _rangeEnd != null)) {
                                  _rangeStart = norm;
                                  _rangeEnd = null;
                                } else {
                                  if (norm.isBefore(_rangeStart!)) {
                                    _rangeEnd = _rangeStart;
                                    _rangeStart = norm;
                                  } else {
                                    _rangeEnd = norm;
                                  }
                                }
                              });
                            }
                          },
                        ),
                        // Legend (availability only)
                        if (_calendarMode == 0)
                          Padding(
                            padding:
                                const EdgeInsets.fromLTRB(16, 0, 16, 14),
                            child: Row(
                              children: [
                                Container(
                                  width: 14,
                                  height: 14,
                                  decoration: BoxDecoration(
                                    color: _kRed.withValues(alpha: 0.12),
                                    borderRadius:
                                        BorderRadius.circular(4),
                                    border: Border.all(
                                        color: _kRed
                                            .withValues(alpha: 0.3)),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text('Blocked',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.foggy)),
                                const SizedBox(width: 16),
                                Container(
                                  width: 14,
                                  height: 14,
                                  decoration: const BoxDecoration(
                                    color: AppColors.rausch,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text('Today',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.foggy)),
                                const Spacer(),
                                const Icon(Icons.touch_app_rounded,
                                    size: 13, color: AppColors.foggy),
                                const SizedBox(width: 4),
                                const Text('Tap to toggle',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.foggy)),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  if (_calendarMode == 0) ...[
                    // ── Unavailable Dates ────────────────────────
                    const Text(
                      'Unavailable Dates',
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: AppColors.black),
                    ),
                    const SizedBox(height: 10),
                    if (_bookedRanges.isEmpty && _blockedDays.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            vertical: 18, horizontal: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F8F8),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: AppColors.border),
                        ),
                        child: const Text(
                          'No unavailable dates for this property.',
                          style: TextStyle(
                              color: AppColors.foggy, fontSize: 13),
                        ),
                      )
                    else ...[
                      ..._bookedRanges.map((b) {
                        final checkIn =
                            b['check_in'] as String? ??
                                b['start_date'] as String? ??
                                '';
                        final checkOut =
                            b['check_out'] as String? ??
                                b['end_date'] as String? ??
                                '';
                        final status =
                            (b['status'] as String? ?? 'booked')
                                .toLowerCase();
                        String fmtDate(String d) {
                          try {
                            return DateFormat('MMM d, yyyy')
                                .format(DateTime.parse(d));
                          } catch (_) {
                            return d;
                          }
                        }

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.fromLTRB(
                              14, 10, 12, 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF5F5),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: AppColors.rausch
                                    .withValues(alpha: 0.2)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${fmtDate(checkIn)} – ${fmtDate(checkOut)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                        color: AppColors.black,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Container(
                                      padding:
                                          const EdgeInsets.symmetric(
                                              horizontal: 7,
                                              vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.rausch
                                            .withValues(alpha: 0.1),
                                        borderRadius:
                                            BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        status[0].toUpperCase() +
                                            status.substring(1),
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.rausch,
                                            fontWeight:
                                                FontWeight.w600),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ] else ...[
                    // ── Custom pricing form ──────────────────────
                    if (_rangeStart != null) ...[
                      // Selected range display
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded,
                              size: 14, color: AppColors.foggy),
                          const SizedBox(width: 6),
                          Text(
                            _rangeEnd != null
                                ? '${DateFormat('d MMM yyyy').format(_rangeStart!)} – ${DateFormat('d MMM yyyy').format(_rangeEnd!)}'
                                : DateFormat('d MMM yyyy')
                                    .format(_rangeStart!),
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: AppColors.black,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _priceCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText:
                              'Custom price per night ($currency)',
                          border: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.circular(12)),
                          focusedBorder: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(12),
                            borderSide: const BorderSide(
                                color: AppColors.rausch, width: 2),
                          ),
                          filled: true,
                          fillColor: const Color(0xFFFAFAFA),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _reasonCtrl,
                        decoration: InputDecoration(
                          labelText:
                              'Reason (e.g. Holiday season, Special event)',
                          border: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.circular(12)),
                          focusedBorder: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(12),
                            borderSide: const BorderSide(
                                color: AppColors.rausch, width: 2),
                          ),
                          filled: true,
                          fillColor: const Color(0xFFFAFAFA),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.rausch,
                                foregroundColor: AppColors.white,
                                padding:
                                    const EdgeInsets.symmetric(
                                        vertical: 13),
                                shape: RoundedRectangleBorder(
                                    borderRadius:
                                        BorderRadius.circular(10)),
                              ),
                              onPressed: _rangeEnd == null
                                  ? null
                                  : () async {
                                      final price = double.tryParse(
                                          _priceCtrl.text.trim());
                                      if (price == null) return;
                                      await widget.api
                                          .addPropertyCustomPrice(
                                        propertyId:
                                            _selectedPropertyId!,
                                        startDate: DateFormat(
                                                'yyyy-MM-dd')
                                            .format(_rangeStart!),
                                        endDate: DateFormat(
                                                'yyyy-MM-dd')
                                            .format(_rangeEnd!),
                                        customPricePerNight: price,
                                        reason: _reasonCtrl.text
                                                .trim()
                                                .isEmpty
                                            ? null
                                            : _reasonCtrl.text
                                                .trim(),
                                      );
                                      _priceCtrl.clear();
                                      _reasonCtrl.clear();
                                      setState(() {
                                        _rangeStart = null;
                                        _rangeEnd = null;
                                      });
                                      await _loadCustomPrices(
                                          _selectedPropertyId!);
                                    },
                              child: const Text('Set Custom Price',
                                  style: TextStyle(
                                      fontWeight: FontWeight.w700)),
                            ),
                          ),
                          const SizedBox(width: 10),
                          OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding:
                                  const EdgeInsets.symmetric(
                                      vertical: 13,
                                      horizontal: 20),
                              shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(10)),
                            ),
                            onPressed: () => setState(() {
                              _rangeStart = null;
                              _rangeEnd = null;
                              _priceCtrl.clear();
                              _reasonCtrl.clear();
                            }),
                            child: const Text('Cancel'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                    ],

                    // ── Custom Pricing Rules ─────────────────────
                    const Text(
                      'Custom Pricing Rules',
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: AppColors.black),
                    ),
                    const SizedBox(height: 10),
                    if (_loadingPrices)
                      const Center(
                          child: CircularProgressIndicator(
                              color: _kRed))
                    else if (_customPrices.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            vertical: 18, horizontal: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F8F8),
                          borderRadius: BorderRadius.circular(12),
                          border:
                              Border.all(color: AppColors.border),
                        ),
                        child: const Text(
                          'No custom pricing rules yet. Tap a date range above to add one.',
                          style: TextStyle(
                              color: AppColors.foggy, fontSize: 13),
                        ),
                      )
                    else
                      ..._customPrices.map((cp) {
                        final cpCurrency =
                            (cp['currency'] ?? currency).toString();
                        final price =
                            (cp['custom_price_per_night'] as num?) ??
                                0;
                        final reason =
                            cp['reason'] as String? ?? '';
                        String fmtDate(String d) {
                          try {
                            return DateFormat('MMM d, yyyy')
                                .format(DateTime.parse(d));
                          } catch (_) {
                            return d;
                          }
                        }

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.fromLTRB(
                              14, 10, 12, 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FFF4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: const Color(0xFF22C55E)
                                    .withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding:
                                    const EdgeInsets.symmetric(
                                        horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDCFCE7),
                                  borderRadius:
                                      BorderRadius.circular(8),
                                  border: Border.all(
                                      color: const Color(
                                          0xFF22C55E)),
                                ),
                                child: Text(
                                  '$cpCurrency ${price.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                    color: Color(0xFF16A34A),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${fmtDate(cp['start_date'] ?? '')} – ${fmtDate(cp['end_date'] ?? '')}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                        color: AppColors.black,
                                      ),
                                    ),
                                    if (reason.isNotEmpty)
                                      Text(reason,
                                          style: const TextStyle(
                                              fontSize: 11,
                                              color: AppColors.foggy)),
                                  ],
                                ),
                              ),
                              GestureDetector(
                                onTap: () async {
                                  await widget.api
                                      .removePropertyCustomPrice(
                                          id: cp['id'].toString());
                                  await _loadCustomPrices(
                                      _selectedPropertyId!);
                                },
                                child: const Icon(
                                    Icons.close_rounded,
                                    size: 18,
                                    color: AppColors.foggy),
                              ),
                            ],
                          ),
                        );
                      }),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _CalToggle extends StatelessWidget {
  const _CalToggle({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: selected ? AppColors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      )
                    ]
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon,
                    size: 13,
                    color: selected
                        ? AppColors.rausch
                        : AppColors.foggy),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: selected
                        ? FontWeight.w700
                        : FontWeight.w400,
                    color: selected
                        ? AppColors.rausch
                        : AppColors.foggy,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

// ===================== DISCOUNTS =====================
class _DiscountsTab extends StatelessWidget {
  const _DiscountsTab({
    required this.api,
    required this.userId,
    required this.items,
    required this.onRefresh,
  });
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      body: items.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppColors.rausch.withValues(alpha: 0.08),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.local_offer_rounded,
                        size: 36, color: AppColors.rausch),
                  ),
                  const SizedBox(height: 16),
                  const Text('No discount codes yet',
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                          color: AppColors.black)),
                  const SizedBox(height: 6),
                  const Text('Tap + to create your first promo code',
                      style:
                          TextStyle(fontSize: 13, color: AppColors.foggy)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              itemCount: items.length,
              itemBuilder: (ctx, i) {
                final d = items[i];
                final isActive = d['is_active'] == true;
                final type =
                    d['discount_type'] as String? ?? 'percentage';
                final value = (d['discount_value'] as num?) ?? 0;
                final uses =
                    (d['current_uses'] as num?)?.toInt() ?? 0;
                final maxUses =
                    (d['max_uses'] as num?)?.toInt();
                final desc = d['description'] as String?;
                final expiryStr = d['valid_until'] as String?;
                final expiry = expiryStr != null
                    ? DateTime.tryParse(expiryStr)
                    : null;
                final isExpired =
                    expiry != null && expiry.isBefore(DateTime.now());
                final currency =
                    d['currency'] as String? ?? 'RWF';
                final appliesTo =
                    d['applies_to'] as String? ?? 'all';

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Header row ────────────────────────────────
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 8, 0),
                        child: Row(
                          children: [
                            // Code badge
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 5),
                              decoration: BoxDecoration(
                                color: isActive && !isExpired
                                    ? AppColors.rausch
                                    : Colors.grey.shade300,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                d['code'] as String? ?? '',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                  letterSpacing: 1.2,
                                  color: isActive && !isExpired
                                      ? AppColors.white
                                      : AppColors.foggy,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            // Discount value
                            Text(
                              type == 'percentage'
                                  ? '${value.toStringAsFixed(0)}% off'
                                  : '${currency} ${value.toStringAsFixed(0)} off',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 17,
                                color: isActive && !isExpired
                                    ? AppColors.black
                                    : AppColors.foggy,
                              ),
                            ),
                            const Spacer(),
                            // Toggle
                            Transform.scale(
                              scale: 0.82,
                              child: Switch(
                                value: isActive,
                                activeColor: const Color(0xFF008489),
                                onChanged: isExpired
                                    ? null
                                    : (v) async {
                                        await api.toggleDiscount(
                                            id: d['id'], active: v);
                                        onRefresh();
                                      },
                              ),
                            ),
                            // Delete
                            GestureDetector(
                              onTap: () async {
                                final confirmed = await showDialog<bool>(
                                  context: ctx,
                                  builder: (_) => AlertDialog(
                                    title: const Text('Delete code?'),
                                    content: Text(
                                        'Remove "${d['code']}" permanently?'),
                                    actions: [
                                      TextButton(
                                          onPressed: () =>
                                              Navigator.pop(ctx, false),
                                          child: const Text('Cancel')),
                                      TextButton(
                                          onPressed: () =>
                                              Navigator.pop(ctx, true),
                                          child: const Text('Delete',
                                              style: TextStyle(
                                                  color: AppColors.rausch))),
                                    ],
                                  ),
                                );
                                if (confirmed == true) {
                                  await api.deleteDiscount(id: d['id']);
                                  onRefresh();
                                }
                              },
                              child: Padding(
                                padding: const EdgeInsets.all(8),
                                child: Icon(Icons.delete_outline_rounded,
                                    size: 20,
                                    color: Colors.grey.shade400),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // ── Description ───────────────────────────────
                      if (desc != null && desc.isNotEmpty)
                        Padding(
                          padding:
                              const EdgeInsets.fromLTRB(16, 6, 16, 0),
                          child: Text(desc,
                              style: const TextStyle(
                                  fontSize: 12, color: AppColors.foggy)),
                        ),
                      // ── Tags row ──────────────────────────────────
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                        child: Wrap(
                          spacing: 6,
                          children: [
                            _DiscountChip(
                              icon: Icons.category_outlined,
                              label: appliesTo[0].toUpperCase() +
                                  appliesTo.substring(1),
                            ),
                            if (maxUses != null)
                              _DiscountChip(
                                icon: Icons.people_outline,
                                label: '$uses / $maxUses uses',
                              )
                            else
                              _DiscountChip(
                                icon: Icons.all_inclusive,
                                label:
                                    '$uses use${uses != 1 ? "s" : ""}',
                              ),
                            if (expiry != null)
                              _DiscountChip(
                                icon: Icons.event_outlined,
                                label: isExpired
                                    ? 'Expired'
                                    : 'Expires ${DateFormat("d MMM").format(expiry)}',
                                color: isExpired
                                    ? AppColors.rausch
                                    : null,
                              ),
                          ],
                        ),
                      ),
                      // ── Uses progress bar ─────────────────────────
                      if (maxUses != null && maxUses > 0)
                        Padding(
                          padding:
                              const EdgeInsets.fromLTRB(16, 10, 16, 14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: (uses / maxUses).clamp(0.0, 1.0),
                                  backgroundColor:
                                      Colors.grey.shade100,
                                  color: uses >= maxUses
                                      ? Colors.grey
                                      : AppColors.rausch,
                                  minHeight: 5,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        const SizedBox(height: 14),
                    ],
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.rausch,
        foregroundColor: AppColors.white,
        elevation: 3,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New Code',
            style: TextStyle(fontWeight: FontWeight.w600)),
        onPressed: () =>
            _showDiscountSheet(context, api, userId, onRefresh),
      ),
    );
  }
}

class _DiscountChip extends StatelessWidget {
  const _DiscountChip(
      {required this.icon, required this.label, this.color});
  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: (color ?? AppColors.foggy).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 11, color: color ?? AppColors.foggy),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 11,
                    color: color ?? AppColors.foggy,
                    fontWeight: FontWeight.w500)),
          ],
        ),
      );
}

void _showDiscountSheet(
  BuildContext ctx,
  AppDatabase api,
  String userId,
  VoidCallback onRefresh,
) {
  final codeCtrl = TextEditingController();
  final descCtrl = TextEditingController();
  final valueCtrl = TextEditingController();
  final maxUsesCtrl = TextEditingController();
  String discountType = 'percentage';
  String currency = 'RWF';
  String appliesTo = 'all';
  DateTime? validUntil;

  showModalBottomSheet(
    context: ctx,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetCtx) => StatefulBuilder(
      builder: (sCtx, setSt) {
        return AnimatedPadding(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
          ),
          child: Container(
            decoration: const BoxDecoration(
              color: AppColors.white,
              borderRadius:
                  BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
                  // Header
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color:
                              AppColors.rausch.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.local_offer_rounded,
                            color: AppColors.rausch, size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('New Discount Code',
                              style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 17,
                                  color: AppColors.black)),
                          Text('Offer promos to your guests',
                              style: TextStyle(
                                  fontSize: 12, color: AppColors.foggy)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),

                  // ── Code field ─────────────────────────────
                  TextField(
                    controller: codeCtrl,
                    textCapitalization: TextCapitalization.characters,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                        fontSize: 15),
                    decoration: InputDecoration(
                      labelText: 'Promo Code',
                      hintText: 'e.g. SAVE20',
                      prefixIcon: const Icon(Icons.tag_rounded,
                          size: 18, color: AppColors.foggy),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: AppColors.rausch, width: 2),
                      ),
                      filled: true,
                      fillColor: const Color(0xFFFAFAFA),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Description ────────────────────────────
                  TextField(
                    controller: descCtrl,
                    decoration: InputDecoration(
                      labelText: 'Description (optional)',
                      prefixIcon: const Icon(Icons.notes_rounded,
                          size: 18, color: AppColors.foggy),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: AppColors.rausch, width: 2),
                      ),
                      filled: true,
                      fillColor: const Color(0xFFFAFAFA),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Discount type toggle ────────────────────
                  const Text('Discount Type',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.foggy)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2F2F2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        _TypeToggle(
                          label: '% Percentage',
                          selected: discountType == 'percentage',
                          onTap: () =>
                              setSt(() => discountType = 'percentage'),
                        ),
                        _TypeToggle(
                          label: '# Fixed Amount',
                          selected: discountType == 'fixed',
                          onTap: () =>
                              setSt(() => discountType = 'fixed'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Value + Currency row ────────────────────
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 3,
                        child: TextField(
                          controller: valueCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: discountType == 'percentage'
                                ? 'Discount %'
                                : 'Amount',
                            prefixIcon: Icon(
                              discountType == 'percentage'
                                  ? Icons.percent_rounded
                                  : Icons.attach_money_rounded,
                              size: 18,
                              color: AppColors.foggy,
                            ),
                            border: OutlineInputBorder(
                                borderRadius:
                                    BorderRadius.circular(12)),
                            focusedBorder: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                  color: AppColors.rausch, width: 2),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFFAFAFA),
                          ),
                        ),
                      ),
                      if (discountType == 'fixed') ...[
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: DropdownButtonFormField<String>(
                            key: ValueKey('dc_$currency'),
                            value: currency,
                            decoration: InputDecoration(
                              labelText: 'Currency',
                              border: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(12)),
                              focusedBorder: OutlineInputBorder(
                                borderRadius:
                                    BorderRadius.circular(12),
                                borderSide: const BorderSide(
                                    color: AppColors.rausch,
                                    width: 2),
                              ),
                              filled: true,
                              fillColor: const Color(0xFFFAFAFA),
                              contentPadding:
                                  const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 14),
                            ),
                            items: _kCurrencies
                                .map((c) => DropdownMenuItem(
                                    value: c, child: Text(c)))
                                .toList(),
                            onChanged: (v) =>
                                setSt(() => currency = v ?? currency),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),

                  // ── Max uses + Applies to row ───────────────
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: maxUsesCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: 'Max Uses',
                            hintText: '∞ unlimited',
                            prefixIcon: const Icon(
                                Icons.people_outline_rounded,
                                size: 18,
                                color: AppColors.foggy),
                            border: OutlineInputBorder(
                                borderRadius:
                                    BorderRadius.circular(12)),
                            focusedBorder: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                  color: AppColors.rausch, width: 2),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFFAFAFA),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          key: ValueKey('at_$appliesTo'),
                          value: appliesTo,
                          decoration: InputDecoration(
                            labelText: 'Applies To',
                            border: OutlineInputBorder(
                                borderRadius:
                                    BorderRadius.circular(12)),
                            focusedBorder: OutlineInputBorder(
                              borderRadius:
                                  BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                  color: AppColors.rausch, width: 2),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFFAFAFA),
                            contentPadding:
                                const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 14),
                          ),
                          items: _kDiscountAppliesTo
                              .map((a) => DropdownMenuItem(
                                    value: a,
                                    child: Text(
                                        a[0].toUpperCase() +
                                            a.substring(1),
                                        overflow:
                                            TextOverflow.ellipsis),
                                  ))
                              .toList(),
                          onChanged: (v) =>
                              setSt(() => appliesTo = v ?? appliesTo),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // ── Expiry date ─────────────────────────────
                  GestureDetector(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: sheetCtx,
                        initialDate: validUntil ??
                            DateTime.now()
                                .add(const Duration(days: 30)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now()
                            .add(const Duration(days: 365 * 3)),
                        builder: (ctx, child) => Theme(
                          data: Theme.of(ctx).copyWith(
                            colorScheme: const ColorScheme.light(
                                primary: _kRed),
                          ),
                          child: child!,
                        ),
                      );
                      if (picked != null) setSt(() => validUntil = picked);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAFAFA),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: validUntil != null
                              ? AppColors.rausch.withValues(alpha: 0.4)
                              : Colors.grey.shade300,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.event_rounded,
                              size: 18,
                              color: validUntil != null
                                  ? AppColors.rausch
                                  : AppColors.foggy),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                const Text('Expiry Date',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.foggy)),
                                Text(
                                  validUntil != null
                                      ? DateFormat('d MMM yyyy')
                                          .format(validUntil!)
                                      : 'No expiry — tap to set',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: validUntil != null
                                        ? AppColors.black
                                        : AppColors.foggy,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (validUntil != null)
                            GestureDetector(
                              onTap: () => setSt(() => validUntil = null),
                              child: const Icon(Icons.close_rounded,
                                  size: 18, color: AppColors.foggy),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Create button ───────────────────────────
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.rausch,
                        foregroundColor: AppColors.white,
                        padding:
                            const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () async {
                        await api.createDiscount(
                          userId: userId,
                          code: codeCtrl.text.trim().toUpperCase(),
                          discountType: discountType,
                          discountValue:
                              double.tryParse(valueCtrl.text.trim()) ??
                                  0,
                          maxUses:
                              int.tryParse(maxUsesCtrl.text.trim()),
                          description:
                              descCtrl.text.trim().isNotEmpty
                                  ? descCtrl.text.trim()
                                  : null,
                          currency: currency,
                          minimumAmount: 0,
                          validUntil: validUntil != null
                              ? DateFormat('yyyy-MM-dd')
                                  .format(validUntil!)
                              : null,
                          appliesTo: appliesTo,
                        );
                        if (sheetCtx.mounted) Navigator.pop(sheetCtx);
                        onRefresh();
                      },
                      child: const Text('Create Code',
                          style: TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    ),
  );
}

class _TypeToggle extends StatelessWidget {
  const _TypeToggle(
      {required this.label,
      required this.selected,
      required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: selected ? AppColors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color:
                            Colors.black.withValues(alpha: 0.08),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      )
                    ]
                  : null,
            ),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: selected
                    ? FontWeight.w700
                    : FontWeight.w400,
                color: selected ? AppColors.rausch : AppColors.foggy,
              ),
            ),
          ),
        ),
      );
}

// ===================== FINANCIAL =====================
class _FinancialTab extends StatelessWidget {
  const _FinancialTab({
    required this.stats,
    required this.payouts,
    required this.payoutMethods,
    required this.api,
    required this.userId,
    required this.onRefresh,
  });
  final Map<String, dynamic>? stats;
  final List<Map<String, dynamic>> payouts, payoutMethods;
  final AppDatabase api;
  final String userId;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final currency = (stats?['currency'] ?? 'RWF').toString();
    final revenue =
        (stats?['net_earnings'] as num?) ??
        (stats?['total_revenue'] as num?) ??
        0;
    final pending   = (stats?['pending_payout'] as num?) ?? 0;
    final completed = (stats?['completed_payout'] as num?) ?? 0;
    final available = (stats?['available_for_payout'] as num?) ?? 0;
    final totalBookings = (stats?['total_bookings'] as num?)?.toInt() ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Dark hero ─────────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1A3A2F)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Stack(
              children: [
                // Decorative circle
                Positioned(
                  right: -20,
                  top: -20,
                  child: Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF16A34A).withValues(alpha: 0.15),
                    ),
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Net Earnings',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _formatMoney(revenue, currency),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Available for payout progress
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Available for payout',
                          style: TextStyle(
                              fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                        Text(
                          _formatMoney(available, currency),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF86EFAC),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: revenue > 0
                            ? (available / revenue).clamp(0.0, 1.0)
                            : 0,
                        minHeight: 5,
                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                        valueColor: const AlwaysStoppedAnimation<Color>(
                            Color(0xFF16A34A)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // ── 3-metric row ──────────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _metricTile(
                  label: 'Pending',
                  value: _formatMoney(pending, currency),
                  iconColor: const Color(0xFFD97706),
                  bgColor: const Color(0xFFFEF9C3),
                  icon: Icons.schedule_rounded,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _metricTile(
                  label: 'Paid Out',
                  value: _formatMoney(completed, currency),
                  iconColor: const Color(0xFF1D4ED8),
                  bgColor: const Color(0xFFDBEAFE),
                  icon: Icons.check_circle_rounded,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _metricTile(
                  label: 'Bookings',
                  value: '$totalBookings',
                  iconColor: AppColors.rausch,
                  bgColor: AppColors.rausch.withValues(alpha: 0.08),
                  icon: Icons.calendar_today_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ── Request payout ────────────────────────────────────────
          GestureDetector(
            onTap: () => _showRequestPayoutSheet(
              context,
              api,
              userId,
              payoutMethods,
              available.toDouble(),
              currency,
              onRefresh,
            ),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 15),
              decoration: BoxDecoration(
                color: AppColors.rausch,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.send_rounded, size: 16, color: Colors.white),
                  SizedBox(width: 8),
                  Text(
                    'Request Payout',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // ── Payout history ────────────────────────────────────────
          const Text(
            'Payout History',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 10),
          if (payouts.isEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.history_rounded, size: 18, color: AppColors.foggy),
                  SizedBox(width: 10),
                  Text(
                    'No payouts yet.',
                    style: TextStyle(color: AppColors.foggy, fontSize: 13),
                  ),
                ],
              ),
            )
          else
            ...payouts.map((p) => _PayoutRow(payout: p)),
        ],
      ),
    );
  }

  Widget _metricTile({
    required String label,
    required String value,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: iconColor,
            ),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: AppColors.foggy),
          ),
        ],
      ),
    );
  }
}

void _showRequestPayoutSheet(
  BuildContext ctx,
  AppDatabase api,
  String userId,
  List<Map<String, dynamic>> methods,
  double availBalance,
  String currency,
  VoidCallback onRefresh,
) {
  final amountCtrl = TextEditingController(
    text: availBalance.toStringAsFixed(2),
  );
  String? selectedMethodId;
  String? selectedMethodType;

  showModalBottomSheet(
    context: ctx,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetCtx) => StatefulBuilder(
      builder: (sCtx, setSt) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Request Payout',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
              ),
              const SizedBox(height: 16),
              _Field(
                ctrl: amountCtrl,
                label: 'Amount ($currency)',
                inputType: TextInputType.number,
              ),
              if (methods.isNotEmpty)
                DropdownButtonFormField<String>(
                  key: ValueKey(selectedMethodId),
                  initialValue: selectedMethodId,
                  decoration: _inputDecoration('Payout Method'),
                  hint: const Text('Select method'),
                  items: methods
                      .map(
                        (m) => DropdownMenuItem<String>(
                          value: m['id'] as String?,
                          child: Text(
                            m['method_type'] == 'mobile_money'
                                ? 'Mobile Money (${m['mobile_provider'] ?? ''}) - ${m['phone_number'] ?? ''}'
                                : 'Bank (${m['bank_name'] ?? ''}) - ${m['bank_account_number'] ?? ''}',
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setSt(() {
                    selectedMethodId = v;
                    selectedMethodType = methods
                        .firstWhere(
                          (m) => m['id'] == v,
                          orElse: () => {},
                        )['method_type']
                        ?.toString();
                  }),
                )
              else
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'No payout methods added yet. Add one in the Payouts tab.',
                    style: TextStyle(color: Colors.orange, fontSize: 13),
                  ),
                ),
              const SizedBox(height: 16),
              _SaveButton(
                label: 'Submit Request',
                onPressed: methods.isEmpty
                    ? null
                    : () async {
                        await api.requestPayout(
                          userId: userId,
                          amount:
                              double.tryParse(amountCtrl.text.trim()) ??
                              availBalance,
                          currency: currency,
                          payoutMethodId: selectedMethodId,
                          payoutMethodType: selectedMethodType,
                        );
                        if (sheetCtx.mounted) Navigator.pop(sheetCtx);
                        onRefresh();
                      },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    ),
  );
}

// ===================== PAYOUT METHODS =====================
class _PayoutMethodsTab extends StatelessWidget {
  const _PayoutMethodsTab({
    required this.api,
    required this.userId,
    required this.methods,
    required this.onRefresh,
  });
  final AppDatabase api;
  final String userId;
  final List<Map<String, dynamic>> methods;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: methods.isEmpty
          ? const _EmptyState(
              label: 'No payout methods added',
              icon: Icons.account_balance_outlined,
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: methods.length,
              itemBuilder: (ctx, i) {
                final m = methods[i];
                final isPrimary = m['is_primary'] == true;
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: ListTile(
                    leading: Icon(
                      m['method_type'] == 'mobile_money'
                          ? Icons.phone_android
                          : Icons.account_balance,
                      color: AppColors.rausch,
                    ),
                    title: Text(
                      '${m['bank_account_name'] ?? m['nickname'] ?? ''} (${(m['method_type'] as String? ?? '').replaceAll('_', ' ')})',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.black,
                      ),
                    ),
                    subtitle: Text(
                      m['method_type'] == 'mobile_money'
                          ? '${m['mobile_provider'] ?? ''} \u00b7 ${m['phone_number'] ?? ''}'
                          : '${m['bank_name'] ?? ''} \u00b7 ${m['bank_account_number'] ?? ''}',
                      style: const TextStyle(color: AppColors.foggy),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isPrimary)
                          const Icon(
                            Icons.star,
                            color: Color(0xFFFFB400),
                            size: 18,
                          ),
                        if (!isPrimary)
                          TextButton(
                            child: const Text(
                              'Set Primary',
                              style: TextStyle(color: AppColors.black),
                            ),
                            onPressed: () async {
                              await api.setPrimaryPayoutMethod(
                                id: m['id'],
                                userId: userId,
                              );
                              onRefresh();
                            },
                          ),
                        IconButton(
                          icon: const Icon(
                            Icons.delete_outline,
                            color: AppColors.rausch,
                          ),
                          onPressed: () async {
                            await api.deletePayoutMethod(id: m['id']);
                            onRefresh();
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.rausch,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Method'),
        onPressed: () =>
            _showPayoutMethodSheet(context, api, userId, onRefresh),
      ),
    );
  }
}

void _showPayoutMethodSheet(
  BuildContext ctx,
  AppDatabase api,
  String userId,
  VoidCallback onRefresh,
) {
  final nameCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final bankNameCtrl = TextEditingController();
  final bankAcctCtrl = TextEditingController();
  String methodType = 'mobile_money';
  String mobileProvider = 'MTN';

  showModalBottomSheet(
    context: ctx,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetCtx) => StatefulBuilder(
      builder: (sCtx, setSt) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Add Payout Method',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                key: ValueKey('mt_$methodType'),
                initialValue: methodType,
                decoration: _inputDecoration('Method Type'),
                items: const [
                  DropdownMenuItem(
                    value: 'mobile_money',
                    child: Text('Mobile Money'),
                  ),
                  DropdownMenuItem(
                    value: 'bank_transfer',
                    child: Text('Bank Transfer'),
                  ),
                ],
                onChanged: (v) => setSt(() => methodType = v ?? methodType),
              ),
              const SizedBox(height: 12),
              _Field(ctrl: nameCtrl, label: 'Account Holder Name'),
              if (methodType == 'mobile_money') ...[
                DropdownButtonFormField<String>(
                  key: ValueKey('mp_$mobileProvider'),
                  initialValue: mobileProvider,
                  decoration: _inputDecoration('Mobile Provider'),
                  items: _kMobileProviders
                      .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                      .toList(),
                  onChanged: (v) =>
                      setSt(() => mobileProvider = v ?? mobileProvider),
                ),
                const SizedBox(height: 12),
                _Field(
                  ctrl: phoneCtrl,
                  label: 'Phone Number',
                  inputType: TextInputType.phone,
                ),
              ] else ...[
                _Field(ctrl: bankNameCtrl, label: 'Bank Name'),
                _Field(ctrl: bankAcctCtrl, label: 'Bank Account Number'),
              ],
              const SizedBox(height: 16),
              _SaveButton(
                label: 'Save Method',
                onPressed: () async {
                  await api.createPayoutMethod(
                    userId: userId,
                    methodType: methodType,
                    accountName: nameCtrl.text.trim(),
                    phoneNumber: methodType == 'mobile_money'
                        ? phoneCtrl.text.trim()
                        : null,
                    mobileProvider: methodType == 'mobile_money'
                        ? mobileProvider
                        : null,
                    bankName: methodType == 'bank_transfer'
                        ? bankNameCtrl.text.trim()
                        : null,
                    bankAccountNumber: methodType == 'bank_transfer'
                        ? bankAcctCtrl.text.trim()
                        : null,
                  );
                  if (sheetCtx.mounted) Navigator.pop(sheetCtx);
                  onRefresh();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    ),
  );
}

// ===================== SHARED WIDGETS =====================
class _ListingCard extends StatelessWidget {
  const _ListingCard({
    required this.item,
    required this.onToggle,
    required this.onEdit,
    required this.onDelete,
    this.priceLabel = 'per night',
    this.priceField = 'price_per_night',
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
    final title = (item['title'] ?? '—').toString();
    final location = (item['location'] ?? '').toString();
    final priceNum = item[priceField];
    final currency = (item['currency'] ?? 'USD').toString();
    final priceText = priceNum != null
        ? '$currency ${(priceNum as num).toStringAsFixed(0)} / $priceLabel'
        : null;
    final ratingValue = double.tryParse(
        (item['rating'] ?? item['average_rating'] ?? '').toString());
    final showRating = ratingValue != null && ratingValue > 0;
    final rating = ratingValue == null
        ? ''
        : (ratingValue % 1 == 0
            ? ratingValue.toStringAsFixed(0)
            : ratingValue.toStringAsFixed(1));

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Image with overlaid badges ──
          AspectRatio(
            aspectRatio: 1.15,
            child: Stack(
              fit: StackFit.expand,
              children: [
                imgUrl != null
                    ? Image.network(
                        imgUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(
                          color: const Color(0xFFF1F5F9),
                          child: const Icon(
                            Icons.home_rounded,
                            size: 36,
                            color: Color(0xFFCBD5E1),
                          ),
                        ),
                      )
                    : Container(
                        color: const Color(0xFFF1F5F9),
                        child: const Icon(
                          Icons.home_rounded,
                          size: 36,
                          color: Color(0xFFCBD5E1),
                        ),
                      ),
                // Bottom gradient
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.45),
                        ],
                        stops: const [0.5, 1.0],
                      ),
                    ),
                  ),
                ),
                // Live / Draft badge — bottom left
                Positioned(
                  left: 8,
                  bottom: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: published
                          ? const Color(0xFF0D9488)
                          : Colors.black.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 5,
                          height: 5,
                          decoration: BoxDecoration(
                            color: published
                                ? const Color(0xFF6EE7B7)
                                : Colors.grey.shade400,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          published ? 'Live' : 'Draft',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Rating — bottom right
                if (showRating)
                  Positioned(
                    right: 8,
                    bottom: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star_rounded,
                              size: 11, color: Color(0xFFFBBF24)),
                          const SizedBox(width: 3),
                          Text(
                            rating,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                // Toggle — top right
                Positioned(
                  top: 6,
                  right: 6,
                  child: GestureDetector(
                    onTap: () => onToggle(!published),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: published
                            ? const Color(0xFF0D9488).withValues(alpha: 0.9)
                            : Colors.black.withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            published
                                ? Icons.visibility_rounded
                                : Icons.visibility_off_rounded,
                            size: 11,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 3),
                          Text(
                            published ? 'ON' : 'OFF',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Info ──────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 9, 10, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppColors.black,
                  ),
                ),
                if (location.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded,
                          size: 10, color: AppColors.foggy),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          location,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.foggy,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                if (priceText != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    priceText,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                      color: AppColors.black,
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                // ── Action row ──
                Row(
                  children: [
                    if (onEdit != null)
                      Expanded(
                        child: GestureDetector(
                          onTap: onEdit,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.edit_rounded,
                                    size: 12, color: AppColors.black),
                                SizedBox(width: 4),
                                Text(
                                  'Edit',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.black,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    if (onEdit != null) const SizedBox(width: 6),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => _confirmDelete(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.rausch.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.delete_rounded,
                                  size: 12, color: AppColors.rausch),
                              SizedBox(width: 4),
                              Text(
                                'Delete',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.rausch,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    final title = (item['title'] ?? 'this listing').toString();
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF1C1C1E)
                  : Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // handle
                Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                // icon
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.rausch.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.delete_outline_rounded,
                    color: AppColors.rausch,
                    size: 26,
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Delete listing?',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '"$title" will be permanently removed\nand cannot be recovered.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.foggy,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 22),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      Navigator.pop(sheetCtx);
                      onDelete();
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.rausch,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      textStyle: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    child: const Text('Delete'),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(sheetCtx),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.black,
                      side: const BorderSide(color: AppColors.border),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      textStyle: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _IconTextBtn extends StatelessWidget {
  const _IconTextBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onPressed,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Padding(
        padding: const EdgeInsets.only(top: 2, right: 10),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 3),
            Text(label,
                style: TextStyle(
                    fontSize: 11,
                    color: color,
                    fontWeight: FontWeight.w600,
                    decoration: TextDecoration.underline)),
          ],
        ),
      ),
    );
  }
}

String _formatMoney(num amount, String currency) {
  final needsDecimals = currency != 'RWF' && amount % 1 != 0;
  return '$currency ${needsDecimals ? amount.toStringAsFixed(2) : amount.toStringAsFixed(0)}';
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });
  final String title, value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 20,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: const TextStyle(color: AppColors.foggy, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  Color get _c {
    switch (status) {
      case 'confirmed':
        return Colors.green;
      case 'pending':
        return Colors.amber;
      case 'completed':
        return Colors.blue;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: _c.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(
      status[0].toUpperCase() + status.substring(1),
      style: TextStyle(color: _c, fontSize: 11, fontWeight: FontWeight.w600),
    ),
  );
}

class _BookingSummaryRow extends StatelessWidget {
  const _BookingSummaryRow({required this.booking});
  final Map<String, dynamic> booking;

  @override
  Widget build(BuildContext context) {
    final status = booking['status'] as String? ?? 'pending';
    final amount = (booking['total_amount'] ?? booking['total_price']) as num?;
    final currency = (booking['currency'] ?? 'RWF').toString();
    final checkIn = (booking['check_in'] ?? '').toString();
    final shortDate =
        checkIn.length >= 10 ? checkIn.substring(5, 10) : checkIn;
    final guestName =
        (booking['guest_name'] ?? booking['user_name'] ?? '?').toString();
    final initial = guestName.isNotEmpty ? guestName[0].toUpperCase() : '?';
    final bookingType = (booking['booking_type'] ?? '').toString();

    Color statusBg, statusFg;
    switch (status) {
      case 'confirmed':
        statusBg = const Color(0xFFDCFCE7);
        statusFg = const Color(0xFF16A34A);
        break;
      case 'completed':
        statusBg = const Color(0xFFDBEAFE);
        statusFg = const Color(0xFF1D4ED8);
        break;
      case 'cancelled':
        statusBg = const Color(0xFFFFE4E6);
        statusFg = AppColors.rausch;
        break;
      default:
        statusBg = const Color(0xFFFEF9C3);
        statusFg = const Color(0xFF854D0E);
    }

    // Category colour for avatar
    Color avatarColor;
    switch (bookingType) {
      case 'tour':
        avatarColor = const Color(0xFF7C3AED);
        break;
      case 'transport':
        avatarColor = const Color(0xFF0369A1);
        break;
      default:
        avatarColor = AppColors.rausch;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          // Guest avatar
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: avatarColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: avatarColor,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (booking['listing_title'] ?? booking['item_title'] ?? '—')
                      .toString(),
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppColors.black,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 1),
                Row(
                  children: [
                    Text(
                      guestName,
                      style: const TextStyle(
                          color: AppColors.foggy, fontSize: 11),
                    ),
                    if (shortDate.isNotEmpty) ...[
                      const Text(' · ',
                          style: TextStyle(
                              color: AppColors.foggy, fontSize: 11)),
                      Text(
                        shortDate,
                        style: const TextStyle(
                            color: AppColors.foggy, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (amount != null)
                Text(
                  _formatMoney(amount, currency),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                    color: AppColors.black,
                  ),
                ),
              const SizedBox(height: 3),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${status[0].toUpperCase()}${status.substring(1)}',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: statusFg,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
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
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.send, size: 18, color: AppColors.rausch),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$currency ${amount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: AppColors.black,
                  ),
                ),
                if (payout['created_at'] != null)
                  Text(
                    payout['created_at'].toString().substring(0, 10),
                    style: const TextStyle(
                      color: AppColors.foggy,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
          _StatusChip(status: status),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.label, required this.icon});
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 56, color: AppColors.hackberry),
        const SizedBox(height: 16),
        Text(
          label,
          style: const TextStyle(color: AppColors.foggy, fontSize: 16),
          textAlign: TextAlign.center,
        ),
      ],
    ),
  );
}

class _SaveButton extends StatelessWidget {
  const _SaveButton({required this.label, required this.onPressed});
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.rausch,
        foregroundColor: AppColors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      onPressed: onPressed,
      child: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
      ),
    ),
  );
}

// ── Helpers ──
Widget _sectionTitle(String text) => Text(
  text,
  style: const TextStyle(
    fontWeight: FontWeight.w800,
    fontSize: 18,
    color: AppColors.black,
  ),
);

Widget _countRow(String label, int value, VoidCallback dec, VoidCallback inc) =>
    Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
          IconButton(
            icon: const Icon(Icons.remove_circle_outline, size: 20),
            onPressed: dec,
            visualDensity: VisualDensity.compact,
          ),
          SizedBox(
            width: 32,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline, size: 20),
            onPressed: inc,
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );

InputDecoration _inputDecoration(String label) => InputDecoration(
  labelText: label,
  labelStyle: const TextStyle(color: AppColors.foggy),
  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(8),
    borderSide: const BorderSide(color: AppColors.black, width: 2),
  ),
  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
);

class _Field extends StatelessWidget {
  const _Field({
    required this.ctrl,
    required this.label,
    this.inputType = TextInputType.text,
    this.maxLines = 1,
  });
  final TextEditingController ctrl;
  final String label;
  final TextInputType inputType;
  final int maxLines;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextField(
      controller: ctrl,
      keyboardType: inputType,
      maxLines: maxLines,
      textCapitalization: TextCapitalization.sentences,
      decoration: _inputDecoration(label),
    ),
  );
}

class _DraftNotice extends StatelessWidget {
  const _DraftNotice({required this.message, required this.onClear});

  final String message;
  final Future<void> Function() onClear;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(bottom: 4),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: const Color(0xFFF4EFE7),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: const Color(0xFFE6D6BF)),
    ),
    child: Row(
      children: [
        const Icon(Icons.save_outlined, size: 18, color: AppColors.rausch),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            message,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.black,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        TextButton(onPressed: onClear, child: const Text('Discard')),
      ],
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Thumbnail strip
        if (totalHasImages)
          SizedBox(
            height: 90,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                // Existing (already-uploaded) thumbnails
                ...existingUrls.asMap().entries.map(
                  (e) => _Thumb(
                    child: Image.network(
                      e.value,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          const Icon(Icons.broken_image_outlined),
                    ),
                    onRemove: () => onRemoveExisting(e.key),
                  ),
                ),
                // Newly picked (not yet uploaded) thumbnails
                ...newFiles.asMap().entries.map(
                  (e) => _Thumb(
                    onRemove: () => onRemoveNew(e.key),
                    badge: const Icon(
                      Icons.upload_outlined,
                      size: 12,
                      color: Colors.white,
                    ),
                    child: Image.file(
                      File(e.value.path),
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Container(
                        color: Colors.grey.shade200,
                        child: const Icon(
                          Icons.image_outlined,
                          color: Colors.grey,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        if (totalHasImages) const SizedBox(height: 8),
        // Add buttons
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            OutlinedButton.icon(
              onPressed: onAddFromGallery,
              icon: const Icon(Icons.photo_library_outlined, size: 18),
              label: const Text('Gallery', style: TextStyle(fontSize: 13)),
              style: OutlinedButton.styleFrom(
                foregroundColor: _kRed,
                side: const BorderSide(color: _kRed),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
            ),
            OutlinedButton.icon(
              onPressed: onAddFromCamera,
              icon: const Icon(Icons.camera_alt_outlined, size: 18),
              label: const Text('Camera', style: TextStyle(fontSize: 13)),
              style: OutlinedButton.styleFrom(
                foregroundColor: _kRed,
                side: const BorderSide(color: _kRed),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
            ),
            if (totalHasImages)
              Text(
                '${existingUrls.length + newFiles.length} photo${existingUrls.length + newFiles.length == 1 ? '' : 's'}',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
          ],
        ),
      ],
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.child, required this.onRemove, this.badge});
  final Widget child;
  final VoidCallback onRemove;
  final Widget? badge;

  @override
  Widget build(BuildContext context) => Container(
    width: 80,
    height: 80,
    margin: const EdgeInsets.only(right: 8),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(8),
      color: Colors.grey.shade100,
    ),
    child: Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(borderRadius: BorderRadius.circular(8), child: child),
        if (badge != null)
          Positioned(
            bottom: 4,
            left: 4,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: AppColors.foggy,
                borderRadius: BorderRadius.circular(4),
              ),
              child: badge,
            ),
          ),
        Positioned(
          top: 2,
          right: 2,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              width: 20,
              height: 20,
              decoration: const BoxDecoration(
                color: AppColors.foggy,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.close,
                size: 14,
                color: AppColors.surface,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
