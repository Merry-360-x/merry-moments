import { useState, useEffect, useCallback } from "react";
import { RecommendationEngine } from "@/lib/recommendation-engine";
import { useAuth } from "@/contexts/AuthContext";
import PropertyCard from "@/components/PropertyCard";
import TourPromoCard from "@/components/TourPromoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTourPricingModel } from "@/lib/tour-pricing";

interface RecommendationsProps {
  type: 'properties' | 'tours' | 'all';
  limit?: number;
  title?: string;
  className?: string;
}

export function PersonalizedRecommendations({
  type = 'all',
  limit = 6,
  title,
  className = '',
}: RecommendationsProps) {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [properties, setProperties] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tours, setTours] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [engine, setEngine] = useState<RecommendationEngine | null>(null);

  const initializeEngine = useCallback(async () => {
    setIsLoading(true);
    try {
      const recommendationEngine = new RecommendationEngine(user?.id || null);
      await recommendationEngine.initialize();
      setEngine(recommendationEngine);

      if (type === 'properties' || type === 'all') {
        const propertyRecs = await recommendationEngine.getPropertyRecommendations(limit);
        setProperties(propertyRecs);
      }

      if (type === 'tours' || type === 'all') {
        const tourRecs = await recommendationEngine.getTourRecommendations(limit);
        setTours(tourRecs);
      }
    } catch (err) {
      console.error('[PersonalizedRecommendations] Failed to initialize:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, type, limit]);

  useEffect(() => {
    initializeEngine();
  }, [initializeEngine]);

  // Map recommendation data to card props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapToPropertyProps = (item: any) => {
    const isMonthlyOnly = Boolean(item.monthly_only_listing);

    return {
    id: item.id,
    image: item.images?.[0] || null,
    images: item.images || null,
    title: item.title || item.name || '',
    location: item.location || item.city || '',
    rating: item.rating || 0,
    reviews: item.review_count || 0,
    price: isMonthlyOnly ? (item.price_per_month || 0) : (item.price_per_night || 0),
    pricePeriod: isMonthlyOnly ? "month" : "night",
    pricePerPerson: item.price_per_person,
    currency: item.currency,
    type: item.property_type || 'Property',
    bedrooms: item.bedrooms,
    beds: item.beds,
    bathrooms: item.bathrooms,
    maxGuests: item.max_guests,
    checkInTime: item.check_in_time,
    checkOutTime: item.check_out_time,
    smokingAllowed: item.smoking_allowed,
    eventsAllowed: item.events_allowed,
    petsAllowed: item.pets_allowed,
    isFavorited: false,
    hostId: item.host_id || null,
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapToTourProps = (item: any) => ({
    id: item.id,
    title: item.title || item.name || '',
    location: item.location || null,
    price: item.price_per_person ?? item.price_per_adult ?? item.base_price ?? 0,
    currency: item.currency ?? item.base_currency ?? null,
    images: item.images ?? item.gallery_images ?? (item.cover_image ? [item.cover_image] : null),
    rating: item.rating || null,
    reviewCount: item.review_count || null,
    category: item.category || null,
    durationDays: item.duration_days || null,
    pricingModel: getTourPricingModel(item.pricing_tiers),
    source: item.source as 'tours' | 'tour_packages' | undefined,
    hostId: item.created_by || item.host_id || null,
  });

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const hasRecommendations = properties.length > 0 || tours.length > 0;

  if (!hasRecommendations) {
    return null;
  }

  return (
    <div className={className}>
      {/* Properties recommendations */}
      {properties.length > 0 && (
        <div className="mb-12 md:mb-16">
          <div className="mb-4 md:mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary/80" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                {title || (user ? 'Recommended For You' : 'Popular Stays')}
              </h2>
            </div>
            {user && (
              <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">Handpicked based on your preferences</p>
            )}
          </div>

          {/* Mobile: 2-column grid like Airbnb */}
          <div className="md:hidden">
            <div className="grid grid-cols-2 gap-3">
              {properties.map((property) => (
                <div 
                  key={property.id} 
                  className="group relative"
                >
                  <PropertyCard {...mapToPropertyProps(property)} />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-5">
            {properties.map((property) => (
              <div 
                key={property.id} 
                className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="[&>div]:rounded-2xl [&>div]:border-0 [&>div]:shadow-none [&>div]:hover:shadow-none [&_img]:object-cover [&_img]:h-full">
                  <PropertyCard {...mapToPropertyProps(property)} />
                </div>
                {property.reasons && property.reasons.length > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge 
                      variant="secondary" 
                      className="bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white backdrop-blur-sm border-0 shadow-lg text-xs py-1 px-2.5 font-medium"
                    >
                      <TrendingUp className="w-3 h-3 mr-1.5" />
                      {property.reasons[0]}
                    </Badge>
                  </div>
                )}
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tours recommendations */}
      {tours.length > 0 && (
        <div>
          <div className="mb-4 md:mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-12 bg-gradient-to-r from-rose-500 to-rose-300 rounded-full" />
              <Heart className="w-4 h-4 md:w-5 md:h-5 text-rose-500/80" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                {user ? 'Tours You Might Love' : 'Popular Tours'}
              </h2>
            </div>
            {user && (
              <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">Curated adventures just for you</p>
            )}
          </div>

          {/* Mobile: 2-column grid like Airbnb */}
          <div className="md:hidden">
            <div className="grid grid-cols-2 gap-3">
              {tours.map((tour) => (
                <div 
                  key={tour.id} 
                  className="group relative"
                >
                  <TourPromoCard {...mapToTourProps(tour)} />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-5">
            {tours.map((tour) => (
              <div 
                key={tour.id} 
                className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="[&>a]:rounded-2xl [&>a]:border-0 [&>a]:shadow-none [&>a]:hover:shadow-none [&_img]:object-cover [&_img]:h-full">
                  <TourPromoCard {...mapToTourProps(tour)} />
                </div>
                {tour.reasons && tour.reasons.length > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge 
                      variant="secondary" 
                      className="bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white backdrop-blur-sm border-0 shadow-lg text-xs py-1 px-2.5 font-medium"
                    >
                      <TrendingUp className="w-3 h-3 mr-1.5" />
                      {tour.reasons[0]}
                    </Badge>
                  </div>
                )}
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SimilarItemsProps {
  itemId: string;
  itemType: 'property' | 'tour' | 'tour_package' | 'transport';
  limit?: number;
}

export function SimilarItems({ itemId, itemType, limit = 4 }: SimilarItemsProps) {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [similar, setSimilar] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSimilar = useCallback(async () => {
    setIsLoading(true);
    try {
      const engine = new RecommendationEngine(user?.id || null);
      const items = await engine.getSimilarItems(itemId, itemType, limit);
      setSimilar(items);
    } catch (err) {
      console.error('[SimilarItems] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, itemId, itemType, limit]);

  useEffect(() => {
    loadSimilar();
  }, [loadSimilar]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapToPropertyProps = (item: any) => ({
    id: item.id,
    image: item.images?.[0] || null,
    images: item.images || null,
    title: item.title || item.name || '',
    location: item.location || item.city || '',
    rating: item.rating || 0,
    reviews: item.review_count || 0,
    price: item.price_per_night || 0,
    pricePerPerson: item.price_per_person,
    currency: item.currency,
    type: item.property_type || 'Property',
    bedrooms: item.bedrooms,
    beds: item.beds,
    bathrooms: item.bathrooms,
    maxGuests: item.max_guests,
    checkInTime: item.check_in_time,
    checkOutTime: item.check_out_time,
    smokingAllowed: item.smoking_allowed,
    eventsAllowed: item.events_allowed,
    petsAllowed: item.pets_allowed,
    isFavorited: false,
    hostId: item.host_id || null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapToTourProps = (item: any) => ({
    id: item.id,
    title: item.title || item.name || '',
    location: item.location || null,
    price: item.price_per_person || item.price_per_adult || 0,
    currency: item.currency || null,
    images: item.images || null,
    rating: item.rating || null,
    reviewCount: item.review_count || null,
    category: item.category || null,
    durationDays: item.duration_days || null,
    pricingModel: getTourPricingModel(item.pricing_tiers),
    hostId: item.created_by || item.host_id || null,
  });

  if (isLoading) {
    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">Similar Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (similar.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">You Might Also Like</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {similar.map((item) => (
          <div key={item.id}>
            {(itemType === 'property') && <PropertyCard {...mapToPropertyProps(item)} />}
            {(itemType === 'tour' || itemType === 'tour_package') && <TourPromoCard {...mapToTourProps(item)} />}
          </div>
        ))}
      </div>
    </div>
  );
}
