"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Code2, Eye, EyeOff, Loader2, Plus, Save, ShieldCheck, Trash2, Zap } from "lucide-react";
import { KEY_GROUPS, validCustomName, type KeyDef, type KeyStatus, type SecretsView } from "@/lib/secret-keys";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

type Edits = Record<string, string | null>; // value to save, or null to remove

// Admin → API keys (owner only). Saved values are never shown again, only "•••• last 4".
export default function ApiKeysManager() {
  const [view, setView] = useState<SecretsView | null>(null);
  const [error, setError] = useState("");
  const [edits, setEdits] = useState<Edits>({});
  const [custom, setCustom] = useState<Edits>({});
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [tests, setTests] = useState<Record<string, { busy: boolean; ok?: boolean; message?: string }>>({});

  const load = useCallback(async () => {
    try {
      setView(await api<SecretsView>("/api/admin/secrets"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load keys.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = Object.keys(edits).length > 0 || Object.keys(custom).length > 0 || code !== null;

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const v = await api<SecretsView>("/api/admin/secrets", { method: "PUT", body: JSON.stringify({ keys: edits, custom, ...(code !== null ? { headCode: code } : {}) }) });
      setView(v);
      setEdits({});
      setCustom({});
      setCode(null);
      setMsg("Saved. Changes are live within 30 seconds.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const test = async (kind: string) => {
    setTests((t) => ({ ...t, [kind]: { busy: true } }));
    try {
      const r = await api<{ ok: boolean; message: string }>("/api/admin/secrets/test", { method: "POST", body: JSON.stringify({ kind }) });
      setTests((t) => ({ ...t, [kind]: { busy: false, ok: r.ok, message: r.message } }));
    } catch (e) {
      setTests((t) => ({ ...t, [kind]: { busy: false, ok: false, message: e instanceof Error ? e.message : "Test failed." } }));
    }
  };

  const addCustom = () => {
    const name = newName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!validCustomName(name) || !newValue.trim()) return;
    setCustom((c) => ({ ...c, [name]: newValue.trim() }));
    setNewName("");
    setNewValue("");
  };

  if (error) return <p className="rounded-2xl bg-red-50 p-5 text-red-700">{error}</p>;
  if (!view) return <p className="flex items-center gap-2 text-muted"><Loader2 size={18} className="animate-spin" /> Loading keys…</p>;

  const status = (name: string) => view.keys.find((k) => k.name === name);
  const pendingCustom = Object.entries(custom).filter(([n, v]) => v !== null && !view.custom.some((c) => c.name === n));

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3 rounded-3xl border border-lav-200 bg-lav-100/60 p-5 text-sm leading-relaxed text-ink/80">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-lav-700" />
        <p>
          Keys are saved encrypted in your database and never sent to visitors. After saving, a key is shown only as its last 4 characters. A key saved here is used instead of the same key in <code>.env.local</code>. Only the owner can see this page.
        </p>
      </div>
      {!view.canEncrypt && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /> AUTH_SECRET in .env.local must be at least 32 characters before keys can be saved here.</p>
      )}

      {KEY_GROUPS.map((g) => (
        <section key={g.id} className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">{g.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">{g.note}</p>
            </div>
            {g.test && (
              <button type="button" onClick={() => test(g.test!)} disabled={tests[g.test]?.busy || dirty} title={dirty ? "Save your changes first" : undefined} className="btn-ghost px-4 py-2 text-sm disabled:opacity-50">
                {tests[g.test]?.busy ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />} {g.test === "email" ? "Send test email" : g.test === "chat" ? "Test chatbot" : g.test === "whatsapp" ? "Send test WhatsApp" : "Send test lead"}
              </button>
            )}
          </div>
          {g.test && tests[g.test]?.message && (
            <p className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${tests[g.test]?.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
              {tests[g.test]?.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />} {tests[g.test]?.message}
            </p>
          )}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {g.keys.map((k) => (
              <KeyField key={k.name} def={k} status={status(k.name)} value={edits[k.name]} onChange={(v) => setEdits((e) => {
                const next = { ...e };
                if (v === undefined) delete next[k.name];
                else next[k.name] = v;
                return next;
              })} />
            ))}
          </div>
        </section>
      ))}

      {/* Custom keys */}
      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold">Other API keys</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">Store any other key here (for example RAZORPAY_KEY_ID or SHIPROCKET_TOKEN) so a developer can use it in new features without editing .env.local. Names use capital letters, numbers and _.</p>
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
          {view.custom.length === 0 && pendingCustom.length === 0 && <li className="p-4 text-sm text-muted">No other keys yet.</li>}
          {view.custom.map((c) => {
            const removing = custom[c.name] === null;
            return (
              <li key={c.name} className="flex flex-wrap items-center gap-3 p-4">
                <code className={`font-semibold ${removing ? "text-muted line-through" : ""}`}>{c.name}</code>
                <span className="text-sm text-muted">{c.preview}</span>
                <button type="button" onClick={() => setCustom((x) => { const n = { ...x }; if (removing) delete n[c.name]; else n[c.name] = null; return n; })} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} /> {removing ? "Undo" : "Remove"}
                </button>
              </li>
            );
          })}
          {pendingCustom.map(([n]) => (
            <li key={n} className="flex items-center gap-3 p-4">
              <code className="font-semibold">{n}</code><span className="text-sm text-lav-700">new, not saved yet</span>
              <button type="button" onClick={() => setCustom((x) => { const c2 = { ...x }; delete c2[n]; return c2; })} className="ml-auto rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-mist">Cancel</button>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
          <input className="input font-mono uppercase" placeholder="KEY_NAME" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className="input" type="password" autoComplete="off" placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <button type="button" onClick={addCustom} disabled={!validCustomName(newName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_")) || !newValue.trim()} className="btn-ghost px-4 py-2 text-sm disabled:opacity-50"><Plus size={15} /> Add</button>
        </div>
      </section>

      {/* Custom code */}
      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Code2 size={18} /> Custom code on every page</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Paste code that a service asks you to add to your website: a live-chat widget, a tracking pixel or a verification tag. It is added to every public page (not the admin panel). Only paste code from services you trust, since it runs on your site.
        </p>
        <textarea
          className="input mt-5 min-h-[160px] resize-y font-mono text-[13px]"
          spellCheck={false}
          placeholder={'<script src="https://example.com/widget.js" async></script>'}
          value={code ?? view.headCode}
          onChange={(e) => setCode(e.target.value)}
        />
      </section>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-[0_20px_50px_-30px_rgba(18,15,27,0.5)] backdrop-blur">
        <p className="text-sm text-muted">{msg || (dirty ? "You have unsaved changes." : "All keys saved.")}</p>
        <div className="flex gap-2">
          {dirty && <button type="button" onClick={() => { setEdits({}); setCustom({}); setCode(null); setMsg(""); }} className="btn-ghost px-4 py-2 text-sm">Discard</button>}
          <button type="button" onClick={save} disabled={!dirty || saving || !view.canEncrypt} className="btn-dark px-5 py-2.5 text-sm disabled:cursor-default disabled:bg-line disabled:text-muted">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save keys
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyField({ def, status, value, onChange }: { def: KeyDef; status?: KeyStatus; value: string | null | undefined; onChange: (v: string | null | undefined) => void }) {
  const [show, setShow] = useState(false);
  const removing = value === null;
  const badge = removing ? (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">will be removed</span>
  ) : status?.source === "admin" ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">saved here</span>
  ) : status?.source === "env" ? (
    <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-muted">from .env.local</span>
  ) : (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">not set</span>
  );

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label htmlFor={`key-${def.name}`} className="text-[13px] font-semibold text-ink">{def.label}</label>
        {badge}
        {def.hint && <span className="text-[12px] text-muted">{def.hint}</span>}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={`key-${def.name}`}
            className="input pr-10"
            type={def.secret && !show ? "password" : "text"}
            autoComplete="off"
            spellCheck={false}
            disabled={removing}
            placeholder={status?.set ? (def.secret ? `${status.preview} (type to replace)` : status.preview) : def.placeholder ?? ""}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value ? e.target.value : undefined)}
          />
          {def.secret && (
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide" : "Show"} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-mist">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>
        {status?.source === "admin" && (
          <button type="button" onClick={() => onChange(removing ? undefined : null)} title={removing ? "Undo" : "Remove the saved value"} aria-label={removing ? "Undo remove" : "Remove"} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:border-red-300 hover:text-red-600">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
