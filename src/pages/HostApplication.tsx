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
  review_notes: string | null;
  created_at: string;
};

const steps = [
  { key: "contact", title: "Your details" },
  { key: "hosting", title: "Hosting info" },
  { key: "review", title: "Review & submit" },
] as const;

export default function HostApplication() {
  const { user, refreshRoles, isHost, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [existing, setExisting] = useState<HostApplicationRow | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    business_name: "",
    hosting_location: "",
    about: "",
  });

  const currentStep = steps[stepIndex];
  const canGoBack = stepIndex > 0;

  const nextDisabled = useMemo(() => {
    if (currentStep.key === "contact") {
      return form.full_name.trim().length < 2 || form.phone.trim().length < 7;
    }
    if (currentStep.key === "hosting") {
      return form.hosting_location.trim().length < 2 || form.about.trim().length < 10;
    }
    return false;
  }, [currentStep.key, form]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("host_applications")
        .select(
          "id, user_id, status, full_name, phone, business_name, hosting_location, about, review_notes, created_at"
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
    setStepIndex(0);
    setForm({
      full_name: "",
      phone: "",
      business_name: "",
      hosting_location: "",
      about: "",
    });
  };

  const submit = async () => {
    if (!user) return;

    try {
      const payload = {
        user_id: user.id,
        status: "pending" as const,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        business_name: form.business_name.trim() || null,
        hosting_location: form.hosting_location.trim(),
        about: form.about.trim(),
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
          "id, user_id, status, full_name, phone, business_name, hosting_location, about, review_notes, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setExisting((data as HostApplicationRow) ?? null);
      setStepIndex(0);
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
            Your application is submitted and waiting for review.
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
            Apply in a few small steps. We’ll review your info and enable hosting.
          </p>

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : existing ? (
            renderStatus()
          ) : (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Step {stepIndex + 1} of {steps.length}</p>
                  <h2 className="text-lg font-semibold text-foreground">{steps[stepIndex].title}</h2>
                </div>
              </div>

              {currentStep.key === "contact" ? (
                <div className="space-y-4">
                  <div>
                    <Label>Full name</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+250..."
                    />
                  </div>
                </div>
              ) : null}

              {currentStep.key === "hosting" ? (
                <div className="space-y-4">
                  <div>
                    <Label>Business name (optional)</Label>
                    <Input
                      value={form.business_name}
                      onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
                      placeholder="Company / brand"
                    />
                  </div>
                  <div>
                    <Label>Hosting location</Label>
                    <Input
                      value={form.hosting_location}
                      onChange={(e) => setForm((p) => ({ ...p, hosting_location: e.target.value }))}
                      placeholder="Kigali, Musanze, Rubavu..."
                    />
                  </div>
                  <div>
                    <Label>About you / your place</Label>
                    <Textarea
                      value={form.about}
                      onChange={(e) => setForm((p) => ({ ...p, about: e.target.value }))}
                      placeholder="Tell us what you plan to host and what guests can expect..."
                      rows={5}
                    />
                  </div>
                </div>
              ) : null}

              {currentStep.key === "review" ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium text-foreground">{form.full_name || "-"}</p>
                    <p className="text-sm text-muted-foreground mt-3">Phone</p>
                    <p className="font-medium text-foreground">{form.phone || "-"}</p>
                    <p className="text-sm text-muted-foreground mt-3">Business</p>
                    <p className="font-medium text-foreground">{form.business_name || "-"}</p>
                    <p className="text-sm text-muted-foreground mt-3">Location</p>
                    <p className="font-medium text-foreground">{form.hosting_location || "-"}</p>
                    <p className="text-sm text-muted-foreground mt-3">About</p>
                    <p className="text-foreground whitespace-pre-wrap">{form.about || "-"}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => (canGoBack ? setStepIndex((s) => s - 1) : navigate("/"))}
                >
                  {canGoBack ? "Back" : "Cancel"}
                </Button>

                {currentStep.key !== "review" ? (
                  <Button onClick={() => setStepIndex((s) => s + 1)} disabled={nextDisabled}>
                    Continue
                  </Button>
                ) : (
                  <Button onClick={submit}>Submit application</Button>
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
