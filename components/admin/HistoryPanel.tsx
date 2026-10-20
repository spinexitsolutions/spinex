"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import type { SiteContent } from "@/lib/content";

type Version = { id: string; savedAt: string; note: string };

// Earlier saves of the website content. Restoring keeps the current version too, so it can be undone.
export default function HistoryPanel({ onRestored, dirty = false }: { onRestored: (c: SiteContent, updated: string | null) => void; dirty?: boolean }) {
  const [list, setList] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content/versions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load history.");
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (v: Version) => {
    const when = new Date(v.savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const unsaved = dirty ? "\n\nYou have unsaved changes. They will be lost." : "";
    if (!confirm(`Restore the website content from ${when}? Your current content is kept in history, so you can switch back.${unsaved}`)) return;
    setBusy(v.id);
    try {
      const res = await fetch(`/api/admin/content/versions/${v.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't restore.");
      onRestored(data, res.headers.get("x-content-updated"));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't restore.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Version history</h2>
          <p className="mt-1 text-sm text-muted">Every time you save, the previous version is kept here (last 40). Blog posts, leads and interns are not part of this.</p>
        </div>
        <button onClick={load} aria-label="Refresh" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line hover:border-ink"><RefreshCw size={15} /></button>
      </div>
      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
      {loading ? (
        <div className="grid place-items-center p-10 text-muted"><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-muted">
          <History className="mx-auto mb-2 text-lav-600" /> No earlier versions yet. They appear after your next save.
        </div>
      ) : (
        <ol className="mt-6 divide-y divide-line">
          {list.map((v, i) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-mist text-xs font-semibold">{i + 1}</span>
              <span className="flex-1">
                <span className="block font-medium">{new Date(v.savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                <span className="text-sm text-muted">{v.note === "Saved" ? "Content as it was before the next save" : v.note}</span>
              </span>
              <button onClick={() => restore(v)} disabled={!!busy} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm hover:border-ink disabled:opacity-50">
                {busy === v.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restore
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
