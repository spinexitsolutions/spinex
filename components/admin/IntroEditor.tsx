"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";
import IntroAnimation, { STYLE_INFO, introLength } from "../intro/IntroAnimation";
import { INTRO_STYLES, defaultIntro, type IntroSettings, type PageTransition } from "@/lib/content";
import { introSettings } from "../Intro";

const TRANSITIONS: Record<PageTransition, { name: string; about: string }> = {
  none: { name: "None", about: "The new page just appears." },
  fade: { name: "Fade", about: "A soft fade-in of the new page." },
  curtain: { name: "Curtain", about: "A dark panel lifts up to show the new page." },
  wipe: { name: "Colour wipe", about: "Two coloured panels sweep across, left to right." },
  logo: { name: "Logo flash", about: "Your logo and name for a moment, then the page." },
};

// Admin → Intro animation: pick a style, see it play, and set text, colours, speed and when it shows.
export default function IntroEditor({ value, onChange, logo, readOnly }: { value: IntroSettings; onChange: (v: IntroSettings) => void; logo: string; readOnly?: boolean }) {
  const v = introSettings(value);
  const set = (patch: Partial<IntroSettings>) => onChange({ ...v, ...patch });
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [tx, setTx] = useState(0);
  const replay = () => { setRun((n) => n + 1); setPlaying(true); };

  return (
    <div className="space-y-6">
      {/* Live preview */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <p className="font-semibold">Preview</p>
            <p className="text-sm text-muted">{STYLE_INFO[v.style].name} · about {introLength(v).toFixed(1)} seconds</p>
          </div>
          <button type="button" onClick={replay} className="btn-dark px-4 py-2 text-sm"><Play size={14} /> Play again</button>
        </div>
        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-line bg-mist" data-intro-preview>
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
            <div><p className="font-display text-xl font-semibold text-ink">Your website</p><p className="mt-1">appears here after the intro</p></div>
          </div>
          {playing && <IntroAnimation key={`${run}-${v.style}-${v.speed}`} cfg={v} logo={logo} contained onDone={() => setPlaying(false)} />}
          {!playing && (
            <button type="button" onClick={replay} className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold shadow"><RotateCcw size={12} /> Replay</button>
          )}
        </div>
        {!v.enabled && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">The intro is switched off, so visitors won&apos;t see it. Switch it on below.</p>}
      </div>

      <fieldset disabled={readOnly} className="space-y-6">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4">
          <span><b>Show the intro</b><span className="block text-sm text-muted">Plays when someone opens the website.</span></span>
          <input type="checkbox" name="introOn" className="h-5 w-5" checked={v.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        </label>

        {/* Styles */}
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="font-semibold">Style</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {INTRO_STYLES.map((id) => (
              <button type="button" key={id} data-style={id} onClick={() => { set({ style: id }); replay(); }}
                className={`rounded-2xl border p-3.5 text-left transition ${v.style === id ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                <span className="block font-semibold">{STYLE_INFO[id].name}</span>
                <span className={`mt-0.5 block text-xs ${v.style === id ? "text-white/70" : "text-muted"}`}>{STYLE_INFO[id].about}</span>
              </button>
            ))}
          </div>
        </div>

        {/* When */}
        <div className="grid gap-4 rounded-3xl border border-line bg-white p-5 sm:grid-cols-3 sm:p-6">
          <Choice label="When to show it" value={v.when} onChange={(x) => set({ when: x as IntroSettings["when"] })} options={[["session", "First page of each visit"], ["always", "Every time the site is opened"]]} />
          <Choice label="Which pages" value={v.pages} onChange={(x) => set({ pages: x as IntroSettings["pages"] })} options={[["all", "Any page (whichever opens first)"], ["home", "Home page only"]]} />
          <Choice label="Speed" value={v.speed} onChange={(x) => { set({ speed: x as IntroSettings["speed"] }); replay(); }} options={[["fast", "Fast"], ["normal", "Normal"], ["slow", "Slow"]]} />
        </div>

        {/* Text */}
        <div className="grid gap-4 rounded-3xl border border-line bg-white p-5 sm:grid-cols-2 sm:p-6">
          <Text label="Big name" value={v.title} onChange={(x) => set({ title: x })} placeholder="Spinex" />
          <Text label="Line under it" value={v.tagline} onChange={(x) => set({ tagline: x })} placeholder="Websites · Apps · Digital growth" />
          <Text label="Top-left text" value={v.cornerLeft} onChange={(x) => set({ cornerLeft: x })} placeholder="Leave empty to hide" />
          <Text label="Top-right text" value={v.cornerRight} onChange={(x) => set({ cornerRight: x })} placeholder="Leave empty to hide" />
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" checked={v.showLogo} onChange={(e) => set({ showLogo: e.target.checked })} /> Show the logo (from Brand and hero)
          </label>
        </div>

        {/* Colours */}
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="font-semibold">Colours</p>
          <p className="text-sm text-muted">Leave on “Brand” to follow Colour theme.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ColourPick label="Background" value={v.background} fallback="#120F1B" onChange={(x) => set({ background: x })} />
            <ColourPick label="Highlight" value={v.accent} fallback="#9C8CF0" onChange={(x) => set({ accent: x })} />
            <ColourPick label="Text" value={v.text} fallback="#FFFFFF" onChange={(x) => set({ text: x })} />
          </div>
        </div>

        {/* Between pages */}
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <p className="font-semibold">Between pages</p>
              <p className="text-sm text-muted">A short animation every time a visitor moves to another page.</p>
            </div>
            <button type="button" onClick={() => setTx((n) => n + 1)} className="btn-ghost px-4 py-2 text-sm"><Play size={14} /> Preview</button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {(Object.keys(TRANSITIONS) as PageTransition[]).map((id) => (
              <button type="button" key={id} data-transition={id} onClick={() => { set({ pageTransition: id }); setTx((n) => n + 1); }}
                className={`rounded-2xl border p-3 text-left transition ${v.pageTransition === id ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                <span className="block text-sm font-semibold">{TRANSITIONS[id].name}</span>
                <span className={`mt-0.5 block text-[11px] leading-snug ${v.pageTransition === id ? "text-white/70" : "text-muted"}`}>{TRANSITIONS[id].about}</span>
              </button>
            ))}
          </div>
          <div className="relative mt-4 h-40 overflow-hidden rounded-2xl border border-line bg-mist">
            <div className="absolute inset-0 grid place-items-center text-sm text-muted">Next page</div>
            {tx > 0 && <TransitionDemo key={tx} kind={v.pageTransition} cfg={v} logo={logo} />}
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4">
          <span><b>Play it when the admin panel opens</b><span className="block text-sm text-muted">Once per visit, for everyone who signs in.</span></span>
          <input type="checkbox" className="h-5 w-5" checked={v.admin} onChange={(e) => set({ admin: e.target.checked })} />
        </label>
        <button type="button" onClick={() => { onChange({ ...defaultIntro }); replay(); }} className="text-sm font-semibold text-muted underline hover:text-ink">Reset intro to the default</button>
      </fieldset>
      <p className="text-xs text-muted">People who turn on “reduce motion” on their phone or computer don&apos;t see the intro. Press <b>Save and publish</b> at the top to put changes live.</p>
    </div>
  );
}

function TransitionDemo({ kind, cfg, logo }: { kind: PageTransition; cfg: IntroSettings; logo: string }) {
  const bg = cfg.background || "rgb(var(--c-ink))";
  const accent = cfg.accent || "rgb(var(--c-lav-400))";
  const e: [number, number, number, number] = [0.76, 0, 0.24, 1];
  if (kind === "none") return null;
  if (kind === "fade") return <motion.div className="absolute inset-0 bg-mist" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }} />;
  if (kind === "curtain") return <motion.div className="absolute inset-0" style={{ background: bg }} initial={{ clipPath: "inset(0 0 0% 0)" }} animate={{ clipPath: "inset(0 0 100% 0)" }} transition={{ duration: 0.7, ease: e, delay: 0.15 }}><div className="absolute inset-x-0 bottom-0 h-1" style={{ background: accent }} /></motion.div>;
  if (kind === "wipe") return (
    <>
      <motion.div className="absolute inset-0" style={{ background: accent }} initial={{ clipPath: "inset(0 0% 0 0)" }} animate={{ clipPath: "inset(0 0 0 100%)" }} transition={{ duration: 0.75, ease: e, delay: 0.27 }} />
      <motion.div className="absolute inset-0" style={{ background: bg }} initial={{ clipPath: "inset(0 0% 0 0)" }} animate={{ clipPath: "inset(0 0 0 100%)" }} transition={{ duration: 0.65, ease: e, delay: 0.15 }} />
    </>
  );
  return (
    <motion.div className="absolute inset-0 grid place-items-center" style={{ background: bg }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.45, delay: 0.6 }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} className="flex items-center gap-2">
        {cfg.showLogo && logo && <img src={logo} alt="" className="h-8 w-8 object-contain" />}
        <span className="font-display text-xl font-semibold" style={{ color: cfg.text || "#fff" }}>{cfg.title}</span>
      </motion.div>
    </motion.div>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    </label>
  );
}
function Text({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      <input className="input" value={value} maxLength={60} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
function ColourPick({ label, value, fallback, onChange }: { label: string; value: string; fallback: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={label} value={value || fallback} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
        <button type="button" onClick={() => onChange("")} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${value ? "border-line text-muted hover:border-ink" : "border-ink bg-ink text-white"}`}>Brand</button>
        {value && <code className="text-xs text-muted">{value}</code>}
      </div>
    </div>
  );
}
