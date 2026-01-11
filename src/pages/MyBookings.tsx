import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

interface Booking {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  properties: {
    title: string;
    location: string;
    property_type: string;
  } | null;
}

const MyBookings = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, properties(title, location, property_type)")
      .eq("guest_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) setBookings(data as Booking[]);
    if (!error && data && data.length > 0) {
      const ids = (data as Booking[]).map((b) => String(b.id));
      const { data: reviewed } = await supabase
        .from("property_reviews")
        .select("booking_id")
        .in("booking_id", ids);
      setReviewedBookingIds(new Set((reviewed ?? []).map((r) => String((r as { booking_id: string }).booking_id))));
    } else {
      setReviewedBookingIds(new Set());
    }
    setIsLoading(false);
  };

  const cancelBooking = async (id: string) => {
    if (!confirm(t("bookings.confirmCancel"))) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("guest_id", user!.id);

    if (error) {
      logError("bookings.cancel", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: uiErrorMessage(error, t("common.somethingWentWrong")),
      });
    } else {
      toast({ title: t("bookings.toast.cancelled") });
      fetchBookings();
    }
  };

  const canReview = (b: Booking) => {
    if (b.status !== "confirmed") return false;
    const end = new Date(b.check_out).getTime();
    return Number.isFinite(end) && end < Date.now();
  };

  const openReview = (b: Booking) => {
    setReviewBooking(b);
    setReviewRating(5);
    setReviewComment("");
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!user || !reviewBooking) return;
    setSubmittingReview(true);
    try {
      if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
        toast({ variant: "destructive", title: t("common.error"), description: "Rating must be 1-5." });
        return;
      }
      const { error } = await supabase.from("property_reviews").insert({
        booking_id: reviewBooking.id,
        property_id: reviewBooking.property_id,
        reviewer_id: user.id,
        rating: reviewRating,
        comment: reviewComment.trim() ? reviewComment.trim() : null,
      });
      if (error) throw error;
      toast({ title: "Review submitted" });
      setReviewOpen(false);
      await fetchBookings();
    } catch (e) {
      logError("propertyReviews.insert", e);
      toast({
        variant: "destructive",
        title: "Could not submit review",
        description: uiErrorMessage(e, "Please try again."),
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("bookings.title")}</h1>
        <p className="text-muted-foreground mb-8">{t("bookings.subtitle")}</p>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">{t("bookings.emptyTitle")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("bookings.emptySubtitle")}
            </p>
            <Button onClick={() => navigate("/accommodations")}>{t("bookings.browse")}</Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-card rounded-xl p-6 shadow-card flex flex-col md:flex-row gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {booking.properties?.title || t("bookings.unknownProperty")}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {booking.properties?.location}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : booking.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {t(`bookings.status.${booking.status}`, { defaultValue: booking.status })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("bookings.labels.checkIn")}</p>
                      <p className="font-medium text-foreground">
                        {new Date(booking.check_in).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("bookings.labels.checkOut")}</p>
                      <p className="font-medium text-foreground">
                        {new Date(booking.check_out).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("bookings.labels.guests")}</p>
                      <p className="font-medium text-foreground flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {booking.guests_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("bookings.labels.total")}</p>
                      <p className="font-semibold text-primary">
                        {formatMoney(Number(booking.total_price), String(booking.currency ?? "RWF"))}
                      </p>
                    </div>
                  </div>
                </div>

                {booking.status === "pending" && (
                  <div className="flex md:flex-col justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelBooking(booking.id)}
                      className="gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      {t("common.cancel")}
                    </Button>
                  </div>
                )}

                {canReview(booking) && (
                  <div className="flex md:flex-col justify-end gap-2">
                    {reviewedBookingIds.has(String(booking.id)) ? (
                      <Button variant="outline" size="sm" disabled>
                        Reviewed
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => openReview(booking)}>
                        Leave a review
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave a review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Okay</option>
                <option value={2}>2 - Bad</option>
                <option value={1}>1 - Terrible</option>
              </select>
            </div>
            <div>
              <Label>Comment (optional)</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={submittingReview}>
                Cancel
              </Button>
              <Button onClick={submitReview} disabled={submittingReview}>
                {submittingReview ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default MyBookings;
