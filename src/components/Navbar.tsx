import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Heart,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  User,
  Menu,
  X,
  Home,
  Building2,
  Map,
  Car,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Shield,
} from "lucide-react";
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
        <nav className="relative flex items-center justify-between h-16 lg:h-20">
          {/* Mobile: menu on the left */}
          <button
            className="lg:hidden p-2 -ml-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            type="button"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Desktop logo (left) */}
          <Link to="/" className="hidden lg:flex items-center shrink-0 -ml-1 pr-2">
            <Logo className="scale-90 origin-left" />
          </Link>

          {/* Mobile logo (center) */}
          <Link
            to="/"
            className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center"
            aria-label="Home"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Logo className="scale-90" />
          </Link>

          {/* Main Navigation - Desktop */}
          <div className="hidden lg:flex items-center gap-1 flex-1 min-w-0 mx-2">
            <div className="flex items-center gap-1 flex-wrap">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 xl:px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary"
                        : "text-foreground hover:text-primary"
                    }`}
                  >
                    {t(link.key)}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Actions - Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Become host / Host dashboard (primary) */}
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate(isHost ? "/host-dashboard" : "/become-host")}
              type="button"
            >
              <LayoutDashboard className="w-4 h-4" />
              {isHost ? t("actions.hostDashboard") : t("actions.becomeHost")}
            </Button>

            {/* Admin dashboard (side) */}
            {user && isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate("/admin")}
                type="button"
              >
                <Shield className="w-4 h-4" />
                {t("actions.adminDashboard")}
              </Button>
            ) : null}

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
                <DropdownMenuItem onClick={() => setCurrency("GBP")}>GBP</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("CNY")}>CNY</DropdownMenuItem>
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
                  {(isStaff || isAdmin) && (
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

          {/* Mobile right spacer (keeps the center logo visually balanced) */}
          <div className="lg:hidden w-10" aria-hidden="true" />
        </nav>

        {/* Mobile Menu (clean + minimal) */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border">
            <div className="py-4 space-y-4">
              {/* Quick actions */}
              <div className="flex items-center justify-between gap-2 px-1">
                <button
                  className="h-10 w-10 rounded-full border border-border bg-background flex items-center justify-center"
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
                <div className="flex items-center gap-2">
                  <Link to="/favorites" onClick={() => setMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="h-10 w-10 rounded-full border border-border bg-background flex items-center justify-center"
                      aria-label={t("actions.favorites")}
                    >
                      <Heart className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </Link>
                  <Link to="/trip-cart" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm">
                      {t("actions.tripCart")}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Main navigation */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { to: "/", label: t("nav.home"), icon: Home },
                  { to: "/accommodations", label: t("nav.accommodations"), icon: Building2 },
                  { to: "/tours", label: t("nav.tours"), icon: Map },
                  { to: "/transport", label: t("nav.transport"), icon: Car },
                  { to: "/stories", label: t("nav.stories"), icon: BookOpen },
                  ...(user && isHost
                    ? [{ to: "/host-dashboard", label: t("actions.hostDashboard"), icon: LayoutDashboard }]
                    : []),
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Account */}
              <div className="rounded-xl border border-border bg-card p-3">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground px-1">{user.email}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("/dashboard");
                        }}
                      >
                        <User className="w-4 h-4" /> Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("/my-bookings");
                        }}
                      >
                        <CalendarDays className="w-4 h-4" /> Bookings
                      </Button>
                      {!isHost ? (
                        <Button
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate("/become-host");
                          }}
                        >
                          <Building2 className="w-4 h-4" /> {t("actions.becomeHost")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate("/host-dashboard");
                          }}
                        >
                          <Building2 className="w-4 h-4" /> {t("actions.hostDashboard")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          handleSignOut();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4" /> {t("actions.signOut")}
                      </Button>
                    </div>

                    {isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("/admin");
                        }}
                      >
                        Admin dashboard
                      </Button>
                    ) : null}
                    {(isStaff || isAdmin) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("/staff");
                        }}
                      >
                        Staff dashboard
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Sign in to book and post stories.</div>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button size="sm">{t("actions.signIn")}</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
