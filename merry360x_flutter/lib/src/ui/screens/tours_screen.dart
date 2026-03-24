import 'package:flutter/material.dart';

import '../../services/mobile_api.dart';
import '../../session_controller.dart';
import 'explore_screen.dart' show resolveListingImageUrl;
import 'property_details_screen.dart';

class ToursScreen extends StatefulWidget {
  const ToursScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<ToursScreen> createState() => _ToursScreenState();
}

class _ToursScreenState extends State<ToursScreen> {
  final _api = MobileApi();
  String _category = 'all';
  List<Map<String, dynamic>> _tours = [];
  bool _loading = true;

  static const _cats = [
    ('all', 'All'),
    ('nature', 'Nature'),
    ('adventure', 'Adventure'),
    ('cultural', 'Cultural'),
    ('wildlife', 'Wildlife'),
    ('historical', 'Historical'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final t = await _api.fetchTours(category: _category == 'all' ? null : _category);
    if (mounted) setState(() { _tours = t; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Color(0xFF1A1A2E)),
        title: const Text('Tours & Experiences',
            style: TextStyle(color: Color(0xFF1A1A2E), fontWeight: FontWeight.w700, fontSize: 17)),
        centerTitle: false,
      ),
      body: Column(
        children: [
          _CategoryChips(cats: _cats, selected: _category, onSelect: (c) {
            setState(() => _category = c);
            _load();
          }),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFFE2555A)));
    if (_tours.isEmpty) return const Center(
      child: Text('No tours available', style: TextStyle(color: Color(0xFF8A8A99))),
    );
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.75,
      ),
      itemCount: _tours.length,
      itemBuilder: (_, i) => _TourCard(item: _tours[i], session: widget.session),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({required this.cats, required this.selected, required this.onSelect});
  final List<(String, String)> cats;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        child: Row(
          children: cats.map((c) {
            final active = c.$1 == selected;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => onSelect(c.$1),
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
    );
  }
}

class _TourCard extends StatelessWidget {
  const _TourCard({required this.item, required this.session});
  final Map<String, dynamic> item;
  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final title = (item['title'] ?? '').toString();
    final location = (item['location'] ?? '').toString();
    final price = item['price_per_person'];
    final currency = (item['currency'] ?? 'USD').toString();
    final duration = item['duration_days'];
    final imgUrl = resolveListingImageUrl(item);

    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => PropertyDetailsScreen(item: item, session: session),
      )),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                child: (imgUrl != null && imgUrl.isNotEmpty)
                    ? Image.network(imgUrl, fit: BoxFit.cover, width: double.infinity,
                        errorBuilder: (_, __, ___) => _imgPlaceholder())
                    : _imgPlaceholder(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF1A1A2E))),
                  if (location.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Row(children: [
                        const Icon(Icons.location_on_outlined, size: 11, color: Color(0xFF8A8A99)),
                        const SizedBox(width: 2),
                        Expanded(child: Text(location, maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF8A8A99)))),
                      ]),
                    ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(price != null ? '$currency $price/pp' : '',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFE2555A))),
                      if (duration != null)
                        Text('${duration}d', style: const TextStyle(fontSize: 11, color: Color(0xFF8A8A99))),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imgPlaceholder() => Container(
    color: const Color(0xFFEEF0F5),
    child: const Center(child: Icon(Icons.landscape_outlined, color: Color(0xFFCCCCD8), size: 32)),
  );
}
