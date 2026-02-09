import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import i18n from "@/i18n";
import {
  PreferencesContext,
  type AppCurrency,
  type AppLanguage,
  type ThemePreference,
} from "@/contexts/preferences-context";

const detectNavigatorLanguage = (): AppLanguage => {
  const raw = (navigator.language || "en").toLowerCase();
  if (raw.startsWith("fr")) return "fr";
  if (raw.startsWith("sw")) return "sw";
  if (raw.startsWith("rw")) return "rw";
  if (raw.startsWith("zh")) return "zh";
  return "en";
};

const getSystemResolvedTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// Map country ISO codes to currencies
const COUNTRY_CURRENCY_MAP: Record<string, AppCurrency> = {
  RW: "RWF", KE: "KES", UG: "UGX", TZ: "TZS", ZM: "ZMW",
  BI: "BIF", ZA: "ZAR", US: "USD", GB: "GBP",
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR",
  CN: "CNY",
};

// Detect country from IP using free API (cached in sessionStorage)
async function detectCountryFromIP(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const cached = sessionStorage.getItem("merry360_geo_country");
  if (cached) return cached;
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    const cc = data.country_code || null;
    if (cc) sessionStorage.setItem("merry360_geo_country", cc);
    return cc;
  } catch {
    return null;
  }
}

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();

  // Default to light mode (user can still switch to dark/system).
  // Persist theme locally since the DB schema may not include theme columns.
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "light";
    const raw = window.localStorage.getItem("merry360_theme");
    return (raw as ThemePreference | null) ?? "light";
  });
  const themeRef = useRef(theme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") return detectNavigatorLanguage();
    const raw = window.localStorage.getItem("merry360_language");
    return (raw as AppLanguage | null) ?? detectNavigatorLanguage();
  });
  const [currency, setCurrencyState] = useState<AppCurrency>(() => {
    if (typeof window === "undefined") return "USD";
    const raw = window.localStorage.getItem("merry360_currency");
    return (raw as AppCurrency | null) ?? "USD";
  });
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const applyTheme = useCallback((nextTheme: ThemePreference) => {
    const nextResolved = nextTheme === "system" ? getSystemResolvedTheme() : nextTheme;
    setResolvedTheme(nextResolved);
    document.documentElement.classList.toggle("dark", nextResolved === "dark");
  }, []);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const handler = () => applyTheme("system");
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, [theme, applyTheme]);

  useEffect(() => {
    if (authLoading) return;

    const run = async () => {
      // Detect country from IP for geo-based defaults
      const geoCountry = await detectCountryFromIP();
      if (geoCountry) setDetectedCountry(geoCountry);

      // Check if currency was ever explicitly set by user
      const hasExplicitCurrency = typeof window !== "undefined" && window.localStorage.getItem("merry360_currency") !== null;

      if (!user) {
        const defaultLanguage = detectNavigatorLanguage();
        applyTheme(themeRef.current);
        setLanguageState(defaultLanguage);
        // Auto-set currency from geo if user never chose one
        if (!hasExplicitCurrency && geoCountry && COUNTRY_CURRENCY_MAP[geoCountry]) {
          setCurrencyState(COUNTRY_CURRENCY_MAP[geoCountry]);
        } else if (!hasExplicitCurrency) {
          setCurrencyState("RWF");
        }
        await i18n.changeLanguage(defaultLanguage);
        setIsReady(true);
        return;
      }

      const { data, error } = await supabase
        .from("user_preferences")
        // Schema uses language/currency by default.
        .select("language, currency")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        const fallbackLanguage = detectNavigatorLanguage();
        setThemeState("light");
        applyTheme("light");
        setLanguageState(fallbackLanguage);
        setCurrencyState("RWF");
        await i18n.changeLanguage(fallbackLanguage);
        setIsReady(true);
        return;
      }

      const nextTheme = themeRef.current;
      const nextLanguage = (data?.language as AppLanguage | undefined) ?? detectNavigatorLanguage();
      // Use saved currency, or geo-based, or fallback to RWF
      const nextCurrency = (data?.currency as AppCurrency | undefined)
        ?? (!hasExplicitCurrency && geoCountry && COUNTRY_CURRENCY_MAP[geoCountry]
            ? COUNTRY_CURRENCY_MAP[geoCountry]
            : "RWF");

      setThemeState(nextTheme);
      applyTheme(nextTheme);

      setLanguageState(nextLanguage);
      await i18n.changeLanguage(nextLanguage);

      setCurrencyState(nextCurrency);

      setIsReady(true);
    };

    void run();
  }, [user, authLoading, applyTheme]);

  const setTheme = useCallback(
    async (next: ThemePreference) => {
      setThemeState(next);
      applyTheme(next);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("merry360_theme", next);
      }

      // Theme is persisted locally; DB schema may not include a theme column.
      if (!user) return;
    },
    [user, applyTheme]
  );

  const setLanguage = useCallback(
    async (next: AppLanguage) => {
      setLanguageState(next);
      await i18n.changeLanguage(next);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("merry360_language", next);
      }

      if (!user) return;
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, language: next }, { onConflict: "user_id" });
    },
    [user]
  );

  const setCurrency = useCallback(
    async (next: AppCurrency) => {
      setCurrencyState(next);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("merry360_currency", next);
      }

      if (!user) return;
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, currency: next }, { onConflict: "user_id" });
    },
    [user]
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, language, currency, detectedCountry, isReady, setTheme, setLanguage, setCurrency }),
    [theme, resolvedTheme, language, currency, detectedCountry, isReady, setTheme, setLanguage, setCurrency]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};
