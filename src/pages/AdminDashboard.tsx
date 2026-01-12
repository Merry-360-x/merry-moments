import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import {
  Users,
  Home,
  Car,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  Star,
  MessageSquare,
  Shield,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Ban,
  RefreshCw,
  Download,
  Search,
  UserPlus,
  UserMinus,
  Settings,
  DollarSign,
  TrendingUp,
  Activity,
} from "lucide-react";

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
  is_suspended: boolean;
  is_verified: boolean;
};

type RoleRow = { user_id: string; role: string; created_at: string };

type PropertyRow = {
  id: string;
  title: string;
  location: string | null;
  price_per_night: number | null;
  currency: string | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  host_id: string | null;
  rating: number | null;
  created_at: string;
};

type TourRow = {
  id: string;
  title: string;
  location: string | null;
  price_per_person: number | null;
  currency: string | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  created_by: string | null;
  created_at: string;
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
  created_by: string | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  property_id: string;
  property_title: string | null;
  guest_id: string;
  guest_email: string | null;
  host_id: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  admin_notes: string | null;
  refund_amount: number | null;
  refund_status: string | null;
  created_at: string;
};

type ReviewRow = {
  id: string;
  property_id: string;
  property_title: string | null;
  user_id: string;
  user_email: string | null;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
};

type SupportTicketRow = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string | null;
  status: string;
  priority: string | null;
  response: string | null;
  created_at: string;
};

type IncidentRow = {
  id: string;
  reporter_id: string | null;
  reported_user_id: string | null;
  reported_property_id: string | null;
  incident_type: string;
  description: string;
  severity: string;
  status: string;
  resolution: string | null;
  created_at: string;
};

type BlacklistRow = {
  id: string;
  user_id: string;
  reason: string;
  created_at: string;
  expires_at: string | null;
};

type Metrics = {
  users_total: number;
  users_suspended: number;
  hosts_total: number;
  stories_total: number;
  properties_total: number;
  properties_published: number;
  properties_featured: number;
  tours_total: number;
  tours_published: number;
  transport_services_total: number;
  transport_vehicles_total: number;
  transport_vehicles_published: number;
  transport_routes_total: number;
  transport_routes_published: number;
  bookings_total: number;
  bookings_pending: number;
  bookings_confirmed: number;
  bookings_completed: number;
  bookings_cancelled: number;
  bookings_paid: number;
  orders_total: number;
  reviews_total: number;
  reviews_hidden: number;
  tickets_total: number;
  tickets_open: number;
  tickets_in_progress: number;
  tickets_resolved: number;
  incidents_total: number;
  incidents_open: number;
  blacklist_count: number;
  revenue_gross: number;
  revenue_by_currency: Array<{ currency: string; amount: number }>;
  refunds_total: number;
};

type TabValue =
  | "overview"
  | "users"
  | "accommodations"
  | "tours"
  | "transport"
  | "bookings"
  | "payments"
  | "reviews"
  | "support"
  | "safety"
  | "reports";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");

  // Metrics query
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["admin_dashboard_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_metrics");
      if (error) throw error;
      return data as unknown as Metrics;
    },
  });

  // Host applications
  const { data: applications = [], refetch: refetchApplications } = useQuery({
    queryKey: ["host_applications", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_applications")
        .select("id, user_id, status, full_name, phone, business_name, hosting_location, review_notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HostApplicationRow[];
    },
  });

  // User roles
  const { data: roleRows = [], refetch: refetchRoles } = useQuery({
    queryKey: ["user_roles", "admin-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role, created_at");
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const rolesByUserId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of roleRows) {
      const list = map.get(r.user_id) ?? [];
      list.push(r.role);
      map.set(r.user_id, list);
    }
    return map;
  }, [roleRows]);

  // Users
  const { data: adminUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ["admin_list_users", userSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { _search: userSearch });
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    enabled: tab === "users" || tab === "overview",
  });

  // Properties
  const { data: properties = [], refetch: refetchProperties } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, location, price_per_night, currency, is_published, is_featured, host_id, rating, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PropertyRow[];
    },
    enabled: tab === "accommodations",
  });

  // Tours
  const { data: tours = [], refetch: refetchTours } = useQuery({
    queryKey: ["admin-tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("id, title, location, price_per_person, currency, is_published, is_featured, created_by, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TourRow[];
    },
    enabled: tab === "tours",
  });

  // Transport vehicles
  const { data: vehicles = [], refetch: refetchVehicles } = useQuery({
    queryKey: ["admin-transport-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_vehicles")
        .select("id, title, provider_name, vehicle_type, seats, price_per_day, currency, is_published, created_by, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TransportVehicleRow[];
    },
    enabled: tab === "transport",
  });

  // Bookings
  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ["admin-bookings", bookingStatus],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_bookings", {
        _status: bookingStatus,
        _limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
    enabled: tab === "bookings" || tab === "payments",
  });

  // Reviews
  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_reviews", { _limit: 200 });
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
    enabled: tab === "reviews",
  });

  // Support tickets
  const { data: tickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ["admin-tickets", ticketStatus],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("id, user_id, subject, message, category, status, priority, response, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (ticketStatus) q = q.eq("status", ticketStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SupportTicketRow[];
    },
    enabled: tab === "support",
  });

  // Incidents
  const { data: incidents = [], refetch: refetchIncidents } = useQuery({
    queryKey: ["admin-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_reports")
        .select("id, reporter_id, reported_user_id, reported_property_id, incident_type, description, severity, status, resolution, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as IncidentRow[];
    },
    enabled: tab === "safety",
  });

  // Blacklist
  const { data: blacklist = [], refetch: refetchBlacklist } = useQuery({
    queryKey: ["admin-blacklist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blacklist")
        .select("id, user_id, reason, created_at, expires_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlacklistRow[];
    },
    enabled: tab === "safety",
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => refetchMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => {
        refetchMetrics();
        if (tab === "accommodations") refetchProperties();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tours" }, () => {
        refetchMetrics();
        if (tab === "tours") refetchTours();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        refetchMetrics();
        if (tab === "support") refetchTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tab]);

  // Helper for status badge
  const StatusBadge = ({ status }: { status: string }) => (
    <Badge className={statusColors[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>
  );

  // Actions
  const approveApplication = async (app: HostApplicationRow) => {
    try {
      const { error: updateErr } = await supabase
        .from("host_applications")
        .update({ status: "approved" as never })
        .eq("id", app.id);
      if (updateErr) throw updateErr;

      const { error: roleErr } = await supabase.from("user_roles").upsert(
        { user_id: app.user_id, role: "host" },
        { onConflict: "user_id,role" }
      );
      if (roleErr) throw roleErr;

      toast({ title: "Application approved", description: `${app.full_name} is now a host.` });
      await Promise.all([refetchApplications(), refetchRoles(), refetchMetrics()]);
    } catch (e) {
      logError("admin.approveApplication", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const rejectApplication = async (app: HostApplicationRow) => {
    const notes = window.prompt("Rejection reason (optional):");
    try {
      const { error } = await supabase
        .from("host_applications")
        .update({ status: "rejected" as never, review_notes: notes } as never)
        .eq("id", app.id);
      if (error) throw error;
      toast({ title: "Application rejected" });
      await refetchApplications();
    } catch (e) {
      logError("admin.rejectApplication", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const addRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      toast({ title: "Role added", description: `${role} granted.` });
      await Promise.all([refetchRoles(), refetchUsers()]);
    } catch (e) {
      logError("admin.addRole", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const removeRole = async (userId: string, role: string) => {
    if (!window.confirm(`Remove '${role}' role?`)) return;
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
      toast({ title: "Role removed" });
      await Promise.all([refetchRoles(), refetchUsers()]);
    } catch (e) {
      logError("admin.removeRole", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const suspendUser = async (userId: string) => {
    const reason = window.prompt("Suspension reason:");
    if (!reason) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspension_reason: reason,
          suspended_at: new Date().toISOString(),
          suspended_by: user?.id,
        } as never)
        .or(`id.eq.${userId},user_id.eq.${userId}`);
      if (error) throw error;
      toast({ title: "User suspended" });
      await Promise.all([refetchUsers(), refetchMetrics()]);
    } catch (e) {
      logError("admin.suspendUser", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const unsuspendUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: false, suspension_reason: null, suspended_at: null, suspended_by: null } as never)
        .or(`id.eq.${userId},user_id.eq.${userId}`);
      if (error) throw error;
      toast({ title: "User unsuspended" });
      await Promise.all([refetchUsers(), refetchMetrics()]);
    } catch (e) {
      logError("admin.unsuspendUser", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const togglePublished = async (table: string, id: string, next: boolean) => {
    try {
      const { error } = await supabase.from(table as never).update({ is_published: next } as never).eq("id", id);
      if (error) throw error;
      toast({ title: next ? "Published" : "Unpublished" });
      if (table === "properties") await refetchProperties();
      if (table === "tours") await refetchTours();
      if (table === "transport_vehicles") await refetchVehicles();
      await refetchMetrics();
    } catch (e) {
      logError("admin.togglePublished", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const toggleFeatured = async (table: string, id: string, next: boolean) => {
    try {
      const { error } = await supabase.from(table as never).update({ is_featured: next } as never).eq("id", id);
      if (error) throw error;
      toast({ title: next ? "Featured" : "Unfeatured" });
      if (table === "properties") await refetchProperties();
      if (table === "tours") await refetchTours();
      await refetchMetrics();
    } catch (e) {
      logError("admin.toggleFeatured", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const deleteItem = async (table: string, id: string) => {
    if (!window.confirm("Delete this item permanently?")) return;
    try {
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted" });
      queryClient.invalidateQueries();
      await refetchMetrics();
    } catch (e) {
      logError("admin.deleteItem", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (status === "cancelled") {
        updateData.cancelled_by = user?.id;
        updateData.cancelled_at = new Date().toISOString();
      }
      const { error } = await supabase.from("bookings").update(updateData as never).eq("id", id);
      if (error) throw error;
      toast({ title: "Booking updated" });
      await Promise.all([refetchBookings(), refetchMetrics()]);
    } catch (e) {
      logError("admin.updateBookingStatus", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const processRefund = async (booking: BookingRow) => {
    const amount = window.prompt("Refund amount:", String(booking.total_price));
    if (!amount) return;
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ refund_amount: Number(amount), refund_status: "processed" } as never)
        .eq("id", booking.id);
      if (error) throw error;
      toast({ title: "Refund processed" });
      await Promise.all([refetchBookings(), refetchMetrics()]);
    } catch (e) {
      logError("admin.processRefund", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const hideReview = async (review: ReviewRow) => {
    const reason = window.prompt("Reason for hiding:");
    if (!reason) return;
    try {
      const { error } = await supabase
        .from("property_reviews")
        .update({
          is_hidden: true,
          hidden_reason: reason,
          hidden_by: user?.id,
          hidden_at: new Date().toISOString(),
        } as never)
        .eq("id", review.id);
      if (error) throw error;
      toast({ title: "Review hidden" });
      await Promise.all([refetchReviews(), refetchMetrics()]);
    } catch (e) {
      logError("admin.hideReview", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const unhideReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from("property_reviews")
        .update({ is_hidden: false, hidden_reason: null, hidden_by: null, hidden_at: null } as never)
        .eq("id", reviewId);
      if (error) throw error;
      toast({ title: "Review restored" });
      await Promise.all([refetchReviews(), refetchMetrics()]);
    } catch (e) {
      logError("admin.unhideReview", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const respondToTicket = async (ticket: SupportTicketRow) => {
    const response = window.prompt("Your response:");
    if (!response) return;
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          response,
          status: "resolved",
          responded_by: user?.id,
          responded_at: new Date().toISOString(),
        } as never)
        .eq("id", ticket.id);
      if (error) throw error;
      toast({ title: "Response sent" });
      await Promise.all([refetchTickets(), refetchMetrics()]);
    } catch (e) {
      logError("admin.respondToTicket", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase.from("support_tickets").update({ status } as never).eq("id", ticketId);
      if (error) throw error;
      toast({ title: "Ticket updated" });
      await Promise.all([refetchTickets(), refetchMetrics()]);
    } catch (e) {
      logError("admin.updateTicketStatus", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const resolveIncident = async (incident: IncidentRow) => {
    const resolution = window.prompt("Resolution notes:");
    if (!resolution) return;
    try {
      const { error } = await supabase
        .from("incident_reports")
        .update({
          status: "resolved",
          resolution,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        } as never)
        .eq("id", incident.id);
      if (error) throw error;
      toast({ title: "Incident resolved" });
      await refetchIncidents();
    } catch (e) {
      logError("admin.resolveIncident", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const addToBlacklist = async () => {
    const userId = window.prompt("User ID to blacklist:");
    if (!userId) return;
    const reason = window.prompt("Reason:");
    if (!reason) return;
    try {
      const { error } = await supabase.from("blacklist").insert({
        user_id: userId,
        reason,
        blocked_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "User blacklisted" });
      await Promise.all([refetchBlacklist(), refetchMetrics()]);
    } catch (e) {
      logError("admin.addToBlacklist", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const removeFromBlacklist = async (id: string) => {
    if (!window.confirm("Remove from blacklist?")) return;
    try {
      const { error } = await supabase.from("blacklist").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Removed from blacklist" });
      await Promise.all([refetchBlacklist(), refetchMetrics()]);
    } catch (e) {
      logError("admin.removeFromBlacklist", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const pendingApps = applications.filter((a) => a.status === "pending");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <Button variant="outline" size="sm" onClick={() => refetchMetrics()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="overview" className="gap-1">
              <BarChart3 className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1">
              <Users className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="accommodations" className="gap-1">
              <Home className="w-4 h-4" /> Stays
            </TabsTrigger>
            <TabsTrigger value="tours" className="gap-1">
              <MapPin className="w-4 h-4" /> Tours
            </TabsTrigger>
            <TabsTrigger value="transport" className="gap-1">
              <Car className="w-4 h-4" /> Transport
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1">
              <Calendar className="w-4 h-4" /> Bookings
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1">
              <CreditCard className="w-4 h-4" /> Payments
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1">
              <Star className="w-4 h-4" /> Reviews
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1">
              <MessageSquare className="w-4 h-4" /> Support
            </TabsTrigger>
            <TabsTrigger value="safety" className="gap-1">
              <Shield className="w-4 h-4" /> Safety
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1">
              <FileText className="w-4 h-4" /> Reports
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Revenue</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatMoney(metrics?.revenue_gross ?? 0, "RWF")}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Bookings</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics?.bookings_total ?? 0}</p>
                <p className="text-xs text-muted-foreground">{metrics?.bookings_pending ?? 0} pending</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Users</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics?.users_total ?? 0}</p>
                <p className="text-xs text-muted-foreground">{metrics?.hosts_total ?? 0} hosts</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Home className="w-4 h-4" />
                  <span className="text-sm">Properties</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metrics?.properties_total ?? 0}</p>
                <p className="text-xs text-muted-foreground">{metrics?.properties_published ?? 0} live</p>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Quick Stats */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Platform Stats
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tours</span>
                    <span>{metrics?.tours_published ?? 0} / {metrics?.tours_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicles</span>
                    <span>{metrics?.transport_vehicles_published ?? 0} / {metrics?.transport_vehicles_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviews</span>
                    <span>{metrics?.reviews_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stories</span>
                    <span>{metrics?.stories_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cart Items</span>
                    <span>{metrics?.orders_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Suspended</span>
                    <span className="text-destructive">{metrics?.users_suspended ?? 0}</span>
                  </div>
                </div>
              </Card>

              {/* Pending Applications */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Pending Host Applications ({pendingApps.length})
                </h3>
                {pendingApps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending applications</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pendingApps.slice(0, 5).map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium text-sm">{app.full_name || "No name"}</p>
                          <p className="text-xs text-muted-foreground">{app.hosting_location}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => approveApplication(app)}>
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectApplication(app)}>
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Action Items */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4 border-l-4 border-l-yellow-500">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Open Tickets
                </h4>
                <p className="text-2xl font-bold">{metrics?.tickets_open ?? 0}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-red-500">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Open Incidents
                </h4>
                <p className="text-2xl font-bold">{metrics?.incidents_open ?? 0}</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-gray-500">
                <h4 className="font-medium flex items-center gap-2">
                  <Ban className="w-4 h-4" /> Blacklisted
                </h4>
                <p className="text-2xl font-bold">{metrics?.blacklist_count ?? 0}</p>
              </Card>
            </div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold">User & Host Management</h2>
                <div className="flex gap-2">
                  <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users..."
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.map((u) => {
                      const roles = rolesByUserId.get(u.user_id) ?? [];
                      return (
                        <TableRow key={u.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{u.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{u.phone || "No phone"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>
                            {u.is_suspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : u.is_verified ? (
                              <Badge variant="outline" className="text-green-600">Verified</Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {roles.map((r) => (
                                <Badge
                                  key={r}
                                  variant={r === "admin" ? "default" : "secondary"}
                                  className="cursor-pointer"
                                  onClick={() => removeRole(u.user_id, r)}
                                >
                                  {r} ×
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Select onValueChange={(v) => addRole(u.user_id, v)}>
                                <SelectTrigger className="w-24 h-8">
                                  <SelectValue placeholder="+Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="host">Host</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              {u.is_suspended ? (
                                <Button size="sm" variant="outline" onClick={() => unsuspendUser(u.user_id)}>
                                  Activate
                                </Button>
                              ) : (
                                <Button size="sm" variant="destructive" onClick={() => suspendUser(u.user_id)}>
                                  <Ban className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ACCOMMODATIONS TAB */}
          <TabsContent value="accommodations">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Accommodation Management</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.location || "—"}</TableCell>
                        <TableCell>{formatMoney(p.price_per_night ?? 0, p.currency ?? "RWF")}</TableCell>
                        <TableCell>
                          {p.rating ? (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {Number(p.rating).toFixed(1)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {p.is_published ? (
                              <Badge className="bg-green-100 text-green-800">Live</Badge>
                            ) : (
                              <Badge variant="outline">Draft</Badge>
                            )}
                            {p.is_featured && <Badge className="bg-primary text-white">Featured</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePublished("properties", p.id, !p.is_published)}
                            >
                              {p.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant={p.is_featured ? "default" : "outline"}
                              onClick={() => toggleFeatured("properties", p.id, !p.is_featured)}
                            >
                              <Star className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteItem("properties", p.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* TOURS TAB */}
          <TabsContent value="tours">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Tours & Experiences Management</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tour</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tours.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.location || "—"}</TableCell>
                        <TableCell>{formatMoney(t.price_per_person ?? 0, t.currency ?? "RWF")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {t.is_published ? (
                              <Badge className="bg-green-100 text-green-800">Live</Badge>
                            ) : (
                              <Badge variant="outline">Draft</Badge>
                            )}
                            {t.is_featured && <Badge className="bg-primary text-white">Featured</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePublished("tours", t.id, !t.is_published)}
                            >
                              {t.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant={t.is_featured ? "default" : "outline"}
                              onClick={() => toggleFeatured("tours", t.id, !t.is_featured)}
                            >
                              <Star className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteItem("tours", t.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* TRANSPORT TAB */}
          <TabsContent value="transport">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Transport Management</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price/Day</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.provider_name || "—"}</TableCell>
                        <TableCell>{v.vehicle_type}</TableCell>
                        <TableCell>{formatMoney(v.price_per_day ?? 0, v.currency ?? "RWF")}</TableCell>
                        <TableCell>
                          {v.is_published ? (
                            <Badge className="bg-green-100 text-green-800">Live</Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePublished("transport_vehicles", v.id, !v.is_published)}
                            >
                              {v.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteItem("transport_vehicles", v.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold">Bookings & Orders Management</h2>
                <Select value={bookingStatus} onValueChange={setBookingStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.property_title || "—"}</TableCell>
                        <TableCell className="text-sm">{b.guest_email || b.guest_id}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.check_in} → {b.check_out}
                        </TableCell>
                        <TableCell>{formatMoney(b.total_price, b.currency)}</TableCell>
                        <TableCell>
                          <StatusBadge status={b.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Select onValueChange={(v) => updateBookingStatus(b.id, v)}>
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirm</SelectItem>
                                <SelectItem value="completed">Complete</SelectItem>
                                <SelectItem value="cancelled">Cancel</SelectItem>
                              </SelectContent>
                            </Select>
                            {b.status === "cancelled" && !b.refund_status && (
                              <Button size="sm" variant="outline" onClick={() => processRefund(b)}>
                                Refund
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">{formatMoney(metrics?.revenue_gross ?? 0, "RWF")}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Paid Bookings</p>
                <p className="text-2xl font-bold">{metrics?.bookings_paid ?? 0}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold text-destructive">{formatMoney(metrics?.refunds_total ?? 0, "RWF")}</p>
              </Card>
            </div>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Revenue by Currency</h2>
              <div className="space-y-2">
                {(metrics?.revenue_by_currency ?? []).map((r) => (
                  <div key={r.currency} className="flex justify-between items-center p-3 border rounded">
                    <span className="font-medium">{r.currency}</span>
                    <span className="text-lg font-bold">{formatMoney(r.amount, r.currency)}</span>
                  </div>
                ))}
                {(metrics?.revenue_by_currency ?? []).length === 0 && (
                  <p className="text-muted-foreground">No revenue data yet</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* REVIEWS TAB */}
          <TabsContent value="reviews">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Reviews & Ratings Moderation</h2>
                <div className="text-sm text-muted-foreground">
                  {metrics?.reviews_hidden ?? 0} hidden / {metrics?.reviews_total ?? 0} total
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((r) => (
                      <TableRow key={r.id} className={r.is_hidden ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{r.property_title || "—"}</TableCell>
                        <TableCell className="text-sm">{r.user_email || r.user_id}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {r.rating}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{r.comment || "—"}</TableCell>
                        <TableCell>
                          {r.is_hidden ? (
                            <Badge variant="outline" className="text-red-600">Hidden</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">Visible</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {r.is_hidden ? (
                              <Button size="sm" variant="outline" onClick={() => unhideReview(r.id)}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="destructive" onClick={() => hideReview(r)}>
                                <EyeOff className="w-3 h-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => deleteItem("property_reviews", r.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* SUPPORT TAB */}
          <TabsContent value="support">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold">Support & Dispute Resolution</h2>
                <Select value={ticketStatus} onValueChange={setTicketStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All tickets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{t.subject}</h4>
                          <StatusBadge status={t.status} />
                          {t.priority && (
                            <Badge variant="outline" className={t.priority === "high" ? "text-red-600" : ""}>
                              {t.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{t.message}</p>
                        {t.response && (
                          <div className="bg-muted/50 p-2 rounded text-sm">
                            <span className="font-medium">Response:</span> {t.response}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(t.created_at).toLocaleString()} · User: {t.user_id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {t.status !== "resolved" && t.status !== "closed" && (
                          <>
                            <Button size="sm" onClick={() => respondToTicket(t)}>
                              Respond
                            </Button>
                            <Select onValueChange={(v) => updateTicketStatus(t.id, v)}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Close</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && <p className="text-muted-foreground">No tickets found</p>}
              </div>
            </Card>
          </TabsContent>

          {/* SAFETY TAB */}
          <TabsContent value="safety">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Incidents */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Incident Reports</h2>
                  <Badge variant="outline">{incidents.filter((i) => i.status === "open").length} open</Badge>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {incidents.map((i) => (
                    <div key={i.id} className="border rounded p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{i.incident_type}</span>
                            <Badge
                              variant="outline"
                              className={
                                i.severity === "high"
                                  ? "text-red-600"
                                  : i.severity === "medium"
                                  ? "text-yellow-600"
                                  : ""
                              }
                            >
                              {i.severity}
                            </Badge>
                            <StatusBadge status={i.status} />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{i.description}</p>
                          {i.resolution && (
                            <p className="text-xs mt-1 text-green-600">Resolution: {i.resolution}</p>
                          )}
                        </div>
                        {i.status === "open" && (
                          <Button size="sm" onClick={() => resolveIncident(i)}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {incidents.length === 0 && <p className="text-muted-foreground">No incidents</p>}
                </div>
              </Card>

              {/* Blacklist */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Blacklisted Users</h2>
                  <Button size="sm" onClick={addToBlacklist}>
                    <Ban className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {blacklist.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="text-sm font-mono">{b.user_id.slice(0, 12)}...</p>
                        <p className="text-xs text-muted-foreground">{b.reason}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => removeFromBlacklist(b.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                  {blacklist.length === 0 && <p className="text-muted-foreground">No blacklisted users</p>}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <h4 className="text-sm text-muted-foreground mb-2">Booking Statistics</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="font-medium">{metrics?.bookings_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-medium text-yellow-600">{metrics?.bookings_pending ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confirmed</span>
                    <span className="font-medium text-green-600">{metrics?.bookings_confirmed ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-medium text-blue-600">{metrics?.bookings_completed ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancelled</span>
                    <span className="font-medium text-red-600">{metrics?.bookings_cancelled ?? 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm text-muted-foreground mb-2">Listings Overview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Properties</span>
                    <span className="font-medium">
                      {metrics?.properties_published ?? 0} / {metrics?.properties_total ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Featured</span>
                    <span className="font-medium text-primary">{metrics?.properties_featured ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tours</span>
                    <span className="font-medium">
                      {metrics?.tours_published ?? 0} / {metrics?.tours_total ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vehicles</span>
                    <span className="font-medium">
                      {metrics?.transport_vehicles_published ?? 0} / {metrics?.transport_vehicles_total ?? 0}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm text-muted-foreground mb-2">Support Metrics</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Tickets</span>
                    <span className="font-medium">{metrics?.tickets_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Open</span>
                    <span className="font-medium text-yellow-600">{metrics?.tickets_open ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In Progress</span>
                    <span className="font-medium text-blue-600">{metrics?.tickets_in_progress ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolved</span>
                    <span className="font-medium text-green-600">{metrics?.tickets_resolved ?? 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm text-muted-foreground mb-2">User Breakdown</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Users</span>
                    <span className="font-medium">{metrics?.users_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hosts</span>
                    <span className="font-medium">{metrics?.hosts_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Suspended</span>
                    <span className="font-medium text-red-600">{metrics?.users_suspended ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Blacklisted</span>
                    <span className="font-medium text-red-600">{metrics?.blacklist_count ?? 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm text-muted-foreground mb-2">Content Stats</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Reviews</span>
                    <span className="font-medium">{metrics?.reviews_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hidden Reviews</span>
                    <span className="font-medium text-red-600">{metrics?.reviews_hidden ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stories</span>
                    <span className="font-medium">{metrics?.stories_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cart Items</span>
                    <span className="font-medium">{metrics?.orders_total ?? 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm text-muted-foreground mb-2">Safety Metrics</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Incidents</span>
                    <span className="font-medium">{metrics?.incidents_total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Open Incidents</span>
                    <span className="font-medium text-yellow-600">{metrics?.incidents_open ?? 0}</span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Export Reports</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" /> Bookings CSV
                </Button>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" /> Revenue Report
                </Button>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" /> User Report
                </Button>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" /> Host Performance
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Export functionality coming soon</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
