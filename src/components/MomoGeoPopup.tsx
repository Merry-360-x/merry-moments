import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/usePreferences";

const MOBILE_MONEY_COUNTRIES = new Set([
  "RW", "KE", "UG", "ZM", "TZ", "GH", "CD", "CM",
  "SN", "CI", "MZ", "MW", "BI", "CG",
]);

const SESSION_KEY = "merry360_momo_popup_seen";

function hasOpenDialog() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[role="dialog"][data-state="open"]'));
}

export default function MomoGeoPopup() {
  const navigate = useNavigate();
  const { detectedCountry, isReady } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [hasBlockingDialog, setHasBlockingDialog] = useState(false);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const evaluate = () => {
      setHasBlockingDialog(hasOpenDialog());
    };

    evaluate();
    const observer = new MutationObserver(evaluate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "role"],
    });

    return () => observer.disconnect();
  }, []);

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
      {isOpen && !hasBlockingDialog && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-sm"
        >
          <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_56px_rgba(2,6,23,0.55)]">
            <button
              type="button"
              onClick={closePopup}
              aria-label="Close mobile money popup"
              className="absolute right-3 top-3 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              Close
            </button>

            <div className="space-y-1.5 pr-12">
              <h3 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
                Book with momo in minutes
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Pay securely with your local mobile money wallet and confirm your booking fast.
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" className="h-8 px-3 text-xs" onClick={startBooking}>
                Start booking
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-slate-300 px-3 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={closePopup}
              >
                Maybe later
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
