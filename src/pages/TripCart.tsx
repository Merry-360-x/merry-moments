import { useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Optimized query with parallel fetching and caching
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["trip_cart", user?.id, guestCart.map(i => i.id).join(",")],
    queryFn: async () => {
      if (user) {
        // Authenticated user - fetch from database
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

        // Batch fetch all items by type for better performance
        const tourIds = data.filter(d => d.item_type === 'tour').map(d => d.reference_id);
        const packageIds = data.filter(d => d.item_type === 'tour_package').map(d => d.reference_id);
        const propertyIds = data.filter(d => d.item_type === 'property').map(d => d.reference_id);
        const vehicleIds = data.filter(d => d.item_type === 'transport_vehicle').map(d => d.reference_id);
        const routeIds = data.filter(d => d.item_type === 'transport_route').map(d => d.reference_id);

        // Fetch all data in parallel batches
        const [tours, packages, properties, vehicles, routes] = await Promise.all([
          tourIds.length > 0 
            ? supabase.from('tours').select('id, title, price_per_person, currency, images, duration_days').in('id', tourIds).then(r => r.data || [])
            : Promise.resolve([]),
          packageIds.length > 0
            ? supabase.from('tour_packages').select('id, title, price_per_adult, currency, cover_image, gallery_images, duration').in('id', packageIds).then(r => r.data || [])
            : Promise.resolve([]),
          propertyIds.length > 0
            ? supabase.from('properties').select('id, title, price_per_night, currency, images, location').in('id', propertyIds).then(r => r.data || [])
            : Promise.resolve([]),
          vehicleIds.length > 0
            ? supabase.from('transport_vehicles').select('id, title, price_per_day, currency, image_url, vehicle_type, seats').in('id', vehicleIds).then(r => r.data || [])
            : Promise.resolve([]),
          routeIds.length > 0
            ? supabase.from('transport_routes').select('id, from_location, to_location, base_price, currency').in('id', routeIds).then(r => r.data || [])
            : Promise.resolve([])
        ]);

        // Create lookup maps for O(1) access
        const tourMap = new Map(tours.map(t => [t.id, t]));
        const packageMap = new Map(packages.map(p => [p.id, p]));
        const propertyMap = new Map(properties.map(p => [p.id, p]));
        const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
        const routeMap = new Map(routes.map(r => [r.id, r]));

        // Map cart items to their details using lookup maps for O(1) access
        const items = data.map((item) => {
          let details: any = null;

          if (item.item_type === "tour") {
            const tour = tourMap.get(item.reference_id);
            if (tour) {
              details = {
                title: tour.title,
                price: tour.price_per_person,
                currency: tour.currency || "RWF",
                image: tour.images?.[0],
                meta: `${tour.duration_days} day${tour.duration_days === 1 ? "" : "s"}`,
              };
            }
          } else if (item.item_type === "tour_package") {
            const pkg = packageMap.get(item.reference_id);
            if (pkg) {
              const durationDays = parseInt(pkg.duration) || 1;
              details = {
                title: pkg.title,
                price: pkg.price_per_adult,
                currency: pkg.currency || "RWF",
                image: pkg.cover_image || (Array.isArray(pkg.gallery_images) && pkg.gallery_images[0]) || null,
                meta: `Tour Package • ${durationDays} day${durationDays === 1 ? "" : "s"}`,
              };
            }
          } else if (item.item_type === "property") {
            const property = propertyMap.get(item.reference_id);
            if (property) {
              details = {
                title: property.title,
                price: property.price_per_night,
                currency: property.currency || "RWF",
                image: property.images?.[0],
                meta: property.location,
              };
            }
          } else if (item.item_type === "transport_vehicle") {
            const vehicle = vehicleMap.get(item.reference_id);
            if (vehicle) {
              details = {
                title: vehicle.title,
                price: vehicle.price_per_day,
                currency: vehicle.currency || "RWF",
                image: vehicle.image_url,
                meta: `${vehicle.vehicle_type} • ${vehicle.seats} seats`,
              };
            }
          } else if (item.item_type === "transport_route") {
            const route = routeMap.get(item.reference_id);
            if (route) {
              details = {
                title: `${route.from_location} → ${route.to_location}`,
                price: route.base_price,
                currency: route.currency || "RWF",
                meta: "Route",
              };
            }
          }

          if (!details) return null;

          return {
            id: item.id,
            item_type: item.item_type,
            reference_id: item.reference_id,
            quantity: item.quantity,
            ...details,
          } as CartItem;
        });

        return items.filter(Boolean) as CartItem[];
      } else {
        // Guest user - batch fetch from localStorage references
        if (guestCart.length === 0) return [];

        // Batch fetch all items by type for better performance
        const tourIds = guestCart.filter(i => i.item_type === 'tour').map(i => i.reference_id);
        const packageIds = guestCart.filter(i => i.item_type === 'tour_package').map(i => i.reference_id);
        const propertyIds = guestCart.filter(i => i.item_type === 'property').map(i => i.reference_id);
        const vehicleIds = guestCart.filter(i => i.item_type === 'transport_vehicle').map(i => i.reference_id);
        const routeIds = guestCart.filter(i => i.item_type === 'transport_route').map(i => i.reference_id);

        // Fetch all data in parallel batches
        const [tours, packages, properties, vehicles, routes] = await Promise.all([
          tourIds.length > 0 
            ? supabase.from('tours').select('id, title, price_per_person, currency, images, duration_days').in('id', tourIds).then(r => r.data || [])
            : Promise.resolve([]),
          packageIds.length > 0
            ? supabase.from('tour_packages').select('id, title, price_per_adult, currency, cover_image, gallery_images, duration').in('id', packageIds).then(r => r.data || [])
            : Promise.resolve([]),
          propertyIds.length > 0
            ? supabase.from('properties').select('id, title, price_per_night, currency, images, location').in('id', propertyIds).then(r => r.data || [])
            : Promise.resolve([]),
          vehicleIds.length > 0
            ? supabase.from('transport_vehicles').select('id, title, price_per_day, currency, image_url, vehicle_type, seats').in('id', vehicleIds).then(r => r.data || [])
            : Promise.resolve([]),
          routeIds.length > 0
            ? supabase.from('transport_routes').select('id, from_location, to_location, base_price, currency').in('id', routeIds).then(r => r.data || [])
            : Promise.resolve([])
        ]);

        // Create lookup maps for O(1) access
        const tourMap = new Map(tours.map(t => [t.id, t]));
        const packageMap = new Map(packages.map(p => [p.id, p]));
        const propertyMap = new Map(properties.map(p => [p.id, p]));
        const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
        const routeMap = new Map(routes.map(r => [r.id, r]));

        const items = guestCart.map((item) => {
          let details: any = null;

          if (item.item_type === "tour") {
            const tour = tourMap.get(item.reference_id);
            if (tour) {
              details = {
                title: tour.title,
                price: tour.price_per_person,
                currency: tour.currency || "RWF",
                image: tour.images?.[0],
                meta: `${tour.duration_days} day${tour.duration_days === 1 ? "" : "s"}`,
              };
            }
          } else if (item.item_type === "tour_package") {
            const pkg = packageMap.get(item.reference_id);
            if (pkg) {
              const durationDays = parseInt(pkg.duration) || 1;
              details = {
                title: pkg.title,
                price: pkg.price_per_adult,
                currency: pkg.currency || "RWF",
                image: pkg.cover_image || (Array.isArray(pkg.gallery_images) && pkg.gallery_images[0]) || null,
                meta: `Tour Package • ${durationDays} day${durationDays === 1 ? "" : "s"}`,
              };
            }
          } else if (item.item_type === "property") {
            const property = propertyMap.get(item.reference_id);
            if (property) {
              details = {
                title: property.title,
                price: property.price_per_night,
                currency: property.currency || "RWF",
                image: property.images?.[0],
                meta: property.location,
              };
            }
          } else if (item.item_type === "transport_vehicle") {
            const vehicle = vehicleMap.get(item.reference_id);
            if (vehicle) {
              details = {
                title: vehicle.title,
                price: vehicle.price_per_day,
                currency: vehicle.currency || "RWF",
                image: vehicle.image_url,
                meta: `${vehicle.vehicle_type} • ${vehicle.seats} seats`,
              };
            }
          } else if (item.item_type === "transport_route") {
            const route = routeMap.get(item.reference_id);
            if (route) {
              details = {
                title: `${route.from_location} → ${route.to_location}`,
                price: route.base_price,
                currency: route.currency || "RWF",
                meta: "Route",
              };
            }
          }

          if (!details) return null;

          return {
            id: item.id,
            item_type: item.item_type,
            reference_id: item.reference_id,
            quantity: item.quantity,
            ...details,
          } as CartItem;
        });

        return items.filter(Boolean) as CartItem[];
      }
    },
    staleTime: 30_000, // 30 seconds - keep data reasonably fresh
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !authLoading,
    refetchOnMount: true, // Always refetch on mount to show latest cart
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Manual cleanup only - no auto-cleanup to prevent accidental data loss
  // Items can be manually removed using the remove button

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
      case "tour_package":
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
          <div className="space-y-4">
            {/* Show warning if guest cart has items but none loaded */}
            {!user && guestCart.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Cart items couldn't be loaded
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                      You have {guestCart.length} item{guestCart.length > 1 ? 's' : ''} in your cart, but they couldn't be loaded. 
                      This usually means the items no longer exist or aren't published.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleClearCart}
                        className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear cart
                      </Button>
                      <Link to="/accommodations">
                        <Button size="sm" variant="default">
                          Browse properties
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-card rounded-xl shadow-card p-8 text-center">
              <p className="text-muted-foreground mb-6">{t("tripCart.empty")}</p>
              <Link to="/accommodations">
                <Button>{t("tripCart.browse")}</Button>
              </Link>
            </div>
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
                      <div className="flex items-center gap-2 mb-1">
                        {itemLink ? (
                          <Link to={itemLink} className="font-semibold text-lg text-foreground hover:text-primary hover:underline">
                            {item.title}
                          </Link>
                        ) : (
                          <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>
                        )}
                        {item.item_type === "tour" && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                            Tour
                          </Badge>
                        )}
                        {item.item_type === "tour_package" && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                            Package
                          </Badge>
                        )}
                      </div>
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
