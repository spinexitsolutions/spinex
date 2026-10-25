"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

// Upload a file for the client (portal) or for the team (admin). Refreshes the page when done.
export default function PortalUpload({ url, projects, onDone }: { url: string; projects: { id: string; title: string }[]; onDone?: (data: unknown) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const send = async () => {
    const files = Array.from(input.current?.files ?? []);
    if (!files.length) return setError("Choose a file first.");
    setBusy(true);
    setError("");
    setMsg("");
    let last: unknown = null;
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("note", note);
      form.append("projectId", projectId);
      const res = await fetch(url, { method: "POST", body: form }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setError((data as { error?: string }).error || "Upload failed. Try again.");
        setBusy(false);
        return;
      }
      last = data;
    }
    setBusy(false);
    setNote("");
    if (input.current) input.current.value = "";
    setMsg(files.length > 1 ? `${files.length} files uploaded` : "File uploaded");
    if (onDone) onDone(last);
    else window.location.reload();
  };

  return (
    <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <input ref={input} type="file" multiple className="input py-2.5" aria-label="Choose files" />
        {projects.length > 0 ? (
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project">
            <option value="">No particular project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title || "Project"}</option>)}
          </select>
        ) : <span />}
        <input className="input sm:col-span-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional), e.g. Final logo files" maxLength={300} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={send} disabled={busy} className="btn-dark px-5 py-2.5 text-sm">{busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Upload</button>
        <span className="text-xs text-muted">PDF, Word, Excel, images, ZIP or video, up to 10 MB each.</span>
        {msg && <span className="text-sm font-medium text-emerald-700">{msg}</span>}
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
