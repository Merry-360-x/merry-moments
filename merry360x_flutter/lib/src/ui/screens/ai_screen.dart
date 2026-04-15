import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../app.dart';
import '../../config.dart';
import '../../session_controller.dart';
import 'checkout_screen.dart';
import 'my_bookings_screen.dart';
import 'property_details_screen.dart';
import 'trip_cart_screen.dart';
import '../../../l10n/app_localizations.dart';

class AiScreen extends StatefulWidget {
  const AiScreen({super.key, required this.session, this.onBack});

  final SessionController session;
  final VoidCallback? onBack;

  @override
  State<AiScreen> createState() => _AiScreenState();
}

class _AiScreenState extends State<AiScreen> {
  late AppLocalizations _l;
  final _controller = TextEditingController();
  final _feedbackController = TextEditingController();
  final _scrollController = ScrollController();
  final List<_ChatMsg> _messages = [];
  final Map<int, GlobalKey> _assistantMessageKeys = {};
  final String _sessionId = 'mobile_${DateTime.now().millisecondsSinceEpoch}';
  bool _busy = false;
  bool _consentedToAi = false;
  bool _ratingBusy = false;
  String? _conversationFeedback;

  int? _pendingScrollToAssistantIndex;

  @override
  void dispose() {
    _controller.dispose();
    _feedbackController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _busy) return;
    if (!_consentedToAi) {
      final accepted = await _askForConsent();
      if (accepted != true) return;
      setState(() => _consentedToAi = true);
    }

    _controller.clear();
    setState(() {
      _messages.add(_ChatMsg(role: 'user', content: trimmed));
      _busy = true;
    });
    _scrollToBottom();

    try {
      final history = _buildHistory();

      final response = await http.post(
        _aiUri,
        headers: _aiHeaders(),
        body: jsonEncode({
          'messages': history,
          'userId': widget.session.userId.isEmpty ? null : widget.session.userId,
          'sessionId': _sessionId,
          'channel': 'mobile',
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final parsed = _parseAiResponse(jsonDecode(response.body) as Map<String, dynamic>);
        final allowTravelSuggestions = _shouldShowTravelSuggestions(trimmed);
        final visibleRecommendations = allowTravelSuggestions
            ? parsed.recommendations
            : const <_AiRecommendation>[];
        final visibleActions = allowTravelSuggestions
            ? parsed.actions
            : parsed.actions
                .where((action) => !_isListingAction(action))
                .toList(growable: false);
        if (parsed.reply.isNotEmpty) {
          final targetIndex = _messages.length;
          setState(() {
            _messages.add(_ChatMsg(
              role: 'assistant',
              content: parsed.reply,
              recommendations: visibleRecommendations,
              actions: visibleActions,
            ));
            _pendingScrollToAssistantIndex = targetIndex;
          });
          _scrollToPendingAssistantMessage();
        }
      } else {
        final targetIndex = _messages.length;
        setState(() {
          _messages.add(_ChatMsg(
            role: 'assistant',
            content: _l.aiError,
          ));
          _pendingScrollToAssistantIndex = targetIndex;
        });
        _scrollToPendingAssistantMessage();
      }
    } catch (_) {
      final targetIndex = _messages.length;
      setState(() {
        _messages.add(_ChatMsg(
          role: 'assistant',
          content: _l.aiNetworkError,
        ));
        _pendingScrollToAssistantIndex = targetIndex;
      });
      _scrollToPendingAssistantMessage();
    } finally {
      if (mounted) setState(() => _busy = false);
      // Avoid snapping to the very end of long answers.
    }
  }

  List<Map<String, String>> _buildHistory() {
    final recentMessages =
        _messages.length <= 6 ? List<_ChatMsg>.from(_messages) : _messages.sublist(_messages.length - 6);

    return recentMessages.map((message) {
      final compact = message.content.trim();
      return {
        'role': message.role,
        'content': compact.length > 260 ? compact.substring(0, 260) : compact,
      };
    }).toList();
  }

  Uri get _aiUri => Uri.parse('${AppConfig.apiBaseUrl.replaceAll('/api', '')}/api/ai-trip-advisor');

  Map<String, String> _aiHeaders() {
    final headers = <String, String>{'Content-Type': 'application/json'};
    final accessToken = widget.session.accessToken;
    if (accessToken != null && accessToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $accessToken';
    }
    return headers;
  }

  _ParsedAiResponse _parseAiResponse(Map<String, dynamic> json) {
    final recommendations = ((json['recommendations'] as List?) ?? const [])
        .whereType<Map>()
        .map((item) => _AiRecommendation(
              id: (item['id'] ?? '').toString(),
              title: (item['title'] ?? 'Untitled').toString(),
              itemType: (item['item_type'] ?? 'property').toString(),
              location: item['location']?.toString(),
              currency: item['currency']?.toString(),
              price: (item['price'] as num?)?.toDouble(),
              rating: (item['rating'] as num?)?.toDouble(),
              reviewCount: (item['review_count'] as num?)?.toInt(),
              imageUrl: item['image_url']?.toString(),
            ))
        .where((item) => item.id.isNotEmpty)
        .take(3)
        .toList();

    final rawActions = [
      ...((json['actions'] as List?) ?? const []),
      ...((json['uiActions'] as List?) ?? const []),
    ];

    final actions = rawActions
        .whereType<Map>()
        .map((item) => _AiAction(
              type: (item['type'] ?? '').toString(),
              label: (item['label'] ?? 'Action').toString(),
              referenceId: item['referenceId']?.toString(),
              itemType: item['itemType']?.toString(),
              bookingId: item['bookingId']?.toString(),
              orderId: item['orderId']?.toString(),
              url: item['url']?.toString(),
              variant: item['variant']?.toString(),
            ))
        .where((item) => item.type.isNotEmpty)
        .toList();

    return _ParsedAiResponse(
      reply: (json['reply'] ?? json['message'] ?? '').toString(),
      recommendations: recommendations,
      actions: actions,
    );
  }

  bool _isListingAction(_AiAction action) {
    final type = action.type.toLowerCase();
    final label = action.label.toLowerCase();
    final url = (action.url ?? '').toLowerCase();
    final itemType = (action.itemType ?? '').toLowerCase();

    if (itemType.isNotEmpty) return true;
    if ((action.referenceId ?? '').isNotEmpty) return true;

    if (type == 'add_to_trip_cart' || type == 'get_trip_cart' || type == 'go_to_checkout') {
      return true;
    }

    if (url.contains('/trip-cart') || url.contains('/checkout')) {
      return true;
    }

    if (label.contains('cart') ||
        label.contains('checkout') ||
        label.contains('stay') ||
        label.contains('tour') ||
        label.contains('transport') ||
        label.contains('property')) {
      return true;
    }

    return false;
  }

  bool _shouldShowTravelSuggestions(String prompt) {
    final q = prompt.toLowerCase().trim();
    if (q.isEmpty) return false;

    final identityQueries = <String>[
      'what is your name',
      "what's your name",
      'who are you',
      'your name',
      'what do i call you',
    ];
    if (identityQueries.any(q.contains)) return false;

    final domainKeywords = <String>[
      'stay',
      'stays',
      'hotel',
      'hotels',
      'room',
      'rooms',
      'property',
      'properties',
      'tour',
      'tours',
      'package',
      'packages',
      'transport',
      'car',
      'cars',
      'airport',
      'pickup',
      'dropoff',
      'trip',
      'booking',
      'book',
      'reserve',
      'checkout',
      'cart',
    ];

    final intentKeywords = <String>[
      'find',
      'search',
      'show',
      'recommend',
      'suggest',
      'option',
      'options',
      'available',
      'which',
      'best',
      'cheap',
      'cheapest',
      'budget',
      'price',
      'cost',
      'plan',
      'itinerary',
      'book',
      'reserve',
      'add to cart',
      'checkout',
    ];

    final hasDomain = domainKeywords.any(q.contains);
    if (!hasDomain) return false;

    final hasIntent = intentKeywords.any(q.contains);
    return hasIntent || q.endsWith('?');
  }

  Map<String, dynamic> _recommendationToListingMap(_AiRecommendation recommendation) {
    return <String, dynamic>{
      'id': recommendation.id,
      'title': recommendation.title,
      'item_type': recommendation.itemType,
      'location': recommendation.location,
      'currency': recommendation.currency,
      'price': recommendation.price,
      'rating': recommendation.rating,
      'review_count': recommendation.reviewCount,
      'images': recommendation.imageUrl != null && recommendation.imageUrl!.isNotEmpty
          ? [recommendation.imageUrl]
          : const <String>[],
      'image_url': recommendation.imageUrl,
    };
  }

  Future<void> _openRecommendationDetails(_AiRecommendation recommendation) async {
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PropertyDetailsScreen(
          item: _recommendationToListingMap(recommendation),
          session: widget.session,
        ),
      ),
    );
  }

  Future<void> _addRecommendationToTripCart(_AiRecommendation recommendation, {bool goToCheckout = false}) async {
    if (_busy || recommendation.id.isEmpty) return;
    if (!widget.session.isAuthenticated) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_l.signInToSaveCart)),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      await widget.session.addListingToTripCart({
        'id': recommendation.id,
        'title': recommendation.title,
        'item_type': recommendation.itemType,
        'images': recommendation.imageUrl != null ? [recommendation.imageUrl] : const [],
        'location': recommendation.location,
      });

      setState(() {
        _messages.add(_ChatMsg(
          role: 'assistant',
          content: _l.savedToCartWithCheckout,
          actions: [
            _AiAction(type: 'open_url', label: _l.openTripCartAction, url: '/trip-cart', variant: 'secondary'),
            _AiAction(type: 'open_url', label: _l.goToCheckout, url: '/checkout?mode=cart', variant: 'primary'),
          ],
        ));
      });
      _scrollToBottom();

      if (goToCheckout) {
        await _runAction(_AiAction(type: 'open_url', label: _l.goToCheckout, url: '/checkout?mode=cart', variant: 'primary'));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Map<String, dynamic>? _resolveCheckoutItem({String? preferredReferenceId, String? preferredItemType}) {
    final cartItems = widget.session.payload?.tripCart ?? const <Map<String, dynamic>>[];
    if (cartItems.isEmpty) return null;
    final first = cartItems.cast<Map<String, dynamic>>().firstWhere(
      (item) {
        final ref = (item['property_id'] ?? item['tour_id'] ?? item['transport_id'] ?? item['reference_id'] ?? '').toString();
        final type = (item['item_type'] ?? 'property').toString();
        final refMatches = preferredReferenceId == null || preferredReferenceId.isEmpty || ref == preferredReferenceId;
        final typeMatches = preferredItemType == null || preferredItemType.isEmpty || type == preferredItemType;
        return refMatches && typeMatches;
      },
      orElse: () => cartItems.first,
    );
    final listings = widget.session.payload?.homeListings ?? const <Map<String, dynamic>>[];
    final ref = (first['property_id'] ?? first['tour_id'] ?? first['transport_id'] ?? first['reference_id'] ?? '').toString();
    final type = (first['item_type'] ?? 'property').toString();
    final matched = listings.cast<Map<String, dynamic>>().firstWhere(
      (listing) => listing['id']?.toString() == ref && listing['item_type']?.toString() == type,
      orElse: () => <String, dynamic>{},
    );
    return <String, dynamic>{...matched, ...first, 'id': ref, 'item_type': type};
  }

  Future<void> _executeServerAction(_AiAction action) async {
    final response = await http.post(
      _aiUri,
      headers: _aiHeaders(),
      body: jsonEncode({
        'action': action.type,
        'messages': _buildHistory(),
        'referenceId': action.referenceId,
        'itemType': action.itemType,
        'bookingId': action.bookingId,
        'orderId': action.orderId,
        'userId': widget.session.userId.isEmpty ? null : widget.session.userId,
        'sessionId': _sessionId,
        'channel': 'mobile',
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('server_action_failed');
    }

    final parsed = _parseAiResponse(jsonDecode(response.body) as Map<String, dynamic>);
    if (parsed.reply.isNotEmpty) {
      setState(() {
        _messages.add(_ChatMsg(
          role: 'assistant',
          content: parsed.reply,
          recommendations: parsed.recommendations,
          actions: parsed.actions,
        ));
      });
      _scrollToBottom();
    }
    await widget.session.refresh();
  }

  Future<void> _runAction(_AiAction action) async {
    if (_busy) return;

    // If actions are shown inside a dialog/bottom sheet, close it first so
    // navigation uses the root navigator and doesn't feel "stuck".
    if (mounted) {
      final navigator = Navigator.of(context, rootNavigator: true);
      if (navigator.canPop()) {
        navigator.pop();
      }
    }

    if (action.type == 'get_trip_cart') {
      await _runAction(_AiAction(type: 'open_url', label: _l.openTripCartAction, url: '/trip-cart'));
      return;
    }

    if (action.type == 'get_bookings') {
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => MyBookingsScreen(session: widget.session)),
      );
      return;
    }

    if (action.type == 'add_to_trip_cart' && action.referenceId != null && action.referenceId!.isNotEmpty) {
      await widget.session.addListingToTripCart({
        'id': action.referenceId,
        'item_type': action.itemType ?? 'property',
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_l.savedToCart)),
      );
      return;
    }

    if (action.type == 'open_url' && action.url == '/trip-cart') {
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => TripCartScreen(session: widget.session)),
      );
      return;
    }

    if (action.type == 'open_url' && ((action.url?.contains('/bookings') ?? false) || (action.url?.contains('/my-bookings') ?? false))) {
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => MyBookingsScreen(session: widget.session)),
      );
      return;
    }

    if (action.type == 'go_to_checkout') {
      await _runAction(_AiAction(
        type: 'open_url',
        label: action.label,
        url: '/checkout?mode=cart',
        referenceId: action.referenceId,
        itemType: action.itemType,
        variant: action.variant,
      ));
      return;
    }

    if (action.type == 'open_url' && (action.url?.startsWith('/checkout') ?? false)) {
      final checkoutItem = _resolveCheckoutItem(
        preferredReferenceId: action.referenceId,
        preferredItemType: action.itemType,
      );
      if (checkoutItem == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_l.addItemFirst)),
        );
        return;
      }
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CheckoutScreen(
            item: checkoutItem,
            guests: int.tryParse('${checkoutItem['quantity'] ?? 1}') ?? 1,
            session: widget.session,
          ),
        ),
      );
      return;
    }

    if (action.type == 'request_refund') {
      setState(() => _busy = true);
      try {
        await _executeServerAction(action);
      } catch (_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_l.couldNotSubmitRefund)),
        );
      } finally {
        if (mounted) setState(() => _busy = false);
      }

      return;
    }

    // Fallback: some server-driven actions aren't mapped to native routes.
    // Try executing them server-side; if that fails, surface a gentle message.
    if (action.type.isNotEmpty) {
      setState(() => _busy = true);
      try {
        await _executeServerAction(action);
      } catch (_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_l.actionNotAvailableYet(action.label))),
        );
      } finally {
        if (mounted) setState(() => _busy = false);
      }
      return;
    }
  }

  Future<void> _submitFeedback(String feedbackType, {String comment = ''}) async {
    if (_ratingBusy || _conversationFeedback != null) return;
    setState(() => _ratingBusy = true);
    try {
      final response = await http.post(
        _aiUri,
        headers: _aiHeaders(),
        body: jsonEncode({
          'action': 'rate_conversation',
          'feedbackType': feedbackType,
          'comment': comment,
          'userId': widget.session.userId.isEmpty ? null : widget.session.userId,
          'sessionId': _sessionId,
          'channel': 'mobile',
        }),
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        setState(() => _conversationFeedback = feedbackType);
        _feedbackController.clear();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_l.thanksFeedback)),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_l.couldNotSaveRating)),
      );
    } finally {
      if (mounted) setState(() => _ratingBusy = false);
    }
  }

  Future<void> _openFeedbackDialog(String feedbackType) async {
    _feedbackController.clear();
    final l = AppLocalizations.of(context)!;
    final action = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(feedbackType == 'up' ? l.whatWorkedWell : l.whatWasMissing),
        content: TextField(
          controller: _feedbackController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: l.optionalNote,
            border: const OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'skip'),
            child: Text(l.skipNote),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, 'submit'),
            child: Text(l.sendFeedback),
          ),
        ],
      ),
    );

    if (!mounted || action == null) return;
    if (action == 'skip') {
      await _submitFeedback(feedbackType);
      return;
    }
    await _submitFeedback(feedbackType, comment: _feedbackController.text);
  }

  Future<bool?> _askForConsent() async {
    final l = AppLocalizations.of(context)!;
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
        contentPadding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
        actionsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        title: Text(
          l.aiConsentTitle,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.black,
          ),
        ),
        content: Text(
          l.aiConsentBody,
          style: const TextStyle(
            fontSize: 14,
            height: 1.55,
            color: AppColors.hof,
          ),
        ),
        actions: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    side: const BorderSide(color: Color(0xFFE7E7E7)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    foregroundColor: AppColors.black,
                  ),
                  onPressed: () => Navigator.pop(ctx, false),
                  child: Text(l.cancel),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    backgroundColor: const Color(0xFF222222),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () => Navigator.pop(ctx, true),
                  child: Text(l.iAgree),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _scrollToPendingAssistantMessage() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final targetIndex = _pendingScrollToAssistantIndex;
      if (targetIndex == null) return;
      if (!_scrollController.hasClients) return;

      final key = _assistantMessageKeys[targetIndex];
      final ctx = key?.currentContext;
      if (ctx == null) {
        // If the widget isn't built yet, try again next frame.
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToPendingAssistantMessage());
        return;
      }

      final box = ctx.findRenderObject();
      if (box is! RenderBox) return;

      final listBox = context.findRenderObject();
      if (listBox is! RenderBox) return;

      final offsetInGlobal = box.localToGlobal(Offset.zero);
      final listInGlobal = listBox.localToGlobal(Offset.zero);
      final delta = offsetInGlobal.dy - listInGlobal.dy;

      final current = _scrollController.offset;
      final target = (current + delta - 8).clamp(
        _scrollController.position.minScrollExtent,
        _scrollController.position.maxScrollExtent,
      );

      _pendingScrollToAssistantIndex = null;
      _scrollController.animateTo(
        target,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    _l = AppLocalizations.of(context)!;
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 600;
    // On iPad, centering a narrow column can make the chat feel "missing" and
    // can end up visually hidden depending on safe-area/insets. Use full width.
    final maxContentWidth = double.infinity;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        bottom: true,
        child: Column(
          children: [
            _buildHeader(maxContentWidth, isWide),
            const SizedBox(height: 6),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _messages.isEmpty
                    ? _buildWelcome(maxContentWidth, isWide)
                    : _buildChat(maxContentWidth, isWide),
              ),
            ),
            _buildComposer(maxContentWidth, isWide),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(double maxContentWidth, bool isWide) {
    final l = AppLocalizations.of(context)!;
    final backButton = Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.linnen,
        borderRadius: BorderRadius.circular(14),
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        onPressed: widget.onBack,
        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: AppColors.black),
      ),
    );
    final sparkleButton = Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.linnen,
        borderRadius: BorderRadius.circular(14),
      ),
      child: const ImageIcon(
        AssetImage('assets/nav/ai.png'),
        color: AppColors.black,
        size: 18,
      ),
    );
    final titleCol = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l.merryAI, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.black, letterSpacing: -0.5)),
        const SizedBox(height: 2),
        Text(
          l.aiDesc,
          style: const TextStyle(fontSize: 12, color: AppColors.foggy, height: 1.25),
        ),
      ],
    );

    return Padding(
      padding: EdgeInsets.fromLTRB(isWide ? 28 : 16, isWide ? 16 : 8, isWide ? 28 : 16, 0),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxContentWidth),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: isWide
              // iPad: title left, buttons right — back button away from Stage Manager dots
              ? [
                  Expanded(child: titleCol),
                  const SizedBox(width: 10),
                  backButton,
                  const SizedBox(width: 8),
                  sparkleButton,
                ]
              // iPhone: back button left (no Stage Manager), sparkle right
              : [
                  Container(
                    width: 40,
                    height: 40,
                    margin: const EdgeInsets.only(right: 10),
                    decoration: BoxDecoration(color: AppColors.linnen, borderRadius: BorderRadius.circular(14)),
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      onPressed: widget.onBack,
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: AppColors.black),
                    ),
                  ),
                  Expanded(child: titleCol),
                  sparkleButton,
                ],
        ),
      ),
    );
  }

  Widget _buildComposer(double maxContentWidth, bool isWide) {
    final consentCopy = _consentedToAi
        ? _l.aiConsentGranted
        : _l.aiConsentNotice;

    return Padding(
      padding: EdgeInsets.fromLTRB(isWide ? 28 : 12, 8, isWide ? 28 : 12, 8),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxContentWidth),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFE7E7E7)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                Padding(
                  padding: const EdgeInsets.only(left: 4, right: 4, bottom: 8),
                  child: Text(
                    consentCopy,
                    style: const TextStyle(fontSize: 11, color: AppColors.foggy, height: 1.35),
                  ),
                ),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: InputDecoration(
                          hintText: _l.askMerryPlaceholder,
                          hintStyle: const TextStyle(color: AppColors.foggy, fontSize: 14),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
                        ),
                        textInputAction: TextInputAction.send,
                        onSubmitted: _send,
                        enabled: !_busy,
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => _send(_controller.text),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: _busy ? const Color(0xFFBDBDBD) : AppColors.rausch,
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: _busy
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.north_rounded, color: Colors.white, size: 20),
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcome(double maxWidth, bool isWide) {
    // On iPad use slightly smaller text and tighter spacing.
    final bodySize = isWide ? 13.0 : 14.0;
    final headSize = isWide ? 14.0 : 15.0;
    final subSize = isWide ? 11.0 : 12.0;

    return isWide
        ? SingleChildScrollView(
            key: const ValueKey('welcome'),
            child: Center(
              child: Padding(
                padding: EdgeInsets.fromLTRB(24, 48, 24, 32),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 680),
                  child: _buildWelcomeContent(isWide, bodySize, headSize, subSize),
                ),
              ),
            ),
          )
        : SingleChildScrollView(
            key: const ValueKey('welcome'),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: _buildWelcomeContent(isWide, bodySize, headSize, subSize),
          );
  }

  Widget _buildWelcomeContent(bool isWide, double bodySize, double headSize, double subSize) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2C2C2E) : const Color(0xFFEEEEEE);
    final activeBg = isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF5F5F7);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Greeting hero
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: cardBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.rausch.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: ImageIcon(
                    AssetImage('assets/nav/ai.png'),
                    color: AppColors.rausch,
                    size: 26,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _l.merryAI,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.black, letterSpacing: -0.3),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _l.askMerryHint,
                      style: TextStyle(fontSize: 13, color: AppColors.foggy, height: 1.4),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Quick actions grid
        Text(
          _l.whatCanIHelp,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.foggy),
        ),
        const SizedBox(height: 10),
        // Row 1
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _StarterCard(
                  title: _l.planATrip,
                  subtitle: _l.planATripDesc,
                  icon: Icons.map_outlined,
                  iconColor: const Color(0xFF2E7D32),
                  isWide: isWide,
                  isDark: isDark,
                  onTap: () => _send('Plan a trip for me.'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StarterCard(
                  title: _l.whatIsMerry,
                  subtitle: _l.whatIsMerryDesc,
                  icon: Icons.info_outline_rounded,
                  iconColor: const Color(0xFF1565C0),
                  isWide: isWide,
                  isDark: isDark,
                  onTap: () => _send('What is Merry360X and what can you help me book?'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        // Row 2
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _StarterCard(
                  title: _l.findCheapest,
                  subtitle: _l.findCheapestDesc,
                  icon: Icons.savings_outlined,
                  iconColor: const Color(0xFFD97706),
                  isWide: isWide,
                  isDark: isDark,
                  onTap: () => _send('Find the cheapest trip options you can recommend for me.'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StarterCard(
                  title: _l.askAboutMerry,
                  subtitle: _l.askAboutMerryDesc,
                  icon: Icons.chat_bubble_outline_rounded,
                  iconColor: const Color(0xFF7C3AED),
                  isWide: isWide,
                  isDark: isDark,
                  onTap: () => _send('Tell me about Merry360X and how to use it.'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Capabilities strip
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: activeBg,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Icon(Icons.auto_awesome_rounded, size: 16, color: AppColors.rausch),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _l.merryCapabilities,
                  style: TextStyle(fontSize: 12.5, color: AppColors.foggy, height: 1.45),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildChat(double maxWidth, bool isWide) {
    final shouldAskForRating = _conversationFeedback == null && _messages.any((message) => message.role == 'assistant');

    return ListView.builder(
      key: const ValueKey('chat'),
      controller: _scrollController,
      padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 8, isWide ? 24 : 16, 8),
      itemCount: _messages.length + (_busy ? 1 : 0) + (shouldAskForRating || _conversationFeedback != null ? 1 : 0),
      itemBuilder: (context, index) {
        if (_busy && index == _messages.length) {
          return _ThinkingCard(maxWidth: maxWidth);
        }

        if (index >= _messages.length + (_busy ? 1 : 0)) {
          return Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                    color: AppColors.linnen,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: _conversationFeedback != null
                    ? Row(
                        children: [
                          const Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
                          const SizedBox(width: 8),
                        Text(
                            _conversationFeedback == 'up' ? _l.feedbackSavedUp : _l.feedbackSavedDown,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_l.wasResponseHelpful, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          const SizedBox(height: 6),
                          Text(_l.feedbackPromptDesc, style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: _ratingBusy ? null : () => _openFeedbackDialog('up'),
                                    icon: const Text('👍'),
                                    label: Text(_l.helpful),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: _ratingBusy ? null : () => _openFeedbackDialog('down'),
                                    icon: const Text('👎'),
                                    label: Text(_l.needsWork),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          );
        }

        final message = _messages[index];
        final isUser = message.role == 'user';

        final assistantKey = !isUser
            ? (_assistantMessageKeys[index] ??= GlobalKey())
            : null;
        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    key: assistantKey,
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    constraints: BoxConstraints(maxWidth: maxWidth * 0.84),
                    decoration: BoxDecoration(
                      color: isUser ? const Color(0xFF222222) : AppColors.linnen,
                      borderRadius: BorderRadius.circular(22),
                      border: isUser ? null : Border.all(color: const Color(0xFFE9E9E9)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!isUser) ...[
                          Row(
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFE3E3E3)),
                                ),
                                child: const ImageIcon(
                                  AssetImage('assets/nav/ai.png'),
                                  size: 12,
                                  color: AppColors.black,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(_l.merryAI, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.black)),
                            ],
                          ),
                          const SizedBox(height: 10),
                        ],
                        Text(
                          message.content,
                          style: TextStyle(color: isUser ? Colors.white : AppColors.black, fontSize: 14, height: 1.5),
                        ),
                      ],
                    ),
                  ),
                ),
                if (!isUser && message.recommendations.isNotEmpty) ...[
                  ...message.recommendations.map((recommendation) => _RecommendationCard(
                        recommendation: recommendation,
                        onOpen: () => _openRecommendationDetails(recommendation),
                        onAdd: () => _addRecommendationToTripCart(recommendation),
                        onCheckout: () => _addRecommendationToTripCart(recommendation, goToCheckout: true),
                      )),
                ],
                if (!isUser && message.actions.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  ...message.actions.map(
                    (action) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: SizedBox(
                        width: double.infinity,
                        child: _ActionChip(action: action, onTap: () => _runAction(action)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ChatMsg {
  const _ChatMsg({required this.role, required this.content, this.recommendations = const [], this.actions = const []});

  final String role;
  final String content;
  final List<_AiRecommendation> recommendations;
  final List<_AiAction> actions;
}

class _AiRecommendation {
  const _AiRecommendation({
    required this.id,
    required this.title,
    required this.itemType,
    this.location,
    this.currency,
    this.price,
    this.rating,
    this.reviewCount,
    this.imageUrl,
  });

  final String id;
  final String title;
  final String itemType;
  final String? location;
  final String? currency;
  final double? price;
  final double? rating;
  final int? reviewCount;
  final String? imageUrl;
}

class _AiAction {
  const _AiAction({
    required this.type,
    required this.label,
    this.referenceId,
    this.itemType,
    this.bookingId,
    this.orderId,
    this.url,
    this.variant,
  });

  final String type;
  final String label;
  final String? referenceId;
  final String? itemType;
  final String? bookingId;
  final String? orderId;
  final String? url;
  final String? variant;
}

class _ParsedAiResponse {
  const _ParsedAiResponse({required this.reply, required this.recommendations, required this.actions});

  final String reply;
  final List<_AiRecommendation> recommendations;
  final List<_AiAction> actions;
}

class _ThinkingCard extends StatelessWidget {
  const _ThinkingCard({required this.maxWidth});

  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.linnen,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE3E3E3)),
                ),
                child: const ImageIcon(
                  AssetImage('assets/nav/ai.png'),
                  color: AppColors.black,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(l.merryIsThinking, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              const SizedBox(width: 8),
              const SizedBox(width: 8, height: 8, child: CircularProgressIndicator(strokeWidth: 2)),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({required this.recommendation, required this.onOpen, required this.onAdd, required this.onCheckout});

  final _AiRecommendation recommendation;
  final VoidCallback onOpen;
  final VoidCallback onAdd;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final price = recommendation.price != null && recommendation.price! > 0
        ? '${recommendation.price!.round()} ${recommendation.currency ?? 'RWF'}'
        : l.priceOnRequest;
    final typeLabel = switch (recommendation.itemType) {
      'tour' => l.tourLabel,
      'tour_package' => l.tourPackageLabel,
      'transport_vehicle' => l.transport,
      _ => l.stayLabel,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFEAEAEA)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: recommendation.imageUrl != null && recommendation.imageUrl!.isNotEmpty
                      ? Image.network(
                          recommendation.imageUrl!,
                          height: 90,
                          width: 90,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(
                            height: 90,
                            width: 90,
                            color: AppColors.linnen,
                            alignment: Alignment.center,
                            child: const Icon(Icons.image_outlined, color: AppColors.foggy),
                          ),
                        )
                      : Container(
                          height: 90,
                          width: 90,
                          color: AppColors.linnen,
                          alignment: Alignment.center,
                          child: const Icon(Icons.image_outlined, color: AppColors.foggy),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.linnen,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          typeLabel,
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.hof),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        recommendation.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.black),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        recommendation.location ?? l.locationNotSpecified,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppColors.foggy),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(child: Text(price, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13))),
                          if (recommendation.rating != null && recommendation.rating! > 0)
                            Text('★ ${recommendation.rating!.toStringAsFixed(1)}', style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: OutlinedButton(onPressed: onOpen, child: Text(l.details))),
                const SizedBox(width: 8),
                Expanded(child: OutlinedButton(onPressed: onAdd, child: Text(l.addToCart))),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(width: double.infinity, child: FilledButton(onPressed: onCheckout, child: Text(l.checkoutAction))),
          ],
        ),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({required this.action, required this.onTap});

  final _AiAction action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return action.variant == 'primary'
        ? FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF222222),
              foregroundColor: Colors.white,
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: onTap,
            child: Text(action.label),
          )
        : OutlinedButton(
            style: OutlinedButton.styleFrom(
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              minimumSize: const Size.fromHeight(50),
              side: const BorderSide(color: Color(0xFFE4E4E4)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: onTap,
            child: Text(action.label),
          );
  }
}

class _StarterCard extends StatelessWidget {
  const _StarterCard({
    required this.title,
    required this.subtitle,
    this.onTap,
    this.isWide = false,
    this.isDark = false,
    this.icon,
    this.iconColor,
  });

  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final bool isWide;
  final bool isDark;
  final IconData? icon;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final cardBg = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2C2C2E) : const Color(0xFFEEEEEE);
    final iconBg = iconColor?.withValues(alpha: isDark ? 0.2 : 0.12) ?? AppColors.rausch.withValues(alpha: 0.12);
    final effectiveIcon = iconColor ?? AppColors.rausch;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(isWide ? 12 : 14),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cardBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: effectiveIcon),
              ),
              const SizedBox(height: 10),
            ],
            Text(
              title,
              style: TextStyle(
                fontSize: isWide ? 12.5 : 13.5,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: isWide ? 11.0 : 12.0,
                color: AppColors.foggy,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
