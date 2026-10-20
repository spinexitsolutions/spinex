"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type Item = { id: string; at: string; uid: string; name: string; role: string; area: string; action: string; target: string; ip: string };

const AREAS = ["Website content", "Leads", "Invoices", "Blog", "Interns", "Team", "API keys", "Automation", "Media", "Login"];
const tone: Record<string, string> = {
  Login: "bg-mist text-muted", Leads: "bg-lav-100 text-lav-700", Invoices: "bg-amber-50 text-amber-800", "Website content": "bg-emerald-50 text-emerald-800",
  Team: "bg-red-50 text-red-700", "API keys": "bg-red-50 text-red-700", Automation: "bg-mist text-ink",
};

// Admin → Activity log: who changed what, newest first.
export default function ActivityPanel({ all }: { all: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);

  const load = useCallback(async (before?: string) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (area) q.set("area", area);
      if (before) q.set("before", before);
      const res = await fetch(`/api/admin/activity?${q}`);
      const list: Item[] = res.ok ? await res.json() : [];
      setItems((cur) => (before ? [...cur, ...list] : list));
      setMore(list.length === 100);
    } finally {
      setLoading(false);
    }
  }, [area]);
  useEffect(() => { load(); }, [load]);

  const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  let lastDay = "";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{all ? "Every important change in the admin panel, by everyone. Kept for one year." : "Your own changes in the admin panel."}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={area} onChange={(e) => setArea(e.target.value)} className="h-11 rounded-full border border-line bg-white px-4 text-sm" aria-label="Filter">
          <option value="">Everything</option>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => load()} aria-label="Refresh" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white hover:border-ink"><RefreshCw size={16} /></button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {items.length === 0 && !loading && <p className="p-10 text-center text-muted">Nothing recorded yet.</p>}
        {items.map((it) => {
          const d = day(it.at);
          const head = d !== lastDay;
          lastDay = d;
          return (
            <div key={it.id}>
              {head && <p className="border-b border-line bg-mist px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">{d}</p>}
              <div className="flex flex-wrap items-start gap-x-4 gap-y-1 border-b border-line px-5 py-3 last:border-0">
                <span className="w-16 shrink-0 pt-0.5 text-sm text-muted">{new Date(it.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[it.area] ?? "bg-mist text-muted"}`}>{it.area}</span>
                <span className="min-w-[200px] flex-1 text-sm">
                  <b>{it.name}</b> {it.action.charAt(0).toLowerCase() + it.action.slice(1)}
                  {it.target && <span className="text-muted">: {it.target}</span>}
                </span>
                {all && it.ip && <span className="text-xs text-muted" title="Internet address">{it.ip}</span>}
              </div>
            </div>
          );
        })}
        {loading && <div className="grid place-items-center p-6 text-muted"><Loader2 className="animate-spin" /></div>}
      </div>
      {more && items.length > 0 && !loading && <button onClick={() => load(items[items.length - 1].at)} className="btn-ghost mx-auto block px-5 py-2.5 text-sm">Show older</button>}
    </div>
  );
}
