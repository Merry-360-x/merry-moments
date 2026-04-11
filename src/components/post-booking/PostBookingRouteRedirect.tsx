import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function PostBookingRouteRedirect() {
  const location = useLocation();
  const { isHost, isLoading, roles } = useAuth();
  const canManagePostBooking = roles.some((role) =>
    ["admin", "financial_staff", "operations_staff", "customer_support"].includes(role)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner message="Loading post-booking..." className="py-0" />
      </div>
    );
  }

  if (canManagePostBooking) {
    return <Navigate replace to="/admin/post-booking" />;
  }

  if (isHost) {
    const params = new URLSearchParams(location.search);
    params.set("tab", "post-booking");
    const query = params.toString();
    return <Navigate replace to={query ? `/host-dashboard?${query}` : "/host-dashboard?tab=post-booking"} />;
  }

  return <Navigate replace to={location.search ? `/my-bookings${location.search}` : "/my-bookings"} />;
}