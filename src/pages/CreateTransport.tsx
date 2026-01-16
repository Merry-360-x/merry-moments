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

export default function CreateTransport() {
  const { user, isHost } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    vehicle_type: "",
    provider_name: "",
    description: "",
    seats: 4,
    price_per_day: 0,
    currency: "RWF",
    driver_included: true,
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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

    if (!formData.title || !formData.vehicle_type) {
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
        .from("transport_vehicles")
        .insert({
          title: formData.title,
          vehicle_type: formData.vehicle_type,
          provider_name: formData.provider_name || null,
          seats: formData.seats,
          price_per_day: formData.price_per_day,
          currency: formData.currency,
          driver_included: formData.driver_included,
          media: uploadedImageUrls,
          image_url: uploadedImageUrls[0] || null,
          created_by: user.id,
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
                <Label htmlFor="title">Vehicle Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Toyota Land Cruiser - Airport Transfer"
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
                <Label htmlFor="seats">Number of Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  value={formData.seats}
                  onChange={(e) =>
                    setFormData({ ...formData, seats: parseInt(e.target.value) || 4 })
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

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="providerName">Provider/Company Name</Label>
                <Input
                  id="providerName"
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="Optional - Your company name"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="driverIncluded"
                  checked={formData.driver_included}
                  onChange={(e) => setFormData({ ...formData, driver_included: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="driverIncluded" className="cursor-pointer">
                  Driver included (uncheck for self-drive)
                </Label>
              </div>
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
                  <Label htmlFor="pricePerDay">Price per Day *</Label>
                  <Input
                    id="pricePerDay"
                    type="number"
                    min="0"
                    value={formData.price_per_day}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_day: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
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
                      <SelectItem value="USD">$ - US Dollar</SelectItem>
                      <SelectItem value="EUR">€ - Euro</SelectItem>
                      <SelectItem value="GBP">£ - British Pound</SelectItem>
                      <SelectItem value="JPY">¥ - Japanese Yen</SelectItem>
                      <SelectItem value="CNY">¥ - Chinese Yuan</SelectItem>
                      <SelectItem value="CAD">C$ - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">A$ - Australian Dollar</SelectItem>
                      <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                      <SelectItem value="INR">₹ - Indian Rupee</SelectItem>
                      <SelectItem value="KRW">₩ - South Korean Won</SelectItem>
                      <SelectItem value="SGD">S$ - Singapore Dollar</SelectItem>
                      <SelectItem value="HKD">HK$ - Hong Kong Dollar</SelectItem>
                      <SelectItem value="NOK">kr - Norwegian Krone</SelectItem>
                      <SelectItem value="SEK">kr - Swedish Krona</SelectItem>
                      <SelectItem value="DKK">kr - Danish Krone</SelectItem>
                      <SelectItem value="NZD">NZ$ - New Zealand Dollar</SelectItem>
                      <SelectItem value="MXN">$ - Mexican Peso</SelectItem>
                      <SelectItem value="BRL">R$ - Brazilian Real</SelectItem>
                      <SelectItem value="ZAR">R - South African Rand</SelectItem>
                      <SelectItem value="THB">฿ - Thai Baht</SelectItem>
                      <SelectItem value="TRY">₺ - Turkish Lira</SelectItem>
                      <SelectItem value="RUB">₽ - Russian Ruble</SelectItem>
                      <SelectItem value="PLN">zł - Polish Złoty</SelectItem>
                      <SelectItem value="CZK">Kč - Czech Koruna</SelectItem>
                      <SelectItem value="HUF">Ft - Hungarian Forint</SelectItem>
                      <SelectItem value="ILS">₪ - Israeli Shekel</SelectItem>
                      <SelectItem value="AED">د.إ - UAE Dirham</SelectItem>
                      <SelectItem value="SAR">﷼ - Saudi Riyal</SelectItem>
                      <SelectItem value="EGP">£ - Egyptian Pound</SelectItem>
                      <SelectItem value="NGN">₦ - Nigerian Naira</SelectItem>
                      <SelectItem value="KES">KSh - Kenyan Shilling</SelectItem>
                      <SelectItem value="UGX">USh - Ugandan Shilling</SelectItem>
                      <SelectItem value="TZS">TSh - Tanzanian Shilling</SelectItem>
                      <SelectItem value="RWF">FRw - Rwandan Franc</SelectItem>
                      <SelectItem value="GHS">₵ - Ghanaian Cedi</SelectItem>
                      <SelectItem value="MAD">د.م. - Moroccan Dirham</SelectItem>
                      <SelectItem value="ETB">Br - Ethiopian Birr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
            <Button type="submit">
              Create Transport Service
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
