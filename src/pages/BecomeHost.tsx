import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Loader2, CheckCircle2, Home, Car, Compass } from "lucide-react";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

export default function BecomeHost() {
  const { user, refreshRoles, isHost, isLoading: authLoading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const affiliateCode = searchParams.get("ref");

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  // Pre-fill email from user
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [user?.email]);

  // Redirect if already a host
  useEffect(() => {
    if (!authLoading && !rolesLoading && isHost) {
      navigate("/host-dashboard");
    }
  }, [isHost, authLoading, rolesLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    // Validation
    if (!formData.full_name.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Please enter your full name" });
      return;
    }
    if (!formData.phone.trim()) {
      toast({ variant: "destructive", title: "Phone required", description: "Please enter your phone number" });
      return;
    }

    setSubmitting(true);

    try {
      // Create host application with auto-approved status
      const payload: any = {
        user_id: user.id,
        status: "approved", // Auto-approve
        applicant_type: "individual",
        service_types: [], // Will be set in profile
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        about: null,
        national_id_number: null,
        national_id_photo_url: null,
        selfie_photo_url: null,
        profile_complete: false, // Flag to show warning
      };

      const { error: appError } = await supabase.from("host_applications").insert(payload as any);
      if (appError) throw appError;

      // Add host role using RPC function (handles RLS properly)
      const { error: roleError } = await supabase.rpc("become_host");
      if (roleError) {
        console.error("Role assignment error:", roleError);
        // Don't fail - the application was created, admin can fix roles
      }

      // Track affiliate referral if applicable
      if (affiliateCode && user.id) {
        try {
          const db = supabase as any;
          const { data: affiliateData } = await db
            .from("affiliates")
            .select("id, user_id")
            .eq("affiliate_code", affiliateCode)
            .eq("status", "active")
            .single();

          if (affiliateData && affiliateData.user_id !== user.id) {
            await db.from("affiliate_referrals").insert({
              affiliate_id: affiliateData.id,
              referred_user_id: user.id,
              referred_user_email: user.email || "",
              status: "active",
            });
          }
        } catch (affiliateError) {
          console.error("Affiliate tracking error:", affiliateError);
        }
      }

      toast({
        title: "Welcome, Host! 🎉",
        description: "Your host account is ready. Complete your profile to start listing.",
      });

      await refreshRoles();
      navigate("/host-dashboard");
    } catch (e) {
      logError("become-host.submit", e);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: uiErrorMessage(e, "Please try again."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-md mx-auto px-4 py-16">
          <Card className="text-center shadow-xl">
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Become a Host</CardTitle>
              <CardDescription>
                Join our community of hosts and start earning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Please sign in to start your hosting journey.
              </p>
              <Button size="lg" className="w-full" onClick={() => navigate("/auth?redirect=/become-host")}>
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-md mx-auto px-4 py-12">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Become a Host</CardTitle>
            <CardDescription>
              Start earning by listing your property, tours, or transport
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="mt-1.5 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">From your account</p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+250 78X XXX XXX"
                  className="mt-1.5"
                />
              </div>

              {/* What you can host */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">As a host, you can list:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Home className="w-6 h-6 text-primary" />
                    <span className="text-xs text-center">Accommodations</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Compass className="w-6 h-6 text-primary" />
                    <span className="text-xs text-center">Tours</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Car className="w-6 h-6 text-primary" />
                    <span className="text-xs text-center">Transport</span>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Become a Host
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                You'll complete your profile after signing up to enable listings.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
