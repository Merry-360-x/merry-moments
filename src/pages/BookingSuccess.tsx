import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Home, Mail, MessageCircle, Clock, CreditCard, Building2 } from "lucide-react";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode") || "booking";
  const method = params.get("method"); // 'card' or 'bank' or null
  const bookingId = params.get("bookingId") || params.get("checkoutId");

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  // Determine content based on payment method
  const isManualPayment = method === 'card' || method === 'bank';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 py-8 md:py-16">
        <div className="max-w-md mx-auto">
          <Card className="p-4 md:p-6 text-center">
            <div className="flex justify-center mb-3 md:mb-4">
              <div className={`rounded-full p-2.5 md:p-3 ${isManualPayment ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                {isManualPayment ? (
                  <Clock className="h-8 w-8 md:h-12 md:w-12 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle className="h-8 w-8 md:h-12 md:w-12 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>

            <h1 className="text-lg md:text-xl font-semibold text-foreground mb-1 md:mb-2">
              {isManualPayment 
                ? "Booking Received!" 
                : mode === "booking" 
                  ? "Booking Confirmed!" 
                  : "Order Confirmed!"}
            </h1>

            <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
              {isManualPayment 
                ? "Your booking has been reserved" 
                : "We've received your booking"}
              {bookingId && <span className="block text-[10px] md:text-xs mt-1">ID: {bookingId.slice(0, 8)}...</span>}
            </p>

            {isManualPayment ? (
              <>
                {/* Manual Payment Instructions */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {method === 'card' ? (
                      <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Building2 className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
                    )}
                    <p className="text-xs md:text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {method === 'card' ? 'Card Payment' : 'Bank Transfer'}
                    </p>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-2.5 md:p-3 mb-2 md:mb-3">
                    <p className="text-lg md:text-2xl font-bold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4 md:h-5 md:w-5" />
                      Call in 5 min
                    </p>
                  </div>
                  <p className="text-[10px] md:text-xs text-amber-700 dark:text-amber-300">
                    We'll call to complete your payment
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                  <h3 className="text-xs md:text-sm font-semibold text-foreground mb-2 md:mb-3">
                    Contact us directly
                  </h3>
                  <div className="space-y-2 md:space-y-3">
                    <a
                      href="tel:+250793903663"
                      className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Phone className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-xs md:text-sm">Call Support</div>
                        <div className="text-xs text-muted-foreground">+250 793 903 663</div>
                      </div>
                    </a>
                    <a
                      href="mailto:support@merry360x.com"
                      className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Mail className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-xs md:text-sm">Email</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground truncate">support@merry360x.com</div>
                      </div>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Payment Successful
                    </p>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    You'll receive a confirmation email shortly
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Need Help?
                  </h3>
                  <div className="space-y-2">
                    <a
                      href="tel:+250793903663"
                      className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Call Support</div>
                        <div className="text-xs text-muted-foreground">+250 793 903 663</div>
                      </div>
                    </a>
                    <a
                      href="mailto:support@merry360x.com"
                      className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Email Support</div>
                        <div className="text-xs text-muted-foreground">support@merry360x.com</div>
                      </div>
                    </a>
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Home className="h-3 w-3 mr-2" />
              Back to Home
            </Button>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
