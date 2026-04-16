import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app.dart';
import '../../services/app_database.dart';
import '../../services/cloudinary_service.dart';
import '../../session_controller.dart';
import '../utils/app_snackbar.dart';

bool _isVideoMediaUrl(String? url) {
  final value = (url ?? '').trim().toLowerCase();
  if (value.isEmpty) return false;
  return value.contains('/video/upload/') ||
      value.endsWith('.mp4') ||
      value.endsWith('.mov') ||
      value.endsWith('.m4v') ||
      value.endsWith('.webm') ||
      value.endsWith('.avi');
}

bool _isStoryActive(Map<String, dynamic> story, {DateTime? nowUtc}) {
  final createdRaw = (story['created_at'] ?? '').toString();
  final createdAt = DateTime.tryParse(createdRaw)?.toUtc();
  if (createdAt == null) return false;
  final now = nowUtc ?? DateTime.now().toUtc();
  return now.difference(createdAt) < const Duration(hours: 24);
}

String _displayNameFromProfile(dynamic profile, {String fallback = 'Traveler'}) {
  if (profile is Map) {
    final nickname = (profile['nickname'] ?? '').toString().trim();
    if (nickname.isNotEmpty) return nickname;
    final fullName = (profile['full_name'] ?? '').toString().trim();
    if (fullName.isNotEmpty) return fullName;
  }
  return fallback;
}

class StoriesScreen extends StatefulWidget {
  const StoriesScreen({
    super.key,
    required this.session,
    this.initialStoryId,
    this.openComposerOnStart = false,
  });

  final SessionController session;
  final String? initialStoryId;
  final bool openComposerOnStart;

  @override
  State<StoriesScreen> createState() => _StoriesScreenState();
}

class _StoriesScreenState extends State<StoriesScreen> {
  final _api = AppDatabase();
  final List<RealtimeChannel> _channels = [];

  Timer? _realtimeDebounce;
  Timer? _expiryTicker;
  bool _realtimeNeedsFullReload = false;
  bool _realtimeNeedsEngagementReload = false;

  List<Map<String, dynamic>> _stories = [];
  Map<String, int> _likeCounts = {};
  Map<String, bool> _likedByMe = {};
  Map<String, List<Map<String, dynamic>>> _commentsByStory = {};

  bool _loading = true;
  bool _engagementLoading = false;
  bool _initialViewerOpened = false;

  @override
  void initState() {
    super.initState();
    _setupRealtime();
    _startExpiryTicker();
    _load();

    if (widget.openComposerOnStart && widget.session.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showCreateStorySheet();
      });
    }
  }

  @override
  void dispose() {
    _realtimeDebounce?.cancel();
    _expiryTicker?.cancel();
    for (final channel in _channels) {
      Supabase.instance.client.removeChannel(channel);
    }
    super.dispose();
  }

  void _setupRealtime() {
    RealtimeChannel watchTable({required String name, required String table, required bool fullReload}) {
      final channel = Supabase.instance.client
          .channel('stories-screen-$name-${widget.session.userId.isEmpty ? 'guest' : widget.session.userId}')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: table,
            callback: (_) {
              _realtimeNeedsFullReload = _realtimeNeedsFullReload || fullReload;
              _realtimeNeedsEngagementReload = true;
              _scheduleRealtimeRefresh();
            },
          )
          .subscribe();
      _channels.add(channel);
      return channel;
    }

    watchTable(name: 'stories', table: 'stories', fullReload: true);
    watchTable(name: 'story-likes', table: 'story_likes', fullReload: false);
    watchTable(name: 'story-comments', table: 'story_comments', fullReload: false);
  }

  void _scheduleRealtimeRefresh() {
    _realtimeDebounce?.cancel();
    _realtimeDebounce = Timer(const Duration(milliseconds: 350), () async {
      if (!mounted) return;

      final shouldFullReload = _realtimeNeedsFullReload;
      final shouldEngagementReload = _realtimeNeedsEngagementReload;
      _realtimeNeedsFullReload = false;
      _realtimeNeedsEngagementReload = false;

      if (shouldFullReload) {
        await _load();
        return;
      }

      if (shouldEngagementReload) {
        await _loadEngagement();
      }
    });
  }

  void _startExpiryTicker() {
    _expiryTicker?.cancel();
    _expiryTicker = Timer.periodic(const Duration(minutes: 1), (_) {
      if (!mounted || _stories.isEmpty) return;

      final now = DateTime.now().toUtc();
      final activeStories = _stories.where((story) => _isStoryActive(story, nowUtc: now)).toList();
      if (activeStories.length == _stories.length) return;

      final activeIds = activeStories
          .map((story) => (story['id'] ?? '').toString())
          .where((id) => id.isNotEmpty)
          .toSet();

      setState(() {
        _stories = activeStories;
        _likeCounts.removeWhere((storyId, _) => !activeIds.contains(storyId));
        _likedByMe.removeWhere((storyId, _) => !activeIds.contains(storyId));
        _commentsByStory.removeWhere((storyId, _) => !activeIds.contains(storyId));
      });
    });
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final stories = await _api.fetchStories();
    final activeStories = stories.where((story) => _isStoryActive(story)).toList();
    if (!mounted) return;

    setState(() {
      _stories = activeStories;
      _loading = false;
    });

    await _loadEngagement();
    _maybeOpenInitialViewer();
  }

  Future<void> _loadEngagement() async {
    final storyIds = _stories
        .map((story) => (story['id'] ?? '').toString())
        .where((id) => id.isNotEmpty)
        .toList();

    if (storyIds.isEmpty) {
      if (!mounted) return;
      setState(() {
        _likeCounts = {};
        _likedByMe = {};
        _commentsByStory = {};
      });
      return;
    }

    setState(() => _engagementLoading = true);

    final likes = await _api.fetchStoryLikes(storyIds: storyIds);
    final comments = await _api.fetchStoryComments(storyIds: storyIds);

    if (!mounted) return;

    final likeCounts = <String, int>{};
    final likedByMe = <String, bool>{};

    for (final row in likes) {
      final storyId = (row['story_id'] ?? '').toString();
      final userId = (row['user_id'] ?? '').toString();
      if (storyId.isEmpty) continue;
      likeCounts[storyId] = (likeCounts[storyId] ?? 0) + 1;
      if (userId == widget.session.userId) {
        likedByMe[storyId] = true;
      }
    }

    for (final id in storyIds) {
      likeCounts.putIfAbsent(id, () => 0);
      likedByMe.putIfAbsent(id, () => false);
    }

    final commentsByStory = <String, List<Map<String, dynamic>>>{};
    for (final row in comments) {
      final storyId = (row['story_id'] ?? '').toString();
      if (storyId.isEmpty) continue;
      commentsByStory.putIfAbsent(storyId, () => <Map<String, dynamic>>[]).add(row);
    }

    setState(() {
      _likeCounts = likeCounts;
      _likedByMe = likedByMe;
      _commentsByStory = commentsByStory;
      _engagementLoading = false;
    });
  }

  void _maybeOpenInitialViewer() {
    if (_initialViewerOpened) return;
    final storyId = (widget.initialStoryId ?? '').trim();
    if (storyId.isEmpty) return;

    final index = _stories.indexWhere((story) => (story['id'] ?? '').toString() == storyId);
    if (index < 0) return;

    _initialViewerOpened = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _openViewer(index);
    });
  }

  Future<void> _toggleLike(String storyId) async {
    if (!widget.session.isAuthenticated) {
      AppSnackBar.error(context, 'Sign in to like stories.');
      return;
    }

    final currentlyLiked = _likedByMe[storyId] ?? false;
    final previousCount = _likeCounts[storyId] ?? 0;

    setState(() {
      _likedByMe[storyId] = !currentlyLiked;
      _likeCounts[storyId] = currentlyLiked
          ? (previousCount > 0 ? previousCount - 1 : 0)
          : previousCount + 1;
    });

    try {
      if (currentlyLiked) {
        await _api.unlikeStory(storyId: storyId, userId: widget.session.userId);
      } else {
        await _api.likeStory(storyId: storyId, userId: widget.session.userId);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _likedByMe[storyId] = currentlyLiked;
        _likeCounts[storyId] = previousCount;
      });
      AppSnackBar.error(context, 'Could not update like. Please try again.');
    }
  }

  Future<Map<String, dynamic>?> _submitComment({
    required String storyId,
    required String text,
  }) async {
    final clean = text.trim();
    if (clean.isEmpty) return null;

    if (!widget.session.isAuthenticated) {
      AppSnackBar.error(context, 'Sign in to comment on stories.');
      return null;
    }

    try {
      await _api.addStoryComment(
        storyId: storyId,
        userId: widget.session.userId,
        commentText: clean,
      );

      final localProfile = widget.session.payload?.profile;
      final inserted = <String, dynamic>{
        'id': 'local-${DateTime.now().microsecondsSinceEpoch}',
        'story_id': storyId,
        'user_id': widget.session.userId,
        'comment_text': clean,
        'created_at': DateTime.now().toUtc().toIso8601String(),
        'profiles': ?localProfile,
      };

      if (mounted) {
        setState(() {
          _commentsByStory.putIfAbsent(storyId, () => <Map<String, dynamic>>[]).insert(0, inserted);
        });
      }

      return inserted;
    } catch (error) {
      if (mounted) {
        AppSnackBar.error(context, 'Could not send comment. Please try again.');
      }
      return null;
    }
  }

  Future<void> _openCommentsSheet(Map<String, dynamic> story) async {
    final storyId = (story['id'] ?? '').toString();
    if (storyId.isEmpty) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppColors.surface,
      showDragHandle: true,
      builder: (_) => _StoryCommentsSheet(
        story: story,
        session: widget.session,
        initialComments: List<Map<String, dynamic>>.from(_commentsByStory[storyId] ?? const []),
        onSubmitComment: (text) => _submitComment(storyId: storyId, text: text),
      ),
    );
  }

  void _openViewer(int initialIndex) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _StoryViewerScreen(
          stories: _stories,
          initialIndex: initialIndex,
          likeCounts: _likeCounts,
          likedByMe: _likedByMe,
          commentCounts: {
            for (final entry in _commentsByStory.entries) entry.key: entry.value.length,
          },
          onToggleLike: _toggleLike,
          onOpenComments: _openCommentsSheet,
        ),
      ),
    );
  }

  void _showCreateStorySheet() {
    if (!widget.session.isAuthenticated) {
      AppSnackBar.error(context, 'Sign in to share your story.');
      return;
    }

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateStorySheet(
        session: widget.session,
        onCreated: _load,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final canAdd = widget.session.isAuthenticated;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: const StageSafeLeadingButton(color: AppColors.black),
        title: const Text(
          'Stories',
          style: TextStyle(
            color: AppColors.black,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: _engagementLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.foggy,
                    ),
                  )
                : const Icon(Icons.refresh_outlined, color: AppColors.foggy),
            onPressed: _loading ? null : _load,
          ),
        ],
      ),
      floatingActionButton: canAdd
          ? FloatingActionButton.extended(
              onPressed: _showCreateStorySheet,
              backgroundColor: AppColors.rausch,
              icon: const Icon(Icons.add),
              label: const Text('Your Story'),
            )
          : null,
      body: _body(),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.rausch));
    }

    if (_stories.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.auto_stories_outlined, size: 48, color: Color(0xFFD0D0D8)),
            SizedBox(height: 12),
            Text('No stories yet', style: TextStyle(color: AppColors.foggy, fontSize: 14)),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.66,
      ),
      itemCount: _stories.length,
      itemBuilder: (_, i) {
        final story = _stories[i];
        final storyId = (story['id'] ?? '').toString();
        final likes = _likeCounts[storyId] ?? 0;
        final isLiked = _likedByMe[storyId] ?? false;
        final comments = (_commentsByStory[storyId] ?? const []).length;

        return _StoryCard(
          story: story,
          likeCount: likes,
          isLiked: isLiked,
          commentCount: comments,
          onTap: () => _openViewer(i),
          onToggleLike: () => _toggleLike(storyId),
          onOpenComments: () => _openCommentsSheet(story),
        );
      },
    );
  }
}

class _StoryViewerScreen extends StatefulWidget {
  const _StoryViewerScreen({
    required this.stories,
    required this.initialIndex,
    required this.likeCounts,
    required this.likedByMe,
    required this.commentCounts,
    required this.onToggleLike,
    required this.onOpenComments,
  });

  final List<Map<String, dynamic>> stories;
  final int initialIndex;
  final Map<String, int> likeCounts;
  final Map<String, bool> likedByMe;
  final Map<String, int> commentCounts;
  final Future<void> Function(String storyId) onToggleLike;
  final Future<void> Function(Map<String, dynamic> story) onOpenComments;

  @override
  State<_StoryViewerScreen> createState() => _StoryViewerScreenState();
}

class _StoryViewerScreenState extends State<_StoryViewerScreen> {
  late int _index;
  late final PageController _pc;

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
        title: Text(
          '${_index + 1} / ${widget.stories.length}',
          style: const TextStyle(color: Colors.white, fontSize: 13),
        ),
      ),
      body: PageView.builder(
        controller: _pc,
        itemCount: widget.stories.length,
        onPageChanged: (i) => setState(() => _index = i),
        itemBuilder: (_, i) {
          final story = widget.stories[i];
          final mediaUrl = ((story['media_url'] ?? story['image_url']) ?? '').toString();
          final isVideo = _isVideoMediaUrl(mediaUrl) || (story['media_type'] ?? '').toString() == 'video';
          final title = (story['title'] ?? '').toString();
          final body = (story['body'] ?? '').toString();
          final location = (story['location'] ?? '').toString();
          final storyId = (story['id'] ?? '').toString();
          final author = _displayNameFromProfile(story['profiles'], fallback: 'Traveler');
          final likes = widget.likeCounts[storyId] ?? 0;
          final comments = widget.commentCounts[storyId] ?? 0;
          final isLiked = widget.likedByMe[storyId] ?? false;

          return Stack(
            fit: StackFit.expand,
            children: [
              if (mediaUrl.isNotEmpty && !isVideo)
                Image.network(
                  mediaUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(color: Colors.black),
                )
              else if (mediaUrl.isNotEmpty && isVideo)
                Center(
                  child: SizedBox(
                    width: double.infinity,
                    height: double.infinity,
                    child: VideoPlayerHint(url: mediaUrl),
                  ),
                )
              else
                Container(color: Colors.black),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (body.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            body,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xCCFFFFFF), fontSize: 13),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(Icons.person_outline, size: 14, color: Color(0x99FFFFFF)),
                            const SizedBox(width: 4),
                            Text(author, style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 12)),
                            if (location.isNotEmpty) ...[
                              const SizedBox(width: 10),
                              const Icon(Icons.location_on_outlined, size: 14, color: Color(0x99FFFFFF)),
                              const SizedBox(width: 2),
                              Text(location, style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 12)),
                            ],
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            TextButton.icon(
                              onPressed: () => widget.onToggleLike(storyId),
                              style: TextButton.styleFrom(
                                foregroundColor: isLiked ? const Color(0xFFFF6B88) : Colors.white,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              ),
                              icon: Icon(isLiked ? Icons.favorite : Icons.favorite_border, size: 18),
                              label: Text('$likes'),
                            ),
                            const SizedBox(width: 8),
                            TextButton.icon(
                              onPressed: () => widget.onOpenComments(story),
                              style: TextButton.styleFrom(
                                foregroundColor: Colors.white,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              ),
                              icon: const Icon(Icons.chat_bubble_outline, size: 17),
                              label: Text('$comments'),
                            ),
                          ],
                        ),
                      ],
                    ),
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

class VideoPlayerHint extends StatelessWidget {
  const VideoPlayerHint({super.key, required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.play_circle_outline, color: Colors.white70, size: 48),
            SizedBox(height: 8),
            Text('Video story', style: TextStyle(color: Colors.white70)),
          ],
        ),
      ),
    );
  }
}

class _StoryCard extends StatelessWidget {
  const _StoryCard({
    required this.story,
    required this.likeCount,
    required this.isLiked,
    required this.commentCount,
    required this.onTap,
    required this.onToggleLike,
    required this.onOpenComments,
  });

  final Map<String, dynamic> story;
  final int likeCount;
  final bool isLiked;
  final int commentCount;
  final VoidCallback onTap;
  final VoidCallback onToggleLike;
  final VoidCallback onOpenComments;

  @override
  Widget build(BuildContext context) {
    final mediaUrl = ((story['media_url'] ?? story['image_url']) ?? '').toString();
    final isVideo = _isVideoMediaUrl(mediaUrl) || (story['media_type'] ?? '').toString() == 'video';
    final title = (story['title'] ?? '').toString();
    final location = (story['location'] ?? '').toString();
    final author = _displayNameFromProfile(story['profiles'], fallback: 'Traveler');

    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Container(
          color: const Color(0xFF141825),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (mediaUrl.isNotEmpty && !isVideo)
                      Image.network(
                        mediaUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(color: const Color(0xFF2A2A3A)),
                      )
                    else
                      Container(
                        color: const Color(0xFF2A2A3A),
                        child: Icon(
                          isVideo ? Icons.play_circle_outline : Icons.image_outlined,
                          color: Colors.white54,
                          size: 34,
                        ),
                      ),
                    Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          stops: [0.45, 1.0],
                          colors: [Colors.transparent, Color(0xDD000000)],
                        ),
                      ),
                    ),
                    Positioned(
                      left: 10,
                      right: 10,
                      bottom: 10,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                          if (location.isNotEmpty || author.isNotEmpty) ...[
                            const SizedBox(height: 3),
                            Text(
                              [if (author.isNotEmpty) author, if (location.isNotEmpty) location].join(' · '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Color(0xAAFFFFFF), fontSize: 11),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                color: const Color(0xFF10131E),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: onToggleLike,
                      iconSize: 18,
                      visualDensity: VisualDensity.compact,
                      color: isLiked ? const Color(0xFFFF5E7E) : const Color(0xFFBBC3D4),
                      icon: Icon(isLiked ? Icons.favorite : Icons.favorite_outline),
                    ),
                    Text('$likeCount', style: const TextStyle(color: Color(0xFFBBC3D4), fontSize: 12)),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: onOpenComments,
                      iconSize: 18,
                      visualDensity: VisualDensity.compact,
                      color: const Color(0xFFBBC3D4),
                      icon: const Icon(Icons.chat_bubble_outline),
                    ),
                    Text('$commentCount', style: const TextStyle(color: Color(0xFFBBC3D4), fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StoryCommentsSheet extends StatefulWidget {
  const _StoryCommentsSheet({
    required this.story,
    required this.session,
    required this.initialComments,
    required this.onSubmitComment,
  });

  final Map<String, dynamic> story;
  final SessionController session;
  final List<Map<String, dynamic>> initialComments;
  final Future<Map<String, dynamic>?> Function(String text) onSubmitComment;

  @override
  State<_StoryCommentsSheet> createState() => _StoryCommentsSheetState();
}

class _StoryCommentsSheetState extends State<_StoryCommentsSheet> {
  final _commentCtrl = TextEditingController();
  bool _sending = false;
  late List<Map<String, dynamic>> _comments;

  @override
  void initState() {
    super.initState();
    _comments = List<Map<String, dynamic>>.from(widget.initialComments);
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _commentCtrl.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() => _sending = true);
    final inserted = await widget.onSubmitComment(text);

    if (!mounted) return;

    if (inserted != null) {
      _commentCtrl.clear();
      setState(() {
        _comments = [inserted, ..._comments];
      });
    }

    setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    final title = (widget.story['title'] ?? 'Story').toString();

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 8, 16, 12 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Comments · $title',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_comments.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text('No comments yet. Start the conversation.'),
            )
          else
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _comments.length,
                separatorBuilder: (_, _) => const Divider(height: 14),
                itemBuilder: (_, index) {
                  final comment = _comments[index];
                  final profile = comment['profiles'];
                  final author = _displayNameFromProfile(profile, fallback: 'Traveler');
                  final text = (comment['comment_text'] ?? '').toString();
                  final created = (comment['created_at'] ?? '').toString();
                  final isMe = (comment['user_id'] ?? '').toString() == widget.session.userId;

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              isMe ? 'You' : author,
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                          if (created.isNotEmpty)
                            Text(
                              created.replaceFirst('T', ' ').split('.').first,
                              style: const TextStyle(fontSize: 11, color: AppColors.foggy),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(text),
                    ],
                  );
                },
              ),
            ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _commentCtrl,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _send(),
                  decoration: const InputDecoration(
                    hintText: 'Write a comment...',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _sending ? null : _send,
                child: _sending
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Send'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CreateStorySheet extends StatefulWidget {
  const _CreateStorySheet({required this.session, required this.onCreated});

  final SessionController session;
  final VoidCallback onCreated;

  @override
  State<_CreateStorySheet> createState() => _CreateStorySheetState();
}

class _CreateStorySheetState extends State<_CreateStorySheet> {
  final _api = AppDatabase();
  final _picker = ImagePicker();

  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();

  bool _saving = false;
  bool _uploading = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    _locationCtrl.dispose();
    _imageCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;

    setState(() => _uploading = true);
    try {
      final url = await CloudinaryService.uploadImage(
        picked.path,
        folder: 'merry360/stories',
      );
      if (!mounted) return;
      _imageCtrl.text = url;
      AppSnackBar.success(context, 'Image uploaded successfully');
    } catch (error) {
      if (!mounted) return;
      AppSnackBar.error(context, 'Upload failed. Try again.');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty) {
      AppSnackBar.error(context, 'Please add a title');
      return;
    }

    if (widget.session.userId.isEmpty) {
      AppSnackBar.error(context, 'Sign in to publish stories');
      return;
    }

    setState(() => _saving = true);
    try {
      final imageUrl = _imageCtrl.text.trim();
      await _api.createStory(
        userId: widget.session.userId,
        title: _titleCtrl.text.trim(),
        body: _bodyCtrl.text.trim().isEmpty ? null : _bodyCtrl.text.trim(),
        location: _locationCtrl.text.trim().isEmpty ? null : _locationCtrl.text.trim(),
        imageUrl: imageUrl.isEmpty ? null : imageUrl,
        mediaUrl: imageUrl.isEmpty ? null : imageUrl,
        mediaType: imageUrl.isEmpty ? null : 'image',
      );

      if (!mounted) return;
      Navigator.pop(context);
      widget.onCreated();
      AppSnackBar.success(context, 'Story published successfully');
    } catch (error) {
      if (mounted) AppSnackBar.error(context, 'Failed to publish story. Try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasImage = _imageCtrl.text.trim().isNotEmpty;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final cardColor = isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF7F7F7);
    
    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF48484A) : const Color(0xFFDDDDDD),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Create Story',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.3),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                  style: IconButton.styleFrom(
                    backgroundColor: cardColor,
                    padding: const EdgeInsets.all(8),
                  ),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(20, 4, 20, MediaQuery.of(context).viewInsets.bottom + 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Visual-first: Image picker
                  GestureDetector(
                    onTap: _uploading ? null : _pickAndUploadImage,
                    child: Container(
                      height: hasImage ? 240 : 160,
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark ? const Color(0xFF3A3A3C) : const Color(0xFFE8E8E8),
                          width: 1.5,
                        ),
                      ),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (hasImage)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(14.5),
                              child: Image.network(
                                _imageCtrl.text.trim(),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => _emptyImagePlaceholder(isDark),
                              ),
                            )
                          else
                            _emptyImagePlaceholder(isDark),
                          // Upload overlay
                          if (_uploading)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(14.5),
                              child: Container(
                                color: Colors.black.withValues(alpha: 0.6),
                                child: const Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                                      SizedBox(height: 12),
                                      Text(
                                        'Uploading...',
                                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          // Remove image button
                          if (hasImage && !_uploading)
                            Positioned(
                              top: 10,
                              right: 10,
                              child: IconButton(
                                icon: const Icon(Icons.close_rounded, color: Colors.white),
                                onPressed: () => setState(() => _imageCtrl.clear()),
                                style: IconButton.styleFrom(
                                  backgroundColor: Colors.black.withValues(alpha: 0.5),
                                  padding: const EdgeInsets.all(8),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Title with character count
                  _modernField(
                    controller: _titleCtrl,
                    label: 'Title',
                    hint: 'What\'s your story about?',
                    icon: Icons.edit_outlined,
                    required: true,
                    maxLength: 100,
                    isDark: isDark,
                    cardColor: cardColor,
                  ),
                  const SizedBox(height: 14),
                  // Description
                  _modernField(
                    controller: _bodyCtrl,
                    label: 'Description',
                    hint: 'Share more details...',
                    icon: Icons.subject_rounded,
                    maxLines: 4,
                    maxLength: 500,
                    isDark: isDark,
                    cardColor: cardColor,
                  ),
                  const SizedBox(height: 14),
                  // Location
                  _modernField(
                    controller: _locationCtrl,
                    label: 'Location',
                    hint: 'Where is this?',
                    icon: Icons.location_on_outlined,
                    isDark: isDark,
                    cardColor: cardColor,
                  ),
                  const SizedBox(height: 24),
                  // Publish button
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: (_saving || _uploading) ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.rausch,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: AppColors.rausch.withValues(alpha: 0.5),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.send_rounded, size: 20),
                                SizedBox(width: 8),
                                Text('Publish Story', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyImagePlaceholder(bool isDark) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.rausch.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.add_photo_alternate_outlined, size: 32, color: AppColors.rausch),
          ),
          const SizedBox(height: 12),
          const Text(
            'Add Photo or Video',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'Tap to upload from gallery',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? const Color(0xFF98A2B3) : const Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }

  Widget _modernField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    required bool isDark,
    required Color cardColor,
    bool required = false,
    int maxLines = 1,
    int? maxLength,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            if (required) ...[
              const SizedBox(width: 4),
              const Text('*', style: TextStyle(color: AppColors.rausch, fontSize: 14)),
            ],
            if (!required) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF3A3A3C) : const Color(0xFFE8E8E8),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Optional',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: isDark ? const Color(0xFF98A2B3) : const Color(0xFF6B7280),
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLines: maxLines,
          maxLength: maxLength,
          buildCounter: maxLength != null
              ? (context, {required currentLength, required isFocused, maxLength}) {
                  if (!isFocused && currentLength == 0) return null;
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '$currentLength${maxLength != null ? '/$maxLength' : ''}',
                      style: TextStyle(
                        fontSize: 11,
                        color: currentLength > (maxLength ?? 0)
                            ? AppColors.rausch
                            : (isDark ? const Color(0xFF98A2B3) : const Color(0xFF9CA3AF)),
                      ),
                    ),
                  );
                }
              : null,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, size: 20, color: isDark ? const Color(0xFF98A2B3) : const Color(0xFF9CA3AF)),
            filled: true,
            fillColor: cardColor,
            hintStyle: TextStyle(
              color: isDark ? const Color(0xFF6B7280) : const Color(0xFF9CA3AF),
              fontSize: 15,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF3A3A3C) : const Color(0xFFE8E8E8),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF3A3A3C) : const Color(0xFFE8E8E8),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.rausch, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          ),
          style: const TextStyle(fontSize: 15),
        ),
      ],
    );
  }
}
