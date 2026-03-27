import 'dart:io';

import 'package:flutter/material.dart';

import '../../app.dart';
import '../utils/app_snackbar.dart';

import '../../session_controller.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.session,
    this.asSheet = false,
    this.onAuthenticated,
    this.onBrowseAsGuest,
  });

  final SessionController session;
  final bool asSheet;
  final VoidCallback? onAuthenticated;
  final VoidCallback? onBrowseAsGuest;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  bool _obscure = true;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  String? _error;
  bool _busy = false;
  // Set to true after signInWithGoogle opens the browser; cleared when auth state changes.
  bool _awaitingOAuthCallback = false;

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_handleSessionChange);
  }

  @override
  void dispose() {
    widget.session.removeListener(_handleSessionChange);
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  // Called by SessionController.notifyListeners() — handles the async Google
  // OAuth callback completing after the external browser redirects back.
  void _handleSessionChange() {
    if (_awaitingOAuthCallback && widget.session.isAuthenticated && mounted) {
      _awaitingOAuthCallback = false;
      setState(() => _busy = false);
      widget.onAuthenticated?.call();
    }
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please enter email and password');
      return;
    }
    if (password.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_isLogin) {
        await widget.session.signInWithEmail(email, password);
        if (mounted) {
          widget.onAuthenticated?.call();
        }
      } else {
        final name = _nameController.text.trim();
        await widget.session.signUpWithEmail(email, password, fullName: name.isEmpty ? null : name);
        if (mounted) {
          AppSnackBar.success(context, 'Account created. Check your email to verify.');
        }
      }
    } catch (e) {
      setState(() => _error = _friendlyError(e.toString()));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _appleSignIn() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.session.signInWithApple();
      if (mounted) {
        widget.onAuthenticated?.call();
      }
    } catch (e) {
      setState(() => _error = _friendlyError(e.toString()));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _googleSignIn() async {
    setState(() {
      _busy = true;
      _error = null;
      _awaitingOAuthCallback = false;
    });
    try {
      await widget.session.signInWithGoogle();
      // signInWithOAuth returns immediately after opening the external browser.
      // Mark that we're waiting for the OAuth redirect deep link.
      if (mounted) {
        setState(() {
          _busy = false;
          _awaitingOAuthCallback = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = _friendlyError(e.toString());
          _busy = false;
          _awaitingOAuthCallback = false;
        });
      }
    }
  }

  String _friendlyError(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('invalid login')) return 'Incorrect email or password.';
    if (lower.contains('email not confirmed')) return 'Please verify your email first.';
    if (lower.contains('user already registered')) return 'An account with this email already exists.';
    if (lower.contains('canceled') || lower.contains('cancelled')) return 'Sign in was cancelled.';
    return 'Something went wrong. Please try again.';
  }

  void _showForgotPassword() {
    final emailCtrl = TextEditingController(text: _emailController.text.trim());
    bool sending = false;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Reset Password', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Enter your email and we\'ll send you a reset link.',
                style: TextStyle(color: Color(0xFF6A6A6A), fontSize: 13)),
            const SizedBox(height: 14),
            TextField(
              controller: emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                hintText: 'Email address',
                filled: true, fillColor: const Color(0xFFF2F2F5),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel', style: TextStyle(color: AppColors.foggy))),
            FilledButton(
              onPressed: sending ? null : () async {
                final email = emailCtrl.text.trim();
                if (email.isEmpty) return;
                setLocal(() => sending = true);
                try {
                  await widget.session.forgotPassword(email);
                  if (ctx.mounted) {
                    Navigator.pop(ctx);
                    AppSnackBar.success(context, 'Reset link sent! Check your email.');
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    AppSnackBar.error(context, 'Error: ${e.toString()}');
                  }
                } finally {
                  if (ctx.mounted) setLocal(() => sending = false);
                }
              },
              style: FilledButton.styleFrom(backgroundColor: AppColors.rausch),
              child: sending
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Send Reset Link'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final maxWidth = isTablet ? 640.0 : 480.0;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final horizontalPadding = isTablet ? 36.0 : 24.0;

    final form = SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        horizontalPadding,
        widget.asSheet ? (isTablet ? 20 : 12) : (isTablet ? 28 : 20),
        horizontalPadding,
        24 + bottomInset,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: Alignment.center,
                child: SizedBox(
                  width: isTablet ? 88 : 72,
                  height: isTablet ? 88 : 72,
                  child: const Image(
                    image: AssetImage('assets/brand/logo.png'),
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              SizedBox(height: isTablet ? 22 : 16),

              Text(
                'Welcome to Merry360x',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: isTablet ? 28 : 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.black,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _isLogin ? 'Continue to your account' : 'Create an account to get started',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: const Color(0xFF6A6A6A),
                  fontSize: isTablet ? 15 : 13,
                ),
              ),
              SizedBox(height: isTablet ? 22 : 18),

              if (!_isLogin) ...[
                TextField(
                  controller: _nameController,
                  decoration: _inputDecoration('Full name'),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 10),
              ],

              TextField(
                controller: _emailController,
                decoration: _inputDecoration('Email address'),
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
              ),
              const SizedBox(height: 10),

              TextField(
                controller: _passwordController,
                decoration: _inputDecoration('Password').copyWith(
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF848484)),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                obscureText: _obscure,
              ),
              const SizedBox(height: 14),

              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Color(0xFFC13515), fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),

              SizedBox(
                height: 50,
                child: FilledButton(
                  onPressed: _busy ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.rausch,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          _isLogin ? 'Continue' : 'Create account',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                        ),
                ),
              ),

              const SizedBox(height: 10),
              if (_isLogin)
                Center(
                  child: TextButton(
                    onPressed: _busy ? null : _showForgotPassword,
                    child: const Text('Forgot password?',
                        style: TextStyle(color: AppColors.rausch, fontSize: 13)),
                  ),
                ),
              Center(
                child: TextButton(
                  onPressed: () => setState(() => _isLogin = !_isLogin),
                  child: Text(
                    _isLogin ? 'New here? Create account' : 'Already have an account? Log in',
                    style: const TextStyle(color: Color(0xFF66666C), fontSize: 13),
                  ),
                ),
              ),

              const SizedBox(height: 18),
              Row(
                children: const [
                  Expanded(child: Divider(color: Color(0xFFD9D9DE))),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text('or', style: TextStyle(color: Color(0xFF8A8A8F), fontSize: 14)),
                  ),
                  Expanded(child: Divider(color: Color(0xFFD9D9DE))),
                ],
              ),
              const SizedBox(height: 16),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _SocialSquareButton(
                    label: 'Google',
                    onTap: (_busy || _awaitingOAuthCallback) ? null : _googleSignIn,
                    isLoading: _awaitingOAuthCallback,
                    iconUrl: 'https://www.gstatic.com/images/branding/product/1x/googleg_64dp.png',
                    child: const Text(''),
                  ),
                  const SizedBox(width: 12),
                  _SocialSquareButton(
                    label: 'Apple',
                    onTap: (Platform.isIOS || Platform.isMacOS) && !_busy ? _appleSignIn : null,
                    child: const Icon(Icons.apple, size: 20, color: Color(0xFF111111)),
                  ),
                ],
              ),

              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: () {
                    widget.session.refresh();
                    widget.onBrowseAsGuest?.call();
                  },
                  child: const Text(
                    'Continue as guest',
                    style: TextStyle(color: Color(0xFF66666C), fontSize: 14),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (widget.asSheet) {
      return Material(
        color: const Color(0xFFF7F7F8),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFFD0D1D7),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(
                children: [
                  const Spacer(),
                  IconButton(
                    tooltip: 'Close',
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF333333)),
                    onPressed: () => Navigator.of(context).maybePop(),
                  ),
                ],
              ),
            ),
            Expanded(child: form),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.linnen,
      body: SafeArea(child: form),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      floatingLabelBehavior: FloatingLabelBehavior.never,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFD4D4D8)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFD4D4D8)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.black, width: 2),
      ),
    );
  }

}

class _SocialSquareButton extends StatelessWidget {
  const _SocialSquareButton({
    required this.label,
    required this.child,
    this.onTap,
    this.iconUrl,
    this.isLoading = false,
  });

  final String label;
  final Widget child;
  final VoidCallback? onTap;
  final String? iconUrl;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          width: 98,
          height: 58,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFD7D7DB)),
          ),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF888888)),
                  )
                : iconUrl == null
                    ? child
                    : Image.network(
                        iconUrl!,
                        width: 22,
                        height: 22,
                        fit: BoxFit.contain,
                      ),
          ),
        ),
      ),
    );
  }
}
