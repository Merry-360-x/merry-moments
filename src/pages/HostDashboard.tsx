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
  guests: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  property_id: string;
  guest_id: string;
}

const propertyTypes = ["Hotel", "Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "Motel"];
const currencies = ["RWF", "USD", "EUR", "GBP", "CNY"];
const amenitiesList = ["WiFi", "Pool", "Parking", "Kitchen", "Breakfast", "AC", "Gym", "Spa", "TV", "Laundry"];
const cancellationPolicies = [
  { value: "strict", label: "Strict" },
  { value: "fair", label: "Fair" },
  { value: "lenient", label: "Lenient" },
];
const vehicleTypes = ["Sedan", "SUV", "Van", "Bus", "Minibus", "Motorcycle"];
const tourCategories = ["Nature", "Adventure", "Cultural", "Wildlife", "Historical"];
const tourDifficulties = ["Easy", "Moderate", "Hard"];

export default function HostDashboard() {
  const { user, isHost, isLoading: authLoading } = useAuth();
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

  // New item states
  const [showNewProperty, setShowNewProperty] = useState(false);
  const [showNewTour, setShowNewTour] = useState(false);
  const [showNewVehicle, setShowNewVehicle] = useState(false);

  // Upload dialogs
  const [propertyUploadOpen, setPropertyUploadOpen] = useState<string | null>(null);
  const [tourUploadOpen, setTourUploadOpen] = useState<string | null>(null);
  const [vehicleUploadOpen, setVehicleUploadOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/host-dashboard");
    }
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const [propsRes, toursRes, vehiclesRes, bookingsRes] = await Promise.all([
      supabase.from("properties").select("*").eq("host_id", user.id).order("created_at", { ascending: false }),
      supabase.from("tours").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
      supabase.from("transport_vehicles").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
      supabase.from("bookings").select("*").eq("host_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (propsRes.data) setProperties(propsRes.data as Property[]);
    if (toursRes.data) setTours(toursRes.data as Tour[]);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data as Vehicle[]);
    if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);

    setIsLoading(false);
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

  const createProperty = async (data: Partial<Property>) => {
    const { error, data: newProp } = await supabase
      .from("properties")
      .insert({ ...data, host_id: user!.id, is_published: false })
      .select()
      .single();
    if (error) {
      logError("host.property.create", error);
      toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
      return null;
    }
    setProperties((prev) => [newProp as Property, ...prev]);
    toast({ title: "Created", description: "Property created. You can now edit and publish it." });
    return newProp;
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
    toast({ title: "Saved", description: "Tour updated successfully." });
    return true;
  };

  const createTour = async (data: Partial<Tour>) => {
    const { error, data: newTour } = await supabase
      .from("tours")
      .insert({ ...data, created_by: user!.id, is_published: true })
      .select()
      .single();
    if (error) {
      logError("host.tour.create", error);
      toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
      return null;
    }
    setTours((prev) => [newTour as Tour, ...prev]);
    toast({ title: "Created", description: "Tour created and published." });
    return newTour;
  };

  const deleteTour = async (id: string) => {
    if (!confirm("Delete this tour permanently?")) return;
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
    toast({ title: "Saved", description: "Vehicle updated successfully." });
    return true;
  };

  const createVehicle = async (data: Partial<Vehicle>) => {
    const { error, data: newVehicle } = await supabase
      .from("transport_vehicles")
      .insert({ ...data, created_by: user!.id, is_published: true })
      .select()
      .single();
    if (error) {
      logError("host.vehicle.create", error);
      toast({ variant: "destructive", title: "Create failed", description: uiErrorMessage(error) });
      return null;
    }
    setVehicles((prev) => [newVehicle as Vehicle, ...prev]);
    toast({ title: "Created", description: "Vehicle created and published." });
    return newVehicle;
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Delete this vehicle permanently?")) return;
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
    toast({ title: "Booking updated", description: `Status changed to ${status}.` });
  };

  // Stats
  const totalEarnings = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + Number(b.total_price), 0);
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const publishedProperties = properties.filter((p) => p.is_published).length;

  // Inline editable property card
  const PropertyCard = ({ property }: { property: Property }) => {
    const isEditing = editingPropertyId === property.id;
    const [form, setForm] = useState(property);

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
        {/* Image */}
        <div className="relative h-40 bg-muted">
          {form.images?.[0] ? (
            <img src={form.images[0]} alt={form.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
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
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Property title"
                className="font-semibold"
              />
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Location"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Price/night</Label>
                  <Input
                    type="number"
                    value={form.price_per_night}
                    onChange={(e) => setForm((f) => ({ ...f, price_per_night: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={form.currency || "RWF"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Guests</Label>
                  <Input type="number" min={1} value={form.max_guests} onChange={(e) => setForm((f) => ({ ...f, max_guests: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">Beds</Label>
                  <Input type="number" min={0} value={form.beds || 0} onChange={(e) => setForm((f) => ({ ...f, beds: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">Bedrooms</Label>
                  <Input type="number" min={0} value={form.bedrooms} onChange={(e) => setForm((f) => ({ ...f, bedrooms: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-xs">Baths</Label>
                  <Input type="number" min={0} value={form.bathrooms} onChange={(e) => setForm((f) => ({ ...f, bathrooms: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cancellation Policy</Label>
                <Select value={form.cancellation_policy || "fair"} onValueChange={(v) => setForm((f) => ({ ...f, cancellation_policy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cancellationPolicies.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description"
                rows={3}
              />
              <div>
                <Label className="text-xs">Amenities</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {amenitiesList.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        amenities: (f.amenities || []).includes(a)
                          ? (f.amenities || []).filter((x) => x !== a)
                          : [...(f.amenities || []), a],
                      }))}
                      className={`px-2 py-0.5 text-xs rounded-full border ${
                        (form.amenities || []).includes(a)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Images ({(form.images || []).length})</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(form.images || []).map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded overflow-hidden">
                      {isVideoUrl(img) ? (
                        <video src={img} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={img} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, images: (f.images || []).filter((_, j) => j !== i) }))}
                        className="absolute top-0 right-0 w-5 h-5 bg-black/50 text-white text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPropertyUploadOpen(property.id)}
                    className="w-16 h-16 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_published}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                  />
                  <span className="text-sm">{form.is_published ? "Published" : "Draft"}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingPropertyId(null)}>
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-3 h-3 mr-1" /> Save
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">{property.location}</p>
                </div>
                <span className="text-primary font-bold">
                  {formatMoney(property.price_per_night, property.currency || "RWF")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{property.max_guests} guests</span>
                <span>{property.bedrooms} bed</span>
                <span>{property.bathrooms} bath</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Link to={`/properties/${property.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View
                </Link>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingPropertyId(property.id)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateProperty(property.id, { is_published: !property.is_published })}>
                    {property.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteProperty(property.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Upload dialog */}
        <CloudinaryUploadDialog
          open={propertyUploadOpen === property.id}
          onOpenChange={(open) => setPropertyUploadOpen(open ? property.id : null)}
          onUploadComplete={(urls) => {
            setForm((f) => ({ ...f, images: [...(f.images || []), ...urls] }));
            setPropertyUploadOpen(null);
          }}
          multiple
          accept="image/*,video/*"
          title="Upload Property Media"
        />
      </Card>
    );
  };

  // Tour Card
  const TourCard = ({ tour }: { tour: Tour }) => {
    const isEditing = editingTourId === tour.id;
    const [form, setForm] = useState(tour);

    const handleSave = async () => {
      const success = await updateTour(tour.id, {
        title: form.title,
        description: form.description,
        location: form.location,
        category: form.category,
        difficulty: form.difficulty,
        duration_days: form.duration_days,
        price_per_person: form.price_per_person,
        currency: form.currency,
        images: form.images,
        is_published: form.is_published,
      });
      if (success) setEditingTourId(null);
    };

    return (
      <Card className="overflow-hidden">
        <div className="relative h-32 bg-muted">
          {form.images?.[0] ? (
            <img src={form.images[0]} alt={form.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {form.is_published && <Badge className="absolute top-2 right-2 bg-green-500">Live</Badge>}
        </div>

        <div className="p-4 space-y-2">
          {isEditing ? (
            <>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Tour title" />
              <Input value={form.location || ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.category || "Nature"} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tourCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.difficulty || "Moderate"} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tourDifficulties.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" min={1} value={form.duration_days || 1} onChange={(e) => setForm((f) => ({ ...f, duration_days: Number(e.target.value) }))} placeholder="Days" />
                <Input type="number" value={form.price_per_person} onChange={(e) => setForm((f) => ({ ...f, price_per_person: Number(e.target.value) }))} placeholder="Price" />
                <Select value={form.currency || "RWF"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} />
              <div className="flex items-center justify-between pt-2">
                <Switch checked={form.is_published ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingTourId(null)}><X className="w-3 h-3" /></Button>
                  <Button size="sm" onClick={handleSave}><Save className="w-3 h-3" /></Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold">{tour.title}</h3>
              <p className="text-sm text-muted-foreground">{tour.location}</p>
              <div className="flex items-center justify-between">
                <span className="text-primary font-bold">{formatMoney(tour.price_per_person, tour.currency || "RWF")}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingTourId(tour.id)}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTour(tour.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    );
  };

  // Vehicle Card
  const VehicleCard = ({ vehicle }: { vehicle: Vehicle }) => {
    const isEditing = editingVehicleId === vehicle.id;
    const [form, setForm] = useState(vehicle);

    const handleSave = async () => {
      const success = await updateVehicle(vehicle.id, {
        title: form.title,
        provider_name: form.provider_name,
        vehicle_type: form.vehicle_type,
        seats: form.seats,
        price_per_day: form.price_per_day,
        currency: form.currency,
        driver_included: form.driver_included,
        image_url: form.media?.[0] || form.image_url,
        media: form.media,
        is_published: form.is_published,
      });
      if (success) setEditingVehicleId(null);
    };

    return (
      <Card className="overflow-hidden">
        <div className="relative h-32 bg-muted">
          {(form.media?.[0] || form.image_url) ? (
            <img src={form.media?.[0] || form.image_url || ""} alt={form.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {form.is_published && <Badge className="absolute top-2 right-2 bg-green-500">Live</Badge>}
        </div>

        <div className="p-4 space-y-2">
          {isEditing ? (
            <>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Vehicle title" />
              <Input value={form.provider_name || ""} onChange={(e) => setForm((f) => ({ ...f, provider_name: e.target.value }))} placeholder="Provider name" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.vehicle_type} onValueChange={(v) => setForm((f) => ({ ...f, vehicle_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{vehicleTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min={1} value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))} placeholder="Seats" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={form.price_per_day} onChange={(e) => setForm((f) => ({ ...f, price_per_day: Number(e.target.value) }))} placeholder="Price/day" />
                <Select value={form.currency || "RWF"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.driver_included ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, driver_included: v }))} />
                <span className="text-sm">Driver included</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Switch checked={form.is_published ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingVehicleId(null)}><X className="w-3 h-3" /></Button>
                  <Button size="sm" onClick={handleSave}><Save className="w-3 h-3" /></Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold">{vehicle.title}</h3>
              <p className="text-sm text-muted-foreground">{vehicle.provider_name} · {vehicle.vehicle_type} · {vehicle.seats} seats</p>
              <div className="flex items-center justify-between">
                <span className="text-primary font-bold">{formatMoney(vehicle.price_per_day, vehicle.currency || "RWF")}/day</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingVehicleId(vehicle.id)}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteVehicle(vehicle.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    );
  };

  // New Property Form
  const NewPropertyForm = () => {
    const [form, setForm] = useState({
      title: "",
      location: "",
      property_type: "Apartment",
      price_per_night: 50000,
      currency: "RWF",
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
    });

    const handleCreate = async () => {
      if (!form.title.trim()) {
        toast({ variant: "destructive", title: "Title required" });
        return;
      }
      const result = await createProperty(form);
      if (result) {
        setShowNewProperty(false);
        setEditingPropertyId(result.id);
      }
    };

    return (
      <Card className="p-4 border-2 border-dashed border-primary/50">
        <h3 className="font-semibold mb-3">New Property</h3>
        <div className="space-y-3">
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Property title" />
          <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={form.price_per_night} onChange={(e) => setForm((f) => ({ ...f, price_per_night: Number(e.target.value) }))} placeholder="Price/night" />
            <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewProperty(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Card>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isHost && user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <Home className="w-16 h-16 mx-auto text-primary mb-6" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Become a Host</h1>
          <p className="text-muted-foreground mb-6">
            Start earning by listing your property. Join our community of hosts.
          </p>
          <Button onClick={() => navigate("/become-host")} size="lg">Apply to become a host</Button>
        </div>
        <Footer />
      </div>
    );
  }

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
            <TabsTrigger value="properties">Properties ({properties.length})</TabsTrigger>
            <TabsTrigger value="tours">Tours ({tours.length})</TabsTrigger>
            <TabsTrigger value="transport">Transport ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
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
                    <p className="text-xl font-bold">{publishedProperties} / {properties.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Bookings</p>
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
                    <p className="text-xl font-bold">{bookings.length}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent bookings */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Recent Bookings</h3>
              {bookings.length === 0 ? (
                <p className="text-muted-foreground">No bookings yet</p>
              ) : (
                <div className="space-y-2">
                  {bookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{b.check_in} → {b.check_out}</p>
                        <p className="text-sm text-muted-foreground">{b.guests} guests · {formatMoney(b.total_price, b.currency)}</p>
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
              <Button onClick={() => setShowNewProperty(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Property
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {showNewProperty && <NewPropertyForm />}
              {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
              {properties.length === 0 && !showNewProperty && (
                <p className="text-muted-foreground col-span-full text-center py-8">No properties yet. Add your first property!</p>
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
              {tours.map((t) => <TourCard key={t.id} tour={t} />)}
              {tours.length === 0 && (
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
              {vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
              {vehicles.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">No vehicles yet</p>
              )}
            </div>
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings">
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No bookings yet</p>
              ) : (
                bookings.map((b) => (
                  <Card key={b.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{b.check_in} → {b.check_out}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{b.guests} guests</span>
                          <span className="font-medium text-foreground">{formatMoney(b.total_price, b.currency)}</span>
                        </div>
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
