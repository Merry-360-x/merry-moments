import 'package:flutter/material.dart';
import '../../app.dart';

/// Widget to show real-time progress for multiple images uploading in parallel.
/// Displays up to 5 concurrent uploads with individual progress bars and percentages.
class ImageUploadProgress extends StatelessWidget {
  const ImageUploadProgress({
    super.key,
    required this.totalImages,
    required this.completedImages,
    required this.uploadProgress,
  });

  final int totalImages;
  final int completedImages;
  /// Map of image index to upload progress (0-100)
  final Map<int, double> uploadProgress;

  @override
  Widget build(BuildContext context) {
    if (totalImages == 0) return const SizedBox.shrink();

    // Get currently uploading images (progress > 0 and < 100)
    final uploading = uploadProgress.entries
        .where((e) => e.value > 0 && e.value < 100)
        .toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Overall progress
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Uploading images…',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.black,
                ),
              ),
              Text(
                '$completedImages / $totalImages',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.rausch,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Overall progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: totalImages > 0 ? completedImages / totalImages : 0,
              backgroundColor: Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.rausch),
              minHeight: 6,
            ),
          ),

          // Individual upload progress (show up to 5 concurrent)
          if (uploading.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 12),
            ...uploading.take(5).map((entry) {
              final index = entry.key;
              final percent = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Image ${index + 1}',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.foggy,
                          ),
                        ),
                        Text(
                          '${percent.round()}%',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.black,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: Container(
                        height: 4,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF2196F3), Color(0xFF4CAF50)],
                          ),
                        ),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: percent / 100,
                          child: Container(color: Colors.transparent),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}
