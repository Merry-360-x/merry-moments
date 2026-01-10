import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const categories = ["All", "Nature", "Adventure", "Cultural", "Wildlife", "Historical"];

const Tours = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState("Any Duration");
  const navigate = useNavigate();

  const runSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (duration && duration !== "Any Duration") params.set("duration", duration);
    if (activeCategory && activeCategory !== "All") params.set("category", activeCategory);
    const qs = params.toString();
    navigate(qs ? `/tours?${qs}` : "/tours");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="py-16 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Tours & Experiences</h1>
        <p className="text-muted-foreground">Discover the beauty of Rwanda</p>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
        <div className="bg-card rounded-xl shadow-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 max-w-3xl mx-auto">
          <div className="flex-1 flex items-center gap-2 px-4">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tours by name or location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              className="bg-transparent text-sm text-muted-foreground focus:outline-none"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option>Any Duration</option>
              <option>Half Day</option>
              <option>Full Day</option>
              <option>Multi-Day</option>
            </select>
            <Button variant="search" className="gap-2" type="button" onClick={runSearch}>
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                const params = new URLSearchParams();
                if (query.trim()) params.set("q", query.trim());
                if (duration && duration !== "Any Duration") params.set("duration", duration);
                if (category && category !== "All") params.set("category", category);
                const qs = params.toString();
                navigate(qs ? `/tours?${qs}` : "/tours");
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground hover:border-primary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      <div className="container mx-auto px-4 lg:px-8 py-20 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading tours...</p>
      </div>

      <Footer />
    </div>
  );
};

export default Tours;
