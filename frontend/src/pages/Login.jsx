import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Leaf, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { LOGIN, REGISTER } from "@/constants/testIds";

export default function Login() {
  const { login, register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      toast.success("Welcome to AgriScan");
      navigate("/dashboard");
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Something went wrong";
      toast.error(typeof msg === "string" ? msg : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const google = () => {
    const googleAuthUrl = process.env.REACT_APP_GOOGLE_AUTH_URL;
    if (!googleAuthUrl) {
      toast.info("Google sign-in is not configured. You can still sign in with email.");
      return;
    }
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `${googleAuthUrl}?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="max-w-md mx-auto px-5 sm:px-8 py-14 sm:py-20 fade-in">
      <Link to="/" className="flex items-center gap-2 justify-center mb-8">
        <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
          <Leaf className="w-5 h-5" />
        </span>
        <span className="font-heading text-2xl font-semibold tracking-tight">{t.appName}</span>
      </Link>
      <div className="card-soft p-8">
        <div className="flex bg-muted rounded-full p-1 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-sm rounded-full font-medium transition-colors ${mode === "login" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t.signIn}
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-2 text-sm rounded-full font-medium transition-colors ${mode === "register" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t.signUp}
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="label-eyebrow text-muted-foreground">{t.name}</label>
              <div className="mt-2 flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-white">
                <User className="w-4 h-4 text-muted-foreground" />
                <input
                  data-testid={REGISTER.nameInput}
                  className="flex-1 outline-none text-sm bg-transparent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                />
              </div>
            </div>
          )}
          <div>
            <label className="label-eyebrow text-muted-foreground">{t.email}</label>
            <div className="mt-2 flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-white">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <input
                data-testid={mode === "login" ? LOGIN.emailInput : REGISTER.emailInput}
                type="email"
                className="flex-1 outline-none text-sm bg-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@farm.in"
              />
            </div>
          </div>
          <div>
            <label className="label-eyebrow text-muted-foreground">{t.password}</label>
            <div className="mt-2 flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-white">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <input
                data-testid={mode === "login" ? LOGIN.passwordInput : REGISTER.passwordInput}
                type="password"
                className="flex-1 outline-none text-sm bg-transparent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            data-testid={mode === "login" ? LOGIN.submitButton : REGISTER.submitButton}
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-70"
          >
            {loading ? "Please wait…" : mode === "login" ? t.signIn : t.signUp}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] label-eyebrow text-muted-foreground">{t.orContinueWith}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button onClick={google} data-testid="login-google-button" className="btn-outline w-full inline-flex items-center justify-center gap-2">
          <img src="https://www.gstatic.com/marketing-cms/assets/images/d5/dc/cfe9ce8b4425b410b49b7f2dd3f3/g.webp=s96-fcrop64=1,00000000ffffffff-rw" alt="G" className="w-4 h-4" />
          {t.google}
        </button>

        <p className="mt-6 text-xs text-center text-muted-foreground">
          <Link to="/dashboard" className="underline underline-offset-2">Skip and continue as guest</Link>
        </p>
      </div>
    </div>
  );
}
