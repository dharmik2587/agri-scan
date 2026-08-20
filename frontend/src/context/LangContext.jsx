import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import dict, { LANGUAGES } from "@/lib/i18n";
import client from "@/lib/api";

const LangContext = createContext(null);

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

// Deep-merge two plain objects, with values from `override` taking precedence.
// Used so that partial translations (mr/ta/te/bn) inherit English keys they
// don't provide yet.
function deepMerge(base, override) {
  if (!isObject(base)) return override ?? base;
  const out = { ...base };
  for (const k of Object.keys(override || {})) {
    const bv = base[k];
    const ov = override[k];
    if (isObject(bv) && isObject(ov)) out[k] = deepMerge(bv, ov);
    else out[k] = ov;
  }
  return out;
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem("agriscan_lang");
    return LANGUAGES.some((l) => l.code === stored) ? stored : "en";
  });

  useEffect(() => {
    localStorage.setItem("agriscan_lang", lang);
    document.documentElement.lang = lang;
    if (localStorage.getItem("agriscan_token")) {
      client.post("/auth/language", { language: lang }).catch(() => {});
    }
  }, [lang]);

  const t = useMemo(() => deepMerge(dict.en, dict[lang] || {}), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
