"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, BellRing, CheckCircle2, Copy, DatabaseBackup, Download, Loader2, Play, RefreshCw, Save, TriangleAlert, Workflow } from "lucide-react";

type Settings = { remindersOn: boolean; reminderHour: number; whatsappSummary: boolean; backupFrequency: string; backupWeekday: number; backupEmail: string };
type Data = {
  settings: Settings;
  state: { lastCron?: string; lastReminders?: string; lastRemindersResult?: string; lastBackup?: string; lastBackupOk?: boolean; lastBackupResult?: string };
  cronUrl: string;
  healthUrl: string;
  vercelCron: boolean;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Something went wrong. Try again.");
  return data as T;
}

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never");
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hourLabel = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

export default function AutomationPanel({ goApiKeys }: { goApiKeys: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [health, setHealth] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<Data>("/api/admin/automation");
      setData(d);
      setS(d.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <div className="rounded-3xl border border-red-200 bg-white p-8 text-center"><p className="font-semibold text-red-700">{error}</p><button onClick={load} className="btn-ghost mt-4"><RefreshCw size={16} /> Try again</button></div>;
  if (!data || !s) return <div className="grid place-items-center rounded-3xl border border-line bg-white p-16 text-muted"><Loader2 className="animate-spin" /></div>;

  const dirty = JSON.stringify(s) !== JSON.stringify(data.settings);
  const save = async () => {
    setBusy("save");
    try {
      const out = await api<Settings>("/api/admin/automation", { method: "PUT", body: JSON.stringify(s) });
      setData({ ...data, settings: out });
      setS(out);
      setNote((n) => ({ ...n, save: { ok: true, text: "Saved" } }));
    } catch (e) {
      setNote((n) => ({ ...n, save: { ok: false, text: e instanceof Error ? e.message : "Couldn't save." } }));
    } finally {
      setBusy("");
    }
  };
  const run = async (job: "reminders" | "backup") => {
    setBusy(job);
    try {
      const r = await api<{ ok: boolean; message: string }>("/api/admin/automation/run", { method: "POST", body: JSON.stringify({ job }) });
      setNote((n) => ({ ...n, [job]: { ok: r.ok, text: r.message } }));
      load();
    } catch (e) {
      setNote((n) => ({ ...n, [job]: { ok: false, text: e instanceof Error ? e.message : "Failed." } }));
    } finally {
      setBusy("");
    }
  };
  const checkHealth = async () => {
    setBusy("health");
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      setHealth({ ok: res.ok, text: res.ok ? `Website and database are up (answered in ${j.ms ?? "?"} ms).` : `Problem: ${j.status ?? res.status}` });
    } catch {
      setHealth({ ok: false, text: "No answer from the website." });
    } finally {
      setBusy("");
    }
  };
  const copy = (text: string, key: string) => navigator.clipboard?.writeText(text).then(() => setNote((n) => ({ ...n, [key]: { ok: true, text: "Copied" } })));

  const cronOk = data.state.lastCron && Date.now() - new Date(data.state.lastCron).getTime() < 26 * 3600 * 1000;

  return (
    <div className="space-y-6">
      <Card icon={<Workflow size={18} />} title="1. Scheduler (needed for reminders and backups)" note="Reminders and automatic backups run when a scheduler opens the link below. Set it up once.">
        <p className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${cronOk ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {cronOk ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}
          {cronOk ? `Working. Last run: ${when(data.state.lastCron)}.` : data.state.lastCron ? `Last run ${when(data.state.lastCron)}: more than a day ago. Check the scheduler.` : "Not set up yet: the link has never been opened."}
        </p>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-semibold">Scheduler link (keep it private)</span>
          <div className="flex gap-2">
            <input readOnly className="input font-mono text-xs" value={data.cronUrl} onFocus={(e) => e.target.select()} />
            <button onClick={() => copy(data.cronUrl, "cron")} className="btn-ghost shrink-0 px-4 text-sm"><Copy size={15} /> Copy</button>
          </div>
          {note.cron && <span className="mt-1 block text-xs text-emerald-700">{note.cron.text}</span>}
        </label>
        <div className="mt-4 rounded-2xl bg-mist p-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Easiest way (free): cron-job.org</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>Make a free account on cron-job.org and press <b>Create cronjob</b>.</li>
            <li>Paste the link above as the URL.</li>
            <li>Choose <b>Every 1 hour</b> and save. That&apos;s it.</li>
          </ol>
          <p className="mt-3">On <b>Vercel</b> it runs once a day at 9 AM by itself: just add <code>CRON_SECRET</code> (any long random text) in Vercel → Settings → Environment Variables.{data.vercelCron ? " (Already set.)" : ""}</p>
        </div>
      </Card>

      <Card icon={<BellRing size={18} />} title="2. Follow-up reminders" note="Every morning, each person gets one email listing the leads they should follow up with today (set the date and note on the lead). Leads given to nobody go to you.">
        <Toggle checked={s.remindersOn} onChange={(v) => setS({ ...s, remindersOn: v })} label="Send follow-up reminders" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold">Send at (India time)</span>
            <select className="input" value={s.reminderHour} onChange={(e) => setS({ ...s, reminderHour: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted">Sent the first time the scheduler runs after this hour.</span>
            {data.vercelCron && !cronOk && s.reminderHour > 9 && <span className="mt-1 block text-xs text-amber-700">Vercel runs the scheduler once a day at 9 AM, so pick 9 AM or earlier, or also add cron-job.org (every hour).</span>}
          </label>
          <div className="pt-6"><Toggle checked={s.whatsappSummary} onChange={(v) => setS({ ...s, whatsappSummary: v })} label="Also send me a WhatsApp summary" /></div>
        </div>
        <Status label="Last sent" value={data.state.lastReminders ? `${data.state.lastReminders}: ${data.state.lastRemindersResult ?? ""}` : "never"} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={() => run("reminders")} disabled={!!busy} className="btn-ghost px-4 py-2.5 text-sm">{busy === "reminders" ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Send today&apos;s reminders now</button>
          {note.reminders && <Msg {...note.reminders} />}
        </div>
      </Card>

      <Card icon={<DatabaseBackup size={18} />} title="3. Automatic database backup" note="A full copy of leads, interns, blog posts, quotations, invoices, website content and settings, emailed to you as a .json.gz file. Images and API keys are not included. Passwords are never included.">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold">How often</span>
            <select className="input" value={s.backupFrequency} onChange={(e) => setS({ ...s, backupFrequency: e.target.value })}>
              <option value="daily">Every day</option>
              <option value="weekly">Once a week</option>
              <option value="off">Off</option>
            </select>
          </label>
          {s.backupFrequency === "weekly" && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Day</span>
              <select className="input" value={s.backupWeekday} onChange={(e) => setS({ ...s, backupWeekday: Number(e.target.value) })}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold">Send to email</span>
            <input className="input" type="email" value={s.backupEmail} onChange={(e) => setS({ ...s, backupEmail: e.target.value })} placeholder="Same as 'Send alerts to'" />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">Tip: use a separate Gmail just for backups, so they don&apos;t fill your main inbox. Email is set up in <button onClick={goApiKeys} className="font-semibold text-lav-700 underline">API keys → Email alerts</button>.</p>
        <Status label="Last backup" value={data.state.lastBackup ? `${when(data.state.lastBackup)}: ${data.state.lastBackupResult ?? ""}` : "never"} bad={data.state.lastBackup ? data.state.lastBackupOk === false : false} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={() => run("backup")} disabled={!!busy} className="btn-ghost px-4 py-2.5 text-sm">{busy === "backup" ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Email a backup now</button>
          <a href="/api/admin/backup" className="btn-ghost px-4 py-2.5 text-sm"><Download size={15} /> Download backup now</a>
          {note.backup && <Msg {...note.backup} />}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={!dirty || busy === "save"} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save settings</button>
        {note.save && <Msg {...note.save} />}
      </div>

      <Card icon={<Activity size={18} />} title="4. Alert when the website is down (uptime monitoring)" note="A website can't tell you it is down, so an outside service checks it every few minutes and alerts you by email or on its phone app.">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Health check link</span>
          <div className="flex gap-2">
            <input readOnly className="input font-mono text-xs" value={data.healthUrl} onFocus={(e) => e.target.select()} />
            <button onClick={() => copy(data.healthUrl, "health")} className="btn-ghost shrink-0 px-4 text-sm"><Copy size={15} /> Copy</button>
          </div>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={checkHealth} disabled={!!busy} className="btn-ghost px-4 py-2.5 text-sm">{busy === "health" ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />} Check now</button>
          {health && <Msg ok={health.ok} text={health.text} />}
        </div>
        <div className="mt-4 rounded-2xl bg-mist p-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Set it up free with UptimeRobot (5 minutes)</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>Make a free account on uptimerobot.com and press <b>New monitor</b>.</li>
            <li>Type <b>HTTP(s)</b>, paste the health check link above, check every 5 minutes.</li>
            <li>Pick how you want alerts (email, and the UptimeRobot phone app for instant alerts) and save.</li>
          </ol>
          <p className="mt-2">It alerts you when the website or its database stops answering, and again when it is back.</p>
        </div>
      </Card>
    </div>
  );
}

function Card({ icon, title, note, children }: { icon: React.ReactNode; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="text-lav-600">{icon}</span>{title}</h3>
      <p className="mb-5 mt-1 text-sm text-muted">{note}</p>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" className="h-5 w-5 accent-lav-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function Status({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return <p className={`mt-4 text-sm ${bad ? "text-red-700" : "text-muted"}`}><span className="font-semibold">{label}:</span> {value}</p>;
}

function Msg({ ok, text }: { ok: boolean; text: string }) {
  return <span className={`text-sm ${ok ? "text-emerald-700" : "text-red-700"}`}>{text}</span>;
}
