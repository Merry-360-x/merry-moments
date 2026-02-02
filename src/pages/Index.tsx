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

// Cloudinary optimized video URLs - different sizes for mobile vs desktop
const HERO_VIDEO_MOBILE = "https://res.cloudinary.com/dxdblhmbm/video/upload/q_auto,f_auto,w_720,c_fill,ar_9:16,g_center/merry360x/merry-hero-banner.mp4";
const HERO_VIDEO_DESKTOP = "https://res.cloudinary.com/dxdblhmbm/video/upload/q_auto,f_auto,w_1920/merry360x/merry-hero-banner.mp4";

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden"
      >
        {/* Video Background - Mobile optimized (9:16 aspect ratio) */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-[1] md:hidden"
        >
          <source src={HERO_VIDEO_MOBILE} type="video/mp4" />
        </video>
        
        {/* Video Background - Desktop optimized */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-[1] hidden md:block"
        >
          <source src={HERO_VIDEO_DESKTOP} type="video/mp4" />
        </video>

        {/* Overlay - enhanced gradient for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60 z-[2]" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 text-center flex flex-col items-center justify-center">
          {/* Badge */}
          <div className="mb-4 md:mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs md:text-sm font-medium text-white/90">Book local. Travel better.</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight animate-fade-in drop-shadow-lg">
            {t("index.heroTitle")}
          </h1>
          
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto mb-6 md:mb-8 px-2">
            Discover unique stays, authentic experiences & seamless transport across Rwanda
          </p>

          {/* Search Bar */}
          <HeroSearch />

          {/* Referral CTA */}
          <div className="mt-6 md:mt-8 flex justify-center">
            <Button
              onClick={() => navigate('/affiliate-signup')}
              variant="outline"
              size="default"
              className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:text-white transition-all shadow-lg text-sm md:text-base px-4 md:px-6"
            >
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="hidden sm:inline">Refer an Operator & Earn 10%</span>
              <span className="sm:hidden">Earn 10% Referral</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Personalized Recommendations - Main Content */}
      <section className="container mx-auto px-4 py-16 min-h-[80vh]">
        <PersonalizedRecommendations type="all" limit={8} />
      </section>

      {/* Hosting CTA */}
      <HostingCTA />

      <Footer />
    </div>
  );
};

export default Index;
