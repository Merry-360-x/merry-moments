import 'package:flutter/material.dart';

import '../../services/mobile_api.dart';
import '../../session_controller.dart';
import 'property_details_screen.dart';

class TransportScreen extends StatefulWidget {
  const TransportScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<TransportScreen> createState() => _TransportScreenState();
}

class _TransportScreenState extends State<TransportScreen> {
  final _api = MobileApi();
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
      backgroundColor: const Color(0xFFF8F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Color(0xFF1A1A2E)),
        title: const Text('Transport & Transfers',
            style: TextStyle(color: Color(0xFF1A1A2E), fontWeight: FontWeight.w700, fontSize: 17)),
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
                prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF8A8A99)),
                filled: true,
                fillColor: const Color(0xFFF2F2F5),
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
                        color: active ? const Color(0xFFE2555A) : const Color(0xFFF2F2F5),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(c.$2, style: TextStyle(
                        color: active ? Colors.white : const Color(0xFF5A5A6B),
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
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFFE2555A)));
    final items = _filtered;
    if (items.isEmpty) return const Center(
      child: Text('No vehicles found', style: TextStyle(color: Color(0xFF8A8A99))),
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
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 3))],
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
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1A1A2E))),
                const SizedBox(height: 8),
                Row(children: [
                  if (capacity != null) ...[
                    const Icon(Icons.people_alt_outlined, size: 14, color: Color(0xFF8A8A99)),
                    const SizedBox(width: 4),
                    Text('$capacity seats', style: const TextStyle(fontSize: 12, color: Color(0xFF8A8A99))),
                    const SizedBox(width: 12),
                  ],
                  if (price != null)
                    Text('$currency $price/day', style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFE2555A),
                    )),
                ]),
              ]),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 12),
            child: Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFFD0D0D8)),
          ),
        ]),
      ),
    );
  }

  Widget _ph() => Container(width: 110, height: 100, color: const Color(0xFFEEF0F5),
      child: const Center(child: Icon(Icons.directions_car_outlined, color: Color(0xFFCCCCD8), size: 32)));
}
