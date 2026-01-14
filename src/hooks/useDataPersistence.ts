import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Create a simple local storage based persistence layer
class QueryPersistence {
  private static readonly STORAGE_KEY = 'merry-moments-query-cache';
  private static readonly MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB limit

  static saveToStorage(data: any) {
    try {
      const serialized = JSON.stringify(data);
      if (serialized.length > this.MAX_CACHE_SIZE) {
        console.warn('Query cache too large for local storage');
        return;
      }
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('Failed to save query cache:', error);
    }
  }

  static loadFromStorage(): any {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load query cache:', error);
      return null;
    }
  }

  static clearStorage() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear query cache:', error);
    }
  }
}

export const useDataPersistence = () => {
  const queryClient = useQueryClient();

  // Load cached data on mount
  useEffect(() => {
    const cachedData = QueryPersistence.loadFromStorage();
    if (cachedData) {
      // Restore critical data only (not user-specific data that might be stale)
      const criticalKeys = [
        'properties-latest',
        'properties-featured-home', 
        'properties-top-rated-home',
        'tours-featured-home',
        'vehicles-featured-home'
      ];

      criticalKeys.forEach(key => {
        if (cachedData[key]) {
          queryClient.setQueryData([key], cachedData[key]);
        }
      });
    }
  }, [queryClient]);

  // Save data periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const cache = queryClient.getQueryCache();
      const dataToSave: Record<string, any> = {};

      // Only cache public, non-sensitive data
      cache.getAll().forEach(query => {
        const key = query.queryKey;
        if (
          key.includes('properties') && !key.includes('admin') ||
          key.includes('tours') && !key.includes('admin') ||
          key.includes('vehicles') && !key.includes('admin')
        ) {
          dataToSave[key.join('-')] = query.state.data;
        }
      });

      QueryPersistence.saveToStorage(dataToSave);
    }, 60000); // Save every minute

    return () => clearInterval(saveInterval);
  }, [queryClient]);

  // Clear cache when user logs out
  useEffect(() => {
    const handleStorageClean = () => {
      // Clear sensitive cached data periodically
      const cache = queryClient.getQueryCache();
      cache.getAll().forEach(query => {
        const key = query.queryKey;
        if (
          key.includes('admin') ||
          key.includes('staff') ||
          key.includes('bookings') ||
          key.includes('favorites') ||
          key.includes('tripCart')
        ) {
          query.destroy();
        }
      });
    };

    // Clean sensitive data every 5 minutes
    const cleanInterval = setInterval(handleStorageClean, 5 * 60 * 1000);
    return () => clearInterval(cleanInterval);
  }, [queryClient]);

  return null;
};