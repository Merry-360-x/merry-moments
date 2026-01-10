import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();

  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(getSystemResolvedTheme());
  const [language, setLanguageState] = useState<AppLanguage>(detectNavigatorLanguage());
  const [currency, setCurrencyState] = useState<AppCurrency>("RWF");
  const [isReady, setIsReady] = useState(false);

  const applyTheme = useCallback((nextTheme: ThemePreference) => {
    const nextResolved = nextTheme === "system" ? getSystemResolvedTheme() : nextTheme;
    setResolvedTheme(nextResolved);
    document.documentElement.classList.toggle("dark", nextResolved === "dark");
  }, []);

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
      if (!user) {
        const defaultLanguage = detectNavigatorLanguage();
        setThemeState("system");
        applyTheme("system");
        setLanguageState(defaultLanguage);
        setCurrencyState("RWF");
        await i18n.changeLanguage(defaultLanguage);
        setIsReady(true);
        return;
      }

      const { data, error } = await supabase
        .from("user_preferences")
        .select("theme, locale, currency")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        const fallbackLanguage = detectNavigatorLanguage();
        setThemeState("system");
        applyTheme("system");
        setLanguageState(fallbackLanguage);
        setCurrencyState("RWF");
        await i18n.changeLanguage(fallbackLanguage);
        setIsReady(true);
        return;
      }

      const nextTheme = (data?.theme as ThemePreference | undefined) ?? "system";
      const nextLanguage = (data?.locale as AppLanguage | undefined) ?? detectNavigatorLanguage();
      const nextCurrency = (data?.currency as AppCurrency | undefined) ?? "RWF";

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

      if (!user) return;
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, theme: next }, { onConflict: "user_id" });
    },
    [user, applyTheme]
  );

  const setLanguage = useCallback(
    async (next: AppLanguage) => {
      setLanguageState(next);
      await i18n.changeLanguage(next);

      if (!user) return;
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, locale: next }, { onConflict: "user_id" });
    },
    [user]
  );

  const setCurrency = useCallback(
    async (next: AppCurrency) => {
      setCurrencyState(next);

      if (!user) return;
      await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, currency: next }, { onConflict: "user_id" });
    },
    [user]
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, language, currency, isReady, setTheme, setLanguage, setCurrency }),
    [theme, resolvedTheme, language, currency, isReady, setTheme, setLanguage, setCurrency]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};
