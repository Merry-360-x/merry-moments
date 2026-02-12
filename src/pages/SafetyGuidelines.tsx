import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Phone, Users, MapPin, Car, Home, Mountain } from "lucide-react";

export default function SafetyGuidelines() {
  const { data: legalContent } = useQuery({
    queryKey: ["legal_content", "safety_guidelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_content")
        .select("*")
        .eq("content_type", "safety_guidelines" as any)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data as { title: string; content: { sections: any[] }; updated_at: string } | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const sections = legalContent?.content?.sections || [];
  const hasContent = sections.length > 0;

  // Default safety guidelines if no database content
  const defaultGuidelines = [
    {
      icon: Shield,
      title: "General Safety",
      items: [
        "Always verify host identity and listing details before booking",
        "Read reviews from previous guests carefully",
        "Keep all communication and payments within the Merry platform",
        "Share your travel itinerary with family or friends",
        "Trust your instincts – if something feels wrong, leave immediately",
      ]
    },
    {
      icon: Home,
      title: "Accommodation Safety",
      items: [
        "Check for working smoke detectors and fire extinguishers upon arrival",
        "Locate emergency exits and evacuation routes",
        "Lock doors and windows when leaving or sleeping",
        "Keep valuables in a safe or secure location",
        "Report any safety concerns to the host and Merry support immediately",
      ]
    },
    {
      icon: Mountain,
      title: "Tour & Activity Safety",
      items: [
        "Only participate in activities appropriate for your fitness level",
        "Follow all safety instructions from guides and operators",
        "Wear appropriate protective gear (helmets, life jackets, etc.)",
        "Stay hydrated and protect yourself from sun exposure",
        "Inform guides of any medical conditions or allergies",
        "Never wander off from the group without informing your guide",
      ]
    },
    {
      icon: Car,
      title: "Transport Safety",
      items: [
        "Inspect vehicles for safety features before renting",
        "Verify driver's license and insurance documentation",
        "Always wear seatbelts and follow local traffic laws",
        "Avoid driving in unfamiliar areas after dark",
        "Keep emergency contact numbers saved in your phone",
      ]
    },
    {
      icon: MapPin,
      title: "Local Awareness",
      items: [
        "Research local customs, laws, and potential hazards before traveling",
        "Keep copies of important documents (passport, ID, insurance)",
        "Avoid displaying expensive jewelry or large amounts of cash",
        "Use official taxis or verified transport services",
        "Stay aware of your surroundings, especially in crowded areas",
      ]
    },
    {
      icon: Phone,
      title: "Emergency Contacts",
      items: [
        "Rwanda Police: 112",
        "Rwanda Ambulance: 912",
        "Rwanda Fire Brigade: 111",
        "Merry 360 Support: +250796214719",
        "Keep your country's embassy contact information handy",
      ]
    },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">{legalContent?.title || 'Safety Guidelines & Tips'}</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Last updated: {legalContent?.updated_at ? new Date(legalContent.updated_at).toLocaleDateString() : new Date().toLocaleDateString()}
          </p>

          <Card className="p-6 mb-8 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Your Safety is Our Priority</h3>
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  At Merry 360, we are committed to ensuring every guest and host has a safe experience. 
                  Please review these guidelines before your trip and contact us immediately if you encounter any safety concerns.
                </p>
              </div>
            </div>
          </Card>

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
            <div className="space-y-6">
              {defaultGuidelines.map((guideline, index) => {
                const Icon = guideline.icon;
                return (
                  <Card key={index} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold">{guideline.title}</h2>
                    </div>
                    <ul className="space-y-2">
                      {guideline.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2 text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="p-6 mt-8 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-lg">Need Assistance?</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              If you encounter any safety issues or need immediate assistance, please contact our support team:
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="tel:+250796214719" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Phone className="w-4 h-4" />
                +250 796 214 719
              </a>
              <a 
                href="mailto:support@merry360x.com" 
                className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
              >
                support@merry360x.com
              </a>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
