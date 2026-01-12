import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/PropertyCard";

export default function HostAbout() {
  const params = useParams();
  const hostId = params.id ? String(params.id) : "";

  const { data: host, isLoading: hostLoading } = useQuery({
    queryKey: ["host-about", hostId],
    enabled: Boolean(hostId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, bio, created_at")
        .or(`user_id.eq.${hostId},id.eq.${hostId}`)
        .maybeSingle();
      if (error) throw error;
      return (data ??
        null) as
        | { user_id: string; full_name: string | null; avatar_url: string | null; bio: string | null; created_at: string }
        | null;
    },
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["host-about-listings", hostId],
    enabled: Boolean(hostId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, location, price_per_night, currency, property_type, rating, review_count, images, bedrooms, bathrooms, beds")
        .eq("host_id", hostId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        location: string;
        price_per_night: number;
        currency: string | null;
        property_type: string | null;
        rating: number | null;
        review_count: number | null;
        images: string[] | null;
        bedrooms: number | null;
        bathrooms: number | null;
        beds: number | null;
      }>;
    },
  });

  const { data: reviewStats } = useQuery({
    queryKey: ["host-about-reviews", hostId],
    enabled: Boolean(hostId),
    queryFn: async () => {
      const ids = listings.map((p) => String(p.id));
      if (ids.length === 0) return { reviewCount: 0, rating: null as number | null };
      const { data, error } = await supabase.from("property_reviews").select("rating, property_id").in("property_id", ids);
      if (error) throw error;
      const ratings = (data ?? []).map((r) => Number((r as { rating: number }).rating)).filter((n) => Number.isFinite(n) && n > 0);
      const reviewCount = ratings.length;
      const avg = reviewCount ? ratings.reduce((a, b) => a + b, 0) / reviewCount : null;
      return { reviewCount, rating: avg ? Math.round(avg * 100) / 100 : null };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 lg:px-8 py-10">
        {hostLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading host…</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                {host?.avatar_url ? (
                  <img src={host.avatar_url} alt={host.full_name ?? "Host"} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted" />
                )}
                <div>
                  <div className="text-xl font-semibold text-foreground">{host?.full_name ?? "Host"}</div>
                  <div className="text-sm text-muted-foreground">
                    {reviewStats?.reviewCount ? `${reviewStats.reviewCount} reviews` : "No reviews yet"}
                    {reviewStats?.rating ? ` · ${reviewStats.rating} overall` : ""}
                  </div>
                  {host?.bio ? <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{host.bio}</p> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/hosts/${encodeURIComponent(hostId)}/reviews`}>
                  <Button variant="outline">All reviews</Button>
                </Link>
                <Link to={`/accommodations?host=${encodeURIComponent(hostId)}`}>
                  <Button>View listings</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Listings</h2>
          </div>
          {listings.length === 0 ? (
            <div className="bg-card rounded-xl shadow-card p-10 text-center text-muted-foreground">No published listings yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((p) => (
                <PropertyCard
                  key={p.id}
                  id={p.id}
                  image={p.images?.[0] ?? null}
                  images={p.images ?? null}
                  title={p.title}
                  location={p.location}
                  rating={Number(p.rating) || 0}
                  reviews={p.review_count || 0}
                  price={Number(p.price_per_night)}
                  currency={p.currency}
                  type={p.property_type}
                  bedrooms={p.bedrooms ?? null}
                  bathrooms={p.bathrooms ?? null}
                  beds={p.beds ?? null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

