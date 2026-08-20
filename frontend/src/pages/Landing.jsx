import React from "react";
import { Link } from "react-router-dom";
import { Leaf, ScanLine, Calculator, TrendingUp, Camera, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { LANDING } from "@/constants/testIds";

const HERO_BG = "https://images.unsplash.com/photo-1556490496-45afc7b8b8e5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBmYXJtbGFuZCUyMHBhdHRlcm58ZW58MHx8fHwxNzg2OTY0ODkzfDA&ixlib=rb-4.1.0&q=85";
const LEAF_IMG = "https://images.unsplash.com/photo-1519370855830-34c503c41d0f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxwbGFudCUyMGxlYWYlMjBtYWNybyUyMHRleHR1cmV8ZW58MHx8fHwxNzg2OTY0ODkzfDA&ixlib=rb-4.1.0&q=85";
const HANDS_IMG = "https://images.unsplash.com/photo-1590682680695-43b964a3ae17?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxmYXJtZXIlMjBoYW5kcyUyMHNvaWx8ZW58MHx8fHwxNzg2OTY0ODkxfDA&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  const { t } = useLang();
  const { user } = useAuth();

  const features = [
    { icon: ScanLine, title: "AI Plant Diagnosis", body: "Snap a photo, get a lab-grade report in seconds." },
    { icon: Calculator, title: "Dose Calculator", body: "Exact fertilizer & pesticide amounts, in your unit." },
    { icon: TrendingUp, title: "Mandi Prices", body: "Live crop prices with 90-day trend charts." },
  ];

  const steps = [
    { n: "01", title: "Upload a photo", body: "Drag, drop or use your camera." },
    { n: "02", title: "Get a diagnosis", body: "Disease name, severity, confidence." },
    { n: "03", title: "Follow the plan", body: "Fertilizer, prevention, treatment." },
  ];

  return (
    <div data-testid={LANDING.root} className="fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-[0.18]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-16 sm:pt-24 sm:pb-24 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <span className="chip label-eyebrow"><Leaf className="w-3 h-3 text-secondary" /> Plant health · Powered by Claude Sonnet 5</span>
            <h1 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Diagnose your crop.<br />
              <span className="text-primary">Save the harvest.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t.tagline}. Upload a leaf, get a clear diagnosis, exact dose recommendations and mandi prices — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? "/dashboard" : "/dashboard"} data-testid={LANDING.getStarted} className="btn-primary inline-flex items-center gap-2">
                {t.getStarted} <ArrowRight className="w-4 h-4" />
              </Link>
              {!user && (
                <Link to="/login" data-testid={LANDING.signIn} className="btn-outline inline-flex items-center gap-2">
                  {t.signIn}
                </Link>
              )}
              <Link to="/dashboard" data-testid={LANDING.continueGuest} className="text-sm px-4 py-2 self-center text-muted-foreground hover:text-foreground">
                {t.continueAsGuest} →
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-secondary" /> Free to try</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-secondary" /> Works on any phone</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-secondary" /> English & हिंदी</div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="card-soft p-3">
                <img src={LEAF_IMG} alt="leaf" className="w-full h-72 sm:h-96 object-cover rounded-xl" />
                <div className="absolute left-6 bottom-6 right-6 card-soft p-4 flex items-center gap-3 backdrop-blur">
                  <span className="w-10 h-10 grid place-items-center rounded-full bg-secondary/20 text-primary"><Sparkles className="w-5 h-5" /></span>
                  <div className="flex-1">
                    <div className="text-xs label-eyebrow text-muted-foreground">Live diagnosis</div>
                    <div className="text-sm font-semibold">Tomato · Early Blight · 87% confidence</div>
                  </div>
                  <span className="chip text-accent border-accent/40 bg-accent/10">Moderate</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-4 hidden sm:flex items-center gap-2 chip">
                <Camera className="w-3.5 h-3.5" /> Snap · Scan · Solve
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="max-w-2xl">
          <span className="label-eyebrow text-muted-foreground">Three simple steps</span>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-semibold tracking-tight">From confused to confident in a minute.</h2>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-6 stagger">
          {steps.map((s) => (
            <div key={s.n} className="card-soft p-8">
              <div className="label-eyebrow text-secondary">Step {s.n}</div>
              <h3 className="mt-3 font-heading text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
        <div className="grid md:grid-cols-3 gap-6 stagger">
          {features.map((f, i) => (
            <div key={i} data-testid={LANDING.featureCard} className="card-soft p-8 relative overflow-hidden">
              <div className="w-11 h-11 rounded-xl bg-primary/8 grid place-items-center text-primary">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground">
          <img src={HANDS_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="relative p-10 sm:p-14 grid sm:grid-cols-2 gap-10 items-center">
            <div>
              <span className="label-eyebrow text-secondary">Ready when you are</span>
              <h3 className="mt-3 font-heading text-3xl sm:text-4xl font-semibold tracking-tight">Your first scan is on us.</h3>
              <p className="mt-3 text-sm sm:text-base text-primary-foreground/85 max-w-md">
                No forms, no sign-up. Just point, shoot, and let AgriScan handle the rest.
              </p>
            </div>
            <div className="flex sm:justify-end">
              <Link to="/dashboard" className="btn-outline inline-flex items-center gap-2 !bg-white !text-primary">
                <Camera className="w-4 h-4" /> Start scanning
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
