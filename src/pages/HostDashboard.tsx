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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";

// Types
interface Property {
  id: string;
  title: string;
  description: string | null;
  location: string;
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
const currencies = ["RWF", "USD", "EUR", "GBP", "CNY"];
const cancellationPolicies = [
  { value: "strict", label: "Strict - Less refunds" },
  { value: "fair", label: "Fair - Moderate refunds" },
  { value: "lenient", label: "Lenient - More refunds" },
];
const vehicleTypes = ["Sedan", "SUV", "Van", "Bus", "Minibus", "Motorcycle"];
const tourCategories = ["Nature", "Adventure", "Cultural", "Wildlife", "Historical"];
const tourDifficulties = ["Easy", "Moderate", "Hard"];

const amenitiesList = [
  // Connectivity & Entertainment
  { id: "wifi", label: "Wi-Fi", icon: Wifi },
  { id: "tv_smart", label: "TV (Smart)", icon: Monitor },
  { id: "tv_basic", label: "TV (Basic)", icon: Tv },
  // Parking
  { id: "parking_free", label: "Parking (Free)", icon: ParkingCircle },
  { id: "parking_paid", label: "Parking (Paid)", icon: ParkingCircle },
  // Work & Storage
  { id: "workspace", label: "Workspace", icon: Laptop },
  { id: "wardrobe", label: "Wardrobe", icon: Shirt },
  { id: "hangers", label: "Cloth Hangers", icon: Shirt },
  { id: "safe", label: "Safe Box", icon: Lock },
  // Climate
  { id: "ac", label: "Air Conditioner", icon: Thermometer },
  { id: "fans", label: "Fans", icon: Fan },
  // Water & Bathroom
  { id: "hot_water", label: "Hot Water", icon: Flame },
  { id: "toiletries", label: "Toiletries", icon: SprayCan },
  { id: "bathroom_essentials", label: "Bathroom Essentials (Towel, Shower Gel, Shampoo)", icon: ShowerHead },
  { id: "cleaning_items", label: "Cleaning Items", icon: SprayCan },
  // Bedding
  { id: "bedsheets_pillows", label: "Bedsheets & Pillows", icon: Bed },
  // Laundry
  { id: "washing_machine", label: "Washing Machine", icon: WashingMachine },
  { id: "nearby_laundry", label: "Nearby Laundry Place", icon: Sparkles },
  { id: "iron", label: "Iron", icon: Zap },
  // Kitchen & Dining
  { id: "kitchen_items", label: "Kitchen Items", icon: UtensilsCrossed },
  { id: "refrigerator", label: "Refrigerator", icon: Refrigerator },
  { id: "microwave", label: "Microwave", icon: Microwave },
  { id: "cooker", label: "Cooker", icon: Flame },
  { id: "oven", label: "Oven", icon: ChefHat },
  { id: "cooking_items", label: "Cooking Items (Pots, Pans, Spoons)", icon: CookingPot },
  { id: "dining_items", label: "Dining Items (Plates, Cups, Glasses)", icon: GlassWater },
  { id: "dining_table", label: "Dining Table", icon: UtensilsCrossed },
  { id: "blender", label: "Blender", icon: Zap },
  { id: "kettle", label: "Hot Water Kettle", icon: Coffee },
  { id: "coffee_maker", label: "Coffee Maker", icon: Coffee },
  // Meals
  { id: "breakfast_free", label: "Breakfast (Free)", icon: UtensilsCrossed },
  { id: "breakfast_paid", label: "Breakfast (Paid)", icon: UtensilsCrossed },
  // Fitness & Wellness
  { id: "gym_free", label: "Gym (Free)", icon: Dumbbell },
  { id: "gym_paid", label: "Gym (Paid)", icon: Dumbbell },
  { id: "pool", label: "Pool", icon: Waves },
  { id: "spa", label: "Spa", icon: Sparkles },
  // Safety
  { id: "carbon_monoxide_alarm", label: "Carbon Monoxide Alarm", icon: CircleOff },
  { id: "smoke_alarm", label: "Smoke Alarm", icon: CircleOff },
  { id: "security_cameras", label: "Security Cameras (Exterior)", icon: Cctv },
  { id: "fire_extinguisher", label: "Fire Extinguisher", icon: Flame },
  { id: "first_aid", label: "First Aid Items", icon: Plus },
  // Views & Outdoor
  { id: "balcony", label: "Balcony", icon: Sunrise },
  { id: "city_view", label: "City View", icon: Building2 },
  { id: "landscape_view", label: "Landscape View", icon: TreePine },
  { id: "sea_view", label: "Sea View", icon: Waves },
  { id: "lake_view", label: "Lake View", icon: Waves },
  { id: "mountain_view", label: "Mountain View", icon: Mountain },
  // Accessibility & Facilities
  { id: "elevator", label: "Elevator", icon: Building2 },
  { id: "wheelchair_accessible", label: "Wheelchair Accessible", icon: Accessibility },
  { id: "meeting_room", label: "Meeting Room", icon: Presentation },
  { id: "reception", label: "Reception", icon: Phone },
];

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
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Editing states
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // New property wizard
  const [showPropertyWizard, setShowPropertyWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [propertyForm, setPropertyForm] = useState({
    title: "",
    location: "",
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/host-dashboard");
    }
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch properties, tours, vehicles
      const [propsRes, toursRes, vehiclesRes] = await Promise.all([
        supabase.from("properties").select("*").eq("host_id", user.id).order("created_at", { ascending: false }),
        supabase.from("tours").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
        supabase.from("transport_vehicles").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
      ]);

      if (propsRes.data) setProperties(propsRes.data as Property[]);
      if (toursRes.data) setTours(toursRes.data as Tour[]);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data as Vehicle[]);

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
    if (isHost && user) {
      fetchData();
    }
  }, [isHost, user, fetchData]);

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
      property_type: propertyForm.property_type || "Apartment",
      description: propertyForm.description.trim() || null,
      price_per_night: propertyForm.price_per_night || 50000,
      currency: propertyForm.currency || "RWF",
      max_guests: propertyForm.max_guests || 2,
      bedrooms: propertyForm.bedrooms || 1,
      bathrooms: propertyForm.bathrooms || 1,
      images: propertyForm.images.length > 0 ? propertyForm.images : null,
      host_id: user!.id,
      is_published: true,
    };

    // Add optional columns only if they have values
    if (propertyForm.beds) payload.beds = propertyForm.beds;
    if (propertyForm.amenities?.length > 0) payload.amenities = propertyForm.amenities;
    if (propertyForm.cancellation_policy) payload.cancellation_policy = propertyForm.cancellation_policy;

    console.log("[createProperty] Attempting insert with payload:", payload);

    const { error, data: newProp } = await supabase
      .from("properties")
      .insert(payload as never)
      .select()
      .single();

    setCreatingProperty(false);

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
    resetPropertyForm();
    setShowPropertyWizard(false);
    setWizardStep(1);
    return newProp;
  };

  const resetPropertyForm = () => {
    setPropertyForm({
      title: "",
      location: "",
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
    const payload = {
      title: data.title || "New Tour",
      price_per_person: data.price_per_person || 0,
      created_by: user!.id,
      is_published: true,
      ...data,
    };
    const { error, data: newTour } = await supabase
      .from("tours")
      .insert(payload)
      .select()
      .single();
    if (error) {
      logError("host.tour.create", error);
      toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
      return null;
    }
    setTours((prev) => [newTour as Tour, ...prev]);
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
    const payload = {
      title: data.title || "New Vehicle",
      vehicle_type: data.vehicle_type || "Sedan",
      seats: data.seats || 4,
      price_per_day: data.price_per_day || 0,
      created_by: user!.id,
      is_published: true,
      ...data,
    };
    const { error, data: newVehicle } = await supabase
      .from("transport_vehicles")
      .insert(payload)
      .select()
      .single();
    if (error) {
      logError("host.vehicle.create", error);
      toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
      return null;
    }
    setVehicles((prev) => [newVehicle as Vehicle, ...prev]);
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
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={form.price_per_night} onChange={(e) => setForm((f) => ({ ...f, price_per_night: Number(e.target.value) }))} />
                <Select value={form.currency || "RWF"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Images ({(form.images || []).length})</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(form.images || []).map((img, i) => (
                    <div key={i} className="relative w-14 h-14 rounded overflow-hidden">
                      {isVideoUrl(img) ? (
                        <video src={img} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={img} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, images: (f.images || []).filter((_, j) => j !== i) }))}
                        className="absolute top-0 right-0 w-4 h-4 bg-black/60 text-white text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditUploadOpen(true)}
                    className="w-14 h-14 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary"
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
                    {property.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
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

  // Show loading while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
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
                          {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                        <button
                          key={policy.value}
                          type="button"
                          onClick={() => setPropertyForm((f) => ({ ...f, cancellation_policy: policy.value }))}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            propertyForm.cancellation_policy === policy.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium">{policy.label.split(" - ")[0]}</div>
                          <div className="text-sm text-muted-foreground">{policy.label.split(" - ")[1]}</div>
                        </button>
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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {amenitiesList.map((amenity) => {
                    const Icon = amenity.icon;
                    const isSelected = propertyForm.amenities.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => {
                          setPropertyForm((f) => ({
                            ...f,
                            amenities: isSelected
                              ? f.amenities.filter((a) => a !== amenity.id)
                              : [...f.amenities, amenity.id],
                          }));
                        }}
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{amenity.label}</span>
                      </button>
                    );
                  })}
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
              <Button onClick={createProperty} disabled={creatingProperty || !canProceed()}>
                {creatingProperty ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" /> Create Property
                  </>
                )}
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
                <Button onClick={() => setShowPropertyWizard(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Property
                </Button>
                <Button variant="outline" onClick={async () => {
                  const result = await createTour({ title: "New Tour", price_per_person: 50000 });
                  if (result) {
                    setTab("tours");
                    setEditingTourId(result.id);
                  }
                }}>
                  <MapPin className="w-4 h-4 mr-2" /> Add Tour
                </Button>
                <Button variant="outline" onClick={async () => {
                  const result = await createVehicle({ title: "New Vehicle", vehicle_type: "Sedan", seats: 4, price_per_day: 50000 });
                  if (result) {
                    setTab("transport");
                    setEditingVehicleId(result.id);
                  }
                }}>
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
              <Button onClick={() => setShowPropertyWizard(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Property
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(properties || []).map((p) => <PropertyCard key={p.id} property={p} />)}
              {(properties || []).length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No properties yet</p>
                  <Button onClick={() => setShowPropertyWizard(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Property
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tours */}
          <TabsContent value="tours">
            <div className="flex justify-end mb-4">
              <Button onClick={async () => {
                const result = await createTour({ title: "New Tour", price_per_person: 50000 });
                if (result) setEditingTourId(result.id);
              }}>
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
            <div className="flex justify-end mb-4">
              <Button onClick={async () => {
                const result = await createVehicle({ title: "New Vehicle", vehicle_type: "Sedan", seats: 4, price_per_day: 50000 });
                if (result) setEditingVehicleId(result.id);
              }}>
                <Plus className="w-4 h-4 mr-2" /> Add Vehicle
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(vehicles || []).map((v) => (
                <Card key={v.id} className="overflow-hidden">
                  <div className="h-32 bg-muted flex items-center justify-center">
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
