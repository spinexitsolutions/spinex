"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Monitor } from "lucide-react";
import Hero, { heroSettings } from "../home/Hero";
import HeroPattern from "../home/HeroPattern";
import ImageField from "./ImageField";
import { HERO_BGS, HERO_DESIGNS, HERO_PATTERNS, HERO_SCENES, type HeroPattern as PatternKind, heroDefaults, type HeroBg, type HeroDesign, type HeroScene, type HeroSettings } from "@/lib/content";

const PATTERN_NAMES: Record<PatternKind, string> = {
  none: "None", dots: "Dots", plus: "Plus marks", graph: "Graph paper", topo: "Topography", honeycomb: "Honeycomb", circuit: "Circuit",
  isometric: "Isometric", diagonal: "Diagonal lines", radar: "Radar rings", stars: "Sparkle stars", floor: "Retro floor", grain: "Soft grain",
  mesh: "Mesh gradient", beams: "Light beams", rays: "Spotlight rays", ribbons: "Silk ribbons", halftone: "Halftone fade", constellation: "Constellation",
  tunnel: "Square tunnel", holo: "Holographic wash", coderain: "Code rain", flow: "Flow lines", glowgrid: "Glowing grid", orbits: "Orbits",
  "aurora-curtains": "Aurora curtains", "aurora-top": "Aurora top glow", "aurora-grain": "Aurora + grain", blobs: "Liquid blobs", orbs: "Glass orbs",
  prism: "Prism light", bokeh: "Bokeh", "aurora-grid": "Aurora grid", waves: "Colour waves", swirl: "Swirl", sunset: "Sunset glow", colordots: "Colour dots",
};

const SCENE_INFO: Record<HeroScene, { name: string; about: string }> = {
  web: { name: "Web development", about: "A website builds itself, a click, speed score 98." },
  ai: { name: "AI automation", about: "WhatsApp chat answered by AI, lead saved to CRM." },
  ecommerce: { name: "E-commerce", about: "Product goes to cart, orders from Amazon, Flipkart, Meesho." },
  saas: { name: "SaaS software", about: "Dashboard numbers count up, chart draws, new subscriber." },
  marketing: { name: "Digital marketing", about: "Google and Meta ads, reach to leads, 4.2x return." },
  social: { name: "Social media", about: "Posts fill the grid, a heart pops, followers grow." },
  app: { name: "App development", about: "Delivery moves on a map in a phone, then Delivered." },
  video: { name: "Video editing", about: "A reel plays with cuts and captions while the timeline runs." },
  design: { name: "Graphic design", about: "A logo is drawn with a pen, colours and fonts appear." },
  promotion: { name: "Brand promotion", about: "Influencers join, reach climbs to 1.2M." },
};

const BGS: Record<HeroBg, { name: string; about: string }> = {
  dots: { name: "Dots", about: "Dot grid that moves away from the mouse. The current one." },
  aurora: { name: "Aurora", about: "Soft purple, pink and blue light that follows the mouse." },
  wave: { name: "Wave", about: "A field of dots that waves, with ripples under the mouse." },
  trail: { name: "Glow trail", about: "Grid squares light up where the mouse passes." },
  icons: { name: "Floating icons", about: "Service icons float in small cards and move out of the way." },
  torch: { name: "Torch", about: "A round light around the mouse shows hidden service names." },
  orb: { name: "Liquid orb", about: "A glossy purple ball that wobbles and leans to the mouse. Looks best with Centred." },
  india: { name: "India map", about: "Lines go out from Jaipur HQ to big cities across India. Looks best with Centred." },
  none: { name: "None", about: "Plain white background." },
};

const DESIGNS: Record<HeroDesign, { name: string; about: string; uses: string }> = {
  classic: { name: "Live build", about: "Text on the left, an animated browser building websites, stores, social and video on the right.", uses: "" },
  centered: { name: "Centred", about: "Big centred headline on the moving dot grid, with your services sliding along the bottom.", uses: "Uses: services ticker" },
  split: { name: "Photo split", about: "Text on the left, a large photo on the right with a stat card.", uses: "Uses: photo" },
  fullscreen: { name: "Full screen photo", about: "Your photo or video across the whole screen, text in white over it.", uses: "Uses: photo or video, darkness" },
  bento: { name: "Work tiles", about: "Headline on top, then tiles with your latest projects (or services) and stats.", uses: "Uses: project images" },
  aurora: { name: "Dark aurora", about: "Dark background with slowly moving coloured light and a glass list of services.", uses: "" },
  type: { name: "Big type", about: "A very large headline alone, with a dark band of services moving at the bottom.", uses: "Uses: services ticker" },
};

// Admin → Homepage hero: pick a hero design, see it live, and change its text, links, photo and colour.
export default function HeroEditor({ value, onChange, readOnly }: { value: HeroSettings; onChange: (v: HeroSettings) => void; readOnly?: boolean }) {
  const v = heroSettings(value, value);
  const set = (patch: Partial<HeroSettings>) => onChange({ ...v, ...patch });
  const [run, setRun] = useState(0);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <p className="font-semibold">Preview</p>
            <p className="text-sm text-muted">{DESIGNS[v.design].name} · how the top of your home page looks on a computer. On phones the parts stack one under the other.</p>
          </div>
          <button type="button" onClick={() => setRun((n) => n + 1)} className="btn-ghost px-4 py-2 text-sm"><Monitor size={14} /> Play again</button>
        </div>
        <Scaled key={`${v.design}-${run}`}><Hero hero={v} preview /></Scaled>
      </div>

      <fieldset disabled={readOnly} className="space-y-6">
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="font-semibold">Design</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {HERO_DESIGNS.map((id) => (
              <button type="button" key={id} data-hero-design={id} onClick={() => set({ design: id })}
                className={`rounded-2xl border p-3 text-left transition ${v.design === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                <Thumb id={id} />
                <span className="mt-2 block text-sm font-semibold">{DESIGNS[id].name}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">{DESIGNS[id].about}</span>
                {DESIGNS[id].uses && <span className="mt-1 block text-[11px] font-semibold text-lav-700">{DESIGNS[id].uses}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6" data-hero-bg-picker>
          <p className="font-semibold">Background effect</p>
          <p className="mt-0.5 text-sm text-muted">The moving background behind the text. Move your mouse over the preview above to try it. On phones it moves on its own. Shows with the Classic and Centred designs.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {HERO_BGS.map((id) => (
              <button type="button" key={id} data-hero-bg-option={id} onClick={() => set({ bg: id })}
                className={`rounded-2xl border p-3 text-left transition ${v.bg === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                <span className="block text-sm font-semibold">{BGS[id].name}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">{BGS[id].about}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6" data-hero-pattern-picker>
          <p className="font-semibold">Background pattern</p>
          <p className="mt-0.5 text-sm text-muted">A still or slowly moving background under the moving effect above. Pick one and look at the preview at the top. Shows with the Classic and Centred designs.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {HERO_PATTERNS.map((id) => (
              <button type="button" key={id} data-hero-pattern-option={id} onClick={() => set({ pattern: id })}
                className={`overflow-hidden rounded-2xl border text-left transition ${v.pattern === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                <span className="relative block h-20 overflow-hidden bg-white">
                  {id === "none" ? <span className="grid h-full place-items-center text-xs text-muted">Plain white</span> : <span className="absolute left-0 top-0 h-[134%] w-[134%] origin-top-left scale-75"><HeroPattern kind={id} /></span>}
                </span>
                <span className="block border-t border-line px-2.5 py-1.5 text-xs font-semibold">{PATTERN_NAMES[id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="font-semibold">Text</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Field label="Keyword line (part of the H1)" hint="Small line above the headline, e.g. Website development company in Jaipur" className="md:col-span-2">
              <input className="input" value={v.kicker} onChange={(e) => set({ kicker: e.target.value })} />
            </Field>
            <Field label="Headline" className="md:col-span-2">
              <textarea className="input min-h-[80px]" value={v.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="Highlight words" hint="Part of the headline to show in colour, e.g. your business runs on. Leave empty for none.">
              <input className="input" name="heroHighlight" value={v.highlight} onChange={(e) => set({ highlight: e.target.value })} />
              {v.highlight.trim() && !v.title.toLowerCase().includes(v.highlight.trim().toLowerCase()) && <p className="mt-1 text-xs text-amber-700">These words are not in the headline, so nothing is highlighted.</p>}
            </Field>
            <Field label="Highlight colour">
              <div className="flex items-center gap-2">
                <input type="color" aria-label="Highlight colour" value={v.accent || "#6E59D9"} onChange={(e) => set({ accent: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
                <button type="button" onClick={() => set({ accent: "" })} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${v.accent ? "border-line text-muted hover:border-ink" : "border-ink bg-ink text-white"}`}>Brand</button>
              </div>
            </Field>
            <Field label="Supporting text" className="md:col-span-2">
              <textarea className="input min-h-[80px]" value={v.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6" data-hero-scenes-editor>
          <p className="font-semibold">Box on the right</p>
          <p className="mt-0.5 text-sm text-muted">The moving box next to the text (Classic design). Tick up to 4 services and use the arrows to set the order: number 1 shows first and is the first tab.</p>
          <ul className="mt-3 grid gap-2">
            {[...(v.scenes ?? []), ...HERO_SCENES.filter((id) => !(v.scenes ?? []).includes(id))].map((id) => {
              const list = v.scenes ?? [];
              const at = list.indexOf(id), on = at >= 0, full = list.length >= 4;
              const move = (by: number) => { const n = [...list]; n.splice(at, 1); n.splice(at + by, 0, id); set({ scenes: n }); };
              return (
                <li key={id} data-hero-scene-option={id} className={`flex items-center gap-3 rounded-2xl border p-3 ${on ? "border-ink bg-mist" : "border-line"}`}>
                  <button type="button" aria-pressed={on} disabled={!on && full}
                    onClick={() => set({ scenes: on ? (list.length > 1 ? list.filter((x) => x !== id) : list) : [...list, id] })}
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-bold ${on ? "border-ink bg-ink text-white" : "border-line text-transparent"} disabled:opacity-40`}
                    title={on ? (list.length > 1 ? "Remove" : "Keep at least one") : full ? "Remove one first, up to 4 show" : "Show this"}>
                    {on ? at + 1 : <Check size={14} />}
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{SCENE_INFO[id].name}</span>
                    <span className="block text-xs text-muted">{SCENE_INFO[id].about}</span>
                  </span>
                  {on && (
                    <span className="flex gap-1">
                      <button type="button" aria-label="Move up" disabled={at === 0} onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white disabled:opacity-30"><ArrowUp size={14} /></button>
                      <button type="button" aria-label="Move down" disabled={at === list.length - 1} onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white disabled:opacity-30"><ArrowDown size={14} /></button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">{(v.scenes ?? []).length} of 4 picked.{(v.scenes ?? []).length >= 4 ? " Untick one to pick another." : ""}</p>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="font-semibold">Buttons</p>
          <p className="text-sm text-muted">Leave a button&apos;s text empty to hide it. A link can be a page (/contact) or a full web address.</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Field label="Main button"><input className="input" value={v.primaryCta} onChange={(e) => set({ primaryCta: e.target.value })} /></Field>
            <Field label="Main button opens"><input className="input" value={v.primaryLink} onChange={(e) => set({ primaryLink: e.target.value })} placeholder="/contact" /></Field>
            <Field label="Second button"><input className="input" value={v.secondaryCta} onChange={(e) => set({ secondaryCta: e.target.value })} /></Field>
            <Field label="Second button opens"><input className="input" value={v.secondaryLink} onChange={(e) => set({ secondaryLink: e.target.value })} placeholder="/work" /></Field>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="font-semibold">Photo, video and extras</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Field div label="Photo" hint="Used by Photo split and Full screen photo. A wide photo (at least 1600 px) looks best." className="md:col-span-2">
              <ImageField id="hero-image" value={v.image} onChange={(x) => set({ image: x })} />
            </Field>
            <Field label="Video (optional)" hint="Full screen design only: a link to an .mp4 file, e.g. from Admin → Media. It plays silently on a loop; the photo shows while it loads.">
              <input className="input" value={v.video} onChange={(e) => set({ video: e.target.value })} placeholder="/uploads/hero.mp4" />
            </Field>
            <Field label={`Darkness over the photo: ${v.overlay}%`} hint="Full screen design. More darkness makes white text easier to read.">
              <input type="range" min={0} max={90} step={5} value={v.overlay} onChange={(e) => set({ overlay: Number(e.target.value) })} className="w-full accent-ink" />
            </Field>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Toggle label="Show 2 stats" hint="From Admin → Stats" checked={v.showStats} onChange={(c) => set({ showStats: c })} />
            <Toggle label="Show location" hint="From contact details" checked={v.showLocation} onChange={(c) => set({ showLocation: c })} />
            <Toggle label="Moving services line" hint="Centred and Big type" checked={v.showTicker} onChange={(c) => set({ showTicker: c })} />
          </div>
        </div>

        <button type="button" onClick={() => onChange({ ...v, ...heroDefaults })} className="text-sm font-semibold text-muted underline hover:text-ink">Reset design options to the default (keeps your text)</button>
      </fieldset>
      <p className="text-xs text-muted">Press <b>Save and publish</b> at the top to put changes live.</p>
    </div>
  );
}

// The real hero drawn at desktop width and scaled down to fit the panel. Clicks are switched off.
function Scaled({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const W = 1280, H = 760;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} data-hero-preview className="relative mt-4 w-full overflow-hidden rounded-2xl border border-line bg-white" style={{ height: H * scale }}>
      <div className="pointer-events-none absolute left-0 top-0 origin-top-left select-none" style={{ width: W, height: H, transform: `scale(${scale})` }} aria-hidden {...({ inert: "" } as object)}>
        <div className="absolute inset-x-0 top-4 z-10 mx-auto flex w-[1180px] items-center justify-between rounded-full border border-white/60 bg-white/70 px-5 py-3 text-sm font-semibold text-ink backdrop-blur" aria-hidden>
          <span>Spinex</span><span className="flex gap-6 text-muted"><span>Services</span><span>Work</span><span>About</span><span>Blog</span></span><span className="rounded-full bg-ink px-4 py-1.5 text-white">Contact</span>
        </div>
        <div className="h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

// Small drawing of each design for the picker.
function Thumb({ id }: { id: HeroDesign }) {
  const line = (w: string, dark = false) => <span className={`block h-1.5 rounded-full ${dark ? "bg-white/80" : "bg-ink/70"}`} style={{ width: w }} />;
  const soft = (w: string, dark = false) => <span className={`block h-1 rounded-full ${dark ? "bg-white/40" : "bg-ink/25"}`} style={{ width: w }} />;
  const btn = (dark = false) => <span className={`mt-1 block h-2 w-8 rounded-full ${dark ? "bg-white" : "bg-ink"}`} />;
  const box = "relative flex h-20 gap-2 overflow-hidden rounded-xl p-2.5";
  if (id === "classic") return <span className={`${box} bg-mist`}><span className="flex flex-1 flex-col justify-center gap-1">{line("90%")}{line("70%")}{soft("80%")}{btn()}</span><span className="flex-1 rounded-md border border-line bg-white"><span className="block h-2 rounded-t-md bg-lav-200" /></span></span>;
  if (id === "centered") return <span className={`${box} flex-col items-center justify-center bg-mist [background-image:radial-gradient(rgb(var(--c-ink)/.15)_1px,transparent_1px)] [background-size:6px_6px]`}>{line("70%")}{line("50%")}{btn()}<span className="absolute inset-x-0 bottom-1 mx-2 h-1 rounded-full bg-lav-300" /></span>;
  if (id === "split") return <span className={`${box} bg-mist`}><span className="flex flex-1 flex-col justify-center gap-1">{line("90%")}{line("60%")}{soft("80%")}{btn()}</span><span className="flex-1 rounded-lg bg-gradient-to-br from-lav-300 to-lav-600" /></span>;
  if (id === "fullscreen") return <span className={`${box} flex-col justify-end bg-gradient-to-br from-slate-500 to-ink`}>{line("70%", true)}{line("50%", true)}{btn(true)}</span>;
  if (id === "bento") return <span className={`${box} flex-col bg-mist`}><span className="flex gap-1">{line("60%")}</span><span className="grid flex-1 grid-cols-[1.5fr_1fr_1fr] gap-1"><span className="rounded bg-lav-400" /><span className="rounded bg-lav-300" /><span className="rounded bg-ink/60" /></span></span>;
  if (id === "aurora") return <span className={`${box} bg-ink`}><span className="absolute -left-4 -top-4 h-14 w-14 rounded-full bg-lav-500 opacity-70 blur-lg" /><span className="relative flex flex-1 flex-col justify-center gap-1">{line("90%", true)}{line("60%", true)}{btn(true)}</span><span className="relative flex-1 rounded-lg border border-white/20 bg-white/10" /></span>;
  return <span className={`${box} flex-col justify-between bg-white`}><span className="flex flex-col gap-1"><span className="block h-3 w-[95%] rounded bg-ink/80" /><span className="block h-3 w-[70%] rounded bg-lav-500" /></span><span className="block h-2 rounded bg-ink" /></span>;
}

function Field({ label, hint, className = "", div, children }: { label: string; hint?: string; className?: string; div?: boolean; children: React.ReactNode }) {
  const Tag = div ? "div" : "label";
  return (
    <Tag className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </Tag>
  );
}
function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3">
      <span><b className="text-sm">{label}</b><span className="block text-xs text-muted">{hint}</span></span>
      <input type="checkbox" className="h-5 w-5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
