import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AMENITIES } from "@/lib/amenities";
import { amenityByValue } from "@/lib/amenities";
import {
  Building2,
  UserRound,
  CheckCircle2,
  AlertTriangle,
  Home,
  ImageIcon,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Info,
  DollarSign,
  Users,
  Bed,
  Bath,
  ChevronLeft,
  Percent,
} from "lucide-react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { formatMoney } from "@/lib/money";

type ApplicantType = "individual" | "business";

const propertyTypes = ["Hotel", "Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "Motel", "House", "Cabin"];
const currencies = [
  { value: "RWF", label: "RWF - Rwandan Franc" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
];

const cancellationPolicies = [
  { value: "strict", label: "Strict - Less refunds" },
  { value: "fair", label: "Fair - Moderate refunds" },
  { value: "lenient", label: "Lenient - More refunds" },
] as const;

const cancellationPolicyDetails: Record<string, { title: string; lines: string[] }> = {
  strict: {
    title: "Strict",
    lines: [
      "15–30 days before check-in: Full refund (minus fees)",
      "7–15 days: 75% refund (minus fees)",
      "3–7 days: 50% refund (minus fees)",
      "1–3 days: 25% refund (minus fees)",
      "0–1 day: No refund",
      "No-shows: Non-refundable",
    ],
  },
  fair: {
    title: "Fair",
    lines: [
      "7–15 days before check-in: Full refund (minus fees)",
      "3–7 days: 75% refund (minus fees)",
      "1–3 days: 50% refund (minus fees)",
      "0–1 day: 25% refund",
      "No-shows: Non-refundable",
    ],
  },
  lenient: {
    title: "Lenient",
    lines: [
      "3–7 days before check-in: Full refund (minus fees)",
      "1–3 days: 75% refund (minus fees)",
      "0–1 day: 50% refund",
      "No-shows: Non-refundable",
    ],
  },
};

export default function HostApplication() {
  const { user, refreshRoles, isHost, isLoading: authLoading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingApp, setHasExistingApp] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  // Steps: 1 = Type, 2 = Property, 3 = Verification
  const [step, setStep] = useState(1);
  const [applicantType, setApplicantType] = useState<ApplicantType>("individual");

  // Property details
  const [property, setProperty] = useState({
    title: "",
    location: "",
    address: "",
    description: "",
    property_type: "Apartment",
    price_per_night: 50000,
    currency: "RWF",
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    amenities: [] as string[],
    images: [] as string[],
    cancellation_policy: "fair",
    weekly_discount: 0,
    monthly_discount: 0,
    check_in_time: "14:00",
    check_out_time: "11:00",
    smoking_allowed: false,
    events_allowed: false,
    pets_allowed: false,
  });

  // Personal/Business details
  const [details, setDetails] = useState({
    full_name: "",
    phone: "",
    about: "",
    business_name: "",
    business_tin: "",
    business_certificate_url: "",
    national_id_number: "",
    national_id_photo_url: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [idPhotoUploadOpen, setIdPhotoUploadOpen] = useState(false);
  const [certificateUploadOpen, setCertificateUploadOpen] = useState(false);

  // "Add property" wizard inside Become Host (same UX as Host Dashboard)
  const [listingStep, setListingStep] = useState(1);
  const listingTotalSteps = 5;
  const listingStepTitles = ["Basic Info", "Details", "Photos", "Amenities", "Review"];

  // Check for existing application
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Don't redirect away — show an explicit sign-in gate so the page is "visible".
      setIsLoading(false);
      return;
    }

    const checkExisting = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("host_applications")
          // Use * to avoid 400s when remote schema differs (missing columns).
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          // If table doesn't exist yet, just proceed with no existing application
          const msg = error.message || "";
          if (msg.includes("does not exist") || error.code === "42P01" || error.code === "PGRST204") {
            console.warn("host_applications table not yet created in database");
            return;
          }
          throw error;
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

    checkExisting();
  }, [user, authLoading]);

  // Validation
  const propertyValid = useMemo(() => {
    return (
      property.title.trim().length >= 3 &&
      property.location.trim().length >= 2 &&
      property.price_per_night > 0 &&
      property.max_guests >= 1 &&
      property.images.length >= 1
    );
  }, [property]);

  const canProceedListing = useMemo(() => {
    switch (listingStep) {
      case 1:
        return property.title.trim().length >= 3 && property.location.trim().length >= 2;
      case 2:
        return Number(property.price_per_night) > 0 && Number(property.max_guests) >= 1;
      case 3:
        return property.images.length >= 1; // require at least 1 photo for application
      case 4:
        return true;
      case 5:
        return propertyValid;
      default:
        return false;
    }
  }, [listingStep, property, propertyValid]);

  const amenityLabels = useMemo(() => {
    const raw = property.amenities ?? [];
    const uniq = Array.from(new Set(raw.map((v) => String(v ?? "").trim()).filter(Boolean)));
    return uniq
      .map((v) => amenityByValue.get(v)?.label ?? amenityByValue.get(v.toLowerCase())?.label ?? v)
      .filter(Boolean);
  }, [property.amenities]);

  const detailsValid = useMemo(() => {
    if (details.full_name.trim().length < 2) return false;
    if (details.phone.trim().length < 7) return false;
    if (details.national_id_number.trim().length < 5) return false;
    if (!details.national_id_photo_url) return false;
    if (applicantType === "business") {
      if (details.business_name.trim().length < 2) return false;
      if (details.business_tin.trim().length < 5) return false;
    }
    return true;
  }, [details, applicantType]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Create host application
      // We try full payload first; if the remote DB schema is older (missing listing_* columns),
      // we fall back to a minimal insert so the application is still submitted.
      const fullPayload: Record<string, unknown> = {
        user_id: user.id,
        status: "pending",
        full_name: details.full_name.trim(),
        phone: details.phone.trim(),
        about: details.about.trim() || null,
        business_name: applicantType === "business" ? details.business_name.trim() : null,
        hosting_location: property.location.trim(),
        applicant_type: applicantType,
        listing_title: property.title.trim(),
        listing_location: property.location.trim(),
        listing_property_type: property.property_type,
        listing_price_per_night: property.price_per_night,
        listing_currency: property.currency,
        listing_max_guests: property.max_guests,
        listing_bedrooms: property.bedrooms,
        listing_bathrooms: property.bathrooms,
        listing_amenities: property.amenities,
        listing_images: property.images,
        business_tin: applicantType === "business" ? details.business_tin.trim() : null,
        business_certificate_url: applicantType === "business" ? details.business_certificate_url : null,
        national_id_number: details.national_id_number.trim(),
        national_id_photo_url: details.national_id_photo_url,
      };

      const minimalPayload: Record<string, unknown> = {
        user_id: user.id,
        status: "pending",
        full_name: details.full_name.trim(),
        phone: details.phone.trim(),
        hosting_location: property.location.trim(),
      };

      console.log("Submitting host application with payload:", fullPayload);
      const fullAttempt = await supabase.from("host_applications").insert(fullPayload as never);
      console.log("Full attempt result:", fullAttempt);
      
      if (fullAttempt.error) {
        // Fallback for older schemas or stricter policies.
        const msg = String(fullAttempt.error.message ?? "");
        const code = String((fullAttempt.error as any)?.code ?? "");
        console.error("Insert error - Code:", code, "Message:", msg, "Full error:", fullAttempt.error);

        // Check if table doesn't exist at all
        if (code === "42P01" || msg.includes("relation") && msg.includes("does not exist")) {
          throw new Error("The host application feature is not yet available. Please contact support to enable this feature.");
        }

        // Only attempt fallback when it's likely schema mismatch; otherwise rethrow.
        const looksLikeSchemaMismatch =
          code === "42703" ||
          code.startsWith("PGRST") ||
          msg.includes("column") && msg.includes("does not exist") ||
          msg.includes("schema cache") ||
          msg.toLowerCase().includes("could not find");

        if (looksLikeSchemaMismatch) {
          const fallback = await supabase.from("host_applications").insert(minimalPayload as never);
          if (fallback.error) {
            // If fallback also fails with table not found
            if (fallback.error.code === "42P01") {
              throw new Error("The host application feature is not yet available. Please contact support to enable this feature.");
            }
            throw fallback.error;
          }
        } else {
          throw fullAttempt.error;
        }
      }

      toast({
        title: "Application submitted!",
        description: "Your application is under review. You’ll be notified once it’s approved.",
      });

      // They aren't a host yet (until approved), so keep them here and show the "Under Review" state.
      setHasExistingApp(true);
      setExistingStatus("pending");
      setStep(1);
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
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // Only signed-in users can apply
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Become a Host</h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to apply for becoming a host. It only takes a minute.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth?redirect=/become-host">
                <Button size="lg">Sign in to continue</Button>
              </Link>
              <Button variant="outline" size="lg" onClick={() => navigate("/")}>
                Back to home
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // If host, redirect to dashboard (only check after roles have loaded)
  if (isHost) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">You're already a host!</h1>
            <p className="text-muted-foreground mb-6">
              You can manage your properties and listings from your host dashboard.
            </p>
            <Button onClick={() => navigate("/host-dashboard")}>Go to Host Dashboard</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // If has pending/approved application
  if (hasExistingApp) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            {existingStatus === "pending" ? (
              <>
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Application Under Review</h1>
                <p className="text-muted-foreground mb-6">
                  Your host application is being reviewed by our team. You'll be notified once it's approved.
                </p>
              </>
            ) : existingStatus === "approved" ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Application Approved!</h1>
                <p className="text-muted-foreground mb-6">
                  Congratulations! You're now a host. Manage your listings from the host dashboard.
                </p>
                <Button onClick={() => navigate("/host-dashboard")}>Go to Host Dashboard</Button>
              </>
            ) : (
              <>
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Application Status: {existingStatus}</h1>
                <p className="text-muted-foreground mb-6">
                  Please contact support if you have questions about your application.
                </p>
              </>
            )}
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {step} of 3</span>
            <span className="text-sm text-muted-foreground">
              {step === 1 ? "Account Type" : step === 2 ? "Property Details" : "Verification"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Account Type */}
        {step === 1 && (
          <Card className="p-6 md:p-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Become a Host</h1>
            <p className="text-muted-foreground mb-8">
              First, tell us how you'll be hosting on our platform.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setApplicantType("individual")}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  applicantType === "individual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <UserRound className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Individual Host</h3>
                <p className="text-sm text-muted-foreground">
                  I'm renting my personal property or spare room.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setApplicantType("business")}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  applicantType === "business"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Building2 className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Business Host</h3>
                <p className="text-sm text-muted-foreground">
                  I represent a company or manage multiple properties.
                </p>
              </button>
            </div>

            <Button className="w-full" size="lg" onClick={() => setStep(2)}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* Step 2: Add your property (same wizard UX as Host Dashboard) */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (listingStep > 1) {
                    setListingStep((s) => Math.max(1, s - 1));
                  } else {
                    setStep(1);
                  }
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
                {listingStep > 1 ? "Back" : "Cancel"}
              </button>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">Add your property</h1>
                <p className="text-sm text-muted-foreground">
                  Step {listingStep} of {listingTotalSteps}: {listingStepTitles[listingStep - 1]}
                </p>
              </div>
              <div className="w-20" />
            </div>

            <Progress value={(listingStep / listingTotalSteps) * 100} className="h-2" />

            <Card className="p-6 md:p-8">
              {/* Step 1 */}
              {listingStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Building2 className="w-12 h-12 mx-auto text-primary mb-4" />
                    <h2 className="text-2xl font-bold text-foreground">Let’s start with the basics</h2>
                    <p className="text-muted-foreground mt-2">Tell us about your property</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Property Title *</Label>
                      <Input
                        value={property.title}
                        onChange={(e) => setProperty((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g., Cozy Apartment with City View"
                        className="mt-2 text-lg py-6"
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium">Location *</Label>
                      <Input
                        value={property.location}
                        onChange={(e) => setProperty((p) => ({ ...p, location: e.target.value }))}
                        placeholder="e.g., Kigali, Nyarutarama"
                        className="mt-2 text-lg py-6"
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium">Address</Label>
                      <Input
                        value={property.address}
                        onChange={(e) => setProperty((p) => ({ ...p, address: e.target.value }))}
                        placeholder="Street, building, or nearby landmark (optional)"
                        className="mt-2 text-lg py-6"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Tip: keep it general. Exact address can be shared after booking.
                      </p>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Property Type</Label>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {propertyTypes.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setProperty((p) => ({ ...p, property_type: type }))}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              property.property_type === type
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {listingStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <DollarSign className="w-12 h-12 mx-auto text-primary mb-4" />
                    <h2 className="text-2xl font-bold text-foreground">Set pricing & capacity</h2>
                    <p className="text-muted-foreground mt-2">How much will you charge per night?</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-medium">Price per Night *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={property.price_per_night}
                        onChange={(e) => setProperty((p) => ({ ...p, price_per_night: Number(e.target.value) }))}
                        className="mt-2 text-lg py-6"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-medium">Currency</Label>
                      <Select value={property.currency} onValueChange={(v) => setProperty((p) => ({ ...p, currency: v }))}>
                        <SelectTrigger className="mt-2 h-14 text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" /> Max Guests
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={property.max_guests}
                        onChange={(e) => setProperty((p) => ({ ...p, max_guests: Number(e.target.value) }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Bed className="w-4 h-4" /> Bedrooms
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={property.bedrooms}
                        onChange={(e) => setProperty((p) => ({ ...p, bedrooms: Number(e.target.value) }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Bed className="w-4 h-4" /> Beds
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={property.beds}
                        onChange={(e) => setProperty((p) => ({ ...p, beds: Number(e.target.value) }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Bath className="w-4 h-4" /> Bathrooms
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={property.bathrooms}
                        onChange={(e) => setProperty((p) => ({ ...p, bathrooms: Number(e.target.value) }))}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Description</Label>
                    <Textarea
                      value={property.description}
                      onChange={(e) => setProperty((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe your property. What makes it special?"
                      className="mt-2 min-h-32"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium">Cancellation Policy</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      {cancellationPolicies.map((policy) => (
                        <Tooltip key={policy.value}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setProperty((p) => ({ ...p, cancellation_policy: policy.value }))}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${
                                property.cancellation_policy === policy.value
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">{policy.label.split(" - ")[0]}</div>
                                  <div className="text-sm text-muted-foreground">{policy.label.split(" - ")[1]}</div>
                                </div>
                                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm p-3">
                            <div className="font-semibold mb-2">
                              {cancellationPolicyDetails[policy.value]?.title ?? policy.label.split(" - ")[0]}
                            </div>
                            <ul className="text-xs leading-relaxed space-y-1 text-muted-foreground">
                              {(cancellationPolicyDetails[policy.value]?.lines ?? []).map((line) => (
                                <li key={line}>• {line}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <Percent className="w-5 h-5 text-primary" />
                      <Label className="text-base font-medium">Long stay discounts</Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 rounded-xl border border-border bg-muted/20">
                        <Label className="text-sm font-medium">Weekly Discount (7+ days)</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={property.weekly_discount}
                            onChange={(e) => setProperty((p) => ({ ...p, weekly_discount: Number(e.target.value) }))}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-muted/20">
                        <Label className="text-sm font-medium">Monthly Discount (28+ days)</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={property.monthly_discount}
                            onChange={(e) => setProperty((p) => ({ ...p, monthly_discount: Number(e.target.value) }))}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Label className="text-base font-medium">Accommodation rules</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Check-in time</Label>
                        <Input
                          type="time"
                          value={property.check_in_time}
                          onChange={(e) => setProperty((p) => ({ ...p, check_in_time: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Check-out time</Label>
                        <Input
                          type="time"
                          value={property.check_out_time}
                          onChange={(e) => setProperty((p) => ({ ...p, check_out_time: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border p-3">
                        <div>
                          <div className="font-medium">Smoking</div>
                          <div className="text-xs text-muted-foreground">Allow smoking</div>
                        </div>
                        <Switch checked={property.smoking_allowed} onCheckedChange={(v) => setProperty((p) => ({ ...p, smoking_allowed: v }))} />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border p-3">
                        <div>
                          <div className="font-medium">Events</div>
                          <div className="text-xs text-muted-foreground">Allow events</div>
                        </div>
                        <Switch checked={property.events_allowed} onCheckedChange={(v) => setProperty((p) => ({ ...p, events_allowed: v }))} />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border p-3">
                        <div>
                          <div className="font-medium">Pets</div>
                          <div className="text-xs text-muted-foreground">Allow pets</div>
                        </div>
                        <Switch checked={property.pets_allowed} onCheckedChange={(v) => setProperty((p) => ({ ...p, pets_allowed: v }))} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {listingStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <ImageIcon className="w-12 h-12 mx-auto text-primary mb-4" />
                    <h2 className="text-2xl font-bold text-foreground">Add photos</h2>
                    <p className="text-muted-foreground mt-2">Upload at least 1 photo to continue</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {property.images.map((img, i) => (
                      <div key={img + i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setProperty((p) => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full text-white text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setImageUploadOpen(true)}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-xs">Add</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {listingStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Home className="w-12 h-12 mx-auto text-primary mb-4" />
                    <h2 className="text-2xl font-bold text-foreground">Select amenities</h2>
                    <p className="text-muted-foreground mt-2">Guests love details</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Array.from(new Map(AMENITIES.map((a) => [a.value, a])).values()).map((a) => {
                      const Icon = a.icon;
                      const selected = property.amenities.includes(a.value);
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() =>
                            setProperty((p) => ({
                              ...p,
                              amenities: selected ? p.amenities.filter((x) => x !== a.value) : [...p.amenities, a.value],
                            }))
                          }
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{a.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 5 */}
              {listingStep === 5 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-primary mb-3" />
                    <h2 className="text-xl font-bold text-foreground">Review your listing</h2>
                    <p className="text-sm text-muted-foreground mt-1">Make sure everything looks right</p>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <div className="font-semibold text-foreground text-sm">{property.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">{property.location || "Location"}</div>
                    {property.images?.[0] ? (
                      <div className="mt-3 rounded-lg overflow-hidden border border-border">
                        <img src={property.images[0]} alt="" className="w-full h-44 object-cover" />
                      </div>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Price</div>
                        <div className="font-semibold">{formatMoney(Number(property.price_per_night || 0), property.currency)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Guests</div>
                        <div className="font-semibold">{property.max_guests}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Beds</div>
                        <div className="font-semibold">{property.beds}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Bedrooms</div>
                        <div className="font-semibold">{property.bedrooms}</div>
                      </div>
                    </div>
                    {amenityLabels.length ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Amenities:{" "}
                        <span className="text-foreground">
                          {amenityLabels.slice(0, 6).join(", ")}
                          {amenityLabels.length > 6 ? "…" : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (listingStep > 1) setListingStep((s) => Math.max(1, s - 1));
                  else setStep(1);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {listingStep < listingTotalSteps ? (
                <Button
                  className="flex-1"
                  disabled={!canProceedListing}
                  onClick={() => setListingStep((s) => Math.min(listingTotalSteps, s + 1))}
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  disabled={!propertyValid}
                  onClick={() => {
                    setStep(3);
                    setListingStep(1);
                  }}
                >
                  Continue to Verification <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Verification */}
        {step === 3 && (
          <Card className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Verify Your Identity</h1>
                <p className="text-sm text-muted-foreground">
                  {applicantType === "business"
                    ? "Provide your business and personal information"
                    : "Provide your personal information for verification"}
                </p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">Important Notice</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Your listing will <strong>not be live</strong> until our team verifies your information. 
                    This typically takes 1-3 business days. You'll be notified once approved.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="font-medium text-foreground mb-4">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={details.full_name}
                      onChange={(e) => setDetails((d) => ({ ...d, full_name: e.target.value }))}
                      placeholder="As shown on your ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={details.phone}
                      onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
                      placeholder="+250 7XX XXX XXX"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="about">About You (optional)</Label>
                    <Textarea
                      id="about"
                      value={details.about}
                      onChange={(e) => setDetails((d) => ({ ...d, about: e.target.value }))}
                      placeholder="Tell guests a bit about yourself..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Business Information (if business) */}
              {applicantType === "business" && (
                <div>
                  <h3 className="font-medium text-foreground mb-4">Business Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={details.business_name}
                        onChange={(e) => setDetails((d) => ({ ...d, business_name: e.target.value }))}
                        placeholder="Your company name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessTin">TIN Number *</Label>
                      <Input
                        id="businessTin"
                        value={details.business_tin}
                        onChange={(e) => setDetails((d) => ({ ...d, business_tin: e.target.value }))}
                        placeholder="Tax Identification Number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-2 block">Business Certificate (optional)</Label>
                      {details.business_certificate_url ? (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-sm flex-1">Certificate uploaded</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetails((d) => ({ ...d, business_certificate_url: "" }))}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => setCertificateUploadOpen(true)}>
                          <ImageIcon className="w-4 h-4 mr-2" /> Upload Certificate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ID Verification */}
              <div>
                <h3 className="font-medium text-foreground mb-4">ID Verification</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="idNumber">National ID Number *</Label>
                    <Input
                      id="idNumber"
                      value={details.national_id_number}
                      onChange={(e) => setDetails((d) => ({ ...d, national_id_number: e.target.value }))}
                      placeholder="Enter your ID number"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">ID Photo *</Label>
                    {details.national_id_photo_url ? (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-sm flex-1">ID photo uploaded</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetails((d) => ({ ...d, national_id_photo_url: "" }))}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => setIdPhotoUploadOpen(true)}>
                        <ImageIcon className="w-4 h-4 mr-2" /> Upload ID Photo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                className="flex-1"
                disabled={!detailsValid || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>Submit Application</>
                )}
              </Button>
            </div>
          </Card>
        )}
      </main>

      <Footer />

      {/* Upload Dialogs */}
      <CloudinaryUploadDialog
        open={imageUploadOpen}
        onOpenChange={setImageUploadOpen}
        title="Upload Property Photos"
        folder="host_applications/listing_photos"
        accept="image/*"
        multiple
        value={property.images}
        onChange={(urls) => setProperty((p) => ({ ...p, images: urls }))}
      />

      <CloudinaryUploadDialog
        open={idPhotoUploadOpen}
        onOpenChange={setIdPhotoUploadOpen}
        title="Upload ID Photo"
        folder="host_applications/id_photos"
        accept="image/*"
        multiple={false}
        maxFiles={1}
        value={details.national_id_photo_url ? [details.national_id_photo_url] : []}
        onChange={(urls) => setDetails((d) => ({ ...d, national_id_photo_url: urls[0] ?? "" }))}
      />

      <CloudinaryUploadDialog
        open={certificateUploadOpen}
        onOpenChange={setCertificateUploadOpen}
        title="Upload Business Certificate"
        folder="host_applications/business_certificates"
        accept="image/*,application/pdf"
        multiple={false}
        maxFiles={1}
        value={details.business_certificate_url ? [details.business_certificate_url] : []}
        onChange={(urls) => setDetails((d) => ({ ...d, business_certificate_url: urls[0] ?? "" }))}
      />
    </div>
  );
}
