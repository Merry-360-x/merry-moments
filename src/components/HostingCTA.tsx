import { Button } from "@/components/ui/button";
import hostingVilla from "@/assets/hosting-villa.jpg";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const HostingCTA = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className="container mx-auto px-4 lg:px-8 py-16">
      <div className="grid gap-5 md:grid-cols-3">
        {/* Accommodations */}
        <div
          className="relative rounded-2xl overflow-hidden bg-cover bg-center min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${hostingVilla})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-7">
            <h3 className="text-2xl font-bold text-primary-foreground italic">
              {t("nav.accommodations")}
            </h3>
            <p className="text-primary-foreground/90 mt-2 mb-5 max-w-[28ch]">
              Find stays that feel like home — hotels, villas, guesthouses, and more.
            </p>
            <Button variant="hero" onClick={() => navigate("/accommodations")}>
              Browse stays
            </Button>
          </div>
        </div>

        {/* Tours */}
        <div
          className="relative rounded-2xl overflow-hidden bg-cover bg-center min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${hostingVilla})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-7">
            <h3 className="text-2xl font-bold text-primary-foreground italic">
              {t("nav.tours")}
            </h3>
            <p className="text-primary-foreground/90 mt-2 mb-5 max-w-[28ch]">
              Book unforgettable experiences — culture, adventure, wildlife, and more.
            </p>
            <Button variant="hero" onClick={() => navigate("/tours")}>
              Explore tours
            </Button>
          </div>
        </div>

        {/* Transport */}
        <div
          className="relative rounded-2xl overflow-hidden bg-cover bg-center min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${hostingVilla})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-7">
            <h3 className="text-2xl font-bold text-primary-foreground italic">
              {t("nav.transport")}
            </h3>
            <p className="text-primary-foreground/90 mt-2 mb-5 max-w-[28ch]">
              Get around easily — vehicles, transfers, and local transport options.
            </p>
            <Button variant="hero" onClick={() => navigate("/transport")}>
              Find transport
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HostingCTA;
