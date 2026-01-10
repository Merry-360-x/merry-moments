import { Search, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

const categories = ["All", "Nature", "Adventure", "Cultural", "Wildlife", "Historical"];

type TourRow = Pick<
  Tables<"tours">,
  | "id"
  | "title"
  | "description"
  | "category"
  | "difficulty"
  | "duration_days"
  | "price_per_person"
  | "currency"
  | "images"
  | "rating"
  | "review_count"
  | "location"
>;

const durationToFilter = (duration: string) => {
  if (duration === "Half Day") return { kind: "lte" as const, value: 1 };
  if (duration === "Full Day") return { kind: "eq" as const, value: 1 };
  if (duration === "Multi-Day") return { kind: "gte" as const, value: 2 };
  return null;
};

const fetchTours = async ({
  q,
  category,
  duration,
}: {
  q: string;
  category: string;
  duration: string;
}): Promise<TourRow[]> => {
  let query = supabase
    .from("tours")
    .select(
      "id, title, description, category, difficulty, duration_days, price_per_person, currency, images, rating, review_count, location"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const trimmed = q.trim();
  if (trimmed) {
    query = query.or(`title.ilike.%${trimmed}%,location.ilike.%${trimmed}%`);
  }

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  const dur = durationToFilter(duration);
  if (dur?.kind === "eq") query = query.eq("duration_days", dur.value);
  if (dur?.kind === "lte") query = query.lte("duration_days", dur.value);
  if (dur?.kind === "gte") query = query.gte("duration_days", dur.value);

  const { data, error } = await query;
  if (error) throw error;
  return (data as TourRow[] | null) ?? [];
};

const Tours = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState("Any Duration");
  const navigate = useNavigate();

  // Keep local state in sync with URL
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setDuration(searchParams.get("duration") ?? "Any Duration");
    setActiveCategory(searchParams.get("category") ?? "All");
  }, [searchParams]);

  const runSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (duration && duration !== "Any Duration") params.set("duration", duration);
    if (activeCategory && activeCategory !== "All") params.set("category", activeCategory);
    const qs = params.toString();
    navigate(qs ? `/tours?${qs}` : "/tours");
  };

  const { data: tours = [], isLoading, isError } = useQuery({
    queryKey: [
      "tours",
      searchParams.get("q") ?? "",
      searchParams.get("category") ?? "All",
      searchParams.get("duration") ?? "Any Duration",
    ],
    queryFn: () =>
      fetchTours({
        q: searchParams.get("q") ?? "",
        category: searchParams.get("category") ?? "All",
        duration: searchParams.get("duration") ?? "Any Duration",
      }),
  });

  const addToCart = async (tour: TourRow) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to book a tour.",
      });
      const qs = searchParams.toString();
      navigate(`/login?redirect=/tours${qs ? `?${qs}` : ""}`);
      return;
    }

    const { error } = await supabase.from("trip_cart_items").insert({
      user_id: user.id,
      item_type: "tour",
      reference_id: tour.id,
      quantity: 1,
    });

    if (error) {
      toast({ variant: "destructive", title: "Could not add to Trip Cart", description: error.message });
      return;
    }

    toast({ title: "Added to Trip Cart", description: "Tour added to your cart." });
    navigate("/trip-cart");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="py-16 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Tours & Experiences</h1>
        <p className="text-muted-foreground">Discover the beauty of Rwanda</p>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
        <div className="bg-card rounded-xl shadow-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
          <div className="flex-1 flex items-center gap-2 px-4">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tours by name or location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              className="bg-transparent text-sm text-muted-foreground focus:outline-none"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option>Any Duration</option>
              <option>Half Day</option>
              <option>Full Day</option>
              <option>Multi-Day</option>
            </select>
            <Button variant="search" className="gap-2" type="button" onClick={runSearch}>
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                const params = new URLSearchParams();
                if (query.trim()) params.set("q", query.trim());
                if (duration && duration !== "Any Duration") params.set("duration", duration);
                if (category && category !== "All") params.set("category", category);
                const qs = params.toString();
                navigate(qs ? `/tours?${qs}` : "/tours");
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground hover:border-primary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Tours */}
      <div className="container mx-auto px-4 lg:px-8 py-10">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading tours...</p>
          </div>
        ) : isError ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">Could not load tours right now.</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">No tours found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <div key={tour.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {tour.images?.[0] ? (
                    <img
                      src={tour.images[0]}
                      alt={tour.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-foreground leading-snug">{tour.title}</h3>
                    <div className="flex items-center gap-1 shrink-0 text-sm">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="font-medium">{Number(tour.rating ?? 0).toFixed(1)}</span>
                      <span className="text-muted-foreground">({tour.review_count ?? 0})</span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground mb-3">
                    {tour.category} • {tour.difficulty} • {tour.duration_days} day{tour.duration_days === 1 ? "" : "s"}
                  </div>

                  {tour.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{tour.description}</p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-foreground">
                      <span className="font-bold">
                        {tour.currency} {Number(tour.price_per_person).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">/person</span>
                    </div>
                    <Button onClick={() => addToCart(tour)}>Book Now</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Tours;
