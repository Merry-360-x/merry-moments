import 'package:flutter/material.dart';

import '../../app.dart';

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
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 0,
        leading: const BackButton(color: AppColors.black),
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _search(),
          decoration: const InputDecoration(
            hintText: 'Search stays, tours, transport…',
            border: InputBorder.none,
            hintStyle: TextStyle(color: AppColors.hackberry, fontSize: 15),
          ),
          style: const TextStyle(fontSize: 15, color: AppColors.black),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: AppColors.rausch),
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
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.rausch));
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
        const Icon(Icons.search, size: 52, color: AppColors.hackberry),
        const SizedBox(height: 16),
        Text(text, style: const TextStyle(color: AppColors.foggy, fontSize: 14)),
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
      color: AppColors.white,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
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
                    color: active ? AppColors.rausch : const Color(0xFFF2F2F5),
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
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFEBEBEB)),
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
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black)),
                    if (location.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(location, maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
                    ],
                    if (price != null) ...[
                      const SizedBox(height: 4),
                      Text('$currency ${price.toString()}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.rausch)),
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
      _ => ('Stay', AppColors.rausch),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
      child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
    );
  }
}
