"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Monitor, RotateCcw, Smartphone, X } from "lucide-react";
import type { SiteContent } from "@/lib/content";

// Admin: the website shown beside the editor. Unsaved changes are sent to the same "preview" copy the
// Preview button uses (only this person sees it), then the page in the frame is reloaded, so what you
// change shows here a moment later. The real website changes only on Save.
export default function LivePreview({ draft, dirty, path, onClose }: { draft: SiteContent; dirty: boolean; path: string; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  const sent = useRef(false);
  const scroll = useRef(0);
  const json = JSON.stringify(draft);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const reload = () => {
    const w = frame.current?.contentWindow;
    try { scroll.current = w?.scrollY ?? 0; w?.location.reload(); } catch { if (frame.current) frame.current.src = path; }
  };

  // Send the unsaved changes a moment after the last edit; when everything is saved or discarded, show the live site again.
  useEffect(() => {
    if (!dirty) {
      if (!sent.current) return;
      sent.current = false;
      fetch("/api/admin/preview", { method: "DELETE" }).catch(() => undefined).finally(reload);
      return;
    }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/admin/preview", { method: "POST", headers: { "content-type": "application/json" }, body: json });
        setFailed(!res.ok);
        if (res.ok) { sent.current = true; reload(); }
      } catch { setFailed(true); } finally { setBusy(false); }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, dirty]);

  // Leaving the panel: go back to the live website in this browser.
  useEffect(() => () => { if (sent.current) fetch("/api/admin/preview", { method: "DELETE", keepalive: true }).catch(() => undefined); }, []);

  const W = device === "phone" ? 390 : 1280;
  const scale = boxW ? Math.min(1, boxW / W) : 1;
  const H = box.current ? box.current.clientHeight / scale : 800;

  return (
    <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-[min(42vw,560px)] shrink-0 flex-col border-l border-line bg-white xl:flex" data-live-preview>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <p className="mr-auto text-sm font-semibold">Live preview {busy && <Loader2 size={13} className="ml-1 inline animate-spin text-muted" />}</p>
        <div className="flex rounded-lg border border-line p-0.5">
          {([["desktop", Monitor], ["phone", Smartphone]] as const).map(([id, Icon]) => (
            <button key={id} type="button" onClick={() => setDevice(id)} aria-label={id === "desktop" ? "Computer view" : "Phone view"} aria-pressed={device === id}
              className={`grid h-7 w-8 place-items-center rounded-md ${device === id ? "bg-ink text-white" : "text-muted hover:text-ink"}`}><Icon size={14} /></button>
          ))}
        </div>
        <button type="button" onClick={reload} aria-label="Reload preview" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink"><RotateCcw size={14} /></button>
        <button type="button" onClick={onClose} aria-label="Close preview" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink"><X size={15} /></button>
      </div>
      <div ref={box} className="relative flex-1 overflow-hidden bg-mist">
        <iframe ref={frame} key={path} src={path} title="Website preview" onLoad={() => { try { frame.current?.contentWindow?.scrollTo(0, scroll.current); } catch {} }}
          className="absolute left-1/2 top-0 origin-top border-0 bg-white"
          style={{ width: W, height: H, transform: `translateX(-50%) scale(${scale})` }} />
      </div>
      <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
        {failed ? "Couldn't update the preview. Your changes are still here." : dirty ? "Showing your unsaved changes. The website changes only after you save." : "Showing the live website."}
      </p>
    </aside>
  );
}
