"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import ImageField from "./ImageField";

export type FieldDef = { key: string; label: string; type?: "text" | "textarea" | "tags" | "image" | "url"; hint?: string };
type Rec = Record<string, unknown>;

export function FieldInput({ def, value, onChange }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const id = useId();
  const label = (
    <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink">
      {def.label}
      {def.hint && <span className="ml-2 font-normal text-muted">{def.hint}</span>}
    </label>
  );

  if (def.type === "textarea")
    return <div>{label}<textarea id={id} className="input min-h-[110px] resize-y" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></div>;

  if (def.type === "tags")
    return (
      <div>
        {label}
        <input id={id} className="input" value={(value as string[] | undefined)?.join(", ") ?? ""} onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
        <p className="mt-1 text-xs text-muted">Separate with commas</p>
      </div>
    );

  if (def.type === "image")
    return (
      <div>
        {label}
        <ImageField id={id} value={String(value ?? "")} onChange={onChange} />
      </div>
    );

  return <div>{label}<input id={id} className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} /></div>;
}

export function ObjectEditor<T extends object>({ value, fields, onChange }: { value: T; fields: FieldDef[]; onChange: (v: T) => void }) {
  const rec = value as unknown as Rec;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={f.type === "textarea" || f.type === "image" ? "md:col-span-2" : ""}>
          <FieldInput def={f} value={rec[f.key]} onChange={(v) => onChange({ ...rec, [f.key]: v } as unknown as T)} />
        </div>
      ))}
    </div>
  );
}

export function ListEditor<T extends { id: string }>({
  items, fields, onChange, titleKey, newItem, addLabel,
}: { items: T[]; fields: FieldDef[]; onChange: (v: T[]) => void; titleKey: keyof T; newItem: () => T; addLabel: string }) {
  const [open, setOpen] = useState<string | null>(null);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Nothing here yet. Add the first one below.</p>}
      {items.map((item, i) => {
        const isOpen = open === item.id;
        return (
          <motion.div layout key={item.id} className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center gap-2 p-3 pl-5">
              <button onClick={() => setOpen(isOpen ? null : item.id)} className="flex flex-1 items-center gap-3 text-left" aria-expanded={isOpen}>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown size={18} className="text-muted" /></motion.span>
                <span className="font-semibold">{String(item[titleKey] || "Untitled")}</span>
              </button>
              <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={15} /></IconBtn>
              <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown size={15} /></IconBtn>
              <IconBtn label="Delete" danger onClick={() => { if (confirm("Delete this item?")) onChange(items.filter((x) => x.id !== item.id)); }}><Trash2 size={15} /></IconBtn>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="border-t border-line bg-mist/50 p-5">
                    <ObjectEditor value={item} fields={fields} onChange={(v) => onChange(items.map((x) => (x.id === item.id ? v : x)))} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      <button
        onClick={() => { const n = newItem(); onChange([...items, n]); setOpen(n.id); }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-lav-300 py-4 font-semibold text-lav-700 transition hover:bg-lav-100"
      >
        <Plus size={18} /> {addLabel}
      </button>
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`grid h-9 w-9 place-items-center rounded-lg text-muted transition disabled:opacity-30 ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-mist hover:text-ink"}`}>
      {children}
    </button>
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);
