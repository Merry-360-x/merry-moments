import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function RequireRole({
  allowed,
  children,
}: {
  allowed: Array<"admin" | "staff" | "host">;
  children: ReactElement;
}) {
  const { user, isLoading, roles } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?mode=login&redirect=${encodeURIComponent(next)}`} replace />;
  }

  const hasAllowedRole = allowed.some((r) => roles.includes(r));
  if (!hasAllowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
