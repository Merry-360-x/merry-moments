import { Car, Search, MapPin, Frown, ArrowLeftRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { useTripCart } from "@/hooks/useTripCart";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";

type TransportServiceRow = Pick<Tables<"transport_services">, "id" | "title" | "description" | "slug">;
type TransportVehicleRow = Pick<
  Tables<"transport_vehicles">,
  "id"
  | "title"
  | "provider_name"
  | "vehicle_type"
  | "seats"
  | "price_per_day"
  | "currency"
  | "driver_included"
  | "image_url"
  | "media"
>;
type TransportRouteRow = Pick<Tables<"transport_routes">, "id" | "from_location" | "to_location" | "base_price" | "currency">;

const Transport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [vehicle, setVehicle] = useState("All Vehicles");
  const { addToCart: addCartItem } = useTripCart();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();

  const displayMoney = (amount: number, fromCurrency: string | null) => {
    const from = String(fromCurrency ?? preferredCurrency ?? "RWF");
    const to = String(preferredCurrency ?? from);
    const converted = convertAmount(Number(amount ?? 0), from, to, usdRates);
    return formatMoney(converted == null ? Number(amount ?? 0) : converted, to);
  };

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setVehicle(searchParams.get("vehicle") ?? "All Vehicles");
  }, [searchParams]);

  const runSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (vehicle && vehicle !== "All Vehicles") params.set("vehicle", vehicle);
    const qs = params.toString();
    navigate(qs ? `/transport?${qs}` : "/transport");
  };

  const { data: services = [] } = useQuery({
    queryKey: ["transport_services"],
    queryFn: async (): Promise<TransportServiceRow[]> => {
      const { data, error } = await supabase
        .from("transport_services")
        .select("id, title, description, slug")
        .or("is_published.eq.true,is_published.is.null")
        .order("created_at", { ascending: true });
      if (error) return [];
      return (data as TransportServiceRow[] | null) ?? [];
    },
  });

  const { data: vehicles = [], isLoading: vehiclesLoading, isError: vehiclesError, error: vehiclesErrObj } = useQuery({
    queryKey: ["transport_vehicles", searchParams.get("vehicle") ?? "All Vehicles"],
    queryFn: async (): Promise<TransportVehicleRow[]> => {
      let q = supabase
        .from("transport_vehicles")
        .select(
          "id, title, provider_name, vehicle_type, seats, price_per_day, currency, driver_included, image_url, media"
        )
        .or("is_published.eq.true,is_published.is.null")
        .order("created_at", { ascending: false });

      const vt = searchParams.get("vehicle");
      if (vt && vt !== "All Vehicles") q = q.eq("vehicle_type", vt);

      const { data, error } = await q;
      if (error) throw error;
      return (data as TransportVehicleRow[] | null) ?? [];
    },
    placeholderData: [],
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["transport_routes", searchParams.get("q") ?? ""],
    queryFn: async (): Promise<TransportRouteRow[]> => {
      let q = supabase
        .from("transport_routes")
        .select("id, from_location, to_location, base_price, currency")
        .or("is_published.eq.true,is_published.is.null")
        .order("created_at", { ascending: false });

      const trimmed = (searchParams.get("q") ?? "").trim();
      if (trimmed) {
        q = q.or(`from_location.ilike.%${trimmed}%,to_location.ilike.%${trimmed}%`);
      }

      const { data, error } = await q;
      if (error) return [];
      return (data as TransportRouteRow[] | null) ?? [];
    },
  });

  const addToCart = async (payload: { item_type: string; reference_id: string }) => {
    const ok = await addCartItem(payload.item_type as any, payload.reference_id, 1);
    if (!ok) return;
    toast({ title: "Added to Trip Cart" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="py-16 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Transportation Services</h1>
        <p className="text-muted-foreground">Get around Rwanda with ease</p>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 lg:px-8 mb-16">
        <div className="bg-card rounded-xl shadow-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
          <div className="flex-1 flex items-center gap-2 px-4">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search routes or destinations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              className="bg-transparent text-sm text-muted-foreground focus:outline-none"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            >
              <option>All Vehicles</option>
              <option>Sedan</option>
              <option>SUV</option>
              <option>Van</option>
            </select>
            <Button variant="search" className="gap-2" type="button" onClick={runSearch}>
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className="container mx-auto px-4 lg:px-8 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.length === 0 && routes.length === 0 && vehicles.length === 0 ? (
            <div className="md:col-span-3 bg-card rounded-xl p-10 shadow-card text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
                <Car className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No transport services yet</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Add services in your database and they’ll show up here.
              </p>
            </div>
          ) : (
            services.map((s) => (
              <div key={s.id} className="bg-card rounded-xl shadow-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.description}</div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => addToCart({ item_type: "transport_service", reference_id: s.id })}
                >
                  Add to Trip Cart
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Popular Routes */}
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-12">Popular Routes</h2>

        {routes.length === 0 ? (
          <div className="text-center py-12">
            <Frown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No routes found matching your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((r) => (
              <div key={r.id} className="bg-card rounded-xl shadow-card p-6">
                <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                  {r.from_location} → {r.to_location}
                </div>
                <div className="text-muted-foreground mb-4">
                  {displayMoney(Number(r.base_price), String(r.currency ?? "RWF"))}
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => addToCart({ item_type: "transport_route", reference_id: r.id })}
                >
                  Add to Trip Cart
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Vehicles */}
      <div className="container mx-auto px-4 lg:px-8 pb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-12">All Vehicles</h2>

        {vehiclesLoading ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading vehicles...</p>
          </div>
        ) : vehiclesError ? (
          <div className="text-center py-12">
            <Frown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Could not load vehicles.</p>
            {import.meta.env.DEV && vehiclesErrObj instanceof Error ? (
              <p className="mt-2 text-xs text-muted-foreground break-all">{vehiclesErrObj.message}</p>
            ) : null}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <Frown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No vehicles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="group rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300 animate-fade-in"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {(v.media?.length || v.image_url) ? (
                    <ListingImageCarousel
                      images={(v.media && v.media.length ? v.media : [v.image_url]) as Array<string | null | undefined>}
                      alt={v.title}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
                  )}
                  <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium">
                    {v.vehicle_type}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{v.provider_name ?? v.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {v.driver_included ? "Driver included" : "Self drive"} · {v.seats} seats
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-foreground">
                      <span className="font-bold">
                        {displayMoney(Number(v.price_per_day), String(v.currency ?? "RWF"))}
                      </span>
                      <span className="text-sm text-muted-foreground"> / day</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => addToCart({ item_type: "transport_vehicle", reference_id: v.id })}
                    >
                      Add to Trip Cart
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Transport;
