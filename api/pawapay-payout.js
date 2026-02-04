import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAWAPAY_API_URL = process.env.PAWAPAY_API_URL || "https://api.pawapay.io";
const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;

// PawaPay correspondent for Rwanda payouts
const PAYOUT_CORRESPONDENTS = {
  MTN: "MTN_MOMO_RWA",
  AIRTEL: "AIRTEL_RWA",
};

function json(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const { payoutId, amount, currency, phoneNumber, provider, description } = req.body;

    console.log("📤 PawaPay Payout Request:", { payoutId, amount, currency, phoneNumber, provider });

    // Validate required fields
    if (!payoutId || !amount || !phoneNumber) {
      return json(res, 400, { error: "Missing required fields: payoutId, amount, phoneNumber" });
    }

    // Validate minimum amount (101 RWF)
    if (amount < 101) {
      return json(res, 400, { error: "Minimum payout amount is 101 RWF" });
    }

    // Check if PawaPay is configured
    if (!PAWAPAY_API_KEY) {
      console.error("❌ PawaPay API key not configured");
      return json(res, 500, { error: "Payment provider not configured" });
    }

    // Get correspondent based on provider
    const correspondent = PAYOUT_CORRESPONDENTS[provider?.toUpperCase()] || PAYOUT_CORRESPONDENTS.MTN;

    // Format phone number for PawaPay (must be in international format without +)
    let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "250" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("250")) {
      formattedPhone = "250" + formattedPhone;
    }

    // Generate unique payout ID for PawaPay
    const pawapayPayoutId = crypto.randomUUID();

    // Create PawaPay payout request
    const payoutPayload = {
      payoutId: pawapayPayoutId,
      amount: String(amount),
      currency: currency || "RWF",
      correspondent,
      recipient: {
        type: "MSISDN",
        address: { value: formattedPhone },
      },
      customerTimestamp: new Date().toISOString(),
      statementDescription: description || "Merry360x Host Payout",
    };

    console.log("📤 Sending payout to PawaPay:", {
      ...payoutPayload,
      recipient: { ...payoutPayload.recipient, address: { value: "***" } }
    });

    // Call PawaPay Payout API
    const payoutResponse = await fetch(`${PAWAPAY_API_URL}/payouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAWAPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payoutPayload),
    });

    const payoutData = await payoutResponse.json();
    console.log("📥 PawaPay Payout Response:", payoutData);

    // Check for errors
    if (!payoutResponse.ok || payoutData.status === "REJECTED" || payoutData.status === "FAILED") {
      const errorMessage = payoutData.rejectionReason?.rejectionMessage || 
                          payoutData.failureReason?.failureMessage ||
                          payoutData.message || 
                          "Payout failed";
      
      // Update payout status to failed
      await supabase
        .from("host_payouts")
        .update({
          status: "failed",
          admin_notes: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      return json(res, 400, { 
        success: false, 
        error: errorMessage,
        pawapayStatus: payoutData.status
      });
    }

    // Payout initiated successfully
    const pawapayStatus = payoutData.status || "ACCEPTED";
    let dbStatus = "processing";
    
    if (pawapayStatus === "COMPLETED") {
      dbStatus = "completed";
    } else if (pawapayStatus === "ACCEPTED" || pawapayStatus === "SUBMITTED" || pawapayStatus === "ENQUEUED") {
      dbStatus = "processing";
    }

    // Update payout record with PawaPay details
    await supabase
      .from("host_payouts")
      .update({
        status: dbStatus,
        pawapay_payout_id: pawapayPayoutId,
        admin_notes: `PawaPay Status: ${pawapayStatus}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payoutId);

    console.log(`✅ Payout ${payoutId} initiated: PawaPay ID ${pawapayPayoutId}, Status: ${pawapayStatus}`);

    return json(res, 200, {
      success: true,
      payoutId,
      pawapayPayoutId,
      status: dbStatus,
      pawapayStatus,
      message: dbStatus === "completed" ? "Payout completed!" : "Payout is being processed",
    });

  } catch (error) {
    console.error("❌ Payout error:", error);
    return json(res, 500, {
      error: "Payout failed",
      message: error.message,
    });
  }
}
