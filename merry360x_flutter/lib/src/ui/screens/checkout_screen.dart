import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../session_controller.dart';
import 'explore_screen.dart' show resolveListingImageUrl;

// ─────────────────────────────────────────────────────────────────────────────
// Payment method definitions (mirrors web Checkout.tsx)
// ─────────────────────────────────────────────────────────────────────────────

class _PayMethod {
  const _PayMethod({
    required this.id,
    required this.name,
    required this.country,
    required this.flag,
    required this.countryCode,
    required this.currency,
    required this.color,
    this.textLight = true,
  });

  final String id;
  final String name;
  final String country;
  final String flag;
  final String countryCode;
  final String currency;
  final Color color;
  final bool textLight;
}

const _kPayMethods = <_PayMethod>[
  _PayMethod(id: 'MTN_MOMO_RWA', name: 'MTN Mobile Money', country: 'Rwanda', flag: '🇷🇼', countryCode: '+250', currency: 'RWF', color: Color(0xFFFFC107), textLight: false),
  _PayMethod(id: 'AIRTEL_RWA', name: 'Airtel Money', country: 'Rwanda', flag: '🇷🇼', countryCode: '+250', currency: 'RWF', color: Color(0xFFEF5350)),
  _PayMethod(id: 'MPESA_KEN', name: 'M-Pesa', country: 'Kenya', flag: '🇰🇪', countryCode: '+254', currency: 'KES', color: Color(0xFF4CAF50)),
  _PayMethod(id: 'MTN_MOMO_UGA', name: 'MTN Mobile Money', country: 'Uganda', flag: '🇺🇬', countryCode: '+256', currency: 'UGX', color: Color(0xFFFFC107), textLight: false),
  _PayMethod(id: 'AIRTEL_OAPI_UGA', name: 'Airtel Money', country: 'Uganda', flag: '🇺🇬', countryCode: '+256', currency: 'UGX', color: Color(0xFFEF5350)),
  _PayMethod(id: 'MTN_MOMO_ZMB', name: 'MTN Mobile Money', country: 'Zambia', flag: '🇿🇲', countryCode: '+260', currency: 'ZMW', color: Color(0xFFFFC107), textLight: false),
  _PayMethod(id: 'ZAMTEL_ZMB', name: 'Zamtel Money', country: 'Zambia', flag: '🇿🇲', countryCode: '+260', currency: 'ZMW', color: Color(0xFF388E3C)),
];

// ─────────────────────────────────────────────────────────────────────────────
// CheckoutScreen
// ─────────────────────────────────────────────────────────────────────────────

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({
    super.key,
    required this.item,
    this.checkIn,
    this.checkOut,
    required this.guests,
    required this.session,
  });

  final Map<String, dynamic> item;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final int guests;
  final SessionController session;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  // Steps: 0 = Details, 1 = Payment, 2 = Confirm
  int _step = 0;

  // Details step
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  // Payment step
  _PayMethod? _selectedMethod;
  final _phoneCtrl = TextEditingController();

  bool _submitting = false;
  String? _bookingId;

  @override
  void initState() {
    super.initState();
    // Pre-fill with user data
    final profile = widget.session.payload?.profile;
    _nameCtrl.text = (profile?['full_name'] ?? '').toString();
    _emailCtrl.text = widget.session.userEmail ?? '';
    // Auto-select first method
    _selectedMethod = _kPayMethods.first;
    _phoneCtrl.text = _selectedMethod!.countryCode + ' ';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _notesCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Map<String, dynamic> get item => widget.item;
  String get itemType => (item['item_type'] ?? 'property').toString();
  String get _currency => (item['currency'] ?? 'USD').toString();

  double get _pricePerUnit {
    switch (itemType) {
      case 'tour':
        return double.tryParse('${item['price_per_person'] ?? 0}') ?? 0;
      case 'tour_package':
        return double.tryParse('${item['price_per_adult'] ?? 0}') ?? 0;
      case 'transport':
        return double.tryParse('${item['price_per_day'] ?? 0}') ?? 0;
      default:
        return double.tryParse('${item['price_per_night'] ?? 0}') ?? 0;
    }
  }

  int get _nights {
    if (widget.checkIn == null || widget.checkOut == null) return 1;
    return widget.checkOut!.difference(widget.checkIn!).inDays.clamp(1, 999);
  }

  double get _subtotal {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return _pricePerUnit * widget.guests;
      default:
        return _pricePerUnit * _nights;
    }
  }

  double get _serviceFee => _subtotal * 0.05;
  double get _total => _subtotal + _serviceFee;

  String _fmtDate(DateTime d) => '${d.day}/${d.month}/${d.year}';

  String get _unitLabel {
    switch (itemType) {
      case 'tour':
      case 'tour_package':
        return '${widget.guests} guest${widget.guests > 1 ? 's' : ''}';
      case 'transport':
        return '$_nights day${_nights > 1 ? 's' : ''}';
      default:
        return '$_nights night${_nights > 1 ? 's' : ''}';
    }
  }

  Future<void> _confirmAndPay() async {
    if (_selectedMethod == null) {
      _showSnack('Select a payment method');
      return;
    }
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty || phone == _selectedMethod!.countryCode) {
      _showSnack('Enter your mobile money number');
      return;
    }

    setState(() => _submitting = true);
    try {
      final id = await widget.session.createBooking(
        item: item,
        checkIn: widget.checkIn?.toIso8601String().split('T').first,
        checkOut: widget.checkOut?.toIso8601String().split('T').first,
        guests: widget.guests,
        totalAmount: _total,
        currency: _currency,
        paymentPhone: phone,
        paymentProvider: _selectedMethod!.id,
        specialRequests: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      );
      setState(() {
        _bookingId = id;
        _step = 2;
      });
    } catch (e) {
      _showSnack('Booking failed: ${e.toString().replaceAll('Exception: ', '')}');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF222222)),
          onPressed: () => _step > 0 && _step < 2
              ? setState(() => _step--)
              : Navigator.pop(context),
        ),
        title: Text(
          _step == 0
              ? 'Review booking'
              : _step == 1
                  ? 'Payment'
                  : 'Booking confirmed',
          style: const TextStyle(color: Color(0xFF222222), fontWeight: FontWeight.w700, fontSize: 18),
        ),
      ),
      body: _step == 2 ? _buildSuccess() : _buildCheckoutBody(),
    );
  }

  Widget _buildCheckoutBody() {
    return Column(
      children: [
        // ── Step indicator ──
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          child: _StepBar(current: _step),
        ),

        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 160),
            child: _step == 0 ? _buildDetailsStep() : _buildPaymentStep(),
          ),
        ),

        // ── Bottom CTA ──
        Container(
          padding: EdgeInsets.fromLTRB(18, 12, 18, MediaQuery.of(context).padding.bottom + 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFE7E7EC))),
          ),
          child: SizedBox(
            height: 52,
            width: double.infinity,
            child: FilledButton(
              onPressed: _submitting ? null : (_step == 0 ? _goToPayment : _confirmAndPay),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFFF385C),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      _step == 0 ? 'Continue' : 'Confirm & Pay',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
            ),
          ),
        ),
      ],
    );
  }

  void _goToPayment() {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      _showSnack('Enter your full name');
      return;
    }
    setState(() => _step = 1);
  }

  Widget _buildDetailsStep() {
    final imageUrl = resolveListingImageUrl(item);
    final title = (item['title'] ?? item['name'] ?? 'Listing').toString();
    final location = (item['location'] ?? item['city'] ?? '').toString();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Listing summary card ──
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF7F7F8),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: 80,
                  height: 70,
                  child: imageUrl != null
                      ? Image.network(imageUrl, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(color: const Color(0xFFE0E0E0)))
                      : Container(color: const Color(0xFFE0E0E0), child: const Icon(Icons.image_outlined)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    if (location.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Text(location, style: const TextStyle(fontSize: 12, color: Color(0xFF717171))),
                      ),
                    const SizedBox(height: 4),
                    Text(
                      '$_currency ${_pricePerUnit.toStringAsFixed(0)} · $_unitLabel',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF222222)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // ── Trip dates ──
        if (widget.checkIn != null && widget.checkOut != null) ...[
          _SectionTitle(label: 'Your trip'),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _InfoTile(icon: Icons.calendar_today_outlined, label: 'Check-in', value: _fmtDate(widget.checkIn!))),
              const SizedBox(width: 10),
              Expanded(child: _InfoTile(icon: Icons.calendar_today_outlined, label: 'Check-out', value: _fmtDate(widget.checkOut!))),
            ],
          ),
          const SizedBox(height: 10),
          _InfoTile(icon: Icons.people_outline, label: 'Guests', value: '${widget.guests} guest${widget.guests > 1 ? 's' : ''}'),
          const SizedBox(height: 18),
        ],

        // ── Price breakdown ──
        _SectionTitle(label: 'Price breakdown'),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE7E7EC)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              _PriceRow(
                label: '$_currency ${_pricePerUnit.toStringAsFixed(0)} × $_unitLabel',
                value: '$_currency ${_subtotal.toStringAsFixed(0)}',
              ),
              const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider(height: 1)),
              _PriceRow(label: 'Service fee (5%)', value: '$_currency ${_serviceFee.toStringAsFixed(0)}'),
              const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider(height: 1)),
              _PriceRow(
                label: 'Total',
                value: '$_currency ${_total.toStringAsFixed(0)}',
                bold: true,
              ),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // ── Guest details form ──
        _SectionTitle(label: 'Guest details'),
        const SizedBox(height: 10),
        _InputField(label: 'Full name', controller: _nameCtrl, icon: Icons.person_outline),
        const SizedBox(height: 10),
        _InputField(label: 'Email', controller: _emailCtrl, icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress),
        const SizedBox(height: 10),
        _InputField(
          label: 'Special requests (optional)',
          controller: _notesCtrl,
          icon: Icons.note_outlined,
          maxLines: 3,
        ),
      ],
    );
  }

  Widget _buildPaymentStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Total reminder ──
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF0F2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFFFD0D8)),
          ),
          child: Row(
            children: [
              const Icon(Icons.lock_outline, size: 18, color: Color(0xFFE2555A)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'You\'ll be charged $_currency ${_total.toStringAsFixed(0)} via mobile money.',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),
        _SectionTitle(label: 'Select payment method'),
        const SizedBox(height: 12),

        // ── Payment method grid ──
        ...['Rwanda', 'Kenya', 'Uganda', 'Zambia'].map((country) {
          final methods = _kPayMethods.where((m) => m.country == country).toList();
          if (methods.isEmpty) return const SizedBox.shrink();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  '${methods.first.flag}  $country',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF555560)),
                ),
              ),
              Wrap(
                spacing: 10,
                runSpacing: 8,
                children: methods.map((m) => _MethodChip(
                      method: m,
                      selected: _selectedMethod?.id == m.id,
                      onTap: () {
                        setState(() {
                          _selectedMethod = m;
                          _phoneCtrl.text = '${m.countryCode} ';
                        });
                      },
                    )).toList(),
              ),
              const SizedBox(height: 16),
            ],
          );
        }),

        // ── Phone number ──
        _SectionTitle(label: 'Mobile money number'),
        const SizedBox(height: 10),
        TextFormField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d\s+]'))],
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          decoration: InputDecoration(
            prefixIcon: _selectedMethod != null
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    child: Text(_selectedMethod!.flag, style: const TextStyle(fontSize: 18)),
                  )
                : const Icon(Icons.phone_outlined),
            hintText: '${_selectedMethod?.countryCode ?? ''} XXXX XXXX',
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFD4D4D8)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFD4D4D8)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFF222222), width: 1.5),
            ),
          ),
        ),

        const SizedBox(height: 16),

        // ── Security note ──
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.shield_outlined, size: 16, color: Color(0xFF717171)),
            const SizedBox(width: 6),
            const Expanded(
              child: Text(
                'Your payment is protected. You\'ll receive an SMS prompt to confirm '
                'payment on your mobile money account.',
                style: TextStyle(fontSize: 12, color: Color(0xFF717171), height: 1.5),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSuccess() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              color: Color(0xFFE8F5E9),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check, size: 40, color: Color(0xFF2E7D32)),
          ),
          const SizedBox(height: 20),
          const Text(
            'Booking confirmed!',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 10),
          Text(
            'Your booking has been submitted. You\'ll receive an SMS to confirm '
            'payment via ${_selectedMethod?.name ?? 'mobile money'}.',
            style: const TextStyle(fontSize: 15, color: Color(0xFF717171), height: 1.5),
            textAlign: TextAlign.center,
          ),
          if (_bookingId != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F7F8),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Booking ID: $_bookingId',
                style: const TextStyle(fontSize: 12, color: Color(0xFF717171), fontFamily: 'monospace'),
              ),
            ),
          ],
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton(
              onPressed: () {
                // Pop back to root home
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFFF385C),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Back to home', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              Navigator.of(context).popUntil((route) => route.isFirst);
              // Navigate to trips tab — handled by user tapping Trips tab
            },
            child: const Text('View my bookings', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

class _StepBar extends StatelessWidget {
  const _StepBar({required this.current});

  final int current;

  @override
  Widget build(BuildContext context) {
    const labels = ['Details', 'Payment', 'Confirm'];
    return Row(
      children: List.generate(2, (i) {
        final active = i <= current;
        final done = i < current;
        return Expanded(
          child: Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: active ? const Color(0xFFFF385C) : const Color(0xFFE7E7EC),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: done
                      ? const Icon(Icons.check, size: 14, color: Colors.white)
                      : Text('${i + 1}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? Colors.white : const Color(0xFF888888))),
                ),
              ),
              const SizedBox(width: 4),
              Text(labels[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: active ? const Color(0xFF222222) : const Color(0xFF888888))),
              if (i < 1)
                Expanded(
                  child: Container(
                    height: 1,
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    color: current > i ? const Color(0xFFFF385C) : const Color(0xFFE7E7EC),
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF222222)));
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F8),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF717171)),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF717171))),
              Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({required this.label, required this.value, this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final style = bold
        ? const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)
        : const TextStyle(fontSize: 14, color: Color(0xFF444450));
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [Text(label, style: style), Text(value, style: style)],
    );
  }
}

class _InputField extends StatelessWidget {
  const _InputField({
    required this.label,
    required this.controller,
    required this.icon,
    this.keyboardType,
    this.maxLines = 1,
  });

  final String label;
  final TextEditingController controller;
  final IconData icon;
  final TextInputType? keyboardType;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      style: const TextStyle(fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFD4D4D8)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFD4D4D8)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF222222), width: 1.5),
        ),
      ),
    );
  }
}

class _MethodChip extends StatelessWidget {
  const _MethodChip({required this.method, required this.selected, required this.onTap});

  final _PayMethod method;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? method.color.withValues(alpha: 0.12) : const Color(0xFFF7F7F8),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? method.color : const Color(0xFFE7E7EC),
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 28,
              height: 18,
              decoration: BoxDecoration(
                color: method.color,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Center(
                child: Text(
                  method.id.split('_').first,
                  style: TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    color: method.textLight ? Colors.white : Colors.black,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              method.name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: const Color(0xFF222222),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
