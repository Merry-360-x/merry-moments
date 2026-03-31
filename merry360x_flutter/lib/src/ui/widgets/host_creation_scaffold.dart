import 'package:flutter/material.dart';

import '../../app.dart';

class HostCreationScaffold extends StatelessWidget {
  const HostCreationScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.step,
    required this.totalSteps,
    required this.stepTitle,
    required this.onBack,
    required this.body,
    this.bottomNav,
  });

  final String title;
  final String subtitle;
  final int step;
  final int totalSteps;
  final String stepTitle;
  final VoidCallback onBack;
  final Widget body;
  final Widget? bottomNav;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ──
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 10, 16, 0),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: onBack,
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.chevron_left, size: 20, color: Colors.black54),
                          Text(
                            step > 1 ? 'Back' : 'Cancel',
                            style: const TextStyle(fontSize: 14, color: Colors.black54),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.black),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 60),
                ],
              ),
            ),
            // ── Step bubble indicator ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 4),
              child: Row(
                children: List.generate(totalSteps * 2 - 1, (i) {
                  if (i.isOdd) {
                    final done = (i ~/ 2 + 1) < step;
                    return Expanded(
                      child: Container(
                        height: 2,
                        color: done ? AppColors.rausch : Colors.grey.shade200,
                      ),
                    );
                  }
                  final dotStep = i ~/ 2 + 1;
                  final isDone = dotStep < step;
                  final isActive = dotStep == step;
                  if (isDone) {
                    return Container(
                      width: 24, height: 24,
                      decoration: const BoxDecoration(color: AppColors.rausch, shape: BoxShape.circle),
                      child: const Icon(Icons.check, size: 13, color: Colors.white),
                    );
                  }
                  if (isActive) {
                    return Container(
                      width: 24, height: 24,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.rausch, width: 2),
                      ),
                      child: Center(
                        child: Text(
                          '$dotStep',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.rausch),
                        ),
                      ),
                    );
                  }
                  return Container(
                    width: 24, height: 24,
                    decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle),
                    child: Center(
                      child: Text(
                        '$dotStep',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.grey.shade400),
                      ),
                    ),
                  );
                }),
              ),
            ),
            // ── Step label ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    stepTitle,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black54),
                  ),
                  Text(
                    '$step of $totalSteps',
                    style: const TextStyle(fontSize: 11, color: Colors.black38),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            LinearProgressIndicator(
              value: totalSteps <= 0 ? 0 : (step / totalSteps),
              backgroundColor: Colors.grey.shade100,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.rausch),
              minHeight: 2,
            ),
            Expanded(child: body),
            if (bottomNav != null)
              SizedBox(width: double.infinity, child: bottomNav!),
          ],
        ),
      ),
    );
  }
}
