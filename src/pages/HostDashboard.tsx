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
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { uploadFile } from "@/lib/uploads";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Compass,
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
  Camera,
  BadgeCheck,
  CreditCard,
  Smartphone,
  Building,
  Pencil,
  Star,
  Send,
  Mail,
  User,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
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
  price_per_group?: number | null;
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
  pricing_tiers?: Array<{ group_size: number; price_per_person: number; room_type?: "double_twin" | "single" }> | null;
  group_discount_6_10?: number | null;
  group_discount_11_15?: number | null;
  group_discount_16_plus?: number | null;
  itinerary_pdf_url?: string | null;
  status?: string | null;
  host_id?: string | null;
  cover_image?: string | null;
  gallery_images?: string[] | null;
  // National/International pricing
  national_discount_percent?: number | null;
  international_price_per_person?: number | null;
  // Booking confirmation requirement
  requires_confirmation?: boolean | null;
  confirmation_required_reason?: string | null;
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
  // Booking confirmation fields
  confirmation_status?: 'pending' | 'approved' | 'rejected' | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  // Review fields
  review_token?: string | null;
  review_email_sent?: boolean;
}

interface PropertyCalendarIntegration {
  id: string;
  property_id: string;
  provider: "ical";
  label: string | null;
  feed_url: string;
  feed_token: string;
  export_url: string;
  is_active: boolean;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  created_at: string;
}

import { CURRENCY_OPTIONS } from "@/lib/currencies";

const propertyTypes = ["Hotel", "Apartment", "Room in Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "Motel", "House", "Cabin"];
const currencies = CURRENCY_OPTIONS;
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

const monthlyCancellationPolicyDetails: Record<"strict" | "fair", { title: string; lines: string[] }> = {
  strict: {
    title: "Strict monthly (30+ days)",
    lines: [
      "15–30 days before check-in: 75% refund (minus applicable service or processing fees)",
      "7–15 days before check-in: 50% refund (minus applicable service or processing fees)",
      "0–7 days before check-in: 25% refund (minus applicable service or processing fees)",
      "No-shows: Non-refundable",
    ],
  },
  fair: {
    title: "Fair monthly (30+ days)",
    lines: [
      "7–15 days before check-in: 75% refund (minus applicable service or processing fees)",
      "3–7 days before check-in: 50% refund (minus applicable service or processing fees)",
      "0–3 days before check-in: 25% refund (minus applicable service or processing fees)",
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
  const { usdRates } = useFxRates();

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
  
  // Payout Methods (max 2)
  type PayoutMethod = {
    id: string;
    method_type: 'mobile_money' | 'bank_transfer';
    is_primary: boolean;
    phone_number: string | null;
    mobile_provider: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    bank_swift_code: string | null;
    nickname: string | null;
    created_at: string;
    updated_at: string;
  };

  // Helper function to check if payout method can be edited (must be at least 30 days old)
  const canEditPayoutMethod = (method: PayoutMethod): { canEdit: boolean; daysRemaining: number } => {
    const createdAt = new Date(method.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 30 - daysSinceCreation);
    return { canEdit: daysSinceCreation >= 30, daysRemaining };
  };
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [showAddPayoutMethod, setShowAddPayoutMethod] = useState(false);
  const [editingPayoutMethod, setEditingPayoutMethod] = useState<PayoutMethod | null>(null);
  const [payoutMethodForm, setPayoutMethodForm] = useState({
    method_type: 'mobile_money' as 'mobile_money' | 'bank_transfer',
    is_primary: false,
    phone_number: '',
    mobile_provider: 'MTN',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    bank_swift_code: '',
    nickname: '',
  });
  const [savingPayoutMethod, setSavingPayoutMethod] = useState(false);
  
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
  const [propertyCalendarSummaries, setPropertyCalendarSummaries] = useState<Record<string, {
    connected: boolean;
    lastSyncStatus: string | null;
    lastSyncedAt: string | null;
  }>>({});
  const [selectedCalendarPropertyId, setSelectedCalendarPropertyId] = useState<string>("");
  const [calendarIntegrationLabel, setCalendarIntegrationLabel] = useState("Front desk calendar");
  const [calendarIntegrationUrl, setCalendarIntegrationUrl] = useState("");
  const [calendarIntegrations, setCalendarIntegrations] = useState<PropertyCalendarIntegration[]>([]);
  const [calendarIntegrationsLoading, setCalendarIntegrationsLoading] = useState(false);
  const [calendarIntegrationsSaving, setCalendarIntegrationsSaving] = useState(false);
  const [hostServiceTypes, setHostServiceTypes] = useState<string[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [bookingFullDetails, setBookingFullDetails] = useState<any>(null);
  
  // Profile completion tracking
  const [hostProfile, setHostProfile] = useState<{
    profile_complete: boolean;
    service_types: string[];
    national_id_photo_url: string | null;
    selfie_photo_url?: string | null;
    tour_license_url?: string | null;
    rdb_certificate_url?: string | null;
  } | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({
    service_types: [] as string[],
    national_id_photo_url: '',
    selfie_photo_url: '',
    tour_license_url: '',
    rdb_certificate_url: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

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
    price_per_group: null as number | null,
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
    // Monthly rental options
    available_for_monthly_rental: false,
    price_per_month: null as number | null,
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
    is_published: true, // Default form state, actual value set on submit
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
      // Fetch host application to get service_types and profile completion status
      // Fetch all approved applications and prefer the one with profile_complete = true
      const { data: hostAppDataArray, error: hostAppError } = await supabase
        .from("host_applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("profile_complete", { ascending: false }) // true first
        .order("created_at", { ascending: false })
        .limit(1);
      
      const hostAppData = hostAppDataArray?.[0];
      
      if (hostAppError) {
        console.error("[HostDashboard] Error fetching host application:", hostAppError);
      }
      
      if (hostAppData) {
        const appData = hostAppData as any;
        setHostServiceTypes(appData.service_types || []);
        setHostProfile({
          profile_complete: appData.profile_complete ?? false,
          service_types: appData.service_types || [],
          national_id_photo_url: appData.national_id_photo_url || null,
          selfie_photo_url: appData.selfie_photo_url || null,
          tour_license_url: appData.tour_license_url || null,
          rdb_certificate_url: appData.rdb_certificate_url || null,
        });
        // Pre-fill profile form
        setProfileForm({
          service_types: appData.service_types || [],
          national_id_photo_url: appData.national_id_photo_url || '',
          selfie_photo_url: appData.selfie_photo_url || '',
          tour_license_url: appData.tour_license_url || '',
          rdb_certificate_url: appData.rdb_certificate_url || '',
        });
      } else {
        // No approved application found - set defaults with incomplete profile
        setHostServiceTypes(['accommodation', 'tour', 'transport']);
        setHostProfile({
          profile_complete: false,
          service_types: [],
          national_id_photo_url: null,
          selfie_photo_url: null,
          tour_license_url: null,
          rdb_certificate_url: null,
        });
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
        pricing_tiers: pkg.pricing_tiers,
        // National/International pricing
        national_discount_percent: pkg.national_discount_percent || 0,
        international_price_per_person: pkg.international_price_per_adult,
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

  // Track if we've already checked the profile on this page load
  const [profileChecked, setProfileChecked] = useState(false);

  // Auto-show profile completion dialog if profile is incomplete
  // Only show once per page load after data is actually fetched from database
  useEffect(() => {
    // Wait until loading is done AND we have hostProfile data from the fetch
    if (isLoading || !hostProfile || profileChecked) return;
    
    // Mark that we've checked
    setProfileChecked(true);
    
    // If profile is already complete in the database, never show the dialog
    if (hostProfile.profile_complete) {
      return;
    }
    
    // Check if user already dismissed the dialog in this session
    const dismissedKey = `profile_dialog_dismissed_${user?.id}`;
    const dismissed = sessionStorage.getItem(dismissedKey);
    if (dismissed) {
      return;
    }
    
    // Show dialog with slight delay for incomplete profiles
    const timer = setTimeout(() => {
      setShowProfileDialog(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [isLoading, hostProfile, profileChecked, user?.id]);

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

        // Fetch payout methods
        const { data: methods } = await supabase
          .from('host_payout_methods')
          .select('*')
          .eq('host_id', user.id)
          .order('is_primary', { ascending: false });
        
        if (methods) {
          setPayoutMethods(methods);
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
      toast({ variant: 'destructive', title: 'Insufficient balance', description: `Maximum available: ${formatMoney(availableForPayout, 'USD')}` });
      return;
    }

    if (amount < 101) {
      toast({ variant: 'destructive', title: 'Minimum payout', description: 'Minimum payout amount is 101 RWF' });
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

      // Insert payout request (pending approval)
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

      // Send email notification to admin for review
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
      }

      toast({ 
        title: 'Request submitted', 
        description: 'Your payout request has been submitted for review. Once approved, funds will be sent automatically to your account.' 
      });

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
      price_per_group: propertyForm.price_per_group || null,
      currency: propertyForm.currency || "RWF",
      max_guests: propertyForm.max_guests || 2,
      bedrooms: propertyForm.bedrooms || 1,
      bathrooms: propertyForm.bathrooms || 1,
      images: propertyForm.images.length > 0 ? propertyForm.images : null,
      main_image: propertyForm.images.length > 0 ? propertyForm.images[0] : null,
      host_id: user!.id,
      is_published: true, // Published by default
    };

    // Add optional columns only if they have values
    if (propertyForm.beds) payload.beds = propertyForm.beds;
    if (propertyForm.amenities?.length > 0) payload.amenities = propertyForm.amenities;
    if (propertyForm.cancellation_policy) payload.cancellation_policy = propertyForm.cancellation_policy;
    // Discounts / rules (these columns exist in prod; save them so details page reflects host choices)
    payload.weekly_discount = Number(propertyForm.weekly_discount || 0);
    payload.monthly_discount = Number(propertyForm.monthly_discount || 0);
    payload.available_for_monthly_rental = Boolean(propertyForm.available_for_monthly_rental);
    if (propertyForm.price_per_month) {
      payload.price_per_month = Number(propertyForm.price_per_month);
    }
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
      price_per_group: null,
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
      available_for_monthly_rental: false,
      price_per_month: null,
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
      is_published: true, // Published by default
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
    toast({ title: "Vehicle created!", description: "Your vehicle is now live." });
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

  // State to track review email sending
  const [sendingReviewEmail, setSendingReviewEmail] = useState<Set<string>>(new Set());

  // Send review request email to guest
  const sendReviewEmail = async (booking: Booking) => {
    if (!booking.review_token) {
      toast({ variant: "destructive", title: "Error", description: "No review token found for this booking" });
      return;
    }

    if (booking.review_email_sent) {
      toast({ variant: "destructive", title: "Already Sent", description: "Review request has already been sent for this booking" });
      return;
    }

    setSendingReviewEmail(prev => new Set(prev).add(booking.id));

    try {
      // Get guest info
      let guestName = booking.guest_name || 'Guest';
      let guestEmail = booking.guest_email;
      
      // If guest_id exists, fetch from profiles
      if (booking.guest_id && !guestEmail) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", booking.guest_id)
          .single();
        if (profile) {
          guestName = profile.full_name || guestName;
          guestEmail = profile.email;
        }
      }

      if (!guestEmail) {
        toast({ variant: "destructive", title: "Error", description: "No email address found for this guest" });
        return;
      }

      // Get item details
      let propertyTitle = 'Your Accommodation';
      let propertyImage = '';
      let location = '';

      if (booking.booking_type === 'property' && (booking as any).properties) {
        propertyTitle = (booking as any).properties.title;
      } else if (booking.booking_type === 'tour' && (booking as any).tour_packages) {
        propertyTitle = (booking as any).tour_packages.title;
      }

      const response = await fetch('/api/review?action=send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          guestEmail,
          propertyTitle,
          propertyImage,
          location,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          reviewToken: booking.review_token,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        // Update local state and database
        await supabase.from("bookings").update({ review_email_sent: true }).eq("id", booking.id);
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, review_email_sent: true } : b));
        toast({ title: "Review Request Sent", description: `Email sent to ${guestEmail}` });
      } else {
        throw new Error(result.error || 'Failed to send review email');
      }
    } catch (error: any) {
      logError("host.sendReviewEmail", error);
      toast({ variant: "destructive", title: "Failed to Send", description: error.message || "Failed to send review request" });
    } finally {
      setSendingReviewEmail(prev => {
        const next = new Set(prev);
        next.delete(booking.id);
        return next;
      });
    }
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

  // Confirm a pending booking request
  const confirmBookingRequest = async (id: string) => {
    if (!user?.id) return;
    const { error } = await supabase.from("bookings").update({
      status: 'confirmed',
      confirmation_status: 'approved',
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
    }).eq("id", id);
    if (error) {
      logError("host.booking.confirm", error);
      toast({ variant: "destructive", title: "Confirmation failed", description: uiErrorMessage(error) });
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'confirmed', confirmation_status: 'approved' as const } : b)));
    toast({ title: "Booking confirmed", description: "The guest will be notified" });
    // TODO: Send confirmation email to guest
  };

  // Reject a pending booking request
  const rejectBookingRequest = async (id: string, reason: string) => {
    if (!user?.id) return;
    const { error } = await supabase.from("bookings").update({
      status: 'cancelled',
      confirmation_status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
      confirmed_by: user.id,
    }).eq("id", id);
    if (error) {
      logError("host.booking.reject", error);
      toast({ variant: "destructive", title: "Rejection failed", description: uiErrorMessage(error) });
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'cancelled', confirmation_status: 'rejected' as const } : b)));
    toast({ title: "Booking rejected", description: "The guest will be notified and refunded" });
    // TODO: Send rejection email to guest and initiate refund
  };

  // View booking details
  const viewBookingDetails = async (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
    
    try {
      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking.id)
        .single();
      
      if (bookingError) {
        console.error("Error fetching booking:", bookingError);
        toast({ variant: "destructive", title: "Error", description: "Failed to load booking details" });
        return;
      }
      
      // Fetch guest profile
      let guestProfile = null;
      if (bookingData.guest_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", bookingData.guest_id)
          .single();
        guestProfile = profile;
      }
      
      // Fetch checkout details
      let checkoutDetails = null;
      if (bookingData.order_id) {
        const { data: checkout } = await supabase
          .from("checkout_requests")
          .select("payment_method, payment_status, dpo_transaction_id, metadata, total_amount, currency")
          .eq("id", bookingData.order_id)
          .single();
        checkoutDetails = checkout;
      }
      
      // Fetch related entity based on booking type
      let relatedEntity = null;
      if (booking.booking_type === 'property' && booking.property_id) {
        const { data: property } = await supabase
          .from("properties")
          .select("title, location, address, property_type, amenities, images, currency")
          .eq("id", booking.property_id)
          .single();
        relatedEntity = { properties: property };
      } else if (booking.booking_type === 'tour' && booking.tour_id) {
        const { data: tour } = await supabase
          .from("tour_packages")
          .select("title, location, city, duration, categories, included_services, currency")
          .eq("id", booking.tour_id)
          .single();
        relatedEntity = { tour_packages: tour };
      } else if (booking.booking_type === 'transport' && booking.transport_id) {
        const { data: vehicle } = await supabase
          .from("transport_vehicles")
          .select("title, vehicle_type, seats, driver_included, currency")
          .eq("id", booking.transport_id)
          .single();
        relatedEntity = { transport_vehicles: vehicle };
      }
      
      // Combine all data
      const fullDetails = {
        ...bookingData,
        profiles: guestProfile,
        checkout_requests: checkoutDetails,
        ...relatedEntity
      };
      
      setBookingFullDetails(fullDetails);
    } catch (error) {
      console.error("Error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load booking details" });
    }
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

  const fetchPropertyCalendarSummaries = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const response = await fetch('/api/hotel-calendar-sync?action=list-host', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) return;

      setPropertyCalendarSummaries(body.summaries || {});
    } catch {
      // Silent: this should not block dashboard rendering
    }
  }, [user]);

  const getHostAuthHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error("Please sign in again to manage calendar sync");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }, []);

  const fetchSelectedPropertyIntegrations = useCallback(async () => {
    if (!selectedCalendarPropertyId) {
      setCalendarIntegrations([]);
      return;
    }

    setCalendarIntegrationsLoading(true);
    try {
      const headers = await getHostAuthHeaders();
      const response = await fetch(`/api/hotel-calendar-sync?action=list&propertyId=${selectedCalendarPropertyId}`, {
        method: "GET",
        headers,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not load calendar integrations");
      setCalendarIntegrations(body.integrations || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Calendar sync error",
        description: error?.message || "Could not load integrations",
      });
    } finally {
      setCalendarIntegrationsLoading(false);
    }
  }, [selectedCalendarPropertyId, getHostAuthHeaders, toast]);

  const createSelectedPropertyIntegration = useCallback(async () => {
    if (!selectedCalendarPropertyId) {
      toast({ variant: "destructive", title: "Select a property first" });
      return;
    }
    if (!calendarIntegrationUrl.trim()) {
      toast({ variant: "destructive", title: "Feed URL is required" });
      return;
    }

    setCalendarIntegrationsSaving(true);
    try {
      const headers = await getHostAuthHeaders();
      const response = await fetch(`/api/hotel-calendar-sync?action=create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          propertyId: selectedCalendarPropertyId,
          feedUrl: calendarIntegrationUrl.trim(),
          label: calendarIntegrationLabel.trim() || "Hotel calendar",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not create integration");

      setCalendarIntegrationUrl("");
      toast({ title: "Calendar connected", description: "Now syncing to prevent double bookings." });
      await Promise.all([fetchSelectedPropertyIntegrations(), fetchPropertyCalendarSummaries()]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Calendar sync error",
        description: error?.message || "Could not create integration",
      });
    } finally {
      setCalendarIntegrationsSaving(false);
    }
  }, [selectedCalendarPropertyId, calendarIntegrationUrl, calendarIntegrationLabel, getHostAuthHeaders, fetchSelectedPropertyIntegrations, fetchPropertyCalendarSummaries, toast]);

  const syncSelectedPropertyIntegration = useCallback(async (integrationId: string) => {
    try {
      const headers = await getHostAuthHeaders();
      const response = await fetch(`/api/hotel-calendar-sync?action=sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ integrationId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not sync calendar");

      toast({ title: "Calendar synced", description: `Imported ${body.eventsImported ?? 0} blocked date ranges.` });
      await Promise.all([fetchSelectedPropertyIntegrations(), fetchPropertyCalendarSummaries()]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Calendar sync error",
        description: error?.message || "Could not sync calendar",
      });
    }
  }, [getHostAuthHeaders, fetchSelectedPropertyIntegrations, fetchPropertyCalendarSummaries, toast]);

  const deleteSelectedPropertyIntegration = useCallback(async (integrationId: string) => {
    if (!confirm("Remove this calendar integration?")) return;

    try {
      const headers = await getHostAuthHeaders();
      const response = await fetch(`/api/hotel-calendar-sync?action=delete`, {
        method: "POST",
        headers,
        body: JSON.stringify({ integrationId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not remove integration");

      toast({ title: "Integration removed" });
      await Promise.all([fetchSelectedPropertyIntegrations(), fetchPropertyCalendarSummaries()]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Calendar sync error",
        description: error?.message || "Could not remove integration",
      });
    }
  }, [getHostAuthHeaders, fetchSelectedPropertyIntegrations, fetchPropertyCalendarSummaries, toast]);

  const copySelectedPropertyExportUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Feed URL copied" });
    } catch {
      toast({ variant: "destructive", title: "Could not copy feed URL" });
    }
  }, [toast]);

  useEffect(() => {
    if (user && tab === 'properties') {
      fetchPropertyCalendarSummaries();
    }
  }, [user, tab, fetchPropertyCalendarSummaries]);

  useEffect(() => {
    if (!selectedCalendarPropertyId && properties.length > 0) {
      setSelectedCalendarPropertyId(properties[0].id);
    }
  }, [properties, selectedCalendarPropertyId]);

  useEffect(() => {
    if (tab === 'properties') {
      fetchSelectedPropertyIntegrations();
    }
  }, [tab, selectedCalendarPropertyId, fetchSelectedPropertyIntegrations]);

  // Property Card Component
  const PropertyCard = ({ property }: { property: Property }) => {
    const isEditing = editingPropertyId === property.id;
    const [form, setForm] = useState(property);
    const [editUploadOpen, setEditUploadOpen] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [integrationLabel, setIntegrationLabel] = useState("Front desk calendar");
    const [integrationUrl, setIntegrationUrl] = useState("");
    const [integrations, setIntegrations] = useState<PropertyCalendarIntegration[]>([]);
    const [loadingIntegrations, setLoadingIntegrations] = useState(false);
    const [savingIntegration, setSavingIntegration] = useState(false);
    const integrationSummary = propertyCalendarSummaries[property.id] || null;

    const getAuthHeaders = async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again to manage calendar sync");
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };
    };

    const fetchIntegrations = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
      setLoadingIntegrations(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/hotel-calendar-sync?action=list&propertyId=${property.id}`, {
          method: "GET",
          headers,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Could not load calendar integrations");
        const items = (body.integrations || []) as PropertyCalendarIntegration[];
        setIntegrations(items);
      } catch (error: any) {
        if (!silent) {
          toast({
            variant: "destructive",
            title: "Calendar sync error",
            description: error?.message || "Could not load integrations",
          });
        }
      } finally {
        setLoadingIntegrations(false);
      }
    }, [property.id, toast]);

    const createIntegration = async () => {
      if (!integrationUrl.trim()) {
        toast({ variant: "destructive", title: "Feed URL is required" });
        return;
      }

      setSavingIntegration(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/hotel-calendar-sync?action=create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            propertyId: property.id,
            feedUrl: integrationUrl.trim(),
            label: integrationLabel.trim() || "Hotel calendar",
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Could not create integration");

        setIntegrationUrl("");
        toast({ title: "Calendar connected", description: "Now syncing to prevent double bookings." });
        await fetchIntegrations();
        await fetchPropertyCalendarSummaries();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Calendar sync error",
          description: error?.message || "Could not create integration",
        });
      } finally {
        setSavingIntegration(false);
      }
    };

    const syncIntegrationNow = async (integrationId: string) => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/hotel-calendar-sync?action=sync`, {
          method: "POST",
          headers,
          body: JSON.stringify({ integrationId }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Could not sync calendar");

        toast({ title: "Calendar synced", description: `Imported ${body.eventsImported ?? 0} blocked date ranges.` });
        await fetchIntegrations();
        await fetchPropertyCalendarSummaries();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Calendar sync error",
          description: error?.message || "Could not sync calendar",
        });
      }
    };

    const deleteIntegration = async (integrationId: string) => {
      if (!confirm("Remove this calendar integration?")) return;

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/hotel-calendar-sync?action=delete`, {
          method: "POST",
          headers,
          body: JSON.stringify({ integrationId }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Could not remove integration");

        toast({ title: "Integration removed" });
        await fetchIntegrations();
        await fetchPropertyCalendarSummaries();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Calendar sync error",
          description: error?.message || "Could not remove integration",
        });
      }
    };

    const copyExportUrl = async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Feed URL copied" });
      } catch {
        toast({ variant: "destructive", title: "Could not copy feed URL" });
      }
    };

    useEffect(() => {
      if (isEditing) {
        fetchIntegrations();
      }
    }, [isEditing, fetchIntegrations]);

    const handleSave = async () => {
      const success = await updateProperty(property.id, {
        title: form.title,
        description: form.description,
        location: form.location,
        property_type: form.property_type,
        price_per_night: form.price_per_night,
        price_per_group: form.price_per_group,
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                  <Label className="text-xs">Price/Group</Label>
                  <Input 
                    type="number" 
                    value={form.price_per_group || ''} 
                    onChange={(e) => setForm((f) => ({ ...f, price_per_group: e.target.value ? Number(e.target.value) : null }))} 
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
                <Label className="text-xs font-medium mb-2 block">Availability & Pricing</Label>
                <AvailabilityCalendar propertyId={property.id} currency={form.currency || "RWF"} />
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <div>
                  <Label className="text-xs font-medium">Hotel Calendar Sync</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect your hotel/PMS iCal feed to automatically block external reservations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    value={integrationLabel}
                    onChange={(e) => setIntegrationLabel(e.target.value)}
                    placeholder="Label (e.g. Front desk)"
                  />
                  <Input
                    value={integrationUrl}
                    onChange={(e) => setIntegrationUrl(e.target.value)}
                    placeholder="https://your-hotel.com/calendar.ics"
                    className="md:col-span-2"
                  />
                </div>

                <Button size="sm" variant="outline" onClick={createIntegration} disabled={savingIntegration}>
                  {savingIntegration ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <CalendarIcon className="w-3 h-3 mr-2" />}
                  Connect iCal Feed
                </Button>

                {loadingIntegrations ? (
                  <div className="text-xs text-muted-foreground">Loading integrations…</div>
                ) : integrations.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No calendar integration connected yet.</div>
                ) : (
                  <div className="space-y-2">
                    {integrations.map((integration) => (
                      <div key={integration.id} className="p-2 rounded border bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{integration.label || "Hotel calendar"}</p>
                            <p className="text-xs text-muted-foreground truncate">{integration.feed_url}</p>
                          </div>
                          <Badge variant={integration.last_sync_status === "error" ? "destructive" : "outline"}>
                            {integration.last_sync_status || "never synced"}
                          </Badge>
                        </div>

                        {integration.last_sync_error && (
                          <p className="text-xs text-destructive">{integration.last_sync_error}</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => syncIntegrationNow(integration.id)}>
                            Sync now
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copyExportUrl(integration.export_url)}>
                            Copy export feed
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteIntegration(integration.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={form.is_published} 
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} 
                    disabled={!hostProfile?.profile_complete}
                  />
                  <span className="text-sm">{form.is_published ? "Live" : "Draft"}</span>
                  {!hostProfile?.profile_complete && (
                    <span className="text-xs text-amber-600 ml-2">Complete profile to publish</span>
                  )}
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
                  {integrationSummary?.connected && (
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={integrationSummary.lastSyncStatus === "error" ? "destructive" : "outline"} className="text-[10px]">
                        {integrationSummary.lastSyncStatus === "error"
                          ? "Calendar sync error"
                          : integrationSummary.lastSyncStatus === "success"
                            ? "Calendar synced"
                            : "Calendar connected"}
                      </Badge>
                      {integrationSummary.lastSyncedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Last sync {new Date(integrationSummary.lastSyncedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
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
    const [pricingTiers, setPricingTiers] = useState<Array<{ group_size: number; price_per_person: number }>>([]);

    // Sync form state when tour prop changes or when exiting edit mode
    useEffect(() => {
      setForm(tour);
      setNewImages([]);
      setRemovedImages([]);
      
      // Initialize pricingTiers from tour data
      if (tour.pricing_tiers && Array.isArray(tour.pricing_tiers)) {
        setPricingTiers(tour.pricing_tiers.map(t => ({
          group_size: t.group_size || 1,
          price_per_person: t.price_per_person || 0,
        })));
      } else {
        setPricingTiers([]);
      }
      
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
        // National/International pricing for tours table
        updates.national_discount_percent = (form as any).national_discount_percent || 0;
        updates.international_price_per_person = (form as any).international_price_per_person || null;
        // Save pricing tiers for regular tours
        updates.pricing_tiers = pricingTiers.filter(t => t.group_size >= 1 && t.price_per_person > 0);
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
        
        // Booking confirmation requirement
        updates.requires_confirmation = form.requires_confirmation || false;
        updates.confirmation_required_reason = form.confirmation_required_reason || null;
        
        // National/International pricing
        updates.national_discount_percent = (form as any).national_discount_percent || 0;
        updates.international_price_per_adult = (form as any).international_price_per_person || null;
        
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
        
        // Save pricing tiers
        updates.pricing_tiers = pricingTiers.filter(t => t.group_size >= 1 && t.price_per_person > 0);
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
                  
                  {/* Group Pricing for Tours */}
                  <div className="space-y-2 mt-3 pt-3 border-t">
                    <Label className="text-xs font-medium">Group Pricing (Optional)</Label>
                    <p className="text-[10px] text-muted-foreground">Set per-person prices for different group sizes</p>
                    
                    {pricingTiers.map((tier, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                        <div>
                          <Label className="text-[10px]">People</Label>
                          <Input
                            type="number"
                            value={tier.group_size}
                            onChange={(e) => {
                              const next = [...pricingTiers];
                              next[index].group_size = Math.max(1, parseInt(e.target.value) || 1);
                              setPricingTiers(next);
                            }}
                            min="1"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Price/Person</Label>
                          <Input
                            type="number"
                            value={tier.price_per_person}
                            onChange={(e) => {
                              const next = [...pricingTiers];
                              next[index].price_per_person = Math.max(0, parseFloat(e.target.value) || 0);
                              setPricingTiers(next);
                            }}
                            min="0"
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPricingTiers(pricingTiers.filter((_, i) => i !== index))}
                          className="h-8"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPricingTiers([...pricingTiers, { group_size: pricingTiers.length > 0 ? Math.max(...pricingTiers.map(t => t.group_size)) + 1 : 2, price_per_person: 0 }])}
                      className="w-full h-8 text-xs"
                    >
                      + Add Pricing Tier
                    </Button>
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

                  {/* Booking Confirmation Requirement */}
                  {tour.source === "tour_packages" && (
                    <div className="space-y-3 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={form.requires_confirmation || false}
                          onCheckedChange={(v) => setForm({ ...form, requires_confirmation: v })}
                        />
                        <div>
                          <Label className="text-sm font-medium">Require Booking Confirmation</Label>
                          <p className="text-[10px] text-muted-foreground">
                            Bookings will need your approval before being confirmed (e.g., volcano/gorilla treks)
                          </p>
                        </div>
                      </div>
                      {form.requires_confirmation && (
                        <div>
                          <Label className="text-xs">Reason for Confirmation Requirement (optional)</Label>
                          <Input
                            placeholder="e.g., Limited permits available, group size coordination required"
                            value={form.confirmation_required_reason || ""}
                            onChange={(e) => setForm({ ...form, confirmation_required_reason: e.target.value })}
                            className="h-9 mt-1 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Group Pricing Tiers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Group Pricing (Optional)</Label>
                    <p className="text-xs text-muted-foreground">Set per-person prices for different group sizes</p>
                    
                    <div className="space-y-3">
                      {pricingTiers.map((tier, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end p-3 border rounded-lg bg-muted/30">
                          <div>
                            <Label className="text-xs font-normal mb-1.5 block">Group Size (people)</Label>
                            <Input
                              type="number"
                              value={tier.group_size}
                              onChange={(e) => {
                                const next = [...pricingTiers];
                                next[index].group_size = Math.max(1, parseInt(e.target.value) || 1);
                                setPricingTiers(next);
                              }}
                              min="1"
                              className="h-10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-normal mb-1.5 block">Price per Person ({form.currency || 'RWF'})</Label>
                            <Input
                              type="number"
                              value={tier.price_per_person}
                              onChange={(e) => {
                                const next = [...pricingTiers];
                                next[index].price_per_person = Math.max(0, parseFloat(e.target.value) || 0);
                                setPricingTiers(next);
                              }}
                              min="0"
                              className="h-10"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPricingTiers(pricingTiers.filter((_, i) => i !== index))}
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
                        onClick={() => setPricingTiers([...pricingTiers, { group_size: pricingTiers.length > 0 ? Math.max(...pricingTiers.map(t => t.group_size)) + 1 : 2, price_per_person: 0 }])}
                        className="w-full"
                      >
                        + Add Pricing Tier
                      </Button>
                      
                      {pricingTiers.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          Example: 2 people = $3,500/person, 4 people = $2,800/person
                        </p>
                      )}
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
                  <Label className="text-xs">Price per Person (International)</Label>
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

              {/* National/International Discount */}
              <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-xs font-medium text-green-800">🇷🇼 Rwandan Citizen Discount</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-green-700">Discount (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g., 20"
                      value={(form as any).national_discount_percent || ''}
                      onChange={(e) => setForm({ ...form, national_discount_percent: e.target.value ? parseFloat(e.target.value) : null } as any)}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-xs text-green-700 pb-2">
                      {(form as any).national_discount_percent > 0 ? (
                        <>National price: <strong>{formatMoney(form.price_per_person * (1 - ((form as any).national_discount_percent || 0) / 100), form.currency || "RWF")}</strong></>
                      ) : (
                        "Set a discount for local visitors"
                      )}
                    </p>
                  </div>
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

  // Vehicle Card Component with edit functionality
  const VehicleCard = ({ vehicle }: { vehicle: Vehicle }) => {
    const isEditing = editingVehicleId === vehicle.id;
    const [form, setForm] = useState(vehicle);
    const [editUploadOpen, setEditUploadOpen] = useState(false);

    // Reset form when vehicle changes or exiting edit mode
    useEffect(() => {
      setForm(vehicle);
    }, [vehicle, isEditing]);

    const handleSave = async () => {
      const success = await updateVehicle(vehicle.id, {
        title: form.title,
        provider_name: form.provider_name,
        vehicle_type: form.vehicle_type,
        seats: form.seats,
        price_per_day: form.price_per_day,
        currency: form.currency,
        driver_included: form.driver_included,
        media: form.media,
        image_url: form.media?.[0] || null,
        is_published: form.is_published,
      });
      if (success) setEditingVehicleId(null);
    };

    return (
      <Card className="overflow-hidden">
        <div className="h-44 bg-muted flex items-center justify-center relative">
          {(form.media?.[0] || form.image_url) ? (
            <img src={form.media?.[0] || form.image_url || ""} alt={form.title} className="w-full h-full object-cover" />
          ) : (
            <Car className="w-8 h-8 text-muted-foreground" />
          )}
          {!isEditing && (
            <div className="absolute top-2 right-2">
              {form.is_published ? (
                <Badge className="bg-green-500">Live</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
          )}
        </div>
        <div className="p-4 space-y-3">
          {isEditing ? (
            <>
              <Input 
                value={form.title} 
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} 
                placeholder="Vehicle Title" 
              />
              <Input 
                value={form.provider_name || ""} 
                onChange={(e) => setForm((f) => ({ ...f, provider_name: e.target.value }))} 
                placeholder="Company/Business Name *" 
                required
              />
              <p className="text-xs text-muted-foreground">
                Your registered business/company name
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Vehicle Type</Label>
                  <Select value={form.vehicle_type} onValueChange={(v) => setForm((f) => ({ ...f, vehicle_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Seats</Label>
                  <Input 
                    type="number" 
                    value={form.seats} 
                    onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))} 
                    min={1}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Price/Day</Label>
                  <Input 
                    type="number" 
                    value={form.price_per_day} 
                    onChange={(e) => setForm((f) => ({ ...f, price_per_day: Number(e.target.value) }))} 
                    min={0}
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
              <div className="flex items-center gap-2">
                <Switch 
                  checked={form.driver_included || false} 
                  onCheckedChange={(v) => setForm((f) => ({ ...f, driver_included: v }))} 
                />
                <span className="text-sm">Driver included</span>
              </div>
              <div>
                <Label className="text-xs">Images ({(form.media || []).length})</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(form.media || []).map((img, i) => (
                    <div key={i} className="relative w-14 h-14 rounded overflow-hidden group">
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, media: (f.media || []).filter((_, j) => j !== i) }))}
                        className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={form.is_published || false} 
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} 
                    disabled={!hostProfile?.profile_complete}
                  />
                  <span className="text-sm">{form.is_published ? "Live" : "Draft"}</span>
                  {!hostProfile?.profile_complete && (
                    <span className="text-xs text-amber-600 ml-2">Complete profile to publish</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingVehicleId(null)}><X className="w-3 h-3" /></Button>
                  <Button size="sm" onClick={handleSave}><Save className="w-3 h-3" /></Button>
                </div>
              </div>
              <CloudinaryUploadDialog
                title="Upload Vehicle Images"
                folder="merry360/vehicles"
                accept="image/*"
                multiple
                autoStart={true}
                value={form.media || []}
                onChange={(urls) => {
                  setForm((f) => ({ ...f, media: urls }));
                }}
                open={editUploadOpen}
                onOpenChange={setEditUploadOpen}
              />
            </>
          ) : (
            <>
              <h3 className="font-semibold">{vehicle.title}</h3>
              <p className="text-sm text-muted-foreground">{vehicle.vehicle_type} · {vehicle.seats} seats</p>
              {vehicle.driver_included && (
                <Badge variant="outline" className="text-xs">Driver included</Badge>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-primary font-bold">{formatMoney(vehicle.price_per_day, vehicle.currency || "RWF")}/day</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingVehicleId(vehicle.id)}><Edit className="w-3 h-3" /></Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      if (!hostProfile?.profile_complete && !vehicle.is_published) {
                        toast({ variant: "destructive", title: "Complete your profile first", description: "You need to complete your host profile before publishing listings." });
                        return;
                      }
                      updateVehicle(vehicle.id, { is_published: !vehicle.is_published });
                    }}
                  >
                    {vehicle.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteVehicle(vehicle.id)}><Trash2 className="w-3 h-3" /></Button>
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
                    property_type: propertyForm.property_type || "Room in Apartment",
                    host_id: user!.id,
                    is_published: true, // Published by default
                    images: propertyForm.images.length > 0 ? propertyForm.images : null,
                    main_image: propertyForm.images.length > 0 ? propertyForm.images[0] : null,
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
                <Label className="text-sm font-medium">Property Type</Label>
                <Select
                  value={propertyForm.property_type}
                  onValueChange={(v) => setPropertyForm((f) => ({ ...f, property_type: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              {/* Room Photos */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Room Photos</Label>
                <p className="text-sm text-muted-foreground">Add photos of your room to attract guests</p>
                
                {propertyForm.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {propertyForm.images.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
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
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                            Cover
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <CloudinaryUploadDialog
                  title="Upload Room Photos"
                  folder="merry360/rooms"
                  accept="image/*"
                  multiple
                  maxFiles={10}
                  value={propertyForm.images}
                  onChange={(urls) => setPropertyForm((f) => ({ ...f, images: urls }))}
                  buttonLabel={propertyForm.images.length > 0 ? `Add More Photos (${propertyForm.images.length})` : "Upload Photos"}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <Label className="text-sm font-medium">Price per Group</Label>
                  <Input
                    type="number"
                    value={propertyForm.price_per_group || ''}
                    onChange={(e) => setPropertyForm((f) => ({ ...f, price_per_group: e.target.value ? Number(e.target.value) : null }))}
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

              {/* Monthly rental option for rooms */}
              <div className="mt-4 p-4 rounded-xl border border-border bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="room-monthly-rental"
                    checked={propertyForm.available_for_monthly_rental}
                    onChange={(e) => setPropertyForm((f) => ({ ...f, available_for_monthly_rental: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="room-monthly-rental" className="text-sm font-medium cursor-pointer">
                    Available for monthly stays (30+ days)
                  </Label>
                </div>

                {propertyForm.available_for_monthly_rental && (
                  <div className="ml-7 mt-3">
                    <Label className="text-sm">Monthly price (optional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Leave empty to use your nightly rate and any monthly discount
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={propertyForm.price_per_month || ''}
                        onChange={(e) => setPropertyForm((f) => ({
                          ...f,
                          price_per_month: e.target.value ? Number(e.target.value) : null,
                        }))}
                        placeholder="Custom monthly price"
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">{propertyForm.currency}</span>
                    </div>
                  </div>
                )}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      <Label className="text-base font-medium">Price per Group</Label>
                  <Input
                        type="number"
                        min={0}
                        value={propertyForm.price_per_group || ''}
                        onChange={(e) => setPropertyForm((f) => ({ ...f, price_per_group: e.target.value ? Number(e.target.value) : null }))}
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
                    <Label className="text-base font-medium flex items-center gap-2">
                      Cancellation Policy
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center" aria-label="Monthly cancellation policy details">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm p-3">
                          <div className="font-semibold mb-1">Monthly stays (30+ days)</div>
                          <div className="text-xs text-muted-foreground mb-2">
                            For stays of 30+ days, monthly cancellation rules apply.
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs font-medium text-foreground mb-1">{monthlyCancellationPolicyDetails.fair.title}</div>
                              <ul className="text-xs leading-relaxed space-y-1 text-muted-foreground">
                                {monthlyCancellationPolicyDetails.fair.lines.map((line) => (
                                  <li key={line}>• {line}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-foreground mb-1">{monthlyCancellationPolicyDetails.strict.title}</div>
                              <ul className="text-xs leading-relaxed space-y-1 text-muted-foreground">
                                {monthlyCancellationPolicyDetails.strict.lines.map((line) => (
                                  <li key={line}>• {line}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
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
                          Monthly Discount (30+ days)
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
                            Monthly price: {formatMoney(propertyForm.price_per_night * 30 * (1 - propertyForm.monthly_discount / 100), propertyForm.currency)}
                            {" "}(saves {formatMoney(propertyForm.price_per_night * 30 * propertyForm.monthly_discount / 100, propertyForm.currency)})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Monthly Rental Availability */}
                    <div className="p-4 rounded-xl border border-border bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          id="monthly-rental"
                          checked={propertyForm.available_for_monthly_rental}
                          onChange={(e) => setPropertyForm((f) => ({ ...f, available_for_monthly_rental: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <Label htmlFor="monthly-rental" className="text-sm font-medium cursor-pointer">
                          Available for monthly rentals (30+ days)
                        </Label>
                      </div>
                      
                      {propertyForm.available_for_monthly_rental && (
                        <div className="ml-7 mt-3">
                          <Label className="text-sm">Custom monthly price (optional)</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Leave empty to auto-calculate based on nightly rate and discount
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={propertyForm.price_per_month || ''}
                              onChange={(e) => setPropertyForm((f) => ({ 
                                ...f, 
                                price_per_month: e.target.value ? Number(e.target.value) : null 
                              }))}
                              placeholder="Custom monthly price"
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">{propertyForm.currency}</span>
                          </div>
                        </div>
                      )}
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
                      {propertyForm.amenities.map((a) => (
                        <Badge key={a} variant="secondary" className="capitalize">{a.replace(/_/g, " ")}</Badge>
                      ))}
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
                    <Label className="text-base font-medium">Provider / Company Name *</Label>
                    <Input
                      value={vehicleForm.provider_name}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, provider_name: e.target.value }))}
                      placeholder="Your registered business/company name"
                      className="mt-2 text-lg py-6"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your registered business/company name
                    </p>
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Host Dashboard</h1>
              {hostProfile?.profile_complete && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-600 gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Manage your properties, tours, and bookings</p>
          </div>
        </div>

        {/* Profile Completion Warning Banner */}
        {hostProfile && !hostProfile.profile_complete && (
          <Card className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <div className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">Complete Your Profile</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Your host profile is incomplete. Complete your profile so that your listings can go online and be visible to guests.
                </p>
                <Button 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setShowProfileDialog(true)}
                >
                  Complete Profile Now
                </Button>
              </div>
            </div>
          </Card>
        )}

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
            <TabsTrigger value="payout-methods">Payout Methods</TabsTrigger>
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
                    <p className="text-xs text-muted-foreground">≈ {formatMoney(convertAmount(totalEarnings, 'RWF', 'USD', usdRates) ?? 0, 'USD')}</p>
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
                    Available: {formatMoney(availableForPayout, "RWF")} (≈ {formatMoney(convertAmount(availableForPayout, 'RWF', 'USD', usdRates) ?? 0, 'USD')})
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
          </TabsContent>

          {/* Properties */}
          <TabsContent value="properties">
            <Card className="p-4 mb-4 space-y-4 sticky top-20 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div>
                <h3 className="text-lg font-semibold">Calendar & Availability</h3>
                <p className="text-sm text-muted-foreground">Manage blocked dates and sync external hotel calendars.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <Label className="text-xs font-medium mb-1 block">Property</Label>
                  <Select value={selectedCalendarPropertyId} onValueChange={setSelectedCalendarPropertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {(properties || []).map((property) => (
                        <SelectItem key={property.id} value={property.id}>{property.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  {selectedCalendarPropertyId ? (
                    <AvailabilityCalendar
                      propertyId={selectedCalendarPropertyId}
                      currency={properties.find((p) => p.id === selectedCalendarPropertyId)?.currency || "RWF"}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a property to manage availability.</p>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-3">
                <div>
                  <Label className="text-xs font-medium">Hotel Calendar Sync</Label>
                  <p className="text-xs text-muted-foreground mt-1">Connect your hotel/PMS iCal feed to block external reservations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    value={calendarIntegrationLabel}
                    onChange={(e) => setCalendarIntegrationLabel(e.target.value)}
                    placeholder="Label (e.g. Front desk)"
                  />
                  <Input
                    value={calendarIntegrationUrl}
                    onChange={(e) => setCalendarIntegrationUrl(e.target.value)}
                    placeholder="https://your-hotel.com/calendar.ics"
                    className="md:col-span-2"
                  />
                </div>

                <Button size="sm" variant="outline" onClick={createSelectedPropertyIntegration} disabled={calendarIntegrationsSaving || !selectedCalendarPropertyId}>
                  {calendarIntegrationsSaving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <CalendarIcon className="w-3 h-3 mr-2" />}
                  Connect iCal Feed
                </Button>

                {calendarIntegrationsLoading ? (
                  <div className="text-xs text-muted-foreground">Loading integrations…</div>
                ) : calendarIntegrations.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No calendar integration connected for this property.</div>
                ) : (
                  <div className="space-y-2">
                    {calendarIntegrations.map((integration) => (
                      <div key={integration.id} className="p-2 rounded border bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{integration.label || "Hotel calendar"}</p>
                            <p className="text-xs text-muted-foreground truncate">{integration.feed_url}</p>
                          </div>
                          <Badge variant={integration.last_sync_status === "error" ? "destructive" : "outline"}>
                            {integration.last_sync_status || "never synced"}
                          </Badge>
                        </div>

                        {integration.last_sync_error && (
                          <p className="text-xs text-destructive">{integration.last_sync_error}</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => syncSelectedPropertyIntegration(integration.id)}>
                            Sync now
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copySelectedPropertyExportUrl(integration.export_url)}>
                            Copy export feed
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSelectedPropertyIntegration(integration.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

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
                <VehicleCard key={v.id} vehicle={v} />
              ))}
              {(vehicles || []).length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">No vehicles yet</p>
              )}
            </div>
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings">
            {/* Pending Booking Requests Section */}
            {(() => {
              const pendingRequests = (bookings || []).filter(
                b => b.confirmation_status === 'pending' || b.status === 'pending'
              );
              if (pendingRequests.length === 0) return null;
              return (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="destructive" className="animate-pulse">
                      {pendingRequests.length}
                    </Badge>
                    Booking Requests Awaiting Confirmation
                  </h3>
                  <div className="space-y-4">
                    {pendingRequests.map((b) => {
                      let itemName = 'Unknown';
                      let serviceType: 'accommodation' | 'tour' | 'transport' = 'tour';

                      if (b.booking_type === 'property') {
                        itemName = (b as any).properties?.title || 'Property';
                        serviceType = 'accommodation';
                      } else if (b.booking_type === 'tour') {
                        itemName = (b as any).tour_packages?.title || 'Tour';
                        serviceType = 'tour';
                      } else if (b.booking_type === 'transport') {
                        const vehicle = vehicles.find(v => v.id === b.transport_id);
                        itemName = vehicle?.title || 'Transport';
                        serviceType = 'transport';
                      }

                      const { hostNetEarnings } = calculateHostEarningsFromGuestTotal(Number(b.total_price), serviceType);
                      
                      return (
                        <Card key={b.id} className="overflow-hidden border-2 border-amber-300 shadow-md">
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-lg">
                                🗺️
                              </div>
                              <div>
                                <h4 className="font-semibold text-base">{itemName}</h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Hash className="w-3 h-3" />
                                  <span>{b.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-amber-500 hover:bg-amber-600 animate-pulse">
                              Pending Approval
                            </Badge>
                          </div>
                          
                          {/* Content Grid */}
                          <div className="p-4 bg-amber-50/30 dark:bg-amber-900/5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              {/* Date Section */}
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</p>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-primary" />
                                  <span className="font-medium">{b.check_in}</span>
                                </div>
                              </div>
                              
                              {/* Guests Section */}
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Guests</p>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-primary" />
                                  <span className="font-medium">{b.guests} {b.guests === 1 ? 'guest' : 'guests'}</span>
                                </div>
                              </div>
                              
                              {/* Earnings Section */}
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Earnings</p>
                                <div className="flex items-center gap-2">
                                  <Wallet className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-600">{formatMoney(hostNetEarnings, b.currency || 'RWF')}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Guest Info */}
                            <div className="p-3 bg-white dark:bg-gray-800/50 rounded-lg border">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Guest Information</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{b.guest_name}</span>
                                </div>
                                {b.guest_email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm truncate">{b.guest_email}</span>
                                  </div>
                                )}
                                {b.guest_phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{b.guest_phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions Footer */}
                          <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 bg-amber-100/50 dark:bg-amber-900/10 border-t border-amber-200">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => confirmBookingRequest(b.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve Booking
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Booking Request</DialogTitle>
                                  <DialogDescription>
                                    Please provide a reason for rejecting this booking. The guest will be notified and refunded.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3">
                                  <Textarea
                                    id={`reject-reason-${b.id}`}
                                    placeholder="e.g., No permits available for this date, group size too large, etc."
                                    className="min-h-[100px]"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          const reasonEl = document.getElementById(`reject-reason-${b.id}`) as HTMLTextAreaElement;
                                          const reason = reasonEl?.value || 'No reason provided';
                                          rejectBookingRequest(b.id, reason);
                                        }}
                                      >
                                        Confirm Rejection
                                      </Button>
                                    </DialogClose>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            
            <div className="space-y-3">
              {(bookings || []).filter(b => !(b.confirmation_status === 'pending' || b.status === 'pending')).length === 0 && (bookings || []).filter(b => b.confirmation_status === 'pending' || b.status === 'pending').length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No bookings yet</p>
              ) : (bookings || []).filter(b => !(b.confirmation_status === 'pending' || b.status === 'pending')).length === 0 ? null : (
                (bookings || []).filter(b => !(b.confirmation_status === 'pending' || b.status === 'pending')).map((b) => {
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
                  <Card key={b.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          itemType === 'property' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          itemType === 'tour' ? 'bg-green-100 dark:bg-green-900/30' :
                          'bg-orange-100 dark:bg-orange-900/30'
                        }`}>
                          {itemType === 'property' && '🏠'}
                          {itemType === 'tour' && '🗺️'}
                          {itemType === 'transport' && '🚗'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-base">{itemName}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Hash className="w-3 h-3" />
                            <span>{b.id.slice(0, 8).toUpperCase()}</span>
                            {isBulkOrder && (
                              <Badge variant="secondary" className="text-xs ml-1">
                                {orderItemCount} items
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={`text-xs px-3 py-1 ${
                        b.status === "confirmed" ? "bg-green-500 hover:bg-green-600" :
                        b.status === "completed" ? "bg-blue-500 hover:bg-blue-600" :
                        b.status === "pending" ? "bg-yellow-500 hover:bg-yellow-600" :
                        b.status === "cancelled" ? "bg-red-500 hover:bg-red-600" :
                        "bg-gray-500"
                      }`}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </Badge>
                    </div>
                    
                    {/* Content Grid */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Dates Section */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dates</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-medium">{b.check_in}</p>
                              <p className="text-sm text-muted-foreground">to {b.check_out}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Guests Section */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Guests</p>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="font-medium">{b.guests} {b.guests === 1 ? 'guest' : 'guests'}</span>
                          </div>
                        </div>
                        
                        {/* Earnings Section */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Earnings</p>
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="font-semibold text-green-600">{formatMoney(hostNetEarnings, b.currency || 'RWF')}</p>
                              {feePercent > 0 && (
                                <p className="text-xs text-muted-foreground">after {feePercent}% platform fee</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Guest Info */}
                      {b.is_guest_booking && b.guest_name && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-muted">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Guest Information</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{b.guest_name}</span>
                            </div>
                            {b.guest_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm truncate">{b.guest_email}</span>
                              </div>
                            )}
                            {b.guest_phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{b.guest_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions Footer */}
                    <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 bg-muted/20 border-t">
                      <Button size="sm" variant="outline" onClick={() => viewBookingDetails(b)}>
                        <Eye className="w-3 h-3 mr-1" /> Details
                      </Button>
                      {b.status === "pending" && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateBookingStatus(b.id, "confirmed")}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateBookingStatus(b.id, "cancelled")}>
                            <XCircle className="w-3 h-3 mr-1" /> Decline
                          </Button>
                        </>
                      )}
                      {b.status === "confirmed" && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updateBookingStatus(b.id, "completed")}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Mark Complete
                        </Button>
                      )}
                      {(b.status === "confirmed" || b.status === "completed") && b.review_token && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={b.review_email_sent || sendingReviewEmail.has(b.id)}
                          onClick={() => sendReviewEmail(b)}
                          title={b.review_email_sent ? "Review request already sent" : "Send review request to guest"}
                        >
                          {sendingReviewEmail.has(b.id) ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Star className="w-3 h-3 mr-1" />
                          )}
                          {b.review_email_sent ? "Sent" : "Request Review"}
                        </Button>
                      )}
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
Amount: ${formatMoney(Number(b.total_price), b.currency || 'RWF')}
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
                              <div>{payout.currency} {payout.amount?.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">
                                ≈ {formatMoney(convertAmount(payout.amount || 0, payout.currency || 'RWF', 'USD', usdRates) ?? 0, 'USD')}
                              </div>
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

          {/* Payout Methods Tab */}
          <TabsContent value="payout-methods">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard className="w-6 h-6" />
                    Payout Methods
                  </h2>
                  <p className="text-muted-foreground mt-1">Add up to 2 payout methods to receive your earnings</p>
                </div>
                {payoutMethods.length < 2 && (
                  <Button
                    onClick={() => {
                      setEditingPayoutMethod(null);
                      setPayoutMethodForm({
                        method_type: 'mobile_money',
                        is_primary: payoutMethods.length === 0,
                        phone_number: '',
                        mobile_provider: 'MTN',
                        bank_name: '',
                        bank_account_number: '',
                        bank_account_name: '',
                        bank_swift_code: '',
                        nickname: '',
                      });
                      setShowAddPayoutMethod(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payout Method
                  </Button>
                )}
              </div>

              {payoutMethods.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No payout methods yet</h3>
                  <p className="text-muted-foreground mb-4">Add a payout method to receive your earnings</p>
                  <Button
                    onClick={() => {
                      setEditingPayoutMethod(null);
                      setPayoutMethodForm({
                        method_type: 'mobile_money',
                        is_primary: true,
                        phone_number: '',
                        mobile_provider: 'MTN',
                        bank_name: '',
                        bank_account_number: '',
                        bank_account_name: '',
                        bank_swift_code: '',
                        nickname: '',
                      });
                      setShowAddPayoutMethod(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payout Method
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {payoutMethods.map((method) => {
                    const { canEdit, daysRemaining } = canEditPayoutMethod(method);
                    return (
                    <Card key={method.id} className={`p-4 relative ${method.is_primary ? 'ring-2 ring-primary' : ''}`}>
                      {method.is_primary && (
                        <Badge className="absolute -top-2 -right-2 bg-primary">Primary</Badge>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${method.method_type === 'mobile_money' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            {method.method_type === 'mobile_money' ? (
                              <Smartphone className="w-5 h-5 text-yellow-600" />
                            ) : (
                              <Building className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {method.nickname || (method.method_type === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer')}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {method.method_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canEdit}
                            title={!canEdit ? `Cannot edit for ${daysRemaining} more days` : 'Edit'}
                            onClick={() => {
                              setEditingPayoutMethod(method);
                              setPayoutMethodForm({
                                method_type: method.method_type,
                                is_primary: method.is_primary,
                                phone_number: method.phone_number || '',
                                mobile_provider: method.mobile_provider || 'MTN',
                                bank_name: method.bank_name || '',
                                bank_account_number: method.bank_account_number || '',
                                bank_account_name: method.bank_account_name || '',
                                bank_swift_code: method.bank_swift_code || '',
                                nickname: method.nickname || '',
                              });
                              setShowAddPayoutMethod(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={!canEdit}
                            title={!canEdit ? `Cannot delete for ${daysRemaining} more days` : 'Delete'}
                            onClick={async () => {
                              if (!confirm('Are you sure you want to delete this payout method?')) return;
                              try {
                                const { error } = await supabase
                                  .from('host_payout_methods')
                                  .delete()
                                  .eq('id', method.id);
                                if (error) throw error;
                                setPayoutMethods(prev => prev.filter(m => m.id !== method.id));
                                toast({ title: 'Payout method deleted' });
                              } catch (e: any) {
                                toast({ variant: 'destructive', title: 'Error', description: e.message });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-1 text-sm">
                        {method.method_type === 'mobile_money' ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Provider:</span>
                              <span className="font-medium">{method.mobile_provider || 'MTN'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="font-medium">{method.phone_number}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bank:</span>
                              <span className="font-medium">{method.bank_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Account:</span>
                              <span className="font-medium">{method.bank_account_number}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Name:</span>
                              <span className="font-medium">{method.bank_account_name}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {!method.is_primary && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 w-full"
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('host_payout_methods')
                                .update({ is_primary: true })
                                .eq('id', method.id);
                              if (error) throw error;
                              setPayoutMethods(prev => prev.map(m => ({
                                ...m,
                                is_primary: m.id === method.id
                              })));
                              toast({ title: 'Primary payout method updated' });
                            } catch (e: any) {
                              toast({ variant: 'destructive', title: 'Error', description: e.message });
                            }
                          }}
                        >
                          Set as Primary
                        </Button>
                      )}
                      {!canEdit && (
                        <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          <span>Changes allowed in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </Card>
                  )})}
                </div>
              )}

              {/* Info Notice */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">About Payout Methods</p>
                    <p className="text-blue-800 dark:text-blue-200">
                      You can add up to 2 payout methods. Your primary method will be used by default when requesting payouts.
                      Payouts are processed within 1-3 business days after approval.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Booking Details
            </DialogTitle>
            <DialogDescription>
              Complete information for this booking
            </DialogDescription>
          </DialogHeader>
          
          {bookingFullDetails && (
            <div className="space-y-6 py-4">
              {/* Booking Reference */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="font-mono font-semibold">MRY-{bookingFullDetails.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <Badge className={
                  bookingFullDetails.status === "confirmed" ? "bg-green-500" :
                  bookingFullDetails.status === "completed" ? "bg-blue-500" :
                  bookingFullDetails.status === "pending" ? "bg-yellow-500" :
                  "bg-gray-500"
                }>
                  {bookingFullDetails.status}
                </Badge>
              </div>

              {/* Booked Item */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {bookingFullDetails.booking_type === 'property' && <Building2 className="w-4 h-4" />}
                  {bookingFullDetails.booking_type === 'tour' && <Compass className="w-4 h-4" />}
                  {bookingFullDetails.booking_type === 'transport' && <Car className="w-4 h-4" />}
                  Booked {bookingFullDetails.booking_type}
                </h3>
                <Card className="p-4">
                  {bookingFullDetails.properties && (
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        {bookingFullDetails.properties.images?.[0] && (
                          <img 
                            src={bookingFullDetails.properties.images[0]} 
                            alt={bookingFullDetails.properties.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold">{bookingFullDetails.properties.title}</h4>
                          <p className="text-sm text-muted-foreground">{bookingFullDetails.properties.property_type}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {bookingFullDetails.properties.location}
                          </p>
                        </div>
                      </div>
                      {bookingFullDetails.properties.amenities && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bookingFullDetails.properties.amenities.map((amenity: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{amenity}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {bookingFullDetails.tour_packages && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">{bookingFullDetails.tour_packages.title}</h4>
                      <p className="text-sm text-muted-foreground">{bookingFullDetails.tour_packages.city || bookingFullDetails.tour_packages.location}</p>
                      {bookingFullDetails.tour_packages.duration && (
                        <p className="text-sm"><Clock className="w-3 h-3 inline mr-1" />{bookingFullDetails.tour_packages.duration}</p>
                      )}
                      {bookingFullDetails.tour_packages.categories && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bookingFullDetails.tour_packages.categories.map((cat: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {bookingFullDetails.transport_vehicles && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">{bookingFullDetails.transport_vehicles.title}</h4>
                      <p className="text-sm text-muted-foreground">{bookingFullDetails.transport_vehicles.vehicle_type}</p>
                      <div className="flex gap-3 text-sm">
                        <span><Users className="w-3 h-3 inline mr-1" />{bookingFullDetails.transport_vehicles.seats} seats</span>
                        {bookingFullDetails.transport_vehicles.driver_included && (
                          <Badge variant="secondary" className="text-xs">Driver included</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Dates & Guests */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Dates
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Check-in:</span> <span className="font-medium">{new Date(bookingFullDetails.check_in).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                    <p><span className="text-muted-foreground">Check-out:</span> <span className="font-medium">{new Date(bookingFullDetails.check_out).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                    <p><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{Math.ceil((new Date(bookingFullDetails.check_out).getTime() - new Date(bookingFullDetails.check_in).getTime()) / (1000 * 60 * 60 * 24))} nights</span></p>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Guests
                  </h4>
                  <div className="text-sm">
                    <p className="text-2xl font-bold">{bookingFullDetails.guests || 1}</p>
                    <p className="text-muted-foreground">guest{bookingFullDetails.guests !== 1 ? 's' : ''}</p>
                  </div>
                </Card>
              </div>

              {/* Guest Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Guest Information
                </h3>
                <Card className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{bookingFullDetails.guest_name || bookingFullDetails.profiles?.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{bookingFullDetails.guest_email || bookingFullDetails.profiles?.email || 'N/A'}</span>
                    </div>
                    {(bookingFullDetails.guest_phone || bookingFullDetails.profiles?.phone) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{bookingFullDetails.guest_phone || bookingFullDetails.profiles?.phone}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment Information
                </h3>
                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Listing Price:</span>
                      <span className="text-xl font-bold">
                        {formatMoney(
                          bookingFullDetails.total_price,
                          bookingFullDetails.booking_type === 'property' && bookingFullDetails.properties?.currency
                            ? bookingFullDetails.properties.currency
                            : bookingFullDetails.booking_type === 'tour' && bookingFullDetails.tour_packages?.currency
                              ? bookingFullDetails.tour_packages.currency
                              : bookingFullDetails.booking_type === 'transport' && bookingFullDetails.transport_vehicles?.currency
                                ? bookingFullDetails.transport_vehicles.currency
                                : bookingFullDetails.currency || 'RWF'
                        )}
                      </span>
                    </div>
                    {bookingFullDetails.checkout_requests && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Amount Paid:</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatMoney(
                            bookingFullDetails.checkout_requests.total_amount,
                            bookingFullDetails.checkout_requests.currency || 'RWF'
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Status:</span>
                      <Badge variant={bookingFullDetails.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {bookingFullDetails.payment_status}
                      </Badge>
                    </div>
                    {bookingFullDetails.checkout_requests && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment Method:</span>
                          <span className="font-medium">{bookingFullDetails.checkout_requests.payment_method || 'Mobile Money'}</span>
                        </div>
                        {bookingFullDetails.checkout_requests.dpo_transaction_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Transaction ID:</span>
                            <span className="font-mono text-xs">{bookingFullDetails.checkout_requests.dpo_transaction_id}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Calculate and show earnings */}
                    {(() => {
                      const serviceType = bookingFullDetails.booking_type === 'property' ? 'accommodation' : bookingFullDetails.booking_type === 'tour' ? 'tour' : 'transport';
                      const { hostNetEarnings, hostFee } = calculateHostEarningsFromGuestTotal(Number(bookingFullDetails.total_price), serviceType as 'accommodation' | 'tour' | 'transport');
                      const feePercent = serviceType === 'accommodation' ? PLATFORM_FEES.accommodation.hostFeePercent : serviceType === 'tour' ? PLATFORM_FEES.tour.providerFeePercent : 0;
                      
                      // Get listing's currency
                      const listingCurrency = bookingFullDetails.booking_type === 'property' && bookingFullDetails.properties?.currency
                        ? bookingFullDetails.properties.currency
                        : bookingFullDetails.booking_type === 'tour' && bookingFullDetails.tour_packages?.currency
                          ? bookingFullDetails.tour_packages.currency
                          : bookingFullDetails.booking_type === 'transport' && bookingFullDetails.transport_vehicles?.currency
                            ? bookingFullDetails.transport_vehicles.currency
                            : bookingFullDetails.currency || 'RWF';
                      
                      return (
                        <div className="border-t pt-3 mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Platform Fee ({feePercent}%):</span>
                            <span>-{formatMoney(hostFee, listingCurrency)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Your Earnings:</span>
                            <span className="text-lg font-bold text-green-600">{formatMoney(hostNetEarnings, listingCurrency)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              </div>

              {/* Booking Timeline */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </h3>
                <Card className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Booked on:</span>
                      <span className="font-medium">{new Date(bookingFullDetails.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {bookingFullDetails.updated_at && bookingFullDetails.updated_at !== bookingFullDetails.created_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last updated:</span>
                        <span className="font-medium">{new Date(bookingFullDetails.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Action Buttons */}
              {bookingFullDetails.status === "pending" && (
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={async () => {
                      await updateBookingStatus(bookingFullDetails.id, "confirmed");
                      setShowBookingDetails(false);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Booking
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      await updateBookingStatus(bookingFullDetails.id, "cancelled");
                      setShowBookingDetails(false);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </div>
              )}
              
              {bookingFullDetails.status === "confirmed" && (
                <Button 
                  className="w-full"
                  onClick={async () => {
                    await updateBookingStatus(bookingFullDetails.id, "completed");
                    setShowBookingDetails(false);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Completed
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Payout Method Dialog */}
      <Dialog open={showAddPayoutMethod} onOpenChange={setShowAddPayoutMethod}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {editingPayoutMethod ? 'Edit Payout Method' : 'Add Payout Method'}
            </DialogTitle>
            <DialogDescription>
              {editingPayoutMethod ? 'Update your payout method details' : 'Add a new way to receive your earnings'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Method Type Selection */}
            <div className="space-y-2">
              <Label>Method Type</Label>
              <Select 
                value={payoutMethodForm.method_type} 
                onValueChange={(v) => setPayoutMethodForm(f => ({ ...f, method_type: v as 'mobile_money' | 'bank_transfer' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Mobile Money
                    </div>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Bank Transfer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <Label>Nickname (optional)</Label>
              <Input
                placeholder="e.g., My MTN MoMo, Business Account"
                value={payoutMethodForm.nickname}
                onChange={(e) => setPayoutMethodForm(f => ({ ...f, nickname: e.target.value }))}
              />
            </div>

            {/* Mobile Money Fields */}
            {payoutMethodForm.method_type === 'mobile_money' && (
              <>
                <div className="space-y-2">
                  <Label>Mobile Provider *</Label>
                  <Select 
                    value={payoutMethodForm.mobile_provider} 
                    onValueChange={(v) => setPayoutMethodForm(f => ({ ...f, mobile_provider: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                      <SelectItem value="Airtel">Airtel Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    placeholder="+250 7XX XXX XXX"
                    value={payoutMethodForm.phone_number}
                    onChange={(e) => setPayoutMethodForm(f => ({ ...f, phone_number: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Bank Transfer Fields */}
            {payoutMethodForm.method_type === 'bank_transfer' && (
              <>
                <div className="space-y-2">
                  <Label>Bank Name *</Label>
                  <Input
                    placeholder="e.g., Bank of Kigali"
                    value={payoutMethodForm.bank_name}
                    onChange={(e) => setPayoutMethodForm(f => ({ ...f, bank_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number *</Label>
                  <Input
                    placeholder="Enter account number"
                    value={payoutMethodForm.bank_account_number}
                    onChange={(e) => setPayoutMethodForm(f => ({ ...f, bank_account_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name *</Label>
                  <Input
                    placeholder="Name on the account"
                    value={payoutMethodForm.bank_account_name}
                    onChange={(e) => setPayoutMethodForm(f => ({ ...f, bank_account_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SWIFT Code (optional)</Label>
                  <Input
                    placeholder="For international transfers"
                    value={payoutMethodForm.bank_swift_code}
                    onChange={(e) => setPayoutMethodForm(f => ({ ...f, bank_swift_code: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Primary checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={payoutMethodForm.is_primary}
                onChange={(e) => setPayoutMethodForm(f => ({ ...f, is_primary: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_primary" className="cursor-pointer">Set as primary payout method</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPayoutMethod(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!user) return;
                
                // Validation
                if (payoutMethodForm.method_type === 'mobile_money' && !payoutMethodForm.phone_number) {
                  toast({ variant: 'destructive', title: 'Phone number required' });
                  return;
                }
                if (payoutMethodForm.method_type === 'bank_transfer' && (!payoutMethodForm.bank_name || !payoutMethodForm.bank_account_number || !payoutMethodForm.bank_account_name)) {
                  toast({ variant: 'destructive', title: 'Bank details required', description: 'Please fill in bank name, account number, and account holder name.' });
                  return;
                }

                setSavingPayoutMethod(true);
                try {
                  const payload = {
                    host_id: user.id,
                    method_type: payoutMethodForm.method_type,
                    is_primary: payoutMethodForm.is_primary,
                    phone_number: payoutMethodForm.method_type === 'mobile_money' ? payoutMethodForm.phone_number : null,
                    mobile_provider: payoutMethodForm.method_type === 'mobile_money' ? payoutMethodForm.mobile_provider : null,
                    bank_name: payoutMethodForm.method_type === 'bank_transfer' ? payoutMethodForm.bank_name : null,
                    bank_account_number: payoutMethodForm.method_type === 'bank_transfer' ? payoutMethodForm.bank_account_number : null,
                    bank_account_name: payoutMethodForm.method_type === 'bank_transfer' ? payoutMethodForm.bank_account_name : null,
                    bank_swift_code: payoutMethodForm.method_type === 'bank_transfer' ? payoutMethodForm.bank_swift_code : null,
                    nickname: payoutMethodForm.nickname || null,
                  };

                  if (editingPayoutMethod) {
                    // Update existing
                    const { error } = await supabase
                      .from('host_payout_methods')
                      .update(payload)
                      .eq('id', editingPayoutMethod.id);
                    if (error) throw error;
                    setPayoutMethods(prev => prev.map(m => m.id === editingPayoutMethod.id ? { ...m, ...payload, id: m.id } as PayoutMethod : m));
                    toast({ title: 'Payout method updated' });
                  } else {
                    // Insert new
                    const { data, error } = await supabase
                      .from('host_payout_methods')
                      .insert(payload)
                      .select()
                      .single();
                    if (error) throw error;
                    setPayoutMethods(prev => [...prev, data as PayoutMethod]);
                    toast({ title: 'Payout method added' });
                  }

                  setShowAddPayoutMethod(false);
                } catch (e: any) {
                  toast({ variant: 'destructive', title: 'Error', description: e.message });
                } finally {
                  setSavingPayoutMethod(false);
                }
              }}
              disabled={savingPayoutMethod}
            >
              {savingPayoutMethod ? 'Saving...' : (editingPayoutMethod ? 'Save Changes' : 'Add Method')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <p className="text-sm text-muted-foreground">
                ≈ {formatMoney(convertAmount(availableForPayout, 'RWF', 'USD', usdRates) ?? 0, 'USD')}
              </p>
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
                min={101}
                max={availableForPayout}
              />
              {payoutAmount && parseFloat(payoutAmount) > 0 && (
                <p className="text-sm text-muted-foreground">
                  ≈ {formatMoney(convertAmount(parseFloat(payoutAmount), 'RWF', 'USD', usdRates) ?? 0, 'USD')}
                </p>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: 101 RWF</span>
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
                <div>
                  <p className="text-yellow-800 dark:text-yellow-200">
                    You have {formatMoney(pendingPayoutAmount, 'RWF')} in pending payouts being processed.
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                    ≈ {formatMoney(convertAmount(pendingPayoutAmount, 'RWF', 'USD', usdRates) ?? 0, 'USD')}
                  </p>
                </div>
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
                parseFloat(payoutAmount) < 101 || 
                parseFloat(payoutAmount) > availableForPayout ||
                (payoutForm.method === 'mobile_money' && !payoutForm.phone) ||
                (payoutForm.method === 'bank_transfer' && (!payoutForm.bank_name || !payoutForm.bank_account))
              }
            >
              {requestingPayout ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {payoutForm.method === 'mobile_money' ? 'Send to Mobile Money' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Completion Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Host Profile</DialogTitle>
            <DialogDescription>
              Select the services you want to offer and upload required documents to enable your listings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Service Types Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">What services will you offer?</Label>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'accommodation', label: 'Accommodation', icon: Home, desc: 'Hotels, apartments, villas' },
                  { id: 'tour', label: 'Tours & Experiences', icon: Compass, desc: 'Guided tours, activities' },
                  { id: 'transport', label: 'Transport', icon: Car, desc: 'Car rentals, transfers' },
                ].map(service => (
                  <div
                    key={service.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      profileForm.service_types.includes(service.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                    onClick={() => {
                      setProfileForm(prev => ({
                        ...prev,
                        service_types: prev.service_types.includes(service.id)
                          ? prev.service_types.filter(s => s !== service.id)
                          : [...prev.service_types, service.id]
                      }));
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        profileForm.service_types.includes(service.id) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <service.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{service.label}</p>
                        <p className="text-sm text-muted-foreground">{service.desc}</p>
                      </div>
                      {profileForm.service_types.includes(service.id) && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Uploads - Based on Selected Services */}
            {profileForm.service_types.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-medium">Required Documents</Label>
                
                {/* ID for all service types */}
                <div className="space-y-2">
                  <Label className="text-sm">National ID / Passport</Label>
                  <p className="text-xs text-muted-foreground">Required for identity verification</p>
                  <CloudinaryUploadDialog
                    title="Upload National ID"
                    folder="host_documents"
                    accept="image/*,.pdf"
                    value={profileForm.national_id_photo_url ? [profileForm.national_id_photo_url] : []}
                    onChange={(urls) => setProfileForm(prev => ({ ...prev, national_id_photo_url: urls[0] || '' }))}
                    buttonLabel={profileForm.national_id_photo_url ? "Change ID" : "Upload ID"}
                  />
                  {profileForm.national_id_photo_url && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> ID uploaded
                    </p>
                  )}
                </div>

                {/* Tour License - Required for tour providers */}
                {profileForm.service_types.includes('tour') && (
                  <div className="space-y-2">
                    <Label className="text-sm">Tour Guide License</Label>
                    <p className="text-xs text-muted-foreground">Required for tour operators</p>
                    <CloudinaryUploadDialog
                      title="Upload Tour License"
                      folder="tour_licenses"
                      accept="image/*,.pdf"
                      value={profileForm.tour_license_url ? [profileForm.tour_license_url] : []}
                      onChange={(urls) => setProfileForm(prev => ({ ...prev, tour_license_url: urls[0] || '' }))}
                      buttonLabel={profileForm.tour_license_url ? "Change License" : "Upload License"}
                    />
                    {profileForm.tour_license_url && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> License uploaded
                      </p>
                    )}
                  </div>
                )}

                {/* RDB Certificate - Optional for tour providers */}
                {profileForm.service_types.includes('tour') && (
                  <div className="space-y-2">
                    <Label className="text-sm">RDB Certificate (Optional)</Label>
                    <p className="text-xs text-muted-foreground">Rwanda Development Board registration</p>
                    <CloudinaryUploadDialog
                      title="Upload RDB Certificate"
                      folder="rdb_certificates"
                      accept="image/*,.pdf"
                      value={profileForm.rdb_certificate_url ? [profileForm.rdb_certificate_url] : []}
                      onChange={(urls) => setProfileForm(prev => ({ ...prev, rdb_certificate_url: urls[0] || '' }))}
                      buttonLabel={profileForm.rdb_certificate_url ? "Change Certificate" : "Upload Certificate"}
                    />
                    {profileForm.rdb_certificate_url && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Certificate uploaded
                      </p>
                    )}
                  </div>
                )}

                {/* Selfie for identity verification */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-sm">Selfie Photo <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground">Take a clear photo of your face for verification (camera only)</p>
                  <Button
                    type="button"
                    variant={profileForm.selfie_photo_url ? "outline" : "default"}
                    size="sm"
                    onClick={() => setShowCameraDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {profileForm.selfie_photo_url ? "Retake Selfie" : "Take Selfie"}
                  </Button>
                  {profileForm.selfie_photo_url && (
                    <div className="flex items-center gap-3 mt-2">
                      <img 
                        src={profileForm.selfie_photo_url} 
                        alt="Your selfie" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-green-500"
                      />
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Selfie captured
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              // Remember that user dismissed the dialog this session
              if (user?.id) {
                sessionStorage.setItem(`profile_dialog_dismissed_${user.id}`, 'true');
              }
              setShowProfileDialog(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (profileForm.service_types.length === 0) {
                  toast({ variant: "destructive", title: "Select at least one service type" });
                  return;
                }
                if (!profileForm.national_id_photo_url) {
                  toast({ variant: "destructive", title: "Please upload your ID" });
                  return;
                }
                if (!profileForm.selfie_photo_url) {
                  toast({ variant: "destructive", title: "Please take a selfie using the camera" });
                  return;
                }
                if (profileForm.service_types.includes('tour') && !profileForm.tour_license_url) {
                  toast({ variant: "destructive", title: "Please upload your tour license" });
                  return;
                }
                
                setSavingProfile(true);
                try {
                  const updateData: any = {
                    service_types: profileForm.service_types,
                    national_id_photo_url: profileForm.national_id_photo_url,
                    selfie_photo_url: profileForm.selfie_photo_url,
                    profile_complete: true,
                  };
                  // Add optional fields if the columns exist (from migration)
                  if (profileForm.tour_license_url) updateData.tour_license_url = profileForm.tour_license_url;
                  if (profileForm.rdb_certificate_url) updateData.rdb_certificate_url = profileForm.rdb_certificate_url;
                  
                  const { error } = await supabase
                    .from("host_applications")
                    .update(updateData)
                    .eq("user_id", user?.id)
                    .eq("status", "approved");
                  
                  if (error) throw error;
                  
                  // Clear the dismissal flag since profile is now complete
                  if (user?.id) {
                    sessionStorage.removeItem(`profile_dialog_dismissed_${user.id}`);
                  }
                  
                  // Update local state immediately - this will hide the warning banner
                  setHostProfile(prev => prev ? { 
                    ...prev, 
                    profile_complete: true, 
                    service_types: profileForm.service_types,
                    national_id_photo_url: profileForm.national_id_photo_url,
                    selfie_photo_url: profileForm.selfie_photo_url || null,
                    tour_license_url: profileForm.tour_license_url || null,
                    rdb_certificate_url: profileForm.rdb_certificate_url || null,
                  } : null);
                  setHostServiceTypes(profileForm.service_types);
                  setShowProfileDialog(false);
                  toast({ title: "Profile completed!", description: "Your listings can now go live." });
                } catch (e) {
                  logError("host-profile.save", e);
                  toast({ variant: "destructive", title: "Failed to save", description: uiErrorMessage(e, "Please try again.") });
                } finally {
                  setSavingProfile(false);
                }
              }}
              disabled={savingProfile || profileForm.service_types.length === 0}
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog for Selfie */}
      <Dialog open={showCameraDialog} onOpenChange={(open) => {
        if (!open && cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        setShowCameraDialog(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Take a Selfie
            </DialogTitle>
            <DialogDescription>
              Position your face in the frame and click capture
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                id="selfie-video"
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas id="selfie-canvas" className="hidden" />
              {!cameraStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Button
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                          video: { facingMode: 'user', width: 640, height: 640 }
                        });
                        setCameraStream(stream);
                        const video = document.getElementById('selfie-video') as HTMLVideoElement;
                        if (video) {
                          video.srcObject = stream;
                        }
                      } catch (err) {
                        console.error('Camera access error:', err);
                        toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera. Please check permissions." });
                      }
                    }}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              )}
            </div>
            {cameraStream && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    cameraStream.getTracks().forEach(track => track.stop());
                    setCameraStream(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    const video = document.getElementById('selfie-video') as HTMLVideoElement;
                    const canvas = document.getElementById('selfie-canvas') as HTMLCanvasElement;
                    if (video && canvas) {
                      canvas.width = 640;
                      canvas.height = 640;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        // Mirror the image
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // Convert to blob and upload to Cloudinary
                        canvas.toBlob(async (blob) => {
                          if (blob) {
                            try {
                              const formData = new FormData();
                              formData.append('file', blob, 'selfie.jpg');
                              formData.append('upload_preset', 'default');
                              formData.append('folder', 'host_selfies');
                              
                              const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                              const response = await fetch(
                                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                                { method: 'POST', body: formData }
                              );
                              const data = await response.json();
                              
                              if (data.secure_url) {
                                setProfileForm(prev => ({ ...prev, selfie_photo_url: data.secure_url }));
                                toast({ title: "Selfie captured!", description: "Your photo has been saved." });
                                // Stop camera and close dialog
                                cameraStream.getTracks().forEach(track => track.stop());
                                setCameraStream(null);
                                setShowCameraDialog(false);
                              } else {
                                throw new Error('Upload failed');
                              }
                            } catch (err) {
                              console.error('Upload error:', err);
                              toast({ variant: "destructive", title: "Upload failed", description: "Could not save selfie. Try again." });
                            }
                          }
                        }, 'image/jpeg', 0.9);
                      }
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
