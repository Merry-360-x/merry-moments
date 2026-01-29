import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PaymentPending() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const checkoutId = params.get("checkoutId") || params.get("bookingId"); // Support both
  const depositId = params.get("depositId");
  const phone = params.get("phone") || "";
  
  const [status, setStatus] = useState<"pending" | "completed" | "failed">("pending");
  const [pollCount, setPollCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timeout
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Poll for payment status - check both database AND PawaPay directly
  useEffect(() => {
    if (!checkoutId || status !== "pending") return;

    const checkStatus = async () => {
      if (!checkoutId || checkingStatus) return;
      
      setCheckingStatus(true);
      try {
        // ALWAYS check PawaPay directly first if we have depositId
        // This catches failures immediately (insufficient funds, etc)
        let paymentStatus = null;
        let failureMsg = null;
        
        if (depositId) {
          try {
            const checkUrl = `/api/pawapay-check-status?depositId=${depositId}&checkoutId=${checkoutId}`;
            const response = await fetch(checkUrl);
            const data = await response.json();
            
            console.log("PawaPay check result:", data);
            
            if (data.success) {
              paymentStatus = data.paymentStatus;
              failureMsg = data.failureMessage;
              
              // PawaPay statuses: SUBMITTED, ACCEPTED, COMPLETED, FAILED, REJECTED, CANCELLED
              // Immediately handle failures
              if (data.pawapayStatus === "FAILED" || data.pawapayStatus === "REJECTED" || data.pawapayStatus === "CANCELLED") {
                console.log("Payment failed:", data.pawapayStatus, failureMsg);
                setFailureReason(failureMsg || "Payment failed. Please try again.");
                setStatus("failed");
                setCheckingStatus(false);
                return;
              }
            }
          } catch (pawapayErr) {
            console.warn("Could not check PawaPay directly:", pawapayErr);
          }
        }
        
        // Also check database as fallback
        const { data: checkouts, error } = await supabase
          .from("checkout_requests")
          .select("payment_status")
          .eq("id", checkoutId as never);

        if (error) throw error;
        
        const record = (checkouts as any)?.[0];
        if (record) {
          // Use database status if we don't have PawaPay status
          if (!paymentStatus) {
            paymentStatus = record.payment_status;
          }
        }
        
        if (paymentStatus === "paid" || paymentStatus === "completed") {
          setStatus("completed");
          toast({
            title: "Payment Successful!",
            description: "Your order has been confirmed.",
          });
          // Navigate to success after short delay
          setTimeout(() => {
            navigate("/booking-success?mode=booking&payment=confirmed");
          }, 2000);
        } else if (paymentStatus === "failed" || paymentStatus === "cancelled") {
          if (failureMsg) {
            setFailureReason(failureMsg);
          }
          setStatus("failed");
        }
      } catch (e) {
        console.error("Error checking payment status:", e);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Initial check immediately
    checkStatus();

    // Aggressive polling for first 30 seconds (every 2 seconds)
    // Then slower polling after that (every 5 seconds)
    let pollInterval = 2000; // Start with 2 seconds
    
    const interval = setInterval(() => {
      setPollCount((c) => {
        const newCount = c + 1;
        // After 15 polls (30 seconds), slow down to 5 second intervals
        if (newCount === 15) {
          clearInterval(interval);
          const slowerInterval = setInterval(() => {
            checkStatus();
          }, 5000);
          // Store for cleanup
          (interval as any)._slower = slowerInterval;
        }
        return newCount;
      });
      checkStatus();
    }, pollInterval);

    return () => {
      clearInterval(interval);
      if ((interval as any)._slower) {
        clearInterval((interval as any)._slower);
      }
    };
  }, [checkoutId, depositId, status, navigate, toast]);

  // Countdown timer
  useEffect(() => {
    if (status !== "pending" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setStatus("failed");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRetry = () => {
    // Navigate back to checkout page to retry payment
    navigate("/checkout");
  };

  const handleCancel = () => {
    navigate("/");
  };

  // When timeout expires, show appropriate message and redirect after delay
  useEffect(() => {
    if (status === "failed" && timeLeft <= 0) {
      toast({
        title: "Payment Timeout",
        description: "The payment was not completed in time. Returning to checkout.",
        variant: "destructive",
      });
    }
  }, [status, timeLeft, toast]);

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
                Check your phone <span className="font-medium">{phone}</span> and enter your PIN to approve
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
