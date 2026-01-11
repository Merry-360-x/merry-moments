import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSearch from "@/components/HeroSearch";
import PropertyCard from "@/components/PropertyCard";
import HostingCTA from "@/components/HostingCTA";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import heroImage from "@/assets/hero-resort.jpg";

const fetchLatestProperties = async () => {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, title, location, price_per_night, currency, property_type, rating, review_count, images, created_at, bedrooms, bathrooms, beds"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) throw error;
  return data ?? [];
};

const Index = () => {
  const { t } = useTranslation();
  const { isAdmin, isStaff } = useAuth();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const {
    data: properties,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["properties", "latest"],
    queryFn: fetchLatestProperties,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative min-h-[70vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 via-foreground/20 to-foreground/50" />

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
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t("common.loadingProperties")}</p>
            </div>
          ) : isError ? (
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
                    title={property.title}
                    location={property.location}
                    rating={Number(property.rating) || 0}
                    reviews={property.review_count || 0}
                    price={Number(property.price_per_night)}
                    currency={property.currency}
                    type={property.property_type}
                    bedrooms={(property as { bedrooms?: number | null }).bedrooms ?? null}
                    bathrooms={(property as { bathrooms?: number | null }).bathrooms ?? null}
                    beds={(property as { beds?: number | null }).beds ?? null}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop/tablet: horizontal scroll (show all in same section) */}
        <div className="hidden sm:block">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t("common.loadingProperties")}</p>
            </div>
          ) : isError ? (
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
                      title={property.title}
                      location={property.location}
                      rating={Number(property.rating) || 0}
                      reviews={property.review_count || 0}
                      price={Number(property.price_per_night)}
                      currency={property.currency}
                      type={property.property_type}
                      bedrooms={(property as { bedrooms?: number | null }).bedrooms ?? null}
                      bathrooms={(property as { bathrooms?: number | null }).bathrooms ?? null}
                      beds={(property as { beds?: number | null }).beds ?? null}
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

      {/* Hosting CTA */}
      <HostingCTA />

      <Footer />
    </div>
  );
};

export default Index;
