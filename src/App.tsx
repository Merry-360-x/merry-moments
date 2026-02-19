import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesProvider";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ReviewPage from "./pages/ReviewPage";
import RequireAuth from "@/components/RequireAuth";
import RequireRole from "@/components/RequireRole";

// Lazy load dashboard pages to prevent circular dependencies
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FinancialStaffDashboard = lazy(() => import("./pages/FinancialStaffDashboard"));
const OperationsStaffDashboard = lazy(() => import("./pages/OperationsStaffDashboard"));
const CustomerSupportDashboard = lazy(() => import("./pages/CustomerSupportDashboard"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Accommodations = lazy(() => import("./pages/Accommodations"));
const Tours = lazy(() => import("./pages/Tours"));
const TourDetails = lazy(() => import("./pages/TourDetails"));
const Transport = lazy(() => import("./pages/Transport"));
const HostDashboard = lazy(() => import("./pages/HostDashboard"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Favorites = lazy(() => import("./pages/Favorites"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BecomeHost = lazy(() => import("./pages/BecomeHost"));
const BookingsPage = lazy(() => import("./pages/BookingsPage"));
const AdminRoles = lazy(() => import("./pages/AdminRoles"));
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const TripCart = lazy(() => import("./pages/TripCart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentPending = lazy(() => import("./pages/PaymentPending"));
const PaymentFailed = lazy(() => import("./pages/PaymentFailed"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminIntegrations = lazy(() => import("./pages/AdminIntegrations"));
const HostReviews = lazy(() => import("./pages/HostReviews"));
const HostAbout = lazy(() => import("./pages/HostAbout"));
const ConnectionTest = lazy(() => import("./pages/ConnectionTest"));
const CreateTour = lazy(() => import("./pages/CreateTour"));
const CreateTourPackage = lazy(() => import("./pages/CreateTourPackage"));
const CreateTransport = lazy(() => import("./pages/CreateTransport"));
const CreateCarRental = lazy(() => import("./pages/CreateCarRental"));
const CreateAirportTransfer = lazy(() => import("./pages/CreateAirportTransfer"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const SafetyGuidelines = lazy(() => import("./pages/SafetyGuidelines"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Stories = lazy(() => import("./pages/Stories"));
const CreateStory = lazy(() => import("./pages/CreateStory"));
const AffiliateSignup = lazy(() => import("./pages/AffiliateSignup"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const AffiliatePortal = lazy(() => import("./pages/AffiliatePortal"));
import ScrollToTop from "@/components/ScrollToTop";
import SupportCenterLauncher from "@/components/SupportCenterLauncher";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useDataPersistence } from "@/hooks/useDataPersistence";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { DatabaseConnectivityTest } from "@/components/DatabaseConnectivityTest";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on AbortError
        if (error instanceof Error && error.name === "AbortError") {
          return false;
        }
        // Check if error message contains abort-related text
        if (error instanceof Error && (
          error.message?.includes("AbortError") ||
          error.message?.includes("aborted") ||
          error.message?.includes("signal")
        )) {
          return false;
        }
        // Don't retry on auth errors (401, 403)
        if (error instanceof Error && (
          error.message?.includes("401") ||
          error.message?.includes("403") ||
          error.message?.includes("JWT")
        )) {
          return false;
        }
        // Retry up to 3 times for better reliability
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000), // Faster retries: 500ms, 1s, 2s, max 5s
      staleTime: 1000 * 60 * 3, // 3 minutes - optimized for fresh data
      gcTime: 1000 * 60 * 20, // 20 minutes cache retention
      refetchOnWindowFocus: true, // Refetch when window gains focus
      refetchOnReconnect: true, // Retry on reconnect
      refetchOnMount: true, // Fetch fresh data on mount for consistency
      networkMode: 'online', // Only fetch when online
      // Query deduplication - prevent duplicate requests
      structuralSharing: true, // Optimize re-renders
      // Don't throw errors to the UI for aborted requests
      throwOnError: (error) => {
        if (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("aborted")
        )) {
          return false;
        }
        return false; // Don't throw errors - handle them in components
      },
    },
    mutations: {
      retry: false, // Don't retry mutations to avoid duplicate operations
      networkMode: 'online',
      // Don't throw errors for aborted mutations
      throwOnError: (error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return false;
        }
        return false;
      },
    },
  },
});

function AuthModeRedirect({ mode }: { mode: "login" | "signup" }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  const next = new URLSearchParams();
  next.set("mode", mode);
  if (redirect) next.set("redirect", redirect);
  return <Navigate to={`/auth?${next.toString()}`} replace />;
}

const PREFETCH_ROUTE_MODULES = [
  () => import("./pages/Accommodations"),
  () => import("./pages/Tours"),
  () => import("./pages/Transport"),
  () => import("./pages/TripCart"),
  () => import("./pages/Checkout"),
  () => import("./pages/MyBookings"),
  () => import("./pages/PropertyDetails"),
  () => import("./pages/TourDetails"),
];

function RoutePrefetch() {
  useEffect(() => {
    let cancelled = false;

    const prefetch = () => {
      PREFETCH_ROUTE_MODULES.forEach((loadModule, index) => {
        window.setTimeout(() => {
          if (!cancelled) {
            void loadModule();
          }
        }, index * 120);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = (window as any).requestIdleCallback(prefetch, { timeout: 1500 });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(idleId);
      };
    }

    const timer = window.setTimeout(prefetch, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}

function RouteTransitionWrapper({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -3 }}
        transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

type RouteSeoConfig = {
  title: string;
  description: string;
  path: string;
  pageType: string;
};

const ROUTE_SEO_CONFIGS: RouteSeoConfig[] = [
  {
    path: "/",
    title: "Merry 360 Experiences — Stays, Tours & Transport",
    description: "Book accommodations, tours, transport, and travel experiences in one place.",
    pageType: "WebPage",
  },
  {
    path: "/accommodations",
    title: "Accommodations — Merry360X",
    description: "Browse stays and accommodations across Rwanda with transparent pricing and easy booking.",
    pageType: "CollectionPage",
  },
  {
    path: "/tours",
    title: "Tours & Tour Packages — Merry360X",
    description: "Discover curated tours and tour packages for nature, culture, and adventure.",
    pageType: "CollectionPage",
  },
  {
    path: "/transport",
    title: "Transport Services — Merry360X",
    description: "Book trusted transport options including airport transfer and private rides.",
    pageType: "CollectionPage",
  },
  {
    path: "/search",
    title: "Search Stays, Tours & Transport — Merry360X",
    description: "Search accommodations, tours, tour packages, and transport by your travel preferences.",
    pageType: "SearchResultsPage",
  },
  {
    path: "/contact",
    title: "Contact Support — Merry360X",
    description: "Reach Merry360X support at support@merry360x.com for booking and account help.",
    pageType: "ContactPage",
  },
  {
    path: "/about",
    title: "About Merry360X — Stays, Tours & Transport",
    description: "Learn about Merry360X and how we help travelers book stays, tours, and transport in one place.",
    pageType: "AboutPage",
  },
  {
    path: "/help-center",
    title: "Help Center — Merry360X",
    description: "Get support articles and booking help from the Merry360X help center.",
    pageType: "WebPage",
  },
  {
    path: "/stories",
    title: "Travel Stories — Merry360X",
    description: "Discover stories shared by the Merry360X community.",
    pageType: "CollectionPage",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy — Merry360X",
    description: "Read how Merry360X collects, uses, and protects personal data.",
    pageType: "WebPage",
  },
  {
    path: "/terms-and-conditions",
    title: "Terms & Conditions — Merry360X",
    description: "Review the terms and conditions for using Merry360X services.",
    pageType: "WebPage",
  },
  {
    path: "/refund-policy",
    title: "Refund Policy — Merry360X",
    description: "Understand cancellations, refunds, and policy timelines for bookings.",
    pageType: "WebPage",
  },
];

function getRouteSeoConfig(pathname: string): RouteSeoConfig {
  if (pathname.startsWith("/tours/")) {
    return {
      path: pathname,
      title: "Tour Details — Merry360X",
      description: "View tour details, inclusions, and availability before booking.",
      pageType: "WebPage",
    };
  }

  if (pathname.startsWith("/properties/")) {
    return {
      path: pathname,
      title: "Property Details — Merry360X",
      description: "View accommodation details, amenities, cancellation policy, and availability.",
      pageType: "WebPage",
    };
  }

  return ROUTE_SEO_CONFIGS.find((config) => config.path === pathname) || ROUTE_SEO_CONFIGS[0];
}

function upsertMetaTag(key: "name" | "property", value: string, content: string) {
  const selector = `meta[${key}="${value}"]`;
  const existing = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }
  const meta = document.createElement("meta");
  meta.setAttribute(key, value);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

function upsertCanonicalLink(href: string) {
  const existing = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (existing) {
    existing.setAttribute("href", href);
    return;
  }
  const link = document.createElement("link");
  link.setAttribute("rel", "canonical");
  link.setAttribute("href", href);
  document.head.appendChild(link);
}

function upsertRouteJsonLd(payload: Record<string, unknown>) {
  const scriptId = "route-jsonld";
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
  const content = JSON.stringify(payload);
  if (existing) {
    existing.text = content;
    return;
  }
  const script = document.createElement("script");
  script.id = scriptId;
  script.type = "application/ld+json";
  script.text = content;
  document.head.appendChild(script);
}

function RouteSeoManager() {
  const location = useLocation();

  useEffect(() => {
    const config = getRouteSeoConfig(location.pathname);
    const canonicalUrl = `https://merry360x.com${config.path === "/" ? "/" : config.path}`;

    document.title = config.title;
    upsertMetaTag("name", "description", config.description);
    upsertMetaTag("name", "contact", "support@merry360x.com");
    upsertMetaTag("property", "og:title", config.title);
    upsertMetaTag("property", "og:description", config.description);
    upsertMetaTag("property", "og:url", canonicalUrl);
    upsertMetaTag("property", "og:email", "support@merry360x.com");
    upsertMetaTag("name", "twitter:title", config.title);
    upsertMetaTag("name", "twitter:description", config.description);
    upsertCanonicalLink(canonicalUrl);

    upsertRouteJsonLd({
      "@context": "https://schema.org",
      "@type": config.pageType,
      name: config.title,
      description: config.description,
      url: canonicalUrl,
      isPartOf: {
        "@type": "WebSite",
        name: "Merry360X",
        url: "https://merry360x.com",
      },
      publisher: {
        "@type": "Organization",
        name: "Merry360X",
        url: "https://merry360x.com",
        email: "support@merry360x.com",
      },
    });
  }, [location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PreferencesProvider>
        <RealtimeProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <SupportCenterLauncher />
            <RouteSeoManager />
            <RoutePrefetch />
            <Suspense fallback={null}>
            <RouteTransitionWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/complete-profile" element={<Suspense fallback={null}><CompleteProfile /></Suspense>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/login" element={<AuthModeRedirect mode="login" />} />
              <Route path="/signup" element={<AuthModeRedirect mode="signup" />} />
              <Route path="/accommodations" element={<Accommodations />} />
              <Route path="/stays" element={<Navigate to="/accommodations" replace />} />
              <Route path="/tours" element={<Tours />} />
              <Route path="/tours/:id" element={<TourDetails />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/transport" element={<Transport />} />
              <Route path="/services" element={<Navigate to="/" replace />} />
              <Route path="/stories" element={<Stories />} />
              <Route
                path="/create-story"
                element={
                  <RequireAuth>
                    <CreateStory />
                  </RequireAuth>
                }
              />
              <Route
                path="/host-dashboard"
                element={
                  <RequireRole allowed={["host"]}>
                    <HostDashboard />
                  </RequireRole>
                }
              />
              <Route path="/host" element={<Navigate to="/host-dashboard" replace />} />
              <Route path="/become-host" element={<BecomeHost />} />

              <Route
                path="/create-tour"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["host"]}>
                      <CreateTour />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/create-tour-package"
                element={
                  <RequireAuth>
                    <CreateTourPackage />
                  </RequireAuth>
                }
              />

              <Route
                path="/create-transport"
                element={
                  <RequireAuth>
                    <CreateTransport />
                  </RequireAuth>
                }
              />

              <Route
                path="/create-car-rental"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["host"]}>
                      <CreateCarRental />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/create-airport-transfer"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["host"]}>
                      <CreateAirportTransfer />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/admin"
                element={
                  <RequireRole allowed={["admin"]}>
                    <ErrorBoundary>
                      <Suspense fallback={null}>
                        <AdminDashboard />
                      </Suspense>
                    </ErrorBoundary>
                  </RequireRole>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <RequireRole allowed={["admin"]}>
                    <AdminRoles />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/integrations"
                element={
                  <RequireRole allowed={["admin", "staff"]}>
                    <AdminIntegrations />
                  </RequireRole>
                }
              />
              <Route
                path="/financial-dashboard"
                element={
                  <RequireRole allowed={["financial_staff", "admin"]}>
                    <Suspense fallback={null}>
                      <FinancialStaffDashboard />
                    </Suspense>
                  </RequireRole>
                }
              />
              <Route
                path="/operations-dashboard"
                element={
                  <RequireRole allowed={["operations_staff", "admin"]}>
                    <Suspense fallback={null}>
                      <OperationsStaffDashboard />
                    </Suspense>
                  </RequireRole>
                }
              />
              <Route
                path="/customer-support-dashboard"
                element={
                  <RequireRole allowed={["customer_support", "admin"]}>
                    <Suspense fallback={null}>
                      <CustomerSupportDashboard />
                    </Suspense>
                  </RequireRole>
                }
              />
              <Route
                path="/bookings"
                element={
                  <RequireRole allowed={["admin", "operations_staff", "customer_support"]}>
                    <BookingsPage />
                  </RequireRole>
                }
              />
              {/* Redirect old route to new one */}
              <Route path="/support-dashboard" element={<Navigate to="/customer-support-dashboard" replace />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/trip-cart" element={<TripCart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment-pending" element={<PaymentPending />} />
              <Route path="/payment-failed" element={<PaymentFailed />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route path="/dashboard/watchlist" element={<Navigate to="/favorites" replace />} />
              <Route path="/dashboard/trip-cart" element={<Navigate to="/trip-cart" replace />} />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route path="/properties/:id" element={<PropertyDetails />} />
              <Route path="/hosts/:id" element={<HostAbout />} />
              <Route path="/hosts/:id/reviews" element={<HostReviews />} />
              <Route path="/review/:token" element={<ReviewPage />} />
              <Route path="/about" element={<InfoPage kind="about" />} />
              <Route path="/contact" element={<InfoPage kind="contact" />} />
              <Route path="/help" element={<Navigate to="/help-center" replace />} />
              <Route path="/safety" element={<InfoPage kind="safety" />} />
              <Route path="/privacy" element={<InfoPage kind="privacy" />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/cookies" element={<InfoPage kind="cookies" />} />
              <Route path="/terms" element={<InfoPage kind="terms" />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="/safety-guidelines" element={<SafetyGuidelines />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/connection-test" element={<ConnectionTest />} />
              <Route path="/affiliate-signup" element={<AffiliateSignup />} />
              <Route path="/affiliate-dashboard" element={<AffiliateDashboard />} />
              <Route path="/affiliate" element={<RequireAuth><AffiliatePortal /></RequireAuth>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </RouteTransitionWrapper>
            </Suspense>
            <DatabaseConnectivityTest />
          </BrowserRouter>
        </TooltipProvider>
      </RealtimeProvider>
    </PreferencesProvider>
  </AuthProvider>
  </QueryClientProvider>
);

export default App;
