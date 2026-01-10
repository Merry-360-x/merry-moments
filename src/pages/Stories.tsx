import { Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Stories = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-primary py-12 px-4 lg:px-8">
        <div className="container mx-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-primary-foreground mb-6">Travel Stories</h1>

          {/* Add Story Button */}
          <div className="flex items-center gap-4">
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-16 h-16 rounded-full bg-primary-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm text-primary-foreground">Your Story</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stories Content */}
      <section className="container mx-auto px-4 lg:px-8 py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading stories...</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Stories;
