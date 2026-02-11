import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { Loader2, User, Phone, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoyaltyPointsPopup } from "@/components/LoyaltyPointsPopup";

export default function CompleteProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [existingProfile, setExistingProfile] = useState<{
    full_name: string | null;
    phone: string | null;
    is_adult_confirmed?: boolean | null;
  } | null>(null);
  
  // Loyalty points popup state
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const redirectTo = searchParams.get("redirect") || "/";

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Load existing profile data
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, is_adult_confirmed")
        .eq("user_id" as any, user.id)
        .single();

      const profileData = data as { full_name: string | null; phone: string | null; is_adult_confirmed?: boolean | null } | null;
      if (profileData) {
        setExistingProfile(profileData);
        
        // Pre-fill form with existing data
        if (profileData.full_name) {
          const nameParts = profileData.full_name.split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
        }
        if (profileData.phone) {
          setPhone(profileData.phone);
        }

        if (profileData.is_adult_confirmed === true) {
          setIsAdultConfirmed(true);
        }

        // Also try to get name from Google metadata
        const metadata = user.user_metadata as Record<string, unknown>;
        if (!profileData.full_name && metadata.full_name) {
          const googleName = String(metadata.full_name);
          const nameParts = googleName.split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
        }
      }
    };

    loadProfile();
  }, [user]);

  // Check if profile is complete and redirect
  useEffect(() => {
    if (existingProfile?.full_name && existingProfile?.phone && existingProfile?.is_adult_confirmed) {
      // Profile is complete, redirect
      navigate(redirectTo, { replace: true });
    }
  }, [existingProfile, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter your first and last name",
      });
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Phone number required",
        description: "Please enter a valid phone number",
      });
      return;
    }

    if (!isAdultConfirmed) {
      toast({
        variant: "destructive",
        title: "18+ confirmation required",
        description: "Please confirm you are 18 years or older to continue.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Format phone number
      let formattedPhone = phone.replace(/[^\d+]/g, "");
      if (!formattedPhone.startsWith("+")) {
        if (formattedPhone.startsWith("0")) {
          formattedPhone = formattedPhone.substring(1);
        }
        formattedPhone = "+250" + formattedPhone;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Check if user already received profile completion bonus
      const { data: existingBonus } = await supabase
        .from("profiles")
        .select("profile_completed_bonus")
        .eq("user_id" as any, user.id)
        .single();

      const alreadyReceivedBonus = (existingBonus as { profile_completed_bonus?: boolean } | null)?.profile_completed_bonus === true;

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName,
          phone: formattedPhone,
          is_adult_confirmed: true,
          adult_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile_completed_bonus: true, // Mark as claimed
        } as any, { onConflict: "user_id" });

      if (error) throw error;

      // Award loyalty points if first time completing profile
      if (!alreadyReceivedBonus) {
        try {
          const { data: pointsResult } = await supabase.rpc("add_loyalty_points" as any, {
            p_user_id: user.id,
            p_points: 5,
            p_reason: "Profile completion bonus",
            p_reference_type: "profile_completion",
            p_reference_id: null,
          });

          const newBalance = pointsResult as unknown as number;
          if (newBalance && newBalance > 0) {
            setEarnedPoints(5);
            setTotalPoints(newBalance);
            setShowPointsPopup(true);
            // Don't navigate yet - wait for popup to close
            return;
          }
        } catch (pointsError) {
          console.error("Error awarding loyalty points:", pointsError);
          // Continue even if points fail
        }
      }

      toast({
        title: "Profile completed!",
        description: "Your profile has been updated successfully.",
        duration: 2000,
      });

      // Navigate to original destination
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointsPopupClose = () => {
    setShowPointsPopup(false);
    toast({
      title: "Profile completed!",
      description: "Your profile has been updated successfully.",
      duration: 2000,
    });
    navigate(redirectTo, { replace: true });
  };

  const handleSkip = () => {
    if (redirectTo.startsWith('/checkout')) {
      toast({
        variant: "destructive",
        title: "18+ confirmation required",
        description: "Please confirm you are 18 years or older to proceed with booking.",
      });
      return;
    }
    navigate(redirectTo, { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            Complete Your Profile
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add your details to get the best experience
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Your Information
            </CardTitle>
            <CardDescription>
              This information helps us personalize your experience and allows hosts to contact you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  className="mt-1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Hosts will use this to contact you about your bookings
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group bg-muted/30 rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={isAdultConfirmed}
                  onChange={(e) => setIsAdultConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  I confirm I am 18 years or older.
                </span>
              </label>

              {user?.email && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {user.email}
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Skip for now
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Complete Profile"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Points Popup */}
      <LoyaltyPointsPopup
        isOpen={showPointsPopup}
        onClose={handlePointsPopupClose}
        points={earnedPoints}
        totalPoints={totalPoints}
        reason="Profile completion bonus"
      />
    </div>
  );
}
