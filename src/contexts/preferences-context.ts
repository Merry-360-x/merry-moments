import { createContext } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type AppLanguage = "en" | "rw" | "fr" | "sw" | "zh";
export type AppCurrency = "RWF" | "USD" | "EUR";

export type PreferencesContextType = {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  language: AppLanguage;
  currency: AppCurrency;
  isReady: boolean;
  setTheme: (next: ThemePreference) => Promise<void>;
  setLanguage: (next: AppLanguage) => Promise<void>;
  setCurrency: (next: AppCurrency) => Promise<void>;
};

export const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);
