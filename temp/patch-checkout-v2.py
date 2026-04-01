#!/usr/bin/env python3
"""Patch Checkout.tsx card UI and handler (v2)."""
path = '/Users/davy/merry-moments/src/pages/Checkout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

original_len = len(src)

# ── 1. Replace card UI section (billing form → country selector) ─────────────
OLD_CARD_UI = """                  {/* Card checkout redirect info */}
                  {paymentMethod === 'card' && (
                    <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Secure Card Checkout</p>
                          <p className="text-sm text-muted-foreground">No iframe. Card details are entered on Flutterwave only.</p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        <div className="rounded-lg border border-border bg-background p-3">1. Confirm Booking</div>
                        <div className="rounded-lg border border-border bg-background p-3">2. Secure Window</div>
                        <div className="rounded-lg border border-border bg-background p-3">3. Pay on Flutterwave</div>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2"><LockKeyhole className="w-4 h-4" /> PCI-compliant payment handled by Flutterwave.</p>
                        <p className="flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Opens in a secure hover window (same tab).</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Label htmlFor="billingAddress1">Billing Address Line 1</Label>
                          <Input
                            id="billingAddress1"
                            value={formData.billingAddress1}
                            onChange={(e) => setFormData((prev) => ({ ...prev, billingAddress1: e.target.value }))}
                            placeholder="Street / House number"
                            className="mt-1.5"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="billingAddress2">Billing Address Line 2 (Optional)</Label>
                          <Input
                            id="billingAddress2"
                            value={formData.billingAddress2}
                            onChange={(e) => setFormData((prev) => ({ ...prev, billingAddress2: e.target.value }))}
                            placeholder="Apartment / Landmark"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="billingCity">City</Label>
                          <Input
                            id="billingCity"
                            value={formData.billingCity}
                            onChange={(e) => setFormData((prev) => ({ ...prev, billingCity: e.target.value }))}
                            placeholder="Kigali"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="billingPostalCode">Postal Code</Label>
                          <Input
                            id="billingPostalCode"
                            value={formData.billingPostalCode}
                            onChange={(e) => setFormData((prev) => ({ ...prev, billingPostalCode: e.target.value }))}
                            placeholder="00000"
                            className="mt-1.5"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label htmlFor="billingCountry">Billing Country</Label>
                          <select
                            id="billingCountry"
                            value={formData.billingCountry}
                            onChange={(e) => setFormData((prev) => ({ ...prev, billingCountry: e.target.value }))}
                            className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            {BILLING_COUNTRY_OPTIONS.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}"""

NEW_CARD_UI = """                  {/* Card checkout \u2014 country selector + USD amount */}
                  {paymentMethod === 'card' && (
                    <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-foreground" />
                          <p className="text-sm font-semibold text-foreground">Pay with Card</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="border border-border rounded px-1.5 py-0.5 text-xs font-bold text-muted-foreground tracking-wide">VISA</span>
                          <span className="border border-border rounded px-1.5 py-0.5 text-xs font-bold text-muted-foreground tracking-wide">MC</span>
                        </div>
                      </div>

                      {/* USD amount badge */}
                      {(() => {
                        const inRwf = displayCurrency === 'RWF'
                          ? payableAmount
                          : (convertAmount(payableAmount, displayCurrency, 'RWF', usdRates) ?? 0);
                        const rawUsd = inRwf ? convertAmount(inRwf, 'RWF', 'USD', usdRates) : null;
                        const usdAmt = rawUsd ? roundToCurrency(rawUsd, 'USD') : null;
                        return usdAmt && usdAmt > 0 ? (
                          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-2">
                            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                              You\u2019ll be charged <strong>${usdAmt.toFixed(2)} USD</strong> \u00b7 Visa & Mastercard accepted worldwide
                            </p>
                          </div>
                        ) : null;
                      })()}

                      {/* Card issuing country selector */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          Card issuing country
                          {detectedCountry && (
                            <span className="text-blue-500 dark:text-blue-400">\u00b7 auto-detected</span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {FLW_CARD_COUNTRIES.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => setCardCountry(c.code)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-all ${
                                cardCountry === c.code
                                  ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
                                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                              }`}
                            >
                              <span className="text-base leading-none">{c.flag}</span>
                              <span>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Security note */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <LockKeyhole className="w-3.5 h-3.5 shrink-0" />
                        <span>PCI-compliant \u00b7 Card details entered on Flutterwave\u2019s secure platform \u00b7 Redirects to payment page</span>
                      </div>
                    </div>
                  )}"""

if OLD_CARD_UI in src:
    src = src.replace(OLD_CARD_UI, NEW_CARD_UI)
    print("✓ Card UI replaced")
else:
    print("✗ Card UI not found")

# ── 2. Replace card submit handler ──────────────────────────────────────────
OLD_HANDLER = """      if (paymentMethod === 'card') {
        // Flutterwave card payments require USD - convert from RWF
        const rawUsd = convertAmount(amountInRwf, 'RWF', 'USD', usdRates);
        if (!rawUsd || rawUsd <= 0) {
          throw new Error('Unable to convert booking total to USD. Please try again.');
        }
        const cardAmountUsd = roundToCurrency(rawUsd, 'USD');

        const cardInitResponse = await fetch("/api/flutterwave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-payment",
            inline: true,
            checkoutId,
            amount: cardAmountUsd,
            currency: 'USD',
            payerName: formData.fullName,
            payerEmail: formData.email,
            phoneNumber: fullPhone || normalizedPhone,
            description: `Merry360x Booking - ${cartItems.length} item(s)`,
            metadata: {
              item_count: cartItems.length,
              payment_type: paymentType,
            },
          }),
        });

        const cardInitData = await cardInitResponse.json().catch(() => ({}));
        if (!cardInitResponse.ok || !cardInitData?.txRef) {
          throw new Error(cardInitData?.error || cardInitData?.message || 'Unable to initialize card payment');
        }

        await clearCart();
        localStorage.removeItem("applied_discount");
        clearCheckoutDraft();

        if (!(window as any).FlutterwaveCheckout) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.flutterwave.com/v3.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load payment SDK'));
            document.head.appendChild(script);
          });
        }

        const capturedCheckoutId = checkoutId;
        const capturedTxRef = cardInitData.txRef;

        (window as any).FlutterwaveCheckout({
          public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
          tx_ref: capturedTxRef,
          amount: cardAmountUsd,
          currency: 'USD',
          payment_options: 'card',
          customer: {
            email: formData.email,
            name: formData.fullName,
            phone_number: fullPhone || normalizedPhone || undefined,
          },
          customizations: {
            title: 'Merry360x',
            description: `Booking - ${cartItems.length} item(s)`,
            logo: `${window.location.origin}/brand/logo.png`,
          },
          callback: (data: any) => {
            if (data.status === 'successful' || data.status === 'completed') {
              navigate(
                `/payment-pending?checkoutId=${encodeURIComponent(capturedCheckoutId)}&provider=flutterwave&tx_ref=${encodeURIComponent(capturedTxRef)}&transaction_id=${encodeURIComponent(String(data.transaction_id || ''))}`
              );
            } else {
              navigate(
                `/payment-failed?checkoutId=${encodeURIComponent(capturedCheckoutId)}&provider=flutterwave&reason=${encodeURIComponent(data.status || 'Payment not completed')}`
              );
            }
          },
          onclose: () => {
            setIsProcessing(false);
          },
        });

        setIsProcessing(false);
        return;
      }"""

NEW_HANDLER = """      if (paymentMethod === 'card') {
        // Flutterwave card payments require USD - convert from RWF
        const rawUsd = convertAmount(amountInRwf, 'RWF', 'USD', usdRates);
        if (!rawUsd || rawUsd <= 0) {
          throw new Error('Unable to convert booking total to USD. Please try again.');
        }
        const cardAmountUsd = roundToCurrency(rawUsd, 'USD');

        const cardInitResponse = await fetch("/api/flutterwave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-payment",
            checkoutId,
            amount: cardAmountUsd,
            currency: 'USD',
            payerName: formData.fullName,
            payerEmail: formData.email,
            phoneNumber: fullPhone || normalizedPhone,
            description: `Merry360x Booking - ${cartItems.length} item(s)`,
            metadata: {
              item_count: cartItems.length,
              payment_type: paymentType,
              card_country: cardCountry,
            },
          }),
        });

        const cardInitData = await cardInitResponse.json().catch(() => ({}));
        if (!cardInitResponse.ok || !cardInitData?.redirectUrl) {
          throw new Error(cardInitData?.error || cardInitData?.message || 'Unable to initialize card payment');
        }

        await clearCart();
        localStorage.removeItem("applied_discount");
        clearCheckoutDraft();

        // Navigate to Flutterwave hosted checkout (avoids inline SDK loading issues)
        window.location.href = cardInitData.redirectUrl;
        return;
      }"""

if OLD_HANDLER in src:
    src = src.replace(OLD_HANDLER, NEW_HANDLER)
    print("✓ Card handler replaced")
else:
    print("✗ Card handler not found - trying alternate search...")
    # Try to find just the inline part
    if "inline: true," in src:
        print("  'inline: true,' found - handler text mismatch, check spacing/dashes")
    if "capturedTxRef" in src:
        print("  'capturedTxRef' found - old handler still present")

# ── Write ────────────────────────────────────────────────────────────────────
if len(src) != original_len or src != open(path).read():
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f"✓ File written ({len(src)} chars, was {original_len})")
else:
    print("No changes made.")
