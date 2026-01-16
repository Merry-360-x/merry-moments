import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { isVideoUrl } from "@/lib/media";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { formatMoney } from "@/lib/money";
import { AMENITIES, AMENITIES_BY_CATEGORY } from "@/lib/amenities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
} from "lucide-react";

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
  guests_count: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  property_id: string;
  guest_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  is_guest_booking: boolean;
}

const propertyTypes = ["Hotel", "Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "Motel", "House", "Cabin"];
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

  const [tab, setTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Editing states
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // New property wizard
  const [showPropertyWizard, setShowPropertyWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [propertyForm, setPropertyForm] = useState({
    title: "",
    location: "",
    address: "",
    property_type: "Apartment",
    description: "",
    price_per_night: 50000,
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
  const TOUR_FORM_KEY = 'host_tour_draft';
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

  // New Tour wizard (matches property wizard UX)
  const [showTourWizard, setShowTourWizard] = useState(false);
  const [tourWizardStep, setTourWizardStep] = useState(1);
  const [creatingTour, setCreatingTour] = useState(false);
  const [tourUploadDialogOpen, setTourUploadDialogOpen] = useState(false);
  const [tourForm, setTourForm] = useState({
    title: "",
    location: "",
    description: "",
    category: "",
    difficulty: "",
    duration_days: 1,
    price_per_person: 50000,
    currency: "RWF",
    images: [] as string[],
    is_published: true,
  });

  // Load saved tour draft on mount
  useEffect(() => {
    try {
      const savedTour = localStorage.getItem(TOUR_FORM_KEY);
      if (savedTour) {
        const parsed = JSON.parse(savedTour);
        setTourForm(parsed.form);
        setTourWizardStep(parsed.step || 1);
      }
    } catch (e) {
      console.error('Failed to load tour draft:', e);
    }
  }, []);

  // Auto-save tour form
  useEffect(() => {
    if (showTourWizard && tourForm.title) {
      try {
        localStorage.setItem(TOUR_FORM_KEY, JSON.stringify({ form: tourForm, step: tourWizardStep }));
      } catch (e) {
        console.error('Failed to save tour draft:', e);
      }
    }
  }, [tourForm, tourWizardStep, showTourWizard]);

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
      // Fetch properties, tours, vehicles, routes
      const [propsRes, toursRes, vehiclesRes, routesRes] = await Promise.all([
        supabase.from("properties").select("*").eq("host_id", user.id).order("created_at", { ascending: false }),
        supabase.from("tours").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
        supabase.from("transport_vehicles").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
        supabase.from("transport_routes").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
      ]);

      if (propsRes.data) setProperties(propsRes.data as Property[]);
      if (toursRes.data) setTours(toursRes.data as Tour[]);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data as Vehicle[]);
      if (routesRes.data) setRoutes(routesRes.data as TransportRoute[]);

      // Fetch bookings separately - try via property_id if host_id fails
      const propertyIds = (propsRes.data || []).map((p: { id: string }) => p.id);
      
      if (propertyIds.length > 0) {
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("*")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false });

        if (bookingsData) setBookings(bookingsData as Booking[]);
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
  const updateTour = async (id: string, updates: Partial<Tour>) => {
    const { error } = await supabase.from("tours").update(updates).eq("id", id);
    if (error) {
      logError("host.tour.update", error);
      toast({ variant: "destructive", title: "Update failed", description: uiErrorMessage(error) });
      return false;
    }
    setTours((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    toast({ title: "Saved" });
    return true;
  };

  const createTour = async (data: Partial<Tour>) => {
    const title = String(data.title ?? "").trim() || "New Tour";
    const location = String((data as any).location ?? "").trim() || "Kigali";
    const images = ((data as any).images as string[] | null | undefined) ?? null;
    const pricePerPerson = Number((data as any).price_per_person ?? 0);
    const currency = String((data as any).currency ?? "RWF") || "RWF";

    const payload: Record<string, unknown> = {
      title,
      location,
      price_per_person: pricePerPerson,
      currency,
      difficulty: (data as any).difficulty ?? null,
      duration_days: (data as any).duration_days ?? null,
      category: String((data as any).category ?? "").trim() || null,
      description: (data as any).description ?? null,
      images: images && images.length > 0 ? images : null,
      created_by: user!.id,
      is_published: typeof (data as any).is_published === "boolean" ? (data as any).is_published : true,
    };
    
    const { error, data: newTour } = await supabase
      .from("tours")
      .insert(payload as never)
      .select()
      .single();
    if (error) {
      logError("host.tour.create", error);
      toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
      return null;
    }
    setTours((prev) => [newTour as Tour, ...prev]);
    localStorage.removeItem(TOUR_FORM_KEY); // Clear draft
    toast({ title: "Tour created" });
    return newTour;
  };

  const deleteTour = async (id: string) => {
    if (!confirm("Delete this tour?")) return;
    const { error } = await supabase.from("tours").delete().eq("id", id);
    if (error) {
      logError("host.tour.delete", error);
      toast({ variant: "destructive", title: "Delete failed", description: uiErrorMessage(error) });
      return;
    }
    setTours((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Deleted" });
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
  const totalEarnings = (bookings || [])
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + Number(b.total_price), 0);
  const pendingBookings = (bookings || []).filter((b) => b.status === "pending").length;
  const publishedProperties = (properties || []).filter((p) => p.is_published).length;

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

  const openTourWizard = () => {
    const hasDraft = localStorage.getItem(TOUR_FORM_KEY);
    setShowTourWizard(true);
    if (hasDraft) {
      toast({
        title: "Draft Restored",
        description: "Your previous tour listing progress has been restored.",
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
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={form.price_per_night} onChange={(e) => setForm((f) => ({ ...f, price_per_night: Number(e.target.value) }))} />
                <Select value={form.currency || "RWF"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
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
                  <div className="grid grid-cols-2 gap-4">
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

  // Tour Creation Wizard
  if (showTourWizard) {
    const totalSteps = 4;
    const stepTitles = ["Basics", "Media", "Pricing", "Review"];

    const canProceedTour = () => {
      switch (tourWizardStep) {
        case 1:
          return tourForm.title.trim().length >= 3 && tourForm.location.trim().length >= 2;
        case 2:
          return true;
        case 3:
          return Number(tourForm.price_per_person) > 0;
        default:
          return true;
      }
    };

    const submitTour = async () => {
      if (!user) return;
      setCreatingTour(true);
      const payload: Partial<Tour> = {
        title: tourForm.title.trim(),
        location: tourForm.location.trim(),
        description: tourForm.description.trim() || null,
        category: tourForm.category.trim() || null,
        difficulty: tourForm.difficulty.trim() || null,
        duration_days: Number(tourForm.duration_days) || null,
        price_per_person: Number(tourForm.price_per_person) || 0,
        currency: tourForm.currency,
        images: tourForm.images.length > 0 ? tourForm.images : null,
        is_published: tourForm.is_published,
      };
      const created = await createTour(payload);
      setCreatingTour(false);
      if (created) {
        setShowTourWizard(false);
        setTourForm({
          title: "",
          location: "",
          description: "",
          category: "",
          difficulty: "",
          duration_days: 1,
          price_per_person: 50000,
          currency: "RWF",
          images: [],
          is_published: true,
        });
        setTourWizardStep(1);
        setTab("tours");
        setEditingTourId((created as any).id);
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
                if (tourWizardStep > 1) setTourWizardStep((s) => s - 1);
                else {
                  setShowTourWizard(false);
                  setTourWizardStep(1);
                }
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              {tourWizardStep > 1 ? "Back" : "Cancel"}
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">Create a Tour</h1>
                      <p className="text-sm text-muted-foreground">
                Step {tourWizardStep} of {totalSteps}: {stepTitles[tourWizardStep - 1]}
                      </p>
                  </div>
            <div className="w-20" />
          </div>

          <Progress value={(tourWizardStep / totalSteps) * 100} className="mb-8 h-2" />

          <Card className="p-6 md:p-8">
            {tourWizardStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <MapPin className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Tell guests about your tour</h2>
                  <p className="text-muted-foreground mt-2">Basics first—title and location</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Tour Title *</Label>
                    <Input
                      value={tourForm.title}
                      onChange={(e) => setTourForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Kigali City Highlights Tour"
                      className="mt-2 text-lg py-6"
                    />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Location *</Label>
                    <Input
                      value={tourForm.location}
                      onChange={(e) => setTourForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g., Kigali, Remera"
                      className="mt-2 text-lg py-6"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <Label className="text-base font-medium">Category</Label>
                      <Input
                        value={tourForm.category}
                        onChange={(e) => setTourForm((f) => ({ ...f, category: e.target.value }))}
                        placeholder="e.g., Culture"
                        className="mt-2 text-lg py-6"
                      />
                  </div>
                  <div>
                      <Label className="text-base font-medium">Difficulty</Label>
                    <Input
                        value={tourForm.difficulty}
                        onChange={(e) => setTourForm((f) => ({ ...f, difficulty: e.target.value }))}
                        placeholder="e.g., Easy"
                        className="mt-2 text-lg py-6"
                    />
                  </div>
                </div>
                  <div>
                    <Label className="text-base font-medium">Description</Label>
                    <Textarea
                      value={tourForm.description}
                      onChange={(e) => setTourForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What will guests do on this tour?"
                      className="mt-2 min-h-[120px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {tourWizardStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <ImageIcon className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Add tour photos or video</h2>
                  <p className="text-muted-foreground mt-2">Media helps guests decide faster</p>
                </div>

                <div
                  onClick={() => setTourUploadDialogOpen(true)}
                  className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground">Click to upload media</p>
                  <p className="text-sm text-muted-foreground mt-2">or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-4">PNG, JPG, or Video up to 10MB each</p>
                </div>

                {tourForm.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {tourForm.images.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                        {isVideoUrl(url) ? (
                          <video src={url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setTourForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                            className="p-2 bg-white rounded-full text-destructive hover:bg-destructive hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <CloudinaryUploadDialog
                  title="Upload Tour Media"
                  folder="merry360x/tours"
                  accept="image/*,video/*"
                  multiple
                  maxFiles={20}
                  value={tourForm.images}
                  onChange={(urls) => setTourForm((f) => ({ ...f, images: urls }))}
                  open={tourUploadDialogOpen}
                  onOpenChange={setTourUploadDialogOpen}
                />
              </div>
            )}

            {tourWizardStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <DollarSign className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Set pricing</h2>
                  <p className="text-muted-foreground mt-2">Price per guest</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-base font-medium">Price per Person *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={tourForm.price_per_person}
                      onChange={(e) => setTourForm((f) => ({ ...f, price_per_person: Number(e.target.value) }))}
                      className="mt-2 text-lg py-6"
                    />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Currency</Label>
                    <Select value={tourForm.currency} onValueChange={(v) => setTourForm((f) => ({ ...f, currency: v }))}>
                      <SelectTrigger className="mt-2 h-14 text-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Duration (days)</Label>
                    <Input
                      type="number"
                    min={1}
                    value={tourForm.duration_days}
                    onChange={(e) => setTourForm((f) => ({ ...f, duration_days: Number(e.target.value) }))}
                    className="mt-2 text-lg py-6"
                  />
                </div>

                <div className="flex items-center justify-between border rounded-xl p-4">
                  <div>
                    <p className="font-medium text-foreground">Publish now</p>
                    <p className="text-sm text-muted-foreground">Turn off to save as draft</p>
                  </div>
                  <Switch checked={tourForm.is_published} onCheckedChange={(v) => setTourForm((f) => ({ ...f, is_published: v }))} />
                </div>
              </div>
            )}

            {tourWizardStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Review your tour</h2>
                  <p className="text-muted-foreground mt-2">Confirm before saving</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium">{tourForm.title || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{tourForm.location || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">{formatMoney(tourForm.price_per_person, tourForm.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Media</span><span className="font-medium">{tourForm.images.length} file(s)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium">{tourForm.is_published ? "Live" : "Draft"}</span></div>
                </div>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={() => setTourWizardStep((s) => Math.max(1, s - 1))} disabled={tourWizardStep === 1}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            {tourWizardStep < totalSteps ? (
              <Button onClick={() => setTourWizardStep((s) => s + 1)} disabled={!canProceedTour()}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={submitTour}>
                Create Tour
              </Button>
            )}
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
            <TabsTrigger value="bookings">Bookings ({(bookings || []).length})</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
          </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-xl font-bold">{formatMoney(totalEarnings, "RWF")}</p>
                  </div>
                </div>
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
                  <MapPin className="w-4 h-4 mr-2" /> Add Tour
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
                          {b.guests_count} guests · {formatMoney(b.total_price, b.currency)}
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
            <div className="flex justify-end mb-4">
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
            <div className="flex justify-end mb-4">
              <Button onClick={() => navigate("/create-tour")}>
                <Plus className="w-4 h-4 mr-2" /> Add Tour
              </Button>
                        </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tours || []).map((t) => (
                <Card key={t.id} className="overflow-hidden">
                  <div className="h-32 bg-muted flex items-center justify-center">
                    {t.images?.[0] ? (
                      <img src={t.images[0]} alt={t.title} className="w-full h-full object-cover" />
                    ) : (
                      <MapPin className="w-8 h-8 text-muted-foreground" />
                    )}
                        </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{t.title}</h3>
                    <p className="text-sm text-muted-foreground">{t.location}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-primary font-bold">{formatMoney(t.price_per_person, t.currency || "RWF")}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingTourId(t.id)}><Edit className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTour(t.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
                    </div>
                  </div>
                </Card>
              ))}
              {(tours || []).length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">No tours yet</p>
          )}
        </div>
          </TabsContent>

          {/* Transport */}
          <TabsContent value="transport">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="text-sm text-muted-foreground">
                Create <span className="font-medium text-foreground">Routes</span> like “Airport → Gisenyi” or rent out vehicles.
          </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowRouteWizard(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Route
                </Button>
                <Button onClick={() => navigate("/create-transport")}>
                  <Plus className="w-4 h-4 mr-2" /> Add Vehicle
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
                (bookings || []).map((b) => (
                  <Card key={b.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{b.check_in} → {b.check_out}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{b.guests_count} guests</span>
                          <span className="font-medium text-foreground">{formatMoney(b.total_price, b.currency)}</span>
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
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
