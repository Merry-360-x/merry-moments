import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { convertAmount, PAYMENT_CURRENCIES } from "@/lib/fx";
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
  X,
  Users
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
  weekly_discount?: number | null;
  monthly_discount?: number | null;
}

type Step = 'details' | 'payment' | 'confirm';

const STEP_ORDER: Step[] = ['details', 'payment', 'confirm'];

// PawaPay supported payment methods by country
interface PaymentMethodInfo {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  countryCode: string;
  country: string;
  flag: string;
  currency: string;
  color: string;
  textColor: string;
}

const PAWAPAY_METHODS: PaymentMethodInfo[] = [
  // Rwanda (+250) - RWF — MTN_MOMO_RWA, AIRTEL_RWA
  { id: 'mtn_rwa', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+250', country: 'Rwanda', flag: '🇷🇼', currency: 'RWF', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'airtel_rwa', name: 'Airtel Money', shortName: 'Airtel', provider: 'AIRTEL', countryCode: '+250', country: 'Rwanda', flag: '🇷🇼', currency: 'RWF', color: 'bg-red-500', textColor: 'text-white' },
  
  // Kenya (+254) - KES — MPESA_KEN only
  { id: 'mpesa_ken', name: 'M-Pesa', shortName: 'M-Pesa', provider: 'MPESA', countryCode: '+254', country: 'Kenya', flag: '🇰🇪', currency: 'KES', color: 'bg-green-500', textColor: 'text-white' },
  
  // Uganda (+256) - UGX — MTN_MOMO_UGA, AIRTEL_OAPI_UGA
  { id: 'mtn_uga', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+256', country: 'Uganda', flag: '🇺🇬', currency: 'UGX', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'airtel_uga', name: 'Airtel Money', shortName: 'Airtel', provider: 'AIRTEL', countryCode: '+256', country: 'Uganda', flag: '🇺🇬', currency: 'UGX', color: 'bg-red-500', textColor: 'text-white' },
  
  // Zambia (+260) - ZMW — MTN_MOMO_ZMB, ZAMTEL_ZMB
  { id: 'mtn_zmb', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+260', country: 'Zambia', flag: '🇿🇲', currency: 'ZMW', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'zamtel_zmb', name: 'Zamtel Money', shortName: 'Zamtel', provider: 'ZAMTEL', countryCode: '+260', country: 'Zambia', flag: '🇿🇲', currency: 'ZMW', color: 'bg-green-600', textColor: 'text-white' },
];

// Group methods by country
const METHODS_BY_COUNTRY = PAWAPAY_METHODS.reduce((acc, method) => {
  if (!acc[method.country]) {
    acc[method.country] = { flag: method.flag, countryCode: method.countryCode, currency: method.currency, methods: [] };
  }
  acc[method.country].methods.push(method);
  return acc;
}, {} as Record<string, { flag: string; countryCode: string; currency: string; methods: PaymentMethodInfo[] }>);

// Country code to country name mapping for detection
const COUNTRY_BY_CODE: Record<string, string> = {
  '+250': 'Rwanda',
  '+256': 'Uganda',
  '+254': 'Kenya',
  '+260': 'Zambia',
};

// Get sorted countries based on user's phone country code
function getSortedCountries(userCountryCode: string): [string, typeof METHODS_BY_COUNTRY[string]][] {
  const userCountry = COUNTRY_BY_CODE[userCountryCode];
  const entries = Object.entries(METHODS_BY_COUNTRY);
  
  if (!userCountry) return entries;
  
  // Put user's country first
  return entries.sort((a, b) => {
    if (a[0] === userCountry) return -1;
    if (b[0] === userCountry) return 1;
    return 0;
  });
}

export default function CheckoutNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { currency: preferredCurrency, setCurrency, detectedCountry } = usePreferences();
  const { guestCart, clearCart } = useTripCart();
  const { usdRates } = useFxRates();
  
  // Map detected country ISO code → default payment method + country code
  const geoDefaults = useMemo(() => {
    const map: Record<string, { method: string; code: string }> = {
      RW: { method: 'mtn_rwa', code: '+250' },
      KE: { method: 'mpesa_ken', code: '+254' },
      UG: { method: 'mtn_uga', code: '+256' },
      ZM: { method: 'mtn_zmb', code: '+260' },
    };
    return map[detectedCountry || ''] ?? { method: 'mtn_rwa', code: '+250' };
  }, [detectedCountry]);
  
  // State
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'group' | 'individual'>('group');
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    notes: "",
  });
  
  // Payment state — defaults from geo-detection
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState(geoDefaults.code);
  const [paymentMethod, setPaymentMethod] = useState<string>(geoDefaults.method);
  const [geoApplied, setGeoApplied] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // When geo-detection resolves, update payment defaults (only once, before user interacts)
  useEffect(() => {
    if (detectedCountry && !geoApplied) {
      setCountryCode(geoDefaults.code);
      setPaymentMethod(geoDefaults.method);
      setGeoApplied(true);
    }
  }, [detectedCountry, geoDefaults, geoApplied]);
  
  // Legal acknowledgment
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedCancellation, setAcceptedCancellation] = useState(false);
  
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
            
            // If all user details are pre-filled and we have cart items, enable fast checkout
            if (data.full_name && user.email && data.phone) {
              // Auto-fill indicates user can skip to payment for faster checkout
              console.log("✅ User details pre-filled - fast checkout enabled");
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
      const tourId = searchParams.get("tourId");
      const requireTripCart = searchParams.get("requireTripCart");
      
      // Direct property booking
      if (mode === "booking" && propertyId) {
        const directBooking = await fetchDirectBooking(propertyId);
        
        // If requireTripCart is set, merge with cart items (for add-ons)
        if (requireTripCart === "1") {
          const cartSource = user ? await fetchUserCart() : await fetchGuestCart();
          return [...directBooking, ...cartSource];
        }
        
        return directBooking;
      }
      
      // Direct tour booking
      if (mode === "tour" && tourId) {
        const participants = parseInt(searchParams.get("participants") || "1", 10);
        const directTour = await fetchDirectTour(tourId, participants);
        return directTour;
      }
      
      // Otherwise fetch from cart
      const cartSource = user ? await fetchUserCart() : await fetchGuestCart();
      return cartSource;
    },
    enabled: !authLoading,
  });

  async function fetchDirectTour(tourId: string, participants: number): Promise<CartItem[]> {
    // Fetch the tour details directly
    const { data: tour, error } = await (supabase
      .from('tours')
      .select('id, title, price_per_person, currency, images, duration_days')
      .eq('id', tourId)
      .single() as any);
    
    if (error || !tour) {
      console.error("Failed to load tour for direct booking:", error);
      return [];
    }
    
    // Return as a cart item
    return [{
      id: `direct-tour-${tour.id}`,
      item_type: 'tour',
      reference_id: tour.id,
      quantity: participants,
      title: tour.title,
      price: tour.price_per_person,
      currency: tour.currency || 'RWF',
      image: tour.images?.[0],
      meta: `${tour.duration_days} days`,
    }];
  }

  async function fetchDirectBooking(propertyId: string): Promise<CartItem[]> {
    // Fetch the property details directly
    const { data: property, error } = await supabase
      .from('properties')
      .select('id, title, price_per_night, currency, images, location, weekly_discount, monthly_discount')
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
      weekly_discount: property.weekly_discount,
      monthly_discount: property.monthly_discount,
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
      propertyIds.length ? supabase.from('properties').select('id, title, price_per_night, currency, images, location, weekly_discount, monthly_discount').in('id', propertyIds).then(r => r.data || []) : [],
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
            return { title: data.title, price: data.price_per_night, currency: data.currency || 'RWF', image: data.images?.[0], meta: data.location, weekly_discount: data.weekly_discount, monthly_discount: data.monthly_discount };
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
  const { subtotal, serviceFees, discount, stayDiscount, total, displayCurrency } = useMemo(() => {
    let subtotalAmount = 0;
    let stayDiscountAmount = 0;
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
      
      // Apply weekly/monthly discount for properties
      if (isProperty && nights > 0) {
        const weeklyDiscount = Number(item.weekly_discount ?? 0);
        const monthlyDiscount = Number(item.monthly_discount ?? 0);
        const discountPercent = nights >= 28 && monthlyDiscount > 0 
          ? monthlyDiscount 
          : nights >= 7 && weeklyDiscount > 0 
            ? weeklyDiscount 
            : 0;
        if (discountPercent > 0) {
          stayDiscountAmount += Math.round((converted * discountPercent) / 100);
        }
      }
      
      if (isProperty) {
        // Calculate fees on the discounted amount
        const discountedAmount = converted - (nights >= 28 
          ? Math.round((converted * Number(item.monthly_discount ?? 0)) / 100)
          : nights >= 7 
            ? Math.round((converted * Number(item.weekly_discount ?? 0)) / 100)
            : 0);
        const { platformFee } = calculateGuestTotal(discountedAmount, 'accommodation');
        feesAmount += platformFee;
      }
    });

    let discountAmount = 0;
    if (appliedDiscount) {
      const afterStayDiscount = subtotalAmount - stayDiscountAmount;
      if (appliedDiscount.discount_type === 'percentage') {
        discountAmount = afterStayDiscount * (appliedDiscount.discount_value / 100);
      } else {
        const converted = convertAmount(appliedDiscount.discount_value, appliedDiscount.currency, curr, usdRates);
        discountAmount = converted ?? 0;
      }
      if (appliedDiscount.minimum_amount && afterStayDiscount < appliedDiscount.minimum_amount) {
        discountAmount = 0;
      }
    }

    return {
      subtotal: subtotalAmount,
      stayDiscount: stayDiscountAmount,
      serviceFees: feesAmount,
      discount: discountAmount,
      total: subtotalAmount - stayDiscountAmount + feesAmount - discountAmount,
      displayCurrency: curr,
    };
  }, [cartItems, preferredCurrency, usdRates, appliedDiscount]);

  // Check if there are tours with multiple participants
  const tourParticipants = useMemo(() => {
    return cartItems
      .filter(item => item.item_type === 'tour' || item.item_type === 'tour_package')
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const hasGroupBooking = tourParticipants > 1;
  
  // Calculate individual share when paying individually
  const individualShare = useMemo(() => {
    if (!hasGroupBooking || paymentType === 'group') return total;
    return Math.ceil(total / tourParticipants);
  }, [total, tourParticipants, paymentType, hasGroupBooking]);

  // The amount to actually pay based on payment type
  const payableAmount = paymentType === 'individual' && hasGroupBooking ? individualShare : total;

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

  // Check if payment method is a mobile money method (not card or bank)
  const isMobileMoneyMethod = paymentMethod !== 'card' && paymentMethod !== 'bank';
  
  // Step validation
  const isDetailsValid = formData.fullName.trim() && formData.email.trim();
  const isPaymentValid = !isMobileMoneyMethod || phoneNumber.length >= 9;

  const goToStep = (step: Step) => {
    if (step === 'payment' && !isDetailsValid) {
      toast({ variant: "destructive", title: "Please complete your details" });
      return;
    }
    if (step === 'confirm' && !isPaymentValid) {
      const message = isMobileMoneyMethod 
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
      if (isMobileMoneyMethod) {
        let cleanedPhone = phoneNumber.replace(/^0+/, ''); // Remove leading zeros
        // Get country code digits without the + sign
        const countryDigits = countryCode.replace('+', '');
        // If user entered country code + number, strip the country code since we add it from countryCode
        if (cleanedPhone.startsWith(countryDigits) && cleanedPhone.length >= 11) {
          cleanedPhone = cleanedPhone.substring(countryDigits.length);
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
        // IMPORTANT: Keep each item's calculated_price in the item's own currency
        // so booking records can store a consistent (amount + currency) pair.
        // Payment conversion to RWF is handled separately at the checkout level.
        const converted = itemTotal;
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
          calculated_price_currency: item.currency,
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
      // Use payableAmount (which may be individual share or full total)
      let amountInRwf = payableAmount;
      if (displayCurrency !== 'RWF') {
        const converted = convertAmount(payableAmount, displayCurrency, 'RWF', usdRates);
        if (!converted) {
          throw new Error(`Unable to convert ${displayCurrency} to RWF. Please try again.`);
        }
        amountInRwf = converted;
        console.log("💱 Converted checkout amount to RWF:", {
          from: displayCurrency,
          original: payableAmount,
          rwf: amountInRwf
        });
      }
      
      // Create a single checkout request with all cart items in metadata
      const checkoutData: any = {
        user_id: user?.id || null,
        name: formData.fullName,
        email: formData.email,
        phone: fullPhone || formData.phone || null,
        message: formData.notes || null,
        total_amount: Math.round(amountInRwf),
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
          payment_type: paymentType,
          total_participants: hasGroupBooking ? tourParticipants : 1,
          group_total: hasGroupBooking ? total : null,
          payment_provider: (() => {
            const methodInfo = PAWAPAY_METHODS.find(m => m.id === paymentMethod);
            return methodInfo?.provider || paymentMethod.toUpperCase();
          })(),
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

      // Get the selected payment method info to determine the payment currency
      const selectedMethodInfo = PAWAPAY_METHODS.find(m => m.id === paymentMethod);
      const provider = selectedMethodInfo?.provider || 'MTN';
      const paymentCurrency = selectedMethodInfo?.currency || 'RWF';
      
      // Convert amount from RWF to payment method's currency
      let paymentAmount = amountInRwf;
      if (paymentCurrency !== 'RWF') {
        const converted = convertAmount(amountInRwf, 'RWF', paymentCurrency, usdRates);
        if (!converted) {
          throw new Error(`Unable to convert RWF to ${paymentCurrency}. Please try again.`);
        }
        paymentAmount = converted;
        console.log("💱 Converted payment amount:", {
          from: 'RWF',
          to: paymentCurrency,
          original: amountInRwf,
          converted: paymentAmount
        });
      }
      
      const finalAmount = Math.round(paymentAmount);
      
      // Validate amount before initiating payment
      const minAmount = paymentCurrency === 'RWF' ? 100 : 
                        paymentCurrency === 'KES' ? 10 :
                        paymentCurrency === 'UGX' ? 500 :
                        paymentCurrency === 'TZS' ? 500 :
                        paymentCurrency === 'ZMW' ? 1 : 100;
      
      if (finalAmount < minAmount) {
        throw new Error(`Minimum payment amount is ${minAmount} ${paymentCurrency}`);
      }

      // Initiate PawaPay payment for mobile money
      console.log("🔄 Initiating PawaPay payment:", {
        checkoutId,
        amount: finalAmount,
        currency: paymentCurrency,
        phoneNumber: fullPhone,
        provider,
        country: countryCode,
        paymentMethodId: paymentMethod,
      });

      const paymentResponse = await fetch("/api/pawapay-create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount: finalAmount,
          currency: paymentCurrency,
          phoneNumber: fullPhone,
          description: `Merry360x Booking - ${cartItems.length} item(s)`,
          payerEmail: formData.email,
          payerName: formData.fullName,
          provider,
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
          <h1 className="text-2xl font-semibold mb-2">{t("checkout.emptyCart")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("checkout.emptyCartDesc")}
          </p>
          <Link to="/trip-cart">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("checkout.backToTripCart")}
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
            {t("checkout.backToCart")}
          </Link>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight">{t("checkout.title")}</h1>
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
                const labels = { details: t("checkout.steps.details"), payment: t("checkout.steps.payment"), confirm: t("checkout.steps.confirm") };
                
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold mb-1">{t("checkout.contact.title")}</h2>
                      <p className="text-sm text-muted-foreground">{t("checkout.contact.subtitle")}</p>
                    </div>
                    {/* Quick Pay - Skip to payment if details are complete */}
                    {formData.fullName && formData.email && phoneNumber && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (isDetailsValid) {
                            goToStep('payment');
                            toast({ title: "Fast checkout enabled", description: "Your details are pre-filled" });
                          }
                        }}
                        className="shrink-0"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        {t("checkout.contact.quickPay")}
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="fullName">{t("checkout.contact.fullName")}</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="John Doe"
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">{t("checkout.contact.email")}</Label>
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
                      <Label htmlFor="notes">{t("checkout.contact.specialRequests")}</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t("checkout.contact.specialRequestsPlaceholder")}
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
                    {t("checkout.contact.continue")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 'payment' && (
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-1">{t("checkout.payment.title")}</h2>
                    <p className="text-xs md:text-sm text-muted-foreground">{t("checkout.payment.subtitle")}</p>
                  </div>

                  {/* Payment Methods by Country */}
                  <div className="space-y-4">
                    {getSortedCountries(countryCode).map(([country, { flag, countryCode: cc, currency, methods }]) => {
                      const selectedMethod = PAWAPAY_METHODS.find(m => m.id === paymentMethod);
                      const isCountrySelected = selectedMethod?.country === country;
                      const convertedTotal = currency === displayCurrency 
                        ? total 
                        : (convertAmount(total, displayCurrency, currency, usdRates) ?? total);
                      
                      return (
                        <div key={country} className={cn(
                          "border rounded-xl overflow-hidden transition-all",
                          isCountrySelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                        )}>
                          {/* Country Header */}
                          <div className={cn(
                            "px-4 py-3 flex items-center justify-between",
                            isCountrySelected ? "bg-primary/5" : "bg-muted/30"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{flag}</span>
                              <div>
                                <span className="font-medium">{country}</span>
                                <span className="text-xs text-muted-foreground ml-2">({cc})</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatMoney(convertedTotal, currency)}</p>
                              <p className="text-[10px] text-muted-foreground">{currency}</p>
                            </div>
                          </div>
                          
                          {/* Payment Methods for this country */}
                          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {methods.map((method) => {
                              const isSelected = paymentMethod === method.id;
                              return (
                                <button
                                  key={method.id}
                                  onClick={() => {
                                    setPaymentMethod(method.id);
                                    setCountryCode(method.countryCode);
                                    setCurrency(method.currency as any);
                                  }}
                                  className={cn(
                                    "border-2 rounded-lg p-2.5 text-center transition-all",
                                    isSelected 
                                      ? "border-primary bg-primary/10" 
                                      : "border-transparent bg-muted/30 hover:border-primary/30"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg mx-auto flex items-center justify-center",
                                    method.color
                                  )}>
                                    <span className={cn("font-bold text-[10px]", method.textColor)}>
                                      {method.shortName}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium mt-1.5 truncate">{method.name}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card and Bank options */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
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
                          <p className="font-medium text-xs md:text-base truncate">{t("checkout.payment.card")}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{t("checkout.payment.cardDesc")}</p>
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
                          <p className="font-medium text-xs md:text-base truncate">{t("checkout.payment.bankTransfer")}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{t("checkout.payment.bankTransferDesc")}</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Phone Number Input - only for mobile money */}
                  {paymentMethod !== 'card' && paymentMethod !== 'bank' && (
                    <>
                      <div>
                        <Label htmlFor="phone">{t("checkout.payment.phoneNumber")}</Label>
                        <div className="flex gap-2 mt-1.5">
                          <div className="h-11 px-3 rounded-lg border bg-muted/50 flex items-center text-sm">
                            {PAWAPAY_METHODS.find(m => m.id === paymentMethod)?.flag} {countryCode}
                          </div>
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
                          You'll receive a {PAWAPAY_METHODS.find(m => m.id === paymentMethod)?.name} payment prompt on this number
                        </p>
                      </div>

                      {/* Info Box */}
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                        <div className="flex gap-3">
                          <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">{t("checkout.payment.howItWorks")}</p>
                            <ol className="text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                              <li>Click "Review Booking" below</li>
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
                      disabled={paymentMethod !== 'card' && paymentMethod !== 'bank' && !isPaymentValid}
                    >
                      {t("checkout.payment.reviewBooking")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {currentStep === 'confirm' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{t("checkout.review.title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("checkout.review.subtitle")}</p>
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
                      <h4 className="text-sm font-medium mb-2">{t("checkout.review.contactDetails")}</h4>
                      <p className="text-sm">{formData.fullName}</p>
                      <p className="text-sm text-muted-foreground">{formData.email}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4">
                      <h4 className="text-sm font-medium mb-2">{t("checkout.review.paymentMethod")}</h4>
                      {(() => {
                        const selectedMethodInfo = PAWAPAY_METHODS.find(m => m.id === paymentMethod);
                        const isMobileMoney = selectedMethodInfo != null;
                        
                        return (
                          <>
                            <p className="text-sm">
                              {isMobileMoney && selectedMethodInfo && (
                                <span className="flex items-center gap-2">
                                  <span className="text-lg">{selectedMethodInfo.flag}</span>
                                  {selectedMethodInfo.name}
                                </span>
                              )}
                              {paymentMethod === 'card' && 'Credit / Debit Card'}
                              {paymentMethod === 'bank' && 'Bank Transfer'}
                              {!isMobileMoney && paymentMethod !== 'card' && paymentMethod !== 'bank' && 'No payment method selected'}
                            </p>
                            {isMobileMoney && (
                              <p className="text-sm text-muted-foreground">{countryCode} {phoneNumber}</p>
                            )}
                            {(paymentMethod === 'card' || paymentMethod === 'bank') && (
                              <p className="text-sm text-muted-foreground">Agent will call you</p>
                            )}
                          </>
                        );
                      })()}
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
                              <a href="tel:+250796214719" className="font-medium hover:underline">+250 796 214 719</a>
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

                  {/* Legal Acknowledgment Checkboxes */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-medium mb-3">{t("checkout.review.beforeProceed")}</h4>
                    
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {t("checkout.review.agreeTerms")}{' '}
                        <Link to="/terms-and-conditions" target="_blank" className="text-primary hover:underline font-medium">
                          {t("checkout.review.termsConditions")}
                        </Link>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        I have read and understood the{' '}
                        <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline font-medium">
                          {t("checkout.review.privacyPolicy")}
                        </Link>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptedCancellation}
                        onChange={(e) => setAcceptedCancellation(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        I understand the{' '}
                        <Link to="/refund-policy" target="_blank" className="text-primary hover:underline font-medium">
                          {t("checkout.review.cancellationPolicy")}
                        </Link>
                      </span>
                    </label>
                  </div>

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
                      disabled={isProcessing || !acceptedTerms || !acceptedPrivacy || !acceptedCancellation}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay {formatMoney(payableAmount, displayCurrency)}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Validation hint */}
                  {(!acceptedTerms || !acceptedPrivacy || !acceptedCancellation) && (
                    <p className="text-xs text-center text-muted-foreground">
                      {t("checkout.review.acceptAll")}
                    </p>
                  )}

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
                    <Shield className="w-4 h-4" />
                    {t("checkout.review.securedEncrypted")}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border/50 p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">{t("checkout.summary.title")}</h2>
              
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
                {/* Base price (before any discounts) */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.basePrice")}</span>
                  <span>{formatMoney(subtotal, displayCurrency)}</span>
                </div>
                
                {/* Stay discount (weekly/monthly) */}
                {stayDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {cartItems.some(i => i.item_type === 'property' && (i.metadata?.nights ?? 0) >= 28) 
                        ? 'Monthly stay discount' 
                        : 'Weekly stay discount'}
                    </span>
                    <span>-{formatMoney(stayDiscount, displayCurrency)}</span>
                  </div>
                )}
                
                {/* Subtotal after stay discounts */}
                {stayDiscount > 0 && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">{t("common.subtotal")}</span>
                    <span>{formatMoney(subtotal - stayDiscount, displayCurrency)}</span>
                  </div>
                )}
                
                {/* Service fees */}
                {serviceFees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.serviceFees")}</span>
                    <span>+{formatMoney(serviceFees, displayCurrency)}</span>
                  </div>
                )}
                
                {/* Promo code discount */}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Promo ({appliedDiscount?.code})
                    </span>
                    <span>-{formatMoney(discount, displayCurrency)}</span>
                  </div>
                )}
              </div>

              {/* Payment Type Selector - only show for group bookings */}
              {hasGroupBooking && (
                <div className="border-t pt-4 space-y-3">
                  <div className="text-sm font-semibold text-foreground">{t("checkout.paymentType", "Payment Type")}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={paymentType === 'group' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentType('group')}
                      className="flex-1"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {t("checkout.payAsGroup", "Pay for Everyone")}
                    </Button>
                    <Button
                      variant={paymentType === 'individual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentType('individual')}
                      className="flex-1"
                    >
                      {t("checkout.payIndividual", "Pay My Share")}
                    </Button>
                  </div>
                  {paymentType === 'individual' && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("checkout.yourShare", "Your share")} (1/{tourParticipants})</span>
                        <span className="font-semibold text-primary">{formatMoney(individualShare, displayCurrency)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{t("checkout.individualNote", "Other participants will need to complete their own payment")}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-baseline py-4 mt-4 border-t">
                <span className="font-semibold">{paymentType === 'individual' && hasGroupBooking ? t("checkout.youPay", "You Pay") : t("common.total")}</span>
                <span className="text-2xl font-bold">{formatMoney(payableAmount, displayCurrency)}</span>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  {t("common.securePayment")}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-4 h-4" />
                  {t("checkout.summary.instantConfirmation")}
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
                    <a href="tel:+250796214719" className="font-medium text-foreground hover:text-primary">
                      +250 796 214 719
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
