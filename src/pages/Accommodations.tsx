import { Search, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import PropertyCard from "@/components/PropertyCard";
import { useState } from "react";

import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import property4 from "@/assets/property-4.jpg";

const properties = [
  { id: 1, image: property1, title: "Lakeside Luxury Suite", location: "Kigali, Rwanda", rating: 4.9, reviews: 128, price: 150000, type: "Hotel" },
  { id: 2, image: property2, title: "Forest Retreat Lodge", location: "Nyungwe, Rwanda", rating: 4.8, reviews: 94, price: 120000, type: "Lodge" },
  { id: 3, image: property3, title: "Modern Pool Villa", location: "Rubavu, Rwanda", rating: 4.7, reviews: 156, price: 200000, type: "Villa" },
  { id: 4, image: property4, title: "Traditional Guesthouse", location: "Musanze, Rwanda", rating: 4.9, reviews: 72, price: 85000, type: "Guesthouse" },
];

const propertyTypes = ["Hotel", "Motel", "Resort", "Lodge", "Apartment", "Villa", "Guesthouse"];
const amenities = ["WiFi", "Pool", "Parking", "Restaurant", "Gym", "Spa"];

const Accommodations = () => {
  const [priceRange, setPriceRange] = useState([0, 500000]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search Bar */}
      <div className="bg-background py-8 border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="bg-card rounded-xl shadow-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Accommodations</label>
              <input
                type="text"
                placeholder="Search"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
              />
            </div>
            <Button variant="search" size="icon-lg">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Find Your Perfect Stay</h1>
          <p className="text-muted-foreground">Browse handpicked properties across Rwanda</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-semibold text-foreground mb-4">Filters</h3>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">Price range (per night)</label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={500000}
                  step={10000}
                  className="mb-2"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">0 RWF</span>
                  <span className="text-primary font-medium">{priceRange[1].toLocaleString()} RWF</span>
                </div>
              </div>

              {/* Property Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">Property type</label>
                <div className="space-y-2">
                  {propertyTypes.map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox id={type} />
                      <label htmlFor={type} className="text-sm text-muted-foreground cursor-pointer">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Minimum Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">Minimum rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} className="p-1">
                      <Star className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Amenities</label>
                <div className="space-y-2">
                  {amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2">
                      <Checkbox id={amenity} />
                      <label htmlFor={amenity} className="text-sm text-muted-foreground cursor-pointer">
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Properties Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} {...property} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Accommodations;
