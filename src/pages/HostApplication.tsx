import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { Building2, UserRound, Briefcase, CheckCircle2, AlertTriangle } from "lucide-react";

type HostApplicationStatus = "draft" | "pending" | "approved" | "rejected";

type HostApplicationRow = {
  id: string;
  user_id: string;
  status: HostApplicationStatus;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  hosting_location: string | null;
  about: string | null;
  applicant_type?: string | null;
  listing_title?: string | null;
  listing_location?: string | null;
  listing_property_type?: string | null;
  listing_price_per_night?: number | null;
  listing_currency?: string | null;
  listing_max_guests?: number | null;
  listing_bedrooms?: number | null;
  listing_bathrooms?: number | null;
  listing_amenities?: string[] | null;
  listing_images?: string[] | null;
  business_tin?: string | null;
  business_certificate_url?: string | null;
  national_id_number?: string | null;
  national_id_photo_url?: string | null;
  review_notes: string | null;
  created_at: string;
};

type ApplicantType = "individual" | "business";

const propertyTypes = ["Hotel", "Apartment", "Villa", "Guesthouse", "Resort", "Lodge"];
const amenitiesList = ["WiFi", "Pool", "Parking", "Kitchen", "Breakfast", "AC", "Gym", "Spa"];

export default function HostApplication() {
  const { user, refreshRoles, isHost, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [existing, setExisting] = useState<HostApplicationRow | null>(null);

  const [step, setStep] = useState<"type" | "property" | "details">("type");
  const [applicantType, setApplicantType] = useState<ApplicantType>("individual");

  const [property, setProperty] = useState({
    title: "",
    location: "",
    property_type: "Hotel",
    price_per_night: 50000,
    currency: "RWF",
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [] as string[],
    images: [] as string[],
  });

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
    if (details.about.trim().length < 10) return false;
    // ID verification is required for both individuals and businesses.
    if (details.national_id_number.trim().length < 3) return false;
    if (details.national_id_photo_url.trim().length < 5) return false;
    // Business requires business info as well.
    if (applicantType === "business") {
      if (details.business_name.trim().length < 2) return false;
      if (details.business_tin.trim().length < 3) return false;
      if (details.business_certificate_url.trim().length < 5) return false;
    }
    return true;
  }, [details, applicantType]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("host_applications")
        .select(
          "id, user_id, status, full_name, phone, business_name, hosting_location, about, applicant_type, listing_title, listing_location, listing_property_type, listing_price_per_night, listing_currency, listing_max_guests, listing_bedrooms, listing_bathrooms, listing_amenities, listing_images, business_tin, business_certificate_url, national_id_number, national_id_photo_url, review_notes, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setExisting(data as HostApplicationRow);
      } else {
        setExisting(null);
      }

      setIsLoading(false);
    };

    load();
  }, [user]);

  useEffect(() => {
    if (isHost) {
      // If already a host, no need to apply.
      navigate("/host-dashboard", { replace: true });
    }
  }, [isHost, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="container mx-auto px-4 lg:px-8 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Turn your space into an income stream
            </h1>
            <p className="text-muted-foreground mb-10">
              Apply to become a host and start listing your properties. You’ll need an account to submit your application.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup?redirect=/become-host">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/login?redirect=/become-host">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  const startNew = () => {
    setExisting(null);
    setStep("type");
    setApplicantType("individual");
    setProperty({
      title: "",
      location: "",
      property_type: "Hotel",
      price_per_night: 50000,
      currency: "RWF",
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      amenities: [],
      images: [],
    });
    setDetails({
      full_name: "",
      phone: "",
      about: "",
      business_name: "",
      business_tin: "",
      business_certificate_url: "",
      national_id_number: "",
      national_id_photo_url: "",
    });
  };

  const submit = async () => {
    if (!user) return;

    try {
      if (!propertyValid) {
        throw new Error("Please provide complete property info and upload at least one image.");
      }
      if (!detailsValid) {
        throw new Error("Please complete your personal details before submitting.");
      }

      const payload = {
        user_id: user.id,
        status: "pending" as const,
        applicant_type: applicantType,
        full_name: details.full_name.trim(),
        phone: details.phone.trim(),
        business_name: applicantType === "business" ? details.business_name.trim() || null : null,
        hosting_location: property.location.trim(),
        about: details.about.trim(),
        listing_title: property.title.trim(),
        listing_location: property.location.trim(),
        listing_property_type: property.property_type,
        listing_price_per_night: Number(property.price_per_night),
        listing_currency: property.currency,
        listing_max_guests: Number(property.max_guests),
        listing_bedrooms: Number(property.bedrooms),
        listing_bathrooms: Number(property.bathrooms),
        listing_amenities: property.amenities,
        listing_images: property.images,
        business_tin: applicantType === "business" ? details.business_tin.trim() || null : null,
        business_certificate_url: applicantType === "business" ? details.business_certificate_url.trim() || null : null,
        national_id_number: details.national_id_number.trim() || null,
        national_id_photo_url: details.national_id_photo_url.trim() || null,
      };

      const { error } = await supabase.from("host_applications").insert(payload);
      if (error) throw error;

      // Keep profile in sync with what the user entered.
      await supabase
        .from("profiles")
        .update({ full_name: payload.full_name, phone: payload.phone })
        .eq("user_id", user.id);

      toast({ title: "Application submitted", description: "We’ll review it shortly." });

      // Reload latest application
      const { data } = await supabase
        .from("host_applications")
        .select(
          "id, user_id, status, full_name, phone, business_name, hosting_location, about, applicant_type, listing_title, listing_location, listing_property_type, listing_price_per_night, listing_currency, listing_max_guests, listing_bedrooms, listing_bathrooms, listing_amenities, listing_images, business_tin, business_certificate_url, national_id_number, national_id_photo_url, review_notes, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setExisting((data as HostApplicationRow) ?? null);
      setStep("type");
      await refreshRoles();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn’t submit application",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const renderStatus = () => {
    if (!existing) return null;

    if (existing.status === "pending") {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Application pending</h2>
          <p className="text-muted-foreground mb-4">
            Your application is submitted and waiting for review. Your property will not be live until approved.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>Back home</Button>
          </div>
        </Card>
      );
    }

    if (existing.status === "approved") {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">You’re approved!</h2>
          <p className="text-muted-foreground mb-4">
            Your host access is active. You can now create and publish listings.
          </p>
          <Button onClick={() => navigate("/host-dashboard")}>Go to Host Dashboard</Button>
        </Card>
      );
    }

    if (existing.status === "rejected") {
      return (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Application not approved</h2>
          <p className="text-muted-foreground mb-4">
            {existing.review_notes ? existing.review_notes : "You can submit another application."}
          </p>
          <Button onClick={startNew}>Start a new application</Button>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Become a Host</h1>
          <p className="text-muted-foreground mb-8">
            Apply in a few steps. First add your property info + photos, then complete your details.
          </p>

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : existing ? (
            renderStatus()
          ) : (
            <Card className="p-6">
              <div className="rounded-xl border border-border bg-muted/30 p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-foreground">Your listing is not live yet</div>
                  <div className="text-muted-foreground">
                    Until you submit this application and it’s approved, your property will not appear publicly.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Step {step === "type" ? 1 : step === "property" ? 2 : 3} of 3
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">
                    {step === "type"
                      ? "Choose account type"
                      : step === "property"
                      ? "Property details"
                      : applicantType === "business"
                      ? "Business & ID verification"
                      : "Personal information"}
                  </h2>
                </div>
              </div>

              {step === "type" ? (
                <div className="space-y-6">
                  <div className="text-sm text-muted-foreground text-center">Are you applying as an individual or a business?</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setApplicantType("individual")}
                      className={`rounded-xl border p-5 text-left transition-colors ${
                        applicantType === "individual" ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <UserRound className="w-5 h-5 text-primary" />
                        </div>
                        {applicantType === "individual" ? <CheckCircle2 className="w-5 h-5 text-primary" /> : null}
                      </div>
                      <div className="mt-4 font-semibold text-foreground">Individual</div>
                      <div className="text-sm text-muted-foreground">I’m hosting as an individual owner</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setApplicantType("business")}
                      className={`rounded-xl border p-5 text-left transition-colors ${
                        applicantType === "business" ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                        {applicantType === "business" ? <CheckCircle2 className="w-5 h-5 text-primary" /> : null}
                      </div>
                      <div className="mt-4 font-semibold text-foreground">Business</div>
                      <div className="text-sm text-muted-foreground">I’m hosting as a registered business</div>
                    </button>
                  </div>
                </div>
              ) : null}

              {step === "property" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Property title</Label>
                      <Input value={property.title} onChange={(e) => setProperty((p) => ({ ...p, title: e.target.value }))} placeholder="Cozy apartment in Kigali" />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={property.location} onChange={(e) => setProperty((p) => ({ ...p, location: e.target.value }))} placeholder="Kigali, Rwanda" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Property type</Label>
                      <select
                        value={property.property_type}
                        onChange={(e) => setProperty((p) => ({ ...p, property_type: e.target.value }))}
                        className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                      >
                        {propertyTypes.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Price per night</Label>
                      <Input type="number" min={0} value={property.price_per_night} onChange={(e) => setProperty((p) => ({ ...p, price_per_night: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <select
                        value={property.currency}
                        onChange={(e) => setProperty((p) => ({ ...p, currency: e.target.value }))}
                        className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background"
                      >
                        <option>RWF</option>
                        <option>USD</option>
                        <option>EUR</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Max guests</Label>
                      <Input type="number" min={1} value={property.max_guests} onChange={(e) => setProperty((p) => ({ ...p, max_guests: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Bedrooms</Label>
                      <Input type="number" min={0} value={property.bedrooms} onChange={(e) => setProperty((p) => ({ ...p, bedrooms: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Bathrooms</Label>
                      <Input type="number" min={0} value={property.bathrooms} onChange={(e) => setProperty((p) => ({ ...p, bathrooms: Number(e.target.value) }))} />
                    </div>
                    <div className="flex items-end">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Not live until approved
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Amenities</Label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {amenitiesList.map((a) => {
                        const checked = property.amenities.includes(a);
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() =>
                              setProperty((p) => ({
                                ...p,
                                amenities: checked ? p.amenities.filter((x) => x !== a) : [...p.amenities, a],
                              }))
                            }
                            className={`px-3 py-2 rounded-lg border text-sm text-left ${
                              checked ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                            }`}
                          >
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Property photos (required)</Label>
                    <div className="mt-2 space-y-3">
                      <CloudinaryUploadDialog
                        title="Upload property photos"
                        folder="merry360/host-applications/listings"
                        accept="image/*"
                        multiple
                        maxFiles={12}
                        buttonLabel="Upload photos"
                        value={property.images}
                        onChange={(urls) => setProperty((p) => ({ ...p, images: urls }))}
                      />
                      {property.images.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Upload at least one photo to continue.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {step === "details" ? (
                <div className="space-y-4">
                  <div>
                    <Label>Full name</Label>
                    <Input value={details.full_name} onChange={(e) => setDetails((p) => ({ ...p, full_name: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div>
                    <Label>Phone number</Label>
                    <Input value={details.phone} onChange={(e) => setDetails((p) => ({ ...p, phone: e.target.value }))} placeholder="+250..." />
                  </div>
                  <div>
                    <Label>About you / your place</Label>
                    <Textarea value={details.about} onChange={(e) => setDetails((p) => ({ ...p, about: e.target.value }))} rows={4} placeholder="Tell guests what to expect…" />
                  </div>

                  {applicantType === "business" ? (
                    <div className="mt-2">
                      <Tabs defaultValue="business" className="w-full">
                        <TabsList className="w-full justify-start">
                          <TabsTrigger value="business">Business</TabsTrigger>
                          <TabsTrigger value="id">ID Verification</TabsTrigger>
                        </TabsList>

                        <TabsContent value="business" className="mt-4 space-y-4">
                          <div>
                            <Label>Business name</Label>
                            <Input value={details.business_name} onChange={(e) => setDetails((p) => ({ ...p, business_name: e.target.value }))} placeholder="Registered business name" />
                          </div>
                          <div>
                            <Label>Tax Identification Number (TIN)</Label>
                            <Input value={details.business_tin} onChange={(e) => setDetails((p) => ({ ...p, business_tin: e.target.value }))} placeholder="Enter your TIN" />
                          </div>
                          <div>
                            <Label>Business registration certificate (PDF or image)</Label>
                            <CloudinaryUploadDialog
                              title="Upload business certificate"
                              folder="merry360/host-applications/business"
                              accept="image/*"
                              multiple={false}
                              maxFiles={1}
                              buttonLabel={details.business_certificate_url ? "Replace certificate" : "Upload certificate image"}
                              value={details.business_certificate_url ? [details.business_certificate_url] : []}
                              onChange={(urls) => setDetails((p) => ({ ...p, business_certificate_url: urls[0] ?? "" }))}
                            />
                            <div className="text-xs text-muted-foreground mt-2">Upload required for businesses.</div>
                          </div>
                        </TabsContent>

                        <TabsContent value="id" className="mt-4 space-y-4">
                          <div>
                            <Label>National ID number</Label>
                            <Input value={details.national_id_number} onChange={(e) => setDetails((p) => ({ ...p, national_id_number: e.target.value }))} placeholder="Enter your National ID number" />
                          </div>
                          <div>
                            <Label>National ID photo (image)</Label>
                            <CloudinaryUploadDialog
                              title="Upload National ID photo"
                              folder="merry360/host-applications/id"
                              accept="image/*"
                              multiple={false}
                              maxFiles={1}
                              buttonLabel={details.national_id_photo_url ? "Replace ID photo" : "Upload ID photo"}
                              value={details.national_id_photo_url ? [details.national_id_photo_url] : []}
                              onChange={(urls) => setDetails((p) => ({ ...p, national_id_photo_url: urls[0] ?? "" }))}
                            />
                            <div className="text-xs text-muted-foreground mt-2">Upload required.</div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-4">
                      <div>
                        <Label>National ID number</Label>
                        <Input
                          value={details.national_id_number}
                          onChange={(e) => setDetails((p) => ({ ...p, national_id_number: e.target.value }))}
                          placeholder="Enter your National ID number"
                        />
                      </div>
                      <div>
                        <Label>National ID photo (image)</Label>
                        <CloudinaryUploadDialog
                          title="Upload National ID photo"
                          folder="merry360/host-applications/id"
                          accept="image/*"
                          multiple={false}
                          maxFiles={1}
                          buttonLabel={details.national_id_photo_url ? "Replace ID photo" : "Upload ID photo"}
                          value={details.national_id_photo_url ? [details.national_id_photo_url] : []}
                          onChange={(urls) => setDetails((p) => ({ ...p, national_id_photo_url: urls[0] ?? "" }))}
                        />
                        <div className="text-xs text-muted-foreground mt-2">Upload required.</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (step === "type") return navigate("/");
                    if (step === "property") return setStep("type");
                    return setStep("property");
                  }}
                >
                  {step === "type" ? "Cancel" : "Back"}
                </Button>

                {step === "type" ? (
                  <Button onClick={() => setStep("property")}>Continue</Button>
                ) : step === "property" ? (
                  <Button disabled={!propertyValid} onClick={() => setStep("details")}>
                    Continue
                  </Button>
                ) : (
                  <Button disabled={!detailsValid} onClick={submit}>
                    Submit application
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
