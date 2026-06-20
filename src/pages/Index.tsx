import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import TourPromoCard from "@/components/TourPromoCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTourPricingModel } from "@/lib/tour-pricing";
import { ArrowRight, Bell, CheckCircle2, ChevronLeft, ChevronRight, Mail, Plus, Sparkles, TrendingUp, X } from "lucide-react";
import heroVideo from "@/assets/merry.mp4";

const HOME_UPDATES_DISMISS_KEY = "home-updates-popup-dismissed-at";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const readDismissedAt = (): number => {
  try {
    return Number(window.localStorage.getItem(HOME_UPDATES_DISMISS_KEY) || "0");
  } catch {
    return 0;
  }
};

const persistDismissedAt = () => {
  try {
    window.localStorage.setItem(HOME_UPDATES_DISMISS_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors so Home always remains accessible.
  }
};

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

const isVideoMedia = (url?: string | null) => {
  if (!url) return false;
  return /\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(url);
};

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStoryModalIndex, setActiveStoryModalIndex] = useState<number | null>(null);
  const [stayCityInput, setStayCityInput] = useState("");
  const [stayCity, setStayCity] = useState("");
  const [showUpdatesPopup, setShowUpdatesPopup] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setStayCity(stayCityInput.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [stayCityInput]);

  useEffect(() => {
    const dismissedAt = readDismissedAt();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (dismissedAt > 0 && Date.now() - dismissedAt < oneDayMs) return;

    const timer = window.setTimeout(() => {
      setShowUpdatesPopup(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  const closeUpdatesPopup = () => {
    setShowUpdatesPopup(false);
    persistDismissedAt();
  };

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(newsletterEmail)) {
      setNewsletterError("Enter a valid email address.");
      return;
    }

    setNewsletterError(null);
    setIsSubscribed(true);
    setNewsletterEmail("");
  };

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
          .limit(12),
        supabase
          .from("tour_packages")
          .select("id, title, city, country, price_per_adult, currency, cover_image, gallery_images, category, duration, host_id")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(12),
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
        rating: null,
        reviewCount: null,
        category: pkg.category,
        durationDays: parsePackageDurationDays(pkg.duration),
        source: "tour_packages",
        hostId: pkg.host_id,
        pricingModel: getTourPricingModel(null),
        pricingDurationValue: null,
        pricingDurationUnit:
          getTourPricingModel(null) === "per_hour"
            ? "hour"
            : getTourPricingModel(null) === "per_minute"
              ? "minute"
              : null,
      }));

      return [...tours, ...packages].slice(0, 12);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 20,
  });

  const { data: storyCircles = [], isLoading: isStoryCirclesLoading } = useQuery({
    queryKey: ["home-story-circles"],
    queryFn: async () => {
      const activeCutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("id, user_id, media_url, image_url, created_at")
        .gte("created_at", activeCutoffIso)
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

  const activeStory = activeStoryModalIndex !== null ? storyCircles[activeStoryModalIndex] ?? null : null;
  const activeStoryMedia = activeStory?.fallbackPreviewUrl || null;
  const activeStoryIsVideo = isVideoMedia(activeStoryMedia);

  const openStoryModal = (index: number) => {
    setActiveStoryModalIndex(index);
  };

  const closeStoryModal = () => {
    setActiveStoryModalIndex(null);
  };

  const goToNextStoryModal = () => {
    if (activeStoryModalIndex === null || storyCircles.length === 0) return;
    setActiveStoryModalIndex((activeStoryModalIndex + 1) % storyCircles.length);
  };

  const goToPreviousStoryModal = () => {
    if (activeStoryModalIndex === null || storyCircles.length === 0) return;
    setActiveStoryModalIndex((activeStoryModalIndex - 1 + storyCircles.length) % storyCircles.length);
  };

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
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-8 italic animate-fade-in">
                {t("index.heroTitle")}
              </h1>

              {/* Search Bar */}
              <HeroSearch onWhereChange={setStayCityInput} />

              <div className="mx-auto mt-5 w-full max-w-4xl rounded-2xl border border-white/25 bg-black/30 px-3 py-2 backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90">Stories</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => navigate("/stories")}
                  >
                    View all
                  </Button>
                </div>

                {isStoryCirclesLoading ? (
                  <div className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="shrink-0 snap-start h-12 w-12 rounded-full bg-white/20 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                    {user ? (
                      <button
                        type="button"
                        onClick={() => navigate("/create-story")}
                        className="group shrink-0 snap-start"
                        aria-label="Create your story"
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-[3px] border-primary bg-background">
                            <AvatarImage src={(user.user_metadata as any)?.avatar_url || undefined} alt="Your story" />
                            <AvatarFallback>
                              {(((user.user_metadata as any)?.full_name || user.email || "Y") as string).slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute -right-1 -bottom-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground">
                            <Plus className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    ) : null}

                    {storyCircles.slice(0, 12).map((story, index) => {
                      const isFresh = storyFreshness.get(story.storyId) ?? false;
                      const fallbackText = story.displayName.slice(0, 1).toUpperCase();
                      return (
                        <button
                          key={story.storyId}
                          type="button"
                          onClick={() => openStoryModal(index)}
                          className="group shrink-0 snap-start"
                          aria-label={`Open stories by ${story.displayName}`}
                        >
                          <Avatar className={`h-12 w-12 ${isFresh ? "border-[3px] border-primary" : "border border-white/40"}`}>
                            <AvatarImage src={story.avatarUrl || story.fallbackPreviewUrl || undefined} alt={story.displayName} />
                            <AvatarFallback>{fallbackText}</AvatarFallback>
                          </Avatar>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Referral CTA */}
              <div className="mt-6 md:mt-8 flex justify-center">
                <Button
                  onClick={() => navigate('/affiliate-signup')}
                  variant="outline"
                  size="lg"
                  className="w-full max-w-[22rem] sm:w-auto bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white transition-all shadow-lg"
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

      <section id="selected-stays" className="container mx-auto px-4 pt-10 pb-16">
        <PersonalizedRecommendations
          type="properties"
          limit={20}
          mode="popular"
          title="Popular Stays"
          locationFilter={stayCity}
        />
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Popular Tours</h2>
            <p className="text-sm text-muted-foreground mt-1">Top picks travelers are booking now</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/tours")}>See all tours</Button>
        </div>

        {isPopularToursLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`h-64 rounded-xl bg-muted animate-pulse ${i >= 6 ? "hidden md:block" : ""}`} />
            ))}
          </div>
        ) : popularTours.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {popularTours.map((tour, index) => (
              <motion.div
                key={tour.id}
                className={index >= 6 ? "hidden md:block" : ""}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <TourPromoCard
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
              </motion.div>
            ))}
          </motion.div>
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

      <Dialog open={showUpdatesPopup} onOpenChange={(open) => !open && closeUpdatesPopup()}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-0 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
          <div className="relative bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500 shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Travel Insider Updates</h3>
                  <p className="mt-1 text-sm text-slate-600">Exclusive offers, fresh stories, and release notes in one digest.</p>
                </div>
              </div>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-500">
                Weekly
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">Deals before public launch</div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">Stories from local hosts</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-rose-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Newsletter</p>
                  <p className="text-xs text-slate-600">Receive curated deals and destination highlights.</p>
                </div>
              </div>

              {isSubscribed ? (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Thanks for subscribing.
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                  <label htmlFor="home-newsletter-email" className="sr-only">Email address</label>
                  <input
                    id="home-newsletter-email"
                    type="email"
                    value={newsletterEmail}
                    onChange={(event) => {
                      setNewsletterEmail(event.target.value);
                      if (newsletterError) setNewsletterError(null);
                    }}
                    placeholder="you@example.com"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-400"
                    autoComplete="email"
                    required
                  />
                  {newsletterError && <p className="text-xs text-destructive">{newsletterError}</p>}
                  <Button type="submit" className="h-10 w-full justify-between rounded-xl bg-rose-500 px-4 text-white hover:bg-rose-600">
                    <span>Join newsletter</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                closeUpdatesPopup();
                navigate("/announcements");
              }}
              className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100"
            >
              <span className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 text-rose-500" />
                <span>
                  <span className="block text-sm font-medium text-slate-900">Announcements</span>
                  <span className="block text-xs text-slate-600">Open the latest product and community updates.</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeStoryModalIndex !== null} onOpenChange={(open) => !open && closeStoryModal()}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-border/40 bg-black">
          {activeStory && (
            <div className="relative">
              <button
                type="button"
                onClick={closeStoryModal}
                className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Close story viewer"
              >
                <X className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={goToPreviousStoryModal}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Previous story"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={goToNextStoryModal}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Next story"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1">
                <Avatar className="h-7 w-7 border border-white/60">
                  <AvatarImage src={activeStory.avatarUrl || activeStory.fallbackPreviewUrl || undefined} alt={activeStory.displayName} />
                  <AvatarFallback>{activeStory.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-white">{activeStory.displayName}</span>
              </div>

              <div className="min-h-[65vh] max-h-[80vh] bg-black flex items-center justify-center">
                {activeStoryMedia ? (
                  activeStoryIsVideo ? (
                    <video
                      src={activeStoryMedia}
                      className="h-full w-full object-contain"
                      controls
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={activeStoryMedia}
                      alt={activeStory.displayName}
                      className="h-full w-full object-contain"
                    />
                  )
                ) : (
                  <div className="text-sm text-white/80">No media available for this story.</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
