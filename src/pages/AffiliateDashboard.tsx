import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  MousePointerClick,
  Bell
} from "lucide-react";
import { useNotificationBadge, NotificationBadge } from "@/hooks/useNotificationBadge";

const AffiliateDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState(false);

  // Notification badge hook
  const { getCount, hasNew, markAsSeen, updateNotificationCount } = useNotificationBadge("affiliate");

  // Fetch affiliate data
  const { data: affiliate, isLoading } = useQuery({
    queryKey: ['affiliate', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch referrals
  const { data: referrals = [] } = useQuery({
    queryKey: ['affiliate-referrals', affiliate?.id],
    queryFn: async () => {
      if (!affiliate) return [];
      
      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliate,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
  });

  // Fetch commissions
  const { data: commissions = [] } = useQuery({
    queryKey: ['affiliate-commissions', affiliate?.id],
    queryFn: async () => {
      if (!affiliate) return [];
      
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('*, bookings(*)')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!affiliate,
    refetchInterval: 30000,
    staleTime: 0,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!affiliate?.id) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to referrals changes
    const referralsChannel = supabase
      .channel('affiliate-referrals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_referrals' }, () => {
        console.log('[AffiliateDashboard] Referrals change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['affiliate-referrals', affiliate.id] });
      })
      .subscribe();
    channels.push(referralsChannel);

    // Subscribe to commissions changes
    const commissionsChannel = supabase
      .channel('affiliate-commissions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_commissions' }, () => {
        console.log('[AffiliateDashboard] Commissions change detected - refetching...');
        queryClient.invalidateQueries({ queryKey: ['affiliate-commissions', affiliate.id] });
      })
      .subscribe();
    channels.push(commissionsChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [affiliate?.id, queryClient]);

  useEffect(() => {
    if (!user && !isLoading) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && !affiliate && user) {
      navigate('/affiliate-signup');
    }
  }, [affiliate, isLoading, user, navigate]);

  if (isLoading || !affiliate) {
    return null;
  }

  const referralLink = `${window.location.origin}/?ref=${affiliate.referral_code}`;
  const totalClicks = referrals.length;
  const totalConversions = referrals.filter(r => r.converted).length;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0';
  const pendingEarnings = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const approvedEarnings = commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + parseFloat(c.amount), 0);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard"
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      active: { variant: "default", icon: CheckCircle2 },
      suspended: { variant: "destructive", icon: XCircle },
      rejected: { variant: "destructive", icon: XCircle }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-8 px-4">
        <div className="container max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
                <p className="text-muted-foreground">Track your performance and earnings</p>
              </div>
              {getStatusBadge(affiliate.status)}
            </div>

            {/* Referral Link */}
            {affiliate.status === 'active' && (
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <LinkIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">Your Referral Link</p>
                      <code className="text-sm bg-background px-3 py-1 rounded border block truncate">
                        {referralLink}
                      </code>
                    </div>
                    <Button onClick={copyReferralLink} variant="outline" size="sm">
                      {copiedLink ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {affiliate.status === 'pending' && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Application Under Review</p>
                      <p className="text-sm text-muted-foreground">
                        We're reviewing your application. You'll receive an email once approved.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stats */}
          {affiliate.status === 'active' && (
            <>
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Earnings</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      <DollarSign className="w-6 h-6 text-primary" />
                      {affiliate.total_earnings.toFixed(2)} RWF
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Pending Earnings</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      {pendingEarnings.toFixed(2)} RWF
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Referrals</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      <Users className="w-6 h-6 text-blue-600" />
                      {affiliate.total_referrals}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Conversion Rate</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                      {conversionRate}%
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="referrals">Referrals ({totalClicks})</TabsTrigger>
                  <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Overview</CardTitle>
                      <CardDescription>Your affiliate statistics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <MousePointerClick className="w-4 h-4" />
                          Total Clicks
                        </span>
                        <span className="font-bold">{totalClicks}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Conversions
                        </span>
                        <span className="font-bold">{totalConversions}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium">Commission Rate</span>
                        <span className="font-bold">{affiliate.commission_rate}%</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium">Status</span>
                        {getStatusBadge(affiliate.status)}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="referrals" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Referrals</CardTitle>
                      <CardDescription>Track who clicked your link</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {referrals.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No referrals yet. Share your link to start earning!</p>
                      ) : (
                        <div className="space-y-3">
                          {referrals.slice(0, 10).map((referral: any) => (
                            <div key={referral.id} className="flex items-center justify-between py-3 border-b last:border-0">
                              <div className="flex-1">
                                <p className="text-sm font-medium truncate">{referral.landing_page || 'Homepage'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(referral.created_at).toLocaleDateString()} at {new Date(referral.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              {referral.converted ? (
                                <Badge variant="default" className="ml-2">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Converted
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="ml-2">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Visited
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="commissions" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Commission History</CardTitle>
                      <CardDescription>Your earnings from referrals</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {commissions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No commissions yet. Keep sharing your link!</p>
                      ) : (
                        <div className="space-y-3">
                          {commissions.map((commission: any) => (
                            <div key={commission.id} className="flex items-center justify-between py-3 border-b last:border-0">
                              <div className="flex-1">
                                <p className="text-sm font-medium">Booking #{commission.booking_id.slice(0, 8)}...</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(commission.created_at).toLocaleDateString()} • {commission.commission_rate}% commission
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{parseFloat(commission.amount).toFixed(2)} RWF</p>
                                <Badge variant={
                                  commission.status === 'approved' ? 'default' :
                                  commission.status === 'paid' ? 'default' :
                                  commission.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                                } className="mt-1">
                                  {commission.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateDashboard;
