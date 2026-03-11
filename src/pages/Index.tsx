import { useMemo } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

type HomeStoryRow = {
  id: string;
  user_id: string;
  media_url: string | null;
  image_url: string | null;
  created_at: string | null;
};

type HomeStoryAuthor = {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
};

type HomeStoryCircle = {
  storyId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  fallbackPreviewUrl: string | null;
  createdAt: string | null;
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

  const { data: storyCircles = [], isLoading: isStoryCirclesLoading } = useQuery({
    queryKey: ["home-story-circles"],
    queryFn: async () => {
      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("id, user_id, media_url, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(80);

      if (storiesError) throw storiesError;

      const stories = (storiesData ?? []) as HomeStoryRow[];
      if (stories.length === 0) return [] as HomeStoryCircle[];

      const latestByUser = new Map<string, HomeStoryRow>();
      for (const story of stories) {
        if (!latestByUser.has(story.user_id)) {
          latestByUser.set(story.user_id, story);
        }
      }

      const userIds = Array.from(latestByUser.keys());
      const { data: authorsData, error: authorsError } = await supabase
        .from("profiles")
        .select("user_id, full_name, nickname, avatar_url")
        .in("user_id", userIds);

      if (authorsError) throw authorsError;

      const authorMap = new Map<string, HomeStoryAuthor>();
      (authorsData ?? []).forEach((author: any) => {
        authorMap.set(author.user_id, author as HomeStoryAuthor);
      });

      return Array.from(latestByUser.values())
        .slice(0, 16)
        .map((story) => {
          const author = authorMap.get(story.user_id);
          return {
            storyId: story.id,
            userId: story.user_id,
            displayName: author?.nickname || author?.full_name || "Traveler",
            avatarUrl: author?.avatar_url || null,
            fallbackPreviewUrl: story.media_url || story.image_url || null,
            createdAt: story.created_at,
          } as HomeStoryCircle;
        });
    },
    staleTime: 1000 * 60 * 2,
  });

  const storyFreshness = useMemo(() => {
    const now = Date.now();
    return new Map(
      storyCircles.map((story) => {
        const created = story.createdAt ? new Date(story.createdAt).getTime() : 0;
        const isFresh = created > 0 && now - created <= 1000 * 60 * 60 * 24;
        return [story.storyId, isFresh] as const;
      })
    );
  }, [storyCircles]);

  const leftRailStories = useMemo(
    () => storyCircles.filter((_, index) => index % 2 === 0).slice(0, 5),
    [storyCircles]
  );

  const rightRailStories = useMemo(
    () => storyCircles.filter((_, index) => index % 2 !== 0).slice(0, 5),
    [storyCircles]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="container mx-auto px-4 pt-3 md:pt-4">
        <div className="px-0 py-0">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Stories</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/stories")}>View all</Button>
          </div>

          {isStoryCirclesLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="shrink-0 h-12 w-12 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {storyCircles.slice(0, 12).map((story) => {
                const isFresh = storyFreshness.get(story.storyId) ?? false;
                const fallbackText = story.displayName.slice(0, 1).toUpperCase();
                return (
                  <button
                    key={story.storyId}
                    type="button"
                    onClick={() => navigate("/stories")}
                    className="group shrink-0"
                    aria-label={`Open stories by ${story.displayName}`}
                  >
                    <Avatar className={`h-12 w-12 ${isFresh ? "border-[3px] border-primary" : "border border-border/50"}`}>
                      <AvatarImage src={story.avatarUrl || story.fallbackPreviewUrl || undefined} alt={story.displayName} />
                      <AvatarFallback>{fallbackText}</AvatarFallback>
                    </Avatar>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-3 md:pt-4">
        <div className="grid grid-cols-1 gap-3 items-stretch">
          <aside className="hidden">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stories</span>
            {(isStoryCirclesLoading ? Array.from({ length: 5 }).map((_, index) => ({ storyId: `left-skeleton-${index}`, displayName: "", avatarUrl: null, fallbackPreviewUrl: null, createdAt: null })) : leftRailStories).map((story) => {
              const isFresh = storyFreshness.get(story.storyId) ?? true;
              const fallbackText = story.displayName ? story.displayName.slice(0, 1).toUpperCase() : "";
              return (
                <button
                  key={story.storyId}
                  type="button"
                  onClick={() => navigate("/stories")}
                  className="group"
                  aria-label={story.displayName ? `Open stories by ${story.displayName}` : "Loading story"}
                >
                  <div className={`rounded-full p-[2px] transition-transform group-hover:scale-105 ${isStoryCirclesLoading ? "bg-muted" : isFresh ? "bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-orange-500" : "bg-gradient-to-tr from-muted-foreground/50 to-muted-foreground/20"}`}>
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarImage src={story.avatarUrl || story.fallbackPreviewUrl || undefined} alt={story.displayName || "Story"} />
                      <AvatarFallback>{fallbackText}</AvatarFallback>
                    </Avatar>
                  </div>
                </button>
              );
            })}
          </aside>

          <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] min-h-[34vh] md:min-h-[58vh] flex items-center justify-center overflow-hidden">
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
            <div className="relative z-10 container mx-auto px-4 py-12 md:py-16 text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-8 italic animate-fade-in">
                {t("index.heroTitle")}
              </h1>

              {/* Search Bar */}
              <HeroSearch />

              {/* Referral CTA */}
              <div className="mt-6 md:mt-8 flex justify-center">
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
          </div>

          <aside className="hidden">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Live</span>
            {(isStoryCirclesLoading ? Array.from({ length: 5 }).map((_, index) => ({ storyId: `right-skeleton-${index}`, displayName: "", avatarUrl: null, fallbackPreviewUrl: null, createdAt: null })) : rightRailStories).map((story) => {
              const isFresh = storyFreshness.get(story.storyId) ?? true;
              const fallbackText = story.displayName ? story.displayName.slice(0, 1).toUpperCase() : "";
              return (
                <button
                  key={story.storyId}
                  type="button"
                  onClick={() => navigate("/stories")}
                  className="group"
                  aria-label={story.displayName ? `Open stories by ${story.displayName}` : "Loading story"}
                >
                  <div className={`rounded-full p-[2px] transition-transform group-hover:scale-105 ${isStoryCirclesLoading ? "bg-muted" : isFresh ? "bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-orange-500" : "bg-gradient-to-tr from-muted-foreground/50 to-muted-foreground/20"}`}>
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarImage src={story.avatarUrl || story.fallbackPreviewUrl || undefined} alt={story.displayName || "Story"} />
                      <AvatarFallback>{fallbackText}</AvatarFallback>
                    </Avatar>
                  </div>
                </button>
              );
            })}
          </aside>
        </div>

      </section>

      <section className="container mx-auto px-4 pt-10 pb-16">
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
