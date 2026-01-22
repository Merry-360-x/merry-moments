import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  FileText
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
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/tours")}
            className="text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            ← Back to Tours
          </button>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{tour.title}</h1>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {normalizedCategories.map((category: string) => (
              <Badge key={category} variant="secondary">{category}</Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {tour.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="font-medium">{tour.rating.toFixed(1)}</span>
                <span>({tour.review_count || 0} reviews)</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{extractNeighborhood(normalizedLocation || "")}</span>
            </div>
          </div>
        </div>

        {/* Images */}
        {normalizedImages && normalizedImages.length > 0 && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <ListingImageCarousel 
              images={normalizedImages} 
              alt={tour.title} 
              className="w-full aspect-[16/9]"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tour Details */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Tour Details</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{normalizedDurationDays} day{normalizedDurationDays === 1 ? "" : "s"}</p>
                  </div>
                </div>

                {normalizedMaxGroup && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Max Group</p>
                      <p className="font-medium">{normalizedMaxGroup} people</p>
                    </div>
                  </div>
                )}

                {normalizedDifficulty && (
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Difficulty</p>
                      <p className="font-medium">{normalizedDifficulty}</p>
                    </div>
                  </div>
                )}
              </div>

              {tour.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{tour.description}</p>
                </div>
              )}

              {isPackage && tour?.daily_itinerary && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Daily Itinerary</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{tour.daily_itinerary}</p>
                </div>
              )}

              {isPackage && (tour?.included_services || tour?.excluded_services) && (
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  {tour?.included_services && (
                    <div>
                      <h4 className="font-semibold mb-2">Included</h4>
                      <p className="text-muted-foreground whitespace-pre-line">{tour.included_services}</p>
                    </div>
                  )}
                  {tour?.excluded_services && (
                    <div>
                      <h4 className="font-semibold mb-2">Excluded</h4>
                      <p className="text-muted-foreground whitespace-pre-line">{tour.excluded_services}</p>
                    </div>
                  )}
                </div>
              )}

              {isPackage && tour?.meeting_point && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Meeting Point</h4>
                  <p className="text-muted-foreground whitespace-pre-line">{tour.meeting_point}</p>
                </div>
              )}

              {isPackage && tour?.what_to_bring && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">What to Bring</h4>
                  <p className="text-muted-foreground whitespace-pre-line">{tour.what_to_bring}</p>
                </div>
              )}

              {isPackage && (tour?.cancellation_policy || tour?.custom_cancellation_policy || nonRefundableItems.length > 0) && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Cancellation Policy</h4>
                  {tour?.cancellation_policy && (
                    <p className="text-muted-foreground whitespace-pre-line mb-3">{tour.cancellation_policy}</p>
                  )}
                  {tour?.custom_cancellation_policy && (
                    <p className="text-muted-foreground whitespace-pre-line mb-3">{tour.custom_cancellation_policy}</p>
                  )}
                  {nonRefundableItems.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <div className="font-medium text-foreground mb-1">Non-Refundable Items</div>
                      <ul className="list-disc list-inside space-y-1">
                        {nonRefundableItems.map((item: string) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* PDF Itinerary */}
            {tour.itinerary_pdf_url && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5" />
                  <h2 className="text-xl font-semibold">Tour Itinerary</h2>
                </div>
                <iframe
                  src={tour.itinerary_pdf_url}
                  className="w-full h-[600px] border rounded-lg"
                  title="Tour Itinerary PDF"
                />
                <a
                  href={tour.itinerary_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Open PDF in new tab →
                </a>
              </Card>
            )}

            {/* Host Information */}
            {hostProfile && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Hosted by</h2>
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={hostProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {hostProfile.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{hostProfile.full_name || "Tour Guide"}</h3>
                    
                    {hostProfile.years_of_experience && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Award className="w-4 h-4" />
                        <span>{hostProfile.years_of_experience} years of experience</span>
                      </div>
                    )}
                    
                    {hostProfile.languages_spoken && hostProfile.languages_spoken.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        <span>Speaks: {hostProfile.languages_spoken.join(", ")}</span>
                      </div>
                    )}
                    
                    {hostProfile.tour_guide_bio && (
                      <p className="mt-3 text-sm">{hostProfile.tour_guide_bio}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <div className="mb-6">
                <div className="text-3xl font-bold mb-1">
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
                  onClick={() => addToCart("tour", String(tour.id), 1)}
                >
                  Add to Trip Cart
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{normalizedDurationDays} day{normalizedDurationDays === 1 ? "" : "s"}</span>
                </div>
                
                {normalizedMaxGroup && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Group Size</span>
                    <span className="font-medium">Up to {normalizedMaxGroup}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{extractNeighborhood(normalizedLocation || "")}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
