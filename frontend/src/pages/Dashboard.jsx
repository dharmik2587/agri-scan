import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ScanLine, Calendar, ArrowUpRight } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import WeatherCard from "@/components/WeatherCard";
import client, { buildFileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";

const SEV_COLOR = {
  healthy: "bg-secondary/15 text-secondary border-secondary/40",
  mild: "bg-secondary/15 text-secondary border-secondary/40",
  moderate: "bg-accent/10 text-accent border-accent/40",
  severe: "bg-accent/20 text-accent border-accent/60",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [analyzing, setAnalyzing] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!user) return;
    client.get("/scans").then((r) => setRecent(r.data.slice(0, 4))).catch(() => {});
  }, [user]);

  const onAnalyze = async (payload) => {
    setAnalyzing(true);
    try {
      const { data } = await client.post("/diagnose", payload);
      // Cache in sessionStorage so guests can view the report too
      sessionStorage.setItem(`scan:${data.scan_id}`, JSON.stringify(data));
      toast.success("Diagnosis ready");
      navigate(`/scan/${data.scan_id}`);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Diagnosis failed. Please try again.";
      toast.error(typeof msg === "string" ? msg : "Diagnosis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="label-eyebrow text-muted-foreground">Dashboard</span>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            {user ? `नमस्ते, ${user.name.split(" ")[0]} 👋` : "Let's diagnose a plant"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Upload or snap a photo of a leaf, fruit, or crop and we'll take it from there.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 stagger">
          <UploadZone onAnalyze={onAnalyze} analyzing={analyzing} />

          <div className="mt-8 grid sm:grid-cols-3 gap-4 stagger">
            {[
              { label: "Scans this month", value: recent.length || 0, hint: user ? "Keep an eye on your fields" : "Sign in to track" },
              { label: "Confidence avg", value: recent.length ? `${Math.round((recent.reduce((s, r) => s + (r.disease_confidence || 0), 0) / recent.length) * 100)}%` : "—", hint: "Model precision" },
              { label: "Language", value: "EN · हिं", hint: "Switch in the top bar" },
            ].map((s, i) => (
              <div key={i} className="card-soft p-5">
                <div className="label-eyebrow text-muted-foreground">{s.label}</div>
                <div className="font-heading text-2xl font-semibold mt-2">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.hint}</div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <WeatherCard />
          <div className="card-soft p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold flex items-center gap-2"><ScanLine className="w-4 h-4 text-primary" /> {t.upload.recentScans}</h3>
              {user && recent.length > 0 && (
                <button onClick={() => navigate("/history")} className="text-xs text-primary font-medium inline-flex items-center gap-1">All <ArrowUpRight className="w-3 h-3" /></button>
              )}
            </div>
            {!user && (
              <p className="text-xs text-muted-foreground mt-3">
                <button onClick={() => navigate("/login")} className="underline underline-offset-2 text-primary">Sign in</button> to save scans and access them anytime.
              </p>
            )}
            <div className="mt-4 space-y-3">
              {recent.length === 0 ? (
                <div className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">
                  {t.upload.empty}
                </div>
              ) : (
                recent.map((r) => (
                  <button
                    key={r.scan_id}
                    onClick={() => { sessionStorage.setItem(`scan:${r.scan_id}`, JSON.stringify(r)); navigate(`/scan/${r.scan_id}`); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors text-left"
                  >
                    {r.image_url ? (
                      <img src={buildFileUrl(r.image_url)} alt="scan" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted grid place-items-center text-muted-foreground"><ScanLine className="w-4 h-4" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{r.plant_name} · {r.disease_name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`chip ${SEV_COLOR[r.severity] || SEV_COLOR.mild}`}>{r.severity}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
