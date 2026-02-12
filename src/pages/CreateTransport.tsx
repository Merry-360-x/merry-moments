import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Save, Loader2, Car, Camera, FileText, Shield, Fuel, Settings, DollarSign } from "lucide-react";
import { uploadFile } from "@/lib/uploads";
import { Checkbox } from "@/components/ui/checkbox";

// Car types
const carTypes = [
  "SUV",
  "Sedan",
  "Hatchback",
  "Coupe",
  "Convertible",
  "Van",
  "Minibus",
  "Bus",
  "Pickup Truck",
  "Luxury Car",
  "Sports Car",
  "Crossover",
];

// Transmission types
const transmissionTypes = [
  { value: "Automatic", label: "Automatic" },
  { value: "Manual", label: "Manual" },
  { value: "Hybrid", label: "Hybrid (CVT)" },
];

// Fuel types
const fuelTypes = [
  { value: "Petrol", label: "Petrol/Gasoline" },
  { value: "Diesel", label: "Diesel" },
  { value: "Electric", label: "Electric" },
  { value: "Hybrid", label: "Hybrid" },
];

// Drivetrain types
const drivetrainTypes = [
  { value: "FWD", label: "FWD (Front-Wheel Drive)" },
  { value: "RWD", label: "RWD (Rear-Wheel Drive)" },
  { value: "AWD", label: "AWD (All-Wheel Drive)" },
  { value: "4WD", label: "4WD (Four-Wheel Drive)" },
];

// Key features options
const keyFeaturesOptions = [
  "Air Conditioning",
  "Bluetooth",
  "GPS Navigation",
  "Backup Camera",
  "Cruise Control",
  "Leather Seats",
  "Sunroof/Moonroof",
  "Heated Seats",
  "Apple CarPlay",
  "Android Auto",
  "USB Ports",
  "WiFi Hotspot",
  "Parking Sensors",
  "Keyless Entry",
  "Push Button Start",
  "Blind Spot Monitor",
  "Lane Departure Warning",
  "Automatic Emergency Braking",
  "Roof Rack",
  "Third Row Seating",
];

// Popular car brands
const carBrands = [
  "Toyota",
  "Honda",
  "Nissan",
  "Mazda",
  "Mitsubishi",
  "Suzuki",
  "Hyundai",
  "Kia",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Volkswagen",
  "Ford",
  "Chevrolet",
  "Jeep",
  "Land Rover",
  "Range Rover",
  "Porsche",
  "Lexus",
  "Infiniti",
  "Subaru",
  "Volvo",
  "Peugeot",
  "Renault",
  "Isuzu",
  "Other",
];

// Generate year options (current year down to 2000)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

export default function CreateTransport() {
  const { user, isHost, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hostProfileComplete, setHostProfileComplete] = useState(false);

  const [formData, setFormData] = useState({
    // Basic info
    title: "",
    provider_name: "",
    description: "",
    
    // Car details
    car_brand: "",
    car_model: "",
    car_year: currentYear,
    car_type: "",
    
    // Technical specs
    seats: 5,
    transmission: "",
    fuel_type: "",
    drive_train: "",
    
    // Pricing
    daily_price: 0,
    weekly_price: 0,
    monthly_price: 0,
    currency: "RWF",
    
    // Service
    driver_included: false,
    
    // Features
    key_features: [] as string[],
  });

  // Images
  const [exteriorImages, setExteriorImages] = useState<File[]>([]);
  const [exteriorPreviews, setExteriorPreviews] = useState<string[]>([]);
  const [interiorImages, setInteriorImages] = useState<File[]>([]);
  const [interiorPreviews, setInteriorPreviews] = useState<string[]>([]);
  
  // Documents
  const [insuranceDoc, setInsuranceDoc] = useState<File | null>(null);
  const [registrationDoc, setRegistrationDoc] = useState<File | null>(null);
  const [roadworthinessDoc, setRoadworthinessDoc] = useState<File | null>(null);
  const [ownerIdDoc, setOwnerIdDoc] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const STORAGE_KEY = 'create_transport_progress';

  // Fetch host profile completion status
  useEffect(() => {
    if (!user) return;
    const checkProfile = async () => {
      const { data } = await supabase
        .from("host_applications")
        .select("profile_complete")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();
      setHostProfileComplete(data?.profile_complete ?? false);
    };
    checkProfile();
  }, [user]);

  // Load saved progress from localStorage on mount
  useEffect(() => {
    if (draftLoaded) return;
    
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.formData) setFormData(parsed.formData);
        setLastSaved(new Date(parsed.timestamp));
        
        toast({
          title: "Progress Restored",
          description: "Your car rental listing draft has been restored.",
          duration: 3000,
        });
      } catch (e) {
        console.error("Failed to restore transport progress:", e);
      }
    }
    setDraftLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLoaded]);

  // Auto-save progress
  useEffect(() => {
    if (!draftLoaded) return;
    if (!formData.title && !formData.car_brand) return;
    
    const timer = setTimeout(() => {
      const dataToSave = {
        formData,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setLastSaved(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, draftLoaded]);

  const handleSaveDraft = () => {
    setIsSaving(true);
    const dataToSave = {
      formData,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    setLastSaved(new Date());
    toast({ title: "Draft saved", description: "Your progress has been saved locally" });
    setTimeout(() => setIsSaving(false), 500);
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // Handle exterior images
  const handleExteriorImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setExteriorImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExteriorPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExteriorImage = (index: number) => {
    setExteriorImages((prev) => prev.filter((_, i) => i !== index));
    setExteriorPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle interior images
  const handleInteriorImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setInteriorImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInteriorPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeInteriorImage = (index: number) => {
    setInteriorImages((prev) => prev.filter((_, i) => i !== index));
    setInteriorPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle feature
  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      key_features: prev.key_features.includes(feature)
        ? prev.key_features.filter((f) => f !== feature)
        : [...prev.key_features, feature],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !isHost) {
      toast({
        title: "Authorization Required",
        description: "You must be a host to create car rental listings.",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (!formData.car_brand || !formData.car_model || !formData.car_type) {
      toast({
        title: "Missing Information",
        description: "Please fill in car brand, model, and type.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.daily_price) {
      toast({
        title: "Missing Pricing",
        description: "Please set at least a daily rental price.",
        variant: "destructive",
      });
      return;
    }

    if (exteriorImages.length === 0) {
      toast({
        title: "Missing Images",
        description: "Please upload at least one exterior image of your vehicle.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload exterior images
      const exteriorUrls: string[] = [];
      for (const image of exteriorImages) {
        try {
          const result = await uploadFile(image, { folder: "transport/exterior" });
          exteriorUrls.push(result.url);
        } catch (err) {
          console.error("Exterior image upload failed:", err);
        }
      }

      // Upload interior images
      const interiorUrls: string[] = [];
      for (const image of interiorImages) {
        try {
          const result = await uploadFile(image, { folder: "transport/interior" });
          interiorUrls.push(result.url);
        } catch (err) {
          console.error("Interior image upload failed:", err);
        }
      }

      // Upload documents
      let insuranceUrl = null;
      let registrationUrl = null;
      let roadworthinessUrl = null;
      let ownerIdUrl = null;

      if (insuranceDoc) {
        try {
          const result = await uploadFile(insuranceDoc, { folder: "transport/docs" });
          insuranceUrl = result.url;
        } catch (err) {
          console.error("Insurance doc upload failed:", err);
        }
      }

      if (registrationDoc) {
        try {
          const result = await uploadFile(registrationDoc, { folder: "transport/docs" });
          registrationUrl = result.url;
        } catch (err) {
          console.error("Registration doc upload failed:", err);
        }
      }

      if (roadworthinessDoc) {
        try {
          const result = await uploadFile(roadworthinessDoc, { folder: "transport/docs" });
          roadworthinessUrl = result.url;
        } catch (err) {
          console.error("Roadworthiness doc upload failed:", err);
        }
      }

      if (ownerIdDoc) {
        try {
          const result = await uploadFile(ownerIdDoc, { folder: "transport/docs" });
          ownerIdUrl = result.url;
        } catch (err) {
          console.error("Owner ID doc upload failed:", err);
        }
      }

      // Generate title if not provided
      const title = formData.title || `${formData.car_brand} ${formData.car_model} ${formData.car_year}`;

      // Create vehicle listing
      const { data, error } = await supabase
        .from("transport_vehicles")
        .insert({
          title,
          vehicle_type: formData.car_type,
          provider_name: formData.provider_name || null,
          seats: formData.seats,
          price_per_day: formData.daily_price,
          daily_price: formData.daily_price,
          weekly_price: formData.weekly_price || null,
          monthly_price: formData.monthly_price || null,
          currency: formData.currency,
          driver_included: formData.driver_included,
          car_brand: formData.car_brand,
          car_model: formData.car_model,
          car_year: formData.car_year,
          car_type: formData.car_type,
          transmission: formData.transmission || null,
          fuel_type: formData.fuel_type || null,
          drive_train: formData.drive_train || null,
          exterior_images: exteriorUrls,
          interior_images: interiorUrls,
          media: [...exteriorUrls, ...interiorUrls],
          image_url: exteriorUrls[0] || null,
          key_features: formData.key_features,
          insurance_document_url: insuranceUrl,
          registration_document_url: registrationUrl,
          roadworthiness_certificate_url: roadworthinessUrl,
          owner_identification_url: ownerIdUrl,
          service_type: "car_rental",
          created_by: user.id,
          is_published: true, // Published by default
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Car Listed Successfully!",
        description: "Your vehicle is now live and available for rental.",
      });

      clearDraft();
      navigate("/host-dashboard");
    } catch (error) {
      console.error("Failed to create car listing:", error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isLoading && (!user || !isHost)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You must be a host to list vehicles for rental.
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">List Your Car for Rental</h1>
          <p className="text-muted-foreground">
            Fill in the details below to list your vehicle. Provide accurate information to help renters make informed decisions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Car Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Car Details
              </CardTitle>
              <CardDescription>Basic information about your vehicle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="carBrand">Car Brand *</Label>
                  <Select
                    value={formData.car_brand}
                    onValueChange={(value) => setFormData({ ...formData, car_brand: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {carBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="carModel">Model *</Label>
                  <Input
                    id="carModel"
                    value={formData.car_model}
                    onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
                    placeholder="e.g., Camry, RAV4, Civic"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="carYear">Year *</Label>
                  <Select
                    value={formData.car_year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, car_year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="carType">Car Type *</Label>
                <Select
                  value={formData.car_type}
                  onValueChange={(value) => setFormData({ ...formData, car_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select car type" />
                  </SelectTrigger>
                  <SelectContent>
                    {carTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Listing Title (optional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Auto-generated from brand, model & year if left empty"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your vehicle, its condition, any special features..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Technical Specifications
              </CardTitle>
              <CardDescription>Engine and performance details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="seats">Seating Capacity</Label>
                  <Input
                    id="seats"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 5 })}
                  />
                </div>

                <div>
                  <Label>Transmission</Label>
                  <Select
                    value={formData.transmission}
                    onValueChange={(value) => setFormData({ ...formData, transmission: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {transmissionTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Fuel Type</Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Drivetrain</Label>
                  <Select
                    value={formData.drive_train}
                    onValueChange={(value) => setFormData({ ...formData, drive_train: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivetrainTypes.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Rental Pricing
              </CardTitle>
              <CardDescription>Set your rental rates (weekly and monthly rates are optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="dailyPrice">Daily Rate *</Label>
                  <Input
                    id="dailyPrice"
                    type="number"
                    min="0"
                    value={formData.daily_price || ""}
                    onChange={(e) => setFormData({ ...formData, daily_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="weeklyPrice">Weekly Rate</Label>
                  <Input
                    id="weeklyPrice"
                    type="number"
                    min="0"
                    value={formData.weekly_price || ""}
                    onChange={(e) => setFormData({ ...formData, weekly_price: parseFloat(e.target.value) || 0 })}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label htmlFor="monthlyPrice">Monthly Rate</Label>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    min="0"
                    value={formData.monthly_price || ""}
                    onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="RWF">(FRw) RWF</SelectItem>
                      <SelectItem value="USD">($) USD</SelectItem>
                      <SelectItem value="EUR">(€) EUR</SelectItem>
                      <SelectItem value="GBP">(£) GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="driverIncluded"
                  checked={formData.driver_included}
                  onCheckedChange={(checked) => setFormData({ ...formData, driver_included: !!checked })}
                />
                <Label htmlFor="driverIncluded" className="cursor-pointer">
                  Driver included in rental (uncheck for self-drive)
                </Label>
              </div>

              <div>
                <Label htmlFor="providerName">Company/Business Name *</Label>
                <Input
                  id="providerName"
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="Your car rental company name"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your registered business/company name
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="w-5 h-5" />
                Key Features
              </CardTitle>
              <CardDescription>Select all features available in your vehicle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {keyFeaturesOptions.map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      id={feature}
                      checked={formData.key_features.includes(feature)}
                      onCheckedChange={() => toggleFeature(feature)}
                    />
                    <Label htmlFor={feature} className="text-sm cursor-pointer">
                      {feature}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exterior Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Exterior Photos *
              </CardTitle>
              <CardDescription>Upload clear photos of the outside of your vehicle (front, back, sides)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {exteriorPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={preview}
                      alt={`Exterior ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeExteriorImage(index)}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Add Exterior</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleExteriorImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Interior Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Interior Photos
              </CardTitle>
              <CardDescription>Upload photos of the inside of your vehicle (dashboard, seats, trunk)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {interiorPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={preview}
                      alt={`Interior ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeInteriorImage(index)}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Add Interior</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleInteriorImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Legal & Safety Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Legal & Safety Documents
              </CardTitle>
              <CardDescription>Upload verification documents (these will be reviewed by our team)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Insurance */}
                <div className="space-y-2">
                  <Label>Insurance Document</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4">
                    {insuranceDoc ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm truncate max-w-[150px]">{insuranceDoc.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setInsuranceDoc(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">Upload Insurance</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setInsuranceDoc(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Registration */}
                <div className="space-y-2">
                  <Label>Registration Document</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4">
                    {registrationDoc ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm truncate max-w-[150px]">{registrationDoc.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRegistrationDoc(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">Upload Registration</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setRegistrationDoc(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Roadworthiness */}
                <div className="space-y-2">
                  <Label>Roadworthiness Certificate</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4">
                    {roadworthinessDoc ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm truncate max-w-[150px]">{roadworthinessDoc.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRoadworthinessDoc(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">Upload Certificate</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setRoadworthinessDoc(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Owner ID */}
                <div className="space-y-2">
                  <Label>Owner/Business ID</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4">
                    {ownerIdDoc ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm truncate max-w-[150px]">{ownerIdDoc.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setOwnerIdDoc(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">Upload ID/Certificate</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setOwnerIdDoc(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="space-y-3">
            {lastSaved && (
              <p className="text-xs text-muted-foreground text-center">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <div className="flex flex-wrap gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleSaveDraft} 
                disabled={uploading || isSaving}
              >
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Draft</>}
              </Button>
              <Button type="submit" disabled={uploading} className="flex-1 md:flex-none">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Listing...</> : "List My Car"}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
