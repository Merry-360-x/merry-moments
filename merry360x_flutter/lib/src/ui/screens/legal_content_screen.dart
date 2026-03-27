import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app.dart';

class LegalContentScreen extends StatefulWidget {
  const LegalContentScreen({
    super.key,
    required this.contentType,
    required this.fallbackTitle,
    required this.emptyMessage,
  });

  final String contentType;
  final String fallbackTitle;
  final String emptyMessage;

  @override
  State<LegalContentScreen> createState() => _LegalContentScreenState();
}

class _LegalContentScreenState extends State<LegalContentScreen> {
  Map<String, dynamic>? _content;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await Supabase.instance.client
          .from('legal_content')
          .select('*')
          .eq('content_type', widget.contentType)
          .maybeSingle();
      if (!mounted) return;
      setState(() {
        _content = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = (_content?['title'] ?? widget.fallbackTitle).toString();
    final updatedAt = _content?['updated_at']?.toString();
    final sections = ((_content?['content'] as Map?)?['sections'] as List?)
            ?.cast<Map>()
            .map((section) => section.map((key, value) => MapEntry('$key', value)))
            .toList() ??
        const <Map<String, dynamic>>[];

    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        leading: const BackButton(color: AppColors.black),
        title: Text(title),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.rausch))
          : RefreshIndicator(
              color: AppColors.rausch,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                children: [
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE7E7EC)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.black),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          updatedAt == null
                              ? 'Last updated recently'
                              : 'Last updated ${DateTime.tryParse(updatedAt)?.toLocal().toString().split(' ').first ?? updatedAt}',
                          style: const TextStyle(fontSize: 13, color: AppColors.foggy),
                        ),
                        const SizedBox(height: 18),
                        if (_error != null)
                          Text(
                            'Could not load content right now.',
                            style: TextStyle(color: Colors.red.shade400, fontSize: 14),
                          )
                        else if (sections.isEmpty)
                          Text(widget.emptyMessage, style: const TextStyle(fontSize: 15, color: AppColors.foggy, height: 1.6))
                        else
                          ...sections.map(
                            (section) => Padding(
                              padding: const EdgeInsets.only(bottom: 18),
                              child: Text(
                                (section['text'] ?? '').toString(),
                                style: const TextStyle(fontSize: 15, color: AppColors.hof, height: 1.7),
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
  }
}