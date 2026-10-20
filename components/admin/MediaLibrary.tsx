"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, ImagePlus, Loader2, RefreshCw, Trash2, Zap } from "lucide-react";
import { uploadImagesEach, type Uploaded } from "@/lib/upload-client";

// Whether the signed-in user may delete uploads (needs the "content" permission). Set by AdminApp.
export const MediaDeleteContext = createContext(false);

// Grid of uploaded images. In "pick" mode, clicking an image chooses it.
export default function MediaLibrary({ onPick }: { onPick?: (url: string) => void }) {
  const canDelete = useContext(MediaDeleteContext);
  const [items, setItems] = useState<Uploaded[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [dragging, setDragging] = useState(false);
  const [optimizing, setOptimizing] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/uploads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load images.");
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load images.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploading(true);
    setError("");
    try {
      const { uploaded: added, failed } = await uploadImagesEach(images);
      setItems((all) => [...added, ...all]);
      if (failed.length) setError(`${failed.length} of ${images.length} didn't upload: ${failed.map((f) => `${f.name} (${f.error})`).join(", ")}`);
      else if (onPick && added.length === 1) onPick(added[0].url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Shrinks images uploaded before automatic optimisation existed. Runs in batches until done.
  const optimizeOld = async () => {
    setOptimizing("Working…");
    let savedKb = 0;
    try {
      for (let i = 0; i < 50; i++) {
        const res = await fetch("/api/admin/uploads/optimize", { method: "POST" });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Couldn't optimise.");
        savedKb += d.savedKb || 0;
        setOptimizing(`Working… ${d.left} left`);
        if (!d.left || !d.done) break;
      }
      setOptimizing(savedKb ? `Done. Saved ${(savedKb / 1024).toFixed(1)} MB` : "Done. All images were already small.");
      load();
    } catch (e) {
      setOptimizing(e instanceof Error ? e.message : "Couldn't optimise.");
    }
  };

  const remove = async (item: Uploaded) => {
    if (!confirm("Delete this image? Anywhere it's used on the website will show a blank space.")) return;
    const res = await fetch(`/api/admin/uploads/${item.id}`, { method: "DELETE" });
    if (res.ok) setItems((all) => all.filter((x) => x.id !== item.id));
    else setError("Couldn't delete the image.");
  };

  const copy = async (item: Uploaded) => {
    await navigator.clipboard.writeText(new URL(item.url, window.location.origin).href).catch(() => undefined);
    setCopied(item.id);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(Array.from(e.dataTransfer.files)); }}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-lav-500 bg-lav-100/60" : "border-line bg-white"}`}
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-white">{uploading ? <Loader2 className="animate-spin" size={20} /> : <ImagePlus size={20} />}</span>
        <p className="font-semibold">{uploading ? "Uploading…" : "Drop images here"}</p>
        <p className="text-sm text-muted">JPG, PNG, WebP or GIF. Large photos are resized automatically.</p>
        <button type="button" onClick={() => input.current?.click()} disabled={uploading} className="btn-dark px-5 py-2.5 text-sm disabled:opacity-60">Choose images</button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple className="hidden" onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-muted">{items.length} image{items.length === 1 ? "" : "s"}{onPick ? ". Click one to use it." : ""}</p>
        {!onPick && canDelete && (
          <span className="ml-auto mr-2 flex items-center gap-2">
            {optimizing && <span className="text-xs text-muted">{optimizing}</span>}
            <button type="button" onClick={optimizeOld} disabled={optimizing.startsWith("Working")} className="btn-ghost px-3 py-2 text-xs" title="Make images uploaded earlier smaller, so pages load faster"><Zap size={14} /> Make old images smaller</button>
          </span>
        )}
        <button type="button" onClick={load} aria-label="Refresh" className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-ink"><RefreshCw size={15} /></button>
      </div>

      {loading ? (
        <div className="grid place-items-center p-10 text-muted"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <motion.figure key={it.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="group relative overflow-hidden rounded-2xl border border-line bg-mist">
                <button type="button" onClick={() => onPick?.(it.url)} className={`block w-full ${onPick ? "cursor-pointer" : "cursor-default"}`} aria-label={onPick ? `Use ${it.name}` : it.name}>
                  <img src={it.url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </button>
                <figcaption className="flex items-center gap-1 bg-white px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted" title={it.name}>{it.name}</span>
                  <button type="button" onClick={() => copy(it)} aria-label="Copy link" title="Copy link" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink">
                    {copied === it.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                  {canDelete && <button type="button" onClick={() => remove(it)} aria-label="Delete image" title="Delete" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>}
                </figcaption>
              </motion.figure>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
