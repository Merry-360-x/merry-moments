import { useMemo, useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, CreditCard, Wallet, Calendar, Download, CheckCircle, Bell, Banknote, Clock, XCircle, User, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotificationBadge, NotificationBadge } from "@/hooks/useNotificationBadge";
import { useToast } from "@/hooks/use-toast";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";

type BookingRow = {
  id: string;
  order_id: string | null;
  booking_type?: "property" | "tour" | "transport" | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  total_price: number;
  currency: string;
  created_at: string;
  properties?: { currency?: string | null } | null;
  tour_packages?: { currency?: string | null } | null;
  transport_vehicles?: { currency?: string | null } | null;
  checkout_requests?: {
    id: string;
    total_amount: number;
    currency: string | null;
    payment_status?: string | null;
    payment_method: string | null;
  } | null;
};

type Metrics = {
  bookings_total: number;
  bookings_pending: number;
  bookings_confirmed: number;
  bookings_paid: number;
  bookings_cancelled: number;
  revenue_gross: number;
  revenue_by_currency: Array<{ currency: string; amount: number }>;
};

type SupportTicketRow = {
  id: string;
  subject: string;
  message: string;
  status: string;
};

export default function FinancialStaffDashboard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { usdRates } = useFxRates();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "bookings" | "revenue" | "payouts">("overview");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [requestingPayment, setRequestingPayment] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [bookingIdSearch, setBookingIdSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);
  const [processingRefundBooking, setProcessingRefundBooking] = useState<string | null>(null);
  const [payoutFilter, setPayoutFilter] = useState<string>("pending");
  const dashboardCurrency = "RWF";

  // Notification badge hook
  const { getCount, hasNew, markAsSeen, updateNotificationCount } = useNotificationBadge("financial-staff");

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('financial-bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        console.log('[FinancialStaff] Bookings change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['financial_bookings'] });
        queryClient.invalidateQueries({ queryKey: ['financial_metrics'] });
      })
      .subscribe();
    channels.push(bookingsChannel);

    // Subscribe to checkout_requests for payment tracking
    const checkoutChannel = supabase
      .channel('financial-checkout-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkout_requests' }, () => {
        console.log('[FinancialStaff] Checkout request change detected');
        queryClient.invalidateQueries({ queryKey: ['financial_bookings'] });
        queryClient.invalidateQueries({ queryKey: ['financial_metrics'] });
      })
      .subscribe();
    channels.push(checkoutChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, queryClient]);

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["financial_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_staff_dashboard_metrics");
      if (error) {
        console.error("Error fetching metrics:", error);
        // Return default values if function doesn't exist yet
        return {
          bookings_total: 0,
          bookings_pending: 0,
          bookings_confirmed: 0,
          bookings_paid: 0,
          bookings_cancelled: 0,
          revenue_gross: 0,
          revenue_by_currency: []
        } as Metrics;
      }
      return data as unknown as Metrics;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ["financial_bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, guest_id, guest_name, guest_email, guest_phone, status, payment_status, 
          payment_method, total_price, currency, created_at, updated_at, 
          booking_type, property_id, tour_id, transport_id, order_id,
          properties(currency),
          tour_packages(currency),
          transport_vehicles(currency)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[FinancialStaff] Bookings error:', error);
        throw error;
      }
      
      // Fetch checkout_requests separately (no FK constraint)
      const orderIds = [...new Set((data ?? []).filter(b => b.order_id).map(b => b.order_id))];
      const checkouts = orderIds.length > 0
        ? (await supabase.from("checkout_requests").select("id, total_amount, currency, payment_status, payment_method").in("id", orderIds)).data || []
        : [];
      
      return (data ?? []).map(b => ({
        ...b,
        checkout_requests: b.order_id ? checkouts.find(c => c.id === b.order_id) || null : null
      })) as BookingRow[];
    },
    staleTime: 30000, // Cache for 30 seconds - real-time handles updates
  });

  const { data: tickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ["financial-support-tickets-refunds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, message, status")
        .order("created_at", { ascending: false })
        .limit(400);

      if (error) {
        if (error.message?.includes("does not exist") || error.code === "42P01" || error.code === "PGRST204") {
          return [];
        }
        throw error;
      }

      return (data ?? []) as SupportTicketRow[];
    },
    staleTime: 30000,
  });

  const extractRefundRefs = (ticket: SupportTicketRow): string[] => {
    const refs = new Set<string>();
    const bookingIdPattern = /-\s*Booking\s+([^:\s]+)\s*:/gi;
    const subjectMatch = String(ticket.subject || "").match(/refund request for booking\s+(.+)$/i);
    if (subjectMatch?.[1]) {
      refs.add(subjectMatch[1].trim().toLowerCase());
    }

    const message = String(ticket.message || "");
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

    return Array.from(refs);
  };

  const refundRequestRefs = useMemo(() => {
    const refs = new Set<string>();

    tickets.forEach((ticket) => {
      const status = String(ticket.status || "").toLowerCase();
      if (status === "closed" || status === "resolved") return;
      extractRefundRefs(ticket).forEach((ref) => refs.add(ref));
    });

    return refs;
  }, [tickets]);

  const findOpenRefundTicket = (booking: BookingRow) => {
    const bookingRef = String(booking.id || "").toLowerCase();
    const orderRef = String(booking.order_id || "").toLowerCase();

    return (
      tickets.find((ticket) => {
        const status = String(ticket.status || "").toLowerCase();
        if (status === "closed" || status === "resolved") return false;
        const refs = extractRefundRefs(ticket);
        return refs.includes(bookingRef) || (!!orderRef && refs.includes(orderRef));
      }) || null
    );
  };

  const handleRefundDecision = async (booking: BookingRow, decision: "approve" | "decline") => {
    const targetKey = `${booking.id}:${decision}`;
    setProcessingRefundBooking(targetKey);

    try {
      const bookingUpdate =
        decision === "approve"
          ? {
              payment_status: "refunded",
              status: "cancelled",
              updated_at: new Date().toISOString(),
            }
          : {
              payment_status: "paid",
              status: "confirmed",
              updated_at: new Date().toISOString(),
            };

      const bookingQuery = supabase.from("bookings").update(bookingUpdate as never);
      const bookingResult = booking.order_id
        ? await bookingQuery.eq("order_id", booking.order_id)
        : await bookingQuery.eq("id", booking.id);

      if (bookingResult.error) throw bookingResult.error;

      const ticket = findOpenRefundTicket(booking);
      if (ticket) {
        const response =
          decision === "approve"
            ? "Finance: Refund approved and completed."
            : "Finance: Refund declined. Booking reactivated.";

        const { error: ticketError } = await supabase
          .from("support_tickets")
          .update({
            status: "resolved",
            response,
          } as never)
          .eq("id", ticket.id);

        if (ticketError) {
          console.error("Failed to update refund ticket status:", ticketError);
        }
      }

      toast({
        title: decision === "approve" ? "Refund completed" : "Refund declined",
        description:
          decision === "approve"
            ? "Refund marked as completed and booking remains cancelled."
            : "Refund declined and booking restored to confirmed/paid.",
      });

      await Promise.all([refetchBookings(), refetchTickets(), refetchMetrics()]);
    } catch (error) {
      console.error("Error processing refund decision:", error);
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error instanceof Error ? error.message : "Failed to update refund status.",
      });
    } finally {
      setProcessingRefundBooking(null);
    }
  };

  const markAsPaid = async (bookingId: string) => {
    setMarkingPaid(bookingId);
    try {
      const booking = bookings.find((entry) => entry.id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const bookingUpdate = supabase
        .from("bookings")
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() } as never);

      const { error } = booking.order_id
        ? await bookingUpdate.eq("order_id", booking.order_id)
        : await bookingUpdate.eq("id", bookingId);

      if (error) throw error;

      if (booking.order_id) {
        const { error: checkoutError } = await supabase
          .from("checkout_requests")
          .update({ payment_status: 'paid', updated_at: new Date().toISOString() } as never)
          .eq("id", booking.order_id);

        if (checkoutError) throw checkoutError;
      }

      fetch("/api/booking-confirmation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "host_payment_status",
          bookingId,
          paymentStatus: "paid",
          source: "financial_staff_mark_paid",
        }),
      }).catch(() => null);

      toast({
        title: "Payment confirmed",
        description: "Booking marked as paid.",
      });

      // Refetch data
      refetchBookings();
      refetchMetrics();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark booking as paid. Please try again.",
      });
    } finally {
      setMarkingPaid(null);
    }
  };

  const requestPayment = async (bookingId: string, guestEmail: string, guestName: string) => {
    setRequestingPayment(bookingId);
    try {
      const booking = bookings.find((entry) => entry.id === bookingId);
      if (!booking) throw new Error("Booking not found");

      // Update booking to indicate payment was requested
      const bookingUpdate = supabase
        .from("bookings")
        .update({ 
          payment_status: 'requested',
          updated_at: new Date().toISOString()
        } as never);

      const { error } = booking.order_id
        ? await bookingUpdate.eq("order_id", booking.order_id)
        : await bookingUpdate.eq("id", bookingId);

      if (error) throw error;

      if (booking.order_id) {
        const { error: checkoutError } = await supabase
          .from("checkout_requests")
          .update({ payment_status: 'requested', updated_at: new Date().toISOString() } as never)
          .eq("id", booking.order_id);

        if (checkoutError) throw checkoutError;
      }

      fetch("/api/booking-confirmation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "host_payment_status",
          bookingId,
          paymentStatus: "requested",
          source: "financial_staff_request_payment",
        }),
      }).catch(() => null);

      // In a real implementation, you would send an email here
      // For now, we'll just show a toast
      toast({
        title: "Payment Request Sent",
        description: `Payment request sent to ${guestName} at ${guestEmail}`,
      });

      refetchBookings();
      refetchMetrics();
    } catch (error) {
      console.error("Error requesting payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to request payment. Please try again.",
      });
    } finally {
      setRequestingPayment(null);
    }
  };

  // Fetch host payouts
  const { data: payouts = [], refetch: refetchPayouts } = useQuery({
    queryKey: ["host_payouts", payoutFilter],
    queryFn: async () => {
      let query = supabase
        .from("host_payouts")
        .select(`
          *,
          profiles:host_id (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (payoutFilter !== "all") {
        query = query.eq("status", payoutFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching payouts:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 30000,
  });

  // Process payout (approve/reject)
  const processPayout = async (payoutId: string, action: "completed" | "rejected", notes?: string) => {
    setProcessingPayout(payoutId);
    try {
      if (action === "completed") {
        // Fetch payout details
        const { data: payout, error: payoutError } = await supabase
          .from("host_payouts")
          .select("*")
          .eq("id", payoutId)
          .single();

        if (payoutError) throw payoutError;

        if (payout.payout_method === "mobile_money") {
          const phone = payout.payout_details?.phone;
          const provider = payout.payout_details?.provider || payout.payout_details?.mobile_provider || "MTN";

          if (!phone) {
            throw new Error("Missing phone number for mobile money payout");
          }

          const pawapayResponse = await fetch("/api/pawapay-payout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Math.round(Number(payout.amount || 0)),
              currency: payout.currency || "RWF",
              phoneNumber: phone,
              provider,
              payoutId,
              hostId: payout.host_id,
            }),
          });

          const pawapayResult = await pawapayResponse.json().catch(() => ({}));
          if (!pawapayResponse.ok) {
            throw new Error(pawapayResult?.error || "Failed to send payout via PawaPay");
          }

          const { error } = await supabase
            .from("host_payouts")
            .update({
              status: "completed",
              admin_notes: notes || "Sent via PawaPay",
              processed_by: user?.id,
              processed_at: new Date().toISOString(),
              pawapay_payout_id: pawapayResult?.pawapayPayoutId || pawapayResult?.payoutId || null,
            })
            .eq("id", payoutId);

          if (error) throw error;

          toast({
            title: "Payout Sent",
            description: `Payment of ${payout.amount} ${payout.currency || "RWF"} sent to ${phone} via PawaPay.`,
          });

          refetchPayouts();
          setProcessingPayout(null);
          return;
        }
      }

      // For rejections or non-mobile-money payouts
      const { error } = await supabase
        .from("host_payouts")
        .update({
          status: action,
          admin_notes: notes || null,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (error) throw error;

      toast({
        title: action === "completed" ? "Payout Completed" : "Payout Rejected",
        description: action === "completed" 
          ? "The payout has been processed successfully." 
          : "The payout request has been rejected.",
      });

      refetchPayouts();
    } catch (error) {
      console.error("Error processing payout:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process payout. Please try again.",
      });
    } finally {
      setProcessingPayout(null);
    }
  };

  // Subscribe to payouts changes
  useEffect(() => {
    if (!user) return;

    const payoutsChannel = supabase
      .channel('financial-payouts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_payouts' }, () => {
        console.log('[FinancialStaff] Payouts change detected');
        queryClient.invalidateQueries({ queryKey: ['host_payouts'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(payoutsChannel);
    };
  }, [user, queryClient]);

  // Checkout requests removed - bulk bookings now handled through regular bookings with order_id

  const convertToDashboardCurrency = useCallback((amount: number, fromCurrency?: string | null) => {
    const sourceCurrency = String(fromCurrency || dashboardCurrency).toUpperCase();
    if (!Number.isFinite(amount)) return 0;
    if (sourceCurrency === dashboardCurrency) return amount;
    return convertAmount(amount, sourceCurrency, dashboardCurrency, usdRates) ?? amount;
  }, [dashboardCurrency, usdRates]);

  const getBookingDisplayAmount = useCallback((booking: BookingRow) => {
    const checkoutAmount = Number(booking.checkout_requests?.total_amount || 0);
    const checkoutCurrency = booking.checkout_requests?.currency || null;
    if (checkoutAmount > 0) {
      return convertToDashboardCurrency(checkoutAmount, checkoutCurrency);
    }
    return convertToDashboardCurrency(Number(booking.total_price || 0), booking.currency);
  }, [convertToDashboardCurrency]);

  const revenueDisplay = useMemo(() => {
    const list = metrics?.revenue_by_currency ?? [];
    if (list.length === 0) return "No revenue yet";
    const totalInDashboardCurrency = list.reduce((sum, item) => {
      return sum + convertToDashboardCurrency(Number(item.amount || 0), String(item.currency || dashboardCurrency));
    }, 0);
    return formatMoney(totalInDashboardCurrency, dashboardCurrency);
  }, [metrics?.revenue_by_currency, dashboardCurrency, usdRates]);

  const isPendingBookingStatus = (status: string | null | undefined) =>
    status === 'pending' || status === 'pending_confirmation';

  // Filter bookings by date range
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (bookingStatusFilter === 'refund_requested') {
        const bookingId = String(b.id || '').toLowerCase();
        const orderId = String(b.order_id || '').toLowerCase();
        const isRefundRequested = refundRequestRefs.has(bookingId) || (orderId && refundRequestRefs.has(orderId));
        if (!isRefundRequested) return false;
      } else if (bookingStatusFilter === 'pending' && !isPendingBookingStatus(b.status)) {
        return false;
      } else if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) {
        return false;
      }

      const query = bookingIdSearch.trim().toLowerCase();
      const bookingId = String(b.id || "").toLowerCase();
      const orderId = String(b.order_id || "").toLowerCase();

      if (query && !bookingId.includes(query) && !orderId.includes(query)) {
        return false;
      }

      if (!startDate && !endDate) return true;
      const bookingDate = new Date(b.created_at);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999); // Include full end date
      return bookingDate >= start && bookingDate <= end;
    });
  }, [bookings, startDate, endDate, bookingIdSearch, bookingStatusFilter, refundRequestRefs]);

  const refundRequestedCount = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingId = String(booking.id || '').toLowerCase();
      const orderId = String(booking.order_id || '').toLowerCase();
      return refundRequestRefs.has(bookingId) || (orderId && refundRequestRefs.has(orderId));
    }).length;
  }, [bookings, refundRequestRefs]);

  const completedBookings = filteredBookings.filter(b => b.status === 'completed' || b.status === 'confirmed');
  const pendingBookings = filteredBookings.filter(b => isPendingBookingStatus(b.status));

  const filteredRevenue = useMemo(() => {
    return completedBookings.reduce((sum, b) => sum + getBookingDisplayAmount(b), 0);
  }, [completedBookings, dashboardCurrency, usdRates]);

  const exportReport = () => {
    const csvContent = [
      ['Date', 'Booking ID', 'Status', 'Amount', 'Currency'].join(','),
      ...filteredBookings.map(b => [
        new Date(b.created_at).toLocaleDateString(),
        b.id,
        b.status,
        b.total_price,
        b.currency
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${startDate || 'all'}-to-${endDate || 'now'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Financial Dashboard</h1>
          <p className="text-muted-foreground">Revenue, bookings, and financial metrics</p>
        </div>

        {/* Date Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Financial Report Filter
            </CardTitle>
            <CardDescription>Filter bookings and revenue by date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                >
                  Clear
                </Button>
                <Button onClick={exportReport} disabled={filteredBookings.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            {(startDate || endDate) && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">
                  Showing {filteredBookings.length} bookings | 
                  Filtered Revenue: {formatMoney(filteredRevenue, dashboardCurrency)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenueDisplay}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.bookings_total ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Bookings</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.bookings_paid ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully paid</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.bookings_pending ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">
              All Bookings
              {bookings.filter(b => b.payment_status !== 'paid' && b.status === 'confirmed').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full">
                  {bookings.filter(b => b.payment_status !== 'paid' && b.status === 'confirmed').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payouts">
              <Banknote className="w-4 h-4 mr-1" />
              Host Payouts
              {payouts.filter(p => p.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full">
                  {payouts.filter(p => p.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="revenue">Revenue by Currency</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Paid Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Paid Bookings</CardTitle>
                  <CardDescription>Latest successful payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedBookings.slice(0, 5).map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="text-sm">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatMoney(getBookingDisplayAmount(booking), dashboardCurrency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{booking.status === 'completed' ? 'Completed' : 'Confirmed'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {completedBookings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No completed bookings yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Pending Payments */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Payments</CardTitle>
                  <CardDescription>Awaiting confirmation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingBookings.slice(0, 5).map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="text-sm">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatMoney(getBookingDisplayAmount(booking), dashboardCurrency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">Pending</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pendingBookings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No pending payments
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <CardTitle>All Bookings</CardTitle>
                    <CardDescription>
                      Complete booking history • Refund Requested: {refundRequestedCount}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Input
                      value={bookingIdSearch}
                      onChange={(e) => setBookingIdSearch(e.target.value)}
                      placeholder="Search Booking ID / Order ID"
                      className="w-full md:w-72"
                    />
                    <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refund_requested">Refund Requested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Guest Info</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        {(() => {
                          const isRefundRequested =
                            refundRequestRefs.has(String(booking.id || '').toLowerCase()) ||
                            (booking.order_id && refundRequestRefs.has(String(booking.order_id).toLowerCase()));
                          const isApproveLoading = processingRefundBooking === `${booking.id}:approve`;
                          const isDeclineLoading = processingRefundBooking === `${booking.id}:decline`;

                          return (
                            <>
                        <TableCell className="text-xs">
                          <div className="space-y-1">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Booking</p>
                              <p className="font-mono break-all leading-4">{booking.id}</p>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Order</p>
                              {booking.order_id ? (
                                <p className="font-mono break-all leading-4">{booking.order_id}</p>
                              ) : (
                                <span className="text-muted-foreground">Single booking</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{booking.guest_name || 'Guest'}</div>
                            <div className="text-xs text-muted-foreground">{booking.guest_email || 'N/A'}</div>
                            {booking.guest_phone && (
                              <div className="text-xs text-muted-foreground">{booking.guest_phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">
                          {formatMoney(getBookingDisplayAmount(booking), dashboardCurrency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {booking.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : isPendingBookingStatus(booking.status)
                                ? "secondary"
                                : booking.status === "cancelled"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {isPendingBookingStatus(booking.status) ? 'pending' : booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isRefundRequested && (
                            <Badge className="bg-amber-100 text-amber-800 mb-1">Refund Requested</Badge>
                          )}
                          <Badge
                            variant={
                              booking.payment_status === "paid"
                                ? "default"
                                : booking.payment_status === "pending"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {booking.payment_status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setBookingDetailsOpen(true);
                              }}
                            >
                              <Download className="w-4 h-4" />
                              Details
                            </Button>
                            {/* Admin or Financial Staff can request payment */}
                            {(isAdmin || true) && booking.status === 'confirmed' && booking.payment_status === 'pending' && (
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1"
                                onClick={() => requestPayment(booking.id, booking.guest_email || '', booking.guest_name || 'Guest')}
                                disabled={requestingPayment === booking.id}
                              >
                                <DollarSign className="w-4 h-4" />
                                {requestingPayment === booking.id ? 'Requesting...' : 'Request Payment'}
                              </Button>
                            )}
                            {/* Refund button for cancelled paid bookings */}
                            {/* Admin or Financial Staff can mark as paid */}
                            {(isAdmin || true) && booking.status === 'confirmed' && (booking.payment_status === 'requested' || booking.payment_status === 'pending') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => markAsPaid(booking.id)}
                                disabled={markingPaid === booking.id}
                              >
                                <CheckCircle className="w-4 w-4" />
                                {markingPaid === booking.id ? 'Marking...' : 'Mark Paid'}
                              </Button>
                            )}
                            {isRefundRequested && booking.status === 'cancelled' && booking.payment_status === 'paid' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleRefundDecision(booking, "approve")}
                                  disabled={isApproveLoading || isDeclineLoading}
                                >
                                  {isApproveLoading ? "Processing..." : "Complete Refund"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRefundDecision(booking, "decline")}
                                  disabled={isApproveLoading || isDeclineLoading}
                                >
                                  {isDeclineLoading ? "Processing..." : "Decline & Reactivate"}
                                </Button>
                              </>
                            )}
                            {booking.payment_status === 'paid' && (
                              <span className="text-sm text-muted-foreground">✓ Paid</span>
                            )}
                          </div>
                        </TableCell>
                            </>
                          );
                        })()}
                      </TableRow>
                    ))}
                    {filteredBookings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No bookings match this Booking ID / Order ID.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Currency</CardTitle>
                <CardDescription>Breakdown of revenue across different currencies</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(metrics?.revenue_by_currency ?? []).map((item) => (
                      <TableRow key={item.currency}>
                        <TableCell className="font-medium">{item.currency}</TableCell>
                        <TableCell className="text-right text-lg font-bold">
                          {formatMoney(convertToDashboardCurrency(Number(item.amount || 0), String(item.currency || dashboardCurrency)), dashboardCurrency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(metrics?.revenue_by_currency ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No revenue data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Host Payout Requests
                    </CardTitle>
                    <CardDescription>Manage and process host payout requests</CardDescription>
                  </div>
                  <Select value={payoutFilter} onValueChange={(v: any) => setPayoutFilter(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payouts</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>Host</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout: any) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{payout.profiles?.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{payout.profiles?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {payout.currency} {payout.amount?.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {payout.payout_method?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payout.payout_method === "mobile_money" ? (
                            <span className="text-sm">{payout.payout_details?.phone}</span>
                          ) : (
                            <div className="text-sm">
                              <p>{payout.payout_details?.bank_name}</p>
                              <p className="text-muted-foreground">{payout.payout_details?.account_number}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payout.status === "completed"
                                ? "default"
                                : payout.status === "pending"
                                ? "secondary"
                                : payout.status === "processing"
                                ? "outline"
                                : "destructive"
                            }
                            className="capitalize"
                          >
                            {payout.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {payout.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {payout.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => processPayout(payout.id, "completed")}
                                disabled={processingPayout === payout.id}
                              >
                                {processingPayout === payout.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => processPayout(payout.id, "rejected", "Rejected by finance team")}
                                disabled={processingPayout === payout.id}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {payout.status !== "pending" && (
                            <span className="text-sm text-muted-foreground">
                              {payout.processed_at && new Date(payout.processed_at).toLocaleDateString()}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payouts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No payout requests found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Booking Details Dialog */}
        <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Complete financial information for this booking
              </DialogDescription>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-6">
                {/* Booking Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Booking Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Booking ID</p>
                      <p className="font-mono text-xs break-all">{selectedBooking.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge>{selectedBooking.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <Badge variant={selectedBooking.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {selectedBooking.payment_status || 'pending'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created Date</p>
                      <p className="text-sm">{new Date(selectedBooking.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Guest Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Guest Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-sm font-medium">{selectedBooking.guest_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedBooking.guest_email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedBooking.guest_phone || 'N/A'}</p>
                    </div>
                    {selectedBooking.guest_id && (
                      <div>
                        <p className="text-sm text-muted-foreground">Guest ID</p>
                        <p className="font-mono text-xs break-all">{selectedBooking.guest_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Payment Information</h3>
                  {(() => {
                    const displayCurrency = dashboardCurrency;
                    const listingSourceCurrency =
                      selectedBooking.booking_type === "property" && selectedBooking.properties?.currency
                        ? selectedBooking.properties.currency
                        : selectedBooking.booking_type === "tour" && selectedBooking.tour_packages?.currency
                          ? selectedBooking.tour_packages.currency
                          : selectedBooking.booking_type === "transport" && selectedBooking.transport_vehicles?.currency
                            ? selectedBooking.transport_vehicles.currency
                            : String(selectedBooking.currency ?? "RWF");

                    const listingAmount = convertAmount(
                      Number(selectedBooking.total_price || 0),
                      listingSourceCurrency,
                      displayCurrency,
                      usdRates
                    );

                    const paidAmount = selectedBooking.checkout_requests
                      ? convertAmount(
                          Number(selectedBooking.checkout_requests.total_amount || 0),
                          selectedBooking.checkout_requests.currency || "RWF",
                          displayCurrency,
                          usdRates
                        )
                      : null;

                    const effectivePaymentStatus = String(
                      selectedBooking.checkout_requests?.payment_status || selectedBooking.payment_status || "pending"
                    ).toLowerCase();

                    const paymentMethodRaw = String(
                      selectedBooking.checkout_requests?.payment_method || selectedBooking.payment_method || "not_specified"
                    );
                    const paymentMethodLabel = paymentMethodRaw
                      .replace(/_/g, " ")
                      .replace(/\bmomo\b/gi, "MoMo")
                      .replace(/\bmtn\b/gi, "MTN")
                      .replace(/\bairtel\b/gi, "Airtel")
                      .replace(/\bvisa\b/gi, "Visa")
                      .replace(/\bmastercard\b/gi, "Mastercard")
                      .replace(/\bbank transfer\b/gi, "Bank Transfer")
                      .replace(/\b\w/g, (char) => char.toUpperCase());

                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Listing Price ({String(displayCurrency).toUpperCase()})</p>
                          <p className="text-lg font-bold">
                            {formatMoney(Number(listingAmount ?? selectedBooking.total_price ?? 0), displayCurrency)}
                          </p>
                        </div>
                        {selectedBooking.checkout_requests && (
                          <div>
                            <p className="text-sm text-muted-foreground">Amount Paid ({String(displayCurrency).toUpperCase()})</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatMoney(Number(paidAmount ?? selectedBooking.checkout_requests.total_amount ?? 0), displayCurrency)}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Method</p>
                          <p className="text-sm">{paymentMethodLabel || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Status</p>
                          <Badge variant={effectivePaymentStatus === 'paid' ? 'default' : 'secondary'}>
                            {effectivePaymentStatus}
                          </Badge>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Actions */}
                {selectedBooking.payment_status !== 'paid' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Available Actions</h3>
                    <div className="flex gap-2">
                      {selectedBooking.status === 'confirmed' && selectedBooking.payment_status === 'pending' && (
                        <Button
                          onClick={() => {
                            requestPayment(selectedBooking.id, selectedBooking.guest_email || '', selectedBooking.guest_name || 'Guest');
                            setBookingDetailsOpen(false);
                          }}
                          disabled={requestingPayment === selectedBooking.id}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Request Payment
                        </Button>
                      )}
                      {selectedBooking.status === 'confirmed' && (selectedBooking.payment_status === 'requested' || selectedBooking.payment_status === 'pending') && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            markAsPaid(selectedBooking.id);
                            setBookingDetailsOpen(false);
                          }}
                          disabled={markingPaid === selectedBooking.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
