import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, XCircle, Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatMoneyWithConversion } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { extractNeighborhood } from "@/lib/location";
import { useFxRates } from "@/hooks/useFxRates";
import { usePreferences } from "@/hooks/usePreferences";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Booking {
  id: string;
  property_id: string;
  tour_id?: string | null;
  transport_id?: string | null;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  currency: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  created_at: string;
  properties?: {
    title: string;
    location: string;
    property_type: string;
    address?: string | null;
    cancellation_policy?: string | null;
  } | null;
  tours?: {
    title: string;
    location: string;
    cancellation_policy_type?: string | null;
    custom_cancellation_policy?: string | null;
  } | null;
  tour_packages?: {
    title: string;
    city: string;
    country: string;
    cancellation_policy_type?: string | null;
    custom_cancellation_policy?: string | null;
  } | null;
}

const MyBookings = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { currency } = usePreferences();
  const { usdRates } = useFxRates();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewValidationError, setReviewValidationError] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *, 
          properties(title, location, property_type, address, cancellation_policy),
          tours(title, location, cancellation_policy_type, custom_cancellation_policy),
          tour_packages(title, city, country, cancellation_policy_type, custom_cancellation_policy)
        `)
        .eq("guest_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Booking[]) ?? [];
    },
    placeholderData: [],
  });

  const { data: reviewedBookingIds = new Set() } = useQuery({
    queryKey: ["reviewed-bookings", user?.id],
    enabled: Boolean(user?.id) && bookings.length > 0,
    queryFn: async () => {
      const ids = bookings.map((b) => String(b.id));
      const { data: reviewed } = await supabase
        .from("property_reviews")
        .select("booking_id")
        .in("booking_id", ids);
      return new Set((reviewed ?? []).map((r) => String((r as { booking_id: string }).booking_id)));
    },
    placeholderData: new Set(),
  });

  const getCancellationPolicy = (booking: Booking): string => {
    // Check for property cancellation policy
    if (booking.properties?.cancellation_policy) {
      return booking.properties.cancellation_policy;
    }
    
    // Check for tour cancellation policy
    if (booking.tours) {
      if (booking.tours.cancellation_policy_type === 'custom' && booking.tours.custom_cancellation_policy) {
        return booking.tours.custom_cancellation_policy;
      }
      return booking.tours.cancellation_policy_type || 'standard';
    }
    
    // Check for tour package cancellation policy
    if (booking.tour_packages) {
      if (booking.tour_packages.cancellation_policy_type === 'custom' && booking.tour_packages.custom_cancellation_policy) {
        return booking.tour_packages.custom_cancellation_policy;
      }
      return booking.tour_packages.cancellation_policy_type || 'standard_day';
    }
    
    return 'fair';
  };

  const getPolicyDescription = (policyType: string): string => {
    const policies: Record<string, string> = {
      'flexible': 'Free cancellation up to 24 hours before check-in. After that, 50% refund.',
      'moderate': 'Free cancellation up to 5 days before check-in. Cancellations within 5 days are non-refundable.',
      'fair': 'Free cancellation up to 7 days before check-in. Cancellations within 7 days receive 50% refund.',
      'strict': 'Free cancellation up to 14 days before check-in. Cancellations within 14 days are non-refundable.',
      'standard': 'Free cancellation up to 72 hours before the tour. Cancellations within 72 hours are non-refundable.',
      'standard_day': 'Free cancellation up to 72-48 hours before the tour. Cancellations within this period are non-refundable.',
      'multiday_private': 'Free cancellation up to 14-7 days before the tour. Cancellations within this period are non-refundable.',
      'non_refundable': 'This booking is non-refundable. No refunds will be issued for cancellations.',
    };
    return policies[policyType] || policyType;
  };

  const openCancelDialog = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const confirmCancellation = async () => {
    if (!bookingToCancel || !user) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingToCancel.id)
        .eq("guest_id", user.id);

      if (error) throw error;
      
      toast({ title: "Booking cancelled successfully" });
      qc.invalidateQueries({ queryKey: ["bookings", user?.id] });
      setCancelDialogOpen(false);
      setBookingToCancel(null);
    } catch (e) {
      logError("bookings.cancel", e);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: uiErrorMessage(e, t("common.somethingWentWrong")),
      });
    } finally {
      setCancelling(false);
    }
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
      qc.invalidateQueries({ queryKey: ["bookings", user?.id] });
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
    setReviewValidationError(false);
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!user || !reviewBooking) return;
    
    // Validation check
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewValidationError(true);
      toast({ 
        variant: "destructive", 
        title: t("common.error"), 
        description: "Please select a rating between 1-5." 
      });
      return;
    }
    
    setReviewValidationError(false);
    setSubmittingReview(true);
    try {
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
      qc.invalidateQueries({ queryKey: ["bookings", user?.id] });
      qc.invalidateQueries({ queryKey: ["reviewed-bookings", user?.id] });
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

        {/* {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : */ bookings.length === 0 ? (
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
                        {extractNeighborhood(booking.properties?.location)}
                      </p>
                      {booking.status === "confirmed" || booking.status === "completed" ? (
                        booking.properties?.address ? (
                          <p className="text-sm text-foreground mt-1">
                            <span className="text-muted-foreground">Address:</span>{" "}
                            <span className="font-medium">{booking.properties.address}</span>
                          </p>
                        ) : null
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Exact address will be shared after your booking is confirmed.
                        </p>
                      )}
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
                        {formatMoneyWithConversion(
                          Number(booking.total_price),
                          String(booking.currency ?? "USD"),
                          currency,
                          usdRates
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {(booking.status === "pending" || booking.status === "confirmed") && (
                  <div className="flex md:flex-col justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCancelDialog(booking)}
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

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {bookingToCancel && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold">
                    {bookingToCancel.properties?.title || 
                     bookingToCancel.tours?.title || 
                     bookingToCancel.tour_packages?.title || 
                     'Booking'}
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(bookingToCancel.check_in).toLocaleDateString()} - {new Date(bookingToCancel.check_out).toLocaleDateString()}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {bookingToCancel.guests_count} guest{bookingToCancel.guests_count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {bookingToCancel.payment_status === 'paid' && (
                  <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900 dark:text-amber-100">Cancellation Policy</AlertTitle>
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <p className="font-semibold mb-2">
                        {getCancellationPolicy(bookingToCancel).toUpperCase()} POLICY
                      </p>
                      <p className="text-sm">
                        {getPolicyDescription(getCancellationPolicy(bookingToCancel))}
                      </p>
                      <p className="text-sm mt-2 font-medium">
                        Please review the cancellation terms before proceeding. Refunds (if applicable) will be processed according to this policy.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {bookingToCancel.payment_status !== 'paid' && (
                  <Alert variant="default">
                    <AlertDescription>
                      This booking has not been paid yet. Cancelling will remove your reservation.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setBookingToCancel(null);
                }}
                disabled={cancelling}
                className="flex-1"
              >
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                onClick={confirmCancellation}
                disabled={cancelling}
                className="flex-1"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Rate Your Stay</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Star Rating */}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setReviewRating(star);
                      setReviewValidationError(false);
                    }}
                    className="transition-all duration-200 hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= reviewRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {reviewRating === 5 && "Excellent!"}
                {reviewRating === 4 && "Very Good"}
                {reviewRating === 3 && "Good"}
                {reviewRating === 2 && "Fair"}
                {reviewRating === 1 && "Poor"}
              </p>
              {reviewValidationError && (
                <p className="text-sm text-red-600">Please select a rating</p>
              )}
            </div>

            {/* Quick Comment Templates */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Quick Comments</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Great location",
                  "Very clean",
                  "Excellent host",
                  "Amazing views",
                  "Good value",
                  "Would recommend",
                  "Perfect stay",
                  "Comfortable bed"
                ].map((template) => (
                  <Badge
                    key={template}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      const current = reviewComment.trim();
                      if (current && !current.includes(template)) {
                        setReviewComment(current + (current.endsWith(".") ? " " : ". ") + template + ".");
                      } else if (!current) {
                        setReviewComment(template + ".");
                      }
                    }}
                  >
                    {template}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom Comment */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Your Review (optional)</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share more details about your experience..."
                className="resize-none h-20"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {reviewComment.length}/500
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setReviewOpen(false);
                  setReviewComment("");
                  setReviewRating(5);
                  setReviewValidationError(false);
                }} 
                disabled={submittingReview}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={submitReview} 
                disabled={submittingReview}
                className="flex-1"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
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
