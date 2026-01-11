import { Search, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import PropertyCard from "@/components/PropertyCard";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Filter } from "lucide-react";

const propertyTypes = ["Hotel", "Motel", "Resort", "Lodge", "Apartment", "Villa", "Guesthouse"];
const amenities = ["WiFi", "Pool", "Parking", "Restaurant", "Gym", "Spa"];

const fetchProperties = async (args: {
  maxPrice: number;
  search: string;
  propertyTypes: string[];
  amenities: string[];
  minRating: number;
}) => {
  let query = supabase
    .from("properties")
    .select(
      "id, title, location, price_per_night, currency, property_type, rating, review_count, images, created_at"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const trimmed = args.search.trim();
  if (trimmed) {
    query = query.or(`title.ilike.%${trimmed}%,location.ilike.%${trimmed}%`);
  }

  if (args.propertyTypes.length) {
    query = query.in("property_type", args.propertyTypes);
  }

  if (args.minRating > 0) {
    query = query.gte("rating", args.minRating);
  }

  if (args.amenities.length) {
    query = query.contains("amenities", args.amenities);
  }

  const { data, error } = await query.lte("price_per_night", args.maxPrice);
  if (error) throw error;
  return data ?? [];
};

const Accommodations = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toggleFavorite } = useFavorites();

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const runSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      navigate("/accommodations");
      return;
    }
    const params = new URLSearchParams({ q: trimmed });
    navigate(`/accommodations?${params.toString()}`);
  };

  const {
    data: properties,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "properties",
      "accommodations",
      priceRange[1],
      searchParams.get("q") ?? "",
      selectedTypes.join("|"),
      selectedAmenities.join("|"),
      minRating,
    ],
    queryFn: () =>
      fetchProperties({
        maxPrice: priceRange[1],
        search: searchParams.get("q") ?? "",
        propertyTypes: selectedTypes,
        amenities: selectedAmenities,
        minRating,
      }),
  });

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorites", "ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", user!.id);
      if (error) return [];
      return (data ?? []).map((r) => String((r as { property_id: string }).property_id));
    },
  });

  const favoritesSet = new Set(favoriteIds);
  const activeFiltersCount =
    (priceRange[1] < 500000 ? 1 : 0) +
    (selectedTypes.length > 0 ? 1 : 0) +
    (selectedAmenities.length > 0 ? 1 : 0) +
    (minRating > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search Bar */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-5 sm:py-8">
          {/* Mobile: nicer pill */}
          <div className="sm:hidden">
            <div className="bg-card rounded-full shadow-search border border-border px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-muted-foreground">{t("nav.accommodations")}</div>
                <input
                  type="text"
                  placeholder={t("common.search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runSearch();
                  }}
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                />
              </div>
              {query.trim() ? (
                <button
                  type="button"
                  className="text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => setQuery("")}
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold"
                onClick={runSearch}
              >
                Search
              </button>
            </div>
          </div>

          {/* Desktop/tablet: existing layout */}
          <div className="hidden sm:flex bg-card rounded-xl shadow-card p-4 flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">{t("nav.accommodations")}</label>
              <input
                type="text"
                placeholder={t("common.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
              />
            </div>
            <Button variant="search" size="icon-lg" type="button" onClick={runSearch}>
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("accommodations.title")}</h1>
          <p className="text-muted-foreground">{t("accommodations.subtitle")}</p>
        </div>

        {/* Mobile filters button */}
        <div className="lg:hidden mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => setFiltersOpen(true)}
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {t("accommodations.filters")}
            </span>
            {activeFiltersCount > 0 ? (
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {activeFiltersCount}
              </span>
            ) : null}
          </Button>
        </div>

        {/* Mobile filters sheet */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="bottom" className="p-0">
            <SheetHeader className="p-6 pb-2">
              <SheetTitle>{t("accommodations.filters")}</SheetTitle>
            </SheetHeader>
            <div className="p-6 pt-4 max-h-[70vh] overflow-y-auto">
              <Accordion type="multiple" defaultValue={["price", "type"]}>
                <AccordionItem value="price">
                  <AccordionTrigger>{t("accommodations.priceRange")}</AccordionTrigger>
                  <AccordionContent>
                    <Slider value={priceRange} onValueChange={setPriceRange} max={500000} step={10000} className="mb-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">0 RWF</span>
                      <span className="text-primary font-medium">{priceRange[1].toLocaleString()} RWF</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="type">
                  <AccordionTrigger>{t("accommodations.propertyType")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {propertyTypes.map((type) => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox
                            id={`m-${type}`}
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              setSelectedTypes((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(type);
                                else next.delete(type);
                                return Array.from(next);
                              });
                            }}
                          />
                          <label htmlFor={`m-${type}`} className="text-sm text-muted-foreground cursor-pointer">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="rating">
                  <AccordionTrigger>{t("accommodations.minimumRating")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className="p-1"
                          type="button"
                          onClick={() => setMinRating((prev) => (prev === star ? 0 : star))}
                          aria-label={`Minimum rating ${star}`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              minRating >= star ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="amenities">
                  <AccordionTrigger>{t("accommodations.amenities")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-2">
                          <Checkbox
                            id={`m-${amenity}`}
                            checked={selectedAmenities.includes(amenity)}
                            onCheckedChange={(checked) => {
                              setSelectedAmenities((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(amenity);
                                else next.delete(amenity);
                                return Array.from(next);
                              });
                            }}
                          />
                          <label htmlFor={`m-${amenity}`} className="text-sm text-muted-foreground cursor-pointer">
                            {amenity}
                          </label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="p-6 pt-0 border-t border-border flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPriceRange([0, 500000]);
                  setSelectedTypes([]);
                  setSelectedAmenities([]);
                  setMinRating(0);
                }}
              >
                Clear
              </Button>
              <Button type="button" onClick={() => setFiltersOpen(false)}>
                Apply
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar (desktop only, minimized with accordion) */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">{t("accommodations.filters")}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPriceRange([0, 500000]);
                    setSelectedTypes([]);
                    setSelectedAmenities([]);
                    setMinRating(0);
                  }}
                >
                  Clear
                </Button>
              </div>

              <Accordion type="multiple" defaultValue={["price", "type"]}>
                <AccordionItem value="price">
                  <AccordionTrigger>{t("accommodations.priceRange")}</AccordionTrigger>
                  <AccordionContent>
                    <Slider value={priceRange} onValueChange={setPriceRange} max={500000} step={10000} className="mb-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">0 RWF</span>
                      <span className="text-primary font-medium">{priceRange[1].toLocaleString()} RWF</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="type">
                  <AccordionTrigger>{t("accommodations.propertyType")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {propertyTypes.map((type) => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox
                            id={type}
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              setSelectedTypes((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(type);
                                else next.delete(type);
                                return Array.from(next);
                              });
                            }}
                          />
                          <label htmlFor={type} className="text-sm text-muted-foreground cursor-pointer">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rating">
                  <AccordionTrigger>{t("accommodations.minimumRating")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className="p-1"
                          type="button"
                          onClick={() => setMinRating((prev) => (prev === star ? 0 : star))}
                          aria-label={`Minimum rating ${star}`}
                        >
                          <Star
                            className={`w-5 h-5 transition-colors ${
                              minRating >= star ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="amenities">
                  <AccordionTrigger>{t("accommodations.amenities")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-2">
                          <Checkbox
                            id={amenity}
                            checked={selectedAmenities.includes(amenity)}
                            onCheckedChange={(checked) => {
                              setSelectedAmenities((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(amenity);
                                else next.delete(amenity);
                                return Array.from(next);
                              });
                            }}
                          />
                          <label htmlFor={amenity} className="text-sm text-muted-foreground cursor-pointer">
                            {amenity}
                          </label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </aside>

          {/* Properties Grid */}
          <div className="flex-1">
            {/* Mobile: 2.5-column horizontal scroll */}
            <div className="sm:hidden">
              {isLoading ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("common.loadingProperties")}</p>
                </div>
              ) : isError ? (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">{t("common.couldNotLoadProperties")}</p>
                </div>
              ) : properties.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">{t("accommodations.noMatches")}</p>
                </div>
              ) : (
                <div className="grid grid-flow-col auto-cols-[46%] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                  {properties.map((property) => (
                    <div key={property.id} className="snap-start">
                      <PropertyCard
                        id={property.id}
                        image={property.images?.[0] ?? null}
                        title={property.title}
                        location={property.location}
                        rating={Number(property.rating) || 0}
                        reviews={property.review_count || 0}
                        price={Number(property.price_per_night)}
                        currency={property.currency}
                        type={property.property_type}
                        isFavorited={favoritesSet.has(property.id)}
                        onToggleFavorite={async () => {
                          const isFav = favoritesSet.has(property.id);
                          const changed = await toggleFavorite(String(property.id), isFav);
                          if (changed) {
                            await qc.invalidateQueries({ queryKey: ["favorites", "ids", user?.id] });
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tablet/Desktop */}
            <div className="hidden sm:grid grid-cols-2 xl:grid-cols-3 gap-6">
              {isLoading ? (
                <div className="col-span-full py-16 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("common.loadingProperties")}</p>
                </div>
              ) : isError ? (
                <div className="col-span-full py-16 text-center">
                  <p className="text-muted-foreground">{t("common.couldNotLoadProperties")}</p>
                </div>
              ) : properties.length === 0 ? (
                <div className="col-span-full py-16 text-center">
                  <p className="text-muted-foreground">{t("accommodations.noMatches")}</p>
                </div>
              ) : (
                properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    id={property.id}
                    image={property.images?.[0] ?? null}
                    title={property.title}
                    location={property.location}
                    rating={Number(property.rating) || 0}
                    reviews={property.review_count || 0}
                    price={Number(property.price_per_night)}
                    currency={property.currency}
                    type={property.property_type}
                    isFavorited={favoritesSet.has(property.id)}
                    onToggleFavorite={async () => {
                      const isFav = favoritesSet.has(property.id);
                      const changed = await toggleFavorite(String(property.id), isFav);
                      if (changed) {
                        await qc.invalidateQueries({ queryKey: ["favorites", "ids", user?.id] });
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Accommodations;
