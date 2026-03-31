import 'package:flutter/material.dart';

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
        });
      }
      return;
    }
    setState(() => _loading = true);
    final allTickets = widget.session.isAdmin || widget.session.isStaff;
    final t = await _api.fetchSupportTickets(userId: widget.session.userId, allTickets: allTickets);
    if (mounted) setState(() { _tickets = t; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, surfaceTintColor: Colors.transparent,
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
              color: Colors.white,
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

  void _showNewTicketSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NewTicketSheet(session: widget.session, onCreated: _load),
    );
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
    final msgs = (ticket['support_messages'] as List?) ?? [];
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
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
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
              Text('${msgs.length} message${msgs.length == 1 ? '' : 's'}',
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
  final _replyCtrl = TextEditingController();
  bool _sending = false;
  late List<Map<String, dynamic>> _messages;

  @override
  void initState() {
    super.initState();
    _messages = List<Map<String, dynamic>>.from(
      (widget.ticket['support_messages'] as List? ?? []).cast<Map<String, dynamic>>(),
    );
  }

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await _api.sendTicketReply(
        ticketId: widget.ticket['id'].toString(),
        userId: widget.session.userId,
        message: text,
      );
      setState(() {
        _messages.add({'body': text, 'sender_id': widget.session.userId, 'created_at': DateTime.now().toIso8601String()});
        _replyCtrl.clear();
      });
      widget.onRefresh();
    } catch (e) {
      if (mounted) AppSnackBar.error(context, 'Error: $e');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final subject = (widget.ticket['subject'] ?? 'Support').toString();
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: Text(subject, style: const TextStyle(color: AppColors.black, fontWeight: FontWeight.w600, fontSize: 15)),
      ),
      body: Column(children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (_, i) {
              final msg = _messages[i];
              final isMe = msg['sender_id']?.toString() == widget.session.userId;
              final body = (msg['body'] ?? '').toString();
              return Align(
                alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isMe ? AppColors.rausch : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(14),
                      topRight: const Radius.circular(14),
                      bottomLeft: Radius.circular(isMe ? 14 : 2),
                      bottomRight: Radius.circular(isMe ? 2 : 14),
                    ),
                  ),
                  child: Text(body, style: TextStyle(
                    color: isMe ? Colors.white : AppColors.black,
                    fontSize: 13,
                  )),
                ),
              );
            },
          ),
        ),
        Container(
          color: Colors.white,
          padding: EdgeInsets.fromLTRB(16, 10, 16, MediaQuery.of(context).viewInsets.bottom + 16),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _replyCtrl,
                decoration: InputDecoration(
                  hintText: 'Type a message…',
                  filled: true, fillColor: const Color(0xFFF2F2F5),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _sending ? null : _send,
              child: Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: AppColors.rausch,
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

// ── New Ticket Sheet ──────────────────────────────────────────
class _NewTicketSheet extends StatefulWidget {
  const _NewTicketSheet({required this.session, required this.onCreated});
  final SessionController session;
  final VoidCallback onCreated;

  @override
  State<_NewTicketSheet> createState() => _NewTicketSheetState();
}

class _NewTicketSheetState extends State<_NewTicketSheet> {
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_subjectCtrl.text.trim().isEmpty || _messageCtrl.text.trim().isEmpty) {
      AppSnackBar.error(context, 'Please fill in all fields');
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.session.createSupportTicket(
        subject: _subjectCtrl.text.trim(),
        message: _messageCtrl.text.trim(),
      );
      if (mounted) {
        Navigator.pop(context);
        widget.onCreated();
      }
    } catch (e) {
      if (mounted) AppSnackBar.error(context, 'Error: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(child: Text('Contact Support', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.black))),
            IconButton(icon: const Icon(Icons.close, color: AppColors.foggy), onPressed: () => Navigator.pop(context)),
          ]),
          const SizedBox(height: 16),
          TextField(
            controller: _subjectCtrl,
            decoration: InputDecoration(
              labelText: 'Subject',
              filled: true, fillColor: AppColors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _messageCtrl,
            maxLines: 5,
            decoration: InputDecoration(
              labelText: 'Describe your issue',
              alignLabelWithHint: true,
              filled: true, fillColor: AppColors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.rausch,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Submit Ticket', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ]),
      ),
    );
  }
}
