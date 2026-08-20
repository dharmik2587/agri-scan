import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import client, { buildFileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { HISTORY } from "@/constants/testIds";

const SEV_COLOR = {
  healthy: "bg-secondary/15 text-secondary border-secondary/40",
  mild: "bg-secondary/15 text-secondary border-secondary/40",
  moderate: "bg-accent/10 text-accent border-accent/40",
  severe: "bg-accent/20 text-accent border-accent/60",
};

export default function History() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    client.get("/scans").then((r) => setScans(r.data)).catch(() => {});
  }, [user, loading, navigate]);

  const del = async (id) => {
    setBusy(true);
    try {
      await client.delete(`/scans/${id}`);
      setScans((s) => s.filter((x) => x.scan_id !== id));
      toast.success("Scan deleted");
    } finally { setBusy(false); }
  };

  return (
    <div data-testid={HISTORY.page} className="max-w-7xl mx-auto px-5 sm:px-8 py-10 fade-in">
      <span className="label-eyebrow text-muted-foreground">Your archive</span>
      <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mt-2">{t.history} · {scans.length}</h1>
      <p className="text-sm text-muted-foreground mt-2">Every scan you've saved lives here for review anytime.</p>

      {scans.length === 0 ? (
        <div data-testid={HISTORY.empty} className="mt-10 border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
          {t.upload.empty}
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {scans.map((s) => (
            <div key={s.scan_id} data-testid={HISTORY.item} className="card-soft overflow-hidden flex flex-col">
              {s.image_url ? (
                <img src={buildFileUrl(s.image_url)} alt="" className="w-full h-40 object-cover" />
              ) : (
                <div className="h-40 bg-muted grid place-items-center text-muted-foreground"><ScanLine className="w-6 h-6" /></div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-heading text-lg font-semibold">{s.plant_name}</div>
                    <div className="text-xs text-muted-foreground">{s.disease_name}</div>
                  </div>
                  <span className={`chip ${SEV_COLOR[s.severity] || SEV_COLOR.mild} capitalize`}>{s.severity}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-3">{new Date(s.created_at).toLocaleString()}</div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => { sessionStorage.setItem(`scan:${s.scan_id}`, JSON.stringify(s)); navigate(`/scan/${s.scan_id}`); }} className="btn-outline text-xs">Open</button>
                  <button disabled={busy} onClick={() => del(s.scan_id)} className="ml-auto inline-flex items-center gap-1 text-xs text-accent px-3 py-2 rounded-full hover:bg-accent/10">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
