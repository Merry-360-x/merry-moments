import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Accommodations from "./pages/Accommodations";
import Tours from "./pages/Tours";
import Transport from "./pages/Transport";
import Stories from "./pages/Stories";
import HostDashboard from "./pages/HostDashboard";
import MyBookings from "./pages/MyBookings";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";
import RequireAuth from "@/components/RequireAuth";
import RequireRole from "@/components/RequireRole";
import HostApplication from "./pages/HostApplication";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AdminRoles from "./pages/AdminRoles";
import PropertyDetails from "./pages/PropertyDetails";
import TripCart from "./pages/TripCart";
import Checkout from "./pages/Checkout";
import InfoPage from "./pages/InfoPage";
import Dashboard from "./pages/Dashboard";
import AdminIntegrations from "./pages/AdminIntegrations";
import HostReviews from "./pages/HostReviews";
import HostAbout from "./pages/HostAbout";
import ConnectionTest from "./pages/ConnectionTest";
import CreateTour from "./pages/CreateTour";
import CreateTransport from "./pages/CreateTransport";
import ScrollToTop from "@/components/ScrollToTop";
import GlobalLoadingIndicator from "@/components/GlobalLoadingIndicator";
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
            <GlobalLoadingIndicator />
            <SupportCenterLauncher />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<AuthModeRedirect mode="login" />} />
              <Route path="/signup" element={<AuthModeRedirect mode="signup" />} />
              <Route path="/accommodations" element={<Accommodations />} />
              <Route path="/tours" element={<Tours />} />
              <Route path="/transport" element={<Transport />} />
              <Route path="/services" element={<Navigate to="/" replace />} />
              <Route path="/stories" element={<Stories />} />
              <Route
                path="/host-dashboard"
                element={
                  <RequireRole allowed={["host"]}>
                    <HostDashboard />
                  </RequireRole>
                }
              />
              <Route path="/host" element={<Navigate to="/host-dashboard" replace />} />
              <Route path="/become-host" element={<HostApplication />} />
              <Route
                path="/create-tour"
                element={
                  <RequireAuth>
                    <CreateTour />
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
                path="/admin"
                element={
                  <RequireRole allowed={["admin"]}>
                    <AdminDashboard />
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
                path="/staff"
                element={
                  <RequireRole allowed={["staff", "admin"]}>
                    <StaffDashboard />
                  </RequireRole>
                }
              />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/trip-cart" element={<TripCart />} />
              <Route path="/checkout" element={<Checkout />} />
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
              <Route path="/about" element={<InfoPage kind="about" />} />
              <Route path="/contact" element={<InfoPage kind="contact" />} />
              <Route path="/help" element={<InfoPage kind="help" />} />
              <Route path="/safety" element={<InfoPage kind="safety" />} />
              <Route path="/privacy" element={<InfoPage kind="privacy" />} />
              <Route path="/cookies" element={<InfoPage kind="cookies" />} />
              <Route path="/terms" element={<InfoPage kind="terms" />} />
              <Route path="/connection-test" element={<ConnectionTest />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <DatabaseConnectivityTest />
          </BrowserRouter>
        </TooltipProvider>
      </RealtimeProvider>
    </PreferencesProvider>
  </AuthProvider>
  </QueryClientProvider>
);

export default App;
