import 'dart:convert';

import 'package:flutter/material.dart';

import '../../app.dart';
import 'package:http/http.dart' as http;

import '../../config.dart';
import '../../session_controller.dart';

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
      final recentMessages = _messages.length <= 3
          ? List<_ChatMsg>.from(_messages)
          : _messages.sublist(_messages.length - 3);
      final history = recentMessages
          .map((m) {
            final compact = m.content.trim();
            return {
              'role': m.role,
              'content': compact.length > 160 ? compact.substring(0, 160) : compact,
            };
          })
          .toList();
      final uri = Uri.parse('${AppConfig.apiBaseUrl.replaceAll('/api', '')}/api/ai-trip-advisor');
      final response = await http.post(
        uri,
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'messages': history,
          'userId': widget.session.userId.isEmpty ? null : widget.session.userId,
          'sessionId': _sessionId,
          'channel': 'mobile',
        }),
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final reply = (json['reply'] ?? json['message'] ?? '').toString();
        if (reply.isNotEmpty) {
          setState(() => _messages.add(_ChatMsg(role: 'assistant', content: reply)));
        }
      } else {
        setState(() => _messages.add(_ChatMsg(
          role: 'assistant',
          content: 'Sorry, I could not process that request right now. Please try again.',
        )));
      }
    } catch (_) {
      setState(() => _messages.add(_ChatMsg(
        role: 'assistant',
        content: 'Network error. Please check your connection and try again.',
      )));
    } finally {
      setState(() => _busy = false);
      _scrollToBottom();
    }
  }

  Future<void> _submitFeedback(String feedbackType, {String comment = ''}) async {
    if (_ratingBusy || _conversationFeedback != null) return;
    setState(() => _ratingBusy = true);
    try {
      final uri = Uri.parse('${AppConfig.apiBaseUrl.replaceAll('/api', '')}/api/ai-trip-advisor');
      final response = await http.post(
        uri,
        headers: const {'Content-Type': 'application/json'},
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
    final isWide = screenWidth > 600; // iPad-class
    final maxContentWidth = isWide ? 640.0 : double.infinity;

    return Column(
      children: [
        // Header
        Padding(
          padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 16, isWide ? 24 : 16, 0),
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxContentWidth),
              child: Row(
                children: [
                  const Text('Merry AI', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.black)),
                  const Spacer(),
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.rausch.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.auto_awesome, color: AppColors.rausch, size: 18),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),

        // Messages area
        Expanded(
          child: _messages.isEmpty ? _buildWelcome(maxContentWidth, isWide) : _buildChat(maxContentWidth, isWide),
        ),

        // Input bar
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
                            ? 'AI consent granted. You can ask travel questions.'
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
                                hintText: 'Ask about places, tours, packages...',
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
                'Travel assistant for stays, tours and transport',
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
                  _PromptChip(label: 'Airport transport options', onTap: () => _send('Airport transport options')),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(16),
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
                      'Hi! I am Merry AI, your personal travel assistant.',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'I can help you find stays, compare prices, and plan your itinerary.',
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
    final shouldAskForRating = _conversationFeedback == null &&
        _messages.any((msg) => msg.role == 'assistant');

    return ListView.builder(
      controller: _scrollController,
      padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 8, isWide ? 24 : 16, 8),
      itemCount: _messages.length + (shouldAskForRating || _conversationFeedback != null ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= _messages.length) {
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

        final msg = _messages[index];
        final isUser = msg.role == 'user';
        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Align(
              alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                constraints: BoxConstraints(maxWidth: maxWidth * 0.8),
                decoration: BoxDecoration(
                  color: isUser ? AppColors.rausch : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: isUser ? null : Border.all(color: const Color(0xFFEBEBEB)),
                ),
                child: Text(
                  msg.content,
                  style: TextStyle(
                        color: isUser ? Colors.white : AppColors.black,
                    fontSize: 14,
                  ),
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
  _ChatMsg({required this.role, required this.content});
  final String role;
  final String content;
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
