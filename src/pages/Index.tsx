import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSearch from "@/components/HeroSearch";
import PropertyCard from "@/components/PropertyCard";
import HostingCTA from "@/components/HostingCTA";
import Footer from "@/components/Footer";

import heroImage from "@/assets/hero-resort.jpg";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import property4 from "@/assets/property-4.jpg";

const properties = [
  {
    id: 1,
    image: property1,
    title: "Lakeside Luxury Suite",
    location: "Kigali, Rwanda",
    rating: 4.9,
    reviews: 128,
    price: 150000,
    type: "Hotel",
  },
  {
    id: 2,
    image: property2,
    title: "Forest Retreat Lodge",
    location: "Nyungwe, Rwanda",
    rating: 4.8,
    reviews: 94,
    price: 120000,
    type: "Lodge",
  },
  {
    id: 3,
    image: property3,
    title: "Modern Pool Villa",
    location: "Rubavu, Rwanda",
    rating: 4.7,
    reviews: 156,
    price: 200000,
    type: "Villa",
  },
  {
    id: 4,
    image: property4,
    title: "Traditional Guesthouse",
    location: "Musanze, Rwanda",
    rating: 4.9,
    reviews: 72,
    price: 85000,
    type: "Guesthouse",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative min-h-[70vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 via-foreground/20 to-foreground/50" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-8 italic animate-fade-in">
            Find A Property
          </h1>

          {/* Search Bar */}
          <HeroSearch />
        </div>
      </section>

      {/* Latest Properties */}
      <section className="container mx-auto px-4 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Latest on the Property Listing
            </h2>
            <p className="text-muted-foreground">
              Explore properties by their categories/types...
            </p>
          </div>
          <Link
            to="/accommodations"
            className="hidden md:block text-primary font-medium hover:underline"
          >
            Browse For More Properties
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.map((property, index) => (
            <div
              key={property.id}
              style={{ animationDelay: `${index * 100}ms` }}
              className="opacity-0 animate-fade-in"
            >
              <PropertyCard {...property} />
            </div>
          ))}
        </div>

        <Link
          to="/accommodations"
          className="md:hidden block text-center text-primary font-medium hover:underline mt-8"
        >
          Browse For More Properties
        </Link>
      </section>

      {/* Hosting CTA */}
      <HostingCTA />

      <Footer />
    </div>
  );
};

export default Index;
