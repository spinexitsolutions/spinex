"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PlannerSettings, Service } from "@/lib/content";
import { uid } from "./fields";

// Admin editor for the home page "Plan your project" section:
// time per service, project sizes and optional extras.
export default function PlannerEditor({ value, services, onChange }: { value: PlannerSettings; services: Service[]; onChange: (v: PlannerSettings) => void }) {
  const timeFor = (id: string) => value.times.find((t) => t.id === id) ?? { id, min: 7, max: 14, monthly: false };
  const setTime = (id: string, patch: Partial<PlannerSettings["times"][number]>) => {
    const next = { ...timeFor(id), ...patch };
    onChange({ ...value, times: [...value.times.filter((t) => t.id !== id), next] });
  };
  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0));

  return (
    <div className="space-y-10">
      <section>
        <h3 className="font-display text-lg font-semibold">Time for each service</h3>
        <p className="mt-1 text-sm text-muted">In days, for a Small project. The planner turns it into weeks or months. Tick &quot;Monthly&quot; for ongoing services like marketing; they show as &quot;runs month to month&quot; instead of a build time.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-mist text-left text-[13px] text-muted">
              <tr><th className="px-4 py-3 font-semibold">Service</th><th className="px-4 py-3 font-semibold">Min days</th><th className="px-4 py-3 font-semibold">Max days</th><th className="px-4 py-3 font-semibold">Monthly</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {services.map((s) => {
                const t = timeFor(s.id);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.title || s.id}</td>
                    <td className="px-4 py-2"><input type="number" min={0} className="input w-24" value={t.min} disabled={t.monthly} onChange={(e) => setTime(s.id, { min: num(e.target.value) })} aria-label={`${s.title} min days`} /></td>
                    <td className="px-4 py-2"><input type="number" min={0} className="input w-24" value={t.max} disabled={t.monthly} onChange={(e) => setTime(s.id, { max: num(e.target.value) })} aria-label={`${s.title} max days`} /></td>
                    <td className="px-4 py-2"><input type="checkbox" className="h-5 w-5 accent-[#6d5bd0]" checked={t.monthly} onChange={(e) => setTime(s.id, { monthly: e.target.checked })} aria-label={`${s.title} monthly`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-semibold">Project sizes</h3>
        <p className="mt-1 text-sm text-muted">Multiplier: 1 = same time, 1.5 = 50% longer, 2 = double.</p>
        <div className="mt-4 space-y-3">
          {value.sizes.map((z, i) => (
            <div key={z.id} className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-[1fr_2fr_110px_auto] sm:items-end">
              <Field label="Name"><input className="input" value={z.label} onChange={(e) => onChange({ ...value, sizes: value.sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></Field>
              <Field label="Description"><input className="input" value={z.hint} onChange={(e) => onChange({ ...value, sizes: value.sizes.map((x, j) => (j === i ? { ...x, hint: e.target.value } : x)) })} /></Field>
              <Field label="Multiplier"><FactorInput value={z.factor} onChange={(factor) => onChange({ ...value, sizes: value.sizes.map((x, j) => (j === i ? { ...x, factor } : x)) })} /></Field>
              <Remove onClick={() => onChange({ ...value, sizes: value.sizes.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <button type="button" className="btn-ghost text-sm" onClick={() => onChange({ ...value, sizes: [...value.sizes, { id: uid(), label: "", hint: "", factor: 1 }] })}><Plus size={16} /> Add size</button>
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-semibold">Extras</h3>
        <p className="mt-1 text-sm text-muted">Each extra the visitor picks adds these days to the build time.</p>
        <div className="mt-4 space-y-3">
          {value.extras.map((x, i) => (
            <div key={x.id} className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-[2fr_110px_auto] sm:items-end">
              <Field label="Name"><input className="input" value={x.label} onChange={(e) => onChange({ ...value, extras: value.extras.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })} /></Field>
              <Field label="Extra days"><input type="number" min={0} className="input" value={x.days} onChange={(e) => onChange({ ...value, extras: value.extras.map((y, j) => (j === i ? { ...y, days: num(e.target.value) } : y)) })} /></Field>
              <Remove onClick={() => onChange({ ...value, extras: value.extras.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <button type="button" className="btn-ghost text-sm" onClick={() => onChange({ ...value, extras: [...value.extras, { id: uid(), label: "", days: 2 }] })}><Plus size={16} /> Add extra</button>
        </div>
      </section>

      <section>
        <Field label="Small note under the estimate">
          <textarea className="input min-h-[80px] resize-y" value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} />
        </Field>
      </section>
    </div>
  );
}

// Keeps what's typed (e.g. "0." on the way to 0.5); checks it when the field loses focus.
function FactorInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  return (
    <input
      type="number"
      min={0.1}
      step={0.1}
      className="input"
      value={focused ? text : String(value)}
      onFocus={() => { setText(String(value)); setFocused(true); }}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(n) && n >= 0.1) onChange(n);
      }}
      onBlur={() => {
        setFocused(false);
        const n = Number(text);
        const next = text.trim() === "" || !Number.isFinite(n) ? 1 : Math.max(0.1, n);
        setText(String(next));
        onChange(next);
      }}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

function Remove({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted hover:border-red-300 hover:text-red-600" aria-label="Remove">
      <Trash2 size={16} />
    </button>
  );
}
