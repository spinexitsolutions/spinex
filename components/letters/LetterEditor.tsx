"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft, Ban, BadgeCheck, Copy, FilePlus2, FileText, Loader2, Mail, Plus, RotateCcw, Save, Trash2, Undo2, Wand2,
} from "lucide-react";
import {
  LETTER_GROUPS, LETTER_TEMPLATES, SALUTATIONS, letterSigners, letterStatusLabel, salaryFromCtc, salaryTotal, templateFor, verifyLabel, verifyLink,
  type Letter, type Letterhead, type LetterSettings,
} from "@/lib/letters";
import WhatsAppIcon from "../WhatsAppIcon";
import LetterDocument from "./LetterDocument";
import PrintShell from "../billing/PrintShell";

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

const uid = () => Math.random().toString(36).slice(2, 10);
const waNumber = (p: string) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};
const statusBadge: Record<Letter["status"], string> = {
  draft: "bg-mist text-muted",
  issued: "bg-emerald-50 text-emerald-800",
  revoked: "bg-red-50 text-red-700",
};

export default function LetterEditor({ id, logo, verifyBase, readOnly = false }: { id: string; logo: string; verifyBase: string; readOnly?: boolean }) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [head, setHead] = useState<Letterhead | null>(null);
  const [settings, setSettings] = useState<LetterSettings | null>(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<"edit" | "pdf">("edit");
  const [qr, setQr] = useState("");
  const [another, setAnother] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3200);
  };

  useEffect(() => {
    Promise.all([api<{ letter: Letter; letterhead: Letterhead }>(`/api/admin/letters/${id}`), api<LetterSettings>("/api/admin/letters/settings")])
      .then(([d, st]) => {
        setLetter(d.letter);
        setSaved(JSON.stringify(d.letter));
        setHead(d.letterhead);
        setSettings(st);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!letter?.verifyCode) return;
    QRCode.toDataURL(verifyLink(verifyBase, letter.verifyCode), { margin: 0, width: 240, color: { dark: "#1D1A26", light: "#FFFFFF" } }).then(setQr).catch(() => setQr(""));
  }, [letter?.verifyCode, verifyBase]);

  const dirty = !!letter && JSON.stringify(letter) !== saved;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (patch: Partial<Letter>) => setLetter((l) => (l ? { ...l, ...patch } : l));
  const setPerson = (patch: Partial<Letter["person"]>) => setLetter((l) => (l ? { ...l, person: { ...l.person, ...patch } } : l));
  const setField = (k: string, v: string) => setLetter((l) => (l ? { ...l, fields: { ...l.fields, [k]: v } } : l));

  const save = useCallback(async () => {
    if (!letter) return null;
    setBusy("save");
    try {
      const out = await api<Letter>(`/api/admin/letters/${letter.id}`, {
        method: "PATCH",
        body: JSON.stringify({ date: letter.date, person: letter.person, fields: letter.fields, subject: letter.subject, body: letter.body, salary: letter.salary, signers: letter.signers }),
      });
      setLetter(out);
      setSaved(JSON.stringify(out));
      flash("Saved");
      return out;
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save.");
      return null;
    } finally {
      setBusy("");
    }
  }, [letter]);

  const t = letter ? templateFor(letter.type) : null;
  const usedKeys = useMemo(() => {
    if (!letter) return [] as string[];
    const keys = new Set<string>();
    for (const m of `${letter.subject}\n${letter.body}`.matchAll(/\{\{[#^/]?\s*(\w+)\s*\}\}/g)) keys.add(m[1]);
    return Array.from(keys);
  }, [letter]);

  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-semibold text-red-700">{error}</p><Link href="/admin#letters" className="btn-ghost mt-4">Back to admin</Link></div></div>;
  if (!letter || !head || !settings || !t) return <div className="grid min-h-screen place-items-center text-muted"><Loader2 className="animate-spin" /></div>;

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/l/${letter.token}` : "";
  const fileName = `${t.label} - ${letter.person.name || letter.number.replace(/\//g, "-")}`;
  const first = letter.person.name.split(/\s+/)[0] || "";
  const waText = `Hi ${first}, here is your ${t.label.toLowerCase()} from ${head.legalName}. View and download: ${shareLink}`;
  const savedWording = settings.wording[letter.type];
  const defaultWording = { subject: savedWording?.subject || t.subject, body: savedWording?.body || t.body };
  const wordingChanged = letter.subject !== defaultWording.subject || letter.body !== defaultWording.body;

  const act = async (action: "issue" | "revoke" | "restore") => {
    if (dirty && !(await save())) return;
    setBusy(action);
    try {
      const out = await api<Letter>(`/api/admin/letters/${letter.id}`, { method: "PATCH", body: JSON.stringify({ action }) });
      setLetter(out);
      setSaved(JSON.stringify(out));
      flash(action === "issue" ? "Issued. The letter now has its verification code." : action === "revoke" ? "Revoked. Verification will show it is no longer valid." : "Restored");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't change the status.");
    } finally {
      setBusy("");
    }
  };

  const send = async () => {
    if (dirty && !(await save())) return;
    setBusy("send");
    try {
      const r = await api<{ message: string; letter: Letter }>(`/api/admin/letters/${letter.id}/send`, { method: "POST" });
      setLetter(r.letter);
      setSaved(JSON.stringify(r.letter));
      flash(r.message);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't send.");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await api(`/api/admin/letters/${letter.id}`, { method: "DELETE" });
      window.location.href = "/admin#letters";
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't delete.");
      setBusy("");
    }
  };

  const makeAnother = async (type: string) => {
    if (dirty && !(await save())) return;
    setBusy("another");
    try {
      const l = await api<Letter>("/api/admin/letters", { method: "POST", body: JSON.stringify({ type, fromLetter: letter.id }) });
      window.location.href = `/admin/letters/${l.id}`;
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't make the letter.");
      setBusy("");
    }
  };

  const saveWording = async (reset: boolean) => {
    setBusy("wording");
    try {
      const st = await api<LetterSettings>("/api/admin/letters/settings", { method: "PUT", body: JSON.stringify(reset ? { type: letter.type, reset: true } : { type: letter.type, subject: letter.subject, body: letter.body }) });
      setSettings(st);
      if (reset) set({ subject: t.subject, body: t.body });
      flash(reset ? "Back to the original wording" : `New ${t.label.toLowerCase()}s will start with this wording`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save the wording.");
    } finally {
      setBusy("");
    }
  };

  const insertField = (key: string) => {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) return set({ body: `${letter.body}${token}` });
    const s = el.selectionStart ?? letter.body.length;
    const e = el.selectionEnd ?? s;
    set({ body: letter.body.slice(0, s) + token + letter.body.slice(e) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  };

  if (view === "pdf") {
    return (
      <PrintShell fileName={fileName} extra={<button onClick={() => setView("edit")} className="btn-ghost px-4 py-2.5 text-sm"><ArrowLeft size={16} /> Back to editing</button>}>
        <LetterDocument letter={letter} head={head} logo={logo} qr={qr} verifyUrl={verifyLabel(verifyBase)} />
      </PrintShell>
    );
  }

  const chosenSigners = letterSigners(letter, head).map((x) => x.id);
  const salaryRows = letter.salary;
  const placeholderKeys = ["firstName", "fullName", "company", "date", ...t.fields.map((x) => x.key)];

  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin#letters" className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-ink" aria-label="Back to letters"><ArrowLeft size={17} /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t.label}</p>
            <h1 className="truncate font-display text-xl font-semibold">{letter.number} · {letter.person.name || "New person"}</h1>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusBadge[letter.status]}`}>{letterStatusLabel[letter.status]}</span>
          <button onClick={() => setView("pdf")} className="btn-ghost px-4 py-2.5 text-sm"><FileText size={16} /> PDF</button>
          {readOnly ? <span className="rounded-full bg-lav-100 px-3 py-1.5 text-xs font-semibold text-lav-700">View only</span> : (
            <button onClick={save} disabled={!dirty || busy === "save"} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">
              {busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {dirty ? "Save" : "Saved"}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Box title="Issue and share">
            <div className="flex flex-wrap gap-2">
              {!readOnly && letter.status === "draft" && <button onClick={() => act("issue")} disabled={!!busy} className="btn-dark px-4 py-2.5 text-sm"><BadgeCheck size={15} /> Issue letter</button>}
              {!readOnly && letter.status !== "revoked" && <button onClick={send} disabled={!!busy} className={`${letter.status === "draft" ? "btn-ghost" : "btn-dark"} px-4 py-2.5 text-sm`}><Mail size={15} /> {busy === "send" ? "Sending…" : letter.sentAt ? "Email again" : "Email to person"}</button>}
              {letter.person.phone && letter.status !== "revoked" && <a href={`https://wa.me/${waNumber(letter.person.phone)}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-2.5 text-sm"><WhatsAppIcon size={15} /> WhatsApp</a>}
              <button onClick={() => navigator.clipboard?.writeText(shareLink).then(() => flash("Link copied")).catch(() => flash(shareLink))} className="btn-ghost px-4 py-2.5 text-sm"><Copy size={15} /> Copy link</button>
              {!readOnly && letter.status === "issued" && <button onClick={() => act("revoke")} disabled={!!busy} className="btn-ghost px-4 py-2.5 text-sm text-red-600"><Ban size={15} /> Revoke</button>}
              {!readOnly && letter.status === "revoked" && <button onClick={() => act("restore")} disabled={!!busy} className="btn-ghost px-4 py-2.5 text-sm"><Undo2 size={15} /> Restore</button>}
            </div>
            <p className="mt-3 text-xs text-muted">
              {letter.status === "draft"
                ? "Draft letters show a DRAFT mark. Issuing adds the verification code and QR code, so anyone can check the letter at the verify page. Emailing also issues it."
                : letter.status === "issued"
                ? `Verification code ${letter.verifyCode}${letter.sentAt ? ` · emailed ${new Date(letter.sentAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}. Changes you save also show on the person's link.`
                : "Revoked: the verify page says this letter is no longer valid."}
            </p>
          </Box>

          <Box title="Person">
            <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
              <F label="Title">
                <select className="input" value={letter.person.salutation} onChange={(e) => setPerson({ salutation: e.target.value })}>
                  {SALUTATIONS.map((s) => <option key={s} value={s}>{s || "None"}</option>)}
                </select>
              </F>
              <F label="Full name"><input className="input" value={letter.person.name} onChange={(e) => setPerson({ name: e.target.value })} /></F>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <F label="Email"><input className="input" type="email" value={letter.person.email} onChange={(e) => setPerson({ email: e.target.value })} /></F>
              <F label="Phone"><input className="input" value={letter.person.phone} onChange={(e) => setPerson({ phone: e.target.value })} /></F>
              {!t.toWhom && <F label="Address (optional)" wide><textarea className="input min-h-[64px]" value={letter.person.address} onChange={(e) => setPerson({ address: e.target.value })} placeholder="Printed under the name. One line per row." /></F>}
              <F label="Employee ID (optional)"><input className="input" value={letter.person.employeeId} onChange={(e) => setPerson({ employeeId: e.target.value })} /></F>
              <F label="Letter date"><input className="input" type="date" value={letter.date} onChange={(e) => set({ date: e.target.value })} /></F>
            </div>
          </Box>

          <Box title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              {t.fields.map((fl) => (
                <F key={fl.key} label={fl.label} hint={fl.hint} wide={fl.wide || fl.kind === "textarea"}>
                  {fl.kind === "textarea" ? (
                    <textarea className="input min-h-[80px]" value={letter.fields[fl.key] ?? ""} placeholder={fl.placeholder} onChange={(e) => setField(fl.key, e.target.value)} />
                  ) : fl.kind === "select" ? (
                    <select className="input" value={letter.fields[fl.key] ?? ""} onChange={(e) => setField(fl.key, e.target.value)}>
                      {(fl.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="input"
                      type={fl.kind === "date" ? "date" : "text"}
                      inputMode={fl.kind === "money" ? "numeric" : undefined}
                      value={letter.fields[fl.key] ?? ""}
                      placeholder={fl.placeholder}
                      onChange={(e) => setField(fl.key, fl.kind === "money" ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)}
                    />
                  )}
                </F>
              ))}
            </div>
            {usedKeys.some((k) => !placeholderKeys.includes(k) && !["name", "salutation", "employeeId", "email", "phone", "hasSalary"].includes(k)) && (
              <p className="mt-3 text-xs text-amber-800">The wording uses fields this letter type doesn&apos;t have: {usedKeys.filter((k) => !placeholderKeys.includes(k) && !["name", "salutation", "employeeId", "email", "phone", "hasSalary"].includes(k)).map((k) => `{{${k}}}`).join(", ")}. They print as a blank line.</p>
            )}
          </Box>

          {t.salary && (
            <Box title="Salary break-up (annexure)">
              <div className="space-y-2">
                {salaryRows.map((r) => (
                  <div key={r.id} className="grid grid-cols-[1fr_130px_40px] items-center gap-2">
                    <input className="input" value={r.label} placeholder="Component" aria-label="Component" onChange={(e) => set({ salary: salaryRows.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)) })} />
                    <input className="input text-right" inputMode="numeric" value={r.monthly || ""} placeholder="Monthly ₹" aria-label="Monthly amount" onChange={(e) => set({ salary: salaryRows.map((x) => (x.id === r.id ? { ...x, monthly: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)) })} />
                    <button onClick={() => set({ salary: salaryRows.filter((x) => x.id !== r.id) })} aria-label="Remove row" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => set({ salary: [...salaryRows, { id: uid(), label: "", monthly: 0 }] })} className="btn-ghost px-4 py-2 text-sm"><Plus size={15} /> Add row</button>
                {(Number(letter.fields.ctc || letter.fields.newCtc) > 0) && (
                  <button onClick={() => set({ salary: salaryFromCtc(Number(letter.fields.ctc || letter.fields.newCtc)) })} className="btn-ghost px-4 py-2 text-sm"><Wand2 size={15} /> Fill from CTC</button>
                )}
                {salaryRows.length > 0 && <span className="ml-auto text-sm">Monthly <b>₹{salaryTotal(salaryRows).toLocaleString("en-IN")}</b> · Yearly <b>₹{(salaryTotal(salaryRows) * 12).toLocaleString("en-IN")}</b></span>}
              </div>
              <p className="mt-2 text-xs text-muted">Fill from CTC splits the monthly amount as Basic 50%, HRA 25%, Special allowance 25%. Change it to match your payroll (PF, insurance and so on). Leave it empty to skip the annexure.</p>
            </Box>
          )}

          <Box title="Signatures">
            {head.signers.length === 0 ? (
              <p className="text-sm text-muted">No people added yet. Add them in <Link href="/admin#billing" className="font-semibold text-lav-700 underline">Quotes and invoices → Billing details → Signatures</Link>. The same people sign letters.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {head.signers.map((sg) => {
                    const on = chosenSigners.includes(sg.id);
                    return (
                      <label key={sg.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${on ? "border-lav-500 bg-lav-100 font-semibold text-lav-700" : "border-line"}`}>
                        <input type="checkbox" className="h-4 w-4 accent-lav-600" checked={on} onChange={() => set({ signers: on ? chosenSigners.filter((x) => x !== sg.id) : head.signers.map((x) => x.id).filter((x) => x === sg.id || chosenSigners.includes(x)) })} />
                        {sg.name || "Unnamed"}{sg.title ? <span className="font-normal text-muted">· {sg.title}</span> : null}
                      </label>
                    );
                  })}
                </div>
                {letter.signers !== null && <button onClick={() => set({ signers: null })} className="mt-3 text-xs font-semibold text-lav-700 underline">Use the default ticks again</button>}
              </>
            )}
          </Box>

          <Box title="Wording">
            <div className="space-y-4">
              <F label={t.toWhom ? "Title" : "Subject"}><input className="input" value={letter.subject} onChange={(e) => set({ subject: e.target.value })} /></F>
              <F label="Letter text">
                <textarea ref={bodyRef} className="input min-h-[360px] font-mono text-[13px] leading-relaxed" value={letter.body} onChange={(e) => set({ body: e.target.value })} spellCheck />
              </F>
              <div>
                <p className="text-xs font-semibold text-muted">Insert a detail at the cursor</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {placeholderKeys.map((k) => <button key={k} type="button" onClick={() => insertField(k)} className="rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[11.5px] hover:border-lav-500 hover:text-lav-700">{`{{${k}}}`}</button>)}
                </div>
                <p className="mt-2 text-xs text-muted">
                  <b>## </b>heading · <b>- </b>bullet · <b>**bold**</b> · blank line = new paragraph · <span className="font-mono">{"{{#field}}…{{/field}}"}</span> shows text only when that detail is filled.
                </p>
              </div>
              {!readOnly && (
                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  {wordingChanged && <button onClick={() => set({ subject: defaultWording.subject, body: defaultWording.body })} className="btn-ghost px-4 py-2 text-sm"><RotateCcw size={15} /> Reset to default wording</button>}
                  <button onClick={() => saveWording(false)} disabled={busy === "wording"} className="btn-ghost px-4 py-2 text-sm">Use this wording for all new {t.label.toLowerCase()}s</button>
                  {savedWording && <button onClick={() => saveWording(true)} disabled={busy === "wording"} className="btn-ghost px-4 py-2 text-sm">Back to the original wording</button>}
                </div>
              )}
            </div>
          </Box>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button onClick={() => setAnother((v) => !v)} disabled={busy === "another"} className="btn-ghost bg-white px-4 py-2.5 text-sm"><FilePlus2 size={15} /> Another letter for {first || "this person"}</button>
                {another && (
                  <div className="absolute bottom-full left-0 z-10 mb-2 max-h-[60vh] w-72 overflow-auto rounded-2xl border border-line bg-white p-2 shadow-xl">
                    {LETTER_GROUPS.map((g) => (
                      <div key={g}>
                        <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{g}</p>
                        {Object.entries(LETTER_TEMPLATES).filter(([, x]) => x.group === g).map(([k, x]) => (
                          <button key={k} onClick={() => makeAnother(k)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-mist">{x.label}</button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {askDelete ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  Delete this letter for good?
                  <button onClick={remove} disabled={busy === "delete"} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white">Yes, delete</button>
                  <button onClick={() => setAskDelete(false)} className="btn-ghost px-4 py-2 text-sm">No</button>
                </span>
              ) : (
                <button onClick={() => setAskDelete(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete letter</button>
              )}
              {askDelete && letter.status === "issued" && <p className="w-full text-xs text-muted">This letter is issued. If the person already has it, Revoke is better: the verify page will then say it is no longer valid, while deleting makes it look like it never existed.</p>}
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-2 text-sm font-semibold text-muted">Live preview</p>
          <div className="max-h-[calc(100vh-8rem)] overflow-auto rounded-2xl">
            <LetterDocument letter={letter} head={head} logo={logo} qr={qr} verifyUrl={verifyLabel(verifyBase)} />
          </div>
        </div>
      </div>

      {msg && <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"><p role="status" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl">{msg}</p></div>}
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function F({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
