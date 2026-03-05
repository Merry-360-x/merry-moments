import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { CURRENCY_OPTIONS } from "@/lib/currencies";
import { HostCreationSubpage } from "@/components/HostCreationSubpage";
import { Progress } from "@/components/ui/progress";
import { isVideoUrl } from "@/lib/media";

const isVideoPreviewSrc = (src: string) => /^data:video\//i.test(src) || isVideoUrl(src);

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
const currencies = CURRENCY_OPTIONS;

export default function CreateTransport() {
  const { user, isHost, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hostProfileComplete, setHostProfileComplete] = useState(false);
  const editId = searchParams.get("editId");
  const isEditMode = Boolean(editId);

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
  const [existingExteriorUrls, setExistingExteriorUrls] = useState<string[]>([]);
  const [existingInteriorUrls, setExistingInteriorUrls] = useState<string[]>([]);
  
  // Documents
  const [insuranceDoc, setInsuranceDoc] = useState<File | null>(null);
  const [registrationDoc, setRegistrationDoc] = useState<File | null>(null);
  const [roadworthinessDoc, setRoadworthinessDoc] = useState<File | null>(null);
  const [ownerIdDoc, setOwnerIdDoc] = useState<File | null>(null);
  const [existingInsuranceUrl, setExistingInsuranceUrl] = useState<string>("");
  const [existingRegistrationUrl, setExistingRegistrationUrl] = useState<string>("");
  const [existingRoadworthinessUrl, setExistingRoadworthinessUrl] = useState<string>("");
  const [existingOwnerIdUrl, setExistingOwnerIdUrl] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [restoredDraftAt, setRestoredDraftAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const totalSteps = 5;
  const stepTitles = ["Vehicle", "Pricing", "Photos", "Documents", "Review"];

  const getStorageKey = () => {
    const userPart = user?.id || "anonymous";
    if (isEditMode && editId) return `create-transport-draft-edit-${editId}-${userPart}`;
    return user?.id ? `create-transport-draft-${user.id}` : "create-transport-draft-anonymous";
  };
  const getAnonymousStorageKey = () => {
    if (isEditMode && editId) return `create-transport-draft-edit-${editId}-anonymous`;
    return "create-transport-draft-anonymous";
  };

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

  useEffect(() => {
    if (!isEditMode || !editId || !user?.id) return;

    let isMounted = true;
    const fetchVehicleForEdit = async () => {
      setIsEditLoading(true);
      const { data, error } = await supabase
        .from("transport_vehicles")
        .select("*")
        .eq("id", editId)
        .eq("created_by", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        toast({
          title: "Vehicle not found",
          description: "We couldn't load this vehicle for editing.",
          variant: "destructive",
        });
        navigate("/host-dashboard");
        setIsEditLoading(false);
        return;
      }

      const exterior = ((data as any).exterior_images as string[] | null) || [];
      const interior = ((data as any).interior_images as string[] | null) || [];

      setFormData({
        title: data.title || "",
        provider_name: data.provider_name || "",
        description: (data as any).description || "",
        car_brand: (data as any).car_brand || "",
        car_model: (data as any).car_model || "",
        car_year: Number((data as any).car_year || currentYear),
        car_type: (data as any).car_type || data.vehicle_type || "",
        seats: Number(data.seats || 5),
        transmission: (data as any).transmission || "",
        fuel_type: (data as any).fuel_type || "",
        drive_train: (data as any).drive_train || "",
        daily_price: Number(data.price_per_day || (data as any).daily_price || 0),
        weekly_price: Number((data as any).weekly_price || 0),
        monthly_price: Number((data as any).monthly_price || 0),
        currency: data.currency || "RWF",
        driver_included: Boolean(data.driver_included),
        key_features: ((data as any).key_features as string[] | null) || [],
      });

      setExistingExteriorUrls(exterior);
      setExistingInteriorUrls(interior);
      setExteriorPreviews(exterior);
      setInteriorPreviews(interior);

      setExistingInsuranceUrl((data as any).insurance_document_url || "");
      setExistingRegistrationUrl((data as any).registration_document_url || "");
      setExistingRoadworthinessUrl((data as any).roadworthiness_certificate_url || "");
      setExistingOwnerIdUrl((data as any).owner_identification_url || "");

      const primaryDraftKey = getStorageKey();
      const draftLookupKeys = user?.id
        ? [primaryDraftKey, getAnonymousStorageKey()]
        : [primaryDraftKey];
      for (const key of draftLookupKeys) {
        const savedData = localStorage.getItem(key);
        if (!savedData) continue;
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.formData) setFormData(parsed.formData);
          const restoredAt = new Date(parsed.timestamp);
          setLastSaved(restoredAt);
          setRestoredDraftAt(restoredAt);
          if (key !== primaryDraftKey) {
            localStorage.setItem(primaryDraftKey, savedData);
            localStorage.removeItem(key);
          }
          toast({
            title: "Progress Restored",
            description: "Your edit draft has been restored.",
            duration: 3000,
          });
          break;
        } catch (e) {
          console.error("Failed to restore transport edit draft:", e);
        }
      }

      setDraftLoaded(true);
      setIsEditLoading(false);
    };

    void fetchVehicleForEdit();

    return () => {
      isMounted = false;
    };
  }, [editId, isEditMode, navigate, toast, user?.id]);

  // Load saved progress from localStorage on mount
  useEffect(() => {
    if (isLoading) return;
    if (isEditMode) return;
    if (draftLoaded) return;

    const primaryDraftKey = getStorageKey();
    let restoredFromKey: string | null = null;
    let savedData: string | null = null;
    const draftLookupKeys = user?.id
      ? [primaryDraftKey, getAnonymousStorageKey()]
      : [primaryDraftKey];

    for (const key of draftLookupKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        restoredFromKey = key;
        savedData = value;
        break;
      }
    }

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.formData) setFormData(parsed.formData);
        const restoredAt = new Date(parsed.timestamp);
        setLastSaved(restoredAt);
        setRestoredDraftAt(restoredAt);
        if (restoredFromKey && restoredFromKey !== primaryDraftKey) {
          localStorage.setItem(primaryDraftKey, savedData);
          localStorage.removeItem(restoredFromKey);
        }
        
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
  }, [draftLoaded, isEditMode, isLoading, user?.id]);

  const hasDraftContent =
    Boolean(
      formData.title.trim() ||
      formData.provider_name.trim() ||
      formData.description.trim() ||
      formData.car_brand.trim() ||
      formData.car_model.trim() ||
      formData.car_type.trim() ||
      formData.transmission.trim() ||
      formData.fuel_type.trim() ||
      formData.drive_train.trim() ||
      formData.daily_price > 0 ||
      formData.weekly_price > 0 ||
      formData.monthly_price > 0 ||
      formData.key_features.length > 0 ||
      existingExteriorUrls.length > 0 ||
      existingInteriorUrls.length > 0 ||
      exteriorPreviews.length > 0 ||
      interiorPreviews.length > 0
    );

  // Auto-save progress
  useEffect(() => {
    if (!draftLoaded) return;
    if (!hasDraftContent) return;
    const storageKey = getStorageKey();
    
    const timer = setTimeout(() => {
      const dataToSave = {
        formData,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      setLastSaved(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, draftLoaded, isEditMode, hasDraftContent, user?.id, editId]);

  useEffect(() => {
    const storageKey = getStorageKey();

    const handleBeforeUnload = () => {
      if (!hasDraftContent) return;

      const dataToSave = {
        formData,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, hasDraftContent, isEditMode, user?.id, editId]);

  const handleSaveDraft = () => {
    setIsSaving(true);
    const storageKey = getStorageKey();
    const dataToSave = {
      formData,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    setLastSaved(new Date());
    toast({ title: "Draft saved", description: "Your progress has been saved locally" });
    setTimeout(() => setIsSaving(false), 500);
  };

  const clearDraft = () => {
    localStorage.removeItem(getStorageKey());
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
    if (index < existingExteriorUrls.length) {
      setExistingExteriorUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      const newFileIndex = index - existingExteriorUrls.length;
      setExteriorImages((prev) => prev.filter((_, i) => i !== newFileIndex));
    }
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
    if (index < existingInteriorUrls.length) {
      setExistingInteriorUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      const newFileIndex = index - existingInteriorUrls.length;
      setInteriorImages((prev) => prev.filter((_, i) => i !== newFileIndex));
    }
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

    if (exteriorImages.length === 0 && existingExteriorUrls.length === 0) {
      toast({
        title: "Missing Images",
        description: "Please upload at least one exterior photo or video of your vehicle.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload exterior images
      const uploadedExteriorUrls: string[] = [];
      for (const image of exteriorImages) {
        try {
          const result = await uploadFile(image, { folder: "transport/exterior" });
          uploadedExteriorUrls.push(result.url);
        } catch (err) {
          console.error("Exterior image upload failed:", err);
        }
      }
      const exteriorUrls = [...existingExteriorUrls, ...uploadedExteriorUrls];

      // Upload interior images
      const uploadedInteriorUrls: string[] = [];
      for (const image of interiorImages) {
        try {
          const result = await uploadFile(image, { folder: "transport/interior" });
          uploadedInteriorUrls.push(result.url);
        } catch (err) {
          console.error("Interior image upload failed:", err);
        }
      }
      const interiorUrls = [...existingInteriorUrls, ...uploadedInteriorUrls];

      // Upload documents
      let insuranceUrl: string | null = existingInsuranceUrl || null;
      let registrationUrl: string | null = existingRegistrationUrl || null;
      let roadworthinessUrl: string | null = existingRoadworthinessUrl || null;
      let ownerIdUrl: string | null = existingOwnerIdUrl || null;

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

      const vehiclePayload = {
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
        } as any;

      if (isEditMode && editId) {
        const { error } = await supabase
          .from("transport_vehicles")
          .update(vehiclePayload)
          .eq("id", editId)
          .eq("created_by", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("transport_vehicles")
          .insert(vehiclePayload)
          .select()
          .single();
        if (error) throw error;
      }

      toast({
        title: isEditMode ? "Vehicle Updated!" : "Car Listed Successfully!",
        description: isEditMode
          ? "Your vehicle changes have been saved."
          : "Your vehicle is now live and available for rental.",
      });

      clearDraft();
      navigate("/host-dashboard");
    } catch (error) {
      console.error("Failed to create car listing:", error);
      toast({
        title: "Error",
        description: isEditMode ? "Failed to update listing. Please try again." : "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const missingRequirements = (() => {
    const missing: string[] = [];

    if (!formData.title.trim()) missing.push("Listing title");
    if (!formData.car_brand.trim()) missing.push("Car brand");
    if (!formData.car_model.trim()) missing.push("Car model");
    if (!formData.car_type) missing.push("Car type");
    if (!formData.transmission) missing.push("Transmission");
    if (!formData.fuel_type) missing.push("Fuel type");
    if (!formData.drive_train) missing.push("Drive train");
    if (!(formData.daily_price > 0)) missing.push("Daily price");

    if (exteriorImages.length === 0 && existingExteriorUrls.length === 0) {
      missing.push("At least one exterior photo or video");
    }

    if (!insuranceDoc && !existingInsuranceUrl) missing.push("Insurance document");
    if (!registrationDoc && !existingRegistrationUrl) missing.push("Registration document");
    if (!roadworthinessDoc && !existingRoadworthinessUrl) missing.push("Roadworthiness certificate");
    if (!ownerIdDoc && !existingOwnerIdUrl) missing.push("Owner identification");

    return missing;
  })();
  const canCreateListing = missingRequirements.length === 0;

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

  if (!isLoading && isEditMode && isEditLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading vehicle for editing...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <HostCreationSubpage
      title={isEditMode ? "Edit Car Rental Listing" : "List Your Car for Rental"}
      subtitle={
        isEditMode
          ? "Update your listing details below."
          : "Fill in the details below to list your vehicle. Provide accurate information to help renters make informed decisions."
      }
      onBack={() => navigate("/host-dashboard")}
      maxWidthClassName="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Step {wizardStep} of {totalSteps}: {stepTitles[wizardStep - 1]}</p>
            <Progress value={(wizardStep / totalSteps) * 100} className="h-2" />
          </div>

          {wizardStep === 1 && (
            <>
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
            </>
          )}

          {wizardStep === 2 && (
            <>
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
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
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
            </>
          )}

          {wizardStep === 3 && (
            <>
          {/* Exterior Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Exterior Media *
              </CardTitle>
              <CardDescription>Upload clear photos of the outside of your vehicle (front, back, sides)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {exteriorPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    {isVideoPreviewSrc(preview) ? (
                      <video
                        src={preview}
                        className="w-full h-full object-cover rounded-lg"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt={`Exterior ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
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
                    accept="image/*,video/*"
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
                Interior Media
              </CardTitle>
              <CardDescription>Upload photos of the inside of your vehicle (dashboard, seats, trunk)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {interiorPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    {isVideoPreviewSrc(preview) ? (
                      <video
                        src={preview}
                        className="w-full h-full object-cover rounded-lg"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt={`Interior ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
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
                    accept="image/*,video/*"
                    multiple
                    onChange={handleInteriorImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </CardContent>
          </Card>
            </>
          )}

          {wizardStep === 4 && (
            <>
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
            </>
          )}

          {wizardStep === 5 && (
            <>
          <div className="space-y-3">
            {restoredDraftAt && (
              <p className="text-xs text-primary text-center">
                {isEditMode ? "Restored edit draft" : "Restored draft"}: {restoredDraftAt.toLocaleTimeString()}
              </p>
            )}
            {lastSaved && (
              <p className="text-xs text-muted-foreground text-center">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            {!canCreateListing && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Complete these to create:</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{missingRequirements.join(" • ")}</p>
              </div>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!window.confirm("Discard saved draft? This cannot be undone.")) return;
                  clearDraft();
                  setLastSaved(null);
                  setRestoredDraftAt(null);
                  toast({ title: "Draft discarded", description: "Saved draft has been removed." });
                }}
                disabled={uploading || isSaving}
              >
                Discard Draft
              </Button>
              <Button type="submit" disabled={uploading || !canCreateListing} className="flex-1 md:flex-none">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Listing...</> : "List My Car"}
              </Button>
            </div>
          </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
              disabled={wizardStep === 1}
            >
              Back
            </Button>
            {wizardStep < totalSteps ? (
              <Button type="button" onClick={() => setWizardStep((s) => Math.min(totalSteps, s + 1))}>
                Next
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Ready to publish</span>
            )}
          </div>
      </form>
    </HostCreationSubpage>
  );
}
