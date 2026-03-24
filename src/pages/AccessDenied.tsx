import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const REDIRECT_SECONDS = 6;

const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  const fromPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("from") || null;
  }, [location.search]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          navigate("/", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to open this page.
          {fromPath ? ` (${fromPath})` : ""}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Redirecting to Home in {secondsLeft}s.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Go Home Now
          </Link>
          <Link to="/auth?mode=login" className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
