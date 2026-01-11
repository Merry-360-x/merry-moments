import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFavorites } from "@/hooks/useFavorites";
import { Heart } from "lucide-react";

type PropertyRow = {
  id: string;
  title: string;
  location: string;
  price_per_night: number;
  currency: string | null;
  property_type: string | null;
  rating: number | null;
  review_count: number | null;
  images: string[] | null;
  description: string | null;
  is_published: boolean | null;
  host_id: string;
  max_guests: number;
  amenities: string[] | null;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  cancellation_policy: string | null;
};

const fetchProperty = async (id: string) => {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, title, location, price_per_night, currency, property_type, rating, review_count, images, description, is_published, host_id, max_guests, amenities, bedrooms, bathrooms, beds, cancellation_policy"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as PropertyRow | null;
};

const isoToday = () => new Date().toISOString().slice(0, 10);

export default function PropertyDetails() {
  const { t } = useTranslation();
  const params = useParams();
  const propertyId = params.id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { toggleFavorite, checkFavorite } = useFavorites();

  const [checkIn, setCheckIn] = useState(isoToday());
  const [checkOut, setCheckOut] = useState(isoToday());
  const [guests, setGuests] = useState(1);
  const [booking, setBooking] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => fetchProperty(propertyId as string),
    enabled: Boolean(propertyId),
  });

  const { data: hostProfile } = useQuery({
    queryKey: ["host-profile", data?.host_id],
    enabled: Boolean(data?.host_id),
    queryFn: async () => {
      const hostId = String(data?.host_id ?? "");
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, bio, created_at")
        .eq("user_id", hostId)
        .maybeSingle();
      if (error) throw error;
      return prof as
        | {
            user_id: string;
            full_name: string | null;
            avatar_url: string | null;
            bio: string | null;
            created_at: string;
          }
        | null;
    },
  });

  const { data: hostStats } = useQuery({
    queryKey: ["host-stats", data?.host_id],
    enabled: Boolean(data?.host_id),
    queryFn: async () => {
      const hostId = String(data?.host_id ?? "");
      const { data: hostProps, error: propsErr } = await supabase
        .from("properties")
        .select("id, created_at, is_published")
        .eq("host_id", hostId);
      if (propsErr) throw propsErr;
      const propIds = (hostProps ?? []).map((p) => String((p as { id: string }).id));
      const hostingSince = (hostProps ?? [])
        .map((p) => new Date(String((p as { created_at: string }).created_at)).getTime())
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b)[0];

      if (propIds.length === 0) {
        return { listings: 0, hostingSince: null as string | null, reviewCount: 0, rating: null as number | null };
      }

      const { data: reviews, error: reviewsErr } = await supabase
        .from("property_reviews")
        .select("rating, property_id")
        .in("property_id", propIds);
      if (reviewsErr) throw reviewsErr;
      const ratings = (reviews ?? [])
        .map((r) => Number((r as { rating: number }).rating))
        .filter((n) => Number.isFinite(n) && n > 0);
      const reviewCount = ratings.length;
      const avg = reviewCount > 0 ? ratings.reduce((a, b) => a + b, 0) / reviewCount : null;

      return {
        listings: propIds.length,
        hostingSince: hostingSince ? new Date(hostingSince).toISOString() : null,
        reviewCount,
        rating: avg ? Math.round(avg * 100) / 100 : null,
      };
    },
  });

  const { data: topReviews } = useQuery({
    queryKey: ["property-reviews", data?.id],
    enabled: Boolean(data?.id),
    queryFn: async () => {
      const property = String(data?.id ?? "");
      const { data: reviews, error } = await supabase
        .from("property_reviews")
        .select("id, rating, comment, created_at")
        .eq("property_id", property)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (reviews ?? []) as Array<{ id: string; rating: number; comment: string | null; created_at: string }>;
    },
  });

  useEffect(() => {
    if (!propertyId) return;
    let alive = true;
    (async () => {
      const fav = await checkFavorite(String(propertyId));
      if (alive) setIsFavorited(fav);
    })();
    return () => {
      alive = false;
    };
  }, [checkFavorite, propertyId, user?.id]);

  const nights = useMemo(() => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const ms = end.getTime() - start.getTime();
    const n = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [checkIn, checkOut]);

  const estimatedTotal = useMemo(() => {
    if (!data) return 0;
    return nights * Number(data.price_per_night ?? 0);
  }, [data, nights]);

  const submitBooking = async () => {
    if (!data || !propertyId) return;
    if (!user) {
      navigate(`/login?redirect=/properties/${encodeURIComponent(String(propertyId))}`);
      return;
    }

    if (nights <= 0) {
      toast({ variant: "destructive", title: "Invalid dates", description: "Check-out must be after check-in." });
      return;
    }
    if (guests < 1) {
      toast({ variant: "destructive", title: "Invalid guests", description: "Guests must be at least 1." });
      return;
    }
    if (data.max_guests && guests > data.max_guests) {
      toast({
        variant: "destructive",
        title: "Too many guests",
        description: `Max guests for this property is ${data.max_guests}.`,
      });
      return;
    }

    setBooking(true);
    try {
      const payload = {
        guest_id: user.id,
        property_id: data.id,
        host_id: data.host_id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guests,
        total_price: estimatedTotal,
        currency: data.currency ?? "RWF",
        status: "pending",
      } as const;

      const { error } = await supabase.from("bookings").insert(payload);
      if (error) throw error;

      toast({ title: "Booking requested", description: "Your booking is pending confirmation." });
      navigate("/my-bookings");
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not book",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link to="/accommodations" className="text-primary font-medium hover:underline">
            {t("nav.accommodations")}
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
            onClick={async () => {
              if (!data) return;
              const changed = await toggleFavorite(data.id, isFavorited);
              if (changed) setIsFavorited(!isFavorited);
            }}
            aria-label={t("actions.favorites")}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-primary text-primary" : ""}`} />
            {t("actions.favorites")}
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t("common.loadingProperties")}</p>
          </div>
        ) : isError ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">{t("common.couldNotLoadProperties")}</p>
          </div>
        ) : !data ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">{t("common.noPublishedProperties")}</p>
            <div className="mt-6">
              <Link to="/accommodations">
                <Button>{t("nav.accommodations")}</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-card rounded-xl shadow-card overflow-hidden">
              {data.images?.[0] ? (
                <img
                  src={data.images[0]}
                  alt={data.title}
                  className="w-full h-[320px] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-[320px] bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
              )}
              {data.images && data.images.length > 1 ? (
                <div className="grid grid-cols-3 gap-2 p-3">
                  {data.images.slice(0, 3).map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt={data.title}
                      className="h-24 w-full object-cover rounded-lg"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-5">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{data.title}</h1>
                  <p className="text-muted-foreground">{data.location}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">
                    {data.currency ?? "RWF"} {Number(data.price_per_night).toLocaleString()}
                    <span className="text-sm text-muted-foreground"> {t("common.perNight")}</span>
                  </div>
                </div>
              </div>

              {data.description ? (
                <p className="mt-6 text-foreground/90 leading-relaxed">{data.description}</p>
              ) : (
                <p className="mt-6 text-muted-foreground">
                  {t("common.noPublishedProperties")}
                </p>
              )}

              {/* Details */}
              <div className="mt-6 bg-card rounded-xl shadow-card p-5">
                <div className="text-sm font-semibold text-foreground mb-2">About this place</div>
                {(data.bedrooms || data.bathrooms || data.beds || data.max_guests) ? (
                  <div className="text-sm text-muted-foreground">
                    {[
                      data.max_guests ? `Up to ${data.max_guests} guests` : null,
                      data.bedrooms ? `${data.bedrooms} bedrooms` : null,
                      data.beds ? `${data.beds} beds` : null,
                      data.bathrooms ? `${data.bathrooms} bathrooms` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                ) : null}

                {data.amenities && data.amenities.length > 0 ? (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-foreground mb-2">Amenities</div>
                    <div className="flex flex-wrap gap-2">
                      {data.amenities.slice(0, 12).map((a) => (
                        <span key={a} className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Host */}
              <div className="mt-8 bg-card rounded-xl shadow-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {hostProfile?.avatar_url ? (
                      <img
                        src={hostProfile.avatar_url}
                        alt={hostProfile.full_name ?? "Host"}
                        className="w-12 h-12 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted" />
                    )}
                    <div>
                      <Link
                        to={`/accommodations?host=${encodeURIComponent(String(data.host_id))}`}
                        className="text-base font-semibold text-foreground hover:underline"
                      >
                        Hosted by {hostProfile?.full_name ?? "Host"}
                      </Link>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span>
                          {hostStats?.reviewCount ? `${hostStats.reviewCount} reviews` : "No reviews yet"}
                        </span>
                        {hostStats?.rating ? <span> · {hostStats.rating} overall</span> : null}
                        {hostStats?.hostingSince ? (
                          <span>
                            {" "}
                            · Hosting since {new Date(hostStats.hostingSince).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/accommodations?host=${encodeURIComponent(String(data.host_id))}`}>
                      <Button variant="outline" size="sm">
                        All listings
                      </Button>
                    </Link>
                    <Link to={`/hosts/${encodeURIComponent(String(data.host_id))}/reviews`}>
                      <Button variant="outline" size="sm">
                        All reviews
                      </Button>
                    </Link>
                  </div>
                </div>
                {hostProfile?.bio ? (
                  <p className="mt-4 text-sm text-foreground/90 leading-relaxed">{hostProfile.bio}</p>
                ) : null}
              </div>

              {/* Reviews preview */}
              {topReviews && topReviews.length > 0 ? (
                <div className="mt-8 bg-card rounded-xl shadow-card p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
                    <Link to={`/hosts/${encodeURIComponent(String(data.host_id))}/reviews`}>
                      <Button variant="ghost" size="sm">
                        View all
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {topReviews.map((r) => (
                      <div key={r.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-foreground">{r.rating} / 5</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {r.comment ? (
                          <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{r.comment}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Cancellation policy */}
              <div className="mt-8 bg-card rounded-xl shadow-card p-5">
                <h2 className="text-lg font-semibold text-foreground mb-2">Cancellation & Refund Policy</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Policy: <span className="font-medium text-foreground">{(data.cancellation_policy ?? "fair")}</span>
                </p>
                <div className="text-sm text-muted-foreground space-y-3">
                  {((data.cancellation_policy ?? "fair") === "strict") ? (
                    <ul className="list-disc pl-5 space-y-1">
                      <li>15-30 days before check-in: Full refund (minus fees)</li>
                      <li>7-15 days before check-in: 75% refund (minus fees)</li>
                      <li>3-7 days before check-in: 50% refund (minus fees)</li>
                      <li>1-3 days before check-in: 25% refund (minus fees)</li>
                      <li>0-1 day before check-in: No refund</li>
                      <li>No-shows: Non-refundable</li>
                    </ul>
                  ) : (data.cancellation_policy ?? "fair") === "lenient" ? (
                    <ul className="list-disc pl-5 space-y-1">
                      <li>3-7 days before check-in: Full refund (minus fees)</li>
                      <li>1-3 days before check-in: 75% refund (minus fees)</li>
                      <li>0-1 day before check-in: 50% refund</li>
                      <li>No-shows: Non-refundable</li>
                    </ul>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">
                      <li>7-15 days before check-in: Full refund (minus fees)</li>
                      <li>3-7 days before check-in: 75% refund (minus fees)</li>
                      <li>1-3 days before check-in: 50% refund (minus fees)</li>
                      <li>0-1 day before check-in: 25% refund</li>
                      <li>No-shows: Non-refundable</li>
                    </ul>
                  )}
                </div>
              </div>

              {/* Booking */}
              <div className="mt-8 bg-card rounded-xl shadow-card p-5 lg:sticky lg:top-24">
                <h2 className="text-lg font-semibold text-foreground mb-4">Book this stay</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="checkIn">Check in</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={checkIn}
                      min={isoToday()}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOut">Check out</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={checkOut}
                      min={checkIn || isoToday()}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guests">Guests (max {data.max_guests})</Label>
                    <Input
                      id="guests"
                      type="number"
                      min={1}
                      max={data.max_guests}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    {nights > 0 ? (
                      <>
                        {nights} night{nights === 1 ? "" : "s"} • Estimated total:{" "}
                        <span className="font-semibold text-foreground">
                          {data.currency ?? "RWF"} {Number(estimatedTotal).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>Select valid dates to see total.</>
                    )}
                  </div>
                  <Button onClick={submitBooking} disabled={booking || nights <= 0}>
                    {booking ? "Booking..." : "Request to book"}
                  </Button>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/accommodations" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full">
                    {t("nav.accommodations")}
                  </Button>
                </Link>
                <Link to="/my-bookings" className="w-full sm:w-auto">
                  <Button className="w-full">{t("actions.myBookings")}</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
