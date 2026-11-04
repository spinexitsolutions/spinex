"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, Mail, ShieldCheck, ShieldOff } from "lucide-react";

type Me = { name: string; email: string; role: string; twoStep: boolean; backupLeft: number; canSave: boolean; ownerEnvPassword: boolean; recoveryEmail: string };

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/admin/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Something went wrong.");
  return d as T;
}

// Admin → My account: two-step login, backup codes and password, for whoever is logged in.
export default function AccountPanel() {
  const [me, setMe] = useState<Me | null>(null);
  const load = useCallback(() => fetch("/api/admin/account").then((r) => r.json()).then(setMe).catch(() => undefined), []);
  useEffect(() => { load(); }, [load]);
  if (!me) return <div className="grid place-items-center rounded-3xl border border-line bg-white p-16 text-muted"><Loader2 className="animate-spin" /></div>;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6">
        <p className="text-sm text-muted">Logged in as</p>
        <p className="mt-1 font-display text-xl font-semibold">{me.name} <span className="text-base font-normal text-muted">· {me.email}</span></p>
        <NameForm me={me} />
      </section>
      <Recovery me={me} reload={load} />
      <TwoStep me={me} reload={load} />
      <Password me={me} />
    </div>
  );
}

function Codes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="font-semibold text-amber-900">Save these backup codes now</p>
      <p className="mt-1 text-sm text-amber-900">If you lose your phone, each code logs you in once. They won&apos;t be shown again. Write them down or keep them in a safe place (not on the same phone).</p>
      <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[15px] sm:grid-cols-4">{codes.map((c) => <span key={c} className="rounded-lg bg-white px-3 py-2 text-center">{c}</span>)}</div>
      <button onClick={() => navigator.clipboard?.writeText(codes.join("\n")).then(() => setCopied(true))} className="btn-ghost mt-4 bg-white px-4 py-2 text-sm">{copied ? <CheckCircle2 size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy all"}</button>
    </div>
  );
}

function TwoStep({ me, reload }: { me: Me; reload: () => void }) {
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-white p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        {me.twoStep ? <ShieldCheck size={19} className="text-emerald-600" /> : <ShieldOff size={19} className="text-amber-600" />}
        Two-step login {me.twoStep ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">On</span> : <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Off</span>}
      </h3>
      <p className="mt-1 text-sm text-muted">After your password, the login also asks for a 6-digit code from an app on your phone. Even if someone learns your password, they can&apos;t get in without your phone. Free apps: Google Authenticator, Microsoft Authenticator.</p>

      {!me.twoStep && !setup && (
        <button onClick={() => run("start", async () => setSetup(await post({ action: "start2fa" })))} disabled={!!busy || !me.canSave} className="btn-dark mt-5 px-5 py-2.5 text-sm">{busy === "start" ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Turn on two-step login</button>
      )}

      {!me.twoStep && setup && (
        <div className="mt-5 grid gap-6 rounded-2xl bg-mist p-5 sm:grid-cols-[auto_1fr]">
          <img src={setup.qr} alt="QR code for your authenticator app" className="h-48 w-48 rounded-xl bg-white p-2" />
          <div>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              <li>Install <b>Google Authenticator</b> on your phone.</li>
              <li>In the app press <b>+</b> → <b>Scan a QR code</b> and scan this code.</li>
              <li>Type the 6-digit code the app shows:</li>
            </ol>
            <div className="mt-3 flex gap-2">
              <input className="input max-w-[160px] text-center font-mono text-lg tracking-[0.3em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" aria-label="Code from the app" />
              <button onClick={() => run("confirm", async () => { const r = await post<{ codes: string[] }>({ action: "confirm2fa", code }); setCodes(r.codes); setSetup(null); setCode(""); reload(); })} disabled={code.length !== 6 || !!busy} className="btn-dark px-5 text-sm">{busy === "confirm" ? <Loader2 size={15} className="animate-spin" /> : "Turn on"}</button>
            </div>
            <p className="mt-3 text-xs text-muted">Can&apos;t scan? Type this key in the app instead: <span className="font-mono text-ink">{setup.secret}</span></p>
          </div>
        </div>
      )}

      {codes.length > 0 && <Codes codes={codes} />}

      {me.twoStep && (
        <div className="mt-5 space-y-5">
          <p className="text-sm">Backup codes left: <b>{me.backupLeft}</b>{me.backupLeft <= 2 && <span className="text-amber-700"> (make new ones)</span>}</p>
          <div className="grid gap-4 rounded-2xl bg-mist p-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">New backup codes</p>
              <p className="mt-1 text-xs text-muted">Old codes stop working.</p>
              <div className="mt-2 flex gap-2">
                <input className="input max-w-[140px] text-center font-mono" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="App code" aria-label="Code from the app" />
                <button onClick={() => run("codes", async () => { const r = await post<{ codes: string[] }>({ action: "backupCodes", code }); setCodes(r.codes); setCode(""); reload(); })} disabled={code.length !== 6 || !!busy} className="btn-ghost bg-white px-4 text-sm">Make codes</button>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">Turn off two-step login</p>
              <p className="mt-1 text-xs text-muted">Needs your password and an app or backup code.</p>
              <div className="mt-2 grid gap-2">
                <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" aria-label="Password" autoComplete="current-password" />
                <div className="flex gap-2">
                  <input className="input max-w-[140px] text-center font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" aria-label="Code" />
                  <button onClick={() => { if (confirm("Turn off two-step login? Your account will be protected by the password only.")) run("off", async () => { await post({ action: "disable2fa", password: pw, code }); setPw(""); setCode(""); setMsg({ ok: true, text: "Two-step login is off." }); reload(); }); }} disabled={!pw || code.length < 6 || !!busy} className="inline-flex items-center rounded-full px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">Turn off</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {msg && <p className={`mt-4 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </section>
  );
}

function Password({ me }: { me: Me }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async () => {
    if (next !== next2) return setMsg({ ok: false, text: "The two new passwords don't match." });
    setBusy(true);
    setMsg(null);
    try {
      await post({ action: "password", current: cur, next });
      setCur(""); setNext(""); setNext2("");
      setMsg({ ok: true, text: "Password changed. You were logged out on other devices." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't change it." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-3xl border border-line bg-white p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><KeyRound size={19} className="text-lav-600" /> Change password</h3>
      {me.ownerEnvPassword && <p className="mt-1 text-sm text-muted">You are using the password from the website settings file (ADMIN_PASSWORD). Once you change it here, the new one is used and the old one stops working.</p>}
      <div className="mt-5 grid max-w-xl gap-4 sm:grid-cols-3">
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Current password</span><input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">New password</span><input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Type it again</span><input className="input" type="password" autoComplete="new-password" value={next2} onChange={(e) => setNext2(e.target.value)} /></label>
      </div>
      <button onClick={save} disabled={busy || !cur || next.length < 8 || !next2 || !me.canSave} className="btn-dark mt-5 px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Change password</button>
      <p className="mt-2 text-xs text-muted">At least 8 characters. Forgot it? Log out and use &quot;Forgot password?&quot; on the login page.</p>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </section>
  );
}

// Recovery email: where "Forgot password?" sends the reset link (useful when the login email is not a real inbox).
function Recovery({ me, reload }: { me: Me; reload: () => void }) {
  const [email, setEmail] = useState(me.recoveryEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = email.trim().toLowerCase() !== me.recoveryEmail;
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await post({ action: "recovery", email, password });
      setPassword("");
      setMsg({ ok: true, text: email.trim() ? "Saved. Password reset links will go to this email." : "Removed. Reset links will go to your login email." });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save it." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-3xl border border-line bg-white p-6" data-recovery-email>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Mail size={19} className="text-lav-600" /> Recovery email</h3>
      <p className="mt-1 text-sm text-muted">
        If you forget your password, &quot;Forgot password?&quot; sends the reset link here. Use a real inbox you check, like your Gmail.
        {me.recoveryEmail ? <> Now: <b className="text-ink">{me.recoveryEmail}</b></> : <> Not set, so links go to your login email <b className="text-ink">{me.email}</b>.</>}
      </p>
      <div className="mt-5 grid max-w-xl gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Recovery email</span><input className="input" type="email" autoComplete="email" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Your password (to confirm)</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      </div>
      <button onClick={save} disabled={busy || !changed || !password || !me.canSave} className="btn-dark mt-5 px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Save recovery email</button>
      <p className="mt-2 text-xs text-muted">On the login page you can type either your login email or this recovery email.</p>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </section>
  );
}

// "Your name": shown in the greeting, the sidebar and on leads given to you.
function NameForm({ me }: { me: Me }) {
  const [name, setName] = useState(me.name === "Owner" ? "" : me.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await post({ action: "name", name });
      setMsg({ ok: true, text: "Saved. Reloading…" });
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save it." });
      setBusy(false);
    }
  };
  return (
    <div className="mt-5 flex max-w-xl flex-wrap items-end gap-3" data-display-name>
      <label className="min-w-[220px] flex-1">
        <span className="mb-1.5 block text-[13px] font-semibold">Your name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Palak Parik" maxLength={60} />
      </label>
      <button onClick={save} disabled={busy || name.trim().length < 2 || name.trim() === me.name || !me.canSave} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Save name</button>
      <p className="w-full text-xs text-muted">Shown in the greeting (&quot;Good morning, {name.trim().split(" ")[0] || "…"}&quot;), the sidebar and on leads given to you.</p>
      {msg && <p className={`w-full text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}
