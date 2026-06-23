import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import PropertyCard from "@/components/PropertyCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Filter } from "lucide-react";
import { AMENITIES } from "@/lib/amenities";
import { formatMoney } from "@/lib/money";
import { convertAmount } from "@/lib/fx";
import { useFxRates } from "@/hooks/useFxRates";
import { usePreferences } from "@/hooks/usePreferences";
import { useToast } from "@/hooks/use-toast";

const propertyTypes = ["Hotel", "Motel", "Resort", "Lodge", "Apartment", "Room in Apartment", "Villa", "Guesthouse"];
const amenities = AMENITIES;
const PRICE_SLIDER_MAX_USD = 50000;
const PRICE_SLIDER_STEP_USD = 50;
type MonthlyFilterMode = "all" | "monthly_only" | "monthly_available" | "nightly_only";

const monthlyModeFromParams = (params: URLSearchParams): MonthlyFilterMode => {
  const stay = (params.get("stay") || "").toLowerCase();
  const duration = (params.get("duration") || "").toLowerCase();
  const monthly = (params.get("monthly") || "").toLowerCase();

  if (stay === "monthly" || duration === "monthly" || monthly === "1" || monthly === "true") {
    return "monthly_available";
  }

  return "all";
};

const monthlyFilterLabel: Record<MonthlyFilterMode, string> = {
  all: "All rentals",
  monthly_only: "Monthly only",
  monthly_available: "Monthly available",
  nightly_only: "Nightly only",
};

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
  monthlyFilterMode?: MonthlyFilterMode; // Add monthly rental filter mode
  bedrooms?: number | null; // null = any, 0 = studio, 1-5 = exact, 6 = 6+
}) => {
  try {
    let query = supabase
      .from("properties")
      .select(
        "id, title, location, price_per_night, price_per_month, available_for_monthly_rental, monthly_only_listing, currency, property_type, rating, review_count, images, created_at, bedrooms, bathrooms, beds, lat, lng, host_id, max_guests, check_in_time, check_out_time, smoking_allowed, events_allowed, pets_allowed"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      ;

    const trimmed = args.search.trim();
    const searchTerms = trimmed
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
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

    // Bedroom filtering
    if (args.bedrooms !== null && args.bedrooms !== undefined) {
      if (args.bedrooms === 0) {
        query = query.or("bedrooms.is.null,bedrooms.eq.0");
      } else if (args.bedrooms >= 6) {
        query = query.gte("bedrooms", 6);
      } else {
        query = query.eq("bedrooms", args.bedrooms);
      }
    }

    // Monthly rental filtering
    if (args.monthlyFilterMode === "monthly_only") {
      query = query.eq("monthly_only_listing", true);
    } else if (args.monthlyFilterMode === "monthly_available") {
      query = query.or("monthly_only_listing.eq.true,available_for_monthly_rental.eq.true");
    } else if (args.monthlyFilterMode === "nightly_only") {
      query = query.or("monthly_only_listing.is.null,monthly_only_listing.eq.false");
    }

    const { data, error } = await query;
    if (error) {
      console.warn("[Accommodations] fetchProperties error:", error.message);
      return [];
    }
    const rows = (data ?? []).filter((r) => {
      const rowData = r as {
        title?: string | null;
        location?: string | null;
        price_per_night?: number | null;
        price_per_month?: number | null;
        available_for_monthly_rental?: boolean | null;
        monthly_only_listing?: boolean | null;
      };
      if (searchTerms.length > 0) {
        const searchableText = `${rowData.title ?? ""} ${rowData.location ?? ""}`.toLowerCase();
        const matchesAllTerms = searchTerms.every((term) => searchableText.includes(term));
        if (!matchesAllTerms) return false;
      }

      if (args.location?.trim()) {
        const locationTerms = args.location
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        const locationText = String(rowData.location ?? "").toLowerCase();
        const locationMatches = locationTerms.every((term) => locationText.includes(term));
        if (!locationMatches) return false;
      }

      if (args.monthlyFilterMode === "monthly_only" && !Boolean(rowData.monthly_only_listing)) return false;
      if (
        args.monthlyFilterMode === "monthly_available" &&
        !Boolean(rowData.monthly_only_listing) &&
        !Boolean(rowData.available_for_monthly_rental)
      ) {
        return false;
      }
      if (args.monthlyFilterMode === "nightly_only" && Boolean(rowData.monthly_only_listing)) return false;

      const isMonthlyOnly = Boolean(rowData.monthly_only_listing);
      const rawAmount = Number(isMonthlyOnly ? rowData.price_per_month ?? 0 : rowData.price_per_night ?? 0);
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
    const rowsWithDistance = rows.map((r) => {
      const lat = Number((r as { lat: number | null }).lat);
      const lng = Number((r as { lng: number | null }).lng);
      const distanceKm = Number.isFinite(lat) && Number.isFinite(lng)
        ? haversineKm(origin, { lat, lng })
        : Number.POSITIVE_INFINITY;
      const createdAtMs = new Date(String((r as { created_at?: string | null }).created_at ?? 0)).getTime();
      return {
        row: r,
        distanceKm,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
      };
    });

    rowsWithDistance.sort((a, b) => {
      if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
      return a.distanceKm - b.distanceKm;
    });

    return rowsWithDistance.map((x) => x.row);
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
  const [bedroomFilter, setBedroomFilter] = useState<number | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [locationFilter, setLocationFilter] = useState("");
  const [adults, setAdults] = useState(() => Math.max(1, Number(searchParams.get("adults")) || 1));
  const [children, setChildren] = useState(() => Math.max(0, Number(searchParams.get("children")) || 0));
  const guestCount = adults + children;
  const [startDate, setStartDate] = useState(() => searchParams.get("start") ?? "");
  const [endDate, setEndDate] = useState(() => searchParams.get("end") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [monthlyFilterMode, setMonthlyFilterMode] = useState<MonthlyFilterMode>(() => monthlyModeFromParams(searchParams));
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
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const maxPrice = useMemo(
    () => convertAmount(maxPriceUsd, "USD", preferredCurrency, usdRates) ?? maxPriceUsd,
    [maxPriceUsd, preferredCurrency, usdRates]
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [maxPriceUsd, selectedTypes.length, selectedAmenities.length, bedroomFilter, minRating, locationFilter, guestCount, monthlyFilterMode, hostId]);

  useEffect(() => {
    setCurrentPage(1);
    
    // Update guests from URL parameters
    const a = Number(searchParams.get("adults")) || 0;
    const c = Number(searchParams.get("children")) || 0;
    if (a > 0 || c > 0) {
      setAdults(Math.max(1, a));
      setChildren(c);
    }
    
    // Update dates from URL parameters
    setStartDate(searchParams.get("start") ?? "");
    setEndDate(searchParams.get("end") ?? "");

    // Auto-apply monthly filter when coming from month-based smart search
    setMonthlyFilterMode(monthlyModeFromParams(searchParams));
  }, [searchParams]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (locationFilter.trim()) params.set("location", locationFilter.trim());
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (adults > 1) params.set("adults", String(adults));
    if (children > 0) params.set("children", String(children));
    const qs = params.toString();
    navigate(qs ? `/accommodations?${qs}` : "/accommodations");
  };

  const requestNearbyRecommendations = useCallback(async (options?: { silent?: boolean; position?: GeolocationPosition }) => {
    const silent = Boolean(options?.silent);

    const applyPosition = async (pos: GeolocationPosition) => {
      const params = new URLSearchParams(searchParams);
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      const currentLat = Number(searchParams.get("lat"));
      const currentLng = Number(searchParams.get("lng"));
      const currentRegion = (searchParams.get("region") ?? "").trim();
      const coordsChanged =
        !Number.isFinite(currentLat) ||
        !Number.isFinite(currentLng) ||
        Math.abs(currentLat - latitude) > 0.0005 ||
        Math.abs(currentLng - longitude) > 0.0005;

      params.set("nearby", "1");
      params.set("lat", String(latitude));
      params.set("lng", String(longitude));

      if (coordsChanged || !currentRegion) {
        try {
          const reverse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
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
      }

      const nextQuery = params.toString();
      if (nextQuery !== searchParams.toString()) {
        navigate(`/accommodations?${nextQuery}`, { replace: true });
      }
    };

    if (options?.position) {
      await applyPosition(options.position);
      return;
    }

    if (!("geolocation" in navigator)) {
      if (!silent) {
        toast({ variant: "destructive", title: "Location not available", description: "Your browser does not support geolocation." });
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void applyPosition(pos);
      },
      () => {
        if (!silent) {
          toast({ variant: "destructive", title: "Location permission denied", description: "Allow location access to get nearby recommendations." });
        }
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [navigate, searchParams, toast]);

  useEffect(() => {
    let watchId: number | null = null;
    let permissionStatus: PermissionStatus | null = null;
    let cancelled = false;

    const stopWatching = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const startWatching = () => {
      if (!("geolocation" in navigator) || watchId !== null) return;

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          void requestNearbyRecommendations({ silent: true, position: pos });
        },
        () => {
          stopWatching();
        },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
      );
    };

    const syncNearbyRecommendations = async () => {
      if (!("permissions" in navigator) || typeof navigator.permissions?.query !== "function") {
        await requestNearbyRecommendations({ silent: true });
        startWatching();
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: "geolocation" });
        if (cancelled) return;

        const handlePermissionChange = () => {
          if (permissionStatus?.state === "granted") {
            void requestNearbyRecommendations({ silent: true });
            startWatching();
          } else {
            stopWatching();
          }
        };

        permissionStatus.onchange = handlePermissionChange;
        if (permissionStatus.state === "granted") {
          await requestNearbyRecommendations({ silent: true });
          startWatching();
        }
      } catch {
        await requestNearbyRecommendations({ silent: true });
        startWatching();
      }
    };

    void syncNearbyRecommendations();

    return () => {
      cancelled = true;
      stopWatching();
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [requestNearbyRecommendations]);

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
      bedroomFilter ?? "",
      minRating,
      hostId ?? "",
      nearby ? `${nearby.lat},${nearby.lng}` : "",
      locationFilter,
      guestCount,
      startDate,
      endDate,
      monthlyFilterMode,
    ],
    queryFn: () =>
      fetchProperties({
        maxPriceInDisplayCurrency: maxPrice,
        displayCurrency: preferredCurrency,
        usdRates,
        search: searchParams.get("q") ?? "",
        propertyTypes: selectedTypes,
        amenities: selectedAmenities,
        bedrooms: bedroomFilter,
        minRating,
        hostId,
        nearby,
        location: locationFilter,
        guests: guestCount,
        startDate,
        endDate,
        monthlyFilterMode,
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes for search results
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchOnMount: true, // Fresh results on mount
    refetchOnWindowFocus: true,
  });

  const mainContentLoading = propertiesLoading;

  const { data: hostPreview } = useQuery({
    queryKey: ["host-preview", hostId],
    enabled: Boolean(hostId),
    queryFn: async () => {
      const hid = String(hostId ?? "");
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, nickname, avatar_url, bio")
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
        ? await supabase
            .from("property_reviews")
            .select("rating, property_id")
            .in("property_id", propIds)
            .or("is_hidden.eq.false,is_hidden.is.null")
        : { data: [] as Array<{ rating: number; property_id: string }>, error: null };
      const ratings = (reviews ?? []).map((r) => Number(r.rating)).filter((n) => Number.isFinite(n) && n > 0);
      const reviewCount = ratings.length;
      const avg = reviewCount > 0 ? ratings.reduce((a, b) => a + b, 0) / reviewCount : null;

      return {
        profile: prof as { user_id: string; full_name: string | null; nickname: string | null; avatar_url: string | null; bio: string | null } | null,
        listings: propIds.length,
        hostingSince: hostingSince ? new Date(hostingSince).toISOString() : null,
        reviewCount,
        rating: avg ? Math.round(avg * 100) / 100 : null,
      };
    },
  });

  const hostPreviewName = hostPreview?.profile?.nickname || hostPreview?.profile?.full_name || "Host";

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
    (bedroomFilter !== null ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (locationFilter.trim() ? 1 : 0) +
    (startDate || endDate ? 1 : 0) +
    (guestCount > 1 ? 1 : 0) +
    (monthlyFilterMode !== "all" ? 1 : 0);
  const totalPages = Math.ceil(properties.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search Bar - Airbnb Style */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-5 sm:py-8">
          {/* Desktop */}
          <div className="hidden sm:flex items-center bg-card rounded-full shadow-search border border-border divide-x divide-border max-w-3xl mx-auto">
            {/* Location */}
            <div className="flex-1 min-w-0 px-6 py-3">
              <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wide">Location</label>
              <input
                type="text"
                placeholder="Where are you going?"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm mt-0.5"
              />
            </div>
            {/* Check-in */}
            <div className="min-w-[130px] px-6 py-3">
              <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wide">Check in</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-transparent text-foreground focus:outline-none text-sm mt-0.5 [color-scheme:light]"
              />
            </div>
            {/* Check-out */}
            <div className="min-w-[130px] px-6 py-3">
              <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wide">Check out</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-transparent text-foreground focus:outline-none text-sm mt-0.5 [color-scheme:light]"
              />
            </div>
            {/* Guests */}
            <div className="min-w-[130px] px-6 py-3 relative">
              <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wide">Guests</label>
              <button
                type="button"
                onClick={() => setGuestsOpen(!guestsOpen)}
                className="w-full text-left bg-transparent text-foreground focus:outline-none text-sm mt-0.5"
              >
                {guestCount > 0 ? `${guestCount} guest${guestCount !== 1 ? 's' : ''}` : "Add guests"}
              </button>
              {guestsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setGuestsOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 w-72 bg-card rounded-xl shadow-lg border border-border p-4 z-50">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-sm font-medium">Adults</div>
                        <div className="text-xs text-muted-foreground">Ages 13+</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={adults <= 1}
                        >−</button>
                        <span className="w-6 text-center text-sm">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults(Math.min(20, adults + 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >+</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-border">
                      <div>
                        <div className="text-sm font-medium">Children</div>
                        <div className="text-xs text-muted-foreground">Ages 2-12</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={children <= 0}
                        >−</button>
                        <span className="w-6 text-center text-sm">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren(Math.min(10, children + 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >+</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Search button */}
            <div className="pr-2 pl-4">
              <button
                type="button"
                onClick={handleSearch}
                className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile */}
          <div className="sm:hidden">
            <div className="bg-card rounded-2xl shadow-search border border-border p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wide mb-1">Location</label>
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wide mb-1">Check in</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-transparent text-foreground focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wide mb-1">Check out</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-transparent text-foreground focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wide">Guests</label>
                  <button
                    type="button"
                    onClick={() => setGuestsOpen(!guestsOpen)}
                    className="text-sm text-primary font-medium"
                  >
                    {guestsOpen ? "Done" : "Edit"}
                  </button>
                </div>
                <div className="text-sm text-foreground">
                  {guestCount > 0 ? `${guestCount} guest${guestCount !== 1 ? 's' : ''}` : "Add guests"}
                </div>
                {guestsOpen && (
                  <div className="space-y-3 pt-3 mt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Adults</div>
                        <div className="text-xs text-muted-foreground">Ages 13+</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground disabled:opacity-30"
                          disabled={adults <= 1}
                        >−</button>
                        <span className="w-6 text-center text-sm">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults(Math.min(20, adults + 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground"
                        >+</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Children</div>
                        <div className="text-xs text-muted-foreground">Ages 2-12</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground disabled:opacity-30"
                          disabled={children <= 0}
                        >−</button>
                        <span className="w-6 text-center text-sm">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren(Math.min(10, children + 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground"
                        >+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 py-12 pb-24 lg:pb-12">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("accommodations.title")}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground">{t("accommodations.subtitle")}</p>
            {monthlyFilterMode !== "all" ? (
              <button
                type="button"
                onClick={() => setMonthlyFilterMode("all")}
                className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15"
                title="Clear monthly filter"
              >
                Monthly stays active: {monthlyFilterLabel[monthlyFilterMode]} ×
              </button>
            ) : null}
          </div>
        </div>

        {hostId && hostPreview ? (
          <div className="mb-8 bg-card rounded-xl shadow-card p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                {hostPreview.profile?.avatar_url ? (
                  <img
                    src={hostPreview.profile.avatar_url}
                    alt={hostPreviewName}
                    className="w-12 h-12 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted" />
                )}
                <div>
                  <div className="text-lg font-semibold text-foreground">
                    Hosted by {hostPreviewName}
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
        <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DrawerContent className="p-0 max-h-[88dvh] flex flex-col">
            <DrawerHeader className="p-6 pb-2">
              <DrawerTitle>{t("accommodations.filters")}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 min-h-0 p-6 pt-4 overflow-y-auto">
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
                <AccordionItem value="bedrooms">
                  <AccordionTrigger>Bedrooms</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Any", value: null },
                        { label: "Studio", value: 0 },
                        { label: "1", value: 1 },
                        { label: "2", value: 2 },
                        { label: "3", value: 3 },
                        { label: "4", value: 4 },
                        { label: "5", value: 5 },
                        { label: "6+", value: 6 },
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => setBedroomFilter(opt.value === bedroomFilter ? null : opt.value)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            bedroomFilter === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="rental-type">
                  <AccordionTrigger>Rental Duration</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { value: "all", label: "All rentals" },
                        { value: "monthly_only", label: "Monthly only" },
                        { value: "monthly_available", label: "Monthly available" },
                        { value: "nightly_only", label: "Nightly only" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setMonthlyFilterMode(opt.value as MonthlyFilterMode)}
                          className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                            monthlyFilterMode === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="amenities">
                  <AccordionTrigger>{t("accommodations.amenities")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            <div className="p-4 border-t border-border bg-background flex items-center justify-between gap-3">
              {activeFiltersCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMaxPriceUsd(PRICE_SLIDER_MAX_USD);
                    setSelectedTypes([]);
                    setSelectedAmenities([]);
                    setBedroomFilter(null);
                    setMinRating(0);
                    setLocationFilter("");
                    setAdults(1);
                    setChildren(0);
                    setStartDate("");
                    setEndDate("");
                    setMonthlyFilterMode("all");
                  }}
                >
                  Clear
                </Button>
              )}
              <Button type="button" onClick={() => setFiltersOpen(false)}>
                Apply
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar (desktop only, minimized with accordion) */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{t("accommodations.filters")}</h3>
                {activeFiltersCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMaxPriceUsd(PRICE_SLIDER_MAX_USD);
                      setSelectedTypes([]);
                      setSelectedAmenities([]);
                      setBedroomFilter(null);
                      setMinRating(0);
                      setLocationFilter("");
                      setAdults(1);
                      setChildren(0);
                      setStartDate("");
                      setEndDate("");
                      setMonthlyFilterMode("all");
                    }}
                  >
                    Clear
                  </Button>
                )}
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

                <AccordionItem value="bedrooms">
                  <AccordionTrigger>Bedrooms</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Any", value: null },
                        { label: "Studio", value: 0 },
                        { label: "1", value: 1 },
                        { label: "2", value: 2 },
                        { label: "3", value: 3 },
                        { label: "4", value: 4 },
                        { label: "5", value: 5 },
                        { label: "6+", value: 6 },
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => setBedroomFilter(opt.value === bedroomFilter ? null : opt.value)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            bedroomFilter === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="rental-type-mobile">
                  <AccordionTrigger>Rental Duration</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "all", label: "All rentals" },
                        { value: "monthly_only", label: "Monthly only" },
                        { value: "monthly_available", label: "Monthly available" },
                        { value: "nightly_only", label: "Nightly only" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setMonthlyFilterMode(opt.value as MonthlyFilterMode)}
                          className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                            monthlyFilterMode === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
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
              {/* All screens: 3-column grid */}
            {mainContentLoading ? (
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
                <motion.div
                  className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                >
                  {properties
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((property) => (
                    <motion.div
                      key={property.id}
                      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <PropertyCard
                      id={property.id}
                      image={property.images?.[0] ?? null}
                      images={property.images ?? null}
                      title={property.title}
                      location={property.location}
                      rating={Number(property.rating) || 0}
                      reviews={property.review_count || 0}
                      price={Number((property as any).monthly_only_listing ? ((property as any).price_per_month ?? 0) : (property.price_per_night ?? 0))}
                      pricePeriod={(property as any).monthly_only_listing ? "month" : "night"}
                      currency={property.currency}
                      type={property.property_type}
                      isFavorited={favoritesSet.has(property.id)}
                      onToggleFavorite={async () => {
                        const isFav = favoritesSet.has(property.id);
                        const changed = await toggleFavorite(String(property.id), isFav);
                        if (changed) {
                          await qc.invalidateQueries({ queryKey: ["favorites", "ids", user?.id] });
                        }
                      }}
                    />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Pagination Controls */}
                {properties.length > ITEMS_PER_PAGE && (
                  <div className="col-span-full flex flex-wrap items-center justify-center gap-2 mt-8">
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

                    <span className="sm:hidden text-sm text-muted-foreground px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
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
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
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
