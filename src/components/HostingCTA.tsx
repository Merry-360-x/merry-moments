import { Button } from "@/components/ui/button";
import hostingVilla from "@/assets/hosting-villa.jpg";

const HostingCTA = () => {
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
            Try Hosting With Us
          </h2>
          <p className="text-primary-foreground/90 mb-6">
            Earn extra just by renting your property...
          </p>
          <Button variant="hero" size="lg">
            Try Hosting With Us
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HostingCTA;
