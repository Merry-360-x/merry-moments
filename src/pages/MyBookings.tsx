import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, XCircle, Star, AlertTriangle, CalendarClock, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { extractNeighborhood } from "@/lib/location";
import { useFxRates } from "@/hooks/useFxRates";
import { usePreferences } from "@/hooks/usePreferences";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookingDateChangeDialog } from "@/components/BookingDateChangeDialog";

interface Booking {
  id: string;
  property_id: string;
  tour_id?: string | null;
  transport_id?: string | null;
  booking_type?: 'property' | 'tour' | 'transport' | null;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  created_at: string;
  order_id?: string | null;
  properties?: {
    title: string;
    location: string;
    property_type: string;
    address?: string | null;
    cancellation_policy?: string | null;
    price_per_night?: number;
  } | null;
  tour_packages?: {
    title: string;
    city: string;
    country: string;
    duration?: string | null;
    cancellation_policy_type?: string | null;
    custom_cancellation_policy?: string | null;
    price_per_person?: number;
  } | null;
  transport_vehicles?: {
    title: string;
    vehicle_type: string;
    seats: number;
  } | null;
  tours?: {
    title: string;
    location: string;
    cancellation_policy_type?: string | null;
    custom_cancellation_policy?: string | null;
  } | null;
  host_profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

const MyBookings = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [dateChangeDialogOpen, setDateChangeDialogOpen] = useState(false);
  const [bookingToChange, setBookingToChange] = useState<Booking | null>(null);
  const [bookingHostId, setBookingHostId] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: bookings = [], isLoading, refetch: refetchBookings } = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      // Note: transport_vehicles join removed - no FK relationship exists
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *, 
          properties(title, location, property_type, address, cancellation_policy, price_per_night, host_id),
          tour_packages(title, city, country, duration, cancellation_policy_type, custom_cancellation_policy, price_per_person, host_id)
        `)
        .eq("guest_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch host profiles for confirmed/completed bookings
      const bookingsWithHosts = await Promise.all(
        (data || []).map(async (booking: any) => {
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            const hostId = booking.properties?.host_id || booking.tour_packages?.host_id;
            if (hostId) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('user_id', hostId)
                .single();
              return { ...booking, host_profile: profile };
            }
          }
          return booking;
        })
      );
      
      return (bookingsWithHosts as Booking[]) ?? [];
    },
    placeholderData: [],
    staleTime: 30000, // Cache for 30 seconds
  });

  // Real-time subscription for bookings
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('mybookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `guest_id=eq.${user.id}` }, () => {
        console.log('[MyBookings] Booking change detected - invalidating...');
        qc.invalidateQueries({ queryKey: ["bookings", user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

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

  // Open review dialog automatically when coming from an email link
  useEffect(() => {
    if (!user?.id || bookings.length === 0) return;

    const params = new URLSearchParams(location.search);
    const reviewBookingId = params.get("review_booking");
    if (!reviewBookingId) return;

    const target = bookings.find((b) => String(b.id) === String(reviewBookingId));
    if (!target) return;

    // Ensure booking is actually eligible for review and not already reviewed
    if (!canReview(target) || reviewedBookingIds.has(String(target.id))) return;

    const ratingParam = params.get("rating");
    if (ratingParam) {
      const parsed = Number(ratingParam);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 5) {
        setReviewRating(parsed);
      }
    }

    openReview(target);
  }, [user?.id, bookings, location.search, reviewedBookingIds]);

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

  const openDateChangeDialog = async (booking: Booking) => {
    // Fetch host ID from the property, tour, or transport
    try {
      let hostId = "";
      
      if (booking.property_id) {
        const { data } = await supabase
          .from("properties")
          .select("host_id")
          .eq("id", booking.property_id)
          .single();
        hostId = data?.host_id || "";
      } else if (booking.tour_id) {
        const { data } = await supabase
          .from("tour_packages")
          .select("host_id")
          .eq("id", booking.tour_id)
          .single();
        hostId = data?.host_id || "";
      } else if (booking.transport_id) {
        const { data } = await supabase
          .from("transport_vehicles")
          .select("host_id")
          .eq("id", booking.transport_id)
          .single();
        hostId = data?.host_id || "";
      }

      if (!hostId) {
        toast({
          title: "Error",
          description: "Unable to find host information",
          variant: "destructive",
        });
        return;
      }

      setBookingHostId(hostId);
      setBookingToChange(booking);
      setDateChangeDialogOpen(true);
    } catch (error) {
      console.error("Error fetching host info:", error);
      toast({
        title: "Error",
        description: "Failed to open date change dialog",
        variant: "destructive",
      });
    }
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
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      // Immediately refetch to update the UI
      await refetchBookings();
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
      await refetchBookings();
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

  // Group bookings by order_id (only group if they share the same order_id)
  const groupedBookings = bookings.reduce((groups: { [key: string]: Booking[] }, booking) => {
    // Each booking gets its own group unless it has an order_id shared with others
    const key = booking.order_id && booking.order_id.trim() !== '' ? booking.order_id : `single_${booking.id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(booking);
    return groups;
  }, {});

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
          <div className="space-y-6">
            {Object.entries(groupedBookings).map(([orderId, orderBookings]) => {
              // All bookings in a group share the same status, dates, etc.
              const firstBooking = orderBookings[0];
              const isMultiItem = orderBookings.length > 1;
              const grandTotal = orderBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
              
              return (
                <div key={orderId} className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {isMultiItem ? 'Multi-Item Booking' : (
                            firstBooking.properties?.title || 
                            firstBooking.tour_packages?.title || 
                            firstBooking.transport_vehicles?.title || 
                            'Booking'
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Order #{orderId.slice(0, 8)}... • {new Date(firstBooking.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          firstBooking.status === "confirmed" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                          firstBooking.status === "cancelled" ? "bg-red-100 text-red-700 hover:bg-red-100" :
                          "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                        }>
                          {firstBooking.status}
                        </Badge>
                        {firstBooking.payment_status && (
                          <Badge variant="outline" className="text-xs">
                            {firstBooking.payment_status === 'paid' ? '✓ Paid' : firstBooking.payment_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items Breakdown */}
                  <div className="p-6 space-y-4">
                    {orderBookings.map((booking, idx) => {
                      const bookingType = booking.booking_type || 'property';
                      const isTour = bookingType === 'tour';
                      const isTransport = bookingType === 'transport';
                      
                      const getTitle = () => {
                        if (isTour && booking.tour_packages?.title) return booking.tour_packages.title;
                        if (isTransport && booking.transport_vehicles?.title) return booking.transport_vehicles.title;
                        return booking.properties?.title || 'Item';
                      };
                      
                      const getLocation = () => {
                        if (isTour && booking.tour_packages) {
                          return `${booking.tour_packages.city}, ${booking.tour_packages.country}`;
                        }
                        if (isTransport && booking.transport_vehicles) {
                          return `${booking.transport_vehicles.vehicle_type} • ${booking.transport_vehicles.seats} seats`;
                        }
                        return booking.properties?.location || '';
                      };
                      
                      const getIcon = () => {
                        if (isTour) return '🗺️';
                        if (isTransport) return '🚗';
                        return '🏠';
                      };
                      
                      return (
                        <div key={booking.id} className={`flex items-start gap-4 ${idx > 0 ? 'pt-4 border-t border-dashed' : ''}`}>
                          <div className="text-3xl flex-shrink-0">{getIcon()}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground">{getTitle()}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {getLocation()}
                            </p>
                            {!isTour && !isTransport && booking.properties?.address && (booking.status === "confirmed" || booking.status === "completed") && (
                              <p className="text-xs text-muted-foreground mt-1">📍 {booking.properties.address}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatMoney(Number(booking.total_price), String(booking.currency || "USD"))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isTour ? 'Tour' : isTransport ? 'Transport' : 'Stay'}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Total */}
                    {isMultiItem && (
                      <div className="pt-4 border-t border-border flex justify-between items-center">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-xl font-bold text-primary">
                          {formatMoney(grandTotal, String(firstBooking.currency || "USD"))}
                        </span>
                      </div>
                    )}

                    {/* Booking Info */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Check-in</p>
                        <p className="font-medium text-sm">{new Date(firstBooking.check_in).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Check-out</p>
                        <p className="font-medium text-sm">{new Date(firstBooking.check_out).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Guests</p>
                        <p className="font-medium text-sm flex items-center gap-1">
                          <Users className="w-4 h-4" /> {firstBooking.guests}
                        </p>
                      </div>
                    </div>

                    {/* Host Contact */}
                    {(firstBooking.status === "confirmed" || firstBooking.status === "completed") && firstBooking.host_profile && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2.5">📞 Host Contact</p>
                        <div className="space-y-2">
                          {firstBooking.host_profile.full_name && (
                            <p className="text-sm font-medium">{firstBooking.host_profile.full_name}</p>
                          )}
                          {firstBooking.host_profile.email && (
                            <a href={`mailto:${firstBooking.host_profile.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                              <Mail className="w-4 h-4" /> {firstBooking.host_profile.email}
                            </a>
                          )}
                          {firstBooking.host_profile.phone && (
                            <a href={`tel:${firstBooking.host_profile.phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                              <Phone className="w-4 h-4" /> {firstBooking.host_profile.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      {(firstBooking.status === "pending" || firstBooking.status === "confirmed") && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openDateChangeDialog(firstBooking)} className="flex-1">
                            <CalendarClock className="w-4 h-4 mr-2" /> Change Dates
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openCancelDialog(firstBooking)} className="flex-1">
                            <XCircle className="w-4 h-4 mr-2" /> Cancel
                          </Button>
                        </>
                      )}
                      {canReview(firstBooking) && !reviewedBookingIds.has(String(firstBooking.id)) && (
                        <Button size="sm" onClick={() => openReview(firstBooking)} className="flex-1">
                          <Star className="w-4 h-4 mr-2" /> Leave Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                      {bookingToCancel.guests} guest{bookingToCancel.guests > 1 ? 's' : ''}
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
            <DialogDescription>
              Share your experience to help other travelers
            </DialogDescription>
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

      {bookingToChange && (
        <BookingDateChangeDialog
          booking={bookingToChange}
          hostId={bookingHostId}
          open={dateChangeDialogOpen}
          onOpenChange={setDateChangeDialogOpen}
          onSuccess={() => {
            refetchBookings();
            setBookingToChange(null);
            setBookingHostId("");
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default MyBookings;
