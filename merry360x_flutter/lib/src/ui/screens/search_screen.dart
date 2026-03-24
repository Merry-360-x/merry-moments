import 'package:flutter/material.dart';

import '../../services/mobile_api.dart';
import '../../session_controller.dart';
import 'explore_screen.dart' show resolveListingImageUrl;
import 'property_details_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _api = MobileApi();
  final _ctrl = TextEditingController();
  String _category = 'all';
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;
  bool _searched = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _ctrl.text.trim();
    if (q.isEmpty) return;
    setState(() { _loading = true; _searched = true; });
    try {
      final r = await _api.searchListings(query: q, category: _category);
      if (mounted) setState(() => _results = r);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 0,
        leading: const BackButton(color: Color(0xFF1A1A2E)),
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _search(),
          decoration: const InputDecoration(
            hintText: 'Search stays, tours, transport…',
            border: InputBorder.none,
            hintStyle: TextStyle(color: Color(0xFFB0B0BC), fontSize: 15),
          ),
          style: const TextStyle(fontSize: 15, color: Color(0xFF1A1A2E)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Color(0xFFE2555A)),
            onPressed: _search,
          ),
        ],
      ),
      body: Column(
        children: [
          _CategoryBar(selected: _category, onSelect: (c) {
            setState(() => _category = c);
            if (_searched) _search();
          }),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFFE2555A)));
    if (!_searched) return _emptyPrompt('Search for stays, tours & transport');
    if (_results.isEmpty) return _emptyPrompt('No results for "${_ctrl.text}"');
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _results.length,
      itemBuilder: (_, i) => _ResultTile(item: _results[i], session: widget.session),
    );
  }

  Widget _emptyPrompt(String text) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.search, size: 48, color: Color(0xFFD0D0D8)),
        const SizedBox(height: 12),
        Text(text, style: const TextStyle(color: Color(0xFF8A8A99), fontSize: 14)),
      ],
    ),
  );
}

class _CategoryBar extends StatelessWidget {
  const _CategoryBar({required this.selected, required this.onSelect});
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    const cats = [('all', 'All'), ('stays', 'Stays'), ('tours', 'Tours'), ('transport', 'Transport')];
    return Container(
      color: Colors.white,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
        child: Row(
          children: cats.map((c) {
            final active = c.$1 == selected;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => onSelect(c.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
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

class _ResultTile extends StatelessWidget {
  const _ResultTile({required this.item, required this.session});
  final Map<String, dynamic> item;
  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final type = (item['item_type'] ?? 'property').toString();
    final title = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final location = (item['location'] ?? '').toString();
    final imgUrl = resolveListingImageUrl(item);
    final priceKey = type == 'property' ? 'price_per_night' : type == 'tour' ? 'price_per_person' : 'price_per_day';
    final price = item[priceKey];
    final currency = (item['currency'] ?? 'USD').toString();

    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => PropertyDetailsScreen(item: item, session: session),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(14)),
              child: (imgUrl != null && imgUrl.isNotEmpty)
                  ? Image.network(imgUrl, width: 90, height: 80, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholder())
                  : _placeholder(),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _TypePill(type: type),
                    const SizedBox(height: 4),
                    Text(title, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF1A1A2E))),
                    if (location.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(location, maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11, color: Color(0xFF8A8A99))),
                    ],
                    if (price != null) ...[
                      const SizedBox(height: 4),
                      Text('$currency ${price.toString()}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFE2555A))),
                    ],
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Icon(Icons.chevron_right, color: Color(0xFFD0D0D8), size: 20),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() => Container(width: 90, height: 80, color: const Color(0xFFF0F0F5),
      child: const Icon(Icons.image_not_supported_outlined, color: Color(0xFFD0D0D8)));
}

class _TypePill extends StatelessWidget {
  const _TypePill({required this.type});
  final String type;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (type) {
      'tour' => ('Tour', const Color(0xFF4CAF50)),
      'tour_package' => ('Package', const Color(0xFF9C27B0)),
      'transport' => ('Transport', const Color(0xFF2196F3)),
      _ => ('Stay', const Color(0xFFE2555A)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
      child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
    );
  }
}
