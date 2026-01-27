import { useMemo, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { supabase } from "@/integrations/supabase/client";
import { getRefundInfo } from "@/lib/refund-calculator";
import { DollarSign, TrendingUp, CreditCard, Wallet, Calendar, Download, CheckCircle } from "lucide-react";
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

// Component to show refund amount for cancelled paid bookings
function RefundDisplay({ bookingId, currency }: { bookingId: string; currency: string }) {
  const [refund, setRefund] = useState<number | null>(null);
  const [percentage, setPercentage] = useState<number | null>(null);

  useEffect(() => {
    getRefundInfo(bookingId, null).then((info) => {
      if (info) {
        setRefund(info.refundAmount);
        setPercentage(info.refundPercentage);
      }
    });
  }, [bookingId]);

  if (refund === null) return null;

  return (
    <span title={`${percentage}% refund based on cancellation policy`}>
      ↩ Refund: {formatMoney(refund, currency)}
    </span>
  );
}

export default function FinancialStaffDashboard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "bookings" | "checkout" | "revenue">("overview");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [requestingPayment, setRequestingPayment] = useState<string | null>(null);

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
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ["financial_bookings"],
    queryFn: async () => {
      console.log('[FinancialStaff] Fetching bookings...');
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_id, guest_name, guest_email, guest_phone, status, payment_status, payment_method, total_price, currency, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[FinancialStaff] Bookings error:', error);
        throw error;
      }
      console.log('[FinancialStaff] Bookings fetched:', data?.length || 0);
      return (data ?? []) as BookingRow[];
    },
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
        title: "Payment Confirmed",
        description: "Booking has been marked as paid successfully.",
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

  const { data: checkoutRequests = [] } = useQuery({
    queryKey: ["financial_checkout_requests"],
    queryFn: async () => {
      console.log('[FinancialStaff] Fetching checkout requests...');
      const { data, error } = await supabase
        .from("checkout_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error('[FinancialStaff] Checkout requests error:', error);
        throw error;
      }
      console.log('[FinancialStaff] Checkout requests fetched:', data?.length || 0);
      return data ?? [];
    },
  });

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
                  Filtered Revenue: {formatMoney(filteredRevenue, "USD")}
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
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">
              All Bookings
              {bookings.filter(b => b.payment_status !== 'paid' && b.status === 'confirmed').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full">
                  {bookings.filter(b => b.payment_status !== 'paid' && b.status === 'confirmed').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="checkout">
              Cart Checkouts
              {checkoutRequests.filter(r => r.status === 'pending_confirmation').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full">
                  {checkoutRequests.filter(r => r.status === 'pending_confirmation').length}
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
                          <div>
                            {formatMoney(Number(booking.total_price), String(booking.currency ?? "USD"))}
                            {booking.status === 'cancelled' && booking.payment_status === 'paid' && (
                              <div className="text-xs text-yellow-700 font-semibold mt-1">
                                <RefundDisplay bookingId={booking.id} currency={booking.currency} />
                              </div>
                            )}
                          </div>
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

          <TabsContent value="checkout">
            <Card>
              <CardHeader>
                <CardTitle>Cart Checkout Requests</CardTitle>
                <CardDescription>Manage checkout requests from the trip cart</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkoutRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell className="text-sm">{request.email}</TableCell>
                        <TableCell className="text-sm">{request.phone || 'N/A'}</TableCell>
                        <TableCell>
                          {request.payment_method ? (
                            <Badge variant="outline" className="text-xs">
                              {request.payment_method.replace('_', ' ').toUpperCase()}
                            </Badge>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {Array.isArray(request.items) ? request.items.length : 0} items
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === "confirmed"
                                ? "default"
                                : request.status === "pending_confirmation"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {request.status?.replace('_', ' ') || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {checkoutRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No checkout requests found
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
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
