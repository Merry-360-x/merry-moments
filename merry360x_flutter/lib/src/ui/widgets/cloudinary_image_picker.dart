import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../app.dart';
import '../../services/cloudinary_service.dart';

const _kRed = AppColors.rausch;

/// An image pick-and-upload widget that mirrors the web CloudinaryUploadDialog:
/// - Pick images from gallery or camera
/// - Immediately upload in real-time with per-image progress bars
/// - Display confirmation checkmark when each image is done
/// - Remove any image (local or uploaded)
/// - Call [onChanged] each time an image finishes uploading (incremental)
class CloudinaryImagePicker extends StatefulWidget {
  const CloudinaryImagePicker({
    super.key,
    required this.folder,
    this.uploadedUrls = const [],
    required this.onChanged,
    this.maxImages = 20,
    this.label = 'Add photos',
    this.hint = 'Add at least 5 photos · Use daylight · Show every room',
    this.primaryColor = _kRed,
  });

  final String folder;

  /// Already-uploaded Cloudinary URLs (e.g. when editing an existing listing).
  final List<String> uploadedUrls;

  /// Called incrementally with the full list of confirmed Cloudinary URLs
  /// after each individual upload completes.
  final void Function(List<String> urls) onChanged;

  final int maxImages;
  final String label;
  final String hint;
  final Color primaryColor;

  @override
  State<CloudinaryImagePicker> createState() => _CloudinaryImagePickerState();
}

enum _ItemStatus { uploading, done, error }

class _UploadItem {
  _UploadItem({required this.localPath, required this.preview});
  final String localPath;
  final File preview;
  _ItemStatus status = _ItemStatus.uploading;
  double progress = 0;
  String? url;
  String? error;
}

class _CloudinaryImagePickerState extends State<CloudinaryImagePicker> {
  final _picker = ImagePicker();

  /// Already-confirmed Cloudinary URLs (seed + uploaded).
  late List<String> _uploadedUrls;

  /// Items currently being processed (uploading / done / error).
  final List<_UploadItem> _items = [];

  @override
  void initState() {
    super.initState();
    _uploadedUrls = List<String>.from(widget.uploadedUrls);
  }

  Future<void> _pick(ImageSource source) async {
    List<XFile> picked;
    if (source == ImageSource.gallery) {
      picked = await _picker.pickMultiImage(imageQuality: 85);
    } else {
      final img = await _picker.pickImage(source: source, imageQuality: 85);
      picked = img != null ? [img] : [];
    }
    if (picked.isEmpty) return;

    for (final xfile in picked) {
      final item = _UploadItem(
        localPath: xfile.path,
        preview: File(xfile.path),
      );
      setState(() => _items.add(item));
      _uploadItem(item);
    }
  }

  List<String> get _allUrls => [
    ..._uploadedUrls,
    ..._items.where((i) => i.status == _ItemStatus.done && i.url != null).map((i) => i.url!),
  ];

  Future<void> _uploadItem(_UploadItem item) async {
    try {
      final url = await CloudinaryService.uploadImage(
        item.localPath,
        folder: widget.folder,
        onProgress: (p) {
          if (!mounted) return;
          setState(() => item.progress = p);
        },
      );
      if (!mounted) return;
      setState(() {
        item.status = _ItemStatus.done;
        item.progress = 100;
        item.url = url;
      });
      widget.onChanged(_allUrls);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        item.status = _ItemStatus.error;
        item.error = e.toString();
      });
    }
  }

  void _removeUploaded(int index) {
    setState(() => _uploadedUrls.removeAt(index));
    widget.onChanged(_allUrls);
  }

  void _removeItem(int index) {
    setState(() => _items.removeAt(index));
    widget.onChanged(_allUrls);
  }

  void _retryItem(int index) {
    final item = _items[index];
    setState(() {
      item.status = _ItemStatus.uploading;
      item.progress = 0;
      item.error = null;
    });
    _uploadItem(item);
  }

  bool get _uploading => _items.any((i) => i.status == _ItemStatus.uploading);

  @override
  Widget build(BuildContext context) {
    final seedCount = _uploadedUrls.length; // pre-existing (edit mode)
    final doneCount = _items.where((i) => i.status == _ItemStatus.done).length;
    final uploadedCount = seedCount + doneCount;
    final hasPhotos = seedCount > 0 || _items.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Tip banner ──
        if (widget.hint.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: widget.primaryColor.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              Icon(Icons.tips_and_updates_outlined, size: 16, color: widget.primaryColor),
              const SizedBox(width: 10),
              Expanded(child: Text(widget.hint, style: TextStyle(fontSize: 12, color: widget.primaryColor.withValues(alpha: 0.85), height: 1.4))),
            ]),
          ),
        const SizedBox(height: 16),

        // ── Photo count + source buttons ──
        Row(
          children: [
            if (hasPhotos)
              Expanded(
                child: Text(
                  '$uploadedCount photo${uploadedCount == 1 ? '' : 's'} uploaded'
                  '${_items.any((i) => i.status == _ItemStatus.uploading) ? '  •  Uploading…' : ''}',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.foggy),
                ),
              )
            else
              const Spacer(),
            _SourceButton(
              icon: Icons.photo_library_outlined,
              label: 'Gallery',
              color: widget.primaryColor,
              onTap: () => _pick(ImageSource.gallery),
            ),
            const SizedBox(width: 8),
            _SourceButton(
              icon: Icons.camera_alt_outlined,
              label: 'Camera',
              color: AppColors.foggy,
              onTap: () => _pick(ImageSource.camera),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // ── Hero drop zone when empty ──
        if (!hasPhotos && _items.isEmpty)
          GestureDetector(
            onTap: () => _pick(ImageSource.gallery),
            child: Container(
              width: double.infinity,
              height: 180,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [widget.primaryColor.withValues(alpha: 0.07), widget.primaryColor.withValues(alpha: 0.02)],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: widget.primaryColor.withValues(alpha: 0.25), width: 1.5),
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Container(
                  width: 60, height: 60,
                  decoration: BoxDecoration(color: widget.primaryColor.withValues(alpha: 0.10), shape: BoxShape.circle),
                  child: Icon(Icons.add_photo_alternate_outlined, size: 28, color: widget.primaryColor),
                ),
                const SizedBox(height: 14),
                Text('Tap to add photos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.black.withValues(alpha: 0.8))),
                const SizedBox(height: 4),
                Text('JPG, PNG, HEIC · Up to 20', style: TextStyle(fontSize: 12, color: AppColors.foggy)),
              ]),
            ),
          ),

        // ── Cover shot (first item or first seed) ──
        if (seedCount > 0 && _items.isEmpty) ...[  // edit-mode only seeds
          _CoverCard(url: _uploadedUrls[0], onRemove: () => _removeUploaded(0)),
          const SizedBox(height: 8),
        ] else if (_items.isNotEmpty) ...[  // newly picked items
          _CoverCardItem(
            item: _items[0],
            primaryColor: widget.primaryColor,
            onRemove: () => _removeItem(0),
            onRetry: () => _retryItem(0),
          ),
          const SizedBox(height: 8),
        ],

        // ── Grid: remaining seeds (edit mode) + remaining items ──
        (() {
          final seedGridCount = (seedCount > 0 && _items.isEmpty) ? seedCount - 1 : seedCount;
          final itemGridStart = (_items.isNotEmpty) ? 1 : 0;
          final itemGridCount = _items.length > 1 ? _items.length - 1 : 0;
          final total = seedGridCount + itemGridCount;
          if (total == 0) return const SizedBox.shrink();
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8,
            ),
            itemCount: total,
            itemBuilder: (ctx, i) {
              if (i < seedGridCount) {
                final urlIdx = (_items.isEmpty ? 1 : 0) + i;
                return _GridTileUploaded(
                  url: _uploadedUrls[urlIdx],
                  onRemove: () => _removeUploaded(urlIdx),
                );
              }
              final itemIdx = itemGridStart + (i - seedGridCount);
              final item = _items[itemIdx];
              return _GridTileItem(
                item: item,
                primaryColor: widget.primaryColor,
                onRemove: () => _removeItem(itemIdx),
                onRetry: () => _retryItem(itemIdx),
              );
            },
          );
        })(),

        // ── Success banner ──
        if (!_uploading && uploadedCount >= 5)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(children: [
                Icon(Icons.check_circle, size: 18, color: Colors.green.shade600),
                const SizedBox(width: 10),
                Text('$uploadedCount photos ready — looking great!',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.green.shade700)),
              ]),
            ),
          ),
      ],
    );
  }
}

// ── Cover card ──
class _CoverCard extends StatelessWidget {
  const _CoverCard({required this.url, required this.onRemove});
  final String url;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Image.network(url, fit: BoxFit.cover,
            errorBuilder: (_, _, _) => Container(color: Colors.grey.shade200,
              child: const Icon(Icons.broken_image_outlined, color: Colors.grey))),
        ),
      ),
      Positioned(
        top: 8, left: 12,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(6),
          ),
          child: const Text('Cover photo', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
        ),
      ),
      Positioned(
        top: 8, right: 8,
        child: GestureDetector(
          onTap: onRemove,
          child: Container(
            width: 28, height: 28,
            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
            child: const Icon(Icons.close, size: 16, color: Colors.white),
          ),
        ),
      ),
    ],
  );
}

// ── Cover card for a newly picked item (local file preview + upload overlay) ──
class _CoverCardItem extends StatelessWidget {
  const _CoverCardItem({
    required this.item,
    required this.primaryColor,
    required this.onRemove,
    required this.onRetry,
  });
  final _UploadItem item;
  final Color primaryColor;
  final VoidCallback onRemove;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Image.file(item.preview, fit: BoxFit.cover),
          ),
        ),
        // Dark overlay while uploading
        if (item.status == _ItemStatus.uploading)
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(color: Colors.black.withValues(alpha: 0.45)),
            ),
          ),
        // Cover label
        Positioned(
          top: 8, left: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Text('Cover photo', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
        ),
        // Progress overlay
        if (item.status == _ItemStatus.uploading)
          Positioned.fill(
            child: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(
                  '${item.progress.round()}%',
                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: 80,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: item.progress / 100,
                      backgroundColor: Colors.white.withValues(alpha: 0.3),
                      valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                      minHeight: 5,
                    ),
                  ),
                ),
              ]),
            ),
          ),
        // Done checkmark
        if (item.status == _ItemStatus.done)
          Positioned(
            bottom: 10, right: 10,
            child: Container(
              width: 28, height: 28,
              decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
              child: const Icon(Icons.check, size: 18, color: Colors.white),
            ),
          ),
        // Error banner
        if (item.status == _ItemStatus.error)
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                color: Colors.red.withValues(alpha: 0.6),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.error_outline, color: Colors.white, size: 28),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: onRetry,
                    child: const Text('Retry', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
            ),
          ),
        // Remove button
        if (item.status != _ItemStatus.uploading)
          Positioned(
            top: 8, right: 8,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 28, height: 28,
                decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                child: const Icon(Icons.close, size: 16, color: Colors.white),
              ),
            ),
          ),
      ],
    );
  }
}

// ── Uploaded grid tile ──
class _GridTileUploaded extends StatelessWidget {
  const _GridTileUploaded({required this.url, required this.onRemove});
  final String url;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) => Stack(fit: StackFit.expand, children: [
    ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Image.network(url, fit: BoxFit.cover,
        errorBuilder: (_, _, _) => Container(color: Colors.grey.shade200)),
    ),
    Positioned(
      top: 4, right: 4,
      child: GestureDetector(
        onTap: onRemove,
        child: Container(
          width: 22, height: 22,
          decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
          child: const Icon(Icons.close, size: 14, color: Colors.white),
        ),
      ),
    ),
  ]);
}

// ── In-progress / done / error grid tile ──
class _GridTileItem extends StatelessWidget {
  const _GridTileItem({
    required this.item,
    required this.primaryColor,
    required this.onRemove,
    required this.onRetry,
  });
  final _UploadItem item;
  final Color primaryColor;
  final VoidCallback onRemove;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Stack(fit: StackFit.expand, children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.file(item.preview, fit: BoxFit.cover),
      ),

      // Dark overlay while uploading
      if (item.status == _ItemStatus.uploading)
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Container(color: Colors.black.withValues(alpha: 0.45)),
        ),

      // Progress indicator
      if (item.status == _ItemStatus.uploading) ...[
        Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(
              '${item.progress.round()}%',
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: 50,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: item.progress / 100,
                  backgroundColor: Colors.white.withValues(alpha: 0.3),
                  valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                  minHeight: 4,
                ),
              ),
            ),
          ]),
        ),
      ],

      // Done checkmark
      if (item.status == _ItemStatus.done)
        Positioned(
          bottom: 6, right: 6,
          child: Container(
            width: 22, height: 22,
            decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
            child: const Icon(Icons.check, size: 14, color: Colors.white),
          ),
        ),

      // Error state
      if (item.status == _ItemStatus.error)
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Container(
            color: Colors.red.withValues(alpha: 0.6),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, color: Colors.white, size: 22),
              const SizedBox(height: 4),
              GestureDetector(
                onTap: onRetry,
                child: const Text('Retry', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ]),
          ),
        ),

      // Remove button (only when not uploading)
      if (item.status != _ItemStatus.uploading)
        Positioned(
          top: 4, right: 4,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              width: 22, height: 22,
              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
              child: const Icon(Icons.close, size: 14, color: Colors.white),
            ),
          ),
        ),
    ]);
  }
}

// ── Source button pill ──
class _SourceButton extends StatelessWidget {
  const _SourceButton({required this.icon, required this.label, required this.color, required this.onTap});
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 15, color: color),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
      ]),
    ),
  );
}
