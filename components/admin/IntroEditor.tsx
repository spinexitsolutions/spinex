"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Play, RotateCcw } from "lucide-react";
import IntroAnimation, { STYLE_INFO, introLength } from "../intro/IntroAnimation";
import { INTRO_STYLES, defaultIntro, type IntroSettings, type PageTransition } from "@/lib/content";
import { introSettings } from "../Intro";
import CustomCursor, { CursorMarks, SiteTrail, cursorSettings } from "../CustomCursor";
import ButtonFx from "../ButtonFx";
import { NAV, NAV_ICONS } from "../Navbar";
import { BUTTON_HOVERS, BUTTON_STYLES, NAV_STYLES, type NavStyle, CURSOR_STYLES, CURSOR_TRAILS, type ButtonHover, type ButtonStyle, type CursorSettings, type CursorStyle, type CursorTrail, type SiteContent } from "@/lib/content";

const TRAILS: Record<CursorTrail, { name: string; about: string; dark?: boolean }> = {
  none: { name: "No trail", about: "Just the cursor, nothing behind it." },
  fluid: { name: "Fluid smoke", about: "Real swirling colour smoke that follows the mouse." },
  work: { name: "Our work trail", about: "Pictures of your products and projects pop out behind the mouse." },
  pills: { name: "Service pills", about: "Your service names pop out as small tags and float up." },
  letters: { name: "Brand letters", about: "The letters of your name (S P I N E X) pop out and fall." },
  ink: { name: "Liquid ink", about: "Soft colour smoke that spreads and changes colour." },
  shards: { name: "3D glass shards", about: "Shiny triangles that spin and fall." },
  mosaic: { name: "Pixel mosaic", about: "Coloured squares appear where the mouse passes." },
  sparkles: { name: "AI sparkles", about: "Small four-point stars that twinkle." },
  code: { name: "Code trail", about: "Code signs like { } </> ; float up and fade." },
  gooey: { name: "Gooey blobs", about: "Purple drops that stick together and break off." },
  pixels: { name: "Pixel sparks", about: "Tiny purple squares fall like sparks." },
  ribbon: { name: "Ribbon", about: "A smooth purple-to-pink line behind the mouse." },
  rings: { name: "Ripple rings", about: "Thin circles spread out as the mouse moves." },
  neon: { name: "Neon tail", about: "A glowing tail that swings like a spring.", dark: true },
  orbit: { name: "Orbit + stardust", about: "Three glowing dots circle the mouse.", dark: true },
  comet: { name: "Comet", about: "A soft glowing tail with star dust.", dark: true },
  lightning: { name: "Lightning", about: "A purple bolt crackles behind the mouse." },
  glitch: { name: "Glitch RGB", about: "Red, green and blue rings with glitch lines." },
};

const CURSORS: Record<CursorStyle, { name: string; about: string }> = {
  ring: { name: "Dot and ring", about: "A small dot with a ring that follows. The ring grows over links." },
  dot: { name: "Soft dot", about: "One coloured dot that grows over links and buttons." },
  blend: { name: "Invert", about: "A white circle that flips the colours under it." },
  glow: { name: "Glow", about: "A small dot with a soft light following it." },
};

const NAV_NAMES: Record<NavStyle, { name: string; about: string }> = {
  default: { name: "Current", about: "Black pill on the current page." },
  underline: { name: "Gradient underline", about: "A purple-pink line under the page." },
  capsule: { name: "Glow capsule", about: "Soft lavender capsule that slides." },
  dot: { name: "Dot", about: "Small glowing dot under the page." },
  segmented: { name: "Segmented", about: "White chip on a grey track, like iPhone." },
  brackets: { name: "Gradient + brackets", about: "Gradient text with corner brackets." },
  gradient: { name: "Gradient pill", about: "Purple-pink pill that slides." },
  elastic: { name: "Elastic slide", about: "Black pill that bounces to the new page." },
  neon: { name: "Neon ring", about: "A colour ring keeps turning round the page." },
  marker: { name: "Highlighter", about: "Marker-pen highlight behind the page." },
  icons: { name: "Icons", about: "An icon for each link, coloured on the page." },
  glowbar: { name: "Glow bar", about: "A glowing light bar under the page." },
};
const NAV_DEMO = [["/", "Home"], ["/services", "Services"], ["/work", "Work"], ["/about", "About"], ["/contact", "Contact"]];

const BTN_STYLES: Record<ButtonStyle, { name: string; about: string }> = {
  default: { name: "Current", about: "The buttons the website has now." },
  split: { name: "Split arrow", about: "The arrow sits in its own gradient circle." },
  glass: { name: "Gradient glass", about: "Rainbow border with a soft glow inside." },
  sticker: { name: "Bold sticker", about: "Thick border and a hard shadow." },
  ring: { name: "AI ring", about: "A colour border that keeps turning." },
  keycap: { name: "3D keycap", about: "Like a keyboard key, presses down." },
  minimal: { name: "Minimal line", about: "Bold text with a line that draws under it." },
  techcut: { name: "Tech cut", about: "Cut corners and capital letters." },
  beam: { name: "Light beam", about: "A ray of light runs round the border." },
  mesh: { name: "Living mesh", about: "Colours keep flowing inside the button." },
};
const BTN_HOVERS: Record<ButtonHover, { name: string; about: string }> = {
  default: { name: "Current", about: "Colour change, as now." },
  liquid: { name: "Liquid fill", about: "Wavy purple-pink liquid fills it." },
  roll: { name: "Text roll", about: "Text rolls up, a coloured copy rolls in." },
  glow: { name: "Glowing border", about: "Colour border turns, a shine passes." },
  spotlight: { name: "Spotlight", about: "A glow inside follows the mouse." },
  burst: { name: "Arrow burst", about: "A circle grows from the arrow and fills it." },
  lift: { name: "3D lift", about: "Rises with a purple layer under it." },
  follow: { name: "Follow fill", about: "Fills from where the mouse comes in." },
  aurora: { name: "Aurora glass", about: "Purple, pink and blue light flows inside." },
  holo: { name: "Holographic", about: "Rainbow foil that shifts with the mouse." },
  draw: { name: "Border draw", about: "A gradient line draws round the button." },
  spark: { name: "Spark pop", about: "Pops into gradient, small stars fly out." },
  doors: { name: "Door open", about: "Two halves slide apart to show a gradient." },
  wave: { name: "Wave + bubbles", about: "Wavy colour rises with little bubbles." },
  magnet: { name: "Magnet", about: "The button leans toward the mouse." },
  flip: { name: "3D flip", about: "Flips over and comes back in gradient." },
};

const TRANSITIONS: Record<PageTransition, { name: string; about: string }> = {
  none: { name: "None", about: "The new page just appears." },
  fade: { name: "Fade", about: "A soft fade-in of the new page." },
  curtain: { name: "Curtain", about: "A dark panel lifts up to show the new page." },
  wipe: { name: "Colour wipe", about: "Two coloured panels sweep across, left to right." },
  logo: { name: "Logo flash", about: "Your logo and name for a moment, then the page." },
};

// Admin → Intro animation: pick a style, see it play, and set text, colours, speed and when it shows.
export type IntroPart = "intro" | "transitions" | "cursor" | "navbar" | "buttons";

// One editor, shown a part at a time: each part has its own entry in Admin → Site settings.
export default function IntroEditor({ value, onChange, cursor, onCursor, site, logo, readOnly, part }: {
  part?: IntroPart;
  value: IntroSettings; onChange: (v: IntroSettings) => void; site?: SiteContent;
  cursor?: Partial<CursorSettings>; onCursor?: (v: CursorSettings) => void;
  logo: string; readOnly?: boolean;
}) {
  const P = (x: IntroPart) => !part || part === x;
  const cur = cursorSettings(cursor);
  const setCur = (patch: Partial<CursorSettings>) => onCursor?.({ ...cur, ...patch });
  const [trying, setTrying] = useState(false);
  const tryBox = useRef<HTMLDivElement>(null);
  const v = introSettings(value);
  const set = (patch: Partial<IntroSettings>) => onChange({ ...v, ...patch });
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [tx, setTx] = useState(0);
  const replay = () => { setRun((n) => n + 1); setPlaying(true); };

  return (
    <div className="space-y-6">
      {/* Live preview */}
      {P("intro") && (
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
      )}

      <fieldset disabled={readOnly} className="space-y-6">
        {P("intro") && <>
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
            <input type="checkbox" checked={v.showLogo} onChange={(e) => set({ showLogo: e.target.checked })} /> Show the logo (from Site settings → Logo and company name)
          </label>
        </div>

        {/* Colours */}
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="font-semibold">Colours</p>
          <p className="text-sm text-muted">Leave on “Brand” to follow Colours.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ColourPick label="Background" value={v.background} fallback="#120F1B" onChange={(x) => set({ background: x })} />
            <ColourPick label="Highlight" value={v.accent} fallback="#9C8CF0" onChange={(x) => set({ accent: x })} />
            <ColourPick label="Text" value={v.text} fallback="#FFFFFF" onChange={(x) => set({ text: x })} />
          </div>
        </div>
        </>}

        {/* Between pages */}
        {P("transitions") && (
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
        )}

        {P("intro") && <>
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4">
          <span><b>Play it when the admin panel opens</b><span className="block text-sm text-muted">Once per visit, for everyone who signs in.</span></span>
          <input type="checkbox" className="h-5 w-5" checked={v.admin} onChange={(e) => set({ admin: e.target.checked })} />
        </label>
        <button type="button" onClick={() => { onChange({ ...defaultIntro }); replay(); }} className="text-sm font-semibold text-muted underline hover:text-ink">Reset intro to the default</button>
        </>}

        {/* Custom cursor */}
        {onCursor && P("cursor") && (
          <div className="rounded-3xl border border-line bg-white p-5 sm:p-6" data-cursor-editor>
            <p className="font-semibold">Mouse cursor</p>
            <p className="text-sm text-muted">A custom cursor on the website. Only on computers (mouse or trackpad). Phones and tablets never show it.</p>
            <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-line p-4">
              <span><b>Show the custom cursor on desktop</b><span className="block text-sm text-muted">Switch off to use the normal arrow cursor.</span></span>
              <input type="checkbox" name="cursorOn" className="h-5 w-5" checked={cur.enabled} onChange={(e) => setCur({ enabled: e.target.checked })} />
            </label>
            <div className={`mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 ${cur.enabled ? "" : "opacity-50"}`}>
              {CURSOR_STYLES.map((id) => (
                <button type="button" key={id} data-cursor-option={id} onClick={() => setCur({ style: id })}
                  className={`rounded-2xl border p-3 text-left transition ${cur.style === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                  <span className="relative block h-16 overflow-hidden rounded-xl bg-mist">
                    <span className="absolute inset-y-0 right-0 w-1/2 bg-ink" />
                    <CursorMarks style={id} color={cur.color} still />
                  </span>
                  <span className="mt-2 block text-sm font-semibold">{CURSORS[id].name}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">{CURSORS[id].about}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-6">
              <ColourPick label="Cursor colour" value={cur.color} fallback="#8873EE" onChange={(x) => setCur({ color: x })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cur.admin} onChange={(e) => setCur({ admin: e.target.checked })} /> Use it in the admin panel too
              </label>
            </div>

            <div className="mt-6 border-t border-line pt-5" data-cursor-trail-editor>
              <p className="font-semibold">Cursor trail</p>
              <p className="text-sm text-muted">Something that moves behind the mouse. Works with or without the custom cursor. Pick one and move your mouse in the box below to try it.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {CURSOR_TRAILS.map((id) => (
                  <button type="button" key={id} data-cursor-trail-option={id} onClick={() => setCur({ trail: id })}
                    className={`rounded-2xl border p-3 text-left transition ${cur.trail === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                    <span className="block text-sm font-semibold">{TRAILS[id].name}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">{TRAILS[id].about}{TRAILS[id].dark ? " Best on dark parts." : ""}</span>
                  </button>
                ))}
              </div>
            </div>

            <div ref={tryBox} onMouseEnter={() => setTrying(true)} onMouseLeave={() => setTrying(false)} data-cursor-try
              className="mt-4 grid h-64 grid-cols-2 overflow-hidden rounded-2xl border border-dashed border-line text-center text-sm">
              <div className="grid place-items-center bg-mist p-4 text-muted">
                <div>
                  <p className="font-semibold text-ink">Move your mouse here to try it</p>
                  <p className="mt-2"><a href="#cursor" onClick={(e) => e.preventDefault()} className="btn-dark px-4 py-2 text-xs">A button</a></p>
                </div>
              </div>
              <div className="grid place-items-center bg-ink p-4 text-white/70"><p>And on a dark part</p></div>
            </div>
            {trying && cur.enabled && <CustomCursor cfg={{ ...cur, enabled: true }} />}
            {trying && site && <SiteTrail content={site} kind={cur.trail} area={tryBox} />}
          </div>
        )}
        {/* Navbar */}
        {onCursor && P("navbar") && (
          <div className="rounded-3xl border border-line bg-white p-5 sm:p-6" data-nav-style-editor>
            <p className="font-semibold">Navbar</p>
            <p className="text-sm text-muted">How the navbar links show the page you are on, and what happens when the mouse goes over a link. Try it in the sample below.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {NAV_STYLES.map((id) => (
                <button type="button" key={id} data-nav-style-option={id} onClick={() => setCur({ navStyle: id })}
                  className={`rounded-2xl border p-3 text-left transition ${(cur.navStyle ?? "default") === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                  <span className="block text-sm font-semibold">{NAV_NAMES[id].name}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">{NAV_NAMES[id].about}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-center rounded-2xl bg-mist p-5">
              <ul data-nav-style={cur.navStyle ?? "default"} className="relative flex items-center rounded-full border border-line bg-white p-1.5 shadow-[0_12px_30px_-16px_rgba(18,15,27,0.3)]">
                {NAV_DEMO.map(([href, label], i) => {
                  const ns = NAV[(cur.navStyle ?? "default") as NavStyle] ?? NAV.default, on = i === 0, I = NAV_ICONS[href];
                  return (
                    <li key={href} className="group/nav relative">
                      {on && ns.active && <span className={`absolute ${ns.active}`} />}
                      {!on && ns.hover && <span className={`absolute opacity-0 transition group-hover/nav:opacity-100 ${ns.hover}`} />}
                      <a href="#nav" onClick={(e) => e.preventDefault()} data-nav-link aria-current={on ? "page" : undefined}
                        className={`relative z-10 flex min-h-11 items-center gap-1.5 whitespace-nowrap px-4 text-[14px] ${on ? `font-semibold ${ns.activeText}` : "font-medium text-muted hover:text-ink"}`}>
                        {cur.navStyle === "icons" && I && <b className="nav-ic grid h-6 w-6 place-items-center rounded-full"><I size={13} strokeWidth={2.2} /></b>}
                        <span className="nav-label relative">{label}</span>
                        {cur.navStyle === "brackets" && <><i aria-hidden className="nav-br nav-br-a" /><i aria-hidden className="nav-br nav-br-b" /></>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Buttons */}
        {onCursor && P("buttons") && (
          <div className="rounded-3xl border border-line bg-white p-5 sm:p-6" data-button-editor>
            <p className="font-semibold">Buttons</p>
            <p className="text-sm text-muted">How the buttons on the website look, and what they do when the mouse goes over them. Pick any look with any hover, then try them in the box below.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <p className="mb-2 text-sm font-semibold">Look</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BUTTON_STYLES.map((id) => (
                    <button type="button" key={id} data-btn-style-option={id} onClick={() => setCur({ btnStyle: id })}
                      className={`rounded-2xl border p-3 text-left transition ${cur.btnStyle === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                      <span className="block text-sm font-semibold">{BTN_STYLES[id].name}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">{BTN_STYLES[id].about}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Hover effect</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BUTTON_HOVERS.map((id) => (
                    <button type="button" key={id} data-btn-hover-option={id} onClick={() => setCur({ btnHover: id })}
                      className={`rounded-2xl border p-3 text-left transition ${cur.btnHover === id ? "border-ink ring-2 ring-ink" : "border-line hover:border-ink"}`}>
                      <span className="block text-sm font-semibold">{BTN_HOVERS[id].name}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">{BTN_HOVERS[id].about}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-3 mt-4 grid overflow-hidden rounded-2xl border border-line sm:grid-cols-2" data-btn-style={cur.btnStyle} data-btn-hover={cur.btnHover} data-button-try>
              <div className="flex flex-wrap items-center justify-center gap-3 bg-white p-6">
                <a href="#try" onClick={(e) => e.preventDefault()} className="btn-dark">Start your project <ArrowUpRight size={16} /></a>
                <a href="#try" onClick={(e) => e.preventDefault()} className="btn-ghost">See our work <ArrowUpRight size={16} /></a>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 bg-ink p-6">
                <a href="#try" onClick={(e) => e.preventDefault()} className="btn-light">Get a free quote <ArrowUpRight size={16} /></a>
                <a href="#try" onClick={(e) => e.preventDefault()} className="btn-ghost-dark">WhatsApp us</a>
              </div>
            </div>
            <ButtonFx />
          </div>
        )}
      </fieldset>
      <p className="text-xs text-muted">People who turn on “reduce motion” on their phone or computer don&apos;t see the intro or the custom cursor. Press <b>Save and publish</b> at the top to put changes live.</p>
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
