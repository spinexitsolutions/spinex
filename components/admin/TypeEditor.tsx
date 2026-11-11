"use client";

import { useState } from "react";
import { Check, Play, RotateCcw } from "lucide-react";
import AnimText, { type Word } from "../AnimText";
import {
  FONTS, HEAD_SPACINGS, HEAD_WEIGHTS, HIGHLIGHTS, SPEEDS, TEXT_ANIMS, defaultType, speedFactor, typeCss, typeSettings,
  type FontId, type TypeSettings,
} from "@/lib/typography";

// Admin → Site settings → Fonts & text. The preview on this page changes at once;
// the website changes after Save.

const PAIRS: { name: string; display: FontId; body: FontId }[] = [
  { name: "Spinex default", display: "bricolage", body: "manrope" },
  { name: "Modern clean", display: "jakarta", body: "inter" },
  { name: "Tech startup", display: "space", body: "dmsans" },
  { name: "Luxury", display: "playfair", body: "montserrat" },
  { name: "Editorial", display: "fraunces", body: "worksans" },
  { name: "Bold agency", display: "unbounded", body: "figtree" },
  { name: "Friendly", display: "outfit", body: "nunito" },
  { name: "Fashion", display: "dmserif", body: "urbanist" },
  { name: "Creative", display: "syne", body: "rubik" },
  { name: "Geometric", display: "sora", body: "lexend" },
];

const ff = (id: FontId) => `var(--ff-${id})`;

type Hero = { title: string; highlight: string };

function heroWords(h: Hero): Word[] {
  const title = h.title || "We build the websites, stores and content your business runs on.";
  const hl = (h.highlight || "").trim().toLowerCase();
  const at = hl ? title.toLowerCase().indexOf(hl) : -1;
  let pos = 0;
  return title.split(" ").filter(Boolean).map((w) => {
    const start = title.indexOf(w, pos);
    pos = start + w.length;
    return { w, on: at >= 0 && start < at + hl.length && start + w.length > at };
  });
}

export default function TypeEditor({ value, onChange, hero, accent }: { value: TypeSettings; onChange: (v: TypeSettings) => void; hero: Hero; accent?: string }) {
  const t = typeSettings(value);
  const set = (p: Partial<TypeSettings>) => { onChange({ ...t, ...p }); setRun((n) => n + 1); };
  const [run, setRun] = useState(0);
  const color = /^#[0-9a-f]{6}$/i.test(accent ?? "") ? accent! : "#6E59D9";
  const words = heroWords(hero);
  const hasHl = words.some((w) => w.on);
  // Sample for the highlight cards when the hero has no highlight words yet.
  const sample = (on: boolean): Word[] => [{ w: "your" }, { w: "business", on }, { w: "grows." }];

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: typeCss(t, ".type-preview") }} />

      {/* live preview */}
      <section className="sticky top-2 z-10 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Live preview</h2>
          <button type="button" onClick={() => setRun((n) => n + 1)} className="btn-ghost px-4 py-2 text-sm"><Play size={15} /> Play again</button>
        </div>
        <div className="type-preview mt-5 rounded-2xl bg-gradient-to-br from-white to-lav-100 p-6 font-sans sm:p-8">
          <p key={`h${run}`} className="h-display max-w-3xl text-[2rem] sm:text-5xl">
            <AnimText words={words} anim={t.heroAnim} play speed={speedFactor(t.speed)} delay={0.1} highlight={t.highlight} color={color} />
          </p>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">Spinex IT Solutions builds fast business websites, Shopify and WooCommerce stores, and runs SEO, social media, ads and video.</p>
          <p key={`s${run}`} className="h-display mt-6 text-2xl sm:text-3xl">
            <AnimText words={"What we do, done properly.".split(" ").map((w) => ({ w }))} anim={t.headAnim} play speed={speedFactor(t.speed)} delay={0.5} highlight="plain" />
          </p>
          <p className="mt-1 text-xs text-muted">Big line: home page headline. Small line: section headings on every page.</p>
        </div>
      </section>

      <Box title="Ready font pairs" note="One click sets both fonts.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PAIRS.map((p) => {
            const on = t.display === p.display && t.body === p.body;
            return (
              <Card key={p.name} on={on} onClick={() => set({ display: p.display, body: p.body })}>
                <p className="text-2xl font-semibold leading-tight" style={{ fontFamily: ff(p.display) }}>Aa Spinex</p>
                <p className="mt-1 text-[13px] text-muted" style={{ fontFamily: ff(p.body) }}>Websites that bring customers.</p>
                <p className="mt-2 text-xs font-semibold">{p.name}</p>
              </Card>
            );
          })}
        </div>
      </Box>

      <Box title="Heading font" note="Used for the big headlines and titles.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FONTS.map((f) => (
            <Card key={f.id} on={t.display === f.id} onClick={() => set({ display: f.id })}>
              <p className="truncate text-[26px] font-semibold leading-tight tracking-tight" style={{ fontFamily: ff(f.id) }}>We build</p>
              <p className="mt-2 text-xs font-semibold">{f.name}</p>
              <p className="text-[11px] text-muted">{f.note}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Seg label="Heading thickness" value={t.headWeight} options={HEAD_WEIGHTS.map((w) => [w, { "500": "Medium", "600": "Semi bold", "700": "Bold", "800": "Extra bold" }[w]] as [string, string])} onChange={(v) => set({ headWeight: v as TypeSettings["headWeight"] })} />
          <Seg label="Space between letters" value={t.headSpacing} options={HEAD_SPACINGS.map((s) => [s, { tight: "Tight", normal: "Normal", loose: "Open" }[s]] as [string, string])} onChange={(v) => set({ headSpacing: v as TypeSettings["headSpacing"] })} />
        </div>
      </Box>

      <Box title="Text font" note="Used for paragraphs, menus, buttons and forms. These fonts are easy to read in small sizes.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FONTS.filter((f) => f.body).map((f) => (
            <Card key={f.id} on={t.body === f.id} onClick={() => set({ body: f.id })}>
              <p className="text-[15px] leading-snug" style={{ fontFamily: ff(f.id) }}>Fast websites and stores for brands across India.</p>
              <p className="mt-2 text-xs font-semibold">{f.name}</p>
            </Card>
          ))}
        </div>
      </Box>

      <Box title="Home headline animation" note="How the big headline on the home page appears.">
        <AnimGrid value={t.heroAnim} onChange={(v) => set({ heroAnim: v })} speed={t.speed} />
      </Box>

      <Box title="Highlighted words" note={hasHl ? `Words highlighted now: "${hero.highlight}". Change them in Homepage hero → Highlight words.` : "No words are highlighted yet. Type them in Homepage hero → Highlight words (for example: business runs on), then pick a look here."}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <Card key={h.id} on={t.highlight === h.id} onClick={() => set({ highlight: h.id })}>
              <p key={`${h.id}${run}`} className="type-preview h-display text-[26px] leading-tight">
                <AnimText words={sample(true)} anim="none" play highlight={h.id} color={color} />
              </p>
              <p className="mt-3 text-xs font-semibold">{h.name}</p>
              <p className="text-[11px] text-muted">{h.note}</p>
            </Card>
          ))}
        </div>
      </Box>

      <Box title="Section heading animation" note="How headings like “What we do” and page titles appear when you scroll to them.">
        <AnimGrid value={t.headAnim} onChange={(v) => set({ headAnim: v })} speed={t.speed} />
      </Box>

      <Box title="Animation speed">
        <Seg label="" value={t.speed} options={SPEEDS.map((s) => [s, { slow: "Slow", normal: "Normal", fast: "Fast" }[s]] as [string, string])} onChange={(v) => set({ speed: v as TypeSettings["speed"] })} />
        <button type="button" onClick={() => set({ ...defaultType })} className="btn-ghost mt-6 px-4 py-2 text-sm"><RotateCcw size={15} /> Back to Spinex default</button>
      </Box>
    </div>
  );
}

// Each animation card plays its own small demo when picked or hovered.
function AnimGrid({ value, onChange, speed }: { value: TypeSettings["heroAnim"]; onChange: (v: TypeSettings["heroAnim"]) => void; speed: TypeSettings["speed"] }) {
  const [play, setPlay] = useState<Record<string, number>>({});
  const replay = (id: string) => setPlay((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {TEXT_ANIMS.map((a) => (
        <Card key={a.id} on={value === a.id} onClick={() => { onChange(a.id); replay(a.id); }} onHover={() => replay(a.id)}>
          <p key={play[a.id] ?? 0} className="type-preview h-display h-9 truncate text-[26px] leading-tight">
            <AnimText words={[{ w: "We" }, { w: "build" }, { w: "brands." }]} anim={a.id} play speed={speedFactor(speed)} highlight="plain" />
          </p>
          <p className="mt-3 text-xs font-semibold">{a.name}</p>
          <p className="text-[11px] text-muted">{a.note}</p>
        </Card>
      ))}
    </div>
  );
}

function Box({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Card({ on, onClick, onHover, children }: { on: boolean; onClick: () => void; onHover?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} onMouseEnter={onHover} className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${on ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
      {children}
      {on && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-white"><Check size={13} /></span>}
    </button>
  );
}

function Seg({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div>
      {label && <p className="mb-2 text-[13px] font-semibold">{label}</p>}
      <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-mist p-1">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${value === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
    </div>
  );
}
