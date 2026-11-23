"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Clock, Copy, Eye, Film, Link2, Loader2, Lock, Pencil, Play, Plus, Power, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { DEMO_DAYS, DEMO_VIEWS, MAX_DEMO_BYTES, linkState, linkStateLabel, type DemoLink, type DemoVideo } from "@/lib/demos";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data as T;
}
type Data = { videos: DemoVideo[]; links: DemoLink[]; canEdit: boolean };

const when = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "");
const whenTime = (iso: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "");
const dur = (s: number) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");
const mb = (b: number) => (b ? `${(b / 1048576).toFixed(b > 104857600 ? 0 : 1)} MB` : "");
const linkUrl = (token: string) => `${window.location.origin}/v/${token}`;
const waNumber = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};
const waText = (l: DemoLink, title: string) =>
  `Hi ${l.client.split(" ")[0]}, here is a short sample of our editing work: "${title}".\n\n${linkUrl(l.token)}${l.pin ? `\nPIN: ${l.pin}` : ""}\n\nThe link works till ${when(l.expiresAt)}. Let us know what you think!`;
const stateTone: Record<string, string> = { active: "bg-emerald-50 text-emerald-700", expired: "bg-amber-50 text-amber-800", used: "bg-amber-50 text-amber-800", revoked: "bg-mist text-muted" };

// Admin → Demo videos: upload sample videos (the Spinex watermark is printed into them) and make a private,
// time-limited link for each client. Clients can watch but not download.
export default function DemoVideosManager() {
  const [data, setData] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [up, setUp] = useState<{ name: string; pct: number } | null>(null);
  const [watch, setWatch] = useState("");
  const [edit, setEdit] = useState<{ id: string; title: string } | null>(null);
  const [f, setF] = useState({ videoId: "", client: "", phone: "", days: 3, maxViews: 5, showName: true, usePin: false, pin: "" });
  const [made, setMade] = useState<DemoLink | null>(null);
  const [copied, setCopied] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>("/api/admin/demos"));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't load." });
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  // While a video is being prepared, check again every few seconds.
  const processing = !!data?.videos.some((v) => v.status === "processing");
  useEffect(() => {
    if (!processing) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [processing, load]);
  useEffect(() => {
    const ready = data?.videos.filter((v) => v.status === "ready") ?? [];
    if (!f.videoId && ready[0]) setF((x) => ({ ...x, videoId: ready[0].id }));
  }, [data, f.videoId]);

  if (!data) return <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>;
  const ro = !data.canEdit;
  const ready = data.videos.filter((v) => v.status === "ready");
  const titleOf = (id: string) => data.videos.find((v) => v.id === id)?.title ?? "Demo video";

  const pick = () => fileRef.current?.click();
  const upload = (file: File) => {
    setMsg(null);
    if (!file.type.startsWith("video/")) return setMsg({ ok: false, text: "Please choose a video file (MP4, MOV or WEBM)." });
    if (file.size > MAX_DEMO_BYTES) return setMsg({ ok: false, text: "The video is bigger than 1 GB. Please export a smaller file." });
    const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Demo video";
    setUp({ name: file.name, pct: 0 });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/demos/upload");
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("x-title", encodeURIComponent(title));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUp({ name: file.name, pct: Math.round((e.loaded / e.total) * 100) }); };
    xhr.onload = () => {
      setUp(null);
      let d: { error?: string } = {};
      try { d = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status === 401) window.location.href = "/admin/login";
      else if (xhr.status >= 200 && xhr.status < 300) setMsg({ ok: true, text: "Uploaded. Adding the Spinex watermark now, this takes about as long as the video." });
      else setMsg({ ok: false, text: d.error || "The upload failed. Try again." });
      load();
    };
    xhr.onerror = () => { setUp(null); setMsg({ ok: false, text: "The upload stopped. Check your internet and try again." }); };
    xhr.send(file);
  };

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ ok: true, text: ok });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't do that." });
    } finally {
      setBusy("");
    }
  };
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    void act("create", async () => {
      const l = await api<DemoLink>("/api/admin/demos/links", { method: "POST", body: JSON.stringify({ ...f, pin: f.usePin ? f.pin : "" }) });
      setMade(l);
      setF((x) => ({ ...x, client: "", phone: "", pin: "" }));
    });
  };
  const copy = async (l: DemoLink) => {
    try {
      await navigator.clipboard.writeText(waText(l, titleOf(l.videoId)));
      setCopied(l.id);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setMsg({ ok: false, text: "Couldn't copy. Select the link and copy it yourself." });
    }
  };
  const wa = (l: DemoLink) => `https://wa.me/${waNumber(l.phone)}?text=${encodeURIComponent(waText(l, titleOf(l.videoId)))}`;
  const newLinkFor = (id: string) => {
    setF((x) => ({ ...x, videoId: id }));
    setMade(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const LinkRow = ({ l }: { l: DemoLink }) => {
    const st = linkState(l);
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line py-3 first:border-t-0">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold">
            {l.client}
            <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${stateTone[st]}`}>{linkStateLabel[st]}</span>
            {l.pin && <span className="inline-flex items-center gap-1 text-xs font-medium text-muted"><Lock size={12} /> PIN {l.pin}</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {l.views} of {l.maxViews || "∞"} views · till {when(l.expiresAt)} · {l.lastViewedAt ? `last watched ${whenTime(l.lastViewedAt)}` : "not opened yet"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => copy(l)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink">{copied === l.id ? <Check size={13} /> : <Copy size={13} />} {copied === l.id ? "Copied" : "Copy"}</button>
          {l.phone && <a href={wa(l)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><WhatsAppIcon size={13} /> Send</a>}
          {!ro && (
            <>
              {st === "revoked" ? (
                <button type="button" disabled={!!busy} onClick={() => act(`on:${l.id}`, () => api(`/api/admin/demos/links/${l.id}`, { method: "PATCH", body: JSON.stringify({ action: "on" }) }), "Link turned on.")} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-mist"><Power size={13} /> Turn on</button>
              ) : (
                <button type="button" disabled={!!busy} onClick={() => act(`off:${l.id}`, () => api(`/api/admin/demos/links/${l.id}`, { method: "PATCH", body: JSON.stringify({ action: "off" }) }), "Link turned off. The client can't open it now.")} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-mist"><Power size={13} /> Turn off</button>
              )}
              {(st === "expired" || st === "active") && <button type="button" disabled={!!busy} onClick={() => act(`ext:${l.id}`, () => api(`/api/admin/demos/links/${l.id}`, { method: "PATCH", body: JSON.stringify({ action: "extend", days: 3 }) }), "3 more days added.")} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-mist"><Clock size={13} /> +3 days</button>}
              {l.maxViews > 0 && <button type="button" disabled={!!busy} onClick={() => act(`views:${l.id}`, () => api(`/api/admin/demos/links/${l.id}`, { method: "PATCH", body: JSON.stringify({ action: "views", views: 3 }) }), "3 more views added.")} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-mist"><Eye size={13} /> +3 views</button>}
              <button type="button" disabled={!!busy} onClick={() => { if (confirm(`Delete the link for ${l.client}? It will stop working.`)) void act(`del:${l.id}`, () => api(`/api/admin/demos/links/${l.id}`, { method: "DELETE" }), "Link deleted."); }} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete link"><Trash2 size={13} /></button>
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6" data-demo-videos>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[15px] text-muted">Upload a sample video and make a private link for each client. The link is not on your website or Google. Clients can watch but can&apos;t download, and the Spinex watermark is printed into the video.</p>
        </div>
        {!ro && (
          <>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) upload(file); }} />
            <button type="button" onClick={pick} disabled={!!up} className="btn-dark px-5 py-2.5 text-sm"><Upload size={16} /> Upload video</button>
          </>
        )}
      </div>

      {up && (
        <div className="rounded-3xl border border-line bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><Loader2 size={15} className="animate-spin" /> Uploading {up.name} · {up.pct}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-lav-600 transition-all" style={{ width: `${up.pct}%` }} /></div>
          <p className="mt-2 text-xs text-muted">Keep this page open until the upload finishes.</p>
        </div>
      )}
      {msg && <p role="status" className={`rounded-2xl px-5 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {data.videos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
              <Film className="mx-auto text-lav-600" />
              <p className="mt-3 font-semibold">No demo videos yet</p>
              <p className="mt-1 text-sm text-muted">Upload a sample edit (MP4 or MOV, up to 1 GB) to start making client links.</p>
              {!ro && <button type="button" onClick={pick} className="btn-dark mt-5 px-5 py-2.5 text-sm"><Upload size={16} /> Upload video</button>}
            </div>
          ) : (
            data.videos.map((v) => {
              const links = data.links.filter((l) => l.videoId === v.id);
              return (
                <section key={v.id} className="rounded-3xl border border-line bg-white p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => v.status === "ready" && setWatch(watch === v.id ? "" : v.id)}
                      className="relative grid aspect-video w-32 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-lav-600 to-ink text-white"
                      aria-label="Watch"
                    >
                      {v.status === "processing" ? <Loader2 className="animate-spin" size={20} /> : v.status === "failed" ? <AlertTriangle size={20} /> : <Play size={20} fill="currentColor" />}
                      {v.duration > 0 && <span className="absolute bottom-1.5 right-1.5 rounded bg-black/50 px-1.5 text-[10.5px] font-semibold">{dur(v.duration)}</span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      {edit?.id === v.id ? (
                        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void act(`ren:${v.id}`, () => api(`/api/admin/demos/videos/${v.id}`, { method: "PATCH", body: JSON.stringify({ title: edit.title }) })).then(() => setEdit(null)); }}>
                          <input autoFocus className="input py-2 text-sm" value={edit.title} onChange={(e) => setEdit({ id: v.id, title: e.target.value })} aria-label="Video name" />
                          <button className="btn-dark px-3 py-2 text-sm" aria-label="Save"><Check size={15} /></button>
                          <button type="button" onClick={() => setEdit(null)} className="btn-ghost px-3 py-2 text-sm" aria-label="Cancel"><X size={15} /></button>
                        </form>
                      ) : (
                        <p className="flex items-center gap-2 font-semibold">
                          <span className="truncate">{v.title}</span>
                          {!ro && <button type="button" onClick={() => setEdit({ id: v.id, title: v.title })} className="text-muted hover:text-ink" aria-label="Rename"><Pencil size={13} /></button>}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        {v.status === "processing" ? "Adding the watermark…" : v.status === "failed" ? v.error : [dur(v.duration), v.width ? `${v.width}×${v.height}` : "", mb(v.size), `uploaded ${when(v.createdAt)}`].filter(Boolean).join(" · ")}
                      </p>
                      {v.status === "ready" && (
                        <p className={`mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold ${v.burned ? "text-emerald-700" : "text-amber-700"}`}>
                          <ShieldCheck size={12} /> {v.burned ? "Watermark printed into the video" : "Watermark shown on top only (the server couldn't print it)"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!ro && v.status === "ready" && <button type="button" onClick={() => newLinkFor(v.id)} className="btn-ghost px-3.5 py-2 text-sm"><Link2 size={14} /> New link</button>}
                      {!ro && (
                        <button type="button" disabled={!!busy} onClick={() => { if (confirm(`Delete "${v.title}" and all ${links.length} client link(s)? They will stop working.`)) void act(`delv:${v.id}`, () => api(`/api/admin/demos/videos/${v.id}`, { method: "DELETE" }), "Video deleted."); }} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600" aria-label="Delete video">
                          {busy === `delv:${v.id}` ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                  {watch === v.id && (
                    <video src={`/api/admin/demos/videos/${v.id}/stream`} controls autoPlay playsInline className={`mt-4 w-full rounded-2xl bg-black ${v.height > v.width ? "mx-auto max-h-[70vh] w-auto" : ""}`} {...{ controlsList: "nodownload" }} />
                  )}
                  {links.length > 0 && <ul className="mt-4 rounded-2xl bg-mist/60 px-4">{links.map((l) => <LinkRow key={l.id} l={l} />)}</ul>}
                </section>
              );
            })
          )}
        </div>

        {!ro && (
          <form ref={formRef} onSubmit={create} className="space-y-3 rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-6">
            <h3 className="font-display text-lg font-semibold">New link for a client</h3>
            {ready.length === 0 ? (
              <p className="rounded-2xl bg-mist px-4 py-3 text-sm text-muted">Upload a video first. You can make links once its watermark is ready.</p>
            ) : (
              <>
                <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Video</span>
                  <select className="input" value={f.videoId} onChange={(e) => setF({ ...f, videoId: e.target.value })}>{ready.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}</select>
                </label>
                <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Client name</span>
                  <input className="input" required value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} placeholder="e.g. Rahul Sharma" />
                </label>
                <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Client mobile</span>
                  <input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="For the WhatsApp button and the watermark" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Link works for</span>
                    <select className="input" value={f.days} onChange={(e) => setF({ ...f, days: Number(e.target.value) })}>{DEMO_DAYS.map((d) => <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>)}</select>
                  </label>
                  <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Max views</span>
                    <select className="input" value={f.maxViews} onChange={(e) => setF({ ...f, maxViews: Number(e.target.value) })}>{DEMO_VIEWS.map((n) => <option key={n} value={n}>{n === 0 ? "No limit" : n}</option>)}</select>
                  </label>
                </div>
                <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={f.showName} onChange={(e) => setF({ ...f, showName: e.target.checked })} /><span>Show the client&apos;s name and mobile moving over the video</span></label>
                <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={f.usePin} onChange={(e) => setF({ ...f, usePin: e.target.checked, pin: e.target.checked && !f.pin ? String(Math.floor(1000 + Math.random() * 9000)) : f.pin })} /><span>Ask for a PIN before playing</span></label>
                {f.usePin && <input className="input tracking-[0.3em]" inputMode="numeric" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })} aria-label="PIN" placeholder="4 to 6 digits" />}
                <button disabled={busy === "create"} className="btn-dark w-full justify-center py-2.5 text-sm">{busy === "create" ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create link</button>
                {made && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
                    <p className="font-semibold text-emerald-800">Link ready for {made.client}</p>
                    <p className="mt-1.5 break-all font-mono text-[13px] text-lav-700">{linkUrl(made.token)}</p>
                    {made.pin && <p className="mt-1 text-xs text-muted">PIN: <b>{made.pin}</b> (sent along with the link)</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => copy(made)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold">{copied === made.id ? <Check size={13} /> : <Copy size={13} />} {copied === made.id ? "Copied" : "Copy message"}</button>
                      {made.phone && <a href={wa(made)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white"><WhatsAppIcon size={13} /> Send on WhatsApp</a>}
                      <a href={`/v/${made.token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-mist">Open page</a>
                    </div>
                    <p className="mt-2 text-xs text-muted">Opening the page yourself and pressing play uses one view.</p>
                  </div>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
