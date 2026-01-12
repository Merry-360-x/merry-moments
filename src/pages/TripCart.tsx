import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { usePreferences } from "@/hooks/usePreferences";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

type CartItemRow = Pick<Tables<"trip_cart_items">, "id" | "item_type" | "reference_id" | "quantity" | "created_at">;

type TourDetailRow = Pick<Tables<"tours">, "id" | "title" | "price_per_person" | "currency" | "images" | "duration_days">;
type TransportServiceDetailRow = Pick<Tables<"transport_services">, "id" | "title" | "description">;
type TransportVehicleDetailRow = Pick<
  Tables<"transport_vehicles">,
  "id" | "title" | "vehicle_type" | "seats" | "price_per_day" | "currency" | "image_url"
>;
type TransportRouteDetailRow = Pick<Tables<"transport_routes">, "id" | "from_location" | "to_location" | "base_price" | "currency">;

type CartDetails =
  | { type: "tour"; title: string; price: number; currency: string; image?: string | null; meta?: string }
  | { type: "property"; title: string; price: number; currency: string; image?: string | null; meta?: string }
  | { type: "transport_vehicle"; title: string; price: number; currency: string; image?: string | null; meta?: string }
  | { type: "transport_route"; title: string; price: number; currency: string; image?: string | null; meta?: string }
  | { type: "transport_service"; title: string; price: number; currency: string; image?: string | null; meta?: string };

export default function TripCart() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { currency: preferredCurrency } = usePreferences();

  const { data, isLoading } = useQuery({
    queryKey: ["trip_cart_items", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_cart_items")
        .select("id, item_type, reference_id, quantity, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const items = (data as CartItemRow[] | null) ?? [];

      // Fetch details per type.
      const byType = {
        tour: items.filter((i) => i.item_type === "tour"),
        property: items.filter((i) => i.item_type === "property"),
        transport_service: items.filter((i) => i.item_type === "transport_service"),
        transport_vehicle: items.filter((i) => i.item_type === "transport_vehicle"),
        transport_route: items.filter((i) => i.item_type === "transport_route"),
      };

      const tourIds = byType.tour.map((i) => i.reference_id);
      const propertyIds = byType.property.map((i) => i.reference_id);
      const serviceIds = byType.transport_service.map((i) => i.reference_id);
      const vehicleIds = byType.transport_vehicle.map((i) => i.reference_id);
      const routeIds = byType.transport_route.map((i) => i.reference_id);

      const [toursRes, propertiesRes, servicesRes, vehiclesRes, routesRes] = await Promise.all([
        tourIds.length
          ? supabase
              .from("tours")
              .select("id, title, price_per_person, currency, images, duration_days")
              .in("id", tourIds)
          : Promise.resolve({ data: [], error: null } as const),
        propertyIds.length
          ? supabase
              .from("properties")
              .select("id, title, price_per_night, currency, images, location")
              .in("id", propertyIds)
          : Promise.resolve({ data: [], error: null } as const),
        serviceIds.length
          ? supabase
              .from("transport_services")
              .select("id, title, description")
              .in("id", serviceIds)
          : Promise.resolve({ data: [], error: null } as const),
        vehicleIds.length
          ? supabase
              .from("transport_vehicles")
              .select("id, title, vehicle_type, seats, price_per_day, currency, image_url")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [], error: null } as const),
        routeIds.length
          ? supabase
              .from("transport_routes")
              .select("id, from_location, to_location, base_price, currency")
              .in("id", routeIds)
          : Promise.resolve({ data: [], error: null } as const),
      ]);

      const tours = new Map(
        ((toursRes.data as TourDetailRow[] | null) ?? []).map((r) => [
          String(r.id),
          {
            title: String(r.title),
            price: Number(r.price_per_person ?? 0),
            currency: String(r.currency ?? "RWF"),
            image: (r.images as string[] | null)?.[0] ?? null,
            meta: `${Number(r.duration_days ?? 1)} day${Number(r.duration_days ?? 1) === 1 ? "" : "s"}`,
          },
        ])
      );

      const properties = new Map(
        ((propertiesRes.data as Array<{
          id: string;
          title: string;
          price_per_night: number;
          currency: string | null;
          images: string[] | null;
          location: string;
        }> | null) ?? []).map((r) => [
          String(r.id),
          {
            title: String(r.title),
            price: Number(r.price_per_night ?? 0),
            currency: String(r.currency ?? "RWF"),
            image: (r.images as string[] | null)?.[0] ?? null,
            meta: String(r.location ?? ""),
          },
        ])
      );

      const services = new Map(
        ((servicesRes.data as TransportServiceDetailRow[] | null) ?? []).map((r) => [
          String(r.id),
          {
            title: String(r.title),
            meta: r.description ? String(r.description) : undefined,
          },
        ])
      );

      const vehicles = new Map(
        ((vehiclesRes.data as TransportVehicleDetailRow[] | null) ?? []).map((r) => [
          String(r.id),
          {
            title: String(r.title),
            price: Number(r.price_per_day ?? 0),
            currency: String(r.currency ?? "RWF"),
            image: (r.image_url as string | null) ?? null,
            meta: `${String(r.vehicle_type ?? "Vehicle")} • ${Number(r.seats ?? 0)} seats`,
          },
        ])
      );

      const routes = new Map(
        ((routesRes.data as TransportRouteDetailRow[] | null) ?? []).map((r) => [
          String(r.id),
          {
            title: `${String(r.from_location)} → ${String(r.to_location)}`,
            price: Number(r.base_price ?? 0),
            currency: String(r.currency ?? "RWF"),
          },
        ])
      );

      const detailed = items.map((i) => {
        if (i.item_type === "tour") {
          const d = tours.get(i.reference_id);
          return { item: i, details: d ? ({ type: "tour", ...d } as CartDetails) : null };
        }
        if (i.item_type === "property") {
          const d = properties.get(i.reference_id);
          return { item: i, details: d ? ({ type: "property", ...d } as CartDetails) : null };
        }
        if (i.item_type === "transport_vehicle") {
          const d = vehicles.get(i.reference_id);
          return {
            item: i,
            details: d ? ({ type: "transport_vehicle", ...d } as CartDetails) : null,
          };
        }
        if (i.item_type === "transport_route") {
          const d = routes.get(i.reference_id);
          return {
            item: i,
            details: d ? ({ type: "transport_route", ...d } as CartDetails) : null,
          };
        }

        const s = services.get(i.reference_id);
        return {
          item: i,
          details: s
            ? ({
                type: "transport_service",
                title: s.title,
                price: 0,
                currency: "RWF",
                meta: s.meta,
              } as CartDetails)
            : null,
        };
      });

      const totals = detailed.reduce(
        (acc, row) => {
          if (!row.details) return acc;
          const unit = Number(row.details.price ?? 0);
          acc.amount += unit * Number(row.item.quantity ?? 1);
          acc.currency = row.details.currency || acc.currency;
          return acc;
        },
        { amount: 0, currency: "RWF" }
      );

      return { rows: detailed, totals };
    },
  });

  const removeItem = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("trip_cart_items").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      logError("tripCart.removeItem", error);
      toast({
        variant: "destructive",
        title: "Could not remove item",
        description: uiErrorMessage(error, "Please try again."),
      });
      return;
    }
    toast({ title: "Removed", description: "Item removed from your Trip Cart." });
    await qc.invalidateQueries({ queryKey: ["trip_cart_items", user.id] });
  };

  const clearCart = async () => {
    if (!user) return;
    const { error } = await supabase.from("trip_cart_items").delete().eq("user_id", user.id);
    if (error) {
      logError("tripCart.clearCart", error);
      toast({
        variant: "destructive",
        title: "Could not clear cart",
        description: uiErrorMessage(error, "Please try again."),
      });
      return;
    }
    toast({ title: "Trip Cart cleared" });
    await qc.invalidateQueries({ queryKey: ["trip_cart_items", user.id] });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("actions.tripCart")}</h1>
          <p className="text-muted-foreground mb-8">Please sign in to view your Trip Cart.</p>
          <Link to="/login?redirect=/trip-cart">
            <Button>Sign In</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("actions.tripCart")}</h1>
        <p className="text-muted-foreground mb-8">{t("tripCart.subtitle")}</p>

        {isLoading ? (
          <div className="bg-card rounded-xl shadow-card p-8 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your cart…</p>
          </div>
        ) : (data?.rows?.length ?? 0) === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-8 text-center">
            <p className="text-muted-foreground mb-6">{t("tripCart.empty")}</p>
            <Link to="/accommodations">
              <Button>{t("tripCart.browse")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card rounded-xl shadow-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-foreground">
                <span className="font-semibold">Estimated total: </span>
                <span className="font-bold">
                  {formatMoney(Number(data?.totals.amount ?? 0), String(data?.totals.currency ?? preferredCurrency))}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={clearCart}>Clear cart</Button>
              </div>
            </div>

            {data!.rows.map(({ item, details }) => {
              // Determine the link based on item type
              const itemLink =
                item.item_type === "property"
                  ? `/properties/${item.reference_id}`
                  : item.item_type === "tour"
                  ? `/tours`
                  : item.item_type === "transport_vehicle" || item.item_type === "transport_route"
                  ? `/transport`
                  : null;

              return (
                <div key={item.id} className="bg-card rounded-xl shadow-card p-5 flex flex-col md:flex-row gap-4">
                  {itemLink ? (
                    <Link to={itemLink} className="block w-full md:w-40 h-36 rounded-lg overflow-hidden">
                      {details?.image ? (
                        <img
                          src={details.image}
                          alt={details.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </Link>
                  ) : details?.image ? (
                    <img
                      src={details.image}
                      alt={details.title}
                      className="w-full md:w-40 h-36 object-cover rounded-lg"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full md:w-40 h-36 bg-muted rounded-lg" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {itemLink ? (
                          <Link to={itemLink} className="font-semibold text-foreground hover:text-primary hover:underline">
                            {details?.title ?? "Item"}
                          </Link>
                        ) : (
                          <div className="font-semibold text-foreground">{details?.title ?? "Item"}</div>
                        )}
                        {details?.meta ? (
                          <div className="text-sm text-muted-foreground mt-1">{details.meta}</div>
                        ) : null}
                        <div className="text-xs text-muted-foreground mt-2">Type: {item.item_type}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground">
                          {formatMoney(Number(details?.price ?? 0), String(details?.currency ?? preferredCurrency))}
                        </div>
                        <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end">
                      <Button variant="outline" onClick={() => removeItem(item.id)}>
                        Remove
                      </Button>
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
