import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';
import '../../services/app_database.dart';
import 'package:merry360x_flutter/src/lib/fees.dart';
import '../../session_controller.dart';
import 'checkout_screen.dart';
import 'explore_screen.dart' show resolveListingImageUrl;
import 'messages_screen.dart';
import '../../../l10n/app_localizations.dart';

// ─────────────────────────────────────────────────────────────────────────────
// PropertyDetailsScreen
// Shows full listing details for any item_type: property / tour /
// tour_package / transport.
// ─────────────────────────────────────────────────────────────────────────────

class PropertyDetailsScreen extends StatefulWidget {
  const PropertyDetailsScreen({
    super.key,
    required this.item,
    required this.session,
    this.initialCheckIn,
    this.initialCheckOut,
    this.initialGuests = 1,
  });

  final Map<String, dynamic> item;
  final SessionController session;
  final DateTime? initialCheckIn;
  final DateTime? initialCheckOut;
  final int initialGuests;

  @override
  State<PropertyDetailsScreen> createState() => _PropertyDetailsScreenState();
}

class _PropertyDetailsScreenState extends State<PropertyDetailsScreen> {
  final AppDatabase _api = AppDatabase();
  late AppLocalizations _l;

  Map<String, dynamic>? _full;
  List<Map<String, dynamic>> _recommendedProperties = [];
  List<Map<String, dynamic>> _recommendedTours = [];
  List<Map<String, dynamic>> _recommendedTourPackages = [];
  List<Map<String, dynamic>> _recommendedTransport = [];
  bool _loading = true;
  bool _loadingRecommendations = false;
  String? _error;

  // Booking state
  DateTime? _checkIn;
  DateTime? _checkOut;
  int _guests = 1;
  int _currentImage = 0;
  int _validImageCount = 0;
  bool _liked = false;

  String? _hostId;
  Map<String, dynamic>? _hostProfile;
  int _hostFollowersCount = 0;
  bool _isFollowingHost = false;
  bool _loadingHostActions = false;
  bool _togglingFollow = false;

  @override
  void initState() {
    super.initState();
    _checkIn  = widget.initialCheckIn;
    _checkOut = widget.initialCheckOut;
    _guests   = widget.initialGuests;
    _loadFull();
    // Precache images already available on the card item so gallery opens instantly.
    WidgetsBinding.instance.addPostFrameCallback((_) => _precacheImages(widget.item));
  }

  void _precacheImages(Map<String, dynamic> source) {
    if (!mounted) return;
    final raw = source['images'];
    final urls = <String>[];
    if (raw is List) {
      for (final v in raw) {
        final s = v?.toString().trim() ?? '';
        if (s.isNotEmpty) urls.add(s);
      }
    }
    final main = resolveListingImageUrl(source);
    if (urls.isEmpty && main != null) urls.add(main);
    if (urls.isEmpty && main != null) urls.add(main);
    for (final s in urls) {
      String url = s;
      if (url.startsWith('//')) url = 'https:$url';
      if (url.startsWith('res.cloudinary.com/')) url = 'https://$url';
      if (!url.startsWith('http')) {
        url = 'https://res.cloudinary.com/dghg9uebh/image/upload/f_auto,q_auto,c_fill,w_900,h_600/$url';
      }
      precacheImage(CachedNetworkImageProvider(url), context);
    }
  }

  Future<void> _loadFull() async {
    final id = (widget.item['id'] ?? '').toString();
    final type = (widget.item['item_type'] ?? 'property').toString();
    if (id.isEmpty) {
      setState(() {
        _full = widget.item;
        _loading = false;
      });
      unawaited(_loadHostActions(widget.item));
      unawaited(_loadRecommendations(widget.item));
      return;
    }
    try {
      final result = await _api.fetchListingById(id: id, type: type);
      final resolved = result ?? widget.item;
      setState(() {
        _full = resolved;
        _loading = false;
      });
      _precacheImages(resolved);
      unawaited(_loadHostActions(resolved));
      unawaited(_loadRecommendations(resolved));
    } catch (e) {
      setState(() {
        _full = widget.item;
        _loading = false;
        _error = e.toString();
      });
      unawaited(_loadHostActions(widget.item));
      unawaited(_loadRecommendations(widget.item));
    }
  }

  String _resolveHostId(Map<String, dynamic> source) {
    final possibleKeys = <String>[
      'host_id',
      'created_by',
      'user_id',
      'owner_id',
      'provider_id',
    ];

    for (final key in possibleKeys) {
      final value = (source[key] ?? '').toString().trim();
      if (value.isNotEmpty) return value;
    }

    return '';
  }

  Future<void> _loadHostActions(Map<String, dynamic> source) async {
    final hostId = _resolveHostId(source);
    if (hostId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _hostId = null;
        _hostProfile = null;
        _hostFollowersCount = 0;
        _isFollowingHost = false;
        _loadingHostActions = false;
      });
      return;
    }

    setState(() {
      _loadingHostActions = true;
      _hostId = hostId;
    });

    try {
      final profileFuture = widget.session.fetchPublicProfile(userId: hostId);
      final followersFuture = widget.session.fetchHostFollowersCount(hostId: hostId);
      final followingFuture = widget.session.isAuthenticated
          ? widget.session.isFollowingHost(hostId: hostId)
          : Future<bool>.value(false);

      final results = await Future.wait<dynamic>([
        profileFuture,
        followersFuture,
        followingFuture,
      ]);

      if (!mounted) return;
      setState(() {
        _hostProfile = results[0] as Map<String, dynamic>?;
        _hostFollowersCount = results[1] as int;
        _isFollowingHost = results[2] as bool;
        _loadingHostActions = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingHostActions = false);
    }
  }

  String get _hostDisplayName {
    final nickname = (_hostProfile?['nickname'] ?? '').toString().trim();
    if (nickname.isNotEmpty) return nickname;
    final fullName = (_hostProfile?['full_name'] ?? '').toString().trim();
    if (fullName.isNotEmpty) return fullName;
    return _l.hostLabel;
  }

  Future<void> _contactHost() async {
    final hostId = (_hostId ?? '').trim();
    if (hostId.isEmpty) {
      _showSnack(_l.hostProfileUnavailable, isError: true);
      return;
    }
    if (!widget.session.isAuthenticated) {
      _showSnack(_l.signInToMessageHosts);
      return;
    }
    if (hostId == widget.session.userId) {
      _showSnack(_l.listingBelongsToYou);
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DirectMessageThreadScreen(
          session: widget.session,
          peerId: hostId,
          peerDisplayName: _hostDisplayName,
        ),
      ),
    );
  }

  Future<void> _toggleFollowHost() async {
    if (_togglingFollow || _loadingHostActions) return;

    final hostId = (_hostId ?? '').trim();
    if (hostId.isEmpty) {
      _showSnack(_l.hostProfileUnavailable, isError: true);
      return;
    }
    if (!widget.session.isAuthenticated) {
      _showSnack(_l.signInToFollowHosts);
      return;
    }
    if (hostId == widget.session.userId) {
      _showSnack(_l.cannotFollowOwnProfile);
      return;
    }

    final wasFollowing = _isFollowingHost;
    setState(() {
      _togglingFollow = true;
      _isFollowingHost = !wasFollowing;
      if (wasFollowing) {
        _hostFollowersCount = _hostFollowersCount > 0 ? _hostFollowersCount - 1 : 0;
      } else {
        _hostFollowersCount = _hostFollowersCount + 1;
      }
    });

    try {
      if (wasFollowing) {
        await widget.session.unfollowHost(hostId: hostId);
      } else {
        await widget.session.followHost(hostId: hostId);
      }
      if (!mounted) return;
      _showSnack(
        wasFollowing
            ? _l.removedFromFollowedHosts
            : _l.nowFollowingHost,
        isSuccess: true,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isFollowingHost = wasFollowing;
        if (wasFollowing) {
          _hostFollowersCount = _hostFollowersCount + 1;
        } else {
          _hostFollowersCount = _hostFollowersCount > 0 ? _hostFollowersCount - 1 : 0;
        }
      });
      _showSnack(_l.couldNotUpdateFollowStatus, isError: true);
    } finally {
      if (mounted) {
        setState(() => _togglingFollow = false);
      }
    }
  }

  Future<void> _loadRecommendations(Map<String, dynamic> baseItem) async {
    final query = _recommendationQuery(baseItem);
    final currentId = (baseItem['id'] ?? '').toString();
    final currentType = (baseItem['item_type'] ?? 'property').toString();

    setState(() => _loadingRecommendations = true);

    try {
      final results = await Future.wait([
        _api.fetchProperties(query: query, limit: 16),
        _api.fetchTours(query: query, limit: 16),
        _api.fetchTourPackages(query: query, limit: 16),
        _api.fetchTransportListings(query: query, limit: 16),
      ]);

      List<Map<String, dynamic>> sanitize(List<Map<String, dynamic>> items) {
        final filtered = items.where((candidate) {
          final candidateId = (candidate['id'] ?? '').toString();
          final candidateType = (candidate['item_type'] ?? '').toString();
          if (candidateId.isEmpty) return true;
          return candidateId != currentId || candidateType != currentType;
        }).toList();

        filtered.sort((a, b) {
          final aRating = ((a['rating'] ?? a['average_rating']) as num?)?.toDouble() ?? 0;
          final bRating = ((b['rating'] ?? b['average_rating']) as num?)?.toDouble() ?? 0;
          final aReviews = ((a['review_count'] ?? 0) as num?)?.toInt() ?? 0;
          final bReviews = ((b['review_count'] ?? 0) as num?)?.toInt() ?? 0;
          final ratingCompare = bRating.compareTo(aRating);
          if (ratingCompare != 0) return ratingCompare;
          return bReviews.compareTo(aReviews);
        });

        return filtered.take(7).toList();
      }

      Future<List<Map<String, dynamic>>> topUpRecommendations(
        List<Map<String, dynamic>> items,
        Future<List<Map<String, dynamic>>> Function() loader,
      ) async {
        final primary = sanitize(items);
        if (primary.length >= 7 || query.isEmpty) {
          return primary;
        }

        final fallback = sanitize(await loader());
        final merged = <Map<String, dynamic>>[];
        final seen = <String>{};

        void appendAll(List<Map<String, dynamic>> candidates) {
          for (final candidate in candidates) {
            final id = (candidate['id'] ?? '').toString();
            final type = (candidate['item_type'] ?? '').toString();
            final key = '$type:$id';
            if (!seen.add(key)) continue;
            merged.add(candidate);
            if (merged.length >= 7) return;
          }
        }

        appendAll(primary);
        if (merged.length < 7) {
          appendAll(fallback);
        }

        return merged;
      }

      final recommendedTours = await topUpRecommendations(
        results[1],
        () => _api.fetchTours(limit: 16),
      );
      final recommendedTourPackages = await topUpRecommendations(
        results[2],
        () => _api.fetchTourPackages(limit: 16),
      );
      final recommendedTransport = await topUpRecommendations(
        results[3],
        () => _api.fetchTransportListings(limit: 16),
      );
      final recommendedProperties = await topUpRecommendations(
        results[0],
        () => _api.fetchProperties(limit: 16),
      );

      if (!mounted) return;
      setState(() {
        _recommendedProperties = recommendedProperties;
        _recommendedTours = recommendedTours;
        _recommendedTourPackages = recommendedTourPackages;
        _recommendedTransport = recommendedTransport;
        _loadingRecommendations = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingRecommendations = false);
    }
  }

  List<({String title, List<Map<String, dynamic>> items})> get _recommendationSections {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return [
          if (_recommendedProperties.isNotEmpty) (title: _l.propertiesSection, items: _recommendedProperties),
          if (_recommendedTours.isNotEmpty) (title: _l.toursSection, items: _recommendedTours),
          if (_recommendedTransport.isNotEmpty) (title: _l.transportSection, items: _recommendedTransport),
        ];
      case 'transport':
        return [
          if (_recommendedProperties.isNotEmpty) (title: _l.propertiesSection, items: _recommendedProperties),
          if (_recommendedTours.isNotEmpty) (title: _l.toursSection, items: _recommendedTours),
          if (_recommendedTourPackages.isNotEmpty) (title: _l.tourPackagesSection, items: _recommendedTourPackages),
        ];
      default:
        return [
          if (_recommendedTours.isNotEmpty) (title: _l.toursSection, items: _recommendedTours),
          if (_recommendedTourPackages.isNotEmpty) (title: _l.tourPackagesSection, items: _recommendedTourPackages),
          if (_recommendedTransport.isNotEmpty) (title: _l.transportSection, items: _recommendedTransport),
        ];
    }
  }

  Map<String, dynamic> get item => _full ?? widget.item;
  String get itemType => (item['item_type'] ?? 'property').toString();

  double get _pricePerUnit {
    switch (itemType) {
      case 'tour':
        return double.tryParse('${item['price_per_person'] ?? 0}') ?? 0;
      case 'tour_package':
        return double.tryParse('${item['price_per_adult'] ?? 0}') ?? 0;
      case 'transport':
        return double.tryParse('${item['price_per_day'] ?? 0}') ?? 0;
      default:
        return double.tryParse('${item['price_per_night'] ?? 0}') ?? 0;
    }
  }

  String get _currency => (item['currency'] ?? 'USD').toString();

  int get _nights {
    if (_checkIn == null || _checkOut == null) return 0;
    return _checkOut!.difference(_checkIn!).inDays.clamp(0, 999);
  }

  double get _subtotal {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return _pricePerUnit * _guests;
      case 'transport':
        return _pricePerUnit * (_nights == 0 ? 1 : _nights);
      default:
        return _pricePerUnit * (_nights == 0 ? 1 : _nights);
    }
  }

  List<String> get _allImages {
    final raw = item['images'];
    final List<String> urls = [];
    if (raw is List) {
      for (final v in raw) {
        final s = v?.toString().trim() ?? '';
        if (s.isNotEmpty) urls.add(s);
      }
    }
    final m = resolveListingImageUrl(item);
    if (urls.isEmpty && m != null) urls.add(m);
    // Resolve each image URL
    return urls.map((s) {
      String url = s;
      if (url.startsWith('//')) url = 'https:$url';
      if (url.startsWith('res.cloudinary.com/')) url = 'https://$url';
      if (!url.startsWith('http')) {
        url = 'https://res.cloudinary.com/dghg9uebh/image/upload/f_auto,q_auto,c_fill,w_900,h_600/$url';
      }
      return url;
    }).toList();
  }

  List<String> get _amenities {
    final raw = item['amenities'];
    if (raw is List) return raw.map((e) => e.toString()).toList();
    return [];
  }

  String _recommendationQuery(Map<String, dynamic> source) {
    final location = (source['location'] ?? source['city'] ?? source['provider_name'] ?? '').toString().trim();
    if (location.isNotEmpty) {
      final firstSegment = location.split(',').first.trim();
      if (firstSegment.isNotEmpty) return firstSegment;
    }

    return (source['title'] ?? source['name'] ?? '').toString().trim();
  }

  bool get _hasRecommendations =>
      _recommendedProperties.isNotEmpty ||
      _recommendedTours.isNotEmpty ||
      _recommendedTourPackages.isNotEmpty ||
      _recommendedTransport.isNotEmpty;

  Future<void> _pickDates() async {
    final now = DateTime.now();
    final result = await showDateRangePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      initialDateRange: (_checkIn != null && _checkOut != null)
          ? DateTimeRange(start: _checkIn!, end: _checkOut!)
          : null,
      builder: (context, child) {
        final base = Theme.of(context);
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
    if (result != null) {
      setState(() {
        _checkIn = result.start;
        _checkOut = result.end;
      });
    }
  }

  void _addToCart() {
    final metadata = <String, dynamic>{
      if (_checkIn != null) 'check_in': _checkIn!.toIso8601String().split('T').first,
      if (_checkOut != null) 'check_out': _checkOut!.toIso8601String().split('T').first,
      'guests': _guests,
      if (_nights > 0) 'nights': _nights,
    };
    if (mounted) _showSnack(_l.addedToTripCart, isSuccess: true);
    unawaited(
      widget.session.addListingToTripCart(item, metadata: metadata).catchError((e) {
        if (mounted) _showSnack(_l.couldNotAddToCart, isError: true);
      }),
    );
  }

  void _bookNow() {
    HapticFeedback.mediumImpact();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CheckoutScreen(
          item: item,
          checkIn: _checkIn,
          checkOut: _checkOut,
          guests: _guests,
          session: widget.session,
        ),
      ),
    );
  }

  void _showSnack(String msg, {bool isError = false, bool isSuccess = false}) {
    if (isError) {
      AppSnackBar.error(context, msg);
    } else if (isSuccess) {
      AppSnackBar.success(context, msg);
    } else {
      AppSnackBar.info(context, msg);
    }
  }

  void _toggleLike() async {
    final session = widget.session;
    setState(() => _liked = !_liked);
    try {
      if (_liked) {
        await session.addListingToWishlist(item);
        if (mounted) _showSnack(_l.savedToWishlist, isSuccess: true);
      } else {
        await session.removeWishlistItem((item['id'] ?? '').toString());
        if (mounted) _showSnack(_l.removedFromWishlistAction, isSuccess: true);
      }
    } catch (e) {
      setState(() => _liked = !_liked);
      if (mounted) _showSnack(_l.couldNotUpdateWishlist, isError: true);
    }
  }

  void _shareListing() {
    final title = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final location = (item['location'] ?? item['city'] ?? '').toString();
    final id = (item['id'] ?? '').toString();
    final url = 'https://merry360x.com/listing/$id';
    SharePlus.instance.share(
      ShareParams(text: '$title${location.isNotEmpty ? ' in $location' : ''}\n$url'),
    );
  }

  Future<void> _openGallery(List<String> images, int initialIndex) async {
    if (images.isEmpty) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _FullscreenGallery(images: images, initialIndex: initialIndex),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    _l = AppLocalizations.of(context)!;
    final images = _allImages;
    final title = (item['title'] ?? item['name'] ?? _l.listingFallback).toString();
    final location = (item['location'] ?? item['city'] ?? '').toString();
    final rating = (item['rating'] ?? item['average_rating'])?.toString();
    final reviewCount = item['review_count']?.toString();
    final description = (item['description'] ?? '').toString();
    final maxGuests = int.tryParse('${item['max_guests'] ?? 1}') ?? 1;
    final bedrooms = item['bedrooms']?.toString();
    final bathrooms = item['bathrooms']?.toString();
    final beds = item['beds']?.toString();
    final hostId = (_hostId ?? '').trim();
    final hasHost = hostId.isNotEmpty;
    final hostName = _hostDisplayName;
    final hostAvatarUrl = (_hostProfile?['avatar_url'] ?? '').toString().trim();
    final hostTotalReviews = int.tryParse(
      (_hostProfile?['review_count'] ??
              _hostProfile?['reviews_count'] ??
              reviewCount ??
              '')
          .toString(),
    );
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: AppColors.surface,
      // ── Fixed bottom action bar ──
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(16, 12, 16, bottomPad + 10),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
        ),
        child: Row(
          children: [
            // Price
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    widget.session.formatPrice(_pricePerUnit, itemCurrency: _currency),
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.black),
                  ),
                  Text(_unitLabel, style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
                ],
              ),
            ),
            // Reserve button
            FilledButton(
              onPressed: _bookNow,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.rausch,
                minimumSize: const Size(0, 48),
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(_l.reserve, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
            ),
          ],
        ),
      ),
      // ── Scrollable body ──
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // ── Image gallery with overlay buttons ──
          SizedBox(
            height: MediaQuery.of(context).size.shortestSide >= 600 ? 460 : 260,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (_loading)
                  Container(color: AppColors.surfaceSubtle)
                else
                  GestureDetector(
                    onTap: () => _openGallery(images, _currentImage),
                    child: _GalleryView(
                      images: images,
                      onPageChanged: (i) => setState(() => _currentImage = i),
                      onValidCountChanged: (n) {
                        if (_validImageCount != n) setState(() => _validImageCount = n);
                      },
                    ),
                  ),
                // Top bar: back, like, share
                Positioned(
                  top: MediaQuery.of(context).padding.top + 6,
                  left: MediaQuery.of(context).size.shortestSide >= 600 ? null : 12,
                  right: 12,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _CircleBtn(
                        icon: _liked ? Icons.favorite : Icons.favorite_border,
                        color: _liked ? AppColors.rausch : AppColors.black,
                        onTap: _toggleLike,
                      ),
                      const SizedBox(width: 10),
                      _CircleBtn(
                        icon: Icons.ios_share,
                        onTap: _shareListing,
                      ),
                    ],
                  ),
                ),
                // Back button: bottom-left on iPad (avoids Stage Manager dots), top-left on iPhone
                if (MediaQuery.of(context).size.shortestSide >= 600)
                  Positioned(
                    bottom: 18,
                    left: 12,
                    child: _CircleBtn(
                      icon: Icons.arrow_back,
                      onTap: () => Navigator.pop(context),
                    ),
                  )
                else
                  Positioned(
                    top: MediaQuery.of(context).padding.top + 6,
                    left: 12,
                    child: _CircleBtn(
                      icon: Icons.arrow_back,
                      onTap: () => Navigator.pop(context),
                    ),
                  ),
                // Dot indicators
                if ((_validImageCount > 0 ? _validImageCount : images.length) > 1)
                  Positioned(
                    bottom: 10,
                    left: 0,
                    right: 0,
                    child: _DotIndicator(
                      count: _validImageCount > 0 ? _validImageCount : images.length,
                      current: _currentImage,
                    ),
                  ),
              ],
            ),
          ),

          // ── Content ──
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(10),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_l.someDetailsUnavailable, style: const TextStyle(fontSize: 13)),
                  ),

                // Type badge
                _TypeBadge(type: itemType),
                const SizedBox(height: 8),

                // Title
                Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.black)),
                const SizedBox(height: 6),

                // Location
                if (location.isNotEmpty)
                  Row(children: [
                    const Icon(Icons.location_on_outlined, size: 16, color: AppColors.foggy),
                    const SizedBox(width: 4),
                    Expanded(child: Text(location, style: const TextStyle(fontSize: 15, color: AppColors.foggy))),
                  ]),

                // Rating
                if (rating != null && rating != 'null') ...[
                  const SizedBox(height: 8),
                  Row(children: [
                    const Icon(Icons.star, size: 16, color: AppColors.black),
                    const SizedBox(width: 4),
                    Text(rating, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    if (reviewCount != null && reviewCount != 'null') ...[
                      const SizedBox(width: 4),
                      Text(_l.nReviewsParenthetical(int.tryParse(reviewCount) ?? 0), style: const TextStyle(color: AppColors.foggy, fontSize: 14)),
                    ],
                  ]),
                ],

                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 16),

                // Property specs
                if (itemType == 'property') ...[
                  Wrap(spacing: 20, runSpacing: 6, children: [
                    if (beds != null && beds != 'null') _SpecChip(icon: Icons.bed_outlined, label: _l.nBeds(int.tryParse(beds) ?? 0)),
                    if (bedrooms != null && bedrooms != 'null') _SpecChip(icon: Icons.door_front_door_outlined, label: _l.nBedrooms(int.tryParse(bedrooms) ?? 0)),
                    if (bathrooms != null && bathrooms != 'null') _SpecChip(icon: Icons.bathtub_outlined, label: _l.nBathrooms(int.tryParse(bathrooms) ?? 0)),
                    _SpecChip(icon: Icons.people_outline, label: _l.upToGuests(maxGuests)),
                  ]),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                // Description
                if (description.isNotEmpty) ...[
                  Text(_l.aboutThisPlace, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  _ExpandableText(text: description),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                // Amenities
                if (_amenities.isNotEmpty) ...[
                  Text(_l.amenities, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 8,
                    children: _amenities.take(12).map((a) => _AmenityChip(amenity: a)).toList(),
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                if (hasHost) ...[
                  Text(_l.connectWithHost, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (hostAvatarUrl.isNotEmpty)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  hostAvatarUrl,
                                  width: 40,
                                  height: 40,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) => Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: AppColors.rausch.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.person_outline, color: AppColors.rausch, size: 20),
                                  ),
                                ),
                              )
                            else
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: AppColors.rausch.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.person_outline, color: AppColors.rausch, size: 20),
                              ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    hostName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.black),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _loadingHostActions
                                        ? _l.loadingHostDetails
                                        : _l.hostReviewsAndFollowers(hostTotalReviews ?? 0, _hostFollowersCount),
                                    style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: (_loadingHostActions || _togglingFollow)
                                    ? null
                                    : _toggleFollowHost,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.black,
                                  side: const BorderSide(color: AppColors.black),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: _togglingFollow
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : Text(_isFollowingHost ? _l.followingButton : _l.followButton),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: FilledButton.icon(
                                onPressed: _contactHost,
                                icon: const Icon(Icons.chat_bubble_outline, size: 16),
                                label: Text(_l.messageButton),
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.rausch,
                                  foregroundColor: AppColors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                if (_loadingRecommendations || _hasRecommendations) ...[
                  Text(_l.recommendedForYourTrip, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  if (_loadingRecommendations)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 18),
                      child: Center(child: CircularProgressIndicator(color: AppColors.rausch)),
                    )
                  else ...[
                    for (final section in _recommendationSections)
                      _RecommendationRail(
                        title: section.title,
                        items: section.items,
                        session: widget.session,
                        initialCheckIn: _checkIn,
                        initialCheckOut: _checkOut,
                        initialGuests: _guests,
                      ),
                  ],
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                ],

                // ── Your Trip ──
                Text(_l.yourTrip, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),

                // Dates
                GestureDetector(
                  onTap: _pickDates,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(children: [
                      const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.black),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(_l.datesLabel, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                          const SizedBox(height: 2),
                          Text(
                            (_checkIn != null && _checkOut != null)
                                ? '${_fmtDate(_checkIn!)} → ${_fmtDate(_checkOut!)}'
                                : _l.selectDates,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                          ),
                        ]),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.foggy),
                    ]),
                  ),
                ),

                const SizedBox(height: 10),

                // Guests
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(children: [
                    const Icon(Icons.people_outline, size: 18, color: AppColors.black),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_l.guestsLabel, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                        const SizedBox(height: 2),
                        Text(_l.nGuestsLabel(_guests),
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      ]),
                    ),
                    _CounterButton(value: _guests, min: 1, max: maxGuests, onChanged: (v) => setState(() => _guests = v)),
                  ]),
                ),

                if (_nights > 0) ...[
                  const SizedBox(height: 16),
                  _PriceSummaryCard(
                    pricePerUnit: _pricePerUnit,
                    currency: _currency,
                    nights: _nights,
                    guests: _guests,
                    subtotal: _subtotal,
                    itemType: itemType,
                    formatAmount: (a) => widget.session.formatPrice(a, itemCurrency: _currency),
                  ),
                ],

                const SizedBox(height: 20),

                // ── Add to Trip Cart button ──
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _addToCart,
                    icon: const Icon(Icons.luggage_outlined, size: 18),
                    label: Text(_l.addToTripCart),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: AppColors.black),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String get _unitLabel {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return _l.personSuffix;
      case 'transport':
        return _l.daySuffix;
      default:
        return _l.nightSuffix;
    }
  }

  String _fmtDate(DateTime d) => '${d.day}/${d.month}/${d.year}';
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery
// ─────────────────────────────────────────────────────────────────────────────

class _GalleryView extends StatefulWidget {
  const _GalleryView({
    required this.images,
    required this.onPageChanged,
    this.onValidCountChanged,
  });

  final List<String> images;
  final ValueChanged<int> onPageChanged;
  final ValueChanged<int>? onValidCountChanged;

  @override
  State<_GalleryView> createState() => _GalleryViewState();
}

class _GalleryViewState extends State<_GalleryView> {
  late final PageController _controller;
  final Set<int> _failed = {};

  @override
  void initState() {
    super.initState();
    _controller = PageController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.onValidCountChanged?.call(widget.images.length);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onError(int index) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _failed.add(index));
      // Notify parent of new valid count
      final newValid = widget.images.length - _failed.length;
      widget.onValidCountChanged?.call(newValid > 0 ? newValid : 0);
      // Auto-advance to next valid image
      final next = _nextValid(index + 1);
      if (next != null && _controller.hasClients) {
        _controller.jumpToPage(next);
      }
    });
  }

  int? _nextValid(int from) {
    for (var i = from; i < widget.images.length; i++) {
      if (!_failed.contains(i)) return i;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final placeholderColor = AppColors.surfaceSubtle;
    final placeholderIconColor = AppColors.hackberry;

    final valid = [
      for (var i = 0; i < widget.images.length; i++)
        if (!_failed.contains(i)) (index: i, url: widget.images[i]),
    ];

    if (valid.isEmpty) {
      return Container(
        color: placeholderColor,
        child: Center(child: Icon(Icons.image_outlined, size: 60, color: placeholderIconColor)),
      );
    }

    return PageView.builder(
      controller: _controller,
      itemCount: widget.images.length,
      onPageChanged: (rawIndex) {
        // Map raw index to the valid-only position for the dot indicator
        final validPos = valid.indexWhere((e) => e.index == rawIndex);
        widget.onPageChanged(validPos >= 0 ? validPos : 0);
      },
      itemBuilder: (context, index) {
        if (_failed.contains(index)) return const SizedBox.shrink();
        return CachedNetworkImage(
          imageUrl: widget.images[index],
          fit: BoxFit.cover,
          fadeInDuration: Duration.zero,
          fadeOutDuration: Duration.zero,
          placeholderFadeInDuration: Duration.zero,
          placeholder: (_, _) => Container(
            color: placeholderColor,
            child: Center(child: Icon(Icons.image_outlined, size: 60, color: placeholderIconColor)),
          ),
          errorWidget: (_, _, _) {
            _onError(index);
            return const SizedBox.shrink();
          },
        );
      },
    );
  }
}

class _DotIndicator extends StatelessWidget {
  const _DotIndicator({required this.count, required this.current});

  final int count;
  final int current;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count > 8 ? 8 : count, (i) {
        return Container(
          width: i == current ? 16.0 : 6.0,
          height: 6,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          decoration: BoxDecoration(
            color: i == current ? AppColors.rausch : AppColors.border,
            borderRadius: BorderRadius.circular(3),
          ),
        );
      }),
    );
  }
}

class _FullscreenGallery extends StatefulWidget {
  const _FullscreenGallery({required this.images, required this.initialIndex});

  final List<String> images;
  final int initialIndex;

  @override
  State<_FullscreenGallery> createState() => _FullscreenGalleryState();
}

class _FullscreenGalleryState extends State<_FullscreenGallery> {
  late final PageController _pageController;
  final ScrollController _thumbScrollController = ScrollController();
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, widget.images.length - 1);
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    _thumbScrollController.dispose();
    super.dispose();
  }

  void _goToIndex(int index) {
    if (index < 0 || index >= widget.images.length) return;
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
    );
  }

  void _handlePageChanged(int index) {
    setState(() => _currentIndex = index);

    if (!_thumbScrollController.hasClients) return;
    final target = (index * 76.0) - 120.0;
    final clamped = target.clamp(
      0.0,
      _thumbScrollController.position.maxScrollExtent,
    );
    _thumbScrollController.animateTo(
      clamped,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Stack(
            children: [
              PageView.builder(
                controller: _pageController,
                itemCount: widget.images.length,
                onPageChanged: _handlePageChanged,
                itemBuilder: (context, index) {
                  return InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
                    child: Center(
                      child: CachedNetworkImage(
                        imageUrl: widget.images[index],
                        fit: BoxFit.contain,
                        fadeInDuration: Duration.zero,
                        fadeOutDuration: Duration.zero,
                        placeholderFadeInDuration: Duration.zero,
                        errorWidget: (_, _, _) => const Icon(
                          Icons.broken_image_outlined,
                          color: Colors.white54,
                          size: 48,
                        ),
                      ),
                    ),
                  );
                },
              ),
              Positioned.fill(
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        behavior: HitTestBehavior.translucent,
                        onTap: () => _goToIndex(_currentIndex - 1),
                        child: const SizedBox.expand(),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        behavior: HitTestBehavior.translucent,
                        onTap: () => _goToIndex(_currentIndex + 1),
                        child: const SizedBox.expand(),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: Row(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0x66000000),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0x66000000),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '${_currentIndex + 1} / ${widget.images.length}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          if (widget.images.length > 1)
            Positioned(
              left: 0,
              right: 0,
              bottom: MediaQuery.of(context).padding.bottom + 18,
              child: SizedBox(
                height: 70,
                child: ListView.separated(
                  controller: _thumbScrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  itemCount: widget.images.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final selected = index == _currentIndex;
                    return GestureDetector(
                      onTap: () => _goToIndex(index),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: 68,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: selected ? Colors.white : Colors.white24,
                            width: selected ? 2 : 1,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            CachedNetworkImage(
                              imageUrl: widget.images[index],
                              fit: BoxFit.cover,
                              fadeInDuration: Duration.zero,
                              fadeOutDuration: Duration.zero,
                              placeholderFadeInDuration: Duration.zero,
                              errorWidget: (_, _, _) => Container(
                                color: const Color(0xFF1F1F1F),
                                child: const Icon(Icons.image_outlined, color: Colors.white38),
                              ),
                            ),
                            if (!selected)
                              Container(color: const Color(0x33000000)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _RecommendationRail extends StatelessWidget {
  const _RecommendationRail({
    required this.title,
    required this.items,
    required this.session,
    required this.initialCheckIn,
    required this.initialCheckOut,
    required this.initialGuests,
  });

  final String title;
  final List<Map<String, dynamic>> items;
  final SessionController session;
  final DateTime? initialCheckIn;
  final DateTime? initialCheckOut;
  final int initialGuests;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.black)),
        const SizedBox(height: 10),
        SizedBox(
          height: 246,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return _RecommendationCard(
                item: items[index],
                session: session,
                initialCheckIn: initialCheckIn,
                initialCheckOut: initialCheckOut,
                initialGuests: initialGuests,
              );
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({
    required this.item,
    required this.session,
    required this.initialCheckIn,
    required this.initialCheckOut,
    required this.initialGuests,
  });

  final Map<String, dynamic> item;
  final SessionController session;
  final DateTime? initialCheckIn;
  final DateTime? initialCheckOut;
  final int initialGuests;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final imageFallbackColor = AppColors.surfaceSubtle;
    final imageFallbackIconColor = AppColors.hackberry;
    final title = _cardTitle(item, l);
    final imageUrl = resolveListingImageUrl(item) ?? '';
    final rating = (item['rating'] ?? item['average_rating'])?.toString();

    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PropertyDetailsScreen(
            item: item,
            session: session,
            initialCheckIn: initialCheckIn,
            initialCheckOut: initialCheckOut,
            initialGuests: initialGuests,
          ),
        ),
      ),
      child: SizedBox(
        width: 174,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                height: 150,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => Container(
                              color: imageFallbackColor,
                              child: Icon(Icons.broken_image_outlined, color: imageFallbackIconColor),
                            ),
                          )
                        : Container(
                            color: imageFallbackColor,
                            child: Icon(Icons.image_outlined, color: imageFallbackIconColor),
                          ),
                    Positioned(
                      top: 10,
                      right: 10,
                      child: GestureDetector(
                        onTap: () async {
                          final metadata = <String, dynamic>{
                            if (initialCheckIn != null) 'check_in': initialCheckIn!.toIso8601String().split('T').first,
                            if (initialCheckOut != null) 'check_out': initialCheckOut!.toIso8601String().split('T').first,
                            'guests': initialGuests,
                          };
                          try {
                            await session.addListingToTripCart(item, metadata: metadata);
                            if (!context.mounted) return;
                            AppSnackBar.success(context, l.addedToTripCart);
                          } catch (e) {
                            if (!context.mounted) return;
                            AppSnackBar.error(context, l.couldNotAddToCart);
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
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '${_priceMain(item)} ${_priceSuffix(item, l)}',
                          style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                        ),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (rating != null && rating != 'null') ...[
                  const SizedBox(width: 6),
                  const Icon(Icons.star, size: 14, color: AppColors.black),
                  const SizedBox(width: 3),
                  Text(
                    rating,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.black),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _cardTitle(Map<String, dynamic> item, AppLocalizations l) {
    final type = (item['item_type'] ?? 'property').toString();
    final title = (item['title'] ?? item['name'] ?? l.listingFallback).toString();
    switch (type) {
      case 'tour':
        final location = (item['location'] ?? item['category'] ?? '').toString().trim();
        return location.isEmpty ? title : '$title in $location';
      case 'tour_package':
        final location = (item['location'] ?? item['city'] ?? '').toString().trim();
        return location.isEmpty ? title : '$title in $location';
      case 'transport':
        final vehicle = (item['vehicle_type'] ?? item['provider_name'] ?? '').toString().trim();
        return vehicle.isEmpty ? title : '$title, $vehicle';
      default:
        final location = (item['location'] ?? item['city'] ?? '').toString().trim();
        return location.isEmpty ? title : '$title in $location';
    }
  }

  String _priceMain(Map<String, dynamic> item) {
    final itemCurrency = (item['currency'] ?? 'RWF').toString();
    final type = (item['item_type'] ?? 'property').toString();
    final amount = switch (type) {
      'tour' => item['price_per_person'] ?? 0,
      'tour_package' => item['price_per_person'] ?? item['price_per_adult'] ?? 0,
      'transport' => item['price_per_day'] ?? 0,
      _ => item['price_per_night'] ?? 0,
    };
    final parsed = double.tryParse('$amount') ?? 0;
    return session.formatPrice(parsed, itemCurrency: itemCurrency);
  }

  static String _priceSuffix(Map<String, dynamic> item, AppLocalizations l) {
    final type = (item['item_type'] ?? 'property').toString();
    return switch (type) {
      'tour' || 'tour_package' => l.personSuffix,
      'transport' => l.daySuffix,
      _ => l.nightSuffix,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

class _CircleBtn extends StatelessWidget {
  const _CircleBtn({required this.icon, required this.onTap, this.color});

  final IconData icon;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: const BoxDecoration(
          color: AppColors.surface,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Color(0x22000000), blurRadius: 6)],
        ),
        child: Icon(icon, size: 18, color: color ?? AppColors.black),
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.type});

  final String type;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final label = switch (type) {
      'tour' => l.tourLabel,
      'tour_package' => l.tourPackageLabel,
      'transport' => l.transport,
      _ => l.stayLabel,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.rausch.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.rausch)),
    );
  }
}

class _SpecChip extends StatelessWidget {
  const _SpecChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: AppColors.hackberry),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(fontSize: 14, color: AppColors.hof)),
      ],
    );
  }
}

class _AmenityChip extends StatelessWidget {
  const _AmenityChip({required this.amenity});

  final String amenity;

  String _label(String raw) {
    final normalized = raw
        .replaceAll(RegExp(r'[_-]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    if (normalized.isEmpty) return raw;

    return normalized
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map((word) {
          final lower = word.toLowerCase();
          if (lower.length == 1) return lower.toUpperCase();
          return '${lower[0].toUpperCase()}${lower.substring(1)}';
        })
        .join(' ');
  }

  IconData _icon(String a) {
    final lower = a.toLowerCase();
    if (lower.contains('wifi') || lower.contains('internet')) return Icons.wifi_outlined;
    if (lower.contains('pool')) return Icons.pool_outlined;
    if (lower.contains('park')) return Icons.local_parking_outlined;
    if (lower.contains('tv') || lower.contains('television')) return Icons.tv_outlined;
    if (lower.contains('kitchen')) return Icons.kitchen_outlined;
    if (lower.contains('washer') || lower.contains('laundry')) return Icons.local_laundry_service_outlined;
    if (lower.contains('air') || lower.contains('ac')) return Icons.ac_unit_outlined;
    if (lower.contains('gym') || lower.contains('fitness')) return Icons.fitness_center_outlined;
    if (lower.contains('pet')) return Icons.pets_outlined;
    if (lower.contains('smoke')) return Icons.smoke_free_outlined;
    if (lower.contains('breakfast')) return Icons.free_breakfast_outlined;
    return Icons.check_circle_outline;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final chipColor = isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF5F5F7);
    final chipBorderColor = isDark ? const Color(0xFF2A3342) : Colors.transparent;
    final maxChipWidth = MediaQuery.sizeOf(context).shortestSide >= 600 ? 280.0 : 210.0;
    final label = _label(amenity);

    return Container(
      constraints: BoxConstraints(maxWidth: maxChipWidth),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: chipColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: chipBorderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon(amenity), size: 14, color: AppColors.hackberry),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: AppColors.black),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExpandableText extends StatefulWidget {
  const _ExpandableText({required this.text});

  final String text;

  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final shouldTruncate = widget.text.length > 300;
    final displayText = (!_expanded && shouldTruncate)
        ? '${widget.text.substring(0, 300)}...'
        : widget.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(displayText, style: const TextStyle(fontSize: 15, color: AppColors.hof, height: 1.5)),
        if (shouldTruncate)
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                _expanded ? l.showLess : l.showMore,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _CounterButton extends StatelessWidget {
  const _CounterButton({
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _Btn(
          onTap: value > min ? () => onChanged(value - 1) : null,
          icon: Icons.remove,
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text('$value', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        ),
        _Btn(
          onTap: value < max ? () => onChanged(value + 1) : null,
          icon: Icons.add,
        ),
      ],
    );
  }
}

class _Btn extends StatelessWidget {
  const _Btn({this.onTap, required this.icon});

  final VoidCallback? onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null;
    final borderColor = disabled ? AppColors.border : AppColors.hackberry;
    final iconColor = disabled ? AppColors.hackberry : AppColors.black;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: borderColor,
          ),
        ),
        child: Icon(icon, size: 16, color: iconColor),
      ),
    );
  }
}

class _PriceSummaryCard extends StatelessWidget {
  const _PriceSummaryCard({
    required this.pricePerUnit,
    required this.currency,
    required this.nights,
    required this.guests,
    required this.subtotal,
    required this.itemType,
    required this.formatAmount,
  });

  final double pricePerUnit;
  final String currency;
  final int nights;
  final int guests;
  final double subtotal;
  final String itemType;
  final String Function(double) formatAmount;

  String get _serviceType {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return 'tour';
      case 'transport':
        return 'transport';
      default:
        return 'accommodation';
    }
  }

  BookingFinancials get _financials => calculateBookingFinancialsFromDiscountedListing(
        discountedListingSubtotal: subtotal.clamp(0.0, double.infinity).toDouble(),
        serviceType: _serviceType,
      );

  double get _serviceFee => _financials.guestFee;
  double get _total => _financials.guestTotal;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    String unitDesc;
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        unitDesc = '${formatAmount(pricePerUnit)} × ${l.nGuestsLabel(guests)}';
      case 'transport':
        unitDesc = '${formatAmount(pricePerUnit)} × $nights day${nights > 1 ? "s" : ""}';
      default:
        unitDesc = '${formatAmount(pricePerUnit)} × $nights night${nights > 1 ? "s" : ""}';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l.priceBreakdown, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 10),
          _Row(label: unitDesc, value: formatAmount(subtotal)),
          const SizedBox(height: 8),
          _PriceDetailsToggle(
            percentLabel: _financials.guestFeePercent.toStringAsFixed(0),
            formatAmount: formatAmount,
            fee: _serviceFee,
          ),
          const Divider(height: 18),
          _Row(
            label: l.total,
            value: formatAmount(_total),
            bold: true,
          ),
        ],
      ),
    );
  }
}

class _PriceDetailsToggle extends StatefulWidget {
  const _PriceDetailsToggle({
    required this.percentLabel,
    required this.formatAmount,
    required this.fee,
  });

  final String percentLabel;
  final String Function(double) formatAmount;
  final double fee;

  @override
  State<_PriceDetailsToggle> createState() => _PriceDetailsToggleState();
}

class _PriceDetailsToggleState extends State<_PriceDetailsToggle> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => setState(() => _open = !_open),
          child: Text(
            _open ? l.hidePriceDetails : l.showPriceDetails,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.rausch),
          ),
        ),
        if (_open) ...[
          const SizedBox(height: 6),
          _Row(
            label: l.platformFeePercent(widget.percentLabel),
            value: widget.formatAmount(widget.fee),
          ),
        ],
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value, this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final style = bold
        ? const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)
        : const TextStyle(fontSize: 14, color: AppColors.hof);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(value, style: style),
      ],
    );
  }
}
