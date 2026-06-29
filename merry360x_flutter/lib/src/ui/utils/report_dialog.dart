import 'package:flutter/material.dart';

import '../../session_controller.dart';
import '../../app.dart';
import '../../../l10n/app_localizations.dart';
import 'app_snackbar.dart';

void showReportDialog({
  required BuildContext context,
  required SessionController session,
  String? reportedUserId,
  String? reportedPropertyId,
  String title = 'Report',
  String subtitle = 'Report this content',
}) {
  final l = AppLocalizations.of(context)!;
  final descCtrl = TextEditingController();
  String? selectedType;
  bool sending = false;

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setLocal) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return AlertDialog(
          backgroundColor: AppColors.surface,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: AppColors.border.withValues(alpha: isDark ? 0.95 : 1.0),
            ),
          ),
          title: Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: AppColors.black),
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(subtitle, style: const TextStyle(color: AppColors.hof, fontSize: 13)),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: selectedType,
                  decoration: InputDecoration(
                    labelText: 'Reason',
                    filled: true,
                    fillColor: AppColors.surfaceSubtle,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'spam', child: Text('Spam')),
                    DropdownMenuItem(value: 'harassment', child: Text('Harassment')),
                    DropdownMenuItem(value: 'inappropriate_content', child: Text('Inappropriate content')),
                    DropdownMenuItem(value: 'fake_review', child: Text('Fake review')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (v) => setLocal(() => selectedType = v),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descCtrl,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Describe the issue\u2026',
                    filled: true,
                    fillColor: AppColors.surfaceSubtle,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(l.cancel, style: const TextStyle(color: AppColors.foggy)),
            ),
            FilledButton(
              onPressed: sending
                  ? null
                  : () async {
                      if (selectedType == null || descCtrl.text.trim().isEmpty) return;
                      setLocal(() => sending = true);
                      try {
                        await session.reportContent(
                          incidentType: selectedType!,
                          description: descCtrl.text.trim(),
                          reportedUserId: reportedUserId,
                          reportedPropertyId: reportedPropertyId,
                        );
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                        if (!context.mounted) return;
                        AppSnackBar.success(context, 'Report submitted. We\'ll review it shortly.');
                      } catch (e) {
                        if (!ctx.mounted) return;
                        AppSnackBar.error(ctx, 'Error submitting report: $e');
                      } finally {
                        if (ctx.mounted) setLocal(() => sending = false);
                      }
                    },
              style: FilledButton.styleFrom(backgroundColor: AppColors.rausch),
              child: sending
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Submit Report'),
            ),
          ],
        );
      },
    ),
  );
}

void showBlockUserDialog({
  required BuildContext context,
  required SessionController session,
  required String userId,
  required String userName,
}) {
  final l = AppLocalizations.of(context)!;
  showDialog(
    context: context,
    builder: (ctx) {
      final isDark = Theme.of(ctx).brightness == Brightness.dark;
      return AlertDialog(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: AppColors.border.withValues(alpha: isDark ? 0.95 : 1.0),
          ),
        ),
        title: const Text('Block User', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: AppColors.black)),
        content: Text(
          'Block $userName? They won\'t be able to message you or interact with your content.',
          style: const TextStyle(color: AppColors.hof, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l.cancel, style: const TextStyle(color: AppColors.foggy)),
          ),
          FilledButton(
            onPressed: () async {
              try {
                await session.blockUser(userId: userId);
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                if (!context.mounted) return;
                AppSnackBar.success(context, 'Blocked $userName.');
              } catch (e) {
                if (!ctx.mounted) return;
                AppSnackBar.error(ctx, 'Error: $e');
              }
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.rausch),
            child: const Text('Block', style: TextStyle(color: Colors.white)),
          ),
        ],
      );
    },
  );
}
