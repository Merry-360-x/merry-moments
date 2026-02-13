import { Search, Star, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import PropertyCard from "@/components/PropertyCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Filter } from "lucide-react";
import { AMENITIES } from "@/lib/amenities";
import { formatMoney } from "@/lib/money";
import { convertAmount } from "@/lib/fx";
import { useFxRates } from "@/hooks/useFxRates";
import { usePreferences } from "@/hooks/usePreferences";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const propertyTypes = ["Hotel", "Motel", "Resort", "Lodge", "Apartment", "Room in Apartment", "Villa", "Guesthouse"];
const amenities = AMENITIES;
const PRICE_SLIDER_MAX_USD = 50000;
const PRICE_SLIDER_STEP_USD = 50;

const fetchProperties = async (args: {
  maxPriceInDisplayCurrency: number;
  displayCurrency: string;
  usdRates: Record<string, number> | null;
  search: string;
  propertyTypes: string[];
  amenities: string[];
  minRating: number;
  hostId?: string | null;
  nearby?: { lat: number; lng: number } | null;
  location?: string; // Add location filter
  guests?: number; // Add guest filter
  startDate?: string; // Add start date filter
  endDate?: string; // Add end date filter
  monthlyRentalOnly?: boolean; // Add monthly rental filter
}) => {
  try {
    let query = supabase
      .from("properties")
      .select(
        "id, title, location, price_per_night, currency, property_type, rating, review_count, images, created_at, bedrooms, bathrooms, beds, lat, lng, host_id, max_guests, check_in_time, check_out_time, smoking_allowed, events_allowed, pets_allowed"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    const trimmed = args.search.trim();
    if (trimmed) {
      query = query.or(`title.ilike.%${trimmed}%,location.ilike.%${trimmed}%`);
    }

    if (args.hostId) {
      query = query.eq("host_id", args.hostId);
    }

    if (args.propertyTypes.length) {
      query = query.in("property_type", args.propertyTypes);
    }

    if (args.minRating > 0) {
      query = query.gte("rating", args.minRating);
    }

    if (args.amenities.length) {
      query = query.contains("amenities", args.amenities);
    }

    // Location-based filtering
    if (args.location && args.location.trim()) {
      query = query.ilike("location", `%${args.location.trim()}%`);
    }

    // Guest count filtering
    if (args.guests && args.guests > 0) {
      query = query.gte("max_guests", args.guests);
    }

    // Monthly rental filtering
    if (args.monthlyRentalOnly) {
      query = query.eq("available_for_monthly_rental", true);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("[Accommodations] fetchProperties error:", error.message);
      return [];
    }
    const rows = (data ?? []).filter((r) => {
      const rawAmount = Number((r as { price_per_night?: number | null }).price_per_night ?? 0);
      if (!Number.isFinite(rawAmount)) return false;
      const fromCurrency = String((r as { currency?: string | null }).currency ?? "RWF");
      const displayCurrency = String(args.displayCurrency || "RWF");

      if (fromCurrency === displayCurrency) {
        return rawAmount <= args.maxPriceInDisplayCurrency;
      }

      const converted = convertAmount(rawAmount, fromCurrency, displayCurrency, args.usdRates);
      if (converted === null) return true;
      return converted <= args.maxPriceInDisplayCurrency;
    });

    if (!args.nearby) return rows;

    const toRad = (x: number) => (x * Math.PI) / 180;
    const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s1 =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
      return R * c;
    };

    const origin = args.nearby;
    const withDistance = rows
      .map((r) => {
        const lat = Number((r as { lat: number | null }).lat);
        const lng = Number((r as { lng: number | null }).lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { row: r, d: haversineKm(origin, { lat, lng }) };
      })
      .filter(Boolean) as Array<{ row: (typeof rows)[number]; d: number }>;
    withDistance.sort((a, b) => a.d - b.d);

    const withDistanceIds = new Set(withDistance.map((x) => x.row.id));
    const withoutCoords = rows.filter((r) => !withDistanceIds.has(r.id));
    return [...withDistance.map((x) => x.row), ...withoutCoords];
  } catch (err) {
    console.warn("[Accommodations] fetchProperties exception:", err);
    return [];
  }
};

const Accommodations = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [maxPriceUsd, setMaxPriceUsd] = useState(PRICE_SLIDER_MAX_USD);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [locationFilter, setLocationFilter] = useState("");
  const [guestCount, setGuestCount] = useState(() => {
    const adults = Number(searchParams.get("adults")) || 0;
    const children = Number(searchParams.get("children")) || 0;
    return adults + children || 0; // Changed from 1 to 0
  });
  const [startDate, setStartDate] = useState(() => searchParams.get("start") ?? "");
  const [endDate, setEndDate] = useState(() => searchParams.get("end") ?? "");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [monthlyRentalOnly, setMonthlyRentalOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12; // 3 columns x 4 rows
  const hostId = searchParams.get("host");
  const nearbyLat = searchParams.get("lat");
  const nearbyLng = searchParams.get("lng");
  const nearby =
    searchParams.get("nearby") === "1" && nearbyLat && nearbyLng
      ? { lat: Number(nearbyLat), lng: Number(nearbyLng) }
      : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { toggleFavorite } = useFavorites();
  const [locationPromptDismissed, setLocationPromptDismissed] = useState(() => {
    try {
      return localStorage.getItem("accommodations_location_prompt_dismissed") === "1";
    } catch {
      return false;
    }
  });
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const maxPrice = useMemo(
    () => convertAmount(maxPriceUsd, "USD", preferredCurrency, usdRates) ?? maxPriceUsd,
    [maxPriceUsd, preferredCurrency, usdRates]
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [maxPriceUsd, selectedTypes.length, selectedAmenities.length, minRating, locationFilter, guestCount, monthlyRentalOnly, hostId]);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setCurrentPage(1); // Reset page on search
    
    // Update guest count from URL parameters
    const adults = Number(searchParams.get("adults")) || 0;
    const children = Number(searchParams.get("children")) || 0;
    const totalGuests = adults + children;
    if (totalGuests > 0) {
      setGuestCount(totalGuests);
    }
    
    // Update dates from URL parameters
    setStartDate(searchParams.get("start") ?? "");
    setEndDate(searchParams.get("end") ?? "");
  }, [searchParams]);

  const runSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      navigate("/accommodations");
      return;
    }
    const params = new URLSearchParams({ q: trimmed });
    navigate(`/accommodations?${params.toString()}`);
  };

  const requestNearbyRecommendations = async () => {
    if (!("geolocation" in navigator)) {
      toast({ variant: "destructive", title: "Location not available", description: "Your browser does not support geolocation." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const params = new URLSearchParams(searchParams);
        params.set("nearby", "1");
        params.set("lat", String(pos.coords.latitude));
        params.set("lng", String(pos.coords.longitude));

        try {
          const reverse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { headers: { Accept: "application/json" } }
          );
          const info = await reverse.json().catch(() => null);
          const address = info?.address || {};
          const region = [address.city, address.town, address.county, address.state, address.country]
            .filter(Boolean)
            .join(", ");
          if (region) params.set("region", region);
        } catch {
          // Keep nearby coordinates even if reverse geocoding fails
        }

        navigate(`/accommodations?${params.toString()}`);
      },
      () => {
        toast({ variant: "destructive", title: "Location permission denied", description: "Allow location access to get nearby recommendations." });
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const showLocationPrompt = !nearby && !searchParams.get("q") && !locationPromptDismissed;

  const {
    data: properties = [],
    isError,
    isLoading: propertiesLoading,
    refetch: refetchProperties,
  } = useQuery({
    queryKey: [
      "properties",
      "accommodations",
      maxPriceUsd,
      preferredCurrency,
      searchParams.get("q") ?? "",
      selectedTypes.join("|"),
      selectedAmenities.join("|"),
      minRating,
      hostId ?? "",
      nearby ? `${nearby.lat},${nearby.lng}` : "",
      locationFilter,
      guestCount,
      startDate,
      endDate,
      monthlyRentalOnly,
    ],
    queryFn: () =>
      fetchProperties({
        maxPriceInDisplayCurrency: maxPrice,
        displayCurrency: preferredCurrency,
        usdRates,
        search: searchParams.get("q") ?? "",
        propertyTypes: selectedTypes,
        amenities: selectedAmenities,
        minRating,
        hostId,
        nearby,
        location: locationFilter,
        guests: guestCount,
        startDate,
        endDate,
        monthlyRentalOnly,
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes for search results
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchOnMount: true, // Fresh results on mount
    refetchOnWindowFocus: true,
  });

  // Smart place recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ["smart-recommendations", user?.id],
    queryFn: async () => {
      // Get user's favorite locations and property types
      const userPreferences = { locations: [], types: [], maxPrice: 500000 };
      
      if (user?.id) {
        const { data: favs } = await supabase
          .from("favorites")
          .select(`
            properties!inner (
              location, property_type, price_per_night
            )
          `)
          .eq("user_id", user.id)
          .limit(10);
        
        if (favs && favs.length > 0) {
          userPreferences.locations = [...new Set(favs.map((f: any) => f.properties.location).filter(Boolean))];
          userPreferences.types = [...new Set(favs.map((f: any) => f.properties.property_type).filter(Boolean))];
          userPreferences.maxPrice = Math.max(...favs.map((f: any) => f.properties.price_per_night || 0));
        }
      }
      
      // Get popular/highly-rated properties
      const { data: popular, error } = await supabase
        .from("properties")
        .select("id, title, location, price_per_night, currency, property_type, rating, review_count, images, bedrooms, bathrooms, max_guests")
        .eq("is_published", true)
        .gte("rating", 4.0)
        .gte("review_count", 3)
        .order("rating", { ascending: false })
        .order("review_count", { ascending: false })
        .limit(20);
      
      if (error) return [];
      
      // Score recommendations based on user preferences
      const scored = (popular || []).map((prop: any) => {
        let score = prop.rating * 0.4 + (prop.review_count * 0.1);
        
        // Boost score for preferred locations
        if (userPreferences.locations.includes(prop.location)) {
          score += 2;
        }
        
        // Boost score for preferred types
        if (userPreferences.types.includes(prop.property_type)) {
          score += 1.5;
        }
        
        // Boost score for properties within price range
        if (prop.price_per_night <= userPreferences.maxPrice) {
          score += 1;
        }
        
        return { ...prop, score };
      });
      
      // Sort by score and return top 6
      return scored.sort((a: any, b: any) => b.score - a.score).slice(0, 6);
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !searchParams.get("q") && !hostId && properties.length > 0, // Only show when not searching
  });

  const { data: hostPreview } = useQuery({
    queryKey: ["host-preview", hostId],
    enabled: Boolean(hostId),
    queryFn: async () => {
      const hid = String(hostId ?? "");
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, bio")
        .eq("user_id", hid)
        .maybeSingle();
      if (error) throw error;

      const { data: hostProps, error: propsErr } = await supabase
        .from("properties")
        .select("id, created_at, is_published")
        .eq("host_id", hid);
      if (propsErr) throw propsErr;
      const propIds = (hostProps ?? []).map((p) => String((p as { id: string }).id));
      const hostingSince = (hostProps ?? [])
        .map((p) => new Date(String((p as { created_at: string }).created_at)).getTime())
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b)[0];

      const { data: reviews } = propIds.length
        ? await supabase.from("property_reviews").select("rating, property_id").in("property_id", propIds).eq("is_hidden", false)
        : { data: [] as Array<{ rating: number; property_id: string }>, error: null };
      const ratings = (reviews ?? []).map((r) => Number(r.rating)).filter((n) => Number.isFinite(n) && n > 0);
      const reviewCount = ratings.length;
      const avg = reviewCount > 0 ? ratings.reduce((a, b) => a + b, 0) / reviewCount : null;

      return {
        profile: prof as { user_id: string; full_name: string | null; avatar_url: string | null; bio: string | null } | null,
        listings: propIds.length,
        hostingSince: hostingSince ? new Date(hostingSince).toISOString() : null,
        reviewCount,
        rating: avg ? Math.round(avg * 100) / 100 : null,
      };
    },
  });

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorites", "ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", user!.id);
      if (error) return [];
      return (data ?? []).map((r) => String((r as { property_id: string }).property_id));
    },
  });

  const favoritesSet = new Set(favoriteIds);
  const activeFiltersCount =
    (maxPriceUsd < PRICE_SLIDER_MAX_USD ? 1 : 0) +
    (selectedTypes.length > 0 ? 1 : 0) +
    (selectedAmenities.length > 0 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (locationFilter.trim() ? 1 : 0) +
    (guestCount > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search Bar */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-5 sm:py-8">
          {/* Mobile: nicer pill */}
          <div className="sm:hidden">
            <div className="bg-card rounded-full shadow-search border border-border px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-muted-foreground">{t("nav.accommodations")}</div>
                <input
                  type="text"
                  placeholder={t("common.search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runSearch();
                  }}
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                />
              </div>
              {query.trim() ? (
                <button
                  type="button"
                  className="text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => setQuery("")}
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold"
                onClick={runSearch}
              >
                Search
              </button>
            </div>
          </div>

          {/* Desktop/tablet: existing layout */}
          <div className="hidden sm:flex bg-card rounded-xl shadow-card p-4 flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">{t("nav.accommodations")}</label>
              <input
                type="text"
                placeholder={t("common.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
              />
            </div>
            <Button variant="search" size="icon-lg" type="button" onClick={runSearch}>
              <Search className="w-5 h-5" />
            </Button>
          </div>
          {showLocationPrompt && (
            <Alert className="max-w-3xl mx-auto mt-4">
              <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <span>Share your location to show nearby stays first.</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={requestNearbyRecommendations}>Use my location</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLocationPromptDismissed(true);
                      localStorage.setItem("accommodations_location_prompt_dismissed", "1");
                    }}
                  >
                    Not now
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("accommodations.title")}</h1>
          <p className="text-muted-foreground">{t("accommodations.subtitle")}</p>
        </div>

        {hostId && hostPreview ? (
          <div className="mb-8 bg-card rounded-xl shadow-card p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                {hostPreview.profile?.avatar_url ? (
                  <img
                    src={hostPreview.profile.avatar_url}
                    alt={hostPreview.profile.full_name ?? "Host"}
                    className="w-12 h-12 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted" />
                )}
                <div>
                  <div className="text-lg font-semibold text-foreground">
                    Hosted by {hostPreview.profile?.full_name ?? "Host"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {hostPreview.listings} listings
                    {hostPreview.reviewCount ? ` · ${hostPreview.reviewCount} reviews` : " · No reviews yet"}
                    {hostPreview.rating ? ` · ${hostPreview.rating} overall` : ""}
                    {hostPreview.hostingSince ? ` · Hosting since ${new Date(hostPreview.hostingSince).toLocaleDateString()}` : ""}
                  </div>
                  {hostPreview.profile?.bio ? (
                    <div className="mt-2 text-sm text-foreground/90 leading-relaxed line-clamp-2">
                      {hostPreview.profile.bio}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/hosts/${encodeURIComponent(String(hostId))}/reviews`}>
                  <Button variant="outline">All reviews</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete("host");
                    navigate(params.toString() ? `/accommodations?${params.toString()}` : "/accommodations");
                  }}
                >
                  View all listings
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Mobile filters button */}
        <div className="lg:hidden mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => setFiltersOpen(true)}
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {t("accommodations.filters")}
            </span>
            {activeFiltersCount > 0 ? (
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {activeFiltersCount}
              </span>
            ) : null}
          </Button>
        </div>

        {/* Mobile filters sheet */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="bottom" className="p-0">
            <SheetHeader className="p-6 pb-2">
              <SheetTitle>{t("accommodations.filters")}</SheetTitle>
            </SheetHeader>
            <div className="p-6 pt-4 max-h-[70vh] overflow-y-auto">
              <Accordion type="multiple" defaultValue={["price", "type"]}>
                <AccordionItem value="price">
                  <AccordionTrigger>{t("accommodations.priceRange")}</AccordionTrigger>
                  <AccordionContent>
                    <Slider
                      value={[maxPriceUsd]}
                      onValueChange={(v) => setMaxPriceUsd(v[0] ?? PRICE_SLIDER_MAX_USD)}
                      min={0}
                      max={PRICE_SLIDER_MAX_USD}
                      step={PRICE_SLIDER_STEP_USD}
                      className="mb-2"
                    />
                    <div className="flex items-center justify-between text-sm gap-3">
                      <span className="text-muted-foreground">Max</span>
                      <span className="text-primary font-medium">{formatMoney(maxPrice, preferredCurrency)}</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="type">
                  <AccordionTrigger>{t("accommodations.propertyType")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2">
                      {propertyTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setSelectedTypes((prev) => {
                              const next = new Set(prev);
                              if (next.has(type)) next.delete(type);
                              else next.add(type);
                              return Array.from(next);
                            })
                          }
                          className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                            selectedTypes.includes(type)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="rating">
                  <AccordionTrigger>{t("accommodations.minimumRating")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className="p-1"
                          type="button"
                          onClick={() => setMinRating((prev) => (prev === star ? 0 : star))}
                          aria-label={`Minimum rating ${star}`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              minRating >= star ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="location">
                  <AccordionTrigger>Location</AccordionTrigger>
                  <AccordionContent>
                    <Input
                      placeholder="Filter by location..."
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="w-full"
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="guests">
                  <AccordionTrigger>Guest Count</AccordionTrigger>
                  <AccordionContent>
                    <Input
                      type="number"
                      placeholder="Minimum guests"
                      value={guestCount || ''}
                      onChange={(e) => setGuestCount(Number(e.target.value) || 0)}
                      min="1"
                      max="20"
                      className="w-full"
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="rental-type">
                  <AccordionTrigger>Rental Duration</AccordionTrigger>
                  <AccordionContent>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={monthlyRentalOnly}
                        onChange={(e) => setMonthlyRentalOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">Monthly rentals only (30+ days)</span>
                    </label>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="amenities">
                  <AccordionTrigger>{t("accommodations.amenities")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      {amenities.map((a) => {
                        const Icon = a.icon;
                        const active = selectedAmenities.includes(a.value);
                        return (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() =>
                              setSelectedAmenities((prev) => {
                                const next = new Set(prev);
                                if (next.has(a.value)) next.delete(a.value);
                                else next.add(a.value);
                                return Array.from(next);
                              })
                            }
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                              active
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-background border-border text-foreground hover:border-primary"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{a.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="p-6 pt-0 border-t border-border flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMaxPriceUsd(PRICE_SLIDER_MAX_USD);
                  setSelectedTypes([]);
                  setSelectedAmenities([]);
                  setMinRating(0);
                  setLocationFilter("");
                  setGuestCount(0);
                }}
              >
                Clear
              </Button>
              <Button type="button" onClick={() => setFiltersOpen(false)}>
                Apply
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar (desktop only, minimized with accordion) */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{t("accommodations.filters")}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMaxPriceUsd(PRICE_SLIDER_MAX_USD);
                    setSelectedTypes([]);
                    setSelectedAmenities([]);
                    setMinRating(0);
                    setLocationFilter("");
                    setGuestCount(0);
                  }}
                >
                  Clear
                </Button>
              </div>

              <Accordion type="multiple" defaultValue={["price", "type"]}>
                <AccordionItem value="price">
                  <AccordionTrigger>{t("accommodations.priceRange")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {/* Price display */}
                      <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="text-center flex-1">
                          <div className="text-xs text-muted-foreground mb-1">Min</div>
                          <div className="font-medium text-sm">{formatMoney(0, preferredCurrency)}</div>
                        </div>
                        <div className="text-muted-foreground">—</div>
                        <div className="text-center flex-1">
                          <div className="text-xs text-muted-foreground mb-1">Max</div>
                          <div className="font-medium text-sm text-primary">{formatMoney(maxPrice, preferredCurrency)}</div>
                        </div>
                      </div>
                      
                      {/* Slider */}
                      <Slider
                        value={[maxPriceUsd]}
                        onValueChange={(v) => setMaxPriceUsd(v[0] ?? PRICE_SLIDER_MAX_USD)}
                        max={PRICE_SLIDER_MAX_USD}
                        min={0}
                        step={PRICE_SLIDER_STEP_USD}
                        className="py-2"
                      />
                      
                      {/* Quick presets */}
                      <div className="flex flex-wrap gap-1.5">
                        {[100, 250, 500, 1000, PRICE_SLIDER_MAX_USD].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setMaxPriceUsd(val)}
                            className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                              maxPriceUsd === val
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:border-primary"
                            }`}
                          >
                            {formatMoney(convertAmount(val, "USD", preferredCurrency, usdRates) ?? val, preferredCurrency)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="type">
                  <AccordionTrigger>{t("accommodations.propertyType")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2">
                      {propertyTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setSelectedTypes((prev) => {
                              const next = new Set(prev);
                              if (next.has(type)) next.delete(type);
                              else next.add(type);
                              return Array.from(next);
                            })
                          }
                          className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                            selectedTypes.includes(type)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rating">
                  <AccordionTrigger>{t("accommodations.minimumRating")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className="p-1"
                          type="button"
                          onClick={() => setMinRating((prev) => (prev === star ? 0 : star))}
                          aria-label={`Minimum rating ${star}`}
                        >
                          <Star
                            className={`w-5 h-5 transition-colors ${
                              minRating >= star ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="location">
                  <AccordionTrigger>Location</AccordionTrigger>
                  <AccordionContent>
                    <Input
                      placeholder="Filter by location..."
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="w-full"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="guests">
                  <AccordionTrigger>Guest Count</AccordionTrigger>
                  <AccordionContent>
                    <Input
                      type="number"
                      placeholder="Minimum guests"
                      value={guestCount || ''}
                      onChange={(e) => setGuestCount(Number(e.target.value) || 0)}
                      min="1"
                      max="20"
                      className="w-full"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rental-type-mobile">
                  <AccordionTrigger>Rental Duration</AccordionTrigger>
                  <AccordionContent>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={monthlyRentalOnly}
                        onChange={(e) => setMonthlyRentalOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">Monthly rentals only (30+ days)</span>
                    </label>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="amenities">
                  <AccordionTrigger>{t("accommodations.amenities")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-2">
                      {amenities.map((a) => {
                        const Icon = a.icon;
                        const active = selectedAmenities.includes(a.value);
                        return (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() =>
                              setSelectedAmenities((prev) => {
                                const next = new Set(prev);
                                if (next.has(a.value)) next.delete(a.value);
                                else next.add(a.value);
                                return Array.from(next);
                              })
                            }
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                              active
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-background border-border text-foreground hover:border-primary"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{a.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </aside>

          {/* Properties Grid */}
          <div className="flex-1">
            {/* Smart Recommendations Section */}
            {!searchParams.get("q") && !hostId && recommendations && recommendations.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                    {user ? "Recommended for you" : "Popular picks"}
                  </h2>
                  {/* Mobile scroll hint */}
                  <span className="sm:hidden text-xs text-muted-foreground flex items-center gap-1 animate-pulse">
                    Swipe →
                  </span>
                </div>
                
                {/* Mobile recommendations */}
                <div className="sm:hidden">
                  <div className="grid grid-flow-col auto-cols-[75%] gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                    {recommendations.slice(0, 4).map((property) => (
                      <div key={`rec-mobile-${property.id}`} className="snap-start">
                        <PropertyCard
                          id={property.id}
                          image={property.images?.[0] ?? null}
                          images={property.images ?? null}
                          title={property.title}
                          location={property.location}
                          rating={Number(property.rating) || 0}
                          reviews={property.review_count || 0}
                          price={Number(property.price_per_night)}
                          currency={property.currency}
                          type={property.property_type}
                          bedrooms={(property as any).bedrooms ?? null}
                          bathrooms={(property as any).bathrooms ?? null}
                          beds={null}
                          maxGuests={(property as any).max_guests ?? null}
                          checkInTime={null}
                          checkOutTime={null}
                          smokingAllowed={null}
                          eventsAllowed={null}
                          petsAllowed={null}
                          isFavorited={favoritesSet.has(property.id)}
                          onToggleFavorite={async () => {
                            const isFav = favoritesSet.has(property.id);
                            const changed = await toggleFavorite(String(property.id), isFav);
                            if (changed) {
                              await qc.invalidateQueries({ queryKey: ["favorites", "ids", user?.id] });
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Desktop recommendations */}
                <div className="hidden sm:grid grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {recommendations.slice(0, 6).map((property) => (
                    <PropertyCard
                      key={`rec-desktop-${property.id}`}
                      id={property.id}
                      image={property.images?.[0] ?? null}
                      images={property.images ?? null}
                      title={property.title}
                      location={property.location}
                      rating={Number(property.rating) || 0}
                      reviews={property.review_count || 0}
                      price={Number(property.price_per_night)}
                      currency={property.currency}
                      type={property.property_type}
                      bedrooms={(property as any).bedrooms ?? null}
                      bathrooms={(property as any).bathrooms ?? null}
                      beds={null}
                      maxGuests={(property as any).max_guests ?? null}
                      checkInTime={null}
                      checkOutTime={null}
                      smokingAllowed={null}
                      eventsAllowed={null}
                      petsAllowed={null}
                      isFavorited={favoritesSet.has(property.id)}
                      onToggleFavorite={async () => {
                        const isFav = favoritesSet.has(property.id);
                        const changed = await toggleFavorite(String(property.id), isFav);
                        if (changed) {
                          await qc.invalidateQueries({ queryKey: ["favorites", "ids", user?.id] });
                        }
                      }}
                    />
                  ))}
                </div>
                
                <div className="border-t border-border pt-6 md:pt-8 mb-3 md:mb-4">
                  <h3 className="text-base md:text-lg font-medium text-foreground">All accommodations</h3>
                </div>
              </div>
            )}
            
            {/* All screens: 3-column grid */}
            {propertiesLoading ? (
              <div className="col-span-full">
                <LoadingSpinner message={t("common.loading")} />
              </div>
            ) : isError ? (
              <div className="col-span-full py-16 text-center">
                <p className="text-muted-foreground">{t("common.couldNotLoadProperties")}</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <p className="text-muted-foreground">{t("accommodations.noMatches")}</p>
              </div>
            ) : (
              <>
                {/* Pagination Info */}
                <div className="col-span-full flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, properties.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, properties.length)} of {properties.length} properties
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 lg:gap-6">
                  {properties
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((property) => (
                    <PropertyCard
                      key={property.id}
                      id={property.id}
                      image={property.images?.[0] ?? null}
                      images={property.images ?? null}
                      title={property.title}
                      location={property.location}
                      rating={Number(property.rating) || 0}
                      reviews={property.review_count || 0}
                      price={Number(property.price_per_night)}
                      currency={property.currency}
                      type={property.property_type}
                      bedrooms={(property as { bedrooms?: number | null }).bedrooms ?? null}
                      bathrooms={(property as { bathrooms?: number | null }).bathrooms ?? null}
                      beds={(property as { beds?: number | null }).beds ?? null}
                      maxGuests={(property as { max_guests?: number | null }).max_guests ?? null}
                      checkInTime={(property as { check_in_time?: string | null }).check_in_time ?? null}
                      checkOutTime={(property as { check_out_time?: string | null }).check_out_time ?? null}
                      smokingAllowed={(property as { smoking_allowed?: boolean | null }).smoking_allowed ?? null}
                      eventsAllowed={(property as { events_allowed?: boolean | null }).events_allowed ?? null}
                      petsAllowed={(property as { pets_allowed?: boolean | null }).pets_allowed ?? null}
                      isFavorited={favoritesSet.has(property.id)}
                      onToggleFavorite={async () => {
                        const isFav = favoritesSet.has(property.id);
                        const changed = await toggleFavorite(String(property.id), isFav);
                        if (changed) {
                          await qc.invalidateQueries({ queryKey: ["favorites", "ids", user?.id] });
                        }
                      }}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {properties.length > ITEMS_PER_PAGE && (
                  <div className="col-span-full flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(properties.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(properties.length / ITEMS_PER_PAGE);
                          // Show first, last, current, and pages around current
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, idx, arr) => (
                          <>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span key={`ellipsis-${page}`} className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="min-w-[40px]"
                            >
                              {page}
                            </Button>
                          </>
                        ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(properties.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={currentPage >= Math.ceil(properties.length / ITEMS_PER_PAGE)}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Accommodations;
