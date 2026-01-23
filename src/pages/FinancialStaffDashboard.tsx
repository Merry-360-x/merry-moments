import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, CreditCard, Wallet } from "lucide-react";

type BookingRow = {
  id: string;
  guest_id: string;
  status: string;
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
  const { user } = useAuth();
  const [tab, setTab] = useState<"overview" | "bookings" | "revenue">("overview");

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

  const { data: bookings = [] } = useQuery({
    queryKey: ["financial_bookings"],
    queryFn: async () => {
      console.log('[FinancialStaff] Fetching bookings...');
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_id, status, total_price, currency, created_at")
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

  const revenueDisplay = useMemo(() => {
    const list = metrics?.revenue_by_currency ?? [];
    if (list.length === 0) return "No revenue yet";
    if (list.length === 1) return formatMoney(Number(list[0].amount), String(list[0].currency ?? "USD"));
    return `${formatMoney(Number(list[0].amount), String(list[0].currency ?? "USD"))} (+${list.length - 1} currencies)`;
  }, [metrics?.revenue_by_currency]);

  const paidBookings = bookings.filter(b => b.status === 'paid');
  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Financial Dashboard</h1>
          <p className="text-muted-foreground">Revenue, bookings, and financial metrics</p>
        </div>

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
            <TabsTrigger value="bookings">All Bookings</TabsTrigger>
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
                      {paidBookings.slice(0, 5).map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="text-sm">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatMoney(Number(booking.total_price), String(booking.currency ?? "USD"))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">Paid</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {paidBookings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No paid bookings yet
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
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}...</TableCell>
                        <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">
                          {formatMoney(Number(booking.total_price), String(booking.currency ?? "USD"))}
                        </TableCell>
                        <TableCell>{booking.currency}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === "paid"
                                ? "default"
                                : booking.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {booking.status}
                          </Badge>
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
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
