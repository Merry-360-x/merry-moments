import 'package:flutter/material.dart';

import '../../session_controller.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _userIdController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _bioController = TextEditingController();
  bool _profilePrefilled = false;

  @override
  void dispose() {
    _userIdController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final profile = session.payload?.profile;

    if (profile != null && !_profilePrefilled) {
      _nameController.text = (profile['full_name'] ?? '').toString();
      _phoneController.text = (profile['phone'] ?? '').toString();
      _bioController.text = (profile['bio'] ?? '').toString();
      _profilePrefilled = true;
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        const Text('Profile', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF202025))),
        const SizedBox(height: 14),
        if (session.isAuthenticated)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE7E7EC)),
              boxShadow: const [
                BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4)),
              ],
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: const Color(0xFFF1F1F6),
                  child: Text(
                    (_nameController.text.isEmpty ? 'M' : _nameController.text).substring(0, 1).toUpperCase(),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF2A2A30)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _nameController.text.isEmpty ? 'Merry360x Member' : _nameController.text,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      const Text('Show profile', style: TextStyle(color: Color(0xFF7B7B86))),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Color(0xFF8A8A95)),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE7E7EC)),
            ),
            child: const Text('Log in to start planning your next trip.', style: TextStyle(fontSize: 16)),
          ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
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
              const Text('Connect account', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 8),
              TextField(
                controller: _userIdController,
                decoration: const InputDecoration(
                  labelText: 'Website user id',
                  hintText: 'Supabase user uuid',
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: FilledButton(
                  onPressed: () async {
                    await session.setUserId(_userIdController.text);
                    _profilePrefilled = false;
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Connected to website account data.')),
                      );
                    }
                  },
                  child: const Text('Connect account'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Current user id: ${session.userId.isEmpty ? 'Not connected' : session.userId}',
          style: const TextStyle(color: Color(0xFF666671)),
        ),
        const SizedBox(height: 4),
        Text('Roles: ${(session.payload?.roles ?? const []).join(', ')}', style: const TextStyle(color: Color(0xFF666671))),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE7E7EC)),
            boxShadow: const [
              BoxShadow(color: Color(0x10000000), blurRadius: 10, offset: Offset(0, 4)),
            ],
          ),
          child: Column(
            children: [
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Full name'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Phone'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _bioController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Bio'),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: FilledButton(
                  onPressed: session.isAuthenticated
                      ? () async {
                          await session.upsertProfile(
                            fullName: _nameController.text,
                            phone: _phoneController.text,
                            bio: _bioController.text,
                          );
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Profile synced to website.')),
                            );
                          }
                        }
                      : null,
                  child: const Text('Save to website'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE7E7EC)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Support & legal', style: TextStyle(fontWeight: FontWeight.w700)),
              SizedBox(height: 10),
              _ProfileRow(title: 'Help Center'),
              _ProfileRow(title: 'Privacy Policy'),
              _ProfileRow(title: 'Terms & Conditions'),
            ],
          ),
        ),
        if (session.error != null) ...[
          const SizedBox(height: 10),
          Text(session.error!, style: const TextStyle(color: Colors.red)),
        ],
      ],
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(child: Text(title, style: const TextStyle(fontSize: 15))),
          const Icon(Icons.chevron_right, color: Color(0xFF8A8A95), size: 20),
        ],
      ),
    );
  }
}
