import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, ChevronDown, Moon, LogOut, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "./Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

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
  const navigate = useNavigate();
  const { user, signOut, isHost } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          {/* Main Navigation - Desktop */}
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

          {/* Right Actions - Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Moon className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm">
              <span>RWF</span>
              <ChevronDown className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm">
              <span>EN</span>
              <ChevronDown className="w-4 h-4" />
            </div>

            <Button variant="outline" size="sm" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Trip Cart
            </Button>

            <Link to="/favorites">
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Heart className="w-5 h-5 text-muted-foreground" />
              </button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    {getInitials()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-muted-foreground text-xs">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                    <User className="w-4 h-4 mr-2" />
                    My Bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/favorites")}>
                    <Heart className="w-4 h-4 mr-2" />
                    Favorites
                  </DropdownMenuItem>
                  {isHost && (
                    <DropdownMenuItem onClick={() => navigate("/host-dashboard")}>
                      Host Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <Link to="/host-dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full mt-2">
                  Host Dashboard
                </Button>
              </Link>
              {!user && (
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full mt-2">
                    Sign In
                  </Button>
                </Link>
              )}
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
