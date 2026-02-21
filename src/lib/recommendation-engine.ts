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
  private static normalizeText(input: string): string {
    return String(input ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static tokenize(input: string): string[] {
    const stopWords = new Set(["the", "a", "an", "in", "at", "to", "for", "of", "and", "with", "near"]);
    return this.normalizeText(input)
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !stopWords.has(t));
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private static expandToken(token: string): string[] {
    const synonyms: Record<string, string[]> = {
      apartment: ["apt", "apartments", "flat"],
      apt: ["apartment", "apartments", "flat"],
      villa: ["house", "home"],
      monthly: ["month", "longterm", "long", "extended"],
      month: ["monthly", "longterm", "extended"],
      kigali: ["kigali city"],
      guesthouse: ["guest", "house"],
    };
    return [token, ...(synonyms[token] || [])];
  }

  private static boundedLevenshtein(a: string, b: string, maxDistance: number): number {
    if (a === b) return 0;
    const lenA = a.length;
    const lenB = b.length;
    if (Math.abs(lenA - lenB) > maxDistance) return maxDistance + 1;

    const prev = new Array(lenB + 1);
    const curr = new Array(lenB + 1);

    for (let j = 0; j <= lenB; j++) prev[j] = j;

    for (let i = 1; i <= lenA; i++) {
      curr[0] = i;
      let minInRow = curr[0];

      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost
        );
        if (curr[j] < minInRow) minInRow = curr[j];
      }

      if (minInRow > maxDistance) return maxDistance + 1;

      for (let j = 0; j <= lenB; j++) prev[j] = curr[j];
    }

    return prev[lenB];
  }

  private static fuzzyContainsTerm(text: string, token: string): boolean {
    if (!text || !token) return false;
    if (text.includes(token)) return true;

    const words = text.split(" ").filter(Boolean).slice(0, 120);
    const maxDistance = token.length <= 4 ? 1 : token.length <= 8 ? 2 : 3;
    for (const word of words) {
      if (Math.abs(word.length - token.length) > maxDistance) continue;
      const distance = this.boundedLevenshtein(word, token, maxDistance);
      if (distance <= maxDistance) return true;
    }

    return false;
  }

  private static parseIntent(query: string) {
    const normalized = this.normalizeText(query);
    const monthlyIntent = /(\bmonthly\b|\bmonth\b|\blong term\b|\blongterm\b|\bextended stay\b|\b30 days\b|\b30 day\b)/.test(normalized);

    const bedroomMatch = normalized.match(/(\d+)\s*bed(room)?s?/);
    const bathroomMatch = normalized.match(/(\d+)\s*bath(room)?s?/);
    const guestMatch = normalized.match(/(\d+)\s*(guest|guests|people|persons)/);

    return {
      monthlyIntent,
      bedroomsMin: bedroomMatch ? Number(bedroomMatch[1]) : null,
      bathroomsMin: bathroomMatch ? Number(bathroomMatch[1]) : null,
      guestsMin: guestMatch ? Number(guestMatch[1]) : null,
    };
  }

  private static getItemFields(item: any, type: 'property' | 'tour' | 'tour_package' | 'transport') {
    const title = this.normalizeText(item.title || item.vehicle_name || "");
    const location = this.normalizeText(item.location || item.city || item.from_location || "");
    const description = this.normalizeText(item.description || "");
    const category = this.normalizeText(item.category || item.property_type || item.vehicle_type || "");
    const amenities = Array.isArray(item.amenities)
      ? this.normalizeText(item.amenities.join(" "))
      : this.normalizeText(item.amenities || "");
    const all = this.normalizeText([title, location, description, category, amenities, type].join(" "));

    return { title, location, description, category, amenities, all };
  }

  private static tokenFieldScore(token: string, fields: ReturnType<typeof SmartSearch.getItemFields>): number {
    const tokenRegex = new RegExp(`\\b${this.escapeRegExp(token)}\\b`, "i");
    let score = 0;

    if (tokenRegex.test(fields.title)) score += 60;
    else if (fields.title.includes(token)) score += 35;

    if (tokenRegex.test(fields.location)) score += 40;
    else if (fields.location.includes(token)) score += 25;

    if (tokenRegex.test(fields.category)) score += 28;
    else if (fields.category.includes(token)) score += 16;

    if (tokenRegex.test(fields.amenities)) score += 14;
    else if (fields.amenities.includes(token)) score += 8;

    if (tokenRegex.test(fields.description)) score += 12;
    else if (fields.description.includes(token)) score += 6;

    if (score === 0) {
      if (this.fuzzyContainsTerm(fields.title, token)) score += 20;
      if (this.fuzzyContainsTerm(fields.location, token)) score += 16;
      if (this.fuzzyContainsTerm(fields.category, token)) score += 12;
      if (this.fuzzyContainsTerm(fields.amenities, token)) score += 8;
      if (this.fuzzyContainsTerm(fields.description, token)) score += 5;
    }

    return score;
  }

  private static calculateAdvancedRelevance(
    item: any,
    query: string,
    tokens: string[],
    type: 'property' | 'tour' | 'tour_package' | 'transport'
  ): number | null {
    const fields = this.getItemFields(item, type);
    if (tokens.length === 0) {
      return (Number(item.rating || 0) * 8) + Math.min(Number(item.review_count || 0), 30);
    }

    const normalizedQuery = this.normalizeText(query);
    let score = 0;
    let matchedTokenCount = 0;

    for (const token of tokens) {
      const expanded = this.expandToken(token);
      const bestTokenScore = expanded.reduce((best, variant) => {
        const current = this.tokenFieldScore(variant, fields);
        return current > best ? current : best;
      }, 0);

      if (bestTokenScore > 0) matchedTokenCount += 1;
      score += bestTokenScore;
    }

    const coverage = matchedTokenCount / Math.max(tokens.length, 1);
    const minimumCoverage = tokens.length <= 2 ? 1 : 0.66;
    if (coverage < minimumCoverage) return null;

    if (normalizedQuery && fields.title.includes(normalizedQuery)) score += 120;
    if (normalizedQuery && fields.location.includes(normalizedQuery)) score += 80;

    score += Number(item.rating || 0) * 8;
    score += Math.min(Number(item.review_count || 0), 30);

    if (item.created_at) {
      const daysOld = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld <= 30) score += 10;
      else if (daysOld <= 90) score += 6;
    }

    return score;
  }

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
    monthlyMode?: 'all' | 'monthly_available' | 'monthly_only' | 'nightly_only';
    amenities?: string[];
  } = {}): Promise<any[]> {
    const results: any[] = [];
    const searchTerms = this.normalizeText(query);
    const termTokens = this.tokenize(query);
    const intent = this.parseIntent(query);

    const tokenClauses = termTokens.slice(0, 6).flatMap((token) => {
      const safeToken = this.normalizeText(token);
      if (!safeToken) return [];
      return [
        `title.ilike.%${safeToken}%`,
        `description.ilike.%${safeToken}%`,
        `location.ilike.%${safeToken}%`,
      ];
    });

    try {
      // Search properties
      if (!filters.type || filters.type === 'all' || filters.type === 'properties') {
        let propertyQuery = supabase
          .from('properties')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(500);

        if (tokenClauses.length > 0) {
          propertyQuery = propertyQuery.or(tokenClauses.join(','));
        }

        const { data: properties } = await propertyQuery;

        if (properties) {
          const matched = properties
            .map((p) => {
              const relevance = this.calculateAdvancedRelevance(p, query, termTokens, 'property');
              if (relevance === null) return null;
              return {
                ...p,
                searchType: 'property',
                relevance,
              };
            })
            .filter(Boolean) as any[];

          results.push(...matched);
        }
      }

      // Search tours
      if (!filters.type || filters.type === 'all' || filters.type === 'tours') {
        let tourQuery = supabase
          .from('tours')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(500);

        if (tokenClauses.length > 0) {
          tourQuery = tourQuery.or(tokenClauses.join(','));
        }

        const { data: tours } = await tourQuery;

        const packageClauses = termTokens.slice(0, 6).flatMap((token) => {
          const safeToken = this.normalizeText(token);
          if (!safeToken) return [];
          return [
            `title.ilike.%${safeToken}%`,
            `description.ilike.%${safeToken}%`,
            `city.ilike.%${safeToken}%`,
          ];
        });

        let packageQuery = supabase
          .from('tour_packages')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(500);

        if (packageClauses.length > 0) {
          packageQuery = packageQuery.or(packageClauses.join(','));
        }

        const { data: packages } = await packageQuery;

        if (tours) {
          const matchedTours = tours
            .map((t) => {
              const relevance = this.calculateAdvancedRelevance(t, query, termTokens, 'tour');
              if (relevance === null) return null;
              return {
                ...t,
                searchType: 'tour',
                relevance,
              };
            })
            .filter(Boolean) as any[];

          results.push(...matchedTours);
        }

        if (packages) {
          const matchedPackages = packages
            .map((p) => {
              const relevance = this.calculateAdvancedRelevance(p, query, termTokens, 'tour_package');
              if (relevance === null) return null;
              return {
                ...p,
                searchType: 'tour_package',
                relevance,
              };
            })
            .filter(Boolean) as any[];

          results.push(...matchedPackages);
        }
      }

      // Search transport
      if (!filters.type || filters.type === 'all' || filters.type === 'transport') {
        const transportClauses = termTokens.slice(0, 6).flatMap((token) => {
          const safeToken = this.normalizeText(token);
          if (!safeToken) return [];
          return [
            `title.ilike.%${safeToken}%`,
            `description.ilike.%${safeToken}%`,
            `vehicle_type.ilike.%${safeToken}%`,
          ];
        });

        let vehicleQuery = supabase
          .from('transport_vehicles')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(500);

        if (transportClauses.length > 0) {
          vehicleQuery = vehicleQuery.or(transportClauses.join(','));
        }

        const { data: vehicles } = await vehicleQuery;

        if (vehicles) {
          const matchedVehicles = vehicles
            .map((v) => {
              const relevance = this.calculateAdvancedRelevance(v, query, termTokens, 'transport');
              if (relevance === null) return null;
              return {
                ...v,
                searchType: 'transport',
                relevance,
              };
            })
            .filter(Boolean) as any[];

          results.push(...matchedVehicles);
        }
      }

      // Apply filters
      const filtered = this.applyFilters(results, filters, intent);

      // Sort by relevance
      filtered.sort((a, b) => b.relevance - a.relevance);

      return filtered;
    } catch (err) {
      console.error('[SmartSearch] Search failed:', err);
      return [];
    }
  }

  /**
   * Apply filters to search results
   */
  private static applyFilters(results: any[], filters: any, intent: { monthlyIntent: boolean; bedroomsMin: number | null; bathroomsMin: number | null; guestsMin: number | null }): any[] {
    return results.filter(item => {
      // Category filter
      if (filters.category) {
        const itemCategory = this.normalizeText(item.category || item.property_type || item.vehicle_type || "");
        if (itemCategory !== this.normalizeText(filters.category)) return false;
      }

      const isProperty = item.searchType === 'property';
      const isMonthlyOnly = isProperty ? Boolean(item.monthly_only_listing) : false;
      const isMonthlyAvailable = isProperty ? (isMonthlyOnly || Boolean(item.available_for_monthly_rental)) : false;

      // Monthly filter mode
      if (isProperty && filters.monthlyMode === 'monthly_only' && !isMonthlyOnly) return false;
      if (isProperty && filters.monthlyMode === 'monthly_available' && !isMonthlyAvailable) return false;
      if (isProperty && filters.monthlyMode === 'nightly_only' && isMonthlyOnly) return false;

      // Query monthly intent
      if (isProperty && intent.monthlyIntent && !isMonthlyAvailable) return false;

      // Amenities filter (property only)
      if (isProperty && Array.isArray(filters.amenities) && filters.amenities.length > 0) {
        const itemAmenities = Array.isArray(item.amenities) ? item.amenities.map((a: string) => this.normalizeText(a)) : [];
        const requestedAmenities = filters.amenities.map((a: string) => this.normalizeText(a));
        if (!requestedAmenities.every((needed: string) => itemAmenities.includes(needed))) return false;
      }

      // Parsed structured intent
      if (isProperty && intent.bedroomsMin && Number(item.bedrooms || 0) < intent.bedroomsMin) return false;
      if (isProperty && intent.bathroomsMin && Number(item.bathrooms || 0) < intent.bathroomsMin) return false;
      if (isProperty && intent.guestsMin && Number(item.max_guests || 0) < intent.guestsMin) return false;

      // Price filter
      const price = isProperty
        ? (isMonthlyOnly ? (item.price_per_month || 0) : (item.price_per_night || item.price_per_month || 0))
        : (item.price_per_night || item.price_per_person || item.price_per_adult || item.price_per_day || 0);
      if (filters.priceMin && price < filters.priceMin) return false;
      if (filters.priceMax && price > filters.priceMax) return false;

      // Rating filter
      if (filters.rating && (!item.rating || item.rating < filters.rating)) return false;

      // Location filter
      if (filters.location) {
        const location = this.normalizeText(item.location || item.city || '');
        const terms = String(filters.location)
          .toLowerCase()
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (!terms.every((term) => location.includes(term))) return false;
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
