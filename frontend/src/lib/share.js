// Build sharable text summaries for WhatsApp / other share sinks.
// Uses wa.me deep links so it works on any phone without an install.

const trim = (s) => (s || "").toString().trim();

export function buildDiagnosisShareText(scan) {
  if (!scan) return "";
  const lines = [
    `🌱 AgriScan diagnosis`,
    `Plant: ${trim(scan.plant_name)}${scan.species ? ` (${scan.species})` : ""}`,
    `Detected: ${trim(scan.disease_name)} · ${Math.round((scan.disease_confidence || 0) * 100)}% confidence`,
    `Severity: ${trim(scan.severity)}`,
  ];
  if (scan.treatment) lines.push(`Treatment: ${trim(scan.treatment)}`);
  if (scan.fertilizer?.name) lines.push(`Fertilizer: ${scan.fertilizer.name}${scan.fertilizer.npk_ratio ? ` · NPK ${scan.fertilizer.npk_ratio}` : ""}`);
  if (scan.summary) lines.push("", trim(scan.summary));
  lines.push("", "— Shared via AgriScan");
  return lines.join("\n");
}

export function buildAdvisoryShareText(r) {
  if (!r) return "";
  const lines = [
    `🌾 Krishi Mitra advisory — ${trim(r.crop)}`,
    `${trim(r.district)}, ${trim(r.state)}`,
    "",
    trim(r.summary),
  ];
  if (r.soil?.type) lines.push("", `Soil: ${trim(r.soil.type)} · pH ${trim(r.soil.ph_range) || "—"}`);
  if (r.fertilizers?.length) {
    const top = r.fertilizers.slice(0, 3).map((f) => `${f.name}${f.npk_ratio ? ` (NPK ${f.npk_ratio})` : ""}`);
    lines.push(`Fertilizers: ${top.join(", ")}`);
  }
  if (r.pesticides?.length) {
    const top = r.pesticides.slice(0, 3).map((p) => p.name).join(", ");
    lines.push(`Pesticides: ${top}`);
  }
  if (r.diseases?.length) {
    const top = r.diseases.slice(0, 3).map((d) => d.name).join(", ");
    lines.push(`Common diseases: ${top}`);
  }
  if (r.local_notes) lines.push("", `Local notes: ${trim(r.local_notes)}`);
  lines.push("", "— Shared via AgriScan");
  return lines.join("\n");
}

export function buildListingShareText(l) {
  if (!l) return "";
  const lines = [
    `🥭 For sale on AgriScan`,
    `${trim(l.crop)} · ${l.quantity_kg} kg`,
    `Asking: ₹${l.asking_price_per_kg}/kg`,
    `Region: ${trim(l.region)}`,
    `Farmer: ${trim(l.farmer_name)}${l.contact ? ` · ${l.contact}` : ""}`,
  ];
  if (l.notes) lines.push("", trim(l.notes));
  lines.push("", "— AgriScan");
  return lines.join("\n");
}

// Open WhatsApp with pre-filled message. wa.me works on mobile (opens app) and
// web (opens web.whatsapp.com) universally.
export function shareOnWhatsApp(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Native share sheet (Web Share API) on mobile; falls back to WhatsApp deep link.
export async function shareContent({ title, text }) {
  const payload = { title: title || "AgriScan", text };
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return "native";
    } catch (e) {
      // user dismissed — fall through to WhatsApp
    }
  }
  shareOnWhatsApp(text);
  return "whatsapp";
}
