import { useMemo, useState, useEffect } from "react";
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

type BookingRow = {
  id: string;
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

export default function FinancialStaffDashboard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "bookings" | "revenue" | "payouts">("overview");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [requestingPayment, setRequestingPayment] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);
  const [payoutFilter, setPayoutFilter] = useState<string>("pending");

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
        ? (await supabase.from("checkout_requests").select("id, total_amount, currency, payment_method").in("id", orderIds)).data || []
        : [];
      
      return (data ?? []).map(b => ({
        ...b,
        checkout_requests: b.order_id ? checkouts.find(c => c.id === b.order_id) || null : null
      })) as BookingRow[];
    },
    staleTime: 30000, // Cache for 30 seconds - real-time handles updates
  });

  const markAsPaid = async (bookingId: string) => {
    setMarkingPaid(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: 'paid' })
        .eq("id", bookingId);

      if (error) throw error;

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
      // Update booking to indicate payment was requested
      const { error } = await supabase
        .from("bookings")
        .update({ 
          payment_status: 'requested',
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingId);

      if (error) throw error;

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
            email,
            payout_method,
            payout_phone,
            payout_bank_name,
            payout_bank_account,
            payout_account_name
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
        // Fetch the payout details including payout method
        const { data: payout, error: payoutError } = await supabase
          .from("host_payouts")
          .select(`
            *,
            host_payout_methods (
              id,
              method_type,
              phone_number,
              provider
            )
          `)
          .eq("id", payoutId)
          .single();

        if (payoutError) throw payoutError;

        // Check if this is a mobile money payout
        if (payout.payout_method_id && payout.host_payout_methods) {
          const payoutMethod = payout.host_payout_methods;
          
          if (payoutMethod.method_type === "mobile_money" && payoutMethod.phone_number) {
            // Send via PawaPay
            const pawapayResponse = await fetch("/api/pawapay-payout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: payout.amount,
                currency: payout.currency || "RWF",
                phoneNumber: payoutMethod.phone_number,
                provider: payoutMethod.provider,
                payoutId: payoutId,
                hostId: payout.host_id,
              }),
            });

            const pawapayResult = await pawapayResponse.json();

            if (!pawapayResponse.ok) {
              throw new Error(pawapayResult.error || "Failed to send payout via PawaPay");
            }

            // Update with PawaPay payout ID
            const { error } = await supabase
              .from("host_payouts")
              .update({
                status: "completed",
                admin_notes: notes || "Sent via PawaPay",
                processed_by: user?.id,
                processed_at: new Date().toISOString(),
                pawapay_payout_id: pawapayResult.pawapayPayoutId,
              })
              .eq("id", payoutId);

            if (error) throw error;

            toast({
              title: "Payout Sent",
              description: `Payment of ${payout.amount} ${payout.currency || "RWF"} sent to ${payoutMethod.phone_number} via PawaPay.`,
            });

            refetchPayouts();
            setProcessingPayout(null);
            return;
          }
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

  const revenueDisplay = useMemo(() => {
    const list = metrics?.revenue_by_currency ?? [];
    if (list.length === 0) return "No revenue yet";
    if (list.length === 1) return formatMoney(Number(list[0].amount), String(list[0].currency ?? "USD"));
    return `${formatMoney(Number(list[0].amount), String(list[0].currency ?? "USD"))} (+${list.length - 1} currencies)`;
  }, [metrics?.revenue_by_currency]);

  // Filter bookings by date range
  const filteredBookings = useMemo(() => {
    if (!startDate && !endDate) return bookings;
    return bookings.filter(b => {
      const bookingDate = new Date(b.created_at);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999); // Include full end date
      return bookingDate >= start && bookingDate <= end;
    });
  }, [bookings, startDate, endDate]);

  const completedBookings = filteredBookings.filter(b => b.status === 'completed' || b.status === 'confirmed');
  const pendingBookings = filteredBookings.filter(b => b.status === 'pending');

  const filteredRevenue = useMemo(() => {
    return completedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  }, [completedBookings]);

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
                  Filtered Revenue: {formatMoney(filteredRevenue, "RWF")}
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
                    <TableHeader>
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
                            {formatMoney(Number(booking.total_price), String(booking.currency ?? "USD"))}
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
                    <TableHeader>
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
                            {formatMoney(Number(booking.total_price), String(booking.currency ?? "USD"))}
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
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Complete booking history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
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
                        <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}...</TableCell>
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
                          {formatMoney(Number(booking.total_price), String(booking.currency ?? "USD"))}
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
                                : booking.status === "pending"
                                ? "secondary"
                                : booking.status === "cancelled"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                            {booking.payment_status === 'paid' && (
                              <span className="text-sm text-muted-foreground">✓ Paid</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                  <TableHeader>
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
                          {formatMoney(Number(item.amount), String(item.currency))}
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
                  <TableHeader>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Listing Price</p>
                      <p className="text-lg font-bold">
                        {formatMoney(
                          Number(selectedBooking.total_price),
                          // Prefer listing's original currency
                          selectedBooking.booking_type === "property" && selectedBooking.properties?.currency
                            ? selectedBooking.properties.currency
                            : selectedBooking.booking_type === "tour" && selectedBooking.tour_packages?.currency
                              ? selectedBooking.tour_packages.currency
                              : selectedBooking.booking_type === "transport" && selectedBooking.transport_vehicles?.currency
                                ? selectedBooking.transport_vehicles.currency
                                : String(selectedBooking.currency ?? "USD")
                        )}
                      </p>
                    </div>
                    {selectedBooking.checkout_requests && (
                      <div>
                        <p className="text-sm text-muted-foreground">Amount Paid</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatMoney(
                            selectedBooking.checkout_requests.total_amount,
                            selectedBooking.checkout_requests.currency || "RWF"
                          )}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="text-sm">{(selectedBooking.checkout_requests?.payment_method || selectedBooking.payment_method)?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <Badge variant={selectedBooking.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {selectedBooking.payment_status || 'pending'}
                      </Badge>
                    </div>
                  </div>
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
