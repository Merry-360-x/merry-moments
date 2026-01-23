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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  DollarSign,
  Activity,
  Megaphone,
  Image as ImageIcon,
  AlertCircle,
  Mail,
  UserX,
} from "lucide-react";

type HostApplicationStatus = "draft" | "pending" | "approved" | "rejected";
type HostApplicationRow = {
  id: string;
  user_id: string;
  status: HostApplicationStatus;
  applicant_type: string | null;
  service_types: string[] | null;
  full_name: string | null;
  phone: string | null;
  about: string | null;
  national_id_number: string | null;
  national_id_photo_url: string | null;
  business_name: string | null;
  business_tin: string | null;
  hosting_location: string | null;
  // Common listing fields
  listing_title: string | null;
  listing_location: string | null;
  listing_description: string | null;
  listing_currency: string | null;
  listing_images: string[] | null;
  // Property fields
  listing_property_type: string | null;
  listing_price_per_night: number | null;
  listing_max_guests: number | null;
  listing_bedrooms: number | null;
  listing_bathrooms: number | null;
  listing_amenities: string[] | null;
  // Tour fields
  listing_tour_category: string | null;
  listing_tour_duration_days: number | null;
  listing_tour_difficulty: string | null;
  listing_tour_price_per_person: number | null;
  listing_tour_max_group_size: number | null;
  // Transport fields
  listing_vehicle_type: string | null;
  listing_vehicle_seats: number | null;
  listing_vehicle_price_per_day: number | null;
  listing_vehicle_driver_included: boolean | null;
  listing_vehicle_provider_name: string | null;
  created_at: string;
  updated_at: string | null;
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
  host_id: string | null;
  rating: number | null;
  images: string[] | null;
  created_at: string;
};

type TourRow = {
  id: string;
  title: string;
  location: string | null;
  price_per_person: number | null;
  currency: string | null;
  is_published: boolean | null;
  images: string[] | null;
  created_by: string | null;
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
  image_url: string | null;
  media: string[] | null;
  created_by: string | null;
  created_at: string;
};

type BookingRow = {
  id: string;
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

type ReviewRow = {
  id: string;
  property_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
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

type AdBannerRow = {
  id: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  bg_color: string | null;
  text_color: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type TabValue =
  | "overview"
  | "ads"
  | "host-applications"
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

// Tiny thumbnail component
const Thumb = ({ src, alt }: { src: string | null | undefined; alt: string }) => (
  <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
    {src ? (
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    ) : (
      <ImageIcon className="w-5 h-5 text-muted-foreground" />
    )}
  </div>
);

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"all" | string>("all");
  const [ticketStatus, setTicketStatus] = useState<"all" | string>("all");
  const [roleToAdd, setRoleToAdd] = useState<Record<string, string>>({});
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);

  const [newBanner, setNewBanner] = useState<Omit<AdBannerRow, "id" | "created_at" | "updated_at">>({
    message: "",
    cta_label: null,
    cta_url: null,
    bg_color: "rgba(239, 68, 68, 0.08)",
    text_color: null,
    sort_order: 0,
    is_active: true,
    starts_at: null,
    ends_at: null,
  });
  const [bannerEdits, setBannerEdits] = useState<Record<string, Partial<AdBannerRow>>>({});

  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState<{ url: string; title: string } | null>(null);
  const [contactedHosts, setContactedHosts] = useState<Set<string>>(new Set());
  const [suspendingHost, setSuspendingHost] = useState<string | null>(null);

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to properties changes
    const propertiesChannel = supabase
      .channel('admin-properties-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
        queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] });
      })
      .subscribe();
    channels.push(propertiesChannel);

    // Subscribe to tours changes
    const toursChannel = supabase
      .channel('admin-tours-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tours' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-tours'] });
        queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] });
      })
      .subscribe();
    channels.push(toursChannel);

    // Subscribe to transport_vehicles changes
    const vehiclesChannel = supabase
      .channel('admin-vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_vehicles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-transport-vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] });
      })
      .subscribe();
    channels.push(vehiclesChannel);

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('admin-bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] });
      })
      .subscribe();
    channels.push(bookingsChannel);

    // Subscribe to host_applications changes
    const applicationsChannel = supabase
      .channel('admin-applications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_applications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['host_applications'] });
        queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] });
      })
      .subscribe();
    channels.push(applicationsChannel);

    // Subscribe to user_roles changes
    const rolesChannel = supabase
      .channel('admin-roles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      })
      .subscribe();
    channels.push(rolesChannel);

    // Subscribe to profiles changes (for user management)
    const profilesChannel = supabase
      .channel('admin-profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_list_users'] });
        queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] });
      })
      .subscribe();
    channels.push(profilesChannel);

    // Subscribe to property_reviews changes
    const reviewsChannel = supabase
      .channel('admin-reviews-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_reviews' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
        queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] });
      })
      .subscribe();
    channels.push(reviewsChannel);

    // Subscribe to ad_banners changes
    const bannersChannel = supabase
      .channel('admin-banners-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_banners' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_ad_banners'] });
      })
      .subscribe();
    channels.push(bannersChannel);

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, queryClient]);

  // Metrics query - always enabled for overview data
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["admin_dashboard_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_metrics");
      if (error) {
        console.error("RPC Error:", error);
        throw error;
      }
      return data as unknown as Metrics;
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData, // Keep showing old data while refetching
  });

  const { data: adBanners = [], refetch: refetchAdBanners } = useQuery({
    queryKey: ["admin_ad_banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_banners")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdBannerRow[];
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData, // Keep showing old data while refetching
  });

  const upsertBanner = async (payload: Partial<AdBannerRow> & { id?: string }) => {
    try {
      if (!payload.message?.trim()) {
        toast({ variant: "destructive", title: "Message is required" });
        return;
      }
      if (payload.id) {
        const { error } = await supabase
          .from("ad_banners")
          .update({
            message: payload.message.trim(),
            cta_label: payload.cta_label || null,
            cta_url: payload.cta_url || null,
            bg_color: payload.bg_color || null,
            text_color: payload.text_color || null,
            sort_order: payload.sort_order ?? 0,
            is_active: Boolean(payload.is_active),
            starts_at: payload.starts_at || null,
            ends_at: payload.ends_at || null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ad_banners").insert({
          message: payload.message.trim(),
          cta_label: payload.cta_label || null,
          cta_url: payload.cta_url || null,
          bg_color: payload.bg_color || null,
          text_color: payload.text_color || null,
          sort_order: payload.sort_order ?? 0,
          is_active: Boolean(payload.is_active),
          starts_at: payload.starts_at || null,
          ends_at: payload.ends_at || null,
        } as never);
        if (error) throw error;
      }
      toast({ title: "Saved" });
      setNewBanner({
        message: "",
        cta_label: null,
        cta_url: null,
        bg_color: "rgba(239, 68, 68, 0.08)",
        text_color: null,
        sort_order: 0,
        is_active: true,
        starts_at: null,
        ends_at: null,
      });
      await refetchAdBanners();
      if (payload.id) {
        setBannerEdits((prev) => {
          const next = { ...prev };
          delete next[payload.id as string];
          return next;
        });
      }
    } catch (e) {
      logError("admin.ad_banners.upsert", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e) });
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      const { error } = await supabase.from("ad_banners").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted" });
      await refetchAdBanners();
    } catch (e) {
      logError("admin.ad_banners.delete", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e) });
    }
  };

  // Host applications - always enabled for overview metrics
  const { data: applications = [], refetch: refetchApplications } = useQuery({
    queryKey: ["host_applications", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_applications")
        // Use * so this query works even if some columns aren't present yet on the remote DB
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HostApplicationRow[];
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 15, // 15 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });

  // User roles - always enabled for user management
  const { data: roleRows = [], refetch: refetchRoles } = useQuery({
    queryKey: ["user_roles", "admin-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role, created_at");
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 15, // 15 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
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

  // Users - always enabled for better performance
  const { data: adminUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ["admin_list_users", userSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { _search: userSearch });
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 15, // 15 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
    // Always enabled for better dashboard responsiveness
  });

  // Properties with images - enhanced loading
  const { data: properties = [], refetch: refetchProperties } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, location, price_per_night, currency, is_published, host_id, rating, images, created_at")
        .order("created_at", { ascending: false })
        .limit(300); // Increase limit for better data coverage
      if (error) throw error;
      return (data ?? []) as PropertyRow[];
    },
    enabled: tab === "accommodations" || tab === "overview", // Also load for overview
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 20, // 20 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });

  // Tours with images - enhanced loading - includes tour_packages
  const { data: tours = [], refetch: refetchTours } = useQuery({
    queryKey: ["admin-tours"],
    queryFn: async () => {
      // Fetch both tours and tour_packages
      const [toursRes, packagesRes] = await Promise.all([
        supabase
          .from("tours")
          .select("id, title, location, price_per_person, currency, is_published, images, created_by, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("tour_packages")
          .select("id, title, city, country, price_per_adult, currency, status, cover_image, gallery_images, host_id, created_at")
          .order("created_at", { ascending: false })
          .limit(300)
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
        images: [pkg.cover_image, ...(Array.isArray(pkg.gallery_images) ? pkg.gallery_images : [])].filter(Boolean) as string[],
        created_by: pkg.host_id,
        created_at: pkg.created_at,
        source: "tour_packages" as const
      }));
      
      return [...toursWithSource, ...packagesAsTours] as TourRow[];
    },
    enabled: tab === "tours" || tab === "overview", // Also load for overview
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 20, // 20 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });

  // Transport vehicles with images - enhanced loading
  const { data: vehicles = [], refetch: refetchVehicles } = useQuery({
    queryKey: ["admin-transport-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_vehicles")
        .select("id, title, provider_name, vehicle_type, seats, price_per_day, currency, is_published, image_url, media, created_by, created_at")
        .order("created_at", { ascending: false })
        .limit(300); // Increase limit
      if (error) throw error;
      return (data ?? []) as TransportVehicleRow[];
    },
    enabled: tab === "transport" || tab === "overview", // Also load for overview
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 20, // 20 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });

  // Bookings - direct query with enhanced loading
  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ["admin-bookings-direct", bookingStatus],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        // guest_* fields support guest checkout (guest_id can be NULL)
        .select(
          "id, property_id, guest_id, guest_name, guest_email, guest_phone, is_guest_booking, check_in, check_out, guests, total_price, currency, status, payment_status, payment_method, special_requests, host_id, created_at, properties(title, images)"
        )
        .order("created_at", { ascending: false })
        .limit(500); // Increase limit for comprehensive booking data
      if (bookingStatus && bookingStatus !== "all") q = q.eq("status", bookingStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
    enabled: tab === "bookings" || tab === "payments" || tab === "overview", // Also for overview
    staleTime: 1000 * 20, // 20 seconds for booking data
    gcTime: 1000 * 60 * 10, // 10 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });
  // Reviews - direct query with enhanced loading
  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["admin-reviews-direct"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_reviews")
        .select("id, property_id, user_id, rating, comment, is_hidden, created_at")
        .order("created_at", { ascending: false })
        .limit(300); // Increase limit
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.message?.includes("does not exist") || error.code === "42P01" || error.code === "PGRST204") {
          console.warn("property_reviews table not yet created in database");
          return [];
        }
        throw error;
      }
      return (data ?? []) as ReviewRow[];
    },
    enabled: tab === "reviews" || tab === "overview", // Also for overview
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 15, // 15 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });

  // Support tickets - enhanced loading
  const { data: tickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ["admin-tickets", ticketStatus],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("id, user_id, subject, message, category, status, priority, response, created_at")
        .order("created_at", { ascending: false })
        .limit(300); // Increase limit
      if (ticketStatus && ticketStatus !== "all") q = q.eq("status", ticketStatus);
      const { data, error } = await q;
      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.message?.includes("does not exist") || error.code === "42P01" || error.code === "PGRST204") {
          console.warn("support_tickets table not yet created in database");
          return [];
        }
        throw error;
      }
      return (data ?? []) as SupportTicketRow[];
    },
    enabled: tab === "support" || tab === "overview", // Also for overview
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes cache retention
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
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

  // Note: Real-time updates are handled by the comprehensive subscription setup above

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

  // Actions
  const approveApplication = async (app: HostApplicationRow) => {
    try {
      // Update application status
      const { error: updateErr } = await supabase
        .from("host_applications")
        .update({ status: "approved" as never })
        .eq("id", app.id);
      if (updateErr) throw updateErr;

      // Add host role
      const { error: roleErr } = await supabase.from("user_roles").upsert(
        { user_id: app.user_id, role: "host" },
        { onConflict: "user_id,role" }
      );
      if (roleErr) throw roleErr;

      // Create listings from application data for ALL selected service types
      if (app.service_types && app.service_types.length > 0) {
        const createdListings: string[] = [];
        
        for (const serviceType of app.service_types) {
          try {
            if (serviceType === "accommodation") {
              // Get data from new JSON field or fall back to old flat fields
              const accommodationData = app.accommodation_data || {};
              
              const propertyPayload = {
                name: accommodationData.title || app.listing_title,
                title: accommodationData.title || app.listing_title,
                location: accommodationData.location || app.listing_location,
                address: null,
                property_type: accommodationData.property_type || app.listing_property_type || "Apartment",
                description: accommodationData.description || app.listing_description || app.about || "",
                price_per_night: accommodationData.price_per_night || app.listing_price_per_night || 50000,
                currency: accommodationData.currency || app.listing_currency || "RWF",
                max_guests: accommodationData.max_guests || app.listing_max_guests || 2,
                bedrooms: accommodationData.bedrooms || app.listing_bedrooms || 1,
                bathrooms: accommodationData.bathrooms || app.listing_bathrooms || 1,
                beds: accommodationData.beds || app.listing_beds || accommodationData.bedrooms || app.listing_bedrooms || 1,
                images: accommodationData.images || app.listing_images || [],
                main_image: (accommodationData.images || app.listing_images)?.[0] || null,
                amenities: accommodationData.amenities || app.listing_amenities || [],
                host_id: app.user_id,
                is_published: true,
                rating: 0,
                review_count: 0,
              };

              console.log("[AdminDashboard] Creating property with payload:", propertyPayload);

              const { data: createdProperty, error: propErr } = await supabase
                .from("properties")
                .insert(propertyPayload as never)
                .select()
                .single();

              if (propErr) {
                console.error("[AdminDashboard] Property creation error:", propErr);
                throw propErr;
              }
              console.log("[AdminDashboard] ✅ Property created successfully:", createdProperty);
              createdListings.push(`Property "${createdProperty.title}"`);
              
            } else if (serviceType === "tour") {
              // Get data from new JSON field or fall back to old flat fields
              const tourData = app.tour_data || {};
              
              const tourPayload = {
                title: tourData.title || app.listing_title,
                location: tourData.location || app.listing_location,
                description: tourData.description || app.listing_description || app.about || "",
                category: tourData.category || app.listing_tour_category || "Adventure",
                duration_days: tourData.duration_days || app.listing_tour_duration_days || 1,
                difficulty: tourData.difficulty || app.listing_tour_difficulty || "Easy",
                price_per_person: tourData.price_per_person || app.listing_tour_price_per_person || 100,
                currency: tourData.currency || app.listing_currency || "RWF",
                max_group_size: tourData.max_group_size || app.listing_tour_max_group_size || 10,
                images: tourData.images || app.listing_images || [],
                created_by: app.user_id,
                is_published: true,
                rating: 0,
                review_count: 0,
              };

              console.log("[AdminDashboard] Creating tour with payload:", tourPayload);

              const { data: createdTour, error: tourErr } = await supabase
                .from("tours")
                .insert(tourPayload as never)
                .select()
                .single();

              if (tourErr) {
                console.error("[AdminDashboard] Tour creation error:", tourErr);
                throw tourErr;
              }
              console.log("[AdminDashboard] ✅ Tour created successfully:", createdTour);
              createdListings.push(`Tour "${createdTour.title}"`);
              
            } else if (serviceType === "transport") {
              // Get data from new JSON field or fall back to old flat fields
              const transportData = app.transport_data || {};
              
              const vehiclePayload = {
                title: transportData.title || app.listing_title,
                provider_name: transportData.provider_name || app.listing_vehicle_provider_name || app.full_name || "Provider",
                vehicle_type: transportData.vehicle_type || app.listing_vehicle_type || "Car",
                seats: transportData.seats || app.listing_vehicle_seats || 4,
                price_per_day: transportData.price_per_day || app.listing_vehicle_price_per_day || 50,
                currency: transportData.currency || app.listing_currency || "RWF",
                driver_included: transportData.driver_included ?? app.listing_vehicle_driver_included ?? false,
                image_url: (transportData.images || app.listing_images)?.[0] || null,
                media: transportData.images || app.listing_images || [],
                created_by: app.user_id,
                is_published: true,
              };

              console.log("[AdminDashboard] Creating transport vehicle with payload:", vehiclePayload);

              const { data: createdVehicle, error: vehicleErr } = await supabase
                .from("transport_vehicles")
                .insert(vehiclePayload as never)
                .select()
                .single();

              if (vehicleErr) {
                console.error("[AdminDashboard] Transport vehicle creation error:", vehicleErr);
                throw vehicleErr;
              }
              console.log("[AdminDashboard] ✅ Transport vehicle created successfully:", createdVehicle);
              createdListings.push(`Transport "${createdVehicle.title}"`);
            }
          } catch (listingErr: any) {
            console.error(`❌ Failed to create ${serviceType} from application:`, listingErr);
            createdListings.push(`${serviceType} (failed: ${listingErr.message})`);
          }
        }

        // Show success message with all created listings
        if (createdListings.length > 0) {
          toast({ 
            title: "Application approved", 
            description: `${app.full_name} is now a host! Created: ${createdListings.join(", ")}` 
          });
        } else {
          toast({ 
            title: "Application approved", 
            description: `${app.full_name} is now a host!` 
          });
        }
        
        await Promise.all([refetchApplications(), refetchRoles(), refetchMetrics()]);
        return;
      }

      // If no listing data provided, just approve as host
      toast({ 
        title: "Application approved", 
        description: `${app.full_name} is now a host!` 
      });
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

  const handleAddRole = async (userId: string) => {
    const role = roleToAdd[userId];
    if (!role) {
      toast({ variant: "destructive", title: "Select a role first" });
      return;
    }
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      toast({ title: "Role added", description: `${role} granted successfully.` });
      setRoleToAdd((prev) => ({ ...prev, [userId]: "" }));
      await Promise.all([refetchRoles(), refetchUsers()]);
    } catch (e) {
      logError("admin.addRole", e);
      toast({ variant: "destructive", title: "Failed to add role", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const removeRole = async (userId: string, role: string) => {
    if (!window.confirm(`Remove '${role}' role from this user?`)) return;
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

  const suspendUser = async (userId: string, applicationId?: string, customReason?: string) => {
    const reason = customReason || window.prompt("Suspension reason:");
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

      // If applicationId provided, reject the application
      if (applicationId) {
        await supabase
          .from('host_applications')
          .update({ 
            status: 'rejected' as 'pending' | 'approved' | 'rejected',
            review_notes: reason
          })
          .eq('id', applicationId);

        // Remove host role if they had it
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'host');
      }

      toast({ title: "User suspended" });
      await Promise.all([refetchUsers(), refetchMetrics(), refetchApplications()]);
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

  const deleteItem = async (table: string, id: string, source?: string) => {
    if (!window.confirm("Delete this item permanently?")) return;
    try {
      // For tours, use the source to determine which table to delete from
      const targetTable = source || table;
      console.log('[AdminDashboard] Deep deleting from table:', targetTable, 'ID:', id);
      
      const { error } = await supabase.from(targetTable as never).delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Deleted successfully" });
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

  const hideReview = async (reviewId: string) => {
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
        .eq("id", reviewId);
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

  // Export booking details
  const exportBooking = (booking: BookingRow) => {
    const bookingData = {
      'Booking ID': booking.id,
      'Guest Name': booking.is_guest_booking ? booking.guest_name : booking.guest_id,
      'Guest Email': booking.guest_email || 'N/A',
      'Guest Phone': booking.guest_phone || 'N/A',
      'Check In': booking.check_in,
      'Check Out': booking.check_out,
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
    toast({ title: "Booking exported successfully" });
  };

  // Export payment receipt
  const exportReceipt = (booking: BookingRow) => {
    const receiptContent = `
PAYMENT RECEIPT
================
Receipt Date: ${new Date().toLocaleString()}

BOOKING INFORMATION
-------------------
Booking ID: ${booking.id}
Guest Name: ${booking.is_guest_booking ? booking.guest_name : booking.guest_id}
Guest Email: ${booking.guest_email || 'N/A'}
Guest Phone: ${booking.guest_phone || 'N/A'}

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
    toast({ title: "Receipt exported successfully" });
  };

  const pendingApps = applications.filter((a) => a.status === "pending");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchMetrics()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="overview" className="gap-1">
              <BarChart3 className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="ads" className="gap-1">
              <Megaphone className="w-4 h-4" /> Ads
            </TabsTrigger>
            <TabsTrigger value="host-applications" className="gap-1">
              <UserPlus className="w-4 h-4" /> Host Applications
              {applications.filter(a => a.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                  {applications.filter(a => a.status === 'pending').length}
                </Badge>
              )}
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

            {/* Pending Payments Section */}
            <Card className="p-4 mb-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-yellow-600" /> 
                Pending Payments ({bookings.filter(b => b.payment_status === 'pending').length})
              </h3>
              {bookings.filter(b => b.payment_status === 'pending').length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending payments</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.filter(b => b.payment_status === 'pending').slice(0, 10).map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}...</TableCell>
                          <TableCell className="text-sm">
                            {b.is_guest_booking ? b.guest_name || "Guest" : b.profiles?.full_name || b.guest_id?.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-sm">{b.properties?.title || "—"}</TableCell>
                          <TableCell className="font-medium">{formatMoney(b.total_price, b.currency)}</TableCell>
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
                                setBookingDetailsOpen(true);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>

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

          {/* ADS TAB */}
          <TabsContent value="ads">
            <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
                <h2 className="text-lg font-semibold mb-1">Header Ad Strip</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  These banners rotate above the header every 5 seconds.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Message *</label>
                    <Input
                      value={newBanner.message}
                      onChange={(e) => setNewBanner((b) => ({ ...b, message: e.target.value }))}
                      placeholder="e.g., New: 10% off weekly stays"
                      className="mt-1"
                    />
            </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">CTA Label</label>
                      <Input
                        value={newBanner.cta_label ?? ""}
                        onChange={(e) => setNewBanner((b) => ({ ...b, cta_label: e.target.value || null }))}
                        placeholder="e.g., Learn more"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">CTA URL</label>
                      <Input
                        value={newBanner.cta_url ?? ""}
                        onChange={(e) => setNewBanner((b) => ({ ...b, cta_url: e.target.value || null }))}
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium">Sort</label>
                      <Input
                        type="number"
                        value={newBanner.sort_order}
                        onChange={(e) => setNewBanner((b) => ({ ...b, sort_order: Number(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Background</label>
                      <Input
                        value={newBanner.bg_color ?? ""}
                        onChange={(e) => setNewBanner((b) => ({ ...b, bg_color: e.target.value || null }))}
                        placeholder="rgba(...) or #fff"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Text</label>
                      <Input
                        value={newBanner.text_color ?? ""}
                        onChange={(e) => setNewBanner((b) => ({ ...b, text_color: e.target.value || null }))}
                        placeholder="#111"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium">Active</p>
                      <p className="text-xs text-muted-foreground">Only active banners show publicly</p>
                    </div>
                    <Select
                      value={newBanner.is_active ? "active" : "inactive"}
                      onValueChange={(v) => setNewBanner((b) => ({ ...b, is_active: v === "active" }))}
                    >
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => refetchAdBanners()}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => upsertBanner(newBanner)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Add Banner
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Existing Banners</h2>
                  <Badge variant="outline">{adBanners.length}</Badge>
                </div>

            <div className="space-y-3">
                  {adBanners.map((b) => (
                    <div key={b.id} className="border rounded-xl p-4 space-y-3">
                      {(() => {
                        const draft = { ...b, ...(bannerEdits[b.id] ?? {}) } as AdBannerRow;
                        const hasEdits = Boolean(bannerEdits[b.id]);
                        return (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <Input
                                  value={draft.message}
                                  onChange={(e) =>
                                    setBannerEdits((prev) => ({
                                      ...prev,
                                      [b.id]: { ...(prev[b.id] ?? {}), message: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => upsertBanner({ ...b, is_active: !b.is_active })}
                                  title={b.is_active ? "Deactivate" : "Activate"}
                                >
                                  {b.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!hasEdits}
                                  onClick={() => upsertBanner(draft)}
                                  title="Save changes"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!hasEdits}
                                  onClick={() =>
                                    setBannerEdits((prev) => {
                                      const next = { ...prev };
                                      delete next[b.id];
                                      return next;
                                    })
                                  }
                                  title="Discard changes"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteBanner(b.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                value={draft.cta_label ?? ""}
                                onChange={(e) =>
                                  setBannerEdits((prev) => ({
                                    ...prev,
                                    [b.id]: { ...(prev[b.id] ?? {}), cta_label: e.target.value || null },
                                  }))
                                }
                                placeholder="CTA label"
                              />
                              <Input
                                value={draft.cta_url ?? ""}
                                onChange={(e) =>
                                  setBannerEdits((prev) => ({
                                    ...prev,
                                    [b.id]: { ...(prev[b.id] ?? {}), cta_url: e.target.value || null },
                                  }))
                                }
                                placeholder="CTA url"
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <Input
                                type="number"
                                value={draft.sort_order ?? 0}
                                onChange={(e) =>
                                  setBannerEdits((prev) => ({
                                    ...prev,
                                    [b.id]: { ...(prev[b.id] ?? {}), sort_order: Number(e.target.value) },
                                  }))
                                }
                                placeholder="Sort"
                              />
                              <Input
                                value={draft.bg_color ?? ""}
                                onChange={(e) =>
                                  setBannerEdits((prev) => ({
                                    ...prev,
                                    [b.id]: { ...(prev[b.id] ?? {}), bg_color: e.target.value || null },
                                  }))
                                }
                                placeholder="Background"
                              />
                              <Input
                                value={draft.text_color ?? ""}
                                onChange={(e) =>
                                  setBannerEdits((prev) => ({
                                    ...prev,
                                    [b.id]: { ...(prev[b.id] ?? {}), text_color: e.target.value || null },
                                  }))
                                }
                                placeholder="Text"
                              />
                            </div>

                            <div
                              className="rounded-lg px-3 py-2 text-sm flex items-center justify-between gap-2"
                              style={{
                                backgroundColor: draft.bg_color || "rgba(239, 68, 68, 0.08)",
                                color: draft.text_color || "inherit",
                              }}
                            >
                              <span className="font-medium">{draft.message}</span>
                              {draft.cta_label && draft.cta_url && (
                                <span className="underline underline-offset-4 font-semibold">{draft.cta_label}</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}

                  {adBanners.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                      No banners yet. Add one on the left.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* HOST APPLICATIONS TAB */}
          <TabsContent value="host-applications">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Host Applications</h2>
                  <p className="text-sm text-muted-foreground">
                    Review and approve host verification documents
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchApplications()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No host applications yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending Applications */}
                  {applications.filter(a => a.status === 'pending').length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        Pending Review ({applications.filter(a => a.status === 'pending').length})
                      </h3>
                      <div className="space-y-4">
                        {applications.filter(a => a.status === 'pending').map((app: any) => (
                          <Card key={app.id} className="p-5 border-l-4 border-l-yellow-500">
                            <div className="grid lg:grid-cols-2 gap-6">
                              {/* Left: Application Info */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold text-lg mb-2">{app.full_name || 'No name'}</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="text-muted-foreground">Phone:</span> {app.phone || '—'}</p>
                                    <p><span className="text-muted-foreground">Type:</span> {app.applicant_type || 'individual'}</p>
                                    {app.business_name && (
                                      <p><span className="text-muted-foreground">Business:</span> {app.business_name}</p>
                                    )}
                                    {app.business_tin && (
                                      <p><span className="text-muted-foreground">TIN:</span> {app.business_tin}</p>
                                    )}
                                    {app.national_id_number && (
                                      <p><span className="text-muted-foreground">National ID:</span> {app.national_id_number}</p>
                                    )}
                                    <p><span className="text-muted-foreground">Location:</span> {app.hosting_location || '—'}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Applied: {new Date(app.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                {app.about && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">About</label>
                                    <p className="text-sm mt-1">{app.about}</p>
                                  </div>
                                )}
                              </div>

                              {/* Right: Documents */}
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium mb-2 block">National ID Photo</label>
                                  {app.national_id_photo_url ? (
                                    <div>
                                      <div 
                                        onClick={() => setViewingDocument({ url: app.national_id_photo_url, title: `National ID - ${app.full_name}` })}
                                        className="block border rounded-lg overflow-hidden hover:ring-2 ring-primary cursor-pointer transition-all"
                                      >
                                        <img 
                                          src={app.national_id_photo_url} 
                                          alt="National ID" 
                                          className="w-full h-48 object-cover"
                                        />
                                        <div className="bg-muted p-2 text-center text-xs flex items-center justify-center gap-2">
                                          <Eye className="w-3 h-3" />
                                          Click to view full size
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full mt-2"
                                        onClick={() => window.open(app.national_id_photo_url, '_blank')}
                                      >
                                        <Download className="w-3 h-3 mr-2" />
                                        Download
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="border rounded-lg p-8 text-center text-muted-foreground">
                                      <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                      <p className="text-sm">No ID photo uploaded</p>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <label className="text-sm font-medium mb-2 block">Selfie Photo</label>
                                  {app.selfie_photo_url ? (
                                    <div>
                                      <div 
                                        onClick={() => setViewingDocument({ url: app.selfie_photo_url, title: `Selfie - ${app.full_name}` })}
                                        className="block border rounded-lg overflow-hidden hover:ring-2 ring-primary cursor-pointer transition-all"
                                      >
                                        <img 
                                          src={app.selfie_photo_url} 
                                          alt="Selfie" 
                                          className="w-full h-48 object-cover"
                                        />
                                        <div className="bg-muted p-2 text-center text-xs flex items-center justify-center gap-2">
                                          <Eye className="w-3 h-3" />
                                          Click to view full size
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full mt-2"
                                        onClick={() => window.open(app.selfie_photo_url, '_blank')}
                                      >
                                        <Download className="w-3 h-3 mr-2" />
                                        Download
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="border rounded-lg p-8 text-center text-muted-foreground">
                                      <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                      <p className="text-sm">No selfie uploaded</p>
                                    </div>
                                  )}
                                </div>

                                {/* ID/Selfie Verification Warning */}
                                {app.national_id_photo_url && app.selfie_photo_url && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-yellow-800">Verify Identity Match</p>
                                        <p className="text-xs text-yellow-700 mt-1">
                                          Compare the National ID photo with the selfie photo to confirm they match the same person.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Review Actions */}
                                <div className="space-y-2 pt-2">
                                  <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase
                                          .from('host_applications')
                                          .update({ status: 'approved' })
                                          .eq('id', app.id);
                                        
                                        if (error) throw error;

                                        // Add host role
                                        await supabase.from('user_roles').upsert({
                                          user_id: app.user_id,
                                          role: 'host',
                                        });

                                        toast({ title: 'Application Approved', description: 'Host role has been granted.' });
                                        refetchApplications();
                                      } catch (e) {
                                        logError('admin.approve_host', e);
                                        toast({ variant: 'destructive', title: 'Failed to approve', description: uiErrorMessage(e) });
                                      }
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase
                                          .from('host_applications')
                                          .update({ status: 'rejected' })
                                          .eq('id', app.id);
                                        
                                        if (error) throw error;
                                        toast({ title: 'Application Rejected' });
                                        refetchApplications();
                                      } catch (e) {
                                        logError('admin.reject_host', e);
                                        toast({ variant: 'destructive', title: 'Failed to reject', description: uiErrorMessage(e) });
                                      }
                                    }}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </Button>
                                  </div>

                                  {/* Contact & Suspend Workflow for ID Mismatch */}
                                  {app.national_id_photo_url && app.selfie_photo_url && (
                                    <div className="border-t pt-2 space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">If ID & Selfie don't match:</p>
                                      <div className="flex gap-2">
                                        {!contactedHosts.has(app.id) ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                                            onClick={() => {
                                              setContactedHosts(prev => new Set([...prev, app.id]));
                                              toast({ 
                                                title: 'Marked as Contacted', 
                                                description: `Contact ${app.full_name} (${app.phone}) to verify their identity before taking action.` 
                                              });
                                            }}
                                          >
                                            <Mail className="w-3 h-3 mr-2" />
                                            1. Contact Host First
                                          </Button>
                                        ) : (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="border-green-200 text-green-700"
                                              onClick={() => {
                                                setContactedHosts(prev => {
                                                  const newSet = new Set(prev);
                                                  newSet.delete(app.id);
                                                  return newSet;
                                                });
                                                toast({ title: 'Cleared contact status' });
                                              }}
                                            >
                                              <CheckCircle className="w-3 h-3 mr-2" />
                                              Contacted ✓
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              className="flex-1"
                                              onClick={() => setSuspendingHost(app.id)}
                                            >
                                              <UserX className="w-3 h-3 mr-2" />
                                              2. Suspend & Reject
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Applications Table */}
                  <div>
                    <h3 className="text-md font-semibold mb-3">All Applications</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Documents</TableHead>
                            <TableHead>Applied</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.map((app: any) => (
                            <TableRow key={app.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{app.full_name || '—'}</p>
                                  {app.business_name && (
                                    <p className="text-xs text-muted-foreground">{app.business_name}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{app.phone || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{app.applicant_type || 'individual'}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColors[app.status] || 'bg-gray-100'}>
                                  {app.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="flex gap-1">
                                  {app.national_id_photo_url ? (
                                    <Badge variant="outline" className="text-green-600">ID ✓</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-gray-400">No ID</Badge>
                                  )}
                                  {app.selfie_photo_url ? (
                                    <Badge variant="outline" className="text-green-600">Selfie ✓</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-gray-400">No Selfie</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(app.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {app.national_id_photo_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setViewingDocument({ 
                                        url: app.national_id_photo_url, 
                                        title: `National ID - ${app.full_name}` 
                                      })}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      ID
                                    </Button>
                                  )}
                                  {app.selfie_photo_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setViewingDocument({ 
                                        url: app.selfie_photo_url, 
                                        title: `Selfie - ${app.full_name}` 
                                      })}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Selfie
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold">User & Host Management</h2>
                <div className="relative flex-1 md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users..."
                    className="pl-9"
                  />
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
                      <TableHead>Assign Role</TableHead>
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
                              {roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                              {roles.map((r) => (
                                <Badge
                                  key={r}
                                  variant={r === "admin" ? "default" : "secondary"}
                                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => removeRole(u.user_id, r)}
                                  title="Click to remove"
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
                            <div className="flex gap-1">
                              <Select
                                value={roleToAdd[u.user_id] || ""}
                                onValueChange={(v) => setRoleToAdd((prev) => ({ ...prev, [u.user_id]: v }))}
                              >
                                <SelectTrigger className="w-24 h-8">
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="host">Host</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => handleAddRole(u.user_id)}
                                disabled={!roleToAdd[u.user_id]}
                              >
                                Add
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
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
              {/* {propertiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-muted-foreground">Loading properties...</span>
                  </div>
                </div>
              ) : */ (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Image</TableHead>
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
                        <TableCell>
                          <Thumb src={p.images?.[0]} alt={p.title} />
                        </TableCell>
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
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePublished("properties", p.id, !p.is_published)}
                            >
                              {p.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteItem("properties", p.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {properties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No properties found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TOURS TAB */}
          <TabsContent value="tours">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Tours & Experiences Management</h2>
              {/* {toursLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-muted-foreground">Loading tours...</span>
                  </div>
                </div>
              ) : */ (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Tour</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tours.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Thumb src={t.images?.[0]} alt={t.title} />
                        </TableCell>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>
                          {t.source === "tour_packages" ? (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                              Package
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              Tour
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.location || "—"}</TableCell>
                        <TableCell>{formatMoney(t.price_per_person ?? 0, t.currency ?? "RWF")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {t.is_published ? (
                              <Badge className="bg-green-100 text-green-800">Live</Badge>
                            ) : (
                              <Badge variant="outline">Draft</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePublished("tours", t.id, !t.is_published)}
                            >
                              {t.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteItem("tours", t.id, t.source)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tours.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No tours found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
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
                      <TableHead className="w-16">Image</TableHead>
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
                        <TableCell>
                          <Thumb src={v.media?.[0] || v.image_url} alt={v.title} />
                        </TableCell>
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
                              {v.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
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
                    {vehicles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No vehicles found
                        </TableCell>
                      </TableRow>
                    )}
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
                    <SelectItem value="all">All</SelectItem>
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
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-sm">
                          {b.is_guest_booking ? (
                            <div className="min-w-0">
                              <div className="font-medium truncate">{b.guest_name || "Guest"}</div>
                              <div className="text-xs text-muted-foreground truncate">{b.guest_email || "—"}</div>
                              {b.guest_phone && (
                                <div className="text-xs text-muted-foreground">{b.guest_phone}</div>
                              )}
                            </div>
                          ) : b.profiles ? (
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {b.profiles.nickname || b.profiles.full_name || "User"}
                              </div>
                              {b.profiles.email && (
                                <div className="text-xs text-muted-foreground truncate">{b.profiles.email}</div>
                              )}
                              {b.profiles.phone && (
                                <div className="text-xs text-muted-foreground">{b.profiles.phone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">{(b.guest_id ?? "").slice(0, 8)}...</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.check_in} → {b.check_out}
                        </TableCell>
                        <TableCell>{b.guests}</TableCell>
                        <TableCell>{formatMoney(b.total_price, b.currency)}</TableCell>
                        <TableCell>
                          <StatusBadge status={b.status} />
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={b.payment_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSelectedBooking(b);
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
                            {b.status === "completed" || b.status === "confirmed" ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => exportReceipt(b)}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Receipt
                              </Button>
                            ) : null}
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
                            {b.status === "cancelled" && (
                              <Button size="sm" variant="outline" onClick={() => processRefund(b)}>
                                Refund
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {bookings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No bookings found
                        </TableCell>
                      </TableRow>
                    )}
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
                  {reviews.filter((r) => r.is_hidden).length} hidden / {reviews.length} total
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((r) => (
                      <TableRow key={r.id} className={r.is_hidden ? "opacity-50" : ""}>
                        <TableCell className="font-mono text-xs">{r.property_id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}...</TableCell>
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
                              <Button size="sm" variant="destructive" onClick={() => hideReview(r.id)}>
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
                    {reviews.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No reviews found
                        </TableCell>
                      </TableRow>
                    )}
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
                    <SelectItem value="all">All</SelectItem>
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
                {tickets.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No support tickets found</p>
                )}
            </div>
            </Card>
          </TabsContent>

          {/* SAFETY TAB */}
          <TabsContent value="safety">
            <div className="grid md:grid-cols-2 gap-6">
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
                    <span className="font-medium text-red-600">{reviews.filter((r) => r.is_hidden).length}</span>
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

        {/* Document Viewer Modal */}
        <Dialog open={!!viewingDocument} onOpenChange={(open) => !open && setViewingDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{viewingDocument?.title || 'Document Viewer'}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {viewingDocument && (
                <div className="relative">
                  <img 
                    src={viewingDocument.url} 
                    alt={viewingDocument.title}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => viewingDocument && window.open(viewingDocument.url, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download / Open in New Tab
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewingDocument(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Suspend Host Confirmation Dialog */}
        <Dialog open={!!suspendingHost} onOpenChange={(open) => !open && setSuspendingHost(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <UserX className="w-5 h-5" />
                Suspend & Reject Host Application
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive">⚠️ Warning: This action will:</p>
                <ul className="text-sm text-destructive/90 mt-2 ml-4 space-y-1 list-disc">
                  <li>Suspend the user's account</li>
                  <li>Reject their host application</li>
                  <li>Remove any host privileges</li>
                  <li>Prevent them from accessing the platform</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Reason:</strong> ID photo and selfie photo do not match the same person (identity verification failed).
              </p>
              <p className="text-sm">
                Make sure you have contacted the applicant to confirm before proceeding with suspension.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSuspendingHost(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!suspendingHost) return;
                  const app = applications.find((a: any) => a.id === suspendingHost);
                  if (app) {
                    await suspendUser(
                      app.user_id, 
                      app.id, 
                      'Identity verification failed: National ID and selfie photos do not match the same person. Account suspended for security reasons.'
                    );
                    setSuspendingHost(null);
                    setContactedHosts(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(suspendingHost);
                      return newSet;
                    });
                  }
                }}
              >
                <Ban className="w-4 h-4 mr-2" />
                Confirm Suspension
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* BOOKING DETAILS DIALOG */}
        <Dialog open={bookingDetailsOpen} onOpenChange={setBookingDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
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
                    <StatusBadge status={selectedBooking.status} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Guest Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-sm">
                        {selectedBooking.guest_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm break-all">
                        {selectedBooking.guest_email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">
                        {selectedBooking.guest_phone || "N/A"}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold">{formatMoney(selectedBooking.total_price, selectedBooking.currency)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="text-sm">{selectedBooking.payment_method || "Not specified"}</p>
                    </div>
                  </div>
                </div>

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
      </main>

      <Footer />
    </div>
  );
}
