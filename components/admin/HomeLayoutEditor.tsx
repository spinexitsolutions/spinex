"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { HOME_BLOCKS, homeOrder, type HomeBlock } from "@/lib/content";

// Show, hide and reorder the home page sections. The hero always stays first.
export default function HomeLayoutEditor({ value, onChange }: { value: HomeBlock[]; onChange: (v: HomeBlock[]) => void }) {
  const list = homeOrder(value);

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <ol className="space-y-2">
      <li className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-mist px-4 py-3 text-sm text-muted">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white font-semibold">1</span> Hero (always first)
      </li>
      {list.map((b, i) => (
        <motion.li layout key={b.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${b.visible ? "border-line bg-white" : "border-line bg-mist/60"}`}>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-mist text-sm font-semibold">{i + 2}</span>
          <span className={`flex-1 font-medium ${b.visible ? "" : "text-muted line-through"}`}>{HOME_BLOCKS[b.id]}</span>
          <button
            type="button"
            onClick={() => onChange(list.map((x) => (x.id === b.id ? { ...x, visible: !x.visible } : x)))}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium ${b.visible ? "bg-emerald-50 text-emerald-800" : "bg-white text-muted"}`}
            aria-pressed={b.visible}
          >
            {b.visible ? <><Eye size={14} /> Shown</> : <><EyeOff size={14} /> Hidden</>}
          </button>
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-mist disabled:opacity-30"><ArrowUp size={15} /></button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-mist disabled:opacity-30"><ArrowDown size={15} /></button>
        </motion.li>
      ))}
    </ol>
  );
}
