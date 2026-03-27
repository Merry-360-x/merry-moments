import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function SecureCardHandoff() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const checkoutId = params.get("checkoutId") || "";
  const storageKey = checkoutId ? `secure-card-handoff:${checkoutId}` : "";

  const handoffState = useMemo(() => {
    if (!storageKey) return null;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        redirectUrl?: string;
        checkoutId?: string;
        createdAt?: string;
      };
      if (!parsed?.redirectUrl || !parsed?.checkoutId) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Auto-redirect to Flutterwave URL — no iframe
  useEffect(() => {
    if (handoffState?.redirectUrl) {
      window.location.href = handoffState.redirectUrl;
    }
  }, [handoffState?.redirectUrl]);

  const handleBackToCheckout = () => navigate("/checkout", { replace: true });

  return (
    <div className="min-h-screen bg-black/35 backdrop-blur-sm p-3 md:p-6 flex items-center justify-center">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="border-b border-border px-4 py-3 md:px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-foreground" />
            <div>
              <h1 className="text-sm md:text-base font-semibold text-foreground">Secure Card Checkout</h1>
              <p className="text-xs text-muted-foreground">Powered by Flutterwave</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleBackToCheckout}>Cancel</Button>
        </div>

        <div className="p-6 md:p-8">
          {handoffState?.redirectUrl ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Opening Flutterwave secure checkout…</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { window.location.href = handoffState.redirectUrl!; }}
              >
                Open manually
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                No active payment session found. Return to checkout and try again.
              </p>
              <Button onClick={handleBackToCheckout}>Return to Checkout</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
