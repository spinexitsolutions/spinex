"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2, MessageCircle } from "lucide-react";
import { useContent } from "../ContentProvider";
import { LEAD_SOURCES, MANUAL_SOURCES, type Lead, type ManualSource } from "@/lib/leads";
import { defaultWaTemplates, type WaTemplate } from "@/lib/content";

type Member = { id: string; name: string; role: string };

export const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

const fill = (text: string, lead: Pick<Lead, "name" | "services" | "phone">, company: string) =>
  text
    .replace(/\{name\}/g, lead.name.split(" ")[0] || lead.name)
    .replace(/\{service\}/g, lead.services || "your project")
    .replace(/\{phone\}/g, lead.phone)
    .replace(/\{company\}/g, company);

// WhatsApp button with a list of ready messages (Admin → Lead emails and alerts → Ready WhatsApp messages).
export function WaPicker({ lead, onSent, compact = false }: { lead: Lead; onSent?: () => void; compact?: boolean }) {
  const { content } = useContent();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const templates: WaTemplate[] = content.leadReplies?.waTemplates?.length ? content.leadReplies.waTemplates : defaultWaTemplates;
  const company = content.brand.name || "Spinex IT Solutions";
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const link = (text: string) => `https://wa.me/${waNumber(lead.phone)}?text=${encodeURIComponent(text)}`;
  return (
    <div ref={box} className="relative" data-wa-picker>
      {compact ? (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`WhatsApp ${lead.name}`} title="WhatsApp" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-emerald-50 hover:text-emerald-700"><MessageCircle size={16} /></button>
      ) : (
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost px-4 py-2.5 text-sm"><MessageCircle size={15} /> WhatsApp <ChevronDown size={14} /></button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-40 mt-2 w-[min(320px,85vw)] overflow-hidden rounded-2xl border border-line bg-white text-left shadow-[0_20px_50px_-20px_rgba(18,15,27,0.4)]">
            <p className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Send a ready message</p>
            <ul className="max-h-72 overflow-y-auto">
              {templates.map((t) => (
                <li key={t.id}>
                  <a href={link(fill(t.text, lead, company))} target="_blank" rel="noreferrer" onClick={() => { setOpen(false); onSent?.(); }} className="block px-4 py-2.5 hover:bg-mist">
                    <span className="block text-sm font-semibold">{t.label}</span>
                    <span className="line-clamp-2 text-xs text-muted">{fill(t.text, lead, company)}</span>
                  </a>
                </li>
              ))}
              <li>
                <a href={`https://wa.me/${waNumber(lead.phone)}`} target="_blank" rel="noreferrer" onClick={() => { setOpen(false); onSent?.(); }} className="block border-t border-line px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">Open chat without a message</a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inDays = (days: number) => new Date(Date.now() + 5.5 * 3600 * 1000 + days * 86400000).toISOString().slice(0, 10);

// "Add lead": for enquiries that came by phone, WhatsApp, Instagram, referral or in person.
export function AddLeadForm({ team, myId, onAdded, onOpenExisting }: { team: Member[]; myId: string; onAdded: (l: Lead) => void; onOpenExisting: (id: string) => void }) {
  const { content } = useContent();
  const [f, setF] = useState({ name: "", phone: "", email: "", services: "", message: "", value: "", status: "new", followUp: "", followUpNote: "", assignedTo: "" });
  const [source, setSource] = useState<ManualSource>("call");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dup, setDup] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const save = async (force = false) => {
    setBusy(true);
    setErr("");
    (window as Window & { __spxSelfLead?: number }).__spxSelfLead = Date.now();
    try {
      const res = await fetch("/api/admin/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, source, force }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.duplicate) {
        setDup(String(d.duplicate));
        setErr(String(d.error || "This number is already in Leads."));
        return;
      }
      if (!res.ok) throw new Error(d.error || "Couldn't add the lead.");
      onAdded(d as Lead);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't add the lead.");
    } finally {
      setBusy(false);
    }
  };
  const label = "mb-1.5 block text-[13px] font-semibold";
  return (
    <div className="space-y-5" data-add-lead>
      <div>
        <span className={label}>Came from</span>
        <div className="flex flex-wrap gap-1.5">
          {MANUAL_SOURCES.map((s) => (
            <button key={s} type="button" onClick={() => setSource(s)} aria-pressed={source === s} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${source === s ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>{LEAD_SOURCES[s]}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className={label}>Name *</span><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></label>
        <label className="block"><span className={label}>Phone</span><input className="input" inputMode="tel" value={f.phone} onChange={(e) => { set("phone", e.target.value); setDup(""); }} placeholder="98765 43210" /></label>
        <label className="block"><span className={label}>Email</span><input className="input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></label>
        <label className="block">
          <span className={label}>Needs</span>
          <select className="input" value={f.services} onChange={(e) => set("services", e.target.value)}>
            <option value="">Choose a service</option>
            {content.services.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
          </select>
        </label>
      </div>
      <label className="block"><span className={label}>What did they ask?</span><textarea className="input min-h-[80px]" value={f.message} onChange={(e) => set("message", e.target.value)} placeholder="e.g. Wants a 5-page website for a clinic, budget around ₹25,000" /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={label}>Status</span>
          <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="new">New</option>
            <option value="contacted">Contacted (already talked)</option>
            <option value="quote">Quote sent</option>
          </select>
        </label>
        <label className="block"><span className={label}>Deal value (₹)</span><input className="input" inputMode="numeric" value={f.value} onChange={(e) => set("value", e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 25000" /></label>
        <label className="block">
          <span className={label}>Given to</span>
          <select className="input" value={f.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
            <option value="">Nobody</option>
            {team.map((m) => <option key={m.id} value={m.id}>{m.id === myId ? `${m.name} (you)` : m.name}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-[200px_1fr]">
        <label className="block">
          <span className={label}>Follow up on</span>
          <input className="input" type="date" value={f.followUp} onChange={(e) => set("followUp", e.target.value)} />
          <span className="mt-2 flex flex-wrap gap-1.5">
            {([["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]] as const).map(([l, d]) => (
              <button key={l} type="button" onClick={() => set("followUp", inDays(d))} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-ink">{l}</button>
            ))}
          </span>
        </label>
        <label className="block"><span className={label}>What to do</span><input className="input" value={f.followUpNote} onChange={(e) => set("followUpNote", e.target.value)} placeholder="e.g. Send the quotation" /></label>
      </div>
      {err && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {err}
          {dup && (
            <span className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => onOpenExisting(dup)} className="btn-ghost bg-white px-3 py-1.5 text-xs">Open that lead</button>
              <button type="button" onClick={() => save(true)} className="btn-ghost bg-white px-3 py-1.5 text-xs">Add anyway</button>
            </span>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={() => save(false)} disabled={busy || !f.name.trim() || (!f.phone.trim() && !f.email.trim())} className="btn-dark disabled:bg-line disabled:text-muted">{busy ? <Loader2 size={16} className="animate-spin" /> : null} Add lead</button>
      </div>
    </div>
  );
}
