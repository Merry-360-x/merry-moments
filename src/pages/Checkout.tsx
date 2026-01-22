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
  const [paymentMethod, setPaymentMethod] = useState<string>("mtn_momo");

  // Load saved progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem("checkout_progress");
    if (savedProgress) {
      try {
        const data = JSON.parse(savedProgress);
        // Only restore if values exist (don't overwrite with empty strings)
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.message) setMessage(data.message);
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
        if (data.currentStep && data.currentStep > 1) setCurrentStep(data.currentStep);
      } catch (e) {
        console.error("Failed to load checkout progress:", e);
      }
    }
  }, []);

  // Save progress to localStorage whenever form data changes
  useEffect(() => {
    const progressData = {
      name,
      email,
      phone,
      message,
      paymentMethod,
      currentStep,
    };
    localStorage.setItem("checkout_progress", JSON.stringify(progressData));
  }, [name, email, phone, message, paymentMethod, currentStep]);

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

  // Prefill payer info for signed-in users (only if not already filled from localStorage)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      
      // Check if we already have saved progress - if so, don't overwrite
      const savedProgress = localStorage.getItem("checkout_progress");
      if (savedProgress) {
        try {
          const data = JSON.parse(savedProgress);
          // Only prefill if localStorage doesn't have these values yet
          if (!data.name || !data.phone || !data.email) {
            // Fetch profile to prefill empty fields only
            const { data: prof, error } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("user_id", user.id)
              .maybeSingle();
            if (!alive) return;
            if (error) throw error;
            
            // Only set if the field is currently empty in saved data
            if (!data.name && prof?.full_name) setName(String(prof.full_name).trim());
            if (!data.phone && prof?.phone) setPhone(String(prof.phone).trim());
            if (!data.email) setEmail(String((user as any)?.email ?? "").trim().toLowerCase());
          }
          return;
        } catch (e) {
          // If parsing fails, fall through to regular prefill
        }
      }
      
      // No saved progress, do regular prefill
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
        guests: Math.max(1, Number(guests || 1)),
        total_price: total,
        currency,
        status: "pending_confirmation",
        payment_method: paymentMethod,
        special_requests: message.trim() || null,
        guest_phone: phone.trim(), // Always include phone for all users
      };

      if (user) {
        basePayload.guest_id = user.id;
        basePayload.is_guest_booking = false;
      } else {
        basePayload.is_guest_booking = true;
        basePayload.guest_name = name.trim();
        basePayload.guest_email = email.trim().toLowerCase();
      }

      const { error } = await supabase.from("bookings").insert(basePayload as never);
      if (error) throw error;

      // Clear saved progress after successful submission
      localStorage.removeItem("checkout_progress");
      navigate("/booking-success?mode=booking");
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
      // Clear saved progress after successful submission
      localStorage.removeItem("checkout_progress");
      navigate("/booking-success?mode=cart");
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

  const paymentMethods = [
    {
      id: "mtn_momo",
      name: "MTN MoMo",
      description: "MTN Mobile Money",
      iconPath: "/payment-icons/mtn-momo.png",
    },
    {
      id: "airtel_money",
      name: "Airtel Money",
      description: "Airtel Mobile Money",
      iconPath: "/payment-icons/airtel-money.png",
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      description: "Direct bank deposit",
      iconPath: "/payment-icons/bank-transfer.png",
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      description: "Visa, Mastercard",
      iconPath: "/payment-icons/card.png",
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
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          "relative p-4 border-2 rounded-lg text-left transition-all hover:shadow-md bg-white dark:bg-gray-950",
                          isSelected ? "border-primary shadow-lg" : "border-gray-200 dark:border-gray-800"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg">
                            <img src={method.iconPath} alt={method.name} className="h-10 w-10 object-contain" />
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
                  <p className="text-sm text-muted-foreground">Please verify all information before submitting</p>
                </div>

                <div className="space-y-4">
                  {mode === "booking" && property && (
                    <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
                      <h4 className="font-semibold mb-3 text-primary">Booking Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property:</span>
                          <span className="font-medium">{property.title || property.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Check-in:</span>
                          <span className="font-medium">{checkIn}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Check-out:</span>
                          <span className="font-medium">{checkOut}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nights:</span>
                          <span className="font-medium">{nights} night{nights === 1 ? "" : "s"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Guests:</span>
                          <span className="font-medium">{Math.max(1, guests)} guest{Math.max(1, guests) === 1 ? "" : "s"}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Price per night:</span>
                          <span className="font-medium">{formatMoneyWithConversion(Number(property.price_per_night ?? 0), currency, preferredCurrency, usdRates)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Total Price:</span>
                          <span className="font-bold text-lg text-primary">{formatMoneyWithConversion(bookingTotal, currency, preferredCurrency, usdRates)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Contact Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{name || <span className="text-red-500">Not provided</span>}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{email || <span className="text-red-500">Not provided</span>}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{phone || <span className="text-red-500">Not provided</span>}</span>
                      </div>
                      {message && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground">Special Requests:</span>
                          <p className="mt-1 text-foreground">{message}</p>
                        </div>
                      )}
                    </div>
                    {(!name || !email || !phone) && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          ⚠️ Please go back and fill in all required contact information
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Payment Method</h4>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod);
                        if (!selectedMethod) return null;
                        return (
                          <>
                            <div className="p-2 bg-background rounded-lg border">
                              <img src={selectedMethod.iconPath} alt={selectedMethod.name} className="h-10 w-10 object-contain" />
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
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? "Booking..." : "Book"}
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

