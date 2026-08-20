import React, { useRef, useState, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/api";

/**
 * Microphone button. Records audio via MediaRecorder in the browser, sends the
 * blob to /api/voice/transcribe with the current language hint, and returns the
 * transcript through onTranscript(text).
 */
export default function VoiceInput({ language = "hi", onTranscript, testid = "voice-input", size = "md" }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => () => stopStream(), []);

  const stopStream = () => {
    try { streamRef.current?.getTracks?.().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const start = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Microphone not supported on this device");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
                 : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
                 : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = onStop;
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => {
        if (s + 1 >= 60) { try { mr.state !== "inactive" && mr.stop(); } catch {} }
        return s + 1;
      }), 1000);
    } catch (e) {
      toast.error("Microphone permission denied");
    }
  };

  const stop = () => {
    try { mediaRef.current?.state !== "inactive" && mediaRef.current?.stop(); } catch {}
  };

  const onStop = async () => {
    setRecording(false);
    stopStream();
    const blob = new Blob(chunksRef.current, { type: mediaRef.current?.mimeType || "audio/webm" });
    if (!blob || blob.size < 200) {
      toast.error("Recording too short. Please try again.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      form.append("language", language);
      const { data } = await client.post("/voice/transcribe", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      const text = (data?.text || "").trim();
      if (!text) { toast.error("Couldn't hear anything. Speak clearly and try again."); return; }
      onTranscript?.(text);
      toast.success("Voice captured");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Voice transcription failed");
    } finally {
      setBusy(false);
    }
  };

  const dims = size === "sm" ? "w-9 h-9" : "w-11 h-11";

  return (
    <button
      type="button"
      data-testid={testid}
      onClick={recording ? stop : start}
      disabled={busy}
      title={recording ? "Stop recording" : "Speak your question"}
      className={`${dims} shrink-0 rounded-full grid place-items-center border transition-colors ${
        recording ? "bg-accent text-accent-foreground border-accent animate-pulse" :
        busy ? "bg-muted text-muted-foreground border-border" :
        "bg-white text-primary border-border hover:bg-primary/8"
      }`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
      {recording && <span className="sr-only">{seconds}s</span>}
    </button>
  );
}
