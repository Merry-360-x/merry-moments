import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 26, 2026</p>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to Merry360X ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Personal Information</h3>
                  <p>We collect personal information that you provide to us, including:</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Name, email address, and phone number</li>
                    <li>Payment information (processed securely through third-party payment processors)</li>
                    <li>Booking details and preferences</li>
                    <li>Profile information (for registered users)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Automatically Collected Information</h3>
                  <p>When you use our services, we may automatically collect:</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Device information and IP address</li>
                    <li>Browser type and version</li>
                    <li>Usage data and browsing patterns</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-3">We use your information to:</p>
              <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
                <li>Process and manage your bookings</li>
                <li>Communicate with you about your reservations and our services</li>
                <li>Improve our website and services</li>
                <li>Send promotional materials (with your consent)</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and enhance security</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>We may share your information with:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Service Providers:</strong> Hotels, tour operators, and transport providers to fulfill your bookings</li>
                  <li><strong>Payment Processors:</strong> To process transactions securely</li>
                  <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Partners:</strong> With your consent for marketing purposes</li>
                </ul>
                <p className="mt-3">We do not sell your personal information to third parties.</p>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground mb-3">You have the right to:</p>
              <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Object to processing of your data</li>
                <li>Data portability</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience, analyze usage, and deliver personalized content. You can manage cookie preferences through your browser settings.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
              <p className="text-muted-foreground mb-3">
                If you have questions or concerns about this Privacy Policy, please contact us at:
              </p>
              <div className="text-muted-foreground">
                <p>Email: privacy@merry360x.com</p>
                <p>Phone: +250 792 527 083</p>
                <p>Address: Kigali, Rwanda</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
