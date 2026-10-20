"use client";

import { Check, RotateCcw } from "lucide-react";
import { DEFAULT_THEME, THEME_PRESETS, buildPalette, themeCss, validHex, type ThemeSettings } from "@/lib/theme";

// Admin → Colour theme. Changes show at once across the admin panel as a preview;
// the website changes after Save.
export default function ThemeEditor({ value, onChange }: { value: ThemeSettings; onChange: (v: ThemeSettings) => void }) {
  const theme = { ...DEFAULT_THEME, ...value };
  const palette = buildPalette(theme);
  const pick = (accent: string, dark: string, preset: string) => onChange({ preset, accent, dark });

  return (
    <div className="space-y-6">
      {/* live preview of the draft colours in the admin panel */}
      <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />

      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold">Ready-made themes</h2>
        <p className="mt-1 text-sm text-muted">Pick one, see it here at once, then press Save to put it on the website.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEME_PRESETS.map((p) => {
            const on = theme.preset === p.id;
            const pal = buildPalette(p);
            return (
              <button key={p.id} type="button" onClick={() => pick(p.accent, p.dark, p.id)} className={`relative rounded-2xl border p-3 text-left transition ${on ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                <div className="flex h-12 overflow-hidden rounded-xl">
                  <span className="flex-[2]" style={{ background: pal.ink }} />
                  <span className="flex-[2]" style={{ background: pal["lav-600"] }} />
                  <span className="flex-1" style={{ background: pal["lav-300"] }} />
                  <span className="flex-1" style={{ background: pal["lav-100"] }} />
                </div>
                <p className="mt-2 text-sm font-semibold">{p.name}</p>
                {on && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-white"><Check size={13} /></span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold">Your own colours</h2>
        <p className="mt-1 text-sm text-muted">Choose a main colour (buttons, highlights) and a dark colour (dark sections, text). All lighter and darker shades are made automatically.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <ColorInput label="Main colour" value={theme.accent} onChange={(v) => onChange({ ...theme, accent: v, preset: "custom" })} />
          <ColorInput label="Dark colour" value={theme.dark} onChange={(v) => onChange({ ...theme, dark: v, preset: "custom" })} />
        </div>
        <div className="mt-6">
          <p className="text-[13px] font-semibold">Shades used on the site</p>
          <div className="mt-2 flex overflow-hidden rounded-xl border border-line">
            {(["lav-100", "lav-200", "lav-300", "lav-400", "lav-500", "lav-600", "lav-700", "ink"] as const).map((k) => (
              <span key={k} title={`${k} ${palette[k]}`} className="h-10 flex-1" style={{ background: palette[k] }} />
            ))}
          </div>
        </div>
        <button type="button" onClick={() => onChange({ ...DEFAULT_THEME })} className="btn-ghost mt-6 px-4 py-2 text-sm"><RotateCcw size={15} /> Back to Spinex lavender</button>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold">Preview</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-mist p-6">
            <p className="text-sm font-medium text-lav-700">Web development</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-tight">Websites that bring customers.</p>
            <p className="mt-2 text-sm text-muted">Fast, mobile-friendly and ready for Google.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="btn-dark px-5 py-2.5 text-sm">Get a quote</span>
              <span className="btn-ghost bg-white px-5 py-2.5 text-sm">See work</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-lav-100 px-3 py-1 text-xs font-semibold text-lav-700">Tag</span>
              <span className="rounded-full bg-lav-600 px-3 py-1 text-xs font-semibold text-white">Highlight</span>
            </div>
          </div>
          <div className="rounded-3xl bg-ink p-6 text-white">
            <p className="text-sm text-lav-300">Dark section</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-tight">What we do, done properly.</p>
            <p className="mt-2 text-sm text-white/60">Used for the services list, footer and highlights.</p>
            <span className="btn-light mt-5 px-5 py-2.5 text-sm">Start a project</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">The logo keeps its own colours. Upload a matching logo in Brand and hero if you change the theme a lot.</p>
      </section>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      <span className="flex items-center gap-3">
        <input type="color" value={validHex(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" />
        <input className="input font-mono uppercase" value={value} maxLength={7} onChange={(e) => {
          const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v.toUpperCase());
        }} />
      </span>
    </label>
  );
}
