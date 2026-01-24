import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ArrowLeft,
  Info,
  Mail,
  Phone,
  Download
} from "lucide-react";
import { extractNeighborhood } from "@/lib/location";

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
            .select("full_name, nickname, years_of_experience, languages_spoken, tour_guide_bio, avatar_url, email, phone, created_at")
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
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, nickname, years_of_experience, languages_spoken, tour_guide_bio, avatar_url, email, phone, created_at")
          .eq("user_id", pkg.host_id)
          .maybeSingle();
        
        if (profileError) {
          console.warn("[TourDetails] Profile fetch failed:", profileError);
        }
        
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

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-primary font-medium hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Hero Section with Main Image */}
        <div className="mb-8">
          <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
            {normalizedImages?.length ? (
              <ListingImageCarousel
                images={normalizedImages}
                alt={tour.title}
                className="w-full h-[450px] lg:h-[550px]"
              />
            ) : (
              <div className="w-full h-[450px] lg:h-[550px] bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
                <Info className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Main content (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and metadata */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {normalizedCategories.map((category: string) => (
                  <Badge key={category} variant="secondary" className="text-xs">{category}</Badge>
                ))}
                {tour.rating && (
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                    <span className="font-semibold">{tour.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({tour.review_count || 0} reviews)</span>
                  </div>
                )}
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">{tour.title}</h1>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{normalizedLocation || "Location not specified"}</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {normalizedDurationDays && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{normalizedDurationDays} day{normalizedDurationDays === 1 ? "" : "s"}</span>
                  </div>
                )}
                {normalizedMaxGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>Up to {normalizedMaxGroup} guests</span>
                  </div>
                )}
                {normalizedDifficulty && (
                  <Badge variant="outline" className="text-xs">
                    {normalizedDifficulty}
                  </Badge>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold text-foreground mb-3">About this tour</h2>
                {tour.description && (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {tour.description}
                  </p>
                )}
              </div>
            </div>

            {/* Daily Itinerary */}
            {isPackage && tour?.daily_itinerary && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-3">Daily Itinerary</h2>
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
                <h2 className="text-xl font-semibold text-foreground mb-4">What to Expect</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {tour?.included_services && (
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">✓ What's Included</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.included_services}
                      </p>
                    </div>
                  )}
                  {tour?.excluded_services && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">✗ What's Not Included</h3>
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
                <h2 className="text-xl font-semibold text-foreground mb-4">Important Information</h2>
                <div className="space-y-4">
                  {tour?.meeting_point && (
                    <div className="bg-card rounded-lg border p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Meeting Point
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
                        What to Bring
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.what_to_bring}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PDF Itinerary */}
            {tour.itinerary_pdf_url && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Detailed Itinerary</h2>
                <div className="bg-card rounded-lg border overflow-hidden shadow-md">
                  <div className="relative bg-muted/20">
                    <object
                      data={tour.itinerary_pdf_url}
                      type="application/pdf"
                      className="w-full h-[600px]"
                      title="Tour Itinerary PDF Preview"
                    >
                      <div className="flex flex-col items-center justify-center h-[600px] p-8 text-center">
                        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">PDF preview not available in your browser</p>
                        <a
                          href={tour.itinerary_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF to view
                        </a>
                      </div>
                    </object>
                  </div>
                  <div className="p-4 bg-muted/30 border-t flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>Complete tour itinerary document</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={tour.itinerary_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Open in new tab →
                      </a>
                      <a
                        href={tour.itinerary_pdf_url}
                        download
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 inline-flex items-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Policy */}
            {isPackage && (tour?.cancellation_policy || tour?.custom_cancellation_policy || nonRefundableItems.length > 0) && (
              <Card className="border-t-4 border-t-primary">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Cancellation & Refund Policy</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <Info className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Please review the cancellation policy carefully before booking. 
                            Refunds are subject to the terms specified below. Some items may be non-refundable 
                            due to advance bookings or permits.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tour?.cancellation_policy && (
                    <div>
                      <div className="text-sm font-medium text-foreground mb-1.5">Policy Type</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tour.cancellation_policy}
                      </p>
                    </div>
                  )}
                  
                  {tour?.custom_cancellation_policy && (
                    <div>
                      <div className="text-sm font-medium text-foreground mb-1.5">Terms & Conditions</div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {tour.custom_cancellation_policy}
                      </p>
                    </div>
                  )}
                  
                  {nonRefundableItems.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                        <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          Non-refundable Items
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
                  {formatMoney(Number(normalizedPrice ?? 0), String(normalizedCurrency ?? "RWF"))}
                </div>
                <div className="text-sm text-muted-foreground">per person</div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
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
                  size="lg"
                  onClick={() => addToCart("tour", String(tour.id), 1)}
                >
                  Add to Trip Cart
                </Button>
              </div>
            </div>

            {/* Host info */}
            {hostProfile && (
              <div className="bg-card rounded-xl shadow-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Your Tour Guide</h3>
                
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16 border-2 border-primary/20">
                    <AvatarImage src={hostProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {hostProfile.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-foreground">
                      {(hostProfile?.nickname || hostProfile?.full_name) || (
                        <span className="text-muted-foreground">Guide Profile Incomplete</span>
                      )}
                    </div>
                    {hostProfile.created_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Joined {new Date(hostProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
                      The tour guide's profile information is incomplete. Please contact support if you need more details about your guide.
                    </p>
                  </div>
                )}

                <div className="space-y-3 border-t pt-4">
                  {hostProfile.years_of_experience && (
                    <div className="flex items-center gap-3 text-sm">
                      <Award className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">
                        <span className="font-semibold">{hostProfile.years_of_experience}</span> years of experience
                      </span>
                    </div>
                  )}
                  {hostProfile.languages_spoken && hostProfile.languages_spoken.length > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">
                        Speaks <span className="font-semibold">{hostProfile.languages_spoken.join(", ")}</span>
                      </span>
                    </div>
                  )}
                  {hostProfile.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                      <a href={`mailto:${hostProfile.email}`} className="text-primary hover:underline break-all">
                        {hostProfile.email}
                      </a>
                    </div>
                  )}
                  {hostProfile.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-primary" />
                      <a href={`tel:${hostProfile.phone}`} className="text-foreground hover:text-primary">
                        {hostProfile.phone}
                      </a>
                    </div>
                  )}
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
