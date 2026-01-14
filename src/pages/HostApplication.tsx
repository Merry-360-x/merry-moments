import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AMENITIES } from "@/lib/amenities";
import {
  Building2,
  UserRound,
  CheckCircle2,
  Home,
  ImageIcon,
  ArrowRight,
  Shield,
  Upload,
  MapPin,
  DollarSign,
  Users,
  Bed,
  Bath,
  Star,
  Check,
} from "lucide-react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { formatMoney } from "@/lib/money";

type ApplicantType = "individual" | "business";

const propertyTypes = ["Hotel", "Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "House"];
const currencies = [
  { value: "USD", label: "$ - US Dollar", symbol: "$" },
  { value: "EUR", label: "€ - Euro", symbol: "€" },
  { value: "RWF", label: "FRw - Rwandan Franc", symbol: "FRw" },
];

export default function HostApplication() {
  const { user, refreshRoles, isHost, isLoading: authLoading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingApp, setHasExistingApp] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const applicantType = "individual"; // Always individual
  const [submitting, setSubmitting] = useState(false);

  // Failsafe: Force loading completion after 6 seconds to prevent infinite loading
  useEffect(() => {
    const failsafeTimeout = setTimeout(() => {
      if (isLoading || authLoading || rolesLoading) {
        console.warn("[HostApplication] Failsafe triggered - forcing loading completion");
        setIsLoading(false);
      }
    }, 6000);

    return () => clearTimeout(failsafeTimeout);
  }, []);

  // Simplified form state
  const [formData, setFormData] = useState({
    // Service Types
    service_types: [] as string[], // accommodation, transport, tour
    // Personal
    full_name: "",
    phone: "",
    about: "",
    national_id_number: "",
    national_id_photo_url: "",
    selfie_photo_url: "",
    // Business (if applicable)
    business_name: "",
    business_tin: "",
    // Property
    title: "",
    location: "",
    description: "",
    property_type: "Apartment",
    price_per_night: 50000,
    currency: "USD",
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [] as string[],
    images: [] as string[],
  });

  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [idPhotoUploadOpen, setIdPhotoUploadOpen] = useState(false);
  const [selfieUploadOpen, setSelfieUploadOpen] = useState(false);

  const totalSteps = 4; // Added service type step
  const progress = (currentStep / totalSteps) * 100;

  // Check for existing application
  useEffect(() => {
    if (authLoading || rolesLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      setIsLoading(false);
      return;
    }

    const checkExisting = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("host_applications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error checking application:", error);
        }

        if (data) {
          setHasExistingApp(true);
          setExistingStatus(data.status);
        }
      } catch (e) {
        logError("host-app.checkExisting", e);
      } finally {
        setIsLoading(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn("[HostApplication] Loading timeout reached, forcing completion");
      setIsLoading(false);
    }, 3000);

    checkExisting().finally(() => {
      clearTimeout(timeout);
    });

    return () => {
      clearTimeout(timeout);
    };
  }, [user, authLoading, rolesLoading]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const payload = {
        user_id: user.id,
        status: "pending",
        applicant_type: applicantType,
        service_types: formData.service_types,
        full_name: formData.full_name,
        phone: formData.phone,
        about: formData.about || null,
        national_id_number: formData.national_id_number,
        national_id_photo_url: formData.national_id_photo_url,
        selfie_photo_url: formData.selfie_photo_url,
        business_name: null,
        business_tin: null,
        hosting_location: formData.location,
        listing_title: formData.title,
        listing_location: formData.location,
        listing_property_type: formData.property_type,
        listing_price_per_night: formData.price_per_night,
        listing_currency: formData.currency,
        listing_max_guests: formData.max_guests,
        listing_bedrooms: formData.bedrooms,
        listing_bathrooms: formData.bathrooms,
        listing_amenities: formData.amenities,
        listing_images: formData.images,
      };

      const { error } = await supabase.from("host_applications").insert(payload);

      if (error) throw error;

      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon.",
      });

      setHasExistingApp(true);
      setExistingStatus("pending");
      await refreshRoles();
    } catch (e) {
      logError("host-app.submit", e);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: uiErrorMessage(e, "Please try again."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || rolesLoading || isLoading) {
    // Add debugging info
    console.log("[HostApplication] Loading states:", { authLoading, rolesLoading, isLoading, hasUser: !!user });
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              {authLoading ? "Checking authentication..." : 
               rolesLoading ? "Loading user permissions..." : 
               "Loading application data..."}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-16">
          <Card className="text-center shadow-xl">
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl">Become a Host</CardTitle>
              <CardDescription className="text-lg">
                Join our community of hosts and start earning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Please sign in to start your hosting journey with us.
              </p>
              <div className="flex gap-3 justify-center">
                <Button size="lg" onClick={() => navigate("/auth?redirect=/become-host")}>
                  Sign In to Continue
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate("/")}>
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isHost) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-16">
          <Card className="text-center shadow-xl">
            <CardHeader>
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-3xl">You're Already a Host!</CardTitle>
              <CardDescription className="text-lg">
                Manage your properties from your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => navigate("/host-dashboard")}>
                Go to Host Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (hasExistingApp) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-16">
          <Card className="text-center shadow-xl">
            <CardHeader>
              {existingStatus === "pending" && (
                <>
                  <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-yellow-600" />
                  </div>
                  <CardTitle className="text-3xl">Application Under Review</CardTitle>
                  <CardDescription className="text-lg">
                    We're reviewing your application
                  </CardDescription>
                </>
              )}
              {existingStatus === "approved" && (
                <>
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <CardTitle className="text-3xl">Application Approved!</CardTitle>
                  <CardDescription className="text-lg">
                    Welcome to our host community
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {existingStatus === "pending" && (
                <p className="text-muted-foreground">
                  Your application is being reviewed by our team. You'll receive a notification once it's approved.
                </p>
              )}
              {existingStatus === "approved" && (
                <Button size="lg" onClick={() => navigate("/host-dashboard")}>
                  Go to Host Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Become a Host</h1>
          <p className="text-lg text-muted-foreground">Start your hosting journey in 3 simple steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-primary">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Service Type</span>
            <span>Listing Details</span>
            <span>Personal Info</span>
            <span>Review</span>
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl">
          <CardContent className="p-6 md:p-8">
            {/* Step 1: Service Type Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">What Will You Offer?</h2>
                  <p className="text-muted-foreground">Select one or more services you want to provide</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {/* Accommodation */}
                  <div
                    onClick={() => {
                      const types = formData.service_types.includes("accommodation")
                        ? formData.service_types.filter((t) => t !== "accommodation")
                        : [...formData.service_types, "accommodation"];
                      updateField("service_types", types);
                    }}
                    className={`p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                      formData.service_types.includes("accommodation")
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          formData.service_types.includes("accommodation")
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <Home className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Accommodation</h3>
                        <p className="text-sm text-muted-foreground">
                          Hotels, apartments, villas, guesthouses
                        </p>
                      </div>
                      {formData.service_types.includes("accommodation") && (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </div>

                  {/* Transport */}
                  <div
                    onClick={() => {
                      const types = formData.service_types.includes("transport")
                        ? formData.service_types.filter((t) => t !== "transport")
                        : [...formData.service_types, "transport"];
                      updateField("service_types", types);
                    }}
                    className={`p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                      formData.service_types.includes("transport")
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          formData.service_types.includes("transport")
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Transport</h3>
                        <p className="text-sm text-muted-foreground">
                          Vehicle rentals, shuttle services
                        </p>
                      </div>
                      {formData.service_types.includes("transport") && (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </div>

                  {/* Tours */}
                  <div
                    onClick={() => {
                      const types = formData.service_types.includes("tour")
                        ? formData.service_types.filter((t) => t !== "tour")
                        : [...formData.service_types, "tour"];
                      updateField("service_types", types);
                    }}
                    className={`p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                      formData.service_types.includes("tour")
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          formData.service_types.includes("tour")
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <MapPin className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Tours</h3>
                        <p className="text-sm text-muted-foreground">
                          Guided tours, experiences, activities
                        </p>
                      </div>
                      {formData.service_types.includes("tour") && (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </div>
                </div>

                {formData.service_types.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Please select at least one service type to continue
                  </p>
                )}

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={formData.service_types.length === 0}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Listing Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">List Your {formData.service_types[0] === 'accommodation' ? 'Property' : formData.service_types[0] === 'transport' ? 'Vehicle' : 'Tour'}</h2>
                  <p className="text-muted-foreground">Provide details about what you're offering</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Property Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Cozy Apartment in City Center"
                      value={formData.title}
                      onChange={(e) => updateField("title", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="location"
                        className="pl-10"
                        placeholder="City, District"
                        value={formData.location}
                        onChange={(e) => updateField("location", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyType">Property Type *</Label>
                    <Select value={formData.property_type} onValueChange={(val) => updateField("property_type", val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pricePerNight">Price per Night *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="pricePerNight"
                          type="number"
                          className="pl-10"
                          value={formData.price_per_night}
                          onChange={(e) => updateField("price_per_night", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <Select value={formData.currency} onValueChange={(val) => updateField("currency", val)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => <SelectItem key={c.value} value={c.value}>{c.symbol}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxGuests">Max Guests *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="maxGuests"
                        type="number"
                        className="pl-10"
                        min="1"
                        value={formData.max_guests}
                        onChange={(e) => updateField("max_guests", parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms *</Label>
                    <div className="relative">
                      <Bed className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="bedrooms"
                        type="number"
                        className="pl-10"
                        min="0"
                        value={formData.bedrooms}
                        onChange={(e) => updateField("bedrooms", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms *</Label>
                    <div className="relative">
                      <Bath className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="bathrooms"
                        type="number"
                        className="pl-10"
                        min="0"
                        value={formData.bathrooms}
                        onChange={(e) => updateField("bathrooms", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your property..."
                      rows={3}
                      value={formData.description}
                      onChange={(e) => updateField("description", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Property Photos * (At least 1)</Label>
                    <div className="flex flex-wrap gap-3">
                      {formData.images.map((img, i) => (
                        <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => updateField("images", formData.images.filter((_, j) => j !== i))}
                            className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full text-white flex items-center justify-center hover:bg-black/80"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-24 h-24"
                        onClick={() => setImageUploadOpen(true)}
                      >
                        <div className="flex flex-col items-center">
                          <Upload className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add</span>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <Label className="text-lg font-medium">Amenities (Select all that apply)</Label>
                    <p className="text-sm text-muted-foreground">Choose all amenities available in your property to attract more guests</p>
                    
                    {/* Organize amenities by category */}
                    <div className="space-y-6">
                      {/* Essential Amenities */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🏠 Essential</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['wifi', 'WiFi', 'hot_water', 'Hot water', 'AC', 'ac', 'Air conditioning', 'parking_free', 'parking_paid', 'Parking'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            const selected = formData.amenities.includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? formData.amenities.filter((a) => a !== amenity.value)
                                    : [...formData.amenities, amenity.value];
                                  updateField("amenities", newAmenities);
                                }}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{amenity.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Kitchen & Dining */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🍳 Kitchen & Dining</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['Kitchen', 'kitchen_items', 'refrigerator', 'microwave', 'cooker', 'oven', 'cooking_items', 'dining_items', 'dining_table', 'blender', 'kettle', 'coffee_maker', 'breakfast_free', 'breakfast_paid', 'Breakfast'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            const selected = formData.amenities.includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? formData.amenities.filter((a) => a !== amenity.value)
                                    : [...formData.amenities, amenity.value];
                                  updateField("amenities", newAmenities);
                                }}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{amenity.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Entertainment & Technology */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">📺 Entertainment & Tech</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['tv_smart', 'tv_basic', 'TV', 'workspace', 'wardrobe', 'hangers'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            const selected = formData.amenities.includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? formData.amenities.filter((a) => a !== amenity.value)
                                    : [...formData.amenities, amenity.value];
                                  updateField("amenities", newAmenities);
                                }}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{amenity.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bathroom & Laundry */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🚿 Bathroom & Laundry</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['toiletries', 'bathroom_essentials', 'cleaning_items', 'bedsheets_pillows', 'washing_machine', 'Washer', 'nearby_laundry', 'iron'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            const selected = formData.amenities.includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? formData.amenities.filter((a) => a !== amenity.value)
                                    : [...formData.amenities, amenity.value];
                                  updateField("amenities", newAmenities);
                                }}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{amenity.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Recreation & Wellness */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">💪 Recreation & Wellness</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['gym_free', 'gym_paid', 'Gym', 'pool', 'Pool', 'spa', 'Spa', 'Restaurant'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            const selected = formData.amenities.includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? formData.amenities.filter((a) => a !== amenity.value)
                                    : [...formData.amenities, amenity.value];
                                  updateField("amenities", newAmenities);
                                }}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{amenity.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Safety & Security */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🛡️ Safety & Security</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['carbon_monoxide_alarm', 'smoke_alarm', 'security_cameras', 'Security cameras', 'Security', 'fire_extinguisher', 'first_aid', 'safe', 'No smoking'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            const selected = formData.amenities.includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? formData.amenities.filter((a) => a !== amenity.value)
                                    : [...formData.amenities, amenity.value];
                                  updateField("amenities", newAmenities);
                                }}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{amenity.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Views & Outdoor */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🌅 Views & Outdoor</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['balcony', 'city_view', 'landscape_view', 'sea_view', 'lake_view', 'mountain_view', 'Garden'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            const selected = formData.amenities.includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? formData.amenities.filter((a) => a !== amenity.value)
                                    : [...formData.amenities, amenity.value];
                                  updateField("amenities", newAmenities);
                                }}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{amenity.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Accessibility & Other */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">♿ Accessibility & Other</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['elevator', 'wheelchair_accessible', 'meeting_room', 'reception', 'Family friendly', 'Fireplace', 'fans'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            const selected = formData.amenities.includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? formData.amenities.filter((a) => a !== amenity.value)
                                    : [...formData.amenities, amenity.value];
                                  updateField("amenities", newAmenities);
                                }}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-sm">{amenity.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {formData.amenities.length > 0 && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-2">Selected amenities ({formData.amenities.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {formData.amenities.map((amenityValue) => {
                            const amenity = AMENITIES.find(a => a.value === amenityValue);
                            return amenity ? (
                              <span key={amenityValue} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                <amenity.icon className="w-3 h-3" />
                                {amenity.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    disabled={!formData.title || !formData.location || !formData.description || formData.images.length === 0}
                    onClick={() => setCurrentStep(3)}
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Personal Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
                  <p className="text-muted-foreground">Tell us about yourself for verification</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="Your full name"
                      value={formData.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+250 XXX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idNumber">National ID Number *</Label>
                    <Input
                      id="idNumber"
                      placeholder="Enter your ID number"
                      value={formData.national_id_number}
                      onChange={(e) => updateField("national_id_number", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>ID Photo *</Label>
                    {formData.national_id_photo_url ? (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm flex-1">ID uploaded</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateField("national_id_photo_url", "")}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIdPhotoUploadOpen(true)}
                      >
                        <Upload className="w-4 h-4 mr-2" /> Upload ID Photo
                      </Button>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Selfie Photo *</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Please upload a clear selfie for identity verification
                    </p>
                    {formData.selfie_photo_url ? (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm flex-1">Selfie uploaded</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateField("selfie_photo_url", "")}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelfieUploadOpen(true)}
                      >
                        <Upload className="w-4 h-4 mr-2" /> Upload Selfie
                      </Button>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="about">About You (Optional)</Label>
                    <Textarea
                      id="about"
                      placeholder="Tell guests a bit about yourself..."
                      rows={3}
                      value={formData.about}
                      onChange={(e) => updateField("about", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    disabled={!formData.full_name || !formData.phone || !formData.national_id_number || !formData.national_id_photo_url || !formData.selfie_photo_url}
                    onClick={() => setCurrentStep(4)}
                  >
                    Review Application <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Review Your Application</h2>
                  <p className="text-muted-foreground">Make sure everything looks correct</p>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="w-5 h-5" />
                        Service Types
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {formData.service_types.map((type) => (
                          <div key={type} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            {type}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <UserRound className="w-5 h-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">{formData.full_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <p className="font-medium">{formData.phone}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ID Number:</span>
                        <p className="font-medium">{formData.national_id_number}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Home className="w-5 h-5" />
                        Property Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-lg">{formData.title}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {formData.location}
                        </p>
                      </div>
                      {formData.images[0] && (
                        <div className="rounded-lg overflow-hidden border">
                          <img src={formData.images[0]} alt="" className="w-full h-48 object-cover" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <p className="font-medium">{formatMoney(formData.price_per_night, formData.currency)}/night</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Guests:</span>
                          <p className="font-medium">{formData.max_guests}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bedrooms:</span>
                          <p className="font-medium">{formData.bedrooms}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bathrooms:</span>
                          <p className="font-medium">{formData.bathrooms}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Ready to Submit</p>
                      <p className="text-blue-800 dark:text-blue-200">
                        Your application will be reviewed within 1-3 business days. You'll be notified via email once approved.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">⚠️ Important: Verification Required</p>
                      <p className="text-amber-800 dark:text-amber-200">
                        Your listings will <strong>NOT be published</strong> or visible to guests until your application is verified and approved. 
                        After approval, you can manage and publish your listings from the Host Dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    Back
                  </Button>
                  <Button
                    size="lg"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />

      {/* Upload Dialogs */}
      <CloudinaryUploadDialog
        open={imageUploadOpen}
        onOpenChange={setImageUploadOpen}
        title="Upload Property Photos"
        folder="host_applications/property_photos"
        accept="image/*"
        multiple
        value={formData.images}
        onChange={(urls) => updateField("images", urls)}
      />

      <CloudinaryUploadDialog
        open={idPhotoUploadOpen}
        onOpenChange={setIdPhotoUploadOpen}
        title="Upload National ID Photo"
        folder="host_applications/id_photos"
        accept="image/*"
        multiple={false}
        value={formData.national_id_photo_url ? [formData.national_id_photo_url] : []}
        onChange={(urls) => updateField("national_id_photo_url", urls[0] || "")}
      />

      <CloudinaryUploadDialog
        open={selfieUploadOpen}
        onOpenChange={setSelfieUploadOpen}
        title="Upload Selfie Photo"
        folder="host_applications/selfies"
        accept="image/*"
        multiple={false}
        value={formData.selfie_photo_url ? [formData.selfie_photo_url] : []}
        onChange={(urls) => updateField("selfie_photo_url", urls[0] || "")}
      />
    </div>
  );
}
