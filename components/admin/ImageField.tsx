"use client";

import { useRef, useState } from "react";
import { ImageOff, Images, Loader2, Upload, X } from "lucide-react";
import { uploadImages } from "@/lib/upload-client";
import Modal from "./Modal";
import MediaLibrary from "./MediaLibrary";

// Image input: upload (button or drag and drop), pick from the library, or paste a link.
export default function ImageField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [library, setLibrary] = useState(false);
  const [over, setOver] = useState(false);
  const [broken, setBroken] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (JPG, PNG, WebP or GIF).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const [saved] = await uploadImages([file]);
      setBroken(false);
      onChange(saved.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
        className={`flex flex-col gap-3 rounded-2xl border p-3 transition-colors sm:flex-row sm:items-center ${over ? "border-lav-500 bg-lav-100/60" : "border-line bg-white"}`}
      >
        <div className="relative grid h-24 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-mist sm:w-36">
          {busy ? (
            <Loader2 className="animate-spin text-muted" />
          ) : value && !broken ? (
            <img src={value} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} onLoad={() => setBroken(false)} />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs text-muted"><ImageOff size={18} />{value ? "Can't load" : "No image"}</span>
          )}
          {value && !busy && (
            <button type="button" onClick={() => onChange("")} aria-label="Remove image" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white"><X size={14} /></button>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-lav-700 disabled:opacity-60">
              <Upload size={15} /> Upload
            </button>
            <button type="button" onClick={() => setLibrary(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:border-ink">
              <Images size={15} /> Library
            </button>
            <span className="self-center text-xs text-muted">or drop an image here</span>
          </div>
          <input id={id} className="input py-2 text-sm" placeholder="Or paste an image link: https://…" value={value} onChange={(e) => { setBroken(false); onChange(e.target.value); }} />
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      <Modal open={library} title="Choose an image" onClose={() => setLibrary(false)} wide>
        <MediaLibrary
          onPick={(url) => {
            setBroken(false);
            onChange(url);
            setLibrary(false);
          }}
        />
      </Modal>
    </div>
  );
}
