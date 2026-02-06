import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { formatMoney } from "@/lib/money";

type ApplicantType = "individual" | "business";

import { CURRENCY_OPTIONS } from "@/lib/currencies";

const propertyTypes = ["Hotel", "Apartment", "Room in Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "House"];
const currencies = CURRENCY_OPTIONS;

export default function HostApplication() {
  const { user, refreshRoles, isHost, isLoading: authLoading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const affiliateCode = searchParams.get("ref");

  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingApp, setHasExistingApp] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const applicantType = "individual"; // Always individual
  const [submitting, setSubmitting] = useState(false);

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
    
    // Tour Guide specific fields
    nationality: "",
    languages_spoken: [] as string[],
    years_of_experience: "",
    areas_of_operation: "",
    tour_specialties: [] as string[],
    tour_guide_bio: "",
    tour_guide_license_url: "",
    
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
      categories: [] as string[],
      duration_days: 1,
      price_per_person: 100,
      max_group_size: 10,
      // Group-based pricing tiers (e.g., single person: $696, group of 2: $439, etc.)
      pricing_tiers: [] as Array<{ group_size: number; price_per_person: number }>,
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
    
    // TOUR PACKAGE data (optional, for detailed itineraries)
    tour_package: {
      enabled: false,
      title: "",
      categories: [] as string[],
      tour_type: "",
      description: "",
      city: "",
      duration: "",
      daily_itinerary: "",
      included_services: "",
      excluded_services: "",
      meeting_point: "",
      what_to_bring: "",
      price_per_adult: "",
      currency: "RWF",
      min_guests: 1,
      max_guests: 10,
      gallery_images: [] as string[],
      itinerary_pdf: "",
    },
  });

  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [idPhotoUploadOpen, setIdPhotoUploadOpen] = useState(false);
  const [selfieUploadOpen, setSelfieUploadOpen] = useState(false);
  const [licenseUploadOpen, setLicenseUploadOpen] = useState(false);
  const [tourPackageGalleryOpen, setTourPackageGalleryOpen] = useState(false);
  const [tourPackageItineraryOpen, setTourPackageItineraryOpen] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const STORAGE_KEY = 'host_application_progress';

  // Calculate total steps dynamically based on selected service types
  // Step 1: Service Type Selection
  // Step 2+: One step for each selected service type (accommodation, tour, tour_package, transport)
  // Second to last: Personal Information
  // Last: Review
  const serviceSteps = useMemo(() => {
    const steps: string[] = [];
    const serviceTypes = formData?.service_types || [];
    if (serviceTypes.includes('accommodation')) steps.push('accommodation');
    if (serviceTypes.includes('tour')) steps.push('tour');
    if (serviceTypes.includes('tour_package')) steps.push('tour_package');
    if (serviceTypes.includes('transport')) steps.push('transport');
    return steps;
  }, [formData?.service_types]);
  
  const totalSteps = useMemo(() => 1 + (serviceSteps?.length || 0) + 2, [serviceSteps]);
  const progress = useMemo(() => (currentStep / totalSteps) * 100, [currentStep, totalSteps]);
  
  // Get current service type being edited based on current step
  const currentServiceType = useMemo(() => {
    if (currentStep <= 1) return null;
    const serviceIndex = currentStep - 2;
    const service = serviceSteps[serviceIndex] || null;
    console.log('[HostApplication] Current service type:', service, 'Step:', currentStep, 'Service steps:', serviceSteps);
    return service;
  }, [currentStep, serviceSteps]);
  
  // Helper to get current service data
  const getCurrentServiceData = () => {
    if (currentServiceType === 'accommodation') return formData.accommodation;
    if (currentServiceType === 'tour') return formData.tour;
    if (currentServiceType === 'transport') return formData.transport;
    // Default to an empty accommodation object if no service type is active
    return formData.accommodation;
  };
  
  // Use 'as any' to bypass TypeScript union type checking - each field is service-specific
  const serviceData = getCurrentServiceData() as any;

  // Load saved progress from localStorage on mount (only once)
  useEffect(() => {
    if (draftLoaded) return;
    
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        
        // Merge saved data with defaults to ensure all fields exist
        const mergedFormData = {
          ...formData,
          ...parsed.formData,
          // Ensure nested objects are properly merged
          accommodation: {
            ...formData.accommodation,
            ...(parsed.formData?.accommodation || {}),
            amenities: parsed.formData?.accommodation?.amenities || [],
          },
          tour: {
            ...formData.tour,
            ...(parsed.formData?.tour || {}),
          },
          transport: {
            ...formData.transport,
            ...(parsed.formData?.transport || {}),
          },
          // Ensure arrays exist
          service_types: parsed.formData?.service_types || [],
        };
        
        setFormData(mergedFormData);
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
    setDraftLoaded(true);
  }, [draftLoaded]);

  // Save progress to localStorage whenever form data or step changes (only after load)
  useEffect(() => {
    if (!draftLoaded) return; // Don't save until we've loaded
    
    // Only save if there's meaningful content (at least service type selected or name entered)
    if (formData.service_types.length === 0 && !formData.full_name) return;
    
    const dataToSave = {
      formData,
      currentStep,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('[HostApplication] Saved progress to localStorage', { step: currentStep });
  }, [formData, currentStep, draftLoaded]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (formData.service_types.length === 0 && !formData.full_name) return;
      
      const dataToSave = {
        formData,
        currentStep,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('[HostApplication] Saved on page unload');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, currentStep]);

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

    let isMounted = true;
    const controller = new AbortController();

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

        if (isMounted && data) {
          setHasExistingApp(true);
          setExistingStatus(data.status);
          clearSavedProgress();
          
          // If application is approved, refresh roles to update navbar
          if (data.status === 'approved') {
            await refreshRoles();
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          logError("host-app.checkExisting", e);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkExisting();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user, authLoading, rolesLoading]);

  const updateField = (field: string, value: any) => {
    const currentService = currentServiceType;
    
    // Tour guide specific fields are always at root level, not nested
    const tourGuideFields = [
      'nationality',
      'languages_spoken', 
      'years_of_experience',
      'areas_of_operation',
      'tour_specialties',
      'tour_guide_bio',
      'tour_guide_license_url'
    ];
    
    // Personal info fields are always at root level
    const personalFields = [
      'full_name',
      'phone',
      'about',
      'national_id_number',
      'national_id_photo_url',
      'selfie_photo_url',
      'business_name',
      'business_tin',
      'service_types'
    ];
    
    // If it's a tour guide field or personal field, always update at root
    if (tourGuideFields.includes(field) || personalFields.includes(field)) {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    // If we're on a service-specific step, update that service's data
    else if (currentService && ['accommodation', 'tour', 'transport'].includes(currentService)) {
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
      
      // Add tour guide specific fields if applying for tours
      // Add tour guide specific fields if applying for tours or tour packages
      if (formData.service_types.includes('tour') || formData.service_types.includes('tour_package')) {
        payload.nationality = formData.nationality;
        payload.languages_spoken = formData.languages_spoken;
        payload.years_of_experience = parseInt(formData.years_of_experience) || 0;
        payload.areas_of_operation = formData.areas_of_operation;
        payload.tour_specialties = formData.tour_specialties;
        payload.tour_guide_bio = formData.tour_guide_bio;
        payload.tour_guide_license_url = formData.tour_guide_license_url;
      }

      // Add service-specific data as JSON
      if (formData.service_types.includes('accommodation')) {
        payload.accommodation_data = formData.accommodation;
        payload.hosting_location = formData.accommodation.location;
      }
      
      if (formData.service_types.includes('tour')) {
        payload.tour_data = formData.tour;
      }
      
      if (formData.service_types.includes('tour_package')) {
        payload.tour_package_data = formData.tour_package;
      }
      
      if (formData.service_types.includes('transport')) {
        payload.transport_data = formData.transport;
      }

      const { error } = await supabase.from("host_applications").insert(payload);

      if (error) throw error;

      // Track affiliate referral if applicable
      if (affiliateCode && user.id) {
        try {
          // Find affiliate by code
          const { data: affiliateData } = await supabase
            .from("affiliates")
            .select("id, user_id")
            .eq("affiliate_code", affiliateCode)
            .eq("status", "active")
            .single();

          if (affiliateData && affiliateData.user_id !== user.id) {
            // Create referral record
            await supabase.from("affiliate_referrals").insert({
              affiliate_id: affiliateData.id,
              referred_user_id: user.id,
              referred_user_email: user.email || "",
              status: "active",
            });
          }
        } catch (affiliateError) {
          // Don't fail the application if affiliate tracking fails
          console.error("Affiliate tracking error:", affiliateError);
        }
      }

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
              <Button size="lg" onClick={async () => {
                // Refresh roles to ensure the user has the host role loaded
                await refreshRoles();
                navigate("/host-dashboard");
              }}>
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
                <Button size="lg" onClick={async () => {
                  // Refresh roles to ensure the user has the host role loaded
                  await refreshRoles();
                  navigate("/host-dashboard");
                }}>
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

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          Day trips, guided experiences
                        </p>
                      </div>
                      {formData.service_types.includes("tour") && (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </div>

                  {/* Tour Packages */}
                  <div
                    onClick={() => {
                      const types = formData.service_types.includes("tour_package")
                        ? formData.service_types.filter((t) => t !== "tour_package")
                        : [...formData.service_types, "tour_package"];
                      updateField("service_types", types);
                    }}
                    className={`p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                      formData.service_types.includes("tour_package")
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          formData.service_types.includes("tour_package")
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <Compass className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Tour Packages</h3>
                        <p className="text-sm text-muted-foreground">
                          Multi-day safaris, itineraries
                        </p>
                      </div>
                      {formData.service_types.includes("tour_package") && (
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
                    onClick={() => {
                      if (!formData.service_types || formData.service_types.length === 0) {
                        toast({
                          variant: "destructive",
                          title: "Service type required",
                          description: "Please select at least one service type to continue.",
                        });
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    disabled={!formData.service_types || formData.service_types.length === 0}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2+: Service-Specific Details (dynamic based on selected services) */}
            {currentStep >= 2 && currentStep <= (1 + (serviceSteps?.length || 0)) && currentServiceType && currentServiceType !== 'tour_package' && (
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
                      <div className="md:col-span-2 space-y-2">
                        <Label>Tour Categories * <span className="text-xs text-muted-foreground">(select at least one)</span></Label>
                        <div className="flex flex-wrap gap-2">
                          {["Adventure", "Cultural", "Wildlife", "Historical", "Nature", "City Tours", "Eco-Tourism", "Photography", "Hiking"].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                (serviceData.categories || []).includes(cat)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted"
                              }`}
                              onClick={() => {
                                const cats = serviceData.categories || [];
                                if (cats.includes(cat)) {
                                  updateField("categories", cats.filter((c: string) => c !== cat));
                                } else {
                                  updateField("categories", [...cats, cat]);
                                }
                              }}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
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

                      {/* Currency selector */}
                      <div className="space-y-2">
                        <Label>Currency *</Label>
                        <Select value={serviceData.currency || "RWF"} onValueChange={(val) => updateField("currency", val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((c) => <SelectItem key={c.value} value={c.value}>{c.symbol} {c.value}</SelectItem>)}
                          </SelectContent>
                        </Select>
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

                      {/* Group-Based Pricing Tiers */}
                      <div className="md:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Group-Based Pricing *</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Set different prices per person based on group size (e.g., single: $696, group of 2: $439)
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const tiers = serviceData.pricing_tiers || [];
                              const nextSize = tiers.length === 0 ? 1 : Math.max(...tiers.map((t: any) => t.group_size)) + 1;
                              updateField("pricing_tiers", [...tiers, { group_size: nextSize, price_per_person: 100 }]);
                            }}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Add Tier
                          </Button>
                        </div>

                        {(serviceData.pricing_tiers || []).length === 0 && (
                          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                            No pricing tiers added yet. Click "Add Tier" to set prices for different group sizes.
                            <br />
                            <span className="text-xs">Example: 1 person = $696, 2 people = $439/person, 4 people = $311/person</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          {(serviceData.pricing_tiers || []).map((tier: { group_size: number; price_per_person: number }, index: number) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                              <div className="flex-1 flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    min="1"
                                    className="w-20"
                                    value={tier.group_size}
                                    onChange={(e) => {
                                      const tiers = [...(serviceData.pricing_tiers || [])];
                                      tiers[index] = { ...tiers[index], group_size: parseInt(e.target.value) || 1 };
                                      updateField("pricing_tiers", tiers);
                                    }}
                                  />
                                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                                    {tier.group_size === 1 ? "person" : "people"}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">=</span>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-28"
                                    value={tier.price_per_person}
                                    onChange={(e) => {
                                      const tiers = [...(serviceData.pricing_tiers || [])];
                                      tiers[index] = { ...tiers[index], price_per_person: parseInt(e.target.value) || 0 };
                                      updateField("pricing_tiers", tiers);
                                    }}
                                  />
                                  <span className="text-sm text-muted-foreground whitespace-nowrap">per person</span>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  const tiers = (serviceData.pricing_tiers || []).filter((_: any, i: number) => i !== index);
                                  updateField("pricing_tiers", tiers);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {(serviceData.pricing_tiers || []).length > 0 && (serviceData.pricing_tiers || []).length < 6 && (
                          <p className="text-xs text-muted-foreground">
                            Tip: Common group sizes are 1, 2, 4, and 6 people.
                          </p>
                        )}
                      </div>

                      {/* Hidden legacy field - use first tier or 0 as fallback */}
                      <input
                        type="hidden"
                        value={
                          (serviceData.pricing_tiers || []).length > 0
                            ? Math.min(...(serviceData.pricing_tiers || []).map((t: any) => t.price_per_person))
                            : serviceData.price_per_person || 0
                        }
                        onChange={() => {}}
                      />
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

                      {/* Entertainment & Technology */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">📺 Entertainment & Tech</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['tv_smart', 'tv_basic', 'workspace', 'wardrobe', 'hangers'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
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

                      {/* Bathroom & Laundry */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🚿 Bathroom & Laundry</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['toiletries', 'bathroom_essentials', 'towels', 'bedsheets', 'washing_machine', 'dryer', 'iron'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
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

                      {/* Recreation & Wellness */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">💪 Recreation & Wellness</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['gym', 'pool', 'sauna', 'jacuzzi', 'spa', 'restaurant'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
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

                      {/* Safety & Security */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🛡️ Safety & Security</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['carbon_monoxide_alarm', 'smoke_alarm', 'security_cameras', 'fire_extinguisher', 'first_aid', 'safe', 'no_smoking'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
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

                      {/* Views & Outdoor */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">🌅 Views & Outdoor</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['balcony', 'patio', 'terrace', 'garden', 'city_view', 'landscape_view', 'sea_view', 'lake_view', 'mountain_view'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
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

                      {/* Accessibility & Other */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">♿ Accessibility & Other</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {AMENITIES.filter(a => ['elevator', 'ground_floor', 'wheelchair_accessible', 'meeting_room', 'reception', 'concierge', 'room_service', 'family_friendly', 'crib', 'high_chair', 'fireplace', 'fan', 'air_purifier', 'soundproofing'].includes(a.value)).map((amenity) => {
                            const Icon = amenity.icon;
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
                    </div>
                    
                    {serviceData.amenities && serviceData.amenities.length > 0 && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-2">Selected amenities ({serviceData.amenities.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {serviceData.amenities.map((amenityValue: string) => {
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
                    onClick={() => {
                      const missingFields = [];
                      if (!serviceData.title) missingFields.push('Title');
                      if (!serviceData.location) missingFields.push('Location');
                      if (!serviceData.description) missingFields.push('Description');
                      if ((serviceData.images || []).length === 0) missingFields.push('At least one image');
                      
                      if (missingFields.length > 0) {
                        toast({
                          variant: "destructive",
                          title: "Missing required fields",
                          description: `Please provide: ${missingFields.join(', ')}.`,
                        });
                        return;
                      }
                      setCurrentStep(currentStep + 1);
                    }}
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Tour Package Step (shown when tour_package service type is selected) */}
            {currentServiceType === 'tour_package' && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Create Your Tour Package</h2>
                  <p className="text-muted-foreground">
                    Create a detailed multi-day tour package with itinerary
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Package Title *</Label>
                      <Input
                        placeholder="e.g., 3-Day Gorilla Trekking Safari"
                        value={formData.tour_package.title}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tour_package: { ...prev.tour_package, title: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <Input
                        placeholder="Kigali"
                        value={formData.tour_package.city}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tour_package: { ...prev.tour_package, city: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Categories * (select at least one)</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Cultural", "Adventure", "Wildlife", "City Tours", "Hiking", "Photography", "Historical", "Eco-Tourism"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            formData.tour_package.categories.includes(cat)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted"
                          }`}
                          onClick={() => {
                            const cats = formData.tour_package.categories;
                            setFormData(prev => ({
                              ...prev,
                                  tour_package: {
                                    ...prev.tour_package,
                                    categories: cats.includes(cat)
                                      ? cats.filter(c => c !== cat)
                                      : [...cats, cat]
                                  }
                                }));
                              }}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tour Type *</Label>
                          <Select
                            value={formData.tour_package.tour_type}
                            onValueChange={(val) => setFormData(prev => ({
                              ...prev,
                              tour_package: { ...prev.tour_package, tour_type: val }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Private">Private</SelectItem>
                              <SelectItem value="Group">Group</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Duration *</Label>
                          <Input
                            placeholder="e.g., 3 Days, 2 Nights"
                            value={formData.tour_package.duration}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              tour_package: { ...prev.tour_package, duration: e.target.value }
                            }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Description * 
                          <span className={`text-xs ml-1 ${formData.tour_package.description.length > 0 && formData.tour_package.description.length < 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            ({formData.tour_package.description.length}/50 chars min)
                          </span>
                        </Label>
                        <Textarea
                          placeholder="Provide a compelling description of your tour package..."
                          rows={4}
                          value={formData.tour_package.description}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            tour_package: { ...prev.tour_package, description: e.target.value }
                          }))}
                          className={formData.tour_package.description.length > 0 && formData.tour_package.description.length < 50 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Daily Itinerary * 
                          <span className={`text-xs ml-1 ${formData.tour_package.daily_itinerary.length > 0 && formData.tour_package.daily_itinerary.length < 100 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            ({formData.tour_package.daily_itinerary.length}/100 chars min)
                          </span>
                        </Label>
                        <Textarea
                          placeholder="Day 1: Arrival and welcome...&#10;Day 2: Gorilla trekking...&#10;Day 3: Departure..."
                          rows={6}
                          value={formData.tour_package.daily_itinerary}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            tour_package: { ...prev.tour_package, daily_itinerary: e.target.value }
                          }))}
                          className={formData.tour_package.daily_itinerary.length > 0 && formData.tour_package.daily_itinerary.length < 100 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>What's Included</Label>
                          <Textarea
                            placeholder="Transportation, meals, guide, permits..."
                            rows={3}
                            value={formData.tour_package.included_services}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              tour_package: { ...prev.tour_package, included_services: e.target.value }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>What's Not Included</Label>
                          <Textarea
                            placeholder="International flights, travel insurance..."
                            rows={3}
                            value={formData.tour_package.excluded_services}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              tour_package: { ...prev.tour_package, excluded_services: e.target.value }
                            }))}
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Price per Adult *</Label>
                          <Input
                            type="number"
                            placeholder="500"
                            value={formData.tour_package.price_per_adult}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              tour_package: { ...prev.tour_package, price_per_adult: e.target.value }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Select
                            value={formData.tour_package.currency}
                            onValueChange={(val) => setFormData(prev => ({
                              ...prev,
                              tour_package: { ...prev.tour_package, currency: val }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {currencies.map(c => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Max Guests</Label>
                          <Input
                            type="number"
                            min={1}
                            value={formData.tour_package.max_guests}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              tour_package: { ...prev.tour_package, max_guests: parseInt(e.target.value) || 10 }
                            }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Meeting Point</Label>
                        <Input
                          placeholder="Hotel pickup or specific location"
                          value={formData.tour_package.meeting_point}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            tour_package: { ...prev.tour_package, meeting_point: e.target.value }
                          }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>What to Bring</Label>
                        <Input
                          placeholder="Comfortable shoes, camera, sunscreen..."
                          value={formData.tour_package.what_to_bring}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            tour_package: { ...prev.tour_package, what_to_bring: e.target.value }
                          }))}
                        />
                      </div>

                      {/* Gallery Images */}
                      <div className="space-y-2">
                        <Label>Package Images</Label>
                        <p className="text-sm text-muted-foreground">Add photos of your tour package. The first image will be used as the cover.</p>
                        
                        {formData.tour_package.gallery_images.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {formData.tour_package.gallery_images.map((img, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={img}
                                  alt={`Package ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                {idx === 0 && (
                                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                                    Cover
                                  </span>
                                )}
                                <div className="absolute top-1 right-1 flex gap-1">
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      className="bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        const newImages = [...formData.tour_package.gallery_images];
                                        [newImages[idx - 1], newImages[idx]] = [newImages[idx], newImages[idx - 1]];
                                        setFormData(prev => ({
                                          ...prev,
                                          tour_package: { ...prev.tour_package, gallery_images: newImages }
                                        }));
                                      }}
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {idx < formData.tour_package.gallery_images.length - 1 && (
                                    <button
                                      type="button"
                                      className="bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        const newImages = [...formData.tour_package.gallery_images];
                                        [newImages[idx], newImages[idx + 1]] = [newImages[idx + 1], newImages[idx]];
                                        setFormData(prev => ({
                                          ...prev,
                                          tour_package: { ...prev.tour_package, gallery_images: newImages }
                                        }));
                                      }}
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        tour_package: {
                                          ...prev.tour_package,
                                          gallery_images: prev.tour_package.gallery_images.filter((_, i) => i !== idx)
                                        }
                                      }));
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setTourPackageGalleryOpen(true)}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Add Images
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Itinerary PDF (optional)</Label>
                        <div className="flex items-center gap-4">
                          {formData.tour_package.itinerary_pdf ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={formData.tour_package.itinerary_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline text-sm"
                              >
                                View Itinerary PDF
                              </a>
                              <button
                                type="button"
                                className="bg-destructive text-destructive-foreground rounded-full p-1"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  tour_package: { ...prev.tour_package, itinerary_pdf: "" }
                                }))}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setTourPackageItineraryOpen(true)}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Itinerary PDF
                            </Button>
                          )}
                        </div>
                      </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      // Validate required fields for tour package
                      const missingFields = [];
                      if (!formData.tour_package.title) missingFields.push('Package Title');
                      if (!formData.tour_package.city) missingFields.push('City');
                      if (formData.tour_package.categories.length === 0) missingFields.push('At least one category');
                      if (!formData.tour_package.tour_type) missingFields.push('Tour Type');
                      if (!formData.tour_package.duration) missingFields.push('Duration');
                      if (!formData.tour_package.description || formData.tour_package.description.length < 50) missingFields.push('Description (min 50 chars)');
                      if (!formData.tour_package.daily_itinerary || formData.tour_package.daily_itinerary.length < 100) missingFields.push('Daily Itinerary (min 100 chars)');
                      if (!formData.tour_package.price_per_adult) missingFields.push('Price per Adult');
                      
                      if (missingFields.length > 0) {
                        toast({
                          variant: "destructive",
                          title: "Missing required fields",
                          description: `Please provide: ${missingFields.join(', ')}.`,
                        });
                        return;
                      }
                      // Set enabled to true since they filled out the form
                      setFormData(prev => ({
                        ...prev,
                        tour_package: { ...prev.tour_package, enabled: true }
                      }));
                      setCurrentStep(currentStep + 1);
                    }}
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
                  
                  {/* Tour Guide Specific Fields */}
                  {formData.service_types.includes('tour') && (
                    <>
                      <div className="md:col-span-2 mt-6 pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Compass className="w-5 h-5" />
                          Tour Guide Professional Information
                        </h3>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="nationality">Nationality *</Label>
                        <Input
                          id="nationality"
                          placeholder="e.g., Rwandan"
                          value={formData.nationality}
                          onChange={(e) => updateField("nationality", e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="yearsExperience">Years of Experience *</Label>
                        <Input
                          id="yearsExperience"
                          type="number"
                          min="0"
                          placeholder="e.g., 5"
                          value={formData.years_of_experience}
                          onChange={(e) => updateField("years_of_experience", e.target.value)}
                        />
                      </div>
                      
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="areasOfOperation">Areas of Operation (City/Region) *</Label>
                        <Input
                          id="areasOfOperation"
                          placeholder="e.g., Kigali, Musanze, Rubavu"
                          value={formData.areas_of_operation}
                          onChange={(e) => updateField("areas_of_operation", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Enter cities or regions where you operate, separated by commas</p>
                      </div>
                      
                      <div className="md:col-span-2 space-y-2">
                        <Label>Languages Spoken * (Select all that apply)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {['English', 'French', 'Kinyarwanda', 'Swahili', 'German', 'Spanish', 'Chinese', 'Other'].map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => {
                                const current = formData.languages_spoken || [];
                                const newLangs = current.includes(lang)
                                  ? current.filter(l => l !== lang)
                                  : [...current, lang];
                                updateField("languages_spoken", newLangs);
                              }}
                              className={`p-2 rounded-lg border-2 text-sm transition-all ${
                                (formData.languages_spoken || []).includes(lang)
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="md:col-span-2 space-y-2">
                        <Label>Tour Specialties * (Select all that apply)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {['Cultural', 'Adventure', 'Wildlife', 'City Tours', 'Hiking', 'Photography', 'Historical', 'Eco-Tourism'].map((specialty) => (
                            <button
                              key={specialty}
                              type="button"
                              onClick={() => {
                                const current = formData.tour_specialties || [];
                                const newSpecs = current.includes(specialty)
                                  ? current.filter(s => s !== specialty)
                                  : [...current, specialty];
                                updateField("tour_specialties", newSpecs);
                              }}
                              className={`p-2 rounded-lg border-2 text-sm transition-all ${
                                (formData.tour_specialties || []).includes(specialty)
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {specialty}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="tourGuideBio">Professional Bio / Introduction *</Label>
                        <Textarea
                          id="tourGuideBio"
                          placeholder="Tell us about your experience as a tour guide, your passion for tourism, and what makes you unique..."
                          rows={4}
                          value={formData.tour_guide_bio}
                          onChange={(e) => updateField("tour_guide_bio", e.target.value)}
                          className={formData.tour_guide_bio.length > 0 && formData.tour_guide_bio.length < 100 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                        <p className={`text-xs ${formData.tour_guide_bio.length > 0 && formData.tour_guide_bio.length < 100 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                          ({formData.tour_guide_bio.length}/100 chars min)
                        </p>
                      </div>
                      
                      <div className="md:col-span-2 space-y-2">
                        <Label>Tour Guide License / Certificate *</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Upload your official tour guide license or certification (PDF or image)
                        </p>
                        {formData.tour_guide_license_url ? (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-sm flex-1">License uploaded</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateField("tour_guide_license_url", "")}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setLicenseUploadOpen(true)}
                          >
                            <Upload className="w-4 h-4 mr-2" /> Upload License/Certificate
                          </Button>
                        )}
                      </div>
                    </>
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
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={
                      !formData.full_name || 
                      !formData.phone || 
                      !formData.national_id_number || 
                      !formData.national_id_photo_url || 
                      !formData.selfie_photo_url ||
                      // Tour guide specific validation
                      (formData.service_types.includes('tour') && (
                        !formData.nationality ||
                        !formData.years_of_experience ||
                        !formData.areas_of_operation ||
                        (formData.languages_spoken || []).length === 0 ||
                        (formData.tour_specialties || []).length === 0 ||
                        !formData.tour_guide_bio ||
                        formData.tour_guide_bio.length < 100 ||
                        !formData.tour_guide_license_url
                      ))
                    }
                    onClick={() => {
                      // Validate basic personal information
                      const missingFields = [];
                      if (!formData.full_name || formData.full_name.trim() === '') missingFields.push('Full Name');
                      if (!formData.phone || formData.phone.trim() === '') missingFields.push('Phone Number');
                      if (!formData.national_id_number || formData.national_id_number.trim() === '') missingFields.push('National ID Number');
                      if (!formData.national_id_photo_url) missingFields.push('National ID Photo');
                      if (!formData.selfie_photo_url) missingFields.push('Selfie Photo');

                      // Tour guide specific validation
                      if (formData.service_types.includes('tour')) {
                        if (!formData.nationality) missingFields.push('Nationality');
                        if (!formData.years_of_experience) missingFields.push('Years of Experience');
                        if (!formData.areas_of_operation) missingFields.push('Areas of Operation');
                        if ((formData.languages_spoken || []).length === 0) missingFields.push('Languages Spoken');
                        if ((formData.tour_specialties || []).length === 0) missingFields.push('Tour Specialties');
                        if (!formData.tour_guide_bio) {
                          missingFields.push('Tour Guide Bio');
                        } else if (formData.tour_guide_bio.length < 100) {
                          toast({
                            variant: "destructive",
                            title: "Bio too short",
                            description: `Your tour guide bio must be at least 100 characters. Current: ${formData.tour_guide_bio.length}/100.`,
                          });
                          return;
                        }
                        if (!formData.tour_guide_license_url) missingFields.push('Tour Guide License/Certificate');
                      }

                      if (missingFields.length > 0) {
                        toast({
                          variant: "destructive",
                          title: "Missing required information",
                          description: `Please provide: ${missingFields.join(', ')}.`,
                        });
                        return;
                      }

                      setCurrentStep(currentStep + 1);
                    }}
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
                            <span className="text-muted-foreground">Duration:</span>
                            <p className="font-medium">{formData.tour.duration_days || 0} days</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Categories:</span>
                            <p className="font-medium">{(formData.tour.categories || []).join(', ') || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Group Size:</span>
                            <p className="font-medium">{formData.tour.max_group_size || 0} people</p>
                          </div>
                        </div>
                        {/* Group-Based Pricing Summary */}
                        {(formData.tour.pricing_tiers || []).length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <span className="text-sm text-muted-foreground font-medium">Group Pricing:</span>
                            <div className="mt-2 space-y-1">
                              {(formData.tour.pricing_tiers || [])
                                .sort((a: any, b: any) => b.group_size - a.group_size)
                                .map((tier: any, idx: number) => (
                                  <p key={idx} className="text-sm">
                                    <span className="font-medium">
                                      {tier.group_size === 1 ? 'Single person' : `Group of ${tier.group_size}`}:
                                    </span>{' '}
                                    {formatMoney(tier.price_per_person, formData.tour.currency || 'RWF')}/person
                                  </p>
                                ))}
                            </div>
                          </div>
                        )}
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
        onChange={(urls) => {
          updateField("national_id_photo_url", urls[0] || "");
          if (urls[0]) {
            setIdPhotoUploadOpen(false);
            toast({
              title: "Upload successful",
              description: "Your National ID photo has been uploaded.",
            });
          }
        }}
      />

      <CloudinaryUploadDialog
        open={selfieUploadOpen}
        onOpenChange={setSelfieUploadOpen}
        title="Upload Selfie Photo"
        folder="host_applications/selfies"
        accept="image/*"
        multiple={false}
        value={formData.selfie_photo_url ? [formData.selfie_photo_url] : []}
        onChange={(urls) => {
          updateField("selfie_photo_url", urls[0] || "");
          if (urls[0]) {
            setSelfieUploadOpen(false);
            toast({
              title: "Upload successful",
              description: "Your selfie photo has been uploaded.",
            });
          }
        }}
      />

      <CloudinaryUploadDialog
        open={licenseUploadOpen}
        onOpenChange={setLicenseUploadOpen}
        title="Upload Tour Guide License/Certificate"
        folder="host_applications/tour_licenses"
        accept="image/*,application/pdf"
        multiple={false}
        value={formData.tour_guide_license_url ? [formData.tour_guide_license_url] : []}
        onChange={(urls) => {
          updateField("tour_guide_license_url", urls[0] || "");
          if (urls[0]) {
            setLicenseUploadOpen(false);
            toast({
              title: "Upload successful",
              description: "Your tour guide license/certificate has been uploaded.",
            });
          }
        }}
      />

      <CloudinaryUploadDialog
        open={tourPackageGalleryOpen}
        onOpenChange={setTourPackageGalleryOpen}
        title="Upload Package Images"
        folder="tour_packages/gallery"
        accept="image/*"
        multiple={true}
        value={formData.tour_package.gallery_images}
        onChange={(urls) => {
          setFormData(prev => ({
            ...prev,
            tour_package: { ...prev.tour_package, gallery_images: urls }
          }));
          if (urls.length > 0) {
            setTourPackageGalleryOpen(false);
            toast({
              title: "Upload successful",
              description: `${urls.length} image(s) have been uploaded.`,
            });
          }
        }}
      />

      <CloudinaryUploadDialog
        open={tourPackageItineraryOpen}
        onOpenChange={setTourPackageItineraryOpen}
        title="Upload Itinerary PDF"
        folder="tour_packages/itineraries"
        accept="application/pdf"
        multiple={false}
        value={formData.tour_package.itinerary_pdf ? [formData.tour_package.itinerary_pdf] : []}
        onChange={(urls) => {
          setFormData(prev => ({
            ...prev,
            tour_package: { ...prev.tour_package, itinerary_pdf: urls[0] || "" }
          }));
          if (urls[0]) {
            setTourPackageItineraryOpen(false);
            toast({
              title: "Upload successful",
              description: "Your itinerary PDF has been uploaded.",
            });
          }
        }}
      />
    </div>
  );
}
