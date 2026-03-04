import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";
import HostingCTA from "@/components/HostingCTA";
import { PersonalizedRecommendations } from "@/components/PersonalizedRecommendations";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import heroVideo from "@/assets/merry.mp4";
import heroPoster from "@/assets/hero-resort.jpg";

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showHeroVideo, setShowHeroVideo] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHeroVideo(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative min-h-[40vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden"
      >
        {/* Video Background */}
        {showHeroVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroPoster}
            className="absolute inset-0 w-full h-full object-cover z-[1]"
            style={{ objectPosition: "center center" }}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        ) : (
          <img
            src={heroPoster}
            alt="Rwanda scenic hero"
            className="absolute inset-0 w-full h-full object-cover z-[1]"
            loading="eager"
            decoding="async"
          />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 via-foreground/20 to-foreground/50 z-[2]" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-8 italic animate-fade-in">
            {t("index.heroTitle")}
          </h1>

          {/* Search Bar */}
          <HeroSearch />

          {/* Referral CTA */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => navigate('/affiliate-signup')}
              variant="outline"
              size="lg"
              className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white transition-all shadow-lg"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Refer an Operator & Earn 10%
            </Button>
          </div>
        </div>
      </section>

      {/* Personalized Recommendations - Main Content */}
      <section className="container mx-auto px-4 py-16 min-h-[80vh]">
        <PersonalizedRecommendations type="all" limit={8} mode="popular" />
      </section>

      {/* Hosting CTA */}
      <HostingCTA />

      <Footer />
    </div>
  );
};

export default Index;
