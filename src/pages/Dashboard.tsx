import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth?: string | null;
};

const isoToday = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    },
  });

  const { data: favoritesCount = 0 } = useQuery({
    queryKey: ["favorites", "count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);

      if (error) return 0;
      return count ?? 0;
    },
  });

  const { data: cartCount = 0 } = useQuery({
    queryKey: ["trip_cart_items", "count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("trip_cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);

      if (error) return 0;
      return count ?? 0;
    },
  });

  const { data: trips = { upcoming: 0, past: 0 } } = useQuery({
    queryKey: ["bookings", "counts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = isoToday();
      const { data, error } = await supabase
        .from("bookings")
        .select("id, check_in")
        .eq("guest_id", user!.id);

      if (error) return { upcoming: 0, past: 0 };

      const upcoming = (data ?? []).filter((b) => String(b.check_in) >= today).length;
      const past = (data ?? []).filter((b) => String(b.check_in) < today).length;
      return { upcoming, past };
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setDob(profile?.date_of_birth ?? "");
  }, [profile]);

  const completeProfileMissing = useMemo(() => {
    return (phone.trim().length < 7) || !dob.trim();
  }, [phone, dob]);

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      };

      // Only include dob if provided; database migration adds this field.
      if (dob.trim()) payload.date_of_birth = dob.trim();

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Profile updated", description: "Your changes were saved." });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not update profile",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">My Profile</h1>
            <p className="text-muted-foreground">Manage your account information and preferences</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/my-bookings">
              <Button variant="outline">My Trips</Button>
            </Link>
            <Link to="/favorites">
              <Button variant="outline">Wishlist</Button>
            </Link>
            <Link to="/trip-cart">
              <Button>Trip Cart</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-card rounded-xl shadow-card p-6">
            <div className="text-sm text-muted-foreground">Upcoming Trips</div>
            <div className="text-3xl font-bold text-foreground mt-2">{trips.upcoming}</div>
          </div>
          <div className="bg-card rounded-xl shadow-card p-6">
            <div className="text-sm text-muted-foreground">Saved Items</div>
            <div className="text-3xl font-bold text-foreground mt-2">{favoritesCount}</div>
          </div>
          <div className="bg-card rounded-xl shadow-card p-6">
            <div className="text-sm text-muted-foreground">Cart Items</div>
            <div className="text-3xl font-bold text-foreground mt-2">{cartCount}</div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-1">Personal Info</h2>
          <p className="text-muted-foreground mb-6">Keep your details up to date to unlock all features.</p>

          {profileLoading ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250..."
                />
              </div>
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                {completeProfileMissing ? (
                  <div className="text-sm text-muted-foreground">
                    Please add your phone number and date of birth to complete your profile.
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Profile looks good.</div>
                )}
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 text-sm text-muted-foreground">
          Trips completed: {trips.past}
        </div>
      </div>

      <Footer />
    </div>
  );
}
