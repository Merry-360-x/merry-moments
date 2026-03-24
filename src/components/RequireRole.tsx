import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function hasSupabaseAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const keys = Object.keys(window.localStorage);
    return keys.some((key) => {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) return false;
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const first = parsed[0] as Record<string, unknown> | undefined;
          return typeof first?.access_token === "string" && first.access_token.length > 0;
        }
        if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>;
          const direct = obj.access_token;
          if (typeof direct === "string" && direct.length > 0) return true;
          const currentSession = obj.currentSession as Record<string, unknown> | null | undefined;
          return typeof currentSession?.access_token === "string" && currentSession.access_token.length > 0;
        }
      } catch {
        return raw.includes("access_token");
      }
      return false;
    });
  } catch {
    return false;
  }
}

export default function RequireRole({
  allowed,
  children,
}: {
  allowed: Array<
    | "admin"
    | "staff"
    | "host"
    | "financial_staff"
    | "operations_staff"
    | "customer_support"
  >;
  children: ReactElement;
}) {
  const { user, isLoading, roles, rolesLoading } = useAuth();
  const location = useLocation();
  const hasStoredToken = hasSupabaseAuthToken();

  if (!user && !hasStoredToken) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?mode=login&redirect=${encodeURIComponent(next)}`} replace />;
  }

  if (isLoading || rolesLoading) {
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
    return <Navigate to="/not-found" replace />;
  }

  return children;
}
