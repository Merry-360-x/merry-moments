#!/usr/bin/env node
/**
 * Payment Status Checker Script
 * Checks checkout_requests and payment statuses in the database
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkPayments() {
  console.log("\n" + "=".repeat(60));
  console.log("💳 PAYMENT STATUS CHECK");
  console.log("=".repeat(60));

  // Check checkout_requests
  console.log("\n📦 CHECKOUT REQUESTS:");
  console.log("-".repeat(40));

  const { data: checkouts, error: checkoutError } = await supabase
    .from("checkout_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (checkoutError) {
    console.error("❌ Error fetching checkout requests:", checkoutError.message);
  } else if (!checkouts || checkouts.length === 0) {
    console.log("   No checkout requests found");
  } else {
    // Group by status
    const statusGroups = {};
    for (const checkout of checkouts) {
      const status = checkout.payment_status || "unknown";
      if (!statusGroups[status]) statusGroups[status] = [];
      statusGroups[status].push(checkout);
    }

    console.log(`   Total: ${checkouts.length} checkout requests\n`);

    // Summary by status
    for (const [status, items] of Object.entries(statusGroups)) {
      const emoji = getStatusEmoji(status);
      console.log(`   ${emoji} ${status.toUpperCase()}: ${items.length}`);
    }

    console.log("\n   Recent Checkouts:");
    for (const checkout of checkouts.slice(0, 10)) {
      const emoji = getStatusEmoji(checkout.payment_status);
      const date = new Date(checkout.created_at).toLocaleString();
      const amount = `${checkout.total_amount} ${checkout.currency || "RWF"}`;
      const method = checkout.payment_method || "unknown";
      const meta = checkout.metadata;
      const items = meta?.items?.length || 0;
      const guest = meta?.guest_info?.name || "Guest";
      
      console.log(`   ${emoji} ${checkout.id.slice(0, 8)}... | ${amount} | ${method} | ${items} item(s) | ${guest}`);
      console.log(`      Status: ${checkout.payment_status || "pending"} | Created: ${date}`);
    }
  }

  // Check bookings table too (legacy)
  console.log("\n📅 BOOKINGS (Legacy):");
  console.log("-".repeat(40));

  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, payment_status, total_price, currency, guest_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (bookingError) {
    console.error("❌ Error fetching bookings:", bookingError.message);
  } else if (!bookings || bookings.length === 0) {
    console.log("   No bookings found");
  } else {
    for (const booking of bookings) {
      const emoji = getStatusEmoji(booking.payment_status);
      const date = new Date(booking.created_at).toLocaleString();
      const amount = `${booking.total_price} ${booking.currency || "RWF"}`;
      
      console.log(`   ${emoji} ${booking.id.slice(0, 8)}... | ${amount} | ${booking.guest_name || "Guest"}`);
      console.log(`      Status: ${booking.status} | Payment: ${booking.payment_status || "pending"}`);
    }
  }

  // Check payment_transactions if exists
  console.log("\n💰 PAYMENT TRANSACTIONS:");
  console.log("-".repeat(40));

  const { data: transactions, error: txError } = await supabase
    .from("payment_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (txError) {
    if (txError.code === "42P01") {
      console.log("   Table does not exist (optional)");
    } else {
      console.error("❌ Error:", txError.message);
    }
  } else if (!transactions || transactions.length === 0) {
    console.log("   No payment transactions found");
  } else {
    for (const tx of transactions) {
      const emoji = getStatusEmoji(tx.status);
      const date = new Date(tx.created_at).toLocaleString();
      
      console.log(`   ${emoji} ${tx.transaction_id?.slice(0, 8) || tx.id.slice(0, 8)}...`);
      console.log(`      Amount: ${tx.amount} ${tx.currency} | Provider: ${tx.provider} | Status: ${tx.status}`);
      if (tx.phone_number) console.log(`      Phone: ${tx.phone_number}`);
    }
  }

  // Summary Statistics
  console.log("\n📊 PAYMENT STATISTICS:");
  console.log("-".repeat(40));

  if (checkouts && checkouts.length > 0) {
    const paid = checkouts.filter(c => c.payment_status === "paid" || c.payment_status === "completed").length;
    const pending = checkouts.filter(c => c.payment_status === "pending").length;
    const failed = checkouts.filter(c => c.payment_status === "failed").length;
    const awaiting = checkouts.filter(c => c.payment_status === "awaiting_callback").length;

    const totalPaid = checkouts
      .filter(c => c.payment_status === "paid" || c.payment_status === "completed")
      .reduce((sum, c) => sum + (c.total_amount || 0), 0);

    console.log(`   ✅ Paid/Completed: ${paid} (Total: ${totalPaid.toLocaleString()} RWF)`);
    console.log(`   ⏳ Pending: ${pending}`);
    console.log(`   📞 Awaiting Callback (Card/Bank): ${awaiting}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    // Failed payment analysis
    if (failed > 0) {
      console.log("\n   ❌ FAILED PAYMENTS ANALYSIS:");
      const failedCheckouts = checkouts.filter(c => c.payment_status === "failed");
      for (const fc of failedCheckouts) {
        const meta = fc.metadata;
        console.log(`      - ${fc.id.slice(0, 8)}... | ${fc.total_amount} ${fc.currency}`);
        if (meta?.failure_reason) {
          console.log(`        Reason: ${meta.failure_reason}`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Payment check complete");
  console.log("=".repeat(60) + "\n");
}

function getStatusEmoji(status) {
  switch (status?.toLowerCase()) {
    case "paid":
    case "completed":
    case "success":
      return "✅";
    case "pending":
    case "submitted":
    case "accepted":
      return "⏳";
    case "awaiting_callback":
      return "📞";
    case "failed":
    case "rejected":
    case "cancelled":
      return "❌";
    case "insufficient_funds":
      return "💸";
    default:
      return "❓";
  }
}

checkPayments().catch(console.error);
