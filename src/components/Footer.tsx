import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useTranslation } from "react-i18next";

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
            <Link to="/help" className="hover:text-primary transition-colors">
              {t("footer.help")}
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
                <Link to="/help" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("footer.help")}
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
