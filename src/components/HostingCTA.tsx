import { Button } from "@/components/ui/button";
import hostingVilla from "@/assets/hosting-villa.jpg";
import toursBackground from "@/assets/hero-resort.jpg";
import transportBackground from "@/assets/property-1.jpg";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2 } from "lucide-react";

const HostingCTA = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isHost } = useAuth();
  return (
    <section className="container mx-auto px-4 lg:px-8 py-8 md:py-16">
      <div className="grid gap-3 md:gap-5 md:grid-cols-3">
        {/* Accommodations */}
        <div
          className="relative rounded-xl md:rounded-2xl overflow-hidden bg-cover bg-center min-h-[140px] md:min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${hostingVilla})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-4 md:p-7">
            <h3 className="text-lg md:text-2xl font-bold text-primary-foreground">{t("nav.accommodations")}</h3>
            <p className="text-primary-foreground/90 mt-1 md:mt-2 mb-3 md:mb-5 max-w-[34ch] text-xs md:text-base">
              Browse hotels, villas, apartments, and guesthouses.
            </p>
            <Button variant="hero" size="sm" className="text-xs md:text-sm h-8 md:h-10 px-3 md:px-4" onClick={() => navigate("/accommodations")}>
              View accommodations
            </Button>
          </div>
        </div>

        {/* Tours */}
        <div
          className="relative rounded-xl md:rounded-2xl overflow-hidden bg-cover bg-center min-h-[140px] md:min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${toursBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-4 md:p-7">
            <h3 className="text-lg md:text-2xl font-bold text-primary-foreground">{t("nav.tours")}</h3>
            <p className="text-primary-foreground/90 mt-1 md:mt-2 mb-3 md:mb-5 max-w-[34ch] text-xs md:text-base">
              Discover experiences and day trips curated by local hosts.
            </p>
            <Button variant="hero" size="sm" className="text-xs md:text-sm h-8 md:h-10 px-3 md:px-4" onClick={() => navigate("/tours")}>
              View tours
            </Button>
          </div>
        </div>

        {/* Transport */}
        <div
          className="relative rounded-xl md:rounded-2xl overflow-hidden bg-cover bg-center min-h-[140px] md:min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${transportBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-4 md:p-7">
            <h3 className="text-lg md:text-2xl font-bold text-primary-foreground">{t("nav.transport")}</h3>
            <p className="text-primary-foreground/90 mt-1 md:mt-2 mb-3 md:mb-5 max-w-[34ch] text-xs md:text-base">
              Find rides, transfers, and vehicles for rent.
            </p>
            <Button variant="hero" size="sm" className="text-xs md:text-sm h-8 md:h-10 px-3 md:px-4" onClick={() => navigate("/transport")}>
              View transport
            </Button>
          </div>
        </div>
      </div>

      {/* Host onboarding steps (real flow) */}
      <div className="mt-6 md:mt-10 rounded-xl md:rounded-2xl border border-border bg-card p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div>
            <h3 className="text-base md:text-xl font-bold text-foreground">Become a host in 3 steps</h3>
            <p className="text-muted-foreground mt-1 md:mt-2 max-w-[64ch] text-xs md:text-base">
              Apply, add your property, and verify your identity. Your listing stays private until our team approves it.
            </p>
            <div className="mt-3 md:mt-5 grid gap-1.5 md:gap-2">
              <div className="flex items-start gap-2 md:gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs md:text-sm font-semibold">
                  1
                </span>
                <div>
                  <div className="font-medium text-foreground text-sm md:text-base">Create your host application</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Choose Individual or Business.</div>
                </div>
              </div>
              <div className="flex items-start gap-2 md:gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs md:text-sm font-semibold">
                  2
                </span>
                <div>
                  <div className="font-medium text-foreground text-sm md:text-base">Add your property</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Use the same "Add property" wizard hosts use.</div>
                </div>
              </div>
              <div className="flex items-start gap-2 md:gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs md:text-sm font-semibold">
                  3
                </span>
                <div>
                  <div className="font-medium text-foreground text-sm md:text-base">Verify identity</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Upload ID (and business info if needed).</div>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              size="default"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto text-sm md:text-base"
              onClick={() => navigate(isHost ? "/host-dashboard" : "/become-host")}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isHost ? "Go to Host Dashboard" : "Become a Host"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HostingCTA;
