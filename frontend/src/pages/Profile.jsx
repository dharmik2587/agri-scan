import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { PROFILE } from "@/constants/testIds";
import { User, Mail, Languages } from "lucide-react";

export default function Profile() {
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useLang();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div data-testid={PROFILE.page} className="max-w-3xl mx-auto px-5 sm:px-8 py-10 fade-in">
      <span className="label-eyebrow text-muted-foreground">Account</span>
      <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mt-2">{t.profile}</h1>

      <div className="mt-8 card-soft p-6">
        <div className="flex items-center gap-4">
          {user.picture ? (
            <img src={user.picture} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary grid place-items-center font-heading text-2xl font-semibold">
              {user.name?.[0]?.toUpperCase() || "F"}
            </div>
          )}
          <div>
            <div data-testid={PROFILE.nameField} className="font-heading text-xl font-semibold">{user.name}</div>
            <div data-testid={PROFILE.emailField} className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user.email}</div>
            <div className="text-[11px] text-muted-foreground mt-1 capitalize">Signed in via {user.auth_provider}</div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-lg font-semibold">Language</h3>
          </div>
          <div className="flex gap-2">
            <button
              data-testid={PROFILE.languageEn}
              onClick={() => setLang("en")}
              className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-colors ${lang === "en" ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-foreground hover:bg-muted"}`}
            >English</button>
            <button
              data-testid={PROFILE.languageHi}
              onClick={() => setLang("hi")}
              className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-colors ${lang === "hi" ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-foreground hover:bg-muted"}`}
            >हिंदी</button>
          </div>
        </div>
      </div>
    </div>
  );
}
