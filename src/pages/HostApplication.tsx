import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  { value: "RWF", label: "RWF" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
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

  // Simplified form state
  const [formData, setFormData] = useState({
    // Personal
    full_name: "",
    phone: "",
    about: "",
    national_id_number: "",
    national_id_photo_url: "",
    // Business (if applicable)
    business_name: "",
    business_tin: "",
    // Property
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

  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [idPhotoUploadOpen, setIdPhotoUploadOpen] = useState(false);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // Check for existing application
  useEffect(() => {
    if (authLoading) return;
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

    checkExisting();
  }, [user, authLoading]);

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
        full_name: formData.full_name,
        phone: formData.phone,
        about: formData.about || null,
        national_id_number: formData.national_id_number,
        national_id_photo_url: formData.national_id_photo_url,
        business_name: applicantType === "business" ? formData.business_name : null,
        business_tin: applicantType === "business" ? formData.business_tin : null,
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
            <span>Personal Info</span>
            <span>Property Details</span>
            <span>Review & Submit</span>
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl">
          <CardContent className="p-6 md:p-8">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
                  <p className="text-muted-foreground">Tell us about yourself</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
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

                  <div className="space-y-2">
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

                <div className="flex justify-end pt-4">
                  <Button
                    size="lg"
                    disabled={!formData.full_name || !formData.phone || !formData.national_id_number || !formData.national_id_photo_url}
                    onClick={() => setCurrentStep(2)}
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Property Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Property Details</h2>
                  <p className="text-muted-foreground">Tell us about your property</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
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
                    <Select value={formData.property_type} onValueChange={(v) => updateField("property_type", v)}>
                      <SelectTrigger id="propertyType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price per Night *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        className="pl-10"
                        value={formData.price_per_night}
                        onChange={(e) => updateField("price_per_night", Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency *</Label>
                    <Select value={formData.currency} onValueChange={(v) => updateField("currency", v)}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>{curr.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guests">Max Guests *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="guests"
                        type="number"
                        className="pl-10"
                        min="1"
                        value={formData.max_guests}
                        onChange={(e) => updateField("max_guests", Number(e.target.value))}
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
                        min="1"
                        value={formData.bedrooms}
                        onChange={(e) => updateField("bedrooms", Number(e.target.value))}
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
                        min="1"
                        value={formData.bathrooms}
                        onChange={(e) => updateField("bathrooms", Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your property..."
                      rows={4}
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

                  <div className="md:col-span-2 space-y-2">
                    <Label>Amenities (Select all that apply)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {AMENITIES.slice(0, 8).map((amenity) => {
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

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!formData.title || !formData.location || formData.images.length === 0}
                    onClick={() => setCurrentStep(3)}
                  >
                    Review Application <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Review Your Application</h2>
                  <p className="text-muted-foreground">Make sure everything looks correct</p>
                </div>

                <div className="space-y-4">
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

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
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
        title="Upload ID Photo"
        folder="host_applications/id_photos"
        accept="image/*"
        multiple={false}
        maxFiles={1}
        value={formData.national_id_photo_url ? [formData.national_id_photo_url] : []}
        onChange={(urls) => updateField("national_id_photo_url", urls[0] ?? "")}
      />
    </div>
  );
}
