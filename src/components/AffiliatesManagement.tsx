import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, XCircle, DollarSign, TrendingUp, Users } from "lucide-react";

export const AffiliatesManagement = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  // Fetch all affiliates
  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ['admin-affiliates', filter],
    queryFn: async () => {
      let query = supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: affiliatesData, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately
      if (affiliatesData && affiliatesData.length > 0) {
        const userIds = affiliatesData.map(a => a.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        
        // Merge profiles with affiliates
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        return affiliatesData.map(affiliate => ({
          ...affiliate,
          profiles: profileMap.get(affiliate.user_id) || null
        }));
      }
      
      return affiliatesData || [];
    }
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-affiliate-stats'],
    queryFn: async () => {
      const [affiliatesRes, commissionsRes, referralsRes] = await Promise.all([
        supabase.from('affiliates').select('id, status, total_earnings'),
        supabase.from('affiliate_commissions').select('amount, status'),
        supabase.from('affiliate_referrals').select('converted')
      ]);

      const totalAffiliates = affiliatesRes.data?.length || 0;
      const activeAffiliates = affiliatesRes.data?.filter(a => a.status === 'active').length || 0;
      const pendingAffiliates = affiliatesRes.data?.filter(a => a.status === 'pending').length || 0;
      const totalEarnings = affiliatesRes.data?.reduce((sum, a) => sum + parseFloat(a.total_earnings), 0) || 0;
      const totalCommissions = commissionsRes.data?.reduce((sum, c) => sum + parseFloat(c.amount), 0) || 0;
      const paidCommissions = commissionsRes.data?.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.amount), 0) || 0;
      const totalReferrals = referralsRes.data?.length || 0;
      const conversions = referralsRes.data?.filter(r => r.converted).length || 0;

      return {
        totalAffiliates,
        activeAffiliates,
        pendingAffiliates,
        totalEarnings,
        totalCommissions,
        paidCommissions,
        totalReferrals,
        conversions,
        conversionRate: totalReferrals > 0 ? ((conversions / totalReferrals) * 100).toFixed(1) : '0.0'
      };
    }
  });

  const updateAffiliateStatus = async (affiliateId: string, status: string) => {
    const { error } = await supabase
      .from('affiliates')
      .update({ 
        status,
        approved_at: status === 'active' ? new Date().toISOString() : null
      })
      .eq('id', affiliateId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Status updated",
      description: `Affiliate status changed to ${status}`
    });

    qc.invalidateQueries({ queryKey: ['admin-affiliates'] });
    qc.invalidateQueries({ queryKey: ['admin-affiliate-stats'] });
  };

  const updateCommissionRate = async (affiliateId: string, rate: number) => {
    const { error } = await supabase
      .from('affiliates')
      .update({ commission_rate: rate })
      .eq('id', affiliateId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Commission rate updated",
      description: `Rate changed to ${rate}%`
    });

    qc.invalidateQueries({ queryKey: ['admin-affiliates'] });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      active: { variant: "default", icon: CheckCircle2, label: "Active" },
      suspended: { variant: "destructive", icon: XCircle, label: "Suspended" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" }
    };

    const { variant, icon: Icon, label } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading affiliates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Total Affiliates</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalAffiliates || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.activeAffiliates || 0} active • {stats?.pendingAffiliates || 0} pending
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Total Commissions</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalCommissions.toFixed(2) || '0.00'} RWF</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.paidCommissions.toFixed(2) || '0.00'} RWF paid
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Referrals</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.conversions || 0} conversions
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Conversion Rate</span>
          </div>
          <p className="text-2xl font-bold">{stats?.conversionRate || '0.0'}%</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({affiliates.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({affiliates.filter(a => a.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({affiliates.filter(a => a.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspended ({affiliates.filter(a => a.status === 'suspended').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {affiliates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No affiliates found
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((affiliate: any) => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{affiliate.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{affiliate.profiles?.email || 'No email'}</p>
                          {affiliate.company_name && (
                            <p className="text-xs text-muted-foreground">{affiliate.company_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{affiliate.referral_code}</code>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={affiliate.commission_rate}
                          onChange={(e) => updateCommissionRate(affiliate.id, parseFloat(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                      <TableCell className="font-medium">{parseFloat(affiliate.total_earnings).toFixed(2)} RWF</TableCell>
                      <TableCell>{affiliate.total_referrals}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(affiliate.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={affiliate.status}
                          onValueChange={(value) => updateAffiliateStatus(affiliate.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
