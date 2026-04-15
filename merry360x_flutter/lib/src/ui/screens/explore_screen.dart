import 'dart:async';
import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter/services.dart';
import 'package:merry360x_flutter/src/lib/promo_prefill.dart';
import 'package:video_player/video_player.dart';

import '../../../l10n/app_localizations.dart';
import '../../app.dart';
import '../utils/app_snackbar.dart';
import '../../session_controller.dart';
import 'property_details_screen.dart';
import 'search_screen.dart';
import 'stories_screen.dart';
import 'tours_screen.dart';
import 'transport_screen.dart';

// ── Image URL resolver (shared) ──

String? resolveListingImageUrl(Map<String, dynamic> item) {
  String? firstImage(dynamic value) {
    if (value is List) {
      for (final v in value) {
        // v may be a plain URL string or a map like {"url": "..."}
        if (v is Map) {
          final url = (v['url'] ?? v['uri'] ?? v['src'] ?? '')?.toString().trim() ?? '';
          if (url.isNotEmpty) return url;
        }
        final t = v?.toString().trim() ?? '';
        if (t.isNotEmpty) return t;
      }
      return null;
    }
    final t = value?.toString().trim() ?? '';
    if (t.isEmpty) return null;
    // Handle JSON-encoded arrays stored as text (e.g. '["https://..."]')
    if (t.startsWith('[')) {
      try {
        final decoded = jsonDecode(t);
        if (decoded is List) return firstImage(decoded);
      } catch (_) {}
    }
    return t;
  }

  final raw = firstImage(item['images']) ??
      firstImage(item['main_image']) ??
      firstImage(item['image']) ??
      firstImage(item['photos']);
  if (raw == null) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('//')) return 'https:$raw';
  if (raw.startsWith('res.cloudinary.com/')) return 'https://$raw';
  // Preserve source aspect ratio to avoid unexpected zoom/crop artifacts on cards.
  return 'https://res.cloudinary.com/dghg9uebh/image/upload/f_auto,q_auto:eco,dpr_auto,c_limit,w_1200/$raw';
}

// ── Price label helper ──

String _priceLabel(Map<String, dynamic> item, AppLocalizations l, SessionController session) {
  final itemCurrency = (item['currency'] ?? 'USD').toString();
  final type = (item['item_type'] ?? 'property').toString();

  double amount;
  String unit;

  switch (type) {
    case 'tour':
      amount = double.tryParse('${item['price_per_person'] ?? 0}') ?? 0;
      unit = l.personSuffix;
    case 'tour_package':
      amount = double.tryParse('${item['price_per_adult'] ?? 0}') ?? 0;
      unit = l.personSuffix;
    case 'transport':
      amount = double.tryParse('${item['price_per_day'] ?? 0}') ?? 0;
      unit = l.daySuffix;
    default:
      amount = double.tryParse('${item['price_per_night'] ?? 0}') ?? 0;
      unit = l.nightSuffix;
  }

  return '${session.formatPrice(amount, itemCurrency: itemCurrency)} $unit';
}

String _itemSubtitle(Map<String, dynamic> item, AppLocalizations l) {
  final type = (item['item_type'] ?? 'property').toString();
  final location = (item['location'] ?? item['city'] ?? '').toString();

  switch (type) {
    case 'tour':
      return location.isEmpty ? l.tourLabel : l.tourInLocation(location);
    case 'tour_package':
      return location.isEmpty ? l.tourPackageLabel : l.tourPackageInLocation(location);
    case 'transport':
      final vehicle = (item['vehicle_type'] ?? '').toString();
      return vehicle.isEmpty ? l.transport : vehicle;
    default:
      return location.isEmpty ? l.stayLabel : location;
  }
}

String _titleCaseWords(String raw) {
  final collapsed = raw.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (collapsed.isEmpty) return '';
  return collapsed
      .split(' ')
      .where((w) => w.isNotEmpty)
      .map((word) {
        final lower = word.toLowerCase();
        if (lower.length == 1) return lower.toUpperCase();
        return '${lower[0].toUpperCase()}${lower.substring(1)}';
      })
      .join(' ');
}

String? _knownCityLabel(String raw) {
  final lower = raw.toLowerCase();

  // Kigali neighborhoods - keep as separate sections
  if (lower.contains('kimihurura') || lower.contains('kimihura')) return 'Kimihurura';
  if (lower.contains('gishushu')) return 'Gishushu';
  if (lower.contains('remera')) return 'Remera';
  if (lower.contains('nyarutarama')) return 'Nyarutarama';
  if (lower.contains('kacyiru')) return 'Kacyiru';
  if (lower.contains('gikondo')) return 'Gikondo';
  if (lower.contains('kabeza')) return 'Kabeza';
  if (lower.contains('kanombe')) return 'Kanombe';
  if (lower.contains('kibagabaga')) return 'Kibagabaga';
  if (lower.contains('kagugu')) return 'Kagugu';
  if (lower.contains('rugando')) return 'Rugando';
  if (lower.contains('kisenyi') || lower.contains('kisseni') || lower.contains('kiseni')) return 'Kisenyi';
  if (lower.contains('nyamirambo')) return 'Nyamirambo';
  if (lower.contains('gisozi')) return 'Gisozi';
  if (lower.contains('kinyinya')) return 'Kinyinya';
  if (lower.contains('gatsata')) return 'Gatsata';
  if (lower.contains('muhima')) return 'Muhima';
  if (lower.contains('biryogo')) return 'Biryogo';
  if (lower.contains('nyabugogo')) return 'Nyabugogo';
  if (lower.contains('gasabo')) return 'Gasabo';
  if (lower.contains('nyarugenge')) return 'Nyarugenge';
  if (lower.contains('kicukiro')) return 'Kicukiro';
  // Fallback for generic "Kigali" only - try to use a non-street location part as sub-area
  if (lower.contains('kigali')) return null; // Let _extractCityLabel handle it with more context

  // Other Rwanda cities
  if (lower.contains('musanze')) return 'Musanze';
  if (lower.contains('huye') || lower.contains('butare')) return 'Huye';
  if (lower.contains('rubav') || lower.contains('gisenyi')) return 'Rubavu';
  if (lower.contains('rusizi') || lower.contains('cyangugu')) return 'Rusizi';
  if (lower.contains('karongi') || lower.contains('kibuye')) return 'Karongi';
  if (lower.contains('nyagatare')) return 'Nyagatare';
  if (lower.contains('nyanza')) return 'Nyanza';
  if (lower.contains('rwamagana')) return 'Rwamagana';
  if (lower.contains('muhanga') || lower.contains('gitarama')) return 'Muhanga';
  if (lower.contains('nyamasheke')) return 'Nyamasheke';
  if (lower.contains('kayonza')) return 'Kayonza';
  if (lower.contains('gatsibo')) return 'Gatsibo';
  if (lower.contains('ngoma')) return 'Ngoma';
  if (lower.contains('bugesera')) return 'Bugesera';

  return null;
}

bool _looksLikeStreetAddress(String raw) {
  final lower = raw.toLowerCase();
  if (RegExp(r'\d').hasMatch(lower)) return true;
  return RegExp(r'\b(street|st\.?|road|rd\.?|avenue|ave\.?|kg|plot|house|apt|apartment|cell|sector|block)\b')
      .hasMatch(lower);
}

String _extractCityLabel(Map<String, dynamic> item) {
  final cityRaw = (item['city'] ?? '').toString().trim();
  final locationRaw = (item['location'] ?? '').toString().trim();
  final locationParts = locationRaw
      .split(',')
      .map((part) => part.trim())
      .where((part) => part.isNotEmpty)
      .toList();

  final candidates = <String>[
    if (cityRaw.isNotEmpty) cityRaw,
    ...locationParts,
  ];

  // First pass: try to get a specific known city/neighborhood label
  for (final candidate in candidates) {
    final known = _knownCityLabel(candidate);
    if (known != null) return known;
  }

  // Second pass: check if this is a generic Kigali address.
  // Try to find a non-street, non-Kigali part to use as the sub-area label.
  final isKigali = candidates.any((c) => c.toLowerCase().contains('kigali'));
  if (isKigali) {
    for (final candidate in candidates) {
      final lower = candidate.toLowerCase();
      if (lower.contains('kigali')) continue;
      if (_looksLikeStreetAddress(candidate)) continue;
      final clean = _titleCaseWords(candidate);
      if (clean.isNotEmpty) return clean;
    }
    // No useful sub-area found; use "Kigali City" to keep it out of "Rwanda" bucket
    return 'Kigali City';
  }

  for (final candidate in candidates) {
    if (_looksLikeStreetAddress(candidate)) continue;
    final clean = _titleCaseWords(candidate);
    if (clean.isNotEmpty) return clean;
  }

  return 'Rwanda';
}

// ══════════════════════════════════════════════════════════════════════
// ExploreScreen
// ══════════════════════════════════════════════════════════════════════

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> with WidgetsBindingObserver {
  bool _startupSheetsQueued = false;
  bool _startupSheetsInProgress = false;
  DateTime? _lastStartupSheetsAt;

  final _precachedUrls = <String>{};
  int _lastPrecachedItemCount = 0;

  void _precacheListingImages(BuildContext context, List<Map<String, dynamic>> items) {
    if (items.length <= _lastPrecachedItemCount) return;
    _lastPrecachedItemCount = items.length;
    for (final item in items) {
      final url = resolveListingImageUrl(item);
      if (url != null && _precachedUrls.add(url)) {
        precacheImage(CachedNetworkImageProvider(url), context);
      }
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _queueStartupBottomSheets();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _queueStartupBottomSheets(force: true);
    }
  }

  void _queueStartupBottomSheets({bool force = false}) {
    if (_startupSheetsInProgress) return;
    if (!force && _startupSheetsQueued) return;

    if (force) {
      final now = DateTime.now();
      final lastRun = _lastStartupSheetsAt;
      if (lastRun != null && now.difference(lastRun) < const Duration(seconds: 2)) {
        return;
      }
    }

    _startupSheetsQueued = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _startupSheetsInProgress) return;
      _showStartupBottomSheetsInSeries();
    });
  }

  Future<void> _showStartupBottomSheetsInSeries() async {
    if (_startupSheetsInProgress) return;

    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    if (isTablet) return;

    _startupSheetsInProgress = true;
    _lastStartupSheetsAt = DateTime.now();

    try {
      await showModalBottomSheet<void>(
        context: context,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _ExploreMomoBottomSheet(isTablet: isTablet),
      );

      if (!mounted) return;

      await showModalBottomSheet<void>(
        context: context,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _ExplorePromoBottomSheet(isTablet: isTablet),
      );
    } finally {
      _startupSheetsInProgress = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final l = AppLocalizations.of(context)!;
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final searchSurface = isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF5F5F7);
    final searchIconColor = isDark ? const Color(0xFFA8B0BF) : const Color(0xFF808089);
    final searchTitleColor = isDark ? const Color(0xFFEFF3FA) : const Color(0xFF3A3A42);
    final searchMetaColor = isDark ? const Color(0xFF98A2B3) : const Color(0xFF8A8A94);

    final gridColumns = isTablet ? 3 : 2;
    final gridAspect = isTablet ? 0.85 : 0.76;

    final payload = session.payload;
    final all = payload?.homeListings ?? const <Map<String, dynamic>>[];
    final stories = payload?.stories ?? const <Map<String, dynamic>>[];
    final hasStoriesStrip = session.isAuthenticated || stories.isNotEmpty;

    _precacheListingImages(context, all);

    final properties = all.where((i) => i['item_type'] == 'property').toList();
    final tours = all.where((i) => i['item_type'] == 'tour' || i['item_type'] == 'tour_package').toList();
    final transport = all.where((i) => i['item_type'] == 'transport').toList();

    final propertySections = <String, List<Map<String, dynamic>>>{};
    for (final item in properties) {
      final city = _extractCityLabel(item);
      propertySections.putIfAbsent(city, () => <Map<String, dynamic>>[]).add(item);
    }
    final sortedPropertySections = propertySections.entries.toList()
      ..sort((a, b) => b.value.length.compareTo(a.value.length));

    final hPad = isTablet ? 28.0 : 16.0;

    return RefreshIndicator(
      onRefresh: session.refresh,
      child: CustomScrollView(
        slivers: [
          // Search bar with padding
          SliverPadding(
            padding: EdgeInsets.fromLTRB(hPad, isTablet ? 20 : 14, hPad, isTablet ? 16 : 12),
            sliver: SliverToBoxAdapter(
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.push(
                        context,
                        PageRouteBuilder(
                          pageBuilder: (_, animation, _) => SearchScreen(session: session),
                          transitionDuration: const Duration(milliseconds: 380),
                          reverseTransitionDuration: const Duration(milliseconds: 300),
                          transitionsBuilder: (_, animation, _, child) {
                            final curved = CurvedAnimation(
                              parent: animation,
                              curve: Curves.easeOutCubic,
                              reverseCurve: Curves.easeInCubic,
                            );
                            return SlideTransition(
                              position: Tween<Offset>(
                                begin: const Offset(0, 1),
                                end: Offset.zero,
                              ).animate(curved),
                              child: child,
                            );
                          },
                        ),
                      ),
                      child: Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: isTablet ? 18 : 14,
                          vertical: isTablet ? 12 : 8,
                        ),
                        decoration: BoxDecoration(
                          color: searchSurface,
                          borderRadius: BorderRadius.circular(isTablet ? 28 : 24),
                          border: Border.all(
                            color: isDark ? const Color(0xFF38383A) : const Color(0xFFE0E0E0),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.search, size: isTablet ? 26 : 18, color: searchIconColor),
                            SizedBox(width: isTablet ? 12 : 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    l.searchStaysToursTransport,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: isTablet ? 22 : 15,
                                      color: searchTitleColor,
                                    ),
                                  ),
                                  SizedBox(height: isTablet ? 2 : 1),
                                  Text(
                                    l.anywhereAnyWeek,
                                    style: TextStyle(
                                      fontSize: isTablet ? 15 : 12,
                                      color: searchMetaColor,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: isTablet ? 10 : 8),
                  GestureDetector(
                    onTap: () {
                      // TODO: Navigate to notifications
                    },
                    child: Container(
                      width: isTablet ? 48 : 40,
                      height: isTablet ? 48 : 40,
                      decoration: BoxDecoration(
                        color: searchSurface,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isDark ? const Color(0xFF38383A) : const Color(0xFFE0E0E0),
                          width: 1,
                        ),
                      ),
                      child: Icon(
                        Icons.notifications_outlined,
                        size: isTablet ? 24 : 20,
                        color: searchIconColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Hero video full width (no padding)
          SliverToBoxAdapter(
            child: _HeroVideoSection(isTablet: isTablet, l: l, fullWidth: true),
          ),
          // Rest of content with padding
          SliverPadding(
            padding: EdgeInsets.fromLTRB(hPad, isTablet ? 16 : 12, hPad, isTablet ? 24 : 16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (hasStoriesStrip) ...[
                  SizedBox(
                    height: isTablet ? 96 : 82,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: (session.isAuthenticated ? 1 : 0) + stories.length,
                      separatorBuilder: (_, _) => SizedBox(width: isTablet ? 14 : 10),
                      itemBuilder: (_, i) {
                        if (session.isAuthenticated && i == 0) {
                          final profile = session.payload?.profile ?? const <String, dynamic>{};
                          final myAvatar = (profile['avatar_url'] ?? profile['photo_url'] ?? profile['image'] ?? '')
                              .toString();
                          return _StoryItem(
                            isTablet: isTablet,
                            text: l.yourStoryLabel,
                            imageUrl: myAvatar,
                            showAddBadge: true,
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => StoriesScreen(session: session)),
                              );
                            },
                          );
                        }

                        final index = session.isAuthenticated ? i - 1 : i;
                        if (index < 0 || index >= stories.length) {
                          return const SizedBox.shrink();
                        }
                        final story = stories[index];
                        return _StoryItem(
                          isTablet: isTablet,
                          text: (story['username'] ?? 'story').toString(),
                          imageUrl: (story['media_url'] ?? story['avatar_url'] ?? '').toString(),
                          onTap: () {
                            final storyId = (story['id'] ?? '').toString();
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => StoriesScreen(
                                  session: session,
                                  initialStoryId: storyId.isEmpty ? null : storyId,
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                  SizedBox(height: isTablet ? 16 : 12),
                ],
                _CategoryChips(isTablet: isTablet, session: session),
                SizedBox(height: isTablet ? 18 : 14),
                if (session.loading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (session.error != null)
                  _ErrorCard(message: session.error!)
                else ...[
                  if (sortedPropertySections.isNotEmpty)
                    _CityStayRail(
                      sections: sortedPropertySections,
                      session: session,
                      isTablet: isTablet,
                      gridColumns: gridColumns,
                      gridAspect: gridAspect,
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.only(top: 20, bottom: 8),
                      child: Center(
                        child: Text(
                          l.noStaysAvailable,
                          style: const TextStyle(color: AppColors.foggy),
                        ),
                      ),
                    ),
                  if (tours.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _SectionHeader(title: l.toursAndExperiences),
                    const SizedBox(height: 8),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: tours.length,
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: gridColumns,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 10,
                        childAspectRatio: gridAspect,
                      ),
                      itemBuilder: (context, index) {
                        return ListingCard(item: tours[index], session: session, compact: true);
                      },
                    ),
                  ],
                  if (transport.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _SectionHeader(title: l.transport),
                    const SizedBox(height: 8),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: transport.length,
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: gridColumns,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 10,
                        childAspectRatio: gridAspect,
                      ),
                      itemBuilder: (context, index) {
                        return ListingCard(item: transport[index], session: session, compact: true);
                      },
                    ),
                  ],
                  if (properties.isEmpty && tours.isEmpty && transport.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 40),
                      child: Center(
                        child: Text(
                          l.noListingsYet,
                          style: const TextStyle(color: AppColors.foggy),
                        ),
                      ),
                    ),
                ],
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Hero Video Section ──

class _HeroVideoSection extends StatefulWidget {
  const _HeroVideoSection({required this.isTablet, required this.l, this.fullWidth = false});
  final bool isTablet;
  final AppLocalizations l;
  final bool fullWidth;

  @override
  State<_HeroVideoSection> createState() => _HeroVideoSectionState();
}

class _HeroVideoSectionState extends State<_HeroVideoSection> {
  late VideoPlayerController _controller;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset('assets/hero/merry.mp4')
      ..setLooping(true)
      ..setVolume(0)
      ..initialize().then((_) {
        if (mounted) {
          setState(() => _initialized = true);
          _controller.play();
        }
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final height = widget.isTablet ? 300.0 : 260.0;
    final radius = widget.fullWidth ? 0.0 : (widget.isTablet ? 20.0 : 16.0);
    return ClipRect(
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video or placeholder
            if (_initialized)
              ClipRRect(
                borderRadius: BorderRadius.circular(radius),
                child: FittedBox(
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
                  child: SizedBox(
                    width: _controller.value.size.width,
                    height: _controller.value.size.height,
                    child: VideoPlayer(_controller),
                  ),
                ),
              )
            else
              Container(
                decoration: BoxDecoration(
                  color: Colors.black12,
                  borderRadius: BorderRadius.circular(radius),
                ),
              ),
            // Gradient overlay
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(radius),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.05),
                    Colors.black.withValues(alpha: 0.55),
                  ],
                ),
              ),
            ),
            // Bottom content
            Positioned(
              left: widget.isTablet ? 24 : 16,
              right: widget.isTablet ? 24 : 16,
              bottom: widget.isTablet ? 24 : 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    widget.l.findYourPerfectStay,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: widget.isTablet ? 28 : 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      shadows: [
                        Shadow(
                          blurRadius: 8,
                          color: Colors.black.withValues(alpha: 0.5),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: widget.isTablet ? 6 : 4),
                  Text(
                    widget.l.staysToursTransportEvents,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: widget.isTablet ? 15 : 13,
                      color: Colors.white.withValues(alpha: 0.9),
                      shadows: [
                        Shadow(
                          blurRadius: 6,
                          color: Colors.black.withValues(alpha: 0.4),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: widget.isTablet ? 14 : 10),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: widget.isTablet ? 16 : 12,
                      vertical: widget.isTablet ? 10 : 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(widget.isTablet ? 12 : 10),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.trending_up,
                          size: widget.isTablet ? 18 : 16,
                          color: Colors.white,
                        ),
                        SizedBox(width: widget.isTablet ? 8 : 6),
                        Text(
                          widget.l.referOperatorEarn,
                          style: TextStyle(
                            fontSize: widget.isTablet ? 14 : 12,
                            fontWeight: FontWeight.w500,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StoryItem extends StatelessWidget {
  const _StoryItem({
    required this.isTablet,
    required this.text,
    required this.imageUrl,
    required this.onTap,
    this.showAddBadge = false,
  });

  final bool isTablet;
  final String text;
  final String imageUrl;
  final VoidCallback onTap;
  final bool showAddBadge;

  @override
  Widget build(BuildContext context) {
    final trimmed = text.trim();
    final fallback = trimmed.isEmpty ? 'S' : trimmed.substring(0, 1).toUpperCase();

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: isTablet ? 90 : 82,
        child: Column(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: isTablet ? 78 : 70,
                  height: isTablet ? 78 : 70,
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.rausch, width: 2),
                  ),
                  child: ClipOval(
                    child: imageUrl.trim().isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => _StoryFallback(fallback: fallback),
                          )
                        : _StoryFallback(fallback: fallback),
                  ),
                ),
                if (showAddBadge)
                  Positioned(
                    right: -2,
                    bottom: -2,
                    child: Container(
                      width: isTablet ? 22 : 20,
                      height: isTablet ? 22 : 20,
                      decoration: BoxDecoration(
                        color: AppColors.rausch,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.surface, width: 2),
                      ),
                      child: const Icon(Icons.add, size: 12, color: Colors.white),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
class _StoryFallback extends StatelessWidget {
  const _StoryFallback({required this.fallback});

  final String fallback;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFE8EDF5),
      alignment: Alignment.center,
      child: Text(
        fallback,
        style: const TextStyle(
          fontWeight: FontWeight.w700,
          color: Color(0xFF44506A),
        ),
      ),
    );
  }
}

// ── Payment providers data ─────────────────────────────────────────────────
const _kPayProviders = [
  (label: 'MTN MoMo',     asset: 'assets/payment/mtn-momo.png',    brandColor: Color(0xFFFFCC00)),
  (label: 'Airtel Money', asset: 'assets/payment/airtel-money.svg', brandColor: Color(0xFFE40000)),
  (label: 'M-Pesa',       asset: 'assets/payment/mpesa.png',        brandColor: Color(0xFF60BB46)),
  (label: 'Orange Money', asset: 'assets/payment/orange-money.png', brandColor: Color(0xFFFF6900)),
  (label: 'Vodacom',      asset: '',                                 brandColor: Color(0xFFE60000)),
  (label: 'Moov Money',   asset: 'assets/payment/moov-money.png',   brandColor: Color(0xFF0077C8)),
  (label: 'Halotel',      asset: '',                                 brandColor: Color(0xFFE2001A)),
  (label: 'Zamtel',       asset: 'assets/payment/zamtel.png',       brandColor: Color(0xFF006B3C)),
  (label: 'Free Money',   asset: '',                                 brandColor: Color(0xFFCD2027)),
];

class _ExploreMomoBottomSheet extends StatefulWidget {
  const _ExploreMomoBottomSheet({required this.isTablet});
  final bool isTablet;
  @override
  State<_ExploreMomoBottomSheet> createState() => _ExploreMomoBottomSheetState();
}

class _ExploreMomoBottomSheetState extends State<_ExploreMomoBottomSheet> {
  late final ScrollController _scrollCtrl;
  Timer? _autoScrollTimer;
  bool _userScrolling = false;

  @override
  void initState() {
    super.initState();
    _scrollCtrl = ScrollController();
    // Start auto-scroll after a short delay
    Future.delayed(const Duration(milliseconds: 800), _startAutoScroll);
  }

  void _startAutoScroll() {
    _autoScrollTimer = Timer.periodic(const Duration(milliseconds: 30), (_) {
      if (!mounted || _userScrolling) return;
      if (!_scrollCtrl.hasClients) return;
      final max = _scrollCtrl.position.maxScrollExtent;
      final cur = _scrollCtrl.offset;
      if (cur >= max) {
        _scrollCtrl.jumpTo(0);
      } else {
        _scrollCtrl.jumpTo(cur + 1.2);
      }
    });
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = widget.isTablet;
    final l = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final titleColor = isDark ? Colors.white : const Color(0xFF1A1A1A);
    final subtitleColor = isDark ? const Color(0xFFB0B0B0) : const Color(0xFF666666);
    final handleColor = isDark ? const Color(0xFF48484A) : const Color(0xFFDDDDDD);
    final cardBg = isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF8F8F8);
    final cardBorder = isDark ? const Color(0xFF3A3A3C) : const Color(0xFFE8E8E8);

    return Container(
      margin: EdgeInsets.fromLTRB(isTablet ? 20 : 8, 0, isTablet ? 20 : 8, isTablet ? 20 : 8),
      decoration: BoxDecoration(
        color: sheetBg,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: handleColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Header with close
          Padding(
            padding: EdgeInsets.fromLTRB(isTablet ? 24 : 20, 16, isTablet ? 16 : 12, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    l.payWithMobileMoney,
                    style: TextStyle(
                      fontSize: isTablet ? 24 : 20,
                      fontWeight: FontWeight.w700,
                      color: titleColor,
                      letterSpacing: -0.3,
                    ),
                  ),
                ),
                Material(
                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF0F0F0),
                  borderRadius: BorderRadius.circular(20),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => Navigator.pop(context),
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Icon(
                        Icons.close_rounded,
                        size: 20,
                        color: subtitleColor,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(isTablet ? 24 : 20, 8, isTablet ? 24 : 20, 0),
            child: Text(
              l.momoPromoDesc,
              style: TextStyle(
                fontSize: isTablet ? 15 : 14,
                fontWeight: FontWeight.w500,
                color: subtitleColor,
                height: 1.4,
              ),
            ),
          ),
          SizedBox(height: isTablet ? 20 : 16),
          // Payment providers — auto-scrolling row
          SizedBox(
            height: isTablet ? 110 : 100,
            child: NotificationListener<ScrollNotification>(
              onNotification: (n) {
                if (n is ScrollStartNotification && n.dragDetails != null) {
                  _userScrolling = true;
                } else if (n is ScrollEndNotification) {
                  Future.delayed(const Duration(seconds: 2), () {
                    if (mounted) _userScrolling = false;
                  });
                }
                return false;
              },
              child: ListView(
                controller: _scrollCtrl,
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 20),
                children: [
                  for (final p in _kPayProviders) ...
                    [
                      _MomoProviderCard(
                        label: p.label,
                        logoAssetPath: p.asset,
                        brandColor: p.brandColor,
                        bgColor: cardBg,
                        borderColor: cardBorder,
                        textColor: titleColor,
                      ),
                      const SizedBox(width: 10),
                    ],
                ],
              ),
            ),
          ),
          SizedBox(height: isTablet ? 20 : 16),
          // Continue button
          Padding(
            padding: EdgeInsets.fromLTRB(isTablet ? 24 : 20, 0, isTablet ? 24 : 20, isTablet ? 24 : 20),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(context),
                style: FilledButton.styleFrom(
                  backgroundColor: scheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: EdgeInsets.symmetric(vertical: isTablet ? 16 : 14),
                  elevation: 0,
                ),
                child: Text(
                  l.continueButton,
                  style: TextStyle(
                    fontSize: isTablet ? 17 : 16,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.2,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MomoProviderCard extends StatelessWidget {
  const _MomoProviderCard({
    required this.label,
    required this.logoAssetPath,
    required this.brandColor,
    required this.bgColor,
    required this.borderColor,
    required this.textColor,
  });

  final String label;
  final String logoAssetPath;
  final Color brandColor;
  final Color bgColor;
  final Color borderColor;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    final initial = label.isNotEmpty ? label[0].toUpperCase() : '?';
    Widget logoWidget;
    if (logoAssetPath.isNotEmpty) {
      if (logoAssetPath.endsWith('.svg')) {
        logoWidget = SvgPicture.asset(
          logoAssetPath,
          width: 40,
          height: 40,
          fit: BoxFit.contain,
          placeholderBuilder: (_) => _brandIcon(initial),
        );
      } else {
        logoWidget = Image.asset(
          logoAssetPath,
          width: 40,
          height: 40,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => _brandIcon(initial),
        );
      }
    } else {
      logoWidget = _brandIcon(initial);
    }
    return SizedBox(
      width: 76,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: logoWidget,
          ),
          const SizedBox(height: 7),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: textColor,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _brandIcon(String initial) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: brandColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _ExplorePromoBottomSheet extends StatelessWidget {
  const _ExplorePromoBottomSheet({
    required this.isTablet,
  });

  final bool isTablet;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF6F8FB);
    final titleColor = isDark ? const Color(0xFFF4F6FA) : const Color(0xFF1E2A49);
    final subtitleColor = isDark ? const Color(0xFFBAC4DA) : const Color(0xFF3D4D70);
    final closeColor = isDark ? const Color(0xFFE5E9F2) : const Color(0xFF2C354A);

    return Container(
      margin: EdgeInsets.fromLTRB(isTablet ? 24 : 12, 0, isTablet ? 24 : 12, isTablet ? 20 : 10),
      padding: EdgeInsets.fromLTRB(isTablet ? 24 : 16, isTablet ? 14 : 10, isTablet ? 24 : 16, isTablet ? 18 : 14),
      decoration: BoxDecoration(
        color: sheetBg,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: isDark ? const Color(0xFF2C3550) : const Color(0xFFC6D4EB),
          width: 1.2,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Align(
            alignment: Alignment.topRight,
            child: IconButton(
              icon: const Icon(Icons.close_rounded),
              onPressed: () => Navigator.pop(context),
              color: closeColor,
              splashRadius: 20,
            ),
          ),
          SizedBox(height: isTablet ? 6 : 4),
          Text(
            l.promoCodeBanner,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: isTablet ? 28 : 21,
              fontWeight: FontWeight.w800,
              color: titleColor,
              height: 1.15,
            ),
          ),
          SizedBox(height: isTablet ? 8 : 6),
          Text(
            l.promoCodeBannerDesc,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: isTablet ? 16 : 14,
              fontWeight: FontWeight.w600,
              color: subtitleColor,
              height: 1.25,
            ),
          ),
          SizedBox(height: isTablet ? 16 : 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () async {
                await Clipboard.setData(const ClipboardData(text: kSaveTenPromoCode));
                await setPendingPromoCode(kSaveTenPromoCode);
                if (!context.mounted) return;
                AppSnackBar.success(context, l.promoCodeCopied(kSaveTenPromoCode));
                Navigator.pop(context);
              },
              style: FilledButton.styleFrom(
                backgroundColor: scheme.primary,
                foregroundColor: scheme.onPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                padding: EdgeInsets.symmetric(vertical: isTablet ? 16 : 14),
              ),
              child: Text(
                l.copyCode,
                style: TextStyle(
                  fontSize: isTablet ? 18 : 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CityStayRail extends StatelessWidget {
  const _CityStayRail({
    required this.sections,
    required this.session,
    required this.isTablet,
    required this.gridColumns,
    required this.gridAspect,
  });

  static const int _maxSections = 20;

  final List<MapEntry<String, List<Map<String, dynamic>>>> sections;
  final SessionController session;
  final bool isTablet;
  final int gridColumns;
  final double gridAspect;

  @override
  Widget build(BuildContext context) {
    final visibleSections = sections.where((entry) => entry.value.isNotEmpty).take(_maxSections).toList();

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...List.generate(visibleSections.length, (index) {
            final entry = visibleSections[index];
            final isLast = index == visibleSections.length - 1;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: EdgeInsets.only(bottom: isLast ? 0 : 8),
                  child: _CityStaySection(
                    city: entry.key,
                    items: entry.value,
                    session: session,
                    isTablet: isTablet,
                    gridColumns: gridColumns,
                    gridAspect: gridAspect,
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }
}

class _CityStaySection extends StatelessWidget {
  const _CityStaySection({
    required this.city,
    required this.items,
    required this.session,
    required this.isTablet,
    required this.gridColumns,
    required this.gridAspect,
  });

  final String city;
  final List<Map<String, dynamic>> items;
  final SessionController session;
  final bool isTablet;
  final int gridColumns;
  final double gridAspect;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final l = AppLocalizations.of(context)!;
        final spacing = 12.0;
        final availableWidth = constraints.maxWidth;
        final cardWidth = (availableWidth - ((gridColumns - 1) * spacing)) / gridColumns;
        final rowHeight = cardWidth / gridAspect;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    l.staysInCity(city),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.black,
                    ),
                  ),
                ),
                TextButton(
                  style: TextButton.styleFrom(
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                  ),
                  onPressed: () {
                    showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      useSafeArea: true,
                      showDragHandle: true,
                      builder: (context) => FractionallySizedBox(
                        heightFactor: 0.9,
                        child: _CityStaysSheet(
                          city: city,
                          items: items,
                          session: session,
                        ),
                      ),
                    );
                  },
                  child: Text(
                    l.seeAll,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: rowHeight,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                separatorBuilder: (context, _) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  return SizedBox(
                    width: cardWidth,
                    child: ListingCard(
                      item: items[index],
                      session: session,
                      compact: true,
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

class _CityStaysSheet extends StatefulWidget {
  const _CityStaysSheet({
    required this.city,
    required this.items,
    required this.session,
  });

  final String city;
  final List<Map<String, dynamic>> items;
  final SessionController session;

  @override
  State<_CityStaysSheet> createState() => _CityStaysSheetState();
}

class _CityStaysSheetState extends State<_CityStaysSheet> {
  static const int _pageSize = 10;
  int _visibleCount = _pageSize;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final gridColumns = isTablet ? 3 : 2;
    final gridAspect = isTablet ? 0.85 : 0.76;
    final visibleItems = widget.items.take(_visibleCount).toList();
    final hasMore = _visibleCount < widget.items.length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            l.staysInCity(widget.city),
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
          ),
        ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: visibleItems.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: gridColumns,
            crossAxisSpacing: 12,
            mainAxisSpacing: 10,
            childAspectRatio: gridAspect,
          ),
          itemBuilder: (context, index) {
            return ListingCard(item: visibleItems[index], session: widget.session, compact: true);
          },
        ),
        if (hasMore)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: SizedBox(
              height: 44,
              child: OutlinedButton(
                onPressed: () {
                  setState(() {
                    final next = _visibleCount + _pageSize;
                    _visibleCount = next > widget.items.length ? widget.items.length : next;
                  });
                },
                child: Text(l.loadMoreLeft(widget.items.length - _visibleCount)),
              ),
            ),
          ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// ListingCard — Airbnb-style card for all listing types
// ══════════════════════════════════════════════════════════════════════

class ListingCard extends StatelessWidget {
  const ListingCard({
    super.key,
    required this.item,
    required this.session,
    this.compact = false,
    this.imageHeightOverride,
  });

  final Map<String, dynamic> item;
  final SessionController session;
  final bool compact;
  final double? imageHeightOverride;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PropertyDetailsScreen(item: item, session: session),
        ),
      ),
      child: _buildCard(context),
    );
  }

  Widget _buildCard(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final title = (item['title'] ?? item['name'] ?? l.listingFallback).toString();
    final subtitle = _itemSubtitle(item, l);
    final price = _priceLabel(item, l, session);
    final imageUrl = resolveListingImageUrl(item);
    final ratingValue = double.tryParse((item['rating'] ?? item['average_rating'] ?? '').toString());
    final showRating = ratingValue != null && ratingValue > 0;
    final rating = ratingValue == null
        ? ''
        : (ratingValue % 1 == 0 ? ratingValue.toStringAsFixed(0) : ratingValue.toStringAsFixed(1));
    final imageHeight = imageHeightOverride ?? (compact ? (isTablet ? 150.0 : 132.0) : (isTablet ? 230.0 : 220.0));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── Image with overlays ──
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            height: imageHeight,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _ListingImage(imageUrl: imageUrl),

                // Heart / wishlist button
                Positioned(
                  top: 10,
                  right: 10,
                  child: GestureDetector(
                    onTap: () async {
                      if (!session.isAuthenticated) {
                        AppSnackBar.info(context, l.signInToSaveToWishlist);
                        return;
                      }
                      await session.addListingToWishlist(item);
                      if (context.mounted) {
                        AppSnackBar.success(context, l.savedToWishlist);
                      }
                    },
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: const BoxDecoration(
                        color: Color(0x66000000),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.favorite_border, color: Colors.white, size: 18),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 8),

        // ── Title row + rating ──
        Row(
          children: [
            Expanded(
              child: Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: compact ? 13 : 15, color: AppColors.black),
              ),
            ),
            if (showRating) ...[
              const Icon(Icons.star, size: 14, color: AppColors.black),
              const SizedBox(width: 3),
              Text(rating, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.black)),
            ],
          ],
        ),

        const SizedBox(height: 1),

        // ── Title ──
        Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: compact ? 12 : 13, color: AppColors.foggy),
        ),

        const SizedBox(height: 4),

        // ── Price ──
        Text.rich(
          TextSpan(children: [
            TextSpan(text: price.split(' ').take(2).join(' '), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.black)),
            TextSpan(text: ' ${price.split(' ').skip(2).join(' ')}', style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
          ]),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({required this.isTablet, required this.session});

  final bool isTablet;
  final SessionController session;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final inactiveChipColor = isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF0F0F3);
    final activeChipColor = isDark ? AppColors.rausch : const Color(0xFFFFE8E9);
    final inactiveTextColor = isDark ? const Color(0xFFD2DAE7) : const Color(0xFF565660);
    final activeTextColor = isDark ? AppColors.white : AppColors.rausch;
    final chips = [l.stays, l.tours, l.cars, l.events];
    return SizedBox(
      height: isTablet ? 44 : 34,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: chips.length,
        separatorBuilder: (context, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final active = index == 0;
          return GestureDetector(
            onTap: () {
              if (index == 0) return;
              if (index == 1) {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => ToursScreen(session: session)),
                );
                return;
              }
              if (index == 2) {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => TransportScreen(session: session)),
                );
                return;
              }
              if (index == 3) {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const _EventsScreen()),
                );
              }
            },
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: isTablet ? 16 : 12, vertical: isTablet ? 11 : 8),
              decoration: BoxDecoration(
                color: active ? activeChipColor : inactiveChipColor,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: isDark && !active ? AppColors.border : Colors.transparent),
              ),
              child: Text(
                chips[index],
                style: TextStyle(
                  fontSize: isTablet ? 16 : 12,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  color: active ? activeTextColor : inactiveTextColor,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _EventsScreen extends StatelessWidget {
  const _EventsScreen();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: Text(
          l.events,
          style: const TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 18),
        ),
        centerTitle: false,
      ),
      body: Center(
        child: Text(l.eventsComingSoon, style: const TextStyle(color: AppColors.foggy)),
      ),
    );
  }
}
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.black));
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF0F0),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFCACA)),
      ),
      child: Text(message),
    );
  }
}

class _ListingImage extends StatelessWidget {
  const _ListingImage({required this.imageUrl});

  final String? imageUrl;

  Widget _placeholder() {
    return Container(
      color: AppColors.surfaceSubtle,
      child: const Center(child: Icon(Icons.image_outlined, color: AppColors.hackberry, size: 38)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.isEmpty) {
      return _placeholder();
    }

    return CachedNetworkImage(
      imageUrl: imageUrl!,
      fit: BoxFit.cover,
      filterQuality: FilterQuality.medium,
      fadeInDuration: Duration.zero,
      fadeOutDuration: Duration.zero,
      placeholderFadeInDuration: Duration.zero,
      placeholder: (_, __) => _placeholder(),
      errorWidget: (_, __, ___) => _placeholder(),
    );
  }
}

