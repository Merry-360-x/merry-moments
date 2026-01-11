import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type HostProfile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  properties: { id: string; title: string } | null;
};

export default function HostReviews() {
  const params = useParams();
  const hostId = params.id ? String(params.id) : "";

  const { data: host } = useQuery({
    queryKey: ["host-profile", hostId],
    enabled: Boolean(hostId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, bio")
        .eq("user_id", hostId)
        .maybeSingle();
      if (error) throw error;
      return data as HostProfile | null;
    },
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["host-reviews", hostId],
    enabled: Boolean(hostId),
    queryFn: async () => {
      const { data: props, error: propsErr } = await supabase
        .from("properties")
        .select("id")
        .eq("host_id", hostId)
        .eq("is_published", true);
      if (propsErr) throw propsErr;
      const ids = (props ?? []).map((p) => String((p as { id: string }).id));
      if (ids.length === 0) return [] as ReviewRow[];

      const { data: reviewsData, error } = await supabase
        .from("property_reviews")
        .select("id, rating, comment, created_at, properties(id, title)")
        .in("property_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (reviewsData ?? []) as ReviewRow[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {host?.avatar_url ? (
              <img
                src={host.avatar_url}
                alt={host.full_name ?? "Host"}
                className="w-12 h-12 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Reviews for {host?.full_name ?? "Host"}
              </h1>
              {host?.bio ? <p className="text-sm text-muted-foreground line-clamp-2">{host.bio}</p> : null}
            </div>
          </div>
          <Link to={`/accommodations?host=${encodeURIComponent(hostId)}`}>
            <Button variant="outline">View listings</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reviews…</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No reviews yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card rounded-xl shadow-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">{r.rating} / 5</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                {r.properties?.id ? (
                  <Link
                    to={`/properties/${encodeURIComponent(r.properties.id)}`}
                    className="mt-2 block text-sm text-primary hover:underline"
                  >
                    {r.properties.title}
                  </Link>
                ) : null}
                {r.comment ? (
                  <p className="mt-3 text-sm text-foreground/90 leading-relaxed">{r.comment}</p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No written comment.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

