import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import rw from "./locales/rw.json";
import sw from "./locales/sw.json";
import zh from "./locales/zh.json";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  rw: { translation: rw },
  sw: { translation: sw },
  zh: { translation: zh },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "rw", "fr", "sw", "zh"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["navigator"],
      caches: [],
    },
    returnNull: false,
  });

export default i18n;
