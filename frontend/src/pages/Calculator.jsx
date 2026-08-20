import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calculator as CalcIcon, ShieldAlert, Beaker } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import client from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { CALC } from "@/constants/testIds";

const UNIT_OPTS = [
  { v: "acre", label: "Acre" },
  { v: "hectare", label: "Hectare" },
  { v: "sqm", label: "sq. m" },
];
const SEV_OPTS = ["mild", "moderate", "severe"];
const STAGE_OPTS = [
  { v: "seedling", label: "Seedling" },
  { v: "vegetative", label: "Vegetative" },
  { v: "flowering", label: "Flowering" },
  { v: "fruiting", label: "Fruiting" },
];

const NPK_COLORS = ["#244834", "#8CAE68", "#D36D4D"];

export default function CalculatorPage() {
  const [params] = useSearchParams();
  const { t } = useLang();
  const [crops, setCrops] = useState([]);
  const [form, setForm] = useState({
    crop_type: params.get("crop") || "Tomato",
    area: 1,
    area_unit: "acre",
    severity: params.get("severity") && params.get("severity") !== "healthy" ? params.get("severity") : "moderate",
    growth_stage: "vegetative",
    product_type: "fertilizer",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get("/calculator/crops").then((r) => setCrops(r.data.crops)).catch(() => setCrops(["Tomato", "Wheat", "Rice"]));
  }, []);

  const compute = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      const { data } = await client.post("/calculator", form);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const npkData = useMemo(() => {
    if (!result) return [];
    return [
      { name: "N", value: result.npk.n },
      { name: "P", value: result.npk.p },
      { name: "K", value: result.npk.k },
    ];
  }, [result]);

  const dosageData = useMemo(() => {
    if (!result) return [];
    return [
      { name: "Recommended", value: result.recommended_dosage_kg_per_ha },
      { name: "Applied (per ha)", value: +(result.quantity_kg_or_l / Math.max(form.area * (form.area_unit === "acre" ? 0.4047 : form.area_unit === "sqm" ? 0.0001 : 1), 0.0001)).toFixed(2) },
      { name: "Max Safe", value: result.max_safe_dosage_kg_per_ha },
    ];
  }, [result, form]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }));

  // Pre-computed stage labels to avoid visual-edits <span> injection inside <option>
  const stageOptions = STAGE_OPTS.map((s) => ({ v: s.v, label: t.stages[s.v] || s.label }));

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 fade-in">
      <div className="max-w-2xl">
        <span className="label-eyebrow text-muted-foreground">Tool</span>
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mt-2 flex items-center gap-3">
          <CalcIcon className="w-7 h-7 text-primary" /> {t.calc.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Enter your field details to get exact dose, cost and safety guidance.</p>
      </div>

      <div className="mt-8 grid lg:grid-cols-5 gap-6">
        <form data-testid={CALC.form} onSubmit={compute} className="lg:col-span-2 card-soft p-6 space-y-4">
          <div>
            <label className="label-eyebrow text-muted-foreground">{t.calc.crop}</label>
            <select data-testid={CALC.crop} value={form.crop_type} onChange={setField("crop_type")} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm">
              {crops.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-eyebrow text-muted-foreground">{t.calc.area}</label>
              <input data-testid={CALC.area} type="number" min={0.01} step={0.01} value={form.area} onChange={setField("area")} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm" />
            </div>
            <div>
              <label className="label-eyebrow text-muted-foreground">{t.calc.unit}</label>
              <select data-testid={CALC.unit} value={form.area_unit} onChange={setField("area_unit")} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm">
                {UNIT_OPTS.map((u) => (<option key={u.v} value={u.v}>{u.label}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-eyebrow text-muted-foreground">{t.calc.severity}</label>
            <div className="mt-2 flex gap-2">
              {SEV_OPTS.map((s) => (
                <button type="button" key={s} data-testid={`${CALC.severity}-${s}`} onClick={() => setForm((f) => ({ ...f, severity: s }))} className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium capitalize transition-colors ${form.severity === s ? "border-primary bg-primary/8 text-primary" : "border-border bg-white text-muted-foreground hover:bg-muted"}`}>
                  {t.severityLabels[s] || s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-eyebrow text-muted-foreground">{t.calc.stage}</label>
            <select data-testid={CALC.stage} value={form.growth_stage} onChange={setField("growth_stage")} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm">
              {stageOptions.map((s) => (<option key={s.v} value={s.v}>{s.label}</option>))}
            </select>
          </div>
          <div>
            <label className="label-eyebrow text-muted-foreground">{t.calc.product}</label>
            <select data-testid={CALC.product} value={form.product_type} onChange={setField("product_type")} className="mt-2 w-full border border-border rounded-xl px-3 py-2 bg-white text-sm">
              <option value="fertilizer">Fertilizer</option>
              <option value="pesticide">Pesticide</option>
            </select>
          </div>
          <button data-testid={CALC.submit} type="submit" disabled={loading} className="btn-primary w-full inline-flex justify-center items-center gap-2 disabled:opacity-70">
            {loading ? "Calculating…" : t.calc.compute}
          </button>
        </form>

        {result && (
          <div data-testid={CALC.resultCard} className="lg:col-span-3 space-y-6 stagger">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card-soft p-5">
                <div className="label-eyebrow text-muted-foreground">{t.calc.qty}</div>
                <div data-testid={CALC.quantityValue} className="font-heading text-3xl font-semibold mt-2">{result.quantity_kg_or_l} <span className="text-base text-muted-foreground">{result.unit}</span></div>
              </div>
              <div className="card-soft p-5">
                <div className="label-eyebrow text-muted-foreground">{t.calc.water}</div>
                <div className="font-heading text-3xl font-semibold mt-2">{result.water_dilution_l} <span className="text-base text-muted-foreground">L</span></div>
                <div className="text-xs text-muted-foreground mt-1">{result.mix_ratio}</div>
              </div>
              <div className="card-soft p-5">
                <div className="label-eyebrow text-muted-foreground">{t.calc.cost}</div>
                <div data-testid={CALC.costValue} className="font-heading text-3xl font-semibold mt-2">₹{result.estimated_cost_inr.toLocaleString("en-IN")}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.calc.reentry} {result.reentry_interval_hours} {t.calc.hours}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div data-testid={CALC.dosageChart} className="card-soft p-5">
                <div className="label-eyebrow text-muted-foreground mb-2">{t.calc.dosage} (kg/ha)</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dosageData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5B6B60" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#5B6B60" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8E9E4" }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {dosageData.map((_, i) => (<Cell key={i} fill={i === 2 ? "#D36D4D" : i === 1 ? "#244834" : "#8CAE68"} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div data-testid={CALC.npkChart} className="card-soft p-5">
                <div className="label-eyebrow text-muted-foreground mb-2">{t.calc.npk}</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={npkData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4}>
                        {npkData.map((_, i) => (<Cell key={i} fill={NPK_COLORS[i]} />))}
                      </Pie>
                      <Legend />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8E9E4" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card-soft p-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-accent" />
                <h3 className="font-heading text-lg font-semibold">{t.calc.warnings}</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {result.safety_warnings.map((w, i) => (
                  <li key={i} className="flex gap-2"><Beaker className="w-4 h-4 text-accent shrink-0 mt-0.5" /><span>{w}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
