import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SmartSearch } from "@/lib/recommendation-engine";
import { useNavigate } from "react-router-dom";

interface SmartSearchBarProps {
  placeholder?: string;
  onSearch?: (query: string, location: string) => void;
  className?: string;
  showLocationSuggestions?: boolean;
}

export function SmartSearchBar({
  placeholder = "Search tours, stays, transport...",
  onSearch,
  className,
  showLocationSuggestions = true,
}: SmartSearchBarProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (err) {
        console.error('Failed to load recent searches:', err);
      }
    }
  }, []);

  // Get location suggestions as user types
  useEffect(() => {
    if (location.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const suggestions = await SmartSearch.getLocationSuggestions(location);
      setLocationSuggestions(suggestions);
    }, 300);

    return () => clearTimeout(timer);
  }, [location]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent-searches', JSON.stringify(updated));
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    saveRecentSearch(query);

    try {
      if (onSearch) {
        onSearch(query, location);
      } else {
        // Navigate to search results page with query params
        const params = new URLSearchParams();
        params.set('q', query);
        if (location) params.set('location', location);
        navigate(`/search?${params.toString()}`);
      }
    } finally {
      setIsSearching(false);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex gap-2 items-center bg-background border rounded-lg p-2 shadow-lg">
        {/* Main search input */}
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground ml-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Location input (optional) */}
        {showLocationSuggestions && (
          <>
            <div className="h-8 w-px bg-border" />
            <div className="flex-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Where?"
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </>
        )}

        {/* Search button */}
        <Button onClick={handleSearch} disabled={isSearching} size="sm" className="px-6">
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (query || location || recentSearches.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
        >
          {/* Recent searches */}
          {!query && !location && recentSearches.length > 0 && (
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <TrendingUp className="w-4 h-4" />
                Recent Searches
              </div>
              {recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(search);
                    handleSearch();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded-md text-sm"
                >
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Location suggestions */}
          {location && locationSuggestions.length > 0 && (
            <div className="p-3 border-t">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                Location Suggestions
              </div>
              {locationSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setLocation(suggestion);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded-md text-sm flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
