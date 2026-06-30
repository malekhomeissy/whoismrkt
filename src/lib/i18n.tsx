import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { en } from "./translations/en";
import { ar } from "./translations/ar";

export type Lang = "en" | "ar";

const TRANSLATIONS: Record<Lang, Record<string, string>> = { en, ar };

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
}

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
  dir: "ltr",
  isRTL: false,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem("mrkt_lang") as Lang) ?? "en";
    } catch {
      return "en";
    }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("mrkt_lang", l); } catch {}
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const str = TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
    return interpolate(str, vars);
  }, [lang]);

  const dir = lang === "ar" ? "rtl" : "ltr" as "ltr" | "rtl";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir, isRTL: dir === "rtl" }}>
      {children}
    </I18nContext.Provider>
  );
}
