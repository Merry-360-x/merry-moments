import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoneyWithConversion } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { useFxRates } from "@/hooks/useFxRates";
import { usePreferences } from "@/hooks/usePreferences";
import { useTripCart } from "@/hooks/useTripCart";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Check, Smartphone, Building2, Wallet, CreditCard, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const isoToday = () => new Date().toISOString().slice(0, 10);

function calcNights(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const ms = end.getTime() - start.getTime();
  const n = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function Checkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { guestCart, clearCart } = useTripCart();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();

  const mode = (params.get("mode") ?? "cart") as "cart" | "booking";
  const propertyId = params.get("propertyId") ?? "";
  const requireTripCart = params.get("requireTripCart") === "1";
  const checkIn = params.get("checkIn") ?? isoToday();
  const checkOut = params.get("checkOut") ?? isoToday();
  const guests = Number(params.get("guests") ?? "1");

  const nights = useMemo(() => calcNights(checkIn, checkOut), [checkIn, checkOut]);

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("mobile_money");

  const steps = [
    { id: 1, name: "Contact Info", description: "Your details" },
    { id: 2, name: "Payment Method", description: "How you'll pay" },
    { id: 3, name: "Review", description: "Confirm & submit" },
  ];

  const [property, setProperty] = useState<null | {
    id: string;
    title: string | null;
    name: string | null;
    currency: string | null;
    price_per_night: number | null;
    host_id: string | null;
    max_guests: number | null;
  }>(null);

  // Optional enforcement: booking checkout requires the property to already be in Trip Cart
  // (only when coming from an add-on selection flow).
  const { data: inCartRow } = useQuery({
    queryKey: ["tripCart.hasProperty.checkout", user?.id, propertyId],
    enabled: Boolean(requireTripCart && mode === "booking" && user?.id && propertyId),
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("trip_cart_items")
        .select("id")
        .eq("user_id", user!.id)
        .eq("item_type", "property")
        .eq("reference_id", String(propertyId))
        .limit(1);
      if (error) return null;
      return (rows ?? [])[0] ?? null;
    },
  });

  const isPropertyInCart = useMemo(() => {
    if (!requireTripCart) return true;
    if (mode !== "booking" || !propertyId) return true;
    if (user) return Boolean(inCartRow?.id);
    return guestCart.some((i) => i.item_type === "property" && String(i.reference_id) === String(propertyId));
  }, [guestCart, inCartRow?.id, mode, propertyId, requireTripCart, user]);

  // Prefill payer info for signed-in users
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      try {
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!alive) return;
        if (error) throw error;
        setName(String(prof?.full_name ?? "").trim());
        setPhone(String(prof?.phone ?? "").trim());
        setEmail(String((user as any)?.email ?? "").trim().toLowerCase());
      } catch (e) {
        // Don't block checkout
        logError("checkout.prefill", e);
        setEmail(String((user as any)?.email ?? "").trim().toLowerCase());
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // Load property summary for booking mode
  useEffect(() => {
    let alive = true;
    (async () => {
      if (mode !== "booking" || !propertyId) return;
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id, title, name, currency, price_per_night, host_id, max_guests")
          .eq("id", propertyId)
          .maybeSingle();
        if (!alive) return;
        if (error) throw error;
        if (data) setProperty(data as any);
      } catch (e) {
        logError("checkout.loadProperty", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, propertyId]);

  const submitBooking = async () => {
    if (requireTripCart && !isPropertyInCart) {
      toast({
        variant: "destructive",
        title: "Add to Trip Cart first",
        description: "Please add this stay to your Trip Cart first, then checkout.",
      });
      return;
    }
    if (!propertyId) {
      toast({ variant: "destructive", title: "Missing property", description: "Please go back and try again." });
      return;
    }
    if (nights <= 0) {
      toast({ variant: "destructive", title: "Invalid dates", description: "Check-out must be after check-in." });
      return;
    }
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Please enter your full name." });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast({ variant: "destructive", title: "Email required", description: "Please enter a valid email address." });
      return;
    }
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Phone required", description: "Please enter your phone number." });
      return;
    }

    setLoading(true);
    try {
      const nightly = Number(property?.price_per_night ?? 0);
      const currency = String(property?.currency ?? "RWF");
      const total = nights * nightly;

      const basePayload: Record<string, unknown> = {
        property_id: propertyId,
        host_id: property?.host_id ?? null,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: Math.max(1, Number(guests || 1)),
        total_price: total,
        currency,
        status: "pending_confirmation",
        payment_method: paymentMethod,
        special_requests: message.trim() || null,
      };

      if (user) {
        basePayload.guest_id = user.id;
        basePayload.is_guest_booking = false;
      } else {
        basePayload.is_guest_booking = true;
        basePayload.guest_name = name.trim();
        basePayload.guest_email = email.trim().toLowerCase();
        basePayload.guest_phone = phone.trim();
      }

      const { error } = await supabase.from("bookings").insert(basePayload as never);
      if (error) throw error;

      toast({ 
        title: "Booking request submitted!", 
        description: "Our team will contact you shortly to confirm your booking and arrange payment." 
      });
      navigate(user ? "/my-bookings" : "/");
    } catch (e) {
      logError("checkout.booking.insert", e);
      toast({ variant: "destructive", title: "Could not submit booking request", description: uiErrorMessage(e, "Please try again.") });
    } finally {
      setLoading(false);
    }
  };

  const submitCartCheckout = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Please enter your full name." });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast({ variant: "destructive", title: "Email required", description: "Please enter a valid email address." });
      return;
    }
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Phone required", description: "Please enter your phone number." });
      return;
    }

    setLoading(true);
    try {
      // Snapshot cart items for this request.
      const items = user
        ? (
            await supabase
              .from("trip_cart_items")
              .select("item_type, reference_id, quantity")
              .eq("user_id", user.id)
          ).data ?? []
        : guestCart.map((i) => ({ item_type: i.item_type, reference_id: i.reference_id, quantity: i.quantity }));

      if (!items.length) {
        toast({ variant: "destructive", title: "Cart is empty", description: "Add items to your cart first." });
        return;
      }

      const payload: Record<string, unknown> = {
        user_id: user ? user.id : null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        message: message.trim() || null,
        payment_method: paymentMethod,
        items,
        status: "pending_confirmation",
      };

      const { error } = await supabase.from("checkout_requests").insert(payload as never);
      if (error) throw error;

      await clearCart();
      toast({ 
        title: "Request submitted successfully!", 
        description: "Our team will contact you shortly to confirm your order and arrange payment." 
      });
      navigate("/");
    } catch (e) {
      logError("checkout.cart.submit", e);
      toast({ variant: "destructive", title: "Could not submit request", description: uiErrorMessage(e, "Please try again.") });
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = mode === "booking" ? "Booking Request" : "Checkout Request";
  const bookingTitle = property ? String(property.title ?? property.name ?? "Accommodation") : "Accommodation";
  const currency = String(property?.currency ?? "RWF");
  const nightly = Number(property?.price_per_night ?? 0);
  const bookingTotal = nights > 0 ? nights * nightly : 0;

  const MobileMoneyIcon = () => (
    <svg className="h-8 w-8" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="6" width="40" height="36" rx="4" fill="#FFCC00"/>
      <path d="M12 16h24M12 24h24M12 32h16" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="36" cy="32" r="3" fill="#000"/>
    </svg>
  );

  const BankIcon = () => (
    <svg className="h-8 w-8" viewBox="0 0 48 48" fill="none">
      <path d="M24 8L4 18v4h40v-4L24 8z" fill="#1E40AF"/>
      <rect x="8" y="22" width="6" height="16" fill="#1E40AF"/>
      <rect x="18" y="22" width="6" height="16" fill="#1E40AF"/>
      <rect x="28" y="22" width="6" height="16" fill="#1E40AF"/>
      <rect x="38" y="22" width="6" height="16" fill="#1E40AF"/>
      <rect x="4" y="38" width="40" height="4" fill="#1E40AF"/>
    </svg>
  );

  const CashIcon = () => (
    <svg className="h-8 w-8" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="14" width="36" height="20" rx="2" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
      <circle cx="24" cy="24" r="6" fill="#16A34A"/>
      <circle cx="12" cy="24" r="2" fill="#16A34A"/>
      <circle cx="36" cy="24" r="2" fill="#16A34A"/>
    </svg>
  );

  const CardIcon = () => (
    <svg className="h-8 w-8" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="12" width="40" height="24" rx="3" fill="#7C3AED" stroke="#6D28D9" strokeWidth="2"/>
      <rect x="4" y="20" width="40" height="6" fill="#6D28D9"/>
      <rect x="8" y="30" width="12" height="2" rx="1" fill="#E9D5FF"/>
      <rect x="8" y="34" width="8" height="2" rx="1" fill="#E9D5FF"/>
    </svg>
  );

  const paymentMethods = [
    {
      id: "mobile_money",
      name: "Mobile Money",
      description: "MTN MoMo, Airtel Money",
      icon: MobileMoneyIcon,
      color: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
      activeColor: "border-yellow-500 bg-yellow-100 dark:bg-yellow-900/40",
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      description: "Direct bank deposit",
      icon: BankIcon,
      color: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
      activeColor: "border-blue-500 bg-blue-100 dark:bg-blue-900/40",
    },
    {
      id: "cash",
      name: "Cash Payment",
      description: "Pay in person",
      icon: CashIcon,
      color: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
      activeColor: "border-green-500 bg-green-100 dark:bg-green-900/40",
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      description: "Visa, Mastercard",
      icon: CardIcon,
      color: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
      activeColor: "border-purple-500 bg-purple-100 dark:bg-purple-900/40",
    },
  ];

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!name.trim()) {
        toast({ variant: "destructive", title: "Name required", description: "Please enter your full name." });
        return false;
      }
      if (!email.trim() || !email.includes("@")) {
        toast({ variant: "destructive", title: "Email required", description: "Please enter a valid email address." });
        return false;
      }
      if (!phone.trim()) {
        toast({ variant: "destructive", title: "Phone required", description: "Please enter your phone number." });
        return false;
      }
    }
    if (step === 2) {
      if (!paymentMethod) {
        toast({ variant: "destructive", title: "Payment method required", description: "Please select a payment method." });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      if (mode === "booking") {
        submitBooking();
      } else {
        submitCartCheckout();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{pageTitle}</h1>
          <p className="text-muted-foreground mb-8">
            {mode === "booking"
              ? "Submit your booking request. Our team will contact you to confirm and arrange payment."
              : "Share your contact information and preferred payment method. We'll contact you to confirm your order."}
          </p>

          {mode === "booking" ? (
            <Card className="p-5 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Booking</div>
                  <div className="text-lg font-semibold text-foreground">{bookingTitle}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {checkIn} → {checkOut} • {nights} night{nights === 1 ? "" : "s"} • {Math.max(1, guests)} guest
                    {Math.max(1, guests) === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-xl font-bold text-foreground">
                    {formatMoneyWithConversion(bookingTotal, currency, preferredCurrency, usdRates)}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                        currentStep > step.id
                          ? "bg-green-500 text-white"
                          : currentStep === step.id
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={cn("text-sm font-medium", currentStep >= step.id ? "text-foreground" : "text-muted-foreground")}>
                        {step.name}
                      </div>
                      <div className="text-xs text-muted-foreground hidden sm:block">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn("flex-1 h-1 mx-4 rounded transition-all", currentStep > step.id ? "bg-green-500" : "bg-muted")} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Card className="p-6">
            {/* Step 1: Contact Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Contact Information</h3>
                  <p className="text-sm text-muted-foreground">We'll use this to contact you about your request</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="name">Full name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+250 788 123 456"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="message">Special Requests or Notes (Optional)</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Any special requests or additional information..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Payment Method</h3>
                  <p className="text-sm text-muted-foreground">Choose how you'd like to pay</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          "relative p-4 border-2 rounded-lg text-left transition-all hover:shadow-md",
                          isSelected ? method.activeColor : method.color
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg", isSelected ? "bg-white" : "bg-white/50")}>
                            <Icon />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-foreground">{method.name}</div>
                            <div className="text-sm text-muted-foreground mt-1">{method.description}</div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    💡 Payment Information
                  </h4>
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    You won't be charged now. Our team will contact you with payment instructions after reviewing your request.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Review Your Request</h3>
                  <p className="text-sm text-muted-foreground">Please verify your information before submitting</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Contact Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{phone}</span>
                      </div>
                      {message && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground">Notes:</span>
                          <p className="mt-1 text-foreground">{message}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Payment Method</h4>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod);
                        if (!selectedMethod) return null;
                        const Icon = selectedMethod.icon;
                        return (
                          <>
                            <div className="p-2 bg-background rounded-lg border">
                              <Icon />
                            </div>
                            <div>
                              <div className="font-medium">{selectedMethod.name}</div>
                              <div className="text-sm text-muted-foreground">{selectedMethod.description}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border-2 border-green-200 dark:border-green-800 rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                    📞 What happens next?
                  </h4>
                  <ul className="text-sm text-green-900 dark:text-green-200 space-y-1.5 ml-4 list-disc">
                    <li>Our team will review your request within 24 hours</li>
                    <li>We'll call you at <strong>{phone}</strong> to confirm the details</li>
                    <li>Payment instructions will be provided based on your selected method</li>
                    <li>Once payment is confirmed, your booking will be finalized</li>
                  </ul>
                </div>
              </div>
            )}

            <Separator className="my-6" />

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <Button
                variant="outline"
                type="button"
                onClick={currentStep === 1 ? () => navigate(-1) : handlePrevious}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {currentStep === 1 ? "Cancel" : "Previous"}
              </Button>
              {currentStep < 3 ? (
                <Button type="button" onClick={handleNext} disabled={loading}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || (mode === "booking" && !isPropertyInCart)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Submitting..." : "Submit Request"}
                  <Check className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

