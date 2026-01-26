import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, DollarSign, Link as LinkIcon } from "lucide-react";

const AffiliateSignup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    websiteUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join our affiliate program",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      // Check if already an affiliate
      const { data: existing } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        toast({
          title: "Already registered",
          description: `You're already an affiliate with ${existing.status} status`,
          variant: "default"
        });
        navigate("/affiliate-dashboard");
        return;
      }

      // Generate referral code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_referral_code');

      if (codeError) throw codeError;

      // Create affiliate record
      const { error: insertError } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          referral_code: codeData,
          company_name: formData.companyName || null,
          website_url: formData.websiteUrl || null,
          status: 'pending',
          commission_rate: 10.00
        });

      if (insertError) throw insertError;

      toast({
        title: "Application submitted! 🎉",
        description: "We'll review your application and get back to you soon",
      });

      navigate("/affiliate-dashboard");
    } catch (error: any) {
      console.error('Affiliate signup error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Join Our Affiliate Program</h1>
            <p className="text-lg text-muted-foreground">
              Earn commissions by promoting Rwanda's best travel experiences
            </p>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <DollarSign className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-xl">10% Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Earn 10% on every booking made through your referral link
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-xl">Track Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Real-time dashboard to monitor clicks, conversions, and earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-xl">Growing Market</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Rwanda tourism is booming - tap into a growing opportunity
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Application Form */}
          <Card>
            <CardHeader>
              <CardTitle>Apply Now</CardTitle>
              <CardDescription>
                Fill out this form to join our affiliate program. We'll review your application within 24-48 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="companyName">Company/Website Name (Optional)</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g., Travel Blog Rwanda"
                  />
                </div>

                <div>
                  <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    How It Works
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Get approved and receive your unique referral link</li>
                    <li>Share the link on your website, blog, or social media</li>
                    <li>Earn 10% commission when someone books through your link</li>
                    <li>Track performance in your affiliate dashboard</li>
                    <li>Request payouts when you reach minimum threshold</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateSignup;
