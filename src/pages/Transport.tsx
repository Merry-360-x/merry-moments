import { Car, Search, MapPin, Frown, ArrowLeftRight, Plane, Building2, Map, Key, Users, Fuel, Settings, Calendar, Shield, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { formatMoney } from "@/lib/money";
import { useTripCart } from "@/hooks/useTripCart";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { Badge } from "@/components/ui/badge";

// Transport service categories
const transportCategories = [
  { id: "airport_transfer", label: "Airport Transfer", icon: Plane, description: "Pickup & dropoff at airports" },
  { id: "intracity", label: "Intracity Ride", icon: Building2, description: "Rides within a city" },
  { id: "intercity", label: "Intercity Ride", icon: Map, description: "Travel between cities" },
  { id: "car_rental", label: "Car Rentals", icon: Key, description: "Rent vehicles with or without driver" },
];

type TransportServiceRow = Pick<Tables<"transport_services">, "id" | "title" | "description">;

// Extended vehicle type with all car rental fields
interface TransportVehicleRow {
  id: string;
  title: string;
  provider_name: string | null;
  vehicle_type: string | null;
  seats: number | null;
  price_per_day: number | null;
  daily_price?: number | null;
  weekly_price?: number | null;
  monthly_price?: number | null;
  currency: string | null;
  driver_included: boolean | null;
  image_url: string | null;
  media: string[] | null;
  // New car rental fields
  car_brand?: string | null;
  car_model?: string | null;
  car_year?: number | null;
  car_type?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  drive_train?: string | null;
  key_features?: string[] | null;
  exterior_images?: string[] | null;
  interior_images?: string[] | null;
  // Documents (for verification badge)
  insurance_document_url?: string | null;
  registration_document_url?: string | null;
  roadworthiness_certificate_url?: string | null;
}

type TransportRouteRow = Pick<Tables<"transport_routes">, "id" | "from_location" | "to_location" | "base_price" | "currency">;

const Transport = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [vehicle, setVehicle] = useState("All Vehicles");
  const { addToCart: addCartItem } = useTripCart();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();

  const displayMoney = (amount: number, fromCurrency: string | null) => {
    const from = String(fromCurrency ?? preferredCurrency ?? "USD");
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

  const { data: vehicles = [], isLoading: vehiclesLoading, isError: vehiclesError } = useQuery({
    queryKey: ["transport_vehicles", searchParams.get("vehicle") ?? "All Vehicles"],
    queryFn: async (): Promise<TransportVehicleRow[]> => {
      let q = supabase
        .from("transport_vehicles")
        .select(`
          id, title, provider_name, vehicle_type, seats, 
          price_per_day, daily_price, weekly_price, monthly_price, 
          currency, driver_included, image_url, media,
          car_brand, car_model, car_year, car_type,
          transmission, fuel_type, drive_train, key_features,
          exterior_images, interior_images,
          insurance_document_url, registration_document_url, roadworthiness_certificate_url
        `)
        .or("is_published.eq.true,is_published.is.null")
        .order("created_at", { ascending: false });
      const vt = searchParams.get("vehicle");
      if (vt && vt !== "All Vehicles") q = (q as any).eq("vehicle_type", vt);
      const { data, error } = await q;
      if (error) throw error;
      return (data as TransportVehicleRow[] | null) ?? [];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const { data: routes = [], isLoading: routesLoading } = useQuery({
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
      if (error) throw error;
      return (data as TransportRouteRow[] | null) ?? [];
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
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
      <div className="py-12 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Transportation Services</h1>
        <p className="text-muted-foreground">Get around Rwanda with ease</p>
      </div>

      {/* Category Cards */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {transportCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-6 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                    : "bg-card hover:bg-card/80 shadow-card hover:shadow-md"
                }`}
              >
                <Icon className={`w-8 h-8 mb-3 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                <h3 className={`font-semibold mb-1 ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                  {cat.label}
                </h3>
                <p className={`text-sm ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>
        {activeCategory !== "all" && (
          <div className="text-center mt-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveCategory("all")}>
              Show all services
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
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
            {activeCategory === "car_rental" && (
              <select
                className="bg-transparent text-sm text-muted-foreground focus:outline-none"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                <option>All Vehicles</option>
                <option>Sedan</option>
                <option>SUV</option>
                <option>Van</option>
                <option>4x4</option>
                <option>Luxury</option>
              </select>
            )}
            <Button variant="search" className="gap-2" type="button" onClick={runSearch}>
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {vehiclesLoading || routesLoading ? (
        <div className="container mx-auto px-4 py-12">
          <LoadingSpinner message="Loading transport services..." />
        </div>
      ) : (
        <>
          {/* Airport Transfers */}
          {(activeCategory === "all" || activeCategory === "airport_transfer") && (
            <div className="container mx-auto px-4 lg:px-8 pb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Plane className="w-6 h-6 text-primary" />
                Airport Transfers
              </h2>
              {routes.filter(r =>
                r.from_location?.toLowerCase().includes("airport") ||
                r.to_location?.toLowerCase().includes("airport")
              ).length === 0 ? (
                <div className="bg-card rounded-xl p-8 shadow-card text-center">
                  <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No airport transfer services available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {routes.filter(r =>
                    r.from_location?.toLowerCase().includes("airport") ||
                    r.to_location?.toLowerCase().includes("airport")
                  ).map((r) => (
                    <div key={r.id} className="bg-card rounded-xl shadow-card p-6">
                      <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
                        <Plane className="w-4 h-4 text-primary" />
                        {r.from_location} → {r.to_location}
                      </div>
                      <div className="text-muted-foreground mb-4">
                        {displayMoney(Number(r.base_price), String(r.currency ?? "USD"))}
                      </div>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => addToCart({ item_type: "transport_route", reference_id: r.id })}
                      >
                        Book Transfer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Intracity Rides */}
          {(activeCategory === "all" || activeCategory === "intracity") && (
            <div className="container mx-auto px-4 lg:px-8 pb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Building2 className="w-6 h-6 text-primary" />
                Intracity Rides
              </h2>
              {services.length === 0 ? (
                <div className="bg-card rounded-xl p-8 shadow-card text-center">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No intracity ride services available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {services.map((s) => (
                    <div key={s.id} className="bg-card rounded-xl shadow-card p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
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
                        Book Ride
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Intercity Rides */}
          {(activeCategory === "all" || activeCategory === "intercity") && (
            <div className="container mx-auto px-4 lg:px-8 pb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Map className="w-6 h-6 text-primary" />
                Intercity Rides
              </h2>
              {routes.filter(r =>
                !(r.from_location?.toLowerCase().includes("airport") || r.to_location?.toLowerCase().includes("airport"))
              ).length === 0 ? (
                <div className="bg-card rounded-xl p-8 shadow-card text-center">
                  <Map className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No intercity routes available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {routes.filter(r =>
                    !(r.from_location?.toLowerCase().includes("airport") || r.to_location?.toLowerCase().includes("airport"))
                  ).map((r) => (
                    <div key={r.id} className="bg-card rounded-xl shadow-card p-6">
                      <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
                        <ArrowLeftRight className="w-4 h-4 text-primary" />
                        {r.from_location} → {r.to_location}
                      </div>
                      <div className="text-muted-foreground mb-4">
                        {displayMoney(Number(r.base_price), String(r.currency ?? "USD"))}
                      </div>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => addToCart({ item_type: "transport_route", reference_id: r.id })}
                      >
                        Book Ride
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Car Rentals */}
          {(activeCategory === "all" || activeCategory === "car_rental") && (
            <div className="container mx-auto px-4 lg:px-8 pb-16">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Key className="w-6 h-6 text-primary" />
                Car Rentals
              </h2>
              {vehiclesError ? (
                <div className="text-center py-12">
                  <Frown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Could not load vehicles.</p>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="bg-card rounded-xl p-8 shadow-card text-center">
                  <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No rental vehicles available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vehicles.map((v) => {
                    // Determine if verified (has all required docs)
                    const isVerified = !!(v.insurance_document_url && v.registration_document_url && v.roadworthiness_certificate_url);
                    // Get all images
                    const allImages = [
                      ...(v.exterior_images || []),
                      ...(v.interior_images || []),
                      ...(v.media || []),
                      v.image_url
                    ].filter(Boolean) as string[];
                    // Car title
                    const carTitle = v.car_brand && v.car_model 
                      ? `${v.car_brand} ${v.car_model}${v.car_year ? ` ${v.car_year}` : ''}`
                      : v.title;
                    
                    return (
                      <div
                        key={v.id}
                        className="group rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300 animate-fade-in"
                      >
                        {/* Image Carousel */}
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {allImages.length > 0 ? (
                            <ListingImageCarousel
                              images={allImages}
                              alt={carTitle}
                              className="w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40 flex items-center justify-center">
                              <Car className="w-16 h-16 text-muted-foreground/50" />
                            </div>
                          )}
                          {/* Car type badge */}
                          <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium">
                            {v.car_type || v.vehicle_type}
                          </span>
                          {/* Verified badge */}
                          {isVerified && (
                            <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Title & Provider */}
                          <div>
                            <h3 className="font-semibold text-foreground line-clamp-1">{carTitle}</h3>
                            {v.provider_name && (
                              <p className="text-xs text-muted-foreground">{v.provider_name}</p>
                            )}
                          </div>

                          {/* Specs Row */}
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {v.seats && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {v.seats} seats
                              </span>
                            )}
                            {v.transmission && (
                              <span className="flex items-center gap-1">
                                <Settings className="w-3 h-3" />
                                {v.transmission}
                              </span>
                            )}
                            {v.fuel_type && (
                              <span className="flex items-center gap-1">
                                <Fuel className="w-3 h-3" />
                                {v.fuel_type}
                              </span>
                            )}
                            {v.drive_train && (
                              <span className="bg-muted px-2 py-0.5 rounded">
                                {v.drive_train}
                              </span>
                            )}
                          </div>

                          {/* Key Features */}
                          {v.key_features && v.key_features.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {v.key_features.slice(0, 4).map((feature) => (
                                <Badge key={feature} variant="secondary" className="text-xs py-0">
                                  {feature}
                                </Badge>
                              ))}
                              {v.key_features.length > 4 && (
                                <Badge variant="outline" className="text-xs py-0">
                                  +{v.key_features.length - 4} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Driver included */}
                          <p className="text-sm text-muted-foreground">
                            {v.driver_included ? "✓ Driver included" : "Self drive"}
                          </p>

                          {/* Pricing */}
                          <div className="space-y-1 pt-2 border-t border-border">
                            <div className="flex items-baseline justify-between">
                              <span className="text-foreground font-bold text-lg">
                                {displayMoney(Number(v.daily_price || v.price_per_day), String(v.currency ?? "USD"))}
                              </span>
                              <span className="text-sm text-muted-foreground">/ day</span>
                            </div>
                            {(v.weekly_price || v.monthly_price) && (
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                {v.weekly_price && (
                                  <span>{displayMoney(Number(v.weekly_price), String(v.currency ?? "USD"))}/week</span>
                                )}
                                {v.monthly_price && (
                                  <span>{displayMoney(Number(v.monthly_price), String(v.currency ?? "USD"))}/month</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action */}
                          <Button
                            className="w-full"
                            onClick={() => addToCart({ item_type: "transport_vehicle", reference_id: v.id })}
                          >
                            Rent Now
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Footer />
    </div>
  );
};

export default Transport;
