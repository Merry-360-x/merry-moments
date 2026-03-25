import 'package:flutter/material.dart';

import '../../app.dart';
import '../../session_controller.dart';
import 'search_results_screen.dart';

// ── Static destination list (mirrors HeroSearch.tsx) ──
const _kNearbyLabel = "Find what's nearby";
const _kDestinations = [
  // Kigali neighborhoods
  'Kigali City Center', 'Nyarutarama', 'Kimihurura', 'Kacyiru', 'Remera',
  'Gikondo', 'Nyamirambo', 'Kiyovu', 'Kibagabaga', 'Gisozi', 'Kagugu',
  'Rebero', 'Gacuriro', 'Kimironko', 'Kicukiro', 'Nyarugenge', 'Gasabo',
  'Kanombe', 'Masaka', 'Kabeza', 'Kagarama', 'Niboye', 'Kimisagara',
  'Biryogo', 'Rugando', 'Muhima', 'Nyakabanda', 'Kinyinya', 'Rusororo',
  'Batsinda', 'Gatenga', 'Kabuga',
  // Cities
  'Kigali', 'Musanze', 'Rubavu (Gisenyi)', 'Huye (Butare)', 'Nyanza',
  'Rwamagana', 'Muhanga', 'Karongi (Kibuye)', 'Rusizi (Cyangugu)', 'Nyagatare',
  // Attractions
  'Volcanoes National Park', 'Akagera National Park', 'Nyungwe National Park',
  'Lake Kivu', 'Kigali Genocide Memorial', "King's Palace Museum",
  'Ethnographic Museum, Huye', 'Inema Arts Center', 'Mount Bisoke',
  'Mount Karisimbi', 'Gisakura Tea Estate', 'Ruhondo Lake', 'Burera Lake',
];

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _whereCtrl = TextEditingController();
  String _category = 'accommodations'; // accommodations | tours | transport
  String _where = '';
  DateTimeRange? _dateRange;
  int _guests = 1;


  @override
  void initState() {
    super.initState();
    _whereCtrl.addListener(() => setState(() => _where = _whereCtrl.text));
  }

  @override
  void dispose() {
    _whereCtrl.dispose();
    super.dispose();
  }

  List<String> get _suggestions {
    final q = _where.trim().toLowerCase();
    if (q.isEmpty) return [_kNearbyLabel, ..._kDestinations.take(15)];
    final exact = <String>[];
    final starts = <String>[];
    final contains = <String>[];
    for (final d in _kDestinations) {
      final dl = d.toLowerCase();
      if (dl == q) exact.add(d);
      else if (dl.startsWith(q)) starts.add(d);
      else if (dl.contains(q)) contains.add(d);
    }
    return [...exact, ...starts, ...contains].take(20).toList();
  }

  String get _dateLabel {
    if (_dateRange == null) return 'Add dates';
    final d = _dateRange!;
    return '${d.start.day}/${d.start.month} – ${d.end.day}/${d.end.month}';
  }

  String get _guestLabel => _guests == 1 ? '1 guest' : '$_guests guests';

  void _doSearch() {
    Navigator.of(context).push(
      PageRouteBuilder(
        pageBuilder: (_, animation, __) => SearchResultsScreen(
          query: _where.trim(),
          initialCategory: _category,
          dateRange: _dateRange,
          guests: _guests,
          session: widget.session,
        ),
        transitionDuration: const Duration(milliseconds: 260),
        transitionsBuilder: (_, animation, __, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  void _clearAll() => setState(() {
    _whereCtrl.clear();
    _dateRange = null;
    _guests = 1;
  });

  Future<void> _pickDates() async {
    final r = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDateRange: _dateRange,
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppColors.rausch, onPrimary: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (r != null && mounted) setState(() => _dateRange = r);
  }

  Future<void> _pickGuests() async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _GuestSheet(
        initial: _guests,
        onChanged: (n) => setState(() => _guests = n),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final suggestions = _suggestions;
    return Scaffold(
      backgroundColor: Colors.white,
      // ── Pinned footer ──────────────────────────────────────────────
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(color: Color(0xFFEBEBEB), width: 0.5),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              GestureDetector(
                onTap: _clearAll,
                child: const Text(
                  'Clear all',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF555555),
                    decoration: TextDecoration.underline,
                    decorationColor: Color(0xFF555555),
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: _doSearch,
                icon: const Icon(Icons.search, size: 18),
                label: const Text(
                  'Search',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.rausch,
                  minimumSize: const Size(0, 48),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 14,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(50),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      // ── Body ────────────────────────────────────────────────────────
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // -- Tab row with X button -----------------------------------
            SizedBox(
              height: 52,
              child: Stack(
                children: [
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(12, 8, 56, 8),
                    child: Row(
                      children: [
                        _TabChip(
                          label: 'Accommodations',
                          icon: Icons.apartment_outlined,
                          active: _category == 'accommodations',
                          onTap: () =>
                              setState(() => _category = 'accommodations'),
                        ),
                        const SizedBox(width: 8),
                        _TabChip(
                          label: 'Tours',
                          icon: Icons.map_outlined,
                          active: _category == 'tours',
                          onTap: () => setState(() => _category = 'tours'),
                        ),
                        const SizedBox(width: 8),
                        _TabChip(
                          label: 'Transport',
                          icon: Icons.directions_car_outlined,
                          active: _category == 'transport',
                          onTap: () =>
                              setState(() => _category = 'transport'),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    right: 12,
                    top: 8,
                    child: GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFDDDDDD)),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.06),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.close,
                          size: 18,
                          color: Color(0xFF444444),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFFEEEEEE)),
            // -- Scrollable content ---------------------------------------
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Where? card
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE0E0E0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 12,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Where?',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFFF7F7F7),
                              borderRadius: BorderRadius.circular(50),
                              border:
                                  Border.all(color: const Color(0xFFE0E0E0)),
                            ),
                            child: Row(
                              children: [
                                const Padding(
                                  padding: EdgeInsets.only(left: 16),
                                  child: Icon(
                                    Icons.search,
                                    size: 20,
                                    color: Color(0xFF999999),
                                  ),
                                ),
                                Expanded(
                                  child: TextField(
                                    controller: _whereCtrl,
                                    autofocus: false,
                                    decoration: const InputDecoration(
                                      hintText: 'Search destinations',
                                      hintStyle: TextStyle(
                                        color: Color(0xFF999999),
                                        fontSize: 15,
                                      ),
                                      border: InputBorder.none,
                                      contentPadding:
                                          EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 14,
                                      ),
                                    ),
                                    style: const TextStyle(
                                      fontSize: 15,
                                      color: Color(0xFF1A1A1A),
                                    ),
                                    textInputAction: TextInputAction.search,
                                    onSubmitted: (_) => _doSearch(),
                                  ),
                                ),
                                if (_where.isNotEmpty)
                                  GestureDetector(
                                    onTap: () => _whereCtrl.clear(),
                                    child: const Padding(
                                      padding: EdgeInsets.only(right: 12),
                                      child: Icon(
                                        Icons.cancel,
                                        size: 18,
                                        color: Color(0xFF999999),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Suggested destinations',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                          const SizedBox(height: 6),
                          ...suggestions.map(
                            (loc) => _DestRow(
                              label: loc,
                              subtitle: loc == _kNearbyLabel
                                  ? 'Use your current location'
                                  : 'Suggested destination',
                              onTap: () {
                                if (loc != _kNearbyLabel) {
                                  _whereCtrl.text = loc;
                                  FocusScope.of(context).unfocus();
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    // When row
                    GestureDetector(
                      onTap: _pickDates,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 18,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'When',
                              style: TextStyle(
                                fontSize: 15,
                                color: Color(0xFF999999),
                              ),
                            ),
                            Text(
                              _dateLabel,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Who row
                    GestureDetector(
                      onTap: _pickGuests,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 18,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Who',
                              style: TextStyle(
                                fontSize: 15,
                                color: Color(0xFF999999),
                              ),
                            ),
                            Text(
                              _guestLabel,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Tab chip ──
class _TabChip extends StatelessWidget {
  const _TabChip({required this.label, required this.icon, required this.active, required this.onTap});
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: active ? AppColors.rausch.withValues(alpha: 0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(50),
          border: Border.all(color: active ? AppColors.rausch : const Color(0xFFDDDDDD)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: active ? AppColors.rausch : const Color(0xFF555555)),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(
              fontSize: 13,
              fontWeight: active ? FontWeight.w600 : FontWeight.w400,
              color: active ? AppColors.rausch : const Color(0xFF444444),
            )),
          ],
        ),
      ),
    );
  }
}

// ── Destination row ──
class _DestRow extends StatelessWidget {
  const _DestRow({required this.label, required this.subtitle, required this.onTap});
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          children: [
            Container(
              width: 46, height: 46,
              decoration: BoxDecoration(
                color: const Color(0xFFF2F2F2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.location_on_outlined, size: 22, color: Color(0xFF666666)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1A1A1A))),
                  Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF999999))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Guest picker sheet ──
class _GuestSheet extends StatefulWidget {
  const _GuestSheet({required this.initial, required this.onChanged});
  final int initial;
  final ValueChanged<int> onChanged;

  @override
  State<_GuestSheet> createState() => _GuestSheetState();
}

class _GuestSheetState extends State<_GuestSheet> {
  late int _count;

  @override
  void initState() { super.initState(); _count = widget.initial; }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Who', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Adults', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                  Text('Ages 13 or above', style: TextStyle(fontSize: 12, color: Color(0xFF999999))),
                ],
              ),
              Row(
                children: [
                  _CounterBtn(
                    icon: Icons.remove,
                    enabled: _count > 1,
                    onTap: () => setState(() { _count--; widget.onChanged(_count); }),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('$_count', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                  _CounterBtn(
                    icon: Icons.add,
                    enabled: true,
                    onTap: () => setState(() { _count++; widget.onChanged(_count); }),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.pop(context),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.rausch,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}

class _CounterBtn extends StatelessWidget {
  const _CounterBtn({required this.icon, required this.enabled, required this.onTap});
  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = enabled ? const Color(0xFF444444) : const Color(0xFFCCCCCC);
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        width: 32, height: 32,
        decoration: BoxDecoration(
          border: Border.all(color: color),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 16, color: color),
      ),
    );
  }
}

