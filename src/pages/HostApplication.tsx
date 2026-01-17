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
  Car,
  Compass,
} from "lucide-react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { formatMoney } from "@/lib/money";

type ApplicantType = "individual" | "business";

const propertyTypes = ["Hotel", "Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "House"];
const currencies = [
  { value: "RWF", label: "(FRw) RWF", symbol: "FRw" },
  { value: "USD", label: "($) USD", symbol: "$" },
  { value: "EUR", label: "(€) EUR", symbol: "€" },
  { value: "GBP", label: "(£) GBP", symbol: "£" },
  { value: "CNY", label: "(¥) CNY", symbol: "¥" },
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

  // Simplified form state - SEPARATE data for each service type
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
    
    // ACCOMMODATION data (separate object)
    accommodation: {
      title: "",
      location: "",
      description: "",
      currency: "RWF",
      images: [] as string[],
      property_type: "Apartment",
      price_per_night: 50000,
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      beds: 1,
      amenities: [] as string[],
    },
    
    // TOUR data (separate object)
    tour: {
      title: "",
      location: "",
      description: "",
      currency: "RWF",
      images: [] as string[],
      category: "Adventure",
      duration_days: 1,
      difficulty: "Easy",
      price_per_person: 100,
      max_group_size: 10,
    },
    
    // TRANSPORT data (separate object)
    transport: {
      title: "",
      location: "",
      description: "",
      currency: "RWF",
      images: [] as string[],
      vehicle_type: "Car",
      seats: 4,
      price_per_day: 50,
      driver_included: false,
      provider_name: "",
    },
  });

  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [idPhotoUploadOpen, setIdPhotoUploadOpen] = useState(false);
  const [selfieUploadOpen, setSelfieUploadOpen] = useState(false);

  const STORAGE_KEY = 'host_application_progress';

  // Calculate total steps dynamically based on selected service types
  // Step 1: Service Type Selection
  // Step 2+: One step for each selected service type (accommodation, tour, transport)
  // Second to last: Personal Information
  // Last: Review
  const getServiceSteps = () => {
    const steps = [];
    const serviceTypes = formData?.service_types || [];
    if (serviceTypes.includes('accommodation')) steps.push('accommodation');
    if (serviceTypes.includes('tour')) steps.push('tour');
    if (serviceTypes.includes('transport')) steps.push('transport');
    return steps;
  };
  
  const serviceSteps = getServiceSteps();
  const totalSteps = 1 + (serviceSteps?.length || 0) + 2; // 1 (service selection) + service steps + 1 (personal info) + 1 (review)
  const progress = (currentStep / totalSteps) * 100;
  
  // Get current service type being edited based on current step
  const getCurrentServiceType = () => {
    if (currentStep <= 1) return null;
    const serviceIndex = currentStep - 2;
    return serviceSteps[serviceIndex] || null;
  };
  
  const currentServiceType = getCurrentServiceType();
  
  // Helper to get current service data
  const getCurrentServiceData = () => {
    if (currentServiceType === 'accommodation') return formData.accommodation;
    if (currentServiceType === 'tour') return formData.tour;
    if (currentServiceType === 'transport') return formData.transport;
    return formData.accommodation; // fallback
  };
  
  // Use 'as any' to bypass TypeScript union type checking - each field is service-specific
  const serviceData = getCurrentServiceData() as any;

  // Load saved progress from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed.formData || formData);
        setCurrentStep(parsed.currentStep || 1);
        console.log('[HostApplication] Restored saved progress');
        
        // Show notification that progress was restored
        toast({
          title: "Progress Restored",
          description: "Your application progress has been restored. Continue where you left off!",
          duration: 5000,
        });
      } catch (e) {
        console.error('[HostApplication] Failed to restore progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage whenever form data or step changes
  useEffect(() => {
    if (user && !hasExistingApp) {
      const dataToSave = {
        formData,
        currentStep,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [formData, currentStep, user, hasExistingApp]);

  // Clear saved progress when application is submitted
  const clearSavedProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

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
          // Clear saved progress if they have an existing application
          clearSavedProgress();
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
    const currentService = getCurrentServiceType();
    
    // If we're on a service-specific step, update that service's data
    if (currentService && ['accommodation', 'tour', 'transport'].includes(currentService)) {
      setFormData((prev) => ({
        ...prev,
        [currentService]: {
          ...prev[currentService as 'accommodation' | 'tour' | 'transport'],
          [field]: value
        }
      }));
    } else {
      // Otherwise update the main form data
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!user || submitting) return; // Prevent multiple submissions
    setSubmitting(true);

    try {
      const payload: any = {
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
      };

      // Add service-specific data as JSON
      if (formData.service_types.includes('accommodation')) {
        payload.accommodation_data = formData.accommodation;
        payload.hosting_location = formData.accommodation.location;
      }
      
      if (formData.service_types.includes('tour')) {
        payload.tour_data = formData.tour;
      }
      
      if (formData.service_types.includes('transport')) {
        payload.transport_data = formData.transport;
      }

      const { error } = await supabase.from("host_applications").insert(payload);

      if (error) throw error;

      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon.",
      });

      // Clear saved progress after successful submission
      clearSavedProgress();

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

  // Disable loading screen - show content immediately
  // if (authLoading || rolesLoading || isLoading) {
  //   // Add debugging info
  //   console.log("[HostApplication] Loading states:", { authLoading, rolesLoading, isLoading, hasUser: !!user });
  //   
  //   return (
  //     <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
  //       <Navbar />
  //       <main className="flex-1 flex items-center justify-center">
  //         <div className="flex flex-col items-center gap-4">
  //           <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  //           <p className="text-sm text-muted-foreground">
  //             {authLoading ? "Checking authentication..." : 
  //              rolesLoading ? "Loading user permissions..." : 
  //              "Loading application data..."}
  //           </p>
  //         </div>
  //       </main>
  //       <Footer />
  //     </div>
  //   );
  // }

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
              {existingStatus === "rejected" && (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-red-600" />
                  </div>
                  <CardTitle className="text-3xl">Application Declined</CardTitle>
                  <CardDescription className="text-lg">
                    Unfortunately, your application was not approved
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
              {existingStatus === "rejected" && (
                <>
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                      Your host application has been reviewed and unfortunately does not meet our current requirements.
                    </p>
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Please contact our support team for more information or to discuss reapplying.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button size="lg" onClick={() => navigate("/")}>
                      Back to Home
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => window.location.href = 'mailto:support@merry360x.com'}>
                      Contact Support
                    </Button>
                  </div>
                </>
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

                {(!formData.service_types || formData.service_types.length === 0) && (
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
                    disabled={!formData.service_types || formData.service_types.length === 0}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2+: Service-Specific Details (dynamic based on selected services) */}
            {currentStep >= 2 && currentStep <= (1 + (serviceSteps?.length || 0)) && currentServiceType && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">
                    List Your {currentServiceType === 'accommodation' ? 'Property' : currentServiceType === 'transport' ? 'Vehicle' : 'Tour'}
                  </h2>
                  <p className="text-muted-foreground">
                    {currentServiceType === 'accommodation' && 'Provide details about your accommodation'}
                    {currentServiceType === 'tour' && 'Provide details about your tour experience'}
                    {currentServiceType === 'transport' && 'Provide details about your vehicle'}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      {currentServiceType === 'accommodation' ? 'Property' : currentServiceType === 'transport' ? 'Vehicle' : 'Tour'} Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder={
                        currentServiceType === 'accommodation' ? 'e.g., Cozy Apartment in City Center' :
                        currentServiceType === 'tour' ? 'e.g., Gorilla Trekking Adventure' :
                        'e.g., Luxury SUV with Driver'
                      }
                      value={serviceData.title || ""}
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
                        value={serviceData.location || ""}
                        onChange={(e) => updateField("location", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Accommodation-specific fields */}
                  {currentServiceType === 'accommodation' && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Full Address</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="address"
                            className="pl-10"
                            placeholder="Street address, building number, etc."
                            value={formData.address || ""}
                            onChange={(e) => updateField("address", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="propertyType">Property Type *</Label>
                        <Select value={serviceData.property_type || "Apartment"} onValueChange={(val) => updateField("property_type", val)}>
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
                              value={serviceData.price_per_night || 50000}
                              onChange={(e) => updateField("price_per_night", parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <Select value={serviceData.currency || "RWF"} onValueChange={(val) => updateField("currency", val)}>
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
                            value={serviceData.max_guests || 2}
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
                            value={serviceData.bedrooms || 1}
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
                            value={serviceData.bathrooms || 1}
                            onChange={(e) => updateField("bathrooms", parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="beds">Beds *</Label>
                        <div className="relative">
                          <Bed className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="beds"
                            type="number"
                            className="pl-10"
                            min="1"
                            value={serviceData.beds || serviceData.bedrooms || 1}
                            onChange={(e) => updateField("beds", parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Tour-specific fields */}
                  {currentServiceType === 'tour' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="tourCategory">Tour Category *</Label>
                        <Select value={serviceData.category || "Adventure"} onValueChange={(val) => updateField("category", val)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Adventure">Adventure</SelectItem>
                            <SelectItem value="Cultural">Cultural</SelectItem>
                            <SelectItem value="Wildlife">Wildlife</SelectItem>
                            <SelectItem value="Historical">Historical</SelectItem>
                            <SelectItem value="Nature">Nature</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tourDuration">Duration (Days) *</Label>
                        <Input
                          id="tourDuration"
                          type="number"
                          min="1"
                          value={serviceData.duration_days || 1}
                          onChange={(e) => updateField("duration_days", parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tourDifficulty">Difficulty Level *</Label>
                        <Select value={serviceData.difficulty || "Easy"} onValueChange={(val) => updateField("difficulty", val)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Challenging">Challenging</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tourPrice">Price per Person *</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="tourPrice"
                              type="number"
                              className="pl-10"
                              value={serviceData.price_per_person || 100}
                              onChange={(e) => updateField("price_per_person", parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <Select value={serviceData.currency || "RWF"} onValueChange={(val) => updateField("currency", val)}>
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
                        <Label htmlFor="maxGroupSize">Max Group Size *</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="maxGroupSize"
                            type="number"
                            className="pl-10"
                            min="1"
                            value={serviceData.max_group_size || 10}
                            onChange={(e) => updateField("max_group_size", parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Transport-specific fields */}
                  {currentServiceType === 'transport' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleType">Vehicle Type *</Label>
                        <Select value={serviceData.vehicle_type || "Car"} onValueChange={(val) => updateField("vehicle_type", val)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Car">Car</SelectItem>
                            <SelectItem value="SUV">SUV</SelectItem>
                            <SelectItem value="Van">Van</SelectItem>
                            <SelectItem value="Bus">Bus</SelectItem>
                            <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vehicleSeats">Number of Seats *</Label>
                        <Input
                          id="vehicleSeats"
                          type="number"
                          min="1"
                          value={serviceData.seats || 4}
                          onChange={(e) => updateField("seats", parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vehiclePrice">Price per Day *</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="vehiclePrice"
                              type="number"
                              className="pl-10"
                              value={serviceData.price_per_day || 50}
                              onChange={(e) => updateField("price_per_day", parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <Select value={serviceData.currency || "RWF"} onValueChange={(val) => updateField("currency", val)}>
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
                        <Label htmlFor="providerName">Provider/Company Name *</Label>
                        <Input
                          id="providerName"
                          placeholder="e.g., ABC Transport Services"
                          value={serviceData.provider_name || ""}
                          onChange={(e) => updateField("provider_name", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="driverIncluded"
                          checked={serviceData.driver_included || false}
                          onChange={(e) => updateField("driver_included", e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="driverIncluded" className="cursor-pointer">Driver Included</Label>
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder={
                        currentServiceType === 'accommodation' ? 'Describe your property...' :
                        currentServiceType === 'tour' ? 'Describe your tour experience...' :
                        'Describe your vehicle and services...'
                      }
                      rows={3}
                      value={serviceData.description || ""}
                      onChange={(e) => updateField("description", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>
                      {currentServiceType === 'accommodation' ? 'Property' : currentServiceType === 'tour' ? 'Tour' : 'Vehicle'} Photos * (At least 1)
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {(serviceData.images || []).map((img, i) => (
                        <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => updateField("images", (serviceData.images || []).filter((_, j) => j !== i))}
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

                  {/* Amenities section - Only for accommodation */}
                  {currentServiceType === 'accommodation' && (
                    <div className="md:col-span-2 space-y-4">
                      <Label className="text-lg font-medium">Amenities (Select all that apply)</Label>
                      <p className="text-sm text-muted-foreground">Choose all amenities available in your property to attract more guests</p>
                    
                    {/* Organize amenities by category */}
                    <div className="space-y-6">
                      {/* Essential Amenities */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🏠 Essential</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['wifi', 'hot_water', 'ac', 'heating', 'parking_free', 'parking_paid'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            // @ts-expect-error - serviceData is a union type
                            const selected = (serviceData.amenities || []).includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? (serviceData.amenities || []).filter((a) => a !== amenity.value)
                                    : [...(serviceData.amenities || []), amenity.value];
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
                          {AMENITIES.filter(a => ['kitchen', 'kitchenette', 'refrigerator', 'microwave', 'stove', 'oven', 'dishwasher', 'cookware', 'dishes', 'dining_table', 'blender', 'kettle', 'coffee_maker', 'breakfast_included', 'breakfast_available'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            // @ts-expect-error - serviceData is a union type
                            const selected = (serviceData.amenities || []).includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? (serviceData.amenities || []).filter((a) => a !== amenity.value)
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
                          {AMENITIES.filter(a => ['tv_smart', 'tv_basic', 'workspace', 'wardrobe', 'hangers'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            // @ts-expect-error - serviceData is a union type
                            const selected = (serviceData.amenities || []).includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? (serviceData.amenities || []).filter((a) => a !== amenity.value)
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
                          {AMENITIES.filter(a => ['toiletries', 'bathroom_essentials', 'towels', 'bedsheets', 'washing_machine', 'dryer', 'iron'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            // @ts-expect-error - serviceData is a union type
                            const selected = (serviceData.amenities || []).includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? (serviceData.amenities || []).filter((a) => a !== amenity.value)
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
                          {AMENITIES.filter(a => ['gym', 'pool', 'sauna', 'jacuzzi', 'spa', 'restaurant'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            // @ts-expect-error - serviceData is a union type
                            const selected = (serviceData.amenities || []).includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? (serviceData.amenities || []).filter((a) => a !== amenity.value)
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
                          {AMENITIES.filter(a => ['carbon_monoxide_alarm', 'smoke_alarm', 'security_cameras', 'fire_extinguisher', 'first_aid', 'safe', 'no_smoking'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            // @ts-expect-error - serviceData is a union type
                            const selected = (serviceData.amenities || []).includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? (serviceData.amenities || []).filter((a) => a !== amenity.value)
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
                          {AMENITIES.filter(a => ['balcony', 'patio', 'terrace', 'garden', 'city_view', 'landscape_view', 'sea_view', 'lake_view', 'mountain_view'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            // @ts-expect-error - serviceData is a union type
                            const selected = (serviceData.amenities || []).includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? (serviceData.amenities || []).filter((a) => a !== amenity.value)
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
                          {AMENITIES.filter(a => ['elevator', 'ground_floor', 'wheelchair_accessible', 'meeting_room', 'reception', 'concierge', 'room_service', 'family_friendly', 'crib', 'high_chair', 'fireplace', 'fan', 'air_purifier', 'soundproofing'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
                            // @ts-expect-error - serviceData is a union type
                            const selected = (serviceData.amenities || []).includes(amenity.value);
                            return (
                              <button
                                key={amenity.value}
                                type="button"
                                onClick={() => {
                                  const newAmenities = selected
                                    ? (serviceData.amenities || []).filter((a) => a !== amenity.value)
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
                    
                    {formData.amenities && formData.amenities.length > 0 && (
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
                  )}
                </div>

                <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Back
                  </Button>
                  <Button
                    disabled={!serviceData.title || !serviceData.location || !serviceData.description || (serviceData.images || []).length === 0}
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Personal Information Step */}
            {currentStep === (1 + (serviceSteps?.length || 0) + 1) && (
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
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Back
                  </Button>
                  <Button
                    disabled={!formData.full_name || !formData.phone || !formData.national_id_number || !formData.national_id_photo_url || !formData.selfie_photo_url}
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Review Application <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Review & Submit Step */}
            {currentStep === totalSteps && (
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

                  {/* Show details for each selected service type */}
                  {formData.service_types.includes('accommodation') && formData.accommodation.title && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Home className="w-5 h-5" />
                          Accommodation Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg">{formData.accommodation.title}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {formData.accommodation.location}
                          </p>
                        </div>
                        {formData.accommodation.images?.[0] && (
                          <div className="rounded-lg overflow-hidden border">
                            <img src={formData.accommodation.images[0]} alt="" className="w-full h-48 object-cover" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <p className="font-medium">{formatMoney(formData.accommodation.price_per_night || 0, formData.accommodation.currency || 'RWF')}/night</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Guests:</span>
                            <p className="font-medium">{formData.accommodation.max_guests || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Bedrooms:</span>
                            <p className="font-medium">{formData.accommodation.bedrooms || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Bathrooms:</span>
                            <p className="font-medium">{formData.accommodation.bathrooms || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formData.service_types.includes('tour') && formData.tour.title && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Compass className="w-5 h-5" />
                          Tour Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg">{formData.tour.title}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {formData.tour.location}
                          </p>
                        </div>
                        {formData.tour.images?.[0] && (
                          <div className="rounded-lg overflow-hidden border">
                            <img src={formData.tour.images[0]} alt="" className="w-full h-48 object-cover" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <p className="font-medium">{formatMoney(formData.tour.price_per_person || 0, formData.tour.currency || 'RWF')}/person</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <p className="font-medium">{formData.tour.duration_days || 0} days</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Difficulty:</span>
                            <p className="font-medium">{formData.tour.difficulty || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Group Size:</span>
                            <p className="font-medium">{formData.tour.max_group_size || 0} people</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formData.service_types.includes('transport') && formData.transport.title && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Car className="w-5 h-5" />
                          Transport Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg">{formData.transport.title}</h4>
                          <p className="text-sm text-muted-foreground">{formData.transport.vehicle_type || 'N/A'}</p>
                        </div>
                        {formData.transport.images?.[0] && (
                          <div className="rounded-lg overflow-hidden border">
                            <img src={formData.transport.images[0]} alt="" className="w-full h-48 object-cover" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <p className="font-medium">{formatMoney(formData.transport.price_per_day || 0, formData.transport.currency || 'RWF')}/day</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Seats:</span>
                            <p className="font-medium">{formData.transport.seats || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Driver:</span>
                            <p className="font-medium">{formData.transport.driver_included ? 'Included' : 'Not included'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Provider:</span>
                            <p className="font-medium">{formData.transport.provider_name || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
                  <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
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
        title={`Upload ${currentServiceType === 'accommodation' ? 'Property' : currentServiceType === 'tour' ? 'Tour' : 'Vehicle'} Photos`}
        folder="host_applications/property_photos"
        accept="image/*"
        multiple
        value={getCurrentServiceData().images || []}
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
