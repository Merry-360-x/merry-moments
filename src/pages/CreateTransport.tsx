import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { uploadFile } from "@/lib/uploads";

const vehicleTypes = [
  "Sedan",
  "SUV",
  "Van",
  "Minibus",
  "Bus",
  "Luxury Car",
  "4x4",
  "Motorcycle",
];

const commonRoutes = [
  { from: "Kigali", to: "Musanze" },
  { from: "Kigali", to: "Rubavu (Gisenyi)" },
  { from: "Kigali", to: "Rusizi (Cyangugu)" },
  { from: "Kigali", to: "Huye (Butare)" },
  { from: "Kigali", to: "Nyanza" },
  { from: "Kigali", to: "Karongi (Kibuye)" },
  { from: "Kigali", to: "Akagera National Park" },
  { from: "Musanze", to: "Volcanoes National Park" },
];

export default function CreateTransport() {
  const { user, isHost } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vehicle_name: "",
    vehicle_type: "",
    driver_name: "",
    driver_phone: "",
    route_from: "",
    route_to: "",
    address: "",
    description: "",
    capacity: 4,
    price_per_trip: 0,
    price_per_hour: 0,
    currency: "RWF",
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [customRoute, setCustomRoute] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const selectRoute = (route: { from: string; to: string }) => {
    setFormData({
      ...formData,
      route_from: route.from,
      route_to: route.to,
    });
    setCustomRoute(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !isHost) {
      toast({
        title: "Authorization Required",
        description: "You must be a host to create transport services.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.vehicle_name || !formData.driver_name || !formData.route_from || !formData.route_to) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload images
      const uploadedImageUrls: string[] = [];
      for (const image of images) {
        try {
          const result = await uploadFile(image, { folder: "transport" });
          uploadedImageUrls.push(result.url);
        } catch (err) {
          console.error("Image upload failed:", err);
        }
      }

      // Create transport service
      const { data, error } = await supabase
        .from("transport")
        .insert({
          vehicle_name: formData.vehicle_name,
          vehicle_type: formData.vehicle_type,
          driver_name: formData.driver_name,
          driver_phone: formData.driver_phone,
          route_from: formData.route_from,
          route_to: formData.route_to,
          address: formData.address,
          description: formData.description,
          capacity: formData.capacity,
          price_per_trip: formData.price_per_trip,
          price_per_hour: formData.price_per_hour,
          currency: formData.currency,
          images: uploadedImageUrls,
          host_id: user.id,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Transport Service Created!",
        description: "Your transport service has been created successfully.",
      });

      navigate("/host-dashboard");
    } catch (error) {
      console.error("Failed to create transport service:", error);
      toast({
        title: "Error",
        description: "Failed to create transport service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!user || !isHost) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You must be a host to create transport services.
          </p>
          <Button onClick={() => navigate("/become-host")}>Become a Host</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Create Transport Service</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vehicleName">Vehicle Name *</Label>
                <Input
                  id="vehicleName"
                  value={formData.vehicle_name}
                  onChange={(e) => setFormData({ ...formData, vehicle_name: e.target.value })}
                  placeholder="Toyota Land Cruiser"
                  required
                />
              </div>

              <div>
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="capacity">Passenger Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your vehicle and service..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          <Card>
            <CardHeader>
              <CardTitle>Driver Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="driverName">Driver Name *</Label>
                <Input
                  id="driverName"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="driverPhone">Driver Phone</Label>
                <Input
                  id="driverPhone"
                  type="tel"
                  value={formData.driver_phone}
                  onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                  placeholder="+250 XXX XXX XXX"
                />
              </div>

              <div>
                <Label htmlFor="address">Pickup Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Detailed pickup location address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Route Information */}
          <Card>
            <CardHeader>
              <CardTitle>Route Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select a Popular Route</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {commonRoutes.map((route, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectRoute(route)}
                      className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted text-left"
                    >
                      {route.from} → {route.to}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <button
                  type="button"
                  onClick={() => setCustomRoute(!customRoute)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {customRoute ? "Use popular routes" : "Or enter custom route"}
                </button>
                <div className="h-px flex-1 bg-border" />
              </div>

              {customRoute && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="routeFrom">From *</Label>
                    <Input
                      id="routeFrom"
                      value={formData.route_from}
                      onChange={(e) => setFormData({ ...formData, route_from: e.target.value })}
                      placeholder="Start location"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="routeTo">To *</Label>
                    <Input
                      id="routeTo"
                      value={formData.route_to}
                      onChange={(e) => setFormData({ ...formData, route_to: e.target.value })}
                      placeholder="Destination"
                      required
                    />
                  </div>
                </div>
              )}

              {!customRoute && formData.route_from && formData.route_to && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Selected Route: {formData.route_from} → {formData.route_to}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricePerTrip">Price per Trip</Label>
                  <Input
                    id="pricePerTrip"
                    type="number"
                    min="0"
                    value={formData.price_per_trip}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_trip: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="pricePerHour">Price per Hour (Optional)</Label>
                  <Input
                    id="pricePerHour"
                    type="number"
                    min="0"
                    value={formData.price_per_hour}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_hour: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RWF">RWF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Creating..." : "Create Transport Service"}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
