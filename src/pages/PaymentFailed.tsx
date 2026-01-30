import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, AlertCircle, RotateCcw, Home, Phone, HelpCircle } from "lucide-react";

export default function PaymentFailed() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  
  const reason = params.get("reason") || "unknown";
  const checkoutId = params.get("checkoutId");
  const amount = params.get("amount");
  const currency = params.get("currency") || "RWF";

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
      message: reason !== "unknown" ? reason : "We couldn't process your payment. Please try again.",
      suggestions: [
        "Check your mobile money account balance",
        "Ensure you have good network connection",
        "Try again in a few moments",
      ],
      canRetry: true,
    };
  };

  const failureInfo = getFailureInfo();

  const handleRetry = () => {
    navigate("/checkout");
  };

  const handleBackHome = () => {
    navigate("/");
  };

  const handleContactSupport = () => {
    window.location.href = "tel:+250792527083";
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
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              <Button
                onClick={handleContactSupport}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contact Support
              </Button>

              <Button
                onClick={handleBackHome}
                variant="ghost"
                className="w-full"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-xs text-muted-foreground mb-2">Need help?</p>
              <div className="flex flex-col gap-1">
                <a href="tel:+250792527083" className="text-xs text-primary hover:underline">
                  📞 +250 792 527 083
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
