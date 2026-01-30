import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/hooks/usePreferences";
import { formatMoney } from "@/lib/money";
import { useTripCart, CartItemMetadata, getCartItemMetadata } from "@/hooks/useTripCart";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { calculateGuestTotal, PLATFORM_FEES } from "@/lib/fees";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CreditCard,
  Phone,
  Loader2,
  ShoppingBag,
  MapPin,
  Home,
  Car,
  Tag,
  Shield,
  AlertCircle,
  Smartphone,
  Building2,
  Clock,
  Mail,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CartItem {
  id: string;
  item_type: string;
  reference_id: string;
  quantity: number;
  title: string;
  price: number;
  currency: string;
  image?: string;
  meta?: string;
  metadata?: CartItemMetadata;
}

type Step = 'details' | 'payment' | 'confirm';

const STEP_ORDER: Step[] = ['details', 'payment', 'confirm'];

export default function CheckoutNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { currency: preferredCurrency } = usePreferences();
  const { guestCart, clearCart } = useTripCart();
  const { usdRates } = useFxRates();
  
  // State
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    notes: "",
  });
  
  // Payment state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+250");
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel' | 'card' | 'bank'>('mtn');
  const [showContactModal, setShowContactModal] = useState(false);
  
  // Discount
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Load user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
      
      // Fetch profile for full name and phone
      (supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .maybeSingle() as any)
        .then(({ data, error }: any) => {
          if (error) {
            console.warn("Could not load profile:", error.message);
            return;
          }
          if (data) {
            setFormData(prev => ({
              ...prev,
              fullName: data.full_name || "",
            }));
            if (data.phone) {
              // Parse phone number
              const match = data.phone.match(/^(\+\d{1,3})(.*)$/);
              if (match) {
                setCountryCode(match[1]);
                setPhoneNumber(match[2]);
              } else {
                setPhoneNumber(data.phone);
              }
            }
          }
        });
    }
  }, [user]);

  // Load discount from localStorage or URL
  useEffect(() => {
    const discountCode = searchParams.get("discountCode");
    const savedDiscount = localStorage.getItem("applied_discount");
    
    if (discountCode) {
      // Validate discount code from URL
      (supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase())
        .eq("is_active", true)
        .single() as any)
        .then(({ data }: any) => {
          if (data) setAppliedDiscount(data);
        });
    } else if (savedDiscount) {
      try {
        setAppliedDiscount(JSON.parse(savedDiscount));
      } catch {
        localStorage.removeItem("applied_discount");
      }
    }
  }, [searchParams]);

  // Fetch cart items
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["checkout_cart", user?.id, guestCart.map(i => i.id).join(","), searchParams.toString()],
    queryFn: async () => {
      // Check if this is a direct booking from URL params
      const mode = searchParams.get("mode");
      const propertyId = searchParams.get("propertyId");
      const requireTripCart = searchParams.get("requireTripCart");
      
      if (mode === "booking" && propertyId) {
        const directBooking = await fetchDirectBooking(propertyId);
        
        // If requireTripCart is set, merge with cart items (for add-ons)
        if (requireTripCart === "1") {
          const cartSource = user ? await fetchUserCart() : await fetchGuestCart();
          return [...directBooking, ...cartSource];
        }
        
        return directBooking;
      }
      
      // Otherwise fetch from cart
      const cartSource = user ? await fetchUserCart() : await fetchGuestCart();
      return cartSource;
    },
    enabled: !authLoading,
  });

  async function fetchDirectBooking(propertyId: string): Promise<CartItem[]> {
    // Fetch the property details directly
    const { data: property, error } = await supabase
      .from('properties')
      .select('id, title, price_per_night, currency, images, location')
      .eq('id', propertyId)
      .single();
    
    if (error || !property) {
      console.error("Failed to load property for direct booking:", error);
      return [];
    }
    
    // Calculate nights from checkIn/checkOut params
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    let nights = 1;
    
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    const guests = parseInt(searchParams.get("guests") || "1", 10);
    
    // Return as a cart item
    return [{
      id: `direct-${property.id}`,
      item_type: 'property',
      reference_id: property.id,
      quantity: nights,
      title: property.title,
      price: property.price_per_night,
      currency: property.currency || 'RWF',
      image: property.images?.[0],
      meta: property.location,
      metadata: {
        check_in: checkIn || undefined,
        check_out: checkOut || undefined,
        nights,
        guests,
      }
    }];
  }

  async function fetchUserCart(): Promise<CartItem[]> {
    const { data, error } = await (supabase
      .from("trip_cart_items")
      .select("id, item_type, reference_id, quantity")
      .eq("user_id", user!.id) as any);

    if (error || !data?.length) return [];
    return enrichCartItems(data);
  }

  async function fetchGuestCart(): Promise<CartItem[]> {
    if (guestCart.length === 0) return [];
    return enrichCartItems(guestCart.map(g => ({
      id: g.id,
      item_type: g.item_type,
      reference_id: g.reference_id,
      quantity: g.quantity,
    })));
  }

  async function enrichCartItems(items: any[]): Promise<CartItem[]> {
    const tourIds = items.filter(i => i.item_type === 'tour').map(i => String(i.reference_id));
    const packageIds = items.filter(i => i.item_type === 'tour_package').map(i => String(i.reference_id));
    const propertyIds = items.filter(i => i.item_type === 'property').map(i => String(i.reference_id));
    const vehicleIds = items.filter(i => i.item_type === 'transport_vehicle').map(i => String(i.reference_id));

    const [tours, packages, properties, vehicles] = await Promise.all([
      tourIds.length ? supabase.from('tours').select('id, title, price_per_person, currency, images, duration_days').in('id', tourIds).then(r => r.data || []) : [],
      packageIds.length ? supabase.from('tour_packages').select('id, title, price_per_adult, currency, cover_image, gallery_images, duration').in('id', packageIds).then(r => r.data || []) : [],
      propertyIds.length ? supabase.from('properties').select('id, title, price_per_night, currency, images, location').in('id', propertyIds).then(r => r.data || []) : [],
      vehicleIds.length ? supabase.from('transport_vehicles').select('id, title, price_per_day, currency, image_url, vehicle_type, seats').in('id', vehicleIds).then(r => r.data || []) : [],
    ]) as any[];

    const maps: Record<string, Map<string, any>> = {
      tour: new Map(tours.map((t: any) => [String(t.id), t] as [string, any])),
      tour_package: new Map(packages.map((p: any) => [String(p.id), p] as [string, any])),
      property: new Map(properties.map((p: any) => [String(p.id), p] as [string, any])),
      transport_vehicle: new Map(vehicles.map((v: any) => [String(v.id), v] as [string, any])),
    };

    return items.map(item => {
      const refId = String(item.reference_id);
      const data: any = maps[item.item_type]?.get(refId);
      if (!data) {
        console.warn(`Checkout item not found: ${item.item_type} ${refId}`);
        return null;
      }

      // Get metadata from localStorage for properties
      const metadata = item.item_type === 'property' ? getCartItemMetadata(refId) : undefined;

      const getDetails = () => {
        switch (item.item_type) {
          case 'tour':
            return { title: data.title, price: data.price_per_person, currency: data.currency || 'RWF', image: data.images?.[0], meta: `${data.duration_days} days` };
          case 'tour_package':
            return { title: data.title, price: data.price_per_adult, currency: data.currency || 'RWF', image: data.cover_image || data.gallery_images?.[0], meta: `${parseInt(data.duration) || 1} days` };
          case 'property':
            return { title: data.title, price: data.price_per_night, currency: data.currency || 'RWF', image: data.images?.[0], meta: data.location };
          case 'transport_vehicle':
            return { title: data.title, price: data.price_per_day, currency: data.currency || 'RWF', image: data.image_url, meta: `${data.vehicle_type} • ${data.seats} seats` };
          default:
            return null;
        }
      };

      const details = getDetails();
      if (!details) return null;

      return { id: item.id, item_type: item.item_type, reference_id: item.reference_id, quantity: item.quantity, metadata, ...details } as CartItem;
    }).filter(Boolean) as CartItem[];
  }

  // Calculate totals
  const { subtotal, serviceFees, discount, total, displayCurrency } = useMemo(() => {
    let subtotalAmount = 0;
    let feesAmount = 0;
    const curr = preferredCurrency || "RWF";

    cartItems.forEach((item) => {
      // For properties, use nights from metadata; for other items use quantity
      const isProperty = item.item_type === 'property';
      const nights = isProperty && item.metadata?.nights ? item.metadata.nights : 1;
      const multiplier = isProperty ? nights : item.quantity;
      const itemTotal = item.price * multiplier;
      const converted = convertAmount(itemTotal, item.currency, curr, usdRates) ?? itemTotal;
      subtotalAmount += converted;
      
      if (isProperty) {
        const { platformFee } = calculateGuestTotal(converted, 'accommodation');
        feesAmount += platformFee;
      }
    });

    let discountAmount = 0;
    if (appliedDiscount) {
      if (appliedDiscount.discount_type === 'percentage') {
        discountAmount = subtotalAmount * (appliedDiscount.discount_value / 100);
      } else {
        const converted = convertAmount(appliedDiscount.discount_value, appliedDiscount.currency, curr, usdRates);
        discountAmount = converted ?? 0;
      }
      if (appliedDiscount.minimum_amount && subtotalAmount < appliedDiscount.minimum_amount) {
        discountAmount = 0;
      }
    }

    return {
      subtotal: subtotalAmount,
      serviceFees: feesAmount,
      discount: discountAmount,
      total: subtotalAmount + feesAmount - discountAmount,
      displayCurrency: curr,
    };
  }, [cartItems, preferredCurrency, usdRates, appliedDiscount]);

  // Apply discount code
  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) {
      setDiscountError("Please enter a discount code");
      return;
    }
    
    setDiscountLoading(true);
    setDiscountError(null);
    
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCodeInput.trim().toUpperCase())
        .eq("is_active", true)
        .single();
      
      if (error || !data) {
        setDiscountError("Invalid or expired discount code");
        return;
      }
      
      // Check if code has uses remaining
      if (data.max_uses && data.uses >= data.max_uses) {
        setDiscountError("This discount code has been fully used");
        return;
      }
      
      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setDiscountError("This discount code has expired");
        return;
      }
      
      setAppliedDiscount(data);
      localStorage.setItem("applied_discount", JSON.stringify(data));
      setDiscountCodeInput("");
      toast({
        title: "Discount applied!",
        description: data.discount_type === 'percentage' 
          ? `${data.discount_value}% off your order`
          : `${formatMoney(data.discount_value, displayCurrency)} off your order`,
      });
    } catch (err) {
      console.error("Discount error:", err);
      setDiscountError("Failed to apply discount code");
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    localStorage.removeItem("applied_discount");
    toast({ title: "Discount removed" });
  };

  // Step validation
  const isDetailsValid = formData.fullName.trim() && formData.email.trim();
  const isPaymentValid = (paymentMethod === 'card' || paymentMethod === 'bank') || phoneNumber.length >= 9;

  const goToStep = (step: Step) => {
    if (step === 'payment' && !isDetailsValid) {
      toast({ variant: "destructive", title: "Please complete your details" });
      return;
    }
    if (step === 'confirm' && !isPaymentValid) {
      const message = (paymentMethod === 'mtn' || paymentMethod === 'airtel') 
        ? "Please enter your phone number" 
        : "Please select a payment method";
      toast({ variant: "destructive", title: message });
      return;
    }
    setCurrentStep(step);
    setPaymentError(null);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'property': return <Home className="w-4 h-4" />;
      case 'tour':
      case 'tour_package': return <MapPin className="w-4 h-4" />;
      case 'transport_vehicle': return <Car className="w-4 h-4" />;
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  // Process payment
  const handlePayment = async () => {
    // Check if user is signed in
    if (!user) {
      setPaymentError("Please sign in to complete your booking");
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "You need to be signed in to book. Please sign in and try again.",
      });
      setIsProcessing(false);
      return;
    }
    
    setIsProcessing(true);
    setPaymentError(null);
    
    try {
      // Clean phone number for mobile money payments only
      let fullPhone = null;
      if (paymentMethod === 'mtn' || paymentMethod === 'airtel') {
        let cleanedPhone = phoneNumber.replace(/^0+/, ''); // Remove leading zeros
        // If user entered 250XXXXXXXX, strip the 250 since we add it from countryCode
        if (cleanedPhone.startsWith('250') && cleanedPhone.length === 12) {
          cleanedPhone = cleanedPhone.substring(3);
        }
        fullPhone = `${countryCode}${cleanedPhone}`;
        
        console.log("📱 Phone number processing:", {
          raw: phoneNumber,
          cleaned: cleanedPhone,
          countryCode,
          fullPhone
        });
      }
      
      // Build cart items metadata with calculated prices
      const cartItemsWithPrices = cartItems.map(item => {
        const itemTotal = item.price * item.quantity;
        const converted = convertAmount(itemTotal, item.currency, displayCurrency, usdRates) ?? itemTotal;
        const isAccommodation = item.item_type === 'property';
        const feeResult = isAccommodation 
          ? calculateGuestTotal(converted, 'accommodation') 
          : { guestTotal: converted, platformFee: 0 };
        
        // Apply proportional discount
        let itemDiscount = 0;
        if (discount > 0) {
          itemDiscount = (converted / subtotal) * discount;
        }
        
        return {
          ...item,
          calculated_price: feeResult.guestTotal - itemDiscount,
          platform_fee: feeResult.platformFee,
          discount_applied: itemDiscount,
        };
      });
      
      // Get booking details if this is a direct booking
      const mode = searchParams.get("mode");
      const bookingDetails = mode === "booking" ? {
        property_id: searchParams.get("propertyId"),
        check_in: searchParams.get("checkIn"),
        check_out: searchParams.get("checkOut"),
        guests: Number(searchParams.get("guests")) || 1,
      } : null;
      
      // Convert total to RWF for storage (all checkouts stored in RWF)
      let totalInRwf = total;
      if (displayCurrency !== 'RWF') {
        const converted = convertAmount(total, displayCurrency, 'RWF', usdRates);
        if (!converted) {
          throw new Error(`Unable to convert ${displayCurrency} to RWF. Please try again.`);
        }
        totalInRwf = converted;
        console.log("💱 Converted checkout total to RWF:", {
          from: displayCurrency,
          original: total,
          rwf: totalInRwf
        });
      }
      
      // Create a single checkout request with all cart items in metadata
      const checkoutData: any = {
        user_id: user?.id || null,
        name: formData.fullName,
        email: formData.email,
        phone: fullPhone || formData.phone || null,
        message: formData.notes || null,
        total_amount: Math.round(totalInRwf),
        currency: 'RWF', // Always store in RWF
        payment_status: paymentMethod === 'card' || paymentMethod === 'bank' ? 'awaiting_callback' : 'pending',
        payment_method: paymentMethod === 'card' ? 'card' : paymentMethod === 'bank' ? 'bank_transfer' : 'mobile_money',
        metadata: {
          items: cartItemsWithPrices,
          booking_details: bookingDetails,
          guest_info: {
            name: formData.fullName,
            email: formData.email,
            phone: fullPhone || formData.phone || null,
          },
          special_requests: formData.notes || null,
          discount_code: appliedDiscount?.code || null,
          discount_amount: discount,
          payment_provider: paymentMethod === 'mtn' ? 'MTN' : paymentMethod === 'airtel' ? 'AIRTEL' : paymentMethod.toUpperCase(),
        },
      };

      console.log("📝 Creating checkout with data:", {
        ...checkoutData,
        metadata: { ...checkoutData.metadata, items: `[${cartItemsWithPrices.length} items]` }
      });

      const { data: checkout, error: checkoutError } = await (supabase
        .from("checkout_requests")
        .insert(checkoutData)
        .select("id")
        .single() as any);

      if (checkoutError) {
        console.error("❌ Checkout insert error:", checkoutError);
        throw checkoutError;
      }
      const checkoutId = checkout.id;

      // For card/bank transfer, just create checkout and show confirmation
      if (paymentMethod === 'card' || paymentMethod === 'bank') {
        await clearCart();
        localStorage.removeItem("applied_discount");
        
        // Redirect to booking success with a message about expecting a call
        navigate(`/booking-success?checkoutId=${checkoutId}&method=${paymentMethod}`);
        return;
      }

      // Checkout is already in RWF, so use totalInRwf directly
      const finalAmount = Math.round(totalInRwf);
      
      // Validate amount before initiating payment
      if (finalAmount < 100) {
        throw new Error("Minimum payment amount is 100 RWF");
      }

      // Initiate PawaPay payment for mobile money
      console.log("🔄 Initiating PawaPay payment:", {
        checkoutId,
        amount: finalAmount,
        currency: 'RWF',
        phoneNumber: fullPhone,
        provider: paymentMethod === 'airtel' ? 'AIRTEL' : 'MTN',
      });

      const paymentResponse = await fetch("/api/pawapay-create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount: finalAmount,
          currency: 'RWF',
          phoneNumber: fullPhone,
          description: `Merry360x Booking - ${cartItems.length} item(s)`,
          payerEmail: formData.email,
          payerName: formData.fullName,
          provider: paymentMethod === 'airtel' ? 'AIRTEL' : 'MTN',
        }),
      });

      const paymentData = await paymentResponse.json();
      console.log("📥 PawaPay API response:", paymentData);

      // Check if payment was immediately rejected
      if (paymentData.success === false || paymentData.status === 'REJECTED' || paymentData.status === 'FAILED') {
        console.error("❌ Payment rejected:", paymentData);
        
        // Extract detailed error information
        const failureCode = paymentData.failureCode || paymentData.data?.reason;
        const errorMsg = paymentData.message || "Payment could not be processed";
        
        console.error("Failure code:", failureCode);
        console.error("Error message:", errorMsg);
        
        setPaymentError(errorMsg);
        setIsProcessing(false);
        
        toast({
          title: "Payment Failed",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      if (!paymentResponse.ok) {
        console.error("❌ PawaPay API error:", paymentData);
        throw new Error(paymentData.error || paymentData.message || "Payment initiation failed");
      }

      // Ensure we have a depositId
      if (!paymentData.depositId) {
        console.error("❌ Missing depositId in response:", paymentData);
        throw new Error("Invalid payment response - missing deposit ID");
      }

      console.log("✅ Payment initiated successfully:", paymentData.depositId);

      // Clear cart
      await clearCart();
      localStorage.removeItem("applied_discount");

      // Show success message
      toast({
        title: "Payment Initiated",
        description: "Check your phone to complete the payment",
      });

      // Redirect to payment pending
      navigate(`/payment-pending?checkoutId=${checkoutId}&depositId=${paymentData.depositId}`);
      
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentError(error.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Add some items to your cart before checking out.
          </p>
          <Link to="/trip-cart">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trip Cart
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/trip-cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to cart
          </Link>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight">Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Progress Steps */}
            <div className="flex items-center mb-8">
              {STEP_ORDER.map((step, index) => {
                const isActive = step === currentStep;
                const isCompleted = STEP_ORDER.indexOf(currentStep) > index;
                const stepNumber = index + 1;
                const labels = { details: 'Details', payment: 'Payment', confirm: 'Confirm' };
                
                return (
                  <div key={step} className="flex items-center flex-1">
                    <button
                      onClick={() => {
                        if (isCompleted) goToStep(step);
                      }}
                      className={cn(
                        "flex items-center gap-2 transition-colors",
                        isActive && "text-foreground",
                        isCompleted && "text-foreground cursor-pointer hover:text-primary",
                        !isActive && !isCompleted && "text-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                        isActive && "bg-primary text-primary-foreground",
                        isCompleted && "bg-green-500 text-white",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
                      </div>
                      <span className="text-sm font-medium hidden sm:inline">{labels[step]}</span>
                    </button>
                    {index < STEP_ORDER.length - 1 && (
                      <div className={cn(
                        "flex-1 h-px mx-4",
                        isCompleted ? "bg-green-500" : "bg-border"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 md:p-8">
              {/* Step 1: Details */}
              {currentStep === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Contact Details</h2>
                    <p className="text-sm text-muted-foreground">We'll use this to confirm your booking</p>
                  </div>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="John Doe"
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Special Requests (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any special requests or notes..."
                        rows={3}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={() => goToStep('payment')}
                    disabled={!isDetailsValid}
                  >
                    Continue to Payment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 'payment' && (
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-1">Payment Method</h2>
                    <p className="text-xs md:text-sm text-muted-foreground">Select your preferred option</p>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {/* MTN Mobile Money */}
                    <button
                      onClick={() => setPaymentMethod('mtn')}
                      className={cn(
                        "border-2 rounded-lg md:rounded-xl p-2.5 md:p-4 text-left transition-all",
                        paymentMethod === 'mtn' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-yellow-400 flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-[10px] md:text-sm text-black">MTN</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs md:text-base truncate">MTN MoMo</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Rwanda</p>
                        </div>
                      </div>
                    </button>
                    
                    {/* Airtel Money */}
                    <button
                      onClick={() => setPaymentMethod('airtel')}
                      className={cn(
                        "border-2 rounded-lg md:rounded-xl p-2.5 md:p-4 text-left transition-all",
                        paymentMethod === 'airtel' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-[10px] md:text-xs text-white">Airtel</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs md:text-base truncate">Airtel Money</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Rwanda</p>
                        </div>
                      </div>
                    </button>
                    
                    {/* Credit Card */}
                    <button
                      onClick={() => { setPaymentMethod('card'); setShowContactModal(true); }}
                      className={cn(
                        "border-2 rounded-lg md:rounded-xl p-2.5 md:p-4 text-left transition-all",
                        paymentMethod === 'card' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs md:text-base truncate">Card</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Visa, MC</p>
                        </div>
                      </div>
                    </button>
                    
                    {/* Bank Transfer */}
                    <button
                      onClick={() => { setPaymentMethod('bank'); setShowContactModal(true); }}
                      className={cn(
                        "border-2 rounded-lg md:rounded-xl p-2.5 md:p-4 text-left transition-all",
                        paymentMethod === 'bank' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs md:text-base truncate">Bank</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Transfer</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Phone Number Input - only for mobile money */}
                  {(paymentMethod === 'mtn' || paymentMethod === 'airtel') && (
                    <>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <div className="flex gap-2 mt-1.5">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="h-11 px-3 rounded-lg border bg-background text-sm"
                          >
                            <option value="+250">🇷🇼 +250</option>
                            <option value="+254">🇰🇪 +254</option>
                            <option value="+256">🇺🇬 +256</option>
                            <option value="+255">🇹🇿 +255</option>
                          </select>
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="phone"
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                              placeholder="78XXXXXXX"
                              className="pl-10 h-11"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          You'll receive a payment prompt on this number
                        </p>
                      </div>

                      {/* Info Box */}
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                        <div className="flex gap-3">
                          <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">How it works</p>
                            <ol className="text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                              <li>Click "Review Order" below</li>
                              <li>You'll receive a payment prompt on your phone</li>
                              <li>Enter your PIN to confirm</li>
                              <li>We'll confirm your booking automatically</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => goToStep('details')}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      size="lg" 
                      className="flex-1"
                      onClick={() => goToStep('confirm')}
                      disabled={(paymentMethod === 'mtn' || paymentMethod === 'airtel') && !isPaymentValid}
                    >
                      Review Order
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {currentStep === 'confirm' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Review & Confirm</h2>
                    <p className="text-sm text-muted-foreground">Please review your order before payment</p>
                  </div>

                  {/* Order Items */}
                  <div className="divide-y rounded-xl border overflow-hidden">
                    {cartItems.map((item) => {
                      const itemPrice = convertAmount(item.price * item.quantity, item.currency, displayCurrency, usdRates) ?? item.price * item.quantity;
                      const mode = searchParams.get("mode");
                      const checkIn = searchParams.get("checkIn");
                      const checkOut = searchParams.get("checkOut");
                      const guests = searchParams.get("guests");
                      
                      return (
                        <div key={item.id} className="flex gap-4 p-4">
                          <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {getItemIcon(item.item_type)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {mode === 'booking' && checkIn && checkOut && item.item_type === 'property' 
                                ? `${new Date(checkIn).toLocaleDateString()} - ${new Date(checkOut).toLocaleDateString()} • ${guests || 1} guest(s) • ${item.quantity} night(s)`
                                : `Qty: ${item.quantity}`
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatMoney(itemPrice, displayCurrency)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contact & Payment Summary */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4">
                      <h4 className="text-sm font-medium mb-2">Contact Details</h4>
                      <p className="text-sm">{formData.fullName}</p>
                      <p className="text-sm text-muted-foreground">{formData.email}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4">
                      <h4 className="text-sm font-medium mb-2">Payment Method</h4>
                      <p className="text-sm">
                        {paymentMethod === 'mtn' && 'MTN Mobile Money'}
                        {paymentMethod === 'airtel' && 'Airtel Money'}
                        {paymentMethod === 'card' && 'Credit / Debit Card'}
                        {paymentMethod === 'bank' && 'Bank Transfer'}
                      </p>
                      {(paymentMethod === 'mtn' || paymentMethod === 'airtel') && (
                        <p className="text-sm text-muted-foreground">{countryCode} {phoneNumber}</p>
                      )}
                      {(paymentMethod === 'card' || paymentMethod === 'bank') && (
                        <p className="text-sm text-muted-foreground">Agent will call you</p>
                      )}
                    </div>
                  </div>

                  {/* Card/Bank notice */}
                  {(paymentMethod === 'card' || paymentMethod === 'bank') && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
                      <div className="flex gap-3">
                        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">
                            Expect a call within 5 minutes
                          </p>
                          <p className="text-amber-600 dark:text-amber-400">
                            After clicking "Confirm Booking", our payment team will call you at <span className="font-medium">{formData.email}</span> to complete your {paymentMethod === 'card' ? 'card' : 'bank transfer'} payment securely.
                          </p>
                          <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50 space-y-1">
                            <p className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <a href="tel:+250793903663" className="font-medium hover:underline">+250 793 903 663</a>
                            </p>
                            <p className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <a href="mailto:support@merry360x.com" className="font-medium hover:underline">support@merry360x.com</a>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {paymentError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-destructive">
                          {paymentError.includes("sign in") ? "Sign In Required" : "Payment Failed"}
                        </p>
                        <p className="text-sm text-destructive/80">{paymentError}</p>
                        {paymentError.includes("sign in") && (
                          <Link to="/auth" className="inline-block mt-2">
                            <Button size="sm" variant="destructive">
                              Sign In to Book
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => goToStep('payment')}
                      disabled={isProcessing}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      size="lg" 
                      className="flex-1"
                      onClick={handlePayment}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay {formatMoney(total, displayCurrency)}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
                    <Shield className="w-4 h-4" />
                    Secured by PawaPay • Encrypted payment
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border/50 p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              {/* Items Preview */}
              <div className="space-y-3 mb-4">
                {cartItems.slice(0, 3).map((item) => {
                  const isProperty = item.item_type === 'property';
                  const nights = isProperty && item.metadata?.nights ? item.metadata.nights : item.quantity;
                  const multiplier = isProperty ? nights : item.quantity;
                  const itemPrice = convertAmount(item.price * multiplier, item.currency, displayCurrency, usdRates) ?? item.price * multiplier;
                  
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getItemIcon(item.item_type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {isProperty && item.metadata?.check_in && item.metadata?.check_out ? (
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.metadata.check_in).toLocaleDateString()} - {new Date(item.metadata.check_out).toLocaleDateString()} ({nights} {nights === 1 ? 'night' : 'nights'})
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                        )}
                      </div>
                      <p className="text-sm font-medium">{formatMoney(itemPrice, displayCurrency)}</p>
                    </div>
                  );
                })}
                {cartItems.length > 3 && (
                  <p className="text-sm text-muted-foreground">+{cartItems.length - 3} more items</p>
                )}
              </div>

              {/* Discount Code Input */}
              <div className="border-t pt-4 pb-2">
                {appliedDiscount ? (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        {appliedDiscount.code}
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ({appliedDiscount.discount_type === 'percentage' 
                          ? `${appliedDiscount.discount_value}% off` 
                          : `${formatMoney(appliedDiscount.discount_value, displayCurrency)} off`})
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveDiscount}
                      className="text-red-500 hover:text-red-600 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={discountCodeInput}
                        onChange={(e) => {
                          setDiscountCodeInput(e.target.value.toUpperCase());
                          setDiscountError(null);
                        }}
                        placeholder="Discount code"
                        className="flex-1 h-10 text-sm uppercase"
                      />
                      <Button
                        onClick={handleApplyDiscount}
                        variant="outline"
                        size="sm"
                        disabled={discountLoading || !discountCodeInput.trim()}
                        className="h-10 px-4"
                      >
                        {discountLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                    {discountError && (
                      <p className="text-xs text-red-500">{discountError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(subtotal, displayCurrency)}</span>
                </div>
                {serviceFees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service fees</span>
                    <span>{formatMoney(serviceFees, displayCurrency)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Discount
                    </span>
                    <span>-{formatMoney(discount, displayCurrency)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline py-4 mt-4 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">{formatMoney(total, displayCurrency)}</span>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  Secure payment with PawaPay
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-4 h-4" />
                  Instant booking confirmation
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal for Card/Bank Transfer */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {paymentMethod === 'card' ? 'Credit Card Payment' : 'Bank Transfer'}
              </h3>
              <p className="text-muted-foreground text-sm">
                Our team will contact you within <span className="font-semibold text-foreground">5 minutes</span> to complete your payment securely.
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm font-medium mb-1">What happens next?</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• A payment specialist will call you</li>
                  <li>• They'll guide you through the secure payment</li>
                  <li>• Your booking will be confirmed immediately</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Call us directly</p>
                    <a href="tel:+250792527083" className="font-medium text-foreground hover:text-primary">
                      +250 792 527 083
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email support</p>
                    <a href="mailto:support@merry360x.com" className="font-medium text-foreground hover:text-primary">
                      support@merry360x.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowContactModal(false); setPaymentMethod('mtn'); }}
              >
                Use Mobile Money
              </Button>
              <Button
                className="flex-1"
                onClick={() => setShowContactModal(false)}
              >
                I Understand
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
