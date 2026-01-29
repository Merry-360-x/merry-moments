import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
import { Check, ArrowRight, ArrowLeft, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkAvailability } from "@/lib/availability-check";
import { initiatePawaPayPayment, isPawaPayMethod, validatePawaPayAmount, PAWAPAY_MIN_AMOUNT_RWF } from "@/lib/pawapay";

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
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState(""); // Separate phone for mobile money
  const [message, setMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("mtn_momo");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  
  // Discount code state
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Load applied discount from localStorage on mount (passed from TripCart)
  useEffect(() => {
    const savedDiscount = localStorage.getItem("applied_discount");
    if (savedDiscount) {
      try {
        const discount = JSON.parse(savedDiscount);
        setAppliedDiscount(discount);
        setDiscountCode(discount.code || "");
      } catch (e) {
        localStorage.removeItem("applied_discount");
      }
    }
  }, []);

  // Validate and apply discount code
  const applyDiscountCode = async () => {
    if (!discountCode.trim()) return;
    
    setValidatingCode(true);
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase().trim())
        .eq("is_active", true)
        .single();
      
      if (error || !data) {
        toast({ variant: "destructive", title: "Invalid Code", description: "Discount code not found or expired" });
        setValidatingCode(false);
        return;
      }
      
      // Check if expired
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        toast({ variant: "destructive", title: "Expired", description: "This discount code has expired" });
        setValidatingCode(false);
        return;
      }
      
      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast({ variant: "destructive", title: "Limit Reached", description: "This discount code has reached its usage limit" });
        setValidatingCode(false);
        return;
      }
      
      setAppliedDiscount(data);
      localStorage.setItem("applied_discount", JSON.stringify(data));
      toast({ title: "Success", description: `Discount code applied: ${data.discount_type === 'percentage' ? data.discount_value + '%' : data.currency + ' ' + data.discount_value} off` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to validate discount code" });
    }
    setValidatingCode(false);
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    localStorage.removeItem("applied_discount");
  };

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
        if (data.mobileMoneyPhone) setMobileMoneyPhone(data.mobileMoneyPhone);
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
      mobileMoneyPhone,
      message,
      paymentMethod,
      currentStep,
    };
    localStorage.setItem("checkout_progress", JSON.stringify(progressData));
  }, [name, email, phone, mobileMoneyPhone, message, paymentMethod, currentStep]);

  const steps = [
    { id: 1, name: "Details" },
    { id: 2, name: "Payment" },
    { id: 3, name: "Confirm" },
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

      // Validate minimum amount for mobile money
      if (isPawaPayMethod(paymentMethod)) {
        const validation = validatePawaPayAmount(total, currency);
        if (!validation.valid) {
          toast({
            variant: "destructive",
            title: "Amount too low",
            description: validation.message || `Minimum amount is ${PAWAPAY_MIN_AMOUNT_RWF} RWF for mobile money payments.`,
          });
          setLoading(false);
          return;
        }
      }

      const basePayload: Record<string, unknown> = {
        property_id: propertyId,
        host_id: property?.host_id ?? null,
        check_in: checkIn,
        check_out: checkOut,
        guests: Math.max(1, Number(guests || 1)),
        total_price: total,
        currency,
        status: "pending_confirmation",
        payment_status: "pending",
        payment_method: paymentMethod,
        special_requests: message.trim() || null,
        guest_phone: phone.trim(),
        guest_name: name.trim(),
        guest_email: email.trim().toLowerCase(),
      };

      if (user) {
        basePayload.guest_id = user.id;
        basePayload.is_guest_booking = false;
      } else {
        basePayload.is_guest_booking = true;
      }

      // For mobile money, skip auto-confirm - wait for actual payment
      if (!isPawaPayMethod(paymentMethod)) {
        // Check availability and auto-confirm only for non-mobile-money payments
        const availabilityResults = await checkAvailability([
          {
            itemId: propertyId,
            itemType: "property",
            checkIn,
            checkOut,
          }
        ]);

        if (availabilityResults[0]?.autoConfirm) {
          basePayload.status = "confirmed";
        }
      }

      const { data: insertedBooking, error } = await supabase
        .from("bookings")
        .insert(basePayload as never)
        .select("id")
        .single();
      if (error) throw error;

      // Initiate PawaPay payment for mobile money methods
      if (isPawaPayMethod(paymentMethod)) {
        const paymentPhone = mobileMoneyPhone.trim() || phone.trim();
        if (!paymentPhone) {
          toast({
            variant: "destructive",
            title: "Phone number required",
            description: "Please provide a mobile money phone number.",
          });
          setLoading(false);
          return;
        }

        setPaymentStatus("processing");
        try {
          const pawaPayResult = await initiatePawaPayPayment({
            bookingId: insertedBooking.id,
            amount: total,
            currency,
            paymentMethod: paymentMethod as "mtn_momo" | "airtel_money",
            phoneNumber: paymentPhone,
          });

          if (pawaPayResult.success) {
            // Don't navigate away - show waiting state
            localStorage.removeItem("checkout_progress");
            navigate(`/payment-pending?bookingId=${insertedBooking.id}&depositId=${pawaPayResult.depositId}&phone=${encodeURIComponent(paymentPhone)}`);
          } else {
            setPaymentStatus("failed");
            toast({
              variant: "destructive",
              title: "Payment Failed",
              description: pawaPayResult.error || "The payment could not be processed. Please try again.",
            });
            setLoading(false);
          }
          return;
        } catch (paymentError) {
          logError("checkout.pawapay.initiate", paymentError);
          setPaymentStatus("failed");
          toast({
            variant: "destructive",
            title: "Payment Error",
            description: "Could not connect to payment provider. Please try again.",
          });
          setLoading(false);
          return;
        }
      } else {
        // Bank transfer or card - manual confirmation
        toast({
          title: "✓ Booking Submitted!",
          description: "Our team will contact you shortly to confirm your booking and arrange payment.",
        });
      }

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

      // Create bookings directly instead of checkout_requests
      const orderId = crypto.randomUUID(); // Group all bookings from this cart
      const bookingsToCreate = [];
      
      for (const item of items) {
        if (!item?.reference_id || !item?.item_type) continue;
        
        let bookingPayload: any = {
          booking_type: item.item_type,
          order_id: orderId,
          check_in: checkIn || new Date().toISOString().split('T')[0],
          check_out: checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0],
          guests: Math.max(1, Number(guests || 1)),
          total_price: 0, // Will be calculated based on item price
          currency: "RWF",
          status: "pending",
          payment_status: "pending",
          payment_method: paymentMethod,
          guest_id: user ? user.id : null,
          is_guest_booking: user ? false : true,
          guest_name: user ? name.trim() : name.trim(),
          guest_email: user ? email.trim().toLowerCase() : email.trim().toLowerCase(),
          guest_phone: phone.trim(),
          special_requests: message.trim() || null,
        };
        
        // Fetch details and add type-specific fields
        if (item.item_type === "property") {
          const { data: prop } = await supabase
            .from("properties")
            .select("host_id, price_per_night, currency")
            .eq("id", String(item.reference_id))
            .maybeSingle();
          
          if (prop) {
            bookingPayload.property_id = String(item.reference_id);
            bookingPayload.host_id = prop.host_id;
            bookingPayload.currency = prop.currency || "RWF";
            
            // Calculate nights and total
            const cin = new Date(checkIn);
            const cout = new Date(checkOut);
            const nights = Math.max(1, Math.ceil((cout.getTime() - cin.getTime()) / 86400000));
            bookingPayload.total_price = nights * (prop.price_per_night || 0);
          }
        } else if (item.item_type === "tour") {
          const { data: tour } = await supabase
            .from("tour_packages")
            .select("host_id, price_per_adult, currency, group_discount_6_10, group_discount_11_15, group_discount_16_plus")
            .eq("id", String(item.reference_id))
            .maybeSingle();
          
          if (tour) {
            bookingPayload.tour_id = String(item.reference_id);
            bookingPayload.host_id = tour.host_id;
            bookingPayload.currency = tour.currency || "RWF";
            
            // Apply group discounts
            let pricePerPerson = tour.price_per_adult || 0;
            const guestCount = bookingPayload.guests;
            
            if (guestCount >= 16 && tour.group_discount_16_plus) {
              pricePerPerson = pricePerPerson * (1 - tour.group_discount_16_plus / 100);
            } else if (guestCount >= 11 && tour.group_discount_11_15) {
              pricePerPerson = pricePerPerson * (1 - tour.group_discount_11_15 / 100);
            } else if (guestCount >= 6 && tour.group_discount_6_10) {
              pricePerPerson = pricePerPerson * (1 - tour.group_discount_6_10 / 100);
            }
            
            bookingPayload.total_price = pricePerPerson * guestCount;
          }
        } else if (item.item_type === "transport") {
          const { data: vehicle } = await supabase
            .from("transport_vehicles")
            .select("created_by, price_per_day, currency")
            .eq("id", String(item.reference_id))
            .maybeSingle();
          
          if (vehicle) {
            bookingPayload.transport_id = String(item.reference_id);
            bookingPayload.host_id = vehicle.created_by;
            bookingPayload.currency = vehicle.currency || "RWF";
            
            // Calculate days and total
            const cin = new Date(checkIn);
            const cout = new Date(checkOut);
            const days = Math.max(1, Math.ceil((cout.getTime() - cin.getTime()) / 86400000));
            bookingPayload.total_price = days * (vehicle.price_per_day || 0);
          }
        }
        
        if (bookingPayload.total_price > 0) {
          bookingsToCreate.push(bookingPayload);
        }
      }

      if (bookingsToCreate.length === 0) {
        toast({ variant: "destructive", title: "No valid items", description: "Could not create bookings from cart items." });
        return;
      }

      // Calculate total amount for cart checkout
      let totalAmount = bookingsToCreate.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const cartCurrency = bookingsToCreate[0]?.currency || "RWF";

      // Apply discount if present
      let discountAmount = 0;
      if (appliedDiscount) {
        if (appliedDiscount.discount_type === 'percentage') {
          discountAmount = totalAmount * (appliedDiscount.discount_value / 100);
        } else {
          // Fixed discount - use value directly if same currency
          discountAmount = appliedDiscount.discount_value;
        }
        
        // Check minimum amount requirement
        if (appliedDiscount.minimum_amount && totalAmount < appliedDiscount.minimum_amount) {
          discountAmount = 0;
        }
        
        // Apply discount to total
        totalAmount = Math.max(0, totalAmount - discountAmount);
      }

      // Validate minimum amount for mobile money
      if (isPawaPayMethod(paymentMethod)) {
        const validation = validatePawaPayAmount(totalAmount, cartCurrency);
        if (!validation.valid) {
          toast({
            variant: "destructive",
            title: "Amount too low",
            description: validation.message || `Minimum amount is ${PAWAPAY_MIN_AMOUNT_RWF} RWF for mobile money payments.`,
          });
          setLoading(false);
          return;
        }
      }

      // For mobile money, skip auto-confirm - wait for actual payment
      if (!isPawaPayMethod(paymentMethod)) {
        // Check availability for all items and auto-confirm available ones
        const availabilityChecks = bookingsToCreate.map((booking) => ({
          itemId: booking.property_id || booking.tour_id || booking.transport_id,
          itemType: booking.booking_type === "property" ? "property" as const : 
                    booking.booking_type === "tour" ? "tour_package" as const : 
                    "transport" as const,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
        }));

        const availabilityResults = await checkAvailability(availabilityChecks);

        // Update booking status based on availability
        bookingsToCreate.forEach((booking, index) => {
          if (availabilityResults[index]?.autoConfirm) {
            booking.status = "confirmed";
          }
        });
      }

      const { data: insertedBookings, error } = await supabase
        .from("bookings")
        .insert(bookingsToCreate)
        .select("id, total_price, currency");
      if (error) throw error;

      // Initiate PawaPay payment for mobile money methods
      if (isPawaPayMethod(paymentMethod) && insertedBookings && insertedBookings.length > 0) {
        const paymentPhone = mobileMoneyPhone.trim() || phone.trim();
        if (!paymentPhone) {
          toast({
            variant: "destructive",
            title: "Phone number required",
            description: "Please provide a mobile money phone number.",
          });
          setLoading(false);
          return;
        }

        setPaymentStatus("processing");
        try {
          // Use the first booking as the primary for the payment
          const primaryBookingId = insertedBookings[0].id;
          const pawaPayResult = await initiatePawaPayPayment({
            bookingId: primaryBookingId,
            amount: totalAmount,
            currency: cartCurrency,
            paymentMethod: paymentMethod as "mtn_momo" | "airtel_money",
            phoneNumber: paymentPhone,
          });

          if (pawaPayResult.success) {
            // Don't navigate away - go to payment pending page
            await clearCart();
            localStorage.removeItem("checkout_progress");
            localStorage.removeItem("applied_discount");
            navigate(`/payment-pending?bookingId=${primaryBookingId}&depositId=${pawaPayResult.depositId}&phone=${encodeURIComponent(paymentPhone)}`);
          } else {
            setPaymentStatus("failed");
            toast({
              variant: "destructive",
              title: "Payment Failed",
              description: pawaPayResult.error || "The payment could not be processed. Please try again.",
            });
            setLoading(false);
          }
          return;
        } catch (paymentError) {
          logError("checkout.cart.pawapay.initiate", paymentError);
          setPaymentStatus("failed");
          toast({
            variant: "destructive",
            title: "Payment Error",
            description: "Could not connect to payment provider. Please try again.",
          });
          setLoading(false);
          return;
        }
      } else {
        // Bank transfer or card - manual confirmation
        toast({
          title: "✓ Booking Submitted!",
          description: "Our team will contact you shortly to confirm your booking and arrange payment.",
        });
      }

      await clearCart();
      // Clear saved progress after successful submission
      localStorage.removeItem("checkout_progress");
      localStorage.removeItem("applied_discount");
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
      // Validate mobile money phone for MTN/Airtel
      if (isPawaPayMethod(paymentMethod)) {
        const phoneToUse = mobileMoneyPhone || phone;
        if (!phoneToUse || !phoneToUse.trim()) {
          toast({ variant: "destructive", title: "Mobile Money phone required", description: "Please enter your mobile money phone number." });
          return false;
        }
        // Basic phone validation - should start with 25078 or 25073 for Rwanda
        const cleanPhone = phoneToUse.replace(/[^0-9]/g, "");
        if (cleanPhone.length < 10) {
          toast({ variant: "destructive", title: "Invalid phone number", description: "Please enter a valid phone number." });
          return false;
        }
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
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="max-w-xl mx-auto">
          {/* Minimal Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-light tracking-tight text-foreground">
              {mode === "booking" ? "Complete Booking" : "Checkout"}
            </h1>
          </div>

          {/* Minimal Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all",
                    currentStep > step.id
                      ? "bg-foreground text-background"
                      : currentStep === step.id
                      ? "border-2 border-foreground text-foreground"
                      : "border border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-12 h-px mx-2",
                    currentStep > step.id ? "bg-foreground" : "bg-muted-foreground/20"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Booking Summary - Minimal */}
          {mode === "booking" && property && (
            <div className="mb-10 pb-8 border-b border-muted-foreground/10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{bookingTitle}</p>
                  <p className="text-xs text-muted-foreground/70">
                    {checkIn} → {checkOut} · {nights}n · {Math.max(1, guests)}g
                  </p>
                </div>
                <p className="text-lg font-medium">
                  {formatMoneyWithConversion(bookingTotal, currency, preferredCurrency, usdRates)}
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Contact Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="mt-2 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+250 788 123 456"
                    className="mt-2 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="message" className="text-xs uppercase tracking-wider text-muted-foreground">Notes (optional)</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Any special requests..."
                    rows={2}
                    className="mt-2 border-0 border-b rounded-none px-0 resize-none focus-visible:ring-0 focus-visible:border-foreground"
                  />
                </div>
              </div>
              
              {/* Discount Code Section */}
              {mode === "cart" && (
                <div className="pt-6 border-t border-muted-foreground/10">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Discount Code</Label>
                  {!appliedDiscount ? (
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Enter code"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        className="flex-1 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground"
                        disabled={validatingCode}
                      />
                      <Button 
                        type="button"
                        onClick={applyDiscountCode} 
                        disabled={!discountCode.trim() || validatingCode}
                        variant="outline"
                        size="sm"
                      >
                        {validatingCode ? "..." : "Apply"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-2">
                      <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-100 flex-1">
                        {appliedDiscount.code} ({appliedDiscount.discount_type === 'percentage' ? appliedDiscount.discount_value + '%' : appliedDiscount.currency + ' ' + appliedDiscount.discount_value} off)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeDiscount}
                        className="h-6 px-2 text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Payment Method */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "w-full p-4 text-left transition-all flex items-center gap-4 border rounded-lg",
                      paymentMethod === method.id
                        ? "border-foreground"
                        : "border-muted-foreground/20 hover:border-muted-foreground/40"
                    )}
                  >
                    <img src={method.iconPath} alt={method.name} className="h-8 w-8 object-contain opacity-80" />
                    <span className="font-medium text-sm">{method.name}</span>
                    {paymentMethod === method.id && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Mobile Money Phone - Minimal */}
              {isPawaPayMethod(paymentMethod) && (
                <div className="pt-4">
                  <Label htmlFor="mobileMoneyPhone" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Mobile Money Number
                  </Label>
                  <Input
                    id="mobileMoneyPhone"
                    value={mobileMoneyPhone || phone}
                    onChange={(e) => setMobileMoneyPhone(e.target.value)}
                    placeholder={paymentMethod === "mtn_momo" ? "078 XXX XXXX" : "073 XXX XXXX"}
                    className="mt-2 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground"
                  />
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    You'll receive a payment prompt on this number.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review - Minimal */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-muted-foreground/10">
                  <span className="text-muted-foreground text-sm">Name</span>
                  <span className="text-sm">{name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-muted-foreground/10">
                  <span className="text-muted-foreground text-sm">Email</span>
                  <span className="text-sm">{email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-muted-foreground/10">
                  <span className="text-muted-foreground text-sm">Phone</span>
                  <span className="text-sm">{phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-muted-foreground/10">
                  <span className="text-muted-foreground text-sm">Payment</span>
                  <span className="text-sm">{paymentMethods.find((m) => m.id === paymentMethod)?.name}</span>
                </div>
                {mode === "booking" && property && (
                  <div className="flex justify-between py-2 pt-4">
                    <span className="font-medium">Total</span>
                    <span className="font-medium text-lg">
                      {formatMoneyWithConversion(bookingTotal, currency, preferredCurrency, usdRates)}
                    </span>
                  </div>
                )}
                {mode === "cart" && appliedDiscount && (
                  <div className="flex justify-between py-2 pt-4 text-green-600 dark:text-green-400">
                    <span className="text-sm flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Discount Applied
                    </span>
                    <span className="text-sm font-medium">
                      {appliedDiscount.code} ({appliedDiscount.discount_type === 'percentage' ? appliedDiscount.discount_value + '%' : appliedDiscount.currency + ' ' + appliedDiscount.discount_value} off)
                    </span>
                  </div>
                )}
                {mode === "cart" && (
                  <div className="py-2 pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Final amount will be calculated from your cart items.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation - Minimal */}
          <div className="flex justify-between mt-12 pt-8 border-t border-muted-foreground/10">
            <Button
              variant="ghost"
              type="button"
              onClick={currentStep === 1 ? () => navigate(-1) : handlePrevious}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStep === 1 ? "Back" : "Previous"}
            </Button>
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (mode === "booking" && !isPropertyInCart)}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {loading ? "Processing..." : "Confirm Booking"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

