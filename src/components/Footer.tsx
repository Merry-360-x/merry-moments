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
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const RedditIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z" />
  </svg>
);

const QuoraIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M7.3799.9483A11.9628 11.9628 0 0 1 21.248 19.5397l2.4096 2.4225c.7322.7362.21 1.9905-.8272 1.9905l-10.7105.01a12.52 12.52 0 0 1-.304 0h-.02A11.9628 11.9628 0 0 1 7.3818.9503Zm7.3217 4.428a7.1717 7.1717 0 1 0-5.4873 13.2512 7.1717 7.1717 0 0 0 5.4883-13.2511Z" />
  </svg>
);

const PinterestIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
  </svg>
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
            <Link to="/eula" className="hover:text-primary transition-colors">
              EULA
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

