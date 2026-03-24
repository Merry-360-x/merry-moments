import 'dart:convert';

import 'package:flutter/material.dart';
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
  final _scrollController = ScrollController();
  final List<_ChatMsg> _messages = [];
  bool _busy = false;
  bool _consentedToAi = false;

  @override
  void dispose() {
    _controller.dispose();
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
      final history = _messages
          .map((m) => {'role': m.role, 'content': m.content})
          .toList();
      final uri = Uri.parse('${AppConfig.apiBaseUrl.replaceAll('/api', '')}/api/ai-trip-advisor');
      final response = await http.post(
        uri,
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'messages': history}),
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
                  const Text('Merry AI', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF202025))),
                  const Spacer(),
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0x1AE2555A),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(Icons.auto_awesome, color: Color(0xFFE2555A), size: 18),
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
        SafeArea(
          top: false,
          child: Padding(
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
                        style: const TextStyle(fontSize: 11, color: Color(0xFF7B7B86)),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFE7E7EC)),
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
                                hintStyle: TextStyle(color: Color(0xFF91919C), fontSize: 14),
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
                              backgroundColor: _busy ? const Color(0xFFCCCCD0) : const Color(0xFFE2555A),
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
                style: TextStyle(color: Color(0xFF7B7B86), fontSize: 13),
              ),
              const SizedBox(height: 14),
              const Text('Try asking:', style: TextStyle(fontSize: 13, color: Color(0xFF7B7B86), fontWeight: FontWeight.w500)),
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
                  border: Border.all(color: const Color(0xFFE7E7EC)),
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
    return ListView.builder(
      controller: _scrollController,
      padding: EdgeInsets.fromLTRB(isWide ? 24 : 16, 8, isWide ? 24 : 16, 8),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
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
                  color: isUser ? const Color(0xFFE2555A) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: isUser ? null : Border.all(color: const Color(0xFFE7E7EC)),
                ),
                child: Text(
                  msg.content,
                  style: TextStyle(
                    color: isUser ? Colors.white : const Color(0xFF202025),
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
