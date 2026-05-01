import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useTranslation } from "react-i18next";
import { ArrowRight, Bell, CheckCircle2, Facebook, Instagram, Linkedin, Mail, Sparkles, Youtube } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { FormEvent, useState } from "react";

type IconProps = { className?: string };

const XIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2H21l-6.56 7.497L22 22h-5.828l-4.565-5.964L6.39 22H3.633l7.017-8.017L2 2h5.976l4.127 5.431L18.244 2zm-1.022 18h1.532L7.143 3.895H5.5L17.222 20z" />
  </svg>
);

const TripAdvisorIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="12" r="3.5" />
    <circle cx="16.5" cy="12" r="3.5" />
    <circle cx="7.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
    <path d="M3.5 8.8c1.4-.6 2.6-.9 4-.9h9c1.4 0 2.6.3 4 .9" />
    <path d="M10.8 12h2.4" />
    <path d="M12 8.6v-2" />
  </svg>
);

const TikTokIcon = ({ className }: IconProps) => (
);

const RedditIcon = ({ className }: IconProps) => (
);

const QuoraIcon = ({ className }: IconProps) => (
);

const PinterestIcon = ({ className }: IconProps) => (

);

const socialLinks = [
  { label: "X", href: "https://x.com/merry360x", Icon: XIcon, colorClass: "text-black dark:text-white" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/merry360x", Icon: Linkedin, colorClass: "text-[#0A66C2]" },
  { label: "TripAdvisor", href: "https://www.tripadvisor.com/profile/merry360x", Icon: TripAdvisorIcon, colorClass: "text-[#00AA6C]" },
  { label: "Facebook", href: "https://www.facebook.com/share/1QcRpgL6b8/?mibextid=wwXIfr", Icon: Facebook, colorClass: "text-[#1877F2]" },
  { label: "Instagram", href: "https://www.instagram.com/merry360.x?igsh=MXc5M3NwanltNjRheQ==", Icon: Instagram, colorClass: "text-[#E1306C]" },
  { label: "YouTube", href: "https://youtube.com/@merry360x?si=C9uORgD72wL1N59V", Icon: Youtube, colorClass: "text-[#FF0000]" },
  { label: "TikTok", href: "https://www.tiktok.com/@merry360x", Icon: TikTokIcon, colorClass: "text-[#111111] dark:text-white" },
  { label: "Reddit", href: "https://www.reddit.com/user/merry360x/", Icon: RedditIcon, colorClass: "text-[#FF4500]" },
  { label: "Quora", href: "https://www.quora.com/profile/Merry360X", Icon: QuoraIcon, colorClass: "text-[#B92B27]" },
  { label: "Pinterest", href: "https://www.pinterest.com/merry360x/", Icon: PinterestIcon, colorClass: "text-[#BD081C]" },
];

const updatesLinks = [
  {
    label: "Announcements",
    description: "See product updates and new launches.",
    to: "/announcements",
    Icon: Bell,
  },
];

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const Footer = () => {
  const { t } = useTranslation();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidEmail(newsletterEmail)) {
      setNewsletterError("Enter a valid email address.");
      return;
    }

    setNewsletterError(null);
    setIsSubscribed(true);
    setNewsletterEmail("");
  };

  const renderUpdatesContent = (compact = false) => (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/70 bg-gradient-to-br from-primary/10 via-background to-background p-3">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          Newsletter
        </div>
        <div className="mb-2 flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Newsletter</p>
            <p className="text-xs text-muted-foreground">Get travel drops, launch updates, and limited offers.</p>
          </div>
        </div>
        {isSubscribed ? (
          <p className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Thanks for subscribing.
          </p>
        ) : (
          <form onSubmit={handleNewsletterSubmit} className="space-y-1.5">
            <label htmlFor="footer-newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-newsletter-email"
              type="email"
              value={newsletterEmail}
              onChange={(event) => {
                setNewsletterEmail(event.target.value);
                if (newsletterError) setNewsletterError(null);
              }}
              placeholder="you@example.com"
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              autoComplete="email"
              required
            />
            {newsletterError && <p className="text-[11px] text-destructive">{newsletterError}</p>}
            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Subscribe
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>

      {updatesLinks.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className={`flex items-start ${compact ? "gap-2" : "gap-3"} rounded-md p-2 transition-colors hover:bg-muted`}
        >
          <item.Icon className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 lg:px-8 py-6 md:py-12">
        {/* Mobile: Horizontal compact layout */}
        <div className="md:hidden">
          {/* Quick links row */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-4">
            <Link to="/accommodations" className="hover:text-primary transition-colors">
              {t("nav.accommodations")}
            </Link>
            <Link to="/tours" className="hover:text-primary transition-colors">
              {t("nav.tours")}
            </Link>
            <Link to="/transport" className="hover:text-primary transition-colors">
              {t("nav.transport")}
            </Link>
            <Link to="/become-host" className="hover:text-primary transition-colors">
              {t("actions.becomeHost")}
            </Link>
          </div>
          {/* Support links row */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-4">
            <Link to="/help-center" className="hover:text-primary transition-colors">
              Help Center
            </Link>
            <Link to="/safety-guidelines" className="hover:text-primary transition-colors">
              Safety
            </Link>
            <Link to="/refund-policy" className="hover:text-primary transition-colors">
              Refunds
            </Link>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-primary transition-colors">
              Terms
            </Link>
          </div>
          {/* Social links row */}
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground mb-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 transition-colors ${social.colorClass}`}
                aria-label={social.label}
                title={social.label}
              >
                <social.Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="mb-4 flex justify-center">
            <Link
              to="/announcements"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-primary/50"
            >
              <Bell className="h-3.5 w-3.5" />
              Updates
            </Link>
          </div>
          {/* Copyright */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
            <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          </div>
        </div>

        {/* Desktop: Full grid layout */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 transition-colors ${social.colorClass}`}
                  aria-label={social.label}
                  title={social.label}
                >
                  <social.Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.explore")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/accommodations" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.accommodations")}
                </Link>
              </li>
              <li>
                <Link to="/tours" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.tours")}
                </Link>
              </li>
              <li>
                <Link to="/transport" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.transport")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.company")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.contact")}
                </Link>
              </li>
              <li>
                <Link to="/become-host" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("actions.becomeHost")}
                </Link>
              </li>
              <li>
                <Link to="/affiliate-signup" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Affiliate Program
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.support")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/help-center" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/safety-guidelines" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Safety Guidelines
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom - Desktop only */}
        <div className="hidden md:flex mt-12 pt-8 border-t border-border flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-6">
            <HoverCard openDelay={120} closeDelay={120}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <Bell className="h-4 w-4" />
                  Updates
                </button>
              </HoverCardTrigger>
              <HoverCardContent align="end" side="top" className="w-80 border-primary/20 bg-background/85 backdrop-blur-xl p-3 shadow-xl">
                {renderUpdatesContent(false)}
              </HoverCardContent>
            </HoverCard>
            <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {t("footer.cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

