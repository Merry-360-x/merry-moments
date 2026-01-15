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
    <section className="container mx-auto px-4 lg:px-8 py-16">
      <div className="grid gap-5 md:grid-cols-3">
        {/* Accommodations */}
        <div
          className="relative rounded-2xl overflow-hidden bg-cover bg-center min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${hostingVilla})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-7">
            <h3 className="text-2xl font-bold text-primary-foreground">{t("nav.accommodations")}</h3>
            <p className="text-primary-foreground/90 mt-2 mb-5 max-w-[34ch]">
              Browse hotels, villas, apartments, and guesthouses.
            </p>
            <Button variant="hero" onClick={() => navigate("/accommodations")}>
              View accommodations
            </Button>
          </div>
        </div>

        {/* Tours */}
        <div
          className="relative rounded-2xl overflow-hidden bg-cover bg-center min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${toursBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-7">
            <h3 className="text-2xl font-bold text-primary-foreground">{t("nav.tours")}</h3>
            <p className="text-primary-foreground/90 mt-2 mb-5 max-w-[34ch]">
              Discover experiences and day trips curated by local hosts.
            </p>
            <Button variant="hero" onClick={() => navigate("/tours")}>
              View tours
            </Button>
          </div>
        </div>

        {/* Transport */}
        <div
          className="relative rounded-2xl overflow-hidden bg-cover bg-center min-h-[220px] flex items-center"
          style={{ backgroundImage: `url(${transportBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20" />
          <div className="relative z-10 p-7">
            <h3 className="text-2xl font-bold text-primary-foreground">{t("nav.transport")}</h3>
            <p className="text-primary-foreground/90 mt-2 mb-5 max-w-[34ch]">
              Find rides, transfers, and vehicles for rent.
            </p>
            <Button variant="hero" onClick={() => navigate("/transport")}>
              View transport
            </Button>
          </div>
        </div>
      </div>

      {/* Host onboarding steps (real flow) */}
      <div className="mt-10 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">Become a host in 3 steps</h3>
            <p className="text-muted-foreground mt-2 max-w-[64ch]">
              Apply, add your property, and verify your identity. Your listing stays private until our team approves it.
            </p>
            <div className="mt-5 grid gap-2">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  1
                </span>
                <div>
                  <div className="font-medium text-foreground">Create your host application</div>
                  <div className="text-sm text-muted-foreground">Choose Individual or Business.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  2
                </span>
                <div>
                  <div className="font-medium text-foreground">Add your property</div>
                  <div className="text-sm text-muted-foreground">Use the same “Add property” wizard hosts use.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  3
                </span>
                <div>
                  <div className="font-medium text-foreground">Verify identity</div>
                  <div className="text-sm text-muted-foreground">Upload ID (and business info if needed).</div>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              size="lg"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
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
