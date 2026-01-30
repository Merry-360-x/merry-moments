import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Smartphone, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// PawaPay status mapping
const PAWAPAY_STATUS = {
  SUBMITTED: "submitted",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
  FAILED: "failed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

const isFinalStatus = (status: string) => {
  return ["completed", "failed", "rejected", "cancelled", "paid"].includes(status?.toLowerCase() || "");
};

const isSuccessStatus = (status: string) => {
  return ["completed", "paid"].includes(status?.toLowerCase() || "");
};

const isFailureStatus = (status: string) => {
  return ["failed", "rejected", "cancelled"].includes(status?.toLowerCase() || "");
};

export default function PaymentPending() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const checkoutId = params.get("checkoutId") || params.get("bookingId");
  const depositId = params.get("depositId");
  
  const [status, setStatus] = useState<"pending" | "completed" | "failed">("pending");
  const [pollCount, setPollCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timeout
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("RWF");

  // Poll for payment status with intelligent intervals
  useEffect(() => {
    if (!checkoutId || isFinalStatus(status)) return;

    const checkStatus = async () => {
      if (checkingStatus) return;
      
      setCheckingStatus(true);
      try {
        let paymentStatus = null;
        let failureMsg = null;
        let pawapayStatus = null;

        // Check PawaPay API directly for real-time status
        if (depositId) {
          try {
            const response = await fetch(`/api/pawapay-check-status?depositId=${depositId}&checkoutId=${checkoutId}`);
            const data = await response.json();
            
            console.log(`[${new Date().toISOString()}] PawaPay status:`, data);
            
            if (data.success) {
              pawapayStatus = data.pawapayStatus;
              paymentStatus = data.paymentStatus;
              failureMsg = data.failureMessage;
            }
          } catch (err) {
            console.warn("PawaPay check error:", err);
          }
        }

        // Also check database for webhook updates
        const { data: checkouts } = await supabase
          .from("checkout_requests")
          .select("payment_status, total_amount, currency")
          .eq("id", checkoutId as never)
          .single();

        if (checkouts) {
          // Database might have been updated by webhook
          const dbStatus = (checkouts as any).payment_status;
          setAmount((checkouts as any).total_amount);
          setCurrency((checkouts as any).currency || "RWF");
          
          // Prioritize database status if it's more final than PawaPay status
          if (isFinalStatus(dbStatus) && !isFinalStatus(paymentStatus || "")) {
            paymentStatus = dbStatus;
          } else if (!paymentStatus) {
            paymentStatus = dbStatus;
          }
        }

        // Handle different statuses
        if (isSuccessStatus(paymentStatus || "")) {
          console.log("Payment completed successfully");
          setStatus("completed");
          toast({
            title: "Payment Successful!",
            description: "Redirecting to confirmation page...",
          });
          setTimeout(() => {
            navigate(`/booking-success?checkoutId=${checkoutId}&payment=confirmed`);
          }, 1500);
        } else if (isFailureStatus(paymentStatus || "")) {
          console.log("Payment failed:", paymentStatus, failureMsg);
          setStatus("failed");
          setFailureReason(failureMsg || null);
          // Navigate to failure page with details
          setTimeout(() => {
            const params = new URLSearchParams({
              checkoutId: checkoutId || "",
              reason: failureMsg || paymentStatus || "Payment was not completed",
            });
            if (amount) params.set("amount", String(amount));
            if (currency) params.set("currency", currency);
            navigate(`/payment-failed?${params.toString()}`);
          }, 1500);
        }
      } catch (error) {
        console.error("Status check error:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Initial check
    checkStatus();

    // Polling strategy:
    // First 30 seconds: every 2 seconds (aggressive)
    // 30s - 2 min: every 3 seconds
    // 2 - 5 min: every 5 seconds
    const getInterval = () => {
      if (pollCount < 15) return 2000; // 0-30s: 2s intervals
      if (pollCount < 40) return 3000; // 30s-2min: 3s intervals
      return 5000; // 2min+: 5s intervals
    };

    const interval = setInterval(() => {
      checkStatus();
      setPollCount(c => c + 1);
    }, getInterval());

    return () => clearInterval(interval);
  }, [checkoutId, depositId, status, pollCount, checkingStatus, navigate, toast]);

  // Countdown timer with timeout handling
  useEffect(() => {
    if (status !== "pending" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Timeout - redirect to failure page
          setStatus("failed");
          setFailureReason("Payment timeout - please try again");
          const params = new URLSearchParams({
            checkoutId: checkoutId || "",
            reason: "Payment took too long to complete. Please try again.",
          });
          if (amount) params.set("amount", String(amount));
          if (currency) params.set("currency", currency);
          navigate(`/payment-failed?${params.toString()}`);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft, checkoutId, amount, currency, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRetry = () => {
    navigate("/checkout");
  };

  const handleCancel = async () => {
    // Try to cancel the payment in the database
    if (checkoutId) {
      try {
        await supabase
          .from("checkout_requests")
          .update({ payment_status: "cancelled" })
          .eq("id", checkoutId as never);
      } catch (err) {
        console.error("Error canceling payment:", err);
      }
    }
    navigate("/");
  };

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
                Check your phone and enter your PIN to approve the payment
              </p>
              
              {/* Timer */}
              <div className="mb-8">
                <div className="text-4xl font-light tabular-nums">{formatTime(timeLeft)}</div>
                <p className="text-sm text-muted-foreground mt-1">Time remaining</p>
              </div>

              {/* Loading indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking payment status...</span>
              </div>
              
              {/* Instructions */}
              <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium mb-2">Complete payment on your phone:</p>
                    <ol className="space-y-1 text-muted-foreground">
                      <li>1. Check for USSD prompt or SMS</li>
                      <li>2. Enter your mobile money PIN</li>
                      <li>3. Confirm the payment</li>
                    </ol>
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
                  : timeLeft <= 0 
                    ? "The payment request has expired."
                    : "The payment was not completed."
                }
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Please return to checkout to try again with a different payment method or ensure sufficient balance.
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
