import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import ImageGallery from "@/components/ImageGallery";
import { formatMoney } from "@/lib/money";
import { convertAmount } from "@/lib/fx";
import { useFxRates } from "@/hooks/useFxRates";
import { usePreferences } from "@/hooks/usePreferences";
import { useTripCart } from "@/hooks/useTripCart";
import { 
  MapPin, 
  Clock, 
  Users, 
  Star,
  Calendar,
  Globe,
  Award,
  FileText,
  ArrowLeft,
  Info,
  Mail,
  Phone,
  Download,
  BadgeCheck,
  Minus,
  Plus
} from "lucide-react";
import { extractNeighborhood } from "@/lib/location";
import { useTranslation } from "react-i18next";

type TourDetailsData = {
  source: "tours" | "tour_packages";
  tour: any;
  host?: {
    full_name?: string | null;
    nickname?: string | null;
    years_of_experience?: string | number | null;
    languages_spoken?: string[] | null;
    tour_guide_bio?: string | null;
    avatar_url?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at?: string | null;
  } | null;
};

export default function TourDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useTripCart();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const { t } = useTranslation();
  const [participants, setParticipants] = useState(1);

  const categoryLabel = (category: string) => {
    const key = String(category ?? "")
      .trim()
      .toLowerCase();
    if (!key) return category;
    if (key === "all") return t("tours.categories.all");
    if (key === "nature") return t("tours.categories.nature");
    if (key === "adventure") return t("tours.categories.adventure");
    if (key === "cultural") return t("tours.categories.cultural");
    if (key === "wildlife") return t("tours.categories.wildlife");
    if (key === "historical") return t("tours.categories.historical");
    return category;
  };

  const displayMoney = (amount: number, fromCurrency: string) => {
    const converted = convertAmount(amount, fromCurrency, preferredCurrency, usdRates);
    return formatMoney(converted ?? amount, converted !== null ? preferredCurrency : fromCurrency);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["tour-with-host", id],
    queryFn: async () => {
      // react-router's params are typed as string | undefined; enabled: !!id guarantees it's present.
      const tourId = id as string;

      // Try tours table first
      const { data: tourData, error: tourError } = await (supabase
        .from("tours") as any)
        .select("*")
        .eq("id", tourId)
        .maybeSingle();

      const tour = tourData as any;

      if (!tourError && tour) {
        if (tour.created_by) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, nickname, years_of_experience, languages_spoken, tour_guide_bio, avatar_url, email, phone, created_at")
            .eq("user_id", tour.created_by)
            .maybeSingle();
          
          if (profileError) {
            console.warn("[TourDetails] Profile fetch failed:", profileError);
          }
          return { source: "tours", tour, host: profile } as TourDetailsData;
        }
        return { source: "tours", tour, host: null } as TourDetailsData;
      }

      // If not found in tours, try tour_packages
      if (tourError) {
        throw tourError;
      }

      const { data: pkg, error: pkgError } = await (supabase
        .from("tour_packages") as any)
        .select("*")
        .eq("id", tourId)
        .single();

      const pkgAny = pkg as any;

      if (pkgError) throw pkgError;

      if (pkgAny?.host_id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, nickname, years_of_experience, languages_spoken, tour_guide_bio, avatar_url, email, phone, created_at")
          .eq("user_id", pkgAny.host_id)
          .maybeSingle();
        
        if (profileError) {
          console.warn("[TourDetails] Profile fetch failed:", profileError);
        }
        
        return { source: "tour_packages", tour: pkgAny, host: profile } as TourDetailsData;
      }

      return { source: "tour_packages", tour: pkgAny, host: null } as TourDetailsData;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const tour = data?.tour;
  const hostProfile = data?.host ?? null;
  
  // Get the host ID - from created_by (tours table) or host_id (tour_packages table)
  const hostId = tour?.created_by || tour?.host_id;

  // Check if host is verified and get business name from host_applications
  const { data: hostAppData } = useQuery({
    queryKey: ["host-app-data", hostId],
    enabled: Boolean(hostId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!hostId) return { verified: false, businessName: null };
      
      const { data: app, error } = await supabase
        .from("host_applications")
        .select("profile_complete, business_name")
        .eq("user_id", hostId)
        .order("profile_complete", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) return { verified: false, businessName: null };
      const appData = app as { profile_complete?: boolean; business_name?: string } | null;
      return { 
        verified: appData?.profile_complete === true,
        businessName: appData?.business_name || null
      };
    },
  });
  
  const hostVerified = hostAppData?.verified ?? false;
  const hostBusinessName = hostAppData?.businessName;

  const isPackage = data?.source === "tour_packages";
  const normalizedImages = isPackage
    ? [tour?.cover_image, ...(Array.isArray(tour?.gallery_images) ? tour.gallery_images : [])].filter(Boolean)
    : tour?.images ?? [];
  const normalizedDurationDays = isPackage
    ? Number.parseInt(tour?.duration ?? "1", 10) || 1
    : tour?.duration_days ?? 1;
  const normalizedPrice = isPackage ? tour?.price_per_adult : tour?.price_per_person;
  const normalizedCurrency = tour?.currency ?? "RWF";
  const normalizedMaxGroup = isPackage ? tour?.max_guests : tour?.max_group_size;
  const normalizedDifficulty = tour?.difficulty ?? null;
  const normalizedLocation = isPackage
    ? [tour?.city, tour?.country].filter(Boolean).join(", ")
    : tour?.location;
  const normalizedCategories = isPackage
    ? [tour?.category].filter(Boolean)
    : (tour?.categories ?? (tour?.category ? [tour.category] : []));
  const nonRefundableItems = Array.isArray(tour?.non_refundable_items)
    ? tour?.non_refundable_items
    : [];

  // Support pricing tiers for both regular tours and tour packages
  const pricingTiers = ((): Array<{ group_size: number; price_per_person: number }> => {
    const raw = (tour as any)?.pricing_tiers;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((t: any) => ({
        group_size: Math.max(1, Math.floor(Number(t?.group_size) || 0)),
        price_per_person: Number(t?.price_per_person) || 0,
      }))
      .filter((t) => t.group_size >= 1 && t.price_per_person > 0)
      .sort((a, b) => b.group_size - a.group_size);
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-32"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded w-3/4"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{t("tourDetails.notFound")}</h1>
          <Button onClick={() => navigate("/tours")}>{t("tourDetails.backToTours")}</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-primary font-medium hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.back")}
        </button>

        {/* Hero Section with Image Gallery */}
        <div className="mb-8">
          {normalizedImages?.length ? (
            <ImageGallery
              images={normalizedImages}
              alt={tour.title}
            />
          ) : (
            <div className="w-full aspect-[16/9] bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center rounded-xl">
              <Info className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Main content (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and metadata */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {normalizedCategories.map((category: string) => (
                  <Badge key={category} variant="secondary" className="text-xs">{categoryLabel(category)}</Badge>
                ))}
                {tour.rating && (
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                    <span className="font-semibold">{tour.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({tour.review_count || 0} {t("common.reviews")})</span>
                  </div>
                )}
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">{tour.title}</h1>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{normalizedLocation || t("tourDetails.locationNotSpecified")}</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {normalizedDurationDays && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>
                      {normalizedDurationDays} {normalizedDurationDays === 1 ? t("common.day") : t("common.days")}
                    </span>
                  </div>
                )}
                {normalizedMaxGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{t("tourDetails.upToGuests", { count: normalizedMaxGroup })}</span>
                  </div>
                )}
                {normalizedDifficulty && (
                  <Badge variant="outline" className="text-xs">
                    {normalizedDifficulty}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description - Prominent Section */}
            <div className="border-t pt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t("tourDetails.aboutTour")}</h2>
              {tour.description ? (
                <div className="bg-card rounded-lg border p-5">
                  <p className="text-foreground leading-relaxed whitespace-pre-line text-base">
                    {tour.description}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">{t("tourDetails.noDescription")}</p>
              )}
            </div>

            {/* Daily Itinerary */}
            {isPackage && tour?.daily_itinerary && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-3">{t("tourDetails.dailyItinerary")}</h2>
                <div className="bg-muted/30 rounded-lg p-5">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {tour.daily_itinerary}
                  </p>
                </div>
              </div>
            )}

            {/* What's included/excluded */}
            {isPackage && (tour?.included_services || tour?.excluded_services) && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("tourDetails.whatToExpect")}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {tour?.included_services && (
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">{t("tourDetails.whatsIncluded")}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.included_services}
                      </p>
                    </div>
                  )}
                  {tour?.excluded_services && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">{t("tourDetails.whatsNotIncluded")}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.excluded_services}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meeting point & What to bring */}
            {isPackage && (tour?.meeting_point || tour?.what_to_bring) && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("tourDetails.importantInfo")}</h2>
                <div className="space-y-4">
                  {tour?.meeting_point && (
                    <div className="bg-card rounded-lg border p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {t("tourDetails.meetingPoint")}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.meeting_point}
                      </p>
                    </div>
                  )}
                  {tour?.what_to_bring && (
                    <div className="bg-card rounded-lg border p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-primary" />
                        {t("tourDetails.whatToBring")}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.what_to_bring}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PDF Itinerary - Compact Card */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">{t("tourDetails.detailedItinerary")}</h2>
              {tour.itinerary_pdf_url ? (
                <div className="bg-card rounded-lg border p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("tourDetails.tourItinerary")}</p>
                      <p className="text-sm text-muted-foreground">{t("tourDetails.pdfDocument")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={tour.itinerary_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                      {t("common.view")}
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(tour.itinerary_pdf_url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${tour.title?.replace(/[^a-z0-9]/gi, '_') || 'itinerary'}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          // Fallback: open in new tab if download fails
                          window.open(tour.itinerary_pdf_url, '_blank');
                        }
                      }}
                      className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {t("common.download")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {t("tourDetails.noItinerary")}
                  </p>
                </div>
              )}
            </div>

            {/* Cancellation Policy */}
            {isPackage && (tour?.cancellation_policy_type || tour?.cancellation_policy || tour?.custom_cancellation_policy_url || nonRefundableItems.length > 0) && (
              <Card className="border-t-4 border-t-primary">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{t("tourDetails.cancellationTitle")}</CardTitle>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <Info className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="max-w-xs">
                        <p className="text-xs">
                          {t("tourDetails.cancellation.popover")}
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tour?.cancellation_policy_type && tour.cancellation_policy_type !== 'custom' && (
                    <div className="bg-muted p-4 rounded-md">
                      {tour.cancellation_policy_type === 'standard' && (
                        <>
                          <div className="text-sm font-semibold mb-2">{t("tourDetails.cancellation.standardTitle")}</div>
                          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>{t("tourDetails.cancellation.standardItem1")}</li>
                            <li>{t("tourDetails.cancellation.standardItem2")}</li>
                            <li>{t("tourDetails.cancellation.standardItem3")}</li>
                            <li>{t("tourDetails.cancellation.standardItem4")}</li>
                          </ul>
                        </>
                      )}
                      
                      {tour.cancellation_policy_type === 'multiday_private' && (
                        <>
                          <div className="text-sm font-semibold mb-2">{t("tourDetails.cancellation.multidayTitle")}</div>
                          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>{t("tourDetails.cancellation.multidayItem1")}</li>
                            <li>{t("tourDetails.cancellation.multidayItem2")}</li>
                            <li>{t("tourDetails.cancellation.multidayItem3")}</li>
                            <li>{t("tourDetails.cancellation.multidayItem4")}</li>
                          </ul>
                        </>
                      )}
                      
                      {tour.cancellation_policy_type === 'non_refundable' && (
                        <>
                          <div className="text-sm font-semibold mb-2">{t("tourDetails.cancellation.nonRefundableTitle")}</div>
                          <p className="text-sm text-muted-foreground mb-2">{t("tourDetails.cancellation.nonRefundableIntro")}</p>
                          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                            <li>{t("tourDetails.cancellation.nonRefundableItem1")}</li>
                            <li>{t("tourDetails.cancellation.nonRefundableItem2")}</li>
                            <li>{t("tourDetails.cancellation.nonRefundableItem3")}</li>
                            <li>{t("tourDetails.cancellation.nonRefundableItem4")}</li>
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                  
                  {tour?.cancellation_policy_type === 'custom' && tour?.cancellation_policy && (
                    <div>
                      <div className="text-sm font-medium text-foreground mb-1.5">{t("tourDetails.cancellation.customTitle")}</div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.cancellation_policy}
                      </p>
                    </div>
                  )}
                  
                  {tour?.custom_cancellation_policy_url && (
                    <div>
                      <a 
                        href={tour.custom_cancellation_policy_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {t("tourDetails.cancellation.viewFullPdf")}
                      </a>
                    </div>
                  )}
                  
                  {nonRefundableItems.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                        <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          {t("tourDetails.cancellation.nonRefundableItems")}
                        </div>
                      </div>
                      <ul className="text-sm text-amber-800 dark:text-amber-200 list-disc pl-5 space-y-1">
                        {nonRefundableItems.map((item: string) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Booking & Host (1/3 width, sticky) */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Booking card */}
            <div className="bg-card rounded-xl shadow-lg border p-6">
              <div className="mb-6">
                <div className="text-3xl font-bold text-primary">
                  {displayMoney(Number(normalizedPrice ?? 0), String(normalizedCurrency ?? "RWF"))}
                </div>
                <div className="text-sm text-muted-foreground">{t("tourDetails.perPerson")}</div>
              </div>

              {/* Residency-based pricing */}
              {(tour as any)?.has_differential_pricing && (
                <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="text-sm font-semibold text-foreground mb-3">{t("tourDetails.pricingByResidency", "Pricing by Residency")}</div>
                  <div className="space-y-2">
                    {(tour as any)?.price_for_citizens && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">🇷🇼 {t("tourDetails.nationalCitizens", "National Citizens")}</span>
                        <span className="font-semibold text-primary">
                          {displayMoney(Number((tour as any).price_for_citizens), String(normalizedCurrency ?? "RWF"))}
                        </span>
                      </div>
                    )}
                    {(tour as any)?.price_for_east_african && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">🌍 {t("tourDetails.eastAfrican", "East African")}</span>
                        <span className="font-semibold text-primary">
                          {displayMoney(Number((tour as any).price_for_east_african), String(normalizedCurrency ?? "RWF"))}
                        </span>
                      </div>
                    )}
                    {(tour as any)?.price_for_foreigners && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">✈️ {t("tourDetails.foreignTourists", "Foreign Tourists")}</span>
                        <span className="font-semibold text-primary">
                          {displayMoney(Number((tour as any).price_for_foreigners), String(normalizedCurrency ?? "RWF"))}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t("tourDetails.residencyNote", "Select your residency status at checkout")}</p>
                </div>
              )}

              {pricingTiers.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm font-semibold text-foreground">{t("tourDetails.priceForTour")}</div>
                  <div className="mt-3 space-y-2">
                    {pricingTiers.map((tier) => (
                      <div key={tier.group_size} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {tier.group_size === 1
                            ? t("tourDetails.singlePerson")
                            : t("tourDetails.groupOf", { count: tier.group_size })}
                          :
                        </span>{" "}
                        <span className="font-semibold text-foreground">
                          {displayMoney(Number(tier.price_per_person), String(normalizedCurrency ?? "RWF"))}
                        </span>{" "}
                        <span>{t("tourDetails.perPerson")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Participants selector */}
              <div className="mb-6">
                <div className="text-sm font-semibold text-foreground mb-3">{t("tourDetails.participants", "Number of Participants")}</div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setParticipants(Math.max(1, participants - 1))}
                    disabled={participants <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold text-lg">{participants}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setParticipants(participants + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {participants > 1 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("tourDetails.totalForGroup", "Total for group")}</span>
                      <span className="font-semibold text-primary">
                        {displayMoney(Number(normalizedPrice ?? 0) * participants, String(normalizedCurrency ?? "RWF"))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    // Direct checkout without adding to cart
                    const params = new URLSearchParams({
                      mode: "tour",
                      tourId: String(tour.id),
                      participants: String(participants),
                    });
                    navigate(`/checkout?${params.toString()}`);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {t("common.bookNow")}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  size="lg"
                  onClick={async () => await addToCart("tour", String(tour.id), participants)}
                >
                  {t("common.addToTripCart")}
                </Button>
              </div>
            </div>

            {/* Host info */}
            {hostProfile && (
              <div className="bg-card rounded-xl shadow-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">{t("tourDetails.yourTourGuide")}</h3>
                
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16 border-2 border-primary/20">
                    <AvatarImage src={hostProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {hostProfile.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-foreground flex items-center gap-1.5">
                      {(hostProfile?.nickname || hostProfile?.full_name) || (
                        <span className="text-muted-foreground">{t("tourDetails.guideIncomplete")}</span>
                      )}
                      {hostVerified && (
                        <BadgeCheck className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    {hostBusinessName && (
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {hostBusinessName}
                      </div>
                    )}
                    {hostProfile.created_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("tourDetails.joined")} {new Date(hostProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>

                {hostProfile.tour_guide_bio && (
                  <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {hostProfile.tour_guide_bio}
                    </p>
                  </div>
                )}

                {!hostProfile.full_name && !hostProfile.nickname && (
                  <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {t("tourDetails.guideIncompleteDesc")} {t("tourDetails.guideIncompleteHelp")}
                    </p>
                  </div>
                )}

                <div className="space-y-3 border-t pt-4">
                  {hostProfile.years_of_experience && (
                    <div className="flex items-center gap-3 text-sm">
                      <Award className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">
                        <span className="font-semibold">{hostProfile.years_of_experience}</span> {t("tourDetails.yearsExperience")}
                      </span>
                    </div>
                  )}
                  {hostProfile.languages_spoken && hostProfile.languages_spoken.length > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">
                        {t("tourDetails.speaks")} <span className="font-semibold">{hostProfile.languages_spoken.join(", ")}</span>
                      </span>
                    </div>
                  )}
                  {/* Contact info hidden - available after booking is confirmed */}
                  <div className="flex items-center gap-3 text-sm bg-muted/50 p-3 rounded-lg">
                    <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">
                      {t("tourDetails.contactAfterBooking")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
