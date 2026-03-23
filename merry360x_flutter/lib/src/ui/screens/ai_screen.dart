import 'package:flutter/material.dart';

class AiScreen extends StatelessWidget {
  const AiScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        Row(
          children: [
            const Text('Merry AI', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF202025))),
            const Spacer(),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0x1AE2555A),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.auto_awesome, color: Color(0xFFE2555A), size: 18),
            ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'Travel assistant for stays, tours and transport',
          style: TextStyle(color: Color(0xFF7B7B86), fontSize: 13),
        ),
        const SizedBox(height: 14),
        const Text('Try asking:', style: TextStyle(fontSize: 13, color: Color(0xFF7B7B86), fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: const [
            _PromptChip(label: 'Cheapest stay in Kigali'),
            _PromptChip(label: 'Family-friendly stays'),
            _PromptChip(label: '2-day Rwanda tour plan'),
            _PromptChip(label: 'Airport transport options'),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE7E7EC)),
            boxShadow: const [
              BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Hi! I am Merry AI, your personal travel assistant.',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text('I can help you find stays, compare prices, and plan your itinerary.', style: TextStyle(color: Color(0xFF71717A))),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF7F7FA),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFE7E7EC)),
                ),
                child: const Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Ask about places, tours, packages...',
                        style: TextStyle(color: Color(0xFF91919C)),
                      ),
                    ),
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: Color(0xFFE2555A),
                      child: Icon(Icons.arrow_upward, color: Colors.white, size: 16),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PromptChip extends StatelessWidget {
  const _PromptChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE4E4E9)),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}
