import 'dart:async';

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../session_controller.dart';
import '../../../l10n/app_localizations.dart';
import '../utils/app_snackbar.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({
    super.key,
    required this.session,
    this.initialPeerId,
    this.initialPeerDisplayName,
    this.autoOpenInitialThread = false,
  });

  final SessionController session;
  final String? initialPeerId;
  final String? initialPeerDisplayName;
  final bool autoOpenInitialThread;

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  List<Map<String, dynamic>> _conversations = const [];
  bool _loading = true;
  String? _error;
  String _lastUserId = '';
  bool _initialThreadOpened = false;

  @override
  void initState() {
    super.initState();
    _lastUserId = widget.session.userId;
    widget.session.addListener(_onSessionChanged);
    unawaited(_loadConversations());
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    final nextUserId = widget.session.userId;
    if (nextUserId == _lastUserId) return;
    _lastUserId = nextUserId;
    _initialThreadOpened = false;
    unawaited(_loadConversations());
  }

  Future<void> _loadConversations({bool silent = false}) async {
    if (!widget.session.isAuthenticated) {
      if (!mounted) return;
      setState(() {
        _conversations = const [];
        _loading = false;
        _error = null;
      });
      return;
    }

    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final conversations = await widget.session.fetchDirectConversations();
      if (!mounted) return;
      setState(() {
        _conversations = conversations;
        _loading = false;
        _error = null;
      });

      if (!_initialThreadOpened && widget.autoOpenInitialThread) {
        final peerId = (widget.initialPeerId ?? '').trim();
        if (peerId.isNotEmpty) {
          _initialThreadOpened = true;
          await _openConversation(
            peerId,
            peerDisplayName: widget.initialPeerDisplayName,
          );
        }
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _conversations = const [];
        _loading = false;
        _error = _cleanError(error);
      });
    }
  }

  String _cleanError(Object error) {
    return error.toString().replaceFirst('Exception: ', '').trim();
  }

  Future<void> _openConversation(
    String peerId, {
    String? peerDisplayName,
  }) async {
    if (peerId.trim().isEmpty) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DirectMessageThreadScreen(
          session: widget.session,
          peerId: peerId,
          peerDisplayName: peerDisplayName,
        ),
      ),
    );
    if (!mounted) return;
    await _loadConversations(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final session = widget.session;

    if (!session.isAuthenticated) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        children: [
          Text(
            l.messages,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 12),
          _InfoCard(
            title: l.connectYourAccount,
            subtitle: l.signInToMessage,
          ),
        ],
      );
    }

    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.rausch),
      );
    }

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: () => _loadConversations(silent: true),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  l.messages,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: AppColors.black,
                  ),
                ),
              ),
              IconButton(
                tooltip: l.refreshMessages,
                icon: const Icon(Icons.refresh_outlined, color: AppColors.foggy),
                onPressed: () => unawaited(_loadConversations(silent: true)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _InfoCard(
            title: l.safetyFirst,
            subtitle: l.safetyDesc,
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            _InfoCard(title: l.couldNotLoadConversations, subtitle: _error!),
          ],
          const SizedBox(height: 12),
          if (_conversations.isEmpty)
            _InfoCard(
              title: l.noConversationsYet,
              subtitle: l.openPropertyToMessage,
            )
          else
            ..._conversations.map((conversation) {
              final peerId = (conversation['peer_id'] ?? '').toString();
              final peerProfile = conversation['peer_profile'];
              final profile =
                  peerProfile is Map ? Map<String, dynamic>.from(peerProfile) : null;
              final peerName =
                  _resolvePeerName(profile) ?? 'Host';
              final lastMessage =
                  (conversation['last_message'] ?? '').toString().trim();
              final lastMessageAt =
                  (conversation['last_message_at'] ?? '').toString();
              final unreadCount =
                  ((conversation['unread_count'] as num?)?.toInt() ?? 0);

              return _ConversationTile(
                peerName: peerName,
                lastMessage: lastMessage,
                lastMessageAt: lastMessageAt,
                unreadCount: unreadCount,
                avatarUrl: profile?['avatar_url']?.toString(),
                onTap: () => _openConversation(
                  peerId,
                  peerDisplayName: peerName,
                ),
              );
            }),
        ],
      ),
    );
  }

  String? _resolvePeerName(Map<String, dynamic>? profile) {
    if (profile == null) return null;
    final nickname = (profile['nickname'] ?? '').toString().trim();
    if (nickname.isNotEmpty) return nickname;
    final fullName = (profile['full_name'] ?? '').toString().trim();
    if (fullName.isNotEmpty) return fullName;
    return null;
  }
}

class DirectMessageThreadScreen extends StatefulWidget {
  const DirectMessageThreadScreen({
    super.key,
    required this.session,
    required this.peerId,
    this.peerDisplayName,
  });

  final SessionController session;
  final String peerId;
  final String? peerDisplayName;

  @override
  State<DirectMessageThreadScreen> createState() =>
      _DirectMessageThreadScreenState();
}

class _DirectMessageThreadScreenState extends State<DirectMessageThreadScreen> {
  final TextEditingController _composer = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<Map<String, dynamic>> _messages = const [];
  Map<String, dynamic>? _peerProfile;
  bool _loading = true;
  bool _sending = false;
  String? _error;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    unawaited(_bootstrap());
    _pollTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (!mounted || _sending) return;
      unawaited(_loadMessages(silent: true));
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _composer.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    await Future.wait([
      _loadPeerProfile(),
      _loadMessages(),
    ]);
  }

  Future<void> _loadPeerProfile() async {
    try {
      final profile =
          await widget.session.fetchPublicProfile(userId: widget.peerId);
      if (!mounted) return;
      setState(() {
        _peerProfile = profile;
      });
    } catch (_) {}
  }

  Future<void> _loadMessages({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final beforeLastId =
          _messages.isNotEmpty ? _messages.last['id']?.toString() : null;
      final rows =
          await widget.session.fetchDirectMessages(peerId: widget.peerId);
      if (!mounted) return;

      final nextLastId = rows.isNotEmpty ? rows.last['id']?.toString() : null;
      setState(() {
        _messages = rows;
        _loading = false;
        _error = null;
      });

      final hasNewTail = nextLastId != null && nextLastId != beforeLastId;
      if (hasNewTail || !silent) {
        _scrollToBottom();
      }

      await widget.session.markDirectConversationRead(peerId: widget.peerId);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _cleanError(error);
      });
    }
  }

  Future<void> _send() async {
    if (_sending) return;
    final text = _composer.text.trim();
    final validationError = SessionController.validateDirectMessage(text);
    if (validationError != null) {
      AppSnackBar.error(context, validationError);
      return;
    }

    setState(() => _sending = true);
    try {
      await widget.session.sendDirectMessage(
        recipientId: widget.peerId,
        body: text,
      );
      _composer.clear();
      await _loadMessages(silent: true);
    } catch (error) {
      if (!mounted) return;
      AppSnackBar.error(context, _cleanError(error));
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  String _cleanError(Object error) {
    return error.toString().replaceFirst('Exception: ', '').trim();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  String get _peerName {
    final nickname = (_peerProfile?['nickname'] ?? '').toString().trim();
    if (nickname.isNotEmpty) return nickname;
    final fullName = (_peerProfile?['full_name'] ?? '').toString().trim();
    if (fullName.isNotEmpty) return fullName;
    final fallback = (widget.peerDisplayName ?? '').trim();
    if (fallback.isNotEmpty) return fallback;
    return 'Host';
  }

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
          _peerName,
          style: const TextStyle(
            color: AppColors.black,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _buildMessagesBody(),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _composer,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.newline,
                      decoration: InputDecoration(
                        hintText: l.typeYourMessage,
                        hintStyle: const TextStyle(color: AppColors.hackberry),
                        filled: true,
                        fillColor: AppColors.surfaceSubtle,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _sending ? null : _send,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.rausch,
                      minimumSize: const Size(48, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: _sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.white,
                            ),
                          )
                        : const Icon(Icons.send_rounded, color: AppColors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesBody() {
    final l = AppLocalizations.of(context)!;
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.rausch),
      );
    }

    if (_error != null && _messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: _InfoCard(
            title: l.couldNotLoadChat,
            subtitle: _error!,
          ),
        ),
      );
    }

    if (_messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: _InfoCard(
            title: l.startTheConversation,
            subtitle:
                'Send your first message to $_peerName. Keep messages on Merry360x for your safety.',
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: () => _loadMessages(silent: true),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
        itemCount: _messages.length,
        itemBuilder: (context, index) {
          final message = _messages[index];
          final senderId = (message['sender_id'] ?? '').toString();
          final isMine = senderId == widget.session.userId;
          final text = (message['body'] ?? '').toString();
          final createdAt = (message['created_at'] ?? '').toString();

          return Align(
            alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.74,
              ),
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
              decoration: BoxDecoration(
                color: isMine ? AppColors.rausch : AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment:
                    isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  Text(
                    text,
                    style: TextStyle(
                      color: isMine ? AppColors.white : AppColors.black,
                      fontSize: 14,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatTime(createdAt),
                    style: TextStyle(
                      color: isMine
                          ? const Color(0xFFFFD8DF)
                          : AppColors.hackberry,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _formatTime(String isoString) {
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return '';
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final minute = dt.minute.toString().padLeft(2, '0');
    final meridiem = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $meridiem';
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({
    required this.peerName,
    required this.lastMessage,
    required this.lastMessageAt,
    required this.unreadCount,
    required this.avatarUrl,
    required this.onTap,
  });

  final String peerName;
  final String lastMessage;
  final String lastMessageAt;
  final int unreadCount;
  final String? avatarUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            _Avatar(peerName: peerName, avatarUrl: avatarUrl),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    peerName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.black,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    lastMessage.isEmpty ? l.noMessageYet : lastMessage,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.foggy,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatShortDate(lastMessageAt),
                  style: const TextStyle(fontSize: 11, color: AppColors.hackberry),
                ),
                const SizedBox(height: 6),
                if (unreadCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.rausch,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      unreadCount > 9 ? '9+' : '$unreadCount',
                      style: const TextStyle(
                        color: AppColors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatShortDate(String isoString) {
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return '';
    final now = DateTime.now();
    final isToday =
        now.year == dt.year && now.month == dt.month && now.day == dt.day;
    if (isToday) {
      final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final minute = dt.minute.toString().padLeft(2, '0');
      final meridiem = dt.hour >= 12 ? 'PM' : 'AM';
      return '$hour:$minute $meridiem';
    }
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.peerName, required this.avatarUrl});

  final String peerName;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    final nameParts = peerName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    final initials = nameParts
        .take(2)
        .map((part) => part[0].toUpperCase())
        .join();

    if (avatarUrl != null && avatarUrl!.trim().isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(13),
        child: Image.network(
          avatarUrl!,
          width: 42,
          height: 42,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _fallbackAvatar(initials),
        ),
      );
    }

    return _fallbackAvatar(initials);
  }

  Widget _fallbackAvatar(String initials) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: const Color(0xFFFFEFF0),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Center(
        child: Text(
          initials.isEmpty ? 'H' : initials,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            color: AppColors.rausch,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 15,
              color: AppColors.black,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(color: AppColors.foggy),
          ),
        ],
      ),
    );
  }
}
