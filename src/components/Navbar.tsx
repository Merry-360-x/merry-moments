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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/hooks/usePreferences";
import { supabase } from "@/integrations/supabase/client";
import { useTripCart } from "@/hooks/useTripCart";
import { useQuery } from "@tanstack/react-query";
import { normalizeAdminMetrics } from "@/lib/admin-metrics";

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
  const symbols: Record<string, string> = {
    RWF: 'FRw', USD: '$', EUR: '€', GBP: '£', CNY: '¥',
    TZS: 'TSh', KES: 'KSh', UGX: 'USh', ZMW: 'ZK', BIF: 'FBu', ZAR: 'R'
  };
  return symbols[code] || code;
};

const bookingDecisionSeenKey = (userId?: string | null) =>
  `guest_booking_decision_seen_at_${String(userId || "anonymous")}`;

const BOOKING_DECISION_SEEN_EVENT = "guest-booking-decisions-seen";
const MOBILE_MENU_ROUTE = "/menu";

const getLatestBookingDecisionTimestamp = (
  bookings: Array<{ confirmation_status?: string | null; confirmed_at?: string | null; rejected_at?: string | null }>
) => bookings
  .map((booking) => booking.confirmation_status === "approved" ? booking.confirmed_at : booking.rejected_at)
  .filter((value): value is string => Boolean(value))
  .sort()
  .at(-1) || "";

const TripCartIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8.5 6V4.75C8.5 3.78 9.28 3 10.25 3h3.5c.97 0 1.75.78 1.75 1.75V6" />
    <rect x="2.5" y="6" width="19" height="14.5" rx="2.75" />
    <path d="M6.5 8.75V17.75" />
    <path d="M17.5 8.75V17.75" />
  </svg>
);

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isHost, isAdmin, isStaff, isFinancialStaff, isOperationsStaff, isCustomerSupport } = useAuth();
  const { guestCart } = useTripCart();
  const [mobileCurrencyMenuOpen, setMobileCurrencyMenuOpen] = useState(false);
  const [decisionSeenAt, setDecisionSeenAt] = useState<string>("");
  const mobileMenuOpen = location.pathname === MOBILE_MENU_ROUTE;

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    setDecisionSeenAt(localStorage.getItem(bookingDecisionSeenKey(user.id)) || "");
  }, [user?.id]);

  useEffect(() => {
    setMobileCurrencyMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      setMobileCurrencyMenuOpen(false);
    }
  }, [mobileMenuOpen]);

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

  const openMobileMenu = useCallback(() => {
    setMobileCurrencyMenuOpen(false);

    if (mobileMenuOpen) return;

    navigate(MOBILE_MENU_ROUTE, {
      state: {
        mobileMenuReturnTo: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }, [location.hash, location.pathname, location.search, mobileMenuOpen, navigate]);

  const closeMobileMenu = useCallback(() => {
    setMobileCurrencyMenuOpen(false);

    if (!mobileMenuOpen) return;

    const nextPath = (location.state as { mobileMenuReturnTo?: string } | null)?.mobileMenuReturnTo;
    navigate(nextPath && nextPath !== MOBILE_MENU_ROUTE ? nextPath : "/", { replace: true });
  }, [location.state, mobileMenuOpen, navigate]);

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

  const { data: unreadDirectMessagesCount = 0 } = useQuery({
    queryKey: ["direct-messages-unread-count", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("direct_messages")
        .select("id", { head: true, count: "exact" })
        .eq("recipient_id", user!.id)
        .is("read_at", null);

      if (error) return 0;
      return Number(count ?? 0);
    },
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  // Query open support tickets count for admin/staff badge
  const { data: openTicketsCount = 0 } = useQuery({
    queryKey: ["open_support_tickets_count"],
    enabled: Boolean(user?.id) && (isAdmin || isStaff || isCustomerSupport),
    queryFn: async () => {
      // Use RPC function for accurate count (same as dashboard)
      const { data, error } = await supabase.rpc("admin_dashboard_metrics");
      if (error) {
        // Fallback to direct query
        const { count } = await supabase
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .eq("status", "open");
        return Number(count ?? 0);
      }
      const metrics = normalizeAdminMetrics(data as any);
      return metrics.tickets_open ?? 0;
    },
    staleTime: 10_000, // 10 seconds - keep in sync
    refetchInterval: 30_000, // Refetch every 30 seconds
  });

  const { data: bookingDecisions = [] } = useQuery({
    queryKey: ["navbar_booking_decisions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, confirmation_status, confirmed_at, rejected_at")
        .eq("guest_id", user!.id)
        .in("confirmation_status", ["approved", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) return [];
      return data || [];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const syncSeenAt = () => {
      if (!user?.id) return;
      setDecisionSeenAt(localStorage.getItem(bookingDecisionSeenKey(user.id)) || "");
    };

    syncSeenAt();
    window.addEventListener("storage", syncSeenAt);
    window.addEventListener("focus", syncSeenAt);
    window.addEventListener(BOOKING_DECISION_SEEN_EVENT, syncSeenAt as EventListener);
    return () => {
      window.removeEventListener("storage", syncSeenAt);
      window.removeEventListener("focus", syncSeenAt);
      window.removeEventListener(BOOKING_DECISION_SEEN_EVENT, syncSeenAt as EventListener);
    };
  }, [location.pathname, user?.id]);

  const unreadBookingDecisionCount = useMemo(() => {
    if (!bookingDecisions.length) return 0;
    const seenDate = decisionSeenAt ? new Date(decisionSeenAt) : new Date(0);

    return bookingDecisions.filter((booking: any) => {
      const ts = booking.confirmation_status === "approved"
        ? booking.confirmed_at
        : booking.rejected_at;
      if (!ts) return false;
      const dt = new Date(ts);
      return Number.isFinite(dt.getTime()) && dt > seenDate;
    }).length;
  }, [bookingDecisions, decisionSeenAt]);

  const markBookingDecisionsSeen = useCallback((seenAt?: string) => {
    if (typeof window === "undefined" || !user?.id) return;

    const nextSeenAt = seenAt || getLatestBookingDecisionTimestamp(bookingDecisions) || new Date().toISOString();
    localStorage.setItem(bookingDecisionSeenKey(user.id), nextSeenAt);
    setDecisionSeenAt(nextSeenAt);
    window.dispatchEvent(new CustomEvent(BOOKING_DECISION_SEEN_EVENT, { detail: { seenAt: nextSeenAt } }));
  }, [bookingDecisions, user?.id]);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      {(activeAd || fallbackAd) && (
        <div
          className="w-full border-b border-border/60"
        >
          <div className="container mx-auto px-3 md:px-4 lg:px-8 py-1.5 md:py-2">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-full border border-border/70 bg-background px-2.5 md:px-4 py-1.5 md:py-2 shadow-sm flex items-center justify-center gap-2 md:gap-3 text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 text-primary shrink-0">
                  <Megaphone className="w-3 h-3 md:w-4 md:h-4" />
                </span>
                <span className="text-xs md:text-sm font-semibold text-foreground line-clamp-1">
                  {(activeAd?.message ?? fallbackAd.message) as string}
                </span>
                {activeAd?.cta_label && activeAd?.cta_url && (
                  <>
                    <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <a
                      href={activeAd.cta_url}
                      className="text-xs md:text-sm font-semibold text-primary hover:underline underline-offset-4 whitespace-nowrap"
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
            onClick={() => {
              if (mobileMenuOpen) {
                closeMobileMenu();
                return;
              }

              openMobileMenu();
            }}
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
            onClick={() => {
              if (mobileMenuOpen) {
                setMobileCurrencyMenuOpen(false);
              }
            }}
          >
            <Logo className="scale-90" />
          </Link>

          {/* Main Navigation - Desktop */}
          <div className="hidden lg:flex items-center flex-1 min-w-0 mx-2 overflow-hidden">
            <div className="flex items-center gap-1 whitespace-nowrap">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`shrink-0 px-2.5 xl:px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
            {/* Become host / Host dashboard (primary) */}
            <Button
              size="sm"
              className="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-3 shrink-0"
              onClick={() => navigate(isHost ? "/host-dashboard" : "/become-host")}
              type="button"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden xl:inline">
                {isHost ? t("actions.hostDashboard") : t("actions.becomeHost")}
              </span>
              <span className="xl:hidden">{isHost ? "Dashboard" : "Host"}</span>
            </Button>

            {/* Admin dashboard (side) */}
            {user && isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                className="relative h-9 gap-2 px-3 shrink-0"
                onClick={() => navigate("/admin?tab=overview")}
                type="button"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden xl:inline">{t("actions.adminDashboard")}</span>
                <span className="xl:hidden">Admin</span>
                {openTicketsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                    {openTicketsCount > 99 ? "99+" : openTicketsCount}
                  </span>
                )}
              </Button>
            ) : null}

            <button
              className="h-9 w-9 rounded-full hover:bg-muted transition-colors shrink-0"
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
                  className="flex h-9 items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-full border border-border text-sm shrink-0"
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
              <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
                <DropdownMenuItem onClick={() => setCurrency("RWF")}> (FRw) RWF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("USD")}> ($) USD</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("EUR")}> (€) EUR</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("GBP")}> (£) GBP</DropdownMenuItem>
                <div className="border-t my-1" />
                <DropdownMenuItem onClick={() => setCurrency("TZS" as any)}> (TSh) TZS</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("KES" as any)}> (KSh) KES</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("UGX" as any)}> (USh) UGX</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("ZMW" as any)}> (ZK) ZMW</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("BIF" as any)}> (FBu) BIF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("ZAR" as any)}> (R) ZAR</DropdownMenuItem>
                <div className="border-t my-1" />
                <DropdownMenuItem onClick={() => setCurrency("CNY")}> (¥) CNY</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-full border border-border text-sm shrink-0">
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
              <Button variant="outline" size="sm" className="relative h-9 gap-1 xl:gap-2 px-2 xl:px-2.5 shrink-0">
                <TripCartIcon className="w-4 h-4 shrink-0" />
                <span className="hidden 2xl:inline">{t("actions.tripCart")}</span>
                {tripCartCount > 0 ? (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                    {tripCartCount > 99 ? "99+" : tripCartCount}
                  </span>
                ) : null}
              </Button>
            </Link>

            <Link to="/messages" aria-label="Messages">
              <Button variant="outline" size="sm" className="relative h-9 w-9 p-0 shrink-0" aria-label="Messages">
                <MessageSquare className="w-4 h-4" />
                {user && unreadDirectMessagesCount > 0 ? (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                    {unreadDirectMessagesCount > 99 ? "99+" : unreadDirectMessagesCount}
                  </span>
                ) : null}
              </Button>
            </Link>

            <Link to="/favorites">
              <button className="h-9 w-9 rounded-full hover:bg-muted transition-colors shrink-0">
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
                  <DropdownMenuItem onClick={() => navigate("/profile") }>
                    <Settings className="w-4 h-4 mr-2" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    markBookingDecisionsSeen();
                    navigate("/my-bookings");
                  }} className="relative">
                    <User className="w-4 h-4 mr-2" />
                    {t("actions.myBookings")}
                    {unreadBookingDecisionCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                        {unreadBookingDecisionCount > 99 ? "99+" : unreadBookingDecisionCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/messages")} className="relative">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
                    {unreadDirectMessagesCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                        {unreadDirectMessagesCount > 99 ? "99+" : unreadDirectMessagesCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/favorites")}>
                    <Heart className="w-4 h-4 mr-2" />
                    {t("actions.favorites")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin?tab=overview")} className="relative">
                      <Shield className="w-4 h-4 mr-2" />
                      {t("actions.adminDashboard")}
                      {openTicketsCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {openTicketsCount > 99 ? "99+" : openTicketsCount}
                        </span>
                      )}
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
                    <DropdownMenuItem onClick={() => navigate("/customer-support-dashboard")} className="relative">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Support Dashboard
                      {openTicketsCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {openTicketsCount > 99 ? "99+" : openTicketsCount}
                        </span>
                      )}
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || isFinancialStaff || isOperationsStaff || isCustomerSupport) && (
                    <DropdownMenuItem onClick={() => navigate("/admin/post-booking")}>
                      <Shield className="w-4 h-4 mr-2" />
                      Post-Booking Console
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

        {/* Mobile Menu Route Content */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <div className="mx-auto w-full max-w-screen-sm space-y-4 px-3 py-4 pb-10">
              <div className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("common.quickActions", "Quick Actions")}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {t("common.customizeYourTrip", "Customize your trip")}
                    </p>
                  </div>
                  <button
                    className="h-10 w-10 shrink-0 rounded-full border border-border bg-background flex items-center justify-center"
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
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <DropdownMenu modal={false} open={mobileCurrencyMenuOpen} onOpenChange={setMobileCurrencyMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex h-11 min-w-0 flex-1 items-center justify-between rounded-xl border border-border bg-background px-3 text-sm font-medium"
                        aria-label="Currency"
                      >
                        <span>{currency}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className="z-[70] w-40 max-h-72 overflow-y-auto">
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("RWF");
                        setMobileCurrencyMenuOpen(false);
                      }}>RWF</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("USD");
                        setMobileCurrencyMenuOpen(false);
                      }}>USD</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("EUR");
                        setMobileCurrencyMenuOpen(false);
                      }}>EUR</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("GBP");
                        setMobileCurrencyMenuOpen(false);
                      }}>GBP</DropdownMenuItem>
                      <div className="border-t my-1" />
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("TZS" as any);
                        setMobileCurrencyMenuOpen(false);
                      }}>TZS</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("KES" as any);
                        setMobileCurrencyMenuOpen(false);
                      }}>KES</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("UGX" as any);
                        setMobileCurrencyMenuOpen(false);
                      }}>UGX</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("ZMW" as any);
                        setMobileCurrencyMenuOpen(false);
                      }}>ZMW</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("BIF" as any);
                        setMobileCurrencyMenuOpen(false);
                      }}>BIF</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => {
                        setCurrency("ZAR" as any);
                        setMobileCurrencyMenuOpen(false);
                      }}>ZAR</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Link to="/favorites" className="shrink-0">
                    <button
                      type="button"
                      className="h-11 w-11 rounded-xl border border-border bg-background flex items-center justify-center"
                      aria-label={t("actions.favorites")}
                    >
                      <Heart className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-2">
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("nav.explore", "Explore")}
                </p>
                <div className="space-y-2">
                  {[
                    { to: "/", label: t("nav.home"), icon: Home },
                    { to: "/accommodations", label: t("nav.accommodations"), icon: Building2 },
                    { to: "/tours", label: t("nav.tours"), icon: Map },
                    { to: "/transport", label: t("nav.transport"), icon: Car },
                    { to: "/stories", label: t("nav.stories"), icon: MessageSquare },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary border-primary"
                            : "bg-background text-foreground border-border hover:border-primary"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-3">
                <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("common.tripTools", "Trip Tools")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { to: "/trip-cart", label: t("actions.tripCart"), icon: TripCartIcon, badge: tripCartCount > 0 ? (tripCartCount > 99 ? "99+" : String(tripCartCount)) : null },
                    { to: "/favorites", label: t("actions.favorites"), icon: Heart, badge: null },
                    ...(user ? [{
                      to: "/my-bookings",
                      label: t("actions.myBookings"),
                      icon: CalendarDays,
                      badge: unreadBookingDecisionCount > 0 ? (unreadBookingDecisionCount > 99 ? "99+" : String(unreadBookingDecisionCount)) : null,
                    }] : []),
                    ...(user ? [{
                      to: "/messages",
                      label: "Messages",
                      icon: MessageSquare,
                      badge: unreadDirectMessagesCount > 0 ? (unreadDirectMessagesCount > 99 ? "99+" : String(unreadDirectMessagesCount)) : null,
                    }] : []),
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => {
                          if (item.to === "/my-bookings") markBookingDecisionsSeen();
                        }}
                        className={`relative flex min-h-[72px] min-w-0 flex-col justify-between rounded-xl border px-3 py-3 transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary border-primary"
                            : "bg-background text-foreground border-border hover:border-primary"
                        }`}
                      >
                        {item.badge ? (
                          <span className="absolute right-2 top-2 inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                            {item.badge}
                          </span>
                        ) : null}
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="pr-5 text-sm font-medium leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-3">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold overflow-hidden border border-border">
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
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {t("common.account", "Account")}
                          </p>
                          <p className="truncate text-sm text-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-2"
                        onClick={() => {
                          navigate("/profile");
                        }}
                      >
                        <Settings className="w-4 h-4" />
                        {t("common.account", "Account")}
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        handleSignOut();
                      }}
                    >
                      <LogOut className="w-4 h-4" /> {t("actions.signOut")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Sign in to book your next trip.</div>
                    <Link to="/auth">
                      <Button size="sm">{t("actions.signIn")}</Button>
                    </Link>
                  </div>
                )}
              </div>

              {(user || isAdmin || isFinancialStaff || isOperationsStaff || isCustomerSupport) ? (
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("common.workspaces", "Workspaces")}
                  </p>
                  <div className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
                    {isHost ? (
                      <Button
                        size="sm"
                        className="w-full justify-start gap-2 min-[560px]:col-span-2"
                        onClick={() => {
                          navigate("/host-dashboard");
                        }}
                      >
                        <LayoutDashboard className="w-4 h-4" /> {t("actions.hostDashboard")}
                      </Button>
                    ) : user ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 min-[560px]:col-span-2"
                        onClick={() => {
                          navigate("/become-host");
                        }}
                      >
                        <Building2 className="w-4 h-4" /> {t("actions.becomeHost")}
                      </Button>
                    ) : null}

                    {isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-12 h-auto w-full items-start justify-start gap-2 px-3 py-3 text-left whitespace-normal"
                        onClick={() => {
                          navigate("/admin?tab=overview");
                        }}
                      >
                        <Shield className="mt-0.5 w-4 h-4 shrink-0" />
                        <span className="block leading-snug">{t("actions.adminDashboard")}</span>
                      </Button>
                    ) : null}
                    {isFinancialStaff ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-12 h-auto w-full items-start justify-start gap-2 px-3 py-3 text-left whitespace-normal"
                        onClick={() => {
                          navigate("/financial-dashboard");
                        }}
                      >
                        <DollarSign className="mt-0.5 w-4 h-4 shrink-0" />
                        <span className="block leading-snug">Financial Dashboard</span>
                      </Button>
                    ) : null}
                    {isOperationsStaff ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-12 h-auto w-full items-start justify-start gap-2 px-3 py-3 text-left whitespace-normal"
                        onClick={() => {
                          navigate("/operations-dashboard");
                        }}
                      >
                        <Settings className="mt-0.5 w-4 h-4 shrink-0" />
                        <span className="block leading-snug">Operations Dashboard</span>
                      </Button>
                    ) : null}
                    {isCustomerSupport ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-12 h-auto w-full items-start justify-start gap-2 px-3 py-3 text-left whitespace-normal"
                        onClick={() => {
                          navigate("/customer-support-dashboard");
                        }}
                      >
                        <MessageSquare className="mt-0.5 w-4 h-4 shrink-0" />
                        <span className="block leading-snug">Support Dashboard</span>
                      </Button>
                    ) : null}
                    {(isAdmin || isFinancialStaff || isOperationsStaff || isCustomerSupport) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 min-[560px]:col-span-2"
                        onClick={() => {
                          navigate("/admin/post-booking");
                        }}
                      >
                        <Shield className="w-4 h-4" /> Post-Booking Console
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
