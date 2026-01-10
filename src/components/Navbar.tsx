import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, ChevronDown, Moon, Sun, LogOut, User, Menu, X } from "lucide-react";
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
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/hooks/usePreferences";

const navLinks = [
  { key: "nav.home", path: "/" },
  { key: "nav.accommodations", path: "/accommodations" },
  { key: "nav.tours", path: "/tours" },
  { key: "nav.transport", path: "/transport" },
  { key: "nav.services", path: "/services" },
  { key: "nav.stories", path: "/stories" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isHost, isAdmin, isStaff } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { language, setLanguage, currency, setCurrency, resolvedTheme, setTheme } = usePreferences();

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
                  {t(link.key)}
                </Link>
              );
            })}

            {!isHost ? (
              <Link to="/become-host" className="ml-2">
                <Button variant="primary" size="sm">
                  {t("actions.becomeHost")}
                </Button>
              </Link>
            ) : (
              <Link to="/host-dashboard" className="ml-2">
                <Button variant="primary" size="sm">
                  {t("actions.hostDashboard")}
                </Button>
              </Link>
            )}

            {user && isAdmin ? (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="ml-2">
                  {t("actions.adminDashboard")}
                </Button>
              </Link>
            ) : null}
            {user && isStaff && !isAdmin ? (
              <Link to="/staff">
                <Button variant="outline" size="sm" className="ml-2">
                  {t("actions.staffDashboard")}
                </Button>
              </Link>
            ) : null}
          </div>

          {/* Right Actions - Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              className="p-2 rounded-full hover:bg-muted transition-colors"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={t("labels.theme")}
              type="button"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm"
                  aria-label={t("labels.currency")}
                >
                  <span>{currency}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setCurrency("RWF")}>RWF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("USD")}>USD</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("EUR")}>EUR</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm">
                  <span>{language.toUpperCase()}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLanguage("rw")}>{t("languages.rw")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("fr")}>{t("languages.fr")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("sw")}>{t("languages.sw")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("zh")}>{t("languages.zh")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLanguage("en")}>{t("languages.en")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/trip-cart">
              <Button variant="outline" size="sm" className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                {t("actions.tripCart")}
              </Button>
            </Link>

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
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                    <User className="w-4 h-4 mr-2" />
                    {t("actions.myBookings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/favorites")}>
                    <Heart className="w-4 h-4 mr-2" />
                    {t("actions.favorites")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      {t("actions.adminDashboard")}
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/roles")}> 
                      {t("actions.manageRoles")}
                    </DropdownMenuItem>
                  )}
                  {isStaff && !isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/staff")}>
                      {t("actions.staffDashboard")}
                    </DropdownMenuItem>
                  )}
                  {isHost && (
                    <DropdownMenuItem onClick={() => navigate("/host-dashboard")}>
                      {t("actions.hostDashboard")}
                    </DropdownMenuItem>
                  )}
                  {!isHost && (
                    <DropdownMenuItem onClick={() => navigate("/become-host")}>
                      {t("actions.becomeHost")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("actions.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button size="sm">{t("actions.signIn")}</Button>
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
                    {t(link.key)}
                  </Link>
                );
              })}

              {!isHost ? (
                <Link to="/become-host" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full mt-2">
                    {t("actions.becomeHost")}
                  </Button>
                </Link>
              ) : (
                <Link to="/host-dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full mt-2">
                    {t("actions.hostDashboard")}
                  </Button>
                </Link>
              )}

              {user && isAdmin ? (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    {t("actions.adminDashboard")}
                  </Button>
                </Link>
              ) : null}
              {user && isAdmin ? (
                <Link to="/admin/roles" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    {t("actions.manageRoles")}
                  </Button>
                </Link>
              ) : null}
              {user && isStaff && !isAdmin ? (
                <Link to="/staff" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    {t("actions.staffDashboard")}
                  </Button>
                </Link>
              ) : null}
              {user && isHost ? (
                <Link to="/host-dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full mt-2">
                    {t("actions.hostDashboard")}
                  </Button>
                </Link>
              ) : user ? (
                <Link to="/become-host" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full mt-2">
                    {t("actions.becomeHost")}
                  </Button>
                </Link>
              ) : null}
              {!user && (
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full mt-2">
                    {t("actions.signIn")}
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
                  {t("actions.signOut")}
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
