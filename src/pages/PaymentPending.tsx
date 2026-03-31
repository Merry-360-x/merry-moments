import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Smartphone, AlertTriangle } from "lucide-react";

const isFinalStatus = (status: string) =>
  ["completed", "failed", "rejected", "cancelled", "paid"].includes(status?.toLowerCase() || "");

const isSuccessStatus = (status: string) =>
  ["completed", "paid"].includes(status?.toLowerCase() || "");

const isFailureStatus = (status: string) =>
  ["failed", "rejected", "cancelled"].includes(status?.toLowerCase() || "");

// How long (seconds) to show a "taking longer than expected" warning for card payments.
const CARD_SLOW_WARNING_AFTER = 60;

export default function PaymentPending() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkoutId = params.get("checkoutId") || params.get("bookingId");
  const depositId = params.get("depositId");
  const provider = (params.get("provider") || "pawapay").toLowerCase();
  const txRef = params.get("tx_ref") || params.get("txRef");
  const transactionId = params.get("transaction_id") || params.get("transactionId");
  // Flutterwave appends ?status= to the redirect URL — read it for instant feedback.
  const flwRedirectStatus = params.get("status");

  const isCardProvider = provider === "flutterwave";
  const cardProviderLabel = "Flutterwave";

  const [status, setStatus] = useState<"pending" | "completed" | "failed">("pending");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Refs so async callbacks always see current values without triggering effect restarts.
  const checkingRef = useRef(false);
  const statusRef = useRef(status);
  const amountRef = useRef<number | null>(null);
  const currencyRef = useRef<string>("RWF");
  useEffect(() => { statusRef.current = status; }, [status]);

  // Elapsed seconds counter while waiting.
  useEffect(() => {
    if (status !== "pending") return;
    const t = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // If Flutterwave redirect immediately signals a cancellation, show it at once
  // (we still poll once to update the DB, but the user sees the outcome right away).
  useEffect(() => {
    if (provider !== "flutterwave" || !flwRedirectStatus) return;
    const s = flwRedirectStatus.toLowerCase();
    if (s === "cancelled" || s === "failed") {
      setStatus("failed");
      setFailureReason("Card payment was cancelled");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  const resolveResult = useCallback(
    (paymentStatus: string, failureMsg?: string | null) => {
      // Never downgrade a confirmed success.
      if (statusRef.current === "completed") return;
      // Allow upgrading failure → success: Flutterwave can redirect with status=cancelled
      // even when the underlying charge went through (e.g. Nigerian 3DS timeout).
      // If the API/DB confirms "paid", always honour that.
      if (statusRef.current === "failed" && !isSuccessStatus(paymentStatus)) return;
      if (isSuccessStatus(paymentStatus)) {
        setStatus("completed");
        toast({ title: "Payment Successful!", description: "Payment confirmed. Redirecting to My Bookings..." });
        setTimeout(() => {
          navigate(`/my-bookings?checkoutId=${encodeURIComponent(checkoutId || "")}&payment=confirmed`, { replace: true });
        }, 1500);
      } else if (isFailureStatus(paymentStatus)) {
        setStatus("failed");
        setFailureReason(failureMsg || null);
        setTimeout(() => {
          const p = new URLSearchParams({
            checkoutId: checkoutId || "",
            reason: failureMsg || paymentStatus || "Payment was not completed",
            provider,
          });
          if (amountRef.current) p.set("amount", String(amountRef.current));
          p.set("currency", currencyRef.current);
          navigate(`/payment-failed?${p.toString()}`);
        }, 1500);
      }
    },
    [checkoutId, provider, navigate, toast],
  );

  const doCheck = useCallback(async () => {
    if (checkingRef.current || isFinalStatus(statusRef.current)) return;
    checkingRef.current = true;
    try {
      let paymentStatus: string | null = null;
      let failureMsg: string | null = null;

      // Card payments: verify directly with Flutterwave API.
      if (provider === "flutterwave") {
        try {
          const qp = new URLSearchParams({ action: "verify-payment" });
          if (checkoutId) qp.set("checkoutId", checkoutId);
          if (transactionId) qp.set("transaction_id", transactionId);
          if (txRef) qp.set("tx_ref", txRef);
          const res = await fetch(`/api/flutterwave?${qp}`);
          const data = await res.json().catch(() => ({}));
          if (data.success) {
            paymentStatus = data.paymentStatus;
            if (data.paymentStatus === "failed") {
              failureMsg = data.flutterwaveStatus
                ? `Card payment ${String(data.flutterwaveStatus).toLowerCase()}`
                : "Card payment was not completed";
            }
          }
        } catch (err) {
          console.warn("Flutterwave verify error:", err);
        }
      }

      // Mobile money: check PawaPay directly.
      if (provider !== "flutterwave" && depositId) {
        try {
          const res = await fetch(`/api/pawapay-check-status?depositId=${depositId}&checkoutId=${checkoutId}`);
          const data = await res.json().catch(() => ({}));
          if (data.success) {
            paymentStatus = data.paymentStatus;
            failureMsg = data.failureMessage;
          }
        } catch (err) {
          console.warn("PawaPay check error:", err);
        }
      }

      // Always check DB — webhook may have updated it before the API check above.
      try {
        const { data: checkout } = await supabase
          .from("checkout_requests")
          .select("payment_status, total_amount, currency")
          .eq("id", checkoutId as never)
          .single();
        if (checkout) {
          const dbStatus = (checkout as any).payment_status as string;
          amountRef.current = (checkout as any).total_amount;
          currencyRef.current = (checkout as any).currency || "RWF";
          if (isFinalStatus(dbStatus) && !isFinalStatus(paymentStatus || "")) paymentStatus = dbStatus;
          else if (!paymentStatus) paymentStatus = dbStatus;
        }
      } catch (err) {
        console.warn("DB status check error:", err);
      }

      if (paymentStatus) resolveResult(paymentStatus, failureMsg);
    } finally {
      checkingRef.current = false;
    }
  }, [checkoutId, depositId, provider, txRef, transactionId, resolveResult]);

  // Single stable polling effect — only runs once on mount.
  // Does NOT include volatile state (amount, currency, pollCount, checkingStatus) in deps
  // to avoid tearing down and recreating the interval on every poll.
  useEffect(() => {
    if (!checkoutId) return;

    // Immediate check on mount.
    doCheck();

    // Escalating intervals: 2s → 4s → 6s.
    let count = 0;
    let intervalMs = 2000;
    let intervalId = setInterval(tick, intervalMs);

    function tick() {
      if (isFinalStatus(statusRef.current)) { clearInterval(intervalId); return; }
      doCheck();
      count++;
      // Slow down after 15 polls (~30s) and again after 30 polls (~90s).
      if (count === 15 || count === 30) {
        clearInterval(intervalId);
        intervalMs = count === 15 ? 4000 : 6000;
        intervalId = setInterval(tick, intervalMs);
      }
    }

    return () => clearInterval(intervalId);
  // doCheck is stable (useCallback with stable deps). Only re-run if checkoutId changes.
  }, [checkoutId, doCheck]);

  const handleRetry = () => navigate("/checkout");

  const handleCancel = async () => {
    if (checkoutId) {
      try {
        await supabase
          .from("checkout_requests")
          .update({ payment_status: "cancelled" } as any)
          .eq("id", checkoutId as never);
      } catch { /* ignore */ }
    }
    navigate("/");
  };

  const showSlowWarning = isCardProvider && status === "pending" && elapsedSeconds >= CARD_SLOW_WARNING_AFTER;

  if (!checkoutId) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-semibold">Invalid Payment Session</h2>
            <p className="text-gray-600">No checkout information found.</p>
            <Button onClick={() => navigate("/")}>Return Home</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          {/* Status Icon */}
          <div className="mb-8">
            {status === "pending" && (
              <div className="relative inline-flex">
                <div className="w-24 h-24 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                  <Smartphone className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="absolute inset-0 animate-ping">
                  <div className="w-24 h-24 rounded-full border-2 border-foreground/20" />
                </div>
              </div>
            )}
            {status === "completed" && (
              <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            )}
            {status === "failed" && (
              <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
            )}
          </div>

          {/* Status Text */}
          {status === "pending" && (
            <>
              <h1 className="text-2xl font-light mb-2">Waiting for Payment</h1>
              <p className="text-muted-foreground mb-6">
                {isCardProvider
                  ? "Complete your card payment on the secure checkout page"
                  : "Check your phone and enter your PIN to approve the payment"}
              </p>
              
              {/* Loading indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking payment status...</span>
              </div>

              {/* Slow-payment warning for card (after 60s) */}
              {showSlowWarning && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>This is taking longer than expected. Your bank may still be processing the payment.</span>
                  </div>
                  <Button size="sm" variant="outline" className="self-center" onClick={() => doCheck()}>
                    Check again
                  </Button>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium mb-2">
                      {isCardProvider ? "Complete your card payment:" : "Complete payment on your phone:"}
                    </p>
                    {isCardProvider ? (
                      <ol className="space-y-1 text-muted-foreground">
                        <li>1. Enter your card details securely</li>
                        <li>2. Complete any required OTP/3DS step</li>
                        <li>3. Return here for confirmation</li>
                      </ol>
                    ) : (
                      <ol className="space-y-1 text-muted-foreground">
                        <li>1. Check for USSD prompt or SMS</li>
                        <li>2. Enter your mobile money PIN</li>
                        <li>3. Confirm the payment</li>
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {status === "completed" && (
            <>
              <h1 className="text-2xl font-light mb-2">Payment Confirmed</h1>
              <p className="text-muted-foreground mb-6">
                Your booking has been confirmed successfully
              </p>
              <p className="text-sm text-muted-foreground">Redirecting...</p>
            </>
          )}

          {status === "failed" && (
            <>
              <h1 className="text-2xl font-light mb-2">Payment Not Completed</h1>
              <p className="text-muted-foreground mb-4">
                {failureReason 
                  ? failureReason
                  : "The payment was not completed."
                }
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                {isCardProvider
                  ? `Please return to checkout and try card payment again on ${cardProviderLabel}.`
                  : "Please return to checkout to try again with a different payment method or ensure sufficient balance."}
              </p>
              
              <div className="flex flex-col gap-3">
                <Button onClick={handleRetry} className="bg-foreground text-background hover:bg-foreground/90">
                  Return to Checkout
                </Button>
                <Button variant="ghost" onClick={handleCancel} className="text-muted-foreground">
                  Cancel Booking
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
