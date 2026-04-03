import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Smartphone, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/usePreferences";

const MOBILE_MONEY_COUNTRIES = new Set([
  "RW", "KE", "UG", "ZM", "TZ", "GH", "CD", "CM",
  "SN", "CI", "MZ", "MW", "BI", "CG",
]);

const SESSION_KEY = "merry360_momo_popup_seen";

export default function MomoGeoPopup() {
  const navigate = useNavigate();
  const { detectedCountry, isReady } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);

  const normalizedCountry = useMemo(
    () => (detectedCountry || "").trim().toUpperCase(),
    [detectedCountry]
  );

  const isEligible = useMemo(
    () => Boolean(normalizedCountry && MOBILE_MONEY_COUNTRIES.has(normalizedCountry)),
    [normalizedCountry]
  );

  useEffect(() => {
    if (!isReady || !isEligible) return;
    if (typeof window === "undefined") return;

    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [isReady, isEligible]);

  const closePopup = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    setIsOpen(false);
  };

  const startBooking = () => {
    closePopup();
    navigate("/accommodations");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 right-4 z-[90] w-[calc(100vw-2rem)] max-w-sm"
        >
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-2xl dark:border-emerald-800/70 dark:from-emerald-950/90 dark:via-slate-950 dark:to-teal-950/80">
            <button
              type="button"
              onClick={closePopup}
              aria-label="Close mobile money popup"
              className="absolute right-2 top-2 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-300/70 dark:shadow-emerald-900/60">
                <Smartphone className="h-5 w-5" />
              </div>

              <div className="space-y-1.5">
                <p className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3" />
                  Mobile Money Available
                </p>
                <h3 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
                  Book with momo in minutes
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Pay securely with your local mobile money wallet and confirm your booking fast.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" className="h-8 px-3 text-xs" onClick={startBooking}>
                Start booking
              </Button>
              <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={closePopup}>
                Maybe later
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
