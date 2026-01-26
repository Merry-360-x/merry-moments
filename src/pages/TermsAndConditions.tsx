import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";

export default function TermsAndConditions() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 26, 2026</p>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Merry360X ("the Platform"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">2. Services</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>Merry360X provides a platform for:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Booking accommodations in Rwanda</li>
                  <li>Booking tour packages and experiences</li>
                  <li>Arranging transportation services</li>
                  <li>Connecting travelers with service providers</li>
                </ul>
                <p className="mt-3">We act as an intermediary between users and service providers.</p>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>When creating an account, you agree to:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Be responsible for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">4. Bookings and Payments</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Booking Process</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>All bookings are subject to availability</li>
                    <li>Prices are displayed in Rwandan Francs (RWF) unless otherwise stated</li>
                    <li>Bookings require confirmation before they are finalized</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Payment Terms</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Payment methods include MTN MoMo and other approved methods</li>
                    <li>Full payment is required at the time of booking unless otherwise specified</li>
                    <li>All prices are inclusive of applicable taxes</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">5. Cancellations and Refunds</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>Cancellation policies vary by service provider:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Accommodations:</strong> Cancellation policies are set by individual properties</li>
                  <li><strong>Tours:</strong> Tour operators set their own cancellation terms</li>
                  <li><strong>Transport:</strong> Cancellation fees may apply depending on timing</li>
                </ul>
                <p className="mt-3">Refunds, if applicable, will be processed according to the specific service provider's policy.</p>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">6. Host Responsibilities</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>Service providers (hosts) agree to:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Provide accurate descriptions of their services</li>
                  <li>Honor confirmed bookings</li>
                  <li>Maintain service quality and safety standards</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Handle guest information responsibly</li>
                </ul>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">7. User Conduct</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>Users must not:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Provide false or misleading information</li>
                  <li>Use the platform for illegal purposes</li>
                  <li>Harass or harm other users or service providers</li>
                  <li>Violate intellectual property rights</li>
                  <li>Attempt to gain unauthorized access to the platform</li>
                </ul>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">8. Liability and Disclaimers</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>Important limitations:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>We are not responsible for the quality of services provided by third-party providers</li>
                  <li>We do not guarantee the accuracy of all information on the platform</li>
                  <li>The platform is provided "as is" without warranties</li>
                  <li>We are not liable for indirect or consequential damages</li>
                  <li>Users book services at their own risk</li>
                </ul>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">9. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content on the Merry360X platform, including text, graphics, logos, and software, is the property of Merry360X or its licensors and is protected by intellectual property laws.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">10. Privacy</h2>
              <p className="text-muted-foreground">
                Your use of the platform is also governed by our Privacy Policy. Please review it to understand how we collect and use your information.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">11. Dispute Resolution</h2>
              <p className="text-muted-foreground">
                Any disputes arising from these terms will be resolved through good faith negotiations. If unresolved, disputes will be subject to the laws of Rwanda and the jurisdiction of Rwandan courts.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">12. Modifications</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting. Continued use of the platform constitutes acceptance of modified terms.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">13. Termination</h2>
              <p className="text-muted-foreground">
                We may suspend or terminate your account for violations of these terms or for any other reason at our discretion, with or without notice.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
              <p className="text-muted-foreground mb-3">
                For questions about these Terms and Conditions, contact us at:
              </p>
              <div className="text-muted-foreground">
                <p>Email: support@merry360x.com</p>
                <p>Phone: +250 792 527 083</p>
                <p>Address: Kigali, Rwanda</p>
              </div>
            </Card>

            <Card className="p-6 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                By using Merry360X, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
              </p>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
