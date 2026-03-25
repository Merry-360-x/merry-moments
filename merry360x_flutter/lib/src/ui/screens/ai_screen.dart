import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../app.dart';
import '../../config.dart';
import '../../session_controller.dart';
import 'checkout_screen.dart';
import 'trip_cart_screen.dart';

class AiScreen extends StatefulWidget {
  const AiScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<AiScreen> createState() => _AiScreenState();
}

class _AiScreenState extends State<AiScreen> {
  final _controller = TextEditingController();
  final _feedbackController = TextEditingController();
  final _scrollController = ScrollController();
  final List<_ChatMsg> _messages = [];
  final String _sessionId = 'mobile_${DateTime.now().millisecondsSinceEpoch}';
  bool _busy = false;
  bool _consentedToAi = false;
  bool _ratingBusy = false;
  String? _conversationFeedback;

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
      final recentMessages = _messages.length <= 6
          ? List<_ChatMsg>.from(_messages)
          : _messages.sublist(_messages.length - 6);
      final history = recentMessages
          .map((message) {
            final compact = message.content.trim();
            return {
              'role': message.role,
              'content': compact.length > 260 ? compact.substring(0, 260) : compact,
            };
          })
          .toList();
      final uri = Uri.parse('${AppConfig.apiBaseUrl.replaceAll('/api', '')}/api/ai-trip-advisor');
      final headers = <String, String>{'Content-Type': 'application/json'};
      final accessToken = widget.session.accessToken;
      if (accessToken != null && accessToken.isNotEmpty) {
        headers['Authorization'] = 'Bearer $accessToken';
      }

      final response = await http.post(
        uri,
        headers: headers,
        body: jsonEncode({
          'messages': history,
          'userId': widget.session.userId.isEmpty ? null : widget.session.userId,
          'sessionId': _sessionId,
          'channel': 'mobile',
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
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
        }
      } else {
        setState(() {
          _messages.add(const _ChatMsg(
            role: 'assistant',
            content: 'Sorry, I could not process that request right now. Please try again.',
          ));
        });
      }
    } catch (_) {
      setState(() {
        _messages.add(const _ChatMsg(
          role: 'assistant',
          content: 'Network error. Please check your connection and try again.',
        ));
      });
    } finally {
      if (mounted) setState(() => _busy = false);
      _scrollToBottom();
    }
  }

  _ParsedAiResponse _parseAiResponse(Map<String, dynamic> json) {
    final recommendations = ((json['recommendations'] as List?) ?? const [])
        .whereType<Map>()
        .map((item) => _AiRecommendation(
              id: (item['id'] ?? '').toString(),
              title: (item['title'] ?? 'Untitled').toString(),
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

    final actions = ((json['actions'] as List?) ?? const [])
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

  Future<void> _addRecommendationToTripCart(_AiRecommendation recommendation, {bool goToCheckout = false}) async {
    if (_busy || recommendation.id.isEmpty) return;
    if (!widget.session.isAuthenticated) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sign in first to save items to your trip cart.')),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      await widget.session.addListingToTripCart({
        'id': recommendation.id,
        'title': recommendation.title,
        'item_type': 'property',
        'images': recommendation.imageUrl != null ? [recommendation.imageUrl] : const [],
        'location': recommendation.location,
      });

      setState(() {
        _messages.add(const _ChatMsg(
          role: 'assistant',
          content: 'Saved to your Trip Cart. You can review it now or continue into checkout.',
          actions: [
            _AiAction(type: 'open_url', label: 'Open Trip Cart', url: '/trip-cart', variant: 'secondary'),
            _AiAction(type: 'open_url', label: 'Go to Checkout', url: '/checkout?mode=cart', variant: 'primary'),
          ],
        ));
      });
      _scrollToBottom();

      if (goToCheckout) {
        await _runAction(const _AiAction(type: 'open_url', label: 'Go to Checkout', url: '/checkout?mode=cart', variant: 'primary'));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Map<String, dynamic>? _resolveCheckoutItem() {
    final cartItems = widget.session.payload?.tripCart ?? const <Map<String, dynamic>>[];
    if (cartItems.isEmpty) return null;
    final first = cartItems.first;
    final listings = widget.session.payload?.homeListings ?? const <Map<String, dynamic>>[];
    final ref = (first['property_id'] ?? first['tour_id'] ?? first['transport_id'] ?? first['reference_id'] ?? '').toString();
    final type = (first['item_type'] ?? 'property').toString();
    final matched = listings.cast<Map<String, dynamic>>().firstWhere(
      (listing) => listing['id']?.toString() == ref && listing['item_type']?.toString() == type,
      orElse: () => <String, dynamic>{},
    );
    return <String, dynamic>{...matched, ...first};
  }

  Future<void> _runAction(_AiAction action) async {
    if (action.type == 'open_url' && action.url == '/trip-cart') {
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => TripCartScreen(session: widget.session)),
      );
      return;
    }

    if (action.type == 'open_url' && (action.url?.startsWith('/checkout') ?? false)) {
      final checkoutItem = _resolveCheckoutItem();
      if (checkoutItem == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Add an item to your trip cart before checkout.')),
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
    }
  }

  Future<void> _submitFeedback(String feedbackType, {String comment = ''}) async {
    if (_ratingBusy || _conversationFeedback != null) return;
    setState(() => _ratingBusy = true);
    try {
      final uri = Uri.parse('${AppConfig.apiBaseUrl.replaceAll('/api', '')}/api/ai-trip-advisor');
      final headers = <String, String>{'Content-Type': 'application/json'};
      final accessToken = widget.session.accessToken;
      if (accessToken != null && accessToken.isNotEmpty) {
        headers['Authorization'] = 'Bearer $accessToken';
      }
      final response = await http.post(
        uri,
        headers: headers,
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
          const SnackBar(content: Text('Thanks for sharing AI feedback.')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not save rating right now.')),
      );
    } finally {
      if (mounted) setState(() => _ratingBusy = false);
    }
  }

  Future<void> _openFeedbackDialog(String feedbackType) async {
    _feedbackController.clear();
    final action = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(feedbackType == 'up' ? 'What worked well?' : 'What was missing?'),
        content: TextField(
          controller: _feedbackController,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Optional note',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'skip'),
            child: const Text('Skip note'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, 'submit'),
            child: const Text('Send feedback'),
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
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('AI Consent'),
        content: const Text(
          'Your prompt text will be sent to our AI provider to generate responses. '
          'Do not include sensitive personal data.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('I Agree'),
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

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 600;
    final maxContentWidth = isWide ? 720.0 : double.infinity;

    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFF5F2), Color(0xFFFFFFFF)],
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 16, isWide ? 24 : 16, 0),
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: Row(
                  children: [
                    const Text('Merry', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: AppColors.black)),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'AI concierge for planning, trip cart, and checkout',
                        style: TextStyle(fontSize: 12, color: AppColors.foggy),
                      ),
                    ),
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0.94, end: 1),
                      duration: const Duration(milliseconds: 1800),
                      curve: Curves.easeInOut,
                      builder: (context, value, child) => Transform.scale(scale: value, child: child),
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFFFF5A5F), Color(0xFFFF9F43)]),
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: const [
                            BoxShadow(color: Color(0x30FF5A5F), blurRadius: 16, offset: Offset(0, 8)),
                          ],
                        ),
                        child: const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: _messages.isEmpty ? _buildWelcome(maxContentWidth, isWide) : _buildChat(maxContentWidth, isWide),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(isWide ? 24 : 12, 8, isWide ? 24 : 12, 8),
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 6),
                      child: Text(
                        _consentedToAi
                            ? 'AI consent granted. Merry can help with planning, cart, and checkout.'
                            : 'Before first use, you will be asked to consent to AI processing.',
                        style: const TextStyle(fontSize: 11, color: AppColors.foggy),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFEBEBEB)),
                        boxShadow: const [
                          BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4)),
                        ],
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _controller,
                              decoration: const InputDecoration(
                                hintText: 'Ask Merry about apartments, tours, airport pickup...',
                                hintStyle: TextStyle(color: AppColors.foggy, fontSize: 14),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                              ),
                              textInputAction: TextInputAction.send,
                              onSubmitted: _send,
                              enabled: !_busy,
                            ),
                          ),
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: () => _send(_controller.text),
                            child: CircleAvatar(
                              radius: 18,
                              backgroundColor: _busy ? AppColors.hackberry : AppColors.rausch,
                              child: _busy
                                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.arrow_upward, color: Colors.white, size: 18),
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
        ],
      ),
    );
  }

  Widget _buildWelcome(double maxWidth, bool isWide) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 8, isWide ? 24 : 16, 16),
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Merry can help you plan, save items to Trip Cart, and guide you into checkout.',
                style: TextStyle(color: AppColors.foggy, fontSize: 13),
              ),
              const SizedBox(height: 14),
              const Text('Try asking:', style: TextStyle(fontSize: 13, color: AppColors.foggy, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _PromptChip(label: 'Cheapest stay in Kigali', onTap: () => _send('Cheapest stay in Kigali')),
                  _PromptChip(label: 'Family-friendly stays', onTap: () => _send('Family-friendly stays')),
                  _PromptChip(label: '2-day Rwanda tour plan', onTap: () => _send('2-day Rwanda tour plan')),
                  _PromptChip(label: 'Apartment with airport pickup', onTap: () => _send('I need an apartment with airport pickup')),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFEBEBEB)),
                  boxShadow: const [
                    BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4)),
                  ],
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hi! I am Merry, your travel assistant.',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'I help you move faster from discovery to booking. Ask for a stay, tour, airport pickup, trip cart status, or checkout help.',
                      style: TextStyle(color: Color(0xFF71717A)),
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

  Widget _buildChat(double maxWidth, bool isWide) {
    final shouldAskForRating = _conversationFeedback == null && _messages.any((message) => message.role == 'assistant');

    return ListView.builder(
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
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFEBEBEB)),
                ),
                child: _conversationFeedback != null
                    ? Row(
                        children: [
                          const Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'Feedback saved: ${_conversationFeedback == 'up' ? 'thumbs up' : 'thumbs down'}',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Was this response helpful?', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          const SizedBox(height: 6),
                          const Text('Choose thumbs up or down, then add an optional note.', style: TextStyle(fontSize: 12, color: AppColors.foggy)),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              OutlinedButton.icon(
                                onPressed: _ratingBusy ? null : () => _openFeedbackDialog('up'),
                                icon: const Text('👍'),
                                label: const Text('Helpful'),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton.icon(
                                onPressed: _ratingBusy ? null : () => _openFeedbackDialog('down'),
                                icon: const Text('👎'),
                                label: const Text('Needs work'),
                              ),
                            ],
                          ),
                        ],
                      ),
              ),
            ),
          );
        }

        final message = _messages[index];
        final isUser = message.role == 'user';
        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Align(
              alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                constraints: BoxConstraints(maxWidth: maxWidth * 0.84),
                decoration: BoxDecoration(
                  color: isUser ? AppColors.black : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: isUser ? null : Border.all(color: const Color(0xFFEBEBEB)),
                  boxShadow: const [BoxShadow(color: Color(0x0E000000), blurRadius: 12, offset: Offset(0, 4))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      message.content,
                      style: TextStyle(color: isUser ? Colors.white : AppColors.black, fontSize: 14),
                    ),
                    if (!isUser && message.recommendations.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      ...message.recommendations.map((recommendation) => _RecommendationCard(
                            recommendation: recommendation,
                            onAdd: () => _addRecommendationToTripCart(recommendation),
                            onCheckout: () => _addRecommendationToTripCart(recommendation, goToCheckout: true),
                          )),
                    ],
                    if (!isUser && message.actions.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: message.actions
                            .map((action) => _ActionChip(action: action, onTap: () => _runAction(action)))
                            .toList(),
                      ),
                    ],
                  ],
                ),
              ),
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
    this.location,
    this.currency,
    this.price,
    this.rating,
    this.reviewCount,
    this.imageUrl,
  });

  final String id;
  final String title;
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
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFEBEBEB)),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFFFF5A5F), Color(0xFFFF9F43)]),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text('Merry is thinking...', style: TextStyle(fontWeight: FontWeight.w600)),
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
  const _RecommendationCard({required this.recommendation, required this.onAdd, required this.onCheckout});

  final _AiRecommendation recommendation;
  final VoidCallback onAdd;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final price = recommendation.price != null && recommendation.price! > 0
        ? '${recommendation.price!.round()} ${recommendation.currency ?? 'RWF'}'
        : 'Price on request';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBFA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF0E1DD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (recommendation.imageUrl != null && recommendation.imageUrl!.isNotEmpty)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Image.network(
                recommendation.imageUrl!,
                height: 92,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  height: 92,
                  color: const Color(0xFFF2F2F5),
                  alignment: Alignment.center,
                  child: const Icon(Icons.image_outlined, color: AppColors.foggy),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(recommendation.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 4),
                Text(recommendation.location ?? 'Location not specified', style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(child: Text(price, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12))),
                    if (recommendation.rating != null && recommendation.rating! > 0)
                      Text('★ ${recommendation.rating!.toStringAsFixed(1)}', style: const TextStyle(fontSize: 12, color: AppColors.foggy)),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton(onPressed: onAdd, child: const Text('Add to Trip Cart')),
                    FilledButton(onPressed: onCheckout, child: const Text('Checkout')),
                  ],
                ),
              ],
            ),
          ),
        ],
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
        ? FilledButton(onPressed: onTap, child: Text(action.label))
        : OutlinedButton(onPressed: onTap, child: Text(action.label));
  }
}

class _PromptChip extends StatelessWidget {
  const _PromptChip({required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE4E4E9)),
        ),
        child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
