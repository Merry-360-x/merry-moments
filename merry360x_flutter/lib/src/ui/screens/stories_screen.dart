import 'package:flutter/material.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';

import '../../services/app_database.dart';
import '../../session_controller.dart';

class StoriesScreen extends StatefulWidget {
  const StoriesScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<StoriesScreen> createState() => _StoriesScreenState();
}

class _StoriesScreenState extends State<StoriesScreen> {
  final _api = AppDatabase();
  List<Map<String, dynamic>> _stories = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final s = await _api.fetchStories();
    if (mounted) setState(() { _stories = s; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    final canAdd = widget.session.isHost || widget.session.isAdmin;
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: const Text('Stories',
            style: TextStyle(color: AppColors.black, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined, color: AppColors.foggy), onPressed: _load),
        ],
      ),
      floatingActionButton: canAdd
          ? FloatingActionButton.extended(
              onPressed: () => _showCreateStorySheet(),
              backgroundColor: AppColors.rausch,
              icon: const Icon(Icons.add),
              label: const Text('Add Story'),
            )
          : null,
      body: _body(),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.rausch));
    if (_stories.isEmpty) {
      return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.auto_stories_outlined, size: 48, color: Color(0xFFD0D0D8)),
        const SizedBox(height: 12),
        const Text('No stories yet', style: TextStyle(color: AppColors.foggy, fontSize: 14)),
      ]),
    );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 0.72,
      ),
      itemCount: _stories.length,
      itemBuilder: (_, i) => _StoryCard(story: _stories[i], onTap: () => _openViewer(i)),
    );
  }

  void _openViewer(int initialIndex) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => _StoryViewerScreen(stories: _stories, initialIndex: initialIndex),
    ));
  }

  void _showCreateStorySheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateStorySheet(session: widget.session, onCreated: _load),
    );
  }
}

// ── Story viewer (full-screen) ────────────────────────────────
class _StoryViewerScreen extends StatefulWidget {
  const _StoryViewerScreen({required this.stories, required this.initialIndex});
  final List<Map<String, dynamic>> stories;
  final int initialIndex;

  @override
  State<_StoryViewerScreen> createState() => _StoryViewerScreenState();
}

class _StoryViewerScreenState extends State<_StoryViewerScreen> {
  late int _index;
  late PageController _pc;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
    _pc = PageController(initialPage: _index);
  }

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: StageSafeLeadingButton(
          icon: Icons.close,
          color: Colors.white,
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('${_index + 1} / ${widget.stories.length}',
            style: const TextStyle(color: Colors.white, fontSize: 13)),
      ),
      body: PageView.builder(
        controller: _pc,
        itemCount: widget.stories.length,
        onPageChanged: (i) => setState(() => _index = i),
        itemBuilder: (_, i) {
          final s = widget.stories[i];
          final imgUrl = (s['image_url'] ?? '').toString();
          final title = (s['title'] ?? '').toString();
          final body = (s['body'] ?? '').toString();
          final location = (s['location'] ?? '').toString();
          final author = (s['profiles'] as Map?)?['full_name'] ?? 'Host';

          return Stack(
            fit: StackFit.expand,
            children: [
              if (imgUrl.isNotEmpty)
                Image.network(imgUrl, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(color: AppColors.black))
              else
                Container(color: AppColors.black),
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: [0.5, 1.0],
                    colors: [Colors.transparent, Color(0xCC000000)],
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(title, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                      if (body.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(body, maxLines: 3, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xCCFFFFFF), fontSize: 13)),
                      ],
                      const SizedBox(height: 10),
                      Row(children: [
                        const Icon(Icons.person_outline, size: 14, color: Color(0x99FFFFFF)),
                        const SizedBox(width: 4),
                        Text(author.toString(), style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 12)),
                        if (location.isNotEmpty) ...[
                          const SizedBox(width: 10),
                          const Icon(Icons.location_on_outlined, size: 14, color: Color(0x99FFFFFF)),
                          const SizedBox(width: 2),
                          Text(location, style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 12)),
                        ],
                      ]),
                    ]),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Story card thumbnail ──────────────────────────────────────
class _StoryCard extends StatelessWidget {
  const _StoryCard({required this.story, required this.onTap});
  final Map<String, dynamic> story;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imgUrl = (story['image_url'] ?? '').toString();
    final title = (story['title'] ?? '').toString();
    final location = (story['location'] ?? '').toString();
    final author = (story['profiles'] as Map?)?['full_name'] ?? '';

    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          fit: StackFit.expand,
          children: [
            imgUrl.isNotEmpty
                ? Image.network(imgUrl, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(color: const Color(0xFF2A2A3A)))
                : Container(color: const Color(0xFF2A2A3A)),
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter, end: Alignment.bottomCenter,
                  stops: [0.4, 1.0],
                  colors: [Colors.transparent, Color(0xDD000000)],
                ),
              ),
            ),
            Positioned(
              bottom: 10, left: 10, right: 10,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                if (location.isNotEmpty || author.toString().isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    [if (author.toString().isNotEmpty) author.toString(), if (location.isNotEmpty) location].join(' · '),
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Color(0xAAFFFFFF), fontSize: 11),
                  ),
                ],
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Create story bottom sheet ─────────────────────────────────
class _CreateStorySheet extends StatefulWidget {
  const _CreateStorySheet({required this.session, required this.onCreated});
  final SessionController session;
  final VoidCallback onCreated;

  @override
  State<_CreateStorySheet> createState() => _CreateStorySheetState();
}

class _CreateStorySheetState extends State<_CreateStorySheet> {
  final _api = AppDatabase();
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose(); _bodyCtrl.dispose();
    _locationCtrl.dispose(); _imageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty) {
      AppSnackBar.error(context, 'Title is required');
      return;
    }
    setState(() => _saving = true);
    try {
      await _api.createStory(
        userId: widget.session.userId,
        title: _titleCtrl.text.trim(),
        body: _bodyCtrl.text.trim().isEmpty ? null : _bodyCtrl.text.trim(),
        imageUrl: _imageCtrl.text.trim().isEmpty ? null : _imageCtrl.text.trim(),
        location: _locationCtrl.text.trim().isEmpty ? null : _locationCtrl.text.trim(),
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
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(child: Text('Share a Story', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.black))),
            IconButton(icon: const Icon(Icons.close, color: AppColors.foggy), onPressed: () => Navigator.pop(context)),
          ]),
          const SizedBox(height: 16),
          _field(_titleCtrl, 'Title *', Icons.title),
          const SizedBox(height: 12),
          _field(_bodyCtrl, 'Description', Icons.notes, maxLines: 3),
          const SizedBox(height: 12),
          _field(_imageCtrl, 'Image URL', Icons.image_outlined),
          const SizedBox(height: 12),
          _field(_locationCtrl, 'Location', Icons.location_on_outlined),
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
                  : const Text('Publish Story', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _field(TextEditingController c, String label, IconData icon, {int maxLines = 1}) {
    return TextField(
      controller: c,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 18, color: AppColors.foggy),
        filled: true,
        fillColor: AppColors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }
}
