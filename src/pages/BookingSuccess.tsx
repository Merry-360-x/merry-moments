import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Home, Mail, MessageCircle } from "lucide-react";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode") || "booking";

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <h1 className="text-xl font-semibold text-foreground mb-2">
              {mode === "booking" ? "Request Submitted" : "Order Submitted"}
            </h1>

            <p className="text-sm text-muted-foreground mb-6">
              We've received your details
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Expect a call in 5 minutes
                </p>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                We'll confirm and arrange payment
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Need Help?
              </h3>
              <div className="space-y-2">
                <a
                  href="tel:+250788888888"
                  className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Call Support</div>
                    <div className="text-xs text-muted-foreground">+250 788 888 888</div>
                  </div>
                </a>
                <a
                  href="mailto:support@merrymoments.com"
                  className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Email Support</div>
                    <div className="text-xs text-muted-foreground">support@merrymoments.com</div>
                  </div>
                </a>
              </div>
            </div>

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
