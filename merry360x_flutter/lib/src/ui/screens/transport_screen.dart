import 'package:flutter/material.dart';

import '../../app.dart';

import '../../services/app_database.dart';
import '../../session_controller.dart';
import 'property_details_screen.dart';

class TransportScreen extends StatefulWidget {
  const TransportScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<TransportScreen> createState() => _TransportScreenState();
}

class _TransportScreenState extends State<TransportScreen> {
  final _api = AppDatabase();
  String _category = 'all';
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  final _searchCtrl = TextEditingController();

  static const _cats = [
    ('all', 'All'),
    ('car', 'Cars'),
    ('van', 'Vans & Buses'),
    ('motorcycle', 'Motorbikes'),
    ('boat', 'Boats'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final t = await _api.fetchTransportListings(category: _category == 'all' ? null : _category);
    if (mounted) setState(() { _items = t; _loading = false; });
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _searchCtrl.text.trim().toLowerCase();
    if (q.isEmpty) return _items;
    return _items.where((i) =>
      (i['title'] ?? '').toString().toLowerCase().contains(q) ||
      (i['vehicle_type'] ?? '').toString().toLowerCase().contains(q)
    ).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: AppColors.black),
        title: const Text('Transport & Transfers',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 18)),
        centerTitle: false,
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Search vehicles…',
                prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.foggy),
                filled: true,
                fillColor: AppColors.linnen,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
            child: Row(
              children: _cats.map((c) {
                final active = c.$1 == _category;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () { setState(() => _category = c.$1); _load(); },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: active ? AppColors.rausch : AppColors.linnen,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(c.$2, style: TextStyle(
                        color: active ? Colors.white : AppColors.hof,
                        fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                        fontSize: 13,
                      )),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.rausch));
    final items = _filtered;
    if (items.isEmpty) return const Center(
      child: Text('No vehicles found', style: TextStyle(color: AppColors.foggy)),
    );
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (_, i) => _TransportTile(item: items[i], session: widget.session),
    );
  }
}

class _TransportTile extends StatelessWidget {
  const _TransportTile({required this.item, required this.session});
  final Map<String, dynamic> item;
  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final title = (item['title'] ?? 'Vehicle').toString();
    final type = (item['vehicle_type'] ?? '').toString();
    final price = item['price_per_day'];
    final currency = (item['currency'] ?? 'USD').toString();
    final capacity = item['passenger_capacity'];
    final imgUrl = (item['image_url'] ?? (item['images'] is List ? (item['images'] as List).firstOrNull ?? '' : '')).toString();

    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => PropertyDetailsScreen(item: item, session: session),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(children: [
          ClipRRect(
            borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
            child: imgUrl.isNotEmpty
                ? Image.network(imgUrl, width: 110, height: 100, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _ph())
                : _ph(),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (type.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2196F3).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(type.toUpperCase(), style: const TextStyle(
                      fontSize: 9, color: Color(0xFF2196F3), fontWeight: FontWeight.w700, letterSpacing: 0.5,
                    )),
                  ),
                const SizedBox(height: 6),
                Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.black)),
                const SizedBox(height: 8),
                Row(children: [
                  if (capacity != null) ...[
                    const Icon(Icons.people_alt_outlined, size: 14, color: AppColors.foggy),
                    const SizedBox(width: 4),
                    Text('$capacity seats', style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                    const SizedBox(width: 12),
                  ],
                  if (price != null)
                    Text('$currency $price/day', style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.rausch,
                    )),
                ]),
              ]),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 12),
            child: Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.hackberry),
          ),
        ]),
      ),
    );
  }

  Widget _ph() => Container(width: 110, height: 100, color: AppColors.linnen,
      child: const Center(child: Icon(Icons.directions_car_outlined, color: AppColors.hackberry, size: 32)));
}
