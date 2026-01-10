import { ArrowLeftRight, Users, Car, Search, MapPin, Frown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: ArrowLeftRight,
    title: "Taxi Service",
    description: "Quick rides around the city",
    action: "Add to Trip Cart",
    variant: "primary" as const,
  },
  {
    icon: Users,
    title: "Shuttle Service",
    description: "Shared rides to popular destinations",
    action: "Add to Trip Cart",
    variant: "primary" as const,
  },
  {
    icon: Car,
    title: "Car Rental",
    description: "Rent a vehicle for your journey",
    action: "Browse Cars",
    variant: "outline" as const,
  },
];

const Transport = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="py-16 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Transportation Services</h1>
        <p className="text-muted-foreground">Get around Rwanda with ease</p>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 lg:px-8 mb-16">
        <div className="bg-card rounded-xl shadow-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
          <div className="flex-1 flex items-center gap-2 px-4">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search routes or destinations..."
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <select className="bg-transparent text-sm text-muted-foreground focus:outline-none">
              <option>All Vehicles</option>
              <option>Sedan</option>
              <option>SUV</option>
              <option>Van</option>
            </select>
            <Button variant="search" className="gap-2">
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className="container mx-auto px-4 lg:px-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-card rounded-xl p-8 shadow-card text-center hover:shadow-lg transition-shadow"
            >
              <div
                className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
                  service.variant === "primary" ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <service.icon
                  className={`w-7 h-7 ${
                    service.variant === "primary" ? "text-primary" : "text-foreground"
                  }`}
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground mb-6">{service.description}</p>
              <Button variant={service.variant} className="w-full">
                {service.action}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Routes */}
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-12">Popular Routes</h2>
        <div className="text-center py-12">
          <Frown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No routes found matching your search</p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Transport;
