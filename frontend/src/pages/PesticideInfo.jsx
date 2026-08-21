import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Beaker, Camera, X, Sparkles, ShieldAlert, HardHat, Clock, Wind, Droplets,
  Skull, PackageOpen, Share2, Printer, TestTube2, Info, AlertTriangle,
} from "lucide-react";
import client from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { PESTICIDE } from "@/constants/testIds";
import VoiceInput from "@/components/VoiceInput";
import { shareContent } from "@/lib/share";
import { printElementBySelector } from "@/lib/print";

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
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.86);
}

const TOX_STYLE = {
  Red: "bg-accent/20 text-accent border-accent/60",
  Yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Blue: "bg-blue-50 text-blue-700 border-blue-200",
  Green: "bg-secondary/15 text-secondary border-secondary/40",
};

const CAT_STYLE = {
  insecticide: "bg-primary/8 text-primary border-primary/40",
  fungicide: "bg-secondary/15 text-secondary border-secondary/40",
  herbicide: "bg-accent/10 text-accent border-accent/40",
  acaricide: "bg-primary/8 text-primary border-primary/40",
  nematicide: "bg-primary/8 text-primary border-primary/40",
  rodenticide: "bg-accent/20 text-accent border-accent/60",
  "bio-pesticide": "bg-secondary/15 text-secondary border-secondary/40",
  unknown: "bg-muted text-muted-foreground border-border",
};

function Section({ icon: Icon, title, children, testid, tone = "primary" }) {
  const toneMap = { primary: "text-primary", accent: "text-accent", secondary: "text-secondary" };
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
  if (!v && v !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-eyebrow text-muted-foreground">{k}</span>
      <span className="text-sm">{Array.isArray(v) ? v.join(", ") : v}</span>
    </div>
  );
}

export default function PesticideInfo() {
  const { t, lang } = useLang();
  const [mode, setMode] = useState("name"); // 'name' | 'photo'
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

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
    if (mode === "name" && !name.trim()) { toast.error("Please type a pesticide name"); return; }
    if (mode === "photo" && !photo) { toast.error("Please attach a photo"); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await client.post("/pesticide/lookup", {
        name: mode === "name" ? name.trim() : null,
        image_base64: mode === "photo" ? photo : null,
        language: lang,
      });
      setResult(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Lookup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const buildShareText = () => {
    if (!result) return "";
    const parts = [
      `🧪 Pesticide info · ${result.product_name}`,
      result.category ? `Category: ${result.category}` : "",
      result.active_ingredients?.length ? `Active: ${result.active_ingredients.map((a) => `${a.name} ${a.concentration || ""}`).join(", ")}` : "",
      result.toxicity_class ? `Toxicity: ${result.toxicity_class}` : "",
      result.dosage?.rate ? `Dosage: ${result.dosage.rate}` : "",
      result.re_entry_interval_hours ? `Re-entry: ${result.re_entry_interval_hours}h` : "",
      result.pre_harvest_interval_days ? `PHI: ${result.pre_harvest_interval_days} days` : "",
      "",
      "Precautions:",
      ...(result.precautions || []).slice(0, 5).map((p) => `• ${p}`),
      "",
      "— Shared via AgriScan",
    ].filter(Boolean);
    return parts.join("\n");
  };

  const confidence = useMemo(() => Math.round((result?.identification_confidence || 0) * 100), [result]);

  return (
    <div data-testid={PESTICIDE.page} className="max-w-7xl mx-auto px-5 sm:px-8 py-10 fade-in">
      <div className="max-w-3xl">
        <span className="label-eyebrow text-muted-foreground">Product safety</span>
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mt-2 flex items-center gap-3">
          <Beaker className="w-7 h-7 text-primary" /> {t.pesticidePage.title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">{t.pesticidePage.subtitle}</p>
      </div>

      <form onSubmit={submit} className="mt-8 card-soft p-6">
        <div className="flex bg-muted rounded-full p-1 max-w-sm mb-6">
          <button
            type="button"
            data-testid={PESTICIDE.tabName}
            onClick={() => setMode("name")}
            className={`flex-1 py-2 px-3 text-sm rounded-full font-medium transition-colors inline-flex items-center justify-center gap-2 ${mode === "name" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <TestTube2 className="w-4 h-4" /> {t.pesticidePage.byName}
          </button>
          <button
            type="button"
            data-testid={PESTICIDE.tabPhoto}
            onClick={() => setMode("photo")}
            className={`flex-1 py-2 px-3 text-sm rounded-full font-medium transition-colors inline-flex items-center justify-center gap-2 ${mode === "photo" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <Camera className="w-4 h-4" /> {t.pesticidePage.byPhoto}
          </button>
        </div>

        {mode === "name" ? (
          <div className="max-w-2xl">
            <label className="label-eyebrow text-muted-foreground">{t.pesticidePage.byName}</label>
            <div className="mt-2 relative">
              <input
                data-testid={PESTICIDE.nameInput}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.pesticidePage.namePlaceholder}
                className="w-full border border-border rounded-xl px-3 py-3 pr-14 bg-white text-sm"
              />
              <div className="absolute top-1.5 right-2">
                <VoiceInput
                  language={lang}
                  testid={PESTICIDE.voiceInput}
                  size="sm"
                  onTranscript={(text) => setName((n) => (n ? n + " " + text : text))}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Try: Coragen, Roundup, Mancozeb, Confidor, Cypermethrin.</p>
          </div>
        ) : (
          <div className="max-w-2xl">
            <label className="label-eyebrow text-muted-foreground">{t.pesticidePage.byPhoto}</label>
            <input
              ref={fileRef}
              data-testid={PESTICIDE.photoInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && attachPhoto(e.target.files[0])}
            />
            {!photo ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full border-2 border-dashed border-secondary/60 rounded-xl px-3 py-8 bg-[#F6F8F1] text-sm text-muted-foreground hover:text-foreground hover:border-secondary transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" /> Snap or upload the pesticide label
              </button>
            ) : (
              <div className="mt-2 relative max-w-xs">
                <img
                  src={photo}
                  alt="preview"
                  data-testid={PESTICIDE.photoPreview}
                  className="w-full h-48 object-cover rounded-xl border border-border"
                />
                <button
                  type="button"
                  data-testid={PESTICIDE.photoClear}
                  onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-white/95 border border-border"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground max-w-xl">
            <Info className="w-3.5 h-3.5 inline mr-1" />
            Info powered by Claude Sonnet 5. Prices & specifications vary — always follow the product label and consult your local agri extension officer.
          </p>
          <button
            type="submit"
            data-testid={PESTICIDE.submit}
            disabled={loading}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-70"
          >
            <Sparkles className="w-4 h-4" /> {loading ? t.pesticidePage.loading : t.pesticidePage.submit}
          </button>
        </div>
      </form>

      {loading && (
        <div data-testid={PESTICIDE.loading} className="mt-8 card-soft p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/8 text-primary grid place-items-center animate-pulse">
            <Beaker className="w-5 h-5" />
          </div>
          <div>
            <div className="font-heading text-base font-semibold">{t.pesticidePage.loading}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Cross-checking active ingredient, dosage, toxicity and safety intervals…</div>
          </div>
        </div>
      )}

      {result && (
        <div data-testid={PESTICIDE.result} data-print-root className="mt-10 space-y-6 stagger">
          <div className="card-soft p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="label-eyebrow text-muted-foreground">{t.pesticidePage.identifiedAs}</span>
                <h2 data-testid={PESTICIDE.productName} className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight mt-1">{result.product_name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span data-testid={PESTICIDE.categoryBadge} className={`chip capitalize ${CAT_STYLE[result.category] || CAT_STYLE.unknown}`}>
                    {result.category || "Unknown"}
                  </span>
                  {result.toxicity_class && (
                    <span data-testid={PESTICIDE.toxicityBadge} className={`chip inline-flex items-center gap-1 ${TOX_STYLE[result.toxicity_class] || "bg-muted text-muted-foreground border-border"}`}>
                      <Skull className="w-3 h-3" /> {result.toxicity_class}
                    </span>
                  )}
                  <span className="chip text-[10px] text-muted-foreground">
                    {t.pesticidePage.confidence}: {confidence}%
                  </span>
                  {result.banned_or_restricted && (
                    <span className="chip bg-accent/15 text-accent border-accent/60 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {t.pesticidePage.banned}
                    </span>
                  )}
                </div>
              </div>
              <div data-print-hide="true" className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  data-testid={PESTICIDE.share}
                  onClick={() => shareContent({ title: "Pesticide info", text: buildShareText() })}
                  className="chip inline-flex items-center gap-1 hover:bg-muted"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                <button
                  type="button"
                  data-testid={PESTICIDE.savePdf}
                  onClick={() => printElementBySelector(`[data-testid="${PESTICIDE.result}"]`)}
                  className="chip inline-flex items-center gap-1 hover:bg-muted"
                >
                  <Printer className="w-3.5 h-3.5" /> Save PDF
                </button>
              </div>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <KV k={t.pesticidePage.activeIngredients}
                  v={(result.active_ingredients || []).map((a) => `${a.name}${a.concentration ? ` ${a.concentration}` : ""}`).join(", ")} />
              <KV k={t.pesticidePage.chemicalClass} v={result.chemical_class} />
              <KV k={t.pesticidePage.manufacturer} v={result.manufacturer_examples} />
              <KV k={t.pesticidePage.modeOfAction} v={result.mode_of_action} />
              <KV k={t.pesticidePage.dosage} v={result.dosage?.rate} />
              <KV k={t.pesticidePage.spray} v={result.dosage?.spray_frequency} />
              <KV k={t.pesticidePage.price} v={result.price_range_inr} />
              <KV k={t.pesticidePage.reentry} v={result.re_entry_interval_hours ? `${result.re_entry_interval_hours} ${t.pesticidePage.hoursAfter}` : null} />
              <KV k={t.pesticidePage.phi} v={result.pre_harvest_interval_days ? `${result.pre_harvest_interval_days} ${t.pesticidePage.daysBeforeHarvest}` : null} />
            </div>
          </div>

          {(result.targets?.pests?.length || result.targets?.diseases?.length || result.targets?.weeds?.length || result.targets?.crops?.length) ? (
            <Section icon={TestTube2} title={t.pesticidePage.targets}>
              <div className="grid sm:grid-cols-2 gap-4">
                {result.targets.pests?.length > 0 && <KV k={t.pesticidePage.pests} v={result.targets.pests} />}
                {result.targets.diseases?.length > 0 && <KV k={t.pesticidePage.diseases} v={result.targets.diseases} />}
                {result.targets.weeds?.length > 0 && <KV k={t.pesticidePage.weeds} v={result.targets.weeds} />}
                {result.targets.crops?.length > 0 && <KV k={t.pesticidePage.crops} v={result.targets.crops} />}
              </div>
            </Section>
          ) : null}

          {result.precautions?.length > 0 && (
            <Section icon={ShieldAlert} title={t.pesticidePage.precautions} testid={PESTICIDE.precautions} tone="accent">
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {result.precautions.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-accent mt-0.5">•</span>{p}</li>
                ))}
              </ul>
            </Section>
          )}

          {result.ppe_required?.length > 0 && (
            <Section icon={HardHat} title={t.pesticidePage.ppe} testid={PESTICIDE.ppe}>
              <div className="flex flex-wrap gap-2">
                {result.ppe_required.map((p, i) => (
                  <span key={i} className="chip capitalize">{p}</span>
                ))}
              </div>
            </Section>
          )}

          {result.environmental_warnings?.length > 0 && (
            <Section icon={Wind} title={t.pesticidePage.envWarnings} tone="accent">
              <ul className="space-y-1.5 text-sm">
                {result.environmental_warnings.map((w, i) => (
                  <li key={i} className="flex gap-2"><span className="text-accent mt-0.5">•</span>{w}</li>
                ))}
              </ul>
            </Section>
          )}

          {result.first_aid?.length > 0 && (
            <Section icon={Droplets} title={t.pesticidePage.firstAid} testid={PESTICIDE.firstAid} tone="accent">
              <ul className="space-y-1.5 text-sm">
                {result.first_aid.map((w, i) => (
                  <li key={i} className="flex gap-2"><span className="text-accent mt-0.5">•</span>{w}</li>
                ))}
              </ul>
            </Section>
          )}

          {(result.compatibility?.compatible_with?.length || result.compatibility?.incompatible_with?.length) ? (
            <Section icon={PackageOpen} title={t.pesticidePage.compatibility}>
              <div className="grid sm:grid-cols-2 gap-4">
                <KV k={t.pesticidePage.compatibleWith} v={result.compatibility.compatible_with} />
                <KV k={t.pesticidePage.incompatibleWith} v={result.compatibility.incompatible_with} />
              </div>
            </Section>
          ) : null}

          {(result.storage || result.disposal) && (
            <Section icon={Clock} title={`${t.pesticidePage.storage} & ${t.pesticidePage.disposal}`}>
              <div className="grid sm:grid-cols-2 gap-4">
                <KV k={t.pesticidePage.storage} v={result.storage} />
                <KV k={t.pesticidePage.disposal} v={result.disposal} />
              </div>
            </Section>
          )}

          {result.notes && (
            <div className="card-soft p-6">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="font-heading text-lg font-semibold">{t.pesticidePage.notes}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{result.notes}</p>
            </div>
          )}

          {result.disclaimer && (
            <div className="text-xs text-muted-foreground italic px-2">{result.disclaimer}</div>
          )}
        </div>
      )}
    </div>
  );
}
