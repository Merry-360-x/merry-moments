import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSearch from "@/components/HeroSearch";
import PropertyCard from "@/components/PropertyCard";
import HostingCTA from "@/components/HostingCTA";
import Footer from "@/components/Footer";
import TourPromoCard from "@/components/TourPromoCard";
import TransportPromoCard from "@/components/TransportPromoCard";
import { OptimizedImage } from "@/components/OptimizedImage";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import heroImage from "@/assets/hero-resort.jpg";
import merryVideo from "@/assets/Merry.mp4";

const fetchLatestProperties = async () => {
  try {
    const { data, error } = await supabase
      .from("properties")
      .select(
        "id, title, location, price_per_night, currency, property_type, rating, review_count, images, created_at, bedrooms, bathrooms, beds, max_guests, check_in_time, check_out_time, smoking_allowed, events_allowed, pets_allowed"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(8); // Increase limit for better data coverage
    
    if (error) {
      console.error("[Index] fetchLatestProperties error:", error.message);
      throw error;
    }
    return data ?? [];
  } catch (err) {
    // Don't log AbortError - expected during navigation/unmount
    if (!(err instanceof Error && err.name === "AbortError")) {
      console.error("[Index] fetchLatestProperties exception:", err);
    }
    throw err; // Re-throw to trigger React Query retry logic
  }
};

const fetchFeaturedProperties = async () => {
  try {
    const { data, error } = await supabase
      .from("properties")
      .select(
        "id, title, location, price_per_night, currency, property_type, rating, review_count, images, created_at, bedrooms, bathrooms, beds, max_guests, check_in_time, check_out_time, smoking_allowed, events_allowed, pets_allowed"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(16); // Increase limit for featured content
      
    if (error) {
      console.error("[Index] fetchFeaturedProperties error:", error.message);
      throw error;
    }
    return data ?? [];
  } catch (err) {
    if (!(err instanceof Error && err.name === "AbortError")) {
      console.error("[Index] fetchFeaturedProperties exception:", err);
    }
    throw err;
  }
};

const fetchTopRatedProperties = async () => {
  try {
    const { data, error } = await supabase
      .from("properties")
      .select(
        "id, title, location, price_per_night, currency, property_type, rating, review_count, images, created_at, bedrooms, bathrooms, beds, max_guests, check_in_time, check_out_time, smoking_allowed, events_allowed, pets_allowed"
      )
      .eq("is_published", true)
      .gte("rating", 3) // Lower rating threshold to show more results
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(16); // Increase limit
      
    if (error) {
      console.error("[Index] fetchTopRatedProperties error:", error.message);
      throw error;
    }
    return data ?? [];
  } catch (err) {
    if (!(err instanceof Error && err.name === "AbortError")) {
      console.error("[Index] fetchTopRatedProperties exception:", err);
    }
    throw err;
  }
};

const fetchFeaturedTours = async () => {
  try {
    // Fetch from both tours and tour_packages
    const [toursRes, packagesRes] = await Promise.all([
      supabase
        .from("tours")
        .select(
          "id, title, location, price_per_person, currency, images, rating, review_count, category, duration_days"
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("tour_packages")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
      
    if (toursRes.error) {
      console.error("[Index] fetchFeaturedTours error:", toursRes.error.message);
      throw toursRes.error;
    }
    
    const tours = toursRes.data ?? [];
    
    // Convert tour_packages to tour format
    if (packagesRes.data && !packagesRes.error) {
      const packagesAsTours = packagesRes.data.map(pkg => ({
        id: pkg.id,
        title: pkg.title,
        location: `${pkg.city}, ${pkg.country}`,
        price_per_person: pkg.price_per_adult,
        currency: pkg.currency,
        images: [pkg.cover_image, ...(Array.isArray(pkg.gallery_images) ? pkg.gallery_images : [])].filter(Boolean) as string[],
        rating: null,
        review_count: null,
        category: pkg.category,
        duration_days: parseInt(pkg.duration) || 1,
      }));
      
      return [...tours, ...packagesAsTours].slice(0, 16);
    }
    
    return tours;
  } catch (err) {
    if (!(err instanceof Error && err.name === "AbortError")) {
      console.error("[Index] fetchFeaturedTours exception:", err);
    }
    throw err;
  }
};

const fetchLatestVehicles = async () => {
  try {
    const { data, error } = await supabase
      .from("transport_vehicles")
      .select("id, title, vehicle_type, seats, price_per_day, currency, media, image_url, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(16); // Increase limit
      
    if (error) {
      console.error("[Index] fetchLatestVehicles error:", error.message);
      throw error;
    }
    return data ?? [];
  } catch (err) {
    if (!(err instanceof Error && err.name === "AbortError")) {
      console.error("[Index] fetchLatestVehicles exception:", err);
    }
    throw err;
  }
};

const Index = () => {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const featuredStaysRef = useRef<HTMLDivElement | null>(null);
  const topRatedRef = useRef<HTMLDivElement | null>(null);
  const featuredToursRef = useRef<HTMLDivElement | null>(null);
  const vehiclesRef = useRef<HTMLDivElement | null>(null);
  const {
    data: properties = [],
    isError,
    isLoading: propertiesLoading,
    refetch: refetchProperties,
  } = useQuery({
    queryKey: ["properties", "latest"],
    queryFn: fetchLatestProperties,
    staleTime: 1000 * 60 * 3, // 3 minutes for fast, fresh data
    gcTime: 1000 * 60 * 15, // 15 minutes cache
    refetchOnMount: true, // Always fetch fresh data
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 3, // Auto-refresh every 3 minutes for consistency
  });

  const { data: featuredStays = [], isLoading: featuredLoading, refetch: refetchFeatured } = useQuery({
    queryKey: ["properties", "featured-home"],
    queryFn: fetchFeaturedProperties,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 15,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 3, // Consistent 3-minute refresh
  });

  const { data: topRated = [], isLoading: topRatedLoading, refetch: refetchTopRated } = useQuery({
    queryKey: ["properties", "top-rated-home"],
    queryFn: fetchTopRatedProperties,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 15,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 3, // Consistent 3-minute refresh
  });

  const { data: featuredTours = [], isLoading: toursLoading, refetch: refetchTours } = useQuery({
    queryKey: ["tours", "featured-home"],
    queryFn: fetchFeaturedTours,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 15,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 3, // Consistent 3-minute refresh
  });

  const { data: latestVehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ["transport_vehicles", "latest-home"],
    queryFn: fetchLatestVehicles,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 15,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 3, // Consistent 3-minute refresh
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative min-h-[70vh] flex items-center justify-center overflow-hidden"
      >
        {/* Fallback background image */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-[1]"
          poster={heroImage}
          onError={(e) => {
            // Hide video and show fallback image on error
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src={merryVideo} type="video/mp4" />
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
        </div>
      </section>

      {/* Latest Properties */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {t("index.latestTitle")}
            </h2>
            <p className="text-muted-foreground">
              {t("index.latestSubtitle")}
            </p>
          </div>
          <Link
            to="/accommodations"
            className="hidden md:block text-primary font-medium hover:underline"
          >
            {t("index.browseMore")}
          </Link>
        </div>

        {/* Mobile: 2.5-column horizontal scroll */}
        <div className="sm:hidden">
          {isError ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t("common.couldNotLoadProperties")}</p>
              {/* Do not surface DB/implementation errors to users */}
            </div>
          ) : properties.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t("common.noPublishedProperties")}</p>
            </div>
          ) : (
            <div className="grid grid-flow-col auto-cols-[46%] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
              {properties.map((property, index) => (
                <div
                  key={property.id}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="opacity-0 animate-fade-in snap-start"
                >
                  <PropertyCard
                    id={property.id}
                    image={property.images?.[0] ?? null}
                    images={property.images ?? null}
                    title={(property.title ?? property.name ?? "Untitled") as string}
                    location={property.location}
                    rating={Number(property.rating) || 0}
                    reviews={property.review_count || 0}
                    price={Number(property.price_per_night)}
                    currency={property.currency}
                    type={property.property_type}
                    bedrooms={(property as { bedrooms?: number | null }).bedrooms ?? null}
                    bathrooms={(property as { bathrooms?: number | null }).bathrooms ?? null}
                    beds={(property as { beds?: number | null }).beds ?? null}
                    maxGuests={(property as { max_guests?: number | null }).max_guests ?? null}
                    checkInTime={(property as { check_in_time?: string | null }).check_in_time ?? null}
                    checkOutTime={(property as { check_out_time?: string | null }).check_out_time ?? null}
                    smokingAllowed={(property as { smoking_allowed?: boolean | null }).smoking_allowed ?? null}
                    eventsAllowed={(property as { events_allowed?: boolean | null }).events_allowed ?? null}
                    petsAllowed={(property as { pets_allowed?: boolean | null }).pets_allowed ?? null}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop/tablet: horizontal scroll (show all in same section) */}
        <div className="hidden sm:block">
          {isError ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t("common.couldNotLoadProperties")}</p>
              {/* Do not surface DB/implementation errors to users */}
            </div>
          ) : properties.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t("common.noPublishedProperties")}</p>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
                onClick={() => scrollerRef.current?.scrollBy({ left: -420, behavior: "smooth" })}
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
                onClick={() => scrollerRef.current?.scrollBy({ left: 420, behavior: "smooth" })}
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div
                ref={scrollerRef}
                className="grid grid-flow-col auto-cols-[38%] lg:auto-cols-[24%] gap-6 overflow-x-auto pb-2 snap-x snap-mandatory"
              >
                {properties.map((property, index) => (
                  <div
                    key={property.id}
                    style={{ animationDelay: `${index * 80}ms` }}
                    className="opacity-0 animate-fade-in snap-start"
                  >
                    <PropertyCard
                      id={property.id}
                      image={property.images?.[0] ?? null}
                      images={property.images ?? null}
                      title={(property.title ?? property.name ?? "Untitled") as string}
                      location={property.location}
                      rating={Number(property.rating) || 0}
                      reviews={property.review_count || 0}
                      price={Number(property.price_per_night)}
                      currency={property.currency}
                      type={property.property_type}
                      bedrooms={(property as { bedrooms?: number | null }).bedrooms ?? null}
                      bathrooms={(property as { bathrooms?: number | null }).bathrooms ?? null}
                      beds={(property as { beds?: number | null }).beds ?? null}
                      maxGuests={(property as { max_guests?: number | null }).max_guests ?? null}
                      checkInTime={(property as { check_in_time?: string | null }).check_in_time ?? null}
                      checkOutTime={(property as { check_out_time?: string | null }).check_out_time ?? null}
                      smokingAllowed={(property as { smoking_allowed?: boolean | null }).smoking_allowed ?? null}
                      eventsAllowed={(property as { events_allowed?: boolean | null }).events_allowed ?? null}
                      petsAllowed={(property as { pets_allowed?: boolean | null }).pets_allowed ?? null}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link
          to="/accommodations"
          className="md:hidden block text-center text-primary font-medium hover:underline mt-8"
        >
          {t("index.browseMore")}
        </Link>
      </section>

      {/* Featured Sections (real data, shown only if available) */}
      {featuredStays.length > 0 ? (
        <section className="container mx-auto px-4 lg:px-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Featured Accommodations</h2>
              <p className="text-muted-foreground">Hand-picked stays we recommend</p>
            </div>
            <Link to="/accommodations" className="hidden md:block text-primary font-medium hover:underline">
              View all
            </Link>
          </div>
          <div className="relative">
            <button
              type="button"
              className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
              onClick={() => featuredStaysRef.current?.scrollBy({ left: -420, behavior: "smooth" })}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
              onClick={() => featuredStaysRef.current?.scrollBy({ left: 420, behavior: "smooth" })}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div
              ref={featuredStaysRef}
              className="grid grid-flow-col auto-cols-[70%] sm:auto-cols-[38%] lg:auto-cols-[24%] gap-6 overflow-x-auto pb-2 snap-x snap-mandatory"
            >
              {featuredStays.map((property) => (
                <div key={property.id} className="snap-start">
                  <PropertyCard
                    id={property.id}
                    image={property.images?.[0] ?? null}
                    images={property.images ?? null}
                    title={(property.title ?? property.name ?? "Untitled") as string}
                    location={property.location}
                    rating={Number(property.rating) || 0}
                    reviews={property.review_count || 0}
                    price={Number(property.price_per_night)}
                    currency={property.currency}
                    type={property.property_type}
                    bedrooms={(property as { bedrooms?: number | null }).bedrooms ?? null}
                    bathrooms={(property as { bathrooms?: number | null }).bathrooms ?? null}
                    beds={(property as { beds?: number | null }).beds ?? null}
                    maxGuests={(property as { max_guests?: number | null }).max_guests ?? null}
                    checkInTime={(property as { check_in_time?: string | null }).check_in_time ?? null}
                    checkOutTime={(property as { check_out_time?: string | null }).check_out_time ?? null}
                    smokingAllowed={(property as { smoking_allowed?: boolean | null }).smoking_allowed ?? null}
                    eventsAllowed={(property as { events_allowed?: boolean | null }).events_allowed ?? null}
                    petsAllowed={(property as { pets_allowed?: boolean | null }).pets_allowed ?? null}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {topRated.length > 0 ? (
        <section className="container mx-auto px-4 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Top Rated</h2>
              <p className="text-muted-foreground">Highly reviewed stays</p>
            </div>
            <Link to="/accommodations" className="hidden md:block text-primary font-medium hover:underline">
              Browse
            </Link>
          </div>
          <div className="relative">
            <button
              type="button"
              className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
              onClick={() => topRatedRef.current?.scrollBy({ left: -420, behavior: "smooth" })}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
              onClick={() => topRatedRef.current?.scrollBy({ left: 420, behavior: "smooth" })}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div
              ref={topRatedRef}
              className="grid grid-flow-col auto-cols-[70%] sm:auto-cols-[38%] lg:auto-cols-[24%] gap-6 overflow-x-auto pb-2 snap-x snap-mandatory"
            >
              {topRated.map((property) => (
                <div key={property.id} className="snap-start">
                  <PropertyCard
                    id={property.id}
                    image={property.images?.[0] ?? null}
                    images={property.images ?? null}
                    title={(property.title ?? property.name ?? "Untitled") as string}
                    location={property.location}
                    rating={Number(property.rating) || 0}
                    reviews={property.review_count || 0}
                    price={Number(property.price_per_night)}
                    currency={property.currency}
                    type={property.property_type}
                    bedrooms={(property as { bedrooms?: number | null }).bedrooms ?? null}
                    bathrooms={(property as { bathrooms?: number | null }).bathrooms ?? null}
                    beds={(property as { beds?: number | null }).beds ?? null}
                    maxGuests={(property as { max_guests?: number | null }).max_guests ?? null}
                    checkInTime={(property as { check_in_time?: string | null }).check_in_time ?? null}
                    checkOutTime={(property as { check_out_time?: string | null }).check_out_time ?? null}
                    smokingAllowed={(property as { smoking_allowed?: boolean | null }).smoking_allowed ?? null}
                    eventsAllowed={(property as { events_allowed?: boolean | null }).events_allowed ?? null}
                    petsAllowed={(property as { pets_allowed?: boolean | null }).pets_allowed ?? null}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {featuredTours.length > 0 ? (
        <section className="container mx-auto px-4 lg:px-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Featured Tours</h2>
              <p className="text-muted-foreground">Popular experiences right now</p>
            </div>
            <Link to="/tours" className="hidden md:block text-primary font-medium hover:underline">
              View all
            </Link>
          </div>
          <div className="relative">
            <button
              type="button"
              className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
              onClick={() => featuredToursRef.current?.scrollBy({ left: -420, behavior: "smooth" })}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
              onClick={() => featuredToursRef.current?.scrollBy({ left: 420, behavior: "smooth" })}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div
              ref={featuredToursRef}
              className="grid grid-flow-col auto-cols-[70%] sm:auto-cols-[38%] lg:auto-cols-[24%] gap-6 overflow-x-auto pb-2 snap-x snap-mandatory"
            >
              {featuredTours.map((tour) => {
                const title = (tour.title ?? "Tour") as string;
                const location = (tour.location ?? null) as string | null;
                const price = Number((tour.price_per_person ?? 0) as number);
                const images = (tour.images ?? null) as string[] | null;
                return (
                  <div key={tour.id} className="snap-start">
                    <TourPromoCard
                      id={tour.id}
                      title={title}
                      location={location}
                      price={price}
                      currency={tour.currency ?? "USD"}
                      images={images}
                      rating={(tour as { rating?: number | null }).rating ?? null}
                      reviewCount={(tour as { review_count?: number | null }).review_count ?? null}
                      category={(tour as { category?: string | null }).category ?? null}
                      durationDays={(tour as { duration_days?: number | null }).duration_days ?? null}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {latestVehicles.length > 0 ? (
        <section className="container mx-auto px-4 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Transportation</h2>
              <p className="text-muted-foreground">Vehicles available for your trip</p>
            </div>
            <Link to="/transport" className="hidden md:block text-primary font-medium hover:underline">
              View all
            </Link>
          </div>
          <div className="relative">
            <button
              type="button"
              className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
              onClick={() => vehiclesRef.current?.scrollBy({ left: -420, behavior: "smooth" })}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-card border border-border items-center justify-center"
              onClick={() => vehiclesRef.current?.scrollBy({ left: 420, behavior: "smooth" })}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div
              ref={vehiclesRef}
              className="grid grid-flow-col auto-cols-[70%] sm:auto-cols-[38%] lg:auto-cols-[24%] gap-6 overflow-x-auto pb-2 snap-x snap-mandatory"
            >
              {latestVehicles.map((v) => (
                <div key={v.id} className="snap-start">
                  <TransportPromoCard
                    id={v.id}
                    title={v.title}
                    vehicleType={(v as { vehicle_type?: string | null }).vehicle_type ?? null}
                    seats={(v as { seats?: number | null }).seats ?? null}
                    pricePerDay={Number((v as { price_per_day?: number | null }).price_per_day ?? 0)}
                    currency={(v as { currency?: string | null }).currency ?? "USD"}
                    media={(v as { media?: string[] | null }).media ?? null}
                    imageUrl={(v as { image_url?: string | null }).image_url ?? null}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Hosting CTA */}
      <HostingCTA />

      <Footer />
    </div>
  );
};

export default Index;
