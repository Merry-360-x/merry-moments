import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PersonalizedRecommendations } from "@/components/PersonalizedRecommendations";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Personalized Recommendations - Main Content */}
      <section className="container mx-auto px-4 py-16 min-h-[80vh]">
        <PersonalizedRecommendations type="all" limit={8} />
      </section>

      <Footer />
    </div>
  );
};

export default Index;
