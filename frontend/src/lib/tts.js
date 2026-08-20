// Simple wrapper around browser SpeechSynthesis with graceful fallbacks.

const langToBcp47 = { hi: "hi-IN", en: "en-IN", mr: "mr-IN", ta: "ta-IN", te: "te-IN", bn: "bn-IN", gu: "gu-IN", kn: "kn-IN" };

function pickVoice(bcp47) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;
  // Prefer an exact match, then a language-prefix match, then any localService voice for the language
  return (
    voices.find((v) => v.lang?.toLowerCase() === bcp47.toLowerCase()) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(bcp47.split("-")[0].toLowerCase())) ||
    voices[0]
  );
}

export function isTTSAvailable() {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}

export function speak(text, lang = "en") {
  if (!isTTSAvailable()) return false;
  if (!text || !text.trim()) return false;
  const synth = window.speechSynthesis;
  try { synth.cancel(); } catch {}
  const bcp47 = langToBcp47[lang] || "en-IN";
  // Voices may load async in Chrome; retry once
  const say = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = bcp47;
    const v = pickVoice(bcp47);
    if (v) u.voice = v;
    u.rate = 0.98;
    u.pitch = 1.0;
    synth.speak(u);
  };
  if (synth.getVoices().length === 0) {
    const handler = () => { synth.removeEventListener("voiceschanged", handler); say(); };
    synth.addEventListener("voiceschanged", handler);
    // Also fire a delayed attempt as a safety net
    setTimeout(say, 350);
  } else {
    say();
  }
  return true;
}

export function stopSpeaking() {
  if (isTTSAvailable()) window.speechSynthesis.cancel();
}
