import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, AlertCircle, RotateCcw, Home, Phone, HelpCircle, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyPaymentErrorMessage } from "@/lib/ui-errors";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function PaymentFailed() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  
  const reason = params.get("reason") || "unknown";
  const checkoutId = params.get("checkoutId");
  const amount = params.get("amount");
  const currency = params.get("currency") || "RWF";
  
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Map failure reasons to user-friendly messages
  const getFailureInfo = () => {
    const reasonLower = reason.toLowerCase();
    
    if (reasonLower.includes("insufficient") || reasonLower.includes("funds") || reasonLower.includes("balance")) {
      return {
        icon: <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />,
        iconBg: "bg-amber-100 dark:bg-amber-900/30",
        title: "Insufficient Funds",
        message: "You don't have enough balance in your mobile money account to complete this payment.",
        suggestions: [
          "Top up your mobile money account",
          "Try a different mobile money account",
          "Use a different payment method",
        ],
        canRetry: true,
      };
    }
    
    if (reasonLower.includes("cancel") || reasonLower.includes("declined") || reasonLower.includes("reject")) {
      return {
        icon: <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />,
        iconBg: "bg-red-100 dark:bg-red-900/30",
        title: "Payment Cancelled",
        message: "The payment was cancelled or declined.",
        suggestions: [
          "Make sure you entered the correct PIN",
          "Check your mobile money app for any restrictions",
          "Contact your mobile money provider if the issue persists",
        ],
        canRetry: true,
      };
    }
    
    if (reasonLower.includes("timeout") || reasonLower.includes("expired")) {
      return {
        icon: <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />,
        iconBg: "bg-amber-100 dark:bg-amber-900/30",
        title: "Payment Timeout",
        message: "The payment took too long to complete.",
        suggestions: [
          "Make sure to approve the payment promptly when you receive the prompt",
          "Check if you received the mobile money prompt on your phone",
          "Ensure you have good network connection",
        ],
        canRetry: true,
      };
    }
    
    if (reasonLower.includes("limit") || reasonLower.includes("exceeded")) {
      return {
        icon: <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />,
        iconBg: "bg-amber-100 dark:bg-amber-900/30",
        title: "Transaction Limit Exceeded",
        message: "This transaction exceeds your mobile money limit.",
        suggestions: [
          "Contact your mobile money provider to increase your limit",
          "Split the payment into smaller amounts (contact support)",
          "Try a different payment method",
        ],
        canRetry: false,
      };
    }
    
    // Default/unknown error
    return {
      icon: <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      title: "Payment Failed",
      message: reason !== "unknown"
        ? getFriendlyPaymentErrorMessage(reason, "We couldn't process your payment. Please try again.")
        : "We couldn't process your payment. Please try again.",
      suggestions: [
        "Check your mobile money account balance",
        "Ensure you have good network connection",
        "Try again in a few moments",
      ],
      canRetry: true,
    };
  };

  const failureInfo = getFailureInfo();

  const handleRetry = async () => {
    if (!checkoutId) {
      toast({
        title: "Error",
        description: "Missing checkout information. Please start a new booking.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsRetrying(true);

    try {
      // Fetch the checkout request details
      const { data: checkout, error: fetchError } = await supabase
        .from("checkout_requests")
        .select("id, name, email, phone, total_amount, metadata")
        .eq("id", checkoutId)
        .single();

      if (fetchError || !checkout) {
        console.error("Failed to fetch checkout:", fetchError);
        toast({
          title: "Error",
          description: "Could not load booking details. Please start a new booking.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Extract payment details from the checkout
      const metadata = checkout.metadata || {};
      const paymentProvider = metadata.payment_provider || 'MTN';
      const phoneNumber = checkout.phone;
      const totalAmount = checkout.total_amount;

      if (!phoneNumber) {
        toast({
          title: "Error",
          description: "Missing phone number. Please start a new booking.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Reinitiate payment with PawaPay
      console.log("🔄 Retrying payment for checkout:", checkoutId);
      
      const paymentResponse = await fetch("/api/pawapay-create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount: Math.round(totalAmount),
          currency: 'RWF',
          phoneNumber: phoneNumber,
          description: `Merry360x Booking Retry - ${checkoutId.slice(0, 8)}`,
          payerEmail: checkout.email,
          payerName: checkout.name,
          provider: paymentProvider.toUpperCase(),
        }),
      });

      const paymentData = await paymentResponse.json();
      
      if (!paymentResponse.ok || !paymentData.depositId) {
        console.error("Payment retry failed:", paymentData);
        const friendlyError = getFriendlyPaymentErrorMessage(paymentData.message);
        toast({
          title: "Payment Failed",
          description: friendlyError || "Could not retry payment. Please try again.",
          variant: "destructive",
        });
        setIsRetrying(false);
        return;
      }

      console.log("✅ Payment retry initiated:", paymentData.depositId);

      // Redirect to payment pending
      toast({
        title: "Payment Initiated",
        description: "Check your phone to complete the payment",
      });

      navigate(`/payment-pending?checkoutId=${checkoutId}&depositId=${paymentData.depositId}`);
      
    } catch (error: any) {
      console.error("Retry error:", error);
      toast({
        title: "Error",
        description: getFriendlyPaymentErrorMessage(error.message) || "Failed to retry payment. Please try again.",
        variant: "destructive",
      });
      setIsRetrying(false);
    }
  };

  const handleBackHome = () => {
    navigate("/");
  };

  const handleContactSupport = () => {
    window.location.href = "tel:+250796214719";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={`rounded-full p-3 ${failureInfo.iconBg}`}>
                {failureInfo.icon}
              </div>
            </div>

            {/* Title & Message */}
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">
              {failureInfo.title}
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {failureInfo.message}
            </p>

            {/* Amount Info */}
            {amount && (
              <div className="bg-muted/50 rounded-lg p-3 mb-6 text-center">
                <p className="text-xs text-muted-foreground mb-1">Attempted Amount</p>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat('en-RW', {
                    style: 'currency',
                    currency: currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(Number(amount))}
                </p>
              </div>
            )}

            {/* Suggestions */}
            {failureInfo.suggestions.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2 mb-2">
                  <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    What can you do?
                  </p>
                </div>
                <ul className="space-y-1.5 ml-6">
                  {failureInfo.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-xs text-blue-700 dark:text-blue-300">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Booking Reference */}
            {checkoutId && (
              <div className="text-center mb-6">
                <p className="text-xs text-muted-foreground">
                  Booking Reference: <span className="font-mono">{checkoutId.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {failureInfo.canRetry && (
                <Button
                  onClick={handleRetry}
                  className="w-full"
                  size="lg"
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              )}
              
              <Button
                onClick={handleContactSupport}
                variant="outline"
                className="w-full"
                size="lg"
                disabled={isRetrying}
              >
                <Phone className="w-4 h-4 mr-2" />
                Contact Support
              </Button>

              <Button
                onClick={handleBackHome}
                variant="ghost"
                className="w-full"
                size="lg"
                disabled={isRetrying}
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-xs text-muted-foreground mb-2">Need help?</p>
              <div className="flex flex-col gap-1">
                <a href="tel:+250796214719" className="text-xs text-primary hover:underline">
                  +250 796 214 719
                </a>
                <a href="mailto:support@merry360x.com" className="text-xs text-primary hover:underline">
                  ✉️ support@merry360x.com
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
