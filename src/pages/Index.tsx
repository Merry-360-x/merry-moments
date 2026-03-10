import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";
import HostingCTA from "@/components/HostingCTA";
import { PersonalizedRecommendations } from "@/components/PersonalizedRecommendations";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TourPromoCard from "@/components/TourPromoCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTourPricingModel } from "@/lib/tour-pricing";
import { TrendingUp } from "lucide-react";
import heroVideo from "@/assets/merry.mp4";

type HomeTour = {
  id: string;
  title: string;
  location: string | null;
  price: number;
  currency: string | null;
  images: string[] | null;
  rating?: number | null;
  reviewCount?: number | null;
  category?: string | null;
  durationDays?: number | null;
  source?: "tours" | "tour_packages";
  hostId?: string | null;
  pricingModel?: ReturnType<typeof getTourPricingModel>;
  pricingDurationValue?: number | null;
  pricingDurationUnit?: "minute" | "hour" | null;
};

const parsePackageDurationDays = (duration: string | null | undefined): number | null => {
  const parsed = Number.parseInt(String(duration ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: popularTours = [], isLoading: isPopularToursLoading } = useQuery({
    queryKey: ["home-popular-tours"],
    queryFn: async () => {
      const [toursRes, packagesRes] = await Promise.all([
        supabase
          .from("tours")
          .select("id, title, location, price_per_person, currency, images, rating, review_count, category, duration_days, created_by, pricing_tiers")
          .eq("is_published", true)
          .order("rating", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("tour_packages")
          .select("id, title, city, country, price_per_adult, currency, cover_image, gallery_images, rating, review_count, category, duration, host_id, pricing_tiers")
          .eq("status", "approved")
          .order("rating", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const tours: HomeTour[] = (toursRes.data ?? []).map((tour: any) => ({
        id: tour.id,
        title: tour.title,
        location: tour.location,
        price: Number(tour.price_per_person || 0),
        currency: tour.currency,
        images: Array.isArray(tour.images) ? tour.images : null,
        rating: tour.rating,
        reviewCount: tour.review_count,
        category: tour.category,
        durationDays: tour.duration_days,
        source: "tours",
        hostId: tour.created_by,
        pricingModel: getTourPricingModel(tour.pricing_tiers),
        pricingDurationValue: Number(tour.pricing_tiers?.pricing_duration_value || 0) || null,
        pricingDurationUnit:
          getTourPricingModel(tour.pricing_tiers) === "per_hour"
            ? "hour"
            : getTourPricingModel(tour.pricing_tiers) === "per_minute"
              ? "minute"
              : null,
      }));

      const packages: HomeTour[] = (packagesRes.data ?? []).map((pkg: any) => ({
        id: pkg.id,
        title: pkg.title,
        location: [pkg.city, pkg.country].filter(Boolean).join(", ") || null,
        price: Number(pkg.price_per_adult || 0),
        currency: pkg.currency,
        images: [pkg.cover_image, ...(Array.isArray(pkg.gallery_images) ? pkg.gallery_images : [])].filter(Boolean),
        rating: pkg.rating,
        reviewCount: pkg.review_count,
        category: pkg.category,
        durationDays: parsePackageDurationDays(pkg.duration),
        source: "tour_packages",
        hostId: pkg.host_id,
        pricingModel: getTourPricingModel(pkg.pricing_tiers),
        pricingDurationValue: Number(pkg.pricing_tiers?.pricing_duration_value || 0) || null,
        pricingDurationUnit:
          getTourPricingModel(pkg.pricing_tiers) === "per_hour"
            ? "hour"
            : getTourPricingModel(pkg.pricing_tiers) === "per_minute"
              ? "minute"
              : null,
      }));

      return [...tours, ...packages].slice(0, 8);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 20,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden"
      >
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover z-[1]"
          style={{ objectPosition: "center center" }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 via-foreground/20 to-foreground/50 z-[2]" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-8 italic animate-fade-in">
            {t("index.heroTitle")}
          </h1>

          {/* Search Bar */}
          <HeroSearch />

          {/* Referral CTA */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => navigate('/affiliate-signup')}
              variant="outline"
              size="lg"
              className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white transition-all shadow-lg"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Refer an Operator & Earn 10%
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 min-h-[60vh]">
        <PersonalizedRecommendations type="properties" limit={8} mode="popular" title="Popular Stays" />
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Popular Tours</h2>
            <p className="text-sm text-muted-foreground mt-1">Top picks travelers are booking now</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/tours")}>See all tours</Button>
        </div>

        {isPopularToursLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : popularTours.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {popularTours.map((tour) => (
              <TourPromoCard
                key={tour.id}
                id={tour.id}
                title={tour.title}
                location={tour.location}
                price={tour.price}
                currency={tour.currency}
                images={tour.images}
                rating={tour.rating}
                reviewCount={tour.reviewCount}
                category={tour.category}
                durationDays={tour.durationDays}
                source={tour.source}
                hostId={tour.hostId}
                pricingModel={tour.pricingModel}
                pricingDurationValue={tour.pricingDurationValue}
                pricingDurationUnit={tour.pricingDurationUnit}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-3">No tours available yet — browse all experiences.</p>
              <Button onClick={() => navigate("/tours")}>Browse tours</Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Hosting CTA */}
      <HostingCTA />

      <Footer />
    </div>
  );
};

export default Index;
