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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: onBack,
                    child: Row(
                      children: [
                        const Icon(Icons.chevron_left, size: 22, color: Colors.black54),
                        Text(
                          step > 1 ? 'Back' : 'Cancel',
                          style: const TextStyle(fontSize: 14, color: Colors.black54),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          subtitle,
                          style: const TextStyle(fontSize: 12, color: Colors.black45),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 60),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Step $step of $totalSteps: $stepTitle',
                  style: const TextStyle(fontSize: 12, color: Colors.black45),
                ),
              ),
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: totalSteps <= 0 ? 0 : (step / totalSteps),
              backgroundColor: Colors.grey.shade200,
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.black26),
              minHeight: 3,
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
