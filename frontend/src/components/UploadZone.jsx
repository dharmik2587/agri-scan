import React, { useCallback, useRef, useState } from "react";
import { Upload, Camera, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { UPLOAD } from "@/constants/testIds";
import { useLang } from "@/context/LangContext";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

// Resize image on client to ~1280 max dimension while keeping quality, output JPEG base64
async function readAndCompress(file) {
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file.");
  if (file.size > MAX_BYTES) throw new Error("Image is over 10MB. Please choose a smaller one.");
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
  let { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const jpeg = canvas.toDataURL("image/jpeg", 0.86);
  return { dataUrl: jpeg, mime: "image/jpeg" };
}

export default function UploadZone({ onAnalyze, analyzing }) {
  const { t } = useLang();
  const [preview, setPreview] = useState(null);
  const [payload, setPayload] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const camRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    try {
      const { dataUrl, mime } = await readAndCompress(file);
      setPreview(dataUrl);
      setPayload({ image_base64: dataUrl, mime_type: mime });
    } catch (e) {
      toast.error(e.message || "Could not read image");
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    setPayload(null);
    if (fileRef.current) fileRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
  };

  return (
    <div>
      {!preview ? (
        <div
          data-testid={UPLOAD.zone}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-colors ${
            dragging ? "border-secondary bg-secondary/10" : "border-secondary/60 bg-[#F6F8F1]"
          }`}
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white border border-border grid place-items-center shadow-sm mb-4">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-heading text-xl sm:text-2xl font-semibold">{t.upload.title}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{t.upload.hint}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button className="btn-primary inline-flex items-center gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" /> Browse files
            </button>
            <button className="btn-outline inline-flex items-center gap-2" onClick={() => camRef.current?.click()}>
              <Camera className="w-4 h-4" /> Camera
            </button>
          </div>
          <input
            ref={fileRef}
            data-testid={UPLOAD.fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <input
            ref={camRef}
            data-testid={UPLOAD.cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <p className="text-[11px] text-muted-foreground mt-6 label-eyebrow">JPG · PNG · WEBP · max 10MB</p>
        </div>
      ) : (
        <div className={`card-soft p-4 sm:p-6 ${analyzing ? "scan-pulse" : ""}`}>
          <div className="flex items-start gap-4">
            <img
              data-testid={UPLOAD.previewImage}
              src={preview}
              alt="preview"
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover border border-border"
            />
            <div className="flex-1 min-w-0">
              <div className="label-eyebrow text-muted-foreground">Ready to analyze</div>
              <h3 className="font-heading text-lg sm:text-xl font-semibold mt-1">Your plant photo is queued</h3>
              <p className="text-sm text-muted-foreground mt-1">Our AI agronomist will identify the plant, diagnose diseases, and recommend treatment in about 10 seconds.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  data-testid={UPLOAD.analyzeButton}
                  disabled={analyzing}
                  onClick={() => onAnalyze(payload)}
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                >
                  <Sparkles className="w-4 h-4" /> {analyzing ? t.upload.analyzing : t.upload.analyze}
                </button>
                <button data-testid={UPLOAD.clearButton} onClick={clear} disabled={analyzing} className="btn-outline inline-flex items-center gap-2">
                  <X className="w-4 h-4" /> Clear
                </button>
              </div>
              {analyzing && (
                <div data-testid={UPLOAD.analyzingIndicator} className="mt-4 text-xs text-muted-foreground label-eyebrow">
                  Scanning leaf edges · matching symptoms · consulting agronomy library…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
