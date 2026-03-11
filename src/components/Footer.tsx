import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useTranslation } from "react-i18next";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

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
    <path d="M14.2 3v9.1a4.8 4.8 0 1 1-3.4-4.6v2.6a2.3 2.3 0 1 0 1 2V3h2.4c.4 1.8 1.7 3.2 3.5 3.7V9a6.8 6.8 0 0 1-3.5-1z" />
  </svg>
);

const socialLinks = [
  { label: "X", href: "https://x.com/merry360x", Icon: XIcon, colorClass: "text-black dark:text-white" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/merry360x", Icon: Linkedin, colorClass: "text-[#0A66C2]" },
  { label: "TripAdvisor", href: "https://www.tripadvisor.com", Icon: TripAdvisorIcon, colorClass: "text-[#00AA6C]" },
  { label: "Facebook", href: "https://www.facebook.com/merry360x", Icon: Facebook, colorClass: "text-[#1877F2]" },
  { label: "Instagram", href: "https://www.instagram.com/merry360x", Icon: Instagram, colorClass: "text-[#E1306C]" },
  { label: "YouTube", href: "https://www.youtube.com/@merry360x", Icon: Youtube, colorClass: "text-[#FF0000]" },
  { label: "TikTok", href: "https://www.tiktok.com/@merry360x", Icon: TikTokIcon, colorClass: "text-[#111111] dark:text-white" },
];

const Footer = () => {
  const { t } = useTranslation();
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
