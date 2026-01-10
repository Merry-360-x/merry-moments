import { Link, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, ChevronDown, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Accommodations", path: "/accommodations" },
  { name: "Tours", path: "/tours" },
  { name: "Transport", path: "/transport" },
  { name: "Services", path: "/services" },
  { name: "Stories", path: "/stories" },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>

          {/* Main Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <Link to="/host-dashboard">
              <Button variant="primary" size="sm" className="ml-2">
                Host Dashboard
              </Button>
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Moon className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm">
              <span>RWF</span>
              <ChevronDown className="w-4 h-4" />
            </div>

            <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm">
              <span>EN</span>
              <ChevronDown className="w-4 h-4" />
            </div>

            <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
              <ShoppingCart className="w-4 h-4" />
              Trip Cart
            </Button>

            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Heart className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
              ME
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
