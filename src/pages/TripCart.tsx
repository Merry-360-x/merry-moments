import { useMemo, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/hooks/usePreferences";
import { formatMoney } from "@/lib/money";
import { useTripCart, getGuestCart, getCartItemMetadata, saveCartItemMetadata, CartItemMetadata } from "@/hooks/useTripCart";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { calculateGuestTotal, PLATFORM_FEES } from "@/lib/fees";
import { 
  Trash2, 
  Tag, 
  ShoppingBag, 
  ArrowRight, 
  Minus, 
  Plus,
  MapPin,
  Calendar,
  Users,
  Home,
  Car,
  Loader2,
  Clock,
  Pencil,
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
  weekly_discount?: number;
  monthly_discount?: number;
}

export default function TripCart() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { currency: preferredCurrency } = usePreferences();
  const { guestCart, removeFromCart, clearCart, updateQuantity } = useTripCart();
  const { usdRates } = useFxRates();
  const queryClient = useQueryClient();
  
  // Discount code state
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  
  // Edit dates modal state
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editGuests, setEditGuests] = useState(1);

  // Persist applied discount to localStorage for checkout
  useEffect(() => {
    if (appliedDiscount) {
      localStorage.setItem("applied_discount", JSON.stringify(appliedDiscount));
    } else {
      localStorage.removeItem("applied_discount");
    }
  }, [appliedDiscount]);

  // Load applied discount from localStorage on mount
  useEffect(() => {
    const savedDiscount = localStorage.getItem("applied_discount");
    if (savedDiscount) {
      try {
        setAppliedDiscount(JSON.parse(savedDiscount));
      } catch (e) {
        localStorage.removeItem("applied_discount");
      }
    }
  }, []);

  // Fetch cart items with details
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["trip_cart", user?.id, guestCart.map(i => i.id).join(",")],
    queryFn: async () => {
      const cartSource = user ? await fetchUserCart() : await fetchGuestCart();
      return cartSource;
    },
    enabled: !authLoading,
  });

  async function fetchUserCart(): Promise<CartItem[]> {
    const { data, error } = await (supabase
      .from("trip_cart_items")
      .select("id, item_type, reference_id, quantity, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }) as any);

    if (error || !data?.length) return [];
    return enrichCartItems(data);
  }

  async function fetchGuestCart(): Promise<CartItem[]> {
    // Read directly from localStorage to avoid stale state issues
    const freshGuestCart = getGuestCart();
    if (freshGuestCart.length === 0) return [];
    return enrichCartItems(freshGuestCart.map(g => ({
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
      tourIds.length ? supabase.from('tours').select('id, title, price_per_person, currency, images, duration_days').in('id', tourIds).then(r => { console.log('Tours loaded:', r.data?.length); return r.data || []; }) : [],
      packageIds.length ? supabase.from('tour_packages').select('id, title, price_per_adult, currency, cover_image, gallery_images, duration').in('id', packageIds).then(r => { console.log('Packages loaded:', r.data?.length); return r.data || []; }) : [],
      propertyIds.length ? supabase.from('properties').select('id, title, price_per_night, currency, images, location, weekly_discount, monthly_discount').in('id', propertyIds).then(r => { console.log('Properties loaded:', r.data?.length); return r.data || []; }) : [],
      vehicleIds.length ? supabase.from('transport_vehicles').select('id, title, price_per_day, currency, image_url, vehicle_type, seats').in('id', vehicleIds).then(r => { console.log('Vehicles loaded:', r.data?.length); return r.data || []; }) : [],
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
        console.warn(`Cart item not found: ${item.item_type} ${refId}`);
        return null;
      }

      const getDetails = () => {
        switch (item.item_type) {
          case 'tour':
            return { title: data.title, price: data.price_per_person, currency: data.currency || 'RWF', image: data.images?.[0], meta: `${data.duration_days} days` };
          case 'tour_package':
            return { title: data.title, price: data.price_per_adult, currency: data.currency || 'RWF', image: data.cover_image || data.gallery_images?.[0], meta: `${parseInt(data.duration) || 1} days` };
          case 'property':
            return { 
              title: data.title, 
              price: data.price_per_night, 
              currency: data.currency || 'RWF', 
              image: data.images?.[0], 
              meta: data.location,
              weekly_discount: data.weekly_discount,
              monthly_discount: data.monthly_discount
            };
          case 'transport_vehicle':
            return { title: data.title, price: data.price_per_day, currency: data.currency || 'RWF', image: data.image_url, meta: `${data.vehicle_type} • ${data.seats} seats` };
          default:
            return null;
        }
      };

      const details = getDetails();
      if (!details) return null;

      // Get metadata from localStorage
      const metadata = getCartItemMetadata(String(item.reference_id));

      return { 
        id: item.id, 
        item_type: item.item_type, 
        reference_id: item.reference_id, 
        quantity: item.quantity, 
        metadata,
        ...details 
      } as CartItem;
    }).filter(Boolean) as CartItem[];
  }

  // Validate discount code
  const applyDiscountCode = async () => {
    if (!discountCode.trim()) return;
    setValidatingCode(true);
    
    try {
      const { data, error } = await (supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase().trim())
        .eq("is_active", true)
        .single() as any);
      
      if (error || !data) {
        toast({ variant: "destructive", title: "Invalid Code", description: "Discount code not found or expired" });
        setValidatingCode(false);
        return;
      }
      
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        toast({ variant: "destructive", title: "Expired", description: "This discount code has expired" });
        setValidatingCode(false);
        return;
      }
      
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast({ variant: "destructive", title: "Limit Reached", description: "This discount code has reached its usage limit" });
        setValidatingCode(false);
        return;
      }
      
      setAppliedDiscount(data);
      toast({ title: "Discount Applied!", description: `${data.discount_type === 'percentage' ? data.discount_value + '%' : data.currency + ' ' + data.discount_value} off` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to validate discount code" });
    }
    setValidatingCode(false);
  };

  // Open edit dates modal
  const handleEditDates = (item: CartItem) => {
    setEditingItem(item);
    setEditCheckIn(item.metadata?.check_in || "");
    setEditCheckOut(item.metadata?.check_out || "");
    setEditGuests(item.metadata?.guests || 1);
  };

  // Save edited dates
  const handleSaveDates = () => {
    if (!editingItem) return;
    
    if (!editCheckIn || !editCheckOut) {
      toast({ variant: "destructive", title: "Missing Dates", description: "Please select both check-in and check-out dates" });
      return;
    }
    
    const checkInDate = new Date(editCheckIn);
    const checkOutDate = new Date(editCheckOut);
    
    if (checkOutDate <= checkInDate) {
      toast({ variant: "destructive", title: "Invalid Dates", description: "Check-out date must be after check-in date" });
      return;
    }
    
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Save to localStorage
    saveCartItemMetadata(editingItem.reference_id, {
      check_in: editCheckIn,
      check_out: editCheckOut,
      guests: editGuests,
      nights,
    });
    
    // Refresh cart data
    queryClient.invalidateQueries({ queryKey: ["trip_cart"] });
    
    toast({ title: "Dates Updated", description: `${nights} night${nights > 1 ? 's' : ''} from ${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()}` });
    setEditingItem(null);
  };

  // Calculate totals with platform fees
  const { baseSubtotal, stayDiscountTotal, subtotal, serviceFees, discount, total, currency: displayCurrency } = useMemo(() => {
    let baseSubtotalAmount = 0;
    let stayDiscountAmount = 0;
    let feesAmount = 0;
    const curr = preferredCurrency || "RWF";

    cartItems.forEach((item) => {
      // For properties, use nights from metadata; for other items use quantity
      const isProperty = item.item_type === 'property';
      const nights = isProperty && item.metadata?.nights ? item.metadata.nights : 1;
      const multiplier = isProperty ? nights : item.quantity;
      
      // Calculate base price (before any discounts)
      const baseItemTotal = item.price * multiplier;
      const convertedBase = convertAmount(baseItemTotal, item.currency, curr, usdRates) ?? baseItemTotal;
      baseSubtotalAmount += convertedBase;
      
      // Calculate weekly/monthly discounts for properties
      let itemDiscount = 0;
      if (isProperty) {
        const stayDiscountPercent = nights >= 28 && item.monthly_discount 
          ? item.monthly_discount 
          : nights >= 7 && item.weekly_discount 
            ? item.weekly_discount 
            : 0;
        if (stayDiscountPercent > 0) {
          itemDiscount = convertedBase * (stayDiscountPercent / 100);
          stayDiscountAmount += itemDiscount;
        }
      }
      
      // Calculate platform fees on the discounted amount
      const afterDiscount = convertedBase - itemDiscount;
      if (isProperty) {
        const { platformFee } = calculateGuestTotal(afterDiscount, 'accommodation');
        feesAmount += platformFee;
      }
      // Tours: no guest fee
    });

    // Calculate promo code discount (applied after stay discounts)
    const subtotalAfterStay = baseSubtotalAmount - stayDiscountAmount;
    let promoDiscountAmount = 0;
    if (appliedDiscount) {
      if (appliedDiscount.discount_type === 'percentage') {
        promoDiscountAmount = subtotalAfterStay * (appliedDiscount.discount_value / 100);
      } else {
        const converted = convertAmount(appliedDiscount.discount_value, appliedDiscount.currency, curr, usdRates);
        promoDiscountAmount = converted ?? 0;
      }
      if (appliedDiscount.minimum_amount && subtotalAfterStay < appliedDiscount.minimum_amount) {
        promoDiscountAmount = 0;
      }
    }

    return {
      baseSubtotal: baseSubtotalAmount,
      stayDiscountTotal: stayDiscountAmount,
      subtotal: subtotalAfterStay,
      serviceFees: feesAmount,
      discount: promoDiscountAmount,
      total: subtotalAfterStay + feesAmount - promoDiscountAmount,
      currency: curr,
    };
  }, [cartItems, preferredCurrency, usdRates, appliedDiscount]);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'property': return <Home className="w-4 h-4" />;
      case 'tour':
      case 'tour_package': return <MapPin className="w-4 h-4" />;
      case 'transport_vehicle': return <Car className="w-4 h-4" />;
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const handleClearCart = async () => {
    await clearCart();
    setAppliedDiscount(null);
    setDiscountCode("");
  };

  const handleProceedToCheckout = () => {
    const params = new URLSearchParams({ mode: 'cart' });
    if (appliedDiscount) params.set('discountCode', appliedDiscount.code);
    navigate(`/checkout?${params.toString()}`);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-light tracking-tight">Your Trip</h1>
          <p className="text-muted-foreground mt-1">
            {cartItems.length === 0 ? "Your cart is empty" : `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''} in your cart`}
          </p>
        </div>

        {cartItems.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-medium mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start exploring our amazing tours, stays, and transport options to plan your perfect trip.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/tours">
                <Button variant="outline">Explore Tours</Button>
              </Link>
              <Link to="/stays">
                <Button variant="outline">Find Stays</Button>
              </Link>
              <Link to="/transport">
                <Button variant="outline">Book Transport</Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Cart Content */
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const pricePerUnit = convertAmount(item.price, item.currency, displayCurrency, usdRates) ?? item.price;
                const isAccommodation = item.item_type === 'property';
                // For properties, multiply by nights from metadata
                const nights = item.metadata?.nights || item.quantity;
                
                // Calculate stay discount for properties
                const stayDiscount = isAccommodation && nights 
                  ? (nights >= 28 && item.monthly_discount ? item.monthly_discount : nights >= 7 && item.weekly_discount ? item.weekly_discount : 0)
                  : 0;
                
                const basePrice = isAccommodation ? pricePerUnit * nights : pricePerUnit;
                const discountAmount = basePrice * (stayDiscount / 100);
                const itemPrice = basePrice - discountAmount;
                const { platformFee } = isAccommodation ? calculateGuestTotal(itemPrice, 'accommodation') : { platformFee: 0 };
                
                return (
                  <div 
                    key={item.id} 
                    className="group bg-card rounded-xl md:rounded-2xl border border-border/50 overflow-hidden hover:border-border transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="sm:w-32 md:w-48 h-28 sm:h-auto bg-muted relative shrink-0">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getItemIcon(item.item_type)}
                          </div>
                        )}
                        {/* Type Badge */}
                        <div className="absolute top-2 left-2">
                          <span className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full",
                            item.item_type === 'property' && "bg-emerald-500/90 text-white",
                            item.item_type === 'tour' && "bg-blue-500/90 text-white",
                            item.item_type === 'tour_package' && "bg-purple-500/90 text-white",
                            item.item_type === 'transport_vehicle' && "bg-orange-500/90 text-white",
                          )}>
                            {item.item_type === 'tour_package' ? 'Package' : item.item_type.replace('_', ' ').replace('transport ', '')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm md:text-lg line-clamp-1">{item.title}</h3>
                          {item.meta && (
                            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{item.meta}</span>
                            </p>
                          )}
                          
                          {/* Show dates and stay info for properties */}
                          {item.item_type === 'property' && (
                            <div className="mt-1.5 md:mt-2">
                              {item.metadata?.check_in && item.metadata?.check_out ? (
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    {new Date(item.metadata.check_in).toLocaleDateString('en-US', {month:'short', day:'numeric'})} - {new Date(item.metadata.check_out).toLocaleDateString('en-US', {month:'short', day:'numeric'})}
                                  </span>
                                  {item.metadata.nights && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                      {item.metadata.nights}n
                                    </span>
                                  )}
                                  {item.metadata.guests && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                      {item.metadata.guests}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleEditDates(item)}
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEditDates(item)}
                                  className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                                >
                                  <Calendar className="w-3 h-3" />
                                  Add dates to continue
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-end justify-between mt-3 md:mt-4">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="flex items-center border rounded-lg">
                              <button 
                                onClick={() => updateQuantity?.(item.id, Math.max(1, item.quantity - 1))}
                                className="p-1.5 md:p-2 hover:bg-muted transition-colors"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                              <span className="px-2 md:px-3 text-xs md:text-sm font-medium">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity?.(item.id, item.quantity + 1)}
                                className="p-1.5 md:p-2 hover:bg-muted transition-colors"
                              >
                                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="p-1.5 md:p-2 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm md:text-lg font-semibold">
                              {formatMoney(itemPrice, displayCurrency)}
                            </p>
                            {isAccommodation && item.metadata?.nights && (
                              <p className="text-[10px] md:text-xs text-muted-foreground">
                                {formatMoney(pricePerUnit, displayCurrency)}/night × {nights}n
                                {stayDiscount > 0 && <span className="text-emerald-600 dark:text-emerald-400 ml-1">({stayDiscount}% off)</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border/50 p-6 sticky top-24">
                <h2 className="text-lg font-semibold mb-6">Order Summary</h2>
                
                {/* Discount Code */}
                <div className="mb-6">
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Discount Code
                  </label>
                  {!appliedDiscount ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        className="flex-1 h-10"
                        disabled={validatingCode}
                        onKeyDown={(e) => e.key === 'Enter' && applyDiscountCode()}
                      />
                      <Button 
                        onClick={applyDiscountCode} 
                        disabled={!discountCode.trim() || validatingCode}
                        variant="outline"
                        className="h-10 px-4"
                      >
                        {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg px-3 py-2">
                      <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300 flex-1">
                        {appliedDiscount.code}
                      </span>
                      <button
                        onClick={() => { setAppliedDiscount(null); setDiscountCode(""); }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 text-sm">
                  {/* Base subtotal (before any discounts) */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base price</span>
                    <span>{formatMoney(baseSubtotal, displayCurrency)}</span>
                  </div>
                  
                  {/* Weekly/Monthly stay discount */}
                  {stayDiscountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Stay discount
                      </span>
                      <span>-{formatMoney(stayDiscountTotal, displayCurrency)}</span>
                    </div>
                  )}
                  
                  {/* Subtotal after stay discounts */}
                  {stayDiscountTotal > 0 && (
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatMoney(subtotal, displayCurrency)}</span>
                    </div>
                  )}
                  
                  {/* Platform service fees */}
                  {serviceFees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service fees</span>
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
                  {appliedDiscount && appliedDiscount.minimum_amount && subtotal < appliedDiscount.minimum_amount && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Min. {formatMoney(appliedDiscount.minimum_amount, appliedDiscount.currency)} required for discount
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-baseline py-4 mt-4 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold">{formatMoney(total, displayCurrency)}</span>
                </div>

                {/* Actions */}
                <div className="space-y-3 mt-6">
                  <Button 
                    size="lg" 
                    className="w-full h-12 text-base"
                    onClick={handleProceedToCheckout}
                  >
                    Proceed to Payment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearCart} 
                    className="w-full text-muted-foreground hover:text-destructive"
                  >
                    Clear Cart
                  </Button>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Secure checkout with PawaPay
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dates Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">Edit Booking Dates</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Property Info */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                  {editingItem.image ? (
                    <img src={editingItem.image} alt={editingItem.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium line-clamp-1">{editingItem.title}</h4>
                  <p className="text-sm text-muted-foreground">{formatMoney(editingItem.price, editingItem.currency)}/night</p>
                </div>
              </div>
              
              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="check-in">Check-in</Label>
                  <Input
                    id="check-in"
                    type="date"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check-out">Check-out</Label>
                  <Input
                    id="check-out"
                    type="date"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    min={editCheckIn || new Date().toISOString().split('T')[0]}
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Guests */}
              <div className="space-y-2">
                <Label htmlFor="guests">Guests</Label>
                <div className="flex items-center border rounded-lg w-fit">
                  <button 
                    onClick={() => setEditGuests(Math.max(1, editGuests - 1))}
                    className="p-2 hover:bg-muted transition-colors"
                    disabled={editGuests <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-medium">{editGuests}</span>
                  <button 
                    onClick={() => setEditGuests(editGuests + 1)}
                    className="p-2 hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Summary */}
              {editCheckIn && editCheckOut && new Date(editCheckOut) > new Date(editCheckIn) && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {Math.ceil((new Date(editCheckOut).getTime() - new Date(editCheckIn).getTime()) / (1000 * 60 * 60 * 24))} nights × {formatMoney(editingItem.price, editingItem.currency)}
                    </span>
                    <span className="font-medium">
                      {formatMoney(
                        editingItem.price * Math.ceil((new Date(editCheckOut).getTime() - new Date(editCheckIn).getTime()) / (1000 * 60 * 60 * 24)),
                        editingItem.currency
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveDates}
                disabled={!editCheckIn || !editCheckOut}
              >
                Save Dates
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
