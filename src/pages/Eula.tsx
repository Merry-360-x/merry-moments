import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Eula() {
  const { data: legalContent } = useQuery({
    queryKey: ["legal_content", "eula"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_content")
        .select("*")
        .eq("content_type", "eula")
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const sections = legalContent?.content?.sections || [];
  const hasContent = sections.length > 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">{legalContent?.title || 'End User License Agreement'}</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {legalContent?.updated_at ? new Date(legalContent.updated_at).toLocaleDateString() : 'June 27, 2026'}
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
                No End User License Agreement has been added yet. Please check back later or contact support@merry360x.com for more information.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
