import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  User, 
  CreditCard, 
  Home, 
  MapPin, 
  Car, 
  Shield, 
  Phone, 
  Users,
  HelpCircle,
  Mail,
  Clock
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string | string[];
}

interface FAQSection {
  icon: React.ReactNode;
  title: string;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    icon: <User className="w-5 h-5" />,
    title: "Booking & Account Support",
    items: [
      {
        question: "How do I create an account?",
        answer: "Click Sign Up on Merry360x.com and register using your email address or other mail account login. Ensure your details are accurate for smooth bookings and communication."
      },
      {
        question: "Do I need an account to make a booking?",
        answer: "Yes. An account is required to manage bookings, receive confirmations, and access customer support."
      },
      {
        question: "How do I make a booking?",
        answer: [
          "1. Search for accommodations, tours, or transport.",
          "2. Select your preferred option.",
          "3. Review details and pricing.",
          "4. Complete payment through the platform.",
          "5. Receive instant booking confirmation by email."
        ]
      },
      {
        question: "Can I modify or cancel a booking?",
        answer: "Yes, depending on the service provider's cancellation policy. Visit My Bookings or check the confirmation email for modification and cancellation options."
      }
    ]
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: "Payments & Pricing",
    items: [
      {
        question: "What payment methods are accepted?",
        answer: "Merry360x accepts approved digital and local payment methods displayed at checkout. Available options may vary by service and location."
      },
      {
        question: "Are prices final?",
        answer: "Prices shown include listed fees and taxes unless stated otherwise. Additional charges requested outside the platform should be reported."
      },
      {
        question: "Is my payment secure?",
        answer: "Yes. All payments are processed through secure, encrypted payment systems."
      }
    ]
  },
  {
    icon: <Home className="w-5 h-5" />,
    title: "Accommodation Support",
    items: [
      {
        question: "What if the accommodation does not match the listing?",
        answer: "Report the issue immediately through your account or contact Merry360x support. Provide photos and details for faster assistance."
      },
      {
        question: "Can I contact the host before booking?",
        answer: "No, you can only contact the host after booking. The host contact details will be made known to you."
      },
      {
        question: "What time is check-in and check-out?",
        answer: "Check-in and check-out times are specified in each listing. Always confirm with the host before arrival."
      }
    ]
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Tours & Activities Support",
    items: [
      {
        question: "Are tours guided?",
        answer: "Tour details specify whether a guide is included. Always review the itinerary before booking."
      },
      {
        question: "What should I bring for a tour?",
        answer: "This depends on the activity. Recommendations are listed in the tour description."
      },
      {
        question: "Can tours be canceled due to weather or safety issues?",
        answer: "Yes. In such cases, the operator may reschedule or issue a refund according to their policy."
      }
    ]
  },
  {
    icon: <Car className="w-5 h-5" />,
    title: "Transport Support",
    items: [
      {
        question: "How do airport transfers work?",
        answer: "After booking, you'll receive driver details, vehicle information, and pickup instructions."
      },
      {
        question: "What if my driver is late or unavailable?",
        answer: "Contact the driver first, then notify Merry360x support if the issue persists."
      },
      {
        question: "Are vehicles insured and licensed?",
        answer: "Service providers are required to comply with local transport regulations."
      }
    ]
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Safety & Trust",
    items: [
      {
        question: "How does Merry360x verify service providers?",
        answer: "We conduct basic verification checks and monitor reviews, but users should always review listings carefully."
      },
      {
        question: "How do I report unsafe behavior or fraud?",
        answer: "Use the Report option on the platform or contact support immediately."
      }
    ]
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "For Service Providers",
    items: [
      {
        question: "How do I list my service on Merry360x?",
        answer: "Visit the Become a Host page and submit your details for review."
      },
      {
        question: "Who do I contact for partnership support?",
        answer: "Email support@merry360x.com"
      }
    ]
  }
];

export default function HelpCenter() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Help Center</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions and useful resources to help you book accommodations, tours, and transport services with ease.
            </p>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-6">
            {faqSections.map((section, sectionIndex) => (
              <Card key={sectionIndex} className="overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="text-primary">{section.icon}</div>
                    <h2 className="font-semibold text-lg">{section.title}</h2>
                  </div>
                </div>
                <Accordion type="single" collapsible className="px-2">
                  {section.items.map((item, itemIndex) => (
                    <AccordionItem key={itemIndex} value={`${sectionIndex}-${itemIndex}`} className="border-b last:border-0">
                      <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                        <span className="text-sm font-medium">{item.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {Array.isArray(item.answer) ? (
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {item.answer.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">{item.answer}</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            ))}
          </div>

          {/* Contact Section */}
          <Card className="mt-8 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-primary">
                <Phone className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-lg">Contact & Support</h2>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Email Support</p>
                  <a 
                    href="mailto:support@merry360x.com" 
                    className="text-sm text-primary hover:underline"
                  >
                    support@merry360x.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Response Time</p>
                  <p className="text-sm text-muted-foreground">Within 0-24 business hours</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-muted/30">
              <p className="font-medium text-sm mb-2">When contacting support, please include:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Booking ID</li>
                <li>• Service type (Accommodation, Tour, Transport)</li>
                <li>• Description of the issue</li>
                <li>• Supporting photos or documents (if applicable)</li>
              </ul>
            </div>
          </Card>

          {/* Updates Notice */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            This Help Center is regularly updated to improve clarity, safety, and user experience.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
