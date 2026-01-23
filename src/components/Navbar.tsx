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
  Megaphone,
  DollarSign,
  Settings,
  MessageSquare,
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
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/hooks/usePreferences";
import { supabase } from "@/integrations/supabase/client";
import { useTripCart } from "@/hooks/useTripCart";
import { useQuery } from "@tanstack/react-query";

const navLinks = [
  { key: "nav.home", path: "/" },
  { key: "nav.accommodations", path: "/accommodations" },
  { key: "nav.tours", path: "/tours" },
  { key: "nav.transport", path: "/transport" },
  { key: "nav.stories", path: "/stories" },
];

const currencies = [
  { code: "RWF", symbol: "FRw" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CNY", symbol: "¥" },
];

const getCurrencySymbol = (code: string) => {
  const curr = currencies.find(c => c.code === code);
  return curr ? curr.symbol : code;
};

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isHost, isAdmin, isStaff, isFinancialStaff, isOperationsStaff, isCustomerSupport } = useAuth();
  const { guestCart } = useTripCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { language, setLanguage, currency, setCurrency, resolvedTheme, setTheme } = usePreferences();

  const [adIndex, setAdIndex] = useState(0);

  // Query active ad banners
  const { data: adBanners = [] } = useQuery({
    queryKey: ["ad_banners"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("ad_banners")
        .select("id, message, cta_label, cta_url, bg_color, text_color")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("sort_order", { ascending: true });
      
      if (error) {
        console.warn("Failed to fetch ad banners:", error);
        return [];
      }
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (adBanners.length <= 1) return;
    const t = setInterval(() => setAdIndex((i) => (i + 1) % adBanners.length), 5000);
    return () => clearInterval(t);
  }, [adBanners.length]);

  const activeAd = useMemo(() => {
    if (adBanners.length === 0) return null;
    return adBanners[Math.min(adIndex, adBanners.length - 1)] ?? null;
  }, [adBanners, adIndex]);

  const fallbackAd = useMemo(() => {
    return {
      message: "We host accommodations, tours, and transportation.",
      cta_label: null,
      cta_url: null,
      bg_color: "rgba(239, 68, 68, 0.08)",
      text_color: null,
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  // Query user profile for avatar
  const { data: userProfile } = useQuery({
    queryKey: ["user_profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user!.id)
        .single();
      
      if (error) {
        console.warn("Failed to fetch user profile:", error);
        return null;
      }
      return data;
    },
  });

  const { data: authedCartCount = 0 } = useQuery({
    queryKey: ["trip_cart", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("trip_cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) return 0;
      return Number(count ?? 0);
    },
    staleTime: 10_000, // 10 seconds
  });

  const tripCartCount = user ? authedCartCount : guestCart.length;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      {(activeAd || fallbackAd) && (
        <div
          className="w-full border-b border-border/60"
        >
          <div className="container mx-auto px-4 lg:px-8 py-2">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-full border border-border/70 bg-background px-4 py-2 shadow-sm flex items-center justify-center gap-3 text-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
                  <Megaphone className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {(activeAd?.message ?? fallbackAd.message) as string}
                </span>
                {activeAd?.cta_label && activeAd?.cta_url && (
                  <>
                    <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <a
                      href={activeAd.cta_url}
                      className="text-sm font-semibold text-primary hover:underline underline-offset-4"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {activeAd.cta_label}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
          <Link to="/" className="hidden lg:flex items-center shrink-0 pr-4">
            <Logo />
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
                    className={`px-2.5 xl:px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1.5">
            {/* Become host / Host dashboard (primary) */}
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-3"
              onClick={() => navigate(isHost ? "/host-dashboard" : "/become-host")}
              type="button"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden xl:inline">
                {isHost ? t("actions.hostDashboard") : t("actions.becomeHost")}
              </span>
              <span className="xl:hidden">{isHost ? "Host" : "Host"}</span>
            </Button>

            {/* Admin dashboard (side) */}
            {user && isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 px-3"
                onClick={() => navigate("/admin")}
                type="button"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden xl:inline">{t("actions.adminDashboard")}</span>
                <span className="xl:hidden">Admin</span>
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
                  className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-full border border-border text-sm"
                  aria-label={t("labels.currency")}
                >
                  <span className="hidden xl:inline">
                    ({getCurrencySymbol(currency)}) {currency}
                  </span>
                  <span className="xl:hidden">
                    {getCurrencySymbol(currency)}
                  </span>
                  <ChevronDown className="w-3 h-3 xl:w-4 xl:h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setCurrency("RWF")}>(FRw) RWF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("USD")}>($) USD</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("EUR")}>(€) EUR</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("GBP")}>(£) GBP</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("CNY")}>(¥) CNY</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-full border border-border text-sm">
                  <span>{language.toUpperCase()}</span>
                  <ChevronDown className="w-3 h-3 xl:w-4 xl:h-4" />
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
              <Button variant="outline" size="sm" className="gap-1 xl:gap-2 relative px-2 xl:px-3">
                <CalendarDays className="w-4 h-4 xl:hidden" />
                <span className="hidden xl:inline">{t("actions.tripCart")}</span>
                {tripCartCount > 0 ? (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                    {tripCartCount > 99 ? "99+" : tripCartCount}
                  </span>
                ) : null}
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
                  <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold overflow-hidden border-2 border-background shadow-sm">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt={userProfile.full_name || user.email || "Profile"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling!.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        userProfile?.avatar_url ? 'hidden' : ''
                      }`}
                    >
                      {getInitials()}
                    </div>
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
                  {isFinancialStaff && (
                    <DropdownMenuItem onClick={() => navigate("/financial-dashboard")}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Financial Dashboard
                    </DropdownMenuItem>
                  )}
                  {isOperationsStaff && (
                    <DropdownMenuItem onClick={() => navigate("/operations-dashboard")}>
                      <Settings className="w-4 h-4 mr-2" />
                      Operations Dashboard
                    </DropdownMenuItem>
                  )}
                  {isCustomerSupport && (
                    <DropdownMenuItem onClick={() => navigate("/customer-support-dashboard")}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Support Dashboard
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
                    <Button variant="outline" size="sm" className="relative">
                      {t("actions.tripCart")}
                      {tripCartCount > 0 ? (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                          {tripCartCount > 99 ? "99+" : tripCartCount}
                        </span>
                      ) : null}
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
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold overflow-hidden border border-border">
                        {userProfile?.avatar_url ? (
                          <img
                            src={userProfile.avatar_url}
                            alt={userProfile.full_name || user.email || "Profile"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling!.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-full h-full flex items-center justify-center ${
                            userProfile?.avatar_url ? 'hidden' : ''
                          }`}
                        >
                          {getInitials()}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
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
                    {isFinancialStaff ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("/financial-dashboard");
                        }}
                      >
                        <DollarSign className="w-4 h-4" /> Financial Dashboard
                      </Button>
                    ) : null}
                    {isOperationsStaff ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("/operations-dashboard");
                        }}
                      >
                        <Settings className="w-4 h-4" /> Operations Dashboard
                      </Button>
                    ) : null}
                    {isCustomerSupport ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("/customer-support-dashboard");
                        }}
                      >
                        <MessageSquare className="w-4 h-4" /> Support Dashboard
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
