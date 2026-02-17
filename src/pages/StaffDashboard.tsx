import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { usePreferences } from "@/hooks/usePreferences";
import { Eye, Download, FileText, DollarSign, AlertCircle } from "lucide-react";

type HostApplicationStatus = "draft" | "pending" | "approved" | "rejected";

type HostApplicationRow = {
  id: string;
  user_id: string;
  status: HostApplicationStatus;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  hosting_location: string | null;
  review_notes: string | null;
  created_at: string;
};

type AdminUserRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  phone: string | null;
};

type PropertyRow = {
  id: string;
  title: string;
  location: string | null;
  price_per_night: number | null;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
};

type TourRow = {
  id: string;
  title: string;
  location: string | null;
  price_per_person: number | null;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
  source?: "tours" | "tour_packages";
};

type TransportVehicleRow = {
  id: string;
  title: string;
  provider_name: string | null;
  vehicle_type: string | null;
  seats: number | null;
  price_per_day: number | null;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
};

type TransportRouteRow = {
  id: string;
  from_location: string | null;
  to_location: string | null;
  base_price: number | null;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  order_id: string | null;
  property_id: string;
  guest_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  is_guest_booking: boolean;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  special_requests: string | null;
  host_id: string | null;
  created_at: string;
  properties?: {
    title: string;
    images: string[] | null;
  };
  profiles?: {
    full_name: string | null;
    nickname: string | null;
    email: string | null;
    phone: string | null;
  };
  host_profile?: {
    full_name: string | null;
  };
};

type Metrics = {
  users_total: number;
  properties_total: number;
  properties_published: number;
  tours_total: number;
  tours_published: number;
  transport_services_total: number;
  transport_vehicles_total: number;
  transport_vehicles_published: number;
  transport_routes_total: number;
  transport_routes_published: number;
  bookings_total: number;
  bookings_pending: number;
  bookings_paid: number;
  orders_total: number;
  revenue_gross: number;
  revenue_by_currency: Array<{ currency: string; amount: number }>;
};

const STAFF_FX_TO_RWF: Record<string, number> = {
  USD: 1455.5,
  EUR: 1716.76225,
  GBP: 1972.4936,
  CNY: 209.732456,
  KES: 11.283036,
  UGX: 0.408996,
  TZS: 0.563279,
  AED: 396.323917,
};

const toRwfAmount = (amount: number, currency: string | null | undefined): number => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const code = String(currency || "RWF").toUpperCase();
  if (code === "RWF") return safeAmount;
  const rate = STAFF_FX_TO_RWF[code] ?? STAFF_FX_TO_RWF.USD;
  return safeAmount * rate;
};

const convertStaffCurrency = (
  amount: number,
  fromCurrency: string | null | undefined,
  toCurrency: string | null | undefined
): number => {
  const from = String(fromCurrency || "RWF").toUpperCase();
  const to = String(toCurrency || "RWF").toUpperCase();
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  if (from === to) return safeAmount;
  const inRwf = toRwfAmount(safeAmount, from);
  if (to === "RWF") return inRwf;
  const toRate = STAFF_FX_TO_RWF[to] ?? STAFF_FX_TO_RWF.USD;
  return inRwf / toRate;
};

const fetchPending = async () => {
  const { data, error } = await supabase
    .from("host_applications")
    .select(
      "id, user_id, status, full_name, phone, business_name, hosting_location, review_notes, created_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as HostApplicationRow[];
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function StaffDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currency: preferredCurrency } = usePreferences();
  const [tab, setTab] = useState<
    "overview" | "applications" | "users" | "accommodations" | "tours" | "transport"
  >("overview");
  const [userSearch, setUserSearch] = useState("");
  const [bookingIdSearch, setBookingIdSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [refundInfo, setRefundInfo] = useState<{
    refundAmount: number;
    refundPercentage: number;
    policyType: string;
    description: string;
    currency: string;
  } | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<HostApplicationRow | null>(null);
  const [applicationDetailsOpen, setApplicationDetailsOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null);
  const [propertyDetailsOpen, setPropertyDetailsOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourRow | null>(null);
  const [tourDetailsOpen, setTourDetailsOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<TransportVehicleRow | null>(null);
  const [vehicleDetailsOpen, setVehicleDetailsOpen] = useState(false);

  const {
    data: applications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["host_applications", "staff", "pending"],
    queryFn: fetchPending,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["staff_dashboard_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_metrics");
      if (error) throw error;
      return normalizeAdminMetrics(data) as unknown as Metrics;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["staff_list_users", userSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { _search: userSearch });
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    enabled: tab === "users",
  });

  const { data: properties = [], refetch: refetchProperties } = useQuery({
    queryKey: ["staff-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, location, price_per_night, currency, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PropertyRow[];
    },
    enabled: tab === "accommodations",
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: tours = [], refetch: refetchTours } = useQuery({
    queryKey: ["staff-tours"],
    queryFn: async () => {
      // Fetch both tours and tour_packages
      const [toursRes, packagesRes] = await Promise.all([
        supabase
          .from("tours")
          .select("id, title, location, price_per_person, currency, is_published, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("tour_packages")
          .select("id, title, city, country, price_per_adult, currency, status, created_at")
          .order("created_at", { ascending: false })
          .limit(200)
      ]);
      
      if (toursRes.error) throw toursRes.error;
      if (packagesRes.error) throw packagesRes.error;
      
      // Mark tours with source
      const toursWithSource = (toursRes.data ?? []).map(t => ({ ...t, source: "tours" as const }));
      
      // Convert packages to tour format and mark with source
      const packagesAsTours = (packagesRes.data ?? []).map(pkg => ({
        id: pkg.id,
        title: pkg.title,
        location: `${pkg.city}, ${pkg.country}`,
        price_per_person: pkg.price_per_adult,
        currency: pkg.currency,
        is_published: pkg.status === 'approved',
        created_at: pkg.created_at,
        source: "tour_packages" as const
      }));
      
      return [...toursWithSource, ...packagesAsTours] as TourRow[];
    },
    enabled: tab === "tours",
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: vehicles = [], refetch: refetchVehicles } = useQuery({
    queryKey: ["staff-transport-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_vehicles")
        .select("id, title, provider_name, vehicle_type, seats, price_per_day, currency, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TransportVehicleRow[];
    },
    enabled: tab === "transport",
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: routes = [], refetch: refetchRoutes } = useQuery({
    queryKey: ["staff-transport-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_routes")
        .select("id, from_location, to_location, base_price, currency, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TransportRouteRow[];
    },
    enabled: tab === "transport",
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: recentBookings = [] } = useQuery({
    queryKey: ["staff-recent-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, property_id, tour_id, transport_id, booking_type, guest_id, guest_name, guest_email, guest_phone,
          is_guest_booking, check_in, check_out, guests, total_price,
          currency, status, payment_status, payment_method, special_requests, host_id, created_at, order_id,
          properties(title, images, currency),
          tour_packages(title, currency),
          transport_vehicles(title, currency),
          profiles:guest_id(full_name, phone, email, nickname)
        `)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      
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
    enabled: tab === "overview",
  });

  const revenueLabel = useMemo(() => {
    const list = metrics?.revenue_by_currency ?? [];
    if (!list.length) return "—";
    if (list.length === 1) return formatMoney(Number(list[0].amount), String(list[0].currency ?? "USD"));
    return `${formatMoney(Number(list[0].amount), String(list[0].currency ?? "USD"))} (+${list.length - 1} more)`;
  }, [metrics?.revenue_by_currency]);

  const filteredRecentBookings = useMemo(() => {
    const query = bookingIdSearch.trim().toLowerCase();
    if (!query) return recentBookings;
    return recentBookings.filter((booking) => {
      const bookingId = String(booking.id || "").toLowerCase();
      const orderId = String(booking.order_id || "").toLowerCase();
      return bookingId.includes(query) || orderId.includes(query);
    });
  }, [recentBookings, bookingIdSearch]);

  const togglePublished = async (table: string, id: string, next: boolean) => {
    try {
      const { error } = await supabase.from(table as never).update({ is_published: next } as never).eq("id", id);
      if (error) throw error;
      toast({ title: "Updated", description: next ? "Published" : "Unpublished" });
      if (table === "properties") await refetchProperties();
      if (table === "tours") await refetchTours();
      if (table === "transport_vehicles") await refetchVehicles();
      if (table === "transport_routes") await refetchRoutes();
    } catch (e) {
      logError("staff.togglePublished", { table, id, next, e });
      toast({
        variant: "destructive",
        title: "Update failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    }
  };

  const deleteRow = async (table: string, id: string) => {
    try {
      const ok = window.confirm("Delete this item permanently?");
      if (!ok) return;
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted" });
      if (table === "tours") await refetchTours();
      if (table === "transport_vehicles") await refetchVehicles();
      if (table === "transport_routes") await refetchRoutes();
    } catch (e) {
      logError("staff.deleteRow", { table, id, e });
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    }
  };

  // Export booking details
  const exportBooking = (booking: BookingRow) => {
    const guestName = booking.is_guest_booking 
      ? booking.guest_name || 'Guest'
      : (booking.profiles?.nickname || booking.profiles?.full_name || 'User');
    
    const guestEmail = booking.is_guest_booking 
      ? booking.guest_email 
      : booking.profiles?.email;
    
    const guestPhone = booking.is_guest_booking 
      ? booking.guest_phone 
      : booking.profiles?.phone;

    const bookingData = {
      'Booking ID': booking.id,
      'Guest Name': guestName,
      'Guest Email': guestEmail || 'N/A',
      'Guest Phone': guestPhone || 'N/A',
      'Check-in': booking.check_in,
      'Check-out': booking.check_out,
      'Number of Guests': booking.guests,
      'Total Price': `${booking.currency} ${booking.total_price}`,
      'Payment Method': booking.payment_method || 'N/A',
      'Status': booking.status,
      'Special Requests': booking.special_requests || 'None',
      'Created At': new Date(booking.created_at).toLocaleString(),
    };
    
    const content = Object.entries(bookingData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${booking.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Booking exported" });
  };

  // Export payment receipt
  const exportReceipt = (booking: BookingRow) => {
    const guestName = booking.is_guest_booking 
      ? booking.guest_name || 'Guest'
      : (booking.profiles?.nickname || booking.profiles?.full_name || 'User');
    
    const guestEmail = booking.is_guest_booking 
      ? booking.guest_email 
      : booking.profiles?.email;
    
    const guestPhone = booking.is_guest_booking 
      ? booking.guest_phone 
      : booking.profiles?.phone;

    const receiptContent = `
PAYMENT RECEIPT
================
Receipt Date: ${new Date().toLocaleString()}

BOOKING INFORMATION
-------------------
Booking ID: ${booking.id}
Guest Name: ${guestName}
Guest Email: ${guestEmail || 'N/A'}
Guest Phone: ${guestPhone || 'N/A'}

STAY DETAILS
------------
Check-in Date: ${booking.check_in}
Check-out Date: ${booking.check_out}
Number of Guests: ${booking.guests}

PAYMENT DETAILS
---------------
Total Amount: ${booking.currency} ${booking.total_price}
Payment Method: ${booking.payment_method || 'Pending'}
Payment Status: ${booking.status}
Transaction Date: ${new Date(booking.created_at).toLocaleString()}

ADDITIONAL INFORMATION
----------------------
Special Requests: ${booking.special_requests || 'None'}

---
Thank you for booking with Merry360x
For support, contact: support@merry360x.com
    `.trim();
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${booking.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Receipt exported" });
  };

  // Helper for status badge
  const StatusBadge = ({ status }: { status: string }) => (
    <Badge className={statusColors[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>
  );

  // Helper for payment status badge
  const PaymentStatusBadge = ({ status }: { status: string | null }) => {
    if (!status) return null;
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      refunded: "bg-blue-100 text-blue-800",
    };
    return (
      <Badge className={colors[status] ?? "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  useEffect(() => {
    const channel = supabase
      .channel("staff-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, async () => {
        await refetchMetrics();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_cart_items" }, async () => {
        await refetchMetrics();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, async () => {
        await refetchMetrics();
        if (tab === "accommodations") await refetchProperties();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, async () => {
        await refetchMetrics();
        if (tab === "tours") await refetchTours();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transport_vehicles" }, async () => {
        await refetchMetrics();
        if (tab === "transport") await refetchVehicles();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transport_routes" }, async () => {
        await refetchMetrics();
        if (tab === "transport") await refetchRoutes();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const approve = async (app: HostApplicationRow) => {
    try {
      const note = window.prompt("Approval note (optional):") ?? null;

      const { error } = await supabase.rpc("approve_host_application", {
        application_id: app.id,
        note,
      } as any);

      if (error) throw error;

      toast({ title: "Approved", description: "Host role granted and listings published." });
      await refetch();
    } catch (e) {
      logError("staff.approveHostApplication", e);
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    }
  };

  const reject = async (app: HostApplicationRow) => {
    try {
      const note = window.prompt("Rejection reason (recommended):") ?? null;

      const { error } = await supabase
        .from("host_applications")
        .update({ status: "rejected", review_notes: note, reviewed_by: user?.id ?? null })
        .eq("id", app.id);

      if (error) throw error;

      toast({ title: "Rejected" });
      await refetch();
    } catch (e) {
      logError("staff.rejectHostApplication", e);
      toast({
        variant: "destructive",
        title: "Rejection failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Staff Dashboard</h1>
            <p className="text-muted-foreground">Manage accommodations, tours, and transport (staff scope)</p>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={async () => {
              await refetch();
              await refetchMetrics();
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border-primary/20">
            <div className="text-sm text-muted-foreground">Revenue (gross)</div>
            <div className="text-2xl font-bold text-foreground mt-1">{revenueLabel}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Bookings</div>
            <div className="text-2xl font-bold text-foreground mt-1">{metrics?.bookings_total ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Pending: {metrics?.bookings_pending ?? 0} · Paid: {metrics?.bookings_paid ?? 0}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Orders</div>
            <div className="text-2xl font-bold text-foreground mt-1">{metrics?.orders_total ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-2">Trip cart items</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Published</div>
            <div className="text-2xl font-bold text-foreground mt-1">{metrics?.properties_published ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-2">Accommodations</div>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Recent bookings</h2>
            <div className="flex items-center gap-2">
              <Input
                value={bookingIdSearch}
                onChange={(e) => setBookingIdSearch(e.target.value)}
                placeholder="Search Booking ID / Order ID"
                className="w-64"
              />
              <Badge variant="outline" className="border-primary/30 text-primary">
                {metrics?.bookings_total ?? 0} total
              </Badge>
            </div>
          </div>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecentBookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-xs">
                    <div className="space-y-1">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Booking</p>
                        <p className="font-mono break-all leading-4">{b.id}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Order</p>
                        {b.order_id ? (
                          <p className="font-mono break-all leading-4">{b.order_id}</p>
                        ) : (
                          <span className="text-muted-foreground">Single booking</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.is_guest_booking ? (
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.guest_name || "Guest"}</div>
                        <div className="text-xs text-muted-foreground truncate">{b.guest_email || "—"}</div>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.profiles?.nickname || b.profiles?.full_name || "User"}</div>
                        <div className="text-xs text-muted-foreground truncate">{b.profiles?.email || "—"}</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{b.status}</TableCell>
                  <TableCell className="font-medium">
                    {formatMoney(Number(b.total_price), String(b.currency ?? "USD"))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedBooking(b);
                          setRefundInfo(null);
                          setBookingDetailsOpen(true);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => exportBooking(b)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                      {(b.status === "completed" || b.status === "confirmed") && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => exportReceipt(b)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecentBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No bookings match that Booking ID / Order ID
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Host applications</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="accommodations">Accommodations</TabsTrigger>
            <TabsTrigger value="tours">Tours</TabsTrigger>
            <TabsTrigger value="transport">Transport</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">What you can manage</h2>
              <p className="text-muted-foreground">
                Staff can manage transport, tours, and accommodations publishing. User emails are view-only.
              </p>
            </Card>

            {/* Pending Payments Section */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-600" /> 
                Pending Payments ({filteredRecentBookings.filter(b => b.payment_status === 'pending').length})
              </h3>
              {filteredRecentBookings.filter(b => b.payment_status === 'pending').length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending payments</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecentBookings.filter(b => b.payment_status === 'pending').slice(0, 10).map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs">
                            <div className="space-y-1">
                              <p className="font-mono break-all leading-4">{b.id}</p>
                              {b.order_id ? (
                                <p className="font-mono text-[11px] text-muted-foreground break-all leading-4">{b.order_id}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {b.is_guest_booking ? b.guest_name || "Guest" : (b.profiles?.nickname || b.profiles?.full_name || "User")}
                          </TableCell>
                          <TableCell className="text-sm">{b.properties?.title || "—"}</TableCell>
                          <TableCell className="font-medium">
                            {formatMoney(b.total_price, b.currency || 'USD')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <StatusBadge status={b.status} />
                              <PaymentStatusBadge status={b.payment_status} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSelectedBooking(b);
                                setRefundInfo(null);
                                setBookingDetailsOpen(true);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Pending host applications</h2>
              {/* {isLoading ? (
                <div className="py-10 text-center">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : */ isError ? (
                <p className="text-muted-foreground">Couldn’t load applications.</p>
              ) : applications.length === 0 ? (
                <p className="text-muted-foreground">No pending applications.</p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-border p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {app.full_name || "(no name)"} · {app.hosting_location || "(no location)"}
                        </p>
                        <p className="text-sm text-muted-foreground break-all">
                          {app.phone || ""} · user: {app.user_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApplication(app);
                            setApplicationDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => approve(app)}>
                          Approve
                        </Button>
                        <Button variant="outline" onClick={() => reject(app)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-foreground">Users (view only)</h2>
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search email, name, phone, or user id"
                  className="md:max-w-md"
                />
              </div>
              <div className="space-y-3">
                {adminUsers.map((u) => (
                  <div key={u.user_id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="font-medium text-foreground break-all">{u.email ?? "(no email)"}</div>
                    <div className="text-sm text-muted-foreground">
                      {u.full_name ?? "(no name)"} · {u.phone ?? "(no phone)"}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">user: {u.user_id}</div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="accommodations" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Accommodations</h2>
                <Button variant="outline" onClick={() => refetchProperties()}>
                  Refresh
                </Button>
              </div>
              <div className="space-y-3">
                {properties.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{p.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.location ?? "(no location)"} · {formatMoney(p.price_per_night ?? 0, p.currency ?? "USD")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProperty(p);
                          setPropertyDetailsOpen(true);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Published</span>
                        <Switch
                          checked={Boolean(p.is_published)}
                          onCheckedChange={(v) => togglePublished("properties", p.id, v)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tours" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Tours</h2>
                <Button variant="outline" onClick={() => refetchTours()}>
                  Refresh
                </Button>
              </div>
              <div className="space-y-3">
                {tours.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-foreground flex-1">{t.title}</div>
                        {t.source === "tour_packages" ? (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                            Package
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                            Tour
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t.location ?? "(no location)"} · {formatMoney(t.price_per_person ?? 0, t.currency ?? "USD")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTour(t);
                          setTourDetailsOpen(true);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Published</span>
                        <Switch checked={Boolean(t.is_published)} onCheckedChange={(v) => togglePublished("tours", t.id, v)} />
                      </div>
                      <Button variant="outline" onClick={() => deleteRow("tours", t.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="transport" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Transport vehicles</h2>
                  <Button variant="outline" onClick={() => refetchVehicles()}>
                    Refresh
                  </Button>
                </div>
                <div className="space-y-3">
                  {vehicles.map((v) => (
                    <div key={v.id} className="rounded-lg border border-border p-4 flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{v.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {v.provider_name ?? "(no provider)"} · {v.vehicle_type ?? "Vehicle"} · {v.seats ?? 0} seats
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatMoney(v.price_per_day ?? 0, v.currency ?? "USD")} / day
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVehicle(v);
                            setVehicleDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Published</span>
                          <Switch
                            checked={Boolean(v.is_published)}
                            onCheckedChange={(val) => togglePublished("transport_vehicles", v.id, val)}
                          />
                        </div>
                        <Button variant="outline" onClick={() => deleteRow("transport_vehicles", v.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Transport routes</h2>
                  <Button variant="outline" onClick={() => refetchRoutes()}>
                    Refresh
                  </Button>
                </div>
                <div className="space-y-3">
                  {routes.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border p-4 flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {r.from_location ?? "From"} → {r.to_location ?? "To"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatMoney(r.base_price ?? 0, r.currency ?? "USD")}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Published</span>
                          <Switch
                            checked={Boolean(r.is_published)}
                            onCheckedChange={(val) => togglePublished("transport_routes", r.id, val)}
                          />
                        </div>
                        <Button variant="outline" onClick={() => deleteRow("transport_routes", r.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

        </Tabs>

        {/* BOOKING DETAILS DIALOG */}
        <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                View complete booking information and guest details
              </DialogDescription>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                {selectedBooking.properties && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-3">Property</h3>
                    <div className="flex items-start gap-4">
                      {selectedBooking.properties.images?.[0] && (
                        <img
                          src={selectedBooking.properties.images[0]}
                          alt={selectedBooking.properties.title}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{selectedBooking.properties.title}</p>
                        <p className="text-sm text-muted-foreground font-mono break-all">{selectedBooking.property_id}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Booking ID</p>
                    <p className="font-mono text-xs break-all">{selectedBooking.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge>{selectedBooking.status}</Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Guest Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-sm">
                        {selectedBooking.is_guest_booking 
                          ? selectedBooking.guest_name || "Guest"
                          : (selectedBooking.profiles?.nickname || selectedBooking.profiles?.full_name || "User")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm break-all">
                        {selectedBooking.is_guest_booking
                          ? selectedBooking.guest_email || "N/A"
                          : selectedBooking.profiles?.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">
                        {selectedBooking.is_guest_booking
                          ? selectedBooking.guest_phone || "N/A"
                          : selectedBooking.profiles?.phone || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Guest Type</p>
                      <p className="text-sm">
                        {selectedBooking.is_guest_booking ? "Guest Booking" : "Registered User"}
                      </p>
                    </div>
                    {!selectedBooking.is_guest_booking && selectedBooking.guest_id && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">User ID</p>
                        <p className="font-mono text-xs break-all">{selectedBooking.guest_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Stay Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Check-in</p>
                      <p className="text-sm font-medium">{selectedBooking.check_in}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Check-out</p>
                      <p className="text-sm font-medium">{selectedBooking.check_out}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Number of Guests</p>
                      <p className="text-sm">{selectedBooking.guests}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Payment Information</h3>
                  {(() => {
                    const listingSourceCurrency =
                      selectedBooking.booking_type === "property" && selectedBooking.properties?.currency
                        ? selectedBooking.properties.currency
                        : selectedBooking.booking_type === "tour" && selectedBooking.tour_packages?.currency
                          ? selectedBooking.tour_packages.currency
                          : selectedBooking.booking_type === "transport" && selectedBooking.transport_vehicles?.currency
                            ? selectedBooking.transport_vehicles.currency
                            : selectedBooking.currency || "RWF";

                    const displayCurrency = preferredCurrency || "RWF";

                    const listingAmount = convertStaffCurrency(
                      Number(selectedBooking.total_price || 0),
                      listingSourceCurrency,
                      displayCurrency
                    );
                    const paidAmount = selectedBooking.checkout_requests
                      ? convertStaffCurrency(
                          Number(selectedBooking.checkout_requests.total_amount || 0),
                          selectedBooking.checkout_requests.currency || "RWF",
                          displayCurrency
                        )
                      : null;

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
                          <p className="text-lg font-bold">{formatMoney(Number(listingAmount || 0), displayCurrency)}</p>
                        </div>
                        {selectedBooking.checkout_requests && (
                          <div>
                            <p className="text-sm text-muted-foreground">Amount Paid ({String(displayCurrency).toUpperCase()})</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatMoney(Number(paidAmount || 0), displayCurrency)}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Method</p>
                          <p className="text-sm">{paymentMethodLabel || "Not specified"}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Show refund information for cancelled paid bookings */}
                {refundInfo && selectedBooking.status === 'cancelled' && selectedBooking.payment_status === 'paid' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-yellow-600" />
                      Refund Information
                    </h3>
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Refund Amount:</span>
                            <span className="text-lg font-bold text-yellow-700">
                              {formatMoney(refundInfo.refundAmount, refundInfo.currency || 'USD')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Refund Percentage:</span>
                            <span className="text-sm font-semibold">{refundInfo.refundPercentage}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Policy Type:</span>
                            <Badge variant="outline">{refundInfo.policyType}</Badge>
                          </div>
                          <div className="mt-2 pt-2 border-t border-yellow-200">
                            <p className="text-xs text-muted-foreground">{refundInfo.description}</p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {selectedBooking.special_requests && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Special Requests</h3>
                    <p className="text-sm text-muted-foreground">{selectedBooking.special_requests}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-sm">{new Date(selectedBooking.created_at).toLocaleString()}</p>
                    </div>
                    {selectedBooking.host_id && (
                      <div>
                        <p className="text-sm text-muted-foreground">Host</p>
                        <p className="text-sm">{selectedBooking.host_profile?.full_name || "N/A"}</p>
                        <p className="font-mono text-xs text-muted-foreground break-all">{selectedBooking.host_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => exportBooking(selectedBooking)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Booking
                  </Button>
                  {(selectedBooking.status === "completed" || selectedBooking.status === "confirmed") && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => exportReceipt(selectedBooking)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Export Receipt
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Application Details Dialog */}
        <Dialog open={applicationDetailsOpen} onOpenChange={setApplicationDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>Host application information</DialogDescription>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedApplication.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p>{selectedApplication.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Business Name</p>
                    <p>{selectedApplication.business_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p>{selectedApplication.hosting_location || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-xs break-all">{selectedApplication.user_id}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Property Details Dialog */}
        <Dialog open={propertyDetailsOpen} onOpenChange={setPropertyDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Property Details</DialogTitle>
              <DialogDescription>Accommodation information</DialogDescription>
            </DialogHeader>
            {selectedProperty && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium text-lg">{selectedProperty.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p>{selectedProperty.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price per Night</p>
                    <p className="font-medium">
                      {formatMoney(selectedProperty.price_per_night || 0, selectedProperty.currency || 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <Badge variant={selectedProperty.is_published ? 'default' : 'secondary'}>
                      {selectedProperty.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{new Date(selectedProperty.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Tour Details Dialog */}
        <Dialog open={tourDetailsOpen} onOpenChange={setTourDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tour Details</DialogTitle>
              <DialogDescription>Tour or package information</DialogDescription>
            </DialogHeader>
            {selectedTour && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium text-lg">{selectedTour.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline">
                      {selectedTour.source === 'tour_packages' ? 'Package' : 'Tour'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p>{selectedTour.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price per Person</p>
                    <p className="font-medium">
                      {formatMoney(selectedTour.price_per_person || 0, selectedTour.currency || 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <Badge variant={selectedTour.is_published ? 'default' : 'secondary'}>
                      {selectedTour.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{new Date(selectedTour.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Vehicle Details Dialog */}
        <Dialog open={vehicleDetailsOpen} onOpenChange={setVehicleDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vehicle Details</DialogTitle>
              <DialogDescription>Transport vehicle information</DialogDescription>
            </DialogHeader>
            {selectedVehicle && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium text-lg">{selectedVehicle.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p>{selectedVehicle.provider_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle Type</p>
                    <p>{selectedVehicle.vehicle_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seats</p>
                    <p>{selectedVehicle.seats || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price per Day</p>
                    <p className="font-medium">
                      {formatMoney(selectedVehicle.price_per_day || 0, selectedVehicle.currency || 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <Badge variant={selectedVehicle.is_published ? 'default' : 'secondary'}>
                      {selectedVehicle.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{new Date(selectedVehicle.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Footer />
    </div>
  );
}
