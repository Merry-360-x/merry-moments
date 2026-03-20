import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LockKeyhole, ExternalLink, AlertCircle } from "lucide-react";

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

  const [iframeLikelyBlocked, setIframeLikelyBlocked] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  const handleContinueNow = () => {
    if (!handoffState?.redirectUrl) return;
    window.location.href = handoffState.redirectUrl;
  };

  const handleBackToCheckout = () => {
    navigate("/checkout", { replace: true });
  };

  const hasValidState = Boolean(handoffState?.redirectUrl && handoffState?.checkoutId);

  const handleOpenDirect = () => {
    if (!handoffState?.redirectUrl) return;
    window.location.href = handoffState.redirectUrl;
  };

  return (
    <div className="min-h-screen bg-black/35 backdrop-blur-sm p-3 md:p-6">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="border-b border-border px-4 py-3 md:px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-foreground" />
            <div>
              <h1 className="text-sm md:text-base font-semibold text-foreground">Secure Card Window</h1>
              <p className="text-xs text-muted-foreground">Powered by Pesapal</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleBackToCheckout}>Back</Button>
        </div>

        {!hasValidState ? (
          <div className="p-6 md:p-8">
            <p className="text-sm text-muted-foreground">
              We could not find an active secure payment session. Return to checkout and try again.
            </p>
            <Button className="mt-6" onClick={handleBackToCheckout}>Return to Checkout</Button>
          </div>
        ) : (
          <>
            <div className="px-4 pt-3 pb-2 md:px-5 text-xs text-muted-foreground flex items-center gap-3">
              <span className="flex items-center gap-1.5"><LockKeyhole className="w-3.5 h-3.5" /> No iframe styling from our side</span>
              <span className="flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Card data stays on Pesapal</span>
            </div>

            <div className="relative bg-muted/20">
              {!frameLoaded && !iframeLikelyBlocked ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70 backdrop-blur-sm text-sm text-muted-foreground">
                  Loading secure checkout...
                </div>
              ) : null}
              <iframe
                title="Pesapal Secure Checkout"
                src={handoffState?.redirectUrl}
                className="w-full h-[78vh] min-h-[560px] bg-background"
                onLoad={() => setFrameLoaded(true)}
              />
            </div>

            <div className="px-4 py-3 md:px-5 border-t border-border flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                If this window stays blank, open Pesapal directly.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIframeLikelyBlocked(true);
                    handleOpenDirect();
                  }}
                >
                  <AlertCircle className="w-4 h-4 mr-1.5" /> Open Direct
                </Button>
                <Button size="sm" onClick={handleBackToCheckout}>Cancel</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
