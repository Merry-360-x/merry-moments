import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { isVideoUrl } from "@/lib/media";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { formatMoney } from "@/lib/money";
import { AMENITIES, AMENITIES_BY_CATEGORY } from "@/lib/amenities";
import { calculateHostEarningsFromGuestTotal, PLATFORM_FEES } from "@/lib/fees";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotificationBadge, NotificationBadge } from "@/hooks/useNotificationBadge";
import {
  Home,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  MapPin,
  Car,
  ExternalLink,
  Save,
  X,
  ImageIcon,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Bed,
  Bath,
  Users,
  Wifi,
  Tv,
  UtensilsCrossed,
  Dumbbell,
  Waves,
  ParkingCircle,
  Wind,
  Sparkles,
  Monitor,
  Laptop,
  Flame,
  SprayCan,
  ShowerHead,
  Shirt,
  Lock,
  Thermometer,
  WashingMachine,
  Fan,
  Refrigerator,
  Coffee,
  Microwave,
  CookingPot,
  ChefHat,
  GlassWater,
  Zap,
  Cctv,
  Mountain,
  Sunrise,
  TreePine,
  Accessibility,
  Presentation,
  Phone,
  PawPrint,
  Music,
  Cigarette,
  CircleOff,
  Percent,
  Info,
  Download,
  FileText,
  Loader2,
  Calendar as CalendarIcon,
  Banknote,
  Wallet,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Types
interface Property {
  id: string;
  title: string;
  description: string | null;
  location: string;
  address?: string | null;
  property_type: string;
  price_per_night: number;
  currency: string | null;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number | null;
  amenities: string[] | null;
  cancellation_policy: string | null;
  is_published: boolean;
  images: string[] | null;
  created_at: string;
  // Discounts (optional until DB migration is applied)
  weekly_discount?: number | null;
  monthly_discount?: number | null;
  // Rules (optional until DB migration is applied)
  check_in_time?: string | null;
  check_out_time?: string | null;
  smoking_allowed?: boolean | null;
  events_allowed?: boolean | null;
  pets_allowed?: boolean | null;
}

interface Tour {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  difficulty: string | null;
  duration_days: number | null;
  price_per_person: number;
  currency: string | null;
  images: string[] | null;
  is_published: boolean | null;
  created_at: string;
  source?: "tours" | "tour_packages"; // Track where this came from
  // Tour package specific fields
  city?: string | null;
  duration?: string | null;
  categories?: string[] | null;
  tour_type?: string | null;
  daily_itinerary?: string | null;
  included_services?: string[] | null;
  excluded_services?: string[] | null;
  meeting_point?: string | null;
  what_to_bring?: string | null;
  cancellation_policy?: string | null;
  non_refundable_items?: string[] | null;
  min_guests?: number | null;
  max_guests?: number | null;
  max_participants?: number | null;
  group_discount_6_10?: number | null;
  group_discount_11_15?: number | null;
  group_discount_16_plus?: number | null;
  itinerary_pdf_url?: string | null;
  status?: string | null;
  host_id?: string | null;
  cover_image?: string | null;
  gallery_images?: string[] | null;
}

interface Vehicle {
  id: string;
  title: string;
  provider_name: string | null;
  vehicle_type: string;
  seats: number;
  price_per_day: number;
  currency: string | null;
  driver_included: boolean | null;
  image_url: string | null;
  media: string[] | null;
  is_published: boolean | null;
  created_at: string;
}

interface TransportRoute {
  id: string;
  from_location: string;
  to_location: string;
  base_price: number;
  currency: string | null;
  is_published: boolean | null;
  created_at: string;
  created_by: string | null;
}

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  property_id: string | null;
  tour_id: string | null;
  transport_id: string | null;
  booking_type: 'property' | 'tour' | 'transport';
  order_id: string | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  is_guest_booking: boolean;
}

const propertyTypes = ["Hotel", "Apartment", "Room in Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "Motel", "House", "Cabin"];
const currencies = [
  { value: "RWF", label: "(FRw) RWF" },
  { value: "USD", label: "($) USD" },
  { value: "EUR", label: "(€) EUR" },
  { value: "GBP", label: "(£) GBP" },
  { value: "CNY", label: "(¥) CNY" },
];
const cancellationPolicies = [
  { value: "strict", label: "Strict - Less refunds" },
  { value: "fair", label: "Fair - Moderate refunds" },
  { value: "lenient", label: "Lenient - More refunds" },
];

const cancellationPolicyDetails: Record<string, { title: string; lines: string[] }> = {
  strict: {
    title: "Strict",
    lines: [
      "15–30 days before check-in: Full refund (minus fees)",
      "7–15 days: 75% refund (minus fees)",
      "3–7 days: 50% refund (minus fees)",
      "1–3 days: 25% refund (minus fees)",
      "0–1 day: No refund",
      "No-shows: Non-refundable",
    ],
  },
  fair: {
    title: "Fair",
    lines: [
      "7–15 days before check-in: Full refund (minus fees)",
      "3–7 days: 75% refund (minus fees)",
      "1–3 days: 50% refund (minus fees)",
      "0–1 day: 25% refund",
      "No-shows: Non-refundable",
    ],
  },
  lenient: {
    title: "Lenient",
    lines: [
      "3–7 days before check-in: Full refund (minus fees)",
      "1–3 days: 75% refund (minus fees)",
      "0–1 day: 50% refund",
      "No-shows: Non-refundable",
    ],
  },
};
const vehicleTypes = ["Sedan", "SUV", "Van", "Bus", "Minibus", "Motorcycle"];
const tourCategories = ["Nature", "Adventure", "Cultural", "Wildlife", "Historical"];
const tourDifficulties = ["Easy", "Moderate", "Hard"];

export default function HostDashboard() {
  const { user, isHost, isLoading: authLoading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  
  // Payout states (combined into single dialog)
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutInfo, setPayoutInfo] = useState<{
    method: string | null;
    phone: string | null;
    bank_name: string | null;
    bank_account: string | null;
    account_name: string | null;
  } | null>(null);
  const [payoutForm, setPayoutForm] = useState({
    method: 'mobile_money' as 'mobile_money' | 'bank_transfer',
    phone: '',
    bank_name: '',
    bank_account: '',
    account_name: '',
  });
  const [payoutAmount, setPayoutAmount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  
  // Financial reports date range
  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hostServiceTypes, setHostServiceTypes] = useState<string[]>([]);

  // Editing states
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 10,
    currency: 'RWF',
    minimum_amount: 0,
    max_uses: null as number | null,
    valid_until: null as string | null,
    applies_to: 'all' as 'all' | 'properties' | 'tours' | 'transport',
  });
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // New property wizard
  const [showPropertyWizard, setShowPropertyWizard] = useState(false);
  const [showRoomWizard, setShowRoomWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [propertyForm, setPropertyForm] = useState({
    title: "",
    location: "",
    address: "",
    property_type: "Apartment",
    description: "",
    price_per_night: 50000,
    price_per_person: null as number | null,
    currency: "RWF",
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    amenities: [] as string[],
    cancellation_policy: "fair",
    images: [] as string[],
    // Discounts
    weekly_discount: 0,
    monthly_discount: 0,
    // Rules
    check_in_time: "14:00",
    check_out_time: "11:00",
    smoking_allowed: false,
    events_allowed: false,
    pets_allowed: false,
  });
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Auto-save keys for localStorage
  const PROPERTY_FORM_KEY = 'host_property_draft';
  const VEHICLE_FORM_KEY = 'host_vehicle_draft';

  // Load saved drafts on mount
  useEffect(() => {
    try {
      const savedProperty = localStorage.getItem(PROPERTY_FORM_KEY);
      if (savedProperty) {
        const parsed = JSON.parse(savedProperty);
        setPropertyForm(parsed.form);
        setWizardStep(parsed.step || 1);
      }
    } catch (e) {
      console.error('Failed to load property draft:', e);
    }
  }, []);

  // Auto-save property form
  useEffect(() => {
    if (showPropertyWizard && propertyForm.title) {
      try {
        localStorage.setItem(PROPERTY_FORM_KEY, JSON.stringify({ form: propertyForm, step: wizardStep }));
      } catch (e) {
        console.error('Failed to save property draft:', e);
      }
    }
  }, [propertyForm, wizardStep, showPropertyWizard]);



  // New Vehicle wizard (matches property wizard UX)
  const [showVehicleWizard, setShowVehicleWizard] = useState(false);
  const [vehicleWizardStep, setVehicleWizardStep] = useState(1);
  const [creatingVehicle, setCreatingVehicle] = useState(false);
  const [vehicleUploadDialogOpen, setVehicleUploadDialogOpen] = useState(false);
  const [showRouteWizard, setShowRouteWizard] = useState(false);
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [routeForm, setRouteForm] = useState({
    from_location: "",
    to_location: "",
    base_price: 50000,
    currency: "RWF",
    is_published: true,
  });
  const [vehicleForm, setVehicleForm] = useState({
    title: "",
    provider_name: "",
    vehicle_type: "Sedan",
    seats: 4,
    driver_included: true,
    price_per_day: 50000,
    currency: "RWF",
    media: [] as string[],
    is_published: true,
  });

  // Load saved vehicle draft on mount
  useEffect(() => {
    try {
      const savedVehicle = localStorage.getItem(VEHICLE_FORM_KEY);
      if (savedVehicle) {
        const parsed = JSON.parse(savedVehicle);
        setVehicleForm(parsed.form);
        setVehicleWizardStep(parsed.step || 1);
      }
    } catch (e) {
      console.error('Failed to load vehicle draft:', e);
    }
  }, []);

  // Auto-save vehicle form
  useEffect(() => {
    if (showVehicleWizard && vehicleForm.title) {
      try {
        localStorage.setItem(VEHICLE_FORM_KEY, JSON.stringify({ form: vehicleForm, step: vehicleWizardStep }));
      } catch (e) {
        console.error('Failed to save vehicle draft:', e);
      }
    }
  }, [vehicleForm, vehicleWizardStep, showVehicleWizard]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/host-dashboard");
    }
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    try {
      // Fetch host application to get service_types
      const { data: hostAppData } = await supabase
        .from("host_applications")
        .select("service_types")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();
      
      if (hostAppData?.service_types) {
        setHostServiceTypes(hostAppData.service_types);
      } else {
        // Default to all if no approved application found (shouldn't happen for hosts)
        setHostServiceTypes(['accommodation', 'tour', 'transport']);
      }
      
      // Fetch properties, tours, tour_packages, vehicles, routes
      const [propsRes, toursRes, tourPackagesRes, vehiclesRes, routesRes] = await Promise.all([
        supabase.from("properties").select("*").eq("host_id", user.id).order("created_at", { ascending: false }),
        supabase.from("tours").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
        supabase.from("tour_packages").select("*").eq("host_id", user.id).order("created_at", { ascending: false }),
        supabase.from("transport_vehicles").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
        supabase.from("transport_routes").select("*").order("created_at", { ascending: false }),
      ]);

      if (propsRes.data) setProperties(propsRes.data as Property[]);
      
      // Build tours array from both sources
      const toursWithSource = (toursRes.data as Tour[] || []).map(t => ({ ...t, source: "tours" as const }));
      const packagesAsTours = (tourPackagesRes.data || []).map(pkg => ({
        id: pkg.id,
        title: pkg.title,
        description: pkg.description,
        location: `${pkg.city}, ${pkg.country}`,
        city: pkg.city,
        country: pkg.country,
        duration: pkg.duration,
        price_per_person: pkg.price_per_adult,
        currency: pkg.currency,
        images: [pkg.cover_image, ...(Array.isArray(pkg.gallery_images) ? pkg.gallery_images : [])].filter(Boolean),
        cover_image: pkg.cover_image,
        gallery_images: pkg.gallery_images,
        duration_days: parseInt(pkg.duration) || 1,
        created_at: pkg.created_at,
        is_published: pkg.status === 'approved',
        source: "tour_packages" as const,
        // Include all tour package specific fields
        categories: pkg.categories,
        tour_type: pkg.tour_type,
        daily_itinerary: pkg.daily_itinerary,
        included_services: pkg.included_services,
        excluded_services: pkg.excluded_services,
        meeting_point: pkg.meeting_point,
        what_to_bring: pkg.what_to_bring,
        cancellation_policy: pkg.cancellation_policy,
        non_refundable_items: pkg.non_refundable_items,
        min_guests: pkg.min_guests,
        max_guests: pkg.max_guests,
        group_discount_6_10: pkg.group_discount_6_10,
        group_discount_11_15: pkg.group_discount_11_15,
        group_discount_16_plus: pkg.group_discount_16_plus,
        itinerary_pdf_url: pkg.itinerary_pdf_url,
        status: pkg.status,
        host_id: pkg.host_id,
      }));
      
      // Replace entire tours array (don't append to prevent stale data)
      setTours([...toursWithSource, ...packagesAsTours as any]);
      
      if (vehiclesRes.data) setVehicles(vehiclesRes.data as Vehicle[]);
      if (routesRes.data) setRoutes(routesRes.data as TransportRoute[]);

      // Fetch bookings separately for properties, tours, and transport
      const propertyIds = (propsRes.data || []).map((p: { id: string }) => p.id);
      const tourPackageIds = (tourPackagesRes.data || []).map((t: { id: string }) => t.id);
      const vehicleIds = (vehiclesRes.data || []).map((v: { id: string }) => v.id);
      
      const bookingQueries = [];
      
      // Property bookings
      if (propertyIds.length > 0) {
        bookingQueries.push(
          supabase
            .from("bookings")
            .select("*, properties(title)")
            .eq("booking_type", "property")
            .in("property_id", propertyIds)
            .order("created_at", { ascending: false })
        );
      }
      
      // Tour bookings
      if (tourPackageIds.length > 0) {
        bookingQueries.push(
          supabase
            .from("bookings")
            .select("*, tour_packages(title)")
            .eq("booking_type", "tour")
            .in("tour_id", tourPackageIds)
            .order("created_at", { ascending: false })
        );
      }
      
      // Transport bookings
      if (vehicleIds.length > 0) {
        bookingQueries.push(
          supabase
            .from("bookings")
            .select("*")
            .eq("booking_type", "transport")
            .in("transport_id", vehicleIds)
            .order("created_at", { ascending: false })
        );
      }
      
      if (bookingQueries.length > 0) {
        const results = await Promise.all(bookingQueries);
        const allBookings = results.flatMap(r => r.data || []);
        setBookings(allBookings as Booking[]);
      } else {
        setBookings([]);
      }
    } catch (e) {
      logError("host.fetchData", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (isHost && user) {
      fetchData();
    } else if (!authLoading && !rolesLoading) {
      setIsLoading(false);
    }
  }, [isHost, user, fetchData, authLoading, rolesLoading]);

  // Real-time subscriptions for host dashboard data
  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to bookings changes for this host's properties/tours/transport
    const bookingsChannel = supabase
      .channel('host-bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        console.log('[HostDashboard] Booking change detected - refetching...', payload);
        fetchData();
      })
      .subscribe();
    channels.push(bookingsChannel);

    // Subscribe to property_reviews for this host
    const reviewsChannel = supabase
      .channel('host-reviews-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_reviews' }, () => {
        console.log('[HostDashboard] Review change detected');
        fetchData();
      })
      .subscribe();
    channels.push(reviewsChannel);

    // Subscribe to properties changes (in case admin updates status)
    const propertiesChannel = supabase
      .channel('host-properties-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        console.log('[HostDashboard] Properties change detected');
        fetchData();
      })
      .subscribe();
    channels.push(propertiesChannel);

    // Subscribe to tour_packages changes
    const toursChannel = supabase
      .channel('host-tours-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_packages' }, () => {
        console.log('[HostDashboard] Tour packages change detected');
        fetchData();
      })
      .subscribe();
    channels.push(toursChannel);

    // Subscribe to transport_vehicles changes
    const vehiclesChannel = supabase
      .channel('host-vehicles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_vehicles' }, () => {
        console.log('[HostDashboard] Vehicles change detected');
        fetchData();
      })
      .subscribe();
    channels.push(vehiclesChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, fetchData]);

  // Fetch payout info on mount
  useEffect(() => {
    if (!user) return;
    const fetchPayoutInfo = async () => {
      try {
        // Fetch profile payout info
        const { data: profile } = await supabase
          .from('profiles')
          .select('payout_method, payout_phone, payout_bank_name, payout_bank_account, payout_account_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setPayoutInfo({
            method: profile.payout_method,
            phone: profile.payout_phone,
            bank_name: profile.payout_bank_name,
            bank_account: profile.payout_bank_account,
            account_name: profile.payout_account_name,
          });
          // Pre-fill form
          setPayoutForm({
            method: (profile.payout_method as 'mobile_money' | 'bank_transfer') || 'mobile_money',
            phone: profile.payout_phone || '',
            bank_name: profile.payout_bank_name || '',
            bank_account: profile.payout_bank_account || '',
            account_name: profile.payout_account_name || '',
          });
        }

        // Fetch payout history
        const { data: payouts } = await supabase
          .from('host_payouts')
          .select('*')
          .eq('host_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (payouts) {
          setPayoutHistory(payouts);
        }

        // Show payout dialog only once per session if no payout method exists
        const hasSeenPayoutPrompt = sessionStorage.getItem('hasSeenPayoutPrompt');
        if (!profile?.payout_method && !hasSeenPayoutPrompt) {
          sessionStorage.setItem('hasSeenPayoutPrompt', 'true');
          setTimeout(() => {
            setShowPayoutDialog(true);
          }, 1500);
        }
      } catch (e) {
        console.error('Failed to fetch payout info:', e);
      }
    };
    fetchPayoutInfo();
  }, [user]);

  // Request payout (saves payout info if needed and sends email notification)
  const requestPayout = async () => {
    if (!user) return;
    
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Please enter a valid payout amount.' });
      return;
    }

    if (amount > availableForPayout) {
      toast({ variant: 'destructive', title: 'Insufficient balance', description: `Maximum available: ${formatMoney(availableForPayout, 'RWF')}` });
      return;
    }

    if (amount < 5000) {
      toast({ variant: 'destructive', title: 'Minimum payout', description: 'Minimum payout amount is 5,000 RWF' });
      return;
    }

    // Validate payout form
    if (payoutForm.method === 'mobile_money' && !payoutForm.phone) {
      toast({ variant: 'destructive', title: 'Phone required', description: 'Please enter your mobile money phone number.' });
      return;
    }
    if (payoutForm.method === 'bank_transfer' && (!payoutForm.bank_name || !payoutForm.bank_account)) {
      toast({ variant: 'destructive', title: 'Bank details required', description: 'Please enter your bank name and account number.' });
      return;
    }

    setRequestingPayout(true);
    try {
      // First, save/update payout info to profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          payout_method: payoutForm.method,
          payout_phone: payoutForm.method === 'mobile_money' ? payoutForm.phone : null,
          payout_bank_name: payoutForm.method === 'bank_transfer' ? payoutForm.bank_name : null,
          payout_bank_account: payoutForm.method === 'bank_transfer' ? payoutForm.bank_account : null,
          payout_account_name: payoutForm.account_name || null,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update local state
      setPayoutInfo({
        method: payoutForm.method,
        phone: payoutForm.phone,
        bank_name: payoutForm.bank_name,
        bank_account: payoutForm.bank_account,
        account_name: payoutForm.account_name,
      });

      // Create payout details object
      const payoutDetails = payoutForm.method === 'mobile_money'
        ? { phone: payoutForm.phone, account_name: payoutForm.account_name }
        : { bank_name: payoutForm.bank_name, bank_account: payoutForm.bank_account, account_name: payoutForm.account_name };

      // Insert payout request
      const { error } = await supabase
        .from('host_payouts')
        .insert({
          host_id: user.id,
          amount,
          currency: 'RWF',
          status: 'pending',
          payout_method: payoutForm.method,
          payout_details: payoutDetails,
        });

      if (error) throw error;

      // Send email notification to admin
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();

        await fetch('/api/payout-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostName: profileData?.full_name || user.email?.split('@')[0] || 'Host',
            hostEmail: profileData?.email || user.email,
            amount,
            currency: 'RWF',
            method: payoutForm.method,
            phone: payoutForm.phone,
            bankName: payoutForm.bank_name,
            bankAccount: payoutForm.bank_account,
            accountName: payoutForm.account_name,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the payout request if email fails
      }

      toast({ title: 'Request submitted', description: 'Your payout request is being processed. We\'ll notify you once it\'s complete.' });
      setShowPayoutDialog(false);
      setPayoutAmount('');
      
      // Refresh payout history
      const { data: payouts } = await supabase
        .from('host_payouts')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (payouts) setPayoutHistory(payouts);
    } catch (e) {
      logError('host.payout.request', e);
      toast({ variant: 'destructive', title: 'Failed to submit request', description: uiErrorMessage(e) });
    } finally {
      setRequestingPayout(false);
    }
  };

  // Property CRUD
  const updateProperty = async (id: string, updates: Partial<Property>) => {
    const { error } = await supabase.from("properties").update(updates).eq("id", id);
    if (error) {
      logError("host.property.update", error);
      toast({ variant: "destructive", title: "Update failed", description: uiErrorMessage(error) });
      return false;
    }
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    toast({ title: "Saved", description: "Property updated successfully." });
    return true;
  };

  const createProperty = async () => {
    if (!propertyForm.title.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return null;
    }
    if (!propertyForm.location.trim()) {
      toast({ variant: "destructive", title: "Location required" });
      return null;
    }

    setCreatingProperty(true);

    // Use only columns guaranteed to exist in the database schema
    // NOTE: Database has both 'name' (required NOT NULL) and 'title' columns
    const propertyName = propertyForm.title.trim();
    const payload: Record<string, unknown> = {
      name: propertyName,  // Required column (NOT NULL)
      title: propertyName,
      location: propertyForm.location.trim(),
      address: propertyForm.address.trim() || null,
      property_type: propertyForm.property_type || "Apartment",
      description: propertyForm.description.trim() || null,
      price_per_night: propertyForm.price_per_night || 50000,
      currency: propertyForm.currency || "RWF",
      max_guests: propertyForm.max_guests || 2,
      bedrooms: propertyForm.bedrooms || 1,
      bathrooms: propertyForm.bathrooms || 1,
      images: propertyForm.images.length > 0 ? propertyForm.images : null,
      main_image: propertyForm.images.length > 0 ? propertyForm.images[0] : null,
      host_id: user!.id,
      is_published: true,
    };

    // Add optional columns only if they have values
    if (propertyForm.beds) payload.beds = propertyForm.beds;
    if (propertyForm.amenities?.length > 0) payload.amenities = propertyForm.amenities;
    if (propertyForm.cancellation_policy) payload.cancellation_policy = propertyForm.cancellation_policy;
    // Discounts / rules (these columns exist in prod; save them so details page reflects host choices)
    payload.weekly_discount = Number(propertyForm.weekly_discount || 0);
    payload.monthly_discount = Number(propertyForm.monthly_discount || 0);
    payload.check_in_time = propertyForm.check_in_time || "14:00";
    payload.check_out_time = propertyForm.check_out_time || "11:00";
    payload.smoking_allowed = Boolean(propertyForm.smoking_allowed);
    payload.events_allowed = Boolean(propertyForm.events_allowed);
    payload.pets_allowed = Boolean(propertyForm.pets_allowed);

    console.log("[createProperty] Attempting insert with payload:", payload);

    try {
      const { error, data: newProp } = await supabase
        .from("properties")
        .insert(payload as never)
        .select()
        .single();

      if (error) {
        console.error("[createProperty] Full error:", JSON.stringify(error, null, 2));
        logError("host.property.create", error);
        if (error.code === "42501" || error.message?.includes("policy")) {
          toast({
            variant: "destructive",
            title: "Permission denied",
            description: "You need to be a verified host to create properties.",
          });
        } else {
          toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
        }
        return null;
      }

      setProperties((prev) => [newProp as Property, ...prev]);
      toast({ title: "Property Created!", description: "Your property is now live on the homepage!" });
      localStorage.removeItem(PROPERTY_FORM_KEY); // Clear draft
      resetPropertyForm();
      setShowPropertyWizard(false);
      setWizardStep(1);
      return newProp;
    } catch (err) {
      console.error("[createProperty] Unexpected error:", err);
      toast({ variant: "destructive", title: "Failed to create property", description: "An unexpected error occurred." });
      return null;
    } finally {
      setCreatingProperty(false);
    }
  };

  const resetPropertyForm = () => {
    localStorage.removeItem(PROPERTY_FORM_KEY); // Clear draft
    setPropertyForm({
      title: "",
      location: "",
      address: "",
      property_type: "Apartment",
      description: "",
      price_per_night: 50000,
      price_per_person: null,
      currency: "RWF",
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      beds: 1,
      amenities: [],
      cancellation_policy: "fair",
      images: [],
      weekly_discount: 0,
      monthly_discount: 0,
      check_in_time: "14:00",
      check_out_time: "11:00",
      smoking_allowed: false,
      events_allowed: false,
      pets_allowed: false,
    });
  };

  const deleteProperty = async (id: string) => {
    if (!confirm("Delete this property permanently?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      logError("host.property.delete", error);
      toast({ variant: "destructive", title: "Delete failed", description: uiErrorMessage(error) });
      return;
    }
    setProperties((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Deleted" });
  };

  // Tour CRUD
  const updateTour = async (id: string, updates: any, source?: "tours" | "tour_packages") => {
    if (!user) return false;
    try {
      const tableName = source === "tour_packages" ? "tour_packages" : "tours";
      const { error } = await supabase.from(tableName).update(updates).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Tour updated successfully" });
      fetchData();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update tour", variant: "destructive" });
      return false;
    }
  };

  const deleteTour = async (id: string, source?: "tours" | "tour_packages") => {
    if (!confirm("Are you sure you want to permanently delete this tour? This cannot be undone.")) return;
    
    try {
      const tableName = source || "tours";
      const ownerField = tableName === "tour_packages" ? "host_id" : "created_by";
      
      console.log('[HostDashboard] Deleting from table:', tableName, 'ID:', id);
      
      // Delete from the correct table (RLS ensures user can only delete their own)
      const { error: deleteError, count } = await supabase
        .from(tableName)
        .delete({ count: 'exact' })
        .eq("id", id)
        .eq(ownerField, user!.id); // Security: only delete if user owns it
      
      if (deleteError) {
        console.error('[HostDashboard] Delete failed:', deleteError);
        logError("host.tour.delete", deleteError);
        toast({ 
          variant: "destructive", 
          title: "Delete failed", 
          description: deleteError.message || uiErrorMessage(deleteError) 
        });
        return;
      }
      
      // Check if anything was deleted
      if (count === 0) {
        console.warn('[HostDashboard] No tour was deleted - may not exist or not owned by user');
        toast({ 
          variant: "destructive", 
          title: "Cannot delete", 
          description: "Tour not found or you don't have permission to delete it." 
        });
        return;
      }
      
      console.log('[HostDashboard] Tour deleted successfully, count:', count);
      
      // Update local state
      setTours((prev) => prev.filter((t) => t.id !== id));
      
      // Invalidate all tour-related caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tours"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-tours"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-tours"] }),
        queryClient.invalidateQueries({ queryKey: ["operations_tours"] }),
      ]);
      
      toast({ 
        title: "Tour deleted", 
        description: "Tour has been permanently deleted from all pages." 
      });
      
    } catch (error) {
      console.error('[HostDashboard] Unexpected error during deletion:', error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error instanceof Error ? error.message : "An unexpected error occurred" 
      });
    }
  };

  // Vehicle CRUD
  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    const { error } = await supabase.from("transport_vehicles").update(updates).eq("id", id);
    if (error) {
      logError("host.vehicle.update", error);
      toast({ variant: "destructive", title: "Update failed", description: uiErrorMessage(error) });
      return false;
    }
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    toast({ title: "Saved" });
    return true;
  };

  const createVehicle = async (data: Partial<Vehicle>) => {
    const payload: Record<string, unknown> = {
      title: data.title || "New Vehicle",
      vehicle_type: data.vehicle_type || "Sedan",
      seats: data.seats ?? 4,
      price_per_day: data.price_per_day ?? 0,
      currency: data.currency || "RWF",
      provider_name: data.provider_name || null,
      driver_included: typeof data.driver_included === "boolean" ? data.driver_included : false,
      media: data.media && data.media.length > 0 ? data.media : null,
      image_url: data.media && data.media.length > 0 ? data.media[0] : null,
      created_by: user!.id,
      is_published: typeof data.is_published === "boolean" ? data.is_published : true,
    };
    
    const { error, data: newVehicle } = await supabase
      .from("transport_vehicles")
      .insert(payload as never)
      .select()
      .single();
    if (error) {
      logError("host.vehicle.create", error);
      toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
      return null;
    }
    setVehicles((prev) => [newVehicle as Vehicle, ...prev]);
    localStorage.removeItem(VEHICLE_FORM_KEY); // Clear draft
    toast({ title: "Vehicle created" });
    return newVehicle;
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    const { error } = await supabase.from("transport_vehicles").delete().eq("id", id);
    if (error) {
      logError("host.vehicle.delete", error);
      toast({ variant: "destructive", title: "Delete failed", description: uiErrorMessage(error) });
      return;
    }
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    toast({ title: "Deleted" });
  };

  // Route CRUD (From → To)
  const updateRoute = async (id: string, updates: Partial<TransportRoute>) => {
    const { error } = await supabase.from("transport_routes").update(updates as never).eq("id", id);
    if (error) {
      logError("host.route.update", error);
      toast({ variant: "destructive", title: "Update failed", description: uiErrorMessage(error) });
      return false;
    }
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    toast({ title: "Saved" });
    return true;
  };

  const createRoute = async (payload: {
    from_location: string;
    to_location: string;
    base_price: number;
    currency: string;
    is_published: boolean;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("transport_routes")
      .insert({
        from_location: payload.from_location,
        to_location: payload.to_location,
        base_price: payload.base_price,
        currency: payload.currency,
        is_published: payload.is_published,
        created_by: user.id,
      } as never)
      .select()
      .single();
    if (error) {
      logError("host.route.create", error);
      toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
      return null;
    }
    setRoutes((prev) => [data as TransportRoute, ...prev]);
    toast({ title: "Route created" });
    return data as TransportRoute;
  };

  const deleteRoute = async (id: string) => {
    if (!confirm("Delete this route?")) return;
    const { error } = await supabase.from("transport_routes").delete().eq("id", id);
    if (error) {
      logError("host.route.delete", error);
      toast({ variant: "destructive", title: "Delete failed", description: uiErrorMessage(error) });
      return;
    }
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Deleted" });
  };

  // Booking status update
  const updateBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      logError("host.booking.update", error);
      toast({ variant: "destructive", title: "Update failed", description: uiErrorMessage(error) });
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    toast({ title: "Booking updated" });
  };

  // Stats - use safe defaults
  // Calculate earnings after platform fees
  const confirmedBookings = (bookings || []).filter((b) => b.status === "confirmed" || b.status === "completed");
  
  // Gross earnings (what guests paid)
  const totalGrossEarnings = confirmedBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
  
  // Net earnings after platform fees
  // For accommodation: base_price = guest_paid / 1.07, host gets base_price - 3%
  // For tours: base_price = guest_paid (0% guest fee), host gets base_price - 10%
  const totalNetEarnings = confirmedBookings.reduce((sum, b) => {
    const guestPaid = Number(b.total_price);
    if (b.booking_type === 'property' || b.property_id) {
      // Property: guest paid 107%, host pays 3% of base price
      const { hostNetEarnings } = calculateHostEarningsFromGuestTotal(guestPaid, 'accommodation');
      return sum + hostNetEarnings;
    } else if (b.booking_type === 'tour' || b.tour_id) {
      // Tour: guest paid 100%, provider pays 10% of base price
      const { hostNetEarnings } = calculateHostEarningsFromGuestTotal(guestPaid, 'tour');
      return sum + hostNetEarnings;
    }
    return sum + guestPaid; // Transport or other - no fee for now
  }, 0);
  
  // Keep totalEarnings as net earnings for display
  const totalEarnings = totalNetEarnings;
  const pendingBookings = (bookings || []).filter((b) => b.status === "pending").length;
  const publishedProperties = (properties || []).filter((p) => p.is_published).length;

  // Calculate available for payout (confirmed bookings - pending payouts)
  const pendingPayoutAmount = payoutHistory
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const completedPayoutAmount = payoutHistory
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const availableForPayout = Math.max(0, totalEarnings - pendingPayoutAmount - completedPayoutAmount);

  // Handle payout button click - always open combined dialog
  const handlePayoutClick = () => {
    setShowPayoutDialog(true);
  };

  // Wizard steps
  const totalSteps = 5;
  const stepTitles = ["Basic Info", "Details", "Photos", "Amenities", "Review"];

  // Helper functions to open wizards and notify about drafts
  const openPropertyWizard = () => {
    const hasDraft = localStorage.getItem(PROPERTY_FORM_KEY);
    setShowPropertyWizard(true);
    if (hasDraft) {
      toast({
        title: "Draft Restored",
        description: "Your previous property listing progress has been restored.",
      });
    }
  };



  const openVehicleWizard = () => {
    const hasDraft = localStorage.getItem(VEHICLE_FORM_KEY);
    setShowVehicleWizard(true);
    if (hasDraft) {
      toast({
        title: "Draft Restored",
        description: "Your previous vehicle listing progress has been restored.",
      });
    }
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1:
        return propertyForm.title.trim() && propertyForm.location.trim();
      case 2:
        return propertyForm.price_per_night > 0;
      case 3:
        return true; // Images optional
      case 4:
        return true; // Amenities optional
      case 5:
        return true;
      default:
        return false;
    }
  };

  // Discount Codes CRUD
  const fetchDiscounts = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch discounts:", error);
      return;
    }
    setDiscounts(data || []);
  };

  const createDiscount = async () => {
    if (!user || !discountForm.code.trim()) return;
    
    const { data, error } = await supabase
      .from("discount_codes")
      .insert({
        code: discountForm.code.toUpperCase().trim(),
        description: discountForm.description.trim() || null,
        discount_type: discountForm.discount_type,
        discount_value: discountForm.discount_value,
        currency: discountForm.currency,
        minimum_amount: discountForm.minimum_amount,
        max_uses: discountForm.max_uses,
        valid_until: discountForm.valid_until,
        applies_to: discountForm.applies_to,
        host_id: user.id,
      })
      .select()
      .single();
    
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    
    setDiscounts(prev => [data, ...prev]);
    setShowDiscountForm(false);
    setDiscountForm({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      currency: 'RWF',
      minimum_amount: 0,
      max_uses: null,
      valid_until: null,
      applies_to: 'all',
    });
    toast({ title: "Success", description: "Discount code created successfully" });
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm("Delete this discount code?")) return;
    
    const { error } = await supabase
      .from("discount_codes")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    
    setDiscounts(prev => prev.filter(d => d.id !== id));
    toast({ title: "Deleted", description: "Discount code removed" });
  };

  const toggleDiscountStatus = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("discount_codes")
      .update({ is_active: !isActive })
      .eq("id", id);
    
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, is_active: !isActive } : d));
    toast({ title: "Updated", description: `Discount code ${!isActive ? 'activated' : 'deactivated'}` });
  };

  useEffect(() => {
    if (user && tab === 'discounts') {
      fetchDiscounts();
    }
  }, [user, tab]);

  // Property Card Component
  const PropertyCard = ({ property }: { property: Property }) => {
    const isEditing = editingPropertyId === property.id;
    const [form, setForm] = useState(property);
    const [editUploadOpen, setEditUploadOpen] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleSave = async () => {
      const success = await updateProperty(property.id, {
        title: form.title,
        description: form.description,
        location: form.location,
        property_type: form.property_type,
        price_per_night: form.price_per_night,
        currency: form.currency,
        max_guests: form.max_guests,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        beds: form.beds,
        amenities: form.amenities,
        cancellation_policy: form.cancellation_policy,
        images: form.images,
        is_published: form.is_published,
      });
      if (success) setEditingPropertyId(null);
    };

    const handleDragStart = (index: number) => {
      setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;
      
      const newImages = [...(form.images || [])];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedImage);
      
      setForm((f) => ({ ...f, images: newImages }));
      setDraggedIndex(index);
    };

    const handleDragEnd = () => {
      setDraggedIndex(null);
    };

    return (
      <Card className="overflow-hidden">
        <div className="relative h-40 bg-muted">
          {form.images?.[0] ? (
            <img src={form.images[0]} alt={form.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            {form.is_published ? (
              <Badge className="bg-green-500">Live</Badge>
          ) : (
              <Badge variant="secondary">Draft</Badge>
          )}
        </div>
        </div>

        <div className="p-4 space-y-3">
          {isEditing ? (
            <>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" />
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location" />
              <Textarea 
                value={form.description || ""} 
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} 
                placeholder="Description" 
                rows={3}
                className="resize-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Price/Night</Label>
                  <Input type="number" value={form.price_per_night} onChange={(e) => setForm((f) => ({ ...f, price_per_night: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">Price/Person</Label>
                  <Input 
                    type="number" 
                    value={form.price_per_person || ''} 
                    onChange={(e) => setForm((f) => ({ ...f, price_per_person: e.target.value ? Number(e.target.value) : null }))} 
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={form.currency || "RWF"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{currencies.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Images ({(form.images || []).length}) - Drag to reorder, first image is the cover</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(form.images || []).map((img, i) => (
                    <div 
                      key={i} 
                      className={`relative rounded overflow-hidden group cursor-move ${
                        i === 0 ? 'w-24 h-24' : 'w-14 h-14'
                      } ${draggedIndex === i ? 'opacity-50' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                    >
                      {isVideoUrl(img) ? (
                        <video src={img} className="w-full h-full object-cover pointer-events-none" muted />
                      ) : (
                        <img src={img} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                      )}
                      {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-white text-[11px] text-center py-1 font-semibold">Cover</span>}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm((f) => ({ ...f, images: (f.images || []).filter((_, j) => j !== i) }));
                        }}
                        className={`absolute top-0 right-0 ${i === 0 ? 'w-6 h-6' : 'w-5 h-5'} bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity`}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditUploadOpen(true)}
                    className="w-14 h-14 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    title="Add images"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-2 block">Availability Calendar</Label>
                <AvailabilityCalendar propertyId={property.id} />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
                  <span className="text-sm">{form.is_published ? "Live" : "Draft"}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingPropertyId(null)}><X className="w-3 h-3" /></Button>
                  <Button size="sm" onClick={handleSave}><Save className="w-3 h-3" /></Button>
                </div>
              </div>
              <CloudinaryUploadDialog
                title="Upload Property Media"
                folder="merry360/properties"
                accept="image/*,video/*"
                multiple
                autoStart={true}
                value={form.images || []}
                onChange={(urls) => {
                  setForm((f) => ({ ...f, images: urls }));
                }}
                open={editUploadOpen}
                onOpenChange={setEditUploadOpen}
              />
            </>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">{property.location}</p>
                  {property.address ? (
                    <p className="text-xs text-muted-foreground mt-1">{property.address}</p>
                  ) : null}
                </div>
                <span className="text-primary font-bold text-sm">
                  {formatMoney(property.price_per_night, property.currency || "RWF")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{property.max_guests}</span>
                <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{property.bedrooms}</span>
                <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{property.bathrooms}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Link to={`/properties/${property.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View
                </Link>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingPropertyId(property.id)}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => updateProperty(property.id, { is_published: !property.is_published })}>
                    {property.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteProperty(property.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    );
  };

  // Tour Card Component with edit functionality
  const TourCard = ({ tour }: { tour: Tour }) => {
    const isEditing = editingTourId === tour.id;
    const [form, setForm] = useState(tour);
    const [uploading, setUploading] = useState(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [newImages, setNewImages] = useState<string[]>([]);
    const [removedImages, setRemovedImages] = useState<string[]>([]);
    const [groupDiscounts, setGroupDiscounts] = useState<Array<{min_people: number, max_people: number | null, discount_percentage: number}>>([]);

    // Sync form state when tour prop changes or when exiting edit mode
    useEffect(() => {
      setForm(tour);
      setNewImages([]);
      setRemovedImages([]);
      
      // Initialize groupDiscounts from existing discount fields or from group_discounts array
      if (tour.source === "tour_packages") {
        const discounts = [];
        if ((tour as any).group_discount_6_10) {
          discounts.push({ min_people: 6, max_people: 10, discount_percentage: (tour as any).group_discount_6_10 });
        }
        if ((tour as any).group_discount_11_15) {
          discounts.push({ min_people: 11, max_people: 15, discount_percentage: (tour as any).group_discount_11_15 });
        }
        if ((tour as any).group_discount_16_plus) {
          discounts.push({ min_people: 16, max_people: null, discount_percentage: (tour as any).group_discount_16_plus });
        }
        setGroupDiscounts(discounts);
      }
    }, [tour, isEditing]);

    const handleAddImage = async (file: File) => {
      try {
        setUploading(true);
        const { uploadFile } = await import("@/lib/uploads");
        const { url } = await uploadFile(file, { folder: "tour-images" });
        setNewImages(prev => [...prev, url]);
        toast({ title: "Image uploaded" });
      } catch (e) {
        toast({ variant: "destructive", title: "Upload failed", description: String(e) });
      } finally {
        setUploading(false);
      }
    };

    const handleRemoveImage = (url: string) => {
      if (form.images?.includes(url)) {
        setRemovedImages(prev => [...prev, url]);
      } else {
        setNewImages(prev => prev.filter(img => img !== url));
      }
    };

    const getCurrentImages = () => {
      const existingImages = (form.images || []).filter(img => !removedImages.includes(img));
      return [...existingImages, ...newImages];
    };

    const handleSave = async () => {
      let updates: any = {
        title: form.title,
        description: form.description,
        currency: form.currency,
      };

      // Common fields for both tours and packages
      if (tour.source === "tours") {
        updates.price_per_person = form.price_per_person;
        updates.location = form.location;
        updates.duration_days = form.duration_days;
        updates.max_participants = form.max_participants;
        updates.categories = form.categories;
      } else {
        // Tour package specific fields - use price_per_adult for tour_packages table
        updates.price_per_adult = form.price_per_person;
        updates.city = form.city;
        updates.duration = form.duration;
        updates.categories = form.categories;
        updates.tour_type = form.tour_type;
        updates.daily_itinerary = form.daily_itinerary;
        updates.included_services = form.included_services;
        updates.excluded_services = form.excluded_services;
        updates.meeting_point = form.meeting_point;
        updates.what_to_bring = form.what_to_bring;
        updates.cancellation_policy = form.cancellation_policy;
        updates.non_refundable_items = form.non_refundable_items || [];
        updates.min_guests = form.min_guests;
        updates.max_guests = form.max_guests;
        
        // Convert groupDiscounts array back to individual fields
        updates.group_discount_6_10 = 0;
        updates.group_discount_11_15 = 0;
        updates.group_discount_16_plus = 0;
        groupDiscounts.forEach(discount => {
          if (discount.min_people === 6 && discount.max_people === 10) {
            updates.group_discount_6_10 = discount.discount_percentage;
          } else if (discount.min_people === 11 && discount.max_people === 15) {
            updates.group_discount_11_15 = discount.discount_percentage;
          } else if (discount.min_people === 16 && discount.max_people === null) {
            updates.group_discount_16_plus = discount.discount_percentage;
          }
        });
      }

      // Update images - tour_packages uses gallery_images and cover_image, tours uses images
      const finalImages = getCurrentImages();
      if (tour.source === "tour_packages") {
        updates.gallery_images = finalImages;
        if (finalImages.length > 0) {
          updates.cover_image = finalImages[0];
        }
      } else {
        updates.images = finalImages;
      }

      // Upload new PDF if selected
      if (pdfFile) {
        setUploading(true);
        try {
          const { uploadFile } = await import("@/lib/uploads");
          const { url } = await uploadFile(pdfFile, { folder: "tour-itineraries" });
          updates.itinerary_pdf_url = url;
        } catch (e) {
          toast({ variant: "destructive", title: "PDF upload failed", description: String(e) });
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      const success = await updateTour(tour.id, updates, form.source);
      if (success) {
        setEditingTourId(null);
        setPdfFile(null);
        setNewImages([]);
        setRemovedImages([]);
      }
    };

    const isTourPackage = tour.source === "tour_packages";
    const displayImages = isEditing ? getCurrentImages() : (form.images || []);

    return (
      <Card className="overflow-hidden">
        {!isEditing && (
          <div className="relative h-32 bg-muted flex items-center justify-center">
            {displayImages[0] ? (
              <img src={displayImages[0]} alt={form.title} className="w-full h-full object-cover" />
            ) : (
              <MapPin className="w-8 h-8 text-muted-foreground" />
            )}
            <div className="absolute top-2 right-2">
              {isTourPackage ? (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Package</Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Tour</Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="p-4">
          {isEditing ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b">
                <Badge variant="outline" className="text-xs">
                  {isTourPackage ? "Tour Package" : "Tour"}
                </Badge>
                <span className="text-xs text-muted-foreground">Editing</span>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Images</Label>
                {displayImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {displayImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="" className="w-full h-20 object-cover rounded border" />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemoveImage(img)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleAddImage(e.target.files[0])}
                  className="text-xs h-8"
                  disabled={uploading}
                />
              </div>

              {/* Basic Info */}
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1 h-8 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              {/* Tour vs Package specific fields */}
              {!isTourPackage ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Location</Label>
                    <Input
                      value={form.location || ''}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Duration (days)</Label>
                      <Input
                        type="number"
                        value={form.duration_days || 1}
                        onChange={(e) => setForm({ ...form, duration_days: parseInt(e.target.value) || 1 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max Participants</Label>
                      <Input
                        type="number"
                        value={form.max_participants || 10}
                        onChange={(e) => setForm({ ...form, max_participants: parseInt(e.target.value) || 10 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Categories</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {["Nature", "Adventure", "Cultural", "Wildlife", "Historical", "City Tours", "Eco-Tourism", "Photography"].map(cat => (
                        <label key={cat} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80">
                          <input
                            type="checkbox"
                            checked={(form.categories || []).includes(cat)}
                            onChange={(e) => {
                              const cats = form.categories || [];
                              setForm({
                                ...form,
                                categories: e.target.checked ? [...cats, cat] : cats.filter(c => c !== cat)
                              });
                            }}
                            className="w-3 h-3"
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Categories</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {["Cultural", "Adventure", "Wildlife", "City Tours", "Hiking", "Photography", "Historical", "Eco-Tourism"].map(cat => (
                        <label key={cat} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80">
                          <input
                            type="checkbox"
                            checked={(form.categories || []).includes(cat)}
                            onChange={(e) => {
                              const cats = form.categories || [];
                              setForm({
                                ...form,
                                categories: e.target.checked ? [...cats, cat] : cats.filter(c => c !== cat)
                              });
                            }}
                            className="w-3 h-3"
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Tour Type</Label>
                    <Select value={form.tour_type || ''} onValueChange={(v) => setForm({ ...form, tour_type: v })}>
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Private">Private</SelectItem>
                        <SelectItem value="Group">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        value={form.city || ''}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Duration</Label>
                      <Input
                        value={form.duration || ''}
                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        placeholder="3 Days, 2 Nights"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Daily Itinerary</Label>
                    <Textarea
                      value={form.daily_itinerary || ''}
                      onChange={(e) => setForm({ ...form, daily_itinerary: e.target.value })}
                      className="mt-1 text-sm"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Included Services</Label>
                    <Textarea
                      value={form.included_services || ''}
                      onChange={(e) => setForm({ ...form, included_services: e.target.value })}
                      className="mt-1 text-sm"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Excluded Services</Label>
                    <Textarea
                      value={form.excluded_services || ''}
                      onChange={(e) => setForm({ ...form, excluded_services: e.target.value })}
                      className="mt-1 text-sm"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Meeting Point</Label>
                    <Input
                      value={form.meeting_point || ''}
                      onChange={(e) => setForm({ ...form, meeting_point: e.target.value })}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">What to Bring</Label>
                    <Textarea
                      value={form.what_to_bring || ''}
                      onChange={(e) => setForm({ ...form, what_to_bring: e.target.value })}
                      className="mt-1 text-sm"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Cancellation Policy</Label>
                    <div className="mt-1 space-y-1 bg-muted/50 p-3 rounded-md text-xs">
                      <div className="font-semibold mb-2 text-primary">Standard Experiences (Day Tours & Activities)</div>
                      <label className="flex items-start gap-2 cursor-pointer hover:bg-muted/80 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={form.cancellation_policy?.includes("More than 72 hours before start time: Full refund")}
                          onChange={(e) => {
                            const policy = form.cancellation_policy || '';
                            const clause = "More than 72 hours before start time: Full refund (excluding platform service fees and payment processing fees)";
                            setForm({
                              ...form,
                              cancellation_policy: e.target.checked 
                                ? policy + (policy ? '\n\n' : '') + clause
                                : policy.replace(clause, '').replace(/\n\n\n+/g, '\n\n').trim()
                            });
                          }}
                          className="w-3 h-3 mt-0.5 shrink-0"
                        />
                        <span>More than 72 hours before start time: Full refund (excluding platform service fees and payment processing fees)</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer hover:bg-muted/80 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={form.cancellation_policy?.includes("48–72 hours before start time: 50% refund")}
                          onChange={(e) => {
                            const policy = form.cancellation_policy || '';
                            const clause = "48–72 hours before start time: 50% refund (excluding platform service fees)";
                            setForm({
                              ...form,
                              cancellation_policy: e.target.checked 
                                ? policy + (policy ? '\n' : '') + clause
                                : policy.replace(clause, '').replace(/\n\n\n+/g, '\n\n').trim()
                            });
                          }}
                          className="w-3 h-3 mt-0.5 shrink-0"
                        />
                        <span>48–72 hours before start time: 50% refund (excluding platform service fees)</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer hover:bg-muted/80 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={form.cancellation_policy?.includes("Less than 48 hours before start time: No refund")}
                          onChange={(e) => {
                            const policy = form.cancellation_policy || '';
                            const clause = "Less than 48 hours before start time: No refund";
                            setForm({
                              ...form,
                              cancellation_policy: e.target.checked 
                                ? policy + (policy ? '\n' : '') + clause
                                : policy.replace(clause, '').replace(/\n\n\n+/g, '\n\n').trim()
                            });
                          }}
                          className="w-3 h-3 mt-0.5 shrink-0"
                        />
                        <span>Less than 48 hours before start time: No refund</span>
                      </label>

                      <div className="font-semibold mt-3 mb-2 text-primary">Multi-Day, Private & Custom Experiences</div>
                      <label className="flex items-start gap-2 cursor-pointer hover:bg-muted/80 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={form.cancellation_policy?.includes("More than 14 days before start date: Full refund")}
                          onChange={(e) => {
                            const policy = form.cancellation_policy || '';
                            const clause = "More than 14 days before start date: Full refund minus non-refundable deposits and third-party costs";
                            setForm({
                              ...form,
                              cancellation_policy: e.target.checked 
                                ? policy + (policy ? '\n' : '') + clause
                                : policy.replace(clause, '').replace(/\n\n\n+/g, '\n\n').trim()
                            });
                          }}
                          className="w-3 h-3 mt-0.5 shrink-0"
                        />
                        <span>More than 14 days before start date: Full refund minus non-refundable deposits and third-party costs</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer hover:bg-muted/80 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={form.cancellation_policy?.includes("7–14 days before start date: 50% refund")}
                          onChange={(e) => {
                            const policy = form.cancellation_policy || '';
                            const clause = "7–14 days before start date: 50% refund";
                            setForm({
                              ...form,
                              cancellation_policy: e.target.checked 
                                ? policy + (policy ? '\n' : '') + clause
                                : policy.replace(clause, '').replace(/\n\n\n+/g, '\n\n').trim()
                            });
                          }}
                          className="w-3 h-3 mt-0.5 shrink-0"
                        />
                        <span>7–14 days before start date: 50% refund</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer hover:bg-muted/80 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={form.cancellation_policy?.includes("Less than 7 days before start date: No refund")}
                          onChange={(e) => {
                            const policy = form.cancellation_policy || '';
                            const clause = "Less than 7 days before start date: No refund";
                            setForm({
                              ...form,
                              cancellation_policy: e.target.checked 
                                ? policy + (policy ? '\n' : '') + clause
                                : policy.replace(clause, '').replace(/\n\n\n+/g, '\n\n').trim()
                            });
                          }}
                          className="w-3 h-3 mt-0.5 shrink-0"
                        />
                        <span>Less than 7 days before start date: No refund</span>
                      </label>
                    </div>
                    {form.cancellation_policy && form.cancellation_policy.trim() && (
                      <div className="mt-2 p-3 bg-primary/5 rounded border border-primary/20">
                        <p className="text-[10px] font-semibold text-primary mb-2">Selected Policy:</p>
                        <div className="text-[10px] whitespace-pre-line">{form.cancellation_policy}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">Non-Refundable Items</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">Items that cannot be refunded once booked</p>
                    <div className="mt-1 space-y-1 bg-muted/50 p-3 rounded-md">
                      {["National park and conservation permits", "Gorilla trekking and special access permits", "Third-party accommodation", "Transport and flights", "Activity tickets"].map(item => (
                        <label key={item} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/80 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(form.non_refundable_items || []).includes(item)}
                            onChange={(e) => {
                              const items = form.non_refundable_items || [];
                              setForm({
                                ...form,
                                non_refundable_items: e.target.checked 
                                  ? [...items, item]
                                  : items.filter(i => i !== item)
                              });
                            }}
                            className="w-3 h-3"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                    {form.non_refundable_items && form.non_refundable_items.length > 0 && (
                      <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/20">
                        <p className="text-[10px] font-semibold text-primary mb-1">Selected Items:</p>
                        <ul className="text-[10px] space-y-0.5">
                          {form.non_refundable_items.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <span className="text-primary">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-normal mb-1.5 block">Min Guests</Label>
                      <Input
                        type="number"
                        value={form.min_guests || 1}
                        onChange={(e) => setForm({ ...form, min_guests: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-normal mb-1.5 block">Max Guests</Label>
                      <Input
                        type="number"
                        value={form.max_guests || 10}
                        onChange={(e) => setForm({ ...form, max_guests: parseInt(e.target.value) || 10 })}
                        min={form.min_guests || 1}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Group Discounts (Optional)</Label>
                    <p className="text-xs text-muted-foreground">Offer discounts for larger groups to attract more bookings</p>
                    
                    <div className="space-y-3">
                      {groupDiscounts.map((discount, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                          <div>
                            <Label className="text-xs font-normal mb-1.5 block">Min People</Label>
                            <Input
                              type="number"
                              value={discount.min_people}
                              onChange={(e) => {
                                const newDiscounts = [...groupDiscounts];
                                newDiscounts[index].min_people = parseInt(e.target.value) || 0;
                                setGroupDiscounts(newDiscounts);
                              }}
                              min="2"
                              placeholder="e.g., 6"
                              className="h-10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-normal mb-1.5 block">Max People (optional)</Label>
                            <Input
                              type="number"
                              value={discount.max_people || ''}
                              onChange={(e) => {
                                const newDiscounts = [...groupDiscounts];
                                newDiscounts[index].max_people = e.target.value ? parseInt(e.target.value) : null;
                                setGroupDiscounts(newDiscounts);
                              }}
                              min={discount.min_people}
                              placeholder="Leave empty for no limit"
                              className="h-10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-normal mb-1.5 block">Discount (%)</Label>
                            <Input
                              type="number"
                              value={discount.discount_percentage}
                              onChange={(e) => {
                                const newDiscounts = [...groupDiscounts];
                                newDiscounts[index].discount_percentage = parseFloat(e.target.value) || 0;
                                setGroupDiscounts(newDiscounts);
                              }}
                              min="0"
                              max="50"
                              step="1"
                              placeholder="e.g., 10"
                              className="h-10"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setGroupDiscounts(groupDiscounts.filter((_, i) => i !== index))}
                            className="h-10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setGroupDiscounts([...groupDiscounts, { min_people: 6, max_people: null, discount_percentage: 10 }])}
                        className="w-full"
                      >
                        + Add Discount Tier
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Itinerary PDF (Optional)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="text-xs h-8"
                      />
                      {pdfFile && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setPdfFile(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {pdfFile && <p className="text-xs text-green-600 mt-1">✓ {pdfFile.name}</p>}
                    {form.itinerary_pdf_url && !pdfFile && (
                      <a 
                        href={form.itinerary_pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        View PDF
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Price per Person</Label>
                  <Input
                    type="number"
                    value={form.price_per_person}
                    onChange={(e) => setForm({ ...form, price_per_person: parseFloat(e.target.value) })}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={form.currency || 'RWF'} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t sticky bottom-0 bg-card">
                <Button size="sm" variant="outline" onClick={() => { setEditingTourId(null); setPdfFile(null); setNewImages([]); setRemovedImages([]); }}>
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={uploading}>
                  {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-semibold mb-1">{tour.title}</h3>
              <p className="text-sm text-muted-foreground">
                {isTourPackage ? `${tour.city || ''} • ${tour.duration || ''}` : tour.location}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-primary font-bold">{formatMoney(form.price_per_person, form.currency || "RWF")}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/tours/${tour.id}`)} title="View details">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTourId(tour.id)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTour(tour.id, tour.source)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    );
  };

  // Show loading while auth or roles are loading
  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is not logged in, they'll be redirected by useEffect
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show "become a host" if user is not a host (only after roles have loaded)
  if (!isHost) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <Home className="w-16 h-16 mx-auto text-primary mb-6" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Become a Host</h1>
          <p className="text-muted-foreground mb-6">Start earning by listing your property.</p>
          <Button onClick={() => navigate("/become-host")} size="lg">Apply to become a host</Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Show loading while fetching data - removed loading state, show dashboard immediately
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-background">
  //       <Navbar />
  //       <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
  //         <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
  //         <p className="text-muted-foreground">Loading your dashboard...</p>
  //       </div>
  //       <Footer />
  //     </div>
  //   );
  // }

  // Room Creation Form - Minimalistic
  if (showRoomWizard) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setShowRoomWizard(false)}
              className="mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Create a Room</h1>
            <p className="text-muted-foreground mt-2">List a room in your apartment or house</p>
          </div>

          <Card className="p-8">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!propertyForm.title.trim() || !propertyForm.location.trim()) {
                  toast({ variant: "destructive", title: "Missing info", description: "Please fill in all required fields." });
                  return;
                }
                
                try {
                  const payload = {
                    ...propertyForm,
                    property_type: "Room in Apartment",
                    host_id: user!.id,
                    is_published: false,
                  };
                  
                  const { error } = await supabase.from("properties").insert(payload);
                  if (error) throw error;
                  
                  toast({ title: "Success!", description: "Your room has been listed." });
                  setShowRoomWizard(false);
                  resetPropertyForm();
                  fetchData();
                } catch (e) {
                  logError("host.createRoom", e);
                  toast({ variant: "destructive", title: "Error", description: uiErrorMessage(e, "Could not create room.") });
                }
              }}
              className="space-y-6"
            >
              <div>
                <Label className="text-sm font-medium">Room Title *</Label>
                <Input
                  value={propertyForm.title}
                  onChange={(e) => setPropertyForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Cozy Room with City View"
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Location *</Label>
                <Input
                  value={propertyForm.location}
                  onChange={(e) => setPropertyForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Kigali, Nyarutarama"
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <textarea
                  value={propertyForm.description}
                  onChange={(e) => setPropertyForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe your room..."
                  rows={4}
                  className="w-full mt-1.5 px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Price per Night</Label>
                  <Input
                    type="number"
                    value={propertyForm.price_per_night}
                    onChange={(e) => setPropertyForm((f) => ({ ...f, price_per_night: Number(e.target.value) }))}
                    min="0"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Price per Person</Label>
                  <Input
                    type="number"
                    value={propertyForm.price_per_person || ''}
                    onChange={(e) => setPropertyForm((f) => ({ ...f, price_per_person: e.target.value ? Number(e.target.value) : null }))}
                    min="0"
                    placeholder="Optional"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Currency</Label>
                  <Select
                    value={propertyForm.currency}
                    onValueChange={(v) => setPropertyForm((f) => ({ ...f, currency: v }))}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Beds</Label>
                  <Input
                    type="number"
                    value={propertyForm.beds}
                    onChange={(e) => setPropertyForm((f) => ({ ...f, beds: Number(e.target.value) }))}
                    min="1"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Max Guests</Label>
                  <Input
                    type="number"
                    value={propertyForm.max_guests}
                    onChange={(e) => setPropertyForm((f) => ({ ...f, max_guests: Number(e.target.value) }))}
                    min="1"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Bathrooms</Label>
                  <Input
                    type="number"
                    value={propertyForm.bathrooms}
                    onChange={(e) => setPropertyForm((f) => ({ ...f, bathrooms: Number(e.target.value) }))}
                    min="0"
                    step="0.5"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRoomWizard(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create Room
                </Button>
              </div>
            </form>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Property Creation Wizard
  if (showPropertyWizard) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => {
                if (wizardStep > 1) {
                  setWizardStep(wizardStep - 1);
                } else {
                  setShowPropertyWizard(false);
                  resetPropertyForm();
                }
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
              {wizardStep > 1 ? "Back" : "Cancel"}
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">List Your Property</h1>
              <p className="text-sm text-muted-foreground">Step {wizardStep} of {totalSteps}: {stepTitles[wizardStep - 1]}</p>
            </div>
            <div className="w-20" /> {/* Spacer */}
          </div>

          {/* Progress Bar */}
          <Progress value={(wizardStep / totalSteps) * 100} className="mb-8 h-2" />

          {/* Step Content */}
          <Card className="p-6 md:p-8">
            {/* Step 1: Basic Info */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Building2 className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Let's start with the basics</h2>
                  <p className="text-muted-foreground mt-2">Tell us about your property</p>
                </div>

                <div className="space-y-4">
          <div>
                    <Label className="text-base font-medium">Property Title *</Label>
                    <Input
                      value={propertyForm.title}
                      onChange={(e) => setPropertyForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Cozy Apartment with City View"
                      className="mt-2 text-lg py-6"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium">Location *</Label>
                    <Input
                      value={propertyForm.location}
                      onChange={(e) => setPropertyForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g., Kigali, Nyarutarama"
                      className="mt-2 text-lg py-6"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium">Address</Label>
                    <Input
                      value={propertyForm.address}
                      onChange={(e) => setPropertyForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Street, building, or nearby landmark (optional)"
                      className="mt-2 text-lg py-6"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Tip: keep it general. Exact address can be shared after booking.
            </p>
          </div>

                <div>
                    <Label className="text-base font-medium">Property Type</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {propertyTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPropertyForm((f) => ({ ...f, property_type: type }))}
                          className={`p-4 rounded-xl border-2 text-center transition-all ${
                            propertyForm.property_type === type
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <DollarSign className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Set your pricing & capacity</h2>
                  <p className="text-muted-foreground mt-2">How much will you charge per night?</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-base font-medium">Price per Night *</Label>
                  <Input
                        type="number"
                        min={1}
                        value={propertyForm.price_per_night}
                        onChange={(e) => setPropertyForm((f) => ({ ...f, price_per_night: Number(e.target.value) }))}
                        className="mt-2 text-lg py-6"
                  />
                </div>
                <div>
                      <Label className="text-base font-medium">Price per Person</Label>
                  <Input
                        type="number"
                        min={0}
                        value={propertyForm.price_per_person || ''}
                        onChange={(e) => setPropertyForm((f) => ({ ...f, price_per_person: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="Optional"
                        className="mt-2 text-lg py-6"
                  />
                </div>
                <div>
                      <Label className="text-base font-medium">Currency</Label>
                      <Select value={propertyForm.currency} onValueChange={(v) => setPropertyForm((f) => ({ ...f, currency: v }))}>
                        <SelectTrigger className="mt-2 h-14 text-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2"><Users className="w-4 h-4" />Max Guests</Label>
                  <Input
                        type="number"
                        min={1}
                        value={propertyForm.max_guests}
                        onChange={(e) => setPropertyForm((f) => ({ ...f, max_guests: Number(e.target.value) }))}
                        className="mt-2"
                  />
                </div>
                <div>
                      <Label className="text-base font-medium flex items-center gap-2"><Bed className="w-4 h-4" />Bedrooms</Label>
                      <Input
                        type="number"
                        min={0}
                        value={propertyForm.bedrooms}
                        onChange={(e) => setPropertyForm((f) => ({ ...f, bedrooms: Number(e.target.value) }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2"><Bed className="w-4 h-4" />Beds</Label>
                      <Input
                        type="number"
                        min={0}
                        value={propertyForm.beds}
                        onChange={(e) => setPropertyForm((f) => ({ ...f, beds: Number(e.target.value) }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2"><Bath className="w-4 h-4" />Bathrooms</Label>
                      <Input
                        type="number"
                        min={0}
                        value={propertyForm.bathrooms}
                        onChange={(e) => setPropertyForm((f) => ({ ...f, bathrooms: Number(e.target.value) }))}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Description</Label>
                  <Textarea
                      value={propertyForm.description}
                      onChange={(e) => setPropertyForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Describe your property. What makes it special?"
                      className="mt-2 min-h-32"
                  />
                </div>

                <div>
                    <Label className="text-base font-medium">Cancellation Policy</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      {cancellationPolicies.map((policy) => (
                        <Tooltip key={policy.value}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setPropertyForm((f) => ({ ...f, cancellation_policy: policy.value }))}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${
                                propertyForm.cancellation_policy === policy.value
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                              aria-label={`Select ${policy.label.split(" - ")[0]} cancellation policy`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">{policy.label.split(" - ")[0]}</div>
                                  <div className="text-sm text-muted-foreground">{policy.label.split(" - ")[1]}</div>
                                </div>
                                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm p-3">
                            <div className="font-semibold mb-2">
                              {cancellationPolicyDetails[policy.value]?.title ?? policy.label.split(" - ")[0]}
                            </div>
                            <ul className="text-xs leading-relaxed space-y-1 text-muted-foreground">
                              {(cancellationPolicyDetails[policy.value]?.lines ?? []).map((line) => (
                                <li key={line}>• {line}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* Discounts */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <Percent className="w-5 h-5 text-primary" />
                      <Label className="text-base font-medium">Long Stay Discounts</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Attract guests who book longer stays with automatic discounts</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 rounded-xl border border-border bg-muted/20">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          Weekly Discount (7+ days)
                        </Label>
                        <div className="flex items-center gap-3 mt-2">
                    <Input
                            type="number"
                            min={0}
                            max={100}
                            value={propertyForm.weekly_discount}
                            onChange={(e) => setPropertyForm((f) => ({ ...f, weekly_discount: Number(e.target.value) }))}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        {propertyForm.weekly_discount > 0 && (
                          <p className="text-xs text-green-600 mt-2">
                            Weekly price: {formatMoney(propertyForm.price_per_night * 7 * (1 - propertyForm.weekly_discount / 100), propertyForm.currency)}
                            {" "}(saves {formatMoney(propertyForm.price_per_night * 7 * propertyForm.weekly_discount / 100, propertyForm.currency)})
                          </p>
                        )}
                      </div>
                      
                      <div className="p-4 rounded-xl border border-border bg-muted/20">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          Monthly Discount (28+ days)
                        </Label>
                        <div className="flex items-center gap-3 mt-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={propertyForm.monthly_discount}
                            onChange={(e) => setPropertyForm((f) => ({ ...f, monthly_discount: Number(e.target.value) }))}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        {propertyForm.monthly_discount > 0 && (
                          <p className="text-xs text-green-600 mt-2">
                            Monthly price: {formatMoney(propertyForm.price_per_night * 28 * (1 - propertyForm.monthly_discount / 100), propertyForm.currency)}
                            {" "}(saves {formatMoney(propertyForm.price_per_night * 28 * propertyForm.monthly_discount / 100, propertyForm.currency)})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accommodation Rules */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-primary" />
                      <Label className="text-base font-medium">House Rules</Label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <Label className="text-sm font-medium">Check-in Time</Label>
                        <Input
                          type="time"
                          value={propertyForm.check_in_time}
                          onChange={(e) => setPropertyForm((f) => ({ ...f, check_in_time: e.target.value }))}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Check-out Time</Label>
                        <Input
                          type="time"
                          value={propertyForm.check_out_time}
                          onChange={(e) => setPropertyForm((f) => ({ ...f, check_out_time: e.target.value }))}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          <Cigarette className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">Smoking</span>
                        </div>
                        <Switch
                          checked={propertyForm.smoking_allowed}
                          onCheckedChange={(v) => setPropertyForm((f) => ({ ...f, smoking_allowed: v }))}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          <Music className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">Events</span>
                        </div>
                        <Switch
                          checked={propertyForm.events_allowed}
                          onCheckedChange={(v) => setPropertyForm((f) => ({ ...f, events_allowed: v }))}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          <PawPrint className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">Pets</span>
                        </div>
                        <Switch
                          checked={propertyForm.pets_allowed}
                          onCheckedChange={(v) => setPropertyForm((f) => ({ ...f, pets_allowed: v }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Photos */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <ImageIcon className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Add photos of your property</h2>
                  <p className="text-muted-foreground mt-2">Great photos help guests choose your place</p>
                </div>

                {/* Upload Area */}
                <div
                  onClick={() => setUploadDialogOpen(true)}
                  className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground">Click to upload photos</p>
                  <p className="text-sm text-muted-foreground mt-2">or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-4">PNG, JPG, or Video up to 10MB each</p>
                </div>

                {/* Uploaded Images Grid */}
                {propertyForm.images.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">{propertyForm.images.length} photo(s) uploaded</Label>
                      <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Add More
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {propertyForm.images.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                          {isVideoUrl(url) ? (
                            <video src={url} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setPropertyForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                              className="p-2 bg-white rounded-full text-destructive hover:bg-destructive hover:text-white transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {idx === 0 && (
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              Cover
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <CloudinaryUploadDialog
                  title="Upload Property Photos"
                  folder="merry360/properties"
                  accept="image/*,video/*"
                  multiple
                  maxFiles={20}
                  autoStart={true}
                  value={propertyForm.images}
                  onChange={(urls) => {
                    setPropertyForm((f) => ({ ...f, images: urls }));
                  }}
                  open={uploadDialogOpen}
                  onOpenChange={setUploadDialogOpen}
                />
              </div>
            )}

            {/* Step 4: Amenities */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Wifi className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">What amenities do you offer?</h2>
                  <p className="text-muted-foreground mt-2">Select all that apply</p>
                </div>

                <div className="space-y-8">
                  {AMENITIES_BY_CATEGORY.map((category) => (
                    <div key={category.name} className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide px-2">
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {category.items.map((amenity) => {
                          const Icon = amenity.icon;
                          const isSelected = propertyForm.amenities.includes(amenity.value);
                          return (
                            <button
                              key={amenity.value}
                              type="button"
                              onClick={() => {
                                setPropertyForm((f) => ({
                                  ...f,
                                  amenities: isSelected
                                    ? f.amenities.filter((a) => a !== amenity.value)
                                    : [...f.amenities, amenity.value],
                                }));
                              }}
                              className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all text-left ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="text-sm font-medium">{amenity.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {wizardStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Review your listing</h2>
                  <p className="text-muted-foreground mt-2">Make sure everything looks good before publishing</p>
                </div>

                <div className="bg-muted/50 rounded-2xl overflow-hidden">
                  {/* Preview Image */}
                  <div className="aspect-video bg-muted relative">
                    {propertyForm.images[0] ? (
                      <img src={propertyForm.images[0]} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur px-3 py-1 rounded-lg text-sm">
                      {propertyForm.images.length} photo(s)
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-6 space-y-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{propertyForm.title || "Untitled"}</h3>
                        <div className="flex items-center gap-1 text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{propertyForm.location || "No location set"}</span>
                        </div>
                        {propertyForm.address.trim() && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {propertyForm.address}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {formatMoney(propertyForm.price_per_night, propertyForm.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">per night</div>
                        {propertyForm.weekly_discount > 0 && (
                          <div className="text-xs text-green-600">{propertyForm.weekly_discount}% weekly discount</div>
                        )}
                        {propertyForm.monthly_discount > 0 && (
                          <div className="text-xs text-green-600">{propertyForm.monthly_discount}% monthly discount</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {propertyForm.max_guests} guests</span>
                      <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {propertyForm.bedrooms} bedrooms</span>
                      <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {propertyForm.beds} beds</span>
                      <span className="flex items-center gap-1"><Bath className="w-4 h-4" /> {propertyForm.bathrooms} bathrooms</span>
                    </div>

                    {/* House Rules */}
                    <div className="pt-3 border-t border-border">
                      <div className="text-sm font-medium mb-2">House Rules</div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>Check-in: {propertyForm.check_in_time || "14:00"}</span>
                        <span>Check-out: {propertyForm.check_out_time || "11:00"}</span>
                        <span>Smoking: {propertyForm.smoking_allowed ? "Yes" : "No"}</span>
                        <span>Events: {propertyForm.events_allowed ? "Yes" : "No"}</span>
                        <span>Pets: {propertyForm.pets_allowed ? "Yes" : "No"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{propertyForm.property_type}</Badge>
                      <Badge variant="outline" className="capitalize">{propertyForm.cancellation_policy} cancellation</Badge>
                      {propertyForm.amenities.slice(0, 5).map((a) => (
                        <Badge key={a} variant="secondary" className="capitalize">{a.replace(/_/g, " ")}</Badge>
                      ))}
                      {propertyForm.amenities.length > 5 && (
                        <Badge variant="secondary">+{propertyForm.amenities.length - 5} more</Badge>
                      )}
                      </div>

                    {propertyForm.description && (
                      <div className="pt-3 border-t border-border">
                        <div className="text-sm font-medium mb-1">Description</div>
                        <p className="text-muted-foreground text-sm">{propertyForm.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Ready to publish!</strong> Your property will be visible on the homepage immediately after creation.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
              disabled={wizardStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>

            {wizardStep < totalSteps ? (
              <Button 
                onClick={() => setWizardStep((s) => s + 1)} 
                disabled={!canProceed()}
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={createProperty} disabled={!canProceed()}>
                <>
                  <CheckCircle className="w-4 h-4 mr-2" /> Create Property
                </>
              </Button>
            )}
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {stepTitles.map((title, idx) => (
              <button
                key={idx}
                onClick={() => {
                  // Allow going back or to completed steps
                  if (idx + 1 <= wizardStep) {
                    setWizardStep(idx + 1);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                  wizardStep === idx + 1
                    ? "bg-primary text-primary-foreground"
                    : idx + 1 < wizardStep
                    ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold border">
                  {idx + 1 < wizardStep ? "✓" : idx + 1}
                </span>
                <span className="hidden sm:inline">{title}</span>
              </button>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Vehicle Creation Wizard
  if (showVehicleWizard) {
    const totalSteps = 4;
    const stepTitles = ["Basics", "Media", "Pricing", "Review"];

    const canProceedVehicle = () => {
      switch (vehicleWizardStep) {
        case 1:
          return vehicleForm.title.trim().length >= 3 && vehicleForm.vehicle_type.trim().length >= 2;
        case 2:
          return true;
        case 3:
          return Number(vehicleForm.price_per_day) > 0 && Number(vehicleForm.seats) >= 1;
        default:
          return true;
      }
    };

    const submitVehicle = async () => {
      if (!user) return;
      setCreatingVehicle(true);
      const media = vehicleForm.media.length > 0 ? vehicleForm.media : null;
      const payload: Partial<Vehicle> = {
        title: vehicleForm.title.trim(),
        provider_name: vehicleForm.provider_name.trim() || null,
        vehicle_type: vehicleForm.vehicle_type.trim(),
        seats: Number(vehicleForm.seats) || 1,
        price_per_day: Number(vehicleForm.price_per_day) || 0,
        currency: vehicleForm.currency,
        driver_included: vehicleForm.driver_included,
        media,
        image_url: media?.[0] ?? null,
        is_published: vehicleForm.is_published,
      };
      const created = await createVehicle(payload);
      setCreatingVehicle(false);
      if (created) {
        setShowVehicleWizard(false);
        setVehicleForm({
          title: "",
          provider_name: "",
          vehicle_type: "Sedan",
          seats: 4,
          driver_included: true,
          price_per_day: 50000,
          currency: "RWF",
          media: [],
          is_published: true,
        });
        setVehicleWizardStep(1);
        setTab("transport");
        setEditingVehicleId((created as any).id);
      }
    };

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <button
              type="button"
              onClick={() => {
                if (vehicleWizardStep > 1) setVehicleWizardStep((s) => s - 1);
                else {
                  setShowVehicleWizard(false);
                  setVehicleWizardStep(1);
                }
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              {vehicleWizardStep > 1 ? "Back" : "Cancel"}
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">Add a Vehicle</h1>
              <p className="text-sm text-muted-foreground">
                Step {vehicleWizardStep} of {totalSteps}: {stepTitles[vehicleWizardStep - 1]}
              </p>
            </div>
            <div className="w-20" />
          </div>

          <Progress value={(vehicleWizardStep / totalSteps) * 100} className="mb-8 h-2" />

          <Card className="p-6 md:p-8">
            {vehicleWizardStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Car className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Vehicle details</h2>
                  <p className="text-muted-foreground mt-2">Tell guests what you offer</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Title *</Label>
                    <Input
                      value={vehicleForm.title}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Toyota Prado with driver"
                      className="mt-2 text-lg py-6"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                      <Label className="text-base font-medium">Vehicle Type *</Label>
                      <Input
                        value={vehicleForm.vehicle_type}
                        onChange={(e) => setVehicleForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                        placeholder="e.g., SUV"
                        className="mt-2 text-lg py-6"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-medium">Seats *</Label>
                    <Input
                      type="number"
                        min={1}
                        value={vehicleForm.seats}
                        onChange={(e) => setVehicleForm((f) => ({ ...f, seats: Number(e.target.value) }))}
                        className="mt-2 text-lg py-6"
                    />
                  </div>
                </div>
                  <div>
                    <Label className="text-base font-medium">Provider / Company</Label>
                    <Input
                      value={vehicleForm.provider_name}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, provider_name: e.target.value }))}
                      placeholder="Optional"
                      className="mt-2 text-lg py-6"
                    />
        </div>
                  <div className="flex items-center justify-between border rounded-xl p-4">
                    <div>
                      <p className="font-medium text-foreground">Driver included</p>
                      <p className="text-sm text-muted-foreground">Toggle off for self-drive</p>
                    </div>
                    <Switch checked={vehicleForm.driver_included} onCheckedChange={(v) => setVehicleForm((f) => ({ ...f, driver_included: v }))} />
                  </div>
                </div>
              </div>
            )}

            {vehicleWizardStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <ImageIcon className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Add vehicle photos or video</h2>
                  <p className="text-muted-foreground mt-2">Show guests what they get</p>
              </div>

                <div
                  onClick={() => setVehicleUploadDialogOpen(true)}
                  className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground">Click to upload media</p>
                  <p className="text-sm text-muted-foreground mt-2">or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-4">PNG, JPG, or Video up to 10MB each</p>
                </div>

                {vehicleForm.media.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {vehicleForm.media.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                        {isVideoUrl(url) ? (
                          <video src={url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setVehicleForm((f) => ({ ...f, media: f.media.filter((_, i) => i !== idx) }))}
                            className="p-2 bg-white rounded-full text-destructive hover:bg-destructive hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Cover
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <CloudinaryUploadDialog
                  title="Upload Vehicle Media"
                  folder="merry360x/vehicles"
                  accept="image/*,video/*"
                  multiple
                  maxFiles={20}
                  autoStart={true}
                  value={vehicleForm.media}
                  onChange={(urls) => setVehicleForm((f) => ({ ...f, media: urls }))}
                  open={vehicleUploadDialogOpen}
                  onOpenChange={setVehicleUploadDialogOpen}
                />
              </div>
            )}

            {vehicleWizardStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <DollarSign className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Set pricing</h2>
                  <p className="text-muted-foreground mt-2">Price per day</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
              <div>
                    <Label className="text-base font-medium">Price per Day *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={vehicleForm.price_per_day}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, price_per_day: Number(e.target.value) }))}
                      className="mt-2 text-lg py-6"
                    />
              </div>
                  <div>
                    <Label className="text-base font-medium">Currency</Label>
                    <Select value={vehicleForm.currency} onValueChange={(v) => setVehicleForm((f) => ({ ...f, currency: v }))}>
                      <SelectTrigger className="mt-2 h-14 text-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
            </div>
          </div>

                <div className="flex items-center justify-between border rounded-xl p-4">
                  <div>
                    <p className="font-medium text-foreground">Publish now</p>
                    <p className="text-sm text-muted-foreground">Turn off to save as draft</p>
              </div>
                  <Switch checked={vehicleForm.is_published} onCheckedChange={(v) => setVehicleForm((f) => ({ ...f, is_published: v }))} />
                </div>
              </div>
            )}

            {vehicleWizardStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Review your vehicle</h2>
                  <p className="text-muted-foreground mt-2">Confirm before saving</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium">{vehicleForm.title || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{vehicleForm.vehicle_type || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-medium">{vehicleForm.seats}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">{formatMoney(vehicleForm.price_per_day, vehicleForm.currency)}/day</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Media</span><span className="font-medium">{vehicleForm.media.length} file(s)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium">{vehicleForm.is_published ? "Live" : "Draft"}</span></div>
                </div>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={() => setVehicleWizardStep((s) => Math.max(1, s - 1))} disabled={vehicleWizardStep === 1}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            {vehicleWizardStep < totalSteps ? (
              <Button onClick={() => setVehicleWizardStep((s) => s + 1)} disabled={!canProceedVehicle()}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={submitVehicle}>
                Create Vehicle
              </Button>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
              <div>
            <h1 className="text-2xl font-bold text-foreground">Host Dashboard</h1>
            <p className="text-muted-foreground">Manage your properties, tours, and bookings</p>
              </div>
            </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties ({(properties || []).length})</TabsTrigger>
            <TabsTrigger value="tours">Tours ({(tours || []).length})</TabsTrigger>
            <TabsTrigger value="transport">Transport ({(vehicles || []).length})</TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings ({(bookings || []).length})
              {bookings.filter(b => b.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs h-5 min-w-[20px] rounded-full">
                  {bookings.filter(b => b.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
            <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
          </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Net Earnings</p>
                    <p className="text-xl font-bold">{formatMoney(totalEarnings, "RWF")}</p>
                    <p className="text-xs text-muted-foreground">After platform fees</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-3 gap-2" 
                  onClick={handlePayoutClick}
                  disabled={availableForPayout <= 0}
                >
                  <Banknote className="w-4 h-4" />
                  Request Payout
                </Button>
                {availableForPayout > 0 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Available: {formatMoney(availableForPayout, "RWF")}
                  </p>
                )}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Properties</p>
                    <p className="text-xl font-bold">{publishedProperties} / {(properties || []).length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl font-bold">{pendingBookings}</p>
              </div>
            </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600" />
          </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="text-xl font-bold">{(bookings || []).length}</p>
              </div>
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6 mb-8">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Button onClick={openPropertyWizard}>
                  <Plus className="w-4 h-4 mr-2" /> Add Property
                </Button>
                <Button variant="outline" onClick={() => navigate("/create-tour")}>
                  <Plus className="w-4 h-4 mr-2" /> Create Tour
                </Button>
                <Button variant="outline" onClick={() => navigate("/create-tour-package")}>
                  <Plus className="w-4 h-4 mr-2" /> Create Tour Package
                </Button>
                <Button variant="outline" onClick={() => navigate("/create-transport")}>
                  <Car className="w-4 h-4 mr-2" /> Add Vehicle
                </Button>
              </div>
            </Card>

            {/* Recent Bookings */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Recent Bookings</h3>
              {(bookings || []).length === 0 ? (
                <p className="text-muted-foreground">No bookings yet</p>
              ) : (
                <div className="space-y-2">
                  {(bookings || []).slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                        <p className="font-medium">{b.check_in} → {b.check_out}</p>
                        <p className="text-sm text-muted-foreground">
                          {b.guests} guests · {formatMoney(b.total_price, b.currency)}
                          {b.is_guest_booking && b.guest_name && (
                            <span className="ml-2 text-xs">• Guest: {b.guest_name}</span>
                          )}
                </p>
              </div>
                      <Badge className={b.status === "confirmed" ? "bg-green-500" : b.status === "pending" ? "bg-yellow-500" : "bg-gray-500"}>
                        {b.status}
                      </Badge>
            </div>
                  ))}
          </div>
              )}
            </Card>
          </TabsContent>

          {/* Properties */}
          <TabsContent value="properties">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" onClick={() => setShowRoomWizard(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Room
              </Button>
              <Button onClick={openPropertyWizard}>
                <Plus className="w-4 h-4 mr-2" /> Add Property
              </Button>
          </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(properties || []).map((p) => <PropertyCard key={p.id} property={p} />)}
              {(properties || []).length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No properties yet</p>
                  <Button onClick={openPropertyWizard}>
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Property
                  </Button>
            </div>
              )}
            </div>
          </TabsContent>

          {/* Tours */}
          <TabsContent value="tours">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="text-sm text-muted-foreground">
                Create <span className="font-medium text-foreground">Tours</span> or <span className="font-medium text-foreground">Tour Packages</span> to offer experiences.
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => navigate("/create-tour")}>
                  <Plus className="w-4 h-4 mr-2" /> Create Tour
                </Button>
                <Button onClick={() => navigate("/create-tour-package")}>
                  <Plus className="w-4 h-4 mr-2" /> Create Tour Package
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tours || []).map((t) => <TourCard key={t.id} tour={t} />)}
              {(tours || []).length === 0 && (
                <div className="col-span-full text-center py-12">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No tours yet</p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => navigate("/create-tour")}>
                      <Plus className="w-4 h-4 mr-2" /> Create Tour
                    </Button>
                    <Button onClick={() => navigate("/create-tour-package")}>
                      <Plus className="w-4 h-4 mr-2" /> Create Tour Package
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Transport */}
          <TabsContent value="transport">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="text-sm text-muted-foreground">
                Create <span className="font-medium text-foreground">Routes</span> like “Airport → Gisenyi” or rent out vehicles.
          </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={() => navigate("/create-transport")}>
                  <Plus className="w-4 h-4 mr-2" /> Car Rental
                </Button>
                <Button variant="outline" onClick={() => navigate("/create-airport-transfer")}>
                  <Plus className="w-4 h-4 mr-2" /> Airport Transfer
                </Button>
            </div>
            </div>

            {/* Routes */}
            <div className="mb-8">
              <div className="text-sm font-semibold text-foreground mb-3">Routes</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(routes || []).map((r) => (
                  <Card key={r.id} className="overflow-hidden">
                    <div className="p-4">
                      {editingRouteId === r.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>From *</Label>
                            <Input
                              value={r.from_location}
                              onChange={(e) => setRoutes((prev) => prev.map((x) => (x.id === r.id ? { ...x, from_location: e.target.value } : x)))}
                              className="mt-1"
                              placeholder="Airport"
                            />
                          </div>
                          <div>
                            <Label>To *</Label>
                            <Input
                              value={r.to_location}
                              onChange={(e) => setRoutes((prev) => prev.map((x) => (x.id === r.id ? { ...x, to_location: e.target.value } : x)))}
                              className="mt-1"
                              placeholder="Gisenyi"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Price (per trip)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={Number(r.base_price ?? 0)}
                                onChange={(e) => setRoutes((prev) => prev.map((x) => (x.id === r.id ? { ...x, base_price: Number(e.target.value) } : x)))}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Currency</Label>
                              <Select
                                value={String(r.currency ?? "RWF")}
                                onValueChange={(v) => setRoutes((prev) => prev.map((x) => (x.id === r.id ? { ...x, currency: v } : x)))}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencies.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>
                                      {c.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingRouteId(null);
                                fetchData();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                const ok = await updateRoute(r.id, {
                                  from_location: r.from_location,
                                  to_location: r.to_location,
                                  base_price: Number(r.base_price ?? 0),
                                  currency: r.currency ?? "RWF",
                                });
                                if (ok) setEditingRouteId(null);
                              }}
                            >
                              <Save className="w-4 h-4" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-foreground">{r.from_location} → {r.to_location}</div>
                          <div className="text-xs text-muted-foreground mt-1">Price per trip</div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-primary font-bold">
                              {formatMoney(Number(r.base_price ?? 0), r.currency || "RWF")}
                            </span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditingRouteId(r.id)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRoute(r.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
                {(routes || []).length === 0 && (
                  <p className="text-muted-foreground col-span-full text-center py-6">No routes yet</p>
                )}
            </div>
            </div>

            {/* Vehicles */}
            <div className="text-sm font-semibold text-foreground mb-3">Vehicles</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(vehicles || []).map((v) => (
                <Card key={v.id} className="overflow-hidden">
                  <div className="h-44 bg-muted flex items-center justify-center">
                    {(v.media?.[0] || v.image_url) ? (
                      <img src={v.media?.[0] || v.image_url || ""} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      <Car className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{v.title}</h3>
                    <p className="text-sm text-muted-foreground">{v.vehicle_type} · {v.seats} seats</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-primary font-bold">{formatMoney(v.price_per_day, v.currency || "RWF")}/day</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingVehicleId(v.id)}><Edit className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteVehicle(v.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {(vehicles || []).length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">No vehicles yet</p>
              )}
            </div>
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings">
            <div className="space-y-3">
              {(bookings || []).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No bookings yet</p>
              ) : (
                (bookings || []).map((b) => {
                  // Get the name of the booked item based on type
                  let itemName = 'Unknown';
                  let itemType = b.booking_type || 'property';
                  
                  if (b.booking_type === 'property' && (b as any).properties) {
                    itemName = (b as any).properties.title;
                  } else if (b.booking_type === 'tour' && (b as any).tour_packages) {
                    itemName = (b as any).tour_packages.title;
                  } else if (b.booking_type === 'transport') {
                    const vehicle = vehicles.find(v => v.id === b.transport_id);
                    itemName = vehicle?.title || 'Transport';
                  }
                  
                  // Count other items in the same order
                  const orderItemCount = b.order_id 
                    ? bookings.filter(bk => bk.order_id === b.order_id).length 
                    : 1;
                  const isBulkOrder = orderItemCount > 1;
                  
                  // Calculate net earnings after platform fee
                  const serviceType = itemType === 'property' ? 'accommodation' : itemType === 'tour' ? 'tour' : 'transport';
                  const { hostNetEarnings, hostFee } = calculateHostEarningsFromGuestTotal(Number(b.total_price), serviceType as 'accommodation' | 'tour' | 'transport');
                  const feePercent = serviceType === 'accommodation' ? PLATFORM_FEES.accommodation.hostFeePercent : serviceType === 'tour' ? PLATFORM_FEES.tour.providerFeePercent : 0;
                  
                  return (
                  <Card key={b.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {itemType === 'property' && '🏠'} 
                            {itemType === 'tour' && '🗺️'}
                            {itemType === 'transport' && '🚗'}
                            {' '}{itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                          </Badge>
                          <span className="font-medium text-sm">{itemName}</span>
                          {isBulkOrder && (
                            <Badge variant="secondary" className="text-xs">
                              Part of {orderItemCount}-item order
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{b.check_in} → {b.check_out}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{b.guests} guests</span>
                          <span className="font-medium text-foreground">{formatMoney(hostNetEarnings, b.currency)}</span>
                          {feePercent > 0 && (
                            <span className="text-xs text-muted-foreground">(after {feePercent}% fee)</span>
                          )}
                        </div>
                        {b.is_guest_booking && (
                          <div className="mt-2 p-2 bg-muted/50 rounded-lg text-sm">
                            <p className="font-medium text-foreground">{b.guest_name}</p>
                            <p className="text-muted-foreground">{b.guest_email}</p>
                            {b.guest_phone && <p className="text-muted-foreground">{b.guest_phone}</p>}
                            <Badge variant="outline" className="mt-1 text-xs">Guest booking</Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          b.status === "confirmed" ? "bg-green-500" :
                          b.status === "completed" ? "bg-blue-500" :
                          b.status === "pending" ? "bg-yellow-500" :
                          "bg-gray-500"
                        }>
                          {b.status}
                        </Badge>
                        {b.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => updateBookingStatus(b.id, "confirmed")}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "cancelled")}>
                              <XCircle className="w-3 h-3 mr-1" /> Decline
                            </Button>
                          </div>
                        )}
                        {b.status === "confirmed" && (
                          <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "completed")}>
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Discount Codes */}
          <TabsContent value="discounts">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Discount Codes</h2>
                <p className="text-muted-foreground">Create and manage discount codes for your listings</p>
              </div>
              <Button onClick={() => setShowDiscountForm(!showDiscountForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Code
              </Button>
            </div>

            {showDiscountForm && (
              <Card className="p-6 mb-6">
                <h3 className="font-semibold mb-4">New Discount Code</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code *</Label>
                      <Input
                        value={discountForm.code}
                        onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value})}
                        placeholder="SUMMER2026"
                        className="uppercase"
                      />
                    </div>
                    <div>
                      <Label>Applies To</Label>
                      <Select value={discountForm.applies_to} onValueChange={(v: any) => setDiscountForm({ ...discountForm, applies_to: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Listings</SelectItem>
                          <SelectItem value="properties">Properties Only</SelectItem>
                          <SelectItem value="tours">Tours Only</SelectItem>
                          <SelectItem value="transport">Transport Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={discountForm.description}
                      onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                      placeholder="Summer special offer"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Discount Type</Label>
                      <Select value={discountForm.discount_type} onValueChange={(v: any) => setDiscountForm({ ...discountForm, discount_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Discount Value</Label>
                      <Input
                        type="number"
                        value={discountForm.discount_value}
                        onChange={(e) => setDiscountForm({ ...discountForm, discount_value: Number(e.target.value) })}
                        min="1"
                      />
                    </div>
                    {discountForm.discount_type === 'fixed' && (
                      <div>
                        <Label>Currency</Label>
                        <Select value={discountForm.currency} onValueChange={(v) => setDiscountForm({ ...discountForm, currency: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Minimum Amount (Optional)</Label>
                      <Input
                        type="number"
                        value={discountForm.minimum_amount}
                        onChange={(e) => setDiscountForm({ ...discountForm, minimum_amount: Number(e.target.value) })}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Max Uses (Optional)</Label>
                      <Input
                        type="number"
                        value={discountForm.max_uses || ''}
                        onChange={(e) => setDiscountForm({ ...discountForm, max_uses: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Valid Until (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={discountForm.valid_until || ''}
                      onChange={(e) => setDiscountForm({ ...discountForm, valid_until: e.target.value || null })}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={createDiscount}>Create Discount Code</Button>
                    <Button variant="outline" onClick={() => setShowDiscountForm(false)}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              {discounts.length === 0 ? (
                <Card className="p-8 text-center">
                  <Percent className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No discount codes yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first discount code to attract more bookings</p>
                </Card>
              ) : (
                discounts.map((discount) => (
                  <Card key={discount.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-lg font-bold bg-muted px-3 py-1 rounded">{discount.code}</code>
                          <Badge variant={discount.is_active ? "default" : "secondary"}>
                            {discount.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{discount.applies_to}</Badge>
                        </div>
                        {discount.description && (
                          <p className="text-sm text-muted-foreground mb-2">{discount.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-primary">
                            {discount.discount_type === 'percentage' 
                              ? `${discount.discount_value}% off`
                              : `${discount.currency} ${discount.discount_value} off`
                            }
                          </span>
                          {discount.minimum_amount > 0 && (
                            <span className="text-muted-foreground">Min: {formatMoney(discount.minimum_amount, discount.currency)}</span>
                          )}
                          {discount.max_uses && (
                            <span className="text-muted-foreground">Uses: {discount.current_uses}/{discount.max_uses}</span>
                          )}
                          {discount.valid_until && (
                            <span className="text-muted-foreground">
                              Until: {new Date(discount.valid_until).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleDiscountStatus(discount.id, discount.is_active)}
                        >
                          {discount.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteDiscount(discount.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Financial Reports */}
          <TabsContent value="financial">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Financial Reports</h2>
                <p className="text-muted-foreground">Export detailed revenue and booking reports for your business records</p>
              </div>

              {/* Date Range Picker */}
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <Label className="block mb-3 font-semibold">Report Period</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date" className="text-sm text-muted-foreground mb-1 block">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-sm text-muted-foreground mb-1 block">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Gross Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatMoney(
                      bookings
                        .filter(b => {
                          const bookingDate = new Date(b.created_at);
                          return bookingDate >= new Date(reportStartDate) && bookingDate <= new Date(reportEndDate);
                        })
                        .reduce((sum, b) => sum + Number(b.total_price), 0),
                      bookings[0]?.currency || "USD"
                    )}
                  </p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-muted-foreground">Net Earnings</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatMoney(
                      bookings
                        .filter(b => {
                          const bookingDate = new Date(b.created_at);
                          return bookingDate >= new Date(reportStartDate) && bookingDate <= new Date(reportEndDate);
                        })
                        .reduce((sum, b) => {
                          const itemType = b.property_id ? 'accommodation' : b.tour_id ? 'tour' : 'transport';
                          const { hostNetEarnings } = calculateHostEarningsFromGuestTotal(Number(b.total_price), itemType as 'accommodation' | 'tour' | 'transport');
                          return sum + hostNetEarnings;
                        }, 0),
                      bookings[0]?.currency || "USD"
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">After platform fees</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-muted-foreground">Bookings</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {bookings.filter(b => {
                      const bookingDate = new Date(b.created_at);
                      return bookingDate >= new Date(reportStartDate) && bookingDate <= new Date(reportEndDate);
                    }).length}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-muted-foreground">Completed</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {bookings.filter(b => {
                      const bookingDate = new Date(b.created_at);
                      return b.status === 'completed' && bookingDate >= new Date(reportStartDate) && bookingDate <= new Date(reportEndDate);
                    }).length}
                  </p>
                </Card>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => {
                    const filteredBookings = bookings.filter(b => {
                      const bookingDate = new Date(b.created_at);
                      return bookingDate >= new Date(reportStartDate) && bookingDate <= new Date(reportEndDate);
                    });
                    
                    // CSV Export
                    const csvData = filteredBookings.map(b => ({
                      'Booking ID': b.id.slice(0, 8),
                      'Property': properties.find(p => p.id === b.property_id)?.title || 'N/A',
                      'Guest': b.guest_name || 'Guest',
                      'Check In': b.check_in,
                      'Check Out': b.check_out,
                      'Guests': b.guests,
                      'Total Price': b.total_price,
                      'Currency': b.currency,
                      'Status': b.status,
                      'Payment Status': b.payment_status || 'N/A',
                      'Payment Method': b.payment_method || 'N/A',
                      'Created': new Date(b.created_at).toLocaleDateString(),
                    }));

                    const headers = Object.keys(csvData[0] || {}).join(',');
                    const rows = csvData.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\\n');
                    const csv = `${headers}\\n${rows}`;
                    
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `financial-report-${reportStartDate}-to-${reportEndDate}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                    
                    toast({ title: "CSV exported successfully" });
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => {
                    const filteredBookings = bookings.filter(b => {
                      const bookingDate = new Date(b.created_at);
                      return bookingDate >= new Date(reportStartDate) && bookingDate <= new Date(reportEndDate);
                    });

                    const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
                    const currency = filteredBookings[0]?.currency || 'USD';
                    
                    const pdfContent = `
FINANCIAL REPORT
================
Host Dashboard - Merry360x Platform
Report Period: ${reportStartDate} to ${reportEndDate}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Bookings: ${filteredBookings.length}
Total Revenue: ${formatMoney(totalRevenue, currency)}
Completed Bookings: ${filteredBookings.filter(b => b.status === 'completed').length}
Pending Bookings: ${filteredBookings.filter(b => b.status === 'pending').length}
Cancelled Bookings: ${filteredBookings.filter(b => b.status === 'cancelled').length}

PAYMENT METHODS BREAKDOWN
-------------------------
${[...new Set(filteredBookings.map(b => b.payment_method || 'Not specified'))].map(method => {
  const count = filteredBookings.filter(b => (b.payment_method || 'Not specified') === method).length;
  const amount = filteredBookings
    .filter(b => (b.payment_method || 'Not specified') === method)
    .reduce((sum, b) => sum + Number(b.total_price), 0);
  return `${method}: ${count} bookings, ${formatMoney(amount, currency)}`;
}).join('\\n')}

DETAILED BOOKINGS
-----------------
${filteredBookings.map(b => `
Booking ID: ${b.id.slice(0, 8)}
Property: ${properties.find(p => p.id === b.property_id)?.title || 'N/A'}
Guest: ${b.guest_name || 'Guest'}
Check-in: ${b.check_in}
Check-out: ${b.check_out}
Guests: ${b.guests}
Amount: ${formatMoney(Number(b.total_price), b.currency)}
Status: ${b.status}
Payment: ${b.payment_method || 'N/A'} (${b.payment_status || 'N/A'})
Created: ${new Date(b.created_at).toLocaleString()}
${'='.repeat(50)}`).join('\\n')}

END OF REPORT
                    `;

                    const blob = new Blob([pdfContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `financial-report-${reportStartDate}-to-${reportEndDate}.txt`;
                    link.click();
                    URL.revokeObjectURL(url);
                    
                    toast({ title: "Report exported successfully" });
                  }}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF/Text Report
                </Button>
              </div>

              {/* Payout History */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Payout History
                </h3>
                {payoutHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 border rounded-lg">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No payout requests yet</p>
                    <p className="text-sm">Request your first payout from the earnings card above</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payoutHistory.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell className="text-sm">
                              {new Date(payout.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {payout.currency} {payout.amount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {payout.payout_method?.replace("_", " ")}
                              </Badge>
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
                                {payout.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {payout.admin_notes || (payout.status === "pending" ? "Awaiting review" : "-")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Info Notice */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">About Financial Reports</p>
                    <p className="text-blue-800 dark:text-blue-200">
                      Reports include all bookings within the selected date range. CSV format is ideal for spreadsheet analysis, 
                      while text reports provide a comprehensive overview for record-keeping. All amounts are shown in their original currency.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Combined Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Request Payout
            </DialogTitle>
            <DialogDescription>
              Enter your payout details and the amount you'd like to withdraw.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Available balance */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Available for payout</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(availableForPayout, 'RWF')}</p>
            </div>

            {/* Payout Method Selection */}
            <div className="space-y-3">
              <Label>Payout Method</Label>
              <Select 
                value={payoutForm.method} 
                onValueChange={(v) => setPayoutForm(f => ({ ...f, method: v as 'mobile_money' | 'bank_transfer' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">📱 Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                </SelectContent>
              </Select>

              {payoutForm.method === 'mobile_money' ? (
                <Input 
                  placeholder="Phone number (078...)" 
                  value={payoutForm.phone}
                  onChange={(e) => setPayoutForm(f => ({ ...f, phone: e.target.value }))}
                />
              ) : (
                <>
                  <Input 
                    placeholder="Bank name"
                    value={payoutForm.bank_name}
                    onChange={(e) => setPayoutForm(f => ({ ...f, bank_name: e.target.value }))}
                  />
                  <Input 
                    placeholder="Account number"
                    value={payoutForm.bank_account}
                    onChange={(e) => setPayoutForm(f => ({ ...f, bank_account: e.target.value }))}
                  />
                </>
              )}

              <Input 
                placeholder="Account holder name"
                value={payoutForm.account_name}
                onChange={(e) => setPayoutForm(f => ({ ...f, account_name: e.target.value }))}
              />
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <Label>Payout Amount (RWF)</Label>
              <Input 
                type="number"
                placeholder="Enter amount"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                min={5000}
                max={availableForPayout}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: 5,000 RWF</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-xs"
                  onClick={() => setPayoutAmount(availableForPayout.toString())}
                >
                  Request all
                </Button>
              </div>
            </div>

            {/* Pending payouts notice */}
            {pendingPayoutAmount > 0 && (
              <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-yellow-800 dark:text-yellow-200">
                  You have {formatMoney(pendingPayoutAmount, 'RWF')} in pending payouts being processed.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={requestPayout} 
              disabled={
                requestingPayout || 
                !payoutAmount || 
                parseFloat(payoutAmount) < 5000 || 
                parseFloat(payoutAmount) > availableForPayout ||
                (payoutForm.method === 'mobile_money' && !payoutForm.phone) ||
                (payoutForm.method === 'bank_transfer' && (!payoutForm.bank_name || !payoutForm.bank_account))
              }
            >
              {requestingPayout ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
