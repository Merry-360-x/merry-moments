import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function PrivacyPolicy() {
  const { data: legalContent, isLoading } = useQuery({
    queryKey: ["legal_content", "privacy_policy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_content")
        .select("*")
        .eq("content_type", "privacy_policy")
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const sections = legalContent?.content?.sections || [];
  const hasContent = sections.length > 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">{legalContent?.title || 'Privacy Policy'}</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {legalContent?.updated_at ? new Date(legalContent.updated_at).toLocaleDateString() : 'January 26, 2026'}
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : hasContent ? (
            <div className="space-y-6">
              {sections.map((section: any, index: number) => (
                <Card key={section.id || index} className="p-6">
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {section.text}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <p className="text-muted-foreground">
                No privacy policy content has been added yet. Please check back later or contact support@merry360x.com for more information.
              </p>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
