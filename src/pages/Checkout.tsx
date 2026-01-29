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
import { useTripCart } from "@/hooks/useTripCart";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { calculateGuestTotal, calculateHostEarnings, PLATFORM_FEES } from "@/lib/fees";
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
  Smartphone
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
  
  // Discount
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);

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
        .eq("id", user.id)
        .single() as any)
        .then(({ data }: any) => {
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
    queryKey: ["checkout_cart", user?.id, guestCart.map(i => i.id).join(",")],
    queryFn: async () => {
      const cartSource = user ? await fetchUserCart() : await fetchGuestCart();
      return cartSource;
    },
    enabled: !authLoading,
  });

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
    const tourIds = items.filter(i => i.item_type === 'tour').map(i => i.reference_id);
    const packageIds = items.filter(i => i.item_type === 'tour_package').map(i => i.reference_id);
    const propertyIds = items.filter(i => i.item_type === 'property').map(i => i.reference_id);
    const vehicleIds = items.filter(i => i.item_type === 'transport_vehicle').map(i => i.reference_id);

    const [tours, packages, properties, vehicles] = await Promise.all([
      tourIds.length ? supabase.from('tours').select('id, title, price_per_person, currency, images, duration_days').in('id', tourIds).then(r => r.data || []) : [],
      packageIds.length ? supabase.from('tour_packages').select('id, title, price_per_adult, currency, cover_image, gallery_images, duration').in('id', packageIds).then(r => r.data || []) : [],
      propertyIds.length ? supabase.from('properties').select('id, title, price_per_night, currency, images, location').in('id', propertyIds).then(r => r.data || []) : [],
      vehicleIds.length ? supabase.from('transport_vehicles').select('id, title, price_per_day, currency, image_url, vehicle_type, seats').in('id', vehicleIds).then(r => r.data || []) : [],
    ]) as any[];

    const maps: Record<string, Map<string, any>> = {
      tour: new Map(tours.map((t: any) => [t.id, t] as [string, any])),
      tour_package: new Map(packages.map((p: any) => [p.id, p] as [string, any])),
      property: new Map(properties.map((p: any) => [p.id, p] as [string, any])),
      transport_vehicle: new Map(vehicles.map((v: any) => [v.id, v] as [string, any])),
    };

    return items.map(item => {
      const data: any = maps[item.item_type]?.get(item.reference_id);
      if (!data) return null;

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

      return { id: item.id, item_type: item.item_type, reference_id: item.reference_id, quantity: item.quantity, ...details } as CartItem;
    }).filter(Boolean) as CartItem[];
  }

  // Calculate totals
  const { subtotal, serviceFees, discount, total, displayCurrency } = useMemo(() => {
    let subtotalAmount = 0;
    let feesAmount = 0;
    const curr = preferredCurrency || "RWF";

    cartItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      const converted = convertAmount(itemTotal, item.currency, curr, usdRates) ?? itemTotal;
      subtotalAmount += converted;
      
      if (item.item_type === 'property') {
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

  // Step validation
  const isDetailsValid = formData.fullName.trim() && formData.email.trim();
  const isPaymentValid = phoneNumber.length >= 9;

  const goToStep = (step: Step) => {
    if (step === 'payment' && !isDetailsValid) {
      toast({ variant: "destructive", title: "Please complete your details" });
      return;
    }
    if (step === 'confirm' && !isPaymentValid) {
      toast({ variant: "destructive", title: "Please enter your phone number" });
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
    setIsProcessing(true);
    setPaymentError(null);
    
    try {
      // Create booking records for each item
      const bookingIds: string[] = [];
      const fullPhone = `${countryCode}${phoneNumber.replace(/^0+/, '')}`;
      
      for (const item of cartItems) {
        const itemTotal = item.price * item.quantity;
        const converted = convertAmount(itemTotal, item.currency, displayCurrency, usdRates) ?? itemTotal;
        const isAccommodation = item.item_type === 'property';
        const feeResult = isAccommodation 
          ? calculateGuestTotal(converted, 'accommodation') 
          : { guestTotal: converted, platformFee: 0 };
        const itemWithFee = feeResult.guestTotal;
        
        // Apply proportional discount
        let itemDiscount = 0;
        if (discount > 0) {
          itemDiscount = (converted / subtotal) * discount;
        }
        
        const finalAmount = itemWithFee - itemDiscount;
        
        const bookingData: any = {
          user_id: user?.id || null,
          status: "pending",
          payment_status: "pending",
          total_price: finalAmount,
          currency: displayCurrency,
          guest_name: formData.fullName,
          guest_email: formData.email,
          guest_phone: fullPhone,
          special_requests: formData.notes || null,
          number_of_guests: item.quantity,
          created_at: new Date().toISOString(),
        };

        // Set the appropriate foreign key based on item type
        if (item.item_type === 'tour') {
          bookingData.tour_id = item.reference_id;
        } else if (item.item_type === 'tour_package') {
          bookingData.tour_package_id = item.reference_id;
        } else if (item.item_type === 'property') {
          bookingData.property_id = item.reference_id;
        } else if (item.item_type === 'transport_vehicle') {
          bookingData.vehicle_id = item.reference_id;
        }

        const { data: booking, error: bookingError } = await (supabase
          .from("bookings")
          .insert(bookingData)
          .select("id")
          .single() as any);

        if (bookingError) throw bookingError;
        bookingIds.push(booking.id);
      }

      // Initiate PawaPay payment
      const paymentResponse = await fetch("/api/pawapay-create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingIds,
          amount: Math.round(total),
          currency: displayCurrency === 'RWF' ? 'RWF' : 'RWF', // PawaPay needs RWF
          phoneNumber: fullPhone,
          description: `Merry Moments - ${cartItems.length} item(s)`,
          payerEmail: formData.email,
          payerName: formData.fullName,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentData.error || "Payment initiation failed");
      }

      // Clear cart
      await clearCart();
      localStorage.removeItem("applied_discount");

      // Redirect to payment pending
      navigate(`/payment-pending?bookingId=${bookingIds[0]}&depositId=${paymentData.depositId}`);
      
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
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Mobile Money Payment</h2>
                    <p className="text-sm text-muted-foreground">Pay securely with MTN or Airtel Money</p>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border-2 border-primary rounded-xl p-4 bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center">
                          <span className="font-bold text-sm text-black">MTN</span>
                        </div>
                        <div>
                          <p className="font-medium">MTN Mobile Money</p>
                          <p className="text-xs text-muted-foreground">Rwanda</p>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-xl p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                          <span className="font-bold text-xs text-white">Airtel</span>
                        </div>
                        <div>
                          <p className="font-medium">Airtel Money</p>
                          <p className="text-xs text-muted-foreground">Coming soon</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number Input */}
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
                          <li>Click "Pay Now" below</li>
                          <li>You'll receive a payment prompt on your phone</li>
                          <li>Enter your PIN to confirm</li>
                          <li>We'll confirm your booking automatically</li>
                        </ol>
                      </div>
                    </div>
                  </div>

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
                      disabled={!isPaymentValid}
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
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
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
                      <p className="text-sm">Mobile Money</p>
                      <p className="text-sm text-muted-foreground">{countryCode} {phoneNumber}</p>
                    </div>
                  </div>

                  {/* Error */}
                  {paymentError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                      <div>
                        <p className="font-medium text-destructive">Payment Failed</p>
                        <p className="text-sm text-destructive/80">{paymentError}</p>
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
                  const itemPrice = convertAmount(item.price * item.quantity, item.currency, displayCurrency, usdRates) ?? item.price * item.quantity;
                  
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
                        <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">{formatMoney(itemPrice, displayCurrency)}</p>
                    </div>
                  );
                })}
                {cartItems.length > 3 && (
                  <p className="text-sm text-muted-foreground">+{cartItems.length - 3} more items</p>
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

      <Footer />
    </div>
  );
}
