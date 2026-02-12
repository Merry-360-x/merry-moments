import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Copy, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Check,
  ExternalLink,
  Download,
  Loader2,
  Share2
} from "lucide-react";
import { formatMoney } from "@/lib/money";

interface Affiliate {
  id: string;
  affiliate_code: string;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  status: string;
  created_at: string;
}

interface Referral {
  id: string;
  referred_user_email: string;
  bookings_count: number;
  total_commission_earned: number;
  status: string;
  registered_at: string;
}

interface Commission {
  id: string;
  booking_value: number;
  platform_commission: number;
  affiliate_commission: number;
  status: string;
  created_at: string;
  referral: {
    referred_user_email: string;
  };
}

export default function AffiliatePortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const affiliateLink = affiliate 
    ? `${window.location.origin}/host-signup?ref=${affiliate.affiliate_code}`
    : "";

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);

      // Fetch affiliate account
      const { data: affiliateData, error: affiliateError } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (affiliateError && affiliateError.code !== "PGRST116") {
        throw affiliateError;
      }

      if (affiliateData) {
        setAffiliate(affiliateData);

        // Fetch referrals
        const { data: referralsData, error: referralsError } = await supabase
          .from("affiliate_referrals")
          .select("*")
          .eq("affiliate_id", affiliateData.id)
          .order("registered_at", { ascending: false });

        if (referralsError) throw referralsError;
        setReferrals(referralsData || []);

        // Fetch commissions
        const { data: commissionsData, error: commissionsError } = await supabase
          .from("affiliate_commissions")
          .select(`
            *,
            referral:affiliate_referrals(referred_user_email)
          `)
          .eq("affiliate_id", affiliateData.id)
          .order("created_at", { ascending: false });

        if (commissionsError) throw commissionsError;
        setCommissions(commissionsData || []);
      }
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load affiliate data",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAffiliateAccount = async () => {
    try {
      setCreatingAccount(true);

      // Generate unique code on server
      const { data, error } = await supabase.rpc("generate_affiliate_code");
      if (error) throw error;

      const code = data;

      // Create affiliate account
      const { error: insertError } = await supabase
        .from("affiliates")
        .insert({
          user_id: user?.id,
          affiliate_code: code,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success!",
        description: "Your referral account has been created",
      });

      await fetchAffiliateData();
    } catch (error) {
      console.error("Error creating affiliate account:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create referral account",
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy link",
      });
    }
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join Merry360x as a Host",
        text: "Become a tour operator on Merry360x and start earning!",
        url: affiliateLink,
      });
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return null;
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-4xl font-bold">Refer an Operator and Earn $</h1>
            <p className="text-lg text-muted-foreground">
              Earn 20% commission on platform fees for the first 5 bookings from each operator you refer!
            </p>
            
            <Card className="p-8 space-y-4">
              <h2 className="text-2xl font-semibold">How It Works</h2>
              <div className="text-left space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium">Share your unique link</p>
                    <p className="text-sm text-muted-foreground">Invite tour operators to join Merry360x</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium">They register and list their services</p>
                    <p className="text-sm text-muted-foreground">Operators create tours, accommodations, or transport</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium">Earn 20% on first 5 bookings</p>
                    <p className="text-sm text-muted-foreground">You get 20% of our 10% platform commission per booking</p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="font-semibold mb-2">Example Earnings:</p>
                <div className="text-sm space-y-1">
                  <p>• Booking value: 1,000,000 RWF</p>
                  <p>• Platform commission (10%): 100,000 RWF</p>
                  <p>• Your commission (20%): <span className="font-bold text-primary">20,000 RWF</span></p>
                  <p className="pt-2 border-t mt-2">• Per operator (5 bookings): <span className="font-bold text-primary">100,000 RWF</span></p>
                  <p>• 10 operators: <span className="font-bold text-primary text-lg">1,000,000 RWF</span></p>
                </div>
              </div>

              <Button size="lg" onClick={createAffiliateAccount} disabled={creatingAccount} className="w-full">
                {creatingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Start Earning Now"
                )}
              </Button>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const activeReferrals = referrals.filter(r => r.status === "active").length;
  const completedReferrals = referrals.filter(r => r.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Referral Dashboard</h1>
          <p className="text-muted-foreground">Track your referrals and earnings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{formatMoney(affiliate.total_earnings, "RWF")}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Pending</p>
              <TrendingUp className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">{formatMoney(affiliate.pending_earnings, "RWF")}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Paid Out</p>
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{formatMoney(affiliate.paid_earnings, "RWF")}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{referrals.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeReferrals} active • {completedReferrals} completed
            </p>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Referral Link</h2>
          <div className="space-y-4">
            <div>
              <Label>Share this link with tour operators</Label>
              <div className="flex gap-2 mt-2">
                <Input value={affiliateLink} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={shareLink}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{affiliate.affiliate_code}</Badge>
              <span>Your unique referral code</span>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="referrals">
          <TabsList>
            <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
            <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="mt-6">
            <Card>
              <div className="p-6">
                <h3 className="font-semibold mb-4">Your Referrals</h3>
                {referrals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No referrals yet. Start sharing your link!</p>
                ) : (
                  <div className="space-y-3">
                    {referrals.map((referral) => (
                      <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{referral.referred_user_email}</p>
                          <p className="text-sm text-muted-foreground">
                            Registered {new Date(referral.registered_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={referral.status === "completed" ? "default" : "secondary"}>
                            {referral.bookings_count}/5 bookings
                          </Badge>
                          <p className="text-sm font-semibold">
                            {formatMoney(referral.total_commission_earned, "RWF")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="commissions" className="mt-6">
            <Card>
              <div className="p-6">
                <h3 className="font-semibold mb-4">Commission History</h3>
                {commissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No commissions earned yet</p>
                ) : (
                  <div className="space-y-3">
                    {commissions.map((commission) => (
                      <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">
                            From: {(commission.referral as any)?.referred_user_email || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Booking: {formatMoney(commission.booking_value, "RWF")} • 
                            Platform fee: {formatMoney(commission.platform_commission, "RWF")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(commission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatMoney(commission.affiliate_commission, "RWF")}
                          </p>
                          <Badge variant={commission.status === "paid" ? "default" : "secondary"}>
                            {commission.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
