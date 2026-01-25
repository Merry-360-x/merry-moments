import { supabase } from "@/integrations/supabase/client";

interface UserPreferences {
  favoriteCategories: string[];
  priceRange: { min: number; max: number };
  preferredCurrency: string;
  travelStyle: 'budget' | 'comfort' | 'luxury';
  interests: string[];
}

interface RecommendationScore {
  itemId: string;
  score: number;
  reasons: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class RecommendationEngine {
  private userId: string | null;
  private userPreferences: UserPreferences | null = null;
  private userHistory: any[] = [];
  private favorites: any[] = [];

  constructor(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Initialize the recommendation engine with user data
   */
  async initialize() {
    if (!this.userId) return;

    try {
      // Fetch user favorites
      const { data: favs } = await supabase
        .from('favorites')
        .select('id, property_id, created_at')
        .eq('user_id', this.userId);
      this.favorites = favs || [];

      // Fetch user booking history
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('guest_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(20);
      this.userHistory = bookings || [];

      // Extract preferences from history
      this.extractPreferences();
    } catch (err) {
      console.error('[RecommendationEngine] Failed to initialize:', err);
    }
  }

  /**
   * Extract user preferences from their history and favorites
   */
  private extractPreferences() {
    const categories: { [key: string]: number } = {};
    let totalSpent = 0;
    let bookingCount = 0;

    this.userHistory.forEach((booking) => {
      if (booking.total_price) {
        totalSpent += booking.total_price;
        bookingCount++;
      }
      
      // Extract categories from bookings
      const category = booking.category || booking.tour_category;
      if (category) {
        categories[category] = (categories[category] || 0) + 1;
      }
    });

    const avgSpent = bookingCount > 0 ? totalSpent / bookingCount : 0;
    
    this.userPreferences = {
      favoriteCategories: Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat]) => cat),
      priceRange: {
        min: avgSpent * 0.5,
        max: avgSpent * 1.5,
      },
      preferredCurrency: 'USD',
      travelStyle: avgSpent < 100 ? 'budget' : avgSpent < 300 ? 'comfort' : 'luxury',
      interests: [],
    };
  }

  /**
   * Score an item based on user preferences and behavior
   */
  private scoreItem(item: any, itemType: 'property' | 'tour' | 'tour_package' | 'transport'): RecommendationScore {
    let score = 50; // Base score
    const reasons: string[] = [];

    // If user has no history, use popularity metrics
    if (!this.userPreferences || this.userHistory.length === 0) {
      if (item.rating && item.rating >= 4.5) {
        score += 20;
        reasons.push('Highly rated');
      }
      if (item.review_count && item.review_count > 10) {
        score += 10;
        reasons.push('Popular choice');
      }
      return { itemId: item.id, score, reasons };
    }

    // Category matching
    const itemCategory = item.category || item.tour_type;
    if (itemCategory && this.userPreferences.favoriteCategories.includes(itemCategory)) {
      score += 30;
      reasons.push(`Matches your interest in ${itemCategory}`);
    }

    // Price matching
    const itemPrice = item.price_per_night || item.price_per_person || item.price_per_adult || item.price_per_day || 0;
    if (itemPrice > 0) {
      if (itemPrice >= this.userPreferences.priceRange.min && itemPrice <= this.userPreferences.priceRange.max) {
        score += 20;
        reasons.push('In your typical price range');
      } else if (itemPrice < this.userPreferences.priceRange.min) {
        score += 10;
        reasons.push('Great value');
      }
    }

    // Rating boost
    if (item.rating) {
      score += item.rating * 4;
      if (item.rating >= 4.5) {
        reasons.push('Excellent reviews');
      }
    }

    // Popularity boost
    if (item.review_count) {
      score += Math.min(item.review_count / 2, 15);
    }

    // Favorite boost
    if (this.favorites.some(fav => fav.item_id === item.id)) {
      score += 50;
      reasons.push('You favorited this');
    }

    // Recency penalty (prefer newer items)
    if (item.created_at) {
      const daysOld = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 30) {
        score += 10;
        reasons.push('Recently added');
      }
    }

    return { itemId: item.id, score, reasons };
  }

  /**
   * Get personalized recommendations for properties
   */
  async getPropertyRecommendations(limit = 10): Promise<any[]> {
    try {
      const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50); // Fetch more to score and filter

      if (!properties) return [];

      const scored = properties.map(prop => ({
        ...prop,
        ...this.scoreItem(prop, 'property'),
      }));

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (err) {
      console.error('[RecommendationEngine] Failed to get property recommendations:', err);
      return [];
    }
  }

  /**
   * Get personalized recommendations for tours
   */
  async getTourRecommendations(limit = 10): Promise<any[]> {
    try {
      const { data: tours } = await supabase
        .from('tours')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: packages } = await supabase
        .from('tour_packages')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      const allTours = [
        ...(tours || []).map(t => ({ ...t, source: 'tours' })),
        ...(packages || []).map(p => ({ ...p, source: 'tour_packages' })),
      ];

      const scored = allTours.map(tour => ({
        ...tour,
        ...this.scoreItem(tour, tour.source === 'tours' ? 'tour' : 'tour_package'),
      }));

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (err) {
      console.error('[RecommendationEngine] Failed to get tour recommendations:', err);
      return [];
    }
  }

  /**
   * Get similar items (collaborative filtering)
   */
  async getSimilarItems(itemId: string, itemType: string, limit = 5): Promise<any[]> {
    try {
      // Get the reference item
      const { data: refItem } = await supabase
        .from(itemType === 'tour_package' ? 'tour_packages' : itemType === 'tour' ? 'tours' : 'properties')
        .select('*')
        .eq('id', itemId)
        .single();

      if (!refItem) return [];

      // Find similar items based on category, price range, and location
      const table = itemType === 'tour_package' ? 'tour_packages' : itemType === 'tour' ? 'tours' : 'properties';
      let query = supabase.from(table).select('*');

      // Category match
      if (refItem.category) {
        query = query.eq('category', refItem.category);
      }

      // Location match
      if (refItem.city) {
        query = query.eq('city', refItem.city);
      } else if (refItem.location) {
        query = query.ilike('location', `%${refItem.location.split(',')[0]}%`);
      }

      // Exclude the reference item
      query = query.neq('id', itemId).limit(limit);

      const { data: similar } = await query;
      return similar || [];
    } catch (err) {
      console.error('[RecommendationEngine] Failed to get similar items:', err);
      return [];
    }
  }
}

/**
 * Advanced search with intelligent filtering and ranking
 */
export class SmartSearch {
  /**
   * Search across all content types with smart ranking
   */
  static async search(query: string, filters: {
    type?: 'all' | 'properties' | 'tours' | 'transport';
    category?: string;
    priceMin?: number;
    priceMax?: number;
    location?: string;
    rating?: number;
    currency?: string;
  } = {}): Promise<any[]> {
    const results: any[] = [];
    const searchTerms = query.toLowerCase().trim();

    try {
      // Search properties
      if (!filters.type || filters.type === 'all' || filters.type === 'properties') {
        const { data: properties } = await supabase
          .from('properties')
          .select('*')
          .eq('is_published', true)
          .or(`title.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,location.ilike.%${searchTerms}%`);

        if (properties) {
          results.push(...properties.map(p => ({
            ...p,
            searchType: 'property',
            relevance: this.calculateRelevance(p, searchTerms, 'property'),
          })));
        }
      }

      // Search tours
      if (!filters.type || filters.type === 'all' || filters.type === 'tours') {
        const { data: tours } = await supabase
          .from('tours')
          .select('*')
          .eq('is_published', true)
          .or(`title.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,location.ilike.%${searchTerms}%`);

        const { data: packages } = await supabase
          .from('tour_packages')
          .select('*')
          .eq('status', 'approved')
          .or(`title.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,city.ilike.%${searchTerms}%`);

        if (tours) {
          results.push(...tours.map(t => ({
            ...t,
            searchType: 'tour',
            relevance: this.calculateRelevance(t, searchTerms, 'tour'),
          })));
        }

        if (packages) {
          results.push(...packages.map(p => ({
            ...p,
            searchType: 'tour_package',
            relevance: this.calculateRelevance(p, searchTerms, 'tour_package'),
          })));
        }
      }

      // Search transport
      if (!filters.type || filters.type === 'all' || filters.type === 'transport') {
        const { data: vehicles } = await supabase
          .from('transport_vehicles')
          .select('*')
          .eq('is_published', true)
          .or(`title.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,vehicle_type.ilike.%${searchTerms}%`);

        if (vehicles) {
          results.push(...vehicles.map(v => ({
            ...v,
            searchType: 'transport',
            relevance: this.calculateRelevance(v, searchTerms, 'transport'),
          })));
        }
      }

      // Apply filters
      const filtered = this.applyFilters(results, filters);

      // Sort by relevance
      filtered.sort((a, b) => b.relevance - a.relevance);

      return filtered;
    } catch (err) {
      console.error('[SmartSearch] Search failed:', err);
      return [];
    }
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateRelevance(item: any, searchTerms: string, type: string): number {
    let score = 0;
    const terms = searchTerms.split(' ');

    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const location = (item.location || item.city || '').toLowerCase();

    // Title matches (highest weight)
    terms.forEach(term => {
      if (title.includes(term)) score += 50;
      if (title.startsWith(term)) score += 30;
    });

    // Description matches
    terms.forEach(term => {
      if (description.includes(term)) score += 20;
    });

    // Location matches
    terms.forEach(term => {
      if (location.includes(term)) score += 30;
    });

    // Category matches
    const category = (item.category || item.property_type || item.vehicle_type || '').toLowerCase();
    terms.forEach(term => {
      if (category.includes(term)) score += 25;
    });

    // Rating boost
    if (item.rating) {
      score += item.rating * 5;
    }

    // Popularity boost
    if (item.review_count) {
      score += Math.min(item.review_count, 20);
    }

    return score;
  }

  /**
   * Apply filters to search results
   */
  private static applyFilters(results: any[], filters: any): any[] {
    return results.filter(item => {
      // Category filter
      if (filters.category) {
        const itemCategory = item.category || item.property_type || item.vehicle_type;
        if (itemCategory !== filters.category) return false;
      }

      // Price filter
      const price = item.price_per_night || item.price_per_person || item.price_per_adult || item.price_per_day || 0;
      if (filters.priceMin && price < filters.priceMin) return false;
      if (filters.priceMax && price > filters.priceMax) return false;

      // Rating filter
      if (filters.rating && (!item.rating || item.rating < filters.rating)) return false;

      // Location filter
      if (filters.location) {
        const location = (item.location || item.city || '').toLowerCase();
        if (!location.includes(filters.location.toLowerCase())) return false;
      }

      return true;
    });
  }

  /**
   * Get location suggestions based on available data
   */
  static async getLocationSuggestions(query: string): Promise<string[]> {
    try {
      const suggestions = new Set<string>();

      // Get unique locations from properties
      const { data: properties } = await supabase
        .from('properties')
        .select('location')
        .ilike('location', `%${query}%`)
        .limit(10);

      properties?.forEach(p => {
        if (p.location) suggestions.add(p.location);
      });

      // Get unique cities from tours
      const { data: tours } = await supabase
        .from('tours')
        .select('location')
        .ilike('location', `%${query}%`)
        .limit(10);

      tours?.forEach(t => {
        if (t.location) suggestions.add(t.location);
      });

      // Get unique cities from tour packages
      const { data: packages } = await supabase
        .from('tour_packages')
        .select('city')
        .ilike('city', `%${query}%`)
        .limit(10);

      packages?.forEach(p => {
        if (p.city) suggestions.add(p.city);
      });

      return Array.from(suggestions).slice(0, 10);
    } catch (err) {
      console.error('[SmartSearch] Failed to get location suggestions:', err);
      return [];
    }
  }
}
