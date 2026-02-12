import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCcw, Clock, AlertCircle, CreditCard, Home, Mountain, Car, HelpCircle } from "lucide-react";

export default function RefundPolicy() {
  const { data: legalContent } = useQuery({
    queryKey: ["legal_content", "refund_policy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_content")
        .select("*")
        .eq("content_type", "refund_policy" as any)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as { title: string; content: { sections: any[] }; updated_at: string } | null;
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
          <div className="flex items-center gap-3 mb-4">
            <RefreshCcw className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">{legalContent?.title || 'Refund & Cancellation Policy'}</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Last updated: {legalContent?.updated_at ? new Date(legalContent.updated_at).toLocaleDateString() : new Date().toLocaleDateString()}
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
            <div className="space-y-6">
              {/* General Policy Overview */}
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex gap-3">
                  <AlertCircle className="w-6 h-6 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Important Information</h3>
                    <p className="text-muted-foreground text-sm">
                      Refund policies vary by listing and are set by individual hosts. Always review the specific 
                      cancellation policy on the listing page before booking. The policies below represent our 
                      standard guidelines.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Accommodations */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Accommodation Bookings</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium text-green-700 dark:text-green-400">Lenient Policy</h4>
                    <ul className="text-muted-foreground text-sm mt-1 space-y-1">
                      <li>• Cancel up to 24 hours before check-in: <strong>Full refund</strong></li>
                      <li>• Cancel within 24 hours of check-in: <strong>50% refund</strong></li>
                      <li>• No-show: <strong>No refund</strong></li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-medium text-amber-700 dark:text-amber-400">Fair Policy (Standard)</h4>
                    <ul className="text-muted-foreground text-sm mt-1 space-y-1">
                      <li>• Cancel 7+ days before check-in: <strong>Full refund</strong></li>
                      <li>• Cancel 2-6 days before check-in: <strong>50% refund</strong></li>
                      <li>• Cancel within 48 hours: <strong>No refund</strong></li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-medium text-red-700 dark:text-red-400">Strict Policy</h4>
                    <ul className="text-muted-foreground text-sm mt-1 space-y-1">
                      <li>• Cancel 14+ days before check-in: <strong>50% refund</strong></li>
                      <li>• Cancel within 14 days: <strong>No refund</strong></li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Monthly Stays */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Monthly Stays (30+ Days)</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-amber-500 pl-4">
                    <h4 className="font-medium text-amber-700 dark:text-amber-400">Fair Monthly Policy</h4>
                    <ul className="text-muted-foreground text-sm mt-1 space-y-1">
                      <li>• 7-15 days before check-in: <strong>75% refund</strong> (minus applicable service or processing fees)</li>
                      <li>• 3-7 days before check-in: <strong>50% refund</strong> (minus applicable service or processing fees)</li>
                      <li>• 0-3 days before check-in: <strong>25% refund</strong> (minus applicable service or processing fees)</li>
                      <li>• No-shows: <strong>Non-refundable</strong></li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-medium text-red-700 dark:text-red-400">Strict Monthly Policy</h4>
                    <ul className="text-muted-foreground text-sm mt-1 space-y-1">
                      <li>• 15-30 days before check-in: <strong>75% refund</strong> (minus applicable service or processing fees)</li>
                      <li>• 7-15 days before check-in: <strong>50% refund</strong> (minus applicable service or processing fees)</li>
                      <li>• 0-7 days before check-in: <strong>25% refund</strong> (minus applicable service or processing fees)</li>
                      <li>• No-shows: <strong>Non-refundable</strong></li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Tours & Experiences */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mountain className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Tours & Experiences</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Standard Day Tours & Activities</h4>
                    <ul className="text-muted-foreground text-sm space-y-1">
                      <li>• More than 72 hours before start: <strong>Full refund</strong> (excluding platform fees)</li>
                      <li>• 48–72 hours before start: <strong>50% refund</strong> (excluding platform fees)</li>
                      <li>• Less than 48 hours before start: <strong>No refund</strong></li>
                      <li>• No-shows or late arrivals: <strong>No refund</strong></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Multi-Day, Private & Custom Experiences</h4>
                    <ul className="text-muted-foreground text-sm space-y-1">
                      <li>• More than 14 days before start: <strong>Full refund</strong> minus deposits and third-party costs</li>
                      <li>• 7–14 days before start: <strong>50% refund</strong></li>
                      <li>• Less than 7 days before start: <strong>No refund</strong></li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Transport */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Transport & Car Rentals</h2>
                </div>
                
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Cancel 48+ hours before pickup: <strong>Full refund</strong></li>
                  <li>• Cancel 24-48 hours before pickup: <strong>50% refund</strong></li>
                  <li>• Cancel within 24 hours: <strong>No refund</strong></li>
                  <li>• Early return of vehicle: <strong>No refund</strong> for unused days</li>
                </ul>
              </Card>

              {/* Non-Refundable Items */}
              <Card className="p-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h2 className="text-xl font-semibold text-red-800 dark:text-red-200">Non-Refundable Items</h2>
                </div>
                <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                  The following costs are typically non-refundable once booked:
                </p>
                <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                  <li>• National park and conservation permits</li>
                  <li>• Gorilla trekking and special access permits</li>
                  <li>• Third-party accommodation bookings</li>
                  <li>• Pre-booked transport, flights, or activity tickets</li>
                  <li>• Platform service fees and payment processing fees</li>
                  <li>• Items marked as "Non-Refundable" on the listing page</li>
                </ul>
              </Card>

              {/* How to Request Refund */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">How to Request a Refund</h2>
                </div>
                
                <ol className="text-muted-foreground text-sm space-y-3">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">1</span>
                    <span>Go to <strong>My Bookings</strong> in your account dashboard</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">2</span>
                    <span>Find the booking you wish to cancel and click <strong>Cancel Booking</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">3</span>
                    <span>Review the refund amount based on the cancellation policy</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">4</span>
                    <span>Confirm your cancellation request</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">5</span>
                    <span>Refunds are processed within <strong>5-10 business days</strong> to your original payment method</span>
                  </li>
                </ol>
              </Card>

              {/* Refund Processing */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Refund Processing Times</h2>
                </div>
                
                <ul className="text-muted-foreground text-sm space-y-2">
                  <li className="flex justify-between items-center py-2 border-b">
                    <span>Mobile Money (MTN, Airtel)</span>
                    <span className="font-medium">1-3 business days</span>
                  </li>
                  <li className="flex justify-between items-center py-2 border-b">
                    <span>Credit/Debit Cards</span>
                    <span className="font-medium">5-10 business days</span>
                  </li>
                  <li className="flex justify-between items-center py-2 border-b">
                    <span>Bank Transfer</span>
                    <span className="font-medium">3-7 business days</span>
                  </li>
                  <li className="flex justify-between items-center py-2">
                    <span>PayPal</span>
                    <span className="font-medium">3-5 business days</span>
                  </li>
                </ul>
              </Card>

              {/* Disputes */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Disputes & Special Circumstances</h2>
                </div>
                
                <p className="text-muted-foreground text-sm mb-4">
                  In certain circumstances, you may be eligible for a full or partial refund outside the standard policy:
                </p>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Host cancels the booking</li>
                  <li>• Property/service significantly differs from the listing description</li>
                  <li>• Safety hazards not disclosed in the listing</li>
                  <li>• Natural disasters or government-mandated travel restrictions</li>
                  <li>• Medical emergencies (documentation may be required)</li>
                </ul>
                <p className="text-muted-foreground text-sm mt-4">
                  For disputes, contact our support team at <a href="mailto:support@merry360x.com" className="text-primary hover:underline">support@merry360x.com</a> or call <a href="tel:+250796214719" className="text-primary hover:underline">+250 796 214 719</a>.
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
          ) : (
    </>
  );
}
