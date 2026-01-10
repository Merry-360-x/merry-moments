import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/cloudinary";
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  property_type: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
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
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<
    { done: number; total: number } | null
  >(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    property_type: "Hotel",
    price_per_night: 50000,
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
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
        toast({ variant: "destructive", title: "Error", description: error.message });
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
        toast({ variant: "destructive", title: "Error", description: error.message });
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
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
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
      max_guests: property.max_guests,
      bedrooms: property.bedrooms || 1,
      bathrooms: property.bathrooms || 1,
      images: property.images ?? [],
    });
    setEditingProperty(property);
    setIsDialogOpen(true);
  };

  const handleImageFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!isCloudinaryConfigured()) {
      toast({
        variant: "destructive",
        title: "Cloudinary not configured",
        description:
          "Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env.local (or .env).",
      });
      return;
    }

    const fileArray = Array.from(files);
    setIsUploadingImages(true);
    setImageUploadProgress({ done: 0, total: fileArray.length });

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const result = await uploadImageToCloudinary(file, { folder: "merry360/properties" });
        if (result.secureUrl) uploadedUrls.push(result.secureUrl);
        setImageUploadProgress({ done: i + 1, total: fileArray.length });
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images ?? []), ...uploadedUrls],
        }));
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Image upload failed",
        description: err instanceof Error ? err.message : "Couldn’t upload images right now.",
      });
    } finally {
      setIsUploadingImages(false);
      setImageUploadProgress(null);
    }
  };

  const removeImageAtIndex = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Property deleted." });
      fetchData();
    }
  };

  const togglePublish = async (property: Property) => {
    const { error } = await supabase
      .from("properties")
      .update({ is_published: !property.is_published })
      .eq("id", property.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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
      toast({ variant: "destructive", title: "Error", description: error.message });
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Host Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your properties and bookings
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProperty ? "Edit Property" : "Add New Property"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitProperty} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Lakeside Luxury Suite"
                    required
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Kigali, Rwanda"
                    required
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe your property..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Images</Label>
                  <div className="mt-2 space-y-3">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploadingImages}
                      onChange={(e) => handleImageFilesSelected(e.target.files)}
                    />

                    {isUploadingImages && imageUploadProgress ? (
                      <p className="text-sm text-muted-foreground">
                        Uploading {imageUploadProgress.done}/{imageUploadProgress.total}...
                      </p>
                    ) : null}

                    {(formData.images?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {formData.images.map((url, idx) => (
                          <div
                            key={`${url}-${idx}`}
                            className="relative rounded-md overflow-hidden border border-border"
                          >
                            <img
                              src={url}
                              alt={`Property image ${idx + 1}`}
                              className="h-20 w-full object-cover"
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={() => removeImageAtIndex(idx)}
                              className="absolute top-1 right-1 rounded bg-background/80 px-2 py-1 text-xs text-foreground hover:bg-background"
                              title="Remove"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Upload at least one image to show on listings.
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Property Type</Label>
                    <select
                      value={formData.property_type}
                      onChange={(e) =>
                        setFormData({ ...formData, property_type: e.target.value })
                      }
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
                  <div>
                    <Label>Price per Night (RWF)</Label>
                    <Input
                      type="number"
                      value={formData.price_per_night}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_per_night: Number(e.target.value),
                        })
                      }
                      min={1000}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Max Guests</Label>
                    <Input
                      type="number"
                      value={formData.max_guests}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_guests: Number(e.target.value),
                        })
                      }
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <Label>Bedrooms</Label>
                    <Input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bedrooms: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div>
                    <Label>Bathrooms</Label>
                    <Input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bathrooms: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingProperty ? "Update Property" : "Create Property"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Properties</p>
                <p className="text-2xl font-bold text-foreground">{properties.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-foreground">{publishedProperties}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{pendingBookings}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalEarnings.toLocaleString()} RWF
                </p>
              </div>
            </div>
          </div>
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
                        {Number(property.price_per_night).toLocaleString()} RWF
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
                        {Number(booking.total_price).toLocaleString()} RWF
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

      <Footer />
    </div>
  );
};

export default HostDashboard;
