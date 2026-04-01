#!/usr/bin/env python3
"""Patch Checkout.tsx: add card country selector + switch to hosted redirect."""
import sys

path = '/Users/davy/merry-moments/src/pages/Checkout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

original = src

# ── 1. Add DollarSign to lucide-react imports ──────────────────────────────
src = src.replace(
    '  ExternalLink,\n  LockKeyhole\n} from "lucide-react";',
    '  ExternalLink,\n  LockKeyhole,\n  DollarSign\n} from "lucide-react";'
)

# ── 2. Add FLW_CARD_COUNTRIES after BILLING_COUNTRY_OPTIONS ─────────────────
FLW_CONST = (
    '\n'
    'const FLW_CARD_COUNTRIES = [\n'
    "  { code: 'RW', name: 'Rwanda',           flag: '\U0001F1F7\U0001F1FC' },\n"
    "  { code: 'NG', name: 'Nigeria',          flag: '\U0001F1F3\U0001F1EC' },\n"
    "  { code: 'KE', name: 'Kenya',            flag: '\U0001F1F0\U0001F1EA' },\n"
    "  { code: 'GH', name: 'Ghana',            flag: '\U0001F1EC\U0001F1ED' },\n"
    "  { code: 'UG', name: 'Uganda',           flag: '\U0001F1FA\U0001F1EC' },\n"
    "  { code: 'TZ', name: 'Tanzania',         flag: '\U0001F1F9\U0001F1FF' },\n"
    "  { code: 'ZA', name: 'South Africa',     flag: '\U0001F1FF\U0001F1E6' },\n"
    "  { code: 'ZM', name: 'Zambia',           flag: '\U0001F1FF\U0001F1F2' },\n"
    "  { code: 'EG', name: 'Egypt',            flag: '\U0001F1EA\U0001F1EC' },\n"
    "  { code: 'CM', name: 'Cameroon',         flag: '\U0001F1E8\U0001F1F2' },\n"
    "  { code: 'SN', name: 'Senegal',          flag: '\U0001F1F8\U0001F1F3' },\n"
    "  { code: 'CI', name: \"C\u00f4te d'Ivoire\",  flag: '\U0001F1E8\U0001F1EE' },\n"
    "  { code: 'MW', name: 'Malawi',           flag: '\U0001F1F2\U0001F1FC' },\n"
    "  { code: 'MZ', name: 'Mozambique',       flag: '\U0001F1F2\U0001F1FF' },\n"
    "  { code: 'ET', name: 'Ethiopia',         flag: '\U0001F1EA\U0001F1F9' },\n"
    "  { code: 'GB', name: 'United Kingdom',   flag: '\U0001F1EC\U0001F1E7' },\n"
    "  { code: 'US', name: 'United States',    flag: '\U0001F1FA\U0001F1F8' },\n"
    "  { code: 'CA', name: 'Canada',           flag: '\U0001F1E8\U0001F1E6' },\n"
    "  { code: 'OTHER', name: 'Other Country', flag: '\U0001F30D' },\n"
    '];\n'
)

src = src.replace(
    '  { code: "ZA", label: "South Africa" },\n];\n\nexport default function CheckoutNew() {',
    '  { code: "ZA", label: "South Africa" },\n];' + FLW_CONST + '\nexport default function CheckoutNew() {'
)

# ── 3. Add cardCountry state ────────────────────────────────────────────────
src = src.replace(
    "  const [lastMobileMethod, setLastMobileMethod] = useState<string>(geoDefaults?.method ?? 'mtn_rwa');\n"
    '  const mode = searchParams.get("mode");',
    "  const [lastMobileMethod, setLastMobileMethod] = useState<string>(geoDefaults?.method ?? 'mtn_rwa');\n"
    "  const [cardCountry, setCardCountry] = useState<string>(detectedCountry ?? 'RW');\n"
    '  const mode = searchParams.get("mode");'
)

# ── 4. Update geo effect to also set cardCountry ────────────────────────────
src = src.replace(
    "    setFormData((prev) => {\n"
    "      if (prev.billingCountry && prev.billingCountry.trim().length > 0) return prev;\n"
    "      return { ...prev, billingCountry: detected };\n"
    "    });\n"
    "  }, [detectedCountry]);",
    "    setFormData((prev) => {\n"
    "      if (prev.billingCountry && prev.billingCountry.trim().length > 0) return prev;\n"
    "      return { ...prev, billingCountry: detected };\n"
    "    });\n"
    "    setCardCountry(detected);\n"
    "  }, [detectedCountry]);"
)

# ── 5. Replace card section UI ──────────────────────────────────────────────
OLD_UI = (
    "                  {/* Card checkout redirect info */}\n"
    "                  {paymentMethod === 'card' && (\n"
    "                    <div className=\"rounded-xl border border-border bg-card p-4 md:p-5 space-y-4\">\n"
    "                      <div className=\"flex items-start gap-3\">\n"
    "                        <CreditCard className=\"w-5 h-5 text-foreground mt-0.5\" />\n"
    "                        <div>\n"
    "                          <p className=\"text-sm font-semibold text-foreground\">Secure Card Checkout</p>\n"
    "                          <p className=\"text-sm text-muted-foreground\">A Flutterwave payment modal opens directly on this page \u2014 card only.</p>\n"
    "                        </div>\n"
    "                      </div>\n"
    "\n"
    "                      <div className=\"grid gap-2 sm:grid-cols-3 text-sm\">\n"
    "                        <div className=\"rounded-lg border border-border bg-background p-3\">1. Confirm Booking</div>\n"
    "                        <div className=\"rounded-lg border border-border bg-background p-3\">2. Modal Opens</div>\n"
    "                        <div className=\"rounded-lg border border-border bg-background p-3\">3. Enter Card &amp; Pay</div>\n"
    "                      </div>\n"
    "\n"
    "                      <div className=\"space-y-1.5 text-xs text-muted-foreground\">\n"
    "                        <p className=\"flex items-center gap-2\"><LockKeyhole className=\"w-4 h-4\" /> PCI-compliant. Card data handled by Flutterwave only.</p>\n"
    "                        <p className=\"flex items-center gap-2\"><Shield className=\"w-4 h-4\" /> Secure overlay \u2014 card details never touch our servers.</p>\n"
    "                      </div>\n"
    "                    </div>\n"
    "                  )}"
)

NEW_UI = (
    "                  {/* Card checkout \u2014 country selector + USD amount */}\n"
    "                  {paymentMethod === 'card' && (\n"
    "                    <div className=\"rounded-xl border border-border bg-card p-4 md:p-5 space-y-4\">\n"
    "                      {/* Header row */}\n"
    "                      <div className=\"flex items-center justify-between\">\n"
    "                        <div className=\"flex items-center gap-2\">\n"
    "                          <CreditCard className=\"w-5 h-5 text-foreground\" />\n"
    "                          <p className=\"text-sm font-semibold text-foreground\">Pay with Card</p>\n"
    "                        </div>\n"
    "                        <div className=\"flex items-center gap-1.5\">\n"
    "                          <span className=\"border border-border rounded px-1.5 py-0.5 text-xs font-bold text-muted-foreground tracking-wide\">VISA</span>\n"
    "                          <span className=\"border border-border rounded px-1.5 py-0.5 text-xs font-bold text-muted-foreground tracking-wide\">MC</span>\n"
    "                        </div>\n"
    "                      </div>\n"
    "\n"
    "                      {/* USD amount badge */}\n"
    "                      {(() => {\n"
    "                        const inRwf = displayCurrency === 'RWF'\n"
    "                          ? payableAmount\n"
    "                          : (convertAmount(payableAmount, displayCurrency, 'RWF', usdRates) ?? 0);\n"
    "                        const rawUsd = inRwf ? convertAmount(inRwf, 'RWF', 'USD', usdRates) : null;\n"
    "                        const usdAmt = rawUsd ? roundToCurrency(rawUsd, 'USD') : null;\n"
    "                        return usdAmt && usdAmt > 0 ? (\n"
    "                          <div className=\"flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-2\">\n"
    "                            <DollarSign className=\"w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0\" />\n"
    "                            <p className=\"text-sm text-emerald-700 dark:text-emerald-300\">\n"
    "                              You\u2019ll be charged <strong>${usdAmt.toFixed(2)} USD</strong> \u00b7 Visa & Mastercard accepted worldwide\n"
    "                            </p>\n"
    "                          </div>\n"
    "                        ) : null;\n"
    "                      })()}\n"
    "\n"
    "                      {/* Card issuing country selector */}\n"
    "                      <div>\n"
    "                        <p className=\"text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5\">\n"
    "                          Card issuing country\n"
    "                          {detectedCountry && (\n"
    "                            <span className=\"text-blue-500 dark:text-blue-400\">\u00b7 auto-detected</span>\n"
    "                          )}\n"
    "                        </p>\n"
    "                        <div className=\"flex flex-wrap gap-1.5\">\n"
    "                          {FLW_CARD_COUNTRIES.map((c) => (\n"
    "                            <button\n"
    "                              key={c.code}\n"
    "                              type=\"button\"\n"
    "                              onClick={() => setCardCountry(c.code)}\n"
    "                              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-all ${\n"
    "                                cardCountry === c.code\n"
    "                                  ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'\n"
    "                                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'\n"
    "                              }`}\n"
    "                            >\n"
    "                              <span className=\"text-base leading-none\">{c.flag}</span>\n"
    "                              <span>{c.name}</span>\n"
    "                            </button>\n"
    "                          ))}\n"
    "                        </div>\n"
    "                      </div>\n"
    "\n"
    "                      {/* Security note */}\n"
    "                      <div className=\"flex items-center gap-2 text-xs text-muted-foreground\">\n"
    "                        <LockKeyhole className=\"w-3.5 h-3.5 shrink-0\" />\n"
    "                        <span>PCI-compliant \u00b7 Card details entered on Flutterwave\u2019s secure platform \u00b7 Redirects to payment page</span>\n"
    "                      </div>\n"
    "                    </div>\n"
    "                  )}"
)

if OLD_UI in src:
    src = src.replace(OLD_UI, NEW_UI)
    print("✓ Card UI replaced")
else:
    # Try without the HTML entity
    OLD_UI2 = OLD_UI.replace("&amp;", "&")
    if OLD_UI2 in src:
        src = src.replace(OLD_UI2, NEW_UI)
        print("✓ Card UI replaced (no ampersand)")
    else:
        print("✗ Card UI not found — searching...")
        idx = src.find("Card checkout redirect info")
        if idx >= 0:
            print(f"  Found 'Card checkout redirect info' at char {idx}")
            print("  Context:", repr(src[idx:idx+200]))
        else:
            print("  Not found at all")

# ── 6. Replace card submit handler ──────────────────────────────────────────
OLD_HANDLER_MARKER = "      if (paymentMethod === 'card') {\n        // Flutterwave card payments require a supported currency"
NEW_HANDLER_MARKER = "      if (paymentMethod === 'card') {\n        // Flutterwave card payments require USD \u2014 convert RWF"

if OLD_HANDLER_MARKER in src:
    # Find the full block
    start = src.find(OLD_HANDLER_MARKER)
    # The block ends at the lone "      }" before the comment about MoMo
    end_marker = "\n\n      // Get the selected payment method info"
    end = src.find(end_marker, start)
    if end < 0:
        end_marker = "\n      // Get the selected payment method info"
        end = src.find(end_marker, start)
    if end > 0:
        old_block = src[start:end]
        new_block = (
            "      if (paymentMethod === 'card') {\n"
            "        // Flutterwave card payments require USD \u2014 convert from RWF\n"
            "        const rawUsd = convertAmount(amountInRwf, 'RWF', 'USD', usdRates);\n"
            "        if (!rawUsd || rawUsd <= 0) {\n"
            "          throw new Error('Unable to convert booking total to USD. Please try again.');\n"
            "        }\n"
            "        const cardAmountUsd = roundToCurrency(rawUsd, 'USD');\n"
            "\n"
            "        const cardInitResponse = await fetch(\"/api/flutterwave\", {\n"
            "          method: \"POST\",\n"
            "          headers: { \"Content-Type\": \"application/json\" },\n"
            "          body: JSON.stringify({\n"
            "            action: \"create-payment\",\n"
            "            checkoutId,\n"
            "            amount: cardAmountUsd,\n"
            "            currency: 'USD',\n"
            "            payerName: formData.fullName,\n"
            "            payerEmail: formData.email,\n"
            "            phoneNumber: fullPhone || normalizedPhone,\n"
            "            description: `Merry360x Booking - ${cartItems.length} item(s)`,\n"
            "            metadata: {\n"
            "              item_count: cartItems.length,\n"
            "              payment_type: paymentType,\n"
            "              card_country: cardCountry,\n"
            "            },\n"
            "          }),\n"
            "        });\n"
            "\n"
            "        const cardInitData = await cardInitResponse.json().catch(() => ({}));\n"
            "        if (!cardInitResponse.ok || !cardInitData?.redirectUrl) {\n"
            "          throw new Error(cardInitData?.error || cardInitData?.message || 'Unable to initialize card payment');\n"
            "        }\n"
            "\n"
            "        await clearCart();\n"
            "        localStorage.removeItem(\"applied_discount\");\n"
            "        clearCheckoutDraft();\n"
            "\n"
            "        // Navigate to Flutterwave hosted checkout (avoids inline SDK loading issues)\n"
            "        window.location.href = cardInitData.redirectUrl;\n"
            "        return;\n"
            "      }"
        )
        src = src[:start] + new_block + src[end:]
        print("✓ Card submit handler replaced")
    else:
        print("✗ Could not find end of card handler block")
else:
    print("✗ Card handler marker not found")
    idx = src.find("if (paymentMethod === 'card')")
    print(f"  'if (paymentMethod === card)' at char: {idx}")

# ── Write ────────────────────────────────────────────────────────────────────
if src != original:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f"✓ File written ({len(src)} chars)")
else:
    print("✗ No changes made!")
    sys.exit(1)
