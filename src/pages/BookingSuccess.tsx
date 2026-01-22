import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Home } from "lucide-react";

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
      <div className="container mx-auto px-4 lg:px-8 py-20">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-6">
                <CheckCircle className="h-20 w-20 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">
              {mode === "booking" ? "Booking Request Submitted!" : "Order Submitted Successfully!"}
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              Thank you for your request. We've received all your details.
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                  Expect a Call Soon!
                </h2>
              </div>
              <p className="text-blue-800 dark:text-blue-200 text-lg font-medium">
                Our booking team will contact you in less than 5 minutes to confirm your request and arrange payment.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate("/")}
                className="w-full sm:w-auto"
                size="lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
