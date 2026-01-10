import { Home, Compass, Car } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";

const services = [
  {
    icon: Home,
    title: "Accommodation Booking",
    description: "From luxury hotels to cozy guesthouses, find your perfect stay across Rwanda.",
    image: property1,
  },
  {
    icon: Compass,
    title: "Tours & Experiences",
    description: "Discover Rwanda's natural wonders and rich cultural heritage with expert guides.",
    image: property2,
  },
  {
    icon: Car,
    title: "Transportation Services",
    description: "Safe and comfortable travel across Rwanda with our trusted transport partners.",
    image: property3,
  },
];

const Services = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative py-24 bg-gradient-primary">
        <div className="absolute inset-0 bg-foreground/40" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-3xl lg:text-5xl font-bold text-primary-foreground mb-4">
            Our Comprehensive Services
          </h1>
          <p className="text-lg text-primary-foreground/90">
            Everything you need for an unforgettable journey in Rwanda
          </p>
        </div>
      </section>

      {/* What We Offer */}
      <section className="container mx-auto px-4 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">What We Offer</h2>
          <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service) => (
            <div key={service.title} className="group">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-4 left-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <service.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;
