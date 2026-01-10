import { ArrowLeftRight, Users, Car, Search, MapPin, Frown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Transport = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [vehicle, setVehicle] = useState("All Vehicles");

  const runSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (vehicle && vehicle !== "All Vehicles") params.set("vehicle", vehicle);
    const qs = params.toString();
    navigate(qs ? `/transport?${qs}` : "/transport");
  };

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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              className="bg-transparent text-sm text-muted-foreground focus:outline-none"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            >
              <option>All Vehicles</option>
              <option>Sedan</option>
              <option>SUV</option>
              <option>Van</option>
            </select>
            <Button variant="search" className="gap-2" type="button" onClick={runSearch}>
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className="container mx-auto px-4 lg:px-8 mb-16">
        <div className="bg-card rounded-xl p-10 shadow-card text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
            <Car className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Transportation is coming soon</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Transportation options will appear here once your live database and routes are connected.
          </p>
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
