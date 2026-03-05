import { useState, useEffect, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, Car, Save } from "lucide-react";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { HostCreationSubpage } from "@/components/HostCreationSubpage";
import { Progress } from "@/components/ui/progress";
import { isVideoUrl } from "@/lib/media";

const carTypes = ["SUV", "Sedan", "Hatchback", "Coupe", "Wagon", "Van", "Minibus", "Truck", "Luxury"];
const transmissionTypes = ["Automatic", "Manual", "Hybrid"];
const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid"];
import { CURRENCY_OPTIONS } from "@/lib/currencies";

const driveTrains = ["FWD", "RWD", "AWD", "4WD"];
const currencies = CURRENCY_OPTIONS;

const keyFeaturesList = [
  "Air Conditioning", "Bluetooth", "GPS Navigation", "Backup Camera", 
  "Parking Sensors", "Cruise Control", "USB Ports", "Aux Input",
  "Sunroof", "Leather Seats", "Heated Seats", "Apple CarPlay",
  "Android Auto", "Lane Assist", "Blind Spot Monitor", "Keyless Entry"
];

export default function CreateCarRental() {
  const { user, isHost, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    provider_name: "",
    car_brand: "",
    car_model: "",
    car_year: new Date().getFullYear(),
    car_type: "Sedan",
    seats: 4,
    transmission: "Automatic",
    fuel_type: "Petrol",
    drive_train: "FWD",
    daily_price: 0,
    weekly_price: 0,
    monthly_price: 0,
    currency: "RWF",
    key_features: [] as string[],
  });

  const [exteriorImages, setExteriorImages] = useState<string[]>([]);
  const [interiorImages, setInteriorImages] = useState<string[]>([]);
  const [insuranceDoc, setInsuranceDoc] = useState("");
  const [registrationDoc, setRegistrationDoc] = useState("");
  const [roadworthinessDoc, setRoadworthinessDoc] = useState("");
  const [ownerIdDoc, setOwnerIdDoc] = useState("");

  const [exteriorDialogOpen, setExteriorDialogOpen] = useState(false);
  const [interiorDialogOpen, setInteriorDialogOpen] = useState(false);
  const [insuranceDialogOpen, setInsuranceDialogOpen] = useState(false);
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [roadworthinessDialogOpen, setRoadworthinessDialogOpen] = useState(false);
  const [ownerIdDialogOpen, setOwnerIdDialogOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hostProfileComplete, setHostProfileComplete] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const totalSteps = 5;
  const stepTitles = ["Basic Info", "Vehicle", "Pricing", "Photos", "Review"];

  // Fetch host profile completion status
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("host_applications")
      .select("profile_complete")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("profile_complete", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setHostProfileComplete(data?.profile_complete ?? false);
      });
  }, [user?.id]);

  // Use stable storage keys per user
  const getStorageKey = useCallback(() => user?.id ? `car-rental-draft-${user.id}` : "car-rental-draft-anonymous", [user?.id]);
  const getAnonymousStorageKey = useCallback(() => "car-rental-draft-anonymous", []);
  const getDraftLookupKeys = useCallback(() => {
    const primaryKey = getStorageKey();
    return user?.id ? [primaryKey, getAnonymousStorageKey()] : [primaryKey];
  }, [getStorageKey, getAnonymousStorageKey, user?.id]);

  // Load draft on mount (only once)
  useEffect(() => {
    if (isLoading) return;
    if (draftLoaded) return;

    const primaryDraftKey = getStorageKey();
    let restoredFromKey: string | null = null;
    let savedDraft: string | null = null;

    for (const key of getDraftLookupKeys()) {
      const value = localStorage.getItem(key);
      if (value) {
        restoredFromKey = key;
        savedDraft = value;
        break;
      }
    }

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) setFormData(draft.formData);
        if (draft.exteriorImages) setExteriorImages(draft.exteriorImages);
        if (draft.interiorImages) setInteriorImages(draft.interiorImages);
        if (draft.insuranceDoc) setInsuranceDoc(draft.insuranceDoc);
        if (draft.registrationDoc) setRegistrationDoc(draft.registrationDoc);
        if (draft.roadworthinessDoc) setRoadworthinessDoc(draft.roadworthinessDoc);
        if (draft.ownerIdDoc) setOwnerIdDoc(draft.ownerIdDoc);
        setLastSaved(new Date(draft.timestamp));
        if (restoredFromKey && restoredFromKey !== primaryDraftKey) {
          localStorage.setItem(primaryDraftKey, savedDraft);
          localStorage.removeItem(restoredFromKey);
        }
        toast({ title: "Draft restored", description: "Your previous work has been restored" });
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    }
    setDraftLoaded(true);
  }, [user?.id, draftLoaded, getStorageKey, getDraftLookupKeys, toast, isLoading]);

  const hasDraftContent =
    Boolean(
      formData.title.trim() ||
      formData.provider_name.trim() ||
      formData.car_brand.trim() ||
      formData.car_model.trim() ||
      formData.daily_price > 0 ||
      formData.weekly_price > 0 ||
      formData.monthly_price > 0 ||
      formData.key_features.length > 0 ||
      exteriorImages.length > 0 ||
      interiorImages.length > 0 ||
      insuranceDoc ||
      registrationDoc ||
      roadworthinessDoc ||
      ownerIdDoc
    );

  // Auto-save on form changes (only after load)
  useEffect(() => {
    if (!draftLoaded) return;
    
    const draftKey = getStorageKey();
    
    if (!hasDraftContent) return;
    
    const timer = setTimeout(() => {
      const draft = {
        formData,
        exteriorImages,
        interiorImages,
        insuranceDoc,
        registrationDoc,
        roadworthinessDoc,
        ownerIdDoc,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSaved(new Date());
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timer);
  }, [formData, exteriorImages, interiorImages, insuranceDoc, registrationDoc, roadworthinessDoc, ownerIdDoc, user?.id, draftLoaded, getStorageKey, hasDraftContent]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasDraftContent) return;
      
      const draftKey = getStorageKey();
      const draft = {
        formData,
        exteriorImages,
        interiorImages,
        insuranceDoc,
        registrationDoc,
        roadworthinessDoc,
        ownerIdDoc,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, exteriorImages, interiorImages, insuranceDoc, registrationDoc, roadworthinessDoc, ownerIdDoc, user?.id, getStorageKey, hasDraftContent]);

  const clearDraft = () => {
    const draftKey = getStorageKey();
    localStorage.removeItem(draftKey);
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    const draftKey = getStorageKey();
    const draft = {
      formData,
      exteriorImages,
      interiorImages,
      insuranceDoc,
      registrationDoc,
      roadworthinessDoc,
      ownerIdDoc,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLastSaved(new Date());
    toast({ title: "Draft saved", description: "Your progress has been saved locally" });
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isHost) {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "You must be a host to create a car rental listing",
      });
      return;
    }

    if (exteriorImages.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing images",
        description: "Please add at least one exterior photo or video",
      });
      return;
    }

    if (!insuranceDoc || !registrationDoc || !roadworthinessDoc || !ownerIdDoc) {
      toast({
        variant: "destructive",
        title: "Missing documents",
        description: "Please upload all required legal documents",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("transport_vehicles").insert({
        created_by: user.id,
        service_type: "car_rental",
        title: formData.title,
        provider_name: formData.provider_name,
        car_brand: formData.car_brand,
        car_model: formData.car_model,
        car_year: formData.car_year,
        vehicle_type: formData.car_type,
        car_type: formData.car_type,
        seats: formData.seats,
        transmission: formData.transmission,
        fuel_type: formData.fuel_type,
        drive_train: formData.drive_train,
        daily_price: formData.daily_price,
        weekly_price: formData.weekly_price,
        monthly_price: formData.monthly_price,
        price_per_day: formData.daily_price,
        currency: formData.currency,
        exterior_images: exteriorImages,
        interior_images: interiorImages,
        media: [...exteriorImages, ...interiorImages],
        image_url: exteriorImages[0] || null,
        key_features: formData.key_features,
        insurance_document_url: insuranceDoc,
        registration_document_url: registrationDoc,
        roadworthiness_certificate_url: roadworthinessDoc,
        owner_identification_url: ownerIdDoc,
        is_published: true, // Published by default
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your car rental listing is now live!",
      });

      clearDraft();
      navigate("/host-dashboard");
    } catch (error) {
      console.error("Error creating car rental:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create car rental listing",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const missingRequirements = (() => {
    const missing: string[] = [];

    if (!formData.title.trim()) missing.push("Listing title");
    if (!formData.car_brand.trim()) missing.push("Car brand");
    if (!formData.car_model.trim()) missing.push("Car model");
    if (!formData.car_type) missing.push("Car type");
    if (!(formData.car_year >= 1990)) missing.push("Car year");
    if (!formData.transmission) missing.push("Transmission");
    if (!formData.fuel_type) missing.push("Fuel type");
    if (!(formData.seats >= 1)) missing.push("Seats");
    if (!(formData.daily_price > 0)) missing.push("Daily price");

    if (exteriorImages.length === 0) missing.push("At least one exterior photo or video");
    if (!insuranceDoc) missing.push("Insurance document");
    if (!registrationDoc) missing.push("Registration document");
    if (!roadworthinessDoc) missing.push("Roadworthiness certificate");
    if (!ownerIdDoc) missing.push("Owner identification");

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
            You must be a host to create car rentals.
          </p>
          <Button onClick={() => navigate("/become-host")}>Become a Host</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <HostCreationSubpage
      title="Add Car Rental"
      subtitle="List your vehicle for daily, weekly, or monthly rental"
      onBack={() => navigate("/host-dashboard")}
      maxWidthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Step {wizardStep} of {totalSteps}: {stepTitles[wizardStep - 1]}</p>
          <Progress value={(wizardStep / totalSteps) * 100} className="h-2" />
        </div>

        {wizardStep === 1 && (
          <>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Basic Information</h2>
              <div>
                <Label>Listing Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., 2024 Toyota RAV4 - Comfortable SUV"
                  required
                />
              </div>
              <div>
                <Label>Provider/Company Name</Label>
                <Input
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="Your business name (optional)"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Vehicle Details</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Brand *</Label>
                  <Input
                    value={formData.car_brand}
                    onChange={(e) => setFormData({ ...formData, car_brand: e.target.value })}
                    placeholder="Toyota"
                    required
                  />
                </div>
                <div>
                  <Label>Model *</Label>
                  <Input
                    value={formData.car_model}
                    onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
                    placeholder="RAV4"
                    required
                  />
                </div>
                <div>
                  <Label>Year *</Label>
                  <Input
                    type="number"
                    value={formData.car_year}
                    onChange={(e) => setFormData({ ...formData, car_year: parseInt(e.target.value) })}
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Car Type *</Label>
                  <Select value={formData.car_type} onValueChange={(v) => setFormData({ ...formData, car_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {carTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Seats *</Label>
                  <Input
                    type="number"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
                    min="2"
                    max="50"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transmission *</Label>
                  <Select value={formData.transmission} onValueChange={(v) => setFormData({ ...formData, transmission: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transmissionTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuel Type *</Label>
                  <Select value={formData.fuel_type} onValueChange={(v) => setFormData({ ...formData, fuel_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Drive Train *</Label>
                <Select value={formData.drive_train} onValueChange={(v) => setFormData({ ...formData, drive_train: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {driveTrains.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {wizardStep === 2 && (
          <>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Pricing</h2>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Currency *</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
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
                <div>
                  <Label>Daily Price *</Label>
                  <Input type="number" value={formData.daily_price} onChange={(e) => setFormData({ ...formData, daily_price: parseFloat(e.target.value) })} min="0" step="0.01" required />
                </div>
                <div>
                  <Label>Weekly Price</Label>
                  <Input type="number" value={formData.weekly_price} onChange={(e) => setFormData({ ...formData, weekly_price: parseFloat(e.target.value) })} min="0" step="0.01" />
                </div>
                <div>
                  <Label>Monthly Price</Label>
                  <Input type="number" value={formData.monthly_price} onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) })} min="0" step="0.01" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">Key Features</h2>
              <div className="grid grid-cols-2 gap-3">
                {keyFeaturesList.map((feature) => (
                  <label key={feature} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.key_features.includes(feature)}
                      onCheckedChange={(checked) => {
                        if (checked) setFormData({ ...formData, key_features: [...formData.key_features, feature] });
                        else setFormData({ ...formData, key_features: formData.key_features.filter(f => f !== feature) });
                      }}
                    />
                    <span className="text-sm">{feature}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {wizardStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Photos</h2>
            <div>
              <Label>Exterior Media * (at least 1 photo or video)</Label>
              <div className="mt-2">
                {exteriorImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {exteriorImages.map((url, idx) => (
                      <div key={idx} className="relative group">
                        {isVideoUrl(url) ? (
                          <video src={url} className="w-full h-24 object-cover rounded border" muted playsInline preload="metadata" />
                        ) : (
                          <img src={url} alt="" className="w-full h-24 object-cover rounded border" />
                        )}
                        <button type="button" onClick={() => setExteriorImages(exteriorImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => setExteriorDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Exterior Media
                </Button>
              </div>
            </div>
            <div>
              <Label>Interior Media</Label>
              <div className="mt-2">
                {interiorImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {interiorImages.map((url, idx) => (
                      <div key={idx} className="relative group">
                        {isVideoUrl(url) ? (
                          <video src={url} className="w-full h-24 object-cover rounded border" muted playsInline preload="metadata" />
                        ) : (
                          <img src={url} alt="" className="w-full h-24 object-cover rounded border" />
                        )}
                        <button type="button" onClick={() => setInteriorImages(interiorImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => setInteriorDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Interior Media
                </Button>
              </div>
            </div>
          </div>
        )}

        {wizardStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Legal & Safety Documents *</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Insurance Document *</Label><div className="mt-2">{insuranceDoc && <p className="text-sm text-green-600 mb-2">✓ Document uploaded</p>}<Button type="button" variant="outline" onClick={() => setInsuranceDialogOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload Insurance</Button></div></div>
              <div><Label>Registration Document *</Label><div className="mt-2">{registrationDoc && <p className="text-sm text-green-600 mb-2">✓ Document uploaded</p>}<Button type="button" variant="outline" onClick={() => setRegistrationDialogOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload Registration</Button></div></div>
              <div><Label>Roadworthiness Certificate *</Label><div className="mt-2">{roadworthinessDoc && <p className="text-sm text-green-600 mb-2">✓ Document uploaded</p>}<Button type="button" variant="outline" onClick={() => setRoadworthinessDialogOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload Certificate</Button></div></div>
              <div><Label>Owner Identification *</Label><div className="mt-2">{ownerIdDoc && <p className="text-sm text-green-600 mb-2">✓ Document uploaded</p>}<Button type="button" variant="outline" onClick={() => setOwnerIdDialogOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload ID</Button></div></div>
            </div>
          </div>
        )}

        {wizardStep === 5 && (
          <>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {lastSaved && (
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                )}
              </div>
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/host-dashboard")}>
                  Cancel
                </Button>
                <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!window.confirm("Discard saved draft? This cannot be undone.")) return;
                    clearDraft();
                    setLastSaved(null);
                    toast({ title: "Draft discarded", description: "Saved draft has been removed." });
                  }}
                  disabled={isSaving || submitting}
                >
                  Discard Draft
                </Button>
                <Button type="submit" disabled={submitting || !canCreateListing}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Car className="w-4 h-4 mr-2" />
                      Create Listing
                    </>
                  )}
                </Button>
              </div>
            </div>
            {!canCreateListing && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Complete these to create:</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{missingRequirements.join(" • ")}</p>
              </div>
            )}
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

      {/* Upload Dialogs */}
      <CloudinaryUploadDialog
        title="Upload Exterior Media"
        folder="car-rentals/exterior"
        accept="image/*,video/*"
        open={exteriorDialogOpen}
        onOpenChange={setExteriorDialogOpen}
        value={exteriorImages}
        onChange={setExteriorImages}
        autoStart={true}
        multiple
      />

      <CloudinaryUploadDialog
        title="Upload Interior Media"
        folder="car-rentals/interior"
        accept="image/*,video/*"
        open={interiorDialogOpen}
        onOpenChange={setInteriorDialogOpen}
        value={interiorImages}
        onChange={setInteriorImages}
        autoStart={true}
        multiple
      />

      <CloudinaryUploadDialog
        title="Upload Insurance Document"
        folder="car-rentals/documents"
        accept=".pdf,image/*"
        open={insuranceDialogOpen}
        onOpenChange={setInsuranceDialogOpen}
        value={insuranceDoc ? [insuranceDoc] : []}
        onChange={(urls) => setInsuranceDoc(urls[0] || "")}
        autoStart={true}
        maxFiles={1}
      />

      <CloudinaryUploadDialog
        title="Upload Registration Document"
        folder="car-rentals/documents"
        accept=".pdf,image/*"
        open={registrationDialogOpen}
        onOpenChange={setRegistrationDialogOpen}
        value={registrationDoc ? [registrationDoc] : []}
        onChange={(urls) => setRegistrationDoc(urls[0] || "")}
        autoStart={true}
        maxFiles={1}
      />

      <CloudinaryUploadDialog
        title="Upload Roadworthiness Certificate"
        folder="car-rentals/documents"
        accept=".pdf,image/*"
        open={roadworthinessDialogOpen}
        onOpenChange={setRoadworthinessDialogOpen}
        value={roadworthinessDoc ? [roadworthinessDoc] : []}
        onChange={(urls) => setRoadworthinessDoc(urls[0] || "")}
        autoStart={true}
        maxFiles={1}
      />

      <CloudinaryUploadDialog
        title="Upload Owner Identification"
        folder="car-rentals/documents"
        accept=".pdf,image/*"
        open={ownerIdDialogOpen}
        onOpenChange={setOwnerIdDialogOpen}
        value={ownerIdDoc ? [ownerIdDoc] : []}
        onChange={(urls) => setOwnerIdDoc(urls[0] || "")}
        autoStart={true}
        maxFiles={1}
      />

    </HostCreationSubpage>
  );
}
