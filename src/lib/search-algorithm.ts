import { supabase } from "@/integrations/supabase/client";

/**
 * Advanced Search Algorithm
 * Features: Fuzzy matching, relevance scoring, multi-field search, filters, ranking
 */

export interface SearchQuery {
  query: string;
  type?: 'all' | 'properties' | 'tours' | 'packages' | 'transport';
  filters?: SearchFilters;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  category?: string;
  location?: string;
  bedrooms?: number;
  maxGuests?: number;
  propertyType?: string;
  amenities?: string[];
}

export type SortOption = 
  | 'relevance' 
  | 'price-low' 
  | 'price-high' 
  | 'rating' 
  | 'newest' 
  | 'popular';

export interface SearchResult {
  id: string;
  type: 'property' | 'tour' | 'package' | 'transport';
  score: number;
  data: any;
  highlights: string[];
}

export class SearchAlgorithm {
  private static readonly FUZZY_THRESHOLD = 0.6; // Minimum similarity score
  private static readonly MAX_RESULTS = 100;

  /**
   * Main search function with advanced ranking
   */
  static async search(query: SearchQuery): Promise<SearchResult[]> {
    const searchTerms = this.preprocessQuery(query.query);
    const results: SearchResult[] = [];

    try {
      // Search across different content types
      if (!query.type || query.type === 'all' || query.type === 'properties') {
        const properties = await this.searchProperties(searchTerms, query.filters);
        results.push(...properties);
      }

      if (!query.type || query.type === 'all' || query.type === 'tours') {
        const tours = await this.searchTours(searchTerms, query.filters);
        results.push(...tours);
      }

      if (!query.type || query.type === 'all' || query.type === 'packages') {
        const packages = await this.searchPackages(searchTerms, query.filters);
        results.push(...packages);
      }

      if (!query.type || query.type === 'all' || query.type === 'transport') {
        const transport = await this.searchTransport(searchTerms, query.filters);
        results.push(...transport);
      }

      // Sort results
      const sorted = this.sortResults(results, query.sort || 'relevance');

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 20;
      return sorted.slice(offset, offset + limit);

    } catch (err) {
      console.error('[SearchAlgorithm] Search failed:', err);
      return [];
    }
  }

  /**
   * Preprocess search query (lowercase, trim, split)
   */
  private static preprocessQuery(query: string): string[] {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 0);
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity score (0-1) between two strings
   */
  private static similarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Calculate relevance score for a text field
   */
  private static scoreField(
    fieldValue: string | null | undefined,
    searchTerms: string[],
    weight: number
  ): { score: number; highlights: string[] } {
    if (!fieldValue) return { score: 0, highlights: [] };

    const fieldLower = fieldValue.toLowerCase();
    const highlights: string[] = [];
    let totalScore = 0;

    for (const term of searchTerms) {
      // Exact match bonus
      if (fieldLower.includes(term)) {
        totalScore += weight * 2;
        highlights.push(term);
        continue;
      }

      // Fuzzy match
      const words = fieldLower.split(/\s+/);
      for (const word of words) {
        const sim = this.similarity(word, term);
        if (sim >= this.FUZZY_THRESHOLD) {
          totalScore += weight * sim;
          if (sim > 0.8) highlights.push(word);
          break;
        }
      }
    }

    return { score: totalScore, highlights };
  }

  /**
   * Search properties
   */
  private static async searchProperties(
    searchTerms: string[],
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('is_published', true);

      // Apply filters
      if (filters?.priceMin) query = query.gte('price_per_night', filters.priceMin);
      if (filters?.priceMax) query = query.lte('price_per_night', filters.priceMax);
      if (filters?.rating) query = query.gte('rating', filters.rating);
      if (filters?.location) query = query.ilike('location', `%${filters.location}%`);
      if (filters?.bedrooms) query = query.gte('bedrooms', filters.bedrooms);
      if (filters?.maxGuests) query = query.gte('max_guests', filters.maxGuests);
      if (filters?.propertyType) query = query.eq('property_type', filters.propertyType);

      const { data, error } = await query.limit(this.MAX_RESULTS);

      if (error) throw error;
      if (!data) return [];

      return data.map(property => {
        const titleScore = this.scoreField(property.title || property.name, searchTerms, 10);
        const descScore = this.scoreField(property.description, searchTerms, 5);
        const locationScore = this.scoreField(property.location, searchTerms, 8);
        const categoryScore = this.scoreField(property.property_type, searchTerms, 6);

        const totalScore = 
          titleScore.score + 
          descScore.score + 
          locationScore.score + 
          categoryScore.score +
          (property.rating || 0) * 2; // Rating bonus

        return {
          id: property.id,
          type: 'property' as const,
          score: totalScore,
          data: property,
          highlights: [
            ...titleScore.highlights,
            ...descScore.highlights,
            ...locationScore.highlights,
            ...categoryScore.highlights
          ]
        };
      }).filter(r => r.score > 0);

    } catch (err) {
      console.error('[SearchAlgorithm] searchProperties error:', err);
      return [];
    }
  }

  /**
   * Search tours
   */
  private static async searchTours(
    searchTerms: string[],
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      let query = supabase
        .from('tours')
        .select('*')
        .eq('status', 'approved');

      if (filters?.priceMin) query = query.gte('price_per_adult', filters.priceMin);
      if (filters?.priceMax) query = query.lte('price_per_adult', filters.priceMax);
      if (filters?.rating) query = query.gte('rating', filters.rating);
      if (filters?.location) query = query.ilike('location', `%${filters.location}%`);
      if (filters?.category) query = query.eq('category', filters.category);

      const { data, error } = await query.limit(this.MAX_RESULTS);

      if (error) throw error;
      if (!data) return [];

      return data.map(tour => {
        const titleScore = this.scoreField(tour.title, searchTerms, 10);
        const descScore = this.scoreField(tour.description, searchTerms, 5);
        const locationScore = this.scoreField(tour.location, searchTerms, 8);
        const categoryScore = this.scoreField(tour.category, searchTerms, 6);

        const totalScore = 
          titleScore.score + 
          descScore.score + 
          locationScore.score + 
          categoryScore.score +
          (tour.rating || 0) * 2;

        return {
          id: tour.id,
          type: 'tour' as const,
          score: totalScore,
          data: tour,
          highlights: [
            ...titleScore.highlights,
            ...descScore.highlights,
            ...locationScore.highlights
          ]
        };
      }).filter(r => r.score > 0);

    } catch (err) {
      console.error('[SearchAlgorithm] searchTours error:', err);
      return [];
    }
  }

  /**
   * Search tour packages
   */
  private static async searchPackages(
    searchTerms: string[],
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      let query = supabase
        .from('tour_packages')
        .select('*')
        .eq('is_published', true);

      if (filters?.priceMin) query = query.gte('price_per_person', filters.priceMin);
      if (filters?.priceMax) query = query.lte('price_per_person', filters.priceMax);
      if (filters?.rating) query = query.gte('rating', filters.rating);
      if (filters?.location) query = query.ilike('location', `%${filters.location}%`);

      const { data, error } = await query.limit(this.MAX_RESULTS);

      if (error) throw error;
      if (!data) return [];

      return data.map(pkg => {
        const titleScore = this.scoreField(pkg.title, searchTerms, 10);
        const descScore = this.scoreField(pkg.description, searchTerms, 5);
        const locationScore = this.scoreField(pkg.location, searchTerms, 8);

        const totalScore = 
          titleScore.score + 
          descScore.score + 
          locationScore.score +
          (pkg.rating || 0) * 2;

        return {
          id: pkg.id,
          type: 'package' as const,
          score: totalScore,
          data: pkg,
          highlights: [
            ...titleScore.highlights,
            ...descScore.highlights,
            ...locationScore.highlights
          ]
        };
      }).filter(r => r.score > 0);

    } catch (err) {
      console.error('[SearchAlgorithm] searchPackages error:', err);
      return [];
    }
  }

  /**
   * Search transport vehicles
   */
  private static async searchTransport(
    searchTerms: string[],
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      let query = supabase
        .from('transport_vehicles')
        .select('*')
        .eq('is_published', true);

      if (filters?.priceMin) query = query.gte('price_per_day', filters.priceMin);
      if (filters?.priceMax) query = query.lte('price_per_day', filters.priceMax);

      const { data, error } = await query.limit(this.MAX_RESULTS);

      if (error) throw error;
      if (!data) return [];

      return data.map(vehicle => {
        const titleScore = this.scoreField(vehicle.title, searchTerms, 10);
        const typeScore = this.scoreField(vehicle.vehicle_type, searchTerms, 8);
        const descScore = this.scoreField(vehicle.description, searchTerms, 5);

        const totalScore = titleScore.score + typeScore.score + descScore.score;

        return {
          id: vehicle.id,
          type: 'transport' as const,
          score: totalScore,
          data: vehicle,
          highlights: [
            ...titleScore.highlights,
            ...typeScore.highlights,
            ...descScore.highlights
          ]
        };
      }).filter(r => r.score > 0);

    } catch (err) {
      console.error('[SearchAlgorithm] searchTransport error:', err);
      return [];
    }
  }

  /**
   * Sort search results
   */
  private static sortResults(results: SearchResult[], sort: SortOption): SearchResult[] {
    const sorted = [...results];

    switch (sort) {
      case 'relevance':
        sorted.sort((a, b) => b.score - a.score);
        break;

      case 'price-low':
        sorted.sort((a, b) => {
          const priceA = this.getPrice(a.data, a.type);
          const priceB = this.getPrice(b.data, b.type);
          return priceA - priceB;
        });
        break;

      case 'price-high':
        sorted.sort((a, b) => {
          const priceA = this.getPrice(a.data, a.type);
          const priceB = this.getPrice(b.data, b.type);
          return priceB - priceA;
        });
        break;

      case 'rating':
        sorted.sort((a, b) => (b.data.rating || 0) - (a.data.rating || 0));
        break;

      case 'newest':
        sorted.sort((a, b) => {
          const dateA = new Date(a.data.created_at || 0).getTime();
          const dateB = new Date(b.data.created_at || 0).getTime();
          return dateB - dateA;
        });
        break;

      case 'popular':
        sorted.sort((a, b) => {
          const popA = (a.data.review_count || 0) * (a.data.rating || 0);
          const popB = (b.data.review_count || 0) * (b.data.rating || 0);
          return popB - popA;
        });
        break;
    }

    return sorted;
  }

  /**
   * Get price from result data based on type
   */
  private static getPrice(data: any, type: string): number {
    switch (type) {
      case 'property':
        return data.price_per_night || 0;
      case 'tour':
        return data.price_per_adult || 0;
      case 'package':
        return data.price_per_person || 0;
      case 'transport':
        return data.price_per_day || 0;
      default:
        return 0;
    }
  }

  /**
   * Get autocomplete suggestions
   */
  static async getSuggestions(query: string, limit = 5): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const suggestions = new Set<string>();

    try {
      // Get suggestions from properties
      const { data: properties } = await supabase
        .from('properties')
        .select('title, location')
        .eq('is_published', true)
        .or(`title.ilike.%${query}%,location.ilike.%${query}%`)
        .limit(limit);

      properties?.forEach(p => {
        if (p.title?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(p.title);
        }
        if (p.location?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(p.location);
        }
      });

      // Get suggestions from tours
      const { data: tours } = await supabase
        .from('tours')
        .select('title, location')
        .eq('status', 'approved')
        .or(`title.ilike.%${query}%,location.ilike.%${query}%`)
        .limit(limit);

      tours?.forEach(t => {
        if (t.title?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(t.title);
        }
        if (t.location?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(t.location);
        }
      });

      return Array.from(suggestions).slice(0, limit);

    } catch (err) {
      console.error('[SearchAlgorithm] getSuggestions error:', err);
      return [];
    }
  }

  /**
   * Get popular searches
   */
  static getPopularSearches(): string[] {
    // This could be enhanced to track actual user searches
    return [
      'Beach resort',
      'Mountain lodge',
      'City apartment',
      'Safari tour',
      'Wine tasting',
      'Hiking adventure',
      'Luxury villa',
      '4x4 rental'
    ];
  }
}
