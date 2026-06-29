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
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        leading: const StageSafeLeadingButton(color: AppColors.black),
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
                      color: AppColors.surface,
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
                          _buildFallbackContent(title)
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

  Widget _buildFallbackContent(String title) {
    final paragraphs = _fallbackSections(title);
    if (paragraphs == null) {
      return Text(widget.emptyMessage,
          style: const TextStyle(fontSize: 15, color: AppColors.foggy, height: 1.6));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: paragraphs
          .map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 18),
                child: Text(p,
                    style: const TextStyle(fontSize: 15, color: AppColors.hof, height: 1.7)),
              ))
          .toList(),
    );
  }

  List<String>? _fallbackSections(String title) {
    switch (widget.contentType) {
      case 'eula':
        return const [
          'This End User License Agreement (EULA) governs your use of the Merry 360X mobile application and platform. By creating an account or using the app, you agree to be bound by this EULA.',
          'ZERO TOLERANCE FOR OBJECTIONABLE CONTENT: Merry 360X maintains a strict zero-tolerance policy toward objectionable content. This includes but is not limited to: hate speech, harassment, bullying, threats, discriminatory remarks, sexually explicit material, fraudulent content, and any content that violates applicable laws or regulations. Any such content will be immediately removed upon discovery, and the responsible user will be permanently banned from the platform.',
          'ZERO TOLERANCE FOR ABUSIVE USERS: Abusive behavior, including harassment, intimidation, or targeting of other users, will result in immediate and permanent account termination. Merry 360X is committed to maintaining a safe and respectful community for all users.',
          'CONTENT FILTERING: The app uses automated filters to screen messages and content for prohibited material, including contact details, external links, and abusive language. These filters operate in real-time to prevent objectionable content from being shared.',
          'REPORTING OBJECTIONABLE CONTENT: Users are encouraged to report any content or behavior they believe violates this EULA. Reports can be submitted via the in-app report button available on stories, messages, and user profiles. Our moderation team reviews all reports within 24 hours and takes appropriate action, including content removal and user ejection.',
          'BLOCKING ABUSIVE USERS: Users have the ability to block any other user who is engaging in abusive or unwanted behavior. Once blocked, the abusive user cannot send messages or interact with the user who blocked them. Blocking actions are recorded, and developers are notified of the associated inappropriate content.',
          'MODERATION AND ENFORCEMENT: Merry 360X will act on all objectionable content reports within 24 hours. Actions may include: removing the offending content, issuing warnings, suspending accounts, or permanently ejecting the user responsible. Repeat offenders will be permanently banned without warning.',
          'CONTACT: For questions or concerns about this EULA, please contact support@merry360x.com.',
        ];
      case 'terms_and_conditions':
        return const [
          'By creating an account or using Merry 360X, you agree to these Terms and Conditions. If you do not agree, do not use the service.',
          'ZERO TOLERANCE POLICY: Merry 360X has a zero-tolerance policy for objectionable content and abusive users. Any content that is harassing, threatening, discriminatory, fraudulent, sexually explicit, or otherwise objectionable is strictly prohibited. Any user found violating this policy will have their content removed immediately and their account permanently terminated.',
          'USER CONDUCT: You agree not to post or share any content that: (a) is defamatory, harassing, or abusive; (b) contains hate speech or promotes discrimination; (c) is fraudulent or misleading; (d) infringes on others rights; (e) contains explicit or violent material; (f) solicits illegal activities.',
          'CONTENT MODERATION: Merry 360X employs automated filtering systems to detect and block prohibited content, including contact information sharing, external links, and abusive language. Our moderation team reviews reported content within 24 hours and takes appropriate action.',
          'REPORTING MECHANISM: Users can report objectionable content or abusive behavior through the in-app report function available on stories, messages, and user profiles. Reports are reviewed by our moderation team, and action is taken within 24 hours.',
          'BLOCKING MECHANISM: Users can block abusive users through the messaging interface. Blocked users cannot send messages or interact with the user who blocked them. All blocking actions are logged, and developers are notified of inappropriate content associated with blocked users.',
          'ENFORCEMENT: Merry 360X reserves the right to remove any content and terminate any user account that violates these terms, at our sole discretion, without prior notice. Violations are investigated within 24 hours of reporting.',
          'CONTACT: For questions about these terms, contact support@merry360x.com.',
        ];
      default:
        return null;
    }
  }
}