import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "lucide-react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

type ApplicantType = "individual" | "business";

const propertyTypes = ["Hotel", "Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "Motel"];
const amenitiesList = ["WiFi", "Pool", "Parking", "Kitchen", "Breakfast", "AC", "Gym", "Spa", "TV", "Laundry"];
const currencies = [
  { value: "RWF", label: "RWF - Rwandan Franc" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
];

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
    description: "",
    property_type: "Apartment",
    price_per_night: 50000,
    currency: "RWF",
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [] as string[],
    images: [] as string[],
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

  // Check for existing application
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth?redirect=/become-host");
      return;
    }

    const checkExisting = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("host_applications")
          .select("id, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

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
  }, [user, authLoading, navigate]);

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
      const { error: appErr } = await supabase.from("host_applications").insert({
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
      });

      if (appErr) throw appErr;

      // Also create a draft property (not published)
      const { error: propErr } = await supabase.from("properties").insert({
        host_id: user.id,
        title: property.title.trim(),
        location: property.location.trim(),
        description: property.description.trim() || null,
        property_type: property.property_type,
        price_per_night: property.price_per_night,
        currency: property.currency,
        max_guests: property.max_guests,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        amenities: property.amenities,
        images: property.images,
        is_published: false, // Not live until verified
      });

      if (propErr) throw propErr;

      toast({
        title: "Application submitted!",
        description: "Your application is under review. Your listing will go live once verified.",
      });

      await refreshRoles();
      navigate("/host-dashboard");
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

        {/* Step 2: Property Details */}
        {step === 2 && (
          <Card className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">List Your Property</h1>
                <p className="text-sm text-muted-foreground">Tell us about the property you want to list</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    value={property.title}
                    onChange={(e) => setProperty((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Cozy apartment in Kigali"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={property.location}
                    onChange={(e) => setProperty((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g., Kimihurura, Kigali"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Property Type</Label>
                  <Select
                    value={property.property_type}
                    onValueChange={(v) => setProperty((p) => ({ ...p, property_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Price per Night *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="price"
                      type="number"
                      value={property.price_per_night}
                      onChange={(e) => setProperty((p) => ({ ...p, price_per_night: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <Select
                      value={property.currency}
                      onValueChange={(v) => setProperty((p) => ({ ...p, currency: v }))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Capacity */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Max Guests</Label>
                  <Input
                    type="number"
                    min={1}
                    value={property.max_guests}
                    onChange={(e) => setProperty((p) => ({ ...p, max_guests: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Bedrooms</Label>
                  <Input
                    type="number"
                    min={0}
                    value={property.bedrooms}
                    onChange={(e) => setProperty((p) => ({ ...p, bedrooms: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <Input
                    type="number"
                    min={0}
                    value={property.bathrooms}
                    onChange={(e) => setProperty((p) => ({ ...p, bathrooms: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={property.description}
                  onChange={(e) => setProperty((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe your property, surroundings, and what makes it special..."
                  rows={4}
                />
              </div>

              {/* Amenities */}
              <div>
                <Label className="mb-2 block">Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {amenitiesList.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setProperty((p) => ({
                          ...p,
                          amenities: p.amenities.includes(a)
                            ? p.amenities.filter((x) => x !== a)
                            : [...p.amenities, a],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        property.amenities.includes(a)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <Label className="mb-2 block">Property Photos * (at least 1)</Label>
                <div className="flex flex-wrap gap-3">
                  {property.images.map((img, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProperty((p) => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full text-white text-xs flex items-center justify-center hover:bg-black/70"
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
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button className="flex-1" disabled={!propertyValid} onClick={() => setStep(3)}>
                Continue to Verification <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
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
        onUploadComplete={(urls) => {
          setProperty((p) => ({ ...p, images: [...p.images, ...urls] }));
        }}
        multiple
        accept="image/*"
        title="Upload Property Photos"
      />

      <CloudinaryUploadDialog
        open={idPhotoUploadOpen}
        onOpenChange={setIdPhotoUploadOpen}
        onUploadComplete={(urls) => {
          if (urls[0]) setDetails((d) => ({ ...d, national_id_photo_url: urls[0] }));
        }}
        multiple={false}
        accept="image/*"
        title="Upload ID Photo"
      />

      <CloudinaryUploadDialog
        open={certificateUploadOpen}
        onOpenChange={setCertificateUploadOpen}
        onUploadComplete={(urls) => {
          if (urls[0]) setDetails((d) => ({ ...d, business_certificate_url: urls[0] }));
        }}
        multiple={false}
        accept="image/*,application/pdf"
        title="Upload Business Certificate"
      />
    </div>
  );
}
