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

export default function TourDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useTripCart();

  const { data, isLoading } = useQuery({
    queryKey: ["tour-with-host", id],
    queryFn: async () => {
      // Fetch tour and host in parallel
      const { data: tour, error } = await supabase
        .from("tours")
        .select(`
          *,
          host:created_by(
            full_name,
            years_of_experience,
            languages_spoken,
            tour_guide_bio,
            avatar_url
          )
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return tour;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const tour = data;
  const hostProfile = data?.host;

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
            {tour.categories?.map((category: string) => (
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
              <span>{extractNeighborhood(tour.location)}</span>
            </div>
          </div>
        </div>

        {/* Images */}
        {tour.images && tour.images.length > 0 && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <ListingImageCarousel 
              images={tour.images} 
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
                    <p className="font-medium">{tour.duration_days} day{tour.duration_days === 1 ? "" : "s"}</p>
                  </div>
                </div>

                {tour.max_group_size && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Max Group</p>
                      <p className="font-medium">{tour.max_group_size} people</p>
                    </div>
                  </div>
                )}

                {tour.difficulty && (
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Difficulty</p>
                      <p className="font-medium">{tour.difficulty}</p>
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
                  {formatMoney(tour.price_per_person, tour.currency || "RWF")}
                </div>
                <div className="text-sm text-muted-foreground">per person</div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    addToCart(tour);
                    navigate("/trip-cart");
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
                
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => addToCart(tour)}
                >
                  Add to Trip Cart
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{tour.duration_days} day{tour.duration_days === 1 ? "" : "s"}</span>
                </div>
                
                {tour.max_group_size && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Group Size</span>
                    <span className="font-medium">Up to {tour.max_group_size}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{extractNeighborhood(tour.location)}</span>
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
