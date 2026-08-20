import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Leaf, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { NAV } from "@/constants/testIds";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const links = [
    { to: "/dashboard", label: t.dashboard, testid: NAV.linkDashboard },
    { to: "/advisor", label: t.advisor, testid: NAV.linkAdvisor },
    { to: "/calculator", label: t.calculator, testid: NAV.linkCalculator },
    { to: "/market", label: t.market, testid: NAV.linkMarket },
    ...(user ? [{ to: "/history", label: t.history, testid: NAV.linkHistory }] : []),
    ...(user ? [{ to: "/profile", label: t.profile, testid: NAV.linkProfile }] : []),
  ];

  return (
    <div className="App min-h-screen flex flex-col">
      <header data-testid={NAV.root} className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" data-testid={NAV.logo} className="flex items-center gap-2 group">
            <span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm group-hover:rotate-[-6deg] transition-transform">
              <Leaf className="w-4 h-4" />
            </span>
            <span className="font-heading text-xl font-semibold tracking-tight">{t.appName}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                data-testid={l.testid}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive ? "bg-primary/8 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              data-testid={NAV.langToggle}
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="chip hover:bg-muted"
              title="Toggle language"
            >
              {lang === "en" ? "EN · हिं" : "हिं · EN"}
            </button>
            {user ? (
              <button data-testid={NAV.signOut} onClick={() => { logout(); navigate("/"); }} className="btn-outline hidden sm:inline-flex items-center gap-2 text-sm">
                <LogOut className="w-4 h-4" /> {t.signOut}
              </button>
            ) : (
              <Link to="/login" data-testid={NAV.signIn} className="btn-primary text-sm hidden sm:inline-flex">
                {t.signIn}
              </Link>
            )}
            <button onClick={() => setOpen((o) => !o)} className="md:hidden w-10 h-10 grid place-items-center rounded-full border border-border bg-white">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-border bg-white">
            <div className="max-w-7xl mx-auto px-5 py-3 flex flex-col gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  data-testid={`${l.testid}-mobile`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium ${
                      isActive ? "bg-primary/8 text-primary" : "text-foreground hover:bg-muted"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {user ? (
                <button
                  onClick={() => { logout(); setOpen(false); navigate("/"); }}
                  className="text-left px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted"
                >
                  {t.signOut}
                </button>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-primary">
                  {t.signIn}
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-white/40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row items-center gap-2 justify-between">
          <span>© 2026 AgriScan · Grown for farmers</span>
          <span className="label-eyebrow text-muted-foreground">Made with soil, sun & code</span>
        </div>
      </footer>
    </div>
  );
}
