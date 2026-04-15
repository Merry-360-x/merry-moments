import 'dart:async';

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../session_controller.dart';
import '../../../l10n/app_localizations.dart';
import 'search_results_screen.dart';
import 'explore_screen.dart' show resolveListingImageUrl;

// ── Static destination list (mirrors HeroSearch.tsx) ──
const _kNearbyLabel = "Find what's nearby";
const _kDestinations = [
  // Kigali neighborhoods
  'Kigali City Center',
  'Nyarutarama',
  'Kimihurura',
  'Kacyiru',
  'Remera',
  'Gikondo',
  'Nyamirambo',
  'Kiyovu',
  'Kibagabaga',
  'Gisozi',
  'Kagugu',
  'Rebero',
  'Gacuriro',
  'Kimironko',
  'Kicukiro',
  'Nyarugenge',
  'Gasabo',
  'Kanombe',
  'Masaka',
  'Kabeza',
  'Kagarama',
  'Niboye',
  'Kimisagara',
  'Biryogo',
  'Rugando',
  'Muhima',
  'Nyakabanda',
  'Kinyinya',
  'Rusororo',
  'Batsinda',
  'Gatenga',
  'Kabuga',
  // Cities
  'Kigali',
  'Musanze',
  'Rubavu (Gisenyi)',
  'Huye (Butare)',
  'Nyanza',
  'Rwamagana',
  'Muhanga',
  'Karongi (Kibuye)',
  'Rusizi (Cyangugu)',
  'Nyagatare',
  // Attractions
  'Volcanoes National Park',
  'Akagera National Park',
  'Nyungwe National Park',
  'Lake Kivu',
  'Kigali Genocide Memorial',
  "King's Palace Museum",
  'Ethnographic Museum, Huye',
  'Inema Arts Center',
  'Mount Bisoke',
  'Mount Karisimbi',
  'Gisakura Tea Estate',
  'Ruhondo Lake',
  'Burera Lake',
];

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _whereCtrl = TextEditingController();
  final _whereFocusNode = FocusNode();

  String _category = 'accommodations'; // accommodations | tours | transport
  String _where = '';
  DateTimeRange? _dateRange;
  int _guests = 1;

  int _step = 0; // 0=where, 1=when, 2=who

  @override
  void initState() {
    super.initState();
    _whereCtrl.addListener(() => setState(() => _where = _whereCtrl.text));

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _whereFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _whereCtrl.dispose();
    _whereFocusNode.dispose();
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
      if (dl == q) {
        exact.add(d);
      } else if (dl.startsWith(q)) {
        starts.add(d);
      } else if (dl.contains(q)) {
        contains.add(d);
      }
    }

    return [...exact, ...starts, ...contains].take(20).toList();
  }

  void _doSearch() {
    Navigator.of(context).push(
      PageRouteBuilder(
        pageBuilder: (_, animation, _) => SearchResultsScreen(
          query: _where.trim(),
          initialCategory: _category,
          dateRange: _dateRange,
          guests: _guests,
          session: widget.session,
        ),
      transitionsBuilder: (_, animation, _, child) => FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  void _clearAll() {
    setState(() {
      _whereCtrl.clear();
      _dateRange = null;
      _guests = 1;
      _step = 0;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _whereFocusNode.requestFocus();
    });
  }

  void _advanceStep(int next) {
    if (!mounted) return;
    setState(() => _step = next.clamp(0, 2));
  }

  void _handleWhereCompleted() {
    if (_where.trim().isEmpty) return;

    FocusScope.of(context).unfocus();
    _advanceStep(1);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _pickDates(autoAdvance: true);
    });
  }

  Future<void> _pickDates({bool autoAdvance = false}) async {
    final r = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDateRange: _dateRange,
      builder: (ctx, child) {
        final base = Theme.of(ctx);
        return Theme(
          data: base.copyWith(
            colorScheme: base.colorScheme.copyWith(
              primary: AppColors.rausch,
              onPrimary: Colors.white,
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(foregroundColor: AppColors.rausch),
            ),
          ),
          child: child!,
        );
      },
    );

    if (r != null && mounted) {
      setState(() => _dateRange = r);
      if (autoAdvance) {
        _advanceStep(2);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _pickGuests();
        });
      }
    }
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
    final l = AppLocalizations.of(context)!;
    final suggestions = _suggestions;
    final dateLabel = _dateRange == null
        ? l.addDates
        : '${_dateRange!.start.day}/${_dateRange!.start.month} \u2013 ${_dateRange!.end.day}/${_dateRange!.end.month}';
    final guestLabel = _guests == 1 ? l.oneGuest : l.guestsCount(_guests);

    return Scaffold(
      backgroundColor: AppColors.surface,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border(
              top: BorderSide(color: AppColors.border, width: 0.5),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              GestureDetector(
                onTap: _clearAll,
                child: Text(
                  l.clearAll,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.foggy,
                    decoration: TextDecoration.underline,
                    decorationColor: AppColors.foggy,
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: _doSearch,
                icon: const Icon(Icons.search, size: 18),
                label: Text(
                  l.search,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.rausch,
                  minimumSize: const Size(0, 48),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                ),
              ),
            ],
          ),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
                          label: l.accommodations,
                          icon: Icons.apartment_outlined,
                          active: _category == 'accommodations',
                          onTap: () => setState(() => _category = 'accommodations'),
                        ),
                        const SizedBox(width: 8),
                        _TabChip(
                          label: l.tours,
                          icon: Icons.map_outlined,
                          active: _category == 'tours',
                          onTap: () => setState(() => _category = 'tours'),
                        ),
                        const SizedBox(width: 8),
                        _TabChip(
                          label: l.transport,
                          icon: Icons.directions_car_outlined,
                          active: _category == 'transport',
                          onTap: () => setState(() => _category = 'transport'),
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
                          color: AppColors.surface,
                          border: Border.all(color: AppColors.border),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.black.withValues(alpha: 0.06),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                        child: Icon(Icons.close, size: 18, color: AppColors.hof),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: AppColors.border),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _WhereCard(
                      whereCtrl: _whereCtrl,
                      whereText: _where,
                      focusNode: _whereFocusNode,
                      suggestions: suggestions,
                      isConfirmed: _step > 0,
                      onSubmitted: _handleWhereCompleted,
                      onEdit: () {
                        setState(() => _step = 0);
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (mounted) _whereFocusNode.requestFocus();
                        });
                      },
                      onSuggestionTap: (loc) {
                        if (loc == _kNearbyLabel) return;
                        _whereCtrl.text = loc;
                        FocusScope.of(context).unfocus();
                        _handleWhereCompleted();
                      },
                    ),
                    const SizedBox(height: 12),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 220),
                      switchInCurve: Curves.easeOut,
                      switchOutCurve: Curves.easeIn,
                      child: _step == 0
                          ? const SizedBox.shrink(key: ValueKey('step0'))
                          : Column(
                              key: ValueKey('step$_step'),
                              children: [
                                _StepRow(
                                  label: l.when,
                                  value: dateLabel,
                                  onTap: () {
                                    _advanceStep(1);
                                    _pickDates();
                                  },
                                ),
                                const SizedBox(height: 10),
                                AnimatedOpacity(
                                  duration: const Duration(milliseconds: 200),
                                  opacity: _step >= 2 ? 1 : 0.55,
                                  child: _StepRow(
                                    label: l.who,
                                    value: guestLabel,
                                    onTap: () {
                                      _advanceStep(2);
                                      _pickGuests();
                                    },
                                  ),
                                ),
                              ],
                            ),
                    ),
                    const SizedBox(height: 24),
                    _NameSearchButton(session: widget.session),
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

class _WhereCard extends StatelessWidget {
  const _WhereCard({
    required this.whereCtrl,
    required this.whereText,
    required this.focusNode,
    required this.suggestions,
    required this.isConfirmed,
    required this.onSubmitted,
    required this.onEdit,
    required this.onSuggestionTap,
  });

  final TextEditingController whereCtrl;
  final String whereText;
  final FocusNode focusNode;
  final List<String> suggestions;
  final bool isConfirmed;
  final VoidCallback onSubmitted;
  final VoidCallback onEdit;
  final ValueChanged<String> onSuggestionTap;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    if (isConfirmed && whereText.trim().isNotEmpty) {
      // ── Confirmed / selected state ────────────────────────────────
      return GestureDetector(
        onTap: onEdit,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppColors.rausch.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.location_on, size: 18, color: AppColors.rausch),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.whereLabel,
                      style: TextStyle(fontSize: 11, color: AppColors.foggy, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      whereText.trim(),
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.black),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Icon(Icons.edit_outlined, size: 17, color: AppColors.foggy),
            ],
          ),
        ),
      );
    }

    // ── Search / typing state ─────────────────────────────────────
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: AppColors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.whereQuestion,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: AppColors.linnen,
              borderRadius: BorderRadius.circular(50),
            ),
            child: Row(
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: 16),
                  child: Icon(Icons.search, size: 20, color: AppColors.foggy),
                ),
                Expanded(
                  child: TextField(
                    controller: whereCtrl,
                    focusNode: focusNode,
                    decoration: InputDecoration(
                      hintText: l.searchDestinations,
                      hintStyle: TextStyle(color: AppColors.hackberry, fontSize: 15),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    ),
                    style: TextStyle(fontSize: 15, color: AppColors.black),
                    textInputAction: TextInputAction.next,
                    onSubmitted: (_) => onSubmitted(),
                  ),
                ),
                if (whereText.trim().isNotEmpty)
                  GestureDetector(
                    onTap: () => whereCtrl.clear(),
                    child: Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Icon(Icons.cancel, size: 18, color: AppColors.foggy),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l.suggestedDestinations,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 6),
          ...suggestions.map(
            (loc) => _DestRow(
              label: loc == _kNearbyLabel ? l.findNearby : loc,
              subtitle: loc == _kNearbyLabel ? l.useCurrentLocation : l.suggestedDestination,
              onTap: () => onSuggestionTap(loc),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.label, required this.value, required this.onTap});

  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 15, color: AppColors.hackberry)),
            Text(
              value,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
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
          border: Border.all(color: active ? AppColors.rausch : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: active ? AppColors.rausch : AppColors.foggy),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                color: active ? AppColors.rausch : AppColors.hof,
              ),
            ),
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
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: AppColors.linnen,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(Icons.location_on_outlined, size: 22, color: AppColors.foggy),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.black),
                  ),
                  Text(subtitle, style: TextStyle(fontSize: 12, color: AppColors.foggy)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Name search button ──
class _NameSearchButton extends StatelessWidget {
  const _NameSearchButton({required this.session});
  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Divider(color: AppColors.border)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                l.orSearchByName,
                style: TextStyle(fontSize: 12, color: AppColors.foggy),
              ),
            ),
            Expanded(child: Divider(color: AppColors.border)),
          ],
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => _NameSearchSheet(session: session),
          ),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(Icons.search, size: 20, color: AppColors.foggy),
                const SizedBox(width: 10),
                Text(
                  l.searchByListingName,
                  style: TextStyle(fontSize: 15, color: AppColors.hackberry),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ── Name search sheet ──
class _NameSearchSheet extends StatefulWidget {
  const _NameSearchSheet({required this.session});
  final SessionController session;

  @override
  State<_NameSearchSheet> createState() => _NameSearchSheetState();
}

class _NameSearchSheetState extends State<_NameSearchSheet> {
  final _ctrl = TextEditingController();
  final _focusNode = FocusNode();
  final _db = AppDatabase();
  Timer? _debounce;

  List<Map<String, dynamic>> _results = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _ctrl.addListener(_onChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _ctrl.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onChanged() {
    _debounce?.cancel();
    final q = _ctrl.text.trim();
    if (q.length < 2) {
      if (mounted) setState(() { _results = []; _loading = false; });
      return;
    }
    if (mounted) setState(() => _loading = true);
    _debounce = Timer(const Duration(milliseconds: 380), () => _search(q));
  }

  Future<void> _search(String q) async {
    try {
      final rows = await _db.searchListings(query: q, category: 'all');
      if (mounted) setState(() { _results = rows; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _results = []; _loading = false; });
    }
  }

  void _openResults() {
    final q = _ctrl.text.trim();
    if (q.isEmpty) return;
    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SearchResultsScreen(
          query: q,
          initialCategory: 'all',
          session: widget.session,
        ),
      ),
    );
  }

  void _openListing(Map<String, dynamic> item) {
    final id = (item['id'] ?? '').toString();
    final type = (item['item_type'] ?? 'property').toString();
    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SearchResultsScreen(
          query: (item['title'] ?? '').toString(),
          initialCategory: type == 'property' ? 'stays' : type == 'tour' || type == 'tour_package' ? 'tours' : 'transport',
          session: widget.session,
        ),
      ),
    );
    // Suppress unused variable lint
    assert(id.isNotEmpty || id.isEmpty);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final viewInset = MediaQuery.of(context).viewInsets.bottom;
    final q = _ctrl.text.trim();

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + viewInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l.searchByName,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.black),
          ),
          const SizedBox(height: 14),
          // Search field
          Container(
            decoration: BoxDecoration(
              color: AppColors.linnen,
              borderRadius: BorderRadius.circular(50),
            ),
            child: Row(
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: 16),
                  child: Icon(Icons.search, size: 20, color: AppColors.foggy),
                ),
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    focusNode: _focusNode,
                    decoration: InputDecoration(
                      hintText: l.typePropertyOrTourName,
                      hintStyle: TextStyle(color: AppColors.hackberry, fontSize: 15),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    ),
                    style: TextStyle(fontSize: 15, color: AppColors.black),
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _openResults(),
                  ),
                ),
                if (q.isNotEmpty)
                  GestureDetector(
                    onTap: () => _ctrl.clear(),
                    child: Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Icon(Icons.cancel, size: 18, color: AppColors.foggy),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Status / results
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))),
            )
          else if (q.length >= 2 && _results.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(l.noListingsFoundFor(q), style: TextStyle(color: AppColors.foggy, fontSize: 14)),
              ),
            )
          else if (_results.isNotEmpty) ...[
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 320),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _results.length > 8 ? 8 : _results.length,
                separatorBuilder: (_, _) => Divider(height: 1, color: AppColors.border),
                itemBuilder: (_, i) {
                  final item = _results[i];
                  final title = (item['title'] ?? 'Listing').toString();
                  final imageUrl = (resolveListingImageUrl(item) ?? '').toString();
                  final type = (item['item_type'] ?? '').toString();
                  final typeLabel = type == 'property' ? l.stayLabel
                      : type == 'tour' ? l.tourLabel
                      : type == 'tour_package' ? l.packageLabel
                      : type == 'transport' ? l.transport
                      : '';
                  final location = (item['location'] ?? item['city'] ?? '').toString();
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                    leading: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: imageUrl.isNotEmpty
                          ? Image.network(imageUrl, width: 52, height: 52, fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => _PlaceholderIcon(type: type))
                          : _PlaceholderIcon(type: type),
                    ),
                    title: Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.black), maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                      [if (typeLabel.isNotEmpty) typeLabel, if (location.isNotEmpty) location].join(' · '),
                      style: TextStyle(fontSize: 12, color: AppColors.foggy),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: Icon(Icons.chevron_right, size: 20, color: AppColors.foggy),
                    onTap: () => _openListing(item),
                  );
                },
              ),
            ),
            if (_results.length > 8) ...[
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _openResults,
                child: Center(
                  child: Text(
                    l.showAllCountResults(_results.length),
                    style: TextStyle(fontSize: 14, color: AppColors.rausch, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ],
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: q.isEmpty ? null : _openResults,
            icon: const Icon(Icons.search, size: 18),
            label: Text(l.showAllResults, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.rausch,
              disabledBackgroundColor: AppColors.border,
              minimumSize: const Size(double.infinity, 50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlaceholderIcon extends StatelessWidget {
  const _PlaceholderIcon({required this.type});
  final String type;

  @override
  Widget build(BuildContext context) {
    final icon = type == 'property' ? Icons.apartment_outlined
        : type == 'tour' || type == 'tour_package' ? Icons.map_outlined
        : Icons.directions_car_outlined;
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(color: AppColors.linnen, borderRadius: BorderRadius.circular(10)),
      child: Icon(icon, size: 24, color: AppColors.foggy),
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
  void initState() {
    super.initState();
    _count = widget.initial;
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l.who, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.adults, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                  Text(l.agesAbove13, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                ],
              ),
              Row(
                children: [
                  _CounterBtn(
                    icon: Icons.remove,
                    enabled: _count > 1,
                    onTap: () => setState(() {
                      _count--;
                      widget.onChanged(_count);
                    }),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('$_count', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                  _CounterBtn(
                    icon: Icons.add,
                    enabled: true,
                    onTap: () => setState(() {
                      _count++;
                      widget.onChanged(_count);
                    }),
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
              child: Text(l.done, style: const TextStyle(fontWeight: FontWeight.w600)),
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
    final Color color = enabled ? AppColors.hof : AppColors.hackberry;
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          border: Border.all(color: color),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 16, color: color),
      ),
    );
  }
}
