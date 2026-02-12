import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function TermsAndConditions() {
  const { data: legalContent } = useQuery({
    queryKey: ["legal_content", "terms_and_conditions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_content")
        .select("*")
        .eq("content_type", "terms_and_conditions")
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
          <h1 className="text-4xl font-bold mb-4">{legalContent?.title || 'Terms and Conditions'}</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {legalContent?.updated_at ? new Date(legalContent.updated_at).toLocaleDateString() : 'January 26, 2026'}
          </p>

          {hasContent ? (
            <Card className="p-8">
              <div className="prose prose-slate max-w-none">
                {sections.map((section: any, index: number) => (
                  <div key={section.id || index} className="mb-6 last:mb-0">
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {section.text}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-muted-foreground">
                No terms and conditions have been added yet. Please check back later or contact support@merry360x.com for more information.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
