import { Search, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { formatMoney } from "@/lib/money";
import { convertAmount } from "@/lib/fx";
import { useFxRates } from "@/hooks/useFxRates";
import { usePreferences } from "@/hooks/usePreferences";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { extractNeighborhood } from "@/lib/location";
import { useTripCart } from "@/hooks/useTripCart";

const ALL_CATEGORY_VALUE = "All";
const ANY_DURATION_VALUE = "Any Duration";

const categories: Array<{ value: string; labelKey: string }> = [
  { value: "All", labelKey: "tours.categories.all" },
  { value: "Nature", labelKey: "tours.categories.nature" },
  { value: "Adventure", labelKey: "tours.categories.adventure" },
  { value: "Cultural", labelKey: "tours.categories.cultural" },
  { value: "Wildlife", labelKey: "tours.categories.wildlife" },
  { value: "Historical", labelKey: "tours.categories.historical" },
];

type TourRow = Pick<
  Tables<"tours">,
  | "id"
  | "title"
  | "description"
  | "category"
  | "difficulty"
  | "duration_days"
  | "price_per_person"
  | "currency"
  | "images"
  | "rating"
  | "review_count"
  | "location"
> & {
  source?: "tours" | "tour_packages"; // Track which table this item came from
  host_id?: string;
  business_name?: string | null;
};

const durationToFilter = (duration: string) => {
  if (duration === "Half Day") return { kind: "lte" as const, value: 1 };
  if (duration === "Full Day") return { kind: "eq" as const, value: 1 };
  if (duration === "Multi-Day") return { kind: "gte" as const, value: 2 };
  return null;
};

const fetchTours = async ({
  q,
  category,
  duration,
}: {
  q: string;
  category: string;
  duration: string;
}): Promise<TourRow[]> => {
  // Fetch from both tours and tour_packages tables
  let toursQuery = supabase
    .from("tours")
    .select(
      "id, title, description, category, difficulty, duration_days, price_per_person, currency, images, rating, review_count, location, created_by"
    )
    .or("is_published.eq.true,is_published.is.null")
    .order("created_at", { ascending: false });

  const trimmed = q.trim();
  if (trimmed) {
    toursQuery = toursQuery.or(`title.ilike.%${trimmed}%,location.ilike.%${trimmed}%`);
  }

  if (category && category !== "All") {
    toursQuery = toursQuery.eq("category", category);
  }

  const dur = durationToFilter(duration);
  if (dur?.kind === "eq") toursQuery = toursQuery.eq("duration_days", dur.value);
  if (dur?.kind === "lte") toursQuery = toursQuery.lte("duration_days", dur.value);
  if (dur?.kind === "gte") toursQuery = toursQuery.gte("duration_days", dur.value);

  // Fetch tour_packages
  let packagesQuery = supabase
    .from("tour_packages")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (trimmed) {
    packagesQuery = packagesQuery.or(`title.ilike.%${trimmed}%,city.ilike.%${trimmed}%`);
  }

  const [toursRes, packagesRes] = await Promise.all([
    toursQuery,
    packagesQuery,
  ]);

  if (toursRes.error) throw toursRes.error;
  
  const tours = ((toursRes.data as any[]) ?? []).map(t => ({
    ...t,
    source: "tours" as const,
    host_id: t.created_by,
  })) as TourRow[];
  
  // Convert tour_packages to TourRow format
  let allTours = tours;
  if (packagesRes.data && !packagesRes.error) {
    const packagesAsTours: TourRow[] = packagesRes.data.map(pkg => ({
      id: pkg.id,
      title: pkg.title,
      description: pkg.description,
      category: pkg.category as any,
      difficulty: null,
      duration_days: parseInt(pkg.duration) || 1,
      price_per_person: pkg.price_per_adult,
      currency: pkg.currency,
      images: [pkg.cover_image, ...(Array.isArray(pkg.gallery_images) ? pkg.gallery_images : [])].filter(Boolean) as string[],
      rating: null,
      review_count: null,
      location: `${pkg.city}, ${pkg.country}`,
      source: "tour_packages" as const,
      host_id: pkg.host_id,
    }));
    
    allTours = [...tours, ...packagesAsTours];
  }
  
  // Fetch business names for all host IDs
  const hostIds = [...new Set(allTours.map(t => t.host_id).filter(Boolean))] as string[];
  if (hostIds.length > 0) {
    const { data: hostApps } = await supabase
      .from("host_applications")
      .select("user_id, business_name")
      .in("user_id", hostIds);
    
    if (hostApps) {
      const businessNameMap = new Map(hostApps.map(app => [app.user_id, app.business_name]));
      allTours.forEach(t => {
        if (t.host_id) {
          t.business_name = businessNameMap.get(t.host_id) || null;
        }
      });
    }
  }
  
  return allTours;
};

const Tours = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart: addCartItem } = useTripCart();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_VALUE);
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState(ANY_DURATION_VALUE);
  const navigate = useNavigate();

  // Keep local state in sync with URL
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setDuration(searchParams.get("duration") ?? ANY_DURATION_VALUE);
    setActiveCategory(searchParams.get("category") ?? ALL_CATEGORY_VALUE);
  }, [searchParams]);

  const runSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (duration && duration !== ANY_DURATION_VALUE) params.set("duration", duration);
    if (activeCategory && activeCategory !== ALL_CATEGORY_VALUE) params.set("category", activeCategory);
    const qs = params.toString();
    navigate(qs ? `/tours?${qs}` : "/tours");
  };

  const { data: tours = [], isError, isLoading: toursLoading, refetch: refetchTours } = useQuery({
    queryKey: [
      "tours",
      searchParams.get("q") ?? "",
      searchParams.get("category") ?? ALL_CATEGORY_VALUE,
      searchParams.get("duration") ?? ANY_DURATION_VALUE,
    ],
    queryFn: () =>
      fetchTours({
        q: searchParams.get("q") ?? "",
        category: searchParams.get("category") ?? ALL_CATEGORY_VALUE,
        duration: searchParams.get("duration") ?? ANY_DURATION_VALUE,
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const addToCart = async (tour: TourRow) => {
    const itemType = tour.source === "tour_packages" ? "tour_package" : "tour";
    const ok = await addCartItem(itemType, tour.id, 1);
    if (!ok) return;
    toast({ title: t("tours.toast.addedTitle"), description: tour.source === "tour_packages" ? t("tours.toast.packageAdded") : t("tours.toast.tourAdded") });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="py-16 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">{t("tours.title")}</h1>
        <p className="text-muted-foreground">{t("tours.subtitle")}</p>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
        <div className="bg-card rounded-xl shadow-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
          <div className="flex-1 flex items-center gap-2 px-4">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("tours.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              className="bg-transparent text-sm text-muted-foreground focus:outline-none"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value={ANY_DURATION_VALUE}>{t("tours.duration.any")}</option>
              <option value="Half Day">{t("tours.duration.halfDay")}</option>
              <option value="Full Day">{t("tours.duration.fullDay")}</option>
              <option value="Multi-Day">{t("tours.duration.multiDay")}</option>
            </select>
            <Button variant="search" className="gap-2" type="button" onClick={runSearch}>
              <Search className="w-4 h-4" />
              {t("common.search")}
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => {
                setActiveCategory(category.value);
                const params = new URLSearchParams();
                if (query.trim()) params.set("q", query.trim());
                if (duration && duration !== ANY_DURATION_VALUE) params.set("duration", duration);
                if (category.value && category.value !== ALL_CATEGORY_VALUE) params.set("category", category.value);
                const qs = params.toString();
                navigate(qs ? `/tours?${qs}` : "/tours");
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground hover:border-primary"
              }`}
            >
              {t(category.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Tours */}
      <div className="container mx-auto px-4 lg:px-8 py-10">
        {toursLoading ? (
          <LoadingSpinner message={t("tours.loading")} />
        ) : isError ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">{t("tours.errorLoading")}</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">{t("tours.noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="group rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer"
                onClick={() => navigate(`/tours/${tour.id}`)}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {tour.images?.length ? (
                    <ListingImageCarousel images={tour.images} alt={tour.title} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
                  )}
                  {tour.categories && tour.categories.length > 0 && (
                    <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
                      {tour.categories.slice(0, 2).map((cat: string) => (
                        <span key={cat} className="px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium">
                          {cat}
                        </span>
                      ))}
                      {tour.categories.length > 2 && (
                        <span className="px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium">
                          +{tour.categories.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                    <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                      <h3 className="font-semibold text-sm md:text-base text-foreground line-clamp-1">{tour.title}</h3>
                      {tour.source === "tour_packages" ? (
                        <Badge variant="outline" className="text-[10px] md:text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 shrink-0 px-1.5 py-0.5">
                          {t("tours.badge.package")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] md:text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 shrink-0 px-1.5 py-0.5">
                          {t("tours.badge.tour")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                      <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-primary text-primary" />
                      <span className="text-xs md:text-sm font-medium">{Number(tour.rating ?? 0).toFixed(1)}</span>
                      <span className="text-xs md:text-sm text-muted-foreground">({tour.review_count ?? 0})</span>
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-muted-foreground mb-1.5 md:mb-2">{extractNeighborhood(tour.location)}</p>
                  {tour.business_name && (
                    <p className="text-[10px] md:text-xs text-primary/80 font-medium mb-1 truncate">{tour.business_name}</p>
                  )}
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-2 md:mb-3">
                    {tour.difficulty} · {tour.duration_days} {tour.duration_days === 1 ? t("common.day") : t("common.days")}
                  </p>

                  <div className="flex items-center justify-between gap-2 md:gap-3">
                    <div className="text-foreground">
                      <span className="font-bold text-sm md:text-base">
                        {(() => {
                          const amt = Number(tour.price_per_person);
                          const from = String(tour.currency ?? "RWF");
                          const converted = convertAmount(amt, from, preferredCurrency, usdRates);
                          return formatMoney(converted ?? amt, converted !== null ? preferredCurrency : from);
                        })()}
                      </span>
                      <span className="text-[10px] md:text-sm text-muted-foreground"> {t("common.perPerson")}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8 px-2.5 md:px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(tour);
                      }}
                    >
                      {t("common.addToCart")}
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

export default Tours;
