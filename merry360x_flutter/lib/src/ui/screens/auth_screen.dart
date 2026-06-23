import 'dart:io';

import 'package:flutter/material.dart';

import '../../app.dart';
import '../../../l10n/app_localizations.dart';
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

class _AuthScreenState extends State<AuthScreen>
    with SingleTickerProviderStateMixin {
  bool _isLogin = true;

  // Login fields
  bool _obscureLogin = true;
  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();

  // Signup steps: 0=name, 1=email, 2=password
  int _signupStep = 0;
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscureSignup = true;

  String? _error;
  bool _busy = false;
  late AppLocalizations _l;

  late AnimationController _slideCtrl;
  late Animation<Offset> _slideIn;
  late Animation<double> _fadeIn;

  final _nameFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _slideCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 260),
    );
    _slideIn = Tween<Offset>(
      begin: const Offset(0.18, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideCtrl, curve: Curves.easeOutCubic));
    _fadeIn = CurvedAnimation(parent: _slideCtrl, curve: Curves.easeOut);
    _slideCtrl.forward();
  }

  @override
  void dispose() {
    _slideCtrl.dispose();
    _loginEmailController.dispose();
    _loginPasswordController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _nameFocus.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _animateStep() {
    _slideCtrl.forward(from: 0);
    setState(() => _error = null);
  }

  bool _isStrongPassword(String p) {
    return p.length >= 8 &&
        p.contains(RegExp(r'[a-z]')) &&
        p.contains(RegExp(r'[A-Z]')) &&
        p.contains(RegExp(r'[0-9]')) &&
        p.contains(RegExp(r"""[!@#$%^&*()_+\-=\[\]{};:'"|<>?,./`~]"""));
  }

  void _nextSignupStep() {
    if (_signupStep == 0) {
      // name is optional — allow empty
      _animateStep();
      setState(() => _signupStep = 1);
      Future.delayed(
        const Duration(milliseconds: 80),
        () => _emailFocus.requestFocus(),
      );
    } else if (_signupStep == 1) {
      final email = _emailController.text.trim();
      if (email.isEmpty || !email.contains('@')) {
        setState(() => _error = _l.invalidEmail);
        return;
      }
      _animateStep();
      setState(() => _signupStep = 2);
      Future.delayed(
        const Duration(milliseconds: 80),
        () => _passwordFocus.requestFocus(),
      );
    }
  }

  void _prevSignupStep() {
    if (_signupStep > 0) {
      setState(() {
        _signupStep--;
        _error = null;
      });
      _slideCtrl.forward(from: 0);
    }
  }

  Future<void> _submitSignup() async {
    final password = _passwordController.text;
    if (!_isStrongPassword(password)) {
      setState(() => _error = _l.passwordRequirements);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final name = _nameController.text.trim();
      final email = _emailController.text.trim();
      await widget.session.signUpWithEmail(
        email,
        password,
        fullName: name.isEmpty ? null : name,
      );
      if (!mounted) return;
      if (widget.session.isAuthenticated) {
        // Auto-confirm is on — user is immediately signed in, close the sheet
        widget.onAuthenticated?.call();
      } else {
        // Email confirmation required — notify and dismiss
        AppSnackBar.success(
          context,
          _l.accountCreatedCheckEmail,
        );
        Navigator.of(context).maybePop();
      }
    } catch (e) {
      debugPrint('[AuthScreen] signup error: $e');
      if (mounted) setState(() => _error = _friendlyError(e.toString()));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitLogin() async {
    final email = _loginEmailController.text.trim();
    final password = _loginPasswordController.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = _l.enterEmailAndPassword);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.session.signInWithEmail(email, password);
      if (mounted) widget.onAuthenticated?.call();
    } catch (e) {
      debugPrint('[AuthScreen] login error: $e');
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
      if (mounted) widget.onAuthenticated?.call();
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
    });
    try {
      await widget.session.signInWithGoogle();
      if (!mounted) return;
      if (widget.session.isAuthenticated) {
        widget.onAuthenticated?.call();
      } else {
        widget.onBrowseAsGuest?.call();
      }
    } catch (e) {
      if (mounted) setState(() => _error = _friendlyError(e.toString()));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _friendlyError(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('nonce validation') ||
        lower.contains('skip nonce checks')) {
      return 'Google sign-in needs one setup step in Supabase: enable Skip nonce checks for Google provider.';
    }
    if (lower.contains('unacceptable audience') ||
        lower.contains('configuration mismatch')) {
      return 'Google sign-in setup mismatch. Use the same Web client ID in Supabase and GOOGLE_WEB_CLIENT_ID.';
    }
    if (lower.contains('missing id token')) {
      return 'Google sign-in setup incomplete. Set GOOGLE_WEB_CLIENT_ID for mobile sign-in.';
    }
    if (lower.contains('invalid login credentials') ||
        lower.contains('invalid login')) {
      return _l.incorrectEmailOrPassword;
    }
    if (lower.contains('email not confirmed')) {
      return _l.pleaseVerifyEmail;
    }
    if (lower.contains('user already registered') ||
        lower.contains('already registered')) {
      return _l.accountAlreadyExists;
    }
    if (lower.contains('canceled') || lower.contains('cancelled')) {
      return _l.signInCancelled;
    }
    if (lower.contains('email signups are disabled') ||
        lower.contains('signups not allowed')) {
      return _l.signUpsDisabled;
    }
    if (lower.contains('database error') ||
        lower.contains('unexpected_failure')) {
      return _l.serverError;
    }
    if (lower.contains('invalid email') ||
        lower.contains('unable to validate email')) {
      return _l.invalidEmail;
    }
    if (lower.contains('weak_password') ||
        lower.contains('weak password') ||
        (lower.contains('password') && lower.contains('should contain'))) {
      return _l.passwordRequirements;
    }
    if (lower.contains('password') &&
        (lower.contains('short') || lower.contains('characters'))) {
      return _l.passwordTooShort;
    }
    if (lower.contains('rate limit') ||
        lower.contains('too many') ||
        lower.contains('over_email_send_rate_limit')) {
      return _l.tooManyAttempts;
    }
    if (lower.contains('network') ||
        lower.contains('socket') ||
        lower.contains('connection')) {
      return _l.networkError;
    }
    debugPrint('[AuthScreen] unhandled error: $raw');
    return _l.somethingWentWrong;
  }

  void _showForgotPassword() {
    final l = AppLocalizations.of(context)!;
    final emailCtrl = TextEditingController(
      text: _loginEmailController.text.trim(),
    );
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
              l.resetPassword,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 17,
                color: AppColors.black,
              ),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  l.resetPasswordDesc,
                  style: const TextStyle(color: AppColors.hof, fontSize: 13),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: l.emailAddress,
                    hintStyle: const TextStyle(color: AppColors.foggy),
                    filled: true,
                    fillColor: AppColors.surfaceSubtle,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(
                        color: AppColors.rausch,
                        width: 1.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(
                  l.cancel,
                  style: const TextStyle(color: AppColors.foggy),
                ),
              ),
              FilledButton(
                onPressed: sending
                    ? null
                    : () async {
                        final email = emailCtrl.text.trim();
                        if (email.isEmpty) return;
                        setLocal(() => sending = true);
                        try {
                          await widget.session.forgotPassword(email);
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (!mounted) return;
                          AppSnackBar.success(
                            context,
                            l.resetLinkSent,
                          );
                        } catch (e) {
                          if (!ctx.mounted) return;
                          AppSnackBar.error(ctx, 'Error: ${e.toString()}');
                        } finally {
                          if (ctx.mounted) setLocal(() => sending = false);
                        }
                      },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.rausch,
                ),
                child: sending
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(l.sendResetLink),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    _l = AppLocalizations.of(context)!;
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
                    image: AssetImage('assets/brand/launcher-icon.png'),
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              SizedBox(height: isTablet ? 22 : 16),

              Text(
                _l.welcomeToMerry,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: isTablet ? 28 : 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.black,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _isLogin
                    ? _l.continueToAccount
                    : _l.createAccountToStart,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.hof,
                  fontSize: isTablet ? 15 : 13,
                ),
              ),
              SizedBox(height: isTablet ? 22 : 18),

              // ---- SIGNUP: step-by-step ----
              if (!_isLogin) ...[
                _SignupStepDots(currentStep: _signupStep),
                const SizedBox(height: 18),
                FadeTransition(
                  opacity: _fadeIn,
                  child: SlideTransition(
                    position: _slideIn,
                    child: _buildSignupStep(isTablet),
                  ),
                ),
              ],

              // ---- LOGIN: single screen ----
              if (_isLogin) ...[
                TextField(
                  controller: _loginEmailController,
                  decoration: _inputDecoration(_l.emailAddress),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _loginPasswordController,
                  decoration: _inputDecoration(_l.password).copyWith(
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureLogin ? Icons.visibility_off : Icons.visibility,
                        color: AppColors.foggy,
                      ),
                      onPressed: () =>
                          setState(() => _obscureLogin = !_obscureLogin),
                    ),
                  ),
                  obscureText: _obscureLogin,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _busy ? null : _submitLogin(),
                ),
                const SizedBox(height: 14),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(
                      _error!,
                      style: const TextStyle(
                        color: Color(0xFFC13515),
                        fontSize: 13,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                SizedBox(
                  height: 50,
                  child: FilledButton(
                    onPressed: _busy ? null : _submitLogin,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.rausch,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: _busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            _l.continueButton,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 10),
                Center(
                  child: TextButton(
                    onPressed: _busy ? null : _showForgotPassword,
                    child: Text(
                      _l.forgotPassword,
                      style: const TextStyle(color: AppColors.rausch, fontSize: 13),
                    ),
                  ),
                ),
              ],

              Center(
                child: TextButton(
                  onPressed: () => setState(() {
                    _isLogin = !_isLogin;
                    _signupStep = 0;
                    _error = null;
                    _slideCtrl.forward(from: 0);
                  }),
                  child: Text(
                    _isLogin
                        ? _l.newHereCreate
                        : _l.alreadyHaveAccount,
                    style: const TextStyle(
                      color: AppColors.foggy,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(child: Divider(color: AppColors.border)),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      _l.or,
                      style: const TextStyle(color: AppColors.foggy, fontSize: 14),
                    ),
                  ),
                  Expanded(child: Divider(color: AppColors.border)),
                ],
              ),
              const SizedBox(height: 16),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _SocialSquareButton(
                    label: 'Google',
                    onTap: _busy ? null : _googleSignIn,
                    isLoading: false,
                    iconUrl:
                        'https://www.gstatic.com/images/branding/product/1x/googleg_64dp.png',
                    child: const Text(''),
                  ),
                  const SizedBox(width: 12),
                  _SocialSquareButton(
                    label: 'Apple',
                    onTap: (Platform.isIOS || Platform.isMacOS) && !_busy
                        ? _appleSignIn
                        : null,
                    child: const Icon(
                      Icons.apple,
                      size: 20,
                      color: AppColors.black,
                    ),
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
                  child: Text(
                    _l.continueAsGuest,
                    style: const TextStyle(color: AppColors.foggy, fontSize: 14),
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
        color: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          side: BorderSide(
            color: AppColors.border.withValues(alpha: isDark ? 0.95 : 1.0),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.border,
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
                    icon: const Icon(
                      Icons.close_rounded,
                      color: AppColors.black,
                    ),
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

  Widget _buildSignupStep(bool isTablet) {
    switch (_signupStep) {
      case 0:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _l.whatsYourName,
              style: TextStyle(
                fontSize: isTablet ? 17 : 15,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _l.youCanChangeLater,
              style: const TextStyle(fontSize: 13, color: AppColors.foggy),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              focusNode: _nameFocus,
              decoration: _inputDecoration(_l.fullName),
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              autofocus: true,
              onSubmitted: (_) => _nextSignupStep(),
            ),
            if (_error != null) _errorText(),
            const SizedBox(height: 14),
            _continueButton(label: _l.continueButton, onTap: _nextSignupStep),
          ],
        );
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _l.yourEmailAddress,
              style: TextStyle(
                fontSize: isTablet ? 17 : 15,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _l.verificationLinkHint,
              style: const TextStyle(fontSize: 13, color: AppColors.foggy),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              focusNode: _emailFocus,
              decoration: _inputDecoration(_l.emailAddress),
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              textInputAction: TextInputAction.next,
              autofocus: true,
              onSubmitted: (_) => _nextSignupStep(),
            ),
            if (_error != null) _errorText(),
            const SizedBox(height: 14),
            _continueButton(label: _l.continueButton, onTap: _nextSignupStep),
            const SizedBox(height: 6),
            _backButton(),
          ],
        );
      case 2:
      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _l.createPassword,
              style: TextStyle(
                fontSize: isTablet ? 17 : 15,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _l.passwordHint,
              style: const TextStyle(fontSize: 12, color: Color(0xFF8A8A8F)),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              focusNode: _passwordFocus,
              decoration: _inputDecoration(_l.password).copyWith(
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureSignup ? Icons.visibility_off : Icons.visibility,
                    color: AppColors.foggy,
                  ),
                  onPressed: () =>
                      setState(() => _obscureSignup = !_obscureSignup),
                ),
              ),
              obscureText: _obscureSignup,
              textInputAction: TextInputAction.done,
              autofocus: true,
              onSubmitted: (_) => _busy ? null : _submitSignup(),
            ),
            if (_error != null) _errorText(),
            const SizedBox(height: 14),
            _continueButton(
              label: _l.createAccount,
              onTap: _busy ? null : _submitSignup,
              loading: _busy,
            ),
            const SizedBox(height: 6),
            _backButton(),
          ],
        );
    }
  }

  Widget _errorText() => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Text(
      _error!,
      style: const TextStyle(color: Color(0xFFC13515), fontSize: 13),
      textAlign: TextAlign.center,
    ),
  );

  Widget _continueButton({
    required String label,
    VoidCallback? onTap,
    bool loading = false,
  }) => SizedBox(
    height: 50,
    child: FilledButton(
      onPressed: onTap,
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.rausch,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: loading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : Text(
              label,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
    ),
  );

  Widget _backButton() => Center(
    child: TextButton(
      onPressed: _prevSignupStep,
      child: Text(
        _l.back,
        style: const TextStyle(color: AppColors.foggy, fontSize: 13),
      ),
    ),
  );

  InputDecoration _inputDecoration(String label) {
    final isDark = AppColors.effectiveBrightness == Brightness.dark;
    final fill = isDark ? const Color(0xFF1C1C1E) : AppColors.surfaceSubtle;
    final border = isDark ? const Color(0xFF38383A) : const Color(0xFFD4D4D8);

    return InputDecoration(
      labelText: label,
      floatingLabelBehavior: FloatingLabelBehavior.never,
      filled: true,
      fillColor: fill,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: const TextStyle(color: AppColors.foggy),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.black, width: 2),
      ),
    );
  }
}

class _SignupStepDots extends StatelessWidget {
  const _SignupStepDots({required this.currentStep});
  final int currentStep;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (i) {
        final active = i == currentStep;
        final done = i < currentStep;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: active ? 22 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: done
                ? AppColors.rausch.withValues(alpha: 0.45)
                : active
                ? AppColors.rausch
                : AppColors.border,
            borderRadius: BorderRadius.circular(999),
          ),
        );
      }),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? const Color(0xFF38383A) : AppColors.border,
              width: 1.2,
            ),
          ),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFF888888),
                    ),
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
