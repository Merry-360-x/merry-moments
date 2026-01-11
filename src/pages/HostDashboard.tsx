import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { isVideoUrl } from "@/lib/media";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import {
  Home,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  TrendingUp,
  LayoutDashboard,
  Building2,
  PlusCircle,
  MapPin,
  Car,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  property_type: string;
  price_per_night: number;
  currency?: string | null;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  beds?: number | null;
  cancellation_policy?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_published: boolean;
  images?: string[] | null;
  created_at: string;
}

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  status: string;
  created_at: string;
  properties: { title: string } | null;
}

const HostDashboard = () => {
  const { user, isHost, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [nav, setNav] = useState<"dashboard" | "properties" | "add-property" | "create-tour" | "create-transport">(
    "dashboard"
  );
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [isTransportDialogOpen, setIsTransportDialogOpen] = useState(false);
  const [transportMode, setTransportMode] = useState<"vehicle" | "route">("vehicle");

  const [tourForm, setTourForm] = useState({
    title: "",
    description: "",
    category: "Nature",
    difficulty: "Moderate",
    duration_days: 1,
    price_per_person: 0,
    currency: "RWF",
    location: "",
    images: [] as string[],
  });

  const [vehicleForm, setVehicleForm] = useState({
    provider_name: "",
    title: "",
    vehicle_type: "Sedan",
    seats: 4,
    price_per_day: 0,
    currency: "RWF",
    driver_included: true,
    image_url: "",
    media: [] as string[],
  });

  const [routeForm, setRouteForm] = useState({
    from_location: "",
    to_location: "",
    distance_km: 0,
    duration_minutes: 0,
    base_price: 0,
    currency: "RWF",
  });

  const moveItem = <T,>(arr: T[], from: number, to: number) => {
    if (from === to) return arr;
    if (from < 0 || from >= arr.length) return arr;
    if (to < 0 || to >= arr.length) return arr;
    const copy = [...arr];
    const [it] = copy.splice(from, 1);
    copy.splice(to, 0, it);
    return copy;
  };

  const MediaReorderGrid = ({
    value,
    onChange,
  }: {
    value: string[];
    onChange: (next: string[]) => void;
  }) => {
    if (!value.length) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {value.map((url, idx) => (
          <div key={`${url}-${idx}`} className="relative rounded-lg border border-border overflow-hidden">
            {isVideoUrl(url) ? (
              <video src={url} className="w-full h-24 object-cover" muted playsInline preload="metadata" />
            ) : (
              <img src={url} className="w-full h-24 object-cover" alt="media" loading="lazy" />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur px-2 py-1 flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground">#{idx + 1}</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="text-xs px-2 py-0.5 rounded border border-border hover:border-primary"
                  onClick={() => onChange(moveItem(value, idx, Math.max(0, idx - 1)))}
                  disabled={idx === 0}
                  aria-label="Move left"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-0.5 rounded border border-border hover:border-primary"
                  onClick={() => onChange(moveItem(value, idx, Math.min(value.length - 1, idx + 1)))}
                  disabled={idx === value.length - 1}
                  aria-label="Move right"
                >
                  →
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-0.5 rounded border border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  aria-label="Remove"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    property_type: "Hotel",
    price_per_night: 50000,
    currency: "RWF",
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    cancellation_policy: "fair",
    lat: null as number | null,
    lng: null as number | null,
    images: [] as string[],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isHost && user) {
      fetchData();
    }
  }, [isHost, user]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch properties
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("*")
      .eq("host_id", user!.id)
      .order("created_at", { ascending: false });

    if (propertiesData) setProperties(propertiesData);

    // Fetch bookings for host's properties
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("*, properties(title)")
      .eq("host_id", user!.id)
      .order("created_at", { ascending: false });

    if (bookingsData) setBookings(bookingsData as Booking[]);
    
    setIsLoading(false);
  };

  const handleBecomeHost = async () => {
    navigate("/become-host");
  };

  const handleSubmitProperty = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProperty) {
      const { error } = await supabase
        .from("properties")
        .update(formData)
        .eq("id", editingProperty.id);

      if (error) {
        logError("host.properties.update", error);
        toast({ variant: "destructive", title: "Error", description: uiErrorMessage(error, "Please try again.") });
      } else {
        toast({ title: "Success", description: "Property updated successfully." });
        fetchData();
      }
    } else {
      const { error } = await supabase.from("properties").insert({
        ...formData,
        host_id: user!.id,
      });

      if (error) {
        logError("host.properties.insert", error);
        toast({ variant: "destructive", title: "Error", description: uiErrorMessage(error, "Please try again.") });
      } else {
        toast({ title: "Success", description: "Property created successfully." });
        fetchData();
      }
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      property_type: "Hotel",
      price_per_night: 50000,
      currency: "RWF",
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      beds: 1,
      cancellation_policy: "fair",
      lat: null,
      lng: null,
      images: [],
    });
    setEditingProperty(null);
  };

  const handleEdit = (property: Property) => {
    setFormData({
      title: property.title,
      description: property.description || "",
      location: property.location,
      property_type: property.property_type,
      price_per_night: property.price_per_night,
      currency: (property as any).currency ?? "RWF",
      max_guests: property.max_guests,
      bedrooms: property.bedrooms || 1,
      bathrooms: property.bathrooms || 1,
      beds: property.beds ?? 1,
      cancellation_policy: property.cancellation_policy ?? "fair",
      lat: property.lat ?? null,
      lng: property.lng ?? null,
      images: property.images ?? [],
    });
    setEditingProperty(property);
    setIsDialogOpen(true);
  };

  const createTour = async () => {
    if (!user) return;
    if (!tourForm.title.trim()) {
      toast({ variant: "destructive", title: "Tour title required" });
      return;
    }
    const payload = {
      created_by: user.id,
      title: tourForm.title.trim(),
      description: tourForm.description.trim() || null,
      category: tourForm.category,
      difficulty: tourForm.difficulty,
      duration_days: Number(tourForm.duration_days || 1),
      price_per_person: Number(tourForm.price_per_person || 0),
      currency: tourForm.currency,
      location: tourForm.location.trim() || null,
      images: tourForm.images,
      is_published: true,
    } as const;
    const { error } = await supabase.from("tours").insert(payload);
    if (error) {
      logError("host.tours.insert", error);
      toast({
        variant: "destructive",
        title: "Could not create tour",
        description: uiErrorMessage(error, "Please try again."),
      });
      return;
    }
    toast({ title: "Tour created", description: "Your tour is now visible on the Tours page." });
    setIsTourDialogOpen(false);
    setTourForm({
      title: "",
      description: "",
      category: "Nature",
      difficulty: "Moderate",
      duration_days: 1,
      price_per_person: 0,
      currency: "RWF",
      location: "",
      images: [],
    });
  };

  const createVehicle = async () => {
    if (!user) return;
    if (!vehicleForm.title.trim()) {
      toast({ variant: "destructive", title: "Vehicle title required" });
      return;
    }
    const first = vehicleForm.media?.[0] ?? vehicleForm.image_url ?? "";
    const payload = {
      created_by: user.id,
      provider_name: vehicleForm.provider_name.trim() || null,
      title: vehicleForm.title.trim(),
      vehicle_type: vehicleForm.vehicle_type,
      seats: Number(vehicleForm.seats || 0),
      price_per_day: Number(vehicleForm.price_per_day || 0),
      currency: vehicleForm.currency,
      driver_included: Boolean(vehicleForm.driver_included),
      image_url: first || null,
      media: vehicleForm.media ?? (first ? [first] : []),
      is_published: true,
    } as const;
    const { error } = await supabase.from("transport_vehicles").insert(payload);
    if (error) {
      logError("host.transportVehicles.insert", error);
      toast({
        variant: "destructive",
        title: "Could not create vehicle",
        description: uiErrorMessage(error, "Please try again."),
      });
      return;
    }
    toast({ title: "Transport vehicle created", description: "Your vehicle is now visible on the Transport page." });
  };

  const createRoute = async () => {
    if (!user) return;
    if (!routeForm.from_location.trim() || !routeForm.to_location.trim()) {
      toast({ variant: "destructive", title: "Route locations required" });
      return;
    }
    const payload = {
      created_by: user.id,
      from_location: routeForm.from_location.trim(),
      to_location: routeForm.to_location.trim(),
      distance_km: Number(routeForm.distance_km || 0),
      duration_minutes: Number(routeForm.duration_minutes || 0),
      base_price: Number(routeForm.base_price || 0),
      currency: routeForm.currency,
      is_published: true,
    } as const;
    const { error } = await supabase.from("transport_routes").insert(payload);
    if (error) {
      logError("host.transportRoutes.insert", error);
      toast({
        variant: "destructive",
        title: "Could not create route",
        description: uiErrorMessage(error, "Please try again."),
      });
      return;
    }
    toast({ title: "Transport route created", description: "Your route is now visible on the Transport page." });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this property from the website? This will unpublish it (no data will be deleted).")) return;

    const { error } = await supabase
      .from("properties")
      .update({ is_published: false })
      .eq("id", id);

    if (error) {
      logError("host.properties.unpublish", error);
      toast({ variant: "destructive", title: "Error", description: uiErrorMessage(error, "Please try again.") });
    } else {
      toast({ title: "Success", description: "Property removed from public view." });
      fetchData();
    }
  };

  const togglePublish = async (property: Property) => {
    const { error } = await supabase
      .from("properties")
      .update({ is_published: !property.is_published })
      .eq("id", property.id);

    if (error) {
      logError("host.properties.togglePublish", error);
      toast({ variant: "destructive", title: "Error", description: uiErrorMessage(error, "Please try again.") });
    } else {
      toast({
        title: property.is_published ? "Unpublished" : "Published",
        description: `Property is now ${property.is_published ? "hidden" : "visible"} to guests.`,
      });
      fetchData();
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      logError("host.bookings.updateStatus", error);
      toast({ variant: "destructive", title: "Error", description: uiErrorMessage(error, "Please try again.") });
    } else {
      toast({ title: "Success", description: `Booking ${status}.` });
      fetchData();
    }
  };

  if (authLoading || (!isHost && user)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          {!isHost && user ? (
            <div className="max-w-md mx-auto">
              <Home className="w-16 h-16 mx-auto text-primary mb-6" />
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Become a Host
              </h1>
              <p className="text-muted-foreground mb-6">
                Start earning by listing your property on Merry360X. Join our community of hosts and welcome guests from around the world.
              </p>
              <Button onClick={handleBecomeHost} size="lg">
                Apply to become a host
              </Button>
            </div>
          ) : (
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // Stats
  const totalEarnings = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + Number(b.total_price), 0);
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const publishedProperties = properties.filter((p) => p.is_published).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <Card className="p-5 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Host Portal</div>
                  <div className="text-xs text-muted-foreground">Manage your listings</div>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setNav("dashboard")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    nav === "dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setNav("properties")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    nav === "properties" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  My Properties
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNav("add-property");
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    nav === "add-property" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Property
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNav("create-tour");
                    setIsTourDialogOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    nav === "create-tour" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Create Tour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNav("create-transport");
                    setIsTransportDialogOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    nav === "create-transport" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Car className="w-4 h-4" />
                  Create Transport
                </button>
              </div>
            </Card>
          </aside>

          <div className="lg:col-span-9">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Host Dashboard</h1>
                <p className="text-muted-foreground">Manage your properties and bookings</p>
              </div>

              {/* Tour dialog */}
              <Dialog open={isTourDialogOpen} onOpenChange={setIsTourDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Tour</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input value={tourForm.title} onChange={(e) => setTourForm((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={tourForm.location} onChange={(e) => setTourForm((p) => ({ ...p, location: e.target.value }))} placeholder="Kigali, Musanze..." />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={tourForm.description} onChange={(e) => setTourForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Category</Label>
                        <select
                          value={tourForm.category}
                          onChange={(e) => setTourForm((p) => ({ ...p, category: e.target.value }))}
                          className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                        >
                          <option>Nature</option>
                          <option>Adventure</option>
                          <option>Cultural</option>
                          <option>Wildlife</option>
                          <option>Historical</option>
                        </select>
                      </div>
                      <div>
                        <Label>Difficulty</Label>
                        <select
                          value={tourForm.difficulty}
                          onChange={(e) => setTourForm((p) => ({ ...p, difficulty: e.target.value }))}
                          className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                        >
                          <option>Easy</option>
                          <option>Moderate</option>
                          <option>Hard</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Duration (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={tourForm.duration_days}
                          onChange={(e) => setTourForm((p) => ({ ...p, duration_days: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label>Price / person</Label>
                        <Input
                          type="number"
                          min={0}
                          value={tourForm.price_per_person}
                          onChange={(e) => setTourForm((p) => ({ ...p, price_per_person: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <select
                          value={tourForm.currency}
                          onChange={(e) => setTourForm((p) => ({ ...p, currency: e.target.value }))}
                          className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                        >
                          <option>RWF</option>
                          <option>USD</option>
                          <option>EUR</option>
                          <option>GBP</option>
                          <option>CNY</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label>Media (images/videos)</Label>
                      <div className="mt-2 space-y-3">
                        <CloudinaryUploadDialog
                          title="Upload tour media"
                          folder="merry360/tours"
                          accept="image/*,video/*"
                          multiple
                          maxFiles={12}
                          buttonLabel="Upload tour media"
                          value={tourForm.images}
                          onChange={(urls) => setTourForm((p) => ({ ...p, images: urls }))}
                        />
                        <p className="text-sm text-muted-foreground">Optional. You can add images and videos.</p>
                        <MediaReorderGrid
                          value={tourForm.images}
                          onChange={(next) => setTourForm((p) => ({ ...p, images: next }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => setIsTourDialogOpen(false)}>Cancel</Button>
                      <Button onClick={createTour}>Create Tour</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Transport dialog */}
              <Dialog open={isTransportDialogOpen} onOpenChange={setIsTransportDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Transport</DialogTitle>
                  </DialogHeader>

                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      type="button"
                      variant={transportMode === "vehicle" ? "default" : "outline"}
                      onClick={() => setTransportMode("vehicle")}
                    >
                      Vehicle
                    </Button>
                    <Button
                      type="button"
                      variant={transportMode === "route" ? "default" : "outline"}
                      onClick={() => setTransportMode("route")}
                    >
                      Route
                    </Button>
                  </div>

                  {transportMode === "vehicle" ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Provider name</Label>
                        <Input value={vehicleForm.provider_name} onChange={(e) => setVehicleForm((p) => ({ ...p, provider_name: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Title</Label>
                        <Input value={vehicleForm.title} onChange={(e) => setVehicleForm((p) => ({ ...p, title: e.target.value }))} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Vehicle type</Label>
                          <select
                            value={vehicleForm.vehicle_type}
                            onChange={(e) => setVehicleForm((p) => ({ ...p, vehicle_type: e.target.value }))}
                            className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                          >
                            <option>Sedan</option>
                            <option>SUV</option>
                            <option>Van</option>
                          </select>
                        </div>
                        <div>
                          <Label>Seats</Label>
                          <Input type="number" min={1} value={vehicleForm.seats} onChange={(e) => setVehicleForm((p) => ({ ...p, seats: Number(e.target.value) }))} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Price per day</Label>
                          <Input type="number" min={0} value={vehicleForm.price_per_day} onChange={(e) => setVehicleForm((p) => ({ ...p, price_per_day: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label>Currency</Label>
                          <select
                            value={vehicleForm.currency}
                            onChange={(e) => setVehicleForm((p) => ({ ...p, currency: e.target.value }))}
                            className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                          >
                            <option>RWF</option>
                            <option>USD</option>
                            <option>EUR</option>
                            <option>GBP</option>
                            <option>CNY</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <div className="font-medium text-foreground">Driver included</div>
                          <div className="text-sm text-muted-foreground">Toggle whether a driver is included.</div>
                        </div>
                        <Switch checked={vehicleForm.driver_included} onCheckedChange={(v) => setVehicleForm((p) => ({ ...p, driver_included: v }))} />
                      </div>

                      <div>
                        <Label>Vehicle media (images/videos)</Label>
                        <div className="mt-2 space-y-3">
                          <CloudinaryUploadDialog
                            title="Upload vehicle media"
                            folder="merry360/transport/vehicles"
                            accept="image/*,video/*"
                            multiple
                            maxFiles={12}
                            buttonLabel={(vehicleForm.media?.length ?? 0) ? "Replace / add media" : "Upload vehicle media"}
                            value={vehicleForm.media ?? (vehicleForm.image_url ? [vehicleForm.image_url] : [])}
                            onChange={(urls) =>
                              setVehicleForm((p) => ({ ...p, media: urls, image_url: urls[0] ?? p.image_url }))
                            }
                          />
                          <p className="text-sm text-muted-foreground">Optional. You can add images and videos.</p>
                          <MediaReorderGrid
                            value={vehicleForm.media ?? []}
                            onChange={(next) => setVehicleForm((p) => ({ ...p, media: next, image_url: next[0] ?? p.image_url }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsTransportDialogOpen(false)}>Cancel</Button>
                        <Button
                          onClick={async () => {
                            await createVehicle();
                            setIsTransportDialogOpen(false);
                            setVehicleForm({
                              provider_name: "",
                              title: "",
                              vehicle_type: "Sedan",
                              seats: 4,
                              price_per_day: 0,
                              currency: "RWF",
                              driver_included: true,
                              image_url: "",
                              media: [],
                            });
                          }}
                        >
                          Create Vehicle
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>From</Label>
                          <Input value={routeForm.from_location} onChange={(e) => setRouteForm((p) => ({ ...p, from_location: e.target.value }))} />
                        </div>
                        <div>
                          <Label>To</Label>
                          <Input value={routeForm.to_location} onChange={(e) => setRouteForm((p) => ({ ...p, to_location: e.target.value }))} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Distance (km)</Label>
                          <Input type="number" min={0} value={routeForm.distance_km} onChange={(e) => setRouteForm((p) => ({ ...p, distance_km: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label>Duration (minutes)</Label>
                          <Input type="number" min={0} value={routeForm.duration_minutes} onChange={(e) => setRouteForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Base price</Label>
                          <Input type="number" min={0} value={routeForm.base_price} onChange={(e) => setRouteForm((p) => ({ ...p, base_price: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label>Currency</Label>
                          <select
                            value={routeForm.currency}
                            onChange={(e) => setRouteForm((p) => ({ ...p, currency: e.target.value }))}
                            className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                          >
                            <option>RWF</option>
                            <option>USD</option>
                            <option>EUR</option>
                          <option>GBP</option>
                          <option>CNY</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsTransportDialogOpen(false)}>Cancel</Button>
                        <Button
                          onClick={async () => {
                            await createRoute();
                            setIsTransportDialogOpen(false);
                            setRouteForm({
                              from_location: "",
                              to_location: "",
                              distance_km: 0,
                              duration_minutes: 0,
                              base_price: 0,
                              currency: "RWF",
                            });
                          }}
                        >
                          Create Route
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProperty ? "Edit Property" : "Add New Property"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitProperty} className="space-y-4">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="w-full justify-start flex-wrap">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="media">Media</TabsTrigger>
                        <TabsTrigger value="pricing">Pricing</TabsTrigger>
                        <TabsTrigger value="capacity">Capacity</TabsTrigger>
                        <TabsTrigger value="policies">Policies</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Title</Label>
                            <Input
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              placeholder="Lakeside Luxury Suite"
                              required
                            />
                          </div>
                          <div>
                            <Label>Location</Label>
                            <Input
                              value={formData.location}
                              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                              placeholder="Kigali, Rwanda"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe your property..."
                            rows={4}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Property Type</Label>
                            <select
                              value={formData.property_type}
                              onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                              className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                            >
                              <option>Hotel</option>
                              <option>Villa</option>
                              <option>Lodge</option>
                              <option>Guesthouse</option>
                              <option>Apartment</option>
                              <option>Resort</option>
                            </select>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="media" className="mt-4 space-y-3">
                        <Label>Media (images/videos)</Label>
                        <CloudinaryUploadDialog
                          title="Upload property media"
                          folder="merry360/properties"
                          accept="image/*,video/*"
                          multiple
                          maxFiles={16}
                          buttonLabel="Upload media"
                          value={formData.images ?? []}
                          onChange={(urls) => setFormData((p) => ({ ...p, images: urls }))}
                        />
                        <p className="text-sm text-muted-foreground">
                          Tip: the <span className="font-medium">first</span> item is used as the cover photo.
                        </p>
                        <MediaReorderGrid
                          value={formData.images ?? []}
                          onChange={(next) => setFormData((p) => ({ ...p, images: next }))}
                        />
                      </TabsContent>

                      <TabsContent value="pricing" className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Currency</Label>
                            <select
                              value={formData.currency}
                              onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value }))}
                              className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                            >
                              <option>RWF</option>
                              <option>USD</option>
                              <option>EUR</option>
                              <option>GBP</option>
                              <option>CNY</option>
                            </select>
                          </div>
                          <div>
                            <Label>Price per Night</Label>
                            <Input
                              type="number"
                              value={formData.price_per_night}
                              onChange={(e) => setFormData({ ...formData, price_per_night: Number(e.target.value) })}
                              min={0}
                              required
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="capacity" className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label>Max Guests</Label>
                            <Input
                              type="number"
                              value={formData.max_guests}
                              onChange={(e) => setFormData({ ...formData, max_guests: Number(e.target.value) })}
                              min={1}
                              required
                            />
                          </div>
                          <div>
                            <Label>Bedrooms</Label>
                            <Input
                              type="number"
                              value={formData.bedrooms}
                              onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                              min={0}
                            />
                          </div>
                          <div>
                            <Label>Beds</Label>
                            <Input
                              type="number"
                              value={formData.beds}
                              onChange={(e) => setFormData({ ...formData, beds: Number(e.target.value) })}
                              min={0}
                            />
                          </div>
                          <div>
                            <Label>Bathrooms</Label>
                            <Input
                              type="number"
                              value={formData.bathrooms}
                              onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                              min={0}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="policies" className="mt-4 space-y-4">
                        <div>
                          <Label>Cancellation policy</Label>
                          <select
                            value={formData.cancellation_policy}
                            onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
                            className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                          >
                            <option value="fair">Fair</option>
                            <option value="strict">Strict</option>
                            <option value="lenient">Lenient</option>
                          </select>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <Button type="submit" className="w-full">
                      {editingProperty ? "Update Property" : "Create Property"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Properties</p>
                <p className="text-2xl font-bold text-foreground">{properties.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-foreground">{publishedProperties}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{pendingBookings}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatMoney(Number(totalEarnings), "RWF")}
                </p>
              </div>
            </div>
          </Card>
            </div>

        {/* Properties Table */}
        <div className="bg-card rounded-xl shadow-card mb-8">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Your Properties</h2>
          </div>
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : properties.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No properties yet. Click "Add Property" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {properties.map((property) => (
                    <tr key={property.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{property.title}</p>
                          <p className="text-sm text-muted-foreground">{property.property_type}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{property.location}</td>
                      <td className="px-6 py-4 text-foreground">
                        {Number(property.price_per_night).toLocaleString()} {property.currency ?? "RWF"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            property.is_published
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {property.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(`/properties/${property.id}`, "_blank")}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Preview"
                          >
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => togglePublish(property)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title={property.is_published ? "Unpublish" : "Publish"}
                          >
                            {property.is_published ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(property)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDelete(property.id)}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Remove from website"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bookings Table */}
        <div className="bg-card rounded-xl shadow-card">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Recent Bookings</h2>
          </div>
          {bookings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No bookings yet. Once guests book your properties, they'll appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Guests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {booking.properties?.title || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(booking.check_in).toLocaleDateString()} -{" "}
                        {new Date(booking.check_out).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {booking.guests_count}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {formatMoney(Number(booking.total_price), String((booking as any).currency ?? "RWF"))}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {booking.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateBookingStatus(booking.id, "confirmed")}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingStatus(booking.id, "cancelled")}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HostDashboard;
