import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { CalendarDays, Camera, Heart, LogOut, Mail, Shield, Star } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { logError, uiErrorMessage } from "@/lib/ui-errors";
import { extractNeighborhood } from "@/lib/location";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio?: string | null;
  date_of_birth?: string | null;
  created_at?: string;
  loyalty_points?: number;
  loyalty_awarded?: boolean;
};

type BookingRow = {
  id: string;
  check_in: string;
  check_out: string;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  properties: { title: string; location: string } | null;
};

type SavedRow = {
  id: string;
  properties: {
    id: string;
    title: string;
    location: string;
    price_per_night: number;
    currency: string;
    images: string[] | null;
  } | null;
};

const isoToday = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [resetting, setResetting] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
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
      const { data, error } = await supabase.from("bookings").select("id, check_in").eq("guest_id", user!.id);
      if (error) return { upcoming: 0, past: 0 };
      const upcoming = (data ?? []).filter((b) => String((b as { check_in: string }).check_in) >= today).length;
      const past = (data ?? []).filter((b) => String((b as { check_in: string }).check_in) < today).length;
      return { upcoming, past };
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", "list", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<BookingRow[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, check_in, check_out, total_price, currency, status, created_at, properties(title, location)")
        .eq("guest_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data as BookingRow[] | null) ?? [];
    },
  });

  const { data: saved = [], isLoading: savedLoading } = useQuery({
    queryKey: ["favorites", "list", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<SavedRow[]> => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, properties(id, title, location, price_per_night, currency, images)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) return [];
      return (data as SavedRow[] | null) ?? [];
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [bio, setBio] = useState("");
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setDob(profile?.date_of_birth ?? "");
    setBio(profile?.bio ?? "");
    setNickname((profile as any)?.nickname ?? "");
  }, [profile]);

  const completeProfileMissing = useMemo(
    () => phone.trim().length < 7 || !dob.trim() || !fullName.trim(),
    [phone, dob, fullName]
  );

  const loyaltyPoints = Number(profile?.loyalty_points ?? 0);

  const memberSince = useMemo(() => {
    const raw = profile?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return null;
    const diffMs = Date.now() - d.getTime();
    const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remainingDays = days % 30;
    const parts = [
      years ? `${years} year${years === 1 ? "" : "s"}` : null,
      months ? `${months} month${months === 1 ? "" : "s"}` : null,
      !years && !months ? `${remainingDays} day${remainingDays === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    const pretty = parts.join(" ");
    const cal = d.toLocaleString(undefined, { month: "short", year: "numeric" });
    return `${cal} · ${pretty} ago`;
  }, [profile?.created_at]);

  const upcomingBookings = useMemo(() => {
    const today = isoToday();
    return bookings.filter((b) => String(b.check_in) >= today);
  }, [bookings]);

  const pastBookings = useMemo(() => {
    const today = isoToday();
    return bookings.filter((b) => String(b.check_in) < today);
  }, [bookings]);

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        nickname: nickname.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (dob.trim()) payload.date_of_birth = dob.trim();

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user.id);
      
      if (error) {
        // Ignore AbortError - can happen on navigation or component unmount
        if (error.message?.includes("AbortError") || error.message?.includes("aborted")) {
          return;
        }
        throw error;
      }

      // Invalidate and refetch the profile
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });

      toast({ title: "Profile updated", description: "Your changes were saved." });
    } catch (e) {
      // Ignore AbortError exceptions
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      logError("profile.update", e);
      toast({
        variant: "destructive",
        title: "Could not update profile",
        description: uiErrorMessage(e, "Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your account information and preferences</p>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left profile card */}
          <Card className="lg:col-span-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-28 w-28 border border-border">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? "Profile"} />
                  <AvatarFallback className="text-lg font-semibold">
                    {(profile?.full_name ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CloudinaryUploadDialog
                  title="Upload avatar"
                  folder="merry360/avatars"
                  accept="image/*"
                  multiple={false}
                  maxFiles={1}
                  value={profile?.avatar_url ? [profile.avatar_url] : []}
                  onChange={async (urls) => {
                    const next = urls[0] ?? "";
                    if (!user) return;
                    try {
                      const { error } = await supabase
                        .from("profiles")
                        .update({ avatar_url: next || null })
                        .eq("user_id", user.id);
                      if (error) throw error;
                      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
                      toast({ title: "Avatar updated" });
                    } catch (err) {
                      toast({
                        variant: "destructive",
                        title: "Avatar update failed",
                        description: err instanceof Error ? err.message : "Please try again.",
                      });
                    }
                  }}
                  trigger={
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 h-9 w-9 rounded-full border border-border bg-background shadow-sm flex items-center justify-center"
                      aria-label="Upload avatar"
                    >
                      <Camera className="w-4 h-4 text-muted-foreground" />
                    </button>
                  }
                />
              </div>

              <div className="mt-4 text-lg font-semibold text-foreground">{profile?.full_name || "Merry 360 X"}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Loyalty points</div>
                  <div className="text-lg font-bold text-foreground">
                    {loyaltyPoints} <span className="text-sm font-medium text-muted-foreground">points</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  Rewards
                </span>
              </div>
              {completeProfileMissing ? (
                <div className="mt-3 text-sm text-muted-foreground">
                  Complete your profile to earn <span className="font-semibold text-foreground">5</span> loyalty points.
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">
                  You can use points for discounts when booking.
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trips Completed</span>
                <span className="font-semibold text-foreground">{trips.past}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saved Items</span>
                <span className="font-semibold text-foreground">{favoritesCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-semibold text-foreground">{memberSince ?? "—"}</span>
          </div>
        </div>

            <Button
              variant="outline"
              className="w-full mt-6 border-destructive text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </Card>

          {/* Right content */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="trips" className="w-full">
              <TabsList className="w-full justify-start bg-card rounded-xl p-1 border border-border">
                <TabsTrigger value="trips" className="px-5">
                  My Trips
                </TabsTrigger>
                <TabsTrigger value="personal" className="px-5">
                  Personal Info
                </TabsTrigger>
                <TabsTrigger value="security" className="px-5">
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trips" className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
            <div className="text-sm text-muted-foreground">Upcoming Trips</div>
                        <div className="text-3xl font-bold text-foreground mt-1">{trips.upcoming}</div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          </div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
            <div className="text-sm text-muted-foreground">Cart Items</div>
                        <div className="text-3xl font-bold text-foreground mt-1">{cartCount}</div>
                      </div>
                      <Link
                        to="/trip-cart"
                        className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-3 py-1"
                      >
                        TripCart
                      </Link>
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Loyalty Points</div>
                        <div className="text-3xl font-bold text-foreground mt-1">{loyaltyPoints}</div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Star className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </Card>
                </div>

                <Tabs defaultValue="upcoming">
                  <TabsList className="bg-transparent p-0 border-b border-border rounded-none h-auto">
                    <TabsTrigger
                      value="upcoming"
                      className="rounded-none px-0 mr-6 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                    >
                      Upcoming
                    </TabsTrigger>
                    <TabsTrigger
                      value="past"
                      className="rounded-none px-0 mr-6 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                    >
                      Past Trips
                    </TabsTrigger>
                    <TabsTrigger
                      value="saved"
                      className="rounded-none px-0 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                    >
                      Saved
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming" className="pt-6">
                    {/* {bookingsLoading ? (
                      <div className="py-14 text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading trips…</p>
                      </div>
                    ) : */ upcomingBookings.length === 0 ? (
                      <Card className="p-10 text-center">
                        <CalendarDays className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
                        <div className="text-lg font-semibold text-foreground mb-1">No upcoming trips</div>
                        <div className="text-muted-foreground mb-6">Start planning your next adventure!</div>
                        <Link to="/accommodations">
                          <Button>Explore Destinations</Button>
                        </Link>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {upcomingBookings.map((b) => (
                          <Card key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate">{b.properties?.title ?? "Booking"}</div>
                              <div className="text-sm text-muted-foreground">
                                {extractNeighborhood(b.properties?.location)} • {new Date(b.check_in).toLocaleDateString()} →{" "}
                                {new Date(b.check_out).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-foreground">
                                {formatMoney(Number(b.total_price), String(b.currency ?? "RWF"))}
                              </span>
                              <Link to="/my-bookings">
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="past" className="pt-6">
                    {/* {bookingsLoading ? (
                      <div className="py-14 text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading trips…</p>
                      </div>
                    ) : */ pastBookings.length === 0 ? (
                      <Card className="p-10 text-center text-muted-foreground">No past trips yet.</Card>
                    ) : (
                      <div className="space-y-3">
                        {pastBookings.map((b) => (
                          <Card key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate">{b.properties?.title ?? "Booking"}</div>
                              <div className="text-sm text-muted-foreground">
                                {extractNeighborhood(b.properties?.location)} • {new Date(b.check_in).toLocaleDateString()} →{" "}
                                {new Date(b.check_out).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-foreground">
                                {formatMoney(Number(b.total_price), String(b.currency ?? "RWF"))}
                              </span>
                              <Link to="/my-bookings">
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="saved" className="pt-6">
                    {/* {savedLoading ? (
                      <div className="py-14 text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading saved items…</p>
                      </div>
                    ) : */ saved.length === 0 ? (
                      <Card className="p-10 text-center">
                        <Heart className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
                        <div className="text-lg font-semibold text-foreground mb-1">No saved items</div>
                        <div className="text-muted-foreground mb-6">Save places you love and come back later.</div>
                        <Link to="/accommodations">
                          <Button variant="outline">Browse stays</Button>
                        </Link>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {saved.map((row) => {
                          const p = row.properties;
                          if (!p) return null;
                          const img = p.images?.[0] ?? null;
                          return (
                            <Link key={row.id} to={`/properties/${p.id}`} className="block">
                              <Card className="overflow-hidden">
                                <div className="aspect-[4/3] bg-muted overflow-hidden">
                                  {img ? (
                                    <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                                  ) : null}
                                </div>
                                <div className="p-4">
                                  <div className="font-semibold text-foreground line-clamp-1">{p.title}</div>
                                  <div className="text-sm text-muted-foreground line-clamp-1">{extractNeighborhood(p.location)}</div>
                                  <div className="mt-2 text-sm font-semibold text-foreground">
                                    {formatMoney(Number(p.price_per_night ?? 0), String(p.currency ?? "RWF"))}
                                    <span className="text-muted-foreground font-normal"> / night</span>
          </div>
        </div>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="personal" className="mt-6">
                <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-1">Personal Info</h2>
          <p className="text-muted-foreground mb-6">Keep your details up to date to unlock all features.</p>

          {/* {profileLoading ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : */ (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <Label htmlFor="nickname">Display Name (Nickname)</Label>
                <Input 
                  id="nickname" 
                  value={nickname} 
                  onChange={(e) => setNickname(e.target.value)} 
                  placeholder="Optional - shown to guests" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This name will be shown to guests instead of your full name
                </p>
              </div>
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250..." />
              </div>
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>

                      <div className="md:col-span-3">
                        <Label htmlFor="bio">About you</Label>
                        <Textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Share a little about yourself (shown on your host profile)."
                />
              </div>

              <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                {completeProfileMissing ? (
                  <div className="text-sm text-muted-foreground">
                            Complete your profile to earn <span className="font-semibold text-foreground">5</span> loyalty points.
                  </div>
                ) : (
                          <div className="text-sm text-muted-foreground">
                            Profile looks good. You have <span className="font-semibold text-foreground">{loyaltyPoints}</span>{" "}
                            loyalty points.
                          </div>
                )}
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          )}
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-6">
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-1">Security</h2>
                      <p className="text-muted-foreground">Manage login and account security settings.</p>
                    </div>
                    <Shield className="w-5 h-5 text-muted-foreground mt-1" />
        </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-5">
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-semibold text-foreground mt-1 break-all">{user?.email}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Use the button below to send a password reset link to your email.
                      </div>
                      <Button
                        variant="outline"
                        className="mt-4"
                        disabled={resetting || !user?.email}
                        onClick={async () => {
                          if (!user?.email) return;
                          setResetting(true);
                          try {
                            const redirectTo = `${window.location.origin}/reset-password`;
                            const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
                            if (error) throw error;
                            toast({ title: "Password reset email sent", description: "Check your inbox." });
                          } catch (err) {
                            toast({
                              variant: "destructive",
                              title: "Could not send reset email",
                              description: err instanceof Error ? err.message : "Please try again.",
                            });
                          } finally {
                            setResetting(false);
                          }
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {resetting ? "Sending..." : "Send reset email"}
                      </Button>
                    </Card>
                    <Card className="p-5">
                      <div className="text-sm text-muted-foreground">Sign out</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        If you suspect suspicious activity, sign out and sign back in.
                      </div>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={async () => {
                          await signOut();
                          navigate("/");
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                      </Button>
                    </Card>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
