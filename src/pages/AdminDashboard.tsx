import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AffiliatesManagement } from "@/components/AffiliatesManagement";
import { SupportChat } from "@/components/SupportChat";
import { TicketActivityLogs } from "@/components/TicketActivityLogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMoney } from "@/lib/money";
import { normalizeAdminMetrics } from "@/lib/admin-metrics";
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
  Headset,
  Send,
  Clock,
  Banknote,
  Loader2,
  User,
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
  selfie_photo_url?: string | null;
  profile_complete?: boolean | null;
  tour_license_url?: string | null;
  rdb_certificate_url?: string | null;
  suspended?: boolean | null;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  suspended_by?: string | null;
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
  // Profile info (joined)
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
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
  property_id: string | null;
  tour_id: string | null;
  transport_id: string | null;
  booking_type: string | null;
  order_id: string | null;
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
  } | null;
  tour_packages?: {
    title: string;
    city: string;
    country: string;
  } | null;
  transport_vehicles?: {
    title: string;
    vehicle_type: string;
  } | null;
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
  | "payouts"
  | "reviews"
  | "support"
  | "safety"
  | "reports"
  | "legal-content"
  | "affiliates";

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
  const [respondingTicket, setRespondingTicket] = useState<SupportTicketRow | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [roleToAdd, setRoleToAdd] = useState<Record<string, string>>({});
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [orderBookings, setOrderBookings] = useState<BookingRow[]>([]);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [refundInfo, setRefundInfo] = useState<{
    refundAmount: number;
    refundPercentage: number;
    policyType: string;
    description: string;
    currency: string;
  } | null>(null);

  const [legalContentType, setLegalContentType] = useState<'privacy_policy' | 'terms_and_conditions' | 'safety_guidelines' | 'refund_policy'>('privacy_policy');
  const [legalContent, setLegalContent] = useState('');
  const [savingLegal, setSavingLegal] = useState(false);

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
  const [selectedApplication, setSelectedApplication] = useState<HostApplicationRow | null>(null);
  const [applicationDetailsOpen, setApplicationDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  // Payouts state
  const [payoutFilter, setPayoutFilter] = useState<"all" | "pending" | "processing" | "completed" | "rejected">("all");
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);

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

    // Subscribe to host_payouts changes
    const payoutsChannel = supabase
      .channel('admin-payouts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_payouts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-host_payouts'] });
      })
      .subscribe();
    channels.push(payoutsChannel);

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
      return normalizeAdminMetrics(data) as unknown as Metrics;
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
        // Fetch all columns and join with profiles to get email
        .select("*, profiles:user_id(full_name, email)")
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

  // Legal content query
  const { data: legalContentData, refetch: refetchLegalContent } = useQuery({
    queryKey: ["legal_content", legalContentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_content")
        .select("*")
        .eq("content_type", legalContentType)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 15,
  });

  // Load legal content into editor when data changes
  useEffect(() => {
    if (legalContentData?.content) {
      const sections = legalContentData.content.sections || [];
      setLegalContent(sections.map((s: any) => s.text).join('\n\n'));
    }
  }, [legalContentData]);

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
    queryKey: ["admin-tours"], // Remove timestamp to enable proper caching
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
      
      const result = [...toursWithSource, ...packagesAsTours] as TourRow[];
      return result;
    },
    enabled: tab === "tours" || tab === "overview", // Also load for overview
    staleTime: 1000 * 30, // Cache for 30 seconds
    gcTime: 0, // No cache retention - always fetch fresh
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (bookingStatus && bookingStatus !== "all") q = q.eq("status", bookingStatus);
      const { data, error } = await q;
      if (error) {
        console.error("Error fetching bookings:", error);
        throw error;
      }
      console.log("Bookings fetched:", data?.length || 0, "records");
      
      // Fetch property, tour, transport, profile, and checkout details separately
      const propertyIds = [...new Set(data?.filter(b => b.property_id).map(b => b.property_id))];
      const tourIds = [...new Set(data?.filter(b => b.tour_id).map(b => b.tour_id))];
      const transportIds = [...new Set(data?.filter(b => b.transport_id).map(b => b.transport_id))];
      const guestIds = [...new Set(data?.filter(b => b.guest_id && !b.is_guest_booking).map(b => b.guest_id))];
      const orderIds = [...new Set(data?.filter(b => b.order_id).map(b => b.order_id))];
      
      const [properties, tours, vehicles, profiles, checkouts] = await Promise.all([
        propertyIds.length > 0 
          ? supabase.from("properties").select("id, title, images, currency").in("id", propertyIds).then(r => r.data || [])
          : Promise.resolve([]),
        tourIds.length > 0
          ? supabase.from("tour_packages").select("id, title, currency").in("id", tourIds).then(r => r.data || [])
          : Promise.resolve([]),
        transportIds.length > 0
          ? supabase.from("transport_vehicles").select("id, title, vehicle_type, currency").in("id", transportIds).then(r => r.data || [])
          : Promise.resolve([]),
        guestIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name, nickname, email, phone").in("user_id", guestIds).then(r => r.data || [])
          : Promise.resolve([]),
        orderIds.length > 0
          ? supabase.from("checkout_requests").select("id, total_amount, currency, payment_method").in("id", orderIds).then(r => r.data || [])
          : Promise.resolve([])
      ]);
      
      // Map the data back to bookings
      const enrichedData = (data || []).map(booking => {
        const enriched = { ...booking };
        if (booking.property_id) {
          enriched.properties = properties.find(p => p.id === booking.property_id) || null;
        }
        if (booking.tour_id) {
          enriched.tour_packages = tours.find(t => t.id === booking.tour_id) || null;
        }
        if (booking.transport_id) {
          enriched.transport_vehicles = vehicles.find(v => v.id === booking.transport_id) || null;
        }
        if (booking.guest_id && !booking.is_guest_booking) {
          enriched.profiles = profiles.find(p => p.user_id === booking.guest_id) || null;
        }
        if (booking.order_id) {
          enriched.checkout_requests = checkouts.find(c => c.id === booking.order_id) || null;
        }
        return enriched;
      });
      
      return enrichedData as BookingRow[];
    },
    enabled: tab === "bookings" || tab === "payments" || tab === "overview",
    staleTime: 1000 * 20,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });

  // Host Payouts query
  const { data: payouts = [], refetch: refetchPayouts } = useQuery({
    queryKey: ["admin-host_payouts", payoutFilter],
    queryFn: async () => {
      let query = supabase
        .from("host_payouts")
        .select("*, profiles:host_id(id, full_name, email)")
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
    enabled: tab === "payouts" || tab === "overview",
    staleTime: 1000 * 20,
    refetchOnWindowFocus: true,
  });

  // Process payout function - triggers PawaPay on approval
  const processPayout = async (payoutId: string, action: "completed" | "rejected", notes?: string) => {
    setProcessingPayout(payoutId);
    try {
      // Get payout details first
      const { data: payout, error: fetchError } = await supabase
        .from("host_payouts")
        .select("*, profiles:host_id(full_name, email)")
        .eq("id", payoutId)
        .single();

      if (fetchError) throw fetchError;

      // If approving and mobile money, trigger PawaPay payout
      if (action === "completed" && payout.payout_method === "mobile_money") {
        const phone = payout.payout_details?.phone;
        if (!phone) {
          toast({
            title: "Missing phone number",
            description: "Cannot process payout - no phone number found.",
            variant: "destructive",
          });
          setProcessingPayout(null);
          return;
        }

        // Call PawaPay to send the payout
        const payoutResponse = await fetch('/api/pawapay-payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payoutId: payout.id,
            amount: Math.round(payout.amount),
            currency: payout.currency || 'RWF',
            phoneNumber: phone,
            provider: 'MTN',
            description: `Host payout for ${payout.profiles?.full_name || payout.profiles?.email || 'Host'}`,
          }),
        });

        const payoutData = await payoutResponse.json();
        console.log('PawaPay payout response:', payoutData);

        if (!payoutData.success) {
          // Update status to failed
          await supabase
            .from("host_payouts")
            .update({
              status: "failed",
              admin_notes: `PawaPay Error: ${payoutData.error || 'Unknown error'}`,
              processed_by: user?.id,
              processed_at: new Date().toISOString(),
            })
            .eq("id", payoutId);

          toast({
            title: "Payout Failed",
            description: payoutData.error || "Failed to send payout via PawaPay.",
            variant: "destructive",
          });
          refetchPayouts();
          setProcessingPayout(null);
          return;
        }

        // PawaPay payout succeeded - status already updated by the API
        toast({
          title: "Payout Sent!",
          description: `${payout.currency} ${payout.amount.toLocaleString()} has been sent to ${phone} via PawaPay.`,
        });
        refetchPayouts();
        setProcessingPayout(null);
        return;
      }

      // For bank transfers or rejections, just update status
      const { error } = await supabase
        .from("host_payouts")
        .update({
          status: action,
          admin_notes: notes || (action === "completed" ? "Bank transfer - processed manually" : null),
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (error) throw error;

      toast({
        title: action === "completed" ? "Payout Approved" : "Payout Rejected",
        description: action === "completed" 
          ? "Bank transfer payout marked as completed." 
          : "The payout has been rejected.",
      });
      refetchPayouts();
    } catch (error) {
      console.error("Error processing payout:", error);
      toast({
        title: "Error",
        description: "Failed to process payout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayout(null);
    }
  };

  // Reviews - direct query with enhanced loading
  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["admin-reviews-direct"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_reviews")
        .select("id, property_id, reviewer_id, rating, comment, is_hidden, created_at")
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
    enabled: true, // Always enabled to show in overview
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
      // Suspend the user profile
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

      // Mark host as suspended in host_applications (so their listings won't show)
      await supabase
        .from('host_applications')
        .update({ 
          suspended: true,
          suspension_reason: reason,
          suspended_at: new Date().toISOString(),
          suspended_by: user?.id,
        } as never)
        .eq('user_id', userId);

      // Unpublish all their listings to hide immediately
      await Promise.all([
        supabase.from('properties').update({ is_published: false } as never).eq('host_id', userId),
        supabase.from('tours').update({ is_published: false } as never).eq('created_by', userId),
        supabase.from('transport_vehicles').update({ is_published: false } as never).eq('created_by', userId),
      ]);

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

      toast({ title: "Host suspended", description: "Their listings have been hidden from the website." });
      await Promise.all([refetchUsers(), refetchMetrics(), refetchApplications(), refetchProperties(), refetchTours(), refetchVehicles()]);
    } catch (e) {
      logError("admin.suspendUser", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    }
  };

  const unsuspendUser = async (userId: string) => {
    try {
      // Unsuspend the user profile
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: false, suspension_reason: null, suspended_at: null, suspended_by: null } as never)
        .or(`id.eq.${userId},user_id.eq.${userId}`);
      if (error) throw error;
      
      // Unsuspend in host_applications
      await supabase
        .from('host_applications')
        .update({ 
          suspended: false,
          suspension_reason: null,
          suspended_at: null,
          suspended_by: null,
        } as never)
        .eq('user_id', userId);

      toast({ title: "User unsuspended", description: "They can now republish their listings." });
      await Promise.all([refetchUsers(), refetchMetrics(), refetchApplications()]);
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

  const deleteBooking = async (id: string, guestName?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the booking for "${guestName || 'Unknown Guest'}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;
    
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Booking deleted", description: "The booking has been permanently removed." });
      await Promise.all([refetchBookings(), refetchMetrics()]);
    } catch (e) {
      logError("admin.deleteBooking", e);
      toast({ variant: "destructive", title: "Failed to delete", description: uiErrorMessage(e, "Please try again.") });
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

  const openRespondDialog = (ticket: SupportTicketRow) => {
    setRespondingTicket(ticket);
    setResponseDraft("");
  };

  // Parse response to extract responder name
  const parseResponse = (response?: string | null) => {
    if (!response) return { name: null as string | null, message: "" };
    const match = response.match(/^Support:\s*(.+)\n([\s\S]*)$/);
    if (match) {
      return { name: match[1].trim(), message: match[2].trim() };
    }
    return { name: null as string | null, message: response };
  };

  const submitTicketResponse = async () => {
    if (!respondingTicket || !responseDraft.trim()) return;
    setSendingResponse(true);
    try {
      // Fetch the staff member's name from profiles table
      let responderName = "Support Team";
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        responderName = profile?.full_name || user?.email?.split("@")[0] || "Support Team";
      }
      
      const formattedResponse = `Support: ${responderName}\n${responseDraft.trim()}`;
      const { error } = await supabase
        .from("support_tickets")
        .update({
          response: formattedResponse,
          status: "resolved",
        } as never)
        .eq("id", respondingTicket.id);
      if (error) throw error;
      toast({ title: "Response sent" });
      setRespondingTicket(null);
      setResponseDraft("");
      await Promise.all([refetchTickets(), refetchMetrics()]);
    } catch (e) {
      logError("admin.respondToTicket", e);
      toast({ variant: "destructive", title: "Failed", description: uiErrorMessage(e, "Please try again.") });
    } finally {
      setSendingResponse(false);
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
    // Determine item details
    let itemName = "Unknown Item";
    let itemType = booking.booking_type || "property";
    
    if (itemType === "property" && booking.properties) {
      itemName = booking.properties.title;
    } else if (itemType === "tour" && booking.tour_packages) {
      itemName = `${booking.tour_packages.title} (${booking.tour_packages.city}, ${booking.tour_packages.country})`;
    } else if (itemType === "transport" && booking.transport_vehicles) {
      itemName = `${booking.transport_vehicles.title} - ${booking.transport_vehicles.vehicle_type}`;
    } else if (booking.properties) {
      itemName = booking.properties.title;
    }

    const bookingData = {
      'Booking ID': booking.id,
      'Order ID': booking.order_id || 'N/A',
      'Booking Type': itemType.toUpperCase(),
      'Item': itemName,
      'Item ID': booking.property_id || booking.tour_id || booking.transport_id || 'N/A',
      'Guest Name': booking.is_guest_booking ? booking.guest_name : booking.guest_id,
      'Guest Email': booking.guest_email || 'N/A',
      'Guest Phone': booking.guest_phone || 'N/A',
      'Check In': booking.check_in,
      'Check Out': booking.check_out,
      'Number of Guests': booking.guests,
      'Total Price': `${booking.currency} ${booking.total_price}`,
      'Payment Method': booking.payment_method || 'N/A',
      'Payment Status': booking.payment_status || 'N/A',
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
    // Determine item details
    let itemName = "Unknown Item";
    let itemType = booking.booking_type || "property";
    
    if (itemType === "property" && booking.properties) {
      itemName = booking.properties.title;
    } else if (itemType === "tour" && booking.tour_packages) {
      itemName = `${booking.tour_packages.title} (${booking.tour_packages.city}, ${booking.tour_packages.country})`;
    } else if (itemType === "transport" && booking.transport_vehicles) {
      itemName = `${booking.transport_vehicles.title} - ${booking.transport_vehicles.vehicle_type}`;
    } else if (booking.properties) {
      itemName = booking.properties.title;
    }

    const receiptContent = `
PAYMENT RECEIPT
================
Receipt Date: ${new Date().toLocaleString()}

BOOKING INFORMATION
-------------------
Booking ID: ${booking.id}
${booking.order_id ? `Order ID: ${booking.order_id} (Part of bulk order)` : ''}
Booking Type: ${itemType.toUpperCase()}
Item: ${itemName}
Guest Name: ${booking.is_guest_booking ? booking.guest_name : booking.guest_id}
Guest Email: ${booking.guest_email || 'N/A'}
Guest Phone: ${booking.guest_phone || 'N/A'}

${itemType === 'property' ? 'STAY' : 'SERVICE'} DETAILS
------------
${itemType === 'property' ? 'Check-in Date: ' + booking.check_in : 'Start Date: ' + booking.check_in}
${itemType === 'property' ? 'Check-out Date: ' + booking.check_out : 'End Date: ' + booking.check_out}
Number of ${itemType === 'property' ? 'Guests' : 'Participants'}: ${booking.guests}

PAYMENT DETAILS
---------------
Total Amount: ${
  booking.booking_type === 'property' && booking.properties?.currency
    ? booking.properties.currency
    : booking.booking_type === 'tour' && booking.tour_packages?.currency
      ? booking.tour_packages.currency
      : booking.booking_type === 'transport' && booking.transport_vehicles?.currency
        ? booking.transport_vehicles.currency
        : booking.currency
} ${booking.total_price}
Payment Method: ${booking.payment_method || 'Pending'}
Payment Status: ${booking.payment_status || 'N/A'}
Booking Status: ${booking.status}
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

  // Save legal content
  const saveLegalContent = async () => {
    setSavingLegal(true);
    try {
      const sections = legalContent
        .split('\n\n')
        .filter(s => s.trim())
        .map((text, index) => ({ id: index + 1, text: text.trim() }));

      const typeLabels: Record<string, string> = {
        privacy_policy: 'Privacy Policy',
        terms_and_conditions: 'Terms and Conditions',
        safety_guidelines: 'Safety Guidelines',
        refund_policy: 'Refund & Cancellation Policy'
      };

      // Use upsert to create or update the record
      const { error } = await supabase
        .from("legal_content")
        .upsert({
          content_type: legalContentType,
          title: typeLabels[legalContentType],
          content: { sections },
          last_updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'content_type' });

      if (error) throw error;

      await refetchLegalContent();
      toast({
        title: "Success",
        description: `${typeLabels[legalContentType]} updated successfully`,
      });
    } catch (e) {
      logError(e, "saveLegalContent");
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: uiErrorMessage(e, "Please try again."),
      });
    } finally {
      setSavingLegal(false);
    }
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
              <UserPlus className="w-4 h-4" /> Hosts
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
              {bookings.filter(b => b.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full">
                  {bookings.filter(b => b.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1">
              <CreditCard className="w-4 h-4" /> Payments
              {bookings.filter(b => b.payment_status !== 'paid' && b.status === 'confirmed').length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full">
                  {bookings.filter(b => b.payment_status !== 'paid' && b.status === 'confirmed').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1">
              <Banknote className="w-4 h-4" /> Payouts
              {payouts.filter((p: any) => p.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full">
                  {payouts.filter((p: any) => p.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1">
              <Star className="w-4 h-4" /> Reviews
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1 relative">
              <MessageSquare className="w-4 h-4" /> Support
              {(metrics?.tickets_open ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                  {(metrics?.tickets_open ?? 0) > 99 ? "99+" : metrics?.tickets_open}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="safety" className="gap-1">
              <Shield className="w-4 h-4" /> Safety
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1">
              <FileText className="w-4 h-4" /> Reports
            </TabsTrigger>
            <TabsTrigger value="legal-content" className="gap-1">
              <FileText className="w-4 h-4" /> Legal Content
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="gap-1">
              <Users className="w-4 h-4" /> Referrals
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
                  <UserPlus className="w-4 h-4" /> Pending Hosts ({pendingApps.length})
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
                          <TableCell className="font-medium">{formatMoney(b.total_price, b.currency || 'RWF')}</TableCell>
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
                              onClick={async () => {
                                setSelectedBooking(b);
                                // If this is a bulk order, fetch all bookings with the same order_id
                                if (b.order_id) {
                                  // Fetch all bookings in this order
                                  const { data: orderItems } = await supabase
                                    .from("bookings")
                                    .select("*")
                                    .eq("order_id", b.order_id)
                                    .order("created_at", { ascending: false });
                                  
                                  if (orderItems && orderItems.length > 0) {
                                    // Fetch related details separately
                                    const propertyIds = [...new Set(orderItems.filter(item => item.property_id).map(item => item.property_id))];
                                    const tourIds = [...new Set(orderItems.filter(item => item.tour_id).map(item => item.tour_id))];
                                    const transportIds = [...new Set(orderItems.filter(item => item.transport_id).map(item => item.transport_id))];
                                    const hostIds = [...new Set(orderItems.filter(item => item.host_id).map(item => item.host_id))];
                                    
                                    const [properties, tours, vehicles, hosts] = await Promise.all([
                                      propertyIds.length > 0 
                                        ? supabase.from("properties").select("id, title, currency").in("id", propertyIds).then(r => r.data || [])
                                        : Promise.resolve([]),
                                      tourIds.length > 0
                                        ? supabase.from("tour_packages").select("id, title, currency").in("id", tourIds).then(r => r.data || [])
                                        : Promise.resolve([]),
                                      transportIds.length > 0
                                        ? supabase.from("transport_vehicles").select("id, title, vehicle_type, currency").in("id", transportIds).then(r => r.data || [])
                                        : Promise.resolve([]),
                                      hostIds.length > 0
                                        ? supabase.from("profiles").select("user_id, full_name").in("user_id", hostIds).then(r => r.data || [])
                                        : Promise.resolve([])
                                    ]);
                                    
                                    // Enrich order items with related data
                                    const enrichedItems = orderItems.map(item => {
                                      const enriched = { ...item };
                                      if (item.property_id) {
                                        enriched.properties = properties.find(p => p.id === item.property_id) || null;
                                      }
                                      if (item.tour_id) {
                                        enriched.tour_packages = tours.find(t => t.id === item.tour_id) || null;
                                      }
                                      if (item.transport_id) {
                                        enriched.transport_vehicles = vehicles.find(v => v.id === item.transport_id) || null;
                                      }
                                      if (item.host_id) {
                                        enriched.profiles = hosts.find(h => h.user_id === item.host_id) || null;
                                      }
                                      return enriched;
                                    });
                                    
                                    setOrderBookings(enrichedItems);
                                  } else {
                                    setOrderBookings([]);
                                  }
                                } else {
                                  setOrderBookings([]);
                                }
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
              <Card 
                className={`p-4 border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-shadow ${(metrics?.tickets_open ?? 0) > 0 ? 'ring-2 ring-red-500 ring-opacity-50 animate-pulse' : ''}`}
                onClick={() => setTab("support")}
              >
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Open Tickets
                  {(metrics?.tickets_open ?? 0) > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {(metrics?.tickets_open ?? 0) > 99 ? "99+" : metrics?.tickets_open}
                    </span>
                  )}
                </h4>
                <p className="text-2xl font-bold">{metrics?.tickets_open ?? 0}</p>
                {(metrics?.tickets_open ?? 0) > 0 && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Needs attention - Click to view</p>
                )}
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

          {/* HOSTS TAB */}
          <TabsContent value="host-applications">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Hosts</h2>
                  <p className="text-sm text-muted-foreground">
                    Review and manage host profiles and documents
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
                  <p className="text-muted-foreground">No hosts yet</p>
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
                                        const { error } = await supabase.rpc('approve_host_application', {
                                          application_id: app.id,
                                          note: null,
                                        } as any);

                                        if (error) throw error;

                                        toast({ title: 'Application Approved', description: 'Host role has been granted and listings published.' });
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

                  {/* All Hosts Table */}
                  <div>
                    <h3 className="text-md font-semibold mb-3">All Hosts</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Host</TableHead>
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
                            <TableRow key={app.id} className={app.suspended ? 'bg-red-50' : ''}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{app.full_name || '—'}</p>
                                  {app.business_name && (
                                    <p className="text-xs text-muted-foreground">{app.business_name}</p>
                                  )}
                                  {app.profiles?.email && (
                                    <p className="text-xs text-muted-foreground">{app.profiles.email}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{app.phone || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{app.applicant_type || 'individual'}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {/* Show pending if approved but profile not complete */}
                                  {app.status === 'approved' && !app.profile_complete ? (
                                    <Badge className={statusColors['pending'] || 'bg-yellow-100'}>
                                      pending
                                    </Badge>
                                  ) : (
                                    <Badge className={statusColors[app.status] || 'bg-gray-100'}>
                                      {app.status}
                                    </Badge>
                                  )}
                                  {app.suspended && (
                                    <Badge variant="destructive" className="text-xs">
                                      🚫 Suspended
                                    </Badge>
                                  )}
                                  {app.status === 'approved' && !app.profile_complete && (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                                      Profile Incomplete
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="flex gap-1 flex-wrap">
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
                                  {app.tour_license_url && (
                                    <Badge variant="outline" className="text-blue-600">License ✓</Badge>
                                  )}
                                  {app.rdb_certificate_url && (
                                    <Badge variant="outline" className="text-purple-600">RDB ✓</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(app.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
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
                                  {/* Suspend/Unsuspend button for approved hosts */}
                                  {app.status === 'approved' && !app.suspended && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive border-destructive hover:bg-destructive/10"
                                      onClick={() => suspendUser(app.user_id)}
                                      title="Suspend this host"
                                    >
                                      <Ban className="w-3 h-3 mr-1" />
                                      Suspend
                                    </Button>
                                  )}
                                  {app.suspended && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={() => unsuspendUser(app.user_id)}
                                      title="Unsuspend this host"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Unsuspend
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
                                  <SelectItem value="financial_staff">Financial Staff</SelectItem>
                                  <SelectItem value="operations_staff">Operations Staff</SelectItem>
                                  <SelectItem value="customer_support">Customer Support</SelectItem>
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
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setUserDetailsOpen(true);
                                }}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Tours & Experiences Management</h2>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => refetchTours()}
                  className="gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </Button>
              </div>
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
                <Table className="min-w-[1200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Booking ID</TableHead>
                      <TableHead className="w-[100px]">Order ID</TableHead>
                      <TableHead className="w-[220px]">Item</TableHead>
                      <TableHead className="w-[180px]">Guest</TableHead>
                      <TableHead className="w-[180px]">Dates</TableHead>
                      <TableHead className="w-[60px] text-center">Guests</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                      <TableHead className="w-[90px]">Payment</TableHead>
                      <TableHead className="w-[180px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => {
                      // Determine item name and type based on booking_type
                      let itemName = "Unknown";
                      let itemType = b.booking_type || "property";
                      
                      if (itemType === "property" && b.properties) {
                        itemName = b.properties.title;
                      } else if (itemType === "tour" && b.tour_packages) {
                        itemName = b.tour_packages.title;
                      } else if (itemType === "transport" && b.transport_vehicles) {
                        itemName = b.transport_vehicles.title;
                      } else if (b.properties) {
                        // Fallback to property if no booking_type specified
                        itemName = b.properties.title;
                      }

                      return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <span className="font-mono text-xs">{b.id.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell>
                          {b.order_id ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {b.order_id.slice(0, 8)}...
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Item Image */}
                            {itemType === "property" && b.properties?.images?.[0] && (
                              <img 
                                src={b.properties.images[0]} 
                                alt={itemName}
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            {itemType === "property" && !b.properties?.images?.[0] && (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                <Home className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            {itemType === "tour" && (
                              <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            {itemType === "transport" && (
                              <div className="w-12 h-12 rounded bg-secondary/50 flex items-center justify-center">
                                <Car className="w-6 h-6 text-secondary-foreground" />
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium line-clamp-1">{itemName}</span>
                              <div className="flex items-center gap-1">
                                {itemType === "property" && <span className="text-xs text-muted-foreground">🏠 Property</span>}
                                {itemType === "tour" && <span className="text-xs text-muted-foreground">🗺️ Tour</span>}
                                {itemType === "transport" && <span className="text-xs text-muted-foreground">🚗 Transport</span>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
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
                        <TableCell>
                          <div className="flex flex-col text-sm whitespace-nowrap">
                            <span className="text-muted-foreground">{b.check_in}</span>
                            <span className="text-muted-foreground">{b.check_out}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{b.guests}</TableCell>
                        <TableCell>
                          <div className="font-medium whitespace-nowrap">
                            {formatMoney(
                              b.total_price,
                              b.booking_type === "property" && b.properties?.currency
                                ? b.properties.currency
                                : b.booking_type === "tour" && b.tour_packages?.currency
                                  ? b.tour_packages.currency
                                  : b.booking_type === "transport" && b.transport_vehicles?.currency
                                    ? b.transport_vehicles.currency
                                    : b.currency || "RWF"
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={b.status} />
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={b.payment_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {b.status === 'confirmed' && b.payment_status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => markAsPaid(b.id)}
                                disabled={markingPaid === b.id}
                                className="gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                {markingPaid === b.id ? 'Marking...' : 'Mark Paid'}
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={async () => {
                                setSelectedBooking(b);
                                // Calculate refund if cancelled and paid
                                if (b.status === 'cancelled' && b.payment_status === 'paid') {
                                  const refund = await getRefundInfo(b.id, b.order_id);
                                  setRefundInfo(refund);
                                } else {
                                  setRefundInfo(null);
                                }
                                // If this is a bulk order, fetch all bookings with the same order_id
                                if (b.order_id) {
                                  // Fetch all bookings in this order
                                  const { data: orderItems } = await supabase
                                    .from("bookings")
                                    .select("*")
                                    .eq("order_id", b.order_id)
                                    .order("created_at", { ascending: false });
                                  
                                  if (orderItems && orderItems.length > 0) {
                                    // Fetch related details separately
                                    const propertyIds = [...new Set(orderItems.filter(item => item.property_id).map(item => item.property_id))];
                                    const tourIds = [...new Set(orderItems.filter(item => item.tour_id).map(item => item.tour_id))];
                                    const transportIds = [...new Set(orderItems.filter(item => item.transport_id).map(item => item.transport_id))];
                                    const hostIds = [...new Set(orderItems.filter(item => item.host_id).map(item => item.host_id))];
                                    
                                    const [properties, tours, vehicles, hosts] = await Promise.all([
                                      propertyIds.length > 0 
                                        ? supabase.from("properties").select("id, title, currency").in("id", propertyIds).then(r => r.data || [])
                                        : Promise.resolve([]),
                                      tourIds.length > 0
                                        ? supabase.from("tour_packages").select("id, title, currency").in("id", tourIds).then(r => r.data || [])
                                        : Promise.resolve([]),
                                      transportIds.length > 0
                                        ? supabase.from("transport_vehicles").select("id, title, vehicle_type, currency").in("id", transportIds).then(r => r.data || [])
                                        : Promise.resolve([]),
                                      hostIds.length > 0
                                        ? supabase.from("profiles").select("user_id, full_name").in("user_id", hostIds).then(r => r.data || [])
                                        : Promise.resolve([])
                                    ]);
                                    
                                    // Enrich order items with related data
                                    const enrichedItems = orderItems.map(item => {
                                      const enriched = { ...item };
                                      if (item.property_id) {
                                        enriched.properties = properties.find(p => p.id === item.property_id) || null;
                                      }
                                      if (item.tour_id) {
                                        enriched.tour_packages = tours.find(t => t.id === item.tour_id) || null;
                                      }
                                      if (item.transport_id) {
                                        enriched.transport_vehicles = vehicles.find(v => v.id === item.transport_id) || null;
                                      }
                                      if (item.host_id) {
                                        enriched.profiles = hosts.find(h => h.user_id === item.host_id) || null;
                                      }
                                      return enriched;
                                    });
                                    
                                    setOrderBookings(enrichedItems);
                                  } else {
                                    setOrderBookings([]);
                                  }
                                } else {
                                  setOrderBookings([]);
                                }
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
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => deleteBooking(b.id, b.guest_name || b.profiles?.full_name)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
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

          {/* CART CHECKOUTS TAB */}
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

          {/* PAYOUTS TAB */}
          <TabsContent value="payouts">
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
                                onClick={() => processPayout(payout.id, "rejected", "Rejected by admin")}
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
                        <TableCell className="font-mono text-xs">{r.property_id?.slice(0, 8) || 'N/A'}...</TableCell>
                        <TableCell className="font-mono text-xs">{r.reviewer_id?.slice(0, 8) || 'N/A'}...</TableCell>
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
            <div className="grid gap-6">
              {/* Ticket Activity Logs */}
              <TicketActivityLogs limit={100} />

              {/* Support Tickets */}
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
                {tickets.map((t) => {
                  const parsed = parseResponse(t.response);
                  return (
                  <div key={t.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openRespondDialog(t)}>
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
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{t.message}</p>
                        {t.response && (
                          <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded text-sm border-l-2 border-green-500">
                            <span className="font-medium text-green-700 dark:text-green-400">
                              {parsed.name || "Support"}:
                            </span>{" "}
                            <span className="text-muted-foreground line-clamp-1">{parsed.message}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(t.created_at).toLocaleString()} · User: {t.user_id?.slice(0, 8) || 'Guest'}...
                        </p>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => openRespondDialog(t)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {t.status !== "resolved" && t.status !== "closed" && (
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
                        )}
                      </div>
                  </div>
                </div>
                  );
                })}
                {tickets.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No support tickets found</p>
                )}
              </div>
            </Card>
            </div>
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
                        <p className="text-sm font-mono">{b.user_id?.slice(0, 12) || 'Unknown'}...</p>
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

          {/* LEGAL CONTENT TAB */}
          <TabsContent value="legal-content">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Manage Legal Content</h3>
                <Select
                  value={legalContentType}
                  onValueChange={(v: 'privacy_policy' | 'terms_and_conditions' | 'safety_guidelines' | 'refund_policy') => setLegalContentType(v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privacy_policy">Privacy Policy</SelectItem>
                    <SelectItem value="terms_and_conditions">Terms & Conditions</SelectItem>
                    <SelectItem value="safety_guidelines">Safety Guidelines</SelectItem>
                    <SelectItem value="refund_policy">Refund & Cancellation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert className="mb-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Write your content with double line breaks to separate sections. Each paragraph will become a section in the formatted output.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {legalContentType === 'privacy_policy' ? 'Privacy Policy' : 
                     legalContentType === 'terms_and_conditions' ? 'Terms and Conditions' :
                     legalContentType === 'safety_guidelines' ? 'Safety Guidelines' : 'Refund & Cancellation Policy'} Content
                  </label>
                  <textarea
                    className="w-full min-h-[400px] p-4 rounded-md border border-input bg-background text-sm font-mono"
                    value={legalContent}
                    onChange={(e) => setLegalContent(e.target.value)}
                    placeholder={`Enter content here...\n\nEach paragraph separated by double line breaks will become a section.`}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (legalContentData?.content) {
                        const sections = legalContentData.content.sections || [];
                        setLegalContent(sections.map((s: any) => s.text).join('\n\n'));
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={saveLegalContent}
                    disabled={savingLegal}
                  >
                    {savingLegal ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>

              {legalContentData && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {legalContentData.updated_at ? new Date(legalContentData.updated_at).toLocaleString() : 'Never'}
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* REFERRALS TAB */}
          <TabsContent value="affiliates">
            <Card>
              <CardHeader>
                <CardTitle>Referral Program</CardTitle>
                <CardDescription>
                  Manage referrer applications and monitor performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AffiliatesManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Support Chat Dialog */}
        <Dialog open={!!respondingTicket} onOpenChange={(open) => !open && setRespondingTicket(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
            {respondingTicket && (
              <SupportChat
                ticket={{
                  id: respondingTicket.id,
                  user_id: respondingTicket.user_id,
                  subject: respondingTicket.subject,
                  message: respondingTicket.message,
                  category: respondingTicket.category,
                  status: respondingTicket.status,
                  priority: respondingTicket.priority,
                  created_at: respondingTicket.created_at,
                }}
                userType="staff"
                onClose={() => setRespondingTicket(null)}
                onStatusChange={(status) => {
                  setRespondingTicket((prev) => prev ? { ...prev, status } : null);
                  refetchTickets();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Document Viewer Modal */}
        <Dialog open={!!viewingDocument} onOpenChange={(open) => !open && setViewingDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{viewingDocument?.title || 'Document Viewer'}</DialogTitle>
              <DialogDescription>View uploaded document or image</DialogDescription>
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
              <DialogDescription>This action will suspend the user and reject their application</DialogDescription>
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
              <DialogDescription>Complete booking information and guest details</DialogDescription>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                {/* Show bulk order info if this is part of a cart order */}
                {selectedBooking.order_id && orderBookings.length > 1 && (
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🛒</span>
                        <div>
                          <p className="text-sm font-semibold">Cart Order ({orderBookings.length} items)</p>
                          <p className="text-xs text-muted-foreground font-mono">{selectedBooking.order_id.slice(0, 16)}...</p>
                        </div>
                      </div>
                      <p className="text-base font-bold">
                        {formatMoney(
                          orderBookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
                          selectedBooking.currency
                        )}
                      </p>
                    </div>
                    
                    {/* List all items in the order */}
                    <div className="space-y-1.5">
                      {orderBookings.map((item) => {
                        let itemName = "Unknown Item";
                        let hostName = "N/A";
                        let itemIcon = "📦";
                        
                        if (item.booking_type === "property" && item.properties) {
                          itemName = item.properties.title;
                          itemIcon = "🏠";
                        } else if (item.booking_type === "tour" && item.tour_packages) {
                          itemName = item.tour_packages.title;
                          itemIcon = "🗺️";
                        } else if (item.booking_type === "transport" && item.transport_vehicles) {
                          itemName = `${item.transport_vehicles.title} (${item.transport_vehicles.vehicle_type})`;
                          itemIcon = "🚗";
                        }
                        
                        // Get host name from profiles relation
                        if (item.profiles?.full_name) {
                          hostName = item.profiles.full_name;
                        }
                        
                        const isCurrentItem = item.id === selectedBooking.id;
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`p-2 rounded text-sm ${isCurrentItem ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/30'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className="text-base mt-0.5">{itemIcon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{itemName}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>Host: {hostName}</span>
                                    <span>•</span>
                                    <Badge variant={item.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs h-4 px-1.5">
                                      {item.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-semibold text-sm whitespace-nowrap">{formatMoney(item.total_price, item.currency || 'RWF')}</span>
                                {isCurrentItem && (
                                  <Badge variant="outline" className="text-xs h-4 px-1.5">👁️</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Show item details based on booking type */}
                {selectedBooking.booking_type === "property" && selectedBooking.properties && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-3">🏠 Property Booking</h3>
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
                {selectedBooking.booking_type === "tour" && selectedBooking.tour_packages && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-3">🗺️ Tour Booking</h3>
                    <div>
                      <p className="font-medium">{selectedBooking.tour_packages.title}</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.tour_packages.city}, {selectedBooking.tour_packages.country}</p>
                      <p className="text-sm text-muted-foreground font-mono break-all mt-1">{selectedBooking.tour_id}</p>
                    </div>
                  </div>
                )}
                {selectedBooking.booking_type === "transport" && selectedBooking.transport_vehicles && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-3">🚗 Transport Booking</h3>
                    <div>
                      <p className="font-medium">{selectedBooking.transport_vehicles.title}</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.transport_vehicles.vehicle_type}</p>
                      <p className="text-sm text-muted-foreground font-mono break-all mt-1">{selectedBooking.transport_id}</p>
                    </div>
                  </div>
                )}
                {/* Fallback for old bookings without booking_type */}
                {!selectedBooking.booking_type && selectedBooking.properties && (
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
                  {selectedBooking.order_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID (Bulk)</p>
                      <p className="font-mono text-xs break-all">{selectedBooking.order_id}</p>
                    </div>
                  )}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Listing Price</p>
                      <p className="text-lg font-bold">
                        {formatMoney(
                          selectedBooking.total_price,
                          // Prefer the listing's original currency when available
                          selectedBooking.booking_type === "property" && selectedBooking.properties?.currency
                            ? selectedBooking.properties.currency
                            : selectedBooking.booking_type === "tour" && selectedBooking.tour_packages?.currency
                              ? selectedBooking.tour_packages.currency
                              : selectedBooking.booking_type === "transport" && selectedBooking.transport_vehicles?.currency
                                ? selectedBooking.transport_vehicles.currency
                                : selectedBooking.currency || "RWF"
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
                      <p className="text-sm">{selectedBooking.checkout_requests?.payment_method || selectedBooking.payment_method || "Not specified"}</p>
                    </div>
                  </div>
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
                              {formatMoney(refundInfo.refundAmount, refundInfo.currency)}
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Complete application information for host registration
              </DialogDescription>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-6">
                {/* Applicant Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Applicant Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="text-sm font-medium">{selectedApplication.full_name || selectedApplication.profiles?.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedApplication.profiles?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedApplication.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <Badge variant="outline">{selectedApplication.applicant_type || 'individual'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {selectedApplication.status === 'approved' && !selectedApplication.profile_complete ? (
                        <Badge variant="secondary">pending (profile incomplete)</Badge>
                      ) : (
                        <Badge>{selectedApplication.status}</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profile Completion</p>
                      <Badge variant={selectedApplication.profile_complete ? "default" : "secondary"}>
                        {selectedApplication.profile_complete ? 'Complete' : 'Incomplete'}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-2">Services Offered</p>
                      <div className="flex gap-2 flex-wrap">
                        {selectedApplication.service_types && selectedApplication.service_types.length > 0 ? (
                          selectedApplication.service_types.map((service, idx) => (
                            <Badge key={idx} variant="secondary" className="capitalize">{service}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Not specified yet</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">National ID Number</p>
                      <p className="text-sm font-mono">{selectedApplication.national_id_number || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">About</p>
                      <p className="text-sm">{selectedApplication.about || 'No description provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Business Information (if business) */}
                {selectedApplication.applicant_type === 'business' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Business Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Business Name</p>
                        <p className="text-sm font-medium">{selectedApplication.business_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Business TIN</p>
                        <p className="text-sm font-mono">{selectedApplication.business_tin || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hosting Location */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Hosting Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Hosting Location</p>
                      <p className="text-sm">{selectedApplication.hosting_location || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Service Types</p>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {selectedApplication.service_types && selectedApplication.service_types.length > 0 ? (
                          selectedApplication.service_types.map((service, idx) => (
                            <Badge key={idx} variant="secondary">{service}</Badge>
                          ))
                        ) : (
                          <p className="text-sm">No services specified</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Listing Preview */}
                {selectedApplication.listing_title && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Listing Preview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Title</p>
                        <p className="text-sm font-medium">{selectedApplication.listing_title}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="text-sm">{selectedApplication.listing_location || 'N/A'}</p>
                      </div>
                      {selectedApplication.listing_property_type && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Property Type</p>
                            <p className="text-sm">{selectedApplication.listing_property_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Price per Night</p>
                            <p className="text-sm font-medium">
                              {formatMoney(selectedApplication.listing_price_per_night || 0, selectedApplication.listing_currency || 'USD')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Max Guests</p>
                            <p className="text-sm">{selectedApplication.listing_max_guests || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Bedrooms</p>
                            <p className="text-sm">{selectedApplication.listing_bedrooms || 'N/A'}</p>
                          </div>
                        </>
                      )}
                      {selectedApplication.listing_description && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="text-sm">{selectedApplication.listing_description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {selectedApplication.listing_amenities && selectedApplication.listing_amenities.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Amenities</h3>
                    <div className="flex gap-2 flex-wrap">
                      {selectedApplication.listing_amenities.map((amenity, idx) => (
                        <Badge key={idx} variant="outline">{amenity}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {selectedApplication.listing_images && selectedApplication.listing_images.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Listing Images</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedApplication.listing_images.map((imageUrl, idx) => (
                        <img
                          key={idx}
                          src={imageUrl}
                          alt={`Listing image ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-md border"
                          onClick={() => setViewingDocument({ url: imageUrl, title: `Image ${idx + 1}` })}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Documents</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedApplication.national_id_photo_url ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">National ID / Passport</p>
                        <img
                          src={selectedApplication.national_id_photo_url}
                          alt="National ID"
                          className="w-full h-32 object-cover rounded-md border cursor-pointer hover:opacity-80 transition"
                          onClick={() => setViewingDocument({ 
                            url: selectedApplication.national_id_photo_url!, 
                            title: 'National ID' 
                          })}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">National ID / Passport</p>
                        <p className="text-sm text-muted-foreground italic">Not uploaded</p>
                      </div>
                    )}
                    {selectedApplication.selfie_photo_url && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Selfie Photo</p>
                        <img
                          src={selectedApplication.selfie_photo_url}
                          alt="Selfie"
                          className="w-full h-32 object-cover rounded-md border cursor-pointer hover:opacity-80 transition"
                          onClick={() => setViewingDocument({ 
                            url: selectedApplication.selfie_photo_url!, 
                            title: 'Selfie Photo' 
                          })}
                        />
                      </div>
                    )}
                    {selectedApplication.tour_license_url && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Tour Guide License</p>
                        <img
                          src={selectedApplication.tour_license_url}
                          alt="Tour License"
                          className="w-full h-32 object-cover rounded-md border cursor-pointer hover:opacity-80 transition"
                          onClick={() => setViewingDocument({ 
                            url: selectedApplication.tour_license_url!, 
                            title: 'Tour Guide License' 
                          })}
                        />
                      </div>
                    )}
                    {selectedApplication.rdb_certificate_url && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">RDB Certificate</p>
                        <img
                          src={selectedApplication.rdb_certificate_url}
                          alt="RDB Certificate"
                          className="w-full h-32 object-cover rounded-md border cursor-pointer hover:opacity-80 transition"
                          onClick={() => setViewingDocument({ 
                            url: selectedApplication.rdb_certificate_url!, 
                            title: 'RDB Certificate' 
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Applied On</p>
                      <p className="text-sm">{new Date(selectedApplication.created_at).toLocaleString()}</p>
                    </div>
                    {selectedApplication.updated_at && (
                      <div>
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="text-sm">{new Date(selectedApplication.updated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* User Details Dialog */}
        <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Complete user account information
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap">
                  {selectedUser.is_suspended ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : selectedUser.is_verified ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">Verified</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                  {(rolesByUserId.get(selectedUser.user_id) ?? []).map((r) => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" /> Account Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">User ID</p>
                      <p className="font-mono text-xs break-all">{selectedUser.user_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="text-sm font-medium">{selectedUser.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedUser.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedUser.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Status</p>
                      <p className="text-sm">{selectedUser.is_suspended ? 'Suspended' : selectedUser.is_verified ? 'Verified' : 'Active'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Created</p>
                      <p className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</p>
                    </div>
                    {selectedUser.last_sign_in_at && (
                      <div>
                        <p className="text-sm text-muted-foreground">Last Sign In</p>
                        <p className="text-sm">{new Date(selectedUser.last_sign_in_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Bookings Summary */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Booking History
                  </h3>
                  {(() => {
                    const userBookings = bookings.filter(b => b.guest_id === selectedUser.user_id);
                    const totalSpent = userBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
                    const confirmedBookings = userBookings.filter(b => b.status === 'confirmed').length;
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">{userBookings.length}</p>
                          <p className="text-xs text-muted-foreground">Total Bookings</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">{confirmedBookings}</p>
                          <p className="text-xs text-muted-foreground">Confirmed</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-lg font-bold">{formatMoney(totalSpent, 'RWF')}</p>
                          <p className="text-xs text-muted-foreground">Total Spent</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Quick Actions</h3>
                  <div className="flex gap-2">
                    {selectedUser.is_suspended ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          unsuspendUser(selectedUser.user_id);
                          setUserDetailsOpen(false);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Activate User
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          suspendUser(selectedUser.user_id);
                          setUserDetailsOpen(false);
                        }}
                      >
                        <Ban className="w-4 h-4 mr-2" /> Suspend User
                      </Button>
                    )}
                    {selectedUser.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`mailto:${selectedUser.email}`, '_blank')}
                      >
                        <Mail className="w-4 h-4 mr-2" /> Send Email
                      </Button>
                    )}
                  </div>
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
