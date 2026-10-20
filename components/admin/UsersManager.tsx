"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, ShieldCheck, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
import { AREAS, ROLES, ROLE_ACCESS, roleHelp, roleLabel, sameAccess, type Access, type Level, type Role } from "@/lib/roles";
import type { AdminUser } from "@/lib/users";
import Modal from "./Modal";

const assignable = ROLES.filter((r) => r !== "owner");

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

// Team members who can log in to the admin panel, each with a role.
export default function UsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [accessFor, setAccessFor] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api<AdminUser[]>("/api/admin/users"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (u: AdminUser, body: Record<string, unknown>) => {
    try {
      const saved = await api<AdminUser>(`/api/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setUsers((all) => all.map((x) => (x.id === u.id ? saved : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Team members</h2>
            <p className="mt-1 text-sm text-muted">Give each person their own login. You, the owner, log in with the email and password in .env.local.</p>
          </div>
          <button onClick={() => setAdding(true)} className="btn-dark px-4 py-2.5 text-sm"><Plus size={16} /> Add member</button>
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {loading ? (
          <div className="grid place-items-center p-10 text-muted"><Loader2 className="animate-spin" /></div>
        ) : users.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-muted">No team members yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-lav-100 text-lav-700"><UserRound size={18} /></span>
                <span className="min-w-[180px] flex-1">
                  <span className={`block font-semibold ${u.active ? "" : "text-muted line-through"}`}>{u.name}</span>
                  <span className="text-sm text-muted">{u.email}{u.lastLogin ? ` · last login ${new Date(u.lastLogin).toLocaleDateString("en-IN")}` : " · never logged in"}</span>
                </span>
                <button onClick={() => setAccessFor(u)} title="Choose what this person can see and change" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm hover:border-ink">
                  <SlidersHorizontal size={15} /> {roleLabel[u.role]}{u.access && !sameAccess(u.access, ROLE_ACCESS[u.role]) ? " (custom)" : ""}
                </button>
                <button onClick={() => patch(u, { active: !u.active })} className={`min-h-10 rounded-full px-3 text-sm font-medium ${u.active ? "bg-emerald-50 text-emerald-800" : "bg-mist text-muted"}`}>
                  {u.active ? "Active" : "Blocked"}
                </button>
                {u.twoStep ? (
                  <button onClick={() => { if (confirm(`Turn off two-step login for ${u.name}? Do this only if they lost their phone and backup codes. They can turn it on again from My account.`)) patch(u, { reset2fa: true }); }} title="Two-step login is on. Click to turn it off (lost phone)." className="min-h-10 rounded-full bg-emerald-50 px-3 text-sm font-medium text-emerald-800">2-step on</button>
                ) : (
                  <span title="This member hasn't turned on two-step login yet (My account)" className="min-h-10 rounded-full bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800">2-step off</span>
                )}
                <button onClick={() => setResetFor(u)} aria-label="Reset password" title="Reset password" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink"><KeyRound size={16} /></button>
                <button
                  onClick={async () => {
                    if (!confirm(`Remove ${u.name}? They won't be able to log in.`)) return;
                    try {
                      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
                      setError("");
                      setUsers((all) => all.filter((x) => x.id !== u.id));
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Couldn't remove.");
                    }
                  }}
                  aria-label="Remove"
                  className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck size={18} className="text-lav-600" /> Ready-made roles</h2>
        <p className="mt-1 text-sm text-muted">Pick one as a starting point, then press the role button next to a person to tick exactly what they can see and change. Team, API keys and backups always stay with you (owner).</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <li key={r} className="rounded-2xl bg-mist p-4">
              <p className="font-semibold">{roleLabel[r]}</p>
              <p className="text-sm text-muted">{roleHelp[r]}</p>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={adding} title="Add a team member" onClose={() => setAdding(false)} wide>
        <UserForm
          onDone={(u) => {
            setUsers((all) => [u, ...all]);
            setAdding(false);
          }}
        />
      </Modal>
      <Modal open={!!accessFor} title={`What ${accessFor?.name ?? ""} can do`} onClose={() => setAccessFor(null)} wide>
        {accessFor && (
          <AccessForm
            initialRole={accessFor.role}
            initialAccess={accessFor.access ?? ROLE_ACCESS[accessFor.role]}
            onSave={async (role, access) => {
              await patch(accessFor, { role, access });
              setAccessFor(null);
            }}
          />
        )}
      </Modal>
      <Modal open={!!resetFor} title={`New password for ${resetFor?.name ?? ""}`} onClose={() => setResetFor(null)}>
        {resetFor && <ResetForm user={resetFor} onDone={() => setResetFor(null)} />}
      </Modal>
    </div>
  );
}

function UserForm({ onDone }: { onDone: (u: AdminUser) => void }) {
  const [f, setF] = useState({ name: "", email: "", role: "editor" as Role, password: "" });
  const [access, setAccess] = useState<Access>(ROLE_ACCESS.editor);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          onDone(await api<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify({ ...f, access }) }));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't add.");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Name</span><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Email</span><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <AccessEditor role={f.role} access={access} onRole={(role) => { setF({ ...f, role }); setAccess(ROLE_ACCESS[role]); }} onAccess={setAccess} />
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Password</span><input className="input" type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="At least 8 characters" /></label>
      <p className="text-xs text-muted">Share the email and password with them privately. They can log in at /admin.</p>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button disabled={busy} className="btn-dark w-full disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : "Add member"}</button>
    </form>
  );
}

function ResetForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ password: pw }) });
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't save.");
        }
      }}
      className="space-y-4"
    >
      <input className="input" type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (8+ characters)" autoFocus aria-label="New password" />
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button className="btn-dark w-full">Save password</button>
    </form>
  );
}

const LEVELS: { id: Level; label: string }[] = [
  { id: "none", label: "No access" },
  { id: "view", label: "Only view" },
  { id: "edit", label: "View and change" },
];

// Role (a ready-made set of ticks) plus one row per area: No access / Only view / View and change.
function AccessEditor({ role, access, onRole, onAccess }: { role: Role; access: Access; onRole: (r: Role) => void; onAccess: (a: Access) => void }) {
  const custom = !sameAccess(access, ROLE_ACCESS[role]);
  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Start from a role</span>
        <select className="input" value={role} onChange={(e) => onRole(e.target.value as Role)}>
          {assignable.map((r) => <option key={r} value={r}>{roleLabel[r]}: {roleHelp[r]}</option>)}
        </select>
      </label>
      <p className="mt-4 flex items-center justify-between text-sm font-medium">
        <span>What they can do {custom && <span className="ml-1 rounded-full bg-lav-100 px-2 py-0.5 text-xs font-semibold text-lav-700">Custom</span>}</span>
        {custom && <button type="button" onClick={() => onAccess(ROLE_ACCESS[role])} className="text-xs font-semibold text-lav-700 underline">Reset to {roleLabel[role]}</button>}
      </p>
      <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {AREAS.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="min-w-[200px] flex-1">
              <span className="block text-sm font-semibold">{a.label}</span>
              <span className="block text-xs text-muted">{a.help}</span>
            </span>
            <span className="flex overflow-hidden rounded-full border border-line text-xs" role="radiogroup" aria-label={a.label}>
              {LEVELS.filter((l) => !(a.viewOnly && l.id === "edit")).map((l) => (
                <button
                  type="button"
                  key={l.id}
                  role="radio"
                  aria-checked={access[a.id] === l.id}
                  onClick={() => onAccess({ ...access, [a.id]: l.id })}
                  className={`px-3 py-2 font-medium transition-colors ${access[a.id] === l.id ? (l.id === "none" ? "bg-ink text-white" : l.id === "view" ? "bg-lav-600 text-white" : "bg-emerald-600 text-white") : "bg-white text-muted hover:bg-mist"}`}
                >
                  {a.viewOnly && l.id === "view" ? "Yes" : l.label}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Team members, API keys, automation and backups are always owner-only. People who can change website content, blog posts or certificates can also upload images for them.</p>
    </div>
  );
}

function AccessForm({ initialRole, initialAccess, onSave }: { initialRole: Role; initialAccess: Access; onSave: (role: Role, access: Access) => Promise<void> }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [access, setAccess] = useState<Access>(initialAccess);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <AccessEditor role={role} access={access} onRole={(r) => { setRole(r); setAccess(ROLE_ACCESS[r]); }} onAccess={setAccess} />
      <button
        disabled={busy}
        onClick={async () => { setBusy(true); await onSave(role, access); setBusy(false); }}
        className="btn-dark mt-5 w-full disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : "Save access"}
      </button>
      <p className="mt-2 text-center text-xs text-muted">Changes apply on their next click; they don&apos;t need to log in again.</p>
    </div>
  );
}
