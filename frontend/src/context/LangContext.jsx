import React, { createContext, useContext, useEffect, useState } from "react";
import dict from "@/lib/i18n";
import client from "@/lib/api";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("agriscan_lang") || "en");

  useEffect(() => {
    localStorage.setItem("agriscan_lang", lang);
    document.documentElement.lang = lang;
    // Best-effort persist for logged-in users
    if (localStorage.getItem("agriscan_token")) {
      client.post("/auth/language", { language: lang }).catch(() => {});
    }
  }, [lang]);

  const t = dict[lang] || dict.en;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
