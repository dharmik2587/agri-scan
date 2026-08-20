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
    if (LANGUAGES.some((l) => l.code === stored)) return stored;
    // First visit: try to match the browser's preferred language to a supported one.
    try {
      const candidates = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]);
      for (const raw of candidates) {
        const c = (raw || "").toLowerCase().split("-")[0];
        if (LANGUAGES.some((l) => l.code === c)) return c;
      }
    } catch {}
    return "en";
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
