import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, Search, MapPin, Camera, X, Leaf, TestTube2, Sprout, Bug, Beaker,
  ShieldAlert, Landmark, Info, ChevronDown,
} from "lucide-react";
import client from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { ADVISOR } from "@/constants/testIds";

const MAX_BYTES = 10 * 1024 * 1024;

async function readAndCompress(file) {
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file.");
  if (file.size > MAX_BYTES) throw new Error("Image is over 10MB.");
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = dataUrl;
  });
  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function CropCombobox({ crops, value, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    if (!q) return crops.slice(0, 60);
    const ql = q.toLowerCase();
    return crops.filter((c) => c.toLowerCase().includes(ql)).slice(0, 60);
  }, [q, crops]);

  return (
    <div ref={ref} className="relative" data-testid={ADVISOR.cropCombobox}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-white text-sm text-left"
      >
        <Leaf className="w-4 h-4 text-primary shrink-0" />
        <span className={`flex-1 truncate ${value ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border flex items-center gap-2 bg-muted/40">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              data-testid={ADVISOR.cropSearchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search 100+ crops…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">No crop matches.</li>
            )}
            {filtered.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  data-testid={`${ADVISOR.cropOption}-${c.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                  onClick={() => { onChange(c); setOpen(false); setQ(""); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-primary/8 hover:text-primary ${value === c ? "text-primary font-medium bg-primary/8" : ""}`}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children, testid, tone = "primary" }) {
  const toneMap = {
    primary: "text-primary",
    accent: "text-accent",
    secondary: "text-secondary",
  };
  return (
    <div data-testid={testid} className="card-soft p-6">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${toneMap[tone]}`} />
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function KV({ k, v }) {
  if (!v) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-eyebrow text-muted-foreground">{k}</span>
      <span className="text-sm">{Array.isArray(v) ? v.join(", ") : v}</span>
    </div>
  );
}

export default function Advisor() {
  const { t, lang } = useLang();
  const [meta, setMeta] = useState({ crops: [], states: [] });
  const [districts, setDistricts] = useState([]);
  const [form, setForm] = useState({ crop: "", state: "", district: "", question: "" });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    client.get("/advisor/meta").then((r) => setMeta(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.state) { setDistricts([]); return; }
    client.get(`/advisor/districts?state=${encodeURIComponent(form.state)}`)
      .then((r) => setDistricts(r.data.districts))
      .catch(() => setDistricts([]));
  }, [form.state]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }));

  const attachPhoto = async (file) => {
    try {
      const b64 = await readAndCompress(file);
      setPhoto(b64);
    } catch (e) {
      toast.error(e.message || "Could not read image");
    }
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.crop || !form.state || !form.district) {
      toast.error("Please pick a crop, state, and locality.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await client.post("/advisor/query", {
        crop: form.crop,
        state: form.state,
        district: form.district,
        language: lang,
        question: form.question || null,
        image_base64: photo || null,
      });
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Advisor is currently busy. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const quickAsks = [
    "How do I improve soil health for this crop?",
    "Which fertilizer schedule suits my region?",
    "Common diseases in the current season?",
    "Which organic pesticide works best here?",
  ];

  return (
    <div data-testid={ADVISOR.page} className="max-w-7xl mx-auto px-5 sm:px-8 py-10 fade-in">
      <div className="max-w-3xl">
        <span className="label-eyebrow text-muted-foreground">Krishi Mitra</span>
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mt-2 flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-primary" /> {t.advisorPage.title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">{t.advisorPage.subtitle}</p>
      </div>

      <form onSubmit={submit} className="mt-8 card-soft p-6 grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <label className="label-eyebrow text-muted-foreground">{t.advisorPage.crop}</label>
          <div className="mt-2">
            <CropCombobox
              crops={meta.crops}
              value={form.crop}
              onChange={(c) => setForm((f) => ({ ...f, crop: c }))}
              placeholder={t.advisorPage.cropPlaceholder}
            />
          </div>
        </div>
        <div className="lg:col-span-4">
          <label className="label-eyebrow text-muted-foreground">{t.advisorPage.state}</label>
          <div className="mt-2 flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-white">
            <MapPin className="w-4 h-4 text-primary" />
            <select
              data-testid={ADVISOR.stateSelect}
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, district: "" }))}
              className="flex-1 outline-none bg-transparent text-sm"
            >
              <option value="">— {t.advisorPage.state} —</option>
              {meta.states.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
        </div>
        <div className="lg:col-span-4">
          <label className="label-eyebrow text-muted-foreground">{t.advisorPage.district}</label>
          <div className="mt-2 flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-white">
            <Landmark className="w-4 h-4 text-primary" />
            <select
              data-testid={ADVISOR.districtSelect}
              value={form.district}
              disabled={!form.state}
              onChange={setField("district")}
              className="flex-1 outline-none bg-transparent text-sm disabled:opacity-60"
            >
              <option value="">{form.state ? t.advisorPage.selectDistrict : t.advisorPage.selectState}</option>
              {districts.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        </div>

        <div className="lg:col-span-8">
          <label className="label-eyebrow text-muted-foreground">{t.advisorPage.question}</label>
          <textarea
            data-testid={ADVISOR.questionInput}
            rows={3}
            value={form.question}
            onChange={setField("question")}
            placeholder={t.advisorPage.questionPlaceholder}
            className="mt-2 w-full border border-border rounded-xl px-3 py-2.5 bg-white text-sm resize-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {quickAsks.map((q) => (
              <button
                key={q}
                type="button"
                data-testid={ADVISOR.quickAskButton}
                onClick={() => setForm((f) => ({ ...f, question: q }))}
                className="chip hover:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <label className="label-eyebrow text-muted-foreground">{t.advisorPage.photo}</label>
          <input
            ref={fileRef}
            data-testid={ADVISOR.photoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && attachPhoto(e.target.files[0])}
          />
          {!photo ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full border-2 border-dashed border-secondary/60 rounded-xl px-3 py-4 bg-[#F6F8F1] text-sm text-muted-foreground hover:text-foreground hover:border-secondary transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Add photo
            </button>
          ) : (
            <div className="mt-2 relative">
              <img src={photo} alt="preview" data-testid={ADVISOR.photoPreview} className="w-full h-28 object-cover rounded-xl border border-border" />
              <button type="button" data-testid={ADVISOR.clearPhoto} onClick={() => setPhoto(null)} className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-white/95 border border-border">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground max-w-xl">
            <Info className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
            Advice is generated by Claude Sonnet 5 with agronomy context. Prices & availability vary — verify with your local mandi or agri-department.
          </p>
          <button
            data-testid={ADVISOR.submit}
            type="submit"
            disabled={loading}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-70"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? t.advisorPage.loading : t.advisorPage.submit}
          </button>
        </div>
      </form>

      {loading && (
        <div data-testid={ADVISOR.loadingIndicator} className="mt-8 card-soft p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/8 text-primary grid place-items-center animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-heading text-base font-semibold">{t.advisorPage.loading}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Consulting soil, disease and mandi knowledge for {form.crop} in {form.district}, {form.state}…</div>
          </div>
        </div>
      )}

      {result && (
        <div ref={resultRef} data-testid={ADVISOR.result} className="mt-10 space-y-6 stagger">
          <div className="card-soft p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="label-eyebrow text-muted-foreground">Advisory · {result.crop}</span>
                <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
                  {result.district}, {result.state}
                </h2>
              </div>
              <span className="chip">{result.language?.toUpperCase() || "EN"}</span>
            </div>
            <p data-testid={ADVISOR.summary} className="mt-4 text-sm sm:text-base leading-relaxed">{result.summary}</p>
          </div>

          {result.soil && (
            <Section icon={TestTube2} title={t.advisorPage.soil} testid={ADVISOR.soilCard}>
              <div className="grid sm:grid-cols-3 gap-4">
                <KV k={t.advisorPage.soilType} v={result.soil.type} />
                <KV k={t.advisorPage.phRange} v={result.soil.ph_range} />
                <KV k={t.advisorPage.keyNutrients} v={result.soil.key_nutrients} />
              </div>
              {result.soil.recommendations?.length > 0 && (
                <div className="mt-4">
                  <span className="label-eyebrow text-muted-foreground">{t.advisorPage.soilRecs}</span>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {result.soil.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2"><span className="text-secondary">•</span>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {result.fertilizers?.length > 0 && (
            <Section icon={Sprout} title={t.advisorPage.fertilizers} testid={ADVISOR.fertilizersCard}>
              <div className="grid md:grid-cols-2 gap-4">
                {result.fertilizers.map((f, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-heading font-semibold">{f.name}</div>
                        {f.npk_ratio && <div className="text-xs text-muted-foreground">NPK {f.npk_ratio}</div>}
                      </div>
                      <span className={`chip ${f.type === "organic" ? "bg-secondary/15 text-secondary border-secondary/40" : "bg-accent/10 text-accent border-accent/40"}`}>
                        {f.type || "chemical"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <KV k={t.advisorPage.composition} v={f.chemical_composition} />
                      <KV k={t.advisorPage.dosage} v={f.dosage} />
                      <KV k={t.advisorPage.ingredients} v={f.ingredients} />
                      <KV k={t.advisorPage.price} v={f.price_range_inr} />
                    </div>
                    {f.purpose && <div className="mt-3 text-xs text-muted-foreground">{f.purpose}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {result.pesticides?.length > 0 && (
            <Section icon={Beaker} title={t.advisorPage.pesticides} testid={ADVISOR.pesticidesCard} tone="accent">
              <div className="grid md:grid-cols-2 gap-4">
                {result.pesticides.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-white">
                    <div className="font-heading font-semibold">{p.name}</div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <KV k={t.advisorPage.activeIngredient} v={p.active_ingredient} />
                      <KV k={t.advisorPage.dosage} v={p.dosage} />
                      <KV k={t.advisorPage.targets} v={p.targets} />
                      <KV k={t.advisorPage.price} v={p.price_range_inr} />
                    </div>
                    {p.precautions?.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {p.precautions.map((x, k) => <li key={k} className="flex gap-2"><span className="text-accent">•</span>{x}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {result.diseases?.length > 0 && (
            <Section icon={ShieldAlert} title={t.advisorPage.diseases} testid={ADVISOR.diseasesCard} tone="accent">
              <div className="grid md:grid-cols-2 gap-4">
                {result.diseases.map((d, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-white">
                    <div className="font-heading font-semibold">{d.name}</div>
                    {d.symptoms && <div className="text-xs text-muted-foreground mt-1">{d.symptoms}</div>}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <span className="label-eyebrow text-muted-foreground">{t.advisorPage.prevention}</span>
                        <ul className="mt-1 space-y-1 text-sm">{(d.prevention || []).map((x, k) => <li key={k} className="flex gap-2"><span className="text-secondary">•</span>{x}</li>)}</ul>
                      </div>
                      <div>
                        <span className="label-eyebrow text-muted-foreground">{t.advisorPage.treatment}</span>
                        <ul className="mt-1 space-y-1 text-sm">{(d.treatment || []).map((x, k) => <li key={k} className="flex gap-2"><span className="text-accent">•</span>{x}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {result.pests?.length > 0 && (
            <Section icon={Bug} title={t.advisorPage.pests} testid={ADVISOR.pestsCard} tone="accent">
              <div className="grid md:grid-cols-2 gap-4">
                {result.pests.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-white">
                    <div className="font-heading font-semibold">{p.name}</div>
                    {p.damage && <div className="text-xs text-muted-foreground mt-1">{p.damage}</div>}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <span className="label-eyebrow text-muted-foreground">{t.advisorPage.prevention}</span>
                        <ul className="mt-1 space-y-1 text-sm">{(p.prevention || []).map((x, k) => <li key={k} className="flex gap-2"><span className="text-secondary">•</span>{x}</li>)}</ul>
                      </div>
                      <div>
                        <span className="label-eyebrow text-muted-foreground">{t.advisorPage.control}</span>
                        <ul className="mt-1 space-y-1 text-sm">{(p.control || []).map((x, k) => <li key={k} className="flex gap-2"><span className="text-accent">•</span>{x}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {result.soil_problems?.length > 0 && (
            <Section icon={TestTube2} title={t.advisorPage.soilProblems} testid={ADVISOR.soilProblemsCard}>
              <div className="grid md:grid-cols-2 gap-4">
                {result.soil_problems.map((s, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-white">
                    <div className="font-heading font-semibold">{s.name}</div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <KV k={t.advisorPage.cause} v={s.cause} />
                      <KV k={t.advisorPage.remedy} v={s.remedy} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {result.safety_precautions?.length > 0 && (
            <Section icon={ShieldAlert} title={t.advisorPage.safety} testid={ADVISOR.safetyCard} tone="accent">
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {result.safety_precautions.map((x, i) => (
                  <li key={i} className="flex gap-2"><span className="text-accent">•</span>{x}</li>
                ))}
              </ul>
            </Section>
          )}

          {result.local_notes && (
            <Section icon={MapPin} title={t.advisorPage.localNotes} testid={ADVISOR.localNotesCard} tone="secondary">
              <p className="text-sm leading-relaxed">{result.local_notes}</p>
            </Section>
          )}

          {result.disclaimer && (
            <div className="text-xs text-muted-foreground italic px-2">{t.advisorPage.disclaimer}: {result.disclaimer}</div>
          )}
        </div>
      )}
    </div>
  );
}
