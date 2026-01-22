import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { formatMoney } from "@/lib/money";
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
  ArrowLeft
} from "lucide-react";
import { extractNeighborhood } from "@/lib/location";

type TourDetailsData = {
  source: "tours" | "tour_packages";
  tour: any;
  host?: {
    full_name?: string | null;
    years_of_experience?: string | number | null;
    languages_spoken?: string[] | null;
    tour_guide_bio?: string | null;
    avatar_url?: string | null;
  } | null;
};

export default function TourDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useTripCart();

  const { data, isLoading } = useQuery({
    queryKey: ["tour-with-host", id],
    queryFn: async () => {
      // Try tours table first
      const { data: tour, error: tourError } = await supabase
        .from("tours")
        .select("*")
        .eq("id", id)
        .single();

      if (!tourError && tour) {
        if (tour.created_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, years_of_experience, languages_spoken, tour_guide_bio, avatar_url")
            .eq("user_id", tour.created_by)
            .single();
          return { source: "tours", tour, host: profile } as TourDetailsData;
        }
        return { source: "tours", tour, host: null } as TourDetailsData;
      }

      // If not found in tours, try tour_packages
      if (tourError && tourError.code !== "PGRST116") {
        throw tourError;
      }

      const { data: pkg, error: pkgError } = await supabase
        .from("tour_packages")
        .select("*")
        .eq("id", id)
        .single();

      if (pkgError) throw pkgError;

      if (pkg?.host_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, years_of_experience, languages_spoken, tour_guide_bio, avatar_url")
          .eq("user_id", pkg.host_id)
          .single();
        return { source: "tour_packages", tour: pkg, host: profile } as TourDetailsData;
      }

      return { source: "tour_packages", tour: pkg, host: null } as TourDetailsData;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const tour = data?.tour;
  const hostProfile = data?.host ?? null;

  const isPackage = data?.source === "tour_packages";
  const normalizedImages = isPackage
    ? [tour?.cover_image, ...(Array.isArray(tour?.gallery_images) ? tour?.gallery_images : [])].filter(Boolean)
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
          <h1 className="text-2xl font-bold mb-4">Tour Not Found</h1>
          <Button onClick={() => navigate("/tours")}>Back to Tours</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-primary font-medium hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Tour Details */}
          <div className="space-y-6">
            {/* Title and pricing header */}
            <div className="bg-card rounded-xl shadow-card p-5">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{tour.title}</h1>
              <div className="flex items-center justify-between gap-4 mb-3">
                <p className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {extractNeighborhood(normalizedLocation || "")}
                </p>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {formatMoney(Number(normalizedPrice ?? 0), String(normalizedCurrency ?? "RWF"))}
                    <span className="text-sm text-muted-foreground"> / person</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {normalizedCategories.map((category: string) => (
                  <Badge key={category} variant="secondary" className="text-xs">{category}</Badge>
                ))}
                {tour.rating && (
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                    <span>{tour.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({tour.review_count || 0})</span>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {[
                  `${normalizedDurationDays} day${normalizedDurationDays === 1 ? "" : "s"}`,
                  normalizedMaxGroup ? `Up to ${normalizedMaxGroup} guests` : null,
                  normalizedDifficulty || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>

            {/* Booking actions */}
            <div className="bg-card rounded-xl shadow-card p-5">
              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => {
                    addToCart("tour", String(tour.id), 1);
                    navigate("/trip-cart");
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => addToCart("tour", String(tour.id), 1)}
                >
                  Add to Trip Cart
                </Button>
              </div>
            </div>

            {/* Daily Itinerary */}
            {isPackage && tour?.daily_itinerary && (
              <div className="bg-card rounded-xl shadow-card p-5">
                <div className="text-sm font-semibold text-foreground mb-2">Daily Itinerary</div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {tour.daily_itinerary}
                </p>
              </div>
            )}

            {/* What's included/excluded */}
            {isPackage && (tour?.included_services || tour?.excluded_services) && (
              <div className="bg-card rounded-xl shadow-card p-5">
                <div className="grid md:grid-cols-2 gap-6">
                  {tour?.included_services && (
                    <div>
                      <div className="text-sm font-semibold text-foreground mb-2">What's Included</div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.included_services}
                      </p>
                    </div>
                  )}
                  {tour?.excluded_services && (
                    <div>
                      <div className="text-sm font-semibold text-foreground mb-2">What's Excluded</div>
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
              <div className="bg-card rounded-xl shadow-card p-5">
                {tour?.meeting_point && (
                  <div className={tour?.what_to_bring ? "mb-4" : ""}>
                    <div className="text-sm font-semibold text-foreground mb-2">Meeting Point</div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {tour.meeting_point}
                    </p>
                  </div>
                )}
                {tour?.what_to_bring && (
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-2">What to Bring</div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {tour.what_to_bring}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column - Image and Description */}
          <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            {/* Image carousel */}
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              {normalizedImages?.length ? (
                <ListingImageCarousel
                  images={normalizedImages}
                  alt={tour.title}
                  className="w-full h-[400px]"
                />
              ) : (
                <div className="w-full h-[400px] bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
              )}
            </div>

            {/* About this tour */}
            <div className="bg-card rounded-xl shadow-card p-5">
              <div className="text-sm font-semibold text-foreground mb-3">About this tour</div>
              
              {tour.description && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {tour.description}
                </p>
              )}
            </div>

            {/* PDF Itinerary */}
            {tour.itinerary_pdf_url && (
              <div className="bg-card rounded-xl shadow-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" />
                  <div className="text-sm font-semibold text-foreground">Tour Itinerary</div>
                </div>
                <iframe
                  src={tour.itinerary_pdf_url}
                  className="w-full h-[420px] border rounded-lg"
                  title="Tour Itinerary PDF"
                />
                <a
                  href={tour.itinerary_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  Open PDF in new tab →
                </a>
              </div>
            )}

            {/* Host info */}
            {hostProfile && (
              <div className="bg-card rounded-xl shadow-card p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={hostProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {hostProfile.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-foreground">
                      Hosted by {hostProfile.full_name || "Tour Guide"}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      {hostProfile.years_of_experience && (
                        <span className="inline-flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {hostProfile.years_of_experience} years
                        </span>
                      )}
                      {hostProfile.languages_spoken && hostProfile.languages_spoken.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {hostProfile.languages_spoken.join(", ")}
                        </span>
                      )}
                    </div>
                    {hostProfile.tour_guide_bio && (
                      <p className="text-sm text-foreground/90 leading-relaxed mt-3">
                        {hostProfile.tour_guide_bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Policy */}
            {isPackage && (tour?.cancellation_policy || tour?.custom_cancellation_policy || nonRefundableItems.length > 0) && (
              <div className="bg-card rounded-xl shadow-card p-5">
                <h2 className="text-lg font-semibold text-foreground mb-2">Cancellation & Refund Policy</h2>
                {tour?.cancellation_policy && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {tour.cancellation_policy}
                  </p>
                )}
                {tour?.custom_cancellation_policy && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {tour.custom_cancellation_policy}
                  </p>
                )}
                {nonRefundableItems.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-foreground mb-2">Non-refundable items:</div>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      {nonRefundableItems.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
