import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';

import '../../services/app_database.dart';
import '../../session_controller.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _api = AppDatabase();
  List<Map<String, dynamic>> _tickets = [];
  bool _loading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!widget.session.isAuthenticated) {
      if (mounted) {
        setState(() {
          _tickets = [];
          _loading = false;
          _loadError = null;
        });
      }
      return;
    }
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final allTickets = widget.session.isAdmin || widget.session.isStaff || widget.session.isCustomerSupport;
      final t = await _api.fetchSupportTickets(
        userId: widget.session.userId,
        allTickets: allTickets,
      );
      if (!mounted) return;
      setState(() {
        _tickets = t;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _tickets = [];
        _loadError = _cleanError(error);
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String _cleanError(Object error) =>
      error.toString().replaceFirst('Exception: ', '').trim();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface, surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: const Text('Support',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined, color: AppColors.foggy), onPressed: _load),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: widget.session.isAuthenticated ? _showNewTicketSheet : null,
        backgroundColor: AppColors.rausch,
        icon: const Icon(Icons.add),
        label: Text(widget.session.isAuthenticated ? 'New Ticket' : 'Sign in for tickets'),
      ),
      body: _body(),
    );
  }

  Widget _body() {
    if (!widget.session.isAuthenticated) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE7E7EC)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Support', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.black)),
                SizedBox(height: 8),
                Text(
                  'Sign in to track tickets and continue support conversations from the app.',
                  style: TextStyle(fontSize: 14, color: AppColors.foggy, height: 1.5),
                ),
                SizedBox(height: 16),
                _SupportContactRow(icon: Icons.email_outlined, title: 'Email', value: 'support@merry360x.com'),
                SizedBox(height: 12),
                _SupportContactRow(icon: Icons.call_outlined, title: 'Phone', value: '+250 796 214 719'),
              ],
            ),
          ),
        ],
      );
    }
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.rausch));
    if (_loadError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Could not load support tickets',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _loadError!,
                  style: const TextStyle(fontSize: 13, color: AppColors.foggy),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 40,
                  child: FilledButton.icon(
                    onPressed: _load,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Try again'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
    if (_tickets.isEmpty) {
      return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.support_agent_outlined, size: 52, color: Color(0xFFD0D0D8)),
        const SizedBox(height: 12),
        const Text('No support tickets', style: TextStyle(color: AppColors.foggy, fontSize: 14)),
        const SizedBox(height: 6),
        const Text('Tap + New Ticket to contact us', style: TextStyle(color: AppColors.hackberry, fontSize: 12)),
      ]),
    );
    }

    return RefreshIndicator(
      color: AppColors.rausch,
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _tickets.length,
        itemBuilder: (_, i) => _TicketTile(
          ticket: _tickets[i],
          session: widget.session,
          onRefresh: _load,
        ),
      ),
    );
  }

  Future<void> _showNewTicketSheet() async {
    FocusScope.of(context).unfocus();
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NewTicketSheet(session: widget.session),
    );
    if (!mounted || created != true) return;
    await _load();
    if (!mounted) return;
    AppSnackBar.success(context, 'Ticket submitted. Support will reply shortly.');
  }
}

class _SupportContactRow extends StatelessWidget {
  const _SupportContactRow({required this.icon, required this.title, required this.value});

  final IconData icon;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFFF5F5F7),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.black, size: 20),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 13, color: AppColors.foggy)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.black)),
          ],
        ),
      ],
    );
  }
}

// ── Ticket Tile ───────────────────────────────────────────────
class _TicketTile extends StatelessWidget {
  const _TicketTile({required this.ticket, required this.session, required this.onRefresh});
  final Map<String, dynamic> ticket;
  final SessionController session;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final subject = (ticket['subject'] ?? 'Support Ticket').toString();
    final status = (ticket['status'] ?? 'open').toString();
    final msgs = (ticket['support_ticket_messages'] as List?) ??
        (ticket['support_messages'] as List?) ??
        [];
    final fallbackMessage = (ticket['message'] ?? '').toString().trim();
    final messageCount = msgs.isNotEmpty ? msgs.length : (fallbackMessage.isEmpty ? 0 : 1);
    final (statusColor, statusBg) = switch (status) {
      'closed' => (AppColors.foggy, const Color(0xFFF2F2F5)),
      'resolved' => (const Color(0xFF4CAF50), const Color(0xFFE8F5E9)),
      _ => (const Color(0xFFFF9800), const Color(0xFFFFF3E0)),
    };

    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => _TicketThreadScreen(ticket: ticket, session: session, onRefresh: onRefresh),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14),
            ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: const Color(0xFFF2F2F5), borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.support_agent_outlined, size: 20, color: AppColors.hof),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(subject, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.black)),
              const SizedBox(height: 3),
                Text('$messageCount message${messageCount == 1 ? '' : 's'}',
                  style: const TextStyle(fontSize: 11, color: AppColors.foggy)),
            ])),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(20)),
              child: Text(status[0].toUpperCase() + status.substring(1),
                  style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600)),
            ),
          ]),
        ),
      ),
    );
  }
}

// ── Ticket Thread Screen ──────────────────────────────────────
class _TicketThreadScreen extends StatefulWidget {
  const _TicketThreadScreen({required this.ticket, required this.session, required this.onRefresh});
  final Map<String, dynamic> ticket;
  final SessionController session;
  final VoidCallback onRefresh;

  @override
  State<_TicketThreadScreen> createState() => _TicketThreadScreenState();
}

class _TicketThreadScreenState extends State<_TicketThreadScreen> {
  final _api = AppDatabase();
  final SupabaseClient _sb = Supabase.instance.client;
  final _replyCtrl = TextEditingController();
  final _listCtrl = ScrollController();
  RealtimeChannel? _messagesChannel;
  RealtimeChannel? _presenceChannel;
  Timer? _typingDebounceTimer;
  Timer? _remoteTypingStaleTimer;
  bool _sending = false;
  bool _supportTyping = false;
  bool _selfTyping = false;
  bool _otherUserOnline = false;
  late List<Map<String, dynamic>> _messages;
  String _activeSupportName = 'Support Team';
  DateTime? _lastStaffSeenAt;

  String get _typingSpeedPreset {
    const preset = String.fromEnvironment(
      'SUPPORT_TYPING_PRESET',
      defaultValue: 'balanced',
    );
    return preset;
  }

  int get _typingTimeoutMs {
    switch (_typingSpeedPreset) {
      case 'ultra':
        return 500;
      case 'persistent':
        return 1200;
      case 'balanced':
      default:
        return 900;
    }
  }

  bool get _allTicketsScope =>
      widget.session.isAdmin || widget.session.isStaff || widget.session.isCustomerSupport;

  String get _ticketId => (widget.ticket['id'] ?? '').toString();

  String get _presenceUserType =>
      widget.session.isAdmin || widget.session.isStaff || widget.session.isCustomerSupport
          ? 'staff'
          : 'customer';

  @override
  void initState() {
    super.initState();
    _messages = _buildThreadMessagesFromTicket(widget.ticket);
    _syncSupportIdentity();
    _replyCtrl.addListener(_onDraftChanged);
    _setupRealtime();
    unawaited(_refreshThread());
  }

  @override
  void dispose() {
    _replyCtrl.removeListener(_onDraftChanged);
    _stopTypingBroadcast();
    _typingDebounceTimer?.cancel();
    _remoteTypingStaleTimer?.cancel();

    final messageChannel = _messagesChannel;
    if (messageChannel != null) {
      _sb.removeChannel(messageChannel);
      _messagesChannel = null;
    }

    final presenceChannel = _presenceChannel;
    if (presenceChannel != null) {
      _sb.removeChannel(presenceChannel);
      _presenceChannel = null;
    }

    _listCtrl.dispose();
    _replyCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _buildThreadMessagesFromTicket(
    Map<String, dynamic> ticket,
  ) {
    final source = ((ticket['support_ticket_messages'] as List?) ??
            (ticket['support_messages'] as List?) ??
            const <dynamic>[])
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();

    source.sort((a, b) =>
        (a['created_at'] ?? '').toString().compareTo((b['created_at'] ?? '').toString()));

    if (source.isNotEmpty) return source;

    final initialMessage = (ticket['message'] ?? '').toString().trim();
    if (initialMessage.isEmpty) return <Map<String, dynamic>>[];

    return <Map<String, dynamic>>[
      {
        'id': 'seed-${ticket['id']}',
        'message': initialMessage,
        'sender_id': ticket['user_id'],
        'sender_type': 'customer',
        'created_at':
            ticket['created_at'] ?? DateTime.now().toIso8601String(),
      },
    ];
  }

  bool _isStaffMessage(Map<String, dynamic> message) {
    final senderType = (message['sender_type'] ?? '').toString().toLowerCase();
    if (senderType == 'staff') return true;
    if (senderType == 'customer') return false;
    final senderId = (message['sender_id'] ?? '').toString();
    return senderId.isNotEmpty && senderId != widget.session.userId;
  }

  DateTime? _parseTime(dynamic raw) {
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString())?.toLocal();
  }

  bool _sameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  String _shortMonth(int month) {
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[(month - 1).clamp(0, 11)];
  }

  String _formatDayChip(DateTime value) {
    return '${_shortMonth(value.month)} ${value.day}, ${value.year}';
  }

  String _formatRelative(DateTime value) {
    final now = DateTime.now();
    final diff = now.difference(value);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()}w ago';
    if (diff.inDays < 365) return '${(diff.inDays / 30).floor()}mo ago';
    return '${(diff.inDays / 365).floor()}y ago';
  }

  String _messageSenderName(Map<String, dynamic> message) {
    final value = (message['sender_name'] ?? '').toString().trim();
    if (value.isNotEmpty) return value;
    return _activeSupportName;
  }

  void _syncSupportIdentity() {
    for (final msg in _messages.reversed) {
      if (!_isStaffMessage(msg)) continue;
      final helperName = (msg['sender_name'] ?? '').toString().trim();
      if (helperName.isNotEmpty) _activeSupportName = helperName;
      final at = _parseTime(msg['created_at']);
      if (at != null) _lastStaffSeenAt = at;
      return;
    }
  }

  void _setupRealtime() {
    if (_ticketId.isEmpty || widget.session.userId.isEmpty) return;

    _messagesChannel = _sb
        .channel(
          'mobile-support-ticket-messages-$_ticketId-${widget.session.userId}',
          opts: const RealtimeChannelConfig(self: true),
        )
        .onBroadcast(
          event: 'new-message',
          callback: _handleBroadcastPayload,
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'support_ticket_messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'ticket_id',
            value: _ticketId,
          ),
          callback: (payload) {
            if (payload.eventType == PostgresChangeEvent.insert) {
              _upsertIncomingMessage(payload.newRecord);
              return;
            }
            unawaited(_refreshThread());
          },
        )
        .subscribe();

    _presenceChannel = _sb
        .channel(
          'ticket-presence-$_ticketId',
          opts: RealtimeChannelConfig(
            key: widget.session.userId,
            self: true,
          ),
        )
        .onPresenceSync((_) => _syncPresenceState())
        .onPresenceJoin((_) => _syncPresenceState())
        .onPresenceLeave((_) => _syncPresenceState())
        .subscribe((status, _) {
          if (status == RealtimeSubscribeStatus.subscribed) {
            unawaited(_trackPresence(typing: _selfTyping));
          }
        });
  }

  void _handleBroadcastPayload(Map<String, dynamic> payload) {
    final nestedPayload = payload['payload'];
    if (nestedPayload is Map) {
      _upsertIncomingMessage(Map<String, dynamic>.from(nestedPayload));
      return;
    }
    _upsertIncomingMessage(Map<String, dynamic>.from(payload));
  }

  void _upsertIncomingMessage(Map<String, dynamic> incoming) {
    if (!mounted) return;

    final normalized = Map<String, dynamic>.from(incoming);
    if ((normalized['message'] ?? '').toString().trim().isEmpty) {
      normalized['message'] = (normalized['body'] ?? '').toString();
    }
    if ((normalized['message'] ?? '').toString().trim().isEmpty) return;

    if ((normalized['ticket_id'] ?? '').toString().isEmpty) {
      normalized['ticket_id'] = _ticketId;
    }
    if ((normalized['created_at'] ?? '').toString().isEmpty) {
      normalized['created_at'] = DateTime.now().toIso8601String();
    }

    final messageId = (normalized['id'] ?? '').toString();
    final senderId = (normalized['sender_id'] ?? '').toString();
    final messageText = (normalized['message'] ?? '').toString().trim();

    setState(() {
      if (messageId.isNotEmpty) {
        final existingIndex = _messages.indexWhere(
          (row) => (row['id'] ?? '').toString() == messageId,
        );
        if (existingIndex >= 0) {
          _messages[existingIndex] = {
            ..._messages[existingIndex],
            ...normalized,
          };
          return;
        }
      }

      final tempIndex = _messages.indexWhere((row) {
        final rowId = (row['id'] ?? '').toString();
        if (!rowId.startsWith('temp-')) return false;
        final rowSender = (row['sender_id'] ?? '').toString();
        final rowText = (row['message'] ?? row['body'] ?? '').toString().trim();
        return rowSender == senderId && rowText == messageText;
      });

      if (tempIndex >= 0) {
        _messages[tempIndex] = {
          ..._messages[tempIndex],
          ...normalized,
        };
      } else {
        _messages.add(normalized);
      }

      _messages.sort((a, b) =>
          (a['created_at'] ?? '').toString().compareTo((b['created_at'] ?? '').toString()));

      final fromOtherUser = senderId.isNotEmpty && senderId != widget.session.userId;
      if (fromOtherUser) {
        _supportTyping = false;
        _otherUserOnline = true;
        _remoteTypingStaleTimer?.cancel();
        _lastStaffSeenAt = _parseTime(normalized['created_at']) ?? DateTime.now();
      }

      final helperName = (normalized['sender_name'] ?? '').toString().trim();
      if (helperName.isNotEmpty && _isStaffMessage(normalized)) {
        _activeSupportName = helperName;
      }
    });

    _scrollToBottom();
  }

  void _syncPresenceState() {
    final channel = _presenceChannel;
    if (channel == null || !mounted) return;

    final states = channel.presenceState();
    var hasOtherPresence = false;
    var otherTyping = false;
    DateTime? latestSeenAt = _lastStaffSeenAt;

    for (final state in states) {
      for (final presence in state.presences) {
        final payload = presence.payload;
        final presenceUserId = (payload['user_id'] ?? state.key).toString();
        if (presenceUserId.isEmpty || presenceUserId == widget.session.userId) {
          continue;
        }

        hasOtherPresence = true;
        if (payload['typing'] == true) {
          otherTyping = true;
        }

        final seenAt = _parseTime(payload['online_at'] ?? payload['updated_at']);
        if (seenAt != null && (latestSeenAt == null || seenAt.isAfter(latestSeenAt))) {
          latestSeenAt = seenAt;
        }
      }
    }

    _remoteTypingStaleTimer?.cancel();
    if (otherTyping) {
      _remoteTypingStaleTimer = Timer(Duration(milliseconds: _typingTimeoutMs), () {
        if (!mounted) return;
        setState(() => _supportTyping = false);
      });
    }

    setState(() {
      _otherUserOnline = hasOtherPresence;
      _supportTyping = otherTyping;
      if (hasOtherPresence && latestSeenAt == null) {
        latestSeenAt = DateTime.now();
      }
      if (latestSeenAt != null) {
        _lastStaffSeenAt = latestSeenAt;
      }
    });
  }

  Future<void> _trackPresence({required bool typing}) async {
    final channel = _presenceChannel;
    if (channel == null || widget.session.userId.isEmpty) return;

    try {
      await channel.track({
        'user_id': widget.session.userId,
        'user_type': _presenceUserType,
        'typing': typing,
        'online_at': DateTime.now().toIso8601String(),
      });
    } catch (_) {
      // Ignore transient realtime transport errors.
    }
  }

  void _startTypingBroadcast() {
    if (!_selfTyping) {
      _selfTyping = true;
      unawaited(_trackPresence(typing: true));
    }
    _typingDebounceTimer?.cancel();
    _typingDebounceTimer = Timer(Duration(milliseconds: _typingTimeoutMs), _stopTypingBroadcast);
  }

  void _stopTypingBroadcast() {
    _typingDebounceTimer?.cancel();
    if (!_selfTyping) return;
    _selfTyping = false;
    unawaited(_trackPresence(typing: false));
  }

  void _onDraftChanged() {
    if (_replyCtrl.text.trim().isEmpty) {
      _stopTypingBroadcast();
      return;
    }
    _startTypingBroadcast();
  }

  Future<void> _refreshThread() async {
    try {
      final tickets = await _api.fetchSupportTickets(
        userId: widget.session.userId,
        allTickets: _allTicketsScope,
      );
      Map<String, dynamic>? current;
      for (final ticket in tickets) {
        if ((ticket['id'] ?? '').toString() ==
            (widget.ticket['id'] ?? '').toString()) {
          current = ticket;
          break;
        }
      }
      if (current == null || !mounted) return;

      final nextMessages = _buildThreadMessagesFromTicket(current);
      setState(() {
        _messages = nextMessages;
        _syncSupportIdentity();
      });
      _scrollToBottom();
    } catch (_) {
      // Keep existing messages on polling failures.
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_listCtrl.hasClients) return;
      _listCtrl.animateTo(
        _listCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty) return;

    final senderType = _presenceUserType;
    final senderName = (widget.session.payload?.profile?['full_name'] ??
            widget.session.userEmail?.split('@').first ??
            (senderType == 'staff' ? 'Support' : 'Customer'))
        .toString()
        .trim();
    final optimisticId = 'temp-${DateTime.now().microsecondsSinceEpoch}';

    _stopTypingBroadcast();

    setState(() {
      _sending = true;
      _messages.add({
        'id': optimisticId,
        'ticket_id': _ticketId,
        'message': text,
        'sender_id': widget.session.userId,
        'sender_type': senderType,
        'sender_name': senderName,
        'attachments': const <dynamic>[],
        'reply_to_id': null,
        'created_at': DateTime.now().toIso8601String(),
      });
      _replyCtrl.clear();
    });
    _scrollToBottom();

    try {
      final savedMessage = await _api.sendTicketReply(
        ticketId: _ticketId,
        userId: widget.session.userId,
        message: text,
        senderType: senderType,
        senderName: senderName,
      );

      _upsertIncomingMessage(savedMessage);

      final messagesChannel = _messagesChannel;
      if (messagesChannel != null) {
        unawaited(
          messagesChannel.sendBroadcastMessage(
            event: 'new-message',
            payload: savedMessage,
          ),
        );
      }

      final savedMessageId = (savedMessage['id'] ?? '').toString();
      if (savedMessageId.isNotEmpty) {
        unawaited(_notifyPushForMessage(savedMessageId));
      }

      widget.onRefresh();
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.removeWhere(
            (row) => (row['id'] ?? '').toString() == optimisticId,
          );
          _replyCtrl.text = text;
          _replyCtrl.selection =
              TextSelection.collapsed(offset: _replyCtrl.text.length);
        });
        AppSnackBar.error(context, 'Error: $e');
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _notifyPushForMessage(String messageId) async {
    if (messageId.trim().isEmpty) return;
    try {
      await _sb.functions.invoke(
        'send-support-push',
        body: {
          'messageId': messageId,
        },
      );
    } catch (_) {
      // Keep chat flow fast even if push notify fails.
    }
  }

  @override
  Widget build(BuildContext context) {
    final subject = (widget.ticket['subject'] ?? '').toString().trim();
    final sorted = [..._messages]
      ..sort((a, b) => (a['created_at'] ?? '')
          .toString()
          .compareTo((b['created_at'] ?? '').toString()));
    final supportOnline = _otherUserOnline ||
      (_lastStaffSeenAt != null &&
        DateTime.now().difference(_lastStaffSeenAt!).inMinutes <= 5);
    final supportStatus = _supportTyping
      ? 'typing...'
        : supportOnline
            ? 'online'
            : 'offline';

    final timeline = <Widget>[];
    DateTime? previousDay;
    var joinedShown = false;
    for (final msg in sorted) {
      final createdAt = _parseTime(msg['created_at']) ?? DateTime.now();
      if (previousDay == null || !_sameDay(previousDay, createdAt)) {
        timeline.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFE6E6E9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _formatDayChip(createdAt),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.black,
                  ),
                ),
              ),
            ),
          ),
        );
      }

      final isStaff = _isStaffMessage(msg);
      if (isStaff && !joinedShown) {
        timeline.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFECECEF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  '${_messageSenderName(msg)} joined the conversation',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.foggy,
                  ),
                ),
              ),
            ),
          ),
        );
        joinedShown = true;
      }

      final text = (msg['message'] ?? msg['body'] ?? '').toString().trim();
      if (text.isEmpty) continue;

      if (isStaff) {
        timeline.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBCBCF),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: const Icon(
                    Icons.support_agent,
                    size: 16,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_messageSenderName(msg)} • ${_formatRelative(createdAt)}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.black,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE7E7EA),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Text(
                          text,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.35,
                            color: AppColors.black,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      } else {
        timeline.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Align(
              alignment: Alignment.centerRight,
              child: Container(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.72,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF5A00),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  text,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                  ),
                ),
              ),
            ),
          ),
        );
      }

      previousDay = createdAt;
    }

    if (_supportTyping) {
      timeline.add(
        Padding(
          padding: const EdgeInsets.only(top: 4, bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBCBCF),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: const Icon(
                  Icons.support_agent,
                  size: 16,
                  color: AppColors.black,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$_activeSupportName is typing...',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.black,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE7E7EA),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const _TypingDots(),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F1F4),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF1F1F4),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: const Text(
          'Support',
          style: TextStyle(
            color: AppColors.black,
            fontWeight: FontWeight.w800,
            fontSize: 17,
          ),
        ),
      ),
      body: Column(children: [
        Container(
          margin: const EdgeInsets.fromLTRB(16, 2, 16, 8),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE4E4E8)),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: const Color(0xFFECECEF),
                  borderRadius: BorderRadius.circular(17),
                ),
                child: const Icon(
                  Icons.support_agent,
                  size: 18,
                  color: AppColors.black,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Support',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.black,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$_activeSupportName • $supportStatus',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: supportStatus == 'offline'
                            ? AppColors.foggy
                            : const Color(0xFF1B8A3B),
                      ),
                    ),
                    if (subject.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        subject,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.foggy,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            controller: _listCtrl,
            padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
            children: timeline.isEmpty
                ? [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE7E7EA),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Text(
                        'Support is ready. Send a message to start the conversation.',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.black,
                        ),
                      ),
                    ),
                  ]
                : timeline,
          ),
        ),
        Container(
          color: const Color(0xFFF1F1F4),
          padding: EdgeInsets.fromLTRB(16, 10, 16, MediaQuery.of(context).viewInsets.bottom + 16),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _replyCtrl,
                decoration: InputDecoration(
                  hintText: 'Type a message…',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                textInputAction: TextInputAction.send,
                onTap: () {
                  if (_replyCtrl.text.trim().isNotEmpty) {
                    _startTypingBroadcast();
                  }
                },
                onTapOutside: (_) => _stopTypingBroadcast(),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _sending ? null : _send,
              child: Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFFF5A00),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: _sending
                    ? const Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)))
                    : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _TypingDots extends StatefulWidget {
  const _TypingDots();

  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> {
  Timer? _timer;
  int _activeDot = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 320), (_) {
      if (!mounted) return;
      setState(() {
        _activeDot = (_activeDot + 1) % 3;
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        final isActive = index == _activeDot;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: 7,
          height: 7,
          margin: EdgeInsets.only(right: index == 2 ? 0 : 5),
          decoration: BoxDecoration(
            color: const Color(0xFF6E6E75)
                .withValues(alpha: isActive ? 1 : 0.35),
            shape: BoxShape.circle,
          ),
        );
      }),
    );
  }
}

// ── New Ticket Sheet ──────────────────────────────────────────
class _NewTicketSheet extends StatefulWidget {
  const _NewTicketSheet({required this.session});
  final SessionController session;

  @override
  State<_NewTicketSheet> createState() => _NewTicketSheetState();
}

class _NewTicketSheetState extends State<_NewTicketSheet> {
  final _formKey = GlobalKey<FormState>();
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  bool _saving = false;

  bool get _canSubmit {
    final subject = _subjectCtrl.text.trim();
    final message = _messageCtrl.text.trim();
    return !_saving && subject.length >= 3 && message.length >= 8;
  }

  @override
  void initState() {
    super.initState();
    _subjectCtrl.addListener(_onFieldChanged);
    _messageCtrl.addListener(_onFieldChanged);
  }

  void _onFieldChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _subjectCtrl.removeListener(_onFieldChanged);
    _messageCtrl.removeListener(_onFieldChanged);
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) {
      AppSnackBar.error(context, 'Please complete subject and message');
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.session.createSupportTicket(
        subject: _subjectCtrl.text.trim(),
        message: _messageCtrl.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) AppSnackBar.error(context, 'Error: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final insetBottom = MediaQuery.of(context).viewInsets.bottom;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.fromLTRB(20, 16, 20, insetBottom + 20),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Row(children: [
                  const Expanded(
                    child: Text(
                      'Contact Support',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.black,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppColors.foggy),
                    onPressed: () => Navigator.pop(context, false),
                  ),
                ]),
                const SizedBox(height: 8),
                const Text(
                  'Share a clear subject and details. We reply as quickly as possible.',
                  style: TextStyle(fontSize: 13, color: AppColors.foggy, height: 1.4),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _subjectCtrl,
                  textInputAction: TextInputAction.next,
                  maxLength: 90,
                  decoration: InputDecoration(
                    labelText: 'Subject',
                    hintText: 'Example: Payment issue on booking',
                    counterText: '',
                    filled: true,
                    fillColor: AppColors.surface,
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.rausch, width: 2),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                  validator: (value) {
                    final text = (value ?? '').trim();
                    if (text.isEmpty) return 'Enter a subject';
                    if (text.length < 3) return 'Use at least 3 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _messageCtrl,
                  maxLines: 6,
                  minLines: 5,
                  maxLength: 800,
                  decoration: InputDecoration(
                    labelText: 'Describe your issue',
                    hintText: 'What happened and what do you need help with?',
                    alignLabelWithHint: true,
                    filled: true,
                    fillColor: AppColors.surface,
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.rausch, width: 2),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                  validator: (value) {
                    final text = (value ?? '').trim();
                    if (text.isEmpty) return 'Describe the issue';
                    if (text.length < 8) return 'Use at least 8 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _canSubmit ? _submit : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.rausch,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _saving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Text('Submit Ticket', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
