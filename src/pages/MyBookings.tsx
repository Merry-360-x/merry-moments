import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, XCircle, Star, AlertTriangle, CalendarClock, Mail, Phone, CreditCard, Smartphone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { convertAmount } from "@/lib/fx";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { extractNeighborhood } from "@/lib/location";
import { useFxRates } from "@/hooks/useFxRates";
import { usePreferences } from "@/hooks/usePreferences";
import { calculatePawaPayProcessing } from "@/lib/fees";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookingDateChangeDialog } from "@/components/BookingDateChangeDialog";
import LoadingSpinner from "@/components/LoadingSpinner";

const bookingDecisionSeenKey = (userId?: string | null) =>
  `guest_booking_decision_seen_at_${String(userId || "anonymous")}`;

const BOOKING_DECISION_SEEN_EVENT = "guest-booking-decisions-seen";

interface Booking {
  id: string;
  property_id: string;
  tour_id?: string | null;
  transport_id?: string | null;
  review_token?: string | null;
  booking_type?: 'property' | 'tour' | 'transport' | null;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  confirmation_status?: 'pending' | 'approved' | 'rejected' | null;
  rejection_reason?: string | null;
  confirmed_at?: string | null;
  rejected_at?: string | null;
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
    updated_at?: string | null; // Added updated_at field
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
    nickname: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  checkout_requests?: {
    id: string;
    total_amount: number;
    currency: string | null;
    payment_method: string | null;
    base_price_amount?: number | null;
    service_fee_amount?: number | null;
  } | null;
}

type SupportTicketRow = {
  subject: string | null;
  message: string | null;
  status: string | null;
};

type PostBookingCharge = {
  id: string;
  booking_id: string;
  charge_type: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created_at: string;
  payment_reference?: string | null;
};

type BookingModification = {
  id: string;
  booking_id: string;
  modification_type: string;
  old_price: number;
  new_price: number;
  difference: number;
  currency: string;
  status: string;
  payment_status: string;
  proposal_message: string | null;
  charge_id: string | null;
  created_at: string;
};

type PostBookingDispute = {
  id: string;
  charge_id: string | null;
  booking_modification_id: string | null;
  status: string;
  reason?: string | null;
  details?: string | null;
  admin_notes?: string | null;
  resolution?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

type GuestPostBookingOverview = {
  charges: PostBookingCharge[];
  booking_modifications: BookingModification[];
  disputes: PostBookingDispute[];
};

type DisputeDialogState = {
  open: boolean;
  chargeId: string | null;
  modificationId: string | null;
};

type DisputeReplyDialogState = {
  open: boolean;
  disputeId: string | null;
};

function canGuestRespondToDispute(dispute: PostBookingDispute | undefined) {
  const value = String(dispute?.status || "").toLowerCase();
  return value === "open" || value === "in_review";
}

function latestDisputeUpdate(dispute: PostBookingDispute | undefined) {
  if (!dispute) return "";

  const resolution = String(dispute.resolution || "").trim();
  if (resolution) return resolution;

  const adminNotes = String(dispute.admin_notes || "").trim();
  if (adminNotes) return adminNotes;

  const details = String(dispute.details || "").trim();
  if (!details) return "";

  const blocks = details
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return blocks[blocks.length - 1] || details;
}

const mobileProviders = [
  { value: "MTN", label: "MTN Mobile Money" },
  { value: "AIRTEL", label: "Airtel Money" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "VODACOM", label: "Vodacom M-Pesa" },
  { value: "ORANGE", label: "Orange Money" },
];

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function postBookingRequest(action: string, body: Record<string, unknown> = {}) {
  const token = await getAccessToken();
  const response = await fetch("/api/post-booking", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Request failed");
  }
  return payload;
}

async function fetchGuestPostBookingOverview(): Promise<GuestPostBookingOverview> {
  const token = await getAccessToken();
  const response = await fetch("/api/post-booking?action=user-overview", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Failed to fetch post-booking data");
  }

  return {
    charges: payload.charges || [],
    booking_modifications: payload.booking_modifications || [],
    disputes: payload.disputes || [],
  };
}

function humanizePostBookingLabel(value: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function postBookingStatusTone(status: string) {
  const value = String(status || "").toLowerCase();
  if (value === "paid" || value === "approved" || value === "settled") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  if (value === "failed" || value === "rejected" || value === "cancelled") return "bg-rose-100 text-rose-700 hover:bg-rose-100";
  if (value === "disputed" || value === "in_review") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function summarizeChargeTotals(charges: Array<{ amount: number; currency: string }>) {
  const totals = new Map<string, number>();

  charges.forEach((charge) => {
    const currency = String(charge.currency || "USD").toUpperCase();
    const amount = Number(charge.amount || 0);
    totals.set(currency, (totals.get(currency) || 0) + amount);
  });

  return Array.from(totals.entries())
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" · ");
}

const getLatestBookingDecisionTimestamp = (bookings: Booking[]) => bookings
  .filter((booking) => booking.confirmation_status === "approved" || booking.confirmation_status === "rejected")
  .map((booking) => booking.confirmed_at || booking.rejected_at || "")
  .filter(Boolean)
  .sort()
  .at(-1) || "";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseLocalDateValue = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (DATE_ONLY_RE.test(raw)) {
    const [yearText, monthText, dayText] = raw.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const isCheckoutInPast = (checkOutValue: string | null | undefined) => {
  const checkoutDate = parseLocalDateValue(checkOutValue);
  if (!checkoutDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return checkoutDate <= today;
};

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
  const [reviewerName, setReviewerName] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewValidationError, setReviewValidationError] = useState(false);
  const [reviewNameError, setReviewNameError] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [dateChangeDialogOpen, setDateChangeDialogOpen] = useState(false);
  const [bookingToChange, setBookingToChange] = useState<Booking | null>(null);
  const [bookingHostId, setBookingHostId] = useState<string>("");
  const [requestingRefundKey, setRequestingRefundKey] = useState<string | null>(null);
  const [requestedRefundKeys, setRequestedRefundKeys] = useState<Set<string>>(new Set());
  const [decisionSeenAt, setDecisionSeenAt] = useState<string>("");
  const [payMethodByCharge, setPayMethodByCharge] = useState<Record<string, string>>({});
  const [mobileProviderByCharge, setMobileProviderByCharge] = useState<Record<string, string>>({});
  const [mobilePhoneByCharge, setMobilePhoneByCharge] = useState<Record<string, string>>({});
  const [processingChargeId, setProcessingChargeId] = useState<string | null>(null);
  const [disputeDialog, setDisputeDialog] = useState<DisputeDialogState>({
    open: false,
    chargeId: null,
    modificationId: null,
  });
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeReplyDialog, setDisputeReplyDialog] = useState<DisputeReplyDialogState>({
    open: false,
    disputeId: null,
  });
  const [disputeReplyMessage, setDisputeReplyMessage] = useState("");
  const [respondingDisputeId, setRespondingDisputeId] = useState<string | null>(null);
  const [respondingModificationId, setRespondingModificationId] = useState<string | null>(null);
  const [expandedOrderDetails, setExpandedOrderDetails] = useState<Record<string, boolean>>({});
  const [expandedAdvancedDetails, setExpandedAdvancedDetails] = useState<Record<string, boolean>>({});
  const lastDecisionToastRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    setDecisionSeenAt(localStorage.getItem(bookingDecisionSeenKey(user.id)) || "");
  }, [user?.id]);

  const markBookingDecisionsSeen = useCallback((seenAt?: string) => {
    if (typeof window === "undefined" || !user?.id) return;

    const nextSeenAt = seenAt || new Date().toISOString();
    localStorage.setItem(bookingDecisionSeenKey(user.id), nextSeenAt);
    setDecisionSeenAt(nextSeenAt);
    window.dispatchEvent(new CustomEvent(BOOKING_DECISION_SEEN_EVENT, { detail: { seenAt: nextSeenAt } }));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || location.pathname !== "/my-bookings") return;
    markBookingDecisionsSeen();
  }, [location.pathname, markBookingDecisionsSeen, user?.id]);

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
          properties(title, location, property_type, address, cancellation_policy, price_per_night, host_id, currency),
          tour_packages(title, city, country, duration, cancellation_policy_type, custom_cancellation_policy, price_per_person, host_id, currency)
        `)
        .eq("guest_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Fetch checkout_requests separately (no FK constraint)
      const orderIds = [...new Set((data ?? []).filter(b => b.order_id).map(b => b.order_id))];
      const transportIds = [...new Set((data ?? []).filter(b => b.transport_id).map(b => b.transport_id))];
      const checkouts = orderIds.length > 0
        ? (await supabase.from("checkout_requests").select("id, total_amount, currency, payment_method, base_price_amount, service_fee_amount").in("id", orderIds)).data || []
        : [];
      const vehicles = transportIds.length > 0
        ? (await supabase.from("transport_vehicles").select("id, title, vehicle_type, seats").in("id", transportIds)).data || []
        : [];
      // Attach checkout data to bookings
      const dataWithCheckout = (data ?? []).map(b => ({
        ...b,
        checkout_requests: b.order_id ? checkouts.find(c => c.id === b.order_id) || null : null,
        transport_vehicles: b.transport_id ? vehicles.find(v => v.id === b.transport_id) || null : null,
      }));
      
      // Fetch host profiles for confirmed/completed bookings
      const bookingsWithHosts = await Promise.all(
        dataWithCheckout.map(async (booking: any) => {
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            const hostId = booking.properties?.host_id || booking.tour_packages?.host_id;
            if (hostId) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, nickname, email, phone')
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

  const { data: existingRefundRequestRefs = new Set<string>() } = useQuery({
    queryKey: ["my-refund-request-refs", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("subject, message, status")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) {
        console.error("Error fetching refund request refs:", error);
        return new Set<string>();
      }

      const refs = new Set<string>();
      const bookingIdPattern = /-\s*Booking\s+([^:\s]+)\s*:/gi;

      (data as SupportTicketRow[]).forEach((ticket) => {
        const status = String(ticket.status || "").toLowerCase();
        if (status === "closed" || status === "resolved") return;

        const subject = String(ticket.subject || "");
        const message = String(ticket.message || "");

        const subjectMatch = subject.match(/refund request for booking\s+(.+)$/i);
        if (subjectMatch?.[1]) {
          refs.add(subjectMatch[1].trim().toLowerCase());
        }

        const referenceMatch = message.match(/^Reference:\s*(.+)$/im);
        if (referenceMatch?.[1]) {
          refs.add(referenceMatch[1].trim().toLowerCase());
        }

        let lineMatch: RegExpExecArray | null;
        while ((lineMatch = bookingIdPattern.exec(message)) !== null) {
          if (lineMatch[1]) {
            refs.add(lineMatch[1].trim().toLowerCase());
          }
        }
      });

      return refs;
    },
    placeholderData: new Set<string>(),
    staleTime: 30000,
  });

  const { data: postBookingOverview = { charges: [], disputes: [] }, refetch: refetchPostBookingOverview } = useQuery({
    queryKey: ["guest-post-booking-overview", user?.id],
    enabled: Boolean(user?.id),
    queryFn: fetchGuestPostBookingOverview,
    placeholderData: { charges: [], disputes: [] },
    staleTime: 30000,
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

  const getPolicyKeyForRefund = (booking: Booking): string => {
    const rawPolicy = String(getCancellationPolicy(booking) || "fair").toLowerCase().trim();
    if (["flexible", "moderate", "standard", "strict", "fair", "non_refundable", "multiday_private"].includes(rawPolicy)) {
      return rawPolicy;
    }
    if (rawPolicy === "standard_day") return "standard";
    return "fair";
  };

  const getRefundRule = (policyKey: string, daysUntilCheckIn: number) => {
    const rules: Record<string, Array<{ minDays: number; refundPct: number }>> = {
      flexible: [
        { minDays: 1, refundPct: 100 },
        { minDays: 0, refundPct: 50 },
        { minDays: -36500, refundPct: 0 },
      ],
      moderate: [
        { minDays: 5, refundPct: 100 },
        { minDays: -36500, refundPct: 0 },
      ],
      standard: [
        { minDays: 3, refundPct: 100 },
        { minDays: -36500, refundPct: 0 },
      ],
      strict: [
        { minDays: 14, refundPct: 100 },
        { minDays: -36500, refundPct: 0 },
      ],
      fair: [
        { minDays: 7, refundPct: 100 },
        { minDays: 0, refundPct: 50 },
        { minDays: -36500, refundPct: 0 },
      ],
      non_refundable: [
        { minDays: -36500, refundPct: 0 },
      ],
      multiday_private: [
        { minDays: 14, refundPct: 100 },
        { minDays: -36500, refundPct: 0 },
      ],
    };
    const policyRules = rules[policyKey] || rules.fair;
    return policyRules.find((rule) => daysUntilCheckIn >= rule.minDays) || policyRules[policyRules.length - 1];
  };

  const getDaysUntilCheckIn = (booking: Booking): number => {
    const checkIn = new Date(booking.check_in);
    checkIn.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getRefundRuleExplanation = (daysUntilCheckIn: number, refundPercentage: number) => {
    if (daysUntilCheckIn < 0) {
      const daysAfter = Math.abs(daysUntilCheckIn);
      return `${daysAfter} day${daysAfter === 1 ? "" : "s"} after check-in → ${refundPercentage}%`;
    }
    if (daysUntilCheckIn === 0) {
      return `On check-in day → ${refundPercentage}%`;
    }
    return `${daysUntilCheckIn} day${daysUntilCheckIn === 1 ? "" : "s"} before check-in → ${refundPercentage}%`;
  };

  const getEstimatedRefund = (booking: Booking): { refundAmount: number; refundPercentage: number; policyKey: string; daysUntilCheckIn: number; ruleExplanation: string } => {
    const policyKey = getPolicyKeyForRefund(booking);
    const daysUntilCheckIn = getDaysUntilCheckIn(booking);
    const rule = daysUntilCheckIn <= 0
      ? { minDays: daysUntilCheckIn, refundPct: 0 }
      : getRefundRule(policyKey, daysUntilCheckIn);
    const listedTotal = Number(booking.total_price || 0);
    const checkoutTotal = Number(booking.checkout_requests?.total_amount || 0);
    const checkoutBasePrice = Number(booking.checkout_requests?.base_price_amount || 0);
    const checkoutServiceFee = Number(booking.checkout_requests?.service_fee_amount || 0);
    const refundableBase =
      checkoutBasePrice > 0
        ? checkoutBasePrice
        : checkoutTotal > 0
          ? Math.max(checkoutTotal - Math.max(checkoutServiceFee, 0), 0)
          : listedTotal;

    const refundAmount = (refundableBase * rule.refundPct) / 100;
    return {
      refundAmount,
      refundPercentage: rule.refundPct,
      policyKey,
      daysUntilCheckIn,
      ruleExplanation: getRefundRuleExplanation(daysUntilCheckIn, rule.refundPct),
    };
  };

  const submitRefundRequest = async (refundKey: string, orderBookings: Booking[]) => {
    if (!user?.id || !user?.email) return;

    const refundableBookings = orderBookings.filter(
      (booking) => booking.status === "cancelled" && booking.payment_status === "paid"
    );

    if (refundableBookings.length === 0) {
      toast({
        variant: "destructive",
        title: "No refundable booking found",
        description: "Only cancelled paid bookings can request a refund.",
      });
      return;
    }

    setRequestingRefundKey(refundKey);
    try {
      const userName =
        (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
        user.email.split("@")[0] ||
        "Guest";

      const policyLines = refundableBookings.map((booking) => {
        const estimate = getEstimatedRefund(booking);
        const bookingCurrency =
          booking.booking_type === "property" && booking.properties?.currency
            ? booking.properties.currency
            : booking.booking_type === "tour" && booking.tour_packages?.currency
              ? booking.tour_packages.currency
              : String(booking.currency || "USD");

        return `- Booking ${booking.id}: ${estimate.refundPercentage}% (${formatMoney(estimate.refundAmount, bookingCurrency)}) • Rule: ${estimate.ruleExplanation} • Policy: ${getCancellationPolicy(booking)}`;
      });

      const totalEstimatedRefund = refundableBookings.reduce((sum, booking) => {
        const estimate = getEstimatedRefund(booking);
        return sum + estimate.refundAmount;
      }, 0);

      const displayReference = orderBookings[0]?.order_id || orderBookings[0]?.id || refundKey;
      const currencyCode =
        orderBookings[0]?.booking_type === "property" && orderBookings[0]?.properties?.currency
          ? orderBookings[0].properties.currency
          : orderBookings[0]?.booking_type === "tour" && orderBookings[0]?.tour_packages?.currency
            ? orderBookings[0].tour_packages.currency
            : String(orderBookings[0]?.currency || "USD");

      const subject = `Refund request for booking ${displayReference}`;
      const message = [
        `Guest requested a refund for cancelled paid booking(s).`,
        `Reference: ${displayReference}`,
        `User ID: ${user.id}`,
        `User Email: ${user.email}`,
        `Estimated total refund: ${formatMoney(totalEstimatedRefund, currencyCode)}`,
        ``,
        `Policy & item details:`,
        ...policyLines,
      ].join("\n");

      const { error: ticketError } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        category: "booking",
        subject,
        message,
        status: "open",
      });

      if (ticketError) throw ticketError;

      fetch("/api/support-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "booking",
          subject,
          message,
          userId: user.id,
          userEmail: user.email,
          userName,
        }),
      }).catch(() => {});

      setRequestedRefundKeys((prev) => {
        const next = new Set(prev);
        next.add(refundKey);
        return next;
      });

      toast({
        title: "Refund request submitted",
        description: "Support has received your refund request and will follow up shortly.",
      });
    } catch (e) {
      logError("bookings.refund.request", e);
      toast({
        variant: "destructive",
        title: "Refund request failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    } finally {
      setRequestingRefundKey(null);
    }
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
    return b.status === "confirmed" || b.status === "completed";
  };

  const openReview = (b: Booking) => {
    setReviewBooking(b);
    setReviewRating(5);
    setReviewComment("");
    const defaultName =
      String(user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim() ||
      String(user?.email || "").split("@")[0] ||
      "";
    setReviewerName(defaultName);
    setReviewValidationError(false);
    setReviewNameError(false);
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

    const normalizedReviewerName = reviewerName.trim();
    if (!normalizedReviewerName) {
      setReviewNameError(true);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "Please enter your name before submitting.",
      });
      return;
    }
    
    setReviewValidationError(false);
    setSubmittingReview(true);
    try {
      const comment = reviewComment.trim() ? reviewComment.trim() : undefined;

      if (reviewBooking.review_token) {
        const resp = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: reviewBooking.review_token,
            accommodationRating: reviewRating,
            accommodationComment: comment,
            reviewerName: normalizedReviewerName,
          }),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(String(data?.error || "Could not submit review"));
        }
      } else {
        const listingId = reviewBooking.property_id || reviewBooking.tour_id || reviewBooking.transport_id;
        if (!listingId) {
          throw new Error("Could not find listing for this booking review.");
        }

        const reviewerComment = comment
          ? `Reviewed by ${normalizedReviewerName}.\n\n${comment}`
          : `Reviewed by ${normalizedReviewerName}.`;

        if (reviewBooking.property_id) {
          const payload = {
            booking_id: reviewBooking.id,
            property_id: reviewBooking.property_id,
            reviewer_id: user.id,
            rating: reviewRating,
            comment: reviewerComment,
          };

          const { error } = await supabase.from("property_reviews").insert(payload);
          if (error) {
            const errorCode = (error as { code?: string }).code;
            if (errorCode === "23505") {
              const { error: updateError } = await supabase
                .from("property_reviews")
                .update({
                  booking_id: reviewBooking.id,
                  rating: reviewRating,
                  comment: reviewerComment,
                  service_rating: null,
                  service_comment: null,
                  is_hidden: false,
                })
                .eq("property_id", reviewBooking.property_id)
                .eq("reviewer_id", user.id);
              if (updateError) throw updateError;
            } else {
              throw error;
            }
          }
        } else {
          const { error } = await supabase.from("reviews").insert({
            booking_id: reviewBooking.id,
            property_id: null,
            tour_id: reviewBooking.tour_id || null,
            transport_id: reviewBooking.transport_id || null,
            user_id: user.id,
            rating: reviewRating,
            comment: reviewerComment,
            is_hidden: false,
          });
          if (error) throw error;
        }
      }

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

  const handlePayCharge = useCallback(async (charge: PostBookingCharge) => {
    const method = payMethodByCharge[charge.id] || "card";
    const provider = mobileProviderByCharge[charge.id] || "MTN";
    const phone = mobilePhoneByCharge[charge.id] || "";

    if (method === "mobile_money" && !phone.trim()) {
      toast({
        variant: "destructive",
        title: "Phone number required",
        description: "Enter a mobile money number to continue.",
      });
      return;
    }

    setProcessingChargeId(charge.id);

    try {
      const payload: Record<string, unknown> = {
        charge_id: charge.id,
        method,
        initialize: true,
      };

      if (method === "mobile_money") {
        payload.provider = provider;
        payload.phone_number = phone.trim();
      }

      const result = await postBookingRequest("pay-charge", payload);

      if (method === "card") {
        if (result?.flutterwave?.ok === false) {
          const message =
            result?.flutterwave?.body?.error ||
            result?.flutterwave?.body?.message ||
            "Could not initialize card payment.";
          throw new Error(String(message));
        }

        const redirectUrl =
          result?.flutterwave?.body?.redirectUrl ||
          result?.flutterwave?.body?.link ||
          result?.redirectUrl;

        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }

        if (result.checkout_id) {
          navigate(`/payment-pending?checkoutId=${encodeURIComponent(String(result.checkout_id))}&provider=flutterwave`);
          return;
        }
      }

      if (method === "mobile_money") {
        if (result?.mobile_money?.ok === false) {
          const message =
            result?.mobile_money?.body?.error ||
            result?.mobile_money?.body?.message ||
            "Could not initialize mobile money payment.";
          throw new Error(String(message));
        }

        const depositId =
          result?.mobile_money?.body?.depositId ||
          result?.mobile_money?.body?.data?.depositId;

        if (result.checkout_id && depositId) {
          navigate(
            `/payment-pending?checkoutId=${encodeURIComponent(String(result.checkout_id))}&depositId=${encodeURIComponent(String(depositId))}&provider=pawapay`
          );
          return;
        }

        toast({
          title: "Payment initiated",
          description: "Follow the mobile-money prompt on your phone to complete payment.",
        });
      }

      await refetchPostBookingOverview();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Could not process payment.",
      });
    } finally {
      setProcessingChargeId(null);
    }
  }, [mobilePhoneByCharge, mobileProviderByCharge, navigate, payMethodByCharge, refetchPostBookingOverview, toast]);

  const handleRespondModification = useCallback(async (modification: BookingModification, decision: "accept" | "reject") => {
    setRespondingModificationId(modification.id);
    try {
      const result = await postBookingRequest("respond-modification", {
        booking_modification_id: modification.id,
        decision,
      });

      const paymentStatus = String(result?.booking_modification?.payment_status || "");
      if (decision === "accept" && paymentStatus === "pending") {
        toast({
          title: "Change accepted",
          description: "Complete the linked payment to finalize your booking update.",
        });
      } else {
        toast({
          title: decision === "accept" ? "Change accepted" : "Change rejected",
          description: "Your response has been recorded.",
        });
      }

      await refetchPostBookingOverview();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not submit response",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRespondingModificationId(null);
    }
  }, [refetchPostBookingOverview, toast]);

  const openDisputeForCharge = useCallback((chargeId: string) => {
    setDisputeReason("");
    setDisputeDetails("");
    setDisputeDialog({ open: true, chargeId, modificationId: null });
  }, []);

  const openDisputeForModification = useCallback((modificationId: string) => {
    setDisputeReason("");
    setDisputeDetails("");
    setDisputeDialog({ open: true, chargeId: null, modificationId });
  }, []);

  const submitDispute = useCallback(async () => {
    if (!disputeReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason is required",
        description: "Please describe why you are opening this dispute.",
      });
      return;
    }

    setSubmittingDispute(true);
    try {
      await postBookingRequest("open-dispute", {
        charge_id: disputeDialog.chargeId,
        booking_modification_id: disputeDialog.modificationId,
        reason: disputeReason.trim(),
        details: disputeDetails.trim(),
      });

      setDisputeDialog({ open: false, chargeId: null, modificationId: null });
      setDisputeReason("");
      setDisputeDetails("");

      toast({
        title: "Dispute opened",
        description: "Your case is now in review.",
      });

      await refetchPostBookingOverview();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to open dispute",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSubmittingDispute(false);
    }
  }, [disputeDetails, disputeDialog.chargeId, disputeDialog.modificationId, disputeReason, refetchPostBookingOverview, toast]);

  const closeDisputeReplyDialog = useCallback(() => {
    setDisputeReplyDialog({ open: false, disputeId: null });
    setDisputeReplyMessage("");
  }, []);

  const openDisputeAppeal = useCallback((disputeId: string) => {
    setDisputeReplyMessage("");
    setDisputeReplyDialog({ open: true, disputeId });
  }, []);

  const submitDisputeAppeal = useCallback(async () => {
    if (!disputeReplyDialog.disputeId) return;

    if (!disputeReplyMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Appeal message required",
        description: "Explain why you want to keep the dispute open.",
      });
      return;
    }

    setRespondingDisputeId(disputeReplyDialog.disputeId);
    try {
      await postBookingRequest("guest-respond-dispute", {
        dispute_id: disputeReplyDialog.disputeId,
        decision: "appeal",
        message: disputeReplyMessage.trim(),
      });

      closeDisputeReplyDialog();
      toast({
        title: "Appeal sent",
        description: "Your dispute remains open and the host will see your response.",
      });
      await refetchPostBookingOverview();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not continue dispute",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRespondingDisputeId(null);
    }
  }, [closeDisputeReplyDialog, disputeReplyDialog.disputeId, disputeReplyMessage, refetchPostBookingOverview, toast]);

  const closeDispute = useCallback(async (disputeId: string) => {
    setRespondingDisputeId(disputeId);
    try {
      await postBookingRequest("guest-respond-dispute", {
        dispute_id: disputeId,
        decision: "close",
      });

      toast({
        title: "Dispute closed",
        description: "The dispute is closed. If a payment is still due, you can pay it from this booking.",
      });
      await refetchPostBookingOverview();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not close dispute",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRespondingDisputeId(null);
    }
  }, [refetchPostBookingOverview, toast]);

  const payDisputedCharge = useCallback(async (dispute: PostBookingDispute, charge: PostBookingCharge) => {
    const method = payMethodByCharge[charge.id] || "card";
    const provider = mobileProviderByCharge[charge.id] || "MTN";
    const phone = mobilePhoneByCharge[charge.id] || "";

    if (method === "mobile_money" && !phone.trim()) {
      toast({
        variant: "destructive",
        title: "Phone number required",
        description: "Enter a mobile money number to continue.",
      });
      return;
    }

    setRespondingDisputeId(dispute.id);
    setProcessingChargeId(charge.id);

    try {
      const payload: Record<string, unknown> = {
        dispute_id: dispute.id,
        decision: "pay",
        method,
        initialize: true,
      };

      if (method === "mobile_money") {
        payload.provider = provider;
        payload.phone_number = phone.trim();
      }

      const result = await postBookingRequest("guest-respond-dispute", payload);

      if (method === "card") {
        if (result?.flutterwave?.ok === false) {
          const message =
            result?.flutterwave?.body?.error ||
            result?.flutterwave?.body?.message ||
            "Could not initialize card payment.";
          throw new Error(String(message));
        }

        const redirectUrl =
          result?.flutterwave?.body?.redirectUrl ||
          result?.flutterwave?.body?.link ||
          result?.redirectUrl;

        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }

        if (result.checkout_id) {
          navigate(`/payment-pending?checkoutId=${encodeURIComponent(String(result.checkout_id))}&provider=flutterwave`);
          return;
        }
      }

      if (method === "mobile_money") {
        if (result?.mobile_money?.ok === false) {
          const message =
            result?.mobile_money?.body?.error ||
            result?.mobile_money?.body?.message ||
            "Could not initialize mobile money payment.";
          throw new Error(String(message));
        }

        const depositId =
          result?.mobile_money?.body?.depositId ||
          result?.mobile_money?.body?.data?.depositId;

        if (result.checkout_id && depositId) {
          navigate(
            `/payment-pending?checkoutId=${encodeURIComponent(String(result.checkout_id))}&depositId=${encodeURIComponent(String(depositId))}&provider=pawapay`
          );
          return;
        }

        toast({
          title: "Payment initiated",
          description: "Follow the mobile-money prompt on your phone to complete payment.",
        });
      }

      await refetchPostBookingOverview();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Could not process payment.",
      });
    } finally {
      setRespondingDisputeId(null);
      setProcessingChargeId(null);
    }
  }, [mobilePhoneByCharge, mobileProviderByCharge, navigate, payMethodByCharge, refetchPostBookingOverview, toast]);

  const linkedChargeMap = useMemo(() => {
    const map = new Map<string, PostBookingCharge>();
    postBookingOverview.charges.forEach((charge) => map.set(charge.id, charge));
    return map;
  }, [postBookingOverview.charges]);

  if (authLoading) {
    return null;
  }

  // Group bookings by order_id (only group if they share the same order_id)
  const groupedBookings = bookings.reduce((groups: { [key: string]: Booking[] }, booking) => {
    // Each booking gets its own group unless it has an order_id shared with others
    const key = booking.order_id && booking.order_id.trim() !== '' ? booking.order_id : `single_${booking.id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(booking);
    return groups;
  }, {});

  const paymentCheckoutId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("checkoutId") || "").trim();
  }, [location.search]);

  const paymentLinkedBookingGroupKey = useMemo(() => {
    if (!paymentCheckoutId) return "";

    const matchingCharge = postBookingOverview.charges.find((charge) => charge.payment_reference === paymentCheckoutId);
    if (!matchingCharge) return "";

    const matchedGroupEntry = Object.entries(groupedBookings).find(([, orderBookings]) =>
      orderBookings.some((booking) => booking.id === matchingCharge.booking_id)
    );

    return matchedGroupEntry?.[0] || "";
  }, [groupedBookings, paymentCheckoutId, postBookingOverview.charges]);

  const cameFromPaymentConfirmation = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("payment") === "confirmed";
  }, [location.search]);

  const orderedBookingGroups = useMemo(() => {
    const entries = Object.entries(groupedBookings);
    if (!paymentCheckoutId) return entries;

    if (paymentLinkedBookingGroupKey) {
      const matchIndex = entries.findIndex(([groupKey]) => groupKey === paymentLinkedBookingGroupKey);
      if (matchIndex > 0) {
        const [matched] = entries.splice(matchIndex, 1);
        return [matched, ...entries];
      }
      return entries;
    }

    const matchIndex = entries.findIndex(([groupKey, orderBookings]) => {
      if (groupKey === paymentCheckoutId) return true;
      return orderBookings.some((booking) => {
        return booking.id === paymentCheckoutId || booking.order_id === paymentCheckoutId;
      });
    });

    if (matchIndex <= 0) return entries;
    const [matched] = entries.splice(matchIndex, 1);
    return [matched, ...entries];
  }, [groupedBookings, paymentCheckoutId, paymentLinkedBookingGroupKey]);

  const paymentBookingFound = useMemo(() => {
    if (!paymentCheckoutId) return false;
    if (paymentLinkedBookingGroupKey) return true;
    return orderedBookingGroups.some(([groupKey, orderBookings]) => {
      if (groupKey === paymentCheckoutId) return true;
      return orderBookings.some((booking) => booking.id === paymentCheckoutId || booking.order_id === paymentCheckoutId);
    });
  }, [orderedBookingGroups, paymentCheckoutId, paymentLinkedBookingGroupKey]);

  const getConfirmationUi = (booking: Booking, hasEnded = false) => {
    const status = booking.confirmation_status;

    if (status === 'pending' || booking.status === 'pending') {
      return {
        badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100",
        badgeLabel: "Awaiting host confirmation",
        alertClass: "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
        alertTitle: "Awaiting host confirmation",
        alertMessage: "Your booking is paid and waiting for the host to accept it.",
      };
    }

    if (status === 'approved') {
      return {
        badgeClass: "bg-green-100 text-green-700 hover:bg-green-100",
        badgeLabel: "Approved",
        alertClass: "border-green-200 bg-green-50 dark:bg-green-950/20",
        alertTitle: "Approved by host",
        alertMessage: "Your booking has been approved by the host.",
      };
    }

    if (status === 'rejected') {
      const reason = booking.rejection_reason?.trim();
      return {
        badgeClass: "bg-red-100 text-red-700 hover:bg-red-100",
        badgeLabel: "Rejected",
        alertClass: "border-red-200 bg-red-50 dark:bg-red-950/20",
        alertTitle: "Rejected by host",
        alertMessage: reason
          ? `Reason: ${reason}`
          : "The host rejected this booking.",
      };
    }

    const effectiveStatus = hasEnded && booking.status === "confirmed"
      ? "completed"
      : booking.status;

    return {
      badgeClass:
        effectiveStatus === "confirmed" || effectiveStatus === "completed"
          ? "bg-green-100 text-green-700 hover:bg-green-100"
          : effectiveStatus === "cancelled"
            ? "bg-red-100 text-red-700 hover:bg-red-100"
            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
      badgeLabel: effectiveStatus,
      alertClass: "",
      alertTitle: "",
      alertMessage: "",
    };
  };

  const recentDecisionBookings = useMemo(() => {
    const seenDate = decisionSeenAt ? new Date(decisionSeenAt) : new Date(0);

    return bookings.filter((booking) => {
      if (booking.confirmation_status !== "approved" && booking.confirmation_status !== "rejected") {
        return false;
      }

      const decisionTimestamp = booking.confirmation_status === "approved"
        ? booking.confirmed_at
        : booking.rejected_at;

      if (!decisionTimestamp) return false;
      const decisionDate = new Date(decisionTimestamp);
      if (!Number.isFinite(decisionDate.getTime())) return false;
      return decisionDate > seenDate;
    });
  }, [bookings, decisionSeenAt]);

  useEffect(() => {
    if (recentDecisionBookings.length === 0) return;

    const latestDecision = recentDecisionBookings
      .map((booking) => booking.confirmed_at || booking.rejected_at || "")
      .sort()
      .at(-1) || "";

    const signature = `${recentDecisionBookings.length}:${latestDecision}`;
    if (lastDecisionToastRef.current === signature) return;

    lastDecisionToastRef.current = signature;
    toast({
      title: "Booking update",
      description: `You have ${recentDecisionBookings.length} new host decision${recentDecisionBookings.length > 1 ? "s" : ""}.`,
    });
  }, [recentDecisionBookings, toast]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id || isLoading || bookings.length === 0) return;

    const latestDecision = getLatestBookingDecisionTimestamp(bookings);

    if (!latestDecision) return;

    const seenDate = decisionSeenAt ? new Date(decisionSeenAt) : new Date(0);
    const latestDate = new Date(latestDecision);
    if (!Number.isFinite(latestDate.getTime()) || latestDate <= seenDate) return;

    markBookingDecisionsSeen(latestDecision);
  }, [bookings, decisionSeenAt, isLoading, markBookingDecisionsSeen, user?.id]);

  if (authLoading || !user || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner message="Loading bookings..." className="py-0" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("bookings.title")}</h1>
        <p className="text-muted-foreground mb-8">{t("bookings.subtitle")}</p>

        {cameFromPaymentConfirmation && paymentCheckoutId && (
          <Alert className="mb-6 border-green-300 bg-green-50 dark:bg-green-950/20">
            <AlertTriangle className="h-4 w-4 text-green-700" />
            <AlertTitle className="text-green-800 dark:text-green-100">Payment Confirmed</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-200">
              {paymentBookingFound
                ? "Your paid booking is shown first below."
                : "Your payment was confirmed. Booking list is refreshing."}
            </AlertDescription>
          </Alert>
        )}

        {bookings.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">{t("bookings.emptyTitle")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("bookings.emptySubtitle")}
            </p>
            <Button type="button" onClick={() => navigate("/accommodations")}>{t("bookings.browse")}</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orderedBookingGroups.map(([orderId, orderBookings]) => {
              // All bookings in a group share the same status, dates, etc.
              const firstBooking = orderBookings[0];
              const orderHasEnded = orderBookings.every((booking) => isCheckoutInPast(booking.check_out));
              const isMultiItem = orderBookings.length > 1;
              const displayReference = isMultiItem ? (firstBooking.order_id || orderId) : firstBooking.id;
              const grandTotal = orderBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
              const confirmationUi = getConfirmationUi(firstBooking, orderHasEnded);
              const reviewableBookingsInOrder = orderBookings.filter(
                (booking) => canReview(booking) && !reviewedBookingIds.has(String(booking.id))
              );
              const nextReviewBooking = reviewableBookingsInOrder[0] ?? null;
              const accommodationCount = orderBookings.filter((booking) => (booking.booking_type || 'property') === 'property').length;
              const tourCount = orderBookings.filter((booking) => booking.booking_type === 'tour').length;
              const transportCount = orderBookings.filter((booking) => booking.booking_type === 'transport').length;
              const hasSubmittedRefundRequest =
                requestedRefundKeys.has(orderId) ||
                existingRefundRequestRefs.has(String(orderId || "").toLowerCase()) ||
                orderBookings.some((booking) => {
                  const bookingId = String(booking.id || "").toLowerCase();
                  const bookingOrderId = String(booking.order_id || "").toLowerCase();
                  return (
                    existingRefundRequestRefs.has(bookingId) ||
                    (bookingOrderId && existingRefundRequestRefs.has(bookingOrderId))
                  );
                });
              
              // Calculate total amount paid (from checkout_requests)
              const totalPaid = orderBookings.reduce((sum, b) => {
                return sum + (b.checkout_requests?.total_amount || 0);
              }, 0);
              const paidCurrency = firstBooking.checkout_requests?.currency || "RWF";
              
              // Get listing currency
              const listingCurrency = firstBooking.booking_type === "property" && firstBooking.properties?.currency
                ? firstBooking.properties.currency
                : firstBooking.booking_type === "tour" && firstBooking.tour_packages?.currency
                  ? firstBooking.tour_packages.currency
                  : String(firstBooking.currency || "USD");
              const bookingDateLabel = `${new Date(firstBooking.check_in).toLocaleDateString()} - ${new Date(firstBooking.check_out).toLocaleDateString()}`;
              const orderBookingIds = new Set(orderBookings.map((booking) => booking.id));
              const orderCharges = postBookingOverview.charges
                .filter((charge) => orderBookingIds.has(charge.booking_id))
                .sort((left, right) => {
                  if (left.status === right.status) {
                    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
                  }
                  if (left.status === "pending") return -1;
                  if (right.status === "pending") return 1;
                  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
                });
              const pendingOrderCharges = orderCharges.filter((charge) => charge.status === "pending");
              const orderChargeSummary = summarizeChargeTotals(pendingOrderCharges);
              const orderModifications = postBookingOverview.booking_modifications
                .filter((modification) => orderBookingIds.has(modification.booking_id))
                .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
              const locationSummary = (() => {
                const locations = Array.from(new Set(orderBookings.map((booking) => {
                  if (booking.booking_type === "tour" && booking.tour_packages) {
                    return `${booking.tour_packages.city}, ${booking.tour_packages.country}`;
                  }
                  if (booking.booking_type === "transport" && booking.transport_vehicles) {
                    return `${booking.transport_vehicles.vehicle_type}`;
                  }
                  return booking.properties?.location || "";
                }).filter(Boolean)));

                if (locations.length === 0) return "Location unavailable";
                if (locations.length === 1) return extractNeighborhood(locations[0]) || locations[0];
                return `${locations.length} locations`;
              })();
              
              return (
                <div key={orderId} className="rounded-xl border border-border bg-card/70 shadow-sm">
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-foreground">Order #{displayReference}</p>
                        <p className="text-sm text-muted-foreground">{bookingDateLabel}</p>
                        <p className="text-sm text-muted-foreground">{locationSummary}</p>
                        {orderCharges.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge className={pendingOrderCharges.length > 0 ? "bg-rose-100 text-rose-700 hover:bg-rose-100" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"}>
                              {pendingOrderCharges.length > 0
                                ? `${pendingOrderCharges.length} add-on charge${pendingOrderCharges.length > 1 ? "s" : ""} due`
                                : `${orderCharges.length} add-on charge${orderCharges.length > 1 ? "s" : ""}`}
                            </Badge>
                            {orderChargeSummary && (
                              <span className="text-xs text-muted-foreground">{orderChargeSummary}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {nextReviewBooking && (
                          <Button size="sm" type="button" onClick={() => openReview(nextReviewBooking)}>
                            <Star className="w-4 h-4 mr-2" /> Leave Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>


                      {orderCharges.length > 0 && (
                        <div className="rounded-xl border border-rose-200/70 bg-rose-50/40 p-3 sm:p-4 space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">Add-on charges</p>
                              <p className="text-[11px] leading-5 text-muted-foreground">
                                Extras for this order stay here so you can pay fast from My Bookings.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={pendingOrderCharges.length > 0 ? "bg-rose-100 text-rose-700 hover:bg-rose-100" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"}>
                                {pendingOrderCharges.length > 0 ? `Due ${orderChargeSummary}` : "No balance due"}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            {orderCharges.map((charge) => {
                              const selectedMethod = payMethodByCharge[charge.id] || "card";
                              const linkedDispute = postBookingOverview.disputes.find((dispute) => dispute.charge_id === charge.id);
                              const disputeCanRespond = canGuestRespondToDispute(linkedDispute);

                              return (
                                <div key={charge.id} className="rounded-lg border border-border bg-background p-2.5 sm:p-3 space-y-2.5">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1.5 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className={postBookingStatusTone(charge.status)}>{charge.status}</Badge>
                                        <Badge variant="outline">{humanizePostBookingLabel(charge.charge_type)}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(charge.created_at).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="text-sm font-medium text-foreground break-words">{charge.description}</p>
                                    </div>
                                    <div className="sm:text-right shrink-0">
                                      <p className="text-sm sm:text-base font-semibold text-rose-600">{formatMoney(charge.amount, charge.currency)}</p>
                                      <p className="text-xs text-muted-foreground">Charge #{charge.id.slice(0, 8).toUpperCase()}</p>
                                    </div>
                                  </div>

                                  {linkedDispute && (
                                    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                                      <AlertTitle>Dispute in progress</AlertTitle>
                                      <AlertDescription>
                                        This charge already has a {linkedDispute.status.replace(/_/g, " ")} dispute and will be handled from your booking flow here.
                                      </AlertDescription>
                                    </Alert>
                                  )}

                                  {linkedDispute && disputeCanRespond && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 sm:p-3 space-y-3">
                                      <div className="space-y-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Your next step</p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                          {latestDisputeUpdate(linkedDispute) || "Review the dispute and choose what to do next."}
                                        </p>
                                      </div>

                                      {charge.status === "disputed" && (
                                        <div className="rounded-lg border border-border bg-background p-2.5 sm:p-3 space-y-2.5">
                                          <div className="flex items-center justify-between gap-2">
                                            <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Accept and pay</Label>
                                            <span className="text-xs font-medium text-foreground">{formatMoney(charge.amount, charge.currency)}</span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setPayMethodByCharge((prev) => ({ ...prev, [charge.id]: "mobile_money" }))}
                                              className={`border rounded-lg px-2.5 py-2 text-left transition-all ${
                                                selectedMethod === "mobile_money"
                                                  ? "border-primary bg-primary/5"
                                                  : "border-border hover:border-primary/50"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <Smartphone className="w-4 h-4 text-foreground shrink-0" />
                                                <div className="min-w-0">
                                                  <p className="font-medium text-sm truncate">Mobile</p>
                                                  <p className="text-[11px] text-muted-foreground truncate">Wallet</p>
                                                </div>
                                              </div>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => setPayMethodByCharge((prev) => ({ ...prev, [charge.id]: "card" }))}
                                              className={`border rounded-lg px-2.5 py-2 text-left transition-all ${
                                                selectedMethod === "card"
                                                  ? "border-primary bg-primary/5"
                                                  : "border-border hover:border-primary/50"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-foreground shrink-0" />
                                                <div className="min-w-0">
                                                  <p className="font-medium text-sm truncate">Card</p>
                                                  <p className="text-[11px] text-muted-foreground truncate">Checkout</p>
                                                </div>
                                              </div>
                                            </button>
                                          </div>

                                          {selectedMethod === "mobile_money" && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              <select
                                                value={mobileProviderByCharge[charge.id] || "MTN"}
                                                onChange={(event) => {
                                                  const next = event.target.value;
                                                  setMobileProviderByCharge((prev) => ({ ...prev, [charge.id]: next }));
                                                }}
                                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                              >
                                                {mobileProviders.map((provider) => (
                                                  <option key={provider.value} value={provider.value}>
                                                    {provider.label}
                                                  </option>
                                                ))}
                                              </select>

                                              <Input
                                                value={mobilePhoneByCharge[charge.id] || ""}
                                                onChange={(event) => {
                                                  const next = event.target.value;
                                                  setMobilePhoneByCharge((prev) => ({ ...prev, [charge.id]: next }));
                                                }}
                                                placeholder="Phone number"
                                              />
                                            </div>
                                          )}

                                          <Button
                                            type="button"
                                            onClick={() => void payDisputedCharge(linkedDispute, charge)}
                                            disabled={processingChargeId === charge.id || respondingDisputeId === linkedDispute.id}
                                            className="h-10 w-full"
                                          >
                                            {selectedMethod === "mobile_money" ? (
                                              <Smartphone className="w-4 h-4 mr-2" />
                                            ) : (
                                              <CreditCard className="w-4 h-4 mr-2" />
                                            )}
                                            {processingChargeId === charge.id ? "Processing..." : "Pay and close dispute"}
                                          </Button>
                                        </div>
                                      )}

                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => openDisputeAppeal(linkedDispute.id)}
                                          disabled={respondingDisputeId === linkedDispute.id || processingChargeId === charge.id}
                                          className="h-10 sm:flex-1"
                                        >
                                          Still appeal
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => void closeDispute(linkedDispute.id)}
                                          disabled={respondingDisputeId === linkedDispute.id || processingChargeId === charge.id}
                                          className="h-10 sm:flex-1"
                                        >
                                          {respondingDisputeId === linkedDispute.id ? "Saving..." : "Close dispute"}
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {charge.status === "pending" && (
                                    <div className="rounded-lg border border-border p-2.5 sm:p-3 space-y-2.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Quick pay</Label>
                                        <span className="text-xs font-medium text-foreground">{formatMoney(charge.amount, charge.currency)}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setPayMethodByCharge((prev) => ({ ...prev, [charge.id]: "mobile_money" }))}
                                          className={`border rounded-lg px-2.5 py-2 text-left transition-all ${
                                            selectedMethod === "mobile_money"
                                              ? "border-primary bg-primary/5"
                                              : "border-border hover:border-primary/50"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Smartphone className="w-4 h-4 text-foreground shrink-0" />
                                            <div className="min-w-0">
                                              <p className="font-medium text-sm truncate">Mobile</p>
                                              <p className="text-[11px] text-muted-foreground truncate">Wallet</p>
                                            </div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setPayMethodByCharge((prev) => ({ ...prev, [charge.id]: "card" }))}
                                          className={`border rounded-lg px-2.5 py-2 text-left transition-all ${
                                            selectedMethod === "card"
                                              ? "border-primary bg-primary/5"
                                              : "border-border hover:border-primary/50"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-foreground shrink-0" />
                                            <div className="min-w-0">
                                              <p className="font-medium text-sm truncate">Card</p>
                                              <p className="text-[11px] text-muted-foreground truncate">Checkout</p>
                                            </div>
                                          </div>
                                        </button>
                                      </div>

                                      {selectedMethod === "mobile_money" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <select
                                            value={mobileProviderByCharge[charge.id] || "MTN"}
                                            onChange={(event) => {
                                              const next = event.target.value;
                                              setMobileProviderByCharge((prev) => ({ ...prev, [charge.id]: next }));
                                            }}
                                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                          >
                                            {mobileProviders.map((provider) => (
                                              <option key={provider.value} value={provider.value}>
                                                {provider.label}
                                              </option>
                                            ))}
                                          </select>

                                          <Input
                                            value={mobilePhoneByCharge[charge.id] || ""}
                                            onChange={(event) => {
                                              const next = event.target.value;
                                              setMobilePhoneByCharge((prev) => ({ ...prev, [charge.id]: next }));
                                            }}
                                            placeholder="Phone number"
                                          />
                                        </div>
                                      )}

                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                          type="button"
                                          onClick={() => void handlePayCharge(charge)}
                                          disabled={processingChargeId === charge.id}
                                          className="h-10 sm:flex-1"
                                        >
                                          {selectedMethod === "mobile_money" ? (
                                            <Smartphone className="w-4 h-4 mr-2" />
                                          ) : (
                                            <CreditCard className="w-4 h-4 mr-2" />
                                          )}
                                          {processingChargeId === charge.id ? "Processing..." : "Pay now"}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => openDisputeForCharge(charge.id)} className="h-10 sm:flex-1 text-xs sm:text-sm" disabled={Boolean(linkedDispute)}>
                                          <ShieldAlert className="w-4 h-4 mr-2" />
                                          {linkedDispute ? `Dispute ${linkedDispute.status.replace(/_/g, " ")}` : "Open dispute"}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {orderModifications.length > 0 && (
                        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 sm:p-4 space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">Booking changes</p>
                              <p className="text-[11px] leading-5 text-muted-foreground">
                                Review host-requested changes, accept or reject them, and dispute any request you disagree with.
                              </p>
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                              {orderModifications.length} update{orderModifications.length > 1 ? "s" : ""}
                            </Badge>
                          </div>

                          <div className="space-y-2.5">
                            {orderModifications.map((modification) => {
                              const linkedDispute = postBookingOverview.disputes.find((dispute) => dispute.booking_modification_id === modification.id);
                              const disputeCanRespond = canGuestRespondToDispute(linkedDispute);
                              const linkedCharge = modification.charge_id ? linkedChargeMap.get(modification.charge_id) : null;
                              const difference = Number(modification.difference || 0);

                              return (
                                <div key={modification.id} className="rounded-lg border border-border bg-background p-2.5 sm:p-3 space-y-2.5">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1.5 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className={postBookingStatusTone(modification.status)}>{modification.status}</Badge>
                                        <Badge className={postBookingStatusTone(modification.payment_status)}>{modification.payment_status}</Badge>
                                        <Badge variant="outline">{humanizePostBookingLabel(modification.modification_type)}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(modification.created_at).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="text-sm font-medium text-foreground break-words">
                                        {modification.proposal_message || "Your host requested a booking update."}
                                      </p>
                                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span>Old: {formatMoney(modification.old_price, modification.currency)}</span>
                                        <span>New: {formatMoney(modification.new_price, modification.currency)}</span>
                                        <span className={difference > 0 ? "text-rose-600" : difference < 0 ? "text-emerald-600" : ""}>
                                          Difference: {difference > 0 ? "+" : ""}{formatMoney(difference, modification.currency)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {linkedDispute && (
                                    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                                      <AlertTitle>Dispute in progress</AlertTitle>
                                      <AlertDescription>
                                        This booking change already has a {linkedDispute.status.replace(/_/g, " ")} dispute.
                                      </AlertDescription>
                                    </Alert>
                                  )}

                                  {linkedDispute && disputeCanRespond && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 sm:p-3 space-y-3">
                                      <div className="space-y-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Your next step</p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                          {latestDisputeUpdate(linkedDispute) || "Review the dispute and choose what to do next."}
                                        </p>
                                      </div>

                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => openDisputeAppeal(linkedDispute.id)}
                                          disabled={respondingDisputeId === linkedDispute.id}
                                          className="h-10 sm:flex-1"
                                        >
                                          Still appeal
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => void closeDispute(linkedDispute.id)}
                                          disabled={respondingDisputeId === linkedDispute.id}
                                          className="h-10 sm:flex-1"
                                        >
                                          {respondingDisputeId === linkedDispute.id ? "Saving..." : "Close dispute"}
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {modification.status === "accepted" && modification.payment_status === "pending" && linkedCharge && (
                                    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                                      <AlertTitle>Payment required</AlertTitle>
                                      <AlertDescription>
                                        Pay the linked add-on charge of {formatMoney(linkedCharge.amount, linkedCharge.currency)} below to finalize this approved change.
                                      </AlertDescription>
                                    </Alert>
                                  )}

                                  {modification.status === "pending" && (
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                      <Button
                                        type="button"
                                        onClick={() => void handleRespondModification(modification, "accept")}
                                        disabled={respondingModificationId === modification.id}
                                        className="h-10 sm:flex-1"
                                      >
                                        {respondingModificationId === modification.id ? "Saving..." : "Accept change"}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void handleRespondModification(modification, "reject")}
                                        disabled={respondingModificationId === modification.id}
                                        className="h-10 sm:flex-1"
                                      >
                                        Reject change
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => openDisputeForModification(modification.id)}
                                        className="h-10 sm:flex-1 text-xs sm:text-sm"
                                        disabled={Boolean(linkedDispute)}
                                      >
                                        <ShieldAlert className="w-4 h-4 mr-2" />
                                        {linkedDispute ? `Dispute ${linkedDispute.status.replace(/_/g, " ")}` : "Open dispute"}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  <details
                    className="border-t border-border"
                    open={Boolean(expandedOrderDetails[orderId])}
                    onToggle={(event) => {
                      const nextOpen = event.currentTarget.open;
                      setExpandedOrderDetails((prev) => ({ ...prev, [orderId]: nextOpen }));
                    }}
                  >
                    <summary className="cursor-pointer list-none px-5 py-3 text-sm font-medium text-foreground">
                      More details
                    </summary>

                    <div className="p-5 space-y-5">
                      {confirmationUi.alertTitle && (
                        <Alert className={confirmationUi.alertClass}>
                          <AlertTitle>{confirmationUi.alertTitle}</AlertTitle>
                          <AlertDescription>{confirmationUi.alertMessage}</AlertDescription>
                        </Alert>
                      )}

                    {orderBookings.map((booking, idx) => {
                      const bookingType = booking.booking_type || 'property';
                      const isTour = bookingType === 'tour';
                      const isTransport = bookingType === 'transport';
                      const nights = Math.max(
                        1,
                        Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24))
                      );
                      const serviceLabel = isTour ? 'Tour' : isTransport ? 'Transport' : 'Stay';
                      const bookingHasEnded = isCheckoutInPast(booking.check_out);
                      const bookingStatusLabel = booking.status === "confirmed" && bookingHasEnded
                        ? "completed"
                        : booking.status;
                      const unitPricingText = (() => {
                        if (!isTour && !isTransport && booking.properties?.price_per_night) {
                          return `${formatMoney(Number(booking.properties.price_per_night), booking.properties.currency || booking.currency || 'USD')} × ${nights} night${nights > 1 ? 's' : ''}`;
                        }
                        if (isTour && booking.tour_packages?.price_per_person) {
                          return `${formatMoney(Number(booking.tour_packages.price_per_person), booking.tour_packages.currency || booking.currency || 'USD')} × ${booking.guests} guest${booking.guests > 1 ? 's' : ''}`;
                        }
                        if (isTransport && booking.transport_vehicles?.seats) {
                          return `${booking.transport_vehicles.vehicle_type} • up to ${booking.transport_vehicles.seats} seats`;
                        }
                        return null;
                      })();
                      
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
                        if (isTour) return <MapPin className="w-4 h-4" />;
                        if (isTransport) return <Users className="w-4 h-4" />;
                        return <Calendar className="w-4 h-4" />;
                      };

                      const cancellationPolicy = getCancellationPolicy(booking);
                      const estimatedRefund = getEstimatedRefund(booking);
                      const bookingCurrency = booking.booking_type === "property" && booking.properties?.currency
                        ? booking.properties.currency
                        : booking.booking_type === "tour" && booking.tour_packages?.currency
                          ? booking.tour_packages.currency
                          : String(booking.currency || "USD");
                      
                      return (
                        <div key={booking.id} className={`rounded-xl border border-border bg-background p-4 ${idx > 0 ? 'mt-3' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-md border border-border bg-muted/40 flex items-center justify-center flex-shrink-0 mt-0.5 text-muted-foreground">{getIcon()}</div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-foreground truncate">{getTitle()}</h4>
                                  <Badge variant="secondary" className="text-[11px]">{serviceLabel}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {getLocation() || 'Location unavailable'}
                                </p>
                                <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                                  <p>ID: {booking.id}</p>
                                  {booking.order_id && <p>Order: {booking.order_id}</p>}
                                  {!isTour && !isTransport && booking.properties?.address && (booking.status === "confirmed" || booking.status === "completed") && (
                                    <p>Address: {booking.properties.address}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-foreground text-base">
                                {(() => {
                                  const amt = Number(booking.checkout_requests?.total_amount || booking.total_price);
                                  const fromCur = booking.booking_type === "property" && booking.properties?.currency
                                    ? (booking.checkout_requests?.currency || booking.properties.currency)
                                    : booking.booking_type === "tour" && booking.tour_packages?.currency
                                      ? (booking.checkout_requests?.currency || booking.tour_packages.currency)
                                      : String(booking.checkout_requests?.currency || booking.currency || "USD");
                                  const converted = convertAmount(amt, fromCur, currency, usdRates);
                                  return formatMoney(converted ?? amt, converted !== null ? currency : fromCur);
                                })()}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">Individual total (gross)</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                            <div className="rounded-md border border-border bg-muted/20 p-2.5">
                              <p className="text-muted-foreground">Dates</p>
                              <p className="font-medium">{new Date(booking.check_in).toLocaleDateString()} → {new Date(booking.check_out).toLocaleDateString()}</p>
                            </div>
                            <div className="rounded-md border border-border bg-muted/20 p-2.5">
                              <p className="text-muted-foreground">Guests</p>
                              <p className="font-medium">{booking.guests}</p>
                            </div>
                            <div className="rounded-md border border-border bg-muted/20 p-2.5">
                              <p className="text-muted-foreground">Status</p>
                              <p className="font-medium capitalize">{bookingStatusLabel}</p>
                            </div>
                            <div className="rounded-md border border-border bg-muted/20 p-2.5">
                              <p className="text-muted-foreground">Pricing</p>
                              <p className="font-medium">{unitPricingText || 'Fixed package price'}</p>
                            </div>
                          </div>

                          {booking.status === "cancelled" && (
                            <div className="mt-3 rounded-md border border-amber-300/70 bg-amber-50/70 dark:bg-amber-950/20 p-3">
                              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Cancellation Policy</p>
                              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 whitespace-pre-line">
                                {getPolicyDescription(cancellationPolicy)}
                              </p>
                              {booking.payment_status === "paid" && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                                    Estimated refund: {formatMoney(estimatedRefund.refundAmount, bookingCurrency)} ({estimatedRefund.refundPercentage}%)
                                  </p>
                                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                    Applied rule: {estimatedRefund.ruleExplanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Booking Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t">
                      <div className="rounded-md border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Check-in</p>
                        <p className="font-medium text-sm">{new Date(firstBooking.check_in).toLocaleDateString()}</p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Check-out</p>
                        <p className="font-medium text-sm">{new Date(firstBooking.check_out).toLocaleDateString()}</p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Guests</p>
                        <p className="font-medium text-sm flex items-center gap-1">
                          <Users className="w-4 h-4" /> {firstBooking.guests}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-4">
                      {(firstBooking.status === "pending" || (firstBooking.status === "confirmed" && !orderHasEnded)) && (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={() => openDateChangeDialog(firstBooking)} className="flex-1 min-w-[170px]">
                            <CalendarClock className="w-4 h-4 mr-2" /> Change Dates
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => openCancelDialog(firstBooking)} className="flex-1 min-w-[140px]">
                            <XCircle className="w-4 h-4 mr-2" /> Cancel
                          </Button>
                        </>
                      )}

                      {firstBooking.status === "cancelled" && firstBooking.payment_status === "paid" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="flex-1 min-w-[170px]"
                          disabled={requestingRefundKey === orderId || hasSubmittedRefundRequest}
                          onClick={() => submitRefundRequest(orderId, orderBookings)}
                        >
                          {hasSubmittedRefundRequest
                            ? "Refund requested"
                            : requestingRefundKey === orderId
                              ? "Submitting..."
                              : "Ask for Refund"}
                        </Button>
                      )}
                    </div>

                    <details
                      className="border-t border-border pt-4"
                      open={Boolean(expandedAdvancedDetails[orderId])}
                      onToggle={(event) => {
                        const nextOpen = event.currentTarget.open;
                        setExpandedAdvancedDetails((prev) => ({ ...prev, [orderId]: nextOpen }));
                      }}
                    >
                      <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground hover:text-foreground">
                        Advanced details
                      </summary>

                      <div className="mt-4 space-y-4">
                        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="text-lg font-bold text-primary">
                              {(() => {
                                const converted = convertAmount(grandTotal, listingCurrency, currency, usdRates);
                                return formatMoney(converted ?? grandTotal, converted !== null ? currency : listingCurrency);
                              })()}
                            </span>
                          </div>
                          {totalPaid > 0 && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Amount Paid</span>
                                <span className="text-sm font-semibold text-foreground">
                                  {(() => {
                                    const converted = convertAmount(totalPaid, paidCurrency, currency, usdRates);
                                    return formatMoney(converted ?? totalPaid, converted !== null ? currency : paidCurrency);
                                  })()}
                                </span>
                              </div>
                              {pendingOrderCharges.length > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Pending add-ons</span>
                                  <span className="text-sm font-semibold text-rose-600">{orderChargeSummary}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Net After PawaPay</span>
                                <span className="text-sm font-semibold text-foreground">
                                  {(() => {
                                    const net = calculatePawaPayProcessing(totalPaid).netAmount;
                                    const converted = convertAmount(net, paidCurrency, currency, usdRates);
                                    return formatMoney(converted ?? net, converted !== null ? currency : paidCurrency);
                                  })()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {(firstBooking.status === "confirmed" || firstBooking.status === "completed") && firstBooking.host_profile && (
                          <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="text-xs font-semibold text-foreground mb-2">Host Contact</p>
                            <div className="space-y-2">
                              {(firstBooking.host_profile.nickname || firstBooking.host_profile.full_name) && (
                                <p className="text-sm font-medium">{firstBooking.host_profile.nickname || firstBooking.host_profile.full_name}</p>
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
                      </div>
                    </details>

                    </div>
                  </details>
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
                type="button"
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
                type="button"
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
            <div>
              <Label htmlFor="reviewer-name" className="text-sm font-medium mb-2 block">Your Name</Label>
              <Input
                id="reviewer-name"
                value={reviewerName}
                onChange={(e) => {
                  setReviewerName(e.target.value);
                  setReviewNameError(false);
                }}
                placeholder="Enter your name"
                maxLength={80}
              />
              {reviewNameError && (
                <p className="text-sm text-red-600 mt-1">Name is required</p>
              )}
            </div>

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
                type="button"
                variant="outline" 
                onClick={() => {
                  setReviewOpen(false);
                  setReviewComment("");
                  setReviewRating(5);
                  setReviewerName("");
                  setReviewValidationError(false);
                  setReviewNameError(false);
                }} 
                disabled={submittingReview}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="button"
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

      <Dialog open={disputeDialog.open} onOpenChange={(open) => setDisputeDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Open Dispute</DialogTitle>
            <DialogDescription>
              Share what went wrong and the resolution team will review this charge or booking change.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                placeholder="Example: The amount is incorrect"
              />
            </div>

            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={disputeDetails}
                onChange={(event) => setDisputeDetails(event.target.value)}
                placeholder="Add context, timeline, and any evidence summary"
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisputeDialog({ open: false, chargeId: null, modificationId: null })}
                disabled={submittingDispute}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitDispute()} disabled={submittingDispute} className="flex-1">
                {submittingDispute ? "Submitting..." : "Submit Dispute"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeReplyDialog.open} onOpenChange={(open) => {
        if (!open) closeDisputeReplyDialog();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Continue Dispute</DialogTitle>
            <DialogDescription>
              Tell the host why you still want the dispute reviewed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Why are you still appealing?</Label>
              <Textarea
                value={disputeReplyMessage}
                onChange={(event) => setDisputeReplyMessage(event.target.value)}
                placeholder="Explain what is still unresolved or what part of the host response you disagree with"
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDisputeReplyDialog}
                disabled={respondingDisputeId === disputeReplyDialog.disputeId}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submitDisputeAppeal()}
                disabled={respondingDisputeId === disputeReplyDialog.disputeId}
                className="flex-1"
              >
                {respondingDisputeId === disputeReplyDialog.disputeId ? "Sending..." : "Send appeal"}
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
