function safeStr(value, max = 200) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

function normalizePhoneE164(value) {
  const raw = safeStr(value, 64);
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

function normalizeCountryDialCode(value) {
  const raw = safeStr(value, 12);
  if (!raw) return null;

  if (/^[A-Za-z]{2}$/.test(raw)) {
    return raw.toUpperCase();
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

function inferCountryDialCodeFromPhone(phoneNumber) {
  const digits = normalizePhoneE164(phoneNumber).replace(/\D/g, "");
  if (!digits) return null;

  const knownPrefixes = [
    "221", "225", "233", "237", "242", "243", "250",
    "254", "255", "256", "257", "258", "260", "265",
  ];

  for (const prefix of knownPrefixes) {
    if (digits.startsWith(prefix)) return `+${prefix}`;
  }

  return null;
}

function normalizeMobileProvider(value) {
  const raw = safeStr(value, 120).toUpperCase();
  if (!raw) return "";

  const known = ["MTN", "AIRTEL", "MPESA", "VODACOM", "TIGO", "VODAFONE", "ORANGE", "ZAMTEL", "FREE", "TNM", "ECONET"];
  for (const token of known) {
    if (raw.includes(token)) return token;
  }

  return raw.replace(/[^A-Z0-9_]/g, "");
}

function normalizeCardBrand(value) {
  const raw = safeStr(value, 40);
  if (!raw) return "Card";
  const compact = raw.toLowerCase();

  if (compact.includes("visa")) return "Visa";
  if (compact.includes("master")) return "Mastercard";
  if (compact.includes("amex") || compact.includes("american")) return "American Express";
  if (compact.includes("discover")) return "Discover";
  if (compact.includes("verve")) return "Verve";

  return raw.slice(0, 1).toUpperCase() + raw.slice(1).toLowerCase();
}

function parseCardExpiry(value) {
  const raw = safeStr(value, 20);
  if (!raw) return null;

  const compact = raw.replace(/\s/g, "");
  const slash = compact.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const mm = slash[1].padStart(2, "0");
    const yy = slash[2].slice(-2);
    return `${mm}/${yy}`;
  }

  const plain = compact.match(/^(\d{2})(\d{2,4})$/);
  if (plain) {
    const mm = plain[1];
    const yy = plain[2].slice(-2);
    return `${mm}/${yy}`;
  }

  return null;
}

function normalizeCardLast4(value) {
  const digits = safeStr(value, 20).replace(/\D/g, "");
  if (!digits) return null;
  const last4 = digits.slice(-4);
  return /^\d{4}$/.test(last4) ? last4 : null;
}

function isMissingTableError(error) {
  const code = safeStr(error?.code, 20);
  const message = String(error?.message || "").toLowerCase();
  return code === "42P01" || message.includes("user_payment_methods");
}

async function upsertSavedMethodRecord(supabase, record) {
  const nowIso = new Date().toISOString();

  if (record.is_default) {
    const { error: clearError } = await supabase
      .from("user_payment_methods")
      .update({ is_default: false, updated_at: nowIso })
      .eq("user_id", record.user_id)
      .eq("method_type", record.method_type)
      .eq("is_default", true);

    if (clearError) throw clearError;
  }

  const payload = {
    ...record,
    is_active: true,
    last_used_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from("user_payment_methods")
    .upsert(payload, { onConflict: "user_id,fingerprint" })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function upsertSavedCardMethod({ supabase, checkoutData, txData, source = "flutterwave" }) {
  try {
    const userId = safeStr(checkoutData?.user_id, 80);
    if (!userId) return { saved: false, reason: "no_user" };

    const saveRequested = checkoutData?.metadata?.save_payment_method;
    if (saveRequested === false) return { saved: false, reason: "save_disabled" };

    const card = txData?.card && typeof txData.card === "object"
      ? txData.card
      : (checkoutData?.metadata?.flutterwave?.card && typeof checkoutData.metadata.flutterwave.card === "object"
          ? checkoutData.metadata.flutterwave.card
          : {});

    const cardBrand = normalizeCardBrand(card?.type || card?.brand || txData?.payment_type || "Card");
    const cardLast4 = normalizeCardLast4(card?.last_4digits || card?.last4 || card?.last_four || "");
    const cardExpiry = parseCardExpiry(card?.expiry || card?.exp_date || card?.exp || "");
    const token = safeStr(card?.token || card?.card_token || card?.reusable_token || txData?.card_token || txData?.token, 180);

    if (!cardLast4 && !token) {
      return { saved: false, reason: "insufficient_card_data" };
    }

    const brandSlug = cardBrand.toLowerCase().replace(/\s+/g, "-");
    const fingerprint = token
      ? `card:flutterwave:token:${token}`
      : `card:flutterwave:${brandSlug}:${cardLast4 || "xxxx"}:${(cardExpiry || "na").toLowerCase()}`;

    const countryCode = normalizeCountryDialCode(
      checkoutData?.metadata?.billing_address?.countryCode ||
      checkoutData?.metadata?.billing_address?.country ||
      checkoutData?.metadata?.guest_info?.billing_address?.countryCode ||
      null
    );

    const displayName = cardLast4 ? `${cardBrand} **** ${cardLast4}` : cardBrand;

    const methodId = await upsertSavedMethodRecord(supabase, {
      user_id: userId,
      method_type: "card",
      provider: "FLUTTERWAVE",
      display_name: displayName,
      country_code: countryCode,
      phone_number: null,
      card_brand: cardBrand,
      card_last4: cardLast4,
      card_expiry: cardExpiry,
      provider_reference: safeStr(token || txData?.flw_ref || String(txData?.id || ""), 180) || null,
      fingerprint,
      is_default: true,
      metadata: {
        source,
        checkout_id: checkoutData?.id || null,
        tx_ref: txData?.tx_ref || null,
        transaction_id: txData?.id || null,
      },
    });

    return { saved: true, id: methodId };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("Skipping saved card persistence because user_payment_methods table is unavailable yet.");
      return { saved: false, reason: "table_missing" };
    }

    console.warn("Unable to upsert saved card method", {
      checkoutId: checkoutData?.id || null,
      message: error?.message || String(error),
    });
    return { saved: false, reason: "upsert_failed" };
  }
}

export async function upsertSavedMobileMoneyMethod({
  supabase,
  checkoutData,
  providerHint,
  phoneNumberHint,
  countryCodeHint,
  depositId,
  correspondent,
  source = "pawapay",
}) {
  try {
    const userId = safeStr(checkoutData?.user_id, 80);
    if (!userId) return { saved: false, reason: "no_user" };

    const saveRequested = checkoutData?.metadata?.save_payment_method;
    if (saveRequested === false) return { saved: false, reason: "save_disabled" };

    const provider = normalizeMobileProvider(
      providerHint ||
      checkoutData?.metadata?.payment_provider ||
      correspondent ||
      ""
    );

    if (!provider || provider === "FLUTTERWAVE" || provider === "BANK_TRANSFER") {
      return { saved: false, reason: "invalid_provider" };
    }

    const phoneNumber = normalizePhoneE164(
      phoneNumberHint ||
      checkoutData?.phone ||
      checkoutData?.metadata?.guest_info?.phone ||
      ""
    );

    if (!phoneNumber) {
      return { saved: false, reason: "missing_phone" };
    }

    const countryCode =
      normalizeCountryDialCode(countryCodeHint) ||
      normalizeCountryDialCode(checkoutData?.metadata?.payment_country_code || "") ||
      inferCountryDialCodeFromPhone(phoneNumber);

    const paymentMethodId = safeStr(
      checkoutData?.metadata?.selected_payment_method_id ||
      checkoutData?.metadata?.payment_method_id ||
      "",
      80
    );

    const displayName = paymentMethodId
      ? paymentMethodId.replace(/_/g, " ").toUpperCase()
      : `${provider} Mobile Money`;

    const fingerprint = `mobile:${provider.toLowerCase()}:${phoneNumber}`;

    const methodId = await upsertSavedMethodRecord(supabase, {
      user_id: userId,
      method_type: "mobile_money",
      provider,
      display_name: displayName,
      country_code: countryCode,
      phone_number: phoneNumber,
      card_brand: null,
      card_last4: null,
      card_expiry: null,
      provider_reference: safeStr(depositId || "", 120) || null,
      fingerprint,
      is_default: true,
      metadata: {
        source,
        checkout_id: checkoutData?.id || null,
        payment_method_id: paymentMethodId || null,
        correspondent: safeStr(correspondent || "", 120) || null,
      },
    });

    return { saved: true, id: methodId };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("Skipping saved mobile method persistence because user_payment_methods table is unavailable yet.");
      return { saved: false, reason: "table_missing" };
    }

    console.warn("Unable to upsert saved mobile money method", {
      checkoutId: checkoutData?.id || null,
      message: error?.message || String(error),
    });
    return { saved: false, reason: "upsert_failed" };
  }
}
