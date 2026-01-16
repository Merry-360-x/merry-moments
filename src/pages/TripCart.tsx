import { useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/hooks/usePreferences";
import { formatMoney } from "@/lib/money";
import { useTripCart } from "@/hooks/useTripCart";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { Trash2 } from "lucide-react";

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

export default function TripCart() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { currency: preferredCurrency } = usePreferences();
  const { guestCart, removeFromCart, clearCart } = useTripCart();
  const { usdRates } = useFxRates();

  // Single optimized query for cart data
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["trip_cart", user?.id, guestCart.map(i => i.id).join(",")],
    queryFn: async () => {
      if (user) {
        // Authenticated user - fetch from database with all details in one query
        const { data, error } = await supabase
          .from("trip_cart_items")
          .select(`
            id,
            item_type,
            reference_id,
            quantity,
            created_at
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        if (!data || data.length === 0) return [];

        // Fetch all item details in parallel
        const items = await Promise.all(
          data.map(async (item) => {
            let details: any = null;

            try {
              if (item.item_type === "tour") {
                const { data: tour } = await supabase
                  .from("tours")
                  .select("id, title, price_per_person, currency, images, duration_days")
                  .eq("id", item.reference_id)
                  .single();
                details = tour ? {
                  title: tour.title,
                  price: tour.price_per_person,
                  currency: tour.currency || "RWF",
                  image: tour.images?.[0],
                  meta: `${tour.duration_days} day${tour.duration_days === 1 ? "" : "s"}`,
                } : null;
              } else if (item.item_type === "property") {
                const { data: property } = await supabase
                  .from("properties")
                  .select("id, title, price_per_night, currency, images, location")
                  .eq("id", item.reference_id)
                  .single();
                details = property ? {
                  title: property.title,
                  price: property.price_per_night,
                  currency: property.currency || "RWF",
                  image: property.images?.[0],
                  meta: property.location,
                } : null;
              } else if (item.item_type === "transport_vehicle") {
                const { data: vehicle } = await supabase
                  .from("transport_vehicles")
                  .select("id, title, price_per_day, currency, image_url, vehicle_type, seats")
                  .eq("id", item.reference_id)
                  .single();
                details = vehicle ? {
                  title: vehicle.title,
                  price: vehicle.price_per_day,
                  currency: vehicle.currency || "RWF",
                  image: vehicle.image_url,
                  meta: `${vehicle.vehicle_type} • ${vehicle.seats} seats`,
                } : null;
              } else if (item.item_type === "transport_route") {
                const { data: route } = await supabase
                  .from("transport_routes")
                  .select("id, from_location, to_location, base_price, currency")
                  .eq("id", item.reference_id)
                  .single();
                details = route ? {
                  title: `${route.from_location} → ${route.to_location}`,
                  price: route.base_price,
                  currency: route.currency || "RWF",
                  meta: "Route",
                } : null;
              }
            } catch (err) {
              console.warn(`Failed to fetch details for ${item.item_type} ${item.reference_id}:`, err);
            }

            if (!details) return null;

            return {
              id: item.id,
              item_type: item.item_type,
              reference_id: item.reference_id,
              quantity: item.quantity,
              ...details,
            } as CartItem;
          })
        );

        return items.filter(Boolean) as CartItem[];
      } else {
        // Guest user - fetch from localStorage references
        if (guestCart.length === 0) return [];

        const items = await Promise.all(
          guestCart.map(async (item) => {
            let details: any = null;

            try {
              if (item.item_type === "tour") {
                const { data: tour } = await supabase
                  .from("tours")
                  .select("id, title, price_per_person, currency, images, duration_days")
                  .eq("id", item.reference_id)
                  .single();
                details = tour ? {
                  title: tour.title,
                  price: tour.price_per_person,
                  currency: tour.currency || "RWF",
                  image: tour.images?.[0],
                  meta: `${tour.duration_days} day${tour.duration_days === 1 ? "" : "s"}`,
                } : null;
              } else if (item.item_type === "property") {
                const { data: property } = await supabase
                  .from("properties")
                  .select("id, title, price_per_night, currency, images, location")
                  .eq("id", item.reference_id)
                  .single();
                details = property ? {
                  title: property.title,
                  price: property.price_per_night,
                  currency: property.currency || "RWF",
                  image: property.images?.[0],
                  meta: property.location,
                } : null;
              } else if (item.item_type === "transport_vehicle") {
                const { data: vehicle } = await supabase
                  .from("transport_vehicles")
                  .select("id, title, price_per_day, currency, image_url, vehicle_type, seats")
                  .eq("id", item.reference_id)
                  .single();
                details = vehicle ? {
                  title: vehicle.title,
                  price: vehicle.price_per_day,
                  currency: vehicle.currency || "RWF",
                  image: vehicle.image_url,
                  meta: `${vehicle.vehicle_type} • ${vehicle.seats} seats`,
                } : null;
              } else if (item.item_type === "transport_route") {
                const { data: route } = await supabase
                  .from("transport_routes")
                  .select("id, from_location, to_location, base_price, currency")
                  .eq("id", item.reference_id)
                  .single();
                details = route ? {
                  title: `${route.from_location} → ${route.to_location}`,
                  price: route.base_price,
                  currency: route.currency || "RWF",
                  meta: "Route",
                } : null;
              }
            } catch (err) {
              console.warn(`Failed to fetch details for ${item.item_type} ${item.reference_id}:`, err);
            }

            if (!details) return null;

            return {
              id: item.id,
              item_type: item.item_type,
              reference_id: item.reference_id,
              quantity: item.quantity,
              ...details,
            } as CartItem;
          })
        );

        return items.filter(Boolean) as CartItem[];
      }
    },
    staleTime: 10_000, // 10 seconds
    enabled: !authLoading,
  });

  // Calculate totals
  const { total, totalCurrency } = useMemo(() => {
    let amount = 0;
    let currency: string = preferredCurrency || "RWF";

    cartItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      const converted = convertAmount(itemTotal, item.currency, preferredCurrency || "RWF", usdRates);
      if (converted !== null) {
        amount += converted;
        currency = preferredCurrency || "RWF";
      } else {
        amount += itemTotal;
        currency = item.currency;
      }
    });

    return { total: amount, totalCurrency: currency };
  }, [cartItems, preferredCurrency, usdRates]);

  const getItemLink = (item: CartItem) => {
    switch (item.item_type) {
      case "property":
        return `/properties/${item.reference_id}`;
      case "tour":
        return "/tours";
      case "transport_vehicle":
      case "transport_route":
        return "/transport";
      default:
        return null;
    }
  };

  const handleClearCart = async () => {
    await clearCart();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("actions.tripCart")}</h1>
        <p className="text-muted-foreground mb-8">{t("tripCart.subtitle")}</p>

        {!user && cartItems.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-foreground">
              <strong>You're browsing as a guest.</strong>{" "}
              <Link to="/auth?redirect=/trip-cart" className="text-primary hover:underline">
                Sign in
              </Link>{" "}
              to save your cart across devices.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="bg-card rounded-xl shadow-card p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your cart…</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-8 text-center">
            <p className="text-muted-foreground mb-6">{t("tripCart.empty")}</p>
            <Link to="/accommodations">
              <Button>{t("tripCart.browse")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cart summary */}
            <div className="bg-card rounded-xl shadow-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-foreground">
                <span className="font-semibold">Total ({cartItems.length} {cartItems.length === 1 ? "item" : "items"}): </span>
                <span className="font-bold text-lg">
                  {formatMoney(total, totalCurrency)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/checkout?mode=cart">
                  <Button size="lg">Proceed to Checkout</Button>
                </Link>
                <Button variant="outline" size="lg" onClick={handleClearCart}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Cart items */}
            {cartItems.map((item) => {
              const itemLink = getItemLink(item);
              const itemPrice = convertAmount(item.price, item.currency, preferredCurrency || "RWF", usdRates) ?? item.price;
              const displayCurrency = convertAmount(item.price, item.currency, preferredCurrency || "RWF", usdRates) !== null
                ? (preferredCurrency || "RWF")
                : item.currency;

              return (
                <div key={item.id} className="bg-card rounded-xl shadow-card p-4 flex flex-col md:flex-row gap-4 hover:shadow-lg transition-shadow">
                  {/* Image */}
                  <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    {item.image ? (
                      itemLink ? (
                        <Link to={itemLink}>
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        </Link>
                      ) : (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {itemLink ? (
                        <Link to={itemLink} className="font-semibold text-lg text-foreground hover:text-primary hover:underline">
                          {item.title}
                        </Link>
                      ) : (
                        <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>
                      )}
                      {item.meta && (
                        <p className="text-sm text-muted-foreground mt-1">{item.meta}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{item.item_type.replace("_", " ")}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Qty: </span>
                        <span className="font-medium">{item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg text-foreground">
                            {formatMoney(itemPrice * item.quantity, displayCurrency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatMoney(itemPrice, displayCurrency)} each
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
