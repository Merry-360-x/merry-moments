import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SmartSearchBar } from "@/components/SmartSearchBar";
import { SmartSearch } from "@/lib/recommendation-engine";
import PropertyCard from "@/components/PropertyCard";
import TourPromoCard from "@/components/TourPromoCard";
import TransportPromoCard from "@/components/TransportPromoCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filters
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');

  const query = searchParams.get('q') || '';
  const location = searchParams.get('location') || '';

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: any = {
        type: activeTab === 'all' ? undefined : activeTab,
        priceMin: priceRange[0],
        priceMax: priceRange[1],
      };

      if (category) filters.category = category;
      if (rating) filters.rating = rating;
      if (location) filters.location = location;

      let searchResults = await SmartSearch.search(query, filters);

      // Apply sorting
      if (sortBy === 'price-low') {
        searchResults = searchResults.sort((a, b) => {
          const priceA = a.price_per_night || a.price_per_person || a.price_per_adult || a.price_per_day || 0;
          const priceB = b.price_per_night || b.price_per_person || b.price_per_adult || b.price_per_day || 0;
          return priceA - priceB;
        });
      } else if (sortBy === 'price-high') {
        searchResults = searchResults.sort((a, b) => {
          const priceA = a.price_per_night || a.price_per_person || a.price_per_adult || a.price_per_day || 0;
          const priceB = b.price_per_night || b.price_per_person || b.price_per_adult || b.price_per_day || 0;
          return priceB - priceA;
        });
      } else if (sortBy === 'rating') {
        searchResults = searchResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      setResults(searchResults);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [query, location, activeTab, category, rating, sortBy, priceRange]);

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, performSearch]);

  const handleSearch = (newQuery: string, newLocation: string) => {
    const params = new URLSearchParams();
    if (newQuery) params.set('q', newQuery);
    if (newLocation) params.set('location', newLocation);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setCategory('');
    setRating(0);
    setPriceRange([0, 1000]);
    setSortBy('relevance');
  };

  const properties = results.filter(r => r.searchType === 'property');
  const tours = results.filter(r => r.searchType === 'tour' || r.searchType === 'tour_package');
  const transport = results.filter(r => r.searchType === 'transport');

  // Map results to component props
  const mapToPropertyProps = (item: any) => ({
    id: item.id,
    image: item.images?.[0] || null,
    images: item.images || null,
    title: item.title || item.name || '',
    location: item.location || item.city || '',
    rating: item.rating || 0,
    reviews: item.review_count || 0,
    price: item.price_per_night || 0,
    currency: item.currency,
    type: item.property_type || 'Property',
    bedrooms: item.bedrooms,
    beds: item.beds,
    bathrooms: item.bathrooms,
    maxGuests: item.max_guests,
    isFavorited: false,
  });

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
  });

  const mapToTransportProps = (item: any) => ({
    id: item.id,
    title: item.vehicle_name || item.title || '',
    vehicleType: item.vehicle_type || null,
    seats: item.seats || item.passenger_capacity || null,
    pricePerDay: item.price_per_day || 0,
    currency: item.currency || null,
    media: item.media || null,
    imageUrl: item.image_url || null,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="mb-8">
          <SmartSearchBar 
            onSearch={handleSearch}
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {query ? `Search results for "${query}"` : 'Search Results'}
            </h1>
            {!isLoading && (
              <p className="text-muted-foreground mt-1">
                {results.length} {results.length === 1 ? 'result' : 'results'} found
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>

            {/* Filters toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-muted/50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filters</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Price range */}
              <div>
                <Label className="mb-3 block">Price Range (USD)</Label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  min={0}
                  max={2000}
                  step={50}
                  className="mb-2"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>

              {/* Rating */}
              <div>
                <Label className="mb-3 block">Minimum Rating</Label>
                <Select value={rating.toString()} onValueChange={(v) => setRating(parseFloat(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any rating</SelectItem>
                    <SelectItem value="3">3+ stars</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <Label className="mb-3 block">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    <SelectItem value="Villa">Villa</SelectItem>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="Hotel">Hotel</SelectItem>
                    <SelectItem value="Adventure">Adventure</SelectItem>
                    <SelectItem value="Cultural">Cultural</SelectItem>
                    <SelectItem value="Wildlife">Wildlife</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={performSearch} className="mt-4">
              Apply Filters
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Results tabs */}
        {!isLoading && results.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All ({results.length})</TabsTrigger>
              <TabsTrigger value="properties">Stays ({properties.length})</TabsTrigger>
              <TabsTrigger value="tours">Tours ({tours.length})</TabsTrigger>
              <TabsTrigger value="transport">Transport ({transport.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {results.map((result, idx) => (
                <div key={`${result.searchType}-${result.id}-${idx}`}>
                  {result.searchType === 'property' && (
                    <PropertyCard {...mapToPropertyProps(result)} />
                  )}
                  {(result.searchType === 'tour' || result.searchType === 'tour_package') && (
                    <TourPromoCard {...mapToTourProps(result)} />
                  )}
                  {result.searchType === 'transport' && (
                    <TransportPromoCard {...mapToTransportProps(result)} />
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="properties">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((prop, idx) => (
                  <PropertyCard key={`prop-${prop.id}-${idx}`} {...mapToPropertyProps(prop)} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tours">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tours.map((tour, idx) => (
                  <TourPromoCard key={`tour-${tour.id}-${idx}`} {...mapToTourProps(tour)} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="transport">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {transport.map((vehicle, idx) => (
                  <TransportPromoCard key={`transport-${vehicle.id}-${idx}`} {...mapToTransportProps(vehicle)} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* No results */}
        {!isLoading && results.length === 0 && query && (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search or filters
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
