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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search Bar */}
      <div className="bg-background py-8 border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="bg-card rounded-xl shadow-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">{t("nav.accommodations")}</label>
              <input
                type="text"
                placeholder={t("common.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-semibold text-foreground mb-4">{t("accommodations.filters")}</h3>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">{t("accommodations.priceRange")}</label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={500000}
                  step={10000}
                  className="mb-2"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">0 RWF</span>
                  <span className="text-primary font-medium">{priceRange[1].toLocaleString()} RWF</span>
                </div>
              </div>

              {/* Property Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">{t("accommodations.propertyType")}</label>
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
              </div>

              {/* Minimum Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">{t("accommodations.minimumRating")}</label>
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
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">{t("accommodations.amenities")}</label>
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
              </div>
            </div>
          </aside>

          {/* Properties Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
