import { Button } from "@/components/ui/button";
import hostingVilla from "@/assets/hosting-villa.jpg";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const HostingCTA = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className="container mx-auto px-4 lg:px-8 py-16">
      <div
        className="relative rounded-2xl overflow-hidden bg-cover bg-center min-h-[320px] flex items-center"
        style={{ backgroundImage: `url(${hostingVilla})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/60 to-foreground/30" />

        {/* Content */}
        <div className="relative z-10 p-8 lg:p-12 max-w-lg">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-3 italic">
            {t("hostingCta.title")}
          </h2>
          <p className="text-primary-foreground/90 mb-6">
            {t("hostingCta.subtitle")}
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate("/become-host")}>
            {t("hostingCta.button")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HostingCTA;
