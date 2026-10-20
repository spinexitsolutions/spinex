"use client";

import { useState } from "react";
import { Eye, Loader2, X } from "lucide-react";

// Shown only to an admin who pressed "Preview": the website here has their unsaved changes.
export default function PreviewBar() {
  const [busy, setBusy] = useState(false);
  const exit = async () => {
    setBusy(true);
    await fetch("/api/admin/preview", { method: "DELETE" }).catch(() => undefined);
    window.location.reload();
  };
  return (
    <div className="fixed inset-x-0 top-0 z-[95] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-amber-400 px-4 py-2.5 text-sm font-medium text-ink shadow-lg">
      <span className="flex items-center gap-2"><Eye size={16} /> Preview: only you can see these changes. They are not live yet.</span>
      <span className="flex gap-2">
        <a href="/admin" className="rounded-full bg-ink px-4 py-1.5 text-white">Back to admin to save</a>
        <button onClick={exit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 px-4 py-1.5 hover:bg-white/40">{busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Exit preview</button>
      </span>
    </div>
  );
}
