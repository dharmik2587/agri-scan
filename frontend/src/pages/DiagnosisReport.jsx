import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Calculator, Leaf, ShieldAlert, Sprout, Beaker, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import client, { buildFileUrl } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { DIAG } from "@/constants/testIds";

const SEV_STYLE = {
  healthy: { chip: "bg-secondary/15 text-secondary border-secondary/40", bar: "bg-secondary", icon: CheckCircle2 },
  mild: { chip: "bg-secondary/15 text-secondary border-secondary/40", bar: "bg-secondary", icon: CheckCircle2 },
  moderate: { chip: "bg-accent/10 text-accent border-accent/40", bar: "bg-accent/70", icon: AlertTriangle },
  severe: { chip: "bg-accent/20 text-accent border-accent/60", bar: "bg-accent", icon: ShieldAlert },
};

export default function DiagnosisReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = sessionStorage.getItem(`scan:${id}`);
    if (cached) {
      setScan(JSON.parse(cached));
      setLoading(false);
      return;
    }
    if (user) {
      client.get(`/scans/${id}`).then((r) => setScan(r.data)).catch(() => setErr("Scan not found")).finally(() => setLoading(false));
    } else {
      setErr("Scan not available. Guests can only view a scan right after diagnosis.");
      setLoading(false);
    }
  }, [id, user]);

  if (loading) return <div className="max-w-4xl mx-auto p-10 text-center text-muted-foreground">Loading report…</div>;
  if (err || !scan) return (
    <div className="max-w-4xl mx-auto p-10 text-center">
      <p className="text-muted-foreground">{err || "Not found"}</p>
      <Link to="/dashboard" className="btn-primary mt-4 inline-flex">Back to dashboard</Link>
    </div>
  );

  const sev = SEV_STYLE[scan.severity] || SEV_STYLE.mild;
  const SevIcon = sev.icon;
  const confidencePct = Math.round((scan.disease_confidence || 0) * 100);

  return (
    <div data-testid={DIAG.report} className="max-w-6xl mx-auto px-5 sm:px-8 py-10 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button data-testid={DIAG.backDashboard} onClick={() => navigate("/dashboard")} className="btn-outline inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t.diagnosis.backHome}
        </button>
        <button data-testid={DIAG.openCalculator} onClick={() => navigate(`/calculator?crop=${encodeURIComponent(scan.plant_name)}&severity=${scan.severity}`)} className="btn-primary inline-flex items-center gap-2 text-sm">
          <Calculator className="w-4 h-4" /> {t.diagnosis.openCalc}
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 stagger">
          <div className="card-soft overflow-hidden">
            {scan.image_url ? (
              <img src={buildFileUrl(scan.image_url)} alt="scan" className="w-full aspect-square object-cover" />
            ) : (
              <div className="aspect-square bg-muted grid place-items-center text-muted-foreground">
                <Leaf className="w-8 h-8" />
              </div>
            )}
            <div className="p-5">
              <span className="label-eyebrow text-muted-foreground">Plant</span>
              <h1 data-testid={DIAG.plantName} className="font-heading text-2xl font-semibold mt-1">{scan.plant_name}</h1>
              {scan.species && <p className="text-xs text-muted-foreground italic">{scan.species}</p>}
              <div className="mt-4">
                <span className="label-eyebrow text-muted-foreground">{t.diagnosis.summary}</span>
                <p className="text-sm mt-2 leading-relaxed">{scan.summary}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6 stagger">
          <div className="card-soft p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="label-eyebrow text-muted-foreground">Detected</span>
                <h2 data-testid={DIAG.diseaseName} className="font-heading text-2xl font-semibold mt-1">{scan.disease_name}</h2>
                {scan.affected_area && <p className="text-sm text-muted-foreground mt-1">{scan.affected_area}</p>}
              </div>
              <span data-testid={DIAG.severityBadge} className={`chip inline-flex items-center gap-1 ${sev.chip}`}>
                <SevIcon className="w-3.5 h-3.5" /> {t.severityLabels[scan.severity] || scan.severity}
              </span>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span className="label-eyebrow">{t.diagnosis.confidence}</span>
                <span data-testid={DIAG.confidenceValue} className="font-semibold text-foreground">{confidencePct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${sev.bar} transition-all`} style={{ width: `${confidencePct}%` }} />
              </div>
            </div>
          </div>

          <div data-testid={DIAG.fertilizerBlock} className="card-soft p-6">
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-lg font-semibold">{t.diagnosis.fertilizer}</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="chip">Recommended · {scan.fertilizer?.name}</span>
              {scan.fertilizer?.npk_ratio && <span className="chip bg-secondary/15 text-primary border-secondary/40">NPK {scan.fertilizer.npk_ratio}</span>}
            </div>
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <div>
                <span className="label-eyebrow text-muted-foreground">{t.diagnosis.organic}</span>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {(scan.fertilizer?.organic_options || []).map((x, i) => (
                    <li key={i} className="flex gap-2"><span className="text-secondary">•</span>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="label-eyebrow text-muted-foreground">{t.diagnosis.chemical}</span>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {(scan.fertilizer?.chemical_options || []).map((x, i) => (
                    <li key={i} className="flex gap-2"><span className="text-accent">•</span>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div data-testid={DIAG.preventionBlock} className="card-soft p-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-lg font-semibold">{t.diagnosis.prevention}</h3>
            </div>
            <div className="mt-4 grid sm:grid-cols-3 gap-4">
              {[
                { key: "cultural", label: t.diagnosis.cultural, dot: "text-secondary" },
                { key: "biological", label: t.diagnosis.biological, dot: "text-primary" },
                { key: "chemical", label: t.diagnosis.chemical, dot: "text-accent" },
              ].map((g) => (
                <div key={g.key}>
                  <span className="label-eyebrow text-muted-foreground">{g.label}</span>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {(scan.pest_prevention?.[g.key] || []).map((x, i) => (
                      <li key={i} className="flex gap-2"><span className={g.dot}>•</span>{x}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div data-testid={DIAG.treatmentBlock} className="card-soft p-6">
            <div className="flex items-center gap-2">
              <Beaker className="w-5 h-5 text-accent" />
              <h3 className="font-heading text-lg font-semibold">{t.diagnosis.treatment}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{scan.treatment}</p>
            <button onClick={() => navigate(`/market?crop=${encodeURIComponent(scan.plant_name)}`)} className="mt-4 inline-flex items-center gap-2 text-sm text-primary font-medium">
              <TrendingUp className="w-4 h-4" /> See mandi prices for {scan.plant_name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
