"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Briefcase, FilePlus2, FileSignature, GraduationCap, Loader2, LogOut, RefreshCw, Search, TrendingUp } from "lucide-react";
import { LETTER_GROUPS, LETTER_TEMPLATES, letterStatusLabel, longDate, templateFor, type Letter, type LetterGroup, type LetterSettings } from "@/lib/letters";
import Modal from "./Modal";

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

const groupIcon: Record<LetterGroup, typeof Briefcase> = {
  Hiring: Briefcase,
  Internship: GraduationCap,
  "During employment": TrendingUp,
  Leaving: LogOut,
  Certificates: Award,
};

const tone: Record<Letter["status"], string> = {
  draft: "bg-mist text-muted",
  issued: "bg-emerald-50 text-emerald-800",
  revoked: "bg-red-50 text-red-700 line-through",
};

// The list of letter types, grouped. Picking one makes a new letter (for a person, when internId is given).
export function LetterTypePicker({ internId, onError }: { internId?: string; onError?: (m: string) => void }) {
  const [creating, setCreating] = useState("");
  const create = async (type: string) => {
    setCreating(type);
    try {
      const l = await api<Letter>("/api/admin/letters", { method: "POST", body: JSON.stringify({ type, internId }) });
      window.location.href = `/admin/letters/${l.id}`;
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Couldn't start the letter.");
      setCreating("");
    }
  };
  return (
    <div className="space-y-5">
      {LETTER_GROUPS.map((g) => {
        const Icon = groupIcon[g];
        return (
          <div key={g}>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted"><Icon size={14} /> {g}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(LETTER_TEMPLATES).filter(([, t]) => t.group === g).map(([k, t]) => (
                <button key={k} onClick={() => create(k)} disabled={!!creating} className="rounded-2xl border border-line bg-white p-4 text-left transition hover:border-lav-500 hover:bg-lav-100/40 disabled:opacity-60">
                  <span className="flex items-center gap-2 font-semibold">{creating === k ? <Loader2 size={15} className="animate-spin" /> : null}{t.label}</span>
                  <span className="mt-0.5 block text-sm text-muted">{t.help}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LettersManager({ readOnly = false }: { readOnly?: boolean }) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [settings, setSettings] = useState<LetterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<"all" | LetterGroup>("all");
  const [picking, setPicking] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [savingPrefix, setSavingPrefix] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [l, s] = await Promise.all([api<Letter[]>("/api/admin/letters"), api<LetterSettings>("/api/admin/letters/settings")]);
      setLetters(l);
      setSettings(s);
      setPrefix(s.prefix);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load letters.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return letters.filter((l) => {
      const t = templateFor(l.type);
      if (group !== "all" && t.group !== group) return false;
      if (!needle) return true;
      return `${l.person.name} ${l.person.email} ${l.number} ${l.verifyCode} ${t.label} ${l.fields.designation ?? ""} ${l.fields.role ?? ""}`.toLowerCase().includes(needle);
    });
  }, [letters, q, group]);

  const savePrefix = async () => {
    setSavingPrefix(true);
    try {
      const s = await api<LetterSettings>("/api/admin/letters/settings", { method: "PUT", body: JSON.stringify({ prefix }) });
      setSettings(s);
      setPrefix(s.prefix);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSavingPrefix(false);
    }
  };

  const count = (g: LetterGroup) => letters.filter((l) => templateFor(l.type).group === g).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">HR letters</h2>
          <p className="text-sm text-muted">Offer letters, appointment, experience, relieving, salary and other company letters, with a verification QR code.</p>
        </div>
        <a href="/letter-samples" target="_blank" rel="noreferrer" className="btn-ghost ml-auto bg-white px-4 py-2.5 text-sm">See samples</a>
        {!readOnly && <button onClick={() => setPicking(true)} className="btn-dark px-5 py-2.5 text-sm"><FilePlus2 size={16} /> New letter</button>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...LETTER_GROUPS] as const).map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={`rounded-full px-4 py-2 text-sm font-medium ${group === g ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>
            {g === "all" ? `All (${letters.length})` : `${g} (${count(g)})`}
          </button>
        ))}
        <label className="ml-auto flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-full border border-line bg-white px-4 sm:flex-none">
          <Search size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, number or code" aria-label="Search letters" className="h-full w-full bg-transparent text-sm outline-none" />
        </label>
        <button onClick={load} aria-label="Refresh" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white hover:border-ink"><RefreshCw size={15} /></button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      {loading ? (
        <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
          <FileSignature className="mx-auto text-lav-600" />
          <p className="mt-3 font-semibold">{letters.length ? "No letters match." : "No letters yet"}</p>
          <p className="mt-1 text-sm text-muted">{letters.length ? "Try another name or filter." : "Press New letter, pick the type, fill the details and download or email it."}</p>
          {!letters.length && !readOnly && <button onClick={() => setPicking(true)} className="btn-dark mt-5 px-5 py-2.5 text-sm"><FilePlus2 size={16} /> New letter</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((l) => {
            const t = templateFor(l.type);
            const role = l.fields.newDesignation || l.fields.designation || l.fields.role || "";
            return (
              <a key={l.id} href={`/admin/letters/${l.id}`} className="grid items-center gap-x-4 gap-y-1 rounded-2xl border border-line bg-white px-5 py-4 transition hover:border-ink sm:grid-cols-[180px_1fr_auto_auto]">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{t.label}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{l.person.name || "No name yet"}</span>
                  <span className="block truncate text-sm text-muted">{[l.number, role, longDate(l.date)].filter(Boolean).join(" · ")}</span>
                </span>
                {l.sentAt ? <span className="text-xs text-muted">Emailed</span> : <span />}
                <span className={`justify-self-start rounded-full px-3 py-1 text-xs font-semibold sm:justify-self-end ${tone[l.status]}`}>{letterStatusLabel[l.status]}</span>
              </a>
            );
          })}
        </div>
      )}

      {settings && !readOnly && (
        <details className="rounded-3xl border border-line bg-white p-5">
          <summary className="cursor-pointer font-semibold">Letter settings</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Reference number starts with</span>
              <input className="input max-w-xs uppercase" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
              <span className="mt-1 block text-xs text-muted">e.g. SPX gives SPX/OL/2026/001 for offer letters. Applies to new letters.</span>
            </label>
            <button onClick={savePrefix} disabled={savingPrefix || prefix === settings.prefix} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">Save</button>
          </div>
          <p className="mt-4 text-sm text-muted">
            The company name, address and signatures on letters come from <a href="/admin#billing" className="font-semibold text-lav-700 underline">Quotes and invoices → Billing details</a>. To change the default wording of a letter type, edit the wording in any letter of that type and press <b>Use this wording for all new letters</b>.
          </p>
        </details>
      )}

      <Modal open={picking} title="What kind of letter?" onClose={() => setPicking(false)} wide>
        <LetterTypePicker onError={(m) => { setPicking(false); setError(m); }} />
      </Modal>
    </div>
  );
}
