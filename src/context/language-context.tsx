
"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '@/lib/translations';

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.en;
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("salesphere_lang") as Language;
    if (saved) setLangState(saved);
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("salesphere_lang", newLang);
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = translations[lang];

  if (!mounted) return null;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      <div dir={dir} className={lang === "ar" ? "font-sans" : "font-body"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
